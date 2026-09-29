# CoCho

A choreography workspace for musical theater. Load a script, song audio, and rehearsal video, sync them on a shared timeline, and block performers and props on a stage map cue by cue.

**Live app:** https://wordswithserg.github.io/cocho

## Panels

- **Script**: upload or paste lyrics/script and tag lines.
- **Audio**: upload an `.mp3`/`.wav`, tag moments, or auto-transcribe with OpenAI Whisper to sync lines to the audio.
- **Video**: load rehearsal video and pin it to the audio timeline.
- **Timeline**: scrub everything together.
- **Stage**: place performers and props on a sized stage and record positions per cue.

## Auto-transcribe

Auto-transcribe calls OpenAI's Whisper API directly from the browser. On the hosted site you'll be asked for your own OpenAI API key the first time you use it. The key is stored only in your browser's local storage and is sent only to OpenAI.

## Running locally

```bash
npm install
npm start
```

Optionally create a `.env` file with `REACT_APP_OPENAI_API_KEY=...` to skip the key prompt locally. Never commit `.env`, and never build the public site with it present, since `REACT_APP_*` values get bundled into the JavaScript.

## Deployment

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.
