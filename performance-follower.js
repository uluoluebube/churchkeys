/* ChurchKeys performance-following research layer v1.2
 * Online probabilistic chord-state tracking, phrase continuity and beat-phase feedback.
 * Designed for local browser use. NOT a trained neural network, vocal-source separation,
 * song recognition, guaranteed harmony, or a finished autonomous music model.
 */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const STATES=Array.from({length:24},(_,i)=>{const root=i%12,minor=i>=12;
  return {root,quality:minor?'minor':'major',pcs:[root,(root+(minor?3:4))%12,(root+7)%12],name:names[root]+(minor?'m':'')};});
const normalize=x=>{const s=x.reduce((a,b)=>a+b,0);return s>0?x.map(v=>v/s):x.map(()=>0);};
/** HMM-style causal inference: chords usually persist; unexpected switches require repeated evidence. */
export class ChordSequenceFollower {
  constructor(){this.reset();}
  reset(){this.posterior=Array(24).fill(1/24);this.current=null;this.candidate=null;this.candidateSince=0;this.lastStrongAt=0;this.lastUpdate=0;this.reliability=0;this.updates=0;}
  observe(chroma,nowMs,{active=true}={}){
    if(!active||!Array.isArray(chroma)||chroma.length!==12)return this.snapshot(nowMs);
    const c=normalize(chroma.map(x=>Number.isFinite(x)?Math.max(0,x):0));
    const distinct=c.filter(x=>x>.10).length;
    const concentration=Math.max(...c);
    // Mono note and broadband noise are not enough to identify a chord.
    const evidence=distinct>=2 && concentration<.77 && c.reduce((a,b)=>a+b,0)>.9;
    if(!evidence)return this.snapshot(nowMs);
    const scores=STATES.map(s=>{
      const inChord=s.pcs.reduce((total,pc,i)=>total+c[pc]*(i===0?1.02:1),0);
      const out=1-inChord;
      // Distinct chord tones are more important than an individual dominant pitch.
      const supported=s.pcs.filter(pc=>c[pc]>.07).length;
      return 8.8*(inChord-.38*out)+.32*supported;
    });
    const likelihood=scores.map(v=>Math.exp(v-7));
    // Persistent-state prior. Frequent chord jitter is penalized.
    const stay=.965,leak=(1-stay)/23;
    const predicted=this.posterior.map((p,i)=>stay*p+leak*(1-p));
    const updated=predicted.map((p,i)=>p*likelihood[i]);
    this.posterior=normalize(updated);
    this.updates++;
    const rank=[...this.posterior.keys()].sort((a,b)=>this.posterior[b]-this.posterior[a]);
    const top=rank[0],margin=this.posterior[top]-this.posterior[rank[1]];
    const confident=this.posterior[top]>.45 && margin>.12;
    this.reliability=clamp((this.posterior[top]-.36)/.55,0,1);
    if(confident){
      this.lastStrongAt=nowMs;
      if(this.candidate!==top){this.candidate=top;this.candidateSince=nowMs;}
      if((this.current===null && nowMs-this.candidateSince>=220) ||
          (this.current!==top && nowMs-this.candidateSince>=750 && nowMs-this.lastUpdate>=1000)){
        this.current=top;this.lastUpdate=nowMs;
      }
    }else{this.candidate=null;}
    return this.snapshot(nowMs);
  }
  snapshot(nowMs=0){
    const fresh=this.current!==null && nowMs-this.lastStrongAt<2500;
    const state=this.current===null?null:STATES[this.current];
    return {chord:state?{...state,confidence:fresh?this.reliability:0}:null,
      confident:fresh && this.reliability>.22,confidence:fresh?this.reliability:0,
      active:fresh,held:this.current!==null&&!fresh};
  }
}
/** Vocal/lead presence is only a pitch-activity proxy; mixed input cannot prove voice identity. */
export class PhraseFlowFollower {
  constructor(){this.reset();}
  reset(){this.activeSince=0;this.lastAudio=0;this.lastMelody=0;this.started=false;this.silentSince=0;}
  observe(ms,{audible=false,melodic=false}={}){
    if(audible){this.lastAudio=ms;this.started=true;this.silentSince=0;}
    else if(!this.silentSince)this.silentSince=ms;
    if(audible&&melodic)this.lastMelody=ms;
    const melodyActive=this.lastMelody>0&&ms-this.lastMelody<850;
    const bandActive=this.lastAudio>0&&ms-this.lastAudio<1200;
    const instrumental=this.started&&!melodyActive&&ms-this.lastMelody>1250;
    const status=!this.started?'waiting':melodyActive?'lead melody present':instrumental&&bandActive?'instrumental passage':instrumental?'holding last harmony':'listening';
    return {status,melodyActive,bandActive,instrumental,started:this.started,
      stopRecommended:false /* never infer a session end from silence */};
  }
}
/** Small and conservative beat-phase synchronizer; never changes tempo on its own. */
export class BeatPhaseFollower {
  constructor(){this.reset();}
  reset(){this.anchorMs=null;this.periodMs=0;this.streak=0;this.confidence=0;this.lastOnset=null;this.lastErrorMs=0;this.lastBpm=0;}
  observePulse(ms,bpm,tempoConfidence){
    if(!Number.isFinite(ms)||!Number.isFinite(bpm)||bpm<44||bpm>190||tempoConfidence<.7)return this.snapshot();
    const period=60000/bpm;
    if(this.anchorMs===null||Math.abs(this.periodMs-period)/period>.14||
       (this.lastOnset!==null&&ms-this.lastOnset>period*5)){
      this.anchorMs=ms;this.periodMs=period;this.streak=1;this.confidence=0;this.lastOnset=ms;this.lastBpm=bpm;return this.snapshot();
    }
    this.lastOnset=ms;
    this.periodMs=.88*this.periodMs+.12*period;
    const beats=Math.round((ms-this.anchorMs)/this.periodMs);
    const err=ms-(this.anchorMs+beats*this.periodMs);
    // Ignore offbeats and noisy percussion hits, don't lock the wrong pulse.
    if(beats<1 || Math.abs(err)>Math.min(100,this.periodMs*.17)){
      this.streak=Math.max(0,this.streak-1);this.confidence=clamp(this.streak/7,0,1);return this.snapshot();
    }
    const correction=clamp(err*.16,-12,12);
    this.anchorMs+=correction;
    this.lastErrorMs=err;
    this.streak=Math.min(12,this.streak+1);
    this.confidence=clamp((this.streak-2)/6,0,1);
    return this.snapshot();
  }
  /** Small bounded nudge to an audio clock beat; no large discontinuities. */
  correctionSeconds(predictedBeatWallMs){
    if(this.confidence<.7||this.anchorMs===null)return 0;
    const periods=Math.round((predictedBeatWallMs-this.anchorMs)/this.periodMs);
    const target=this.anchorMs+periods*this.periodMs;
    const delta=target-predictedBeatWallMs;
    // Never shift the next scheduler beat more than 10 milliseconds at once.
    return clamp(delta,-10,10)/1000;
  }
  snapshot(){return {locked:this.confidence>.7,confidence:this.confidence,periodMs:this.periodMs,lastErrorMs:this.lastErrorMs};}
}
export class PerformanceFollower {
  constructor(){this.reset();}
  reset(){this.chords=new ChordSequenceFollower();this.phrases=new PhraseFlowFollower();this.beat=new BeatPhaseFollower();this.last=null;}
  observe({nowMs,chroma,audible=false,melodic=false}){
    const chords=this.chords.observe(chroma,nowMs,{active:audible});
    const phrase=this.phrases.observe(nowMs,{audible,melodic});
    this.last={chords,phrase,beat:this.beat.snapshot()};return this.last;
  }
}
