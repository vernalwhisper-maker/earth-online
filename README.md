# 地球Online (Earth-Online)

A gamified life journal and achievement system that turns your daily life into an MMO-like experience. Write notes, track todos, unlock achievements, and chat with an AI assistant -- all in one place.

Built with React 19, Framer Motion, Tailwind CSS 4, and IndexedDB. Ships as a Progressive Web App (PWA) and a native Android APK via Capacitor.

> 🌐 **Now supporting local AI models!** Run Qwen2.5 locally via Ollama (desktop, phone connects via LAN) or WebLLM (browser WebGPU) for fully offline AI features — no API key required.
>
> 🔍 **Three-engine achievement matching:** Transformers.js semantic embedding + AI/WebLLM model + keyword matching for accurate note-to-achievement pairing.
>
> 🏷 **AI batch tagging:** Select multiple notes and auto-generate tags with one tap, via local model (Ollama/WebLLM), cloud AI, or keyword matching — shown in a glass panel above the TabBar.
>
> 📱 **v1.2.0:** WebLLM achievement matching, AI assistant engine health checks, Ollama LAN connectivity test, batch tag/delete glass panel, and auto-fallback to local keyword matching when AI is unavailable.

---

## Features

- **Notes** -- Multiple types (journal, todo, milestone, flashcard), Markdown editing, background patterns and ambient animations, folders, pinning, tags, soft-delete (recycle bin), and search with recent search history.
- **Todos** -- Per-note todo lists with priorities, due dates, and inline progress bars. Active todo count shown on the TabBar badge.
- **Achievements** -- 60 gamified life achievements (e.g., "Bought a House", "Learned an Instrument") with rarity tiers. Unlocked automatically by matching your note content against AI or keyword rules. Celebrated with an unlock modal and confetti for rare finds.
- **AI Assistant** -- Built-in chat panel that can analyze your notes, generate summaries, and execute actions (move between folders, add/remove tags, change note type, pin/delete). Supports DeepSeek, Zhipu, Qwen providers, **plus local models via Ollama** (desktop, phone connects via LAN) **and WebLLM** (browser with WebGPU). Includes engine health detection: prompts you to load WebLLM if not ready, checks Ollama connectivity when opening the panel.
- **Local Models** -- Run Qwen2.5-1.5B/3B entirely offline. Two modes: **Ollama** (desktop server, phone connects via LAN) and **WebLLM** (browser WebGPU, ~1GB download). No API key needed. Both modes include a **connectivity test button** in Settings for easy debugging.
- **AI Batch Tagging** -- Select multiple notes → one tap generates relevant Chinese tags via AI or keyword matching. Tags are deduplicated and appended.
- **Achievement Matching** -- Three-engine system: **semantic embedding** (Transformers.js BERT, ~113MB), **AI reasoning** (local or cloud), and **keyword matching**. Results are merged and deduplicated.
- **Background Themes** -- 7 background colors, 4 CSS-only patterns (grid, dot, lined, solid), and 3 ambient animations (starry particles, floating geometry, shimmer slide). Zero image overhead.
- **Encrypted Export** -- Notes exported as `.eon` files with AES-GCM encryption (PBKDF2-derived key).
- **Dark Mode** -- Full dark theme with adaptive colors across all components.
- **Accessibility** -- Respects `prefers-reduced-motion` and `prefers-reduced-transparency` for vestibular-safe experience.
- **PWA** -- Offline-capable with service worker caching. Installable on mobile home screen.
- **Android App** -- Native Android APK via Capacitor with status bar integration and back-button handling.

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
| Encryption | Web Crypto API (AES-GCM, PBKDF2) |
| Mobile | Capacitor 7 |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

### Android Build

```bash
npx cap sync android
cd android
./gradlew.bat assembleDebug
```

The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Configuration

### AI Provider

Navigate to Settings > AI Settings to configure:

- **Provider**: DeepSeek, Zhipu, or Qwen
- **API Key**: Your API key (encrypted and stored locally)
- **Parameters**: Temperature, max tokens, top-p

AI features are entirely optional. The app works fully offline without them.

### Appearance

- Toggle dark mode in Settings
- Adjust TabBar opacity in Settings > More Settings
- Per-note backgrounds and ambient animations in the note editor

---

## Data Model

IndexedDB database `earth-online` (schema version 5) with 6 object stores:

- `notes` -- Core notes with metadata (type, tags, folder, pin, background, Markdown flag)
- `todos` -- Todo items per note (content, priority, due date, completion)
- `settings` -- App settings (AI config, theme, tab bar opacity)
- `folders` -- Custom folder definitions
- `search_history` -- Recent search queries
- `chat_messages` -- AI chat history per note

---

## Design

The interface is built following Apple's Human Interface Guidelines, informed by WWDC design talks (Designing Fluid Interfaces 2018, Principles of Great Design 2026, The Details of UI Typography 2020):

- **Interruptibility** -- All animations use springs so they can be grabbed and reversed mid-flight
- **Spatial consistency** -- Page transitions mirror enter/exit paths; modals originate from their trigger
- **Direct manipulation** -- 1:1 tracking for gestures, pointer-down feedback on all tappable elements
- **Material depth** -- Translucent chrome with `backdrop-filter: blur()` and layered borders
- **Typography** -- Optical sizing with size-specific tracking (negative for display, positive for body)
- **Reduced motion** -- Full `prefers-reduced-motion` support with graceful fallbacks

---

## License

MIT
