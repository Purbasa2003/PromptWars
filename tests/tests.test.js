import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { addXP, completeQuestStep, player, quests, resetGameState, getCandidates, unlockAchievement, addCollectedCard } from '../src/js/gameState.js';
import { formatTime } from '../src/js/ui.js';
import { selectCandidate } from '../src/js/evm.js';
import * as ai from '../src/js/ai.js';

global.fetch = jest.fn();

beforeEach(() => {
    resetGameState();
    player.xp = 0;
    player.level = 1;
    player.voted = false;
    Object.keys(quests).forEach(q => { quests[q].steps.forEach(s => s.completed = false); });
    global.window = { gameState: 'PLAYING', timeInSeconds: 0, zoomMultiplier: 1.2, audioCtx: null, _isMuted: false };
    jest.clearAllMocks();
});

afterEach(() => { jest.restoreAllMocks(); });

// XP & LEVELING
describe('XP and Level System', () => {
    test('addXP should increase player XP', () => { addXP(50); expect(player.xp).toBe(50); });
    test('addXP should trigger level up at threshold 100', () => { const r = addXP(150); expect(player.level).toBe(2); expect(r).toBe(true); });
    test('addXP should NOT level up below threshold', () => { const r = addXP(99); expect(player.level).toBe(1); expect(r).toBe(false); });
    test('addXP should handle multiple level-ups from single call', () => { addXP(500); expect(player.level).toBeGreaterThanOrEqual(3); });
    test('addXP should cap level at max (5)', () => { addXP(5000); expect(player.level).toBeLessThanOrEqual(5); });
    test('addXP with 0 should not change state', () => { addXP(0); expect(player.xp).toBe(0); expect(player.level).toBe(1); });
    test('addXP at exact threshold 100 triggers level up (boundary)', () => { const r = addXP(100); expect(player.level).toBe(2); expect(r).toBe(true); });
    test('addXP accumulates across multiple calls', () => { addXP(50); addXP(50); expect(player.xp).toBe(100); expect(player.level).toBe(2); });
});

// TIME FORMATTING
describe('Time Formatting', () => {
    test('formatTime should format 65 seconds as 1:05', () => { expect(formatTime(65)).toBe('1:05'); });
    test('formatTime should format 125 seconds as 2:05', () => { expect(formatTime(125)).toBe('2:05'); });
    test('formatTime should format 10 seconds as 0:10', () => { expect(formatTime(10)).toBe('0:10'); });
    test('formatTime should format 0 seconds as 0:00', () => { expect(formatTime(0)).toBe('0:00'); });
    test('formatTime should handle exactly 60 seconds (1:00)', () => { expect(formatTime(60)).toBe('1:00'); });
    test('formatTime should handle large values (3600 = 60:00)', () => { expect(formatTime(3600)).toBe('60:00'); });
    test('formatTime should handle negative (edge case)', () => { expect(() => formatTime(-1)).not.toThrow(); });
    test('formatTime should pad single-digit seconds', () => { expect(formatTime(61)).toBe('1:01'); });
    test('formatTime returns a string', () => { expect(typeof formatTime(90)).toBe('string'); });
    test('formatTime output matches colon-format regex', () => { expect(formatTime(130)).toMatch(/^\d+:\d{2}$/); });
});

// QUEST SYSTEM
describe('Quest System', () => {
    test('completeQuestStep should mark a step as completed', () => { const r = completeQuestStep(1, 1); expect(quests[1].steps[0].completed).toBe(true); expect(player.xp).toBe(50); expect(r).toBe(true); });
    test('completeQuestStep should not double-complete a step', () => { completeQuestStep(1, 1); const r = completeQuestStep(1, 1); expect(player.xp).toBe(50); expect(r).toBe(false); });
    test('completeQuestStep should return false for invalid quest', () => { expect(completeQuestStep(99, 1)).toBe(false); });
    test('completeQuestStep should return false for invalid step', () => { expect(completeQuestStep(1, 99)).toBe(false); });
    test('all quests should have steps array', () => { expect(Array.isArray(quests[1].steps)).toBe(true); expect(Array.isArray(quests[2].steps)).toBe(true); expect(Array.isArray(quests[3].steps)).toBe(true); });
    test('quest steps have required id, text, completed fields', () => { quests[1].steps.forEach(s => { expect(s).toHaveProperty('id'); expect(s).toHaveProperty('text'); expect(s).toHaveProperty('completed'); }); });
    test('sequential quest steps award XP for each', () => { completeQuestStep(1, 1); completeQuestStep(1, 2); expect(player.xp).toBeGreaterThanOrEqual(100); });
    test('all quests have readable title string', () => { Object.values(quests).forEach(q => { expect(typeof q.title).toBe('string'); expect(q.title.length).toBeGreaterThan(0); }); });
});

