/**
 * SETTINGS — configurações do jogador (dados puros, sem DOM/THREE).
 * Guarda gráficos (resolução, sombras, distância, FOV), sensibilidade, FPS e as TECLAS de cada ação (keys).
 * Salva automaticamente no localStorage. Presets: low | medium | high | ultra.
 * Alterar uma opção solta vira preset "custom". Quem aplica os valores é a View
 * (View.applySettings) e quem edita é o menu (features/menu.js).
 * Exporta: FPS.Settings
 */
(function (FPS) {
  'use strict';
  const KEY = 'fps.settings.v1';
  /** Opções que cada preset controla. */
  const PRESETS = {
    low:    { renderScale: 0.5,  shadowSize: 0,    viewDistance: 50  },
    medium: { renderScale: 0.75, shadowSize: 1024, viewDistance: 80  },
    high:   { renderScale: 1,    shadowSize: 2048, viewDistance: 100 },
    ultra:  { renderScale: 1.5,  shadowSize: 4096, viewDistance: 160 }
  };
  /** Teclas padrão de cada ação (códigos KeyboardEvent.code). As setas continuam valendo para andar. */
  const KEYS = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', jump: 'Space', fire: 'KeyF', sprint: 'ShiftLeft', crouch: 'KeyC', reload: 'KeyR', leanL: 'KeyQ', leanR: 'KeyE' };
  const KEY_ACTIONS = [['forward', 'Andar para frente'], ['back', 'Andar para trás'], ['left', 'Andar para a esquerda'], ['right', 'Andar para a direita'],
    ['jump', 'Pular'], ['fire', 'Atirar'], ['sprint', 'Correr'], ['crouch', 'Agachar'], ['reload', 'Recarregar'], ['leanL', 'Inclinar para a esquerda'], ['leanR', 'Inclinar para a direita']];
  const NAMES = { Space: 'Espaço', ShiftLeft: 'Shift esq.', ShiftRight: 'Shift dir.', ControlLeft: 'Ctrl esq.', ControlRight: 'Ctrl dir.', AltLeft: 'Alt esq.', AltRight: 'Alt dir.',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Enter: 'Enter', Tab: 'Tab', Backspace: 'Backspace', CapsLock: 'Caps Lock' };
  const base = FPS.DESKTOP ? 'high' : 'medium'; // celular começa mais leve
  const KEYS_VER = 3; // v2: agachar passou de Ctrl para C · v3: inclinar (Q/E)
  const defaults = () => Object.assign({ preset: base, fov: 75, sensitivity: 1, showFps: false, volume: 0.7, keysVer: KEYS_VER, keys: Object.assign({}, KEYS) }, PRESETS[base]);

  const Settings = {
    PRESETS, KEYS, KEY_ACTIONS,
    values: defaults(),
    /** renderScale: multiplicador do pixel ratio · shadowSize: 0 = sem sombras · viewDistance: metros (névoa) */
    load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j) { Object.assign(this.values, j); this.values.keys = Object.assign({}, KEYS, j.keys); this.migrate(j); } } catch (_) {} },
    /** Configuração salva por versão antiga: quem ainda tinha o agachar no Ctrl antigo passa para C (se C era de outra ação, ela fica com o Ctrl). */
    migrate(j) {
      if ((j.keysVer || 1) >= KEYS_VER) return;
      const k = this.values.keys;
      if ((j.keysVer || 1) < 2 && k.crouch === 'ControlLeft') { const o = Object.keys(k).find(a => a !== 'crouch' && k[a] === 'KeyC'); if (o) k[o] = 'ControlLeft'; k.crouch = 'KeyC'; }
      // v3: se Q/E já eram de outra ação, a inclinação ganha uma tecla livre
      const free = ['KeyQ', 'KeyE', 'KeyZ', 'KeyX', 'KeyV', 'KeyB', 'KeyG', 'KeyT'];
      ['leanL', 'leanR'].forEach(a => { if (Object.keys(k).some(o => o !== a && k[o] === k[a])) k[a] = free.find(c => !Object.values(k).includes(c)) || k[a]; });
      this.values.keysVer = KEYS_VER; this.save();
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch (_) {} },
    /** Altera uma opção; se for gráfica, o preset vira "custom". */
    set(key, value) { this.values[key] = value; if (key in PRESETS.high) this.values.preset = 'custom'; this.save(); },
    /** Troca a tecla de uma ação; se outra ação já usava essa tecla, as duas trocam de lugar. */
    setKey(action, code) { const k = this.values.keys, old = k[action]; for (const a in k) if (a !== action && k[a] === code) k[a] = old; k[action] = code; this.save(); },
    /** Nome legível de uma tecla (ex.: 'KeyW' → 'W'). */
    keyLabel(code) { if (NAMES[code]) return NAMES[code]; if (/^Key[A-Z]$/.test(code)) return code.slice(3); if (/^Digit\d$/.test(code)) return code.slice(5); if (/^Numpad/.test(code)) return 'Num ' + code.slice(6); return code; },
    applyPreset(name) { Object.assign(this.values, PRESETS[name], { preset: name }); this.save(); },
    reset() { this.values = defaults(); this.save(); }
  };
  Settings.load();
  FPS.Settings = Settings;
})(window.FPS = window.FPS || {});
