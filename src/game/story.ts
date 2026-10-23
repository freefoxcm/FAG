import {getCharacter} from './characters';
import {stages,type StageId} from './content';
import type {AirframeId} from './roster';
import type {SaveData} from './save';
export type StoryId='prologue'|'lingang-pre'|'lingang-post'|'canyon-pre'|'canyon-post'|'ocean-pre'|'ocean-post'|'ending';
export type Speaker='commander'|'system'|'pilot'|AirframeId;
export interface StoryLine{speaker:Speaker;text:string;variants?:Record<AirframeId,string>;cue?:'alarm'|'radio'}
export interface StoryScene{id:StoryId;title:string;subtitle:string;background:StageId;kind:'prologue'|'pre'|'post'|'ending';stage?:StageId;lines:StoryLine[]}
const line=(speaker:Speaker,text:string):StoryLine=>({speaker,text});
const response=(qingluan:string,akari:string,haneul:string,astra:string,snega:string):StoryLine=>({speaker:'pilot',text:qingluan,variants:{qingluan,akari,haneul,astra,snega}});
export const storyScenes:StoryScene[]=[
 {id:'prologue',title:'序章 · 第二条航线',subtitle:'临港陷落前 / 记忆重新接入',background:'lingang',kind:'prologue',lines:[
 {...line('system','警告。临港防空网络失联，右侧发动机温度超过阈值。'),cue:'alarm'},
 line('commander','我记得这道警报。上一世，下一秒就是我们坠落的时刻。'),
 line('qingluan','指挥官，听得见吗？你刚刚喊出了还没发生的攻击。'),
 line('commander','把航向向左偏三度。现在。'),
 line('system','未知导弹越过原定航线。同步链恢复。'),
 line('qingluan','……你救了我们一次。看来那段记忆是真的。'),
 line('haneul','五条数据链均在线。我可以确认：这里仍是临港陷落之前。'),
 line('astra','既然有第二次机会，就把它变成所有人的航线。'),
 line('snega','先活着飞出去。接下来该撞开的东西，我来。'),
 line('commander','上一世，我们没能离开这座城。这一次，我会把你们都带回来。')]},
 {id:'lingang-pre',title:'第一章 · 重返临港',subtitle:'战前通信 / 城市低空',background:'lingang',kind:'pre',stage:'lingang',lines:[
 line('commander','入口的无人机只是诱饵。真正的封锁在港区上空。'),
 line('qingluan','长夜。上一条航线尽头，就是它的火控。'),
 line('haneul','我会标出协同信号。先拆支援机，重装编队就会失去齐射引导。'),
 response('青羽已经装填。你负责指出那条活路，我负责把天空清开。','这条航线够窄。正好，让我把最危险的目标逐个划掉。','我会把诱饵提前放出去。让他们先对一个错误答案开火。','双隼待命。指挥官，你的视线之外也有我们的火力。','重炮就绪。别追每一架轻机，给我一条能打穿的阵线。'),
 line('akari','港区的炮塔和引擎不是一整块装甲。看准间隙，一处一处拆。'),
 line('astra','补给舱已经标记。金色箭头强化主炮，绿色加号恢复耐久。'),
 response('我就是你的战机。第二次人生，从这次双发点火开始。','明璃，飞行构型就绪。指挥官，这次让准星走在命运前面。','苍穹，传感器接入。我们会比敌人的火控多知道一步。','星隼，协同链确认。每一份火力都会抵达你的航线。','霜翼，矢量喷口稳定。风暴会来，我也会在。'),
 line('commander','全队同步。目标：突破临港，击落长夜。')]},
 {id:'lingang-post',title:'第一章 · 长夜将尽',subtitle:'战后记录 / 第一条线索',background:'lingang',kind:'post',stage:'lingang',lines:[
 line('system','长夜核心失去响应。城市出口恢复通行。'),
 line('commander','我们真的飞出来了。上一世没有这一段记忆。'),
 response('那就从这里开始，写我们自己的下一段。','航线已经不同了。接下来的目标，也不必按旧答案走。','时间线出现偏移。好消息是，这次偏移站在我们这边。','所有单元还在链路里。指挥官，这是第一份完整的返航名单。','我说过会撞开它。现在，把下一堵墙告诉我。'),
 line('haneul','黑匣子里有持续发送的坐标。指挥信号来自山地雷达基地。'),
 line('akari','所以长夜只是门锁。钥匙还在峡谷里。'),
 line('commander','锁定下一条航线。我们去切断那张网。')]},
 {id:'canyon-pre',title:'第二章 · 峡谷断链',subtitle:'战前会议 / 山地雷达走廊',background:'canyon',kind:'pre',stage:'canyon',lines:[
 line('haneul','峡谷中的雷达把我们的飞行数据转发给整个防空网。'),
 line('commander','上一世每一次躲避，都会迎来下一轮提前瞄准。原来原因在这里。'),
 line('astra','我们会从外围保持数据链。山口的截击机交给前线。'),
 response('我能清开弹幕，但不能替你选每一个间隙。我们一起看。','横切的目标更适合点杀。别追尾迹，瞄准它将要经过的位置。','雷达也是目标。拆掉地面阵列，就能打断还没发出的齐射。','让我延伸你的火力。你守住走位，双隼负责追上它们。','峡谷不宽，足够我的炮弹通过。突进留给被火网封住的那一刻。'),
 line('qingluan','终局目标棱镜有两组雷达。它们损坏后，额外追踪攻击就会停止。'),
 line('snega','给重装机一点耐心。它开火的前摇，就是我们的攻击窗口。'),
 response('青鸾接替前线。指挥官，按我们自己的节奏飞。','明璃确认。给我棱镜的坐标，其余交给精度。','苍穹确认。这一次，让雷达成为看不见我们的那一方。','星隼确认。即使在山影里，我们也不会彼此失联。','霜翼确认。航线再窄，我也会带你穿过去。'),
 line('commander','目标明确：穿过山口，摧毁棱镜，切断指挥网络。')]},
 {id:'canyon-post',title:'第二章 · 信号之外',subtitle:'战后记录 / 远海坐标',background:'canyon',kind:'post',stage:'canyon',lines:[
 line('system','雷达转发终止。棱镜核心离线。'),
 line('haneul','截获最后一次上行通信。源头在远海舰队，代号：天幕。'),
 line('commander','我们终于走到了旧记忆之外。之后的路，我也不知道答案。'),
 response('很好。那你就不用一个人背着答案飞了。','不知道答案，也不妨碍瞄准目标。我们重新计算。','未知不等于失控。我会把每一条新信号读给你听。','这次不是你一个人的预判。整个编队都在替你看。','那就一起试。至少这一次，没人会留在山影里。'),
 line('astra','我已把海上目标共享到五条链路。所有人都准备好了。'),
 line('commander','返航补给，然后越过岛链。最后这段路，我们一起走。')]},
 {id:'ocean-pre',title:'第三章 · 远海破晓',subtitle:'战前会议 / 舰队防空圈',background:'ocean',kind:'pre',stage:'ocean',lines:[
 line('akari','舰载防空从低处起射。先看预警，再沿横向离开锁定位置。'),
 line('haneul','天幕仍在广播同一份封锁指令。只要核心还在，防空网就会重组。'),
 line('commander','我们已经失去过一次天空。这次，轮到它失去护盾。'),
 response('青羽锁定发生器。你靠走位拆部件，我替你追住那些间隙。','发生器是独立目标。朱羽会优先跟上前方的部件。','把静默留在它最密集的火力窗口。剩下的时间，我们主动进攻。','标记网络已经就绪。先拆护盾，再把所有视线交给核心。','炮组、发生器、核心。再厚的防线，也是一段段可以打穿的结构。'),
 line('snega','别把所有火力交给护盾。炮组拆掉，返航的人就能多一点。'),
 line('astra','外围链路保持畅通。前线随时可以请求支援，我们都听得见。'),
 response('指挥官，我们不用再重复那一次坠落了。','这一次，我们会一起确认最后一个目标消失。','你的第二次机会，现在也是我们的选择。','所有单元与你同航。最后一段，开始同步。','守住航线。我会和你一起看见天亮。'),
 line('commander','全队，开始最后一次突入。目标：天幕核心。')]},
 {id:'ocean-post',title:'第三章 · 黎明抵达',subtitle:'战后记录 / 防空网络终止',background:'ocean',kind:'post',stage:'ocean',lines:[
 line('system','天幕核心离线。封锁指令终止。'),
 line('haneul','没有新的火控信号。临港、峡谷与远海的链路都恢复了。'),
 response('看见了吗？没有坠落，只有返航。','最后一个目标确认消失。接下来，选一条回家的航线。','信号里终于没有警报了。指挥官，听听现在的天空。','五条链路，全员回应。我们的返航名单终于完整了。','风暴过去了。你答应带我们回来，现在轮到我护着你。'),
 line('commander','我记得上一世最后的声音。但这一刻，我更想记住你们。'),
 line('qingluan','那就记住。我们都在这里。'),
 line('astra','返航航线已确认。指挥官，欢迎来到新的明天。')]},
 {id:'ending',title:'终章 · 我们的下一次',subtitle:'战役完成 / 全员返航',background:'ocean',kind:'ending',lines:[
 line('commander','我曾以为重生只是为了改写自己的结局。'),
 line('qingluan','现在你知道，是为了让所有人都有下一次。'),
 line('akari','下次出击，记得早点叫我。航线可以再漂亮一点。'),
 line('haneul','作战记录已归档。以及，今天的存活率是百分之百。'),
 line('astra','新的坐标还会出现。不过这一次，我们有完整的编队。'),
 line('snega','先休息。天空够大，不用急着在一天里飞完。'),
 line('commander','好。下一次，也请继续和我并肩。'),
 line('system','天穹计划：三条航线已完成。新的故事，由你再次起飞。')]}
];
export function getStory(id:StoryId){return storyScenes.find(s=>s.id===id)!;}
export function isStoryUnlocked(scene:StoryScene,save:SaveData){if(scene.kind==='prologue')return true;if(scene.kind==='ending')return stages.every(s=>save.cleared?.includes(s.id));if(scene.kind==='post')return !!scene.stage&&!!save.cleared?.includes(scene.stage);const index=stages.findIndex(s=>s.id===scene.stage);return index===0||index>0&&!!save.cleared?.includes(stages[index-1].id);}
export function resolveLine(line:StoryLine,pilot:AirframeId){const id=line.speaker==='pilot'?pilot:line.speaker;return {...line,speaker:id,name:id==='commander'?'指挥官':id==='system'?'系统':getCharacter(id).name,text:(line.variants?.[pilot]??line.text).replaceAll('{pilot}',getCharacter(pilot).name)};}

