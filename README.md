# ChurchKeys 0.3 — Simple + Musician Views

Free, browser-only beta for private testing. The existing v0.2 design and full controls are preserved.

## How to use without musical training

1. Open your Netlify HTTPS URL and allow microphone access.
2. Leave **Simple View** on (default), select the general feel (Gentle Worship, Praise, Highlife Praise, or Ariaria), and press **Start playing**.
3. The app will listen using the laptop microphone, then attempt to infer a key and select accompanying chords. **These inferences are still crude and may play wrong chords or no chords.**
4. Press **Stop** to end. To test only the accompaniment without a mic, click **Hear an example groove**. That demo uses a default C-major arrangement and is not live song recognition.
5. For a known arrangement previously saved by a musician, select it in **Optional saved song**. That gives the app better chord guidance; it is not automatic searching or identification.
6. Press **Musician View** to reveal the original detailed panels (key, progression, tempo, energy, sample instrument and song memory). Return to **Simple View** anytime.

## What's new

- 2 interface levels: non-musician Quick Start and full musician settings.
- New original *highlife* and *Ariaria* rhythmic accompaniment patterns plus two existing worship and praise styles.
- Reference-inspired starting pulse suggestions derived from the supplied recordings, not a trained ML model.
- Preserves existing MIDI-style synthesis and optional sampled piano sound.
- Saves view choice, preferences and song presets in this browser only.

## Files & deployment

This is a static site with no build command. Replace your existing Netlify-linked GitHub repo files with those from this ZIP (keep `assets/`, `analysis/`, `app.js`, `index.html`, `styles.css`, `sw.js`, etc.), commit, and refresh your website. Netlify publish directory: `.`.

## What the 21 recordings contributed

See `analysis/REFERENCE_NOTES.md` and `analysis/recording-feature-excerpts.json`. Source audio stays private and is NOT included. The included rhythm programs are original approximations that respond to groove categories; these recordings have not been transcribed into individual keyboard MIDI parts or used to train a model. For that, obtain permission and ideally get MIDI performances/isolated keyboard tracks.

## Safety and restrictions

Do not depend on the experimental auto-harmony engine unattended in a live church service. Start at low output volume, ideally with headphones, and test during rehearsals. Using the microphone next to the church PA can lead to feedback or self-detection. Use the Stop button if the harmony is wrong. Browser audio requires HTTPS or localhost. The optional grand piano uses Salamander Grand Piano (Alexander Holm), CC BY 3.0; the piano recordings download from Tone.js's demo CDN only when enabled. No Gemini key, paid API, online login or data upload is needed. Large external piano samples will not work offline until cached; synthesizer fallback remains available.
