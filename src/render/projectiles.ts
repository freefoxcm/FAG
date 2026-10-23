import * as T from 'three';
import type {Simulation} from '../game/simulation';
import {createProjectile} from './models';
type Key='bullet'|'hostile'|'heavy'|'missile'|'rail';
interface Part{batch:T.InstancedMesh;local:T.Matrix4;glow:boolean}
export class ProjectileBatch{
 private groups=new Map<Key,Part[]>();private dummy=new T.Object3D();private matrix=new T.Matrix4();private color=new T.Color();
 constructor(scene:T.Scene){for(const key of ['bullet','hostile','heavy','missile','rail']as Key[]){const template=createProjectile(key==='heavy'?'hostile':key==='rail'?'bullet':key,key==='heavy'||key==='rail');template.updateMatrixWorld(true);const parts:Part[]=[];template.traverse(o=>{if(o instanceof T.Mesh){const batch=new T.InstancedMesh(o.geometry,o.material,512);batch.count=0;batch.frustumCulled=false;batch.instanceMatrix.setUsage(T.DynamicDrawUsage);scene.add(batch);parts.push({batch,local:o.matrixWorld.clone(),glow:o.name==='energy-sheath'||o.name==='tracer'});}});this.groups.set(key,parts);}}
 render(sim:Simulation){this.color.set(sim.character.color);for(const [key,parts]of this.groups){const entities=sim.entities.filter(e=>key==='heavy'?e.kind==='hostile'&&e.heavy:key==='rail'?e.kind==='bullet'&&e.heavy:e.kind===key&&(!['hostile','bullet'].includes(key)||!e.heavy));const count=Math.min(512,entities.length);for(let i=0;i<count;i++){const e=entities[i];this.dummy.position.set(e.x,e.y,e.z);this.dummy.scale.setScalar(e.weaponId==='barrage'?2.5:1);this.dummy.rotation.set(Math.atan2(e.vy,Math.hypot(e.vx,e.vz)),Math.atan2(-e.vx,-e.vz),0,'YXZ');this.dummy.updateMatrix();for(const part of parts){this.matrix.multiplyMatrices(this.dummy.matrix,part.local);part.batch.setMatrixAt(i,this.matrix);if(part.glow&&!['hostile','heavy'].includes(key))part.batch.setColorAt(i,this.color);}}for(const part of parts){part.batch.count=count;part.batch.instanceMatrix.needsUpdate=true;if(part.batch.instanceColor)part.batch.instanceColor.needsUpdate=true;}}}
 reset(){for(const parts of this.groups.values())for(const p of parts)p.batch.count=0;}
}
