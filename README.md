# ChurchKeys — free church pilot (Beta v0.1)

A self-contained, browser-based **experimental live accompaniment prototype**. It uses the microphone to estimate a prominent melody pitch and generates simple harmonic keyboard patterns. It also has a more predictable, optional Guided mode.

**Important:** This is a proof of concept, **not a production-ready AI church keyboardist**. It does **not** reliably recognize songs, transcribe complete arrangements, separate instruments, learn from recorded services, or guarantee correct chord choices. Automatic key detection and generated harmonies can be wrong, particularly when drums, multiple singers, and loud speakers bleed into the microphone. **Test in a rehearsal at low volume before attempting any use during a service.** Keep a person near the laptop to stop it if necessary.

## Quickest first test (no microphone required)

1. Open the live Netlify site in Chrome or Edge on a laptop.
2. Set your computer output to headphones at low volume.
3. Click **Test piano**. You should hear a C-major chord.
4. Click **Try demo**. This injects a **simulated melody** into the pitch detector while the keyboard synthesizer plays audible accompaniment. The demo melody is *not* recorded church audio or genuine song recognition.
5. Change to **Guided**, choose a key, chord progression, and tempo. Try Worship and Praise styles.
6. Press **Stop all** before changing audio cables.

## Test with live singing — laptop microphone, no external mic needed

**Yes: ChurchKeys supports the laptop’s built-in microphone.** The microphone listens to the singer and drummer **through the air**, without any microphone cable. The app’s generated keyboard sound goes through the laptop's **normal audio output**, so you may connect an AUX cable from the laptop headphone/output jack to the church mixer/speakers. The sound system is **output only**, not a required input.

1. Open the HTTPS Netlify site in current **Chrome or Edge** on your laptop. Plug in headphones first and keep the output volume low. Check the keyboard with **Test piano**.
2. Under **Listening microphone**, leave **System default mic (often built-in)**, or choose **Built-in Microphone / Microphone Array** once the browser has microphone permission. **Important:** plugging an AUX cable into a combination headset port sometimes changes the laptop's default microphone. Choose the built-in option manually in that case, or change Windows/macOS sound input settings.
3. Select **Autonomous**, **Worship**, and a low output volume. Click **Start listening**, then **Allow microphone** when your browser asks. Sing one clear note at a time near the laptop and watch **Detected note**. Next, sing a simple sequence of notes and watch **Estimated key**. The estimate is tentative, not reliable song recognition.
4. If you cannot hear the app, check your operating system’s audio **output** selection. With AUX plugged in, select the headphone/line-out output and confirm **Test piano** goes to the expected speaker. The app does not select AUX automatically; the operating system does.
5. The **Reduce speaker echo** option is enabled by default. It asks the browser to reduce acoustic feedback from the app. Echo cancellation is imperfect and may interfere with singing or musical signals. If the note detector performs poorly with echo reduction enabled, try disabling it and retest at a safe, low volume.
6. Only after testing with headphones should you gradually test sound through the church speakers, still at **low volume**. Place the laptop as far from the speakers as practical, and aim it towards the singer rather than the PA. Do not crank the microphone sensitivity when audio is feeding back.
7. Try **Guided** mode if the key/chords are wrong: choose a key, tempo and progression. Guided mode plays the specified progression automatically. It does not discover the right song from a microphone.
8. Have someone supervise and be ready to click **Stop all**. **Do not rely on this experimental version for a live church service**, and do not connect it to a loud PA without a controlled rehearsal first.

**Practical limitation:** A built-in laptop mic simultaneously hearing loud drums, a choir, congregation sounds and the keyboard coming from speakers is much less accurate than a clear vocal microphone/mixer feed. The free prototype supports the built-in mic, but it cannot guarantee reliable separation or accompaniment in that environment.

### What works in this release

- Built-in piano, organ, and pad oscillator-based sounds (no sample downloads or paid APIs).
- Built-in laptop microphone capture (no input cable needed), optional other microphones, browser echo-reduction toggle, live waveform, pitch display, tentative major/minor key inference, rough onset-based BPM estimates.
- Autonomous mode attempts simple chord accompaniment from melody notes and an expected progression; will be wrong on some songs.
- Guided mode offers a key, tempo, and progression, plus **Tap tempo**.
- Worship (sustained) and Praise (rhythmic) accompaniment patterns.
- Local browser settings, downloadable JSON preferences, offline caching of core files.
- Simulated melody demo, sound test, stop-all, input selection, output and mic sensitivity.

### What does NOT work yet

- Learning each church's musical habits over time (local settings **are not machine learning**).
- Identifying named songs, advanced Nigerian praise styles, improvisation/fills, robust drum tracking or beat sync, or automatic song modulation detection.
- Professional sampled acoustic piano sounds, guaranteed low latency, and reliable audio separation in an actual live service.
- External MIDI keyboards, recording/replay, account logins, cloud learning and model fine-tuning.

## Deploy to GitHub → Netlify (no build tool)

This repo is **plain HTML, CSS and JavaScript**, not React and has no npm dependencies.

1. Download and unzip the project. Keep `index.html`, `app.js`, `styles.css`, `netlify.toml`, `sw.js`, `manifest.webmanifest`, and the `assets` folder together.
2. On [GitHub](https://github.com/new), create a new repository, for example `churchkeys-beta`.
3. In the empty repository click **uploading an existing file** / **Add file → Upload files**. Upload all the project files and `assets/favicon.svg` preserving its subfolder. **Commit changes** to the `main` branch.
4. Go to [Netlify](https://app.netlify.com/), select **Add new project → Import an existing project**, choose **GitHub**, authorize the connection, and select your repository.
5. For this static site, use **Build command: (leave blank)** and **Publish directory: `.` (repository root)**. The included `netlify.toml` also specifies this.
6. Click **Deploy / Publish**. Netlify gives you an `https://...netlify.app` link. Open it in Chrome or Edge.
7. Later edits pushed to the GitHub `main` branch automatically deploy to your Netlify site.

Alternative: log into Netlify and drag the unzipped project folder into **Deploy manually** for a quick one-off test. Connecting GitHub afterward enables automatic updates.

### Local run (optional)

Open a terminal **inside this folder** and run:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000` in Chrome or Edge. Browser microphone capture is allowed on HTTPS and `localhost`, but not on arbitrary insecure `http://` pages. Don't rely on opening `index.html` as a `file://` URL.

## Privacy, audio & stability

- This build has **no backend, database, subscriptions, API keys, analytics or audio upload**.
- Microphone audio stays in the running browser tab. The only saved information is settings in `localStorage`. Exported JSON contains settings only, not recordings.
- Fonts may be fetched from Google when online; the app's functionality works with fallback fonts offline.
- The PWA service worker caches the basic files after the first successful HTTPS load. Reload the site once online before relying on offline operation; browser storage can still be cleared, so verify offline behavior before a service.
- The browser can throttle audio timing if its tab is in the background. Keep it foregrounded and disable device sleep.
- Headphones first! Echo/feedback and microphone distortion produce incorrect notes. Always use the PA/mixer safely and at conservative levels.

## Next milestones

1. Improve pitch tracking and robust key estimation with live church rehearsal measurements.
2. Add audio-file based testing and recorded sample annotations (with permission).
3. Create a proper rhythm tracker and harmony estimator before trying advanced Nigerian praise accompaniment.
4. Introduce church profiles and reproducible corrections. Later, evaluate real model training or fine-tuning.

The application code is deliberately split into `index.html`, `styles.css`, and `app.js` so you can update it easily from your GitHub repository.
