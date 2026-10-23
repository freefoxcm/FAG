import {NodeIO} from '@gltf-transform/core';
import {dedup,prune,weld,textureCompress} from '@gltf-transform/functions';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import sharp from 'sharp';
import {readdir,stat,writeFile} from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS),report=[];
const only=process.argv.slice(2);
for(const file of (await readdir('public/assets/models')).filter(f=>f.endsWith('.glb')&&(!only.length||only.includes(f.replace(/(-high)?\.glb$/,''))))){
 const path='public/assets/models/'+file,before=(await stat(path)).size,document=await io.read(path);
 await document.transform(dedup(),weld(),prune({keepLeaves:true,keepAttributes:true}),textureCompress({encoder:sharp,targetFormat:'jpeg',slots:/baseColorTexture/,quality:92}));
 await io.write(path,document);const after=(await stat(path)).size;report.push({file,before,after});console.log(file,before,'→',after);
}
await writeFile('assets/source/optimization-report.json',JSON.stringify(report,null,2));
