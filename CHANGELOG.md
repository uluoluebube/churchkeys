# v1.0 — Live Engine & Input Reliability

- Replaced key-gated silence with mixed-audio chroma estimation and explicit provisional startup.
- Added optional local audio-file input and monitor for repeatable testing.
- Added source and engine health status and actual output signal meter.
- Prevented percussion-only tests from being labelled confident when no stable vocal pitch events exist.
- Stabilized estimates with key-switch candidate dwell time.
- Preserved Simple View, Musician View, musical feels, keyboard instruments, bass presets, groove audition, preferences, and Netlify static deployment.
- Added Node unit tests and tested end-to-end audio event generation in a browser against both synthetic and real user-supplied musical material.
- Caveat: no learned AI model; no guaranteed song following or harmonious performance yet.
