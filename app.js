/* ChurchKeys Beta v0.4 — Service Flow & Bass Lab
 * No paid API, server secrets, song crawling, or uploaded audio.
 * Live pitch/key estimation remains experimental, NOT live song recognition.
 * Richer gospel-style rhythm arrangements are heuristic MIDI-like note patterns.
 * Optional Salamander piano recordings are CC BY 3.0 (Alexander Holm).
 */
'use strict';
const $ = id => document.getElementById(id);
const NOTES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const CHORD_DEGREES = {1544:[0,4,5,3],1451:[0,3,4,0],1645:[0,5,3,4],1454:[0,3,4,3],2511:[1,4,0,0],1625:[0,5,1,4],1415:[0,3,0,4],1345:[0,2,3,4]};
const MAJOR = [0,2,4,5,7,9,11];
const MINOR = [0,2,3,5,7,8,10];
const KEY_MAJOR_PROFILE = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const KEY_MINOR_PROFILE = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const STYLE_PROGRAMS = {auto:{bpm:76,label:'Follow the service'},worship:{bpm:76,label:'Gentle worship'},praise:{bpm:129,label:'Praise groove'},highlife:{bpm:129,label:'Highlife praise'},ariaria:{bpm:152,label:'Ariaria praise'}}; // Tempo suggestions, not exact transcriptions.
const defaults = {mode:'auto',style:'auto',instrument:'piano',bassLevel:65,bassEnabled:true,volume:35,sensitivity:55,echoReduction:true, guidedKey:'0:major',progression:'1544',guidedBpm:80,energy:60,fills:true,samples:true};
let prefs = {...defaults};
try { const saved=JSON.parse(localStorage.getItem('churchkeys-preferences-v1')||'null'); if(saved && typeof saved==='object') prefs={...defaults,...saved}; } catch {}
let displayView=localStorage.getItem('churchkeys-display-view')==='musician'?'musician':'simple';
const SAMPLE_BASE = 'https://tonejs.github.io/audio/salamander/';
const SAMPLE_MAP = {'C2':36,'A2':45,'Ds3':51,'Fs3':54,'A3':57,'C4':60,'Ds4':63,'Fs4':66,'A4':69,'C5':72,'Ds5':75,'Fs5':78,'A5':81};
const churchSongs = (() => { try { const a=JSON.parse(localStorage.getItem('churchkeys-arrangements-v2')||'[]');return Array.isArray(a)?a.slice(0,80):[]; } catch{return [];} })();
const state = {
  running:false, demo:false, preview:false, audioCtx:null, master:null, limiter:null, analyser:null, silence:null,
  micStream:null, inputSource:null, demoTimer:null, demoVoice:null, demoStep:0,
  scheduleTimer:null, nextBeatTime:0, beatIndex:0, stepIndex:0, barIndex:0, currentChord:null, previousChord:null, voicing:null,
  playingMidi:[],voices:[], pitchMidi:null, pitchConfidence:0, stablePitch:null, recentPitch:[], chroma:Array(12).fill(0),
  key:null, keyConfidence:0, recentEvents:0, lastVoicedAt:0, lastAnalysis:0, lastGuessAt:0,
  bpmDetected:null, bpmTap:null, onsetTimes:[], lastOnset:0, priorRms:0, lastVisual:0,
  playingStyle:'worship', candidateStyle:null, candidateSince:0, lastMusicAt:0, lastOnsetAt:0,
  stagePreview:false, flowStage:0, grooveConfidence:'waiting', bpmStable:null, bpmLastUpdate:0, lastStageChange:0,
  audioBuffer:null, pitchBuffer:null, pianoSamples:new Map(), samplesPending:false, samplesFailed:false, frameId:0, diagnostic:'', status:'Standby'
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
  $('volumeSlider').value=prefs.volume;$('bassLevel').value=prefs.bassLevel;$('sensitivitySlider').value=prefs.sensitivity;$('energySlider').value=prefs.energy;$('fillsToggle').checked=prefs.fills!==false;$('samplesToggle').checked=prefs.samples!==false;updateValues();refreshSongs(); selectMode(prefs.mode,false);selectStyle(prefs.style,false);createKeyboard();
  applyDisplayView();
  $('studioToggle').addEventListener('click',()=>{displayView=displayView==='simple'?'musician':'simple';localStorage.setItem('churchkeys-display-view',displayView);applyDisplayView();});
  $('quickStyle').value=prefs.style;
  $('quickStyle').addEventListener('change',()=>{
    const style=$('quickStyle').value;selectStyle(style);
    if(!state.running){prefs.guidedBpm=STYLE_PROGRAMS[style]?.bpm||76;$('guidedBpm').value=prefs.guidedBpm;persist();}
    showLog('Selected '+(STYLE_PROGRAMS[style]?.label||style)+'. Start playing to listen, or choose Hear an example groove.');
  });
  $('quickStartBtn').addEventListener('click',()=>startSession('mic'));
  $('quickStopBtn').addEventListener('click',stopSession);
  $('quickGrooveBtn').addEventListener('click',()=>startSession('groove'));
  $('quickFlowBtn').addEventListener('click',()=>startSession('flow'));
  $('bassToggleQuick').addEventListener('click',()=>{prefs.bassEnabled=!prefs.bassEnabled;syncBassUI();persist();showLog('Bass guitar '+(prefs.bassEnabled?'enabled':'muted')+'.');});
  $('quickSavedSongs').addEventListener('change',()=>{
    const id=$('quickSavedSongs').value;
    if(!id){selectMode('auto');showLog('Autonomous listening selected. Saved song guidance cleared.');return;}
    $('savedSongs').value=id;loadArrangement();$('quickStyle').value=prefs.style;
  });
  $('startBtn').addEventListener('click',()=>startSession('mic'));
  $('echoToggle').checked = prefs.echoReduction !== false;
  $('echoToggle').addEventListener('change', async()=>{prefs.echoReduction=$('echoToggle').checked;persist();if(state.running&&!state.demo){await stopSession();await startSession('mic');}else showLog('Echo reduction saved; it will apply to the next microphone session.');});
  $('demoBtn').addEventListener('click',()=>startSession('demo'));$('grooveBtn').addEventListener('click',()=>startSession('groove'));
  $('stopBtn').addEventListener('click',()=>stopSession());
  $('testChordBtn').addEventListener('click',testChord);
  $('tapBtn').addEventListener('click',tapTempo);$('tapTopBtn').addEventListener('click',tapTempo);
  $('noticeDismiss').addEventListener('click',e=>e.currentTarget.closest('.notice').remove());
  $('modeSelect').addEventListener('click',e=>{const el=e.target.closest('[data-mode]');if(el)selectMode(el.dataset.mode);});
  $('styleSelect').addEventListener('click',e=>{const el=e.target.closest('[data-style]');if(el)selectStyle(el.dataset.style);});
  for(const [id,key] of [['guidedKey','guidedKey'],['progressionSelect','progression'],['guidedBpm','guidedBpm'],['instrumentSelect','instrument']]) $(id).addEventListener('change',()=>{prefs[key]=key==='guidedBpm'?cap(Number($(id).value)||80,45,210):$(id).value; if(key==='guidedBpm')$(id).value=prefs[key]; if(key==='guidedKey')state.key=keyFromGuided();persist();updateValues();});
  for(const [id,key] of [['volumeSlider','volume'],['sensitivitySlider','sensitivity']]) $(id).addEventListener('input',()=>{prefs[key]=Number($(id).value);updateValues(); if(key==='volume')updateMaster();persist();});
  $('savePrefBtn').addEventListener('click',()=>{persist();showLog('Church preferences saved in this browser.');});
  $('saveSongBtn').addEventListener('click',saveArrangement);
  $('loadSongBtn').addEventListener('click',loadArrangement);
  $('deleteSongBtn').addEventListener('click',deleteArrangement);
  $('energySlider').addEventListener('input',()=>{prefs.energy=Number($('energySlider').value);updateValues();persist();});
  $('fillsToggle').addEventListener('change',()=>{prefs.fills=$('fillsToggle').checked;persist();});
  $('samplesToggle').addEventListener('change',()=>{prefs.samples=$('samplesToggle').checked;persist();if(prefs.samples&&state.audioCtx)loadPianoSamples();});
  $('bassLevel').addEventListener('input',()=>{prefs.bassLevel=Number($('bassLevel').value);syncBassUI();persist();});
  $('bassEnabled').addEventListener('change',()=>{prefs.bassEnabled=$('bassEnabled').checked;syncBassUI();persist();});
  $('exportBtn').addEventListener('click',exportPrefs);
  $('inputDevice').addEventListener('change',async()=>{if(state.running&&!state.demo){await stopSession();await startSession('mic');}});
  if(navigator.mediaDevices?.enumerateDevices)navigator.mediaDevices.enumerateDevices().then(updateDeviceList).catch(()=>{});
  draw();
  updateQuickControls();syncBassUI();
  if('serviceWorker' in navigator && window.isSecureContext){navigator.serviceWorker.register('./sw.js').catch(()=>{});}
  if(!window.isSecureContext)showLog('Microphone requires HTTPS (Netlify provides this) or localhost. Demo sound may still work.');
  window.addEventListener('pagehide',()=>{if(state.running)stopSession();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running)showLog('Keep this tab visible during performance. Background tabs can disrupt browser timing.');});
}
function applyDisplayView(){
  document.body.dataset.view=displayView;
  const open=displayView==='musician';$('studioToggle').setAttribute('aria-expanded',String(open));
  $('studioToggle').innerHTML=open?'✦ Simple View <span>↗</span>':'⚙ Musician View <span>↗</span>';
}
function updateQuickControls(){
  $('quickStartBtn').disabled=state.running&&!state.preview;
  $('quickStopBtn').disabled=!state.running;
  $('quickGrooveBtn').disabled=state.running&&state.preview;
  $('quickFlowBtn').disabled=state.running&&state.stagePreview;
  $('quickStyle').value=prefs.style;
}
function syncBassUI(){
  $('bassEnabled').checked=prefs.bassEnabled;
  $('bassLevel').value=prefs.bassLevel;
  $('bassLevelText').textContent=prefs.bassLevel+'%';
  const quick=$('bassToggleQuick');quick.setAttribute('aria-pressed',String(prefs.bassEnabled));
  quick.textContent=prefs.bassEnabled?'♬ Bass guitar ON':'♬ Bass guitar OFF';
}
function showFeel(style,confidence){
  const label=(STYLE_PROGRAMS[style]||STYLE_PROGRAMS.worship).label;
  $('feelStatus').textContent='Now: '+label+(prefs.style==='auto'&& !state.preview?' · '+(confidence||'estimated'):'');
}
function persist(){try{localStorage.setItem('churchkeys-preferences-v1',JSON.stringify(prefs));}catch{}}
function updateValues(){
  $('volumeLabel').textContent=prefs.volume+'%';$('sensitivityLabel').textContent=prefs.sensitivity+'%';$('energyLabel').textContent=prefs.energy+'%';
  if(state.running&&prefs.mode==='guided'){$('keyValue').textContent=notation(keyFromGuided());$('keyDetail').textContent='Manual guidance';$('bpmValue').textContent=prefs.guidedBpm;}
  updateMaster();
}
function selectMode(mode,save=true){
  prefs.mode=mode;
  [...$('modeSelect').querySelectorAll('button')].forEach(btn=>btn.classList.toggle('selected',btn.dataset.mode===mode));
  $('guidedBox').hidden=mode!=='guided';
  $('modeHint').textContent=mode==='auto'?'Estimates key from live notes; creates fuller accompaniment, but chord tracking is still experimental.':'You provide a key, tempo and chord progression. The app plays automatically with stronger musical predictability.';
  if(mode==='guided')state.key=keyFromGuided();else {state.key=null; state.chroma.fill(0);state.recentEvents=0;}
  if(mode==='auto')$('quickSavedSongs').value='';if(save)persist(); if(state.running){state.nextBeatTime=state.audioCtx.currentTime+0.12;state.beatIndex=0;state.stepIndex=0;state.previousChord=null;state.voicing=null;showLog(mode==='auto'?'Autonomous mode: waiting for enough clean melody notes.':'Guided mode: following your selected progression.');}
}
function selectStyle(style,save=true){if(!STYLE_PROGRAMS[style])style='auto';prefs.style=style;[...$('styleSelect').querySelectorAll('button')].forEach(btn=>btn.classList.toggle('active',btn.dataset.style===style));$('quickStyle').value=style;if(!state.running){state.playingStyle=style==='auto'?'worship':style;showFeel(state.playingStyle,style==='auto'?'waiting for audio':'manual');}if(save)persist();}
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
  if(prefs.samples&&!state.samplesPending&&!state.samplesFailed&&state.pianoSamples.size<4)loadPianoSamples();
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
    } else if(type==='demo') {state.demo=true;state.demoStep=0;startDemoMelody();}
    state.running=true;state.demo=type==='demo';state.preview=type==='groove'||type==='flow';state.stagePreview=type==='flow';state.chroma.fill(0);state.recentEvents=0;state.recentPitch=[];state.stablePitch=null;state.key=(prefs.mode==='guided'||state.preview)?keyFromGuided():null;state.pitchMidi=null;state.keyConfidence=0;state.lastVoicedAt=0;state.lastOnset=0;state.onsetTimes=[];state.bpmDetected=type==='demo'?90:null;state.priorRms=0;state.beatIndex=0;state.stepIndex=0;state.barIndex=0;state.currentChord=null;state.previousChord=null;state.voicing=null;state.nextBeatTime=state.audioCtx.currentTime+.2;state.lastAnalysis=0;state.lastMusicAt=0;state.playingStyle=prefs.style==='auto'?'worship':prefs.style;state.candidateStyle=null;state.candidateSince=0;state.flowStage=0;state.bpmStable=null;state.lastStageChange=0;showFeel(state.playingStyle,state.preview?'example, not live':'listening');
    state.scheduleTimer=setInterval(schedule,45);
    $('startBtn').disabled=type==='mic';$('demoBtn').disabled=type==='demo';$('grooveBtn').disabled=type==='groove';$('stopBtn').disabled=false;
    updateQuickControls();setStatus(state.preview?'Groove preview':type==='demo'?'Demo playing':'Listening',type==='mic'?'live':'demo');$('sourceLabel').textContent=type==='groove'?'NO MICROPHONE · PLAYBACK EXAMPLE':type==='demo'?'SIMULATED VOCAL MELODY':'MICROPHONE INPUT';
    $('playingIndicator').textContent='Active';$('playingIndicator').classList.add('live');if(state.preview){$('keyValue').textContent=notation(keyFromGuided());$('keyDetail').textContent='Groove preview key';$('bpmValue').textContent=String(prefs.guidedBpm);$('signalText').textContent='No mic needed for preview';}
    showLog(type==='flow'?'Service Flow demonstration: original worship, praise, highlife and Ariaria arrangements change at bar boundaries. This is NOT live automatic recognition.':type==='groove'?'Playing an example groove without a microphone. Use Stop all to end preview.':type==='demo'?'Demo runs a simulated melody into the pitch detector. This is NOT a real church recording.':'Microphone connected. Your built-in mic works without extra cables. Sing clearly for a few seconds; watch Detected note first.');
  }catch(e){await stopSession();const message=e?.name==='NotAllowedError'?'Microphone permission denied. Enable microphone access in your browser site settings.':e?.message||'Unable to start audio.';showLog(message);setStatus('Input error');}
}
async function stopSession(){
  state.running=false; if(state.scheduleTimer){clearInterval(state.scheduleTimer);state.scheduleTimer=null;}
  if(state.demoTimer){clearInterval(state.demoTimer);state.demoTimer=null;}
  if(state.demoVoice){try{state.demoVoice.stop();}catch{}try{state.demoVoice.disconnect();}catch{}state.demoVoice=null;}
  if(state.inputSource){try{state.inputSource.disconnect();}catch{}state.inputSource=null;}
  if(state.micStream){state.micStream.getTracks().forEach(t=>t.stop());state.micStream=null;}
  stopVoices();state.demo=false;state.preview=false;state.stagePreview=false;state.pitchMidi=null;state.recentPitch=[];state.playingMidi=[];state.currentChord=null;
  $('startBtn').disabled=false;$('demoBtn').disabled=false;$('grooveBtn').disabled=false;$('stopBtn').disabled=true;
  $('sourceLabel').textContent='NO AUDIO SOURCE';$('signalText').textContent='Awaiting input';$('noteValue').textContent='—';$('noteDetail').textContent='Waiting for voice';$('keyValue').textContent='—';$('keyDetail').textContent='Learning melody';$('bpmValue').textContent='—';$('signalValue').textContent='0%';$('signalBar').style.width='0%';
  $('chordName').textContent='—';$('chordCaption').textContent='Start listening to begin';$('playingNotes').textContent='No notes yet';
  $('playingIndicator').textContent='Paused';$('playingIndicator').classList.remove('live');setStatus('Standby');refreshKeyboard([]);
  showFeel(prefs.style==='auto'?'worship':prefs.style,prefs.style==='auto'?'waiting':'manual');updateQuickControls();showLog('Audio stopped. The microphone is disconnected.');
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
  if(!state.running||state.preview||!state.analyser||ts-state.lastAnalysis<92)return;
  state.lastAnalysis=ts;state.analyser.getFloatTimeDomainData(state.audioBuffer);
  const result=pitchYin(state.audioBuffer,state.audioCtx.sampleRate);
  const volume=cap(result.rms*360,0,100);$('signalValue').textContent=Math.round(volume)+'%';$('signalBar').style.width=volume+'%';
  $('signalText').textContent=result.rms<.012?'Low signal':volume>85?'High input level':'Signal receiving';
  const now=performance.now();
  // Broad amplitude transient estimate (not robust drum separation).
  if(!state.demo&&result.rms>.025 && result.rms>state.priorRms*1.55 && now-state.lastOnset>280){
    if(state.lastOnset)state.onsetTimes.push(now-state.lastOnset);state.lastOnset=now;
    state.onsetTimes=state.onsetTimes.slice(-10);
    if(state.onsetTimes.length>=5){const arr=state.onsetTimes.filter(n=>n>=290&&n<=1100).sort((a,b)=>a-b);if(arr.length>=4){let bpm=60000/arr[Math.floor(arr.length/2)];if(bpm<68)bpm*=2;if(bpm>180)bpm/=2;if(bpm>=65&&bpm<=185){
          // Smooth large tempo jumps; some detected pulses are half/double-time errors.
          if(state.bpmStable){
            const options=[bpm,bpm*2,bpm/2].filter(x=>x>=65&&x<=185);
            bpm=options.sort((a,b)=>Math.abs(a-state.bpmStable)-Math.abs(b-state.bpmStable))[0]||bpm;
          }
          state.bpmStable=state.bpmStable===null?bpm:(.78*state.bpmStable+.22*bpm);
          state.bpmDetected=Math.round(state.bpmStable);state.bpmLastUpdate=now;
        }}}
  }
  state.priorRms=state.priorRms*.65+result.rms*.35;
  if(!state.demo&&result.rms>.022)state.lastMusicAt=now;
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
  const effectiveKey=(prefs.mode==='guided'||state.preview)?keyFromGuided():state.key;
  $('keyValue').textContent=notation(effectiveKey);
  $('keyDetail').textContent=(prefs.mode==='guided'||state.preview)?'Manual guidance':(state.key?'Tentative estimate':'Learning melody');
  $('bpmValue').textContent=(prefs.mode==='guided'||state.preview)?String(prefs.guidedBpm):(state.bpmTap||state.bpmDetected?String(state.bpmTap||state.bpmDetected):'~'+(STYLE_PROGRAMS[prefs.style]?.bpm||76));
}
function currentBpm(){
  if(state.stagePreview)return STYLE_PROGRAMS[state.playingStyle]?.bpm||76;
  if(state.preview||prefs.mode==='guided')return cap(prefs.guidedBpm,45,210);
  return cap(state.bpmTap||state.bpmDetected||(STYLE_PROGRAMS[state.playingStyle]?.bpm||76),45,210);
}
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
  const key=(prefs.mode==='guided'||state.preview)?keyFromGuided():state.key;
  if(!key)return null;
  const guidedProgression=CHORD_DEGREES[prefs.progression]||CHORD_DEGREES['1544'];
  const template=(prefs.mode==='guided'||state.preview)?guidedProgression:(state.playingStyle==='worship'?CHORD_DEGREES['1544']:CHORD_DEGREES['1454']);
  const target=template[state.barIndex%template.length];
  if(prefs.mode==='guided'||state.preview)return chordFromDegree(key,target);
  // Heuristic chord choice: prefer template changes compatible with detected melody.
  // Cannot truly infer chord function/song identity from single-note input.
  const melodyNote=(state.pitchMidi===null||performance.now()-state.lastVoicedAt>1300)?null:state.pitchMidi%12;
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
// v0.4: Only choose style when an observable tempo estimate persists.
// This is a heuristic, not audio source separation, AI service classification, or song recognition.
function inferredStyle(){
  if(!state.bpmDetected || performance.now()-state.bpmLastUpdate>9000)return null;
  const bpm=state.bpmDetected;
  if(bpm<99)return 'worship';
  if(bpm<119)return 'praise';
  if(bpm<143)return 'highlife';
  return 'ariaria';
}
function applyStyleAtBar(){
  let proposed=null;
  if(state.stagePreview){
    const sequence=['worship','praise','highlife','ariaria','worship'];
    proposed=sequence[Math.floor(state.barIndex/2)%sequence.length];
  }else if(prefs.style!=='auto') proposed=prefs.style;
  else proposed=inferredStyle();
  if(proposed && proposed!==state.playingStyle){
    if(state.stagePreview || prefs.style!=='auto'){
      state.playingStyle=proposed;state.lastStageChange=performance.now();state.candidateStyle=null;
      showFeel(proposed,state.stagePreview?'demonstration':'manual');
    }else{
      const now=performance.now();
      if(proposed!==state.candidateStyle){state.candidateStyle=proposed;state.candidateSince=now;}
      else if(now-state.candidateSince>6500){
        state.playingStyle=proposed;state.lastStageChange=now;state.candidateStyle=null;
        showFeel(proposed,'estimated');
        showLog('Tentative style change: '+STYLE_PROGRAMS[proposed].label+'. Check the musical fit by ear.');
      }
    }
  } else if(proposed===state.playingStyle)state.candidateStyle=null;
  if(prefs.style==='auto'&& !state.stagePreview && !proposed)showFeel(state.playingStyle,'tempo uncertain');
}
function nextBassApproach(){
  const key=(prefs.mode==='guided'||state.preview)?keyFromGuided():state.key;
  if(!key||!state.currentChord)return null;
  const template=CHORD_DEGREES[prefs.progression]||CHORD_DEGREES['1544'];
  const degree=(prefs.mode==='guided'||state.preview)?template[state.barIndex%template.length]:null;
  if(degree===null)return null;
  const target=adjustedBass(chordFromDegree(key,degree));
  return target-1;
}
function bassWalk(step,time,sixteenth,beatLen){
  if(prefs.bassEnabled===false||prefs.bassLevel<1||!state.currentChord)return;
  const style=state.playingStyle;
  const root=adjustedBass(state.currentChord);
  if(style==='worship'){
    if(step===12 && state.barIndex%2===0)playBass(root+12,time,beatLen*.75,.24);
    return;
  }
  if((style==='praise'||style==='highlife') && step===7)playBass(root+7,time,beatLen*.38,.29);
  if(style==='ariaria'&&(step===6||step===14))playBass(root+7,time,beatLen*.28,.36);
  if(step===15){
    const passing=nextBassApproach();
    if(passing!==null)playBass(passing,time,sixteenth*.83,.24);
  }
}
function playPadBed(notes,time,duration){
  const ctx=state.audioCtx;if(!ctx)return;
  const when=Math.max(time,ctx.currentTime+.003),gain=ctx.createGain();
  gain.gain.setValueAtTime(.00001,when);
  gain.gain.linearRampToValueAtTime(.045,when+Math.min(.38,duration*.15));
  gain.gain.setTargetAtTime(.00001,when+Math.max(.45,duration-.4),.22);
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=880;gain.connect(state.master);
  const oscillators=[];
  for(const midi of notes.slice(0,3)){
    const osc=ctx.createOscillator(),v=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(midiToHz(midi-12),when);v.gain.value=.22;
    osc.connect(v);v.connect(filter);osc.start(when);osc.stop(when+duration+.6);oscillators.push(osc);
  }
  filter.connect(gain);
  const voice={gain,oscillators};state.voices.push(voice);
  oscillators[0].onended=()=>{try{gain.disconnect();filter.disconnect();}catch{}state.voices=state.voices.filter(v=>v!==voice);};
}
/* 16-step, bar-aware arrangement engine. These are original general-purpose patterns,
 * not transcriptions from a named song or performer. */
