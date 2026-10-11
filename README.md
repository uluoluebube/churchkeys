# ChurchKeys Live Engine v1.0 — browser-based accompaniment testing

This replaces the old *single-note-only* key gating with a mixed-audio listening pipeline and predictable user-visible behavior. It is a **field-testable prototype**; it is not yet a production-validated replacement for an experienced church keyboardist. No account, paid API, backend or build is required.

## Deploy with your existing GitHub → Netlify setup

1. Extract this ZIP.
2. Replace the **root files** of your current GitHub repository with the extracted root files, including `music-intelligence.js`, `app.js`, `styles.css`, `index.html`, `sw.js`, `manifest.webmanifest`, `netlify.toml` and `assets/`.
3. Commit and wait for Netlify to deploy. The publish directory remains `.`; no build command.
4. Refresh the website. If an earlier service worker displays an old version, close all open ChurchKeys tabs and reopen the Netlify URL; if necessary, clear the website's cached data. Confirm the header says `LIVE 1.0`.

## First test (recommended)

1. Connect headphones at **low volume**. Press **Test piano** first to check output.
2. Under **Listening source**, choose **Play an audio file**. Choose an MP3 or WAV that contains a clear worship/praise song. Press **Start playing**.
3. Monitor **Input signal**, **Estimated key**, **Engine status**, **Now playing**, and the **output %** indicator. The selected recording is processed locally; the browser does not upload it.
4. If the key is marked **PROVISIONAL**, treat accompaniment as a tentative guess and use the low-volume test rather than trusting it live. A mix of drums and speech often gives weak harmonic information.
5. For the live church test, switch back to **Laptop microphone** and click **Start playing**. Grant mic permission and position the laptop away from its own speakers. Connect the AUX output only after checking the sound on headphones.
6. Stop all output immediately if a wrong chord clashes with the singers. Don't depend on v1.0 for an unmonitored service.

## Improvements versus v0.5

- Mixed-audio harmonic analysis (spectrum → chroma → tentative key/chords) instead of relying exclusively on monophonic pitch detection.
- **Autonomous startup after audio is detected**. A missing stable vocal note no longer permanently gates the sound engine; after sustained music, a provisional (quieter) accompaniment can begin.
- Source selector: built-in microphone or local audio file. Local files provide reproducible tests without the room's acoustics interfering.
- Clear statuses for waiting, analyzing, provisional harmony, and guided accompaniment.
- Separate output waveform measurement lets us verify that sound was generated, not just that the UI changed.
- Conservative key-change hysteresis, dedicated bass instrument and the existing musician controls preserved.
- Automated pure-unit tests under `tests/` with `npm test`. This uses only built-in Node.js test features; there are **no npm dependencies**.

## Boundaries and deployment safety

- The software does **not** recognize song titles from audio, understand lyrics, train itself from recordings, follow exact live chord progressions, or reliably detect a live song transition. The chord and key analysis are still heuristics.
- The service-flow style changes are only approximate; beat detection and phrase prediction need field testing and deeper model work.
- A powerful laptop microphone may still hear the app through the PA, making chord inference inaccurate. Avoid feedback and monitor levels.
- Real grand-piano samples are fetched from the Tone.js Salamander recordings only when enabled; if unavailable the synth still plays. Salamander recordings credited to Alexander Holm (CC BY 3.0). The microphone input or chosen file never goes to an external AI service.
- The app is static; stores user preferences and saved manual song arrangements locally in the browser. Does not store uploaded audio recordings.
- This is not safety-critical equipment but a bad sound can disrupt a service: always rehearse, use a human monitor and retain a stop button.

## Testing evidence

Tested with Chromium headless + Web Audio using a self-generated multichord WAV and a short excerpt extracted locally from one of the provided tutorial videos. Both triggered sound-generation events and measurable audio output. Percussion-only input was also tested; it could produce provisional harmony, so never infer musical correctness from the presence of sound alone.

Those checks verify **functional signal routing**, not accuracy across your full song library or live church conditions. The real-world acceptance test needs multiple uninterrupted rehearsals with known songs, key changes, hardware and PA setup, timing measurements, and musician evaluation of harmony and bass.

## How to run automated tests

`node --test tests/*.test.mjs`

This tool is an exploratory aid for live accompaniment, not a verified autonomous band member.