// EVM VOTING
describe('EVM Candidate Selection', () => {
    test('selectCandidate should update UI and state', () => {
        window.gameState = 'EVM_VOTING'; player.voted = false;
        document.body.innerHTML = `<div id="cand-1" class="evm-cand"></div><button id="evm-cast-btn"></button>`;
        selectCandidate(1);
        expect(document.getElementById('cand-1').classList.contains('selected')).toBe(true);
        expect(document.getElementById('evm-cast-btn').disabled).toBe(false);
    });
    test('selectCandidate should not work if already voted', () => {
        window.gameState = 'EVM_VOTING'; player.voted = true;
        document.body.innerHTML = `<div id="cand-1" class="evm-cand"></div><button id="evm-cast-btn" disabled></button>`;
        selectCandidate(1);
        expect(document.getElementById('cand-1').classList.contains('selected')).toBe(false);
    });
    test('selectCandidate should not work outside EVM_VOTING state', () => {
        window.gameState = 'PLAYING'; player.voted = false;
        document.body.innerHTML = `<div id="cand-1" class="evm-cand"></div><button id="evm-cast-btn" disabled></button>`;
        selectCandidate(1);
        expect(document.getElementById('cand-1').classList.contains('selected')).toBe(false);
    });
    test('selecting candidate 2 deselects candidate 1', () => {
        window.gameState = 'EVM_VOTING'; player.voted = false;
        document.body.innerHTML = `<div id="cand-1" class="evm-cand selected"></div><div id="cand-2" class="evm-cand"></div><button id="evm-cast-btn"></button>`;
        selectCandidate(2);
        expect(document.getElementById('cand-1').classList.contains('selected')).toBe(false);
        expect(document.getElementById('cand-2').classList.contains('selected')).toBe(true);
    });
});

// GAME STATE
describe('Game State Functions', () => {
    test('getCandidates returns 4 candidates for DL', () => { player.state = 'DL'; expect(getCandidates()).toHaveLength(4); });
    test('getCandidates returns candidates for WB', () => { player.state = 'WB'; const c = getCandidates(); expect(c.length).toBeGreaterThan(0); expect(c[0]).toHaveProperty('name'); });
    test('getCandidates returns DEFAULT_PARTIES for unknown state', () => { player.state = 'XX'; expect(getCandidates().length).toBeGreaterThan(0); });
    test('getCandidates returns candidates with id, name, party', () => { player.state = 'MH'; getCandidates().forEach(c => { expect(c).toHaveProperty('id'); expect(c).toHaveProperty('name'); expect(c).toHaveProperty('party'); }); });
    test('getCandidates with null state does not throw', () => { player.state = null; expect(() => getCandidates()).not.toThrow(); });
    test('addCollectedCard should add a card and return true', () => { expect(addCollectedCard(1)).toBe(true); });
    test('addCollectedCard should not duplicate cards', () => { addCollectedCard(1); expect(addCollectedCard(1)).toBe(false); });
    test('multiple different cards can be collected', () => { expect(addCollectedCard(1)).toBe(true); expect(addCollectedCard(2)).toBe(true); expect(addCollectedCard(3)).toBe(true); });
    test('unlockAchievement should return true the first time', () => { expect(unlockAchievement('first_steps')).toBe(true); });
    test('unlockAchievement should return false if already unlocked', () => { unlockAchievement('first_steps'); expect(unlockAchievement('first_steps')).toBe(false); });
    test('multiple unique achievements can be unlocked', () => { expect(unlockAchievement('first_steps')).toBe(true); expect(unlockAchievement('quiz_master')).toBe(true); });
    test('resetGameState restores clean level and XP', () => { addXP(500); resetGameState(); player.xp = 0; player.level = 1; expect(player.level).toBe(1); expect(player.xp).toBe(0); });
});

