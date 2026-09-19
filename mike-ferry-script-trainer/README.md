# F1 Script Trainer

Mobile-first PWA for learning real-estate prospecting and listing scripts by repetition.

## Current build

- 61 Italian operational scripts covering prospecting, FSBO, expired, Just Listed/Just Sold, database, lead follow-up, seller prequalification, listing presentation, objections, price reduction, buyer, referral and appointment setting.
- Source/status shown on every script.
- On-device Italian speech synthesis. No paid TTS dependency is required.
- Automatic preference for an available Italian voice; quality depends on the voices installed in iOS/Android/desktop OS.
- Playback, pause/resume, repeat, speed 0.8x–1.1x, 1/3/5/continuous loops.
- Sentence-by-sentence memorization, hidden text, memory test, role play.
- Favorites, learned/review state, listen counters stored in localStorage.
- Offline cache via Service Worker.
- PWA manifest and iOS Home Screen metadata.

## Source hierarchy

Where an official Mike Ferry Italy translation is publicly available, the app uses it as the primary reference while keeping the trainer wording as an original F1 adaptation rather than reproducing the protected script verbatim.

## Copyright note

The application intentionally avoids reproducing complete copyrighted MFO scripts. It stores original Italian adaptations with explicit provenance/status labels. See SOURCES.md.

## Best iPhone voice quality

For the best result, install an enhanced Italian female system voice in iOS Accessibility / Spoken Content voice settings if available. The PWA uses the system speech engine and does not upload script text to a subscription TTS provider.

## Install

iPhone: open the GitHub Pages URL in Safari → Share → Add to Home Screen.
Android: open in Chrome → menu → Install app / Add to Home screen.