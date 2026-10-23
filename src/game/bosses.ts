import type {StageDefinition} from './content';
export interface BossPart {id:string;name:string;role:'weapon'|'engine'|'radar'|'shield';position:number[];radius:number;hp:number;maxHp:number;slot?:number}
export function createBossParts(stage:StageDefinition):BossPart[]{
 const roles:BossPart['role'][]=stage.bossId==='boss'?['weapon','engine']:stage.bossId==='prism'?['weapon','radar']:['weapon','shield'];
 return roles.flatMap((role,i)=>[-1,1].map((side,j)=>({id:`part_${i*2+j}`,name:(side<0?'左':'右')+({weapon:'炮组',engine:'引擎',radar:'雷达',shield:'护盾'}[role]),role,position:[side*(i===0?5.1:7.4),i===0?.45:.3,i===0?-2.8:2.1],radius:i===0?1.45:1.7,hp:stage.bossId==='boss'?85:105,maxHp:stage.bossId==='boss'?85:105,slot:i===0?j:undefined})));
}
