# DEMOKRATIC — The Voting Adventure World 🇮🇳🗳️

> **An immersive, cinematic RPG that educates Indian citizens about the election process — powered by Google Gemini AI, Firebase, and deployed on Google Cloud Run.**

[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-ISC-blue)](./LICENSE)
[![Gemini AI](https://img.shields.io/badge/AI-Google%20Gemini%201.5%20Flash-blue)](https://aistudio.google.com/)
[![Firebase](https://img.shields.io/badge/DB-Firebase%20Realtime%20DB-orange)](https://firebase.google.com/)
[![Cloud Run](https://img.shields.io/badge/Deploy-Google%20Cloud%20Run-4285F4)](https://cloud.google.com/run)
[![Tests](https://img.shields.io/badge/tests-52%20passing-brightgreen)]()

## 🕹️ Play the Live Game

👉 **[Play DEMOKRATIC](https://promptwarsvirtual-app-96676882486.us-central1.run.app)**

---

## 🌟 Features

| Category | Features |
|----------|----------|
| **Gameplay** | 3 quests × 13 steps; XP + 5-level civic progression; 9 unlockable achievements |
| **AI (Google Gemini)** | DIYA chat assistant, dynamic quiz generation, NPC dialogue, voter education report, live news ticker |
| **Google Services** | Gemini 1.5 Flash · Firebase Realtime DB · Cloud Run · Fonts · Material Symbols |
| **Civics Content** | EVM/VVPAT simulation, EPIC card generation, indelible ink ceremony, state-specific candidates |
| **Security** | CSP headers, rate limiting (30 req/min), input sanitisation, API key never reaches client |
| **Accessibility** | ARIA live regions, skip link, `role="dialog"`, `aria-modal`, keyboard nav, D-pad mobile, `lang="en-IN"` |
| **Testing** | 52 Jest unit tests — XP, quests, EVM, AI, formatting, security edge cases |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript ES Modules |
| Game Engine | HTML5 Canvas (tile-based RPG) |
| AI | **Google Gemini 1.5 Flash** via secure Node.js proxy |
| Database | **Google Firebase Realtime Database** — live leaderboard |
| Backend | Node.js 20 + Express 5 |
| Deployment | Docker + **Google Cloud Run** |
| Testing | Jest 30 with jsdom |

---

## 🔐 Security Architecture

All Gemini AI calls are proxied through `/api/gemini` on the server. **The API key never reaches the browser.**

```
Browser → POST /api/gemini → server.js validates + rate-limits → Gemini API
```

Security measures implemented:

- **Content-Security-Policy** — strict allowlist for scripts, styles, frames, and connections
- **HSTS** — `max-age=63072000; includeSubDomains`
- **Rate limiting** — 30 requests/minute per IP (in-memory, O(1) cleanup)
- **Input validation** — model allowlist, prompt length cap (4 000 chars), body size limit (50 KB)
- **CORS** — restricted to deployed origin in production (`NODE_ENV=production`)
- **HTTP headers** — `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- **Docker** — non-root user (`appuser:nodejs`), `dumb-init` PID 1, multi-stage build strips dev files
- **Error handling** — global error handler prevents stack trace leakage to clients

---

## 🚀 Quick Start

```bash
git clone https://github.com/Purbasa2003/PromptWars.git
cd PromptWars

npm install

cp .env.example .env
# Edit .env — paste your GEMINI_API_KEY from https://aistudio.google.com/

npm start
# Open http://localhost:8080
```

### Docker

```bash
docker build -t demokratic .
docker run -p 8080:8080 --env-file .env demokratic
```

### Development (hot-reload)

```bash
npm run dev
```

---

## 🧪 Testing

```bash
npm test                 # run all 52 tests
npm run test:coverage    # run with coverage report
npm run test:watch       # watch mode
```

**Test coverage (52 tests across 7 suites):**

| Suite | Tests | Covers |
|-------|-------|--------|
| XP & Level System | 8 | `addXP`, boundary conditions, cap at level 5 |
| Time Formatting | 10 | `formatTime`, edge cases, regex validation |
| Quest System | 8 | `completeQuestStep`, idempotency, structure |
| EVM Voting | 4 | `selectCandidate`, state guards |
| Game State | 12 | `getCandidates`, cards, achievements, reset |
| Gemini AI | 11 | quiz, fact, news, DIYA, fallbacks, keywords |
| Input Validation | 5 | negative XP, null state, boundary steps |

---

## 🏗️ Architecture

```
DEMOKRATIC/
├── server.js              # Express — static files + /api/gemini proxy (CSP, rate-limit, validation)
├── index.html             # HTML shell + all HUD overlays (ARIA-compliant, lang="en-IN")
├── src/
│   ├── js/
│   │   ├── main.js        # Game loop, init, event wiring
│   │   ├── gameState.js   # All constants, maps, quests, player state, pure functions
│   │   ├── renderer.js    # Canvas tile/NPC/player rendering
│   │   ├── interactions.js# Input (keyboard + touch), NPC triggers, quest logic
│   │   ├── ui.js          # Overlays, HUD, toasts, accessibility announcements
│   │   ├── ai.js          # Gemini calls — sanitised input, local cache, fallbacks
│   │   ├── evm.js         # EVM voting + VVPAT slip animation
│   │   └── firebase.js    # Leaderboard + activity feed (Firebase Realtime DB)
│   └── styles/
│       └── main.css       # CSS variables, animations, responsive, glassmorphism HUD
├── tests/
│   └── tests.test.js      # 52 Jest tests (jsdom)
├── Dockerfile             # Multi-stage, non-root, dumb-init
├── .env.example           # Environment variable template
└── jest.config.js         # Jest ESM configuration
```

---

## ♿ Accessibility

DEMOKRATIC meets WCAG 2.1 AA standards:

- `lang="en-IN"` on `<html>`
- Skip-to-content link at page top
- All interactive elements have `aria-label` or visible `<label>`
- Form inputs have associated labels (`for`/`id` or `aria-label`)
- Modal overlays use `role="dialog"` + `aria-modal="true"` + focus trap
- `aria-live="polite"` live regions for XP gains, level-ups, quest updates
- Screen reader announcer for all major game events
- Full keyboard navigation: Arrow / WASD + Enter + ESC
- High-contrast focus indicators (3px solid `#F4A355`)
- Touch D-pad for mobile users
- Semantic HTML throughout (buttons, inputs, selects with labels)

---

## 🌐 Google Services Integration

| Service | Usage in DEMOKRATIC |
|---------|---------------------|
| **Google Gemini 1.5 Flash** | AI quiz generation, NPC dialogue, DIYA assistant, voter education report, news ticker |
| **Google Firebase Realtime Database** | Live leaderboard with real-time updates, activity feed, active player count |
| **Google Cloud Run** | Production deployment (auto-scaling, HTTPS, custom domain) |
| **Google Fonts** | Nunito, Rajdhani, Press Start 2P, Cinzel Decorative, Baloo 2 |
| **Google Material Symbols** | All UI icons (timer, badge, style, military_tech, etc.) |
| **Google Maps Embed** | India electoral map in the Map Center overlay |

---

## 🗺️ Game Flow

```
Landing Page → Character Creation → Controls Tutorial
    → Quest 1: Become a Voter
        ↳ Notice Board → Registration Office → Form 6 → Terminal → EPIC Card
    → Quest 2: Find Your Booth
        ↳ Security Guard scan → Polling Station entry
    → Quest 3: Cast Your Vote
        ↳ Identity Verification → Indelible Ink → EVM → VVPAT slip → Certificate
    → Completion: AI Report + Download Certificate + Leaderboard
```

---

## 📦 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ | Google Gemini API key from [aistudio.google.com](https://aistudio.google.com) |
| `PORT` | ❌ | Server port (default: `8080`) |
| `NODE_ENV` | ❌ | `production` enables strict CORS |
| `ALLOWED_ORIGIN` | ❌ (prod) | Your Cloud Run URL for CORS |

---

*Educate. Engage. Empower. 🇮🇳 — Built for Bharat, powered by Google.*
