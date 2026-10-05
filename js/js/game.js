/**
 * GAME — registra módulos e roda o loop principal.
 * Game.use(feature) adiciona um módulo {name, init(), update(dt, input)}.
 * Game.start() gera o mundo, inicializa a View e os módulos e inicia o requestAnimationFrame.
 * Depende de: Model, View, Input · Exporta: FPS.Game
 */
(function (FPS) {
  'use strict';
  const {Model, View, Input}=FPS;

  const Game={
    features:[],
    use(f){this.features.push(f);return this;},
    start(){
      Model.generateWorld();View.init();
      for(const f of this.features)f.init&&f.init();
      let last=performance.now();
      const loop=now=>{
        const dt=Math.min((now-last)/1000,.05);last=now;
        const inp=Input.poll();
        for(const f of this.features)f.update&&f.update(dt,inp);
        View.syncCamera();View.render();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  };

  FPS.Game=Game;
})(window.FPS = window.FPS || {});
