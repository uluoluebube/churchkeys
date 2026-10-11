/* Live pace follower for ChurchKeys. Dependency-free, no network and no model claims.
 * Only locks after a repeated, consistent beat interval. Holds its last tempo when
 * the vocalist or drummer pauses; does not interpret silence as a new speed.
 */
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
export class PaceFollower {
  constructor(initial=72){this.reset(initial);}
  reset(initial=72){
    this.tempo=clamp(initial,44,190);this.target=null;this.locked=false;
    this.lastPulse=null;this.lastAdvance=null;this.lastReliablePulse=0;
    this.intervals=[];this.confidence=0;this.acceptedBeats=0;this.newSection=false;
  }
  observePulse(ms){
    if(!Number.isFinite(ms))return false;
    if(this.lastPulse!==null){
      const dt=ms-this.lastPulse;
      if(dt<255)return false; // chatter / repeated attack, not a fresh beat
      if(dt>2200){this.intervals=[];this.lastPulse=ms;this.newSection=true;return false;}
      if(dt>1650){this.intervals=[];this.lastPulse=ms;return false;}
      if(dt<295||dt>1400){this.intervals=[];this.lastPulse=ms;return false;}
      this.intervals.push(dt);this.intervals=this.intervals.slice(-9);
    }
    this.lastPulse=ms;
    if(this.intervals.length<(this.newSection?6:5))return false;
    const recent=this.intervals.slice(-7),m=median(recent);
    const consistent=recent.filter(x=>Math.abs(x-m)/m<.105);
    // Five coherent intervals are necessary to trust a pulse, not a random fill.
    if(consistent.length<5){this.confidence=0;return false;}
    let bpm=60000/median(consistent);
    // Resolve half/double-time only against an *already* stable live lock.
    if(this.locked&&!this.newSection){const options=[bpm,bpm/2,bpm*2].filter(x=>x>=44&&x<=190);
      const close=options.sort((a,b)=>Math.abs(a-this.tempo)-Math.abs(b-this.tempo));
      if(close[0]&&Math.abs(close[0]-this.tempo)/this.tempo<.23)bpm=close[0];
    }
    if(bpm<44||bpm>190)return false;
    // Prevent one coherent but short burst at a totally different speed
    // (for example a drummer's fill) from instantaneously changing the clock.
    if(this.locked && !this.newSection && Math.abs(bpm-this.tempo)/this.tempo>.40 && this.intervals.length<8)return false;
    // On the very first trustworthy pulse, jump from the free-time pad to the
    // observed singer/drummer tempo. There has been no metrical accompaniment
    // to disrupt yet, so a slow ramp would actually cause a late entrance.
    if(!this.locked || (this.newSection && consistent.length>=6))this.tempo=bpm;
    this.target=bpm;this.locked=true;this.newSection=false;
    this.lastReliablePulse=ms;this.acceptedBeats++;
    this.confidence=clamp(consistent.length/recent.length,0,1);
    return true;
  }
  advance(ms){
    if(!Number.isFinite(ms))return this.tempo;
    if(this.lastAdvance===null){this.lastAdvance=ms;return this.tempo;}
    const seconds=clamp((ms-this.lastAdvance)/1000,0,.5);this.lastAdvance=ms;
    if(!this.locked||this.target===null)return this.tempo;
    // Follow a slowing worship leader faster than an apparent acceleration.
    const difference=this.target-this.tempo;
    const limit=(difference>=0?3.6:5.0)*seconds;
    this.tempo+=clamp(difference,-limit,limit);
    return this.tempo;
  }
  snapshot(){return {tempo:this.tempo,target:this.target,locked:this.locked,confidence:this.confidence};}
}
