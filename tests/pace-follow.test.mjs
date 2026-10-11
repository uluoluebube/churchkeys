import test from 'node:test';
import assert from 'node:assert/strict';
import {PaceFollower} from '../pace-follow.js';
function pulses(pace,bars=2,start=1000){const delta=60000/pace;return Array.from({length:bars*4},(_,i)=>start+i*delta);}
test('remains unlatched during sparse vocal attacks',()=>{const p=new PaceFollower();for(const t of [100,600,1900,2560])p.observePulse(t);assert.equal(p.locked,false);assert.equal(p.tempo,72);});
test('accepts a clearly recurring slow worship beat',()=>{const p=new PaceFollower(72);for(const t of pulses(60,3))p.observePulse(t);assert.equal(p.locked,true);assert.ok(Math.abs(p.target-60)<1);});
test('does not jump ahead when tempo speeds up',()=>{const p=new PaceFollower(72);for(const t of pulses(72,3))p.observePulse(t);p.advance(1000);const before=p.tempo;for(const t of pulses(118,5,1000+11*(60000/72)+(60000/118)))p.observePulse(t);p.advance(16000);assert.ok(p.tempo-before<1);});
test('holds last tempo across long singer pauses',()=>{const p=new PaceFollower(84);for(const t of pulses(84,3))p.observePulse(t);p.advance(10000);const before=p.tempo;p.advance(20000);p.advance(26000);assert.ok(Math.abs(p.tempo-before)<.01);assert.equal(p.locked,true);});
test('ignores rapid multiple taps / transients',()=>{const p=new PaceFollower();for(const t of [0,65,130,190,250,320,390,455])p.observePulse(t);assert.equal(p.locked,false);});

test('relocks to a new praise tempo after a clear section break',()=>{const p=new PaceFollower(70);for(const t of pulses(70,3))p.observePulse(t);assert.equal(p.locked,true);for(const t of pulses(140,3,15000))p.observePulse(t);assert.ok(p.tempo>130,`expected a genuine transition, got ${p.tempo}`);});
