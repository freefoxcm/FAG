import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5181');await page.waitForSelector('#loading[hidden]',{state:'attached'});assert.equal(await page.evaluate(()=>typeof window.__GAME__),'undefined');await page.locator('#start').click();await page.locator('#skip').click();await page.waitForTimeout(1500);assert(await page.locator('#hud').isVisible());assert.deepEqual(errors,[]);await page.screenshot({path:'artifacts/production.png'});console.log('Production smoke passed; no developer hooks; no page errors.');}finally{await browser.close();}
