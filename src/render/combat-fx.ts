import * as T from 'three';
import {AIR_HEIGHT, type Point3} from '../game/combat';
import type {GameEvent, Simulation} from '../game/simulation';
import {getCharacter} from '../game/characters';

type EffectKind = 'ring' | 'beam' | 'lock' | 'flash' | 'line';
interface Effect { mesh:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>; kind:EffectKind; life:number; max:number; size:number; target?:number }
interface Trail {x:number;y:number;z:number;dx:number;dy:number;dz:number;life:number;gold:boolean}

/** Reusable geometric FX; missile ribbons are rendered as a single instanced batch. */
export class CombatFX {
  private effects:Effect[]=[];
  private pool=new Map<EffectKind,Effect[]>();
  private trails:Trail[]=[];
  private previous=new Map<number,T.Vector3>();
  private emission=0;
  private ringGeometry=new T.RingGeometry(.97,1,96);
  private beamGeometry=new T.CylinderGeometry(.35,.65,1,12,1,true);
  private flashGeometry=new T.IcosahedronGeometry(1,1);
  private ribbons:T.InstancedMesh;
  private dummy=new T.Object3D();
  private direction=new T.Vector3();
  private up=new T.Vector3(0,1,0);
  private color=new T.Color();
  constructor(private scene:T.Scene){
    this.ribbons=new T.InstancedMesh(new T.CylinderGeometry(.07,.13,1,5),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}),320);
    this.ribbons.count=0;this.ribbons.frustumCulled=false;this.ribbons.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(this.ribbons);
  }
  private add(kind:EffectKind,point:Point3,size:number,life:number,color:number,target?:number){
    const available=this.pool.get(kind);let fx=available?.pop();
    if(!fx){const mesh=new T.Mesh(kind==='beam'||kind==='line'?this.beamGeometry:kind==='flash'?this.flashGeometry:this.ringGeometry,new T.MeshBasicMaterial({color,transparent:true,opacity:1,side:kind==='beam'?T.FrontSide:T.DoubleSide,blending:T.NormalBlending,depthWrite:false,toneMapped:false}));fx={mesh,kind,life,max:life,size};mesh.frustumCulled=false;this.scene.add(mesh);}
    Object.assign(fx,{life,max:life,size,target});fx.mesh.material.color.setHex(color);fx.mesh.visible=true;fx.mesh.position.set(point.x,point.y,point.z);fx.mesh.userData.baseY=point.y;fx.mesh.rotation.set(kind==='ring'||kind==='lock'?-Math.PI/2:0,0,0);fx.mesh.scale.setScalar(1);this.effects.push(fx);return fx;
  }
  private line(a:Point3,b:Point3,width:number,life:number,color:number){const fx=this.add('line',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2},width,life,color);this.direction.set(b.x-a.x,b.y-a.y,b.z-a.z);fx.mesh.userData.length=this.direction.length();fx.mesh.quaternion.setFromUnitVectors(this.up,this.direction.normalize());return fx;}
  handle(events:GameEvent[]){
    for(const event of events){const point={x:event.x??0,y:event.y??AIR_HEIGHT,z:event.z??0},color=new T.Color(getCharacter(event.characterId).color).getHex();
      if(event.type==='muzzle')this.add('flash',point,.55,.16,0xffad64);
      if(event.type==='telegraph'){this.add('lock',point,1.4,.65,0xff9e5b,event.targetId);if(event.variant==='coordinated'&&event.targets?.[0]){this.line(point,event.targets[0],.045,.9,0xff8866);this.add('ring',event.targets[0],2,.9,0xff9e5b);}}
      if(event.type==='pickup'){const tint=event.pickupKind==='power'?0xffdb89:0x98ffd1;this.add('ring',point,3.5,.4,tint);this.add('flash',point,.6,.15,tint);}
      if(event.type==='missile'){
        this.add('ring',point,4,.55,color);this.add('ring',point,2.7,.38,0xffe3a0);
        for(const target of event.targets??[])this.add('lock',{...target,y:target.y+.3},2.2,1.4,0xffdd86,target.id);
      }
      if(event.type==='missile-impact'){
        this.add('flash',point,1.4,.32,0xfff3bd);this.add('ring',point,3,.45,color);
      }
      if(event.type==='ability'){this.add('ring',point,event.variant==='wingmen'?5:3,.65,color);this.add('flash',point,1,.2,color);if(event.end)this.line(point,event.end,.8,.4,color);}
      if(event.type==='rail-shot'){this.add('flash',point,1.8,.18,0xe6f6ff);this.add('ring',point,3,.3,color);}
      if(event.type==='ultimate'){
        if(event.variant==='lance'&&event.end){this.line(point,event.end,4,.65,color);this.line(point,event.end,1.5,.4,0xfff5eb);for(const t of event.targets??[])this.add('ring',t,4,.7,color);continue;}
        if(event.variant==='jam'){for(let i=0;i<4;i++)this.add('ring',{...point,y:point.y+i*.2},14+i*9,1.1+i*.16,color);for(const t of event.targets??[])this.add('lock',t,3,1.4,color,t.id);continue;}
        if(event.variant==='network'){this.add('ring',point,30,1,color);for(const t of (event.targets??[]).slice(0,12)){this.line(point,t,.16,.7,color);this.add('lock',t,3,1.5,color,t.id);}continue;}
        if(event.variant==='barrage'){this.add('ring',point,11,.8,color);this.add('flash',point,2.5,.25,0xe3f5ff);continue;}
        this.add('ring',point,40,1.35,0x76ffd1);this.add('ring',{...point,y:point.y+.15},32,1.05,0xffe4a6);this.add('flash',point,3,.32,0xd9fff0);
        const targets=event.targets??[];
        for(const target of targets.slice(0,24)){
          this.add('beam',target,1.2,.85,0xa7ffdf);this.add('ring',{...target,y:target.y+.2},5,.9,0xf5df9e);
        }
        for(let i=0;i<8;i++){const angle=i*Math.PI/4;this.add('beam',{x:point.x+Math.cos(angle)*11,y:AIR_HEIGHT,z:point.z+Math.sin(angle)*11},.55,.65,0x64e6c0);}
      }
    }
  }
  update(sim:Simulation,dt:number,quality:'high'|'medium'){
    for(let i=this.effects.length-1;i>=0;i--){const fx=this.effects[i];fx.life-=dt;
      if(fx.life<=0){fx.mesh.visible=false;const pool=this.pool.get(fx.kind)||[];pool.push(fx);this.pool.set(fx.kind,pool);this.effects.splice(i,1);continue;}
      const t=1-fx.life/fx.max;fx.mesh.material.opacity=(1-t)*(fx.kind==='beam'?.55:fx.kind==='lock'?.85:.8);
      if(fx.kind==='ring'){const size=.3+fx.size*(1-(1-t)**2);fx.mesh.scale.set(size,size,1);fx.mesh.rotation.z=t*.8;}
      if(fx.kind==='lock'){const target=sim.entities.find(e=>e.id===fx.target);if(target)fx.mesh.position.set(target.x,target.y+.3,target.z);const size=fx.size*(1.1-.25*Math.min(1,t*3));fx.mesh.scale.set(size,size,1);fx.mesh.rotation.z=t*3;}
      if(fx.kind==='flash'){fx.mesh.scale.setScalar(fx.size*(1+t*2));fx.mesh.rotation.y+=dt*7;}
      if(fx.kind==='beam'){const height=32;fx.mesh.scale.set(fx.size*(1-t*.5),height,fx.size*(1-t*.5));fx.mesh.position.y=(fx.mesh.userData.baseY as number)+height/2;}
      if(fx.kind==='line')fx.mesh.scale.set(fx.size*(1-t*.7),fx.mesh.userData.length,fx.size*(1-t*.7));
    }
    this.emission+=dt;const emit=this.emission>=1/40;if(emit)this.emission=0;
    const active=new Set<number>();for(const e of sim.entities)if(e.kind==='missile'){
      active.add(e.id);const previous=this.previous.get(e.id);if(previous&&emit&&this.trails.length<300){const dx=e.x-previous.x,dy=e.y-previous.y,dz=e.z-previous.z;if(Math.hypot(dx,dy,dz)>.01)this.trails.push({x:(e.x+previous.x)/2,y:(e.y+previous.y)/2,z:(e.z+previous.z)/2,dx,dy,dz,life:.45,gold:sim.character.id==='qingluan'&&e.id%2===0});}
      if(emit||!previous)this.previous.set(e.id,new T.Vector3(e.x,e.y,e.z));
    }
    for(const id of this.previous.keys())if(!active.has(id))this.previous.delete(id);
    this.trails=this.trails.filter(t=>(t.life-=dt)>0);const limit=quality==='high'?300:160;
    this.ribbons.count=Math.min(limit,this.trails.length);for(let i=0;i<this.ribbons.count;i++){const t=this.trails[i];this.dummy.position.set(t.x,t.y,t.z);this.direction.set(t.dx,t.dy,t.dz);const length=this.direction.length();this.dummy.quaternion.setFromUnitVectors(this.up,this.direction.normalize());this.dummy.scale.set(1,length+.4,1);this.dummy.updateMatrix();this.ribbons.setMatrixAt(i,this.dummy.matrix);this.color.set(t.gold?'#ffd991':sim.character.color).multiplyScalar(t.life/.45);this.ribbons.setColorAt(i,this.color);}this.ribbons.instanceMatrix.needsUpdate=true;if(this.ribbons.instanceColor)this.ribbons.instanceColor.needsUpdate=true;
  }
  reset(){for(const fx of this.effects){fx.mesh.visible=false;const pool=this.pool.get(fx.kind)||[];pool.push(fx);this.pool.set(fx.kind,pool);}this.effects=[];this.trails=[];this.previous.clear();this.ribbons.count=0;}
  get stats(){return {effects:this.effects.length,trails:this.ribbons.count};}
}
