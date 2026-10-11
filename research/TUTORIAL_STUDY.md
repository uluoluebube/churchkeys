# ChurchKeys — Nigerian Gospel Tutorial Study (v0.5)

## Scope and honesty
Eleven supplied MP4 tutorial videos (approximately **128 minutes** total) were inspected through time-sampled video frames, with additional screenshots of the progression tutorial. Short **16-second audio excerpts at three positions per video** were processed for broad audio onset/chroma characteristics. **This is a first-pass structured reference study, not frame-by-frame listening or keyboard note transcription.** Talking, drums, edited segments and backing instruments may be present, so automated audio features are **not** ground-truth keyboard notes, bassline labels, chord charts, song IDs, or BPM values.

No neural network has been trained on the recordings; no creator recordings or copyrighted musical performances are included in this app. The changes below are **original idiomatic musical exercises**, informed by educational *concepts* observed in the tutorials.

## Verified / observed musical concepts

- **Progression families**: In the '5 Most Used African PRAISE Progressions' tutorial, on-screen demonstrations explicitly show **1–4–5–4**, **1–4–1–5**, **1–5–4–5**, and **1–6–2–5** at various points (approximately 00:26–06:30). These are generic harmonies, not a guaranteed progression for a new song.
- **Independent bass and lead**: 'NIGERIA PRAISE PIANO TUTORIAL 2' displays the instruction to **maintain the same bassline** during right-hand activity (around 00:28 onward), which is a stronger design clue than adding more random melody notes.
- **Voicing and inversion**: The Naija-vamp tutorial shows **F/A** in an on-screen harmony label near 05:57. Supporting a chord over a chosen bass tone improves voice leading. Full arrangement transcription is still pending.
- **Register separation**: The live keyboard play-throughs and worship lessons clearly show low and high hand activity; the DAW-arrangement tutorial shows separated musical layers.
- **Musical density differs**: The sparse worship teaching clips and faster full arrangement videos show very different audio activity, although instruction speech, editing and microphone gain mean these measurements are not objective style classifiers.

## Video-by-video review

### V01 — #43_How_to_Play_African_Nigerian_Praise_Songs_For_Beginners_4.mp4
- Focus: Major-scale fluency and chord-tone movement. Sample evidence: 01:26, 04:00, 07:12.
- Visual observations: An instructor demonstrates major-scale exercises and labeled intervals using a camera-on-keyboard layout. An on-screen example explicitly labels F Major 3rd.
- Engine implication: Scale-degree aware fills; avoid playing every detected singer note verbatim.
- Confidence: high for displayed educational labels; low for exact played notes.

### V02 — 5 Most Used African PRAISE Progressions For Beginners.mp4
- Focus: Piano progression families in African praise. Sample evidence: 00:26, 02:36, 03:54, 04:20, 06:04, 06:30.
- Visual observations: The visible progression demonstrations include 1–4–5–4, 1–4–1–5, 1–5–4–5, and 1–6–2–5. Instructors illustrate repeating progressions with both hands.
- Engine implication: Add original accompaniment templates for these generic progression families; use optional guidance or verified harmony, not assume they identify the song.
- Confidence: high for on-screen roman-numeral progressions; no claim that each fits every song.

### V03 — African_Praise_Piano_Play_Through_CCI_Abuja_Nigerian_Gospel_St.mp4
- Focus: Full two-hand praise keyboard play-through. Sample evidence: 00:31, 02:36, 04:56.
- Visual observations: Continuous two-hand playing and highlighted keyboard notes are visible. The demonstrations appear to move through multiple registers.
- Engine implication: Decouple bass register events from right-hand chord stabs and fills.
- Confidence: moderate for hand independence; low for pitch-identification from frames.

### V04 — HOW_TO_PLAY_NIGERIAN_WORSHIP_SONGS_ON_PIANO_CHORDS_BASSLINES.mp4
- Focus: Worship chords, basslines and spacious articulation. Sample evidence: 02:16, 11:23, 21:31.
- Visual observations: A top-down live keyboard performance shows distinct lower/upper hand positions and changes of voicing. Sustained musical phrases appear across multiple moments.
- Engine implication: Quieter long bass foundation, held chord voicings and optional minimal passing notes for worship.
- Confidence: moderate for hand/register motions; chord labeling not verified.

### V05 — Learn_How_to_vamp_Naija_Praise_songs_African_styles_Piano_Tuto.mp4
- Focus: Vamping and slash-chord inversions. Sample evidence: 00:37, 03:09, 05:57.
- Visual observations: Top-down piano playing with overlaid keyboard note visualization. An on-screen harmonic label F/A is legible at approximately 05:57.
- Engine implication: Bass-on-inversion chord voicing as an optional future engine feature; smooth right-hand voice-leading.
- Confidence: high for F/A displayed label; cannot automatically generalize full progression.

### V06 — Learn_How_to_vamp_Nigeria_Praise_songs_like_a_Pro_in_key_of_F#_.mp4
- Focus: Fast praise vamps in a specified teaching key. Sample evidence: 00:14, 01:14, 02:20.
- Visual observations: Two-hand keyboard demonstration on a compact controller. The title states the example is in F-sharp; that is a teaching key, not a general rule for praise music.
- Engine implication: Transpose exercises to any key; separate vamp pattern from fixed pitch.
- Confidence: high for title; moderate for hand pattern.

