import {writeFileSync,mkdirSync} from 'node:fs';
import {Simulation} from '../src/game/simulation';
import {stages} from '../src/game/content';
import {airframeRoster} from '../src/game/roster';
const runs=[];
for(const stage of stages)for(const pilot of airframeRoster){const s=new Simulation(pilot.id);s.reset(pilot.id,stage.id);while(s.mode==='playing'&&s.time<420){s.invincible=2;const target=s.boss??s.entities.find(e=>['heavy','drone','interceptor','support'].includes(e.kind)&&e.z<10&&e.z>-25);s.update(1/60,{x:target&&Math.abs(target.x-s.player.x)>.35?Math.sign(target.x-s.player.x):0,z:0,missile:pilot.id!=='snega',ultimate:s.charge>=100});s.drainEvents();}runs.push({stage:stage.id,pilot:pilot.id,result:s.mode,seconds:+s.time.toFixed(1),score:s.score,kills:s.kills,...s.metrics});}
mkdirSync('artifacts/campaign',{recursive:true});writeFileSync('artifacts/campaign/balance.json',JSON.stringify({note:'Deterministic targeting with damage immunity, for output comparison only; real keyboard combat is recorded separately.',runs},null,2));console.table(runs);
