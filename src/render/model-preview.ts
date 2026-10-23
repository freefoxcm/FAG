import {siteUrl} from '../game/site-url';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ModelLibrary,skyEnvironment,type ModelId} from './models';
import {modelDefinitions} from '../game/enemies';
export async function startModelPreview(){
 const query=new URLSearchParams(location.search),id=(query.get('model')||'qingluan') as ModelId;
 document.getElementById('app')!.innerHTML='<div id="model-preview" style="position:fixed;inset:0;background:#17252a"><div style="position:absolute;z-index:2;left:24px;top:24px;background:#102624e0;border:1px solid #8ba99577;padding:16px;color:#dfebdf;font:12px Consolas"><b>MODEL INSPECTION / '+id.toUpperCase()+'</b><p>拖动旋转 · 滚轮缩放 · 高精度 GLB</p><div id="preview-buttons"></div><p id="preview-stats"></p><a href="'+siteUrl()+'" style="color:#cfc08f">返回战场 ↗</a></div></div>';
 const parent=document.getElementById('model-preview')!,scene=new T.Scene(),renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x202e34);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;parent.appendChild(renderer.domElement);scene.environment=skyEnvironment(renderer);scene.environmentIntensity=1;
 const camera=new T.PerspectiveCamera(38,innerWidth/innerHeight,.1,150);camera.position.set(9,7,-13);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.2,0);controls.enableDamping=true;controls.update();
 scene.add(new T.HemisphereLight(0xcddfea,0x454943,.8));const key=new T.DirectionalLight(0xffedcd,3);key.position.set(-5,10,-7);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-15,right:15,top:15,bottom:-15});scene.add(key);const rim=new T.DirectionalLight(0xb1d3ed,1.5);rim.position.set(5,3,5);scene.add(rim);
 const floor=new T.Mesh(new T.PlaneGeometry(150,150),new T.MeshStandardMaterial({color:0x263437,roughness:.7,metalness:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-.8;floor.receiveShadow=true;scene.add(floor);
 const library=new ModelLibrary(),source=await library.get(id,true);const model=library.cloneScene(source);scene.add(model);
 let tris=0;model.traverse(o=>{if(o instanceof T.Mesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});document.getElementById('preview-stats')!.textContent=Math.round(tris).toLocaleString()+' triangles / UV + PBR';
 const views:Record<string,number[]>={近景:[9,7,-13],俯视:[0,18,.001],侧视:[15,2,0],前视:[0,2,-17]};const buttons=document.getElementById('preview-buttons')!;
 for(const [name,pos]of Object.entries(views)){const button=document.createElement('button');button.textContent=name;button.style.cssText='padding:7px 13px;margin-right:5px;border:1px solid #9bb8a355;background:#365448;color:#dae4d4';button.onclick=()=>{const scale=['boss','prism','canopy'].includes(id)?2:1;camera.position.set(pos[0]*scale,pos[1]*scale,pos[2]*scale);controls.target.set(0,.2,0);controls.update();};buttons.append(button);}
 const lighting=document.createElement('button');lighting.textContent='切换战场光照';lighting.style.cssText='padding:7px 10px;background:#4b5a48;color:white;border:1px solid #9bb8a355';let field=false;lighting.onclick=()=>{field=!field;key.intensity=field?2.4:3;rim.intensity=field?0:1.5;renderer.setClearColor(field?0x899b9e:0x202e34);floor.material.color.setHex(field?0x6a7168:0x263437);};buttons.append(lighting);
 window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
 if(['boss','prism','canopy'].includes(id)){camera.position.multiplyScalar(2);controls.update();}
 Object.assign(window,{__MODEL_PREVIEW__:{model,camera,renderer,controls,definition:modelDefinitions[id],triangles:tris}});
 renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
}
