import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5181/?hangar&model=akari');await page.waitForSelector('#hangar-loading[hidden]',{state:'attached'});await page.locator('#hangar-deploy').click();await page.waitForSelector('#intro:not([hidden])');await page.locator('#skip').click();assert.match(await page.locator('#active-pilot').textContent(),/明璃/);await page.keyboard.press('Escape');await page.locator('#quit').click();
 for(const [id,name,small,ultimate]of [['qingluan','青鸾','青羽齐射','天穹裁决'],['akari','明璃','朱羽点杀','绯空一线'],['haneul','苍穹','镜像诱饵','苍穹静默'],['astra','星隼','双隼编队','星链协同'],['snega','霜翼','矢量突进','极寒破阵']]){
  await page.locator(`button[data-pilot="${id}"]`).click();await page.waitForFunction(name=>document.querySelector('.pilot-tag h2').textContent===name&&document.getElementById('loading').hidden,name);await page.reload();await page.waitForFunction(()=>document.getElementById('loading').hidden);assert.equal(await page.locator('.pilot-tag h2').textContent(),name);await page.locator('#start').click();await page.locator('#skip').click();assert.match(await page.locator('#active-pilot').textContent(),new RegExp(name));assert.equal(await page.locator('#missile .name').textContent(),small);assert.equal(await page.locator('#ultimate .name').textContent(),ultimate);await page.waitForTimeout(300);await page.screenshot({path:`artifacts/pilots/${id}-production-1920.png`});await page.keyboard.press('Escape');await page.locator('#quit').click();
 }
 assert.equal(await page.evaluate(()=>typeof window.__GAME__),'undefined');assert.equal(await page.evaluate(()=>typeof window.__HANGAR__),'undefined');assert.deepEqual(errors,[]);console.log('All five production pilots, hangar deployment, HUD, refresh persistence and return to title passed. No page errors or developer hooks.');
}finally{await browser.close();}