### V07 — NIGERIA PRAISE PIANO TUTORIAL 2 (Baseline while soloing).mp4
- Focus: Maintaining bass while soloing. Sample evidence: 00:28, 02:20, 04:25.
- Visual observations: The on-screen lesson explicitly emphasizes maintaining the same bassline. Two-hand playing shows low accompaniment concurrent with upper-hand lead movement.
- Engine implication: Keep bass scheduling on its own clock while the right-hand melody and fills vary.
- Confidence: high for explicitly taught concept.

### V08 — Nigerian Praise songs breakdown.mp4
- Focus: Scale degree and solfege guidance on praise pieces. Sample evidence: 01:26, 04:00, 07:12, 10:24, 13:36.
- Visual observations: Keyboard visualization accompanies degree/solfege teaching labels. Multiple song sections are shown, but chord labels cannot be verified from five isolated still frames.
- Engine implication: Use scale degrees for melody compatibility scoring and check chord hypotheses against a stable tonal center.
- Confidence: high for visible solfege instruction; limited pitch extraction.

### V09 — Nigerian_Praise_LIVE_Arrangement_Powerful_Piano_Solo_by_Johns.mp4
- Focus: Layered arrangement with piano solo. Sample evidence: 00:16, 01:21, 02:33.
- Visual observations: A DAW arrangement timeline with separate colored lanes and a virtual keyboard display is visible. The performance is presented as part of a multi-track arrangement.
- Engine implication: Treat piano, bass, pads and rhythmic texture as independent arrangement layers; balance them rather than doubling the lead.
- Confidence: high for multi-track visual structure.

### V10 — POPULAR_AFRICAN_PRAISE_STEM_BREAKDOWN_INSIDE_THE_MIND_OF_A_GE.mp4
- Focus: Stem/track breakdown of African praise. Sample evidence: 02:12, 06:07, 11:00, 15:54, 20:47.
- Visual observations: The screen displays a DAW with several discrete arrangement tracks. A displayed project tempo appears close to 140 BPM (visual reading only, not universal style labeling).
- Engine implication: Use multi-layer accompaniment with controlled introduction, dropout and build-ups; plan for stem-level training data.
- Confidence: moderate for displayed tempo, high for stem organization.

### V11 — Popular_Igbo_Praise_Lead_Bass_Lines_Tutorials_Breakdown_Exp.mp4
- Focus: Igbo praise lead bassline approaches. Sample evidence: 01:20, 06:40, 09:38, 12:36.
- Visual observations: Hands-on keyboard demonstration with independent lower and upper ranges. The instructor repeatedly demonstrates lead/bass relationships at several time points.
- Engine implication: Add bass approach options: steady foundation, walking approach, and octave/fifth emphasis as original generic exercises.
- Confidence: moderate for role separation; exact bass transcription not verified.

## v0.5 engine changes based on musical concepts (NOT copied transcriptions)
1. Add the generic 1–5–4–5 chord progression to the existing guided repertoire; 1–4–5–4, 1–4–1–5, and 1–6–2–5 already existed.
2. Add three bass behaviors: **Steady foundation**, **Walking passing notes**, **Energetic octave groove**. All patterns are independently authored, not copied performances.
3. The low bass continues throughout right-hand note fills instead of requiring the lead melody to trigger each bass event.
4. Add **Leave space for the singer**. This experimental pitch-activity gate suppresses some decorative fills during recent stable pitch detection; it cannot distinguish voice from another instrument.
5. Simple View remains simple. Only Musician View exposes the extra controls.

## What would count as actual training?
- **Permission**: Obtain rights/consent for any recording used as training data; tutorial videos being publicly watchable does not itself grant training/redistribution rights.
- **Dedicated captures**: Record a keyboardist's MIDI output from a keyboard via USB-MIDI while also recording separate keyboard audio, bass, drum and vocal channels; timestamp-align the streams.
- **Annotations**: Add song section boundaries, key changes, exact chord names and inversions, bass role/notes, lead phrases, downbeat positions, dynamics, groove tags and the moments where the player deliberately does *not* fill.
- **Training model**: First build a symbolic accompaniment selector using a verified library of original MIDI patterns, and measure exact-beat placement and harmonic fit. Only then consider conditional sequence models and ML retraining.
- **Evaluation**: Hold back entire church sessions for tests; do not evaluate only on videos the model has seen. Compare key/chord accuracy, transition quality, latency, bass synchronization, interruption recovery, and feedback behavior.

## Practical recording setup
Ask a willing gospel keyboardist to play **10–20 short original exercises** (30–90 seconds each): a slow worship progression, a piano-only praise comp, the same groove with a separate bassline, a chorus with the lead singing, a song change, and a surprise key change. Record the **MIDI file** when possible, plus an audio reference. Request explicit permission to use their playing to improve ChurchKeys and store the result securely. This gives much stronger labels than mixed YouTube videos.

## Known limitations
- No separation of singing, drummer and keyboard from these MP4s.
- No verified transcription of full keyboard notes/chord timings.
- No trained artificial intelligence model or song recognition.
- The existing application's beat/key estimator remains experimental; it cannot yet reliably follow unpredictable congregational music.
- If trained on church performances later, isolate accounts' private music data and allow deletion/export.
