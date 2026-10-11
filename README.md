# ChurchKeys Groove Lab — Beta v0.2

A free, no-login, GitHub → Netlify-deployable experimental virtual keyboardist. **This is not a trained AI keyboardist**. The improved version adds a **16-step arranged performance engine**: chord inversions and voice leading, a worship arpeggio feel, syncopated praise-style keyboard stabs, moving bass notes, melodic call-and-response, energy and fill controls, and an optional real sampled grand piano. It still has the old basic singing-pitch detector and tentative chord estimator, and **will not reliably follow an unfamiliar song automatically**.

## Fastest way to hear the improvement today

1. Update all files in your GitHub repo with the contents of this ZIP; Netlify deploys automatically. Keep the `assets/` folder.
2. Open the Netlify HTTPS URL on a laptop, then press **Ctrl+Shift+R** to force refresh after deploy. Use headphones at low volume first.
3. Switch to **Guided**. Set a musical key (for example C major), select the chord progression `I · IV · V · I`, and tap or enter the tempo. For praise start experimenting around **110–125 BPM**; for slow worship try **65–80 BPM**. These are illustrative starting points, not a universal Nigerian gospel tempo.
4. Select **Praise**, raise **Performance energy** to around 70–85%, and enable **Melodic fills**. Click **♫ Hear groove**. The app will play a continuous auto-arranged groove *without needing a microphone*. Change Worship and Praise while it plays; press **Stop all** to end.
5. Leave **Use recorded grand piano** enabled. With internet access, the app downloads CC BY 3.0 grand piano samples and switches to sampled piano sound when available. The `Real piano samples` status changes to `ready`. If unavailable, the original synth fallback works without internet. The recorded samples require a network connection and are *not packaged in the ZIP*.
6. For a song your church performs regularly, enter its name under **Church song memory**, confirm the key, progression, tempo and style, and click **Save this arrangement**. Later choose the saved entry and **Load**. This is a local preset, **not** automatic online song lookup or ML training.
7. Only after auditioning in Guided mode should you switch to **Autonomous** → **Start listening**. It still attempts crude note/key detection from your laptop's built-in microphone. It might misread chords; the rhythmic accompaniment will sound better, but the *musical intelligence of the ear is still experimental*.

## Audio wiring for a small church

- **Input:** laptop's built-in microphone, with browser permission. No extra mic required.
- **Output:** laptop headphone/AUX to mixer or church speakers; the operating system picks the output.
- Test with headphones first and keep the PA at a safe low volume. Avoid the laptop hearing its own keyboard from the speakers. Echo reduction is imperfect. Keep **Stop all** within reach. Test in rehearsals; do **not** depend on this beta during a live service.
- For *Guided* accompaniment at an actual rehearsal, set musical key/progression/BPM manually; the app performs the arrangement without someone striking keyboard notes. It will not automatically follow an unplanned chord change.

## Deploy to Netlify from GitHub

1. Extract ZIP and upload `index.html`, `app.js`, `styles.css`, `manifest.webmanifest`, `sw.js`, `netlify.toml`, `.gitignore`, this `README.md`, and `assets/favicon.svg` to your existing repository **at the root**. Replace the old files.
2. Netlify linked to the GitHub repo redeploys automatically. Build command: blank. Publish directory: `.`.
3. Hard refresh your church's Netlify URL after deployment; the service worker has a new cache version.
4. For local test, run `python -m http.server 8000` from this folder and open `http://localhost:8000`.

## Privacy, cost, licensing

- No login, server, API key, subscription, backend, or uploaded microphone recording. Microphone analysis happens locally in the browser.
- Saved arrangements are browser `localStorage` entries on that device. The Export preferences button exports preferences **but does not include saved songs**. Do not clear browser data if you need the saved arrangements; they don't sync between computers.
- Optional recorded grand piano uses **Salamander Grand Piano V3** by **Alexander Holm**, licensed **Creative Commons Attribution 3.0**. Original project: https://github.com/sfzinstruments/SalamanderGrandPiano ; CDN samples: https://tonejs.github.io/audio/salamander/ . The synth fallback requires no outside audio samples. License: https://creativecommons.org/licenses/by/3.0/ .
- Song names and manually entered chord progressions are saved locally. We do not download commercial performances or scrape videos.
- If the browser is offline, music generation continues using built-in oscillators; the optional sample sounds may be unavailable until downloaded while online.

## Critical limitations

- **Not a trained AI performer:** Chord progressions and highlife/gospel-inspired patterns are fixed rules with limited variation, not transcription or stylistic learning from musicians.
- **Not song recognition:** Typing a song name recalls a saved arrangement; it does not search the internet or identify songs automatically.
- **Unreliable musical listening in loud rooms:** The simple pitch/key detector cannot cleanly separate multiple singers, drums, and PA bleed. Beat detection is very rudimentary and can drift.
- **Missing expressive interpretation:** A skilled keyboardist would follow phrasing, dynamics, fills and section changes more accurately. Use feedback from your church's experienced musicians to design and test distinct, original MIDI-style patterns.
- **Browser scheduling:** Keep the tab visible, prevent sleep, and test latency on actual hardware before plugging into a PA.

## Next development steps

1. Collect short **permissioned** recordings of worship and praise rehearsals, preferably microphone-only vocal plus an isolated keyboard reference (MIDI recording from a volunteer musician is even better).
2. Have an experienced Nigerian gospel keyboardist transcribe/record original chord voicings, praise bass grooves, fills, and authentic accompaniment patterns. Build a reusable style library.
3. Train or improve chord and beat recognition against labeled recordings. Confirm that the system gets the correct harmonies *before* adding any cloud AI.
4. Add a secure church-profile account system and explicit opt-in learning from corrected arrangements.