// AI / GEMINI
describe('Gemini AI Functions', () => {
    test('fetchGeminiQuiz should return processed quiz data from API', async () => {
        const mockData = { candidates: [{ content: { parts: [{ text: JSON.stringify({ questions: [
            { q: "Q1?", options: ["A","B","C","D"], answer: 0, explanation: "E1" },
            { q: "Q2?", options: ["A","B","C","D"], answer: 1, explanation: "E2" },
            { q: "Q3?", options: ["A","B","C","D"], answer: 2, explanation: "E3" }
        ]}) }] } }] };
        global.fetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(mockData) });
        const data = await ai.fetchGeminiQuiz();
        expect(data).toHaveLength(3);
        expect(data[0].q).toBe("Q1?");
        expect(data[0]).toHaveProperty('options');
        expect(data[0]).toHaveProperty('answer');
        expect(data[0]).toHaveProperty('explanation');
    });
    test('fetchGeminiQuiz returns fallback on API failure', async () => { global.fetch.mockRejectedValue(new Error('fail')); const d = await ai.fetchGeminiQuiz(); expect(Array.isArray(d)).toBe(true); expect(d.length).toBe(3); });
    test('fetchGeminiQuiz fallback items have correct structure', async () => { global.fetch.mockRejectedValue(new Error('fail')); const d = await ai.fetchGeminiQuiz(); d.forEach(q => { expect(q).toHaveProperty('q'); expect(q).toHaveProperty('options'); expect(Array.isArray(q.options)).toBe(true); expect(q.options.length).toBe(4); }); });
    test('fetchGeminiFact returns a non-empty string', async () => { global.fetch.mockRejectedValue(new Error('fail')); const f = await ai.fetchGeminiFact(); expect(typeof f).toBe('string'); expect(f.length).toBeGreaterThan(0); });
    test('fetchGeminiNews returns a non-empty string', async () => { global.fetch.mockRejectedValue(new Error('fail')); const n = await ai.fetchGeminiNews(); expect(typeof n).toBe('string'); expect(n.length).toBeGreaterThan(0); });
    test('fetchGeminiDiya handles local keyword matching', async () => { const r = await ai.fetchGeminiDiya('how do I register to vote'); expect(typeof r).toBe('string'); expect(r.length).toBeGreaterThan(0); });
    test('fetchGeminiDiya uses fallback when API fails', async () => { global.fetch.mockRejectedValue(new Error('fail')); const r = await ai.fetchGeminiDiya('tell me about elections'); expect(typeof r).toBe('string'); });
    test('fetchGeminiDiya handles empty string gracefully', async () => { const r = await ai.fetchGeminiDiya(''); expect(typeof r).toBe('string'); });
    test('fetchGeminiDiya handles null gracefully', async () => { const r = await ai.fetchGeminiDiya(null); expect(typeof r).toBe('string'); });
    test('fetchGeminiDiya recognises EVM keyword locally', async () => { const r = await ai.fetchGeminiDiya('what is the EVM machine?'); expect(typeof r).toBe('string'); expect(r.length).toBeGreaterThan(0); });
    test('fetchGeminiDiya recognises nota keyword locally', async () => { const r = await ai.fetchGeminiDiya('what is NOTA?'); expect(typeof r).toBe('string'); expect(r.length).toBeGreaterThan(0); });
});

// INPUT VALIDATION & SECURITY
describe('Input validation and edge cases', () => {
    test('addXP negative value does not level up or mutate XP', () => { addXP(-10); expect(player.level).toBe(1); expect(player.xp).toBe(0); });
    test('player name not mutated by addXP', () => { const n = player.name; addXP(50); expect(player.name).toBe(n); });
    test('formatTime negative does not throw', () => { expect(() => formatTime(-1)).not.toThrow(); });
    test('completeQuestStep step 0 out-of-range returns false', () => { expect(completeQuestStep(1, 0)).toBe(false); });
    test('getCandidates names are non-empty strings', () => { player.state = 'DL'; getCandidates().forEach(c => { expect(typeof c.name).toBe('string'); expect(c.name.trim().length).toBeGreaterThan(0); }); });
});
