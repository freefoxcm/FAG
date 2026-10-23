import type {Input} from './simulation';
export class Controls {
 enabled=true;
 setEnabled(value:boolean){this.enabled=value;this.clear();}
 private keys=new Set<string>();
 private pressed=new Set<string>();
 constructor(onPause:()=>void,onConfirm:()=>boolean){window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='Escape'&&!e.repeat)onPause();if((e.code==='Enter'||e.code==='Space')&&!e.repeat&&onConfirm())e.preventDefault();if(!this.enabled)return;if(!e.repeat&&(e.code==='KeyQ'||e.code==='KeyE'))this.pressed.add(e.code);this.keys.add(e.code);});window.addEventListener('keyup',e=>this.keys.delete(e.code));window.addEventListener('blur',()=>this.clear());}
 clear(){this.keys.clear();this.pressed.clear();}
 get state():Input{return {x:Number(this.keys.has('KeyD')||this.keys.has('ArrowRight'))-Number(this.keys.has('KeyA')||this.keys.has('ArrowLeft')),z:Number(this.keys.has('KeyS')||this.keys.has('ArrowDown'))-Number(this.keys.has('KeyW')||this.keys.has('ArrowUp')),missile:this.pressed.delete('KeyE')||this.keys.has('KeyE'),ultimate:this.pressed.delete('KeyQ')||this.keys.has('KeyQ')};}
}
