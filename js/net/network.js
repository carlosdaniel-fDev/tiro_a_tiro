/**
 * NETWORK — transporte multiplayer com PeerJS (WebRTC DataChannel, P2P), sala com vários jogadores.
 * Topologia em ESTRELA: todo convidado conecta só ao anfitrião, e o anfitrião retransmite as
 * mensagens de jogo (state/shot/dead) aos demais. Só cuida da conexão; não conhece regras do
 * jogo (isso é features/multiplayer.js).
 *   Network.createRoom(max, aberta, nome)  cria sala (anfitrião) com limite de jogadores.
 *       PRIVADA (padrão): código aleatório de 5 caracteres, só entra quem tem o código.
 *       ABERTA: ocupa a primeira vaga livre PUB-01…PUB-16 (id fixo e conhecido) e aparece na lista de quem buscar.
 *   Network.scan()           Promise → lista de salas abertas [{code,name,players,max}] (sem servidor de lista, veja abaixo)
 *   Network.join(codigo)     entra na sala colando o código (convidado)
 *   Network.send(obj, except) envia JSON: convidado → anfitrião · anfitrião → todos (menos o id "except")
 *   Network.sendTo(id, obj)  (anfitrião) envia a um convidado só
 *   Network.leave()          sai da sala
 * Ids: anfitrião = 0 · convidados = 1, 2, 3… (o anfitrião escolhe). Toda mensagem recebida em
 * net:data traz msg.p = id de quem enviou.
 * Eventos (FPS.bus): net:status {status,msg,code,role} · net:open (role, só convidado) ·
 *   net:join {id} (anfitrião: entrou um jogador) · net:left {id} (anfitrião: um jogador saiu) ·
 *   net:data (msg) · net:close (a sala acabou / você saiu)
 * status: offline | creating | waiting | joining | connected
 * BUSCA DE SALAS ABERTAS sem servidor próprio: as salas abertas usam ids fixos (tiroatiro-PUB-01…16). Quem busca
 * "bate na porta" de cada id com uma conexão de sondagem (metadata.probe); se há anfitrião, ele responde {t:'info'} com
 * nome/jogadores/máximo e a sondagem não conta como jogador. Id sem dono = "peer-unavailable" = vaga livre.
 * O PeerJS usa o servidor público de sinalização (0.peerjs.com) só para o "aperto de mãos";
 * depois os dados vão direto entre os jogadores. Requer internet.
 * Depende de: bus, Peer (js/vendor/peerjs.min.js) · Exporta: FPS.Network
 */
