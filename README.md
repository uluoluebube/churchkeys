# ChurchKeys v0.5 — Tutorial Study Edition

## Deploy
Extract the ZIP, put its root files and folders into your GitHub repository (keep app.js, styles.css, assets/, research/, index.html, sw.js, manifest.webmanifest and netlify.toml), and commit. Your connected Netlify site will redeploy. No build command; publish directory `.`. Hard-refresh after updates.

## Try it
Use Simple View for Start playing / Stop / musical feel / bass on/off. It needs the laptop microphone and an HTTPS connection. Rehearse at LOW output volume, with headphones first. No music theory required. In Musician View, you can now select the bass approach and experimental `Leave space for the singer` filter; `I–V–IV–V` is available among the guided progressions. `Hear groove` is a no-microphone demonstration and is the best first comparison.

## Research and original exercises
See `research/TUTORIAL_STUDY.md` and `research/tutorial_annotations.json` for detailed evidence and limitations, `research/extracted_audio_features.json` for non-keyboard-specific excerpt measurements, and `research/original_midi_exercises/` for four completely original two-track MIDI patterns. This is tutorial-informed development, **not model training** or precise note transcription. Recorded videos are not redistributed.

## Caution
Autonomous mode still uses unreliable melody-pitch/key and tempo heuristics, not genuine beat synchronization, source separation or song recognition. The new vocal-aware fill suppression is a heuristic and may mistake other sound sources for vocals. Use only in rehearsal and keep Stop accessible. Do not place secret API keys in browser JavaScript.

## Library notes
Grand piano samples (if chosen) load from Tone.js demonstration host; attribution: Alexander Holm CC BY 3.0. Core synth works offline after appropriate site caching.
