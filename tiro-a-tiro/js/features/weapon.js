/**
 * FEATURE: Weapon
 * Tiro hitscan (raycast do centro da tela), cadência, recuo e balanço da arma.
 * Munição limitada: cada tiro gasta 1 bala do pente (Model.ammo.mag). Pente vazio:
 * não atira, emite 'empty' (som de clic) e, se houver reserva, já começa a recarregar.
 * Recarga (tecla R / botão RECARREGAR): leva Model.cfg.RELOAD_TIME s e passa balas da reserva
 * para o pente. Emite 'reload' {stage:'out'|'in'|'slide'} (sons) durante a recarga.
 * Depende de: Model, View, bus (emite "shot", "empty", "reload") · Exporta: FPS.Weapon
 */
(function (FPS) {
  'use strict';
  const {Model, View}=FPS;

  const Weapon={name:'arma',
    shoot(){
      const w=Model.weapon,a=View.aim();
      const from=View.muzzleWorld();
      // cor da bala: fixa no multiplayer; no solo é a cor sorteada que a arma já está mostrando
      const col=Model.bulletColor!=null?Model.bulletColor:View.pendingColor;
      View.spawnBullet(from,a.target,a.normal,col,a.stain);
      FPS.bus.emit('shot',{from,target:a.target,normal:a.normal,hit:a.remote,pid:a.pid}); // hit=true: acertou o jogador pid
      w.recoil=.05;w.flashT=.05;w.reroll=true;
    },
    /** Começa a recarregar (se o pente não está cheio, há reserva e não está recarregando). */
    startReload(){
      const w=Model.weapon,A=Model.ammo;
      if(w.reloading||A.mag>=Model.cfg.MAG||A.reserve<=0)return false;
      w.reloading=true;w.reloadT=0;w.reloadK=0;w.stageIn=false;
      FPS.bus.emit('reload',{stage:'out'});
      return true;
    },
    /** Avança a recarga: encaixa o pente a 55% e termina passando as balas da reserva ao pente. */
    stepReload(dt){
      const w=Model.weapon,A=Model.ammo,c=Model.cfg;
      if(!w.reloading)return;
      w.reloadT+=dt;const k=w.reloadT/c.RELOAD_TIME;w.reloadK=Math.min(k,1);
      if(!w.stageIn&&k>=.55){w.stageIn=true;FPS.bus.emit('reload',{stage:'in'});}
      if(k>=1){
        const n=Math.min(c.MAG-A.mag,A.reserve);A.mag+=n;A.reserve-=n;
        w.reloading=false;w.reloadK=0;w.reloadT=0;
        FPS.bus.emit('reload',{stage:'slide'});
      }
    },
    update(dt,inp){
      const w=Model.weapon,A=Model.ammo;w.cooldown-=dt;
      this.stepReload(dt);
      if(inp.reload)this.startReload();
      if(inp.fire&&w.cooldown<=0&&!w.reloading){
        if(A.mag>0){this.shoot();A.mag--;w.cooldown=Model.cfg.FIRE_RATE;}
        else{ // sem bala no pente: não dispara, toca o clic e recarrega sozinho se houver reserva
          w.cooldown=.35;FPS.bus.emit('empty');this.startReload();
        }
      }
      w.recoil*=Math.exp(-dt*18);w.flashT-=dt;
      if(w.reroll&&w.flashT<=0){w.reroll=false;if(Model.bulletColor==null)View.rollColor();} // próxima bala, nova cor
      View.setGunColor(Model.bulletColor!=null?Model.bulletColor:View.pendingColor);       // arma = cor da bala
      const moving=Math.hypot(inp.x,inp.y)>.1;if(moving)w.bobT+=dt*9*(1+.6*Model.player.sprint); // balanço mais rápido correndo
      View.poseGun(w,moving);
    }
  };

  FPS.Weapon=Weapon;
})(window.FPS = window.FPS || {});
