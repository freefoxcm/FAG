import * as T from 'three';
import type {StageDefinition} from '../game/content';
import type {ModelLibrary,ModelId} from './models';

/** Repeated GLB modules share geometry/materials; only instance buffers belong to a tile. */
export class StageEnvironment{
 tiles:T.Group[]=[];private owned=new Set<T.BufferGeometry|T.Material|T.Texture>();private detail:T.Object3D[]=[];
 constructor(private library:ModelLibrary,public stage:StageDefinition){this.tiles=[1729,3617].map(seed=>{const tile=new T.Group();tile.add(this.tile(seed));if(stage.environment==='city'){const harbor=this.harbor(seed);harbor.visible=false;tile.add(harbor);}return tile;});this.reset();}
 static async load(library:ModelLibrary,stage:StageDefinition){const ids:ModelId[]=['building-residential','building-office','building-warehouse',stage.environment==='canyon'?'tree-pine':stage.environment==='ocean'?'tree-coastal':'tree-broadleaf'];await Promise.all(ids.map(id=>library.get(id)));return new StageEnvironment(library,stage);}
 private tile(seed:number){
  const root=new T.Group(),batches=new Map<ModelId,T.Matrix4[]>();let rng=seed;const random=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;};const dummy=new T.Object3D();
  const unit=new T.BoxGeometry(1,1,1),rock=new T.IcosahedronGeometry(1,2);const vertices=rock.attributes.position;for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i),r=1+Math.sin(x*19+z*11)*Math.sin(y*17+x*7)*.14;vertices.setXYZ(i,x*r,y*r,z*r);}rock.computeVertexNormals();this.owned.add(unit);this.owned.add(rock);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(128,128);for(let i=0;i<pixels.data.length;i+=4){const value=210+random()*40;pixels.data[i]=value;pixels.data[i+1]=value;pixels.data[i+2]=value;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const grain=new T.CanvasTexture(canvas);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(4,8);grain.colorSpace=T.SRGBColorSpace;this.owned.add(grain);
  const mats=new Map<number,T.MeshStandardMaterial>(),boxes=new Map<number,T.Matrix4[]>(),rocks:T.Matrix4[]=[];
  const material=(color:number)=>{if(!mats.has(color)){const m=new T.MeshStandardMaterial({color,map:color===0x386775?null:grain,roughness:color===0x386775?.28:.85,metalness:color===0x386775?.25:.08});mats.set(color,m);this.owned.add(m);}return mats.get(color)!;};
  const matrix=(x:number,y:number,z:number,w:number,h:number,d:number,yaw=0)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.rotation.set(0,yaw,0);dummy.updateMatrix();return dummy.matrix.clone();};
  const box=(color:number,x:number,y:number,z:number,w:number,h:number,d:number)=>{const a=boxes.get(color)??[];a.push(matrix(x,y,z,w,h,d));boxes.set(color,a);};
  const module=(id:ModelId,x:number,z:number,scale=1,yaw=0)=>{const a=batches.get(id)??[];a.push(matrix(x,0,z,scale,scale,scale,yaw));batches.set(id,a);};
  const tree=this.stage.environment==='canyon'?'tree-pine':this.stage.environment==='ocean'?'tree-coastal':'tree-broadleaf';
  if(this.stage.environment==='city'){
   box(0x919385,0,-.22,0,180,.4,128);box(0x4c5655,0,.01,0,17,.1,128);
   for(let z=-48;z<64;z+=32){box(0x4c5655,0,.04,z,160,.08,9);for(const side of [-1,1])for(let col=0;col<3;col++){const x=side*(17+col*15);const id:ModelId=col===0?'building-residential':col===1?'building-office':'building-warehouse';module(id,x,z+15,.8+random()*.2,random()>.5?Math.PI:0);box(0xb7b5a3,x,.12,z+15,13,.2,23);}}
   for(let z=-61;z<64;z+=5){for(const x of [-2.6,2.6])box(0xddd5ae,x,.09,z,.13,.025,2.5);if(Math.abs((z+48)%32)>5)for(const x of [-10.5,10.5])module(tree,x,z,.8+random()*.25);}
   for(let z=-48;z<64;z+=32)for(let x=-7;x<=7;x+=1.5){box(0xded9c0,x,.1,z-6,.65,.02,2);box(0xded9c0,x,.1,z+6,.65,.02,2);}
   for(let z=-55;z<64;z+=16)for(const side of [-1,1]){box(0x6c7778,side*8.7,2.2,z,.12,4.4,.12);box(0xd9d4b6,side*8.2,4.4,z,1.2,.15,.3);}
   for(let i=0;i<22;i++){const x=(i%2?1:-1)*5.3,z=-60+random()*120;box(i%3===0?0x9b6150:0xa2b6b0,x,.5,z,1.2,.8,2.5);box(0x314c56,x,1,z,.95,.35,1.25);for(const dx of [-.63,.63])for(const dz of [-.75,.75])box(0x283432,x+dx,.25,z+dz,.16,.4,.45);}
  }else if(this.stage.environment==='canyon'){
   box(0x777969,0,-.4,0,180,.4,128);box(0x565e58,0,-.08,0,14,.1,128);
   for(let z=-59;z<64;z+=13)for(const side of [-1,1]){const x=side*(35+random()*25);rocks.push(matrix(x,4,z,8+random()*7,10+random()*5,10+random()*7,random()*6));for(let i=0;i<3;i++)module(tree,side*(15+random()*12),z+i*3,.85+random()*.4);}
   for(const side of [-1,1]){module('building-warehouse',side*21,-24,.8);module('building-office',side*23,30,.65);box(0xb0ad94,side*21,0,-24,18,.2,27);}
   for(let z=-62;z<64;z+=6)box(0xd9caa1,0,.01,z,.16,.02,2.5);
  }else{
   box(0x386775,0,-.3,0,185,.35,128);
   // Broad, sparse specular wavelets avoid a costly reflected scene pass.
   for(let i=0;i<65;i++)box(0x638a90,-80+random()*160,-.08,-62+random()*124,1+random()*3,.02,.06);
   for(const side of [-1,1]){
    rocks.push(matrix(side*46,-1,-30,14,3.5,20));rocks.push(matrix(side*48,-1,35,14,3.5,18));for(let i=0;i<9;i++)module(tree,side*(37+random()*10),-38+random()*16,.8);
    const x=side*25,z=side*15;
    const shape=new T.Shape();shape.moveTo(-4,-19);shape.lineTo(0,-25);shape.lineTo(4,-19);shape.lineTo(4,18);shape.lineTo(-4,18);shape.closePath();const hull=new T.ExtrudeGeometry(shape,{depth:1.9,bevelEnabled:true,bevelSize:.3,bevelThickness:.2,bevelSegments:1,steps:1});hull.rotateX(Math.PI/2);this.owned.add(hull);const ship=new T.Mesh(hull,material(0x394a50));ship.position.set(x,1.9,z);ship.castShadow=true;ship.receiveShadow=true;root.add(ship);
    box(0x909b95,x,2,z,7.8,.3,34);box(0xb1b6aa,x,3.4,z+9,5,2.6,7);box(0x304c59,x,4.1,z+5.4,4.6,.6,.12);box(0x53636a,x,6,z+10,.4,4,.4);box(0x53636a,x,7.4,z+10,3,.14,.3);box(0x53636a,x,6.5,z+10,2.2,.1,.3);
    for(const side of [-1,1]){box(0x566968,x+side*3.6,2.4,z,.07,.6,30);for(let dz=-14;dz<16;dz+=3)box(0x566968,x+side*3.6,2.4,z+dz,.09,.8,.09);for(const dz of [-5,6])box(0xbaa777,x+side*2.9,2.5,z+dz,.65,.55,2.2);}
    for(const dz of [-13,-9,0,4,13])box(0xc2c4aa,x,2.18,z+dz,1.6,.025,.12);
    for(const dz of [-12,0,14]){box(0x6e7e7e,x,2.8,z+dz,2.8,1.5,3);box(0x253a43,x,3,z+dz-2,.24,.3,3);}
   }
  }
  for(const [color,items] of boxes){const mesh=new T.InstancedMesh(unit,material(color),items.length);items.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=color!==0x386775&&items.length<150;mesh.receiveShadow=true;root.add(mesh);}
  if(rocks.length){const mesh=new T.InstancedMesh(rock,material(this.stage.environment==='ocean'?0xaaa58b:0x898b7a),rocks.length);rocks.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);}
  for(const [id,placements] of batches){const source=this.library.source(id);source.updateMatrixWorld(true);source.traverse(o=>{if(!(o instanceof T.Mesh))return;const mesh=new T.InstancedMesh(o.geometry,o.material,placements.length);placements.forEach((p,i)=>mesh.setMatrixAt(i,p.clone().multiply(o.matrixWorld)));mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);if(id.startsWith('tree')){mesh.userData.fullCount=placements.length;this.detail.push(mesh);}});}
  return root;
 }
 private harbor(seed:number){
  const root=new T.Group(),dummy=new T.Object3D(),geometry=new T.BoxGeometry(1,1,1),batches=new Map<number,T.Matrix4[]>();this.owned.add(geometry);
  const box=(color:number,x:number,y:number,z:number,w:number,h:number,d:number)=>{dummy.position.set(x,y,z);dummy.scale.set(w,h,d);dummy.updateMatrix();const entries=batches.get(color)??[];entries.push(dummy.matrix.clone());batches.set(color,entries);};
  box(0x386775,0,-.3,0,180,.3,128);box(0x8c9182,0,-.05,0,48,.3,128);box(0x4c5655,0,.13,0,15,.06,128);
  for(let z=-60;z<64;z+=5)for(const x of [-2.7,2.7])box(0xdbd2b1,x,.2,z,.14,.03,2.5);
  const colors=[0x886856,0x667c79,0x5e7382];
  for(let z=-50;z<64;z+=17)for(const side of [-1,1]){const color=colors[Math.abs(z+seed)%3],x=side*17;box(color,x,1.3,z,5.5,2.5,11);box(color,x,3.8,z,5.5,2.5,11);for(let dz=-5;dz<=5;dz++)for(const dx of [-2.8,2.8])box(0xb5baa4,x+dx,2.5,z+dz,.06,4.8,.06);}
  for(const side of [-1,1])for(const z of [-38,26]){const x=side*28;for(const dx of [-2,2])for(const dz of [-3,3])box(0xa68d55,x+dx,6,z+dz,.5,12,.5);box(0xc2a76b,x,12,z,22,.6,1);box(0x48585b,x-side*6,10,z,.1,4,.1);box(0x6d8383,x,10.8,z,3,2,2.5);box(0xd3b875,x-side*6,8,z,.8,.8,.8);}
  box(0x35484d,42,.5,6,10,1.5,69);box(0xa0a89a,42,1.4,6,9,.25,66);for(let z=-20;z<22;z+=13)for(const x of [39.5,44.5])box(colors[Math.abs(z+seed)%3],x,2.7,z,4.2,2.5,10);box(0xc7c8b8,42,3.6,34,8,4.5,7);box(0x375765,42,4.3,30.4,7,.8,.12);
  for(const [color,entries] of batches){const mat=new T.MeshStandardMaterial({color,roughness:color===0x386775?.3:.75,metalness:.2});this.owned.add(mat);const mesh=new T.InstancedMesh(geometry,mat,entries.length);entries.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=color!==0x386775;mesh.receiveShadow=true;root.add(mesh);}return root;
 }
 reset(){this.tiles.forEach((tile,i)=>{tile.position.z=i===0?-64:64;tile.children[0].visible=true;if(tile.children[1])tile.children[1].visible=false;});}
 update(dt:number,speed:number,time=0){for(const tile of this.tiles){tile.position.z+=dt*speed;if(tile.position.z>=128){tile.position.z-=256;if(tile.children[1]){const port=time>95;tile.children[0].visible=!port;tile.children[1].visible=port;}}}}
 quality(high:boolean){for(const o of this.detail)if(o instanceof T.InstancedMesh)o.count=high?o.userData.fullCount:Math.ceil(o.userData.fullCount*.6);}
 dispose(){for(const tile of this.tiles){tile.removeFromParent();tile.traverse(o=>{if(o instanceof T.InstancedMesh)o.dispose();});}for(const item of this.owned)item.dispose();this.owned.clear();this.detail=[];this.tiles=[];}
}
