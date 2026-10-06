/**
 * FEATURE: Ammo — caixas de munição no mapa, coleta e HUD "Munição: pente / reserva".
 *  • Caixas aparecem em posições ALEATÓRIAS (livres de blocos): mantém pelo menos MIN_PICK no mapa
 *    e repõe 1 a cada SPAWN_S segundos até MAX_PICK.
 *  • Coleta: só AGACHADO (tecla de agachar, C por padrão; botão AGACHAR no celular) e a menos de Model.cfg.PICK_R
 *    metros da caixa. Soma Model.cfg.PICK_AMOUNT balas à reserva (máx. Model.cfg.RESERVE_MAX). Emite 'pickup' (som).
 *  • As caixas são locais de cada jogador (no multijogador não são sincronizadas).
 * Para REMOVER: apague .use(FPS.Ammo) em main.js (e as caixas/HUD somem; o limite de balas continua em Weapon).
 * Depende de: $, DESKTOP, clamp, Model, View, Input, bus · Exporta: FPS.Ammo
 */
(function (FPS) {
  'use strict';
  const { DESKTOP, clamp, Model, View, Input, bus } = FPS;

  const MIN_PICK = 5, MAX_PICK = 10, SPAWN_S = 8, MAP = 45;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const Ammo = {
    name: 'municao', t: 0, spawnT: SPAWN_S, ui: {}, key: '',

    init() {
      const root = h('div'), main = h('span', 'am-main'), sub = h('span', 'am-sub');
      root.id = 'ammo'; root.append(main, sub); document.body.appendChild(root);
      Object.assign(this.ui, { root, main, sub });
      this.render(false);
    },

    /** Cria uma caixa em ponto aleatório livre (fora de blocos, longe do jogador e de outras caixas). */
    spawn() {
      const c = Model.cfg, p = Model.player;
      for (let i = 0; i < 60; i++) {
        const x = (Math.random() - .5) * 2 * MAP, z = (Math.random() - .5) * 2 * MAP;
        if (Model.boxes.some(b => Math.hypot(x - clamp(x, b.minX, b.maxX), z - clamp(z, b.minZ, b.maxZ)) < c.R + 1)) continue;
        if (Math.hypot(x - p.x, z - p.z) < 6) continue;
        if (Model.pickups.some(k => Math.hypot(x - k.x, z - k.z) < 4)) continue;
        Model.pickups.push({ x, z, mesh: View.addPickup(x, z) });
        return true;
      }
      return false;
    },

    update(dt) {
      this.t += dt;
      const P = Model.pickups, p = Model.player, A = Model.ammo, c = Model.cfg;
      if (P.length < MIN_PICK) this.spawn();
      else if (P.length < MAX_PICK && (this.spawnT -= dt) <= 0) { this.spawn(); this.spawnT = SPAWN_S; }
      View.animatePickups(this.t);

      let near = false;
      if (!Input.paused && A.reserve < A.reserveMax) {
        for (let i = P.length - 1; i >= 0; i--) {
          const k = P[i];
          if (Math.hypot(k.x - p.x, k.z - p.z) > c.PICK_R || p.y > 1) continue;
          near = true;
          if (p.crouch > .6) { // agachado e perto: coleta
            A.reserve = Math.min(A.reserveMax, A.reserve + c.PICK_AMOUNT);
            View.removePickup(k.mesh); P.splice(i, 1);
            bus.emit('pickup', { x: k.x, z: k.z });
            near = false; break;
          }
        }
      }
      this.render(near);
    },

    /** Atualiza a HUD só quando o texto muda. */
    render(near) {
      const A = Model.ammo, w = Model.weapon;
      let sub = '';
      if (near && !w.reloading) sub = (DESKTOP ? `Agache (${FPS.Settings.keyLabel(FPS.Settings.values.keys.crouch)})` : 'Toque em AGACHAR') + ' para pegar munição';
      else if (w.reloading) sub = 'Recarregando…';
      else if (A.mag === 0 && A.reserve === 0) sub = 'Sem munição — agache perto de uma caixa';
      else if (A.mag === 0) sub = DESKTOP ? `Recarregue (${FPS.Settings.keyLabel(FPS.Settings.values.keys.reload)})` : 'Toque em RECARREGAR';
      const low = A.mag <= 3, key = A.mag + '/' + A.reserve + '|' + sub + '|' + low;
      if (key === this.key) return; this.key = key;
      this.ui.main.textContent = '';
      this.ui.main.append(h('small', null, 'MUNIÇÃO'), h('b', null, String(A.mag)), h('em', null, '/ ' + A.reserve));
      this.ui.sub.textContent = sub;
      this.ui.root.classList.toggle('low', low);
    }
  };

  FPS.Ammo = Ammo;
})(window.FPS = window.FPS || {});
