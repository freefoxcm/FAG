/** Original, locally synthesized score. No remote audio or third-party recordings. */
export type MusicTheme='menu'|'story'|'combat'|'boss'|'paused';
type Voice={source:AudioScheduledSourceNode;gain:GainNode};
const chords=[[57,60,64,71],[53,57,60,64],[48,55,60,64],[55,59,62,69]];
const melody=[76,0,79,76,74,0,72,71,69,0,72,76,74,0,71,67,69,0,72,76,79,0,76,74,71,0,74,79,76,74,72,71];
const hz=(midi:number)=>440*2**((midi-69)/12);
export class MusicPlayer{
 readonly output:GainNode;
 private theme:MusicTheme|null=null;
 private enabled=true;private volume=.55;private next=0;private step=0;
 private voices=new Set<Voice>();private timer:number;private duckUntil=0;
 private mixLevel=-1;
 private noise:AudioBuffer;private echo:DelayNode;private feedback:GainNode;private echoGain:GainNode;
 constructor(private ctx:AudioContext,destination:AudioNode){
  this.output=ctx.createGain();this.output.gain.value=0;this.output.connect(destination);
  this.echo=ctx.createDelay(1);this.echo.delayTime.value=.32;this.feedback=ctx.createGain();this.feedback.gain.value=.23;this.echoGain=ctx.createGain();this.echoGain.gain.value=.22;this.echo.connect(this.feedback);this.feedback.connect(this.echo);this.echo.connect(this.echoGain);this.echoGain.connect(this.output);
  this.noise=ctx.createBuffer(1,ctx.sampleRate*.25,ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=7231;for(let i=0;i<data.length;i++){seed=(seed*16807)%2147483647;data[i]=seed/1073741824-1;}
  this.timer=window.setInterval(()=>this.tick(),25);
 }
 configure(enabled:boolean,volume:number){const wasPlaying=this.enabled&&this.volume>0;this.enabled=enabled;this.volume=Math.max(0,Math.min(1,volume));if(!enabled||this.volume===0)this.release();else if(!wasPlaying){this.next=this.ctx.currentTime+.04;this.step=0;}this.mix();}
 setTheme(theme:MusicTheme|null){if(this.theme===theme)return;this.release();this.theme=theme;this.step=0;this.next=this.ctx.currentTime+.08;this.mix();}
 duck(seconds:number){this.duckUntil=Math.max(this.duckUntil,this.ctx.currentTime+seconds);this.mix();}
 private mix(){const now=this.ctx.currentTime,strength=this.theme==='story'?.5:this.theme==='paused'?.3:1;const level=this.enabled&&this.theme?this.volume*strength*(now<this.duckUntil?.3:1):0;if(level!==this.mixLevel){this.mixLevel=level;this.output.gain.setTargetAtTime(level,now,.09);}}
 private release(){const now=this.ctx.currentTime;for(const voice of this.voices){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.025);try{voice.source.stop(now+.12);}catch{/* An already ended voice needs no stop. */}}}
 private track(source:AudioScheduledSourceNode,gain:GainNode,filter:AudioNode){const voice={source,gain};this.voices.add(voice);source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();filter.disconnect();};}
 private note(midi:number,time:number,duration:number,volume:number,type:OscillatorType='triangle',pad=false){
  if(this.voices.size>=48)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();osc.type=type;osc.frequency.value=hz(midi);osc.detune.value=pad?(midi%2?4:-4):0;filter.type='lowpass';filter.frequency.value=pad?950:type==='sawtooth'?1200:3200;
  gain.gain.setValueAtTime(.0001,time);gain.gain.linearRampToValueAtTime(volume,time+(pad?.35:.018));gain.gain.exponentialRampToValueAtTime(.0001,time+duration);osc.connect(filter);filter.connect(gain);gain.connect(this.output);if(pad||midi>=67)gain.connect(this.echo);this.track(osc,gain,filter);osc.start(time);osc.stop(time+duration+.02);
 }
 private kick(time:number,accent:boolean){if(this.voices.size>=48)return;const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();osc.frequency.setValueAtTime(115,time);osc.frequency.exponentialRampToValueAtTime(42,time+.16);gain.gain.setValueAtTime(accent?.4:.27,time);gain.gain.exponentialRampToValueAtTime(.0001,time+.24);osc.connect(filter);filter.connect(gain);gain.connect(this.output);this.track(osc,gain,filter);osc.start(time);osc.stop(time+.25);}
 private percussion(time:number,snare:boolean){if(this.voices.size>=48)return;const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=this.noise;filter.type=snare?'bandpass':'highpass';filter.frequency.value=snare?1900:6500;gain.gain.setValueAtTime(snare?.16:.035,time);gain.gain.exponentialRampToValueAtTime(.0001,time+(snare?.16:.045));source.connect(filter);filter.connect(gain);gain.connect(this.output);this.track(source,gain,filter);source.start(time);source.stop(time+(snare?.18:.055));}
 private tick(){
  if(!this.theme||!this.enabled||this.volume===0||this.ctx.state!=='running')return;const now=this.ctx.currentTime;if(this.next<now-.2)this.next=now+.04;this.mix();
  const combat=this.theme==='combat'||this.theme==='boss',boss=this.theme==='boss',beat=60/(combat?boss?132:120:this.theme==='story'?78:92),eighth=beat/2;
  while(this.next<now+.12){const step=this.step%64,bar=Math.floor(step/8),chord=chords[Math.floor(bar/2)%4],time=this.next;
   if(step%8===0)for(const midi of chord)this.note(midi,time,beat*4.8,combat?.032:.05,'sine',true);
   if(step%4===0)this.note(chord[0]-24,time,beat*(combat?.8:1.5),combat?.22:.11,'sine');
   if(this.theme!=='paused'){
    if(combat||step%2===0)this.note(chord[(step+(bar%2))%4]+12,time,eighth*1.7,combat?.065:.045,'triangle');
    if(step%2===0){const midi=melody[Math.floor(step/2)];if(midi)this.note(midi+(boss?12:0),time,beat*1.5,combat?.08:.065,'triangle');}
    if(combat){if(step%4===0||boss&&step%8===6)this.kick(time,step%8===0);if(step%8===4)this.percussion(time,true);this.percussion(time,false);if(boss&&step%2===1)this.note(chord[0]-12,time,eighth*.7,.06,'sawtooth');}
   }
   this.next+=eighth;this.step++;
  }
 }
 get stats(){return {theme:this.theme,enabled:this.enabled,volume:this.volume,voices:this.voices.size,step:this.step};}
 dispose(){clearInterval(this.timer);for(const {source} of this.voices)try{source.stop();}catch{}this.voices.clear();this.echo.disconnect();this.feedback.disconnect();this.echoGain.disconnect();this.output.disconnect();}
}
