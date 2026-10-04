/**
 * VIEW — tudo que é desenhado (THREE.js).
 * Lê o Model, nunca o altera. Contém céu, luz/sombras, chão, blocos, pistola,
 * balas, manchas de tinta e a renderização em duas passadas (mundo + arma).
 * Depende de: $, Model · Exporta: FPS.View
 */
(function (FPS) {
  'use strict';
  const {$, Model, Settings}=FPS;

  const View={
    HORIZON:0xbcd8ee,bullets:[],decals:[],targets:[],pickupMeshes:[],avatars:{},
    /** Cria renderer, cenas, câmeras e monta o mundo. Chamar uma vez, após Model.generateWorld(). */
    init(){
      const canvas=$('c');
      const r=this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
      r.autoClear=false;r.shadowMap.enabled=true;r.shadowMap.type=THREE.PCFSoftShadowMap;r.setClearColor(this.HORIZON);
      this.aniso=r.capabilities.getMaxAnisotropy();
      this.scene=new THREE.Scene();this.scene.fog=new THREE.Fog(this.HORIZON,25,100);
      this.camera=new THREE.PerspectiveCamera(75,1,0.1,300);this.camera.rotation.order='YXZ';
      this.gunScene=new THREE.Scene();this.gunCam=new THREE.PerspectiveCamera(60,1,0.01,10);
      addEventListener('resize',()=>this.resize());
      addEventListener('orientationchange',()=>setTimeout(()=>this.resize(),200));
      this.buildSky();this.buildLights();this.buildFloor();this.buildBoxes();this.buildGun();this.buildSplatAssets();this.rollColor();this.setGunColor(this.pendingColor);this.resize();this.applySettings();
    },
    /** Ajusta resolução (com pixel ratio) e aspecto das câmeras ao tamanho da janela. */
    resize(){
      const w=innerWidth,h=innerHeight;
      this.renderer.setPixelRatio(Math.max(.35,Math.min(Math.min(devicePixelRatio||1,2)*Settings.values.renderScale,3)));this.renderer.setSize(w,h,false);
      this.camera.aspect=this.gunCam.aspect=w/h;this.camera.updateProjectionMatrix();this.gunCam.updateProjectionMatrix();
    },
    /** Gera textura procedural em canvas (ruído + borda opcional) com mipmap/anisotropia. */
    noiseTex(size,base,vari,n,border){
      const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d');
      x.fillStyle=base;x.fillRect(0,0,size,size);
      for(let i=0;i<n;i++){
        const v=Math.floor(Math.random()*vari*2-vari),k=v>0?255:0;
        x.fillStyle=`rgba(${k},${k},${k},${Math.abs(v)/255*0.5})`;
        const q=1+Math.random()*3;x.fillRect(Math.random()*size,Math.random()*size,q,q*(0.5+Math.random()*2));
      }
      if(border){x.strokeStyle='rgba(0,0,0,.35)';x.lineWidth=border;x.strokeRect(0,0,size,size);}
      const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=this.aniso;return t;
    },
    buildSky(){
      this.sky=new THREE.Mesh(new THREE.SphereGeometry(250,24,16),new THREE.ShaderMaterial({
        side:THREE.BackSide,depthWrite:false,fog:false,
        uniforms:{top:{value:new THREE.Color(0x3f7fd0)},hor:{value:new THREE.Color(this.HORIZON)}},
        vertexShader:'varying float h;void main(){h=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:'uniform vec3 top,hor;varying float h;void main(){gl_FragColor=vec4(mix(hor,top,pow(clamp(h,0.,1.),.6)),1.);}'}));
      this.sky.renderOrder=-1;this.scene.add(this.sky);
    },
    buildLights(){
      this.scene.add(new THREE.HemisphereLight(0xdff0ff,0x4a5a40,0.8));
      const s=this.sun=new THREE.DirectionalLight(0xfff2d8,1.1);
      s.castShadow=true;s.shadow.mapSize.set(2048,2048);s.shadow.bias=-0.0004;
      Object.assign(s.shadow.camera,{left:-35,right:35,top:35,bottom:-35,near:1,far:80});
      this.scene.add(s,s.target);
    },
    buildFloor(){
      const t=this.noiseTex(512,'#5d8a4c',90,9000);t.repeat.set(60,60);
      const m=this.floor=new THREE.Mesh(new THREE.PlaneGeometry(Model.cfg.SIZE,Model.cfg.SIZE),new THREE.MeshStandardMaterial({map:t,roughness:1,metalness:0}));
      m.rotation.x=-Math.PI/2;m.receiveShadow=true;this.scene.add(m);this.targets.push(m);
    },
    buildBoxes(){
      this.boxMeshes=[];
      const tex=this.noiseTex(128,'#ffffff',60,900,6),colors=[0xd9534f,0x5bc0de,0xf0ad4e,0x9b59b6,0x2ecc71];
      const trunkM=new THREE.MeshStandardMaterial({color:0x6b4a2f,map:tex,roughness:.95,flatShading:true}),rockM=new THREE.MeshStandardMaterial({color:0x8d9097,roughness:1,flatShading:true});
      Model.boxes.forEach((b,i)=>{
        let m;
        if(b.deco==='tree'){m=new THREE.Mesh(new THREE.CylinderGeometry(b.w*.42,b.w*.52,b.h,8),trunkM);m.userData={deco:'trunk',cap:.4};}   // tronco (colide e segura tiro)
        else if(b.deco==='rock'){m=new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),rockM);m.scale.set(b.w*.55,b.h*.62,b.d*.55);m.rotation.y=i;m.userData={deco:'rock',cap:Math.max(.4,Math.min(b.w,b.h)*.7)};} // pedra
        else m=new THREE.Mesh(new THREE.BoxGeometry(b.w,b.h,b.d),new THREE.MeshStandardMaterial({color:colors[i%5],map:tex,roughness:.65,metalness:.1}));
        m.position.set(b.x,b.h/2,b.z);m.castShadow=m.receiveShadow=true;this.scene.add(m);this.targets.push(m);this.boxMeshes.push(m);
        if(m.userData.deco){m.updateMatrixWorld(true);m.userData.box=new THREE.Box3().setFromObject(m).expandByScalar(.05);}
      });
      this.curved=this.boxMeshes.filter(m=>m.userData.deco);   // objetos curvos (tronco, pedra) + copas (adicionadas em buildDecor)
      this.buildDecor();
    },
    /** Folhas das árvores, arbustos, capim e flores (só visual, não entram nos alvos de tiro). Posições vêm de Model.decor. */
    buildDecor(){
      const T=THREE;
      if(this.crowns){this.targets=this.targets.filter(t=>!this.crowns.includes(t));}
      this.crowns=[];
      if(this.decorGroup){this.scene.remove(this.decorGroup);this.decorGroup.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)[].concat(o.material).forEach(m=>m.dispose());});}
      const g=this.decorGroup=new T.Group();this.scene.add(g);
      const hv=(v,i)=>Math.abs(Math.sin(v*1000+i*12.9898)*43758.5453)%1;      // aleatório determinístico a partir do v do item
      const mat=c=>new T.MeshStandardMaterial({color:c,roughness:.95,flatShading:true});
      const leaf=[0x2f7d3a,0x3d9143,0x2b6f35,0x4a9a3c].map(mat),bushM=[0x3a8a3c,0x2f7a34,0x4f9d45].map(mat);
      const cone=new T.ConeGeometry(1,1,7),ball=new T.IcosahedronGeometry(1,1);
      const add=(geo,m,x,y,z,sx,sy,sz,shadow)=>{const o=new T.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=!!shadow;o.receiveShadow=true;g.add(o);return o;};
      // copa: também segura tiro (a bala bate nas folhas e deixa mancha, em vez de atravessar)
      const crown=(geo,m,x,y,z,sx,sy,sz)=>{const o=add(geo,m,x,y,z,sx,sy,sz,true);o.userData={deco:'crown',cap:geo===cone?.7:.9};o.updateMatrixWorld(true);o.userData.box=new T.Box3().setFromObject(o).expandByScalar(.05);this.targets.push(o);this.crowns.push(o);this.curved.push(o);return o;};
      const grass=[],flowers=[];
      for(const d of Model.decor){
        if(d.t==='tree'){
          const m=leaf[(d.v*4)|0];
          if(d.v<.5){for(let i=0;i<3;i++)crown(cone,m,d.x,d.h*.45+.9+i*1.05,d.z,(1.55-i*.38)*d.s,1.7*d.s,(1.55-i*.38)*d.s);}                // pinheiro
          else{crown(ball,m,d.x,d.h+.5,d.z,1.5*d.s,1.3*d.s,1.5*d.s);crown(ball,m,d.x+.8*d.s,d.h-.1,d.z+.3*d.s,1.0*d.s,.9*d.s,1.0*d.s);crown(ball,m,d.x-.6*d.s,d.h+.1,d.z-.5*d.s,1.1*d.s,1.0*d.s,1.1*d.s);} // copa redonda
        }else if(d.t==='bush'){
          const m=bushM[(d.v*3)|0];
          for(let i=0;i<3;i++)add(ball,m,d.x+(hv(d.v,i)-.5)*.9*d.s,.32*d.s,d.z+(hv(d.v,i+5)-.5)*.9*d.s,.55*d.s,.42*d.s,.55*d.s,true);
        }else if(d.t==='grass'){for(let i=0;i<3;i++)grass.push([d.x+(hv(d.v,i)-.5)*.35,d.z+(hv(d.v,i+3)-.5)*.35,d.s*(.8+hv(d.v,i+7)*.6),d.v]);}
        else if(d.t==='flower')flowers.push(d);
      }
      if(grass.length){ // capim: um InstancedMesh só (barato)
        const im=new T.InstancedMesh(new T.ConeGeometry(.07,.55,4),mat(0xffffff),grass.length),o=new T.Object3D(),c=new T.Color();
        grass.forEach((q,i)=>{o.position.set(q[0],.27*q[2],q[1]);o.scale.set(1,q[2],1);o.rotation.set((hv(q[3],i)-.5)*.3,0,(hv(q[3],i+1)-.5)*.3);o.updateMatrix();im.setMatrixAt(i,o.matrix);im.setColorAt(i,c.setHSL(.27+hv(q[3],i+2)*.07,.55,.32+hv(q[3],i+4)*.14));});
        g.add(im);
      }
      if(flowers.length){ // flores: haste + cabeça colorida
        const stem=new T.InstancedMesh(new T.CylinderGeometry(.012,.012,.3,4),mat(0x3f8f3a),flowers.length),head=new T.InstancedMesh(new T.IcosahedronGeometry(.07,0),mat(0xffffff),flowers.length);
        const o=new T.Object3D(),c=new T.Color(),pal=[0xffe14a,0xffffff,0xff7aa8,0xb084ff,0xff9a3c];
        flowers.forEach((d,i)=>{
          o.rotation.set(0,0,0);o.scale.set(1,d.s,1);o.position.set(d.x,.15*d.s,d.z);o.updateMatrix();stem.setMatrixAt(i,o.matrix);
          o.scale.set(d.s,d.s,d.s);o.position.set(d.x,.31*d.s,d.z);o.updateMatrix();head.setMatrixAt(i,o.matrix);head.setColorAt(i,c.set(pal[(d.v*5)|0]));
        });
        g.add(stem,head);
      }
    },
    /** Monta a pistola em uma cena separada (gunScene) para nunca atravessar paredes. */
    buildGun(){
      const gs=this.gunScene;
      gs.add(new THREE.HemisphereLight(0xffffff,0x556070,1.1));
      const gl=new THREE.DirectionalLight(0xffffff,1.3);gl.position.set(-1,2,1.5);gs.add(gl);
      const rim=new THREE.DirectionalLight(0x9db8ff,0.7);rim.position.set(2,0.5,-1);gs.add(rim);
      const g=this.gun=new THREE.Group();
      const M=(c,m,r,e)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r,emissive:e||0});
      const steel=M(0x4a505a,.75,.3),dark=M(0x1a1c20,.5,.5),poly=M(0x24262b,.1,.85),accent=this.gunAccent=M(0xff6a2b,0,.45,0x331100),sleeve=M(0x34456b,0,.9),skin=M(0xd9a78a,0,.8);
      const part=(geo,mat,x,y,z,rx)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(rx)m.rotation.x=rx;g.add(m);};
      const B=(w,h,d)=>new THREE.BoxGeometry(w,h,d),C=(r,l)=>new THREE.CylinderGeometry(r,r,l,18);
      part(B(.06,.055,.34),steel,0,0,-.17);part(B(.022,.012,.30),dark,0,.033,-.17);part(B(.064,.008,.20),accent,0,.012,-.17);
      part(C(.014,.14),steel,0,0,-.41,Math.PI/2);part(C(.02,.022),accent,0,0,-.465,Math.PI/2);
      part(B(.05,.04,.30),dark,0,-.047,-.15);part(B(.048,.13,.07),poly,0,-.115,-.03,-.2);part(B(.052,.012,.075),dark,0,-.185,0,-.2);
      part(B(.008,.006,.075),dark,0,-.072,-.09);part(B(.008,.026,.008),steel,0,-.06,-.07);
      part(B(.008,.014,.012),accent,0,.045,-.32);part(B(.034,.014,.012),dark,0,.043,-.02);
      part(B(.058,.1,.07),skin,.003,-.1,-.025,-.2);part(B(.075,.075,.34),sleeve,.02,-.15,.2,.35);
      this.muzzle=new THREE.Object3D();this.muzzle.position.set(0,0,-.48);g.add(this.muzzle);
      const f=this.flash=new THREE.Group();f.position.copy(this.muzzle.position);f.visible=false;
      const fm=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.035,.15,10),fm(0xffb030));cone.rotation.x=-Math.PI/2;cone.position.z=-.07;
      this.flashCone=cone;this.flashLight=new THREE.PointLight(0xffa040,2,2);
      f.add(cone,new THREE.Mesh(new THREE.SphereGeometry(.03,10,8),fm(0xffffff)),this.flashLight);
      g.add(f);this.GUN_POS=new THREE.Vector3(.13,-.12,-.3);g.position.copy(this.GUN_POS);g.rotation.y=.04;gs.add(g);
    },
    /** Sorteia a cor da PRÓXIMA bala (solo). A arma já mostra essa cor antes do tiro. */
    rollColor(){this.pendingColor=new THREE.Color().setHSL(Math.random(),.85,.55).getHex();},
    /** Pinta as partes amarelas/laranja da arma e o clarão com a cor da bala. */
    setGunColor(hex){
      if(this._gunHex===hex)return;this._gunHex=hex;
      const c=new THREE.Color(hex);
      this.gunAccent.color.copy(c);this.gunAccent.emissive.copy(c).multiplyScalar(.35);
      this.flashCone.material.color.copy(c);this.flashLight.color.copy(c);
    },
    buildSplatAssets(){
      const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
      x.fillStyle='#fff';x.beginPath();
      for(let i=0;i<=24;i++){const a=i/24*Math.PI*2,r=34+Math.random()*10,px=64+Math.cos(a)*r,py=64+Math.sin(a)*r;i?x.lineTo(px,py):x.moveTo(px,py);}
      x.closePath();x.fill();
      for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,d=44+Math.random()*16;x.beginPath();x.arc(64+Math.cos(a)*d,64+Math.sin(a)*d,2+Math.random()*5,0,7);x.fill();}
      this.splatTex=new THREE.CanvasTexture(c);this.splatGeo=new THREE.PlaneGeometry(.5,.5);
      this.bulletGeo=new THREE.SphereGeometry(.05,12,8);this.raycaster=new THREE.Raycaster();this.raycaster.far=150;
    },
    // --- API usada pelos controllers ---
    /** Copia posição/rotação do Model.player para a câmera; move sol e céu junto. */
    syncCamera(){
      const p=Model.player;
      const lo=p.lean*Model.cfg.LEAN_OFF,roll=-p.lean*Model.cfg.LEAN_ROLL;                        // inclinar: desloca para o lado e gira (roll)
      this.camera.position.set(p.x+Math.cos(p.yaw)*lo,Model.cfg.EYE+p.y+p.snapOff-p.crouch*Model.cfg.CROUCH_DROP-Math.abs(p.lean)*.06,p.z-Math.sin(p.yaw)*lo);this.camera.rotation.set(p.pitch,p.yaw,roll);
      this.gunCam.rotation.z=roll;                                    // a arma acompanha a inclinação
      const fov=Settings.values.fov+p.sprint*8;                      // correndo: campo de visão abre um pouco
      if(Math.abs(this.camera.fov-fov)>.01){this.camera.fov=fov;this.camera.updateProjectionMatrix();}
      this.sky.position.copy(this.camera.position);
      this.sun.position.set(p.x+14,26,p.z+9);this.sun.target.position.set(p.x,0,p.z);
    },
    /** Raycast do centro da tela. Retorna {target, normal, remote, pid, stain}: remote=true se acertou um jogador (pid = id dele). */
    aim(){ // ponto que a mira atinge
      this.camera.updateMatrixWorld(true);this.raycaster.setFromCamera({x:0,y:0},this.camera);
      const hit=this.raycaster.intersectObjects(this.targets,false)[0];
      if(hit){
        const rem=!!hit.object.userData.remote;
        // acertou o avatar: guarda ponto/normal LOCAIS da peça para a mancha acompanhar o boneco
        const stain=rem?{obj:hit.object,p:hit.object.worldToLocal(hit.point.clone()),n:hit.face.normal.clone()}:null;
        let n=null;
        if(!rem){ // normal no mundo (com matriz normal: correta mesmo em objetos esticados, como as pedras); no tronco usa a direção radial
          n=hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
          if(hit.object.userData.deco==='trunk'&&Math.abs(n.y)<.7)n.set(hit.point.x-hit.object.position.x,0,hit.point.z-hit.object.position.z).normalize();
        }
        return{target:hit.point.clone(),normal:n,remote:rem,pid:rem?hit.object.userData.pid:-1,stain};
      }
      return{target:this.camera.position.clone().addScaledVector(this.camera.getWorldDirection(new THREE.Vector3()),100),normal:null,remote:false,pid:-1,stain:null};
    },
    /** Posição da ponta do cano em coordenadas do mundo. */
    muzzleWorld(){const v=new THREE.Vector3();this.gun.updateMatrixWorld(true);this.muzzle.getWorldPosition(v);return this.camera.localToWorld(v);},
    /** Cria uma bolinha colorida que viaja de "from" até "target". */
    spawnBullet(from,target,normal,fixedColor,stain){
      const color=fixedColor!=null?new THREE.Color(fixedColor):new THREE.Color().setHSL(Math.random(),.85,.55),dir=target.clone().sub(from),left=dir.length();dir.normalize();
      const mesh=new THREE.Mesh(this.bulletGeo,new THREE.MeshBasicMaterial({color,fog:false}));mesh.position.copy(from);this.scene.add(mesh);
      this.bullets.push({mesh,dir,left,target,normal,color,stain});
    },
    /** Mantém a mancha INTEIRA dentro da face (não "vaza" na quina): encolhe se a face é pequena e empurra o centro para dentro.
     *  geo: BoxGeometry · p: ponto LOCAL (alterado) · n: normal local alinhada aos eixos · k: escala desejada → devolve a escala final. */
    fitSplat(geo,p,n,k){
      const pr=geo&&geo.parameters;if(!pr||pr.depth==null)return k;           // só caixas (chão/plano não tem quina)
      const hs=[pr.width/2,pr.height/2,pr.depth/2],c=['x','y','z'],R=.24;      // R: raio do borrão com escala 1
      const ax=Math.abs(n.x)>.5?0:Math.abs(n.y)>.5?1:2;
      for(let i=0;i<3;i++)if(i!==ax)k=Math.min(k,hs[i]*.95/R);
      for(let i=0;i<3;i++)if(i!==ax){const lim=Math.max(0,hs[i]-R*k);p[c[i]]=Math.max(-lim,Math.min(lim,p[c[i]]));}
      return k;
    },
    /** Acha o bloco do mapa que contém o ponto (o tiro de outro jogador chega só como ponto + normal). */
    boxMeshAt(pt){
      for(const m of this.boxMeshes||[]){
        const g=m.geometry.parameters,d=pt.clone().sub(m.position);
        if(Math.abs(d.x)<=g.width/2+.03&&Math.abs(d.y)<=g.height/2+.03&&Math.abs(d.z)<=g.depth/2+.03)return m;
      }
      return null;
    },
    /** Cola uma mancha de tinta numa superfície (máx. 150, somem em 6 s). */
    addSplat(point,normal,color){
      const mat=new THREE.MeshBasicMaterial({map:this.splatTex,color,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      const m=new THREE.Mesh(this.splatGeo,mat);
      let k=.8+Math.random()*.5;
      const bm=this.boxMeshAt(point);                       // bateu em bloco? então encaixa a mancha dentro da face (sem vazar na quina)
      if(bm){const lp=point.clone().sub(bm.position);k=this.fitSplat(bm.geometry,lp,normal,k);point=lp.add(bm.position);}
      else{const cm=(this.curved||[]).find(o=>o.userData.box.containsPoint(point));if(cm)k=Math.min(k,cm.userData.cap);} // tronco/pedra/copa: mancha menor para não "flutuar" na curva
      m.position.copy(point).addScaledVector(normal,.012);m.lookAt(point.clone().add(normal));m.rotateZ(Math.random()*Math.PI*2);
      m.scale.set(k,k,1);this.scene.add(m);this.decals.push({mesh:m,life:0});
      if(this.decals.length>150){const o=this.decals.shift();this.scene.remove(o.mesh);o.mesh.material.dispose();}
    },
    /** Move balas, cria manchas ao impacto e faz as manchas desaparecerem. */
    updateEffects(dt){
      for(let i=this.bullets.length-1;i>=0;i--){
        const b=this.bullets[i],step=140*dt;
        if(step>=b.left){if(b.normal){this.addSplat(b.target,b.normal,b.color);FPS.bus.emit('impact',{kind:'block',point:b.target});}else if(b.stain){if(b.stain.obj.parent)this.addBodySplat(b.stain.obj,b.stain.p,b.stain.n,b.color);FPS.bus.emit('impact',{kind:'body',point:b.target});}this.scene.remove(b.mesh);b.mesh.material.dispose();this.bullets.splice(i,1);}
        else{b.mesh.position.addScaledVector(b.dir,step);b.left-=step;}
      }
      for(let i=this.decals.length-1;i>=0;i--){
        const d=this.decals[i];d.life+=dt;
        if(d.life>=6){this.scene.remove(d.mesh);d.mesh.material.dispose();this.decals.splice(i,1);continue;}
        d.mesh.material.opacity=d.life<5?1:6-d.life;
      }
    },
    /** Aplica recuo, balanço ao andar e clarão à pistola, conforme o estado da arma. */
    poseGun(w,moving){
      const bob=moving?Math.sin(w.bobT)*.008:0,rl=Math.sin((w.reloadK||0)*Math.PI); // rl: arma desce e inclina durante a recarga
      this.gun.position.set(this.GUN_POS.x+bob*.5,this.GUN_POS.y+Math.abs(bob)-rl*.14,this.GUN_POS.z+w.recoil*.5);
      this.gun.rotation.x=w.recoil*1.6+rl*.6;
      this.flash.visible=w.flashT>0;
      if(this.flash.visible){this.flash.rotation.z=Math.random()*6.28;const k=.8+Math.random()*.5;this.flash.scale.set(k,k,k);}
    },
    // ---------- Caixas de munição ----------
    /** Cria uma caixa de munição (visual) no chão em (x,z) e devolve o grupo. */
    addPickup(x,z){
      const T=THREE;
      if(!this.pickGeo){
        this.pickGeo={box:new T.BoxGeometry(.36,.2,.24),lid:new T.BoxGeometry(.38,.04,.26),bul:new T.CylinderGeometry(.025,.025,.1,8)};
        this.pickMat={box:new T.MeshStandardMaterial({color:0x4b6b3a,roughness:.7}),lid:new T.MeshStandardMaterial({color:0xffb020,roughness:.5}),
          bul:new T.MeshStandardMaterial({color:0xd9a441,metalness:.8,roughness:.3})};
      }
      const G=this.pickGeo,M=this.pickMat,g=new T.Group();
      const box=new T.Mesh(G.box,M.box);box.position.y=.1;box.castShadow=true;
      const lid=new T.Mesh(G.lid,M.lid);lid.position.y=.22;
      g.add(box,lid);
      for(let i=-1;i<=1;i++){const b=new T.Mesh(G.bul,M.bul);b.rotation.z=Math.PI/2;b.position.set(0,.29,i*.06);g.add(b);}
      g.position.set(x,.04,z);this.scene.add(g);this.pickupMeshes.push(g);return g;
    },
    removePickup(g){this.scene.remove(g);const i=this.pickupMeshes.indexOf(g);if(i>=0)this.pickupMeshes.splice(i,1);},
    clearPickups(){for(const g of this.pickupMeshes)this.scene.remove(g);this.pickupMeshes.length=0;},
    /** Gira e balança as caixas (t = tempo em segundos). */
    animatePickups(t){for(const g of this.pickupMeshes){g.rotation.y=t*1.5;g.position.y=.04+Math.sin(t*3+g.position.x)*.03;}},
    /** Recria os blocos após Model.generateWorld(seed) (multiplayer). */
    rebuildWorld(){
      this.clearPickups();
      const old=this.boxMeshes||[];
      old.forEach(m=>{this.scene.remove(m);m.geometry.dispose();m.material.dispose();});
      this.targets=this.targets.filter(t=>!old.includes(t));
      this.buildBoxes();
    },
    // ---------- AVATARES (um boneco para cada jogador remoto) ----------
    /** Boneco de blocos estilo Minecraft, mais fino (cabeça, corpo, 2 braços, 2 pernas, pistola) na cor do jogador. */
    makeAvatar(id,color){
      const T=THREE,g=new T.Group();g.visible=false;
      const rig=new T.Group();g.add(rig);
      const a={id,group:g,rig,meshes:[],decals:[],walkT:0,walkAmp:0,pitchS:0,crS:0,prevR:null,rag:null,shown:false};
      // textura "pixelada": base + ruído por pixel (NearestFilter = visual de blocos)
      const tex=(w,h,base,paint)=>{
        const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');
        x.fillStyle=base;x.fillRect(0,0,w,h);if(paint)paint(x);
        for(let j=0;j<h;j++)for(let i=0;i<w;i++){const al=Math.random()*.14;x.fillStyle=Math.random()<.5?`rgba(0,0,0,${al})`:`rgba(255,255,255,${al})`;x.fillRect(i,j,1,1);}
        const t=new T.CanvasTexture(c);t.magFilter=t.minFilter=T.NearestFilter;t.generateMipmaps=false;return t;
      };
      const M=(map,col)=>new T.MeshStandardMaterial({map,color:col==null?0xffffff:col,roughness:.9,metalness:0});
      const SKIN='#d9a78a',HAIR='#4a3222';
      const shirt=M(tex(8,8,'#ffffff'),color);                            // camisa/mangas: cor do jogador
      const pants=M(tex(8,8,'#ffffff'));pants.color.set(color).multiplyScalar(.35); // calça: cor do jogador escurecida
      const skin=M(tex(4,4,SKIN));
      const faceTex=tex(8,8,SKIN,x=>{
        x.fillStyle=HAIR;x.fillRect(0,0,8,2);
        x.fillStyle='#fff';x.fillRect(1,4,2,1);x.fillRect(5,4,2,1);
        x.fillStyle='#3a56c8';x.fillRect(2,4,1,1);x.fillRect(5,4,1,1);
        x.fillStyle='#7a4a3a';x.fillRect(3,6,2,1);
      });
      const sideTex=tex(8,8,SKIN,x=>{x.fillStyle=HAIR;x.fillRect(0,0,8,3);});
      const hairTex=tex(8,8,HAIR);
      const headMats=[M(sideTex),M(sideTex),M(hairTex),M(tex(8,8,SKIN)),M(hairTex),M(faceTex)]; // +x -x +y -y +z -z (rosto no -z)
      const dark=new T.MeshStandardMaterial({color:0x222428,metalness:.6,roughness:.4});
      const accent=new T.MeshStandardMaterial({color:color,roughness:.45,metalness:0,emissive:new T.Color(color).multiplyScalar(.3)});
      const part=(w,h,d,mat,x,y,z,k,parent)=>{
        const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;
        m.userData.remote=true;m.userData.pid=id;m.userData.avatar=a;m.userData.stainK=k;(parent||rig).add(m);a.meshes.push(m);return m;
      };
      const pivot=(x,y,z,parent)=>{const o=new T.Group();o.position.set(x,y,z);(parent||rig).add(o);return o;};
      // medidas (m): altura total 1,8 — pernas .70 · corpo .70 · cabeça .40 · tudo mais fino que o Minecraft
      a.legL=pivot(-.0875,.70,0);a.legR=pivot(.0875,.70,0);              // quadril (coxa .35 + canela .35 = .70)
      a.kneeL=pivot(0,-.35,0,a.legL);a.kneeR=pivot(0,-.35,0,a.legR);     // joelho: a canela dobra para agachar
      part(.17,.35,.17,pants,0,-.175,0,.3,a.legL);part(.17,.35,.17,pants,0,-.175,0,.3,a.legR);   // coxas
      part(.17,.35,.17,pants,0,-.175,0,.3,a.kneeL);part(.17,.35,.17,pants,0,-.175,0,.3,a.kneeR); // canelas
      const up=a.upper=pivot(0,.70,0);                                   // tronco + cabeça + braços: desce e inclina ao agachar
      a.torso=part(.36,.70,.20,shirt,0,.35,0,.5,up);
      a.head=pivot(0,.70,0,up);part(.40,.40,.40,headMats,0,.20,0,.55,a.head);
      a.armL=pivot(-.25,.70,0,up);part(.14,.28,.14,shirt,0,-.14,0,.25,a.armL);part(.14,.42,.14,skin,0,-.49,0,.25,a.armL);
      a.armR=pivot(.25,.70,0,up);part(.14,.28,.14,shirt,0,-.14,0,.25,a.armR);part(.14,.42,.14,skin,0,-.49,0,.25,a.armR);
      // pistola na mão direita: mesmo desenho da arma em 1ª pessoa (cano, ferrolho, empunhadura, guarda-mato, faixa colorida)
      const steel=new T.MeshStandardMaterial({color:0x4a505a,metalness:.75,roughness:.3});
      const gun=new T.Group();gun.position.set(0,-.70,0);gun.rotation.x=-Math.PI/2;gun.scale.setScalar(1.3); // eixos do corpo: -z = frente
      const gp=(geo,mat,x,y,z,rx)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);if(rx)m.rotation.x=rx;m.castShadow=true;gun.add(m);};
      const B=(w,h,d)=>new T.BoxGeometry(w,h,d);
      gp(B(.06,.07,.34),steel,0,.085,-.20);                 // ferrolho (parte de cima)
      gp(B(.05,.04,.28),dark,0,.03,-.19);                   // armação
      gp(B(.062,.012,.30),accent,0,.126,-.20);              // faixa colorida (cor da bala)
      gp(new T.CylinderGeometry(.016,.016,.10,12),steel,0,.085,-.39,Math.PI/2); // cano
      gp(new T.CylinderGeometry(.022,.022,.02,12),accent,0,.085,-.445,Math.PI/2); // boca do cano colorida
      gp(B(.052,.19,.075),dark,0,-.045,-.06,-.2);           // empunhadura inclinada
      gp(B(.012,.028,.09),dark,0,-.005,-.14);               // guarda-mato
      gp(B(.012,.03,.012),steel,0,.02,-.115);               // gatilho
      gp(B(.012,.016,.014),accent,0,.14,-.33);              // massa de mira
      a.armR.add(gun);
      g.traverse(o=>{if(o.material)[].concat(o.material).forEach(m=>{m.fog=false;});}); // avatar não some na névoa de distância
      this.scene.add(g);return a;
    },
    /** Cria o avatar do jogador "id" (invisível até chegar o primeiro estado dele). */
    addAvatar(id,color){this.removeAvatar(id);this.avatars[id]=this.makeAvatar(id,color);},
    /** Remove o avatar (e sua colisão de tiro) — jogador saiu da sala. */
    removeAvatar(id){
      const a=this.avatars[id];if(!a)return;
      if(a.rag)this.endRagdoll(a);
      this.clearBodySplats(a);this.scene.remove(a.group);
      this.targets=this.targets.filter(t=>!a.meshes.includes(t));
      a.group.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){[].concat(o.material).forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});
      delete this.avatars[id];
    },
    clearAvatars(){for(const id of Object.keys(this.avatars))this.removeAvatar(id);},
    /** Anima todos os avatares a partir de Model.remotes. */
    syncRemotes(dt){for(const id in this.avatars){const r=Model.remotes[id];if(r)this.syncAvatar(this.avatars[id],r,dt);}},
    /** Move o avatar suavemente até r e anima: andar, agachar, olhar (pitch), braço da arma e ragdoll ao morrer. */
    syncAvatar(a,r,dt){
      const g=a.group;if(!r.got)return;                                  // ainda sem posição: não aparece
      if(!a.shown){a.shown=true;g.visible=true;this.targets.push(...a.meshes);}
      if(r.snap){g.position.set(r.x,r.y,r.z);g.rotation.y=r.yaw;r.snap=false;a.prevR=null;a.crS=r.cr||0;}
      else{
        const k=Math.min(1,dt*12);
        g.position.x+=(r.x-g.position.x)*k;g.position.y+=(r.y-g.position.y)*k;g.position.z+=(r.z-g.position.z)*k;
        let d=r.yaw-g.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));g.rotation.y+=d*k;
      }
      if(r.dead){if(!a.rag)this.startRagdoll(a,r.push);this.stepRagdoll(a,dt);return;} // morto: ragdoll
      if(a.rag)this.endRagdoll(a);
      const sp=a.prevR?Math.hypot(g.position.x-a.prevR.x,g.position.z-a.prevR.z)/Math.max(dt,1e-3):0;
      a.prevR={x:g.position.x,z:g.position.z};
      a.walkAmp+=(Math.min(sp/4,1)-a.walkAmp)*Math.min(1,dt*10);a.walkT+=sp*dt*1.8;
      a.pitchS+=((r.pitch||0)-a.pitchS)*Math.min(1,dt*12);
      // agachar (agachamento): quadril desce e recua, joelhos dobram para a frente (pés no chão), tronco inclina PARA A FRENTE
      // e a cabeça continua olhando para onde o jogador mira. A cabeça desce o mesmo que a câmera (Model.cfg.CROUCH_DROP).
      a.crS+=((r.cr||0)-a.crS)*Math.min(1,dt*10);
      const c=a.crS,D=Model.cfg.CROUCH_DROP*c,L=.35;
      const hipY=.70-.66*D;                                              // altura do quadril
      // inclinação do tronco: o centro da cabeça fica em hipY + .70·cos(lean) + .20 (a cabeça é contra-girada, então o .20 não inclina)
      const lean=Math.acos(Math.max(.2,Math.min(1,(1.4-.9*D-hipY)/.70)));
      const hb=.42*D,hipZ=hb+.17*D;                                      // quadril recua (+z = trás); o corpo todo recua um pouco p/ a cabeça ficar perto da câmera
      // cinemática inversa de 2 ossos: do quadril (0,hipY) ao pé no chão; o joelho vai para a frente. Coordenadas (frente, altura)
      const vf=hb,vy=-hipY,dist=Math.hypot(vf,vy),hh=Math.sqrt(Math.max(0,L*L-dist*dist/4));
      const kf=vf/2+hh*(-vy/dist),ky=vy/2+hh*(vf/dist);                  // joelho relativo ao quadril
      const th1=Math.atan2(kf,-ky),th2=Math.atan2(vf-kf,-(vy-ky));       // ângulo da coxa e da canela (a partir da vertical, + = para a frente)
      a.legL.position.set(-.0875,hipY,hipZ);a.legR.position.set(.0875,hipY,hipZ);
      a.upper.position.set(0,hipY,hipZ);a.upper.rotation.x=-lean;
      a.lnS=(a.lnS||0)+((r.ln||0)-(a.lnS||0))*Math.min(1,dt*10);a.upper.rotation.z=-a.lnS*.4; // inclinar de lado (Q/E)        // rotação x negativa = topo do tronco para a frente (-z)
      const sw=Math.sin(a.walkT)*.75*a.walkAmp*(1-.75*c);                // agachado anda com passos curtos
      a.legL.rotation.x=th1+sw;a.legR.rotation.x=th1-sw;
      a.kneeL.rotation.x=(th2-th1)-sw*.5*c;a.kneeR.rotation.x=(th2-th1)+sw*.5*c;
      a.armL.rotation.x=lean+.25*c-sw*.8;                                // braço livre pende na vertical (compensa a inclinação do tronco)
      a.armR.rotation.x=Math.PI/2+a.pitchS+lean;a.head.rotation.x=a.pitchS+lean; // braço da arma e cabeça: ângulo no mundo = só a mira
    },
    // ---------- RAGDOLL (boneco articulado, física verlet) ----------
    /** Solta o corpo do esqueleto animado e passa a simulá-lo: pontos (juntas) ligados por barras de comprimento fixo.
     *  from = {x,z} de quem matou (o corpo é jogado para longe dele); sem from, longe do jogador local. */
    startRagdoll(a,from){
      const T=THREE,V=(x,y,z)=>new T.Vector3(x,y,z);
      a.kneeL.rotation.x=a.kneeR.rotation.x=0;                      // o ragdoll usa pernas retas (um osso de .70)
      a.group.updateMatrixWorld(true);
      const wp=(o,x,y,z)=>o.localToWorld(V(x,y,z));
      const P={head:wp(a.head,0,.2,0),neck:wp(a.head,0,0,0),shL:wp(a.armL,0,0,0),shR:wp(a.armR,0,0,0),
        hipL:wp(a.legL,0,0,0),hipR:wp(a.legR,0,0,0),handL:wp(a.armL,0,-.7,0),handR:wp(a.armR,0,-.7,0),
        footL:wp(a.legL,0,-.7,0),footR:wp(a.legR,0,-.7,0)};
      P.pelvis=P.hipL.clone().add(P.hipR).multiplyScalar(.5);
      // empurrão: para longe de quem atirou + para cima
      const g=a.group.position,pl=from||Model.player;let dx=g.x-pl.x,dz=g.z-pl.z;const dl=Math.hypot(dx,dz)||1;dx/=dl;dz/=dl;
      const h=1/60,pts={},names=Object.keys(P);
      for(const n of names){
        const p=P[n],v=V(dx*4.5+(Math.random()-.5)*2.4,2.6+Math.random()*1.5,dz*4.5+(Math.random()-.5)*2.4);
        pts[n]={p,o:p.clone().addScaledVector(v,-h)};
      }
      const pairs=[['neck','head'],['neck','pelvis'],['neck','shL'],['neck','shR'],['shL','shR'],['pelvis','hipL'],['pelvis','hipR'],['hipL','hipR'],
        ['shL','hipL'],['shR','hipR'],['shL','hipR'],['shR','hipL'],['neck','hipL'],['neck','hipR'],['shL','pelvis'],['shR','pelvis'],
        ['shL','handL'],['shR','handR'],['hipL','footL'],['hipR','footR']];
      const sticks=pairs.map(([x,y])=>({a:pts[x],b:pts[y],len:pts[x].p.distanceTo(pts[y].p)}));
      const parts=[a.torso,a.head,a.armL,a.armR,a.legL,a.legR];
      const orig=parts.map(o=>({o,parent:o.parent,pos:o.position.clone(),quat:o.quaternion.clone()}));
      parts.forEach(o=>this.scene.attach(o)); // vira peça solta no mundo (mantém posição atual)
      a.rag={pts,sticks,orig,acc:0,parts};
    },
    /** Avança a simulação (passos fixos de 1/60 s) e posiciona cada peça do boneco sobre suas juntas. */
    stepRagdoll(a,dt){
      const R=a.rag,h=1/60,rad=.09,G=Model.cfg.GRAVITY*.9;
      R.acc=Math.min(R.acc+dt,h*4);
      while(R.acc>=h){
        R.acc-=h;
        for(const k in R.pts){ // integração verlet
          const q=R.pts[k],p=q.p,o=q.o,vx=(p.x-o.x)*.995,vy=(p.y-o.y)*.995,vz=(p.z-o.z)*.995;
          o.copy(p);p.x+=vx;p.y+=vy-G*h*h;p.z+=vz;
        }
        for(let it=0;it<8;it++){
          for(const s of R.sticks){ // mantém cada osso do mesmo tamanho
            const pa=s.a.p,pb=s.b.p,dx=pb.x-pa.x,dy=pb.y-pa.y,dz=pb.z-pa.z,d=Math.hypot(dx,dy,dz)||1e-6,f=(d-s.len)/d*.5;
            pa.x+=dx*f;pa.y+=dy*f;pa.z+=dz*f;pb.x-=dx*f;pb.y-=dy*f;pb.z-=dz*f;
          }
          for(const k in R.pts)this.ragCollide(R.pts[k],rad);
        }
      }
      // peças: posição/rotação a partir das juntas
      const T=THREE,P=n=>R.pts[n].p,Y=new T.Vector3(0,1,0),D=new T.Vector3(0,-1,0);
      const up=P('neck').clone().sub(P('pelvis')).normalize();
      const side=P('shR').clone().sub(P('shL'));side.addScaledVector(up,-side.dot(up)).normalize();
      const fwd=new T.Vector3().crossVectors(side,up);
      a.torso.position.copy(P('neck')).add(P('pelvis')).multiplyScalar(.5);
      a.torso.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(side,up,fwd));
      const limb=(o,from,to,axis)=>{o.position.copy(P(from));o.quaternion.setFromUnitVectors(axis,P(to).clone().sub(P(from)).normalize());};
      limb(a.head,'neck','head',Y);
      limb(a.armL,'shL','handL',D);limb(a.armR,'shR','handR',D);
      limb(a.legL,'hipL','footL',D);limb(a.legR,'hipR','footR',D);
    },
    /** Colisão de uma junta com o chão e com os blocos (com atrito). */
    ragCollide(q,r){
      const p=q.p,o=q.o,fr=.8;
      if(p.y<r){p.y=r;o.x=p.x-(p.x-o.x)*fr;o.z=p.z-(p.z-o.z)*fr;o.y=p.y;}
      for(const b of Model.boxes){
        const l=p.x-(b.minX-r),rt=(b.maxX+r)-p.x,f=p.z-(b.minZ-r),k=(b.maxZ+r)-p.z,t=(b.h+r)-p.y;
        if(l<=0||rt<=0||f<=0||k<=0||t<=0)continue;
        const m=Math.min(l,rt,f,k,t);
        if(m===t){p.y+=t;o.x=p.x-(p.x-o.x)*fr;o.z=p.z-(p.z-o.z)*fr;o.y=p.y;}
        else if(m===l){p.x-=l;o.x=p.x;}else if(m===rt){p.x+=rt;o.x=p.x;}
        else if(m===f){p.z-=f;o.z=p.z;}else{p.z+=k;o.z=p.z;}
      }
    },
    /** Remonta o boneco no esqueleto animado (ao renascer / sair da partida). */
    endRagdoll(a){
      for(const e of a.rag.orig){e.parent.add(e.o);e.o.position.copy(e.pos);e.o.quaternion.copy(e.quat);}
      a.rag=null;a.rig.rotation.z=0;a.rig.position.y=0;a.prevR=null;
    },
    /** Acha onde o tiro de A para B acerta o corpo do jogador pid (o tiro chega só como origem + ponto).
     *  Devolve {obj,p,n} (local da peça) para a mancha acompanhar o boneco, ou null. */
    bodyStain(pid,from,to){
      const a=this.avatars[pid];if(!a||!a.shown)return null;
      a.group.updateMatrixWorld(true);
      const dir=to.clone().sub(from),len=dir.length();if(len<1e-4)return null;dir.normalize();
      const rc=new THREE.Raycaster(from,dir,0,len+.4),hit=rc.intersectObjects(a.meshes,false)[0];
      return hit?{obj:hit.object,p:hit.object.worldToLocal(hit.point.clone()),n:hit.face.normal.clone()}:null;
    },
    /** Mancha de tinta presa numa parte do avatar (p/n em coordenadas locais da peça): acompanha o boneco. */
    addBodySplat(obj,p,n,color){
      const a=obj.userData.avatar;if(!a)return;
      const m=new THREE.Mesh(this.splatGeo,new THREE.MeshBasicMaterial({map:this.splatTex,color,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
      p=p.clone();let k=(obj.userData.stainK||.4)*(.8+Math.random()*.4);
      const R=.24,pr=obj.geometry.parameters,ax=Math.abs(n.x)>.5?0:Math.abs(n.y)>.5?1:2,hs=[pr.width/2,pr.height/2,pr.depth/2],c=['x','y','z'];
      for(let i=0;i<3;i++)if(i!==ax)k=Math.min(k,hs[i]*.95/R);          // não passa da borda da peça (braço/perna são finos)
      for(let i=0;i<3;i++)if(i!==ax){const lim=Math.max(0,hs[i]-R*k);p[c[i]]=Math.max(-lim,Math.min(lim,p[c[i]]));}
      m.position.copy(p).addScaledVector(n,.006);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);m.rotateZ(Math.random()*Math.PI*2);m.scale.set(k,k,1);
      obj.add(m);a.decals.push(m);
      if(a.decals.length>60){const o=a.decals.shift();if(o.parent)o.parent.remove(o);o.material.dispose();}
    },
    /** Limpa as manchas de um avatar (ao renascer / sair da partida). */
    clearBodySplats(a){
      if(!a)return;
      for(const o of a.decals){if(o.parent)o.parent.remove(o);o.material.dispose();}
      a.decals.length=0;
    },
    /** Aplica Settings.values: resolução, FOV, distância de visão (névoa) e sombras (liga/desliga e tamanho do mapa). */
    applySettings(){
      const s=Settings.values,sun=this.sun,sh=sun.shadow;
      this.resize();
      this.camera.fov=s.fov;this.camera.updateProjectionMatrix();
      this.scene.fog.near=s.viewDistance*.25;this.scene.fog.far=s.viewDistance;
      sun.castShadow=s.shadowSize>0;
      if(s.shadowSize>0&&sh.mapSize.x!==s.shadowSize){
        if(sh.map){sh.map.dispose();sh.map=null;}
        sh.mapSize.set(s.shadowSize,s.shadowSize);
      }
    },
    /** Desenha o mundo e, por cima (depth limpo), a arma. */
    render(){
      const r=this.renderer;r.clear();r.render(this.scene,this.camera);r.clearDepth();r.render(this.gunScene,this.gunCam);
    }
  };

  FPS.View=View;
})(window.FPS = window.FPS || {});
