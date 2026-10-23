import * as T from 'three';
import type {GameEvent} from '../game/simulation';
type Particle={x:number;y:number;z:number;vx:number;vy:number;vz:number;life:number;max:number;size:number;kind:0|1|2;color:T.Color;spin:number};
type Pending={delay:number;event:GameEvent};
/** One instanced batch each for hot sparks, smoke puffs and metallic fragments. */
export class ImpactFX{
 private particles:Particle[]=[];private pool:Particle[]=[];private pending:Pending[]=[];private smoke:T.InstancedMesh;private sparks:T.InstancedMesh;private debris:T.InstancedMesh;
 private opacity:T.InstancedBufferAttribute;private dummy=new T.Object3D();private color=new T.Color();
 constructor(private scene:T.Scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,.8)');gradient.addColorStop(.45,'rgba(255,255,255,.45)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const geometry=new T.PlaneGeometry(1,1);this.opacity=new T.InstancedBufferAttribute(new Float32Array(200),1);geometry.setAttribute('particleOpacity',this.opacity);
  const material=new T.ShaderMaterial({uniforms:{puff:{value:new T.CanvasTexture(canvas)}},vertexShader:'attribute float particleOpacity; varying vec2 vUv; varying float vOpacity; varying vec3 vColor; void main(){vUv=uv;vOpacity=particleOpacity;vColor=instanceColor;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D puff; varying vec2 vUv; varying float vOpacity; varying vec3 vColor; void main(){float a=texture2D(puff,vUv).a*vOpacity;if(a<0.002)discard;gl_FragColor=vec4(vColor,a);}',transparent:true,depthWrite:false});
  this.smoke=new T.InstancedMesh(geometry,material,200);this.sparks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,transparent:true,opacity:.85}),480);this.debris=new T.InstancedMesh(new T.BoxGeometry(1,.15,.7),new T.MeshStandardMaterial({color:0xffffff,metalness:.65,roughness:.5}),100);
  for(const batch of [this.smoke,this.sparks,this.debris]){batch.count=0;batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.setColorAt(0,new T.Color(1,1,1));scene.add(batch);}
 }
 private particle(kind:0|1|2,x:number,y:number,z:number,size:number,life:number,color:number,speed:number,normal?:{x:number;y:number;z:number}){
  if(this.particles.length>=700)return;
  const p=this.pool.pop()??{kind,x,y,z,size,life,max:life,color:new T.Color(),vx:0,vy:0,vz:0,spin:0};
  p.kind=kind;p.x=x;p.y=y;p.z=z;p.size=size;p.life=p.max=life;p.color.setHex(color);
  p.vx=(Math.random()-.5)*speed+(normal?.x??0)*speed*.45;p.vy=Math.random()*speed*.55+(normal?.y??0)*speed*.2;p.vz=(Math.random()-.5)*speed+(normal?.z??0)*speed*.45;p.spin=Math.random()*6;
  this.particles.push(p);
 }
 private burst(e:GameEvent){
  const x=e.x??0,y=e.y??15,z=e.z??0,heavy=e.type==='missile-impact'||e.weight==='heavy',kill=e.type==='explosion';
  if(e.type==='hit'&&!heavy)this.particle(0,x,y,z,.32,.085,0xffefd2,.5,e.normal);
  const sparks=kill?24:heavy?18:8;
  for(let i=0;i<sparks;i++)this.particle(0,x,y,z,kill?.12+Math.random()*.14:.055+Math.random()*.065,kill?.35+Math.random()*.4:.1+Math.random()*.13,i%3?0xffc477:0xfff3cd,kill?15:heavy?12:8,e.normal);
  for(let i=0;i<(kill?14:heavy?8:2);i++)this.particle(1,x,y,z,kill?2.2:heavy?1.6:.65,kill?1+Math.random()*.5:heavy?.7:.25,kill?0x4b4d48:0x8b8673,kill?4:1.5);
  if(kill||heavy){for(let i=0;i<(kill?8:3);i++)this.particle(2,x,y,z,.2+Math.random()*.35,.7+Math.random()*.4,i%2?0x8b9692:0xb7b5a4,kill?12:7,e.normal);for(let i=0;i<5;i++)this.particle(0,x,y,z,.55+Math.random()*.65,.1+Math.random()*.18,i%2?0xffa751:0xffe8a8,4);}
 }
 handle(events:GameEvent[]){for(const e of events)if(e.type==='hit'||e.type==='missile-impact'||e.type==='explosion'){
  this.burst(e);if(e.type==='explosion'&&e.large){for(let i=0;i<7;i++)this.pending.push({delay:i*.11,event:{...e,large:false,x:(e.x??0)+(i%2?1:-1)*(2+i),z:(e.z??0)+(i%3-1)*2.5,weight:'heavy'}});}
 }}
 update(dt:number,camera:T.Camera,quality:'high'|'medium'){
  for(let i=this.pending.length-1;i>=0;i--){this.pending[i].delay-=dt;if(this.pending[i].delay<=0){this.burst(this.pending[i].event);this.pending.splice(i,1);}}
  let ns=0,np=0,nd=0;const cap=quality==='high'?480:220;
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.pool.push(p);this.particles[i]=this.particles[this.particles.length-1];this.particles.pop();continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=(p.kind===2?13:p.kind===0?6:-.5)*dt;const t=1-p.life/p.max;
   this.dummy.position.set(p.x,p.y,p.z);
   if(p.kind===1&&np<(quality==='high'?200:75)){this.dummy.quaternion.copy(camera.quaternion);this.dummy.rotateZ(p.spin);const size=p.size*(.55+t*1.8);this.dummy.scale.set(size,size,size);this.dummy.updateMatrix();this.smoke.setMatrixAt(np,this.dummy.matrix);this.smoke.setColorAt(np,p.color);this.opacity.setX(np,Math.sin(t*Math.PI)*.38);np++;}
   else if(p.kind===0&&ns<cap){this.dummy.rotation.set(p.spin+t*8,p.spin+t*3,t*10);const size=p.size*(1-t);this.dummy.scale.set(size,size*.7,size*(1+Math.hypot(p.vx,p.vz)*.16));this.dummy.updateMatrix();this.sparks.setMatrixAt(ns,this.dummy.matrix);this.color.copy(p.color).multiplyScalar(.5+.5*(1-t));this.sparks.setColorAt(ns++,this.color);}
   else if(p.kind===2&&nd<(quality==='high'?100:35)){this.dummy.rotation.set(p.spin+t*6,t*10,p.spin+t*8);this.dummy.scale.setScalar(p.size*(1-Math.max(0,t-.7)*3));this.dummy.updateMatrix();this.debris.setMatrixAt(nd,this.dummy.matrix);this.debris.setColorAt(nd++,p.color);}
  }
  this.smoke.count=np;this.sparks.count=ns;this.debris.count=nd;this.opacity.needsUpdate=true;for(const batch of [this.smoke,this.sparks,this.debris]){batch.instanceMatrix.needsUpdate=true;if(batch.instanceColor)batch.instanceColor.needsUpdate=true;}
 }
 reset(){this.pool.push(...this.particles);this.particles.length=0;this.pending.length=0;this.smoke.count=this.sparks.count=this.debris.count=0;}
 get count(){return this.particles.length;}
}
