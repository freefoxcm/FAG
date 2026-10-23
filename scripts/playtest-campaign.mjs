import {enterCombat,openOperations} from './flow-helpers.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='artifacts/campaign',url=process.env.GAME_URL||'http://127.0.0.1:5180';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={url,errors:[],performance:[],replays:[],stages:[],portraits:[]};
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 await page.goto(url);await page.waitForFunction(()=>!!window.__GAME__,{timeout:60000});
 await openOperations(page);await page.locator('[data-map-stage=canyon]').click();assert(await page.locator('#map-deploy').isDisabled());await page.locator('[data-map-stage=lingang]').click();await page.screenshot({path:out+'/title-1366.png'});
 await enterCombat(page);await page.waitForTimeout(400);
 await page.keyboard.press('Escape');const paused=await page.evaluate(()=>window.__GAME__.sim.time);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__GAME__.sim.time),paused);await page.locator('#pause-settings').click();await page.locator('#setting-sound').click();await page.locator('#setting-motion').click();await page.locator('#setting-quality').click();await page.locator('#close-settings').click();await page.locator('#resume').click();
 for(const stage of ['lingang','canyon','ocean']){
  assert.equal(await page.evaluate(()=>window.__GAME__.sim.stage.id),stage);
  await page.evaluate(()=>{const s=window.__GAME__.sim;s.entities=[];s.player.x=0;s.invincible=999;s.spawn('power',-5,4,{radius:1.8});s.spawn('repair',5,4,{radius:1.8});['drone','interceptor','heavy','support'].forEach((kind,i)=>s.spawn(kind,-15+i*10,-16,{timer:99}));});
  for(const [width,height] of [[1366,768],[1920,1080]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);await page.screenshot({path:`${out}/${stage}-${width}.png`});}
  if(stage==='lingang'){await page.evaluate(()=>{const s=window.__GAME__.sim;s.health=3;s.spawn('repair',s.player.x,s.player.z,{radius:1.8});});await page.waitForFunction(()=>window.__GAME__.sim.health===4);assert.match(await page.locator('#pickup-toast').textContent(),/耐久/);await page.screenshot({path:out+'/pickup-feedback.png'});}
  if(stage==='lingang'){await page.evaluate(()=>{const g=window.__GAME__;g.sim.time=125;g.world.render(g.sim,26);g.world.render(g.sim,26);});await page.screenshot({path:out+'/lingang-harbor.png'});}
  await page.evaluate(()=>{const s=window.__GAME__.sim;s.time=s.stage.bossAt;});await page.waitForFunction(()=>!!window.__GAME__.sim.boss);await page.evaluate(()=>{const s=window.__GAME__.sim;s.boss.z=-14;s.boss.timer=99;});await page.waitForTimeout(150);
  const part=await page.evaluate(()=>{const g=window.__GAME__,boss=g.sim.boss,p=boss.parts[0],node=g.world.scene.getObjectByName(p.id);return {model:boss.modelId,visible:node?.visible,parts:boss.parts.length};});assert.equal(part.visible,true);assert.equal(part.parts,4);
  await page.screenshot({path:`${out}/${stage}-boss.png`});
  await page.evaluate(()=>{const s=window.__GAME__.sim,b=s.boss,p=b.parts[0];s.damageEnemy(b,999,{partId:p.id,position:{x:b.x-5,y:b.y,z:b.z+3},normal:{x:0,y:1,z:0},weaponId:'missiles',weight:'heavy'});});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__GAME__.world.scene.getObjectByName('part_0').visible),false);
  await page.evaluate(()=>{const s=window.__GAME__.sim;for(const p of s.boss.parts)if(p.role==='shield')p.hp=0;s.damageEnemy(s.boss,99999);});await page.waitForSelector('#results:not([hidden])');report.stages.push({stage,...part,result:await page.locator('#result-title').textContent()});await page.screenshot({path:`${out}/${stage}-result.png`});
  if(stage!=='ocean'){await page.locator('#next-stage').click();await page.locator('#story-skip').click();await enterCombat(page);}
 }
 await page.locator('#home').click();assert(await page.locator('[data-map-stage=lingang]').isEnabled());assert(await page.locator('[data-map-stage=canyon]').isEnabled());assert(await page.locator('[data-map-stage=ocean]').isEnabled());
 for(const pilot of ['qingluan','akari','haneul','astra','snega']){
  await page.locator(`#operations button[data-pilot=${pilot}]`).click();await page.locator('#loading').waitFor({state:'hidden'});await enterCombat(page);await page.evaluate(()=>{const s=window.__GAME__.sim;s.invincible=999;s.charge=100;s.spawn('heavy',0,-12,{hp:200,timer:99});s.useUltimate();});await page.waitForSelector('#cutin:not([hidden])');await page.evaluate(()=>document.querySelector('#cutin').style.animation='none');await page.waitForTimeout(120);
  const mask=await page.evaluate(()=>({vertical:getComputedStyle(document.querySelector('.cutin-art')).maskImage,horizontal:getComputedStyle(document.querySelector('.cutin-art'),'::after').maskImage,portrait:document.querySelector('#cutin').style.getPropertyValue('--portrait')}));assert.match(mask.vertical,/gradient/);assert.match(mask.horizontal,/gradient/);assert(mask.portrait.includes('assets/'));report.portraits.push({pilot,...mask});await page.screenshot({path:`${out}/ultimate-${pilot}.png`});await page.keyboard.press('Escape');await page.locator('#quit').click();
 }
 await page.locator('[data-map-stage=lingang]').click();await page.locator('#loading').waitFor({state:'hidden'});await enterCombat(page);
 for(let i=0;i<3;i++){await page.evaluate(()=>{const s=window.__GAME__.sim;s.invincible=0;s.damagePlayer(5);});await page.waitForSelector('#results:not([hidden])');assert.equal(await page.locator('#rank').textContent(),'RETRY');report.replays.push(await page.evaluate(()=>window.__GAME__.world.stats));await page.locator('#retry').click();await page.waitForFunction(()=>window.__GAME__.sim.mode==='playing');await page.waitForTimeout(150);}
 assert(report.replays[2].geometries<=report.replays[0].geometries+3);assert(report.replays[2].textures<=report.replays[0].textures+2);
 await page.reload();await page.waitForFunction(()=>!!window.__GAME__,{timeout:60000});report.persisted=await page.evaluate(()=>window.__GAME__.save);assert.equal(report.persisted.cleared.length,3);assert.equal(report.persisted.muted,true);assert.equal(report.persisted.reducedMotion,true);
 await page.setViewportSize({width:1920,height:1080});await openOperations(page);
 for(const stage of ['lingang','canyon','ocean']){
  await page.locator(`[data-map-stage=${stage}]`).click();await page.evaluate(()=>window.__GAME__.prepareLaunch());await page.keyboard.press('Escape');await page.locator('#quit').click();
  for(const quality of ['high','medium'])for(const scenario of ['normal','dense','ultimate']){
   await page.evaluate(({quality,scenario})=>{const g=window.__GAME__;g.world.setQuality(quality);g.startGame();const s=g.sim;s.invincible=999;s.level=3;s.time=125;for(let i=0;i<(scenario==='normal'?4:10);i++)s.spawn(i%3?'heavy':'support',(i%5-2)*7,-10-Math.floor(i/5)*12,{hp:200,timer:i*.3});if(scenario==='ultimate'){s.charge=100;s.useUltimate();}},{quality,scenario});
   const sample=await page.evaluate(async()=>{const frames=[],start=performance.now();let last=start;await new Promise(resolve=>{const step=now=>{frames.push(now-last);last=now;if(frames.length<100)requestAnimationFrame(step);else resolve();};requestAnimationFrame(step);});const g=window.__GAME__,gl=g.world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info'),sorted=frames.slice(5).sort((a,b)=>a-b);return {meanMs:sorted.reduce((a,b)=>a+b,0)/sorted.length,p95Ms:sorted[Math.floor(sorted.length*.95)],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),...g.world.stats};});report.performance.push({stage,quality,scenario,...sample});
  }
  await page.keyboard.press('Escape');await page.locator('#quit').click();
 }
 report.stageResources=[];for(let round=0;round<3;round++)for(const stage of ['lingang','canyon','ocean']){await page.locator(`[data-map-stage=${stage}]`).click();await page.evaluate(()=>window.__GAME__.prepareLaunch());await page.keyboard.press('Escape');await page.locator('#quit').click();await page.waitForTimeout(120);report.stageResources.push({round,stage,...await page.evaluate(()=>window.__GAME__.world.stats)});}for(const stage of ['lingang','canyon','ocean']){const samples=report.stageResources.filter(s=>s.stage===stage);assert(samples[2].geometries<=samples[1].geometries+2);assert(samples[2].textures<=samples[1].textures+2);}
 assert.deepEqual(report.errors,[]);report.notes=['Flow setup uses development hooks to reach bosses; all five pilots × all three full routes are tested in the simulation suite.','Frame sampling is headless desktop Chrome at 1920×1080. Ultimate sample includes the cast and recovery.','Real keyboard-only combat is recorded separately by test:record; no invulnerability assistance in that recording.'];
 await writeFile(out+'/playtest.json',JSON.stringify(report,null,2));console.log(JSON.stringify({stages:report.stages,replays:report.replays,errors:report.errors,performance:report.performance},null,2));
}finally{await browser.close();}
