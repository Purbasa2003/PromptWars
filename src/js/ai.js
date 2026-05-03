/**
 * ai.js - Gemini AI API calls via backend proxy
 * DEMOKRATIC Election Education Game
 *
 * This file handles all AI-generated content: facts, news, quizzes,
 * dialogue, reports, and the DIYA chat assistant.
 * All calls go through the backend proxy at /api/gemini for security.
 */

// API endpoint (backend proxy — API key never exposed to client)
const API_ENDPOINT = '/api/gemini';

// Default model
const DEFAULT_MODEL = 'gemini-1.5-flash';

// Maximum prompt lengths to prevent abuse
const MAX_PROMPT_LENGTH = 2000;
const MAX_USER_MSG_LENGTH = 500;

import { player } from './gameState.js';

// ============================================
// FALLBACK DATA (Used when API is unavailable)
// ============================================

const FALLBACK_FACTS = [
    "India's first general election (1951-52) was the largest democratic exercise in history at the time.",
    "The Election Commission of India was established on January 25, 1950, a day before India became a republic.",
    "VVPAT machines were first used in India in the 2014 general elections.",
    "The 2019 Indian general election had over 900 million eligible voters.",
    "Indelible ink was first used in India's 1962 general elections.",
    "The EVM was first used on a trial basis in 1982 in Kerala.",
    "India has over 1 million polling stations across the country.",
    "The Model Code of Conduct comes into effect the moment election dates are announced by ECI."
];

const FALLBACK_NEWS = [
    "Voter Turnout Hits 65% by Noon ⚡ Election Commission Assures Peaceful Polling ⚡ Markets Rally Amid Polling Phase 1 ⚡ Youth Voters Show Up in Record Numbers ⚡ ECI Deploys 1.5M Officials Across All Booths ⚡ VVPAT Verification: ECI Confirms 100% Match"
];

const FALLBACK_QUIZ = [
    { q: "What is the minimum voting age in India?", options: ["16", "18", "21", "25"], answer: 1, explanation: "The 61st Constitutional Amendment (1988) reduced the voting age from 21 to 18 years." },
    { q: "Which body conducts general elections in India?", options: ["Parliament of India", "Supreme Court", "Election Commission of India", "President's Office"], answer: 2, explanation: "The Election Commission of India (ECI) is a constitutional body that oversees all elections." },
    { q: "What does EVM stand for in Indian elections?", options: ["Electronic Voting Machine", "Election Verification Method", "Electoral Vote Measure", "Early Voting Model"], answer: 0, explanation: "EVMs replaced paper ballots and have been used nationwide since the 2004 general elections." }
];

const LOCAL_DIYA_ANSWERS = {
    "register": "To register to vote in India, you must be a citizen aged 18 or above. You can register online via the National Voters' Service Portal (NVSP) at nvsp.in or use the Voter Helpline App. You'll need to fill Form 6! 📝",
    "evm": "Electronic Voting Machines (EVMs) are used in Indian elections to cast and count votes. They are secure, standalone machines that don't need internet. Each EVM has a Balloting Unit and a Control Unit! 🗳️",
    "nota": "None of the Above (NOTA) is an option on the ballot that allows you to officially register a vote of rejection for all candidates. It ensures your right to say 'none of these'! ❌",
    "state": "Each state in India has its own State Election Commission. Elections happen every 5 years to elect members of the Legislative Assembly (MLA). Your vote decides your local government! 🏛️",
    "constitution": "The Indian Constitution is the supreme law of India, adopted on Nov 26, 1949. It guarantees fundamental rights and establishes India as a sovereign, democratic republic! 📜",
    "age": "In India, the minimum age to vote is 18 years. This was changed from 21 to 18 by the 61st Amendment Act in 1988! 🎂",
    "id": "Besides the Voter ID (EPIC), you can use 12 alternative documents like Aadhaar, PAN Card, or Driving License to prove your identity at the polling station! 🆔",
    "vvpat": "VVPAT (Voter Verifiable Paper Audit Trail) is a machine connected to the EVM that prints a slip showing who you voted for. You can see it for 7 seconds through a glass window! 📄",
    "form 6": "Form 6 is the application form for new voter registration in India. You can submit it online at nvsp.in or at your local Electoral Registration Office. Required documents: proof of age, address, and a passport photo. 📝",
    "epic": "EPIC stands for Electors Photo Identity Card — your Voter ID card. Introduced in 1993 by Chief Election Commissioner T.N. Seshan to reduce electoral fraud. Apply online at nvsp.in! 🪪",
    "model code": "The Model Code of Conduct (MCC) is a set of guidelines issued by the ECI to regulate political parties and candidates during elections. It kicks in the moment election dates are announced! ⚖️",
    "article 326": "Article 326 of the Indian Constitution guarantees the right to vote to all adult citizens (18+), establishing universal adult suffrage as the basis of elections. 📜"
};

// ============================================
// INPUT SANITIZATION
// ============================================

