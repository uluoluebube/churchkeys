/* ChurchKeys Live Engine — dependency-free analysis helpers.
   Frequency-domain chroma and chord/key inference for mixed audio.
   Experimental estimates only: never claims studio-grade polyphonic transcription. */
export const NOTE_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const SCALE_MAJOR = [0,2,4,5,7,9,11];
export const SCALE_MINOR = [0,2,3,5,7,8,10];
export const majorProfile = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
export const minorProfile = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const clamp = (x,lo,hi)=>Math.max(lo,Math.min(hi,x));
export const midiHz = midi=>440*Math.pow(2,(midi-69)/12);
export function detectKey(chroma){
  const sum=chroma.reduce((a,b)=>a+b,0);if(sum<.001)return null;
  const norm=chroma.map(x=>x/sum), results=[];
  for(const mode of ['major','minor'])for(let root=0;root<12;root++){
    const profile=mode==='major'?majorProfile:minorProfile;
    const pSum=profile.reduce((a,b)=>a+b,0);
    let score=0;for(let i=0;i<12;i++)score+=norm[i]*profile[(i-root+12)%12]/pSum;
    results.push({root,mode,score});
  }
  results.sort((a,b)=>b.score-a.score);
  const gap=(results[0].score-results[1].score);
  return {...results[0],confidence:clamp(gap/.027,0,1),runnerUp:results[1],gap};
}
export function detectChord(chroma,key=null){
  const sum=chroma.reduce((a,b)=>a+b,0);if(sum<.001)return null;
  const normalized=chroma.map(x=>x/sum),candidates=[];
  const roots=key? Array.from({length:7},(_,i)=>(key.root+(key.mode==='minor'?SCALE_MINOR:SCALE_MAJOR)[i])%12):Array.from({length:12},(_,i)=>i);
  for(const root of roots)for(const minor of [false,true]){
    const pcs=[root,(root+(minor?3:4))%12,(root+7)%12];
    const score=pcs.reduce((s,n,i)=>s+normalized[n]*(i===0?1.15:1),0)
      -.27*normalized.reduce((s,n,i)=>s+(pcs.includes(i)?0:n),0);
    candidates.push({root,quality:minor?'minor':'major',pcs,score,name:NOTE_NAMES[root]+(minor?'m':'')});
  }
  candidates.sort((a,b)=>b.score-a.score);
  return {...candidates[0],confidence:clamp((candidates[0].score-candidates[1].score)/.20,0,1),runnerUp:candidates[1]};
}
export class HarmonicTracker {
  constructor(){this.reset();}
  reset(){this.chroma=Array(12).fill(0);this.recent=Array(12).fill(0);this.frames=0;this.toneFrames=0;this.lastKey=null;this.lastChord=null;this.stableKey=null;this.keyVotes=new Map();this.lastFrameMs=0;this.activity=false;this.previousSpectrum=null;this.fluxAvg=0;this.lastBeat=0;this.beats=[];this.tempo=null;}
  observe(spectrum,sampleRate,fftSize,nowMs){
    // Musical partial salience: local spectral peaks from ~75 Hz to ~1500 Hz.
    const binHz=sampleRate/fftSize; const peaks=[];const chroma=Array(12).fill(0);
    let energy=0,tonal=0,flux=0;
    const minBin=Math.max(2,Math.floor(75/binHz)),maxBin=Math.min(spectrum.length-2,Math.ceil(1800/binHz));
    for(let b=minBin;b<=maxBin;b++){
      const d=spectrum[b]; if(!Number.isFinite(d) || d< -93)continue;
      const left=spectrum[b-1],right=spectrum[b+1];
      const mag=Math.pow(10,(d+80)/22);
      energy+=mag;
      const prev=this.previousSpectrum?.[b]??d;
      if(d>prev+2.0)flux+=Math.min(15,(d-prev-2)*mag);
      if(d<left||d<right||d< -79)continue;
      const contrast=Math.max(0,d-Math.max(spectrum[Math.max(0,b-4)]||-100,spectrum[Math.min(spectrum.length-1,b+4)]||-100));
      if(contrast<2.0)continue;
      const frequency=b*binHz;
      const midi=69+12*Math.log2(frequency/440);
      const pc=((Math.round(midi)%12)+12)%12;
      const tuning=Math.abs(midi-Math.round(midi));
      if(tuning>.45)continue;
      const weight=Math.min(35,mag)*Math.pow(200/frequency,.23)*(.55+.45*contrast/Math.max(contrast,12))*(1-tuning*.65);
      chroma[pc]+=weight;tonal+=weight;
      peaks.push({pc,weight});
    }
    // Keep harmonic-energy estimates bounded and decrease stale evidence over time.
    this.previousSpectrum=new Float32Array(spectrum);
    const total=chroma.reduce((a,b)=>a+b,0);
    const normalized=total>.001?chroma.map(x=>x/total):chroma;
    this.activity=tonal>.015&&total>.015;
    this.frames++;
    if(this.activity){
      this.toneFrames++;
      for(let pc=0;pc<12;pc++){
        this.chroma[pc]=this.chroma[pc]*.955+normalized[pc]*.045;
        this.recent[pc]=this.recent[pc]*.64+normalized[pc]*.36;
      }
    }
    const key=detectKey(this.chroma);
    const chord=detectChord(this.recent,key);
    if(key){
      const id=key.root+':'+key.mode;
      this.keyVotes.set(id,(this.keyVotes.get(id)||0)*.86+1);
      for(const [k,v] of this.keyVotes)if(k!==id)this.keyVotes.set(k,v*.94);
      const ranked=[...this.keyVotes].sort((a,b)=>b[1]-a[1]);
      if(ranked[0]?.[1]>5){const [r,m]=ranked[0][0].split(':');this.stableKey={root:+r,mode:m,confidence:key.confidence,score:key.score};}
      this.lastKey=key;
    }
    this.lastChord=chord;
    // Onset metric provides tentative tempo only; never force large jumps on sparse beats.
    this.fluxAvg=.86*this.fluxAvg+.14*flux;
    if(flux>Math.max(8,this.fluxAvg*2.25)&&nowMs-this.lastBeat>260){
      if(this.lastBeat){const interval=nowMs-this.lastBeat;if(interval>=280&&interval<=1100)this.beats.push(interval);}
      this.lastBeat=nowMs;this.beats=this.beats.slice(-9);
      if(this.beats.length>=5){const vals=this.beats.slice().sort((a,b)=>a-b);let bpm=60000/vals[Math.floor(vals.length/2)];if(bpm<66)bpm*=2;if(bpm>180)bpm/=2;
        if(bpm>=65&&bpm<=185)this.tempo=this.tempo===null?bpm:.88*this.tempo+.12*bpm;
      }
    }
    return {chroma:this.chroma,recent:this.recent,key:this.stableKey||key,chord,tempo:this.tempo,total,tonal,energy,flux,frames:this.frames};
  }
}
