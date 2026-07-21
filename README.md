# Earth-Online

A gamified life journal and achievement system that turns your daily life into an MMO-like experience. Write notes, track todos, unlock achievements, and chat with an AI assistant -- all in one place.

Built with React 19, Framer Motion, Tailwind CSS 4, and IndexedDB. Ships as a Progressive Web App (PWA) and a native Android APK via Capacitor.

> **v1.2.1** New hidden developer debug mode -- tap 7 times to unlock, adjust Liquid Glass parameters in real-time with live preview.
>
> Now supporting local AI models! Run Qwen2.5 locally via Ollama (desktop, phone connects via LAN) or WebLLM (browser WebGPU) for fully offline AI features -- no API key required.
>
> Three-engine achievement matching: Transformers.js semantic embedding + AI/WebLLM model + keyword matching for accurate note-to-achievement pairing.
>
> AI batch tagging: Select multiple notes and auto-generate tags with one tap, via local model (Ollama/WebLLM), cloud AI, or keyword matching.

---

## Features

- **Notes** -- Multiple types (journal, todo, milestone, flashcard), Markdown editing, background patterns and ambient animations, folders, pinning, tags, soft-delete (recycle bin), and search with recent search history.
- **Todos** -- Per-note todo lists with priorities, due dates, and inline progress bars. Active todo count shown on the TabBar badge.
- **Achievements** -- 60 gamified life achievements with rarity tiers. Unlocked automatically by matching your note content against AI or keyword rules.
- **AI Assistant** -- Built-in chat panel that can analyze your notes, generate summaries, and execute actions. Supports DeepSeek, Zhipu, Qwen, Ollama, and WebLLM.
- **Local Models** -- Run Qwen2.5-1.5B/3B entirely offline via Ollama (desktop LAN) or WebLLM (browser WebGPU). No API key needed.
- **AI Batch Tagging** -- Select multiple notes, one tap generates Chinese tags via AI or keyword matching.
- **Achievement Matching** -- Three-engine system: semantic embedding (Transformers.js BERT), AI reasoning (local or cloud), and keyword matching.
- **Background Themes** -- 7 background colors, 4 CSS-only patterns, 3 ambient animations. Zero image overhead.
- **Encrypted Export** -- Notes exported as .eon files with AES-GCM encryption (PBKDF2-derived key).
- **Developer Debug Mode** -- Hidden debug mode (7-tap to unlock), adjustable Liquid Glass parameters with live preview.
- **Dark Mode** -- Full dark theme with adaptive colors across all components.
- **Accessibility** -- Respects prefers-reduced-motion and prefers-reduced-transparency.
- **PWA** -- Offline-capable with service worker caching. Installable on mobile home screen.
- **Android App** -- Native Android APK via Capacitor.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Database | IndexedDB (idb 8) |
| AI API | DeepSeek / Zhipu / Qwen |
| Local AI | Ollama / WebLLM (WebGPU) |
| Encryption | Web Crypto API (AES-GCM, PBKDF2) |
| Mobile | Capacitor 7 |
| Icons | Lucide React |

---

## Quick Start

```bash
npm install
npm run dev       # development server
npm run build     # production build
npm run preview   # preview production build
```

## Android Build

```bash
npx cap sync android
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Version

v1.2.1
