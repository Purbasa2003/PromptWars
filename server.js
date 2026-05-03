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

// ──────────────────────────────────────────────
// Security headers middleware
// ──────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://www.gstatic.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://generativelanguage.googleapis.com https://*.firebaseio.com https://newsapi.org wss://*.firebaseio.com",
            "frame-src https://www.google.com",
            "worker-src blob:"
        ].join('; ')
    );
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
    next();
});

// ──────────────────────────────────────────────
// Rate limiting (simple in-memory limiter)
// ──────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30; // requests per window

function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW_MS;

    // Clean up old entries
    if (rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, rateLimitMap.get(ip).filter(t => t > windowStart));
    } else {
        rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip);
    if (requests.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    requests.push(now);
    next();
}

// ──────────────────────────────────────────────
// Input validation helper
// ──────────────────────────────────────────────
function sanitizeGeminiRequest(body) {
    if (!body || typeof body !== 'object') {
        throw new Error('Invalid request body');
    }

    const { model, contents, systemInstruction, generationConfig } = body;

    // Validate model string
    const allowedModels = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'];
    const safeModel = allowedModels.includes(model) ? model : 'gemini-1.5-flash';

    // Validate contents array
    if (!Array.isArray(contents) || contents.length === 0) {
        throw new Error('Invalid contents');
    }

    // Cap prompt length to prevent abuse
    const promptText = contents
        .flatMap(c => (c.parts || []).map(p => p.text || ''))
        .join('');
    if (promptText.length > 4000) {
        throw new Error('Prompt too long');
    }

    return { model: safeModel, contents, systemInstruction, generationConfig };
}

// ──────────────────────────────────────────────
// CORS - restrict to same origin in production
// ──────────────────────────────────────────────
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.ALLOWED_ORIGIN || 'https://promptwarsvirtual-app-96676882486.us-central1.run.app']
        : true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '50kb' }));

// ──────────────────────────────────────────────
// Serve static files with correct MIME types
// ──────────────────────────────────────────────
app.use(express.static(__dirname, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
        // Cache static assets (1 week for CSS/JS, no-cache for HTML)
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'public, max-age=604800');
        }
    }
}));

// ──────────────────────────────────────────────
// Gemini AI Proxy endpoint (secure, rate-limited)
// Keeps API key on the server, away from client
// ──────────────────────────────────────────────
app.post('/api/gemini', rateLimit, async (req, res) => {
    try {
        const sanitized = sanitizeGeminiRequest(req.body);
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API key not configured on server.' });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${sanitized.model}:generateContent?key=${apiKey}`;

        const geminiPayload = { contents: sanitized.contents };
        if (sanitized.systemInstruction) geminiPayload.systemInstruction = sanitized.systemInstruction;
        if (sanitized.generationConfig) geminiPayload.generationConfig = sanitized.generationConfig;

        const response = await axios.post(url, geminiPayload, { timeout: 15000 });
        res.json(response.data);
    } catch (error) {
        if (error.message === 'Invalid request body' || error.message === 'Prompt too long') {
            return res.status(400).json({ error: error.message });
        }
        const status = error.response?.status || 500;
        const data = error.response?.data || { error: error.message || 'Internal Server Error' };
        console.error('Gemini proxy error:', data);
        res.status(status).json(data);
    }
});

// ──────────────────────────────────────────────
// Health check (two routes for wider compatibility)
// ──────────────────────────────────────────────
const healthHandler = (_req, res) => res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '2.0.0',
    uptime: Math.floor(process.uptime())
});
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// ──────────────────────────────────────────────
// 404 handler for API routes
// ──────────────────────────────────────────────
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// ──────────────────────────────────────────────
// SPA fallback — all unmatched routes → index.html
// ──────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ──────────────────────────────────────────────
// Global error handler
// ──────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🗳️  DEMOKRATIC server running at http://localhost:${PORT}`);
    console.log(`   Gemini API key: ${process.env.GEMINI_API_KEY ? '✅ configured' : '❌ MISSING'}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
