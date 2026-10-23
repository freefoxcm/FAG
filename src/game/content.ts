import {siteUrl} from './site-url';
export {characters,getCharacter,qingluan,type CharacterDefinition,type WeaponDefinition} from './characters';
export interface StageDefinition { id: string; name: string; bossAt: number; phases: { at: number; name: string; objective: string }[] }
export const assets = { qingluan: siteUrl('assets/models/qingluan.glb'), portrait: siteUrl('assets/qingluan.webp') };
export const stage: StageDefinition = { id:'lingang', name:'重返临港', bossAt:165, phases:[{at:0,name:'01 / 城市入口',objective:'突破封锁 · 清除无人机编队'},{at:45,name:'02 / 长街突袭',objective:'压制地面防空 · 保持连击'},{at:105,name:'03 / 港区交火',objective:'摧毁重型编队 · 接近指挥核心'},{at:165,name:'04 / 终局反击',objective:'击落空中堡垒「长夜」'}] };
