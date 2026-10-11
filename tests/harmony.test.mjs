import test from 'node:test';
import assert from 'node:assert/strict';
import {detectKey, detectChord, HarmonicTracker} from '../music-intelligence.js';
const chroma=(notes) => {const a=Array(12).fill(0); for(const [pc,w] of notes)a[pc]=w;return a;};
test('silence does not produce imaginary chords',()=>{
 assert.equal(detectKey(chroma([])),null);
 assert.equal(detectChord(chroma([])),null);
});
test('harmonic classifier identifies a C major triad',()=>{
 const chord=detectChord(chroma([[0,1],[4,.85],[7,.7]]));
 assert.equal(chord.name,'C');
 assert.ok(chord.confidence>=0);
});
test('harmonic classifier identifies A minor triad',()=>{
 const chord=detectChord(chroma([[9,1],[0,.88],[4,.8]]));
 assert.equal(chord.name,'Am');
});
test('music tracker reset clears all learned observations',()=>{
 const tracker = new HarmonicTracker();
 tracker.frames=50;tracker.toneFrames=38;tracker.stableKey={root:1,mode:'major'};
 tracker.reset();assert.equal(tracker.frames,0);assert.equal(tracker.stableKey,null);assert.equal(tracker.toneFrames,0);
});
