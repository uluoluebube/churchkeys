# ChurchKeys v1.2 — Music Following Research Build

**Working experimental accompaniment prototype, not production-ready or an AI keyboardist trained on Nigerian gospel recordings.** Free browser-based demo; no API key, login, paid cloud services or server required. Keeps the same Simple / Musician views as v1.1.

## Install to your existing GitHub + Netlify site

Replace the existing repo files with all files from the v1.2 ZIP. Commit. Netlify builds the static files (build command empty, publish directory `.`). Hard-refresh the app and confirm the header shows **LIVE 1.2**. The PWA cache was updated.

## What's different in the real performance-following code

- `performance-follower.js`: a causal **probabilistic chord-sequence model**, not isolated guesses every frame. It keeps a previous-chord state, accumulates audio evidence and requires sustained support before switching.
- An independent **beat-phase tracker** listens to repeated confident pulses and makes **bounded (≤10 ms per beat) scheduler corrections**; it does not force a new BPM or instantly jump to a transitory fill. Old v1.1 tempo stability controls remain.
- A **phrase/activity continuity follower** preserves music through melody breaks. Since the mic mixes singers and instruments, it marks **lead-pitch evidence**, not proven isolated vocal detection. Stop always remains under human control.
- Automatic accompaniment now **holds the previous harmony rather than stepping through a preset chord sequence without supporting evidence**. Guided and groove-preview modes keep their original progression behavior.
- A visible status line displays **estimated chord**, phase-search/alignment, and melody-activity state. A stable estimate is NOT proof the chord is correct.

## Testing performed

- `npm test`: 19 Node tests passed for harmonic detection, pace follower, online chord memory, transient-noise rejection, sustained chord changes, silent passages and bounded phase correction.
- Browser audio smoke test (Chromium/Playwright, HTML injected into isolated browser due to sandbox navigation restrictions): with a self-generated 14-second changing-chord WAV, output was audible/measurable, the system kept playing, and Stop ended playback. The detected tempo in that synthetic test was 60 BPM, and the chord-following display updated.
- Browser test with 15 seconds extracted from the user-provided African praise tutorial: the engine produced audio output, but beat-phase was **not locked** and the tonal/key predictions were **not verified for musical accuracy**. This demonstrates why the model is not production-ready.
- The synthetic audio and user-provided tutorial clip are **not bundled** in the ZIP.

## What is still unsolved

This version **does not yet** use a neural network trained on the submitted 11 tutorials and 21 songs. It cannot reliably separate voice, drums, piano or bass; correctly detect all live chord changes; automatically identify praise styles or song boundaries; recognize song titles; infer the beat in rubato/acapella worship; or sustain a professional keyboardist-level accompaniment for an unattended service. Many sounds/grooves remain arranged musical patterns.

**Real next training milestone:** Assemble a permissioned, hand-checked dataset of isolated instrument/MIDI examples with timestamped chords, note onsets, bass lines, beat positions, section labels and singer transitions. Evaluate models against held-out recordings using accuracy, alignment error and end-to-end audio delay. Then replace the provisional estimators with trained inference models only if they beat these baselines. Source audio and private church material should not be shipped with the frontend.

**Safety:** Test on headphones or low-volume speakers at rehearsal. Have a human operator on Stop. Feedback from the PA into the laptop mic can corrupt estimates. Frontend static files contain no recording upload telemetry; optional third-party piano sample download may access external hosts if enabled.
