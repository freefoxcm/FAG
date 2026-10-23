import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
await mkdir('artifacts/improvements',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const context=await browser.newContext({viewport:{width:1366,height:768},recordVideo:{dir:'artifacts/improvements',size:{width:1366,height:768}}});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL||'http://127.0.0.1:5180');await page.waitForFunction(()=>!!window.__GAME__);
  await page.locator('#start').click();await page.locator('#skip').click();
  const entry=await page.evaluate(()=>{const {sim:s,world:w}=window.__GAME__;window.__GAME__.startGame();s.invincible=999;w.syncView(s);for(let i=0;i<62;i++)s.update(1/60,{x:0,z:0,missile:false,ultimate:false});return {entryZ:s.entryZ,fireBoundary:s.fireBoundary,planes:s.entities.filter(e=>e.kind==='drone'||e.kind==='interceptor').map(e=>{const p=w.camera.position.clone().set(e.x,e.y-1,e.z+4).project(w.camera);return {id:e.id,ndcY:p.y,z:e.z};})};});
  console.log('Entry:',JSON.stringify(entry));assert.equal(entry.planes.length,3);assert(entry.planes.every(e=>e.ndcY>1));await page.screenshot({path:'artifacts/improvements/entry-outside.png'});await page.waitForTimeout(4200);await page.screenshot({path:'artifacts/improvements/entry-flying-in.png'});
  await page.evaluate(()=>{const g=window.__GAME__,s=g.sim;g.startGame();s.invincible=999;s.time=60;document.getElementById('stage-banner').hidden=true;s.spawn('turret',6.1,-5,{hp:500,maxHp:500,timer:0,vz:0});for(const [x,z]of [[-15,-18],[0,-25],[15,-22]])s.spawn('interceptor',x,z,{hp:500,maxHp:500,timer:10,vz:0});});
  await page.waitForTimeout(180);await page.screenshot({path:'artifacts/improvements/turret-muzzle.png'});
  await page.keyboard.press('KeyE');await page.waitForTimeout(280);await page.evaluate(()=>window.__GAME__.sim.mode='paused');
  assert.match(await page.locator('#missile-status').textContent(),/冷却/);assert.match(await page.locator('#missile .key').textContent(),/E/);assert.match(await page.locator('#ultimate .key').textContent(),/Q/);
  const missile=await page.evaluate(()=>({stats:window.__GAME__.world.stats,missiles:window.__GAME__.sim.entities.filter(e=>e.kind==='missile').length}));assert(missile.stats.trails>0);assert(missile.stats.effects>0);await page.screenshot({path:'artifacts/improvements/e-missile-trails.png'});
  await page.evaluate(()=>{window.__GAME__.sim.mode='playing';window.__GAME__.sim.charge=100;});await page.keyboard.press('KeyQ');await page.waitForSelector('#cutin:not([hidden])');await page.waitForTimeout(220);await page.evaluate(()=>window.__GAME__.sim.mode='paused');
  const ultimate=await page.evaluate(()=>({stats:window.__GAME__.world.stats,mask:getComputedStyle(document.getElementById('cutin')).maskImage,clip:getComputedStyle(document.getElementById('cutin')).clipPath,charge:window.__GAME__.sim.charge}));assert(ultimate.stats.effects>10);assert.match(ultimate.mask,/linear-gradient/);assert.equal(ultimate.clip,'none');assert(ultimate.charge<100);
  await page.screenshot({path:'artifacts/improvements/q-ultimate-gradient.png'});await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'artifacts/improvements/q-ultimate-1920.png'});
  await page.evaluate(()=>window.__GAME__.sim.mode='playing');await page.waitForTimeout(1600);
  const memories=[];for(let i=0;i<3;i++){await page.evaluate(()=>{const g=window.__GAME__;g.startGame();g.sim.invincible=999;g.sim.spawn('boss',0,-14,{hp:900,maxHp:900,timer:4});g.sim.charge=100;g.sim.useUltimate();});await page.waitForTimeout(1600);memories.push(await page.evaluate(()=>window.__GAME__.world.stats));}
  assert(memories[2].geometries<=memories[0].geometries+5);assert.deepEqual(errors,[]);
  const report={entry,missile,ultimate,memories,errors};await writeFile('artifacts/improvements/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  await context.close();
} finally {await browser.close();}
