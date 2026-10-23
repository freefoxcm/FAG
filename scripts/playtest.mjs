import { chromium } from 'playwright';
import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const url=process.env.GAME_URL||'http://127.0.0.1:5180';
await mkdir('artifacts',{recursive:true});
const software=process.env.SOFTWARE_RENDERER==='1';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true,args:software?['--use-angle=swiftshader','--enable-webgl']:[]});
const page=await browser.newPage({viewport:{width:1366,height:768}});
try {
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
await page.goto(url);await page.waitForFunction(()=>!!window.__GAME__,{timeout:30000});await page.screenshot({path:'artifacts/title-1366.png'});
await page.locator('#start').click();await page.locator('#dialog-next').click();assert.match(await page.locator('#speaker').textContent(),/青鸾/);await page.screenshot({path:'artifacts/intro.png'});await page.locator('#skip').click();
await page.keyboard.down('KeyA');await page.waitForTimeout(550);await page.keyboard.up('KeyA');assert((await page.evaluate(()=>window.__GAME__.sim.player.x))<0);
await page.waitForTimeout(2500);await page.screenshot({path:'artifacts/combat-1366.png'});
await page.keyboard.press('Escape');const before=await page.evaluate(()=>window.__GAME__.sim.time);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>window.__GAME__.sim.time),before);await page.locator('#pause-settings').click();await page.locator('#setting-sound').click();await page.locator('#setting-quality').click();await page.locator('#close-settings').click();await page.locator('#resume').click();
await page.evaluate(()=>{const g=window.__GAME__;g.sim.invincible=999;g.sim.time=110;g.sim.charge=100;g.sim.level=3;});await page.waitForTimeout(1100);await page.keyboard.press('KeyQ');await page.waitForSelector('#cutin:not([hidden])',{timeout:5000});await page.screenshot({path:'artifacts/ultimate.png'});
await page.evaluate(()=>{const g=window.__GAME__;g.sim.time=g.sim.stage.bossAt;});await page.waitForTimeout(2000);await page.evaluate(()=>{const s=window.__GAME__.sim;s.boss.hp=400;});await page.waitForTimeout(300);await page.setViewportSize({width:1920,height:1080});await page.screenshot({path:'artifacts/boss-1920.png'});
await page.evaluate(()=>{const s=window.__GAME__.sim;s.damageEnemy(s.boss,9999);});await page.waitForSelector('#results:not([hidden])');assert.match(await page.locator('#result-title').textContent(),/赢了/);await page.screenshot({path:'artifacts/victory.png'});
const runs=[];for(let i=0;i<3;i++){await page.locator('#retry').click();await page.waitForTimeout(450);await page.evaluate(()=>{const s=window.__GAME__.sim;s.invincible=0;s.damagePlayer(5);});await page.waitForSelector('#results:not([hidden])');assert.match(await page.locator('#rank').textContent(),/RETRY/);runs.push(await page.evaluate(()=>window.__GAME__.world.stats));}
assert(runs[2].geometries<=runs[0].geometries+3);await page.screenshot({path:'artifacts/failure.png'});await page.reload();await page.waitForFunction(()=>!!window.__GAME__);const persisted=await page.evaluate(()=>window.__GAME__.save);assert.equal(persisted.muted,true);assert.equal(persisted.quality,'medium');assert(persisted.best>0);
await page.evaluate(()=>window.__GAME__.startGame());await page.keyboard.down('KeyD');await page.waitForTimeout(100);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>window.__GAME__.sim.mode),'paused');await page.keyboard.up('KeyD');await page.locator('#resume').click();
await page.setViewportSize({width:1366,height:768});await page.evaluate(()=>{const g=window.__GAME__;g.sim.time=110;g.sim.level=3;g.sim.invincible=999;});await page.waitForTimeout(5000);const performance=await page.evaluate(()=>({fps:window.__GAME__.fps,...window.__GAME__.world.stats,renderer:window.__GAME__.world.renderer.getContext().getParameter(window.__GAME__.world.renderer.getContext().RENDERER)}));
assert.deepEqual(errors,[]);const report={url,errors,runs,persisted,performance,notes:['Win/loss and Boss phase paths use development-only scenario setup.',software?'Rendering: headless Chrome with SwiftShader; FPS does not represent a physical GPU.':'Rendering: headless Chrome with default graphics backend.']};await writeFile('artifacts/playtest.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
