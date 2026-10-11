# ChurchKeys v0.4 — Service Flow & Bass Lab

## Install / update on Netlify
Extract the ZIP and replace the root files in your GitHub repository. Keep `assets/`, `analysis/`, `app.js`, `styles.css`, `index.html`, `manifest.webmanifest`, and `sw.js`. GitHub-linked Netlify redeploys upon commit; there is no build command; publish directory is `.`. Hard-refresh if an earlier service-worker cache remains.

## Test: non-musician setup
1. Open your HTTPS Netlify URL on a laptop. Keep output volume LOW, preferably on headphones during first test.
2. Simple View has `Music feel: Automatically follow service (experimental)`, `Start playing`, `Stop`, `Bass guitar ON/OFF`. The built-in microphone is supported; grant permission.
3. `Hear service transitions` demonstrates worship → praise → highlife → Ariaria sounds. It doesn't listen to a singer and should NOT be confused with automatic performance recognition.
4. Test with a live drummer/singer in rehearsal. The live style estimator needs several stable rhythm observations to consider changing its style. Watch `Now:` feel status. It can often be wrong.
5. Musician View retains key, BPM, progression, accompaniment energy and piano sound, plus bass level. Guided mode remains the most predictable demonstration.

## What is / isn't autonomous
**Is implemented**: basic microphone melody pitch and key approximation; crude rhythm-onset/BPM estimates; style selection heuristics using thresholds with a persistence period; changes at bar boundaries; chords from simple templates and melody compatibility; richer original keyboard and electric bass patterns.
**Not implemented**: reliable beat-grid phase synchronization with the drummer, recognition of specific songs or musical sections, confident chord estimation from multi-instrument mixes, automatic modulations/transposition, fully independent real-time keyboardist improvisation, dataset-trained model, or actual instrument source separation. Treat all live accompaniment as experimental, not production-ready.

## Bass
The bass is generated with an independent plucked synthesizer, not a sampled real bass guitar. It follows the same **estimated / guided** chord as the piano, so an incorrect chord means an incorrect bass line. Start with low bass output to protect PA/headphones; increase carefully. Synth works offline.

## Referenced recordings
The 21 provided files only informed a rhythm-profile study in v0.3 (`analysis/REFERENCE_NOTES.md`); they have **not** trained an AI keyboardist. The ZIP contains no uploaded recordings. For future training, request permission and gather isolated keyboard MIDI and separated direct bass, drums and vocal recordings, annotated with bars/chords/sections.

## Setup and privacy
No login, paid API or Gemini key required. Music analysis and synthesized playback occur in the browser. Preferences and saved song settings remain in localStorage for this browser. Grand piano recordings are optional and fetched from Tone.js demo server under CC BY 3.0 (Alexander Holm); synth fallback if offline. Browser mic capture needs HTTPS or localhost. Avoid positioning laptop mic beside PA output to reduce feedback/self-detection.
