import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{const page=await browser.newPage({viewport:{width:1600,height:1000}});await page.goto(process.env.GAME_URL||'http://127.0.0.1:5180');await page.waitForFunction(()=>!!window.__GAME__,{timeout:60000});await mkdir('public/assets/story',{recursive:true});for(const id of ['lingang','canyon','ocean']){await page.evaluate(async id=>{const {getStage}=await import('/src/game/content.ts');const g=window.__GAME__;await g.world.setStage(getStage(id));g.sim.stage=getStage(id);g.sim.mode='lost';g.sim.entities=[];g.world.reset();g.world.render(g.sim,0);},id);await page.locator('#overlay').evaluate(el=>el.style.visibility='hidden');const png=await page.locator('#world canvas').screenshot();await sharp(png).resize(1440,900).webp({quality:83}).toFile(`public/assets/story/${id}.webp`);}}finally{await browser.close();}
