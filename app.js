/* ChurchKeys Beta v0.1
 * No external API, build step, AI service, or data upload.
 * A prototype: lightweight dominant-pitch tracking + heuristic harmony, NOT song recognition.
 */
'use strict';
const $ = id => document.getElementById(id);
const NOTES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const CHORD_DEGREES = {1544:[0,4,5,3],1451:[0,3,4,0],1645:[0,5,3,4],1454:[0,3,4,3],2511:[1,4,0,0]};
const MAJOR = [0,2,4,5,7,9,11];
const MINOR = [0,2,3,5,7,8,10];
const KEY_MAJOR_PROFILE = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const KEY_MINOR_PROFILE = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const defaults = {mode:'auto',style:'worship',instrument:'piano',volume:35,sensitivity:55,echoReduction:true, guidedKey:'0:major',progression:'1544',guidedBpm:80};
let prefs = {...defaults};
try { const saved=JSON.parse(localStorage.getItem('churchkeys-preferences-v1')||'null'); if(saved && typeof saved==='object') prefs={...defaults,...saved}; } catch {}
const state = {
  running:false, demo:false, audioCtx:null, master:null, limiter:null, analyser:null, silence:null,
  micStream:null, inputSource:null, demoTimer:null, demoVoice:null, demoStep:0,
  scheduleTimer:null, nextBeatTime:0, beatIndex:0, barIndex:0, currentChord:null,
  playingMidi:[],voices:[], pitchMidi:null, pitchConfidence:0, stablePitch:null, recentPitch:[], chroma:Array(12).fill(0),
  key:null, keyConfidence:0, recentEvents:0, lastVoicedAt:0, lastAnalysis:0, lastGuessAt:0,
  bpmDetected:null, bpmTap:null, onsetTimes:[], lastOnset:0, priorRms:0, lastVisual:0,
  audioBuffer:null, pitchBuffer:null, frameId:0, diagnostic:'', status:'Standby'
};
const showLog = msg => { $('logText').textContent=msg; };
const setStatus = (name,type='') => { state.status=name; $('statusText').textContent=name; const dot=$('statusPill').querySelector('.dot');dot.className='dot '+type;const c=$('captureState'); c.innerHTML=`<span class="dot ${type}"></span> ${name === 'Listening' ? 'Mic active' : name==='Demo playing' ? 'Demo source' : 'Mic off'}`; };
const cap = (n,min,max)=>Math.min(max,Math.max(min,n));
const nameOf = (midi)=>NOTES[((Math.round(midi)%12)+12)%12];
const pitchToMidi = frequency=>69+12*Math.log2(frequency/440);
const midiToHz = midi=>440*Math.pow(2,(midi-69)/12);
const notation = key => key ? NOTES[key.root]+' '+(key.mode==='minor'?'minor':'major'):'—';
function init(){
  for(let root=0;root<12;root++)for(const mode of ['major','minor']){const opt=document.createElement('option');opt.value=`${root}:${mode}`;opt.textContent=`${NOTES[root]} ${mode}`;$('guidedKey').append(opt);}
  $('guidedKey').value=prefs.guidedKey;$('progressionSelect').value=prefs.progression;$('guidedBpm').value=prefs.guidedBpm;$('instrumentSelect').value=prefs.instrument;
  $('volumeSlider').value=prefs.volume;$('sensitivitySlider').value=prefs.sensitivity;updateValues(); selectMode(prefs.mode,false);selectStyle(prefs.style,false);createKeyboard();
  $('startBtn').addEventListener('click',()=>startSession('mic'));
  $('echoToggle').checked = prefs.echoReduction !== false;
  $('echoToggle').addEventListener('change', async()=>{prefs.echoReduction=$('echoToggle').checked;persist();if(state.running&&!state.demo){await stopSession();await startSession('mic');}else showLog('Echo reduction saved; it will apply to the next microphone session.');});
  $('demoBtn').addEventListener('click',()=>startSession('demo'));
  $('stopBtn').addEventListener('click',()=>stopSession());
  $('testChordBtn').addEventListener('click',testChord);
  $('tapBtn').addEventListener('click',tapTempo);$('tapTopBtn').addEventListener('click',tapTempo);
  $('noticeDismiss').addEventListener('click',e=>e.currentTarget.closest('.notice').remove());
  $('modeSelect').addEventListener('click',e=>{const el=e.target.closest('[data-mode]');if(el)selectMode(el.dataset.mode);});
  $('styleSelect').addEventListener('click',e=>{const el=e.target.closest('[data-style]');if(el)selectStyle(el.dataset.style);});
  for(const [id,key] of [['guidedKey','guidedKey'],['progressionSelect','progression'],['guidedBpm','guidedBpm'],['instrumentSelect','instrument']]) $(id).addEventListener('change',()=>{prefs[key]=key==='guidedBpm'?cap(Number($(id).value)||80,45,210):$(id).value; if(key==='guidedBpm')$(id).value=prefs[key]; if(key==='guidedKey')state.key=keyFromGuided();persist();updateValues();});
  for(const [id,key] of [['volumeSlider','volume'],['sensitivitySlider','sensitivity']]) $(id).addEventListener('input',()=>{prefs[key]=Number($(id).value);updateValues(); if(key==='volume')updateMaster();persist();});
  $('savePrefBtn').addEventListener('click',()=>{persist();showLog('Church preferences saved in this browser.');});
  $('exportBtn').addEventListener('click',exportPrefs);
  $('inputDevice').addEventListener('change',async()=>{if(state.running&&!state.demo){await stopSession();await startSession('mic');}});
  if(navigator.mediaDevices?.enumerateDevices)navigator.mediaDevices.enumerateDevices().then(updateDeviceList).catch(()=>{});
  draw();
  if('serviceWorker' in navigator && window.isSecureContext){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  if(!window.isSecureContext)showLog('Microphone requires HTTPS (Netlify provides this) or localhost. Demo sound may still work.');
  window.addEventListener('pagehide',()=>{if(state.running)stopSession();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running)showLog('Keep this tab visible during performance. Background tabs can disrupt browser timing.');});
}
function persist(){try{localStorage.setItem('churchkeys-preferences-v1',JSON.stringify(prefs));}catch{}}
function updateValues(){
  $('volumeLabel').textContent=prefs.volume+'%';$('sensitivityLabel').textContent=prefs.sensitivity+'%';
  if(state.running&&prefs.mode==='guided'){$('keyValue').textContent=notation(keyFromGuided());$('keyDetail').textContent='Manual guidance';$('bpmValue').textContent=prefs.guidedBpm;}
  updateMaster();
}
function selectMode(mode,save=true){
  prefs.mode=mode;
  [...$('modeSelect').querySelectorAll('button')].forEach(btn=>btn.classList.toggle('selected',btn.dataset.mode===mode));
  $('guidedBox').hidden=mode!=='guided';
  $('modeHint').textContent=mode==='auto'?'Estimates the key from live notes and chooses simple supporting chords. Accuracy is limited in noisy rooms.':'You provide a key, tempo and chord progression. The app plays automatically with stronger musical predictability.';
  if(mode==='guided')state.key=keyFromGuided();else {state.key=null; state.chroma.fill(0);state.recentEvents=0;}
  if(save)persist(); if(state.running){state.nextBeatTime=state.audioCtx.currentTime+0.12;state.beatIndex=0;showLog(mode==='auto'?'Autonomous mode: waiting for enough clean melody notes.':'Guided mode: following your selected progression.');}
}
function selectStyle(style,save=true){prefs.style=style;[...$('styleSelect').querySelectorAll('button')].forEach(btn=>btn.classList.toggle('active',btn.dataset.style===style));if(save)persist();}
function keyFromGuided(){let [r,mode]=String(prefs.guidedKey).split(':');return {root:cap(parseInt(r)||0,0,11),mode:mode==='minor'?'minor':'major'};}
function updateMaster(){if(state.master&&state.audioCtx){state.master.gain.setTargetAtTime((prefs.volume/100)*0.55,state.audioCtx.currentTime,.025);}}
async function ensureAudio(){
  if(!state.audioCtx){
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)throw Error('Your browser does not support Web Audio. Try current Chrome or Edge.');
    const ctx=new AC({latencyHint:'interactive'});state.audioCtx=ctx;
    state.master=ctx.createGain();state.limiter=ctx.createDynamicsCompressor();state.limiter.threshold.value=-17;state.limiter.knee.value=12;state.limiter.ratio.value=9;state.limiter.attack.value=.003;state.limiter.release.value=.16;
    state.master.connect(state.limiter);state.limiter.connect(ctx.destination);updateMaster();
    state.analyser=ctx.createAnalyser();state.analyser.fftSize=8192;state.analyser.smoothingTimeConstant=.15;
    state.silence=ctx.createGain();state.silence.gain.value=0;state.analyser.connect(state.silence);state.silence.connect(ctx.destination);
    state.audioBuffer=new Float32Array(state.analyser.fftSize);state.pitchBuffer=new Float32Array(2048);
  }
  if(state.audioCtx.state==='suspended') await state.audioCtx.resume();
}
async function startSession(type){
  if(state.running)await stopSession();
  try{
    await ensureAudio();
    if(type==='mic'){
      if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone unavailable: use the HTTPS Netlify URL on Chrome or Edge.');
      const device=$('inputDevice').value;
      const audio={echoCancellation:prefs.echoReduction!==false,noiseSuppression:false,autoGainControl:false,channelCount:1,...(device!=='default'?{deviceId:{ideal:device}}:{})};
      const stream=await navigator.mediaDevices.getUserMedia({audio});
      state.micStream=stream;state.inputSource=state.audioCtx.createMediaStreamSource(stream);state.inputSource.connect(state.analyser);
      navigator.mediaDevices.enumerateDevices().then(updateDeviceList).catch(()=>{});
    } else {state.demo=true;state.demoStep=0;startDemoMelody();}
    state.running=true;state.demo=type==='demo';state.chroma.fill(0);state.recentEvents=0;state.recentPitch=[];state.stablePitch=null;state.key=prefs.mode==='guided'?keyFromGuided():null;state.pitchMidi=null;state.keyConfidence=0;state.lastVoicedAt=0;state.lastOnset=0;state.onsetTimes=[];state.bpmDetected=type==='demo'?90:null;state.priorRms=0;state.beatIndex=0;state.barIndex=0;state.currentChord=null;state.nextBeatTime=state.audioCtx.currentTime+.2;state.lastAnalysis=0;
    state.scheduleTimer=setInterval(schedule,45);
    $('startBtn').disabled=type==='mic';$('demoBtn').disabled=type==='demo';$('stopBtn').disabled=false;
    setStatus(type==='demo'?'Demo playing':'Listening',type==='demo'?'demo':'live');$('sourceLabel').textContent=type==='demo'?'SIMULATED VOCAL MELODY':'MICROPHONE INPUT';
    $('playingIndicator').textContent='Active';$('playingIndicator').classList.add('live');
    showLog(type==='demo'?'Demo runs a simulated melody into the pitch detector. This is NOT a real church recording.':'Microphone connected. Your built-in mic works without extra cables. Sing clearly for a few seconds; watch Detected note first.');
  }catch(e){await stopSession();const message=e?.name==='NotAllowedError'?'Microphone permission denied. Enable microphone access in your browser site settings.':e?.message||'Unable to start audio.';showLog(message);setStatus('Input error');}
}
async function stopSession(){
  state.running=false; if(state.scheduleTimer){clearInterval(state.scheduleTimer);state.scheduleTimer=null;}
  if(state.demoTimer){clearInterval(state.demoTimer);state.demoTimer=null;}
  if(state.demoVoice){try{state.demoVoice.stop();}catch{}try{state.demoVoice.disconnect();}catch{}state.demoVoice=null;}
  if(state.inputSource){try{state.inputSource.disconnect();}catch{}state.inputSource=null;}
  if(state.micStream){state.micStream.getTracks().forEach(t=>t.stop());state.micStream=null;}
  stopVoices();state.demo=false;state.pitchMidi=null;state.recentPitch=[];state.playingMidi=[];state.currentChord=null;
  $('startBtn').disabled=false;$('demoBtn').disabled=false;$('stopBtn').disabled=true;
  $('sourceLabel').textContent='NO AUDIO SOURCE';$('signalText').textContent='Awaiting input';$('noteValue').textContent='—';$('noteDetail').textContent='Waiting for voice';$('keyValue').textContent='—';$('keyDetail').textContent='Learning melody';$('bpmValue').textContent='—';$('signalValue').textContent='0%';$('signalBar').style.width='0%';
  $('chordName').textContent='—';$('chordCaption').textContent='Start listening to begin';$('playingNotes').textContent='No notes yet';
  $('playingIndicator').textContent='Paused';$('playingIndicator').classList.remove('live');setStatus('Standby');refreshKeyboard([]);
  showLog('Audio stopped. The microphone is disconnected.');
}
function startDemoMelody(){
  // Internal simulated voice signal, routed ONLY into the detector, not speakers.
  const melody=[67,69,71,74,71,69,67,71,72,71,69,67,66,69,67,67]; // G major
  const ctx=state.audioCtx;let oldOsc=null;let oldGain=null;
  const play=()=>{
    if(oldOsc){try{oldOsc.stop();}catch{}try{oldOsc.disconnect();}catch{}if(oldGain)oldGain.disconnect();}
    const note=melody[state.demoStep++ % melody.length];const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=midiToHz(note);gain.gain.setValueAtTime(.09,ctx.currentTime);gain.gain.setTargetAtTime(.065,ctx.currentTime+.1,.06);osc.connect(gain);gain.connect(state.analyser);osc.start();state.demoVoice=osc;oldOsc=osc;oldGain=gain;
  };
  play();state.demoTimer=setInterval(play,550);
}
function updateDeviceList(devices){
  if(!Array.isArray(devices))return;
  const input=$('inputDevice'),current=input.value;input.innerHTML='<option value="default">System default mic (often built-in)</option>';
  devices.filter(d=>d.kind==='audioinput').forEach((d,i)=>{const op=document.createElement('option');op.value=d.deviceId;op.textContent=d.label||`Audio input ${i+1}`;input.append(op);});
  if([...input.options].some(op=>op.value===current))input.value=current;
}
function deriveKey(){
  if(state.recentEvents<13) return null;
  const observed=state.chroma;const distinct=observed.filter(v=>v>0.2).length;
  if(distinct<3)return null;
  const total=observed.reduce((a,b)=>a+b,0);if(total<3)return null;
  const scores=[];
  for(const mode of ['major','minor'])for(let root=0;root<12;root++){
    const profile=mode==='major'?KEY_MAJOR_PROFILE:KEY_MINOR_PROFILE;
    let score=0;for(let pc=0;pc<12;pc++)score+=observed[pc]*profile[(pc-root+12)%12];
    scores.push({root,mode,score:score/total});
  }
  scores.sort((a,b)=>b.score-a.score);return {...scores[0],confidence:cap((scores[0].score-scores[1].score)/.28,0,1)};
}
function pitchYin(analyserBuf,sampleRate){
  // Downsample the latest 4096 frames 2:1; YIN-like cumulative normalized difference.
  const input=state.pitchBuffer;const length=input.length;const start=analyserBuf.length-4096;
  let mean=0,rms=0;
  for(let i=0;i<length;i++){const x=(analyserBuf[start+i*2]+analyserBuf[start+i*2+1])*.5;input[i]=x;mean+=x;rms+=x*x;}
  mean/=length;rms=Math.sqrt(rms/length);
  for(let i=0;i<length;i++)input[i]-=mean;
  const lowCut=.005+(1-prefs.sensitivity/100)*.017;
  if(rms<lowCut)return {rms,pitch:null,clarity:0};
  const rate=sampleRate/2;const minLag=Math.floor(rate/950),maxLag=Math.min(Math.floor(rate/88),512);
  const diff=new Float32Array(maxLag+1);let cum=0,bestLag=0,bestVal=1;
  for(let lag=minLag;lag<=maxLag;lag++){
    let sum=0;for(let j=0;j<880;j++){const z=input[j]-input[j+lag];sum+=z*z;}
    diff[lag]=sum;
  }
  for(let lag=1;lag<=maxLag;lag++){
    cum+=diff[lag];if(lag<minLag)continue;
    const normal=(diff[lag]*lag)/(cum||1e-9);diff[lag]=normal;
    if(normal<bestVal){bestVal=normal;bestLag=lag;}
  }
  // Prefer first confident local minimum to reduce octave mistakes.
  let found=0;
  for(let lag=minLag+1;lag<maxLag-1;lag++){
    if(diff[lag]<.17 && diff[lag]<=diff[lag-1] && diff[lag]<diff[lag+1]){found=lag;break;}
  }
  const lag=found||bestLag;const confidence=1-Math.min(1,diff[lag]);
  if(!lag || confidence < .77 || (rms > .7))return {rms,pitch:null,clarity:confidence};
  // Sub-sample pitch interpolation on difference curve.
  const a=diff[lag-1]??diff[lag],b=diff[lag],c=diff[lag+1]??diff[lag];const denominator=(a-2*b+c);
  const refined=lag+(Math.abs(denominator)>1e-7?.5*(a-c)/denominator:0);
  const hz=rate/refined;
  if(!Number.isFinite(hz)||hz<87||hz>950)return {rms,pitch:null,clarity:confidence};
  return {rms,pitch:pitchToMidi(hz),clarity:confidence};
}
function analyse(ts){
  if(!state.running||!state.analyser||ts-state.lastAnalysis<92)return;
  state.lastAnalysis=ts;state.analyser.getFloatTimeDomainData(state.audioBuffer);
  const result=pitchYin(state.audioBuffer,state.audioCtx.sampleRate);
  const volume=cap(result.rms*360,0,100);$('signalValue').textContent=Math.round(volume)+'%';$('signalBar').style.width=volume+'%';
  $('signalText').textContent=result.rms<.012?'Low signal':volume>85?'High input level':'Signal receiving';
  const now=performance.now();
  // Broad amplitude transient estimate (not robust drum separation).
  if(!state.demo&&result.rms>.025 && result.rms>state.priorRms*1.55 && now-state.lastOnset>280){
    if(state.lastOnset)state.onsetTimes.push(now-state.lastOnset);state.lastOnset=now;
    state.onsetTimes=state.onsetTimes.slice(-10);
    if(state.onsetTimes.length>=5){const arr=state.onsetTimes.filter(n=>n>=290&&n<=1100).sort((a,b)=>a-b);if(arr.length>=4){let bpm=60000/arr[Math.floor(arr.length/2)];if(bpm<68)bpm*=2;if(bpm>180)bpm/=2;if(bpm>=65&&bpm<=185)state.bpmDetected=Math.round(bpm);}}
  }
  state.priorRms=state.priorRms*.65+result.rms*.35;
  if(result.pitch!==null){
    state.recentPitch.push(Math.round(result.pitch));state.recentPitch=state.recentPitch.slice(-5);
    const votes=new Map();for(const m of state.recentPitch)votes.set(m,(votes.get(m)||0)+1);
    const [note,count]=[...votes].sort((a,b)=>b[1]-a[1])[0];
    if(count>=3){
      state.pitchMidi=note;state.stablePitch=note;state.lastVoicedAt=now;state.pitchConfidence=result.clarity;
      const pc=(note%12+12)%12;
      for(let j=0;j<12;j++)state.chroma[j]*=.997;
      state.chroma[pc]+=Math.max(.1,result.clarity)*.22;state.recentEvents++;
      $('noteValue').textContent=nameOf(note);$('noteDetail').textContent='Octave '+(Math.floor(note/12)-1)+' · '+Math.round(result.clarity*100)+'% clarity';
    }
  } else {state.recentPitch=[];if(now-state.lastVoicedAt>900){state.pitchMidi=null;$('noteValue').textContent='—';$('noteDetail').textContent='Listening for pitch';}}
  if(prefs.mode==='auto'&&now-state.lastGuessAt>1200){state.lastGuessAt=now;
    const found=deriveKey();
    if(found){const prev=state.key; // Avoid jitter unless evidence is noticeably clearer or key was unset.
      if(!prev || (found.root===prev.root&&found.mode===prev.mode) || (found.confidence>.42 && found.score>(prev.score||0)+.18))state.key=found;
      state.keyConfidence=found.confidence;
    }
  }
  const effectiveKey=prefs.mode==='guided'?keyFromGuided():state.key;
  $('keyValue').textContent=notation(effectiveKey);
  $('keyDetail').textContent=prefs.mode==='guided'?'Manual guidance':(state.key?'Tentative estimate':'Learning melody');
  $('bpmValue').textContent=prefs.mode==='guided'?String(prefs.guidedBpm):(state.bpmTap||state.bpmDetected?String(state.bpmTap||state.bpmDetected):'~'+(prefs.style==='praise'?'116':'80'));
}
function currentBpm(){return cap(prefs.mode==='guided'?prefs.guidedBpm:(state.bpmTap||state.bpmDetected||(prefs.style==='praise'?116:80)),45,210);}
function chordFromDegree(key,degree){
  const scale=key.mode==='minor'?MINOR:MAJOR;
  const rootShift=scale[degree];
  const offsets=[scale[(degree+2)%7]+(degree+2>=7?12:0)-rootShift,scale[(degree+4)%7]+(degree+4>=7?12:0)-rootShift];
  const rootMidi=48+key.root+rootShift;const notes=[rootMidi,rootMidi+offsets[0],rootMidi+offsets[1]];
  // The 5th degree in minor can be major for traditional harmonic-minor cadences.
  if(key.mode==='minor'&&degree===4)notes[1]=rootMidi+4;
  let suffix=offsets[0]===3?'m':'';
  if(offsets[0]===3&&offsets[1]===6)suffix='dim';
  if(key.mode==='minor'&&degree===4)suffix='';
  return {name:NOTES[(key.root+rootShift)%12]+suffix,notes,pc:notes.map(m=>m%12),degree};
}
function nextChord(){
  const key=prefs.mode==='guided'?keyFromGuided():state.key;
  if(!key)return null;
  const guidedProgression=CHORD_DEGREES[prefs.progression]||CHORD_DEGREES['1544'];
  const template=prefs.mode==='guided'?guidedProgression:(prefs.style==='praise'?CHORD_DEGREES['1454']:CHORD_DEGREES['1544']);
  const target=template[state.barIndex%template.length];
  if(prefs.mode==='guided')return chordFromDegree(key,target);
  // Heuristic chord choice: prefer template changes compatible with detected melody.
  // Cannot truly infer chord function/song identity from single-note input.
  const melodyNote=state.stablePitch===null?null:state.stablePitch%12;
  const candidates=[0,3,4,5,1].map(d=>chordFromDegree(key,d));
  let winner=null,best=-Infinity;
  for(const candidate of candidates){
    let score=candidate.degree===target?2.2:0;
    if(melodyNote!==null)score+=candidate.pc.includes(melodyNote)?3.4:-1.8;
    if(state.currentChord && candidate.degree===state.currentChord.degree)score+=.45;
    if(state.currentChord && candidate.degree!==state.currentChord.degree)score-=.25;
    if(score>best){best=score;winner=candidate;}
  }
  return winner;
}
function schedule(){
  if(!state.running||!state.audioCtx||state.audioCtx.state!=='running')return;
  const ctx=state.audioCtx,bpm=currentBpm(),beatLen=60/bpm;
  if(state.nextBeatTime<ctx.currentTime-.5)state.nextBeatTime=ctx.currentTime+.06;
  let passes=0;
  while(state.nextBeatTime<ctx.currentTime+.14 && passes++<8){
    const beat=state.beatIndex;const when=state.nextBeatTime;
    const canPlay=prefs.mode==='guided'||(state.key&&performance.now()-state.lastVoicedAt<4200);
    if(beat===0){
      if(canPlay){const next=nextChord();if(next){state.currentChord=next;state.barIndex++;$('chordName').textContent=next.name;$('chordCaption').textContent=prefs.mode==='guided'?'Following your progression':'Estimated harmony · verify by ear';}}
      else {state.currentChord=null;$('chordName').textContent='—';$('chordCaption').textContent=state.key?'Waiting for singing':'Listening for musical key';}
    }
    if(canPlay&&state.currentChord){
      const chord=state.currentChord;
      if(prefs.style==='worship'){
        if(beat===0){playChord(chord.notes,when,beatLen*3.85,.7);playBass(chord.notes[0]-12,when,beatLen*3.35,.42);}
      }else{
        if(beat===0||beat===2){playChord(chord.notes,when,beatLen*.88,beat===0?.8:.59);playBass(chord.notes[0]-12,when,beatLen*.82,.52);}
        if(beat===3)playChord(chord.notes.slice(1),when,beatLen*.42,.37);
      }
    }
    queueBeatVisual(beat,when);
    state.nextBeatTime+=beatLen;state.beatIndex=(beat+1)%4;
  }
}
function queueBeatVisual(beat,when){
  // A small lookahead is scheduled; visual catch-up uses requestAnimationFrame.
  state.visualBeat={beat,time:when};
}
function playChord(notes,time,duration,velocity){if(!state.audioCtx)return;const voiced=notes.map(m=>m+12);for(const note of voiced)playNote(note,time,duration,velocity/Math.sqrt(notes.length));state.playingMidi=voiced;state.lastNotesExpiry=time+duration;}
function playBass(note,time,duration,velocity){playNote(note,time,duration,velocity*.72);state.playingMidi=[...state.playingMidi,note];}
function playNote(midi,time,duration,velocity){
  const ctx=state.audioCtx;if(!ctx)return;
  const preset=prefs.instrument;const gain=ctx.createGain();const now=Math.max(time,ctx.currentTime+.001);
  const attack=preset==='pad'?.22:preset==='organ'?.035:.009,release=preset==='pad'?.48:preset==='organ'?.18:.17;
  const stop=now+Math.max(.07,duration)+release+.05;
  const loud=cap(velocity*.23,0,.4);
  gain.gain.setValueAtTime(.00001,now);gain.gain.linearRampToValueAtTime(loud,now+attack);
  if(preset==='piano'){gain.gain.exponentialRampToValueAtTime(Math.max(.007,loud*.33),now+Math.min(1.3,Math.max(.26,duration*.7)));}
  else gain.gain.setValueAtTime(loud*.83,now+attack+.04);
  gain.gain.setTargetAtTime(.00001,Math.max(now+attack+.12,now+duration),release/3);
  gain.connect(state.master);
  const harmonics=preset==='organ'?[[1,'sine',.75],[2,'sine',.35],[3,'sine',.13]]:preset==='pad'?[[1,'sine',.78],[2,'triangle',.22]]:[[1,'triangle',.76],[2,'sine',.16],[3,'sine',.09]];
  const oscillators=[];
  for(const [multiple,type,volume] of harmonics){const osc=ctx.createOscillator(),sub=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(midiToHz(midi)*multiple,now);if(preset==='piano')osc.frequency.setTargetAtTime(midiToHz(midi)*multiple*.9992,now+.04,.12);sub.gain.value=volume;osc.connect(sub);sub.connect(gain);osc.start(now);osc.stop(stop);oscillators.push(osc);}
  const voice={gain,oscillators,stop};state.voices.push(voice);
  oscillators[0].onended=()=>{try{gain.disconnect();}catch{}state.voices=state.voices.filter(v=>v!==voice);};
  // Prevent unbounded voice list on long sessions.
  if(state.voices.length>110){const old=state.voices.splice(0,12);old.forEach(v=>v.oscillators.forEach(o=>{try{o.stop();}catch{}}));}
}
function stopVoices(){if(!state.audioCtx)return;const time=state.audioCtx.currentTime;for(const v of state.voices){try{v.gain.gain.cancelScheduledValues(time);v.gain.gain.setTargetAtTime(.00001,time,.012);}catch{}v.oscillators.forEach(o=>{try{o.stop(time+.08);}catch{}});}state.voices=[];}
async function testChord(){try{await ensureAudio();const notes=[48,52,55];playChord(notes,state.audioCtx.currentTime+.02,1.1,.85);$('chordName').textContent='C';$('chordCaption').textContent='Sound test · C major';$('playingNotes').textContent='C · E · G';showLog('Sound test: C major chord. If silent, check output device and volume.');setTimeout(()=>{if(!state.running){refreshKeyboard([]);$('playingNotes').textContent='No notes yet';}},1350);}catch(e){showLog(e.message);}}
const taps=[];
function tapTempo(){const now=performance.now();if(taps.length&&now-taps[taps.length-1]>2300)taps.length=0;taps.push(now);if(taps.length>6)taps.shift();
  if(taps.length>=2){const diffs=[];for(let i=1;i<taps.length;i++)diffs.push(taps[i]-taps[i-1]);diffs.sort((a,b)=>a-b);const bpm=cap(Math.round(60000/diffs[Math.floor(diffs.length/2)]),45,210);
    if(prefs.mode==='guided'){prefs.guidedBpm=bpm;$('guidedBpm').value=bpm;persist();}else state.bpmTap=bpm;
    $('bpmValue').textContent=bpm;showLog(`Tap tempo set to ${bpm} BPM${prefs.mode==='auto'?' (optional override)':''}.`);
  }else showLog('Tap at least twice in time with the beat.');
}
function createKeyboard(){
  const root=$('keyboard');root.innerHTML='';
  const first=48,last=83;const whites=[];let whiteIdx=0;
  for(let m=first;m<=last;m++)if(![1,3,6,8,10].includes(m%12)){const el=document.createElement('div');el.className='white-key';el.dataset.midi=m;if(m%12===0){const label=document.createElement('span');label.className='key-label';label.textContent='C'+(Math.floor(m/12)-1);el.append(label);}root.append(el);whites.push(m);whiteIdx++;}
  const count=whites.length;
  for(let m=first;m<=last;m++)if([1,3,6,8,10].includes(m%12)){const prevWhite=whites.filter(n=>n<m).length;if(prevWhite===0||prevWhite===count)continue;const el=document.createElement('div');el.className='black-key';el.dataset.midi=m;el.style.left=`${100*prevWhite/count}%`;root.append(el);}
}
function refreshKeyboard(notes){const set=new Set(notes.map(n=>((n-48)%12+12)%12));for(const el of $('keyboard').children)el.classList.toggle('active',set.has((Number(el.dataset.midi)-48)%12));}
function draw(){
  const canvas=$('waveCanvas'),ctx=canvas.getContext('2d');if(ctx){
    const {width:w,height:h}=canvas;ctx.clearRect(0,0,w,h);
    const mid=h/2;ctx.strokeStyle='#8567b650';ctx.lineWidth=1;
    for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(0,mid+k*28);ctx.lineTo(w,mid+k*28);ctx.stroke();}
    const t=performance.now()*.001,amp=state.running?1:.2;
    ctx.beginPath();ctx.lineWidth=3;ctx.strokeStyle='#c09cff';ctx.shadowColor='#ac83ff';ctx.shadowBlur=15;
    for(let x=0;x<w;x+=2){let y=mid;
      if(state.running&&state.audioBuffer){const idx=Math.floor(x/w*state.audioBuffer.length);y=mid+(state.audioBuffer[idx]||0)*h*1.25;}
      else y=mid+Math.sin(x*.025+t*1.2)*5*amp+Math.sin(x*.062-t)*2*amp;
      if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }ctx.stroke();ctx.shadowBlur=0;
    const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#b98eff00');grad.addColorStop(.5,'#b98eff24');grad.addColorStop(1,'#b98eff00');ctx.strokeStyle=grad;ctx.lineWidth=13;ctx.stroke();
  }
  const ms=performance.now();if(state.running)analyse(ms);
  const beat=state.visualBeat;if(beat&&state.audioCtx&&state.audioCtx.currentTime>=beat.time){document.querySelectorAll('.beat').forEach((el,i)=>el.classList.toggle('active',i===beat.beat));state.visualBeat=null;}
  if(state.audioCtx){const audTime=state.audioCtx.currentTime;if(state.playingMidi.length&&(!state.lastNotesExpiry||audTime<state.lastNotesExpiry)){refreshKeyboard(state.playingMidi);$('playingNotes').textContent=state.playingMidi.filter(n=>n>=48).map(nameOf).filter((s,i,a)=>a.indexOf(s)===i).join(' · ');}else if(state.lastNotesExpiry&&audTime>=state.lastNotesExpiry){refreshKeyboard([]);state.playingMidi=[];$('playingNotes').textContent='Resting';}}
  state.frameId=requestAnimationFrame(draw);
}
function exportPrefs(){const blob=new Blob([JSON.stringify({app:'ChurchKeys Beta',exportedAt:new Date().toISOString(),preferences:prefs},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='churchkeys-church-preferences.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);showLog('Exported this browser’s settings as JSON (no recordings included).');}
init();
