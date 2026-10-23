import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=(process.env.PAGES_URL||'http://127.0.0.1:5181/FAG/').replace(/\/?$/,'/'),out=process.env.PAGES_OUTPUT||'artifacts/pages-local';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[],badResponses=[],escapingPaths=[],origin=new URL(base);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)badResponses.push({url:r.url(),status:r.status()});});
 page.on('request',r=>{const url=new URL(r.url());if(['http:','https:'].includes(url.protocol)&&url.origin===origin.origin&&!url.pathname.startsWith(origin.pathname))escapingPaths.push(url.pathname);});
 await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#loading[hidden]',{state:'attached'});await page.screenshot({path:out+'/title.png'});assert.equal(await page.evaluate(()=>typeof window.__GAME__),'undefined');
 await page.locator('.hangar-entry').click();await page.waitForSelector('#hangar-loading[hidden]',{state:'attached'});assert(new URL(page.url()).pathname===origin.pathname);
 for(const [id,name]of [['qingluan','青鸾'],['akari','明璃'],['haneul','苍穹'],['astra','星隼'],['snega','霜翼']]){await page.locator(`[data-airframe="${id}"]`).click();await page.waitForFunction(name=>document.getElementById('hangar-name').textContent===name&&document.getElementById('hangar-loading').hidden,name);await page.locator('#hangar-reference').click();await page.locator('#hangar-reference-image').evaluate(img=>img.decode());await page.keyboard.press('Escape');}
 await page.locator('#hangar-lod').click();await page.waitForSelector('#hangar-loading[hidden]',{state:'attached'});await page.screenshot({path:out+'/hangar.png'});await page.locator('#hangar-deploy').click();await page.waitForSelector('#intro:not([hidden])');await page.locator('#skip').click();assert.match(await page.locator('#active-pilot').textContent(),/霜翼/);await page.keyboard.press('KeyE');await page.waitForTimeout(350);await page.screenshot({path:out+'/snega-combat.png'});await page.keyboard.press('Escape');await page.locator('#quit').click();
 for(const [id,name]of [['qingluan','青鸾'],['akari','明璃'],['haneul','苍穹'],['astra','星隼'],['snega','霜翼']]){await page.locator(`[data-pilot="${id}"]`).click();await page.waitForFunction(name=>document.querySelector('.pilot-tag h2').textContent===name&&document.getElementById('loading').hidden,name);await page.locator('#start').click();await page.locator('#skip').click();assert.match(await page.locator('#active-pilot').textContent(),new RegExp(name));await page.waitForTimeout(150);await page.keyboard.press('Escape');await page.locator('#quit').click();}
 await page.reload();await page.waitForSelector('#loading[hidden]',{state:'attached'});assert.equal(await page.locator('.pilot-tag h2').textContent(),'霜翼');assert.equal(await page.evaluate(()=>typeof window.__HANGAR__),'undefined');
 assert.deepEqual(errors,[]);assert.deepEqual(badResponses,[]);assert.deepEqual(escapingPaths,[]);const report={base,errors,badResponses,escapingPaths,checked:'Five high-LOD hangar models and reference images, battle LOD, deployment, five pilots in combat, pause, return, refresh, no developer hooks.'};await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
