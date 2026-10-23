import {siteUrl} from '../game/site-url';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {modelDefinitions} from '../game/enemies';
export type ModelId=keyof typeof modelDefinitions;
export class ModelLibrary{
 private loader=new GLTFLoader();private loaded=new Map<string,T.Group>();
 async loadAll(player:ModelId='qingluan'){await Promise.all(([player,'drone','interceptor','heavy','support','boss'] as ModelId[]).map(id=>this.get(id)));}
 async get(id:ModelId,high=false){const key=id+(high?'-high':'');if(!this.loaded.has(key)){const gltf=await this.loader.loadAsync(siteUrl(high?modelDefinitions[id].highUrl:modelDefinitions[id].url));gltf.scene.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});this.loaded.set(key,gltf.scene);}return this.loaded.get(key)!;}
 clone(id:ModelId){const source=this.loaded.get(id);if(!source)throw Error('Missing model: '+id);return this.cloneScene(source);}
 cloneScene(source:T.Group){const result=source.clone(true);result.traverse(o=>{if(o instanceof T.Mesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});return result;}
}
export function skyEnvironment(renderer:T.WebGLRenderer){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d')!;
 const sky=ctx.createLinearGradient(0,0,0,256);sky.addColorStop(0,'#85a9c1');sky.addColorStop(.4,'#d8e4e4');sky.addColorStop(.53,'#f1e7cd');sky.addColorStop(.57,'#777f72');sky.addColorStop(1,'#363f3b');ctx.fillStyle=sky;ctx.fillRect(0,0,512,256);
 const sun=ctx.createRadialGradient(155,75,0,155,75,45);sun.addColorStop(0,'rgba(255,255,240,1)');sun.addColorStop(.15,'rgba(255,250,222,.9)');sun.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=sun;ctx.fillRect(100,20,110,110);
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(texture).texture;texture.dispose();pmrem.dispose();return environment;
}
export function createProjectile(kind:'bullet'|'missile'|'hostile',heavy=false){
 const group=new T.Group(),metal=new T.MeshStandardMaterial({color:kind==='hostile'?0x9d5743:0xb8bfad,metalness:.85,roughness:.28});
 const dark=new T.MeshStandardMaterial({color:0x2b383c,metalness:.8,roughness:.3});const color=kind==='hostile'?0xff7951:0x8fffd4;
 const glow=new T.MeshBasicMaterial({color:kind==='hostile'?color:0xffffff,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
 const radius=kind==='missile'?.14:heavy?.19:.08,length=kind==='missile'?1.25:heavy?.85:.55;
 function add(geometry:T.BufferGeometry,material:T.Material,z:number){const m=new T.Mesh(geometry,material);m.rotation.x=Math.PI/2;m.position.z=z;group.add(m);return m;}
 add(new T.CylinderGeometry(radius,radius,length,10),metal,0);const tip=add(new T.ConeGeometry(radius,length*.5,10),metal,-length*.7);tip.rotation.x=-Math.PI/2;
 add(new T.CylinderGeometry(radius*1.04,radius*1.04,.09,10),dark,length*.2);add(new T.CylinderGeometry(radius*.6,radius*.6,.12,10),new T.MeshBasicMaterial({color,toneMapped:false}),length*.55);
 const shell=add(new T.CylinderGeometry(radius*1.6,radius*1.2,length*1.15,10),glow,0);shell.name='energy-sheath';
 const tail=add(new T.ConeGeometry(radius*.9,length*2,10),glow,length*1.3);tail.name='tracer';
 if(kind==='missile')for(let i=0;i<4;i++){const fin=new T.Mesh(new T.BoxGeometry(.035,.35,.34),metal);fin.position.z=.4;fin.rotation.z=i*Math.PI/2;fin.position.x=Math.sin(i*Math.PI/2)*.17;fin.position.y=Math.cos(i*Math.PI/2)*.17;group.add(fin);}
 return group;
}
