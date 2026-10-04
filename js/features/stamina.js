/**
 * FEATURE: Stamina — barra de fôlego (HUD). A regra fica no Model.step:
 *  • correr (Shift) gasta fôlego (Model.cfg.STAM_DRAIN por segundo); parado ou andando ele volta (STAM_REGEN);
 *  • zerou = CANSADO: não dá para correr e você anda mais devagar (TIRED_MULT) até o fôlego passar de STAM_RECOVER.
 * A barra só aparece quando o fôlego não está cheio. Fica vermelha e pisca quando cansado.
 * Para REMOVER só a barra: apague .use(FPS.Stamina) em main.js (a regra de fôlego continua no Model).
 * Depende de: Model · Exporta: FPS.Stamina
 */
(function (FPS) {
  'use strict';
  const { Model } = FPS;

  const Stamina = {
    name: 'folego', ui: {}, key: '',

    init() {
      const root = document.createElement('div'), bar = document.createElement('i'), txt = document.createElement('span');
      root.id = 'stamina'; txt.className = 'st-txt';
      const track = document.createElement('div'); track.className = 'st-bar'; track.appendChild(bar);
      root.append(track, txt); document.body.appendChild(root);
      Object.assign(this.ui, { root, bar, txt });
    },

    update() {
      const p = Model.player, pct = Math.round(p.stamina * 100);
      const key = pct + '|' + p.tired; if (key === this.key) return; this.key = key;
      const u = this.ui;
      u.bar.style.width = pct + '%';
      u.root.classList.toggle('show', p.stamina < .999 || p.tired); // cheio: some
      u.root.classList.toggle('tired', p.tired);
      u.root.classList.toggle('low', !p.tired && p.stamina < .3);
      u.txt.textContent = p.tired ? 'Cansado…' : '';
    }
  };

  FPS.Stamina = Stamina;
})(window.FPS = window.FPS || {});