/** UI-independent playback clock; backgrounding/log/settings stop both typing and auto advance. */
export class StoryPlayer{
 index=0;characters=0;wait=0;finished=false;auto=false;suspended=false;logOpen=false;
 constructor(public scene:StoryScene,public pilot:AirframeId,public instant=false){if(instant)this.characters=Array.from(this.text).length;}
 get text(){return resolveLine(this.scene.lines[this.index],this.pilot).text;}
 get complete(){return this.characters>=Array.from(this.text).length;}
 get visibleText(){return Array.from(this.text).slice(0,Math.floor(this.characters)).join('');}
 advance(){if(this.finished||this.logOpen)return;this.suspended=false;if(!this.complete){this.characters=Array.from(this.text).length;this.wait=0;return;}if(this.index===this.scene.lines.length-1){this.finished=true;return;}this.index++;this.characters=this.instant?Array.from(this.text).length:0;this.wait=0;}
 update(dt:number){if(this.finished||this.suspended||this.logOpen)return;if(!this.complete){this.characters=Math.min(Array.from(this.text).length,this.characters+Math.max(0,dt)*35);return;}if(this.auto){this.wait+=Math.max(0,dt);if(this.wait>=Math.min(4,Math.max(1.5,Array.from(this.text).length*.065)))this.advance();}}
 toggleAuto(){if(this.suspended){this.suspended=false;this.auto=true;}else this.auto=!this.auto;this.wait=0;}
 skip(){if(!this.finished)this.finished=true;}
}
