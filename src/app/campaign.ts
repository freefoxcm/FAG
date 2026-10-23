import {siteUrl} from '../game/site-url';
import type {StageId} from '../game/content';
export interface StagePresentation{x:number;y:number;threat:string;region:string;brief:string;intel:string[];objective:string;image:string}
export const presentation:Record<StageId,StagePresentation>={
 lingang:{x:24,y:61,threat:'Ⅱ / 封锁',region:'临港 · 城市与港口',brief:'穿过记忆中的封锁线，夺回通向海岸的航线。',intel:['轻型编队与截击机先后进入，重装机负责压制中路。','支援机引导协同齐射；摧毁它可以打断尚未发射的攻击。','长夜炮组可独立摧毁，引擎受损会降低机动范围。'],objective:'击毁空中堡垒「长夜」核心',image:siteUrl('assets/story/lingang.webp')},
 canyon:{x:49,y:24,threat:'Ⅲ / 追踪',region:'北部山脉 · 雷达基地',brief:'追踪黑匣子里的坐标，切断掌握我们航线的雷达网络。',intel:['截击机横切山口，给横向机动预留空间。','地面雷达会指挥附近敌机齐射，建议优先压制。','棱镜的雷达部件损坏后，额外追踪预警攻击停止。'],objective:'摧毁电子战平台「棱镜」核心',image:siteUrl('assets/story/canyon.webp')},
 ocean:{x:79,y:57,threat:'Ⅳ / 决战',region:'远海岛链 · 舰队防空圈',brief:'越过岛链，终止天幕核心持续广播的封锁指令。',intel:['舰载火力从低处起射，按预警及时离开瞄准位置。','保持补给与走位节奏，保存一次大招用于密集攻势。','护盾发生器全部损坏后，天幕核心的减伤解除。'],objective:'击毁空中母舰「天幕」核心',image:siteUrl('assets/story/ocean.webp')}
};
