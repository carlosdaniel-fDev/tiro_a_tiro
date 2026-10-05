/**
 * NETWORK — transporte multiplayer com PeerJS (WebRTC DataChannel, P2P), sala com vários jogadores.
 * Topologia em ESTRELA: todo convidado conecta só ao anfitrião, e o anfitrião retransmite as
 * mensagens de jogo (state/shot/dead) aos demais. Só cuida da conexão; não conhece regras do
 * jogo (isso é features/multiplayer.js).
 *   Network.createRoom(max)  cria sala (anfitrião) com limite de jogadores → código de 5 caracteres (Network.code)
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
 * O PeerJS usa o servidor público de sinalização (0.peerjs.com) só para o "aperto de mãos";
 * depois os dados vão direto entre os jogadores. Requer internet.
 * Depende de: bus, Peer (js/vendor/peerjs.min.js) · Exporta: FPS.Network
 */
(function (FPS) {
  'use strict';
  const { bus } = FPS;
  const PREFIX = 'tiroatiro-', ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1
  const RELAY = ['state', 'shot', 'dead'];                                      // só estas mensagens de convidado são retransmitidas
  const rand = () => Array.from({ length: 5 }, () => ALPHABET[Math.random() * ALPHABET.length | 0]).join('');
  const ERRORS = {
    'peer-unavailable': 'Sala não encontrada. Confira o código.', network: 'Sem conexão com o servidor.',
    'server-error': 'Servidor indisponível.', timeout: 'Tempo esgotado ao conectar.',
    'browser-incompatible': 'Navegador sem suporte a WebRTC.', full: 'A sala está cheia.'
  };

  const Network = {
    peer: null, conns: {}, role: null, code: '', status: 'offline', timer: 0, max: 2,
    get connected() { return Object.values(this.conns).some(c => c && c.open); },
    /** Quantos convidados estão conectados (só faz sentido para o anfitrião). */
    get guests() { return Object.keys(this.conns).length; },

    setStatus(status, msg) { this.status = status; bus.emit('net:status', { status, msg, code: this.code, role: this.role }); },

    /** Anfitrião: registra um id "tiroatiro-XXXXX" no PeerJS e espera os convidados (até max jogadores no total). */
    createRoom(max) { this.leave(true); this.role = 'host'; this.max = Math.max(2, max | 0 || 2); this._open(rand()); },
    _open(code) {
      this.code = code; this.setStatus('creating', 'Criando sala…');
      const peer = this.peer = new Peer(PREFIX + code, { debug: 0 });
      peer.on('open', () => this.setStatus('waiting', 'Sala criada. Envie o código aos outros jogadores.'));
      peer.on('connection', c => { if (c.open) this._hostAccept(c); else c.on('open', () => this._hostAccept(c)); });
      peer.on('error', e => { if (e.type === 'unavailable-id') { peer.destroy(); this._open(rand()); return; } this._fail(e); });
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