/**
 * Sanitize a text string to prevent injection
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function sanitizeText(text, maxLength = MAX_PROMPT_LENGTH) {
    if (typeof text !== 'string') return '';
    // Strip HTML tags and limit length
    return text
        .replace(/<[^>]*>/g, '')
        .replace(/[^\w\s.,!?'\-:()]/g, ' ')
        .trim()
        .slice(0, maxLength);
}

// ============================================
// GEMINI API CALL WRAPPER
// ============================================

/**
 * Call the Gemini API via the secure backend proxy.
 * @param {string} prompt
 * @param {string} model
 * @param {string|null} responseFormat
 * @param {string|null} systemInstruction
 * @returns {Promise<string|null>}
 */
async function callGeminiAPI(prompt, model = DEFAULT_MODEL, responseFormat = null, systemInstruction = null) {
    try {
        const sanitizedPrompt = sanitizeText(prompt, MAX_PROMPT_LENGTH);
        if (!sanitizedPrompt) return null;

        const requestBody = {
            model: model,
            contents: [{ parts: [{ text: sanitizedPrompt }] }]
        };

        if (responseFormat === 'json') {
            requestBody.generationConfig = { response_mime_type: "application/json" };
        }

        if (systemInstruction) {
            requestBody.systemInstruction = { parts: [{ text: sanitizeText(systemInstruction, 500) }] };
        }

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Gemini API error:', errorData);
            return null;
        }

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        return null;
    } catch (error) {
        console.error('Gemini API call failed:', error);
        return null;
    }
}

// ============================================
// FACT OF THE DAY
// ============================================

export async function fetchGeminiFact() {
    const prompt = "Provide one short, fascinating fact about the history of elections in India (max 20 words). Do not use markdown.";
    const result = await callGeminiAPI(prompt);
    return result?.trim() || FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
}

// ============================================
// LIVE NEWS TICKER
// ============================================

export async function fetchGeminiNews() {
    // Try NewsAPI first for real news
    try {
        const newsRes = await fetch('https://newsapi.org/v2/top-headlines?country=in&category=politics&pageSize=8&apiKey=02b695c0d7d54963b2891a6d41f71048');
        if (newsRes.ok) {
            const newsData = await newsRes.json();
            if (newsData.articles?.length > 0) {
                const headlines = newsData.articles
                    .filter(a => a.title && !a.title.includes('[Removed]'))
                    .map(a => a.title)
                    .slice(0, 6)
                    .join(' ⚡ ');
                if (headlines) return '🔴 ' + headlines;
            }
        }
    } catch (e) {
        console.log('NewsAPI failed, falling back to Gemini');
    }

    const prompt = "Generate 6 realistic current Indian election/politics news headlines for today. Format as single line separated by ' ⚡ '. No quotes or markdown. Focus on ECI, voter turnout, political parties.";
    const result = await callGeminiAPI(prompt);
    return result?.trim() || FALLBACK_NEWS[0];
}

// ============================================
// QUIZ GENERATION
// ============================================

export async function fetchGeminiQuiz() {
    const prompt = `Generate a JSON object with exactly 3 multiple-choice quiz questions specifically about the Indian Election Process — covering topics like voter registration (Form 6, EPIC card), polling day procedures (EVM, VVPAT, indelible ink, Model Code of Conduct), historical elections (1952, voter turnout facts), and constitutional provisions (Article 324, 61st Amendment).

JSON format: {"questions": [{"q": "Question text?", "options": ["A", "B", "C", "D"], "answer": 1, "explanation": "Why the correct answer is right"}]}.

The answer field is the 0-based index of the correct option. Questions should educate players about the election process they are simulating. Keep each question concise. Return only valid JSON, no markdown.`;

    const result = await callGeminiAPI(prompt, DEFAULT_MODEL, 'json');

    if (result) {
        try {
            let cleanJson = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed.questions) && parsed.questions.length === 3) {
                return parsed.questions;
            }
        } catch (e) {
            console.error('Failed to parse quiz JSON:', e);
        }
    }

    return FALLBACK_QUIZ;
}

// ============================================
// NPC DIALOGUE
// ============================================

export async function fetchGeminiDialogue(npcName, playerName, playerState) {
    const safeName = sanitizeText(playerName, 30);
    const safeState = sanitizeText(playerState, 20);
    const prompt = `You are a ${npcName} in an Indian Election educational RPG game called DEMOKRATIC. Keep your response under 35 words. Give helpful, encouraging civic advice to a player named ${safeName} from ${safeState}. Be warm and friendly. No markdown.`;

    const result = await callGeminiAPI(prompt);
    return result?.trim() || "Vote responsibly! Every vote counts in building our nation's future. 🇮🇳";
}

// ============================================
// ELDER CITIZEN SPECIAL DIALOGUE
// ============================================

