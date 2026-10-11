# Uploaded audio — first-pass pattern study

21 provided recordings were inspected using **short 15-second excerpts** (twice for long medleys). Onset and pulse candidates were extracted from the mixed audio (singers, keys, drums and PA); pulse readings may be half or double the real tempo. This is **not transcription**, source separation, model training or proof of exact chord progressions. No original recording or melody has been embedded into the web app.

## Product insights

- The provided **African Ariaria praise medley** excerpt exhibits a pulse candidate near **152 BPM** in both inspected sections.
- The **Highlife praise medley by Cci Avengers** excerpts have a pulse candidate near **129 BPM**.
- Several other praise and ensemble clips show pulse candidates around **123–136 BPM**, while others vary substantially (sometimes half-time). Tempo assumptions are therefore starting presets only.
- Worship wasn't distinctly labeled across the sample set, so the **76 BPM gentle-worship default** is a design placeholder, not a measured style from these uploads.
- Chord voicings, exact bass runs, song identities, and keyboard-only phrases cannot be inferred reliably from these mixed-audio features alone.

## Next step for a trainable dataset

Request permission from each recording owner before using recordings to train or distribute a model. For stronger extraction, collect **keyboard MIDI**, or a separate direct keyboard audio feed plus drums/vocals reference, and have a musician annotate section, chords and bar timing. Only after we have consistent aligned data can we reliably evaluate imitation or personalization.
