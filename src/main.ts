/// <reference types="vite/client" />
import './style.css';
import {Simulation} from './game/simulation';
import {Controls} from './game/input';
import {readSave,writeSave} from './game/save';
import {World} from './render/world';
import {Sound} from './audio';
import {ImpactClock} from './game/impact-clock';
import {createUI,updateHUD,updateCharacterUI,$} from './ui';
import {getCharacter} from './game/characters';

function startGameRuntime(){
createUI();
const query=new URLSearchParams(location.search),save=readSave(localStorage),sim=new Simulation(getCharacter(query.get('pilot')||save.selected).id),sound=new Sound(),impactClock=new ImpactClock();
let world:World;let dialogIndex=0;let settingsFrom:'title'|'paused'='title';let radioTimer=0,cutinTimer=0,bannerTimer=0;let resultShown=false;let resultTimer=0;
const controls=new Controls(togglePause,()=>{if(!$('settings').hidden||!$('briefing-modal').hidden)return false;if(sim.mode==='intro'){advanceDialog();return true;}return false;});
function dialogue(){const c=sim.character;return [{speaker:'指挥官 / 记忆恢复中',text:'这里是……临港？三分钟前，我们明明已经坠落了。'},{speaker:c.name+' / 数据链重连',text:'意识和同步率正常。指挥官，你看起来像是提前知道了答案。'},{speaker:'指挥官 / 第二次机会',text:'上一世，我们没能飞出这座城。这一次，换他们逃。'},{speaker:c.name+' / 飞行构型就绪',text:c.intro}];}
async function selectPilot(id:string){if(sim.mode!=='title')return;const c=getCharacter(id);setVisible('loading',true);$('loader').hidden=false;$('reload').hidden=true;$('load-message').textContent='正在加载'+c.name+'的战斗构型…';try{const portrait=new Image();portrait.src=c.portrait;await Promise.all([world.setCharacter(c.id),portrait.decode()]);sim.character=c;const url=new URL(location.href);url.searchParams.set('pilot',c.id);history.replaceState(null,'',url);save.selected=c.id;writeSave(localStorage,save);updateCharacterUI(c);controls.clear();setVisible('loading',false);}catch(error){console.error(error);$('load-message').textContent='构型加载失败，请重新连接后重试。';$('loader').hidden=true;$('reload').hidden=false;}}
function setVisible(id:string,show:boolean){$(id).hidden=!show;}
function hideMenus(){for(const id of ['title','intro','pause-modal','settings','briefing-modal','results'])setVisible(id,false);}
function resetTransient(){clearTimeout(resultTimer);resultTimer=0;impactClock.reset();clearTimeout(radioTimer);clearTimeout(cutinTimer);clearTimeout(bannerTimer);setVisible('radio',false);setVisible('cutin',false);setVisible('stage-banner',false);$('damage-flash').classList.remove('active');}
function startIntro(){hideMenus();sim.mode='intro';dialogIndex=0;setVisible('intro',true);setVisible('hud',false);showDialog();void sound.unlock().catch(()=>{});controls.clear();}
function showDialog(){const dialogs=dialogue(),d=dialogs[dialogIndex];$('speaker').textContent=d.speaker;$('dialog-text').textContent=d.text;$('dialog-next').innerHTML=dialogIndex===dialogs.length-1?'出击 <span>↗</span>':'继续 <span>→</span>';}
function advanceDialog(){if(dialogIndex<dialogue().length-1){dialogIndex++;showDialog();}else startGame();}
function startGame(){hideMenus();resetTransient();world.reset();sim.reset();controls.clear();resultShown=false;setVisible('hud',true);setVisible('stage-banner',true);bannerTimer=window.setTimeout(()=>setVisible('stage-banner',false),3400);updateHUD(sim,save);void sound.unlock().catch(()=>{});}
function home(){hideMenus();resetTransient();world.reset();sim.entities=[];sim.player={x:-5,z:10,bank:0};sim.mode='title';controls.clear();setVisible('hud',false);setVisible('title',true);}
function togglePause(){if(!$('settings').hidden){closeSettings();return;}if(sim.mode==='playing'){sim.mode='paused';controls.clear();setVisible('pause-modal',true);}else if(sim.mode==='paused'){sim.mode='playing';controls.clear();setVisible('pause-modal',false);}}
function openSettings(){settingsFrom=sim.mode==='paused'?'paused':'title';setVisible('pause-modal',false);setVisible('settings',true);updateSettings();}
function closeSettings(){setVisible('settings',false);if(settingsFrom==='paused')setVisible('pause-modal',true);}
function updateSettings(){sound.setMuted(save.muted);world?.setQuality(save.quality);if(world)world.reducedMotion=save.reducedMotion;$('title-sound').textContent=save.muted?'声音 关':'声音 开';$('setting-sound').textContent=save.muted?'关闭':'开启';$('setting-quality').textContent=save.quality==='high'?'高 · 阴影开启':'流畅 · 阴影关闭';$('setting-motion').textContent=save.reducedMotion?'开启':'关闭';writeSave(localStorage,save);}
function toggleSound(){save.muted=!save.muted;updateSettings();void sound.unlock().catch(()=>{});}
function showResult(){if(resultShown)return;resultShown=true;controls.clear();save.best=Math.max(save.best,sim.score);save.pilotBest??={};save.pilotBest[sim.character.id]=Math.max(save.pilotBest[sim.character.id]??0,sim.score);writeSave(localStorage,save);const won=sim.mode==='won';$('result-eyebrow').textContent=won?'MISSION COMPLETE / 命运已改写':'SIGNAL LOST / 仍有下一次机会';$('result-title').textContent=won?'这一世，我们赢了。':'重生的故事，还没结束。';$('rank').textContent=won?(sim.health>=4?'S':sim.score>=40000?'A':'B'):'RETRY';$('rank-label').textContent=sim.character.name+'：'+(won?sim.character.victory:sim.character.retry);$('result-score').textContent=sim.score.toLocaleString();$('result-combo').textContent=`${sim.maxCombo} HIT`;$('result-kills').textContent=String(sim.kills);$('result-best').textContent=(save.pilotBest?.[sim.character.id]??0).toLocaleString();setVisible('results',true);setVisible('radio',false);}
document.querySelectorAll<HTMLButtonElement>('[data-pilot]').forEach(b=>b.onclick=()=>void selectPilot(b.dataset.pilot!));
$('start').onclick=startIntro;$('briefing').onclick=()=>setVisible('briefing-modal',true);$('briefing-start').onclick=startIntro;$('close-briefing').onclick=()=>setVisible('briefing-modal',false);$('dialog-next').onclick=advanceDialog;$('skip').onclick=startGame;$('pause').onclick=togglePause;$('resume').onclick=togglePause;$('quit').onclick=home;$('retry').onclick=startGame;$('home').onclick=home;
$('title-settings').onclick=openSettings;$('pause-settings').onclick=openSettings;$('close-settings').onclick=closeSettings;$('setting-sound').onclick=toggleSound;$('title-sound').onclick=toggleSound;$('setting-quality').onclick=()=>{save.quality=save.quality==='high'?'medium':'high';updateSettings();};$('setting-motion').onclick=()=>{save.reducedMotion=!save.reducedMotion;updateSettings();};$('missile').onclick=()=>sim.useMissiles();$('ultimate').onclick=()=>sim.useUltimate();$('reload').onclick=()=>location.reload();
window.addEventListener('blur',()=>{controls.clear();if(sim.mode==='playing')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&sim.mode==='playing')togglePause();});
let last=performance.now(),acc=0,uiTimer=0,frameCount=0,frameTime=0,fps=0;
function tick(now:number){requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.1);last=now;frameCount++;frameTime+=dt;if(frameTime>=1){fps=Math.round(frameCount/frameTime);frameCount=0;frameTime=0;}
 world.syncView(sim);
 const simulationDt=sim.mode==='playing'?impactClock.consume(dt):0;if(simulationDt===0)acc=0;
 if(sim.mode==='playing'){acc+=simulationDt*(sim.ultimateFlash>.2?.38:1);let steps=0;while(acc>=1/60&&steps++<8){sim.update(1/60,controls.state);acc-=1/60;}if(sim.mode!=='playing')acc=0;}else acc=0;
 const events=sim.drainEvents();impactClock.request(events);world.handle(events);for(const e of events){sound.event(e);if(e.type==='radio'){clearTimeout(radioTimer);$('radio-text').textContent=e.text||'';setVisible('radio',true);radioTimer=window.setTimeout(()=>setVisible('radio',false),6500);}if(e.type==='ultimate'){setVisible('cutin',false);void $('cutin').offsetWidth;setVisible('cutin',true);clearTimeout(cutinTimer);cutinTimer=window.setTimeout(()=>setVisible('cutin',false),1200);}if(e.type==='hurt'){$('damage-flash').classList.remove('active');void $('damage-flash').offsetWidth;$('damage-flash').classList.add('active');}}
 world.render(sim,sim.mode==='paused'?0:dt);sound.music(sim.mode==='playing');uiTimer+=dt;if(uiTimer>.1){uiTimer=0;updateHUD(sim,save);$('telemetry').textContent=`${fps} FPS / ${world.stats.drawCalls} DC / ${world.stats.activeViews} ENT`;}
 if((sim.mode==='won'||sim.mode==='lost')&&!resultShown&&!resultTimer)resultTimer=window.setTimeout(showResult,sim.mode==='won'?1300:650);
}
async function boot(){try{updateCharacterUI(sim.character);world=new World($('world'));updateSettings();world.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(sim.mode==='playing')togglePause();$('load-message').textContent='图形连接已中断，请重新连接以恢复飞行。';$('loader').hidden=true;$('reload').hidden=false;setVisible('loading',true);});await Promise.all([world.load(sim.character.id),($('title').querySelector('img') as HTMLImageElement).decode()]);setVisible('loading',false);save.selected=sim.character.id;writeSave(localStorage,save);sim.player.x=-5;sim.player.z=10;requestAnimationFrame(tick);if(query.has('launch')){const url=new URL(location.href);url.searchParams.delete('launch');history.replaceState(null,'',url);startIntro();}if(import.meta.env.DEV){Object.assign(window,{__GAME__:{sim,world,save,startGame,home,get fps(){return fps;}}});if(new URLSearchParams(location.search).has('debug'))$('telemetry').hidden=false;}}
 catch(error){console.error(error);$('load-message').textContent='资源或 WebGL 加载失败。请使用支持 WebGL 2 的桌面浏览器，并检查资源连接。';$('loader').hidden=true;$('reload').hidden=false;}}
void boot();
}
if(new URLSearchParams(location.search).has('hangar'))void import('./render/hangar').then(m=>m.startHangar());else if(import.meta.env.DEV&&new URLSearchParams(location.search).has('preview'))void import('./render/model-preview').then(m=>m.startModelPreview());else startGameRuntime();