export async function fetchGeminiElderDialogue(playerName, playerState) {
    const safeName = sanitizeText(playerName, 30);
    const safeState = sanitizeText(playerState, 20);
    const prompt = `You are an elderly Indian citizen, aged 75, who has voted in every election since 1952. Share one short (under 35 words), personal, and inspiring story or memory about Indian elections. Speak warmly in first person. Player's name: ${safeName} from ${safeState}. No markdown.`;

    const result = await callGeminiAPI(prompt);
    return result?.trim() || "Beta, I've voted since 1952 — 18 elections! Each vote felt like a prayer for India's future. Never miss yours. 🙏";
}

// ============================================
// VOTER EDUCATION REPORT
// ============================================

export async function fetchGeminiReport(query = null, type = 'report') {
    if (type === 'diya') {
        return await fetchGeminiDiya(query);
    }

    const minutes = Math.floor((window.timeInSeconds || 0) / 60);
    const seconds = (window.timeInSeconds || 0) % 60;
    const safeName = sanitizeText(player.name || 'Citizen', 30);
    const safeState = sanitizeText(player.state || 'India', 20);

    const prompt = `The player just completed a voting education game called DEMOKRATIC in ${minutes}m ${seconds}s. They are ${safeName} from ${safeState}. They scored ${player.quizScore || 0}/3 in the civics quiz and reached Level ${player.level || 1} (out of 5). Generate a congratulatory 3-paragraph Voter Education Report covering what they learned about the Indian democratic process. Inspiring tone, use emojis. Make it personal and encouraging. No markdown headings.`;

    const result = await callGeminiAPI(prompt);
    return result?.trim() || "Congratulations on fulfilling your democratic duty! Your participation strengthens the foundation of our great nation. You've learned about voter registration, EVM voting, and the importance of every single vote. Keep the spirit of democracy alive! 🇮🇳🗳️";
}

// ============================================
// DIYA CHAT ASSISTANT
// ============================================

export async function fetchGeminiDiya(userMessage) {
    if (!userMessage || typeof userMessage !== 'string') {
        return getRandomFallbackResponse();
    }

    const safeMsg = sanitizeText(userMessage, MAX_USER_MSG_LENGTH);
    const lowerMsg = safeMsg.toLowerCase();

    // Check for local keyword matches first (faster, saves API quota)
    for (const [keyword, answer] of Object.entries(LOCAL_DIYA_ANSWERS)) {
        if (lowerMsg.includes(keyword)) {
            return answer;
        }
    }

    const safeName = sanitizeText(player.name || 'Citizen', 30);
    const safeState = sanitizeText(player.state || 'India', 20);
    const systemInstruction = `You are DIYA (Democratic India Your Assistant), an expert, friendly AI guide on Indian elections. The player is ${safeName} from ${safeState}. Keep answers concise (2-3 sentences max), helpful, and encouraging. Use emojis occasionally. If asked something outside Indian elections, politely redirect to election topics. No markdown.`;

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: DEFAULT_MODEL,
                contents: [{ role: 'user', parts: [{ text: safeMsg }] }],
                systemInstruction: { parts: [{ text: systemInstruction }] }
            })
        });

        if (!response.ok) throw new Error('API request failed');

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        }

        return getRandomFallbackResponse();
    } catch (error) {
        console.error('DIYA API error:', error);
        return getRandomFallbackResponse();
    }
}

function getRandomFallbackResponse() {
    const fallbacks = [
        "I'm here to help with Indian election information! Try asking about voter registration, EVMs, NOTA, or state elections. 🙏",
        "Great question! For detailed info, check the Election Commission of India's official website at eci.gov.in. 📚",
        "That's an important topic! The Election Commission of India has excellent resources on this. Keep learning about democracy! 🇮🇳",
        "I appreciate your curiosity! Every question about elections helps strengthen our democracy. What else would you like to know? 🗳️"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ============================================
// GEMINI HINT (Idle timer hints)
// ============================================

export async function getGeminiHint(currentQuest, currentStepText) {
    const safeStep = sanitizeText(currentStepText, 100);
    const prompt = `Player is playing an election education game called DEMOKRATIC. They are on Quest ${currentQuest}, current step: "${safeStep}". Keep response under 15 words. Suggest what to do playfully and encouragingly. No markdown.`;

    const result = await callGeminiAPI(prompt);
    if (result) return result.trim();

    const hintFallbacks = [
        "Check your quest panel for next steps! 📋",
        "Try talking to nearby NPCs for clues! 💬",
        "Explore buildings with door icons! 🚪",
        "Complete each quest step in order! ✅",
        "Ask DIYA for help using the chat button! 🤖"
    ];

    return hintFallbacks[Math.floor(Math.random() * hintFallbacks.length)];
}

// ============================================
// ALIAS FOR COMPATIBILITY
// ============================================

export const generateReport = fetchGeminiReport;

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
    fetchGeminiFact,
    fetchGeminiNews,
    fetchGeminiQuiz,
    fetchGeminiDialogue,
    fetchGeminiElderDialogue,
    fetchGeminiReport,
    generateReport,
    fetchGeminiDiya,
    getGeminiHint
};
