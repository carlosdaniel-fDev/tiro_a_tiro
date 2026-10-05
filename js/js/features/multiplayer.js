/**
 * FEATURE: Multiplayer — partida em tempo real com VÁRIOS jogadores (PeerJS/WebRTC).
 *  • Menu ⚙ → "Multijogador": quem CRIA a sala escolhe o máximo de jogadores (2–8) · Entrar (cola o código) · Sair.
 *  • Link da sala: quem criou toca em "Compartilhar link" (menu nativo de compartilhar no celular, ou copia) e o jogo abre com ?sala=CODIGO;
 *    quem abre o link entra direto na sala, sem digitar o código.
 *  • Pode entrar gente com a partida já rolando, até o limite; sala cheia recusa quem tentar entrar.
 *  • Anfitrião (id 0) sorteia a semente do mapa e a envia a cada novo jogador (mesmo mapa para todos).
 *    Cada jogador tem um id (0, 1, 2…) e uma cor de bala/avatar fixa por id (COLORS).
 *  • Acerto: quem atira detecta (raycast no avatar) e avisa QUEM foi atingido; esse jogador perde vida.
 *  • Vida é PRIVADA: só existe no Model local e numa barra discreta no canto da tela
 *    (nunca é enviada). Ao zerar: 3 s e renasce; o último que acertou ganha 1 abate.
 *  • Agachar é visto pelos outros: o estado leva "cr" (0 em pé → 1 agachado) e o avatar dobra as pernas.
 * Mensagens (JSON; o anfitrião retransmite e põe p = id de quem enviou):
 *   welcome{id,seed,max,players} (anfitrião → novo jogador) · join{id} · left{id} (anfitrião → todos)
 *   state{x,y,z,yaw,pitch,cr,ln,tp} (15 Hz) · shot{f,to,n,hit} (hit = id atingido ou -1) · dead{k} (k = id de quem matou)
 * Para REMOVER: apague .use(FPS.Multiplayer) em main.js (o jogo volta a ser solo).
 * Depende de: Model, View, Input, Menu, Network, bus · Exporta: FPS.Multiplayer
 */
