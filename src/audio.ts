import {MusicPlayer,type MusicTheme} from './music';
import type {GameEvent} from './game/simulation';
export class Sound{
 context?:AudioContext;master?:GainNode;muted=false;private compressor?:DynamicsCompressorNode;private score?:MusicPlayer;private musicEnabled=true;private musicVolume=.55;private musicTheme:MusicTheme|null='menu';private pageActive=true;private voices=0;private lastHit=-1;private duckUntil=0;private noise?:AudioBuffer;
 async unlock(){if(!this.context){const ctx=this.context=new AudioContext();this.master=ctx.createGain();this.master.gain.value=this.muted?0:.28;this.compressor=ctx.createDynamicsCompressor();this.compressor.threshold.value=-18;this.compressor.ratio.value=5;this.compressor.attack.value=.003;this.compressor.release.value=.12;this.master.connect(this.compressor);this.compressor.connect(ctx.destination);this.score=new MusicPlayer(ctx,this.master);this.score.configure(this.musicEnabled&&!this.muted,this.musicVolume);this.score.setTheme(this.pageActive?this.musicTheme:null);this.noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);}
 await this.context.resume();}
 setMuted(value:boolean){this.muted=value;this.score?.configure(this.musicEnabled&&!value,this.musicVolume);if(this.master&&this.context)this.master.gain.setTargetAtTime(value?0:.28,this.context.currentTime,.04);}
 tone(frequency:number,duration:number,type:OscillatorType='sine',volume=.2,end=frequency,pan=0){
  if(!this.context||!this.master||this.muted||this.voices>=24)return;const ctx=this.context,now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain(),stereo=ctx.createStereoPanner();this.voices++;osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(20,end),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);stereo.pan.value=Math.max(-.8,Math.min(.8,pan));osc.connect(gain);gain.connect(stereo);stereo.connect(this.master);osc.start(now);osc.stop(now+duration);osc.onended=()=>{this.voices--;osc.disconnect();gain.disconnect();stereo.disconnect();};
 }
 private blast(duration:number,volume:number,cutoff:number,pan:number){
  if(!this.context||!this.master||!this.noise||this.muted||this.voices>=24)return;const ctx=this.context,now=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),stereo=ctx.createStereoPanner();this.voices++;source.buffer=this.noise;filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,now);filter.frequency.exponentialRampToValueAtTime(130,now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);stereo.pan.value=Math.max(-.8,Math.min(.8,pan));source.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.master);source.start(now,Math.random()*.2,duration);source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();gain.disconnect();stereo.disconnect();};
 }
 event(e:GameEvent){
  const now=this.context?.currentTime??0,pan=(e.x??0)/30;
  if(e.type==='shot'){this.tone(1050,.04,'triangle',.045,220,pan);return;}
  if(e.type==='hit'&&now-this.lastHit>.035){this.lastHit=now;this.blast(.085,.12,4200,pan);this.tone(900+Math.random()*600,.07,'triangle',.09,320,pan);}
  if(e.type==='missile-impact'){this.duckUntil=now+.4;this.blast(.32,.38,2400,pan);this.tone(105,.35,'sine',.55,28,pan);}
  if(e.type==='explosion'){this.duckUntil=now+(e.large?1:.25);this.blast(e.large?1:.4,e.large?.7:.4,1800,pan);this.tone(e.large?65:100,e.large?1.1:.36,'sine',e.large?.7:.4,24,pan);if(e.large)this.tone(36,1.25,'triangle',.25,20);}
  if(e.type==='hurt'){this.blast(.25,.3,2000,pan);this.tone(160,.25,'square',.14,40);}
  if(e.type==='missile'){this.blast(.2,.13,4400,pan);this.tone(220,.24,'sawtooth',.07,1100);}
  if(e.type==='ability'){this.tone(e.variant==='dash'?140:650,.35,'triangle',.13,e.variant==='dash'?900:150,pan);this.blast(.16,.12,e.variant==='dash'?1800:5000,pan);}
  if(e.type==='rail-shot'){this.tone(190,.24,'sawtooth',.16,45,pan);this.blast(.18,.25,2100,pan);}
  if(e.type==='pickup')this.tone(680,.3,'sine',.2,1360);
  if(e.type==='ultimate'){this.duckUntil=now+1;this.tone(180,1,'sawtooth',.16,40);this.tone(900,.65,'sine',.12,180);this.blast(.7,.35,2600,0);}
  if(e.type==='warning')this.tone(740,.22,'square',.07,620);
  if(e.type==='victory'){this.tone(523,.8);setTimeout(()=>this.tone(784,1),180);}
 }
 setMusic(enabled:boolean,volume:number){this.musicEnabled=enabled;this.musicVolume=volume;this.score?.configure(enabled&&!this.muted,volume);}
 music(theme:MusicTheme|null){this.musicTheme=theme;this.score?.setTheme(this.pageActive?theme:null);if(this.context&&this.context.currentTime<this.duckUntil)this.score?.duck(this.duckUntil-this.context.currentTime);}
 bindMusic(){
  const gesture=()=>{this.pageActive=!document.hidden;if(this.context?.state!=='running')void this.unlock().catch(()=>{});this.score?.setTheme(this.pageActive?this.musicTheme:null);};
  const blur=()=>{this.pageActive=false;this.score?.setTheme(null);};
  const focus=()=>{this.pageActive=!document.hidden;this.score?.setTheme(this.pageActive?this.musicTheme:null);};
  const visibility=()=>document.hidden?blur():focus();
  window.addEventListener('pointerdown',gesture,{capture:true});window.addEventListener('keydown',gesture,{capture:true});window.addEventListener('blur',blur);window.addEventListener('focus',focus);document.addEventListener('visibilitychange',visibility);
  return ()=>{window.removeEventListener('pointerdown',gesture,{capture:true});window.removeEventListener('keydown',gesture,{capture:true});window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',visibility);this.score?.dispose();void this.context?.close();};
 }
 get musicStats(){return this.score?.stats??{theme:this.musicTheme,enabled:this.musicEnabled,volume:this.musicVolume,voices:0,step:0};}
 get activeVoices(){return this.voices;}
}
