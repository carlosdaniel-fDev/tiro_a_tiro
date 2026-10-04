/**
 * FEATURE: Effects
 * Atualiza balas em voo e manchas de tinta (somem em 6 s).
 * Depende de: View · Exporta: FPS.Effects
 */
(function (FPS) {
  'use strict';
  const {View}=FPS;

  const Effects={name:'efeitos',update(dt){View.updateEffects(dt);}};

  FPS.Effects=Effects;
})(window.FPS = window.FPS || {});
