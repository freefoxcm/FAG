import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/hangar',base=process.env.GAME_URL||'http://127.0.0.1:5180';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const definitions=JSON.parse(await readFile('src/game/model-manifest.json','utf8'));
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],models=[],expectedLoadErrors=[];let expectingLoadError=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')(expectingLoadError?expectedLoadErrors:errors).push(m.text());});
 await page.goto(base);await page.locator('.hangar-entry').click();await page.waitForFunction(()=>window.__HANGAR__?.model&&window.__HANGAR__.id==='qingluan');
 for(const id of ['qingluan','akari','haneul','astra','snega']){
  await page.locator(`[data-airframe="${id}"]`).click();await page.waitForFunction(id=>window.__HANGAR__?.id===id&&document.getElementById('hangar-loading').hidden,id);await page.waitForTimeout(120);
  const snapshot=await page.evaluate(()=>{const h=window.__HANGAR__,bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},anchors=[];let uv=0,pbr=0,coating=0;h.model.traverse(o=>{const name=o.userData.name||o.name;if(name.startsWith('muzzle.')||name.startsWith('exhaust.')){const v=o.position.clone();o.getWorldPosition(v);anchors.push({name,point:v.toArray()});}if(o.isMesh){if(o.geometry.attributes.uv)uv++;if(o.material.map&&o.material.normalMap&&o.material.roughnessMap)pbr++;if(o.material.clearcoat>0)coating++;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const v=o.position.clone().set(p.getX(i),p.getY(i),p.getZ(i));o.localToWorld(v);v.toArray().forEach((x,j)=>{bounds.min[j]=Math.min(bounds.min[j],x);bounds.max[j]=Math.max(bounds.max[j],x);});}}});return {id:h.id,triangles:h.triangles,uv,pbr,coating,anchors,bounds};});
  assert(snapshot.uv>=4);assert(snapshot.pbr>=4);assert(snapshot.coating>=1);assert(snapshot.triangles>40000);assert.equal(snapshot.anchors.filter(a=>a.name.startsWith('exhaust.')).length,['akari','astra'].includes(id)?1:2);
  for(const [prefix,expected]of [['exhaust.',definitions[id].exhausts],['muzzle.',definitions[id].muzzles]]){const actual=snapshot.anchors.filter(a=>a.name.startsWith(prefix)).sort((a,b)=>a.name.localeCompare(b.name));assert.equal(actual.length,expected.length);actual.forEach((a,i)=>a.point.forEach((v,j)=>assert(Math.abs(v-expected[i][j])<.001)));}models.push(snapshot);
  await page.screenshot({path:`${out}/${id}-close-1920.png`});
  if(id!=='qingluan'){
   for(const view of ['top','side','rear']){await page.locator(`[data-view="${view}"]`).click();await page.waitForTimeout(100);await page.screenshot({path:`${out}/${id}-${view}.png`});}
   await page.locator('[data-view="close"]').click();await page.locator('#hangar-light').click();await page.screenshot({path:`${out}/${id}-field-light.png`});await page.locator('#hangar-light').click();
  }
  await page.locator('#hangar-lod').click();await page.waitForFunction(()=>window.__HANGAR__?.high===false&&document.getElementById('hangar-loading').hidden);const low=await page.evaluate(()=>window.__HANGAR__.triangles);assert(low<snapshot.triangles*.55);assert(low<23000);models.at(-1).battleTriangles=low;
  await page.locator('#hangar-lod').click();await page.waitForFunction(()=>window.__HANGAR__?.high===true&&document.getElementById('hangar-loading').hidden);
 }
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:out+'/snega-close-1366.png'});
 await page.locator('#hangar-reference').click();await page.locator('#hangar-reference-image').evaluate(img=>img.decode());assert(await page.locator('#hangar-reference-dialog').isVisible());await page.screenshot({path:out+'/concept-reference.png'});await page.keyboard.press('Escape');await page.keyboard.press('Digit2');await page.waitForFunction(()=>window.__HANGAR__.id==='akari'&&document.getElementById('hangar-loading').hidden);
 // Rapid requests must never display a stale model or leak detached GPU resources.
 const memory=[];
 for(let i=0;i<3;i++){await page.locator('[data-airframe="astra"]').click();await page.locator('[data-airframe="haneul"]').click();await page.locator('[data-airframe="snega"]').click();await page.waitForFunction(()=>window.__HANGAR__.id==='snega'&&document.getElementById('hangar-loading').hidden);assert.equal(await page.evaluate(()=>window.__HANGAR__.triangles),models.at(-1).triangles);await page.waitForTimeout(500);memory.push(await page.evaluate(()=>({...window.__HANGAR__.renderer.info.memory})));}
 assert(memory[2].geometries<=memory[0].geometries+1);assert(memory[2].textures<=memory[0].textures+1);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile-390.png'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(base+'/?hangar&model=unknown');await page.waitForFunction(()=>window.__HANGAR__?.model&&document.getElementById('hangar-loading').hidden);assert.equal(await page.locator('#hangar-name').textContent(),'青鸾');
 await page.route('**/assets/models/haneul-high.glb',route=>route.fulfill({status:503,body:'Intentional QA failure'}));expectingLoadError=true;await page.locator('[data-airframe="haneul"]').click();await page.waitForSelector('#hangar-retry:not([hidden])');await page.unroute('**/assets/models/haneul-high.glb');await page.locator('#hangar-retry').click();await page.waitForFunction(()=>window.__HANGAR__.id==='haneul'&&document.getElementById('hangar-loading').hidden);expectingLoadError=false;assert.equal(await page.evaluate(()=>window.__HANGAR__.triangles),models.find(m=>m.id==='haneul').triangles);
 assert.deepEqual(errors,[]);const report={models,memory,errors,loadFailureRecovered:expectedLoadErrors.length>0,notes:'Screenshots cover studio/field lighting, close/top/side/rear, 1920x1080 and 1366x768, LOD switching and concept reference.'};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