(function (FPS) {
  'use strict';
  const { bus } = FPS;
  const PREFIX = 'tiroatiro-', ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1
  const SLOTS = 16, slotCode = n => 'PUB-' + String(n).padStart(2, '0'); // salas abertas (o '-' nunca aparece em código privado)
  const RELAY = ['state', 'shot', 'dead'];                                      // só estas mensagens de convidado são retransmitidas
  const rand = () => Array.from({ length: 5 }, () => ALPHABET[Math.random() * ALPHABET.length | 0]).join('');
  const ERRORS = {
    'peer-unavailable': 'Sala não encontrada. Confira o código.', network: 'Sem conexão com o servidor.',
    'server-error': 'Servidor indisponível.', timeout: 'Tempo esgotado ao conectar.',
    'browser-incompatible': 'Navegador sem suporte a WebRTC.', full: 'A sala está cheia.',
    'no-slot': 'Todas as vagas de salas abertas estão ocupadas. Crie uma sala privada.'
  };

  const Network = {
    peer: null, conns: {}, role: null, code: '', status: 'offline', timer: 0, max: 2, open: false, name: '',
    get connected() { return Object.values(this.conns).some(c => c && c.open); },
    /** Quantos convidados estão conectados (só faz sentido para o anfitrião). */
    get guests() { return Object.keys(this.conns).length; },

    setStatus(status, msg) { this.status = status; bus.emit('net:status', { status, msg, code: this.code, role: this.role }); },

    /** Anfitrião: registra um id "tiroatiro-XXXXX" no PeerJS e espera os convidados (até max jogadores no total).
     *  aberta=true → sala pública (id PUB-nn, listada na busca) · aberta=false → privada (código aleatório). */
    createRoom(max, aberta, nome) {
      this.leave(true); this.role = 'host'; this.max = Math.max(2, max | 0 || 2);
      this.open = !!aberta; this.name = String(nome || '').trim().slice(0, 18);
      if (this.open) this._openPublic(1); else this._open(rand());
    },
    /** Sala aberta: tenta a vaga n; se já tem dono (unavailable-id), tenta a próxima. */
    _openPublic(n) { if (n > SLOTS) { this._fail({ type: 'no-slot' }); return; } this._open(slotCode(n), () => this._openPublic(n + 1)); },
    _open(code, retry) {
      this.code = code; this.setStatus('creating', 'Criando sala…');
      const peer = this.peer = new Peer(PREFIX + code, { debug: 0 });
      peer.on('open', () => this.setStatus('waiting', this.open ? 'Sala aberta criada. Ela já aparece na busca dos outros jogadores.' : 'Sala privada criada. Envie o código aos outros jogadores.'));
      peer.on('connection', c => {
        if (c.metadata && c.metadata.probe) { this._hostProbe(c); return; } // alguém só espiando a lista de salas
        if (c.open) this._hostAccept(c); else c.on('open', () => this._hostAccept(c));
      });
      peer.on('error', e => { if (e.type === 'unavailable-id') { peer.destroy(); retry ? retry() : this._open(rand()); return; } this._fail(e); });
    },
    /** Anfitrião: responde a uma sondagem da busca com os dados da sala e fecha (não conta como jogador). */
    _hostProbe(c) {
      const reply = () => {
        if (this.open) this._tx(c, { t: 'info', name: this.name || 'Sala aberta', n: this.guests + 1, max: this.max });
        setTimeout(() => { try { c.close(); } catch (_) {} }, 600);
      };
      if (c.open) reply(); else c.on('open', reply);
    },
    /** Busca salas abertas: sonda PUB-01…PUB-16 e devolve (Promise) as que responderam. Não mexe na sala atual. */
    scan() {
      return new Promise((resolve, reject) => {
        const found = [], pending = new Set(); let peer = null, done = false, timer = 0;
        const finish = err => {
          if (done) return; done = true; clearTimeout(timer); try { peer && peer.destroy(); } catch (_) {}
          if (err) reject(new Error(ERRORS[err.type] || 'Não foi possível buscar salas.')); else resolve(found.sort((a, b) => a.code < b.code ? -1 : 1));
        };
        const settle = code => { pending.delete(code); if (!pending.size) finish(); };
        timer = setTimeout(() => finish(), 6000);
        try { peer = new Peer({ debug: 0 }); } catch (e) { finish({ type: 'browser-incompatible' }); return; }
        peer.on('error', e => {
          const m = /tiroatiro-(PUB-\d+)/.exec(e.message || '');
          if (e.type === 'peer-unavailable' && m) settle(m[1]); else finish(e); // vaga sem anfitrião = normal; outro erro = falha de rede
        });
        peer.on('open', () => {
          for (let n = 1; n <= SLOTS; n++) {
            const code = slotCode(n); pending.add(code);
            const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json', metadata: { probe: 1 } });
            c.on('data', d => {
              if (d && d.t === 'info') found.push({ code, name: String(d.name || 'Sala aberta').slice(0, 18), players: d.n | 0, max: d.max | 0 });
              settle(code); try { c.close(); } catch (_) {}
            });
            c.on('error', () => settle(code)); c.on('close', () => settle(code));
          }
        });
      });
    },
    /** Anfitrião: aceita um convidado (se houver vaga), dá um id a ele e retransmite o que ele enviar. */
    _hostAccept(c) {
      if (this.role !== 'host') { try { c.close(); } catch (_) {} return; }
      if (this.guests >= this.max - 1) { // sala cheia: avisa e fecha
        try { c.send({ t: 'full' }); } catch (_) {}
        setTimeout(() => { try { c.close(); } catch (_) {} }, 400); return;
      }
      let id = 1; while (this.conns[id]) id++;
      this.conns[id] = c;
      c.on('data', d => this._hostData(id, d));
      c.on('close', () => { if (this.conns[id] === c) { delete this.conns[id]; bus.emit('net:left', { id }); } });
      c.on('error', () => {});
      this.setStatus('connected', 'Conectado!');
      bus.emit('net:join', { id });
    },
    _hostData(id, d) {
      if (!d || typeof d !== 'object' || RELAY.indexOf(d.t) < 0) return;
      d.p = id; // quem enviou (o id vem da conexão, não do que o convidado diz)
      for (const k in this.conns) if (+k !== id) this._tx(this.conns[k], d);
      bus.emit('net:data', d);
    },

    /** Convidado: conecta ao id do anfitrião a partir do código colado. */
    join(raw) {
      const code = String(raw || '').trim().toUpperCase().replace(/^TIROATIRO-/, '');
      if (!code) { this.setStatus('offline', 'Cole o código da sala.'); return; }
      this.leave(true); this.role = 'guest'; this.code = code; this.setStatus('joining', 'Conectando…');
      const peer = this.peer = new Peer({ debug: 0 });
      peer.on('open', () => {
        const c = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
        c.on('open', () => { clearTimeout(this.timer); this.conns[0] = c; this.setStatus('connected', 'Conectado!'); bus.emit('net:open', this.role); });
        c.on('data', d => { if (d && d.t === 'full') this._fail({ type: 'full' }); else bus.emit('net:data', d); });
        c.on('close', () => { if (this.conns[0] === c) { this.leave(true); this.setStatus('offline', 'A sala foi encerrada.'); bus.emit('net:close'); } });
        c.on('error', e => this._fail(e));
        this.timer = setTimeout(() => { if (!this.connected) this._fail({ type: 'timeout' }); }, 12000);
      });
      peer.on('error', e => this._fail(e));
    },

    _tx(c, msg) { if (c && c.open) { try { c.send(msg); } catch (_) {} } },
    /** Convidado: manda ao anfitrião. Anfitrião: manda a todos (exceto o id "except"). */
    send(msg, except) {
      if (this.role === 'host') { msg.p = 0; for (const k in this.conns) if (+k !== except) this._tx(this.conns[k], msg); }
      else this._tx(this.conns[0], msg);
    },
    sendTo(id, msg) { this._tx(this.conns[id], msg); },

    _fail(e) { this.leave(true); this.setStatus('offline', ERRORS[e.type] || ('Erro: ' + (e.type || e.message))); bus.emit('net:close'); },

    /** Fecha tudo. silent=true não emite status/evento (uso interno). */
    leave(silent) {
      clearTimeout(this.timer);
      const cs = Object.values(this.conns), p = this.peer; this.conns = {}; this.peer = null; this.role = null;
      cs.forEach(c => { try { c.close(); } catch (_) {} }); try { p && p.destroy(); } catch (_) {}
      if (!silent) { this.setStatus('offline', 'Você saiu da sala.'); bus.emit('net:close'); }
    }
  };
  FPS.Network = Network;
})(window.FPS = window.FPS || {});
