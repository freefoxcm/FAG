import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5181');await page.locator('.hangar-entry').click();
 for(const id of ['akari','haneul','astra','snega']){await page.locator(`[data-airframe="${id}"]`).click();await page.waitForSelector('#hangar-loading[hidden]',{state:'attached'});assert.match(await page.locator('#hangar-statistics').textContent(),/TRI/);}
 assert.equal(await page.evaluate(()=>typeof window.__HANGAR__),'undefined');assert.equal(await page.evaluate(()=>typeof window.__GAME__),'undefined');
 await page.screenshot({path:'artifacts/hangar/production-1366.png'});await page.locator('.hangar-home').click();await page.locator('#start').click();await page.locator('#skip').click();assert(await page.locator('#hud').isVisible());assert.deepEqual(errors,[]);console.log('Production hangar and return to combat passed, no developer hooks or page errors.');
}finally{await browser.close();}
