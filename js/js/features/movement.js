/**
 * FEATURE: Movement
 * Andar, correr, pular, agachar, inclinar (Q/E), gravidade e colisão (delegado ao Model.step).
 * Depende de: Model · Exporta: FPS.Movement
 */
(function (FPS) {
  'use strict';
  const {Model,bus}=FPS;

  const Movement={name:'movimento',update(dt,inp){
      const wasGround=Model.player.onGround;
      Model.step(dt,inp.x,inp.y,inp.jump,inp.crouch,inp.sprint);
      if(wasGround&&!Model.player.onGround&&Model.player.vy>0)bus.emit('jump'); // saiu do chão pulando: toca o som
      // inclinar (Q/E): vai até onde não enfia a câmera num bloco; suavizado
      const p=Model.player,dir=Math.sign(inp.lean||0),target=dir*Model.leanLimit(dir);
      p.lean+=(target-p.lean)*Math.min(1,dt*12);
      if(Math.abs(p.lean)<.001&&!dir)p.lean=0;
    }};

  FPS.Movement=Movement;
})(window.FPS = window.FPS || {});
