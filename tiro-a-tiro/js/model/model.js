/**
 * MODEL — estado e regras do jogo.
 * Sem THREE e sem DOM: dá para testar/alterar a física sem tocar no visual.
 * Configurações (velocidade, gravidade, cadência de tiro...) ficam em Model.cfg.
 * Depende de: clamp, Settings · Exporta: FPS.Model
 */
(function (FPS) {
  'use strict';
  const {clamp, Settings}=FPS;

  /** PRNG determinístico: mesma semente = mesmo mapa nos dois jogadores. */
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

  const Model={
    cfg:{EYE:1.7,R:0.4,GRAVITY:20,JUMP_V:8,STEP:0.35,SPEED:5,SIZE:200,HALF:99,FIRE_RATE:0.14,BOXES:22,
      CROUCH_DROP:0.7,LEAN_OFF:0.45,LEAN_ROLL:0.26,PICK_R:1.6,MAG:12,RESERVE_START:24,RESERVE_MAX:60,PICK_AMOUNT:12,RELOAD_TIME:1.5,SPRINT_MULT:1.6,
      STAM_DRAIN:1/7,STAM_REGEN:1/6,STAM_DELAY:.6,STAM_RECOVER:.5,TIRED_MULT:.65}, // fôlego: gasta 1/7 por s correndo (7 s) · recupera 1/6 por s depois de .6 s · cansado até 50% · cansado anda a 65%
    player:{x:0,y:0,z:8,vy:0,onGround:true,yaw:0,pitch:0,snapOff:0,lean:0,crouch:0,sprint:0,stamina:1,tired:false,fatigue:0,stamDelay:0}, // stamina: fôlego 0..1 · tired: esgotou (sem correr até STAM_RECOVER) · fatigue: 0→1 suavizado (lentidão) · sprint: 0→1 (correndo), suavizado · crouch: 0 (em pé) → 1 (agachado), suavizado
    weapon:{cooldown:0,recoil:0,flashT:0,bobT:0,reloading:false,reloadT:0,reloadK:0,stageIn:false},
    ammo:{mag:12,reserve:24,reserveMax:60},        // mag = balas no pente · reserve = munição reserva
    pickups:[],                                    // caixas de munição no chão: {x,z,mesh}
    boxes:[],
    decor:[],                                      // enfeites do mapa (árvores, pedras, arbustos, capim, flores): {t,x,z,s,v,h}
      hp:{cur:100,max:100},kills:0,deaths:0,        // multiplayer: vida (PRIVADA) e placar
      remotes:{},                                   // outros jogadores (vindos da rede): id → {x,y,z,yaw,pitch,cr,dead,snap,got}
      bulletColor:null,                             // null = cor aleatória (solo)
      spawns:[{x:0,z:8,yaw:0},{x:0,z:-8,yaw:Math.PI},{x:18,z:0,yaw:Math.PI/2},{x:-18,z:0,yaw:-Math.PI/2},{x:13,z:13,yaw:Math.PI/4},{x:-13,z:13,yaw:-Math.PI/4},{x:13,z:-13,yaw:3*Math.PI/4},{x:-13,z:-13,yaw:-3*Math.PI/4}], // pontos fixos por id: 0 anfitrião, 1.. convidados (todos a menos de ~40 m uns dos outros)
    /** Teletransporta o jogador ao ponto de nascimento i e restaura a vida. */
    respawn(i){if(i>=this.spawns.length)return this.respawnRandom(Object.values(this.remotes));const s=this.spawns[i],p=this.player;p.x=s.x;p.z=s.z;p.y=0;p.vy=0;p.yaw=s.yaw;p.pitch=0;this.hp.cur=this.hp.max;},
    /** Renasce em um ponto ALEATÓRIO livre do mapa (fora dos blocos), longe dos outros jogadores (avoid = lista de {x,z}). */
    respawnRandom(avoid){
      const p=this.player,c=this.cfg,list=avoid?(Array.isArray(avoid)?avoid:[avoid]):[];let best=null,bd=-1;
      for(let t=0;t<80;t++){
        const x=(Math.random()-.5)*90,z=(Math.random()-.5)*90;
        if(this.boxes.some(b=>Math.hypot(x-clamp(x,b.minX,b.maxX),z-clamp(z,b.minZ,b.maxZ))<c.R+1.2))continue;
        const d=list.reduce((m,o)=>Math.min(m,Math.hypot(x-o.x,z-o.z)),99);
        if(d>=15){best={x,z};break;}
        if(d>bd){bd=d;best={x,z};}
      }
      if(!best)best={x:0,z:8};
      p.x=best.x;p.z=best.z;p.y=0;p.vy=0;p.onGround=true;p.yaw=Math.random()*Math.PI*2;p.pitch=0;this.hp.cur=this.hp.max;
    },
    /** Inclinar: quanto (0..1) da inclinação máxima dá para fazer para o lado dir (-1 esq, +1 dir) sem a câmera entrar num bloco. */
    leanLimit(dir){
      if(!dir)return 0;const p=this.player,c=this.cfg,rx=Math.cos(p.yaw)*dir,rz=-Math.sin(p.yaw)*dir,eye=c.EYE+p.y-p.crouch*c.CROUCH_DROP,m=.2;let ok=0;
      for(let d=.05;d<=1.0001;d+=.05){
        const x=p.x+rx*d*c.LEAN_OFF,z=p.z+rz*d*c.LEAN_OFF;
        if(this.boxes.some(b=>eye<b.h+.1&&x>b.minX-m&&x<b.maxX+m&&z>b.minZ-m&&z<b.maxZ+m))break;
        ok=d;
      }
      return ok;
    },
    /** Tira vida; retorna true se zerou. */
    damage(n){this.hp.cur=Math.max(0,this.hp.cur-n);return this.hp.cur===0;},
    /** Munição e fôlego iniciais (nova partida / renascimento) e cancela recarga em andamento. */
    resetAmmo(){const a=this.ammo,c=this.cfg,w=this.weapon,p=this.player;p.stamina=1;p.tired=false;p.fatigue=0;p.stamDelay=0;a.mag=c.MAG;a.reserve=c.RESERVE_START;a.reserveMax=c.RESERVE_MAX;w.reloading=false;w.reloadT=0;w.reloadK=0;w.stageIn=false;},
    /** Gera blocos (com semente = mapa reproduzível) sem sobreposição (guarda AABBs em this.boxes). */
    generateWorld(seed){this.boxes=[];this.pickups=[];const rnd=seed==null?Math.random:mulberry32(seed);
      let tries=0;
      while(this.boxes.length<this.cfg.BOXES&&tries++<500){
        const w=1+rnd()*3,h=1+rnd()*4,d=1+rnd()*3;
        const x=(rnd()-.5)*80,z=(rnd()-.5)*80,pad=1.5;
        if(this.spawns.some(sp=>Math.hypot(x-sp.x,z-sp.z)<5))continue; // mantém livre a área de todos os pontos de nascimento
        if(this.boxes.some(o=>x-w/2-pad<o.maxX&&x+w/2+pad>o.minX&&z-d/2-pad<o.maxZ&&z+d/2+pad>o.minZ))continue;
        this.boxes.push({x,z,w,d,h,minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
      }
      this.generateDecor(rnd);
    },
    /** Natureza do mapa, gerada com a MESMA semente (todos veem igual). Árvores (tronco) e pedras bloqueiam e seguram tiro
     *  (entram em this.boxes com deco:'tree'|'rock'); arbustos, capim e flores são só visuais (dá para atravessar). */
    generateDecor(rnd){
      this.decor=[];
      const free=(x,z,r,sr)=>!this.boxes.some(o=>x>o.minX-r&&x<o.maxX+r&&z>o.minZ-r&&z<o.maxZ+r)&&!this.spawns.some(s=>Math.hypot(x-s.x,z-s.z)<sr);
      const place=(n,r,sr,fn)=>{for(let k=0,t=0;k<n&&t++<n*40;){const x=(rnd()-.5)*88,z=(rnd()-.5)*88;if(!free(x,z,r,sr))continue;fn(x,z);k++;}};
      const solid=(x,z,w,h,deco)=>this.boxes.push({x,z,w,d:w,h,minX:x-w/2,maxX:x+w/2,minZ:z-w/2,maxZ:z+w/2,deco});
      place(16,2.2,5,(x,z)=>{const h=3.4+rnd()*1.2,s=.9+rnd()*.5;solid(x,z,.5,h,'tree');this.decor.push({t:'tree',x,z,h,s,v:rnd()});});   // árvores
      place(9,1.4,4,(x,z)=>{const s=.55+rnd()*.7;solid(x,z,s*1.5,s*.85,'rock');this.decor.push({t:'rock',x,z,s,v:rnd()});});                // pedras
      place(34,.9,2.5,(x,z)=>this.decor.push({t:'bush',x,z,s:.8+rnd()*.7,v:rnd()}));                                                       // arbustos
      place(180,.3,1.5,(x,z)=>this.decor.push({t:'grass',x,z,s:.7+rnd()*.8,v:rnd()}));                                                     // capim
      place(110,.3,1.5,(x,z)=>this.decor.push({t:'flower',x,z,s:.8+rnd()*.5,v:rnd()}));                                                    // flores
    },
    /** Gira a câmera: dx/dy em radianos. Usado por mouse e toque. Limita o pitch. */
    look(dx,dy){const p=this.player,k=Settings.values.sensitivity;dx*=k;dy*=k;p.yaw-=dx;p.pitch=clamp(p.pitch-dy,-1.45,1.45);},
    /** Avança a física 1 frame: movimento (mx,my em [-1,1]), pulo, gravidade e chão/topo dos blocos. */
    step(dt,mx,my,jump,crouch,sprint){
      const p=this.player,c=this.cfg,sin=Math.sin(p.yaw),cos=Math.cos(p.yaw);
      p.crouch+=((crouch?1:0)-p.crouch)*Math.min(1,dt*10);        // agachar/levantar suave
      const moving=Math.hypot(mx,my)>.1;
      const run=sprint&&!crouch&&moving&&!p.tired&&p.stamina>0;   // correr: só andando, não agachado e com fôlego
      if(run){p.stamina=Math.max(0,p.stamina-c.STAM_DRAIN*dt);p.stamDelay=c.STAM_DELAY;if(p.stamina<=0)p.tired=true;} // correr gasta fôlego; zerou = cansado
      else{
        if(p.stamDelay>0)p.stamDelay-=dt;                          // logo após correr o fôlego ainda não volta
        else p.stamina=Math.min(1,p.stamina+c.STAM_REGEN*(moving?1:1.6)*dt); // parado recupera mais rápido
        if(p.tired&&p.stamina>=c.STAM_RECOVER)p.tired=false;
      }
      p.fatigue+=((p.tired?1:0)-p.fatigue)*Math.min(1,dt*5);      // cansaço entra/sai suave
      p.sprint+=((run?1:0)-p.sprint)*Math.min(1,dt*8);
      const sp=c.SPEED*(1-.5*p.crouch)*(1+(c.SPRINT_MULT-1)*p.sprint)*(1-(1-c.TIRED_MULT)*p.fatigue); // agachado devagar · correndo mais rápido · cansado mais devagar
      p.x+=(mx*cos+my*sin)*sp*dt;p.z+=(-mx*sin+my*cos)*sp*dt;
      this.collide();
      if(jump&&p.onGround&&p.crouch<.3){p.vy=c.JUMP_V;p.onGround=false;}
      const prevY=p.y;p.vy-=c.GRAVITY*dt;p.y+=p.vy*dt;
      let g=0;
      for(const b of this.boxes){
        if(prevY<b.h-c.STEP)continue;
        const cx=clamp(p.x,b.minX,b.maxX),cz=clamp(p.z,b.minZ,b.maxZ);
        if(Math.hypot(p.x-cx,p.z-cz)<=c.R+0.001)g=Math.max(g,b.h);
      }
      if(p.y<=g){p.snapOff=Math.max(-0.6,p.snapOff-(g-p.y));p.y=g;p.vy=0;p.onGround=true;}else p.onGround=false;
      p.snapOff*=Math.exp(-dt*14);
    },
    /** Resolve colisão círculo×AABB com os blocos e limita o jogador ao mapa. */
    collide(){
      const p=this.player,R=this.cfg.R,H=this.cfg.HALF;
      for(const b of this.boxes){
        if(p.y>=b.h-this.cfg.STEP)continue;
        const cx=clamp(p.x,b.minX,b.maxX),cz=clamp(p.z,b.minZ,b.maxZ);
        const dx=p.x-cx,dz=p.z-cz,dist=Math.hypot(dx,dz);
        if(dist>=R)continue;
        if(dist>0.0001){p.x=cx+dx/dist*R;p.z=cz+dz/dist*R;}
        else{
          const l=p.x-b.minX,r=b.maxX-p.x,f=p.z-b.minZ,k=b.maxZ-p.z,m=Math.min(l,r,f,k);
          if(m===l)p.x=b.minX-R;else if(m===r)p.x=b.maxX+R;else if(m===f)p.z=b.minZ-R;else p.z=b.maxZ+R;
        }
      }
      p.x=clamp(p.x,-H,H);p.z=clamp(p.z,-H,H);
    }
  };

  FPS.Model=Model;
})(window.FPS = window.FPS || {});
