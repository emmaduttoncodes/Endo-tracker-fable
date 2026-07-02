# Endo Tracker

A private, offline-first PWA for tracking endometriosis: daily symptoms, cycle,
and medical records — with exports designed to become a long-term "health brain"
that an AI assistant (or your clinician) can use for context.

## Features

- **Daily log** — pain by body location with 1–10 severity, bleeding level,
  symptom checklist (GI, fatigue, mood, and more), energy/mood/sleep, medication
  taken, suspected triggers, and free-text notes. Auto-saves as you tap; you can
  back-fill previous days.
- **Cycle tracking** — periods are derived automatically from logged bleeding.
  Month calendar shows bleeding intensity, high-pain days, and the predicted next
  period, plus cycle-length stats.
- **Trends** — worst daily pain over time, most frequent symptoms, and average
  pain by cycle day (which surfaces how symptoms track your cycle).
- **Medical records** — appointments (with questions to ask and outcomes),
  blood test results (grouped by draw, with reference ranges and low/high flags),
  and medication history. Current medications appear as one-tap chips in the
  daily log.
- **Health-brain export** —
  - **Markdown summary**: a compact, human-readable digest of cycle stats,
    symptom patterns, medications, labs and appointments to hand to a doctor or
    paste into an AI assistant as context.
  - **JSON export/import**: the full machine-readable dataset, doubling as your
    backup (data lives only in your browser's IndexedDB).

## Privacy

All data is stored locally on your device (IndexedDB). Nothing is uploaded
anywhere. Take a JSON backup periodically — clearing browser data deletes your
history.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build (dist/)
npm run preview  # serve the production build
```

Built with React 19, TypeScript, Vite, Dexie (IndexedDB) and vite-plugin-pwa.
Installable on iOS/Android ("Add to Home Screen") and desktop; works fully
offline after first load.

## Roadmap ideas

- Attach documents/photos (scan letters, imaging reports) to records
- Optional encrypted sync between devices
- Built-in AI assistant that reads the local dataset to spot patterns,
  draft appointment prep notes, and act as a health advocate

*Endo Tracker is not a medical device and does not provide medical advice.*