(function (FPS) {
  'use strict';
  const { Model, View, Input, Menu, Network, bus } = FPS;

  // cor fixa por id de jogador (0 = anfitrião)
  const COLORS = [0x2aa8ff, 0xff3d6e, 0x37d67a, 0xffc83d, 0xa05cff, 0xff8a2a, 0x2ee6d6, 0xe8e8f0];
  const COLOR_NAMES = ['azul', 'rosa', 'verde', 'amarelo', 'roxo', 'laranja', 'ciano', 'branco'];
  const colorOf = id => COLORS[id % COLORS.length];
  const MIN_PLAYERS = 2, MAX_PLAYERS = 8, DEFAULT_PLAYERS = 4;
  const WHIZ_R = 4.0, HIT_DMG = 10, SEND_HZ = 15, RESPAWN_S = 3;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const arr = v => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
  const vec = a => new THREE.Vector3(a[0], a[1], a[2]);
  const LS = 'tiroatiro-maxplayers';
  const loadMax = () => { try { const n = +localStorage.getItem(LS); return n >= MIN_PLAYERS && n <= MAX_PLAYERS ? n : DEFAULT_PLAYERS; } catch (_) { return DEFAULT_PLAYERS; } };

  const Multiplayer = {
    name: 'multiplayer', active: false, tpFlag: false, idx: 0, seed: 0, dead: false, respawnT: 0, sendT: 0, maxSel: loadMax(), ui: {},

    init() {
      this.buildMenuSection(); this.buildHud();
      this.autoJoinFromLink();
      bus.on('net:status', s => this.onStatus(s));
      bus.on('net:join', e => this.onJoin(e.id));
      bus.on('net:left', e => this.onLeft(e.id));
      bus.on('net:data', m => this.onData(m));
      bus.on('net:close', () => this.endMatch());
      bus.on('shot', s => { if (this.active) Network.send({ t: 'shot', f: arr(s.from), to: arr(s.target), n: s.normal ? arr(s.normal) : null, hit: s.hit ? s.pid : -1 }); });
    },

    /** Quantos jogadores há na partida (você + os outros). */
    count() { return 1 + Object.keys(Model.remotes).length; },
    infoMsg() {
      if (!this.active) return 'Conectado! Entrando na partida…';
      return `Você é o jogador ${COLOR_NAMES[this.idx % COLORS.length]}. Jogadores na sala: ${this.count()}/${Network.max}.`;
    },

    // ---------- UI: seção dentro do menu de configurações ----------
    buildMenuSection() {
      const sec = h('div', 'mp'), status = h('p', 'mp-status', 'Offline — crie uma sala ou entre com um código.');
      // limite de jogadores (só quem cria a sala define)
      const maxRow = h('div', 'row'), minus = h('button', 'step', '−'), plus = h('button', 'step', '+'), val = h('span', 'val', String(this.maxSel));
      maxRow.append(h('span', 'lbl', 'Máx. de jogadores'), minus, val, plus);
      const setMax = d => {
        this.maxSel = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, this.maxSel + d)); val.textContent = this.maxSel;
        try { localStorage.setItem(LS, this.maxSel); } catch (_) {}
      };
      minus.onclick = () => setMax(-1); plus.onclick = () => setMax(+1);
      const create = h('button', null, 'Criar sala');
      const codeBox = h('div', 'mp-code'), codeTxt = h('b'), copy = h('button', null, 'Copiar');
      codeBox.append(h('span', null, 'Código da sala:'), codeTxt, copy);
      const share = h('button', null, 'Compartilhar link');
      const joinRow = h('div', 'mp-join'), inp = h('input'), join = h('button', null, 'Entrar');
      inp.placeholder = 'Cole o código da sala'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.maxLength = 24;
      joinRow.append(inp, join);
      const leave = h('button', null, 'Sair da sala');
      sec.append(h('h3', null, 'Multijogador'), status, maxRow, create, codeBox, share, joinRow, leave);
      Menu.ui.panel.insertBefore(sec, Menu.ui.actions);
      create.onclick = () => Network.createRoom(this.maxSel);
      join.onclick = () => Network.join(inp.value);
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') Network.join(inp.value); });
      leave.onclick = () => Network.leave();
      share.onclick = async () => {
        const url = this.roomLink(), text = `Entra na minha sala do Tiro a Tiro! Código: ${Network.code}`;
        if (navigator.share) { try { await navigator.share({ title: 'Tiro a Tiro', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
        try { await navigator.clipboard.writeText(url); share.textContent = 'Link copiado!'; }
        catch (_) { prompt('Copie o link da sala:', url); share.textContent = 'Compartilhar link'; }
        setTimeout(() => share.textContent = 'Compartilhar link', 1800);
      };
      copy.onclick = async () => {
        try { await navigator.clipboard.writeText(Network.code); copy.textContent = 'Copiado!'; }
        catch (_) { const r = document.createRange(); r.selectNodeContents(codeTxt); getSelection().removeAllRanges(); getSelection().addRange(r); copy.textContent = 'Selecionado'; }
        setTimeout(() => copy.textContent = 'Copiar', 1500);
      };
      Object.assign(this.ui, { sec, status, maxRow, create, codeBox, codeTxt, share, joinRow, leave, inp, join });
      this.refreshUi({ status: 'offline' });
    },
    refreshUi(s) {
      const u = this.ui, st = s.status, idle = st === 'offline';
      u.create.style.display = u.joinRow.style.display = u.maxRow.style.display = idle ? '' : 'none';
      u.codeBox.style.display = u.share.style.display = (st === 'waiting' || st === 'connected') && Network.role === 'host' ? '' : 'none';
      u.leave.style.display = idle ? 'none' : '';
      if (s.msg) u.status.textContent = s.msg;
      u.codeTxt.textContent = Network.code;
    },
    onStatus(s) {
      if (s.status === 'connected') { s.msg = this.infoMsg(); this.autoJoin = false; }
      else if (s.status === 'offline' && this.autoJoin) { this.autoJoin = false; Menu.open(true); } // falhou ao entrar pelo link: abre o menu para mostrar o motivo
      this.refreshUi(s);
    },
    /** Atualiza a mensagem do menu e o HUD quando entra/sai gente. */
    refreshInfo() {
      if (Network.status === 'connected') this.refreshUi({ status: 'connected', msg: this.infoMsg() });
      this.updateHud();
    },
    /** Link que abre o jogo já entrando nesta sala: mesma página + ?sala=CODIGO (só funciona para os outros se o jogo estiver hospedado, não aberto como arquivo). */
    roomLink() {
      const u = new URL(location.href); u.search = ''; u.hash = '';
      u.searchParams.set('sala', Network.code); return u.toString();
    },
    /** Abriu o jogo por um link ?sala=CODIGO: entra na sala sozinho. */
    autoJoinFromLink() {
      let code = '';
      try { const q = new URLSearchParams(location.search); code = (q.get('sala') || q.get('room') || '').trim(); } catch (_) {}
      if (!code) return;
      this.ui.inp.value = code.toUpperCase(); this.autoJoin = true;
      try { const u = new URL(location.href); u.searchParams.delete('sala'); u.searchParams.delete('room'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch (_) {} // não reentra ao recarregar
      setTimeout(() => Network.join(code), 400);
    },
    /** Rola o menu até a seção (usado pelo botão MULTIJOGADOR da tela inicial). */
    focus() { this.ui.sec.scrollIntoView({ block: 'center' }); },

    // ---------- HUD: barra de vida discreta (só do próprio jogador) ----------
    buildHud() {
      const hud = h('div'), bar = h('div', 'bar'), fill = h('i'), score = h('span', 'score');
      hud.id = 'mp-hud'; bar.appendChild(fill); hud.append(bar, score);
      const vig = h('div'); vig.id = 'mp-vig';
      const dead = h('div', null, 'Você foi derrotado · renascendo…'); dead.id = 'mp-dead';
      document.body.append(hud, vig, dead);
      Object.assign(this.ui, { fill, score, vig, deadMsg: dead });
    },
    updateHud() {
      const hp = Model.hp, pct = hp.cur / hp.max * 100;
      this.ui.fill.style.width = pct + '%'; this.ui.fill.style.background = `hsl(${pct * 1.2},70%,45%)`;
      this.ui.score.textContent = `Abates ${Model.kills} · Mortes ${Model.deaths}` + (this.active ? ` · Jogadores ${this.count()}/${Network.max}` : '');
    },

    // ---------- Jogadores ----------
    addPlayer(id) {
      if (id === this.idx || Model.remotes[id]) return;
      Model.remotes[id] = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, cr: 0, dead: false, snap: true, got: false, push: null };
      View.addAvatar(id, colorOf(id));
    },
    removePlayer(id) { delete Model.remotes[id]; View.removeAvatar(id); },

    // ---------- Partida ----------
    /** Anfitrião: entrou um jogador. O primeiro inicia a partida; os próximos entram na que está rolando. */
    onJoin(id) {
      if (!this.active) { this.seed = (Math.random() * 2147483647) | 0; this.startMatch(this.seed, 0); }
      Network.sendTo(id, { t: 'welcome', id, seed: this.seed, max: Network.max, players: [0, ...Object.keys(Model.remotes).map(Number)] });
      Network.send({ t: 'join', id }, id); // avisa os que já estavam
      this.addPlayer(id); this.refreshInfo();
    },
    /** Anfitrião: um jogador saiu. Se não sobrou ninguém, a partida acaba e a sala continua aberta. */
    onLeft(id) {
      this.removePlayer(id); Network.send({ t: 'left', id });
      if (!Object.keys(Model.remotes).length) { this.endMatch(); Network.setStatus('waiting', 'Todos saíram. A sala continua aberta — envie o código.'); }
      else this.refreshInfo();
    },
    /** Mesmo mapa (semente), ponto de nascimento próprio e cor de bala do seu id. */
    startMatch(seed, idx) {
      this.idx = idx; this.active = true; this.dead = false; Input.resume('dead');
      Menu.close();
      if (FPS.TitleScreen && FPS.TitleScreen.active) FPS.TitleScreen.play(false); // false: sem pointer lock (não há clique)
      View.clearAvatars(); Model.remotes = {};
      Model.generateWorld(seed); View.rebuildWorld(); Model.respawn(idx);
      Model.bulletColor = colorOf(idx); Model.kills = Model.deaths = 0; Model.resetAmmo();
      document.body.classList.add('mp-on'); this.ui.deadMsg.classList.remove('on'); this.updateHud();
    },
    endMatch() {
      if (!this.active) return;
      this.active = false; this.dead = false; Input.resume('dead');
      Model.bulletColor = null; View.clearAvatars(); Model.remotes = {};
      document.body.classList.remove('mp-on'); this.ui.deadMsg.classList.remove('on'); this.updateHud();
    },
    onData(m) {
      const r = Model.remotes[m.p];
      switch (m.t) {
        case 'welcome': // convidado: entrei na sala
          Network.max = m.max; this.startMatch(m.seed, m.id);
          m.players.forEach(id => this.addPlayer(id));
          this.tpFlag = true; this.sendT = 1; // nasce no ponto fixo do seu id (Model.spawns) e já avisa a posição
          this.refreshInfo(); break;
        case 'join': if (this.active) { this.addPlayer(m.id); this.refreshInfo(); } break;
        case 'left': this.removePlayer(m.id); this.refreshInfo(); break;
        case 'state':
          if (!r) break;
          Object.assign(r, { x: m.x, y: m.y, z: m.z, yaw: m.yaw, pitch: m.pitch || 0, cr: m.cr || 0, ln: m.ln || 0 });
          if (!r.got) { r.got = true; r.snap = true; }
          if (m.tp) { r.snap = true; r.dead = false; r.push = null; View.clearBodySplats(View.avatars[m.p]); } // renasceu: teleporta e limpa manchas
          break;
        case 'shot': { // tiro de outro jogador: só visual; se m.hit é o meu id, eu perco vida
          const from = vec(m.f), to = vec(m.to);
          const stain = m.hit >= 0 && m.hit !== this.idx ? View.bodyStain(m.hit, from, to) : null; // acertou um TERCEIRO: mancha no corpo dele
          View.spawnBullet(from, to, m.n ? vec(m.n) : null, colorOf(m.p), stain);
          bus.emit('remoteshot', { pos: from });
          this.checkWhiz(from, to, m.hit);
          if (m.hit === this.idx) this.takeHit(m.p);
          break;
        }
        case 'dead': // alguém morreu: avatar tomba; se fui eu quem matou, ganho 1 abate
          if (r) { r.dead = true; r.push = m.k === this.idx ? Model.player : (Model.remotes[m.k] || null); }
          if (m.k === this.idx) { Model.kills++; this.updateHud(); }
          break;
      }
    },
    /** Bala de outro jogador que PASSA perto de você (sem te acertar): toca o "fiuu" quando ela chega ao ponto mais próximo. */
    checkWhiz(from, to, hit) {
      if (hit === this.idx || this.dead) return;
      const p = Model.player, c = new THREE.Vector3(p.x, p.y + 1.2, p.z), d = to.clone().sub(from), len2 = d.lengthSq();
      if (len2 < 1e-4) return;
      const t = c.clone().sub(from).dot(d) / len2;
      if (t <= 0.02 || t >= 0.98) return;                 // atrás do atirador ou a bala parou antes/em cima de você: não é "passou"
      const q = from.clone().addScaledVector(d, t);
      if (q.distanceTo(c) > WHIZ_R) return;
      setTimeout(() => bus.emit('whiz', { pos: q }), Math.sqrt(len2) * t / 140 * 1000); // a bala viaja a 140 m/s
    },
    takeHit(by) {
      if (!this.active || this.dead) return;
      this.ui.vig.classList.add('on'); setTimeout(() => this.ui.vig.classList.remove('on'), 150);
      const died = Model.damage(HIT_DMG);
      bus.emit('hurt', { died });
      if (died) {
        Model.deaths++; this.dead = true; this.respawnT = RESPAWN_S; Input.pause('dead');
        this.ui.deadMsg.classList.add('on'); Network.send({ t: 'dead', k: by });
      }
      this.updateHud();
    },
    update(dt) {
      if (!this.active) return;
      this.sendT += dt;
      if (this.sendT >= 1 / SEND_HZ) {
        this.sendT = 0; const p = Model.player;
        Network.send({ t: 'state', x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), pitch: +p.pitch.toFixed(3), cr: +p.crouch.toFixed(2), ln: +p.lean.toFixed(2), tp: this.tpFlag ? 1 : 0 });
        this.tpFlag = false;
      }
      if (this.dead && (this.respawnT -= dt) <= 0) {
        this.dead = false; Input.resume('dead'); Model.resetAmmo(); Model.respawnRandom(Object.values(Model.remotes)); // renasce em OUTRO ponto, longe dos demais
        this.tpFlag = true; this.sendT = 1; this.ui.deadMsg.classList.remove('on'); this.updateHud();
      }
      View.syncRemotes(dt);
    }
  };
  FPS.Multiplayer = Multiplayer;
})(window.FPS = window.FPS || {});
