import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,type Input} from '../src/game/simulation.ts';
import {characters} from '../src/game/characters.ts';
import {airframeRoster} from '../src/game/roster.ts';
import {readSave,writeSave} from '../src/game/save.ts';
const idle:Input={x:0,z:0,missile:false,ultimate:false};
const advance=(s:Simulation,seconds:number)=>{for(let i=0;i<seconds*60;i++)s.update(1/60,idle);};

test('five characters share integrity but own movement, cannon and reset all temporary abilities',()=>{
 const distances=[];for(const a of airframeRoster){const s=new Simulation(a.id);s.reset();s.update(.1,{...idle,x:1});assert.equal(s.health,5);distances.push(s.player.x);s.jamTime=3;s.wingmenTime=4;s.dashTime=.2;s.burstRemaining=5;s.level=3;s.charge=100;s.missileCooldown=9;s.reset();assert.equal(s.character.id,a.id);assert.equal(s.level,1);assert.equal(s.charge+s.jamTime+s.wingmenTime+s.dashTime+s.burstRemaining+s.missileCooldown,0);assert.equal(s.entities.length,0);}
 assert(distances[1]>distances[0]);assert(distances[4]<distances[0]);assert.equal(characters.snega.cannon.pierce,3);
});
test('Akari precision volley focuses six missiles on the forward reticle target and uses its own muzzle anchors',()=>{
 const s=new Simulation('akari');s.reset();const focus=s.spawn('heavy',0,-9,{hp:500,maxHp:500,timer:99});s.spawn('heavy',17,3,{hp:500,timer:99});assert(s.useMissiles());const missiles=s.entities.filter(e=>e.kind==='missile');assert.equal(missiles.length,6);assert(missiles.every(e=>e.target===focus.id&&e.precision));assert.equal(missiles[0].x,s.playerMuzzle(0).x);assert.equal(missiles[1].z,s.playerMuzzle(1).z);assert.equal(s.missileCooldown,8);assert(!s.useMissiles());s.player.x=-22;advance(s,1.2);assert(focus.hp<=500-6*s.character.weapons[1].damage);
});
test('Akari lance hits only the selected corridor and leaves unrelated bullets intact',()=>{
 const s=new Simulation('akari');s.reset();const aligned=s.spawn('heavy',0,-10,{hp:300,timer:99}),outside=s.spawn('heavy',16,-10,{hp:300,timer:99});const on=s.spawn('hostile',0,0),off=s.spawn('hostile',16,0);s.charge=100;assert(s.useUltimate());assert.equal(aligned.hp,195);assert.equal(outside.hp,300);assert.equal(on.hp,0);assert.equal(off.hp,1);const event=s.events.find(e=>e.type==='ultimate')!;assert.equal(event.variant,'lance');assert.equal(event.characterId,'akari');assert(event.end!.z<-100);assert.equal(s.charge,0);
});
test('Haneul decoy attracts newly announced attacks and expires on simulation time',()=>{
 const s=new Simulation('haneul');s.reset();assert(s.useMissiles());const decoy=s.entities.find(e=>e.kind==='decoy')!,enemy=s.spawn('heavy',0,-10,{hp:1000,timer:0});s.update(1/60,idle);assert.equal(enemy.aimX,decoy.x);assert.equal(enemy.aimZ,decoy.z);s.mode='paused';s.update(8,idle);assert(decoy.timer>3.9);s.mode='playing';s.invincible=999;advance(s,4.1);assert(!s.entities.some(e=>e.kind==='decoy'));
});
test('decoy intercepts a fast hostile sweep without damaging its commander',()=>{
 const s=new Simulation('haneul');s.reset();s.player.x=20;s.invincible=0;s.spawn('decoy',0,0,{timer:4,radius:1.1});const shot=s.spawn('hostile',0,-10,{vz:1200});s.update(1/60,idle);assert.equal(shot.hp,0);assert.equal(s.health,5);assert(s.events.some(e=>e.weaponId==='decoy'));
});
test('Haneul electronic silence slows movement and fire, and exposes newly arriving targets',()=>{
 const a=new Simulation('haneul'),b=new Simulation('haneul');a.reset();b.reset();a.player.x=b.player.x=22;a.charge=100;a.useUltimate();const x=a.spawn('heavy',0,-12,{hp:1000,timer:1}),y=b.spawn('heavy',0,-12,{hp:1000,timer:1});advance(a,.5);advance(b,.5);assert(x.z<y.z);assert(x.timer>y.timer);assert(x.disrupted>6);const hp=x.hp;a.damageEnemy(x,10);assert.equal(hp-x.hp,15);a.mode='paused';const jam=a.jamTime;a.update(3,idle);assert.equal(a.jamTime,jam);
});
test('Astra wingmen fire from the visible wing positions and expire without persisting into a replay',()=>{
 const s=new Simulation('astra');s.reset();s.spawn('heavy',0,-35,{hp:1000,timer:99});assert(s.useMissiles());s.update(1/60,idle);const shots=s.entities.filter(e=>e.weaponId==='wingman');assert.equal(shots.length,2);assert(shots.some(e=>e.x<0)&&shots.some(e=>e.x>0));assert(s.wingmenTime>6.9);s.mode='paused';s.update(10,idle);assert(s.wingmenTime>6.9);s.reset();assert.equal(s.wingmenTime,0);assert(!s.entities.some(e=>e.weaponId==='wingman'));
});
test('Astra network distributes twelve guided missiles and applies a finite damage mark',()=>{
 const s=new Simulation('astra');s.reset();const a=s.spawn('heavy',-7,-15,{hp:500,timer:99}),b=s.spawn('heavy',7,-15,{hp:500,timer:99});const hostile=s.spawn('hostile',0,0);s.charge=100;s.useUltimate();const missiles=s.entities.filter(e=>e.kind==='missile');assert.equal(missiles.length,12);assert.equal(new Set(missiles.map(e=>e.target)).size,2);assert.equal(a.marked,6);assert.equal(b.marked,6);assert.equal(hostile.hp,0);const hp=a.hp;s.damageEnemy(a,10);assert(Math.abs(hp-a.hp-13)<.0001);s.reset();assert.equal(s.wingmenTime,0);
});
test('Snega dash follows current input, grants bounded protection and clamps at the field edge',()=>{
 const s=new Simulation('snega');s.reset();s.invincible=0;s.update(1/60,{...idle,x:1,missile:true});assert(s.dashTime>0);assert(s.player.x>.7);s.damagePlayer(2);assert.equal(s.health,5);advance(s,.3);assert(s.player.x>9);assert.equal(s.dashTime,0);s.missileCooldown=0;s.player.x=21.9;s.update(1/60,{...idle,x:1,missile:true});advance(s,.3);assert.equal(s.player.x,22);advance(s,.5);s.damagePlayer(1);assert.equal(s.health,4);
});
test('piercing rounds resolve multiple swept targets in order and never damage the same target twice',()=>{
 const s=new Simulation('snega');s.reset();s.player.x=22;const targets=[5,-3,-11].map(z=>s.spawn('heavy',0,z,{hp:100,timer:99}));const bullet=s.spawn('bullet',0,14,{vz:-2000,damage:5,pierce:3});s.update(1/60,idle);assert(targets.every(t=>t.hp===95));assert.equal(bullet.hp,0);assert.equal(new Set(bullet.hitIds).size,3);s.update(1/60,idle);assert(targets.every(t=>t.hp===95));
});
test('Snega ultimate schedules five finite heavy rounds, respecting pause and reset',()=>{
 const s=new Simulation('snega');s.reset();s.charge=100;s.useUltimate();s.mode='paused';s.update(5,idle);assert.equal(s.burstRemaining,5);s.mode='playing';advance(s,.8);assert.equal(s.burstRemaining,0);assert.equal(s.entities.filter(e=>e.weaponId==='barrage').length,5);s.reset();assert.equal(s.entities.length,0);assert.equal(s.burstRemaining,0);
});
test('legacy saves migrate selected pilot and independent high scores with invalid values rejected',()=>{
 const old=readSave({getItem:()=>'{"best":900,"muted":true}'});assert.equal(old.best,900);assert.equal(old.selected,'qingluan');const bad=readSave({getItem:()=>'{"selected":"missing","pilotBest":{"astra":200,"akari":-3,"snega":"bad"}}'});assert.equal(bad.selected,'qingluan');assert.equal(bad.pilotBest?.astra,200);assert.equal(bad.pilotBest?.akari,0);assert.equal(bad.pilotBest?.snega,undefined);let data='';writeSave({setItem:(_,v)=>data=v},{...old,selected:'akari',pilotBest:{akari:600}});assert.equal(readSave({getItem:()=>data}).selected,'akari');assert.equal(readSave({getItem:()=>data}).pilotBest?.akari,600);
});
for(const a of airframeRoster)test(`${a.name} can complete the existing full stage under scripted targeting`,()=>{
 const s=new Simulation(a.id);s.reset();while(s.mode==='playing'&&s.time<340){s.invincible=2;const target=s.boss??s.entities.find(e=>['heavy','drone','interceptor','support'].includes(e.kind)&&e.z<10&&e.z>-25);s.update(1/60,{...idle,x:target&&Math.abs(target.x-s.player.x)>.35?Math.sign(target.x-s.player.x):0,missile:a.id!=='snega',ultimate:s.charge>=100});s.drainEvents();}assert.equal(s.mode,'won');assert(s.time>=165);s.reset();assert.equal(s.character.id,a.id);assert.equal(s.level,1);
});
