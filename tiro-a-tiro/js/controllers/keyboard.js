/**
 * KEYBOARD — teclado. As teclas de cada ação vêm de Settings.values.keys (menu ⚙ → Controles):
 * padrão W/A/S/D andar · Espaço pular · F atirar · Shift correr · C agachar · R recarregar.
 * As setas também andam. Fonte de entrada ativa em qualquer dispositivo.
 * Depende de: DESKTOP, Input, Settings · Exporta: FPS.KeyboardInput
 */
(function (FPS) {
  'use strict';
  const {DESKTOP, Input, Settings}=FPS;

  const KeyboardInput={name:'teclado',keys:{},src:{move:{x:0,y:0},jump:false,fire:false,crouch:false,reload:false,sprint:false,lean:0},
    init(){
      Input.add(this.src);const k=this.keys;
      addEventListener('keydown',e=>{
        if(e.target&&e.target.tagName==='INPUT')return;k[e.code]=true;
        // só se alguma ação estiver numa tecla Ctrl: evita atalhos do navegador (ex.: Ctrl+R recarregar a página) durante o jogo
        const ctrlBound=Object.values(Settings.values.keys).some(c=>/^Control/.test(c));
        if(DESKTOP&&(e.code==='Space'||e.code.startsWith('Arrow')||(ctrlBound&&e.ctrlKey&&!Input.paused)))e.preventDefault();
      });
      addEventListener('keyup',e=>k[e.code]=false);
      addEventListener('blur',()=>this.clear()); // soltou o foco com a tecla apertada: não fica "preso"
    },
    clear(){for(const c in this.keys)this.keys[c]=false;},
    update(){
      const k=this.keys,s=this.src,K=Settings.values.keys;
      s.move.y=(k[K.back]||k.ArrowDown?1:0)-(k[K.forward]||k.ArrowUp?1:0);
      s.move.x=(k[K.right]||k.ArrowRight?1:0)-(k[K.left]||k.ArrowLeft?1:0);
      s.jump=!!k[K.jump];s.fire=!!k[K.fire];
      s.lean=(k[K.leanR]?1:0)-(k[K.leanL]?1:0);s.sprint=!!k[K.sprint];s.crouch=!!k[K.crouch];s.reload=!!k[K.reload];
    }
  };

  FPS.KeyboardInput=KeyboardInput;
})(window.FPS = window.FPS || {});
