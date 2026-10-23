import {getCharacter} from './characters';
import type {AirframeId} from './roster';
export interface SaveData { version:1; best:number; muted:boolean; quality:'high'|'medium'; reducedMotion:boolean; selected?:AirframeId; pilotBest?:Partial<Record<AirframeId,number>> }
export const defaults:SaveData={version:1,best:0,muted:false,quality:'high',reducedMotion:false};
export function readSave(storage:Pick<Storage,'getItem'>):SaveData { try {const x=JSON.parse(storage.getItem('qingluan-save')||'null');const pilotBest:SaveData['pilotBest']={};for(const id of ['qingluan','akari','haneul','astra','snega'] as AirframeId[])if(Number.isFinite(x?.pilotBest?.[id]))pilotBest[id]=Math.max(0,x.pilotBest[id]);return { ...defaults, best: Number.isFinite(x?.best)?Math.max(0,x.best):0, muted:x?.muted===true, quality:x?.quality==='medium'?'medium':'high', reducedMotion:x?.reducedMotion===true,selected:getCharacter(x?.selected).id,pilotBest };}catch{return {...defaults,selected:'qingluan',pilotBest:{}};} }
export function writeSave(storage:Pick<Storage,'setItem'>,data:SaveData){try{storage.setItem('qingluan-save',JSON.stringify(data));}catch{/* Storage may be unavailable in private sessions. */}}
