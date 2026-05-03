import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ──────────────────────────────────────────────
// Serve static files with correct MIME types
// (Critical for ES modules: JS must be application/javascript)
// ──────────────────────────────────────────────
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
    }
}));

// ──────────────────────────────────────────────
// Gemini AI Proxy endpoint
// Keeps API key on the server, away from client
// ──────────────────────────────────────────────
app.post('/api/gemini', async (req, res) => {
    try {
        const { model, ...geminiParams } = req.body;
        const geminiModel = model || 'gemini-1.5-flash';
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured on server.' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
        const response = await axios.post(url, geminiParams, { timeout: 15000 });
        res.json(response.data);
    } catch (error) {
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: error.message || 'Internal Server Error' };
        console.error('Gemini proxy error:', data);
        res.status(status).json(data);
    }
});

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ──────────────────────────────────────────────
// SPA fallback — all unmatched routes → index.html
// ──────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🗳️  DEMOKRATIC server running at http://localhost:${PORT}`);
    console.log(`   Gemini API key: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ MISSING'}`);
});
