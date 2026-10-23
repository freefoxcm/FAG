import {siteUrl} from './site-url';
import {airframeRoster,type AirframeId} from './roster';
export interface WeaponDefinition{id:string;name:string;cooldown:number;damage:number;description:string}
export interface CharacterDefinition{
 id:AirframeId;name:string;callsign:string;color:string;health:number;speed:number;model:string;portrait:string;
 cannon:{interval:number;damage:number;speed:number;spread:number;pierce:number};weapons:[WeaponDefinition,WeaponDefinition,WeaponDefinition];
 intro:string;opening:string;phases:[string,string,string];victory:string;retry:string;
}
const weapon=(id:string,name:string,cooldown:number,damage:number,description:string):WeaponDefinition=>({id,name,cooldown,damage,description});
function define(id:AirframeId,speed:number,cannon:CharacterDefinition['cannon'],small:WeaponDefinition,ultimate:WeaponDefinition,voice:Pick<CharacterDefinition,'intro'|'opening'|'phases'|'victory'|'retry'>):CharacterDefinition{
 const a=airframeRoster.find(a=>a.id===id)!;return{id,name:a.name,callsign:a.serial,color:a.color,health:5,speed,model:siteUrl(`assets/models/${id}.glb`),portrait:siteUrl(id==='qingluan'?'assets/qingluan.webp':`assets/roster/${id}-portrait.webp`),cannon,weapons:[weapon('cannon',id==='snega'?'霜锋重炮':'航空脉冲炮',cannon.interval,cannon.damage,id==='snega'?'低射速穿甲弹，可贯穿三个目标。':'自动射击，拾取强化增加弹道。'),small,ultimate],...voice};
}
export const characters:Record<AirframeId,CharacterDefinition>={
 qingluan:define('qingluan',17,{interval:.125,damage:1,speed:78,spread:1.3,pierce:1},weapon('missiles','青羽齐射',9,8,'六枚导弹自动分配前方目标。'),weapon('ultimate','天穹裁决',0,55,'清除全屏敌弹，对可见敌人发动范围裁决。'),{intro:'青鸾，双发点火。你的第二次人生——我来护航。',opening:'这次他们学会了迂回。指挥官，别只盯着正前方。',phases:['重装机出现了。留意炮口预警，准备横向机动。','支援机正在迂回。用青羽齐射，把它们拉回交战区。','目标确认——长夜。天亮之前，送它坠落。'],victory:'这一次，我们一起飞出了这座城。',retry:'抬起头。下一次，我依然与你并肩。'}),
 akari:define('akari',20,{interval:.115,damage:1,speed:96,spread:.35,pierce:1},weapon('precision','朱羽点杀',8,9,'六枚高速导弹集中打击准星附近的同一目标。'),weapon('lance','绯空一线',0,105,'锁定前方目标方向，贯穿狭长航线上的敌人和弹幕。'),{intro:'明璃，单发就绪。给我一条航线，剩下的交给精准。',opening:'目标多不代表麻烦。选中最危险的那个，一击即离。',phases:['厚装甲确认。朱羽点杀，集中火力别分散。','港区航线复杂。找准角度，让他们排成一线。','长夜已进入视野。指挥官，把那条航线交给我。'],victory:'目标确认，打击完成。下一条航线，由我们选择。',retry:'偏差已记录。下一次，我会更准。'}),
 haneul:define('haneul',17.5,{interval:.14,damage:1,speed:82,spread:1,pierce:1},weapon('decoy','镜像诱饵',10,0,'在侧前方部署四秒诱饵，吸引新一轮瞄准并拦截敌弹。'),weapon('jam','苍穹静默',0,30,'清除弹幕并干扰敌机七秒：减速、延迟射击，受到伤害增加。'),{intro:'苍穹，数据链接入。这次，我们比命运多知道一步。',opening:'先别急着冲锋。让他们把炮口对准一个不存在的答案。',phases:['重装火控已解析。诱饵必须提前部署，已锁定的射击不会改向。','港区电磁噪声增加。静默窗口里，优先处理支援机。','长夜信号确认。再复杂的火控，也有它的盲区。'],victory:'通信恢复。指挥官，天空重新属于我们。',retry:'数据没有白费。我已经找到下一次的突破口。'}),
 astra:define('astra',18,{interval:.13,damage:1,speed:88,spread:.8,pierce:1},weapon('wingmen','双隼编队',11,1,'呼叫双无人僚机支援七秒，自动瞄准前方目标。'),weapon('network','星链协同',0,20,'清除弹幕，标记目标六秒并发射十二枚协同导弹；标记目标受到伤害增加。'),{intro:'星隼，协同网络在线。你做决定，我让每一份火力都到位。',opening:'僚机待命。别独自追着每个目标跑，让火力替你延伸视线。',phases:['重装目标上线。编队就位，集中覆盖它的攻击窗口。','多目标环境确认。标记优先级，让每一枚导弹都有去处。','长夜进入协同网络。我们一起把它从天空中划掉。'],victory:'所有单元返航。指挥官，这场胜利属于整个编队。',retry:'队形可以重整。下一次，我还会在你的翼侧。'}),
 snega:define('snega',15,{interval:.21,damage:2.2,speed:90,spread:.4,pierce:3},weapon('dash','矢量突进',7,0,'沿移动方向冲刺并短暂免伤；未移动时向前冲刺。'),weapon('barrage','极寒破阵',0,18,'清除弹幕，连续发射五发宽幅重型穿甲弹。'),{intro:'霜翼，双发稳定。守好你的航线，我来穿过风暴。',opening:'惯性很大，但我知道怎么停下。重炮负责开路，突进留给险境。',phases:['重装目标？正合我意。让穿甲弹沿他们的队形走。','不要追每一架轻机。等它们靠近，再打穿整条阵线。','长夜。够重，才值得我认真击落。'],victory:'航线已清空。走吧，指挥官，我们回家。',retry:'我还撑得住。下一次，别让风暴抢在我们前面。'})
};
export const qingluan=characters.qingluan;
export function getCharacter(id:unknown){return typeof id==='string'&&Object.hasOwn(characters,id)?characters[id as AirframeId]:qingluan;}
