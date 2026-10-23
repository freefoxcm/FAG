export type AppScreen='title'|'operations'|'briefing'|'story'|'archive'|'combat'|'pause'|'results'|'settings';
/** One owner for DOM/input transitions; simulation never owns menu state. */
export class ScreenFlow{
 screen:AppScreen='title';settingsFrom:AppScreen='title';
 constructor(private changed:(screen:AppScreen)=>void){}
 go(screen:AppScreen){this.screen=screen;this.changed(screen);}
 settings(){if(this.screen==='settings')return;this.settingsFrom=this.screen;this.go('settings');}
 closeSettings(){this.go(this.settingsFrom);}
 get combatActive(){return this.screen==='combat';}
}
