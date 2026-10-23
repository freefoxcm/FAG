import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest=JSON.parse(await readFile('src/game/model-manifest.json','utf8')),io=new NodeIO().registerExtensions(ALL_EXTENSIONS),report=[];
for(const id of ['drone','interceptor','heavy','support','boss','prism','canopy','power','repair','building-residential','building-office','building-warehouse','tree-broadleaf','tree-pine','tree-coastal','turret','radar','missile-site']){
 for(const high of [false,true]){const def=manifest[id],doc=await io.read('public'+(high?def.highUrl:def.url)),root=doc.getRoot(),nodes=root.listNodes();let triangles=0;for(const mesh of root.listMeshes())for(const primitive of mesh.listPrimitives()){assert(primitive.getAttribute('TEXCOORD_0'),`${id} missing UV`);assert(primitive.getAttribute('NORMAL'),`${id} missing normals`);triangles+=(primitive.getIndices()?.getCount()??primitive.getAttribute('POSITION').getCount())/3;}
  for(const [type,points] of [['muzzle.primary',def.muzzles],['exhaust',def.exhausts]])for(const [i,point] of points.entries()){const anchor=nodes.find(n=>n.getName()===`${type}.${i+1}`);assert(anchor,`${id}: missing ${type}.${i+1}`);anchor.getWorldTranslation().forEach((n,j)=>assert(Math.abs(n-point[j])<.001,`${id}: anchor transform mismatch`));}
  if(['boss','prism','canopy'].includes(id))for(let i=0;i<4;i++){const part=nodes.find(n=>n.getName()===`part_${i}`);assert(part&&part.listChildren().length,`${id}: missing independent part_${i}`);}
  report.push({id,lod:high?'high':'battle',triangles,meshes:root.listMeshes().length,materials:root.listMaterials().length});
 }
}
await mkdir('artifacts/campaign',{recursive:true});await writeFile('artifacts/campaign/assets.json',JSON.stringify(report,null,2));console.table(report);
