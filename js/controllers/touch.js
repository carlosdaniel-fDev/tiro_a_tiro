/**
 * TOUCH — modo celular.
 * Analógico flutuante (esquerda), olhar por arrasto (direita) e botões PULAR/ATIRAR.
 * Depende de: $, DESKTOP, Input, Model · Exporta: FPS.TouchInput
 */
(function (FPS) {
  'use strict';
  const {$, DESKTOP, Input, Model}=FPS;

  const TouchInput={name:'toque',src:{move:{x:0,y:0},jump:false,fire:false,crouch:false,reload:false},
    init(){
      if(DESKTOP)return;
      Input.add(this.src);const s=this.src;
      const hold=(el,key)=>{
        const on=e=>{e.preventDefault();s[key]=true;el.classList.add('on');},off=()=>{s[key]=false;el.classList.remove('on');};
        el.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave'].forEach(t=>el.addEventListener(t,off));
      };
      hold($('jump'),'jump');hold($('fire'),'fire');hold($('reload'),'reload');
      // agachar: toque liga/desliga (o polegar fica livre p/ mirar e atirar)
      const cr=$('crouch');cr.addEventListener('pointerdown',e=>{e.preventDefault();s.crouch=!s.crouch;cr.classList.toggle('on',s.crouch);});
      // analógico flutuante (esquerda)
      const zone=$('zoneL'),base=$('base'),knob=$('knob');let id=null,jx=0,jy=0;
      zone.addEventListener('pointerdown',e=>{
        if(id!==null)return;id=e.pointerId;zone.setPointerCapture(id);jx=e.clientX;jy=e.clientY;
        base.style.display='block';base.style.left=jx+'px';base.style.top=jy+'px';knob.style.transform='translate(0,0)';
      });
      zone.addEventListener('pointermove',e=>{
        if(e.pointerId!==id)return;let dx=e.clientX-jx,dy=e.clientY-jy;const max=50,l=Math.hypot(dx,dy);
        if(l>max){dx=dx/l*max;dy=dy/l*max;}
        knob.style.transform=`translate(${dx}px,${dy}px)`;s.move.x=dx/max;s.move.y=dy/max;
      });
      const end=e=>{if(e.pointerId!==id)return;id=null;s.move.x=s.move.y=0;base.style.display='none';};
      zone.addEventListener('pointerup',end);zone.addEventListener('pointercancel',end);
      // olhar (direita)
      const zr=$('zoneR');let lid=null,lx=0,ly=0;
      zr.addEventListener('pointerdown',e=>{if(lid!==null)return;lid=e.pointerId;zr.setPointerCapture(lid);lx=e.clientX;ly=e.clientY;});
      zr.addEventListener('pointermove',e=>{if(e.pointerId!==lid)return;Model.look((e.clientX-lx)*.005,(e.clientY-ly)*.005);lx=e.clientX;ly=e.clientY;});
      const lend=e=>{if(e.pointerId===lid)lid=null;};
      zr.addEventListener('pointerup',lend);zr.addEventListener('pointercancel',lend);
      $('hint');setTimeout(()=>$('hint').style.opacity=0,5000);
    },
    update(){}
  };

  FPS.TouchInput=TouchInput;
})(window.FPS = window.FPS || {});
