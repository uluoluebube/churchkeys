# ChurchKeys v1.1 — Pace & Continuity

**Field-testable browser accompaniment prototype. Not a production-validated, fully autonomous church keyboardist.** No login or paid API required. Designed for Netlify static hosting.

## Deploy to the existing GitHub → Netlify site

1. Extract `ChurchKeys-Pace-and-Continuity-v1.1.zip` and upload/replace the project files in the **root** of your GitHub repository.
2. Commit the changes. Netlify should automatically redeploy. No build command; publish directory: `.`.
3. Reload the site. Check that the header displays **LIVE 1.1**. Close old tabs and hard-refresh if the old PWA/service worker is cached.

## Test the two requested behaviors

1. Keep laptop volume low and plug in headphones. Optionally select **Play an audio file**, or use the built-in laptop microphone.
2. Press **Start playing** and play/sing a song with a clear recurring pulse. In Simple View, watch **LISTENING FOR RHYTHM** change to **FOLLOWING PACE** after a sufficiently regular beat is detected. At uncertain tempo, the app uses a **spacious chord/pad bed** rather than forcing a fast praise groove.
3. Have the vocalist pause (or let the chosen recording end). Observe **INSTRUMENTAL CONTINUES** and confirm bass/piano carry on at the last stable pace and harmony.
4. Press **Stop**: the mix fades over approximately 1.5 seconds. You can also use Musician View to disable automatic tempo following or uninterrupted accompaniment, or use Tap BPM to override a weak detection.

## What actually changed from v1.0

- Added `pace-follow.js`: a separate pulse-confidence and tempo control system. It requires repeated, reasonably consistent beat intervals. Arbitrary fast style presets no longer dictate the live tempo. It resists short spurious changes, changes speed gradually, and can relock after a genuine section break.
- Starting without a consistent beat no longer launches a fast percussion-style pattern. The system plays slower/free-time support while it evaluates rhythm.
- Removed the previous automatic silence cutoff (4.8 s); keeps playing last harmony during intentional breaks **by default**. It does not stop just because a source audio file ended.
- Manual Stop now provides a short fade-out with a final sustained harmony.
- Two additional advanced switches: **Follow the worship leader's pace**, **Keep playing when singing stops**. Both are enabled by default and not required for Simple View.
- Live diagnostics indicate whether beat-following is waiting, stable, manual, or continuing instrumentally.
- Updated PWA cache name for redeployment.

## Testing

`npm test` runs Node built-in harmony and tempo tests. Tests cover slow-beat acquisition, short rhythmic clutter, gradual adjustment, pauses, and a clear new tempo after a section break. An in-browser test with a **self-generated 60 BPM chord/percussion WAV with a silent tail** confirmed the audio file started output, the performance continued after the file ended, and Stop ended the session. Test input was synthetic and is not included in the shipping ZIP. Audio tests do not measure artistic correctness.

## Important limitations

- **Still heuristic, not neural AI.** Neither these patches nor the 11 tutorial references trained a live machine-learning model. The app cannot yet reliably infer tempo from free-rhythm/acapella singing, align every attack to a live drummer's beat phase, recognize songs or accurately follow all spontaneous chord/key changes.
- A strong instrumental beat can be tracked, but unpredictable phrases, room echoes, crowd noise and a laptop mic may fool beat/harmony detection. A human must monitor live trials and be ready to press Stop.
- Tone.js-like audio generation here remains browser-based; samples downloaded from external CC BY 3.0 Salamander when enabled. The local recording and microphone content are not sent to an AI API.
- For a genuine production-grade autonomous musician, we need a beat/phase synchronizer and song structure/chord tracking on permissioned, accurately annotated stems/MIDI recordings, plus extensive low-latency rehearsal evaluation.

## Technical notes

No build step or paid runtime dependencies. Static JS modules: `app.js`, `music-intelligence.js`, `pace-follow.js`. Manifest and service worker support offline-cached app shell. Microphone permission requires HTTPS. No user account or server APIs.
