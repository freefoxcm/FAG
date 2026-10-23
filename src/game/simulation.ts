import {getCharacter,getStage,type StageId} from './content';
import {createBossParts,type BossPart} from './bosses';
import type {AirframeId} from './roster';
import {AIR_HEIGHT,cannonMuzzle,entityHeight,modelPoint,sweptCircle,collisionVolumes,type Point3} from './combat';
import {enemyDefinitions,isEnemy,isAirEnemy,modelDefinitions,type EnemyKind} from './enemies';
export type Mode='title'|'intro'|'playing'|'paused'|'won'|'lost';
export type Kind=EnemyKind|'bullet'|'hostile'|'missile'|'power'|'repair'|'warning'|'decoy';
export type Behavior='enter'|'attack'|'sweep'|'evade'|'exit';
export interface Entity{
 id:number;kind:Kind;x:number;y:number;z:number;vx:number;vy:number;vz:number;hp:number;maxHp:number;radius:number;age:number;timer:number;damage:number;
 heading:number;bank:number;state:Behavior;attackWindup:number;aimX:number;aimZ:number;reaction:number;evadeCooldown:number;evadeRemaining:number;evadeOrigin:number;evadeDirection:number;flightDirection:number;lane:number;visibleAge:number;
 recoilX:number;recoilZ:number;hitFlash:number;shotSequence:number;muzzleSlot:number;disrupted:number;marked:number;target?:number;source?:number;heavy?:boolean;phase?:number;weaponId?:string;pierce?:number;hitIds?:number[];precision?:boolean;parts?:BossPart[];modelId?:'boss'|'prism'|'canopy';targetPart?:string;partId?:string;coordinator?:number;facility?:'radar'|'missile';
}
export interface GameEvent{
 type:'shot'|'hit'|'explosion'|'hurt'|'missile'|'ultimate'|'pickup'|'warning'|'radio'|'victory'|'muzzle'|'missile-impact'|'telegraph'|'ability'|'rail-shot';
 x?:number;y?:number;z?:number;text?:string;large?:boolean;targets?:Point3[];weaponId?:string;targetId?:number;normal?:Point3;damage?:number;killed?:boolean;weight?:'light'|'heavy'|'boss';
 characterId?:AirframeId;variant?:string;end?:Point3;partId?:string;pickupKind?:'power'|'repair';effect?:number;
}
export interface Input{x:number;z:number;missile:boolean;ultimate:boolean}
interface Impact{position:Point3;normal:Point3;weaponId:string;weight:'light'|'heavy'|'boss';partId?:string}
const approach=(value:number,target:number,delta:number)=>value<target?Math.min(target,value+delta):Math.max(target,value-delta);
export class Simulation{
 mode:Mode='title';time=0;score=0;kills=0;combo=0;maxCombo=0;comboLeft=0;health=5;level=1;charge=0;missileCooldown=0;invincible=0;ultimateFlash=0;phase=0;
 player={x:0,z:16,bank:0};entities:Entity[]=[];events:GameEvent[]=[];
 entryZ=-90;groundEntryZ=-105;fireBoundary=-65;
 stage=getStage('lingang');metrics={damage:0,taken:0,small:0,ultimate:0,parts:0,bossTime:0};waveIndex=0;character=getCharacter('qingluan');jamTime=0;wingmenTime=0;dashTime=0;burstRemaining=0;
 private wingmanTimer=0;private burstTimer=0;private dashX=0;private dashZ=-1;private lastMove={x:0,z:-1};
 private nextId=1;private shotTimer=0;private waveTimer=1;private pickupTimer=10;private bossSpawned=false;private rng=4717;
 random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
 constructor(id:AirframeId='qingluan'){this.character=getCharacter(id);}
 reset(id:AirframeId=this.character.id,stageId:StageId=this.stage.id){this.stage=getStage(stageId);this.metrics={damage:0,taken:0,small:0,ultimate:0,parts:0,bossTime:0};this.waveIndex=0;this.character=getCharacter(id);this.mode='playing';this.time=0;this.score=0;this.kills=0;this.combo=0;this.maxCombo=0;this.comboLeft=0;this.health=5;this.level=1;this.charge=0;this.missileCooldown=0;this.invincible=2;this.ultimateFlash=0;this.phase=0;this.player={x:0,z:16,bank:0};this.entities=[];this.events=[];this.nextId=1;this.shotTimer=0;this.waveTimer=1;this.pickupTimer=10;this.bossSpawned=false;this.rng=4717;this.jamTime=0;this.wingmenTime=0;this.dashTime=0;this.burstRemaining=0;this.wingmanTimer=0;this.burstTimer=0;this.lastMove={x:0,z:-1};this.radio(this.stage.id==='lingang'?this.character.opening:this.stage.phases[0].radio);}
 spawn(kind:Kind,x:number,z:number,extra:Partial<Entity>={}):Entity{
  const def=isEnemy(kind)?enemyDefinitions[kind]:undefined;
  const radius=kind in modelDefinitions?modelDefinitions[kind as keyof typeof modelDefinitions].radius:kind==='turret'?1.6:.4;
  const e:Entity={id:this.nextId++,kind,x,y:entityHeight(kind),z,vx:0,vy:0,vz:0,hp:def?.health??1,maxHp:def?.health??1,radius,age:0,timer:1.2,damage:1,heading:isEnemy(kind)?Math.PI:0,bank:0,state:'enter',attackWindup:-1,aimX:0,aimZ:0,reaction:0,evadeCooldown:0,evadeRemaining:0,evadeOrigin:x,evadeDirection:1,flightDirection:x>0?-1:1,lane:x,visibleAge:0,recoilX:0,recoilZ:0,hitFlash:0,shotSequence:0,muzzleSlot:0,disrupted:0,marked:0,...extra};this.entities.push(e);return e;
 }
 radio(text:string){this.events.push({type:'radio',text:text.startsWith(this.character.name+'：')?text:this.character.name+'：'+text});}
 get multiplier(){return Math.min(5,1+Math.floor(this.combo/10));}
 get boss(){return this.entities.find(e=>e.kind==='boss'&&e.hp>0);}
 damagePlayer(amount:number){if(this.invincible>0||this.mode!=='playing')return;this.metrics.taken+=amount;this.health=Math.max(0,this.health-amount);this.invincible=1.25;this.combo=0;this.comboLeft=0;this.events.push({type:'hurt',x:this.player.x,y:AIR_HEIGHT,z:this.player.z});if(this.health===0){this.mode='lost';this.events.push({type:'explosion',x:this.player.x,y:AIR_HEIGHT,z:this.player.z});}}
 damageEnemy(e:Entity,amount:number,impact?:Impact){
  if(e.hp<=0)return;
  if(impact?.partId&&e.parts){const part=e.parts.find(p=>p.id===impact.partId);if(!part||part.hp<=0)return;part.hp=Math.max(0,part.hp-amount);this.metrics.damage+=amount;e.hitFlash=.08;this.events.push({type:'hit',...impact.position,normal:impact.normal,targetId:e.id,partId:part.id,damage:amount,weaponId:impact.weaponId,weight:impact.weight,killed:part.hp===0});if(part.hp===0){this.metrics.parts++;this.score+=750*this.multiplier;this.charge=Math.min(100,this.charge+6);this.events.push({type:'explosion',...impact.position,weight:'heavy',partId:part.id,targetId:e.id});this.radio(part.name+'已破坏。');}return;}
  if(e.parts?.some(p=>p.role==='shield'&&p.hp>0))amount*=.65;
  this.metrics.damage+=amount;amount*=e.disrupted>0?1.5:e.marked>0?1.3:1;e.hp-=amount;e.hitFlash=.08;
  const normal=impact?.normal??{x:0,y:0,z:-1};e.recoilX=normal.x*.12;e.recoilZ=normal.z*.12;
  this.events.push({type:'hit',x:impact?.position.x??e.x,y:impact?.position.y??e.y,z:impact?.position.z??e.z,targetId:e.id,weaponId:impact?.weaponId??'unknown',normal,damage:amount,killed:e.hp<=0,weight:impact?.weight??'light'});
  if(e.hp>0)return;
  this.entities.forEach(o=>{if(o.coordinator===e.id){o.coordinator=undefined;o.attackWindup=-1;o.timer=Math.max(o.timer,1.2);if(o.kind==='warning')o.hp=0;}});
  this.kills++;this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);this.comboLeft=3.5;this.score+=(isEnemy(e.kind)?enemyDefinitions[e.kind].score:100)*this.multiplier;this.charge=Math.min(100,this.charge+5);
  this.events.push({type:'explosion',x:e.x,y:e.y,z:e.z,targetId:e.id,large:e.kind==='boss',weight:e.kind==='boss'?'boss':e.kind==='heavy'?'heavy':'light'});
  if(e.kind==='boss'){this.metrics.bossTime=this.time-this.stage.bossAt;this.mode='won';this.entities.forEach(o=>{if(o.kind==='hostile'||o.kind==='warning')o.hp=0;});this.events.push({type:'victory'});}
  else if(this.kills%10===0)this.spawn(this.health<=2?'repair':'power',e.x,e.z,{vz:6,radius:1.7});
 }
 useMissiles(){
  if(this.missileCooldown>0||this.mode!=='playing')return false;
  const skill=this.character.weapons[1],targets=this.frontTargets(),point={...this.player,y:AIR_HEIGHT};
  if(['missiles','precision'].includes(skill.id)&&!targets.length)return false;
  this.metrics.small++;this.missileCooldown=skill.cooldown;
  if(skill.id==='decoy'){
   const x=Math.max(-19,Math.min(19,this.player.x+(this.player.x>0?-5:5))),z=this.player.z-4;
   this.spawn('decoy',x,z,{timer:4,radius:1.1});this.events.push({type:'ability',variant:'decoy',x,y:AIR_HEIGHT,z,characterId:this.character.id});
  }else if(skill.id==='wingmen'){
   this.wingmenTime=7;this.wingmanTimer=0;this.events.push({type:'ability',variant:'wingmen',...point,characterId:this.character.id});
  }else if(skill.id==='dash'){
   this.dashTime=.24;this.dashX=this.lastMove.x;this.dashZ=this.lastMove.z;this.invincible=Math.max(this.invincible,.42);
   this.events.push({type:'ability',variant:'dash',...point,end:{x:Math.max(-22,Math.min(22,this.player.x+this.dashX*10.5)),y:AIR_HEIGHT,z:Math.max(-21,Math.min(23,this.player.z+this.dashZ*10.5))},characterId:this.character.id});
  }else{
   const focused=skill.id==='precision';for(let i=0;i<6;i++)this.launchMissile(focused?targets[0]:targets[i%targets.length],i,skill.damage,focused);
   this.events.push({type:'missile',...point,characterId:this.character.id,targets:(focused?[targets[0]]:targets.slice(0,6)).map(e=>({id:e.id,x:e.x,y:e.y,z:e.z}))});
  }return true;
 }
 playerMuzzle(slot=0){const id=this.character.id;return modelPoint(id,{...this.player,bank:-this.player.bank,y:AIR_HEIGHT,heading:0},modelDefinitions[id].muzzles[slot%modelDefinitions[id].muzzles.length]);}
 private frontTargets(){return this.entities.filter(e=>isEnemy(e.kind)&&e.hp>0&&e.z>this.fireBoundary&&e.z<this.player.z+3).sort((a,b)=>(Math.abs(a.x-this.player.x)*2+Math.hypot(a.x-this.player.x,a.z-this.player.z))-(Math.abs(b.x-this.player.x)*2+Math.hypot(b.x-this.player.x,b.z-this.player.z)));}
 private launchMissile(target:Entity,index:number,damage:number,precision=false){const part=this.pickPart(target,index,precision);const p=this.playerMuzzle(index);this.spawn('missile',p.x,p.z,{y:p.y,target:target.id,targetPart:part?.id,vx:(index%6-2.5)*(precision?2:5),vz:-24,radius:.55,damage,timer:0,precision,weaponId:this.character.weapons[1].id});}
 useUltimate(){
  if(this.charge<100||this.mode!=='playing')return false;this.metrics.ultimate++;this.charge=0;this.ultimateFlash=1.2;this.invincible=Math.max(this.invincible,1.5);
  const skill=this.character.weapons[2],targets=this.entities.filter(e=>isEnemy(e.kind)&&e.hp>0&&e.z>this.fireBoundary),point={x:this.player.x,y:AIR_HEIGHT,z:this.player.z};
  let end:Point3|undefined;
  if(skill.id==='lance'){const focus=this.frontTargets().find(e=>e.z<this.player.z-2);const dx=(focus?.x??this.player.x)-this.player.x,dz=(focus?.z??this.fireBoundary)-this.player.z,d=Math.hypot(dx,dz)||1;end={x:this.player.x+dx/d*140,y:AIR_HEIGHT,z:this.player.z+dz/d*140};}
  const inLane=(e:Entity)=>{if(!end)return true;const dx=end.x-point.x,dz=end.z-point.z,t=Math.max(0,Math.min(1,((e.x-point.x)*dx+(e.z-point.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(e.x-point.x-dx*t,e.z-point.z-dz*t)<2.4+e.radius;};
  this.events.push({type:'ultimate',...point,characterId:this.character.id,variant:skill.id,end,targets:targets.filter(inLane).map(e=>({id:e.id,x:e.x,y:e.y,z:e.z}))});
  for(const e of [...this.entities]){
   if((e.kind==='hostile'||e.kind==='warning')&&inLane(e))e.hp=0;
   else if(targets.includes(e)&&inLane(e)&&skill.id!=='barrage'){
    this.damageEnemy(e,skill.damage,{position:e,normal:{x:0,y:1,z:0},weaponId:skill.id,weight:'heavy'});
    for(const part of e.parts??[])if(part.hp>0){const position=modelPoint(e.modelId??'boss',e,part.position);if(inLane({...e,...position,radius:part.radius}))this.damageEnemy(e,skill.damage*.8,{position,normal:{x:0,y:1,z:0},weaponId:skill.id,weight:'heavy',partId:part.id});}
   }
  }
  if(skill.id==='jam'){this.jamTime=7;for(const e of targets)if(e.hp>0)e.disrupted=7;}
  if(skill.id==='network'){for(const e of targets)if(e.hp>0)e.marked=6;const living=targets.filter(e=>e.hp>0);for(let i=0;i<12&&living.length;i++){this.launchMissile(living[i%living.length],i,6);this.entities[this.entities.length-1].weaponId='network';}}
  if(skill.id==='barrage'){this.burstRemaining=5;this.burstTimer=0;}
  return true;
 }
 private updateAbilities(dt:number){
  this.jamTime=Math.max(0,this.jamTime-dt);this.wingmenTime=Math.max(0,this.wingmenTime-dt);this.dashTime=Math.max(0,this.dashTime-dt);
  if(this.dashTime>0){this.player.x=Math.max(-22,Math.min(22,this.player.x+this.dashX*44*dt));this.player.z=Math.max(-21,Math.min(23,this.player.z+this.dashZ*44*dt));}
  if(this.wingmenTime>0){this.wingmanTimer-=dt;if(this.wingmanTimer<=0){this.wingmanTimer=.23;const targets=this.frontTargets();for(const side of [-1,1]){const target=targets[side<0?0:1]??targets[0];if(!target)continue;const x=this.player.x+side*3,z=this.player.z+1.4,d=Math.hypot(target.x-x,target.z-z)||1;this.spawn('bullet',x,z,{vx:(target.x-x)/d*90,vz:(target.z-z)/d*90,damage:1,weaponId:'wingman',radius:.2});}}}
  if(this.burstRemaining>0){this.burstTimer-=dt;if(this.burstTimer<=0){this.burstTimer=.16;const p=this.playerMuzzle(this.burstRemaining%2);this.spawn('bullet',p.x,p.z,{y:p.y,vz:-112,damage:18,radius:1.5,heavy:true,pierce:12,weaponId:'barrage'});this.events.push({type:'rail-shot',...p,characterId:this.character.id});this.burstRemaining--;}}
 }
 fireEnemy(e:Entity,count:number,speed:number,spread=.19,aim:{x:number;z:number}=this.player,heavy=false,slot=e.shotSequence++){
  if(e.kind==='turret')e.heading=Math.atan2(e.x-aim.x,e.z-aim.z);
  if(e.parts){const live=e.parts.filter(p=>p.role==='weapon'&&p.hp>0);if(!live.length)return;slot=live[slot%live.length].slot??0;}
  const muzzle=cannonMuzzle(e,aim,slot),distance=Math.max(1,Math.hypot(aim.x-muzzle.x,aim.z-muzzle.z)),angle=Math.atan2(aim.x-muzzle.x,aim.z-muzzle.z);
  for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*spread;this.spawn('hostile',muzzle.x,muzzle.z,{y:muzzle.y,vx:Math.sin(a)*speed,vy:(AIR_HEIGHT-muzzle.y)*speed/distance,vz:Math.cos(a)*speed,radius:heavy?.55:.3,damage:heavy?2:1,heavy,source:e.id,timer:0});}
  this.events.push({type:'muzzle',...muzzle,weight:heavy?'heavy':'light'});
 }
 private pickPart(target:Entity,index=0,precision=false){const parts=target.parts?.filter(p=>p.hp>0).sort((a,b)=>{const pa=modelPoint(target.modelId??'boss',target,a.position),pb=modelPoint(target.modelId??'boss',target,b.position);return Math.abs(pa.x-this.player.x)-Math.abs(pb.x-this.player.x);});return parts?.length?parts[precision?0:index%Math.min(2,parts.length)]:undefined;}
 private wave(){
  const count=this.entities.filter(e=>isAirEnemy(e.kind)&&e.hp>0).length,slots=Math.max(0,12-count);if(!slots)return;
  const config=this.stage.phases[this.phase],center=(this.random()-.5)*24,kinds=config.formation;this.waveIndex++;
  for(let i=0;i<Math.min(slots,kinds.length);i++){const kind=kinds[i],x=Math.max(-19,Math.min(19,center+(i-1)*6));this.spawn(kind,x,this.entryZ-Math.abs(i-1)*3,{vz:enemyDefinitions[kind].speed,timer:1+this.random()*2,evadeDirection:x>0?-1:1});}
  if((this.phase>0||this.stage.id==='ocean')&&this.entities.filter(e=>e.kind==='turret').length<3)this.spawn('turret',(this.random()>.5?1:-1)*8,this.groundEntryZ,{vz:5,timer:2,facility:this.stage.id==='canyon'&&this.waveIndex%2===0?'radar':this.stage.id==='ocean'?'missile':undefined});
 }
 private steer(e:Entity,dt:number){
  if(!isAirEnemy(e.kind))return;const def=enemyDefinitions[e.kind];
  if(e.z>this.fireBoundary){e.visibleAge+=dt;if(e.state==='enter')e.state='sweep';}
  let tx=0,tz=def.speed;
  if(e.kind==='drone')tx=Math.sin(e.age*1.4+e.lane*.13)*5;
  if(e.kind==='interceptor')tx=e.flightDirection*11+Math.sin(e.age*1.6)*3;
  if(e.kind==='heavy')tx=Math.sin(e.age*.8)*2;
  if(e.kind==='support'){tx=Math.max(-10,Math.min(10,(Math.sin(e.visibleAge*1.4)*15-e.x)*2));if(e.visibleAge>0&&e.visibleAge<2.2)tz=3;}
  if(e.x>20){tx=-Math.abs(tx||6);e.flightDirection=-1;}if(e.x< -20){tx=Math.abs(tx||6);e.flightDirection=1;}
  e.evadeCooldown=Math.max(0,e.evadeCooldown-dt);
  if(def.dodge&&e.z>this.fireBoundary&&e.evadeCooldown===0&&e.evadeRemaining===0){
   const threat=this.entities.find(b=>{if(b.kind!=='bullet'||b.hp<=0)return false;const rx=b.x-e.x,rz=b.z-e.z,vx=b.vx-e.vx,vz=b.vz-e.vz,a=vx*vx+vz*vz;if(a<1)return false;const t=-(rx*vx+rz*vz)/a;return t>.1&&t<.7&&Math.hypot(rx+vx*t,rz+vz*t)<e.radius+.5;});
   if(threat||e.reaction>0){e.reaction+=dt;if(threat)e.evadeDirection=e.x>=threat.x?1:-1;if(e.reaction>=def.dodge.reaction){e.evadeRemaining=.38;e.evadeOrigin=e.x;e.evadeCooldown=def.dodge.cooldown;e.reaction=0;e.state='evade';}}
  }
  if(e.evadeRemaining>0){e.evadeRemaining=Math.max(0,e.evadeRemaining-dt);tx=e.evadeDirection*14;if(Math.abs(e.x-e.evadeOrigin)>=3)tx=0;if(e.evadeRemaining===0)e.state='sweep';}
  if(e.z>this.player.z+7){e.state='exit';tz=def.speed*1.2;}
  e.vx=approach(e.vx,tx,def.acceleration*dt);e.vz=approach(e.vz,tz,def.acceleration*dt);
  e.x=Math.max(-23,Math.min(23,e.x+e.vx*dt));e.z+=e.vz*dt;
  if(e.state==='evade')e.x=Math.max(e.evadeOrigin-3,Math.min(e.evadeOrigin+3,e.x));
  let desired=Math.atan2(-e.vx,-e.vz);if(e.attackWindup>0)desired=Math.atan2(e.x-e.aimX,e.z-e.aimZ);
  const angle=Math.atan2(Math.sin(desired-e.heading),Math.cos(desired-e.heading));e.heading+=Math.max(-dt*2.8,Math.min(dt*2.8,angle));e.bank+=(-e.vx/25-e.bank)*Math.min(1,dt*7);
 }
 private enemyAttack(e:Entity,dt:number){
  if(!isEnemy(e.kind)||e.z<=this.fireBoundary||e.z>this.player.z+2)return;
  const def=enemyDefinitions[e.kind];
  if(e.facility==='radar'){if(e.timer<=0){this.coordinate(e);e.timer=6;}return;}
  if(e.kind==='boss'&&e.parts&&!e.parts.some(p=>p.role==='weapon'&&p.hp>0))return;
  if(e.coordinator&&!this.entities.some(o=>o.id===e.coordinator&&o.hp>0)){e.coordinator=undefined;e.attackWindup=-1;e.timer=1.2;}
  if(e.attackWindup>=0){e.attackWindup-=dt;if(e.attackWindup<=0){const heavy=e.kind==='heavy'||e.facility==='missile'||e.kind==='boss'&&e.phase===2;this.fireEnemy(e,e.kind==='boss'?(this.stage.bossId==='prism'?3:e.phase===2?7:4):def.shots,e.kind==='boss'?this.stage.bossId==='prism'?17:13:e.facility==='missile'?18:12,this.stage.bossId==='canopy'?.23:.17,{x:e.aimX,z:e.aimZ},heavy);e.attackWindup=-1;e.timer=e.kind==='boss'&&e.phase===2?1.5:def.cooldown;if(e.kind==='support')this.coordinate(e);if(e.kind==='boss'&&(!e.parts?.some(p=>p.role==='radar')||e.parts.some(p=>p.role==='radar'&&p.hp>0))){this.spawn('warning',e.aimX,e.aimZ,{target:e.id,timer:1.2,muzzleSlot:e.shotSequence%2,radius:2});if(this.stage.bossId!=='boss')this.spawn('warning',Math.max(-21,Math.min(21,e.aimX+(e.phase===2?6:-6))),e.aimZ,{target:e.id,timer:1.5,muzzleSlot:(e.shotSequence+1)%2,radius:2});this.events.push({type:'warning'});}e.state='sweep';e.coordinator=undefined;}}
  else if(e.timer<=0){const aim=this.entities.find(o=>o.kind==='decoy'&&o.hp>0&&o.timer>0)??this.player;e.attackWindup=e.facility==='missile'?1.1:def.windup;e.aimX=aim.x;e.aimZ=aim.z;e.state='attack';this.events.push({type:'telegraph',...cannonMuzzle(e,aim),targetId:e.id});}
 }
 private coordinate(source:Entity){
  const aim={...this.player};const allies=this.entities.filter(e=>e.id!==source.id&&(isAirEnemy(e.kind)||e.kind==='turret'&&!e.facility)&&e.hp>0&&e.z>this.fireBoundary&&e.z<this.player.z-4&&e.attackWindup<0).slice(0,2);
  for(const ally of allies){ally.coordinator=source.id;ally.attackWindup=.9;ally.aimX=aim.x;ally.aimZ=aim.z;ally.state='attack';this.events.push({type:'telegraph',...cannonMuzzle(ally,aim),targetId:ally.id,variant:'coordinated',targets:[{x:aim.x,y:AIR_HEIGHT,z:aim.z}]});}if(allies.length)this.events.push({type:'radio',text:'火控预警：协同齐射已标记当前位置，立即横移。'});
 }
 update(dt:number,input:Input){
  if(this.mode!=='playing')return;this.time+=dt;this.invincible=Math.max(0,this.invincible-dt);this.ultimateFlash=Math.max(0,this.ultimateFlash-dt);this.missileCooldown=Math.max(0,this.missileCooldown-dt);this.comboLeft=Math.max(0,this.comboLeft-dt);if(this.comboLeft===0)this.combo=0;
  const phase=this.stage.phases.reduce((a,p,i)=>this.time>=p.at?i:a,0);if(phase!==this.phase){this.phase=phase;this.radio(this.stage.phases[phase].radio);}
  const length=Math.hypot(input.x,input.z)||1;this.lastMove=input.x||input.z?{x:input.x/length,z:input.z/length}:{x:0,z:-1};this.player.x=Math.max(-22,Math.min(22,this.player.x+input.x/length*this.character.speed*dt));this.player.z=Math.max(-21,Math.min(23,this.player.z+input.z/length*this.character.speed*dt));this.player.bank+=(input.x*.45-this.player.bank)*Math.min(1,dt*9);
  if(input.missile)this.useMissiles();if(input.ultimate)this.useUltimate();
  this.updateAbilities(dt);
  this.shotTimer-=dt;if(this.shotTimer<=0){const cannon=this.character.cannon;this.shotTimer=cannon.interval;const offsets=this.level===1?[-.4,.4]:this.level===2?[-1,0,1]:[-1.4,-.7,0,.7,1.4];for(const off of offsets){const muzzle=this.playerMuzzle(off>0?1:0);this.spawn('bullet',muzzle.x,muzzle.z,{y:muzzle.y,vx:off*(this.level===3?cannon.spread:cannon.spread*.3),vz:-cannon.speed,damage:cannon.damage,radius:.26,timer:0,heavy:this.character.id==='snega',pierce:cannon.pierce,weaponId:'cannon'});}this.events.push({type:'shot',x:this.player.x,y:AIR_HEIGHT,z:this.player.z-2.8,characterId:this.character.id});}
  this.waveTimer-=dt;if(this.time<this.stage.bossAt&&this.waveTimer<=0){this.waveTimer=this.stage.phases[this.phase].interval*(this.waveIndex%4===3?1.8:1);this.wave();}
  this.pickupTimer-=dt;if(this.pickupTimer<=0&&this.time<this.stage.bossAt){this.pickupTimer=16;this.spawn(this.health<4&&this.random()>.5?'repair':'power',(this.random()-.5)*24,this.entryZ,{vz:10,radius:1.8,timer:0});}
  if(this.time>=this.stage.bossAt&&!this.bossSpawned){this.bossSpawned=true;this.spawn('boss',0,this.entryZ-9,{timer:1.3,phase:1,hp:this.stage.bossHp,maxHp:this.stage.bossHp,radius:3.2,modelId:this.stage.bossId,parts:createBossParts(this.stage)});this.events.push({type:'warning'});}
  const targets=this.entities.filter(e=>e.hp>0&&isEnemy(e.kind));
  for(const e of [...this.entities]){
   if(e.hp<=0)continue;if(isEnemy(e.kind)&&this.jamTime>0&&e.z>this.fireBoundary)e.disrupted=Math.max(e.disrupted,this.jamTime);e.disrupted=Math.max(0,e.disrupted-dt);e.marked=Math.max(0,e.marked-dt);const slowed=e.disrupted>0;e.age+=dt*(slowed?.65:1);e.timer-=dt*(slowed?.45:1);e.hitFlash=Math.max(0,e.hitFlash-dt);e.recoilX*=Math.exp(-dt*24);e.recoilZ*=Math.exp(-dt*24);
   const oldX=e.x,oldY=e.y,oldZ=e.z;
   if(isAirEnemy(e.kind)){this.steer(e,dt*(slowed?.65:1));this.enemyAttack(e,dt*(slowed?.45:1));}
   else if(e.kind==='boss'){e.z+=(-14-e.z)*Math.min(1,dt);e.x=Math.sin(e.age*.42)*(12-(e.parts?.filter(p=>p.role==='engine'&&p.hp<=0).length??0)*3);e.bank=Math.sin(e.age*.42)*.045;e.phase=e.hp<=e.maxHp*.5?2:1;this.enemyAttack(e,dt*(slowed?.45:1));}
   else if(e.kind==='turret'){e.z+=e.vz*dt;const aim=e.attackWindup>=0?{x:e.aimX,z:e.aimZ}:this.player;e.heading=Math.atan2(e.x-aim.x,e.z-aim.z);this.enemyAttack(e,dt*(slowed?.45:1));}
   else if(e.kind==='decoy'){if(e.timer<=0)e.hp=0;}
   else if(e.kind==='warning'){if(e.timer<=0){const source=this.entities.find(o=>o.id===e.target&&o.hp>0);if(source&&(!source.parts||source.parts.some(p=>p.role==='weapon'&&p.slot===e.muzzleSlot&&p.hp>0)))this.fireEnemy(source,1,38,0,{x:e.x,z:e.z},true,e.muzzleSlot);e.hp=0;}}
   else {
    if(e.kind==='missile'){const target=targets.find(t=>t.id===e.target&&t.hp>0)||targets.find(t=>t.hp>0&&t.z>this.fireBoundary);if(target){e.target=target.id;let part=target.parts?.find(p=>p.id===e.targetPart&&p.hp>0);if(!part){part=this.pickPart(target);e.targetPart=part?.id;}const point=part?modelPoint(target.modelId??'boss',target,part.position):target;const d=Math.hypot(point.x-e.x,point.z-e.z)||1;for(const key of ['x','y','z']as const){const velocity=key==='x'?'vx':key==='y'?'vy':'vz';e[velocity]+=((point[key]-e[key])/d*(e.precision?65:45)-e[velocity])*Math.min(1,dt*(e.precision?12:8));}}}
    e.x+=e.vx*dt;e.z+=e.vz*dt;e.y=Math.max(.8,Math.min(AIR_HEIGHT+1,e.y+e.vy*dt));
   }
   if(e.kind==='bullet'||e.kind==='missile'){
    const contacts:{target:Entity;t:number;volume:{x:number;y:number;z:number;radius:number;partId?:string}}[]=[];
    for(const target of targets){if(target.hp<=0||target.z<=this.fireBoundary||e.hitIds?.includes(target.id))continue;let first:typeof contacts[number]|undefined;for(const volume of collisionVolumes(target)){const t=sweptCircle(oldX,oldZ,e.x,e.z,volume.x,volume.z,volume.radius+e.radius);if(t!==null&&(!first||t<first.t))first={target,t,volume};}if(first)contacts.push(first);}
    contacts.sort((a,b)=>a.t-b.t);
    for(const {target,t,volume} of contacts){if(e.hp<=0)break;const px=oldX+(e.x-oldX)*t,pz=oldZ+(e.z-oldZ)*t,d=Math.hypot(px-volume.x,pz-volume.z)||1,normal={x:(px-volume.x)/d,y:0,z:(pz-volume.z)/d};const position={x:volume.x+normal.x*volume.radius,y:target.kind==='turret'?target.y+.8:oldY+(e.y-oldY)*t,z:volume.z+normal.z*volume.radius};
     if(e.kind==='missile')this.events.push({type:'missile-impact',...position,weight:'heavy',characterId:this.character.id});
     this.damageEnemy(target,e.damage,{position,normal,partId:volume.partId,weaponId:e.weaponId??(e.kind==='missile'?'missiles':'cannon'),weight:e.kind==='missile'||e.heavy?'heavy':'light'});(e.hitIds??=[]).push(target.id);e.pierce=(e.pierce??1)-1;if(e.pierce<=0)e.hp=0;
    }
   }
   if(e.kind==='hostile'&&e.hp>0&&e.y>AIR_HEIGHT-2){const decoy=this.entities.find(d=>d.kind==='decoy'&&d.hp>0&&d.timer>0&&sweptCircle(oldX,oldZ,e.x,e.z,d.x,d.z,e.radius+d.radius)!==null);if(decoy){e.hp=0;this.events.push({type:'hit',x:e.x,y:e.y,z:e.z,weight:'light',weaponId:'decoy'});}else if(sweptCircle(oldX,oldZ,e.x,e.z,this.player.x,this.player.z,e.radius+.65)!==null){this.damagePlayer(e.damage);e.hp=0;}}
   else if((isAirEnemy(e.kind)||e.kind==='boss')&&Math.hypot(e.x-this.player.x,e.z-this.player.z)<e.radius+.65)this.damagePlayer(e.damage);
   if((e.kind==='power'||e.kind==='repair')&&Math.hypot(e.x-this.player.x,e.z-this.player.z)<e.radius+1.1){const before=e.kind==='repair'?this.health:this.level;if(e.kind==='repair')this.health=Math.min(5,this.health+1);else{this.level=Math.min(3,this.level+1);this.score+=200;}e.hp=0;this.events.push({type:'pickup',x:e.x,y:e.y,z:e.z,pickupKind:e.kind,effect:(e.kind==='repair'?this.health:this.level)-before,text:e.kind==='repair'?(this.health>before?'耐久 +1':'耐久已满'):(this.level>before?'火力 Lv.'+this.level:'火力已满 · 得分 +200')});}
   if(e.z>38||e.z<Math.min(this.entryZ,this.groundEntryZ)-45||Math.abs(e.x)>48||e.kind==='missile'&&e.age>12)e.hp=0;
   if(this.mode!=='playing')break;
  }
  this.entities=this.entities.filter(e=>e.hp>0);
 }
 drainEvents(){const e=this.events;this.events=[];return e;}
}
