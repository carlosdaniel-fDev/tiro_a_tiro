/**
 * FEATURE: Menu — configurações gráficas e de controle.
 * Botão ⚙ (canto superior direito) ou tecla M / Esc abre o painel. Cada opção tem
 * botões − e + para diminuir/aumentar. O jogo pausa a entrada, mas continua
 * renderizando, então você vê o efeito das mudanças em tempo real.
 * Para adicionar uma opção: acrescente um item em ROWS (e o valor em Settings/View).
 * Depende de: $, DESKTOP, Input, View, Settings (usa FPS.TitleScreen em runtime) · Exporta: FPS.Menu
 */
(function (FPS) {
  'use strict';
  const { $, DESKTOP, Input, View, Settings } = FPS;

  const range = (a, b, st) => { const r = []; for (let v = a; v <= b + 1e-9; v += st) r.push(+v.toFixed(2)); return r; };
  const names = (map) => v => map[v];

  /** Linhas do menu: key (Settings.values), label, values (lista ordenada) e fmt (como exibir). */
  const ROWS = [
    { key: 'preset', label: 'Qualidade geral', values: ['low', 'medium', 'high', 'ultra'],
      fmt: names({ low: 'Baixa', medium: 'Média', high: 'Alta', ultra: 'Ultra', custom: 'Personalizada' }) },
    { key: 'renderScale', label: 'Resolução', values: range(0.5, 2, 0.25), fmt: v => Math.round(v * 100) + '%' },
    { key: 'shadowSize', label: 'Sombras', values: [0, 512, 1024, 2048, 4096],
      fmt: names({ 0: 'Desligadas', 512: 'Baixa', 1024: 'Média', 2048: 'Alta', 4096: 'Ultra' }) },
    { key: 'viewDistance', label: 'Distância de visão', values: range(40, 200, 20), fmt: v => v + ' m' },
    { key: 'fov', label: 'Campo de visão', values: range(60, 110, 5), fmt: v => v + '°' },
    { key: 'sensitivity', label: 'Sensibilidade', values: range(0.5, 2, 0.1), fmt: v => v.toFixed(1) + 'x' },
    { key: 'volume', label: 'Volume', values: range(0, 1, 0.1), fmt: v => v === 0 ? 'Mudo' : Math.round(v * 100) + '%' },
    { key: 'showFps', label: 'Mostrar FPS', values: [false, true], fmt: v => (v ? 'Sim' : 'Não') }
  ];

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  /** Índice do valor da lista mais próximo do atual (preset "custom" fica no meio). */
  const indexOf = (row) => {
    const cur = Settings.values[row.key];
    if (row.key === 'preset' && cur === 'custom') return 1.5;
    if (typeof cur !== 'number') return row.values.indexOf(cur);
    let best = 0; row.values.forEach((v, i) => { if (Math.abs(v - cur) < Math.abs(row.values[best] - cur)) best = i; });
    return best;
  };

  const Menu = {
    name: 'menu', isOpen: false, binding: null, keyBtns: null, enabled: true, // enabled=false: M/Esc não abrem (ex.: na tela inicial)
    ui: {}, frames: 0, acc: 0,

    /** Monta o DOM (botão ⚙, painel e contador de FPS) e registra os atalhos. */
    init() {
      const gear = h('button', null, '⚙'); gear.id = 'gear'; gear.setAttribute('aria-label', 'Configurações');
      const fps = h('div'); fps.id = 'fps';
      const root = h('div'); root.id = 'menu';
      const panel = h('div', 'panel'); root.appendChild(panel);
      const head = h('div', 'mhead'), x = h('button', 'mclose', '✕'); x.setAttribute('aria-label', 'Fechar'); x.onclick = () => this.close();
      head.append(h('h2', null, 'Configurações'), x); panel.appendChild(head); // cabeçalho fixo: o ✕ fica sempre à mão, mesmo rolando o menu no celular
      const rows = h('div', 'rows'); panel.appendChild(rows);

      ROWS.forEach(row => {
        const line = h('div', 'row'), minus = h('button', 'step', '−'), plus = h('button', 'step', '+'), val = h('span', 'val');
        line.append(h('span', 'lbl', row.label), minus, val, plus); rows.appendChild(line);
        minus.onclick = () => this.step(row, -1); plus.onclick = () => this.step(row, +1);
        row.els = { minus, plus, val };
      });
      if (DESKTOP) { // teclas configuráveis: clique no botão e aperte a nova tecla
        const ctl = h('div', 'ctl'); ctl.appendChild(h('h3', null, 'Controles')); this.keyBtns = {};
        Settings.KEY_ACTIONS.forEach(([act, label]) => {
          const line = h('div', 'row'), btn = h('button', 'key');
          btn.onclick = () => this.listen(act);
          line.append(h('span', 'lbl', label), btn); ctl.appendChild(line); this.keyBtns[act] = btn;
        });
        ctl.appendChild(h('p', 'note', 'Clique numa tecla e aperte a nova (Esc cancela). M e Esc são reservadas. Se a tecla já tiver outra função, as duas trocam de lugar. As setas também andam.'));
        panel.appendChild(ctl);
      }
      const actions = h('div', 'actions'), reset = h('button', null, 'Restaurar padrão'), close = h('button', 'primary', 'Continuar'), home = h('button', null, 'Menu principal');
      reset.onclick = () => { Settings.reset(); View.applySettings(); this.refresh(); };
      close.onclick = () => this.close();
      home.onclick = () => { this.close(); FPS.TitleScreen.show(); };
      actions.append(reset, home, close); panel.appendChild(actions);
      document.body.append(gear, fps, root);
      Object.assign(this.ui, { gear, fps, root, close, home, panel, actions }); // panel/actions: outros módulos (ex.: Multiplayer) inserem seções

      gear.onclick = () => this.toggle();
      // captura a nova tecla (fase de captura: roda antes dos outros atalhos)
      addEventListener('keydown', e => {
        if (!this.binding) return;
        e.preventDefault(); e.stopImmediatePropagation();
        const act = this.binding; this.binding = null;
        if (e.code !== 'Escape' && e.code !== 'KeyM') { Settings.setKey(act, e.code); FPS.KeyboardInput.clear(); }
        this.refresh();
      }, true);
      addEventListener('keydown', e => {
        if (e.target && e.target.tagName === 'INPUT') return; // digitando (ex.: código da sala)
        if (!this.enabled && !this.isOpen) return;
        if (e.code === 'KeyM' || (e.code === 'Escape' && this.isOpen)) this.toggle();
      });
      // Esc com mouse capturado só solta o mouse: aproveitamos para abrir o menu
      let wasLocked = false;
      document.addEventListener('pointerlockchange', () => {
        const locked = !!document.pointerLockElement;
        if (wasLocked && !locked && !this.isOpen && this.enabled) this.open();
        wasLocked = locked;
      });
      this.refresh();
    },

    /** Move uma opção para o valor anterior (-1) ou seguinte (+1) e aplica na View. */
    step(row, dir) {
      const i = Math.max(0, Math.min(row.values.length - 1, Math.round(indexOf(row) + dir * (indexOf(row) % 1 ? 0.5 : 1))));
      const v = row.values[i];
      if (row.key === 'preset') Settings.applyPreset(v); else Settings.set(row.key, v);
      View.applySettings(); this.refresh();
    },

    /** Atualiza textos e desabilita − / + nos limites. */
    refresh() {
      if (this.keyBtns) for (const a in this.keyBtns) this.keyBtns[a].textContent = this.binding === a ? 'Aperte uma tecla…' : Settings.keyLabel(Settings.values.keys[a]);
      ROWS.forEach(row => {
        const i = indexOf(row), cur = Settings.values[row.key];
        row.els.val.textContent = row.fmt(cur);
        row.els.minus.disabled = i <= 0; row.els.plus.disabled = i >= row.values.length - 1;
      });
    },
    /** fromTitle=true: botão vira "Voltar" e esconde "Menu principal". */
    open(fromTitle = false) {
      if (this.isOpen) return; this.isOpen = true; Input.pause('menu'); FPS.KeyboardInput.clear();
      this.ui.close.textContent = fromTitle ? 'Voltar' : 'Continuar'; this.ui.home.style.display = fromTitle ? 'none' : '';
               if (document.pointerLockElement) document.exitPointerLock(); this.ui.root.classList.add('open');
    },
    listen(act) { this.binding = act; this.refresh(); },
    close()  { this.isOpen = false; this.binding = null; this.refresh(); Input.resume('menu'); this.ui.root.classList.remove('open'); },
    toggle() { this.isOpen ? this.close() : this.open(); },

    /** Contador de FPS (média a cada 0,5 s) quando "Mostrar FPS" está ligado. */
    update(dt) {
      const on = Settings.values.showFps; this.ui.fps.style.display = on ? 'block' : 'none';
      if (!on) return;
      this.frames++; this.acc += dt;
      if (this.acc >= 0.5) { this.ui.fps.textContent = Math.round(this.frames / this.acc) + ' FPS'; this.frames = 0; this.acc = 0; }
    }
  };
  FPS.Menu = Menu;
})(window.FPS = window.FPS || {});
