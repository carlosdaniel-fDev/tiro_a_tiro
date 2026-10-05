/**
 * TOUCH — modo celular. Tem TODOS os controles do computador:
 *  • Analógico flutuante (metade esquerda): andar
 *  • Arrastar (metade direita): olhar · também dá para arrastar em cima do botão ATIRAR (olha e atira juntos)
 *  • ATIRAR · PULAR · RECARREGAR (segurar)
 *  • AGACHAR e CORRER (toque liga/desliga; CORRER desliga sozinho ao soltar o analógico)
 *  • ◀ INCL. / INCL. ▶ (segurar): inclinar para os lados (Q/E do PC)
 *  • ⚙ (canto): configurações (M/Esc do PC)
 * Cada botão rastreia o seu próprio dedo (pointerId + pointer capture): escorregar o dedo para fora
 * do botão NÃO solta mais a ação, e vários dedos funcionam ao mesmo tempo.
 * Ao abrir o menu / tela inicial / girar para retrato, tudo é solto (nada fica "preso").
 * Depende de: $, DESKTOP, Input, Model, bus · Exporta: FPS.TouchInput
 */
(function (FPS) {
  'use strict';
  const {$, DESKTOP, Input, Model, bus}=FPS;

  const TouchInput={name:'toque',
    src:{move:{x:0,y:0},jump:false,fire:false,crouch:false,reload:false,sprint:false,lean:0},
    resets:[],wasOff:false,joyActive:false,
    init(){
      if(DESKTOP)return;
      document.body.classList.add('touch');
      Input.add(this.src);const s=this.src,resets=this.resets;
      const buzz=ms=>{try{navigator.vibrate&&navigator.vibrate(ms);}catch(_){}};

      // sem menu de contexto (toque longo), seleção de texto, arrastar imagem ou zoom por gesto
      const stop=e=>{const t=e.target;if(t&&t.closest&&t.closest('input,textarea'))return;e.preventDefault();};
      ['contextmenu','selectstart','dragstart','gesturestart','gesturechange'].forEach(t=>document.addEventListener(t,stop,{passive:false}));

      // botão de segurar: ativo enquanto o SEU dedo estiver apertando (mesmo que escorregue para fora)
      const hold=(el,apply,onMove)=>{
        let id=null;
        const on=e=>{
          e.preventDefault();if(id!==null)return;id=e.pointerId;
          try{el.setPointerCapture(id);}catch(_){}
          el.classList.add('on');apply(true);buzz(8);
        };
        const off=e=>{if(e&&e.pointerId!==id)return;id=null;el.classList.remove('on');apply(false);};
        el.addEventListener('pointerdown',on);
        ['pointerup','pointercancel','lostpointercapture'].forEach(t=>el.addEventListener(t,off));
        if(onMove)el.addEventListener('pointermove',e=>{if(e.pointerId===id)onMove(e);});
        resets.push(()=>{id=null;el.classList.remove('on');apply(false);});
      };
      // botão liga/desliga
      const toggle=(el,key)=>{
        const set=v=>{s[key]=v;el.classList.toggle('on',v);};
        el.addEventListener('pointerdown',e=>{e.preventDefault();set(!s[key]);buzz(8);});
        resets.push(()=>set(false));return set;
      };

      // olhar arrastando (usado pela metade direita e pelo botão ATIRAR)
      const lookFrom=()=>{let lx=0,ly=0,first=true;return{
        start(e){lx=e.clientX;ly=e.clientY;first=false;},
        move(e){if(first){this.start(e);return;}Model.look((e.clientX-lx)*.005,(e.clientY-ly)*.005);lx=e.clientX;ly=e.clientY;}
      };};
      const fireLook=lookFrom();
      hold($('jump'),v=>{s.jump=v;});
      hold($('reload'),v=>{s.reload=v;});
      hold($('fire'),v=>{s.fire=v;},e=>fireLook.move(e));
      $('fire').addEventListener('pointerdown',e=>fireLook.start(e));
      toggle($('crouch'),'crouch');
      const setSprint=toggle($('sprint'),'sprint');
      this.setSprint=setSprint;
      // inclinar: segurar (esquerda = -1, direita = +1)
      let lL=false,lR=false;const leanUpd=()=>{s.lean=(lR?1:0)-(lL?1:0);};
      hold($('leanL'),v=>{lL=v;leanUpd();});
      hold($('leanR'),v=>{lR=v;leanUpd();});

      // analógico flutuante (esquerda)
      const zone=$('zoneL'),base=$('base'),knob=$('knob');let id=null,jx=0,jy=0;
      const joyOff=()=>{id=null;this.joyActive=false;s.move.x=s.move.y=0;base.style.display='none';};
      resets.push(joyOff);
      zone.addEventListener('pointerdown',e=>{
        e.preventDefault();if(id!==null)return;id=e.pointerId;this.joyActive=true;
        try{zone.setPointerCapture(id);}catch(_){}
        jx=e.clientX;jy=e.clientY;
        base.style.display='block';base.style.left=jx+'px';base.style.top=jy+'px';knob.style.transform='translate(0,0)';
      });
      zone.addEventListener('pointermove',e=>{
        if(e.pointerId!==id)return;
        let dx=e.clientX-jx,dy=e.clientY-jy;const max=50,l=Math.hypot(dx,dy);
        if(l>max){ // arrastou além do limite: a base acompanha o dedo (não "trava" no canto)
          const k=(l-max)/l;jx+=dx*k;jy+=dy*k;dx=e.clientX-jx;dy=e.clientY-jy;
          base.style.left=jx+'px';base.style.top=jy+'px';
        }
        knob.style.transform=`translate(${dx}px,${dy}px)`;
        let nx=dx/max,ny=dy/max;const m=Math.hypot(nx,ny);
        if(m<.12){nx=ny=0;}                       // zona morta: não anda sem querer
        s.move.x=nx;s.move.y=ny;
      });
      ['pointerup','pointercancel','lostpointercapture'].forEach(t=>zone.addEventListener(t,e=>{if(e.pointerId===id)joyOff();}));

      // olhar (direita)
      const zr=$('zoneR'),look=lookFrom();let lid=null;
      zr.addEventListener('pointerdown',e=>{e.preventDefault();if(lid!==null)return;lid=e.pointerId;try{zr.setPointerCapture(lid);}catch(_){}look.start(e);});
      zr.addEventListener('pointermove',e=>{if(e.pointerId===lid)look.move(e);});
      ['pointerup','pointercancel','lostpointercapture'].forEach(t=>zr.addEventListener(t,e=>{if(e.pointerId===lid)lid=null;}));
      resets.push(()=>{lid=null;});

      // dica de controles: aparece quando o jogo começa e some depois de 5 s
      const hint=$('hint');hint.textContent='Esquerda: andar · Direita: arrastar para olhar · ⚙ configurações';
      let ht=0;const showHint=()=>{hint.style.opacity=.9;clearTimeout(ht);ht=setTimeout(()=>hint.style.opacity=0,5000);};
      bus.on('title:hide',showHint);ht=setTimeout(()=>hint.style.opacity=0,5000);
    },
    /** Solta todos os controles (menu aberto, tela inicial, retrato...). */
    releaseAll(){this.resets.forEach(f=>f());},
    update(){
      if(DESKTOP)return;
      const off=Input.paused||Input.blocked;
      if(off&&!this.wasOff)this.releaseAll();           // acabou de pausar: não deixa nada preso
      this.wasOff=off;
      // CORRER: pode ser ligado antes de andar; desliga quando o analógico é solto depois de andar
      if(this.joyActive)this.wasJoy=true;
      else if(this.wasJoy){this.wasJoy=false;if(this.src.sprint)this.setSprint(false);}
    }
  };

  FPS.TouchInput=TouchInput;
})(window.FPS = window.FPS || {});
