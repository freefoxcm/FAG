/// <reference types="vite/client" />
import './style.css';
import './app/presentation.css';
import {Simulation} from './game/simulation';
import {Controls} from './game/input';
import {readSave,writeSave,recordRun,isStageUnlocked} from './game/save';
import {World} from './render/world';
import {Sound} from './audio';
import {ImpactClock} from './game/impact-clock';
import {createUI,updateHUD,updateCharacterUI,updateStageUI,$} from './ui';
import {getCharacter} from './game/characters';
import {getStage,stages,type StageId} from './game/content';
import {getStory,StoryPlayer,type StoryId} from './game/story';
import {ScreenFlow,type AppScreen} from './app/flow';
import {createPresentation,renderOperations,renderBriefing,renderArchive,renderStory,renderLog} from './app/presentation';
function startGameRuntime(){
createUI();createPresentation();
const query=new URLSearchParams(location.search),save=readSave(localStorage),sim=new Simulation(getCharacter(query.get('pilot')||save.selected).id),sound=new Sound(),impactClock=new ImpactClock();
let selectedStage:StageId=getStage(query.get('stage')||save.selectedStage).id;
let bootReady=false;let world:World;let radioTimer=0,cutinTimer=0,bannerTimer=0,pickupTimer=0,loadingStage=false,resultShown=false,resultTimer=0;
let player:StoryPlayer|undefined,storyDone:(()=>void)|undefined,review=false,archiveFrom:AppScreen='operations',renderKey='',retryLoad:()=>void=()=>location.reload();
const screenIds:Partial<Record<AppScreen,string>>={title:'title',operations:'operations',briefing:'mission-briefing',story:'story-screen',archive:'archive',pause:'pause-modal',results:'results',settings:'settings'};
const flow=new ScreenFlow(()=>{
 controls.setEnabled(flow.combatActive);resetTransient();
 for(const id of Object.values(screenIds))setVisible(id!,false);
 if(screenIds[flow.screen])setVisible(screenIds[flow.screen]!,true);
 setVisible('hud',flow.screen==='combat'||flow.screen==='pause'||flow.screen==='settings'&&flow.settingsFrom==='pause');
 if(flow.screen!=='combat'&&sim.mode==='playing')sim.mode='paused';
 if(flow.screen==='combat')sim.mode='playing';
 if(flow.screen==='operations')renderOperations(selectedStage,save,sim.character.id);
 if(flow.screen==='briefing')renderBriefing(selectedStage,save,sim.character.id);
 if(flow.screen==='archive')renderArchive(save);
 if(flow.screen==='story'){renderKey='';if(player)renderStory(player);}
 if(world&&flow.screen==='pause')world.render(sim,0);
 if(world&&flow.screen==='title'){sim.mode='title';world.render(sim,0);}
});
const controls=new Controls(back,()=>{
 const active=document.activeElement;
 if(flow.screen==='operations'&&active instanceof HTMLElement&&active.hasAttribute('data-map-stage')){mapDeploy();return true;}
 if(active instanceof HTMLButtonElement||active instanceof HTMLAnchorElement)return false;
 if(flow.screen==='story'){advanceStory();return true;}
 if(flow.screen==='operations'){mapDeploy();return true;}
 if(flow.screen==='briefing'){acceptBriefing();return true;}
 return false;
});controls.setEnabled(false);
function setVisible(id:string,show:boolean){$(id).hidden=!show;}
function persist(){writeSave(localStorage,save);}
function syncSelectionURL(){const url=new URL(location.href);url.searchParams.set('pilot',sim.character.id);url.searchParams.set('stage',selectedStage);history.replaceState(null,'',url);}
function resetTransient(){clearTimeout(resultTimer);resultTimer=0;impactClock.reset();clearTimeout(radioTimer);clearTimeout(cutinTimer);clearTimeout(bannerTimer);clearTimeout(pickupTimer);for(const id of ['pickup-toast','radio','cutin','stage-banner'])setVisible(id,false);$('damage-flash').classList.remove('active');}
function operations(id=selectedStage){selectedStage=id;syncSelectionURL();if(isStageUnlocked(save,id)){save.selectedStage=id;persist();}sim.entities=[];world?.reset();flow.go('operations');}
function home(){const url=new URL(location.href);url.searchParams.delete('screen');history.replaceState(null,'',url);flow.go('title');}
function selectPilot(id:string){if(!['title','operations'].includes(flow.screen))return;sim.character=getCharacter(id);save.selected=sim.character.id;syncSelectionURL();persist();updateCharacterUI(sim.character);renderOperations(selectedStage,save,sim.character.id);}
function selectStage(id:StageId){selectedStage=id;syncSelectionURL();if(isStageUnlocked(save,id)){save.selectedStage=id;persist();}renderOperations(id,save,sim.character.id);}
function playStory(id:StoryId,done:()=>void,isReview=false){player=new StoryPlayer(getStory(id),sim.character.id,save.storySpeed==='instant'||save.reducedMotion);storyDone=done;review=isReview;if(player.scene.lines[0].cue==='alarm')sound.event({type:'warning'});renderKey='';flow.go('story');}
function completeStory(){if(!player?.finished)return;save.seenStory??=[];if(!save.seenStory.includes(player.scene.id))save.seenStory.push(player.scene.id);persist();const done=storyDone;storyDone=undefined;player=undefined;done?.();}
function advanceStory(){if(!player||player.logOpen||flow.screen!=='story')return;player.advance();completeStory();}
function openArchive(){archiveFrom=flow.screen==='title'?'title':'operations';flow.go('archive');}
function mapDeploy(){if(loadingStage||!isStageUnlocked(save,selectedStage))return;if(save.seenStory?.includes(`${selectedStage}-pre`))void prepareLaunch();else flow.go('briefing');}
function acceptBriefing(){if(loadingStage||!isStageUnlocked(save,selectedStage))return;if(save.seenStory?.includes(`${selectedStage}-pre`))void prepareLaunch();else playStory(`${selectedStage}-pre`,()=>void prepareLaunch());}
async function prepareLaunch(){if(loadingStage)return;loadingStage=true;controls.setEnabled(false);setVisible('loading',true);$('loader').hidden=false;$('reload').hidden=true;$('load-message').textContent='正在准备 '+getStage(selectedStage).name+' / '+sim.character.name+'…';retryLoad=()=>void prepareLaunch();try{await world.setCharacter(sim.character.id);await world.setStage(getStage(selectedStage));sim.stage=getStage(selectedStage);save.selectedStage=selectedStage;save.selected=sim.character.id;syncSelectionURL();persist();updateCharacterUI(sim.character);updateStageUI(sim.stage,save,sim.character.name);setVisible('loading',false);loadingStage=false;startGame();}catch(error){console.error(error);$('load-message').textContent='航线资源加载失败，请重试或返回地图。';$('loader').hidden=true;$('reload').hidden=false;loadingStage=false;}}
function startGame(){resetTransient();world.reset();sim.reset();resultShown=false;flow.go('combat');setVisible('stage-banner',true);bannerTimer=window.setTimeout(()=>setVisible('stage-banner',false),3400);updateHUD(sim,save);void sound.unlock().catch(()=>{});}
function togglePause(){if(flow.screen==='combat')flow.go('pause');else if(flow.screen==='pause')flow.go('combat');}
function back(){if(loadingStage||!$('loading').hidden)return;if(flow.screen==='settings'){flow.closeSettings();return;}if(flow.screen==='combat'||flow.screen==='pause'){togglePause();return;}if(flow.screen==='story'){if(player?.logOpen){player.logOpen=false;player.suspended=true;return;}storyDone=undefined;player=undefined;if(review)flow.go('archive');else operations();return;}if(flow.screen==='archive'){flow.go(archiveFrom);return;}if(flow.screen==='briefing'){operations();return;}if(flow.screen==='operations')home();}
function openSettings(){if(player)player.suspended=true;if(flow.screen==='combat')flow.go('pause');flow.settings();updateSettings();}
function updateSettings(){sound.setMuted(save.muted);world?.setQuality(save.quality);if(world)world.reducedMotion=save.reducedMotion;document.documentElement.classList.toggle('reduce-motion',save.reducedMotion);$('title-sound').textContent=save.muted?'声音 关':'声音 开';$('setting-sound').textContent=save.muted?'关闭':'开启';$('setting-quality').textContent=save.quality==='high'?'高 · 阴影开启':'流畅 · 阴影关闭';$('setting-motion').textContent=save.reducedMotion?'开启':'关闭';$('setting-story').textContent=save.storySpeed==='instant'?'立即显示':'逐字显示';if(player)player.instant=save.storySpeed==='instant'||save.reducedMotion;persist();}
function toggleSound(){save.muted=!save.muted;updateSettings();void sound.unlock().catch(()=>{});}
function showResult(){if(resultShown)return;resultShown=true;const won=sim.mode==='won';recordRun(save,sim.stage.id,sim.character.id,sim.score,won);persist();$('result-eyebrow').textContent=won?'MISSION COMPLETE / 命运已改写':'SIGNAL LOST / 仍有下一次机会';$('result-title').textContent=won?'这一世，我们赢了。':'重生的故事，还没结束。';$('rank').textContent=won?(sim.health>=4?'S':sim.score>=40000?'A':'B'):'RETRY';$('rank-label').textContent=sim.character.name+'：'+(won?sim.character.victory:sim.character.retry);$('result-score').textContent=sim.score.toLocaleString();$('result-combo').textContent=`${sim.maxCombo} HIT`;$('result-kills').textContent=String(sim.kills);$('result-best').textContent=(save.pilotStageBest?.[sim.stage.id]?.[sim.character.id]??0).toLocaleString();const postSeen=save.seenStory?.includes(`${sim.stage.id}-post`);$('next-stage').textContent=!postSeen?'继续剧情 →':sim.stage.id==='ocean'&&!save.seenStory?.includes('ending')?'查看终章 →':'返回作战地图 →';setVisible('next-stage',won);$('next-stage').className=won?'primary':'secondary';$('retry').className=won?'secondary':'primary';$('next-stage').style.order=won?'-1':'';flow.go('results');}
function afterVictory(){if(sim.mode!=='won')return;const next=stages[stages.indexOf(sim.stage)+1]?.id??sim.stage.id;const finish=()=>{if(sim.stage.id==='ocean'&&!save.seenStory?.includes('ending'))playStory('ending',()=>operations(next));else operations(next);};if(!save.seenStory?.includes(`${sim.stage.id}-post`))playStory(`${sim.stage.id}-post`,finish);else finish();}
$('start').onclick=()=>{void sound.unlock().catch(()=>{});if(!save.seenStory?.includes('prologue')&&!save.best&&!save.cleared?.length)playStory('prologue',()=>operations());else operations();};$('briefing').onclick=openArchive;
$('map-back').onclick=home;$('map-archive').onclick=openArchive;$('archive-back').onclick=()=>flow.go(archiveFrom);$('map-settings').onclick=openSettings;$('map-deploy').onclick=mapDeploy;$('map-briefing').onclick=()=>flow.go('briefing');$('brief-back').onclick=()=>operations();$('brief-launch').onclick=acceptBriefing;
document.querySelectorAll<HTMLButtonElement>('[data-map-stage]').forEach(b=>b.onclick=()=>selectStage(b.dataset.mapStage as StageId));document.querySelectorAll<HTMLButtonElement>('[data-pilot]').forEach(b=>b.onclick=()=>selectPilot(b.dataset.pilot!));
$('archive-scenes').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-story]');if(b&&!b.disabled)playStory(b.dataset.story as StoryId,()=>flow.go('archive'),true);};
$('story-settings').onclick=openSettings;$('story-next').onclick=advanceStory;$('story-text').onclick=advanceStory;$('story-back').onclick=back;$('story-skip').onclick=()=>{player?.skip();completeStory();};$('story-auto').onclick=()=>player?.toggleAuto();$('story-log').onclick=()=>{if(player){player.logOpen=true;player.suspended=true;renderLog(player);}};$('story-log-close').onclick=()=>{if(player){player.logOpen=false;player.suspended=true;}};
$('next-stage').onclick=afterVictory;$('pause').onclick=togglePause;$('resume').onclick=togglePause;$('quit').onclick=()=>operations(sim.stage.id);$('retry').onclick=()=>{selectedStage=sim.stage.id;void prepareLaunch();};$('home').onclick=()=>operations(sim.stage.id);
$('title-settings').onclick=openSettings;$('pause-settings').onclick=openSettings;$('close-settings').onclick=()=>flow.closeSettings();$('setting-sound').onclick=toggleSound;$('title-sound').onclick=toggleSound;$('setting-quality').onclick=()=>{save.quality=save.quality==='high'?'medium':'high';updateSettings();};$('setting-motion').onclick=()=>{save.reducedMotion=!save.reducedMotion;updateSettings();};$('setting-story').onclick=()=>{save.storySpeed=save.storySpeed==='instant'?'normal':'instant';updateSettings();};$('missile').onclick=()=>{if(flow.combatActive)sim.useMissiles();};$('ultimate').onclick=()=>{if(flow.combatActive)sim.useUltimate();};$('reload').onclick=()=>retryLoad();
$('loading').insertAdjacentHTML('beforeend','<button id="loading-back" class="text-button" hidden>返回作战地图</button>');$('loading-back').onclick=()=>{if(!bootReady||loadingStage)return;setVisible('loading',false);operations();};
function suspend(){controls.clear();if(flow.screen==='combat')togglePause();if(player)player.suspended=true;}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
window.addEventListener('keydown',e=>{if(e.repeat||loadingStage||flow.screen!=='operations')return;if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(e.code)){e.preventDefault();const index=stages.findIndex(s=>s.id===selectedStage),direction=['ArrowRight','ArrowDown'].includes(e.code)?1:-1;selectStage(stages[(index+direction+stages.length)%stages.length].id);}});
let last=performance.now(),acc=0,uiTimer=0,frameCount=0,frameTime=0,fps=0;
function tick(now:number){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);last=now;frameCount++;frameTime+=dt;if(frameTime>=1){fps=Math.round(frameCount/frameTime);frameCount=0;frameTime=0;}
 if(player&&flow.screen==='story'){player.update(dt);if(player.finished)completeStory();else{const key=[player.index,Math.floor(player.characters),player.auto,player.logOpen,player.suspended].join(':');if(key!==renderKey){renderKey=key;renderStory(player);}}}
 if(flow.screen==='combat')world.syncView(sim);
 const simulationDt=flow.combatActive&&sim.mode==='playing'?impactClock.consume(dt):0;if(simulationDt===0)acc=0;
 if(flow.combatActive&&sim.mode==='playing'){acc+=simulationDt*(sim.ultimateFlash>.2?.38:1);let steps=0;while(acc>=1/60&&steps++<8){sim.update(1/60,controls.state);acc-=1/60;}if(sim.mode!=='playing')acc=0;}else acc=0;
 const events=sim.drainEvents();impactClock.request(events);world.handle(events);for(const e of events){sound.event(e);if(e.type==='radio'){clearTimeout(radioTimer);$('radio-text').textContent=e.text||'';setVisible('radio',true);radioTimer=window.setTimeout(()=>setVisible('radio',false),6500);}if(e.type==='ultimate'){setVisible('cutin',false);void $('cutin').offsetWidth;setVisible('cutin',true);clearTimeout(cutinTimer);cutinTimer=window.setTimeout(()=>setVisible('cutin',false),1200);}if(e.type==='pickup'){clearTimeout(pickupTimer);$('pickup-toast').textContent=e.text??'';$('pickup-toast').dataset.kind=e.pickupKind??'power';setVisible('pickup-toast',true);pickupTimer=window.setTimeout(()=>setVisible('pickup-toast',false),1700);}if(e.type==='hurt'){$('damage-flash').classList.remove('active');void $('damage-flash').offsetWidth;$('damage-flash').classList.add('active');}}
 if(flow.screen==='combat')world.render(sim,dt);sound.music(flow.screen==='combat');uiTimer+=dt;if(uiTimer>.1){uiTimer=0;if(flow.screen==='combat'||flow.screen==='pause')updateHUD(sim,save);$('telemetry').textContent=`${fps} FPS / ${world.stats.drawCalls} DC / ${world.stats.activeViews} ENT`;}
 if(flow.screen==='combat'&&(sim.mode==='won'||sim.mode==='lost')&&!resultShown&&!resultTimer)resultTimer=window.setTimeout(showResult,sim.mode==='won'?1300:650);
}
async function boot(){try{sim.stage=getStage(save.selectedStage);updateCharacterUI(sim.character);updateStageUI(sim.stage,save,sim.character.name);world=new World($('world'));updateSettings();world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();$('load-message').textContent='图形连接已中断，请重新连接以恢复飞行。';$('loader').hidden=true;$('reload').hidden=false;retryLoad=()=>location.reload();setVisible('loading',true);});await world.load(sim.character.id,sim.stage);bootReady=true;$('loading-back').hidden=false;setVisible('loading',false);save.selected=sim.character.id;persist();sim.player.x=-5;sim.player.z=10;flow.go('title');requestAnimationFrame(tick);if(query.get('screen')==='operations')operations();else if(query.has('launch')){const url=new URL(location.href);url.searchParams.delete('launch');history.replaceState(null,'',url);flow.go('briefing');}if(import.meta.env.DEV){Object.assign(window,{__GAME__:{sim,world,save,startGame,home,flow,operations,playStory,prepareLaunch,get story(){return player;},get fps(){return fps;}}});if(query.has('debug'))$('telemetry').hidden=false;}}
 catch(error){console.error(error);$('load-message').textContent='资源或 WebGL 加载失败。请使用支持 WebGL 2 的桌面浏览器，并检查资源连接。';$('loader').hidden=true;$('reload').hidden=false;}}
void boot();
}
if(new URLSearchParams(location.search).has('hangar'))void import('./render/hangar').then(m=>m.startHangar());else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('preview'))void import('./render/model-preview').then(m=>m.startModelPreview());else startGameRuntime();
