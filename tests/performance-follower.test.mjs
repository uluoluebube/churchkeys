import test from 'node:test';
import assert from 'node:assert/strict';
import {ChordSequenceFollower,PhraseFlowFollower,BeatPhaseFollower,PerformanceFollower} from '../performance-follower.js';
const chroma=(pcs)=>{const c=Array(12).fill(.003);for(const pc of pcs)c[pc]+=.33;return c;};
const triadC=chroma([0,4,7]),triadG=chroma([7,11,2]);
test('stable C major triad creates a stable chord',()=>{
 const m=new ChordSequenceFollower();let out;
 for(let i=0;i<45;i++)out=m.observe(triadC,i*100);
 assert.equal(out.chord?.name,'C');assert.equal(out.confident,true);
});
test('single transient chord attack does not force immediate chord change',()=>{
 const m=new ChordSequenceFollower();for(let i=0;i<50;i++)m.observe(triadC,i*100);
 const before=m.snapshot(5000);m.observe(triadG,5100);m.observe(triadC,5200);
 assert.equal(m.snapshot(5300).chord?.name,before.chord?.name);
});
test('strong sustained change eventually follows the new chord',()=>{
 const m=new ChordSequenceFollower();for(let i=0;i<50;i++)m.observe(triadC,i*100);
 for(let i=50;i<105;i++)m.observe(triadG,i*100);
 assert.equal(m.snapshot(10500).chord?.name,'G');
});
test('isolated melody note does not hallucinate triad',()=>{
 const m=new ChordSequenceFollower();let r;
 for(let i=0;i<45;i++)r=m.observe(chroma([4]),i*100);
 assert.equal(r.chord,null);
});
test('silence preserves last chord but confidence goes stale',()=>{
 const m=new ChordSequenceFollower();for(let i=0;i<45;i++)m.observe(triadC,i*100);
 const held=m.observe(Array(12).fill(0),10000,{active:false});
 assert.equal(held.chord.name,'C');assert.equal(held.confident,false);assert.equal(held.held,true);
});
test('vocal/lead pauses are instrumental moments not Stop commands',()=>{
 const p=new PhraseFlowFollower();p.observe(100,{audible:true,melodic:true});
 assert.equal(p.observe(200,{audible:true,melodic:true}).status,'lead melody present');
 const v=p.observe(2700,{audible:true,melodic:false});
 assert.equal(v.instrumental,true);assert.equal(v.stopRecommended,false);
 const silence=p.observe(5000,{audible:false,melodic:false});assert.equal(silence.stopRecommended,false);
});
test('phase synchronizer requires repeated coherent pulses and caps adjustments',()=>{
 const p=new BeatPhaseFollower();for(let i=0;i<12;i++)p.observePulse(1000+i*500,120,.95);
 assert.equal(p.snapshot().locked,true);
 assert.ok(Math.abs(p.correctionSeconds(6300))<=.01001);
});
test('sync rejects offbeat clutter rather than forcing tempo',()=>{
 const p=new BeatPhaseFollower();for(let i=0;i<10;i++)p.observePulse(1000+i*500,120,.95);
 const before=p.anchorMs;p.observePulse(5625,120,.95);
 assert.ok(Math.abs(p.anchorMs-before)<10);
});
test('performance follower combines chord, phrase and beat snapshots',()=>{
 const f=new PerformanceFollower();let result;
 for(let i=0;i<45;i++)result=f.observe({nowMs:i*100,chroma:triadC,audible:true,melodic:i%3===0});
 assert.equal(result.chords.chord?.name,'C');assert.ok(result.phrase.started);
});
