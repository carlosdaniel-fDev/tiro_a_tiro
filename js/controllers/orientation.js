/**
 * ORIENTATION — só celular.
 * Bloqueia a entrada em modo retrato e tenta tela cheia + travar paisagem.
 * Depende de: DESKTOP, Input · Exporta: FPS.OrientationGuard
 */
(function (FPS) {
  'use strict';
  const {DESKTOP, Input}=FPS;

  const OrientationGuard={name:'orientacao',
    init(){
      if(DESKTOP)return;
      const mq=matchMedia('(orientation: portrait)');Input.blocked=mq.matches;
      mq.addEventListener('change',()=>{Input.blocked=mq.matches;});
      let tried=false;
      addEventListener('pointerdown',async()=>{
        if(tried)return;tried=true;
        try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();
          if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape');}catch(_){}
      });
    },
    update(){}
  };

  FPS.OrientationGuard=OrientationGuard;
})(window.FPS = window.FPS || {});
