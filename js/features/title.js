/**
 * FEATURE: TitleScreen — tela inicial do "Tiro a Tiro".
 * Mostra o nome do jogo sobre o mapa girando devagar e oferece:
 *   JOGAR · CONFIGURAÇÕES (abre o Menu) · COMO JOGAR · TELA CHEIA.
 * Enquanto está ativa, pausa a entrada (Input.pause('title')) e esconde HUD/arma.
 * Para voltar a ela durante o jogo: FPS.TitleScreen.show() (botão "Menu principal").
 * Para REMOVER: apague .use(FPS.TitleScreen) em main.js (o jogo começa direto) —
 * lembre que o botão "Menu principal" do Menu depende dela.
 * Emite no bus: 'title:show' / 'title:hide' (a música do menu toca enquanto ela está aberta).
 * Para adicionar um botão: acrescente um item em BUTTONS.
 * Depende de: $, DESKTOP, Model, View, Input, Menu · Exporta: FPS.TitleScreen
 */
(function (FPS) {
  'use strict';
  const { $, DESKTOP, Model, View, Input, Menu, bus } = FPS;

  const GAME_NAME = 'Tiro a Tiro';
  /** Lista de controles (usa as teclas atuais de Settings.values.keys). */
  const HOW_TO = () => {
    const L = a => FPS.Settings.keyLabel(FPS.Settings.values.keys[a]);
    return DESKTOP
      ? [[`${L('forward')} ${L('left')} ${L('back')} ${L('right')} / setas`, 'andar'], ['Mouse', 'olhar'], [`Botão esquerdo ou ${L('fire')}`, 'atirar'], [L('jump'), 'pular'],
         [L('sprint'), 'correr (cansa: o fôlego acaba)'], [L('crouch'), 'agachar (pega munição)'], [`${L('leanL')} / ${L('leanR')}`, 'inclinar para os lados'],, [L('reload'), 'recarregar'], ['M ou Esc', 'configurações (aqui você muda as teclas)']]
      : [['Analógico (esquerda)', 'andar'], ['Arrastar (direita)', 'olhar'], ['ATIRAR', 'botão vermelho'], ['PULAR', 'botão cinza'], ['AGACHAR', 'toque p/ agachar e pegar munição'], ['RECARREGAR', 'recarrega a arma'], ['⚙', 'configurações · use o celular na horizontal']];
  };

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const TitleScreen = {
    name: 'title', active: false, ui: {}, saved: { yaw: 0, pitch: 0 },

    /** Monta a tela (DOM) e já a exibe. */
    init() {
      const BUTTONS = [
        { label: 'JOGAR', primary: true, on: () => this.play() },
        { label: 'MULTIJOGADOR', on: () => { Menu.open(true); FPS.Multiplayer && FPS.Multiplayer.focus(); } },
        { label: 'CONFIGURAÇÕES', on: () => Menu.open(true) },
        { label: 'COMO JOGAR', on: () => this.showPanel('how') },
        { label: 'TELA CHEIA', on: () => this.toggleFullscreen() }
      ];
      const root = h('div'); root.id = 'title';
      const main = h('div', 'tt-main');
      const logo = h('h1', 'tt-logo'); logo.append(h('span', null, 'TIRO'), h('small', null, 'a'), h('span', null, 'TIRO'));
      main.append(logo);
      const btns = h('div', 'tt-btns');
      BUTTONS.forEach(b => { const e = h('button', b.primary ? 'primary' : '', b.label); e.onclick = b.on; btns.appendChild(e); });
      main.appendChild(btns);
      const how = h('div', 'tt-how');
      how.appendChild(h('h2', null, 'Como jogar'));
      const back = h('button', 'primary', 'Voltar'); back.onclick = () => this.showPanel('main'); how.appendChild(back);
      root.append(main, how, h('div', 'tt-foot', 'feito por carlosdaniel-fDev · v1.0'));
      document.body.appendChild(root);
      Object.assign(this.ui, { root, main, how });
      addEventListener('keydown', e => { if (this.active && !Menu.isOpen && e.code === 'Enter' && this.ui.main.style.display !== 'none') this.play(); });
      this.show();
    },

    /** Alterna entre o painel principal ('main') e "Como jogar" ('how'). */
    /** Preenche "Como jogar" com as teclas atuais (antes do botão Voltar). */
    fillHow() {
      const how = this.ui.how, back = how.querySelector('button'); how.querySelectorAll('.tt-line').forEach(e => e.remove());
      HOW_TO().forEach(([k, v]) => { const r = h('div', 'tt-line'); r.append(h('b', null, k), h('span', null, v)); how.insertBefore(r, back); });
    },
    showPanel(name) { if (name === 'how') this.fillHow(); this.ui.main.style.display = name === 'main' ? '' : 'none'; this.ui.how.style.display = name === 'how' ? 'flex' : 'none'; },

    /** Exibe a tela inicial: pausa a entrada, esconde HUD e arma e guarda a câmera. */
    show() {
      const p = Model.player; this.saved = { yaw: p.yaw, pitch: p.pitch };
      this.active = true; Input.pause('title'); Menu.enabled = false;
      document.body.classList.add('on-title'); View.gun.visible = false;
      if (document.pointerLockElement) document.exitPointerLock();
      this.showPanel('main'); this.ui.root.classList.add('open'); document.title = GAME_NAME;
      bus.emit('title:show'); // o Sound toca a música do menu
    },

    /** Começa/continua o jogo; no PC já captura o mouse (o clique conta como gesto do usuário). */
    play(lock = true) {
      this.active = false; Input.resume('title'); Menu.enabled = true;
      document.body.classList.remove('on-title'); View.gun.visible = true;
      Model.player.yaw = this.saved.yaw; Model.player.pitch = this.saved.pitch;
      this.ui.root.classList.remove('open');
      bus.emit('title:hide'); // para a música do menu
      if (DESKTOP && lock) { try { const r = $('c').requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
    },

    toggleFullscreen() {
      const d = document, el = d.documentElement;
      try { d.fullscreenElement ? d.exitFullscreen() : el.requestFullscreen && el.requestFullscreen(); } catch (_) {}
    },

    /** Faz a câmera girar lentamente sobre o mapa enquanto a tela inicial está aberta. */
    update(dt) {
      if (!this.active) return;
      const p = Model.player; p.yaw += dt * 0.12; p.pitch = 0.05;
    }
  };
  FPS.TitleScreen = TitleScreen;
})(window.FPS = window.FPS || {});
