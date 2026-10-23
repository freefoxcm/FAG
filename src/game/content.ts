import {siteUrl} from './site-url';
import type {AirKind} from './enemies';
export {characters,getCharacter,qingluan,type CharacterDefinition,type WeaponDefinition} from './characters';
export type StageId='lingang'|'canyon'|'ocean';
export interface StageDefinition {
 id:StageId;name:string;subtitle:string;environment:'city'|'canyon'|'ocean';bossId:'boss'|'prism'|'canopy';bossName:string;bossHp:number;bossAt:number;
 phases:{at:number;name:string;objective:string;radio:string;formation:AirKind[];interval:number}[];intro:string;
}
export const assets={qingluan:siteUrl('assets/models/qingluan.glb'),portrait:siteUrl('assets/qingluan.webp')};
export const stages:StageDefinition[]=[
 {id:'lingang',name:'重返临港',subtitle:'城市低空 / 夺回出海航线',environment:'city',bossId:'boss',bossName:'长夜 · 空中堡垒',bossHp:1800,bossAt:200,
 intro:'临港依然在燃烧。但这一次，我们知道封锁线的弱点。穿过城市，击落长夜。',phases:[
 {at:0,name:'01 / 城市入口',objective:'突破封锁 · 清除无人机编队',radio:'编队从前方进入。先拾取金色武器舱，建立火力优势。',formation:['drone','drone','interceptor'],interval:4.2},
 {at:50,name:'02 / 长街突袭',objective:'压制防空 · 拆散重装编队',radio:'重装机压制中路，截击机从侧面包抄。留意炮口。',formation:['heavy','drone','interceptor'],interval:4.5},
 {at:110,name:'03 / 港区交火',objective:'优先击毁支援机 · 打断协同',radio:'支援机正在标记航线。先拆掉它，齐射就会中断。',formation:['support','interceptor','heavy'],interval:4.3},
 {at:200,name:'04 / 长夜将尽',objective:'破坏炮塔削弱火力 · 击毁核心',radio:'长夜已到。炮塔与引擎可以分别击破，选择你的突破口。',formation:[],interval:5}]},
 {id:'canyon',name:'峡谷断链',subtitle:'山地雷达 / 切断指挥网络',environment:'canyon',bossId:'prism',bossName:'棱镜 · 电子战平台',bossHp:2000,bossAt:215,
 intro:'临港的数据链指向山地基地。雷达将我们的航线暴露给整个机群——穿过峡谷，切断它。',phases:[
 {at:0,name:'01 / 穿越山口',objective:'迎击横切截击机 · 守住航线',radio:'岩壁上方有截击信号。不要把所有火力留在中路。',formation:['interceptor','drone','interceptor'],interval:4.6},
 {at:60,name:'02 / 雷达走廊',objective:'摧毁地面雷达 · 打断协同齐射',radio:'地面雷达也在引导齐射。摧毁阵列，为自己争取窗口。',formation:['support','heavy','interceptor'],interval:4.5},
 {at:125,name:'03 / 基地突入',objective:'穿过防空网 · 保存大招',radio:'基地就在前方。留下一次大招，准备处理电子战平台。',formation:['heavy','interceptor','support'],interval:4.2},
 {at:215,name:'04 / 棱镜失焦',objective:'击破雷达取消追踪 · 摧毁核心',radio:'棱镜在重定向火控。拆掉雷达，就能终止它的协同锁定。',formation:[],interval:5}]},
 {id:'ocean',name:'远海破晓',subtitle:'岛链舰队 / 终结天幕封锁',environment:'ocean',bossId:'canopy',bossName:'天幕 · 空中母舰',bossHp:2000,bossAt:230,
 intro:'最后的指令来自远海舰队。越过岛链，突破舰载防空，把天幕从黎明前的天空中抹去。',phases:[
 {at:0,name:'01 / 海岸出击',objective:'突破舰载防空 · 清理护航机',radio:'舰载炮从低处起射。看准预警，给自己留出横移空间。',formation:['drone','interceptor','heavy'],interval:4.6},
 {at:65,name:'02 / 岛链交锋',objective:'截断支援编队 · 夺取补给',radio:'岛链中的支援机正在重组。逐个拆散它们，不要追入交叉火力。',formation:['support','interceptor','interceptor'],interval:4.2},
 {at:135,name:'03 / 舰队上空',objective:'压制导弹阵地 · 迎战母舰',radio:'母舰护盾有独立发生器。准备把防线一层层剥开。',formation:['heavy','support','interceptor'],interval:4.4},
 {at:230,name:'04 / 破晓之翼',objective:'破坏护盾发生器 · 击毁母舰',radio:'天幕就在这里。先处理发生器，再把全部火力交给核心。',formation:[],interval:5}]}
];
export const stage=stages[0];
export function getStage(id:unknown){return stages.find(s=>s.id===id)??stage;}
