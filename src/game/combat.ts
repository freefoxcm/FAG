import type {Entity,Kind} from './simulation';
import {modelDefinitions} from './enemies';
export const AIR_HEIGHT=15;
export interface Point3{x:number;y:number;z:number;id?:number}
export interface Pose{x:number;y:number;z:number;heading?:number;bank?:number;recoilX?:number;recoilZ?:number}
export function entityHeight(kind:Kind){return kind==='turret'?.8:AIR_HEIGHT;}
export function modelPoint(id:keyof typeof modelDefinitions,pose:Pose,point:number[]):Point3{
 const scale=modelDefinitions[id].scale,bank=pose.bank??0,yaw=pose.heading??0;
 const x=(point[0]*Math.cos(bank)-point[1]*Math.sin(bank))*scale;
 const y=(point[0]*Math.sin(bank)+point[1]*Math.cos(bank))*scale,z=point[2]*scale;
 return{x:pose.x+(pose.recoilX??0)+x*Math.cos(yaw)+z*Math.sin(yaw),y:pose.y+y,z:pose.z+(pose.recoilZ??0)-x*Math.sin(yaw)+z*Math.cos(yaw)};
}
export function cannonMuzzle(source:Entity,aim:{x:number;z:number},slot=0):Point3{
 if(source.kind==='turret'){
  const yaw=Math.atan2(source.x-aim.x,source.z-aim.z),id=source.facility==='missile'?'missile-site':'turret';
  return modelPoint(id,{...source,heading:yaw},modelDefinitions[id].muzzles[slot%modelDefinitions[id].muzzles.length]);
 }
 const id=source.modelId??(source.kind in modelDefinitions?source.kind as keyof typeof modelDefinitions:'drone');
 const anchors=modelDefinitions[id].muzzles;if(source.parts){const living=source.parts.filter(p=>p.role==='weapon'&&p.hp>0);slot=(living.find(p=>p.slot===slot%anchors.length)??living[0])?.slot??slot;}return modelPoint(id,source,anchors[slot%anchors.length]);
}
/** Earliest swept contact, including a projectile that traverses the entire collider in one tick. */
export function sweptCircle(ax:number,az:number,bx:number,bz:number,cx:number,cz:number,radius:number){
 const dx=bx-ax,dz=bz-az,ox=ax-cx,oz=az-cz,a=dx*dx+dz*dz,c=ox*ox+oz*oz-radius*radius;
 if(c<=0)return 0;if(a<1e-10)return null;const b=2*(ox*dx+oz*dz),d=b*b-4*a*c;if(d<0)return null;
 const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
}
export function collisionVolumes(source:Entity):{x:number;y:number;z:number;radius:number;partId?:string}[]{
 if(source.kind==='boss'&&source.parts)return [{x:source.x,y:source.y,z:source.z,radius:3.2},...source.parts.filter(p=>p.hp>0).map(p=>({...modelPoint(source.modelId??'boss',source,p.position),radius:p.radius,partId:p.id}))];
 const volumes=[{x:source.x,y:source.y,z:source.z,radius:source.radius}];
 if(!(source.kind in modelDefinitions))return volumes;
 const id=source.kind as keyof typeof modelDefinitions;
 const extras:Record<string,number[][]>={drone:[[-1.1,.1,.6,.8],[1.1,.1,.6,.8]],interceptor:[[-1.45,.1,.8,.7],[1.45,.1,.8,.7],[0,.1,-1.7,.55]],heavy:[[-2.8,.1,.8,1.25],[2.8,.1,.8,1.25]],support:[[-2.2,.1,.1,.95],[2.2,.1,.1,.95]],boss:[[-7.4,.1,2,2.3],[7.4,.1,2,2.3]]};
 for(const part of extras[id]??[]){const center=modelPoint(id,source,part);volumes.push({...center,radius:part[3]*modelDefinitions[id].scale});}return volumes;
}
