# DEMOKRATIC — The Voting Adventure World 🇮🇳🗳️

> **An immersive, cinematic RPG platform that educates citizens about the Indian election process.**

## 🕹️ Play the Live Game

👉 **[Play DEMOKRATIC](https://promptwarsvirtual-app-96676882486.us-central1.run.app)**

---

## 🌟 Features

- **RPG Quest Mechanics** — Hero's journey through the electoral process. Earn XP, level up from Citizen → Democracy Guardian.
- **3 Quests, 13 Steps** — Voter registration, finding your booth, and casting your vote on a real-simulated EVM.
- **AI-Powered Sidekick (DIYA)** — Chat with DIYA (Democratic India Your Assistant) powered by Google Gemini 1.5 Flash.
- **Interactive EVM + VVPAT Simulation** — State-specific candidates, one-button voting, 7-second VVPAT slip animation.
- **Real-Time Leaderboards** — Firebase Realtime Database showing live player rankings by completion time.
- **Civics Card Deck** — Collect 6 educational civic cards (EPIC, EVM, VVPAT, Article 326, Model Code, Booth Rules).
- **Live Achievements** — 9 unlockable achievements (Speed Voter, Quiz Master, Democracy Guardian, etc.)
- **AI Quiz** — 3 Gemini-generated questions on the Indian election process with explanations.
- **Election Timeline** — Interactive timeline of the full voting process.
- **India Map with Turnout Data** — Real voter turnout stats for 12 states.
- **Cinematic "Civic Dark" UI** — Particle effects, holographic HUD, tricolour palette.
- **Fully Accessible** — ARIA labels, keyboard navigation, screen reader support, skip links, focus trapping.
- **Mobile-Responsive** — D-Pad touch controls for mobile players.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES Modules) |
| Game Engine | HTML5 Canvas (pixel-art RPG renderer) |
| AI | Google Gemini 1.5 Flash API (via secure Node.js proxy) |
| Database | Google Firebase Realtime Database |
| Backend | Node.js + Express (API proxy + static file server) |
| Deployment | Docker + Google Cloud Run |

## 🚀 Run Locally

```bash
git clone https://github.com/Purbasa2003/PromptWars.git
cd PromptWars

# Install dependencies
npm install

# Add your API keys to .env
cp .env.example .env
# Edit .env with your GEMINI_API_KEY

# Start the server
npm start

# Open http://localhost:8080
```

## ☁️ Docker Deployment

```bash
docker build -t demokratic .
docker run -p 8080:8080 --env-file .env demokratic
```

> **Important:** The app uses a Node.js server (not nginx) to proxy Gemini AI API calls securely. This keeps your API key off the client.

## 🧪 Tests

```bash
npm test
```

Tests cover: XP system, level-up logic, quest completion, time formatting, EVM candidate selection, and Gemini API mocking.

## 🏗️ Architecture

```
DEMOKRATIC/
├── server.js              # Express server — static files + /api/gemini proxy
├── index.html             # Main HTML shell + HUD overlays
├── src/
│   ├── js/
│   │   ├── main.js        # Game loop, event listeners, initialization
│   │   ├── gameState.js   # All game constants, maps, quests, player state
│   │   ├── renderer.js    # Canvas tile/NPC/player drawing
│   │   ├── interactions.js# Keyboard/touch input, NPC dialogue, quest triggers
│   │   ├── ui.js          # Overlay management, HUD, animations, accessibility
│   │   ├── ai.js          # Gemini API calls with fallback data
│   │   ├── evm.js         # EVM voting + VVPAT slip logic
│   │   └── firebase.js    # Leaderboard + activity feed (Firebase)
│   └── styles/
│       └── main.css       # Full CSS with CSS variables, animations, responsive
├── Dockerfile             # Node.js-based container (not nginx!)
└── tests.test.js          # Jest unit tests
```

## 🔐 API Security

All Gemini AI calls are proxied through `/api/gemini` on the Node.js server. The API key is **never exposed to the client**. Firebase is read-only from the client; write access uses Firebase Auth rules.

---

*Educate. Engage. Empower. 🇮🇳*
