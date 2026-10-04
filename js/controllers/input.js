/**
 * INPUT — hub de entradas.
 * Cada fonte (teclado, mouse, toque, gamepad...) registra {move:{x,y}, jump, fire, crouch, reload, sprint} com Input.add().
 * Input.poll() soma tudo e devolve um único estado por frame. Input.blocked (retrato) e Input.paused (menu/tela inicial: use Input.pause(motivo) e Input.resume(motivo)) zeram a entrada.
 * Depende de: (nada) · Exporta: FPS.Input
 */
(function (FPS) {
  'use strict';

  const Input={
    sources:[],blocked:false,
    pauses:new Set(), // motivos de pausa ativos ('menu', 'title'...)
    get paused(){return this.pauses.size>0;},
    pause(reason){this.pauses.add(reason);},
    resume(reason){this.pauses.delete(reason);},
    add(src){this.sources.push(src);return src;}, // src: {move:{x,y}, jump, fire}
    poll(){
      let x=0,y=0,lean=0,jump=false,fire=false,crouch=false,reload=false,sprint=false;
      for(const s of this.sources){lean+=s.lean||0;x+=s.move.x;y+=s.move.y;jump=jump||s.jump;fire=fire||s.fire;crouch=crouch||!!s.crouch;reload=reload||!!s.reload;sprint=sprint||!!s.sprint;}
      if(this.blocked||this.paused)return{x:0,y:0,jump:false,fire:false,crouch:false,reload:false,sprint:false,lean:0};
      const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}
      return{x,y,lean:Math.max(-1,Math.min(1,lean)),jump,fire,crouch,reload,sprint};
    }
  };

  FPS.Input=Input;
})(window.FPS = window.FPS || {});
