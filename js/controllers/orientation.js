/**
 * ORIENTATION — só celular.
 * Bloqueia a entrada em modo retrato e tenta tela cheia + travar paisagem.
 * A tela cheia só é permitida depois de um gesto do usuário, e no Android o gesto válido é o
 * FIM do toque (pointerup/touchend) — por isso a tentativa acontece ao soltar o dedo e também
 * no botão JOGAR (OrientationGuard.enter()).
 * Depende de: DESKTOP, Input · Exporta: FPS.OrientationGuard
 */
(function (FPS) {
  'use strict';
  const {DESKTOP, Input}=FPS;

  const OrientationGuard={name:'orientacao',tries:0,
    /** Entra em tela cheia e trava paisagem (precisa ser chamado dentro de um toque/clique). */
    enter(){
      if(DESKTOP)return;
      const el=document.documentElement;
      try{
        const p=(!document.fullscreenElement&&el.requestFullscreen)?el.requestFullscreen({navigationUI:'hide'}):null;
        Promise.resolve(p).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape')).catch(()=>{});
      }catch(_){}
    },
    init(){
      if(DESKTOP)return;
      const mq=matchMedia('(orientation: portrait)');
      const check=()=>{Input.blocked=mq.matches||innerHeight>innerWidth*1.1;};
      check();mq.addEventListener('change',check);addEventListener('resize',check);addEventListener('orientationchange',()=>setTimeout(check,150));
      const tryFs=()=>{if(document.fullscreenElement||this.tries>=3)return;this.tries++;this.enter();};
      addEventListener('pointerup',tryFs);addEventListener('touchend',tryFs);
    },
    update(){}
  };

  FPS.OrientationGuard=OrientationGuard;
})(window.FPS = window.FPS || {});
