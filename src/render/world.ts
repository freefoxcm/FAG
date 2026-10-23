import * as T from 'three';
import {ModelLibrary,skyEnvironment} from './models';
import {isAirEnemy,modelDefinitions} from '../game/enemies';
import type { Simulation,Entity,GameEvent } from '../game/simulation';
import {AIR_HEIGHT,cannonMuzzle,modelPoint} from '../game/combat';
import {CombatFX} from './combat-fx';
import {ImpactFX} from './impact-fx';
import {ProjectileBatch} from './projectiles';
import {PilotFX} from './pilot-fx';
import type {AirframeId} from '../game/roster';
export class World {
 renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.PerspectiveCamera(46,1,.1,240); player=new T.Group();
 private sun:T.DirectionalLight;private tiles:T.Group[]=[];private views=new Map<number,T.Object3D>();private pools=new Map<string,T.Object3D[]>();
 private library=new ModelLibrary();private playerTemplate?:T.Group;private playerModels=new Map<AirframeId,T.Group>();private selection=0;private clock=0; private shake=0;private quality:'high'|'medium'='high';reducedMotion=false;
 private pilotFX:PilotFX;
 private fx:CombatFX;private impacts:ImpactFX;private projectiles:ProjectileBatch;
 private exhausts=new T.InstancedMesh(new T.ConeGeometry(.2,1,10),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),64);
 private entryZ=-90;private groundEntryZ=-105;private fireBoundary=-65;
 constructor(parent:HTMLElement){
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});parent.append(this.renderer.domElement);this.renderer.setClearColor(0x899b9e);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene.fog=new T.Fog(0xb7c4bd,90,170);this.scene.add(new T.HemisphereLight(0xe2eee8,0x637269,.95));this.scene.environment=skyEnvironment(this.renderer);this.scene.environmentIntensity=.9;
  this.sun=new T.DirectionalLight(0xffedce,2.4);this.sun.position.set(-24,55,-28);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:70,bottom:-70,near:1,far:160});this.sun.shadow.bias=-.001;this.sun.shadow.normalBias=.12;this.scene.add(this.sun);this.scene.add(this.sun.target);
  this.camera.position.set(0,70,44);this.camera.lookAt(0,7,-6);this.scene.add(this.player);
  this.tiles=[1729,3617].map(seed=>{const tile=new T.Group();tile.add(this.cityTile(seed));const harbor=this.portTile(seed);harbor.visible=false;tile.add(harbor);return tile;});this.tiles[0].position.z=-64;this.tiles[1].position.z=64;this.tiles.forEach(g=>this.scene.add(g));
  this.exhausts.count=0;this.exhausts.frustumCulled=false;this.scene.add(this.exhausts);this.fx=new CombatFX(this.scene);this.impacts=new ImpactFX(this.scene);this.projectiles=new ProjectileBatch(this.scene);this.pilotFX=new PilotFX(this.scene);this.resize();window.addEventListener('resize',()=>this.resize());
 }
 async load(id:AirframeId='qingluan'){await this.library.loadAll(id);await this.setCharacter(id);}
 async setCharacter(id:AirframeId){const generation=++this.selection;await this.library.get(id);if(generation!==this.selection)return;if(this.playerTemplate)this.player.remove(this.playerTemplate);let model=this.playerModels.get(id);if(!model){model=this.library.clone(id);model.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.emissive){mat.userData.baseEmission=mat.emissive.clone();mat.userData.baseIntensity=mat.emissiveIntensity;}}});this.playerModels.set(id,model);}this.playerTemplate=model;this.player.add(model);this.player.userData.characterId=id;}
 setQuality(q:'high'|'medium'){this.quality=q;this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,q==='high'?1.5:1));this.renderer.shadowMap.enabled=q==='high';this.resize();}
 resize(){const w=innerWidth,h=innerHeight;this.camera.aspect=w/h;this.camera.fov=w/h<1.2?65:46;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);this.renderer.setSize(w,h);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(0,1),this.camera);const point=new T.Vector3();ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-AIR_HEIGHT),point);this.entryZ=point.z-10;this.fireBoundary=point.z+5;ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.8),point);this.groundEntryZ=point.z-8;}
 syncView(sim:Simulation){sim.entryZ=this.entryZ;sim.groundEntryZ=this.groundEntryZ;sim.fireBoundary=this.fireBoundary;}
 private cityTile(seed:number){
  const g=new T.Group();let s=seed;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  const texture=(road:boolean)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;const data=ctx.createImageData(256,256);for(let i=0;i<data.data.length;i+=4){const n=(road?150:205)+rand()*(road?65:35);data.data[i]=n;data.data[i+1]=n;data.data[i+2]=n;data.data[i+3]=255;}ctx.putImageData(data,0,0);if(road){ctx.strokeStyle='#494f4b55';ctx.lineWidth=1;for(let j=0;j<12;j++){ctx.beginPath();ctx.moveTo(rand()*256,rand()*256);ctx.lineTo(rand()*256,rand()*256);ctx.stroke();}}const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(road?6:2,road?18:2);t.colorSpace=T.SRGBColorSpace;return t;};const roadTexture=texture(true),concreteTexture=texture(false);
  const materials={road:new T.MeshStandardMaterial({color:0x666d69,map:roadTexture,roughness:.95}),sidewalk:new T.MeshStandardMaterial({color:0xb5b1a2,map:concreteTexture,roughness:.9}),roof:new T.MeshStandardMaterial({color:0xbcb7a8,map:concreteTexture,roughness:.8}),metal:new T.MeshStandardMaterial({color:0x79878a,metalness:.4,roughness:.65}),leaves:new T.MeshStandardMaterial({color:0x59775b,roughness:1}),trunk:new T.MeshStandardMaterial({color:0x696450}),white:new T.MeshStandardMaterial({color:0xcac7ad}),water:new T.MeshStandardMaterial({color:0x527b7c,metalness:.4,roughness:.3})};
  const batches=new Map<T.Material,{w:number;h:number;d:number;x:number;y:number;z:number}[]>();
  function box(w:number,h:number,d:number,mat:T.Material,x:number,y:number,z:number){const a=batches.get(mat)||[];a.push({w,h,d,x,y,z});batches.set(mat,a);}
  box(160,.2,128,materials.sidewalk,0,-.2,0);box(15,.05,128,materials.road,0,-.06,0);
  box(28,.1,128,materials.water,70,-.08,0);
  for(let z=-64;z<64;z+=32){box(130,.055,10,materials.road,0,0,z);for(let x=-64;x<64;x+=4){if(Math.abs(x)>8)box(1.5,.02,.12,materials.white,x,.04,z);}
   for(const zz of [z-6,z+6])for(let x=-6;x<7;x+=1.4)box(.65,.025,2,materials.white,x,.04,zz);
  }
  for(let z=-62;z<64;z+=5)for(const x of [-2.8,2.8])box(.12,.02,2.5,materials.white,x,0,z);
  for(const x of [-7.5,7.5])box(.15,.1,128,materials.white,x,.02,0);
  const buildingData:{x:number;y:number;z:number;w:number;h:number;d:number;c:T.Color}[]=[];const windows:{x:number;y:number;z:number;w:number;h:number;d:number}[]=[];
  const palette=[0xaaa89b,0xc4bbab,0x929d9e,0xb2aca1,0xa9b0a7];
  for(let z=-53;z<64;z+=32)for(const side of [-1,1])for(let col=0;col<3;col++){
   const x=side*(16+col*14);const h=3+rand()*8,w=8+rand()*3,d=15+rand()*5;buildingData.push({x,y:h/2,z:z+4,w,h,d,c:new T.Color(palette[Math.floor(rand()*palette.length)])});
   box(w+.35,.24,d+.35,materials.roof,x,h+.12,z+4);box(w*.7,.12,d*.7,materials.metal,x,h+.3,z+4);
   for(let k=0;k<2;k++){box(1.8,.6,2.5,materials.metal,x-2+k*3,h+.65,z+3);box(1.9,.1,2.6,materials.roof,x-2+k*3,h+1,z+3);for(let l=0;l<6;l++)box(.06,.02,2.2,materials.trunk,x-2.7+k*3+l*.25,h+1.07,z+3);}
   for(const edge of [-1,1]){box(w,.3,.15,materials.roof,x,h+.45,z+4+edge*d/2);box(.15,.3,d,materials.roof,x+edge*w/2,h+.45,z+4);}
   box(1.3,.8,1.8,materials.roof,x+w*.25,h+.7,z+9);box(.2,2.1,.2,materials.metal,x+w*.25,h+2.1,z+9);
   if(col===0){box(.28,h,.3,materials.metal,x-w/2+.1,h/2,z+4);box(.28,h,.3,materials.metal,x+w/2-.1,h/2,z+4);}
   for(let yy=1.4;yy<h-.5;yy+=1.5)for(let zz=z-d/2+5;zz<z+d/2+3;zz+=2.4)for(const edge of [-1,1])windows.push({x:x+edge*(w/2+.015),y:yy,z:zz,w:.035,h:.65,d:1.15});
   for(let yy=1.4;yy<h-.5;yy+=1.5)for(let xx=x-w/2+1;xx<x+w/2;xx+=2)for(const edge of [-1,1])windows.push({x:xx,y:yy,z:z+4+edge*(d/2+.015),w:1.1,h:.65,d:.035});
  }
  const dummy=new T.Object3D();const buildings=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({map:concreteTexture,roughness:.85}),buildingData.length);buildings.castShadow=true;buildings.receiveShadow=true;buildingData.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();buildings.setMatrixAt(i,dummy.matrix);buildings.setColorAt(i,b.c);});g.add(buildings);
  const glass=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:0x46616a,metalness:.5,roughness:.3}),windows.length);windows.forEach((b,i)=>{dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.updateMatrix();glass.setMatrixAt(i,dummy.matrix);});g.add(glass);
  const trees=[];for(let z=-60;z<64;z+=7)if(Math.abs((z+64)%32)>7)for(const x of [-9,9])trees.push({x,z});
  const leaves=new T.InstancedMesh(new T.IcosahedronGeometry(1,1),materials.leaves,trees.length);leaves.castShadow=true;trees.forEach((p,i)=>{box(.2,1.5,.2,materials.trunk,p.x,.7,p.z);dummy.position.set(p.x,2.2,p.z);dummy.scale.set(1.25,1.5,1.25);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);});g.add(leaves);
  const cars=[new T.MeshStandardMaterial({color:0xc7c9b9,metalness:.4}),new T.MeshStandardMaterial({color:0x668a91,metalness:.5}),new T.MeshStandardMaterial({color:0x895b4a,metalness:.3})];
  const tire=new T.MeshStandardMaterial({color:0x242c2b,roughness:1}),carGlass=new T.MeshStandardMaterial({color:0x294750,metalness:.7,roughness:.2});
  for(let i=0;i<24;i++){const x=(i%2?1:-1)*(4.8+rand()*.5),z=-62+rand()*124;box(1.1,.65,2.3,cars[i%3],x,.4,z);box(.95,.35,1.15,carGlass,x,.85,z);box(.92,.07,.8,cars[i%3],x,1.04,z);for(const side of [-1,1])for(const end of [-1,1])box(.14,.35,.45,tire,x+side*.57,.24,z+end*.7);for(const side of [-1,1])box(.22,.15,.05,materials.white,x+side*.33,.45,z-1.18);}
  for(let z=-55;z<64;z+=16)for(const side of [-1,1]){const x=side*7.8;box(.1,4.4,.1,materials.metal,x,2.2,z);box(1.25,.08,.1,materials.metal,x-side*.6,4.4,z);box(.6,.1,.24,materials.white,x-side*1.1,4.34,z);}
  // A recurring port-side gantry gives the boulevard a recognizable silhouette.
  for(const x of [-8.5,8.5])box(.45,5,.45,materials.metal,x,2.5,-30);box(18,.5,.6,materials.metal,0,5,-30);
  const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=96;const ctx=signCanvas.getContext('2d')!;ctx.fillStyle='#285b54';ctx.fillRect(0,0,512,96);ctx.fillStyle='#e7e5d7';ctx.font='bold 38px sans-serif';ctx.textAlign='center';ctx.fillText('临 港  LINGANG  ↗',256,63);const sign=new T.Mesh(new T.PlaneGeometry(10,1.8),new T.MeshStandardMaterial({map:new T.CanvasTexture(signCanvas),side:T.DoubleSide}));sign.position.set(0,4.6,-29.6);g.add(sign);
  const unit=new T.BoxGeometry(1,1,1);for(const [mat,items] of batches){const mesh=new T.InstancedMesh(unit,mat,items.length);mesh.castShadow=true;mesh.receiveShadow=true;items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});g.add(mesh);}
  return g;
 }
 private portTile(seed:number){
  const g=new T.Group(),dummy=new T.Object3D();const batches=new Map<number,{x:number;y:number;z:number;w:number;h:number;d:number}[]>();let s=seed;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
  const box=(color:number,x:number,y:number,z:number,w:number,h:number,d:number)=>{const a=batches.get(color)||[];a.push({x,y,z,w,h,d});batches.set(color,a);};
  box(0x527b7c,0,-.2,0,170,.2,128);box(0x777d72,0,0,0,17,.3,128);box(0xa19c89,28,-.03,0,37,.2,128);box(0xa19c89,-26,-.03,0,32,.2,128);
  for(let z=-62;z<64;z+=5)for(const x of [-3,3])box(0xd2c7a5,x,.18,z,.12,.02,2.5);
  for(const x of [-8,8])box(0xd2c7a5,x,.18,0,.2,.06,128);
  const colors=[0x8e5b43,0x506c76,0x607c70,0x9d8b55];
  for(let z=-55;z<64;z+=14)for(const side of [-1,1])for(let col=0;col<3;col++){
   const x=side*(16+col*7),stack=1+Math.floor(rand()*2),color=colors[Math.floor(rand()*colors.length)];for(let k=0;k<stack;k++){box(color,x,1.2+k*2.3,z,5.7,2.25,10);for(let n=0;n<8;n++)for(const edge of [-1,1])box(0x3b5048,x+edge*2.87,1.2+k*2.3,z-4.3+n*1.2,.06,2.1,.08);box(0xb5b19a,x,2.35+k*2.3,z,5.7,.08,.12);}
  }
  for(const z of [-40,24]){const x=36;for(const dz of [-3,3])for(const dx of [-2,2])box(0xb09a5d,x+dx,7,z+dz,.45,14,.45);box(0xb09a5d,x,14,z,28,.6,.9);box(0x48565a,x-7,11.8,z,.1,4,.1);box(0xd0b979,x-7,9.7,z,.8,.8,.8);box(0x526969,x,12,z,3,2,2.4);}
  // A moored cargo ship beyond the right-hand quay.
  box(0x303f42,55,.8,0,10,2,55);box(0xa8aba0,55,2,0,9,.4,52);for(let z=-20;z<18;z+=11)for(const x of [52.5,57.5])box(colors[Math.floor(rand()*4)],x,3.5,z,4.2,2.8,9);box(0xd3d1be,55,4,22,8,5,6);box(0x4b6974,55,5.5,18.8,7,.8,.15);
  const geometry=new T.BoxGeometry(1,1,1);for(const [color,items]of batches){const mat=new T.MeshStandardMaterial({color,roughness:color===0x527b7c?.28:.7,metalness:color===0x527b7c?.4:.15});const mesh=new T.InstancedMesh(geometry,mat,items.length);mesh.castShadow=true;mesh.receiveShadow=true;items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});g.add(mesh);}return g;
 }
 private makeView(e:Entity):T.Object3D {
  const key=e.kind==='hostile'&&e.heavy?'hostile-heavy':e.kind;const pool=this.pools.get(key);if(pool?.length)return pool.pop()!;
  if(isAirEnemy(e.kind)||e.kind==='boss'){const o=this.library.clone(e.kind);o.scale.setScalar(modelDefinitions[e.kind].scale);return o;}
  if(e.kind==='turret'){const g=new T.Group();const m=new T.Mesh(new T.BoxGeometry(2.7,.9,3.4),new T.MeshStandardMaterial({color:0x5f6a55,roughness:.7}));m.castShadow=true;g.add(m);const pivot=new T.Group();pivot.name='turret-head';g.add(pivot);const head=new T.Mesh(new T.BoxGeometry(1.6,.8,1.7),new T.MeshStandardMaterial({color:0x899078}));head.position.y=.8;pivot.add(head);for(const x of [-.5,.5]){const barrel=new T.Mesh(new T.CylinderGeometry(.1,.1,2.2,6),new T.MeshStandardMaterial({color:0x282f2c}));barrel.rotation.x=Math.PI/2;barrel.position.set(x,1,-1.3);pivot.add(barrel);}return g;}
  if(e.kind==='warning'){const g=new T.Group();const line=new T.Mesh(new T.CylinderGeometry(.045,.045,1,6),new T.MeshBasicMaterial({color:0xff704a,transparent:true,opacity:.65,depthWrite:false}));line.name='aim-line';g.add(line);const ring=new T.Mesh(new T.RingGeometry(1.4,1.6,32),new T.MeshBasicMaterial({color:0xffb16f,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.name='aim-target';g.add(ring);return g;}
  if(e.kind==='power'||e.kind==='repair'){const g=new T.Group();const color=e.kind==='power'?0xf9d890:0x98ffd1;const m=new T.Mesh(new T.OctahedronGeometry(.8),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.5,metalness:.7,roughness:.3}));g.add(m);const ring=new T.Mesh(new T.TorusGeometry(1.3,.07,6,24),new T.MeshBasicMaterial({color}));ring.rotation.x=-Math.PI/2;g.add(ring);return g;}
  throw Error('Entity requires a batched renderer: '+e.kind);
 }
 handle(events:GameEvent[]){this.fx.handle(events);this.impacts.handle(events);for(const e of events){if(e.type==='hurt')this.shake=Math.max(this.shake,.5);if(e.type==='ultimate')this.shake=Math.max(this.shake,.6);if(e.type==='missile-impact')this.shake=Math.max(this.shake,.25);if(e.type==='explosion')this.shake=Math.max(this.shake,e.large?.95:e.weight==='heavy'?.3:.13);}}
 reset(){this.pilotFX.reset();this.fx.reset();this.impacts.reset();this.projectiles.reset();for(const [id,v] of this.views){this.scene.remove(v);const kind=v.userData.kind as string;if(kind){const a=this.pools.get(kind)||[];a.push(v);this.pools.set(kind,a);}this.views.delete(id);}this.tiles.forEach((t,i)=>{t.position.z=i===0?-64:64;t.children[0].visible=true;t.children[1].visible=false;});}
 render(sim:Simulation,dt:number){
  this.clock+=dt;const moving=sim.mode==='playing'||sim.mode==='title'||sim.mode==='intro';if(moving)for(const tile of this.tiles){tile.position.z+=dt*(sim.mode==='playing'?5:1.2);if(tile.position.z>=128){tile.position.z-=256;const port=sim.mode==='playing'&&sim.time>85;tile.children[0].visible=!port;tile.children[1].visible=port;}}
  this.player.visible=sim.mode!=='lost';this.player.position.set(sim.player.x,15,sim.player.z);this.player.rotation.set(0,0,-sim.player.bank);this.player.scale.setScalar(sim.mode==='title'?1:modelDefinitions[sim.character.id].scale);this.playerTemplate?.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.emissive){const blink=sim.invincible>0&&sim.mode==='playing'?.2+.2*Math.sin(this.clock*24):0;mat.emissive.copy(mat.userData.baseEmission).lerp(new T.Color(sim.character.color),blink);mat.emissiveIntensity=Math.max(mat.userData.baseIntensity,blink);}}});
  const active=new Set<number>();for(const e of sim.entities){if(e.kind==='bullet'||e.kind==='hostile'||e.kind==='missile'||e.kind==='decoy')continue;active.add(e.id);let v=this.views.get(e.id);if(!v){v=this.makeView(e);this.views.set(e.id,v);this.scene.add(v);}v.visible=true;v.position.set(e.x+e.recoilX,e.y,e.z+e.recoilZ);if(isAirEnemy(e.kind)||e.kind==='boss'){v.rotation.set(0,e.heading,e.bank);v.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.emissive){mat.emissive.setRGB(1,.55,.25);mat.emissiveIntensity=e.hitFlash/.08*.9;}}});}if(e.kind==='turret'){const head=v.getObjectByName('turret-head');if(head)head.rotation.y=Math.atan2(e.x-sim.player.x,e.z-sim.player.z);}if(e.kind==='warning'){const source=sim.entities.find(o=>o.id===e.target);if(source){const muzzle=cannonMuzzle(source,e,e.muzzleSlot);v.position.set(muzzle.x,muzzle.y,muzzle.z);const delta=new T.Vector3(e.x-muzzle.x,AIR_HEIGHT-muzzle.y,e.z-muzzle.z);const line=v.getObjectByName('aim-line')!;line.position.copy(delta).multiplyScalar(.5);line.scale.y=delta.length();line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());const ring=v.getObjectByName('aim-target')!;ring.position.copy(delta);ring.scale.setScalar(.85+.15*Math.sin(this.clock*18));}else v.visible=false;}if(e.kind==='power'||e.kind==='repair'){v.rotation.y=this.clock*2;v.position.y+=Math.sin(this.clock*4)*.25;}}
  for(const [id,v] of this.views)if(!active.has(id)){this.scene.remove(v);this.views.delete(id);const kind=v.userData.kind as string|undefined;if(kind){const a=this.pools.get(kind)||[];a.push(v);this.pools.set(kind,a);}}
  for(const e of sim.entities){const v=this.views.get(e.id);if(!v)continue;v.userData.kind=e.kind==='hostile'&&e.heavy?'hostile-heavy':e.kind;}

  this.pilotFX.render(sim);this.projectiles.render(sim);this.renderExhausts(sim);this.fx.update(sim,dt,this.quality);this.impacts.update(dt,this.camera,this.quality);this.shake*=Math.exp(-dt*14);const shake=this.reducedMotion||sim.mode==='paused'?0:this.shake;this.camera.position.set((Math.random()-.5)*shake,70+(Math.random()-.5)*shake*.3,44+(Math.random()-.5)*shake*.3);this.renderer.render(this.scene,this.camera);
 }
 private renderExhausts(sim:Simulation){
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);let n=0;const sources=[{kind:sim.character.id,x:sim.player.x,y:AIR_HEIGHT,z:sim.player.z,heading:0,bank:-sim.player.bank,recoilX:0,recoilZ:0},...sim.entities.filter(e=>isAirEnemy(e.kind)||e.kind==='boss')];
  for(const e of sources){if(n>=64)break;const id=e.kind as keyof typeof modelDefinitions;for(const p of modelDefinitions[id].exhausts){if(n>=64)break;const position=modelPoint(id,e,p),direction=new T.Vector3(Math.sin(e.heading),0,Math.cos(e.heading));const length=(id==='boss'?1.7:id===sim.character.id?1.25:.9)*(1+Math.sin(this.clock*35+n)*.12);dummy.position.set(position.x+direction.x*length/2,position.y,position.z+direction.z*length/2);dummy.quaternion.setFromUnitVectors(up,direction);dummy.scale.set(id==='boss'?1.7:.8,length,id==='boss'?1.7:.8);dummy.updateMatrix();this.exhausts.setMatrixAt(n,dummy.matrix);this.exhausts.setColorAt(n,new T.Color(id===sim.character.id?sim.character.color:0xffa561));n++;}}
  this.exhausts.count=sim.mode==='lost'?0:n;this.exhausts.instanceMatrix.needsUpdate=true;if(this.exhausts.instanceColor)this.exhausts.instanceColor.needsUpdate=true;
 }
 get stats(){return {drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,activeViews:this.views.size,particles:this.impacts.count,...this.fx.stats};}
}
