import manifest from './model-manifest.json';
export type EnemyKind='drone'|'interceptor'|'heavy'|'support'|'boss'|'turret';
export type AirKind=Exclude<EnemyKind,'turret'|'boss'>;
export interface EnemyDefinition {id:EnemyKind;name:string;health:number;speed:number;acceleration:number;cooldown:number;windup:number;shots:number;model?:keyof typeof manifest;dodge?:{reaction:number;cooldown:number;distance:number};score:number}
export const enemyDefinitions:Record<EnemyKind,EnemyDefinition>={
 drone:{id:'drone',name:'蜂群 / 编队机',health:3,speed:13,acceleration:25,cooldown:2.6,windup:.65,shots:1,model:'drone',score:100},
 interceptor:{id:'interceptor',name:'矛隼 / 截击机',health:5,speed:18,acceleration:40,cooldown:2.4,windup:.65,shots:2,model:'interceptor',dodge:{reaction:.25,cooldown:2.5,distance:3},score:200},
 heavy:{id:'heavy',name:'铁背 / 重装机',health:18,speed:9,acceleration:18,cooldown:3.2,windup:1,shots:5,model:'heavy',score:450},
 support:{id:'support',name:'夜鸮 / 支援机',health:8,speed:12,acceleration:25,cooldown:2.1,windup:.8,shots:3,model:'support',score:300},
 boss:{id:'boss',name:'长夜 / 空中堡垒',health:900,speed:7,acceleration:18,cooldown:2.3,windup:.7,shots:5,model:'boss',score:20000},
 turret:{id:'turret',name:'岸防炮台',health:12,speed:5,acceleration:0,cooldown:3.5,windup:.8,shots:3,score:250}
};
export const modelDefinitions=manifest;
export function isEnemy(kind:string):kind is EnemyKind{return Object.hasOwn(enemyDefinitions,kind);}
export function isAirEnemy(kind:string):kind is AirKind{return ['drone','interceptor','heavy','support'].includes(kind);}
