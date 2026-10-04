/**
 * MOUSE — modo computador.
 * Captura o mouse (pointer lock) para olhar/atirar. Se o navegador bloquear,
 * usa arrastar com botão esquerdo para olhar e botão direito para atirar.
 * Depende de: $, DESKTOP, Input, Model · Exporta: FPS.MouseInput
 */
(function (FPS) {
  'use strict';
  const {$, DESKTOP, Input, Model}=FPS;

  const MouseInput={name:'mouse',src:{move:{x:0,y:0},jump:false,fire:false,crouch:false,reload:false},
    init(){
      if(!DESKTOP)return;
      document.body.classList.add('desktop');Input.add(this.src);
      const s=this.src,canvas=$('c'),hint=$('hint');let noLock=false,drag=false;
      const locked=()=>document.pointerLockElement===canvas;
      const showHint=()=>{
        const L=x=>FPS.Settings.keyLabel(FPS.Settings.values.keys[x]),mv=L('forward')+L('left')+L('back')+L('right');
        hint.textContent=noLock?`Arraste com o botão esquerdo para olhar · ${mv} mover · ${L('jump')} pular · ${L('sprint')} correr · ${L('crouch')} agachar · ${L('reload')} recarregar · ${L('leanL')}/${L('leanR')} inclinar · ${L('fire')} ou botão direito atira`
          :locked()?`${mv} mover · ${L('jump')} pular · ${L('sprint')} correr · ${L('crouch')} agachar · ${L('reload')} recarregar · ${L('leanL')}/${L('leanR')} inclinar · Mouse olhar · Clique atirar · M/Esc: configurações`:'Clique na tela para jogar (captura o mouse)';
        hint.style.opacity=1;if(locked()||noLock)setTimeout(()=>hint.style.opacity=0,4500);
      };
      showHint();
      canvas.addEventListener('mousedown',e=>{
        if(e.button!==0||locked())return;drag=true;
        if(!noLock){try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{noLock=true;showHint();});}catch(_){noLock=true;showHint();}}
      });
      document.addEventListener('pointerlockerror',()=>{noLock=true;showHint();});
      document.addEventListener('pointerlockchange',()=>{drag=false;showHint();if(!locked()){s.fire=false;FPS.KeyboardInput.clear();}});
      addEventListener('mousemove',e=>{if(locked()||drag)Model.look(e.movementX*.0022,e.movementY*.0022);});
      addEventListener('mousedown',e=>{if((e.button===0&&locked())||(e.button===2&&noLock)){s.fire=true;e.preventDefault();}});
      addEventListener('mouseup',e=>{if(e.button===0)drag=false;if(e.button===0||e.button===2)s.fire=false;});
      addEventListener('blur',()=>{drag=false;s.fire=false;});
      addEventListener('contextmenu',e=>e.preventDefault());
    },
    update(){}
  };

  FPS.MouseInput=MouseInput;
})(window.FPS = window.FPS || {});
