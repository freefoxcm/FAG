import {StageEnvironment} from './environment';
import {stage,type StageDefinition} from '../game/content';
import {pickupDefinitions} from '../game/pickups';
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
 private sun:T.DirectionalLight;private environment?:StageEnvironment;private stageSelection=0;private views=new Map<number,T.Object3D>();private pools=new Map<string,T.Object3D[]>();
 private library=new ModelLibrary();private playerTemplate?:T.Group;private playerModels=new Map<AirframeId,T.Group>();private selection=0;private clock=0; private shake=0;private quality:'high'|'medium'='high';reducedMotion=false;
 private pilotFX:PilotFX;
 private fx:CombatFX;private impacts:ImpactFX;private projectiles:ProjectileBatch;
 private exhausts=new T.InstancedMesh(new T.ConeGeometry(.2,1,10),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),64);
 private pickupLabels=new Map<string,T.SpriteMaterial>();
 private entryZ=-90;private groundEntryZ=-105;private fireBoundary=-65;
 constructor(parent:HTMLElement){
  this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});parent.append(this.renderer.domElement);this.renderer.setClearColor(0x899b9e);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene.fog=new T.Fog(0xb7c4bd,90,170);this.scene.add(new T.HemisphereLight(0xe2eee8,0x637269,.95));this.scene.environment=skyEnvironment(this.renderer);this.scene.environmentIntensity=.9;
  this.sun=new T.DirectionalLight(0xffedce,2.4);this.sun.position.set(-24,55,-28);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-65,right:65,top:70,bottom:-70,near:1,far:160});this.sun.shadow.bias=-.001;this.sun.shadow.normalBias=.12;this.scene.add(this.sun);this.scene.add(this.sun.target);
  this.camera.position.set(0,70,44);this.camera.lookAt(0,7,-6);this.scene.add(this.player);
  this.exhausts.count=0;this.exhausts.frustumCulled=false;this.scene.add(this.exhausts);this.fx=new CombatFX(this.scene);this.impacts=new ImpactFX(this.scene);this.projectiles=new ProjectileBatch(this.scene);this.pilotFX=new PilotFX(this.scene);this.resize();window.addEventListener('resize',()=>this.resize());
 }
 async load(id:AirframeId='qingluan',definition=stage){await Promise.all([this.library.loadAll(id),...(['power','repair','turret','radar','missile-site'] as const).map(id=>this.library.get(id))]);await this.setCharacter(id);await this.setStage(definition);}
 async setStage(definition:StageDefinition){const generation=++this.stageSelection;await this.library.get(definition.bossId);const environment=await StageEnvironment.load(this.library,definition);if(generation!==this.stageSelection){environment.dispose();return;}this.environment?.dispose();this.environment=environment;environment.quality(this.quality==='high');environment.tiles.forEach(t=>this.scene.add(t));this.scene.fog=new T.Fog(definition.environment==='ocean'?0xa5c2ce:definition.environment==='canyon'?0xb5baa6:0xb7c4bd,90,170);}
 async setCharacter(id:AirframeId){const generation=++this.selection;await this.library.get(id);if(generation!==this.selection)return;if(this.playerTemplate)this.player.remove(this.playerTemplate);let model=this.playerModels.get(id);if(!model){model=this.library.clone(id);model.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.emissive){mat.userData.baseEmission=mat.emissive.clone();mat.userData.baseIntensity=mat.emissiveIntensity;}}});this.playerModels.set(id,model);}this.playerTemplate=model;this.player.add(model);this.player.userData.characterId=id;}
 setQuality(q:'high'|'medium'){this.quality=q;this.environment?.quality(q==='high');this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,q==='high'?1.5:1));this.renderer.shadowMap.enabled=q==='high';this.resize();}
 resize(){const w=innerWidth,h=innerHeight;this.camera.aspect=w/h;this.camera.fov=w/h<1.2?65:46;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);this.renderer.setSize(w,h);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(0,1),this.camera);const point=new T.Vector3();ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-AIR_HEIGHT),point);this.entryZ=point.z-10;this.fireBoundary=point.z+5;ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.8),point);this.groundEntryZ=point.z-8;}
 syncView(sim:Simulation){sim.entryZ=this.entryZ;sim.groundEntryZ=this.groundEntryZ;sim.fireBoundary=this.fireBoundary;}
 private makeView(e:Entity):T.Object3D {
  const key=e.kind==='boss'?e.modelId??'boss':e.kind==='turret'?e.facility==='radar'?'radar':e.facility==='missile'?'missile-site':'turret':e.kind;const pool=this.pools.get(key);if(pool?.length)return pool.pop()!;
  if(isAirEnemy(e.kind)||e.kind==='boss'){const o=this.library.clone(e.kind==='boss'?e.modelId??'boss':e.kind);o.scale.setScalar(modelDefinitions[e.kind].scale);return o;}
  if(e.kind==='turret')return this.library.clone(e.facility==='radar'?'radar':e.facility==='missile'?'missile-site':'turret');
  if(e.kind==='warning'){const g=new T.Group();const line=new T.Mesh(new T.CylinderGeometry(.045,.045,1,6),new T.MeshBasicMaterial({color:0xff704a,transparent:true,opacity:.65,depthWrite:false}));line.name='aim-line';g.add(line);const ring=new T.Mesh(new T.RingGeometry(1.4,1.6,32),new T.MeshBasicMaterial({color:0xffb16f,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.name='aim-target';g.add(ring);return g;}
  if(e.kind==='power'||e.kind==='repair'){
   const g=new T.Group(),model=this.library.clone(e.kind);g.add(model);const color=pickupDefinitions[e.kind].color;
   const ring=new T.Mesh(new T.TorusGeometry(1.45,.04,6,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.65,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=-.3;g.add(ring);
   const label=new T.Sprite(this.pickupLabel(e.kind,false));label.name='pickup-label';label.position.y=2.2;label.scale.set(3.8,1.66,1);g.add(label);const badge=new T.Sprite(this.pickupLabel(e.kind,true));badge.position.y=.9;badge.scale.set(1.1,1.1,1);g.add(badge);return g;
  }
  throw Error('Entity requires a batched renderer: '+e.kind);
 }
 private pickupLabel(kind:'power'|'repair',icon:boolean){
  const key=kind+(icon?'-icon':'-label');let material=this.pickupLabels.get(key);if(material)return material;
  const canvas=document.createElement('canvas');canvas.width=icon?128:256;canvas.height=icon?128:112;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#102a27e0';ctx.strokeStyle=kind==='power'?'#f9d890':'#98ffd1';ctx.lineWidth=3;if(icon){ctx.beginPath();ctx.arc(64,64,56,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.fillRect(6,6,244,100);ctx.strokeRect(6,6,244,100);}ctx.fillStyle=ctx.strokeStyle;ctx.textAlign='center';ctx.font=(icon?'bold 95px':'bold 42px')+' Microsoft YaHei';ctx.fillText(icon?(kind==='power'?'↑':'+'):(kind==='power'?'↑  火力':'＋  维修'),canvas.width/2,icon?98:72);material=new T.SpriteMaterial({map:new T.CanvasTexture(canvas),depthTest:false,transparent:true});this.pickupLabels.set(key,material);return material;
 }
 handle(events:GameEvent[]){this.fx.handle(events);this.impacts.handle(events);for(const e of events){if(e.type==='hurt')this.shake=Math.max(this.shake,.5);if(e.type==='ultimate')this.shake=Math.max(this.shake,.6);if(e.type==='missile-impact')this.shake=Math.max(this.shake,.25);if(e.type==='explosion')this.shake=Math.max(this.shake,e.large?.95:e.weight==='heavy'?.3:.13);}}
 reset(){this.pilotFX.reset();this.fx.reset();this.impacts.reset();this.projectiles.reset();for(const [id,v] of this.views){this.scene.remove(v);const kind=v.userData.kind as string;if(kind){const a=this.pools.get(kind)||[];a.push(v);this.pools.set(kind,a);}this.views.delete(id);}this.environment?.reset();this.shake=0;}
 render(sim:Simulation,dt:number){
  this.clock+=dt;const moving=sim.mode==='playing'||sim.mode==='title'||sim.mode==='intro';if(moving)this.environment?.update(dt,sim.mode==='playing'?5:1.2,sim.mode==='playing'?sim.time:0);
  this.player.visible=sim.mode!=='lost';this.player.position.set(sim.player.x,15,sim.player.z);this.player.rotation.set(0,0,-sim.player.bank);this.player.scale.setScalar(sim.mode==='title'?1:modelDefinitions[sim.character.id].scale);this.playerTemplate?.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.emissive){const blink=sim.invincible>0&&sim.mode==='playing'?.2+.2*Math.sin(this.clock*24):0;mat.emissive.copy(mat.userData.baseEmission).lerp(new T.Color(sim.character.color),blink);mat.emissiveIntensity=Math.max(mat.userData.baseIntensity,blink);}}});
  const active=new Set<number>();for(const e of sim.entities){if(e.kind==='bullet'||e.kind==='hostile'||e.kind==='missile'||e.kind==='decoy')continue;active.add(e.id);let v=this.views.get(e.id);if(!v){v=this.makeView(e);this.views.set(e.id,v);this.scene.add(v);}v.visible=true;v.position.set(e.x+e.recoilX,e.y,e.z+e.recoilZ);if(e.kind==='boss')for(const part of e.parts??[]){const node=v.getObjectByName(part.id);if(node)node.visible=part.hp>0;}if(isAirEnemy(e.kind)||e.kind==='boss'){v.rotation.set(0,e.heading,e.bank);v.traverse(o=>{if(o instanceof T.Mesh){const mat=o.material as T.MeshStandardMaterial;if(mat.emissive){mat.emissive.setRGB(1,.55,.25);mat.emissiveIntensity=e.hitFlash/.08*.9;}}});}if(e.kind==='turret'){v.rotation.y=e.heading;const head=v.getObjectByName('turret-head');if(head)head.rotation.y=Math.atan2(e.x-sim.player.x,e.z-sim.player.z);}if(e.kind==='warning'){const source=sim.entities.find(o=>o.id===e.target);if(source&&(!source.parts||source.parts.some(p=>p.role==='weapon'&&p.slot===e.muzzleSlot&&p.hp>0))){const muzzle=cannonMuzzle(source,e,e.muzzleSlot);v.position.set(muzzle.x,muzzle.y,muzzle.z);const delta=new T.Vector3(e.x-muzzle.x,AIR_HEIGHT-muzzle.y,e.z-muzzle.z);const line=v.getObjectByName('aim-line')!;line.position.copy(delta).multiplyScalar(.5);line.scale.y=delta.length();line.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());const ring=v.getObjectByName('aim-target')!;ring.position.copy(delta);ring.scale.setScalar(.85+.15*Math.sin(this.clock*18));}else v.visible=false;}if(e.kind==='power'||e.kind==='repair'){v.rotation.y=0;const label=v.getObjectByName('pickup-label');if(label)label.visible=Math.hypot(e.x-sim.player.x,e.z-sim.player.z)<18;v.position.y+=Math.sin(this.clock*4)*.25;}}
  for(const [id,v] of this.views)if(!active.has(id)){this.scene.remove(v);this.views.delete(id);const kind=v.userData.kind as string|undefined;if(kind){const a=this.pools.get(kind)||[];a.push(v);this.pools.set(kind,a);}}
  for(const e of sim.entities){const v=this.views.get(e.id);if(!v)continue;v.userData.kind=e.kind==='boss'?e.modelId??'boss':e.kind==='turret'?e.facility==='radar'?'radar':e.facility==='missile'?'missile-site':'turret':e.kind;}

  this.pilotFX.render(sim);this.projectiles.render(sim);this.renderExhausts(sim);this.fx.update(sim,dt,this.quality);this.impacts.update(dt,this.camera,this.quality);this.shake*=Math.exp(-dt*14);const shake=this.reducedMotion||sim.mode==='paused'?0:this.shake;this.camera.position.set((Math.random()-.5)*shake,70+(Math.random()-.5)*shake*.3,44+(Math.random()-.5)*shake*.3);this.renderer.render(this.scene,this.camera);
 }
 private renderExhausts(sim:Simulation){
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);let n=0;const sources=[{kind:sim.character.id,x:sim.player.x,y:AIR_HEIGHT,z:sim.player.z,heading:0,bank:-sim.player.bank,recoilX:0,recoilZ:0},...sim.entities.filter(e=>isAirEnemy(e.kind)||e.kind==='boss')];
  for(const e of sources){if(n>=64)break;const id=('modelId' in e&&e.modelId?e.modelId:e.kind) as keyof typeof modelDefinitions;for(const [index,p] of modelDefinitions[id].exhausts.entries()){if(n>=64)break;if(id==='boss'&&index>=2&&'parts' in e&&e.parts?.find(part=>part.id==='part_'+index)?.hp===0)continue;const position=modelPoint(id,e,p),direction=new T.Vector3(Math.sin(e.heading),0,Math.cos(e.heading));const length=(id==='boss'?1.7:id===sim.character.id?1.25:.9)*(1+Math.sin(this.clock*35+n)*.12);dummy.position.set(position.x+direction.x*length/2,position.y,position.z+direction.z*length/2);dummy.quaternion.setFromUnitVectors(up,direction);dummy.scale.set(id==='boss'?1.7:.8,length,id==='boss'?1.7:.8);dummy.updateMatrix();this.exhausts.setMatrixAt(n,dummy.matrix);this.exhausts.setColorAt(n,new T.Color(id===sim.character.id?sim.character.color:0xffa561));n++;}}
  this.exhausts.count=sim.mode==='lost'?0:n;this.exhausts.instanceMatrix.needsUpdate=true;if(this.exhausts.instanceColor)this.exhausts.instanceColor.needsUpdate=true;
 }
 get stats(){return {drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,activeViews:this.views.size,particles:this.impacts.count,...this.fx.stats};}
}
