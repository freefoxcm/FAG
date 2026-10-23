import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.goto(process.env.GAME_URL||'http://127.0.0.1:5180');await page.waitForFunction(()=>!!window.__GAME__);
 const result=[];for(const quality of ['high','medium']){await page.evaluate(q=>{const g=window.__GAME__;g.world.setQuality(q);g.startGame();g.sim.invincible=999;g.sim.level=3;g.sim.time=110;},quality);await page.waitForTimeout(6000);result.push(await page.evaluate(q=>{const g=window.__GAME__,gl=g.world.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {quality:q,fps:g.fps,...g.world.stats,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};},quality));}
 await mkdir('artifacts',{recursive:true});await page.evaluate(()=>{const g=window.__GAME__;g.sim.time=120;g.world.render(g.sim,150);g.world.render(g.sim,52);});await page.screenshot({path:'artifacts/port-1920.png'});
 await writeFile('artifacts/benchmark.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
} finally {await browser.close();}
