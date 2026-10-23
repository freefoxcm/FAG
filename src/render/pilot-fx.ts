import * as T from 'three';
import type {Simulation} from '../game/simulation';
import {AIR_HEIGHT} from '../game/combat';
/** Persistent, simulation-driven support units and target state. */
export class PilotFX{
 private decoy:T.Group;private wings:T.Group[];private marks:T.InstancedMesh;private dummy=new T.Object3D();private cyan=new T.Color(0x6ee6ff);private blue=new T.Color(0x7ca9ff);
 constructor(scene:T.Scene){
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,-1.4,-.35,0,.7,.35,0,.7,-.2,0,-.5,-1.3,0,.65,-.1,0,.45,.2,0,-.5,.1,0,.45,1.3,0,.65],3));geometry.computeVertexNormals();
  const drone=(holo=false)=>{const g=new T.Group(),wing=new T.Mesh(geometry,new T.MeshStandardMaterial({color:holo?0x7bffff:0x4b6282,emissive:0x4cadf5,emissiveIntensity:holo?.75:.2,metalness:.6,roughness:.3,side:T.DoubleSide,transparent:holo,opacity:holo?.4:1,wireframe:holo}));g.add(wing);const body=new T.Mesh(new T.ConeGeometry(.25,1.7,6),new T.MeshBasicMaterial({color:holo?0x68eaf8:0xc9e6ed,transparent:holo,opacity:holo?.45:1}));body.rotation.x=-Math.PI/2;g.add(body);const flame=new T.Mesh(new T.ConeGeometry(.13,.9,8),new T.MeshBasicMaterial({color:0x74c8ff,transparent:true,opacity:.7}));flame.rotation.x=Math.PI/2;flame.position.z=1;g.add(flame);g.visible=false;scene.add(g);return g;};
  this.decoy=drone(true);this.decoy.scale.setScalar(2);this.wings=[drone(),drone()];
  this.marks=new T.InstancedMesh(new T.RingGeometry(.95,1.02,32),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6,depthWrite:false,side:T.DoubleSide}),64);this.marks.count=0;this.marks.frustumCulled=false;scene.add(this.marks);
 }
 render(sim:Simulation){
  const playing=sim.mode==='playing'||sim.mode==='paused',decoy=sim.entities.find(e=>e.kind==='decoy'&&e.hp>0);this.decoy.visible=playing&&!!decoy;if(decoy){this.decoy.position.set(decoy.x,AIR_HEIGHT,decoy.z);this.decoy.rotation.y=Math.sin(decoy.age*2)*.08;}
  this.wings.forEach((w,i)=>{w.visible=playing&&sim.wingmenTime>0;w.position.set(sim.player.x+(i?3:-3),AIR_HEIGHT,sim.player.z+1.4);w.rotation.z=-sim.player.bank;});
  let count=0;for(const e of sim.entities){if(count>=64)break;if(e.marked<=0&&e.disrupted<=0&&e.kind!=='decoy')continue;this.dummy.position.set(e.x,e.y+.2,e.z);this.dummy.rotation.set(-Math.PI/2,0,sim.time*.8);this.dummy.scale.setScalar(e.kind==='decoy'?2.7:Math.max(1.4,e.radius*1.25));this.dummy.updateMatrix();this.marks.setMatrixAt(count,this.dummy.matrix);this.marks.setColorAt(count++,e.marked>0?this.blue:this.cyan);}this.marks.count=playing?count:0;this.marks.instanceMatrix.needsUpdate=true;if(this.marks.instanceColor)this.marks.instanceColor.needsUpdate=true;
 }
 reset(){this.decoy.visible=false;this.wings.forEach(w=>w.visible=false);this.marks.count=0;}
}