function closeVoicing(chord){
  const tones=chord.notes.map(n=>n%12);
  // Shared-tone/nearest-note voice leading in a mid/high register.
  const old=state.voicing;
  let best=null,bestCost=Infinity;
  for(let oct=4;oct<=5;oct++){
    const anchor=12*(oct+1);
    for(let inversion=0;inversion<3;inversion++){
      const base=[...tones.slice(inversion),...tones.slice(0,inversion)];
      const notes=[anchor+base[0]];
      for(let i=1;i<base.length;i++){
        let n=anchor+base[i];while(n<=notes.at(-1))n+=12;notes.push(n);
      }
      while(notes[0]>67)for(let j=0;j<notes.length;j++)notes[j]-=12;
      const cost=old?notes.reduce((acc,n,i)=>acc+Math.abs(n-old[i]),0):notes.reduce((acc,n)=>acc+Math.abs(n-64),0);
      if(cost<bestCost){bestCost=cost;best=notes;}
    }
  }
  // Add 9th in the upper register; keep clear of low register to avoid mud.
  const add9=chord.notes[0]%12;
  const ninth=((add9+2)%12+12)%12;
  let extra=74;while(extra%12!==ninth)extra++;
  return [...best,extra];
}
function adjustedBass(chord){let root=(chord.notes[0]%12+12)%12;let midi=36+root;while(midi>49)midi-=12;while(midi<35)midi+=12;return midi;}
function playRH(notes,when,duration,velocity,amount=3){
  const selected=notes.slice(0,Math.max(2,amount));
  playChord(selected,when,duration,velocity);
}
function pickFill(notes,index){
  // Simple scale-aware top-note answers, not recorded melodies.
  const key=(prefs.mode==='guided'||state.preview)?keyFromGuided():state.key;
  if(!key)return notes[Math.min(2,notes.length-1)];
  const scale=key.mode==='minor'?MINOR:MAJOR;
  const base=72+key.root;
  const pattern=[0,2,4,3,2,1,0,4];
  let n=base+scale[pattern[(index+state.barIndex)%pattern.length]];
  while(n>84)n-=12;return n;
}
function arrangeStep(step,time,sixteenth,beatLen){
  const chord=state.currentChord;if(!chord)return;
  const notes=state.voicing||closeVoicing(chord),bass=adjustedBass(chord);
  const energy=cap((prefs.energy||60)/100,0,1);
  const fills=prefs.fills!==false;
  if(state.playingStyle==='worship'){
    // Broken-chord piano with sustained harmonic support and occasional right-hand answers.
    if(step===0){playRH(notes,time,beatLen*3.4,.42+energy*.16,3);playBass(bass,time,beatLen*2.4,.32+energy*.15);playPadBed(notes,time,beatLen*3.7);}
    if(step===4){playNote(notes[1],time,beatLen*.9,.20+energy*.11);}
    if(step===6 && energy>.28){playNote(notes[3],time,beatLen*.85,.15+energy*.10);}
    if(step===8){playRH(notes,time,beatLen*1.55,.28+energy*.12,4);playBass(bass+7,time,beatLen*.7,.19);}
    if(step===11&&fills){playNote(pickFill(notes,0),time,sixteenth*1.8,.15+energy*.09);}
    if(step===14&&fills&&energy>.38){playNote(pickFill(notes,2),time,sixteenth*1.55,.13+energy*.06);}
  } else if(state.playingStyle==='highlife'){
    // New, generalized highlife-inspired keyboard arrangement. Not a recorded performance.
    const b=state.barIndex%4;
    if(step===0){playBass(bass,time,beatLen*.7,.40+energy*.18);playRH(notes,time,beatLen*.38,.29+energy*.17,3);}
    if(step===2){playRH(notes,time,beatLen*.28,.25+energy*.16,3);}
    if(step===4){playBass(bass+7,time,beatLen*.48,.28+energy*.12);}
    if(step===5){playRH(notes,time,beatLen*.42,.33+energy*.13,4);}
    if(step===7&&fills){playNote(pickFill(notes,b+1),time,sixteenth*.85,.22+energy*.12);}
    if(step===8){playBass(bass+12,time,beatLen*.49,.31+energy*.12);playRH(notes,time,beatLen*.32,.29+energy*.16,3);}
    if(step===10){playRH(notes,time,beatLen*.39,.30+energy*.16,4);}
    if(step===12){playBass(bass+7,time,beatLen*.38,.25+energy*.11);}
    if(step===14){playRH(notes,time,beatLen*.3,.28+energy*.14,3);}
    if(step===15&&fills){playNote(pickFill(notes,b+3),time,sixteenth*.85,.20+energy*.13);}
  } else if(state.playingStyle==='ariaria'){
    // Fast rolling phrase responses; inspired by overall rhythmic character, not transcribed notes.
    const b=state.barIndex%4;
    if(step===0){playBass(bass,time,beatLen*.72,.42+energy*.12);playRH(notes,time,beatLen*.26,.32+energy*.16,3);}
    if(step===2){playNote(notes[2],time,sixteenth*.83,.24+energy*.1);}
    if(step===3){playRH(notes,time,beatLen*.23,.30+energy*.14,3);}
    if(step===4){playBass(bass+7,time,beatLen*.45,.30+energy*.10);}
    if(step===5){playRH(notes,time,beatLen*.28,.28+energy*.13,3);}
    if(step===7&&fills){playNote(pickFill(notes,b+1),time,sixteenth*.9,.22+energy*.11);}
    if(step===8){playBass(bass,time,beatLen*.49,.34+energy*.13);playRH(notes,time,beatLen*.24,.31+energy*.15,4);}
    if(step===10){playRH(notes,time,beatLen*.22,.28+energy*.15,3);}
    if(step===11&&fills){playNote(pickFill(notes,b+2),time,sixteenth*.75,.24);}
    if(step===12){playBass(bass+12,time,beatLen*.29,.28+energy*.11);}
    if(step===13){playRH(notes,time,beatLen*.24,.29+energy*.12,4);}
    if(step===15&&fills){playNote(pickFill(notes,b+4),time,sixteenth*.8,.22+energy*.10);}
  } else {
    // Syncopated, upbeat keyboard stabs inspired by broad Nigerian praise/highlife
    // accompaniment traditions (not exact song-specific arrangements).
    if(step===0){playBass(bass,time,beatLen*.84,.48+energy*.11);playRH(notes,time,beatLen*.30,.30+energy*.12,3);}
    if(step===3){playRH(notes,time,beatLen*.36,.31+energy*.14,4);}
    if(step===4&&energy>.4){playNote(notes[1],time,beatLen*.24,.17);}
    if(step===6){playRH(notes,time,beatLen*.31,.30+energy*.12,3);}
    if(step===8){playBass(bass+7,time,beatLen*.76,.42+energy*.12);}
    if(step===10){playRH(notes,time,beatLen*.36,.32+energy*.10,4);}
    if(step===13){playRH(notes,time,beatLen*.27,.34+energy*.12,3);}
    if(fills&&energy>.22&&step===7){playNote(pickFill(notes,3),time,sixteenth*.8,.23);}
    if(fills&&step===14){playNote(pickFill(notes,4),time,sixteenth*.8,.21+energy*.09);}
    if(fills&&step===15&&state.barIndex%4===0){playNote(pickFill(notes,5),time,sixteenth*.8,.21);}
    if(step===12){playBass(bass,time,beatLen*.40,.29+energy*.08);}
  }
  bassWalk(step,time,sixteenth,beatLen);
}
function schedule(){
  if(!state.running||!state.audioCtx||state.audioCtx.state!=='running')return;
  const ctx=state.audioCtx,bpm=currentBpm(),beatLen=60/bpm,sixteenth=beatLen/4;
  if(state.nextBeatTime<ctx.currentTime-.5)state.nextBeatTime=ctx.currentTime+.035;
  let passes=0;
  while(state.nextBeatTime<ctx.currentTime+.12&&passes++<14){
    const step=state.stepIndex;const when=state.nextBeatTime;
    const canPlay=state.preview||prefs.mode==='guided'||(state.key&&performance.now()-Math.max(state.lastVoicedAt,state.lastMusicAt)<6500);
    if(step===0){
      applyStyleAtBar();
      if(canPlay){const next=nextChord();if(next){state.previousChord=state.currentChord;state.currentChord=next;state.voicing=closeVoicing(next);state.barIndex++;$('chordName').textContent=next.name;$('chordCaption').textContent=state.preview?'Arranged groove · audition':prefs.mode==='guided'?'Guided groove · your selected progression':'Estimated harmony · verify by ear';}}
      else {state.currentChord=null;state.voicing=null;$('chordName').textContent='—';$('chordCaption').textContent=state.key?'Waiting for singing':'Listening for musical key';}
    }
    if(canPlay&&state.currentChord)arrangeStep(step,when,sixteenth,beatLen);
    if(step%4===0)queueBeatVisual(step/4,when);
    state.nextBeatTime+=sixteenth;state.stepIndex=(step+1)%16;
  }
}
function queueBeatVisual(beat,when){
  // A small lookahead is scheduled; visual catch-up uses requestAnimationFrame.
  state.visualBeat={beat,time:when};
}
function playChord(notes,time,duration,velocity){if(!state.audioCtx)return;const voiced=[...notes];for(const note of voiced)playNote(note,time,duration,velocity/Math.sqrt(notes.length));state.playingMidi=voiced;state.lastNotesExpiry=time+duration;}
function playBass(note,time,duration,velocity){
  // Independent plucked electric-bass voice, not just another piano note.
  if(!prefs.bassEnabled||Number(prefs.bassLevel)<1||!state.audioCtx)return;
  const ctx=state.audioCtx,now=Math.max(time,ctx.currentTime+.002);
  const volume=cap(Number(prefs.bassLevel)/100,0,1);
  const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),drive=ctx.createGain();
  const loud=cap(velocity*volume*.58,0,.37);
  gain.gain.setValueAtTime(.00001,now);
  gain.gain.linearRampToValueAtTime(loud,now+.009);
  gain.gain.exponentialRampToValueAtTime(Math.max(.004,loud*.4),now+Math.min(duration*.75,.42));
  gain.gain.setTargetAtTime(.00001,now+Math.max(.1,duration),.07);
  filter.type='lowpass';filter.Q.value=.8;
  filter.frequency.setValueAtTime(260,now);
  filter.frequency.exponentialRampToValueAtTime(1000,now+.018);
  filter.frequency.exponentialRampToValueAtTime(230,now+Math.min(.27,Math.max(.12,duration*.75)));
  drive.gain.value=.78;filter.connect(drive);drive.connect(gain);gain.connect(state.master);
  const oscillators=[];
  for(const [type,octave,amount] of [['triangle',0,.77],['sawtooth',0,.15],['sine',-12,.24]]){
    const osc=ctx.createOscillator(),atten=ctx.createGain();osc.type=type;
    const hz=midiToHz(note+octave);osc.frequency.setValueAtTime(hz*1.004,now);osc.frequency.setTargetAtTime(hz,now+.02,.022);
    atten.gain.value=amount;osc.connect(atten);atten.connect(filter);osc.start(now);osc.stop(now+Math.max(.16,duration)+.42);oscillators.push(osc);
  }
  const voice={gain,oscillators};state.voices.push(voice);
  oscillators[0].onended=()=>{try{gain.disconnect();filter.disconnect();drive.disconnect();}catch{}state.voices=state.voices.filter(v=>v!==voice);};
  state.playingMidi=[...state.playingMidi,note];
}
function playNote(midi,time,duration,velocity){
  const ctx=state.audioCtx;if(!ctx)return;
  const preset=prefs.instrument;const gain=ctx.createGain();const now=Math.max(time,ctx.currentTime+.001);
  if(preset==='piano'&&prefs.samples&&state.pianoSamples.size){
    const keys=[...state.pianoSamples.keys()];let nearest=keys[0];for(const n of keys)if(Math.abs(n-midi)<Math.abs(nearest-midi))nearest=n;
    const buffer=state.pianoSamples.get(nearest);
    const src=ctx.createBufferSource();src.buffer=buffer;src.playbackRate.value=Math.pow(2,(midi-nearest)/12);
    const loud=cap(velocity*.34,0,.44);
    gain.gain.setValueAtTime(.00001,now);gain.gain.linearRampToValueAtTime(loud,now+.012);
    gain.gain.setTargetAtTime(.00001,now+Math.max(.09,duration),.105);
    src.connect(gain);gain.connect(state.master);src.start(now);
    src.stop(now+Math.min(buffer.duration/src.playbackRate.value,Math.max(.22,duration)+.55));
    const voice={gain,oscillators:[src]};state.voices.push(voice);
    src.onended=()=>{try{gain.disconnect();}catch{}state.voices=state.voices.filter(v=>v!==voice);};
    return;
  }
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
async function loadPianoSamples(){
  if(state.samplesPending||state.pianoSamples.size>=10||state.samplesFailed||!state.audioCtx)return;
  state.samplesPending=true;const label=$('sampleStatus');label.textContent='Loading real piano samples…';
  const entries=Object.entries(SAMPLE_MAP);
  const settled=await Promise.allSettled(entries.map(async([name,midi])=>{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),9000);
    try {const res=await fetch(SAMPLE_BASE+name+'.mp3',{signal:controller.signal});if(!res.ok)throw Error('Sample HTTP '+res.status);
      const data=await res.arrayBuffer();return [midi,await state.audioCtx.decodeAudioData(data)];
    } finally{clearTimeout(timeout);}
  }));
  for(const r of settled)if(r.status==='fulfilled')state.pianoSamples.set(r.value[0],r.value[1]);
  state.samplesPending=false;state.samplesFailed=state.pianoSamples.size===0;
  if(state.pianoSamples.size){label.textContent='Real piano samples: ready ('+state.pianoSamples.size+')';showLog('Real piano samples loaded (Salamander Grand Piano, Alexander Holm; CC BY 3.0).');}
  else {label.textContent='Samples unavailable · built-in synth fallback';showLog('Could not download optional piano samples. Synth still works; check network and reload to retry.');}
}
function refreshSongs(){const sel=$('savedSongs');const current=sel.value;sel.innerHTML='';const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a saved song';sel.append(placeholder);
  const quick=$('quickSavedSongs');quick.innerHTML='';const hint=document.createElement('option');hint.value='';hint.textContent='Listen & decide automatically';quick.append(hint);
  for(const item of churchSongs){const op=document.createElement('option');op.value=item.id;op.textContent=item.name;sel.append(op);quick.append(op.cloneNode(true));}
  if(prefs.mode==='guided'&&quick.querySelector('option[value="'+CSS.escape(current)+'"]'))quick.value=current;
  if([...sel.options].some(x=>x.value===current))sel.value=current;
}
function saveArrangement(){const name=$('songName').value.trim().replace(/\s+/g,' ').slice(0,72);
  if(!name){showLog('Enter a song name before saving your church arrangement.');return;}
  const id=name.toLowerCase();const item={id,name,key:prefs.guidedKey,bpm:prefs.guidedBpm,style:prefs.style,progression:prefs.progression,energy:prefs.energy,updatedAt:new Date().toISOString()};
  const pos=churchSongs.findIndex(s=>s.id===id);if(pos>=0)churchSongs[pos]=item;else churchSongs.push(item);
  if(churchSongs.length>80)churchSongs.shift();localStorage.setItem('churchkeys-arrangements-v2',JSON.stringify(churchSongs));refreshSongs();$('savedSongs').value=id;
  showLog('Saved “'+name+'” as a church arrangement. This remembers YOUR settings; it does not identify the song from audio or train a model.');
}
function loadArrangement(){const item=churchSongs.find(x=>x.id===$('savedSongs').value);if(!item){showLog('Select a saved arrangement first.');return;}
  prefs.guidedKey=item.key;prefs.guidedBpm=item.bpm;prefs.style=item.style;prefs.progression=item.progression;prefs.energy=item.energy;
  $('guidedKey').value=prefs.guidedKey;$('guidedBpm').value=prefs.guidedBpm;$('progressionSelect').value=prefs.progression;$('energySlider').value=prefs.energy;$('songName').value=item.name;
  selectMode('guided');selectStyle(prefs.style);updateValues();persist();state.currentChord=null;state.voicing=null;state.stepIndex=0;state.barIndex=0;
  $('quickSavedSongs').value=item.id;updateQuickControls();showLog('Loaded “'+item.name+'”. Chord arrangement is recalled from this device; the app will now perform it in Guided mode.');
}
function deleteArrangement(){const i=churchSongs.findIndex(x=>x.id===$('savedSongs').value);if(i<0)return;const name=churchSongs[i].name;churchSongs.splice(i,1);localStorage.setItem('churchkeys-arrangements-v2',JSON.stringify(churchSongs));refreshSongs();showLog('Deleted local arrangement “'+name+'”.');}
async function testChord(){try{await ensureAudio();const notes=[60,64,67,74];playChord(notes,state.audioCtx.currentTime+.02,1.1,.85);$('chordName').textContent='C';$('chordCaption').textContent='Sound test · C major';$('playingNotes').textContent='C · E · G · D';showLog('Sound test: C major chord. If silent, check output device and volume.');setTimeout(()=>{if(!state.running){refreshKeyboard([]);$('playingNotes').textContent='No notes yet';}},1350);}catch(e){showLog(e.message);}}
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
