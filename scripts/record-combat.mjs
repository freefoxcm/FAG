import {enterCombat} from './flow-helpers.mjs';
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const pilot=process.env.PILOT||'qingluan',out=process.env.OUTPUT_DIR||'artifacts/upgrade';await mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const context=await browser.newContext({viewport:{width:1366,height:768},recordVideo:{dir:out,size:{width:1366,height:768}}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5180/?pilot='+pilot);await page.waitForFunction(()=>!!window.__GAME__);await enterCombat(page);await page.keyboard.down('KeyE');await page.keyboard.down('KeyQ');
 let held='',retries=0;const samples=[],start=Date.now();
 while(Date.now()-start<65000){
  const state=await page.evaluate(()=>{const g=window.__GAME__,s=g.sim;return {mode:s.mode,pilot:s.character.id,time:s.time,x:s.player.x,z:s.player.z,health:s.health,kills:s.kills,score:s.score,fps:g.fps,invincible:s.invincible,entities:s.entities.map(e=>({kind:e.kind,x:e.x,z:e.z,vx:e.vx,vz:e.vz,radius:e.radius,state:e.state}))};});
  if(state.mode==='lost'){await page.waitForSelector('#results:not([hidden])');samples.push({...state,entities:undefined});if(held)await page.keyboard.up(held);held='';await page.locator('#retry').click();retries++;await page.keyboard.down('KeyE');await page.keyboard.down('KeyQ');continue;}
  const targets=state.entities.filter(e=>['drone','interceptor','heavy','support','turret'].includes(e.kind)&&e.z<state.z-5&&e.z>-40).sort((a,b)=>b.z-a.z);let dx=0;
  if(targets.length){const target=targets[0],lead=target.x+target.vx*Math.max(0,(state.z-target.z)/78);dx=Math.abs(lead-state.x)>1?Math.sign(lead-state.x):0;}
  const threat=state.entities.find(e=>{if(e.kind!=='hostile')return false;const rz=e.z-state.z,a=e.vx*e.vx+e.vz*e.vz,t=-((e.x-state.x)*e.vx+rz*e.vz)/(a||1);return t>0&&t<.65&&Math.hypot(e.x-state.x+e.vx*t,rz+e.vz*t)<2.4;});if(threat)dx=state.x>threat.x?1:-1;if(state.x>20&&dx>0)dx=-1;if(state.x< -20&&dx<0)dx=1;
  const key=dx<0?'KeyA':dx>0?'KeyD':'';if(key!==held){if(held)await page.keyboard.up(held);if(key)await page.keyboard.down(key);held=key;}
  if(samples.length===0||state.time-samples.at(-1).time>4)samples.push({...state,entities:undefined});
  await page.waitForTimeout(100);
 }
 if(held)await page.keyboard.up(held);await page.keyboard.up('KeyE');await page.keyboard.up('KeyQ');await page.screenshot({path:out+'/natural-combat.png'});samples.push(await page.evaluate(()=>{const g=window.__GAME__,s=g.sim;return {pilot:s.character.id,mode:s.mode,time:s.time,health:s.health,kills:s.kills,score:s.score,fps:g.fps};}));const file=await page.video().path();await context.close();await writeFile(out+'/natural-combat.json',JSON.stringify({video:file,retries,samples,errors,notes:'Keyboard autopilot only. No changes to HP, invulnerability, damage, level, stage time or enemy state.'},null,2));console.log(JSON.stringify({video:file,retries,last:samples.at(-1),errors},null,2));
}finally{await browser.close();}
