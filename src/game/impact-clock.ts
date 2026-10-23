import type {GameEvent} from './simulation';
/** Wall-clock hit stop: no accumulated simulation catch-up, input remains queued. */
export class ImpactClock {
 remaining=0;private cooldown=0;
 request(events:GameEvent[]){let duration=0;for(const e of events){if(e.type==='explosion'&&e.large)duration=Math.max(duration,.09);else if(e.type==='missile-impact'||e.type==='hit'&&e.weight==='heavy')duration=Math.max(duration,.035);else if(e.type==='explosion')duration=Math.max(duration,.02);}if(duration>0&&(this.cooldown===0||duration>=.09)){this.remaining=Math.max(this.remaining,duration);this.cooldown=.12;}}
 consume(dt:number){this.cooldown=Math.max(0,this.cooldown-dt);if(this.remaining>0){this.remaining=Math.max(0,this.remaining-dt);return 0;}return dt;}
 reset(){this.remaining=0;this.cooldown=0;}
}
