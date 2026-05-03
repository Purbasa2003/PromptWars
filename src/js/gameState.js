/**
 * gameState.js - Core game state and data
 * DEMOKRATIC Election Education Game
 * 
 * This file contains all game constants, maps, NPCs, quests, and player state.
 * Other modules import from here.
 */

// ============================================
// GAME CONSTANTS
// ============================================

export const TILE_SIZE = 16;
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 480;
export const MAP_COLS = 16;
export const MAP_ROWS = 12;

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 2.5;

export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];
export const LEVEL_NAMES = ["Citizen", "Registered Voter", "Active Voter", "Civic Champion", "Democracy Guardian"];

// ============================================
// GAME MAPS (Tile-based RPG world)
// ============================================

// Main overworld map
export const mainMap = [
    [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    [4, 3, 3, 3, 1, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4],
    [4, 3, 5, 3, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4],
    [4, 0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 4],
    [4, 0, 1, 0, 0, 0, 0, 3, 3, 3, 3, 1, 0, 0, 0, 4],
    [4, 0, 1, 1, 1, 1, 0, 3, 5, 3, 3, 1, 0, 0, 0, 4],
    [4, 0, 0, 0, 6, 1, 0, 0, 1, 0, 0, 1, 1, 1, 0, 4],
    [4, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 4],
    [4, 4, 4, 0, 0, 0, 0, 1, 0, 0, 0, 3, 3, 3, 4, 4],
    [4, 4, 4, 0, 0, 0, 0, 1, 0, 0, 0, 3, 5, 3, 4, 4],
    [4, 0, 6, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 4],
    [4, 4, 4, 4, 4, 4, 4, 1, 4, 4, 4, 4, 4, 4, 4, 4]
];

// Voter Registration Office interior map
export const regOfficeMap = [
    [2, 2, 2, 2, 2, 2, 2, 2],
    [2, 5, 5, 5, 0, 0, 6, 2],
    [2, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 2],
    [2, 2, 2, 2, 5, 2, 2, 2]
];

// Polling Station interior map
export const pollingMap = [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 6, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [2, 2, 2, 2, 2, 5, 2, 2, 2, 2]
];

// ============================================
// NPC DEFINITIONS (Non-Player Characters)
// ============================================

export const npcs = [
    { id: 'noticeboard', x: 4, y: 6, map: 'main', type: 'obj', emoji: '📋', name: 'Notice Board' },
    { id: 'leaderboard', x: 2, y: 10, map: 'main', type: 'obj', emoji: '🏆', name: 'Leaderboard' },
    { id: 'guard', x: 8, y: 6, map: 'main', type: 'npc', emoji: '👮', name: 'Security Guard' },
    { id: 'clerk', x: 3, y: 2, map: 'reg', type: 'npc', emoji: '👩💼', name: 'Clerk' },
    { id: 'terminal', x: 6, y: 1, map: 'reg', type: 'obj', emoji: '💻', name: 'Terminal' },
    { id: 'verif_officer', x: 5, y: 3, map: 'poll', type: 'npc', emoji: '👨💼', name: 'Verif. Officer' },
    { id: 'ink_station', x: 6, y: 3, map: 'poll', type: 'npc', emoji: '✋', name: 'Ink Station' },
    { id: 'evm', x: 2, y: 2, map: 'poll', type: 'obj', emoji: '🗳️', name: 'EVM Machine' },
    { id: 'exit_officer', x: 8, y: 2, map: 'poll', type: 'npc', emoji: '👮♀️', name: 'Exit Officer' },
    { id: 'queue_mgr', x: 4, y: 5, map: 'poll', type: 'npc', emoji: '🧑💼', name: 'Queue Manager' },
    { id: 'ai_citizen', x: 13, y: 3, map: 'main', type: 'npc', emoji: '🧓', name: 'Old Citizen', gemini: true },
    { id: 'mapboard', x: 10, y: 10, map: 'main', type: 'obj', emoji: '📍', name: 'Electoral Map' }
];

// ============================================
// QUEST STRUCTURE (3 main quests)
// ============================================

export const quests = {
    1: { 
        title: "Become a Voter", 
        steps: [
            { id: "q1s1", text: "Talk to Notice Board", completed: false },
            { id: "q1s2", text: "Enter Reg. Office", completed: false },
            { id: "q1s3", text: "Talk to Clerk", completed: false },
            { id: "q1s4", text: "Use Terminal", completed: false },
            { id: "q1s5", text: "Get Voter ID", completed: false }
        ] 
    },
    2: { 
        title: "Find Your Booth", 
        steps: [
            { id: "q2s1", text: "Check Board again", completed: false },
            { id: "q2s2", text: "Go to Polling Station", completed: false },
            { id: "q2s3", text: "Pass Security Check", completed: false }
        ] 
    },
    3: { 
        title: "Cast Your Vote", 
        steps: [
            { id: "q3s1", text: "Enter Polling Station", completed: false },
            { id: "q3s2", text: "Show ID to Officer", completed: false },
            { id: "q3s3", text: "Get Ink Mark", completed: false },
            { id: "q3s4", text: "Vote on EVM", completed: false },
            { id: "q3s5", text: "Talk to Exit Officer", completed: false }
        ] 
    }
};

// ============================================
// ELECTION DATA (State-specific candidates)
// ============================================

export const STATE_PARTIES = {
    'DL': [
        { id: 1, name: 'Ramesh Gupta', party: 'Bharatiya Janata Party (BJP)', symbol: '🪷', color: '#FF6F00' },
        { id: 2, name: 'Sunita Sharma', party: 'Indian National Congress (INC)', symbol: '✋', color: '#1565C0' },
        { id: 3, name: 'Arvind Tiwari', party: 'Aam Aadmi Party (AAP)', symbol: '🧹', color: '#00838F' },
        { id: 4, name: 'Neha Yadav', party: 'Bahujan Samaj Party (BSP)', symbol: '🐘', color: '#1A237E' }
    ],
    'MH': [
        { id: 1, name: 'Sachin Patil', party: 'Bharatiya Janata Party (BJP)', symbol: '🪷', color: '#FF6F00' },
        { id: 2, name: 'Priya Deshmukh', party: 'Indian National Congress (INC)', symbol: '✋', color: '#1565C0' },
        { id: 3, name: 'Anil Shinde', party: 'Shiv Sena', symbol: '🏹', color: '#FF8F00' },
        { id: 4, name: 'Meera Pawar', party: 'Nationalist Congress Party (NCP)', symbol: '⏰', color: '#2E7D32' }
    ],
    'UP': [
        { id: 1, name: 'Rajesh Mishra', party: 'Bharatiya Janata Party (BJP)', symbol: '🪷', color: '#FF6F00' },
        { id: 2, name: 'Priyanka Verma', party: 'Indian National Congress (INC)', symbol: '✋', color: '#1565C0' },
        { id: 3, name: 'Akhilesh Singh', party: 'Samajwadi Party (SP)', symbol: '🚲', color: '#E53935' },
        { id: 4, name: 'Kumari Devi', party: 'Bahujan Samaj Party (BSP)', symbol: '🐘', color: '#1A237E' }
    ],
    'WB': [
        { id: 1, name: 'Suman Banerjee', party: 'All India Trinamool Congress (TMC)', symbol: '💐', color: '#00BFA5' },
        { id: 2, name: 'Amit Das', party: 'Bharatiya Janata Party (BJP)', symbol: '🪷', color: '#FF6F00' },
        { id: 3, name: 'Rina Ghosh', party: 'Indian National Congress (INC)', symbol: '✋', color: '#1565C0' },
        { id: 4, name: 'Tapan Roy', party: 'CPI(M)', symbol: '⚒️', color: '#C62828' }
    ]
};

export const INDIA_STATES = [
    { name: 'Delhi', code: 'DL', turnout: '60.5%', seats: 7 },
    { name: 'Maharashtra', code: 'MH', turnout: '61.1%', seats: 48 },
    { name: 'Uttar Pradesh', code: 'UP', turnout: '57.6%', seats: 80 },
    { name: 'West Bengal', code: 'WB', turnout: '79.2%', seats: 42 },
    { name: 'Tamil Nadu', code: 'TN', turnout: '68.1%', seats: 39 },
    { name: 'Karnataka', code: 'KA', turnout: '69.4%', seats: 28 },
    { name: 'Gujarat', code: 'GJ', turnout: '59.1%', seats: 26 },
    { name: 'Rajasthan', code: 'RJ', turnout: '60.5%', seats: 25 },
    { name: 'Kerala', code: 'KL', turnout: '73.6%', seats: 20 },
    { name: 'Punjab', code: 'PB', turnout: '67.9%', seats: 13 },
    { name: 'Madhya Pradesh', code: 'MP', turnout: '64.7%', seats: 29 },
    { name: 'Bihar', code: 'BR', turnout: '55.7%', seats: 40 }
];

export const DEFAULT_PARTIES = [
    { id: 1, name: 'Aarav Kumar', party: 'Bharatiya Janata Party (BJP)', symbol: '🪷', color: '#FF6F00' },
    { id: 2, name: 'Priya Singh', party: 'Indian National Congress (INC)', symbol: '✋', color: '#1565C0' },
    { id: 3, name: 'Rahul Sharma', party: 'Aam Aadmi Party (AAP)', symbol: '🧹', color: '#00838F' },
    { id: 4, name: 'Sunita Devi', party: 'CPI(M)', symbol: '⚒️', color: '#C62828' }
];

// ============================================
// CIVICS CARDS (Collectibles)
// ============================================

export const CIVIC_CARDS = [
    { id: 1, title: 'The Right to Vote', emoji: '📜', desc: 'Article 326 of Constitution. Universal adult suffrage from age 18.' },
    { id: 2, title: 'EPIC Card', emoji: '🪪', desc: 'Electors Photo Identity Card. Introduced in 1993 by T.N. Seshan.' },
    { id: 3, title: 'Model Code', emoji: '⚖️', desc: 'Comes into effect immediately when election schedule is announced.' },
    { id: 4, title: 'EVM Machine', emoji: '🗳️', desc: 'Electronic Voting Machine. Tamper-proof, used since 1999 Goa elections.' },
    { id: 5, title: 'VVPAT', emoji: '🧾', desc: 'Voter Verified Paper Audit Trail. Shows a 7-second slip.' },
    { id: 6, title: 'Booth Rules', emoji: '🚫', desc: 'No phones or campaign material within 100 meters of the booth.' }
];

// ============================================
// ACHIEVEMENTS
// ============================================

export const ACHIEVEMENT_DEFS = {
    'first_steps': { id: 'first_steps', name: 'First Steps', desc: 'Entered the game world', emoji: '🌱' },
    'notice_seeker': { id: 'notice_seeker', name: 'Notice Seeker', desc: 'Read the notice board', emoji: '📋' },
    'id_holder': { id: 'id_holder', name: 'ID Holder', desc: 'Got your Voter ID', emoji: '🪪' },
    'security_cleared': { id: 'security_cleared', name: 'Security Cleared', desc: 'Passed guard check', emoji: '🔐' },
    'voter': { id: 'voter', name: 'Democracy in Action', desc: 'Cast your vote', emoji: '🗳️' },
    'card_collector': { id: 'card_collector', name: 'Card Collector', desc: 'Got all 6 civic cards', emoji: '🃏' },
    'quiz_master': { id: 'quiz_master', name: 'Quiz Master', desc: 'Scored perfect on quizzes', emoji: '🧠' },
    'speed_voter': { id: 'speed_voter', name: 'Speed Voter', desc: 'Finished under 5 mins', emoji: '⚡' },
    'guardian': { id: 'guardian', name: 'Democracy Guardian', desc: 'Reached Level 5', emoji: '🏆' }
};

// ============================================
// SKIN TONE MAPPINGS
// ============================================

export const SKIN_TONES = {
    '#FDDBB4': { boy: '👦🏻', girl: '👧🏻', elder: '🧓🏻', modifier: '\u{1F3FB}' },
    '#F1C27D': { boy: '👦🏼', girl: '👧🏼', elder: '🧓🏼', modifier: '\u{1F3FC}' },
    '#E0A86C': { boy: '👦🏽', girl: '👧🏽', elder: '🧓🏽', modifier: '\u{1F3FD}' },
    '#C68642': { boy: '👦🏾', girl: '👧🏾', elder: '🧓🏾', modifier: '\u{1F3FE}' },
    '#8D5524': { boy: '👦🏿', girl: '👧🏿', elder: '🧓🏿', modifier: '\u{1F3FF}' },
    '#4A2912': { boy: '👦🏿', girl: '👧🏿', elder: '🧓🏿', modifier: '\u{1F3FF}' },
};

// ============================================
// GLOBAL STATE VARIABLES
// ============================================

// Player object - all player data
export let player = {
    x: 7, y: 10, dir: 'down', frame: 0, moving: false, speed: 4, animTimer: 0,
    name: 'Citizen', age: 18, state: 'DL', emoji: '👦',
    hasVoterId: false, voterData: null, voted: false,
    xp: 0, level: 1, quizScore: 0,
    skinTone: '#C68642', avatarStyle: 'boy'
};

// Game state variables
export let currentMap = mainMap;
export let mapType = 'main';
export let currentQuest = 1;
export let gameState = 'LANDING';
export let timeInSeconds = 0;
export let zoomMultiplier = 1.2;
export let cameraScale = 1.0;
export let selectedCandidate = 0;
export let candidates = DEFAULT_PARTIES;
export let collectedCards = [];

// Load achievements from localStorage
export let achievements = JSON.parse(localStorage.getItem('demokrasi_achievements')) || {};

// Dialogue system
export let dialogueQueue = [];
export let isTyping = false;
export let typeInterval = null;

// ============================================
// STATE MODIFICATION FUNCTIONS
// ============================================

export function updatePlayer(newState) {
    Object.assign(player, newState);
}

export function setCurrentMap(newMap, newType) {
    currentMap = newMap;
    mapType = newType;
}

export function setCurrentQuest(questNum) {
    currentQuest = questNum;
}

export function addXP(amount) {
    player.xp += amount;
    let nextThreshold = LEVEL_THRESHOLDS[Math.min(player.level, LEVEL_THRESHOLDS.length - 1)];
    if (player.xp >= nextThreshold && player.level < LEVEL_THRESHOLDS.length) {
        player.level++;
        return true; // Level up occurred
    }
    return false;
}

export function completeQuestStep(questNum, stepNum) {
    if (quests[questNum] && quests[questNum].steps[stepNum-1]) {
        if (!quests[questNum].steps[stepNum-1].completed) {
            quests[questNum].steps[stepNum-1].completed = true;
            addXP(50);
            return true;
        }
    }
    return false;
}

export function getCandidates() {
    return STATE_PARTIES[player.state] || DEFAULT_PARTIES;
}

export function setSelectedCandidate(id) {
    selectedCandidate = id;
}

export function addCollectedCard(id) {
    if (!collectedCards.includes(id)) {
        collectedCards.push(id);
        return true;
    }
    return false;
}

export function unlockAchievement(id) {
    if (!achievements[id]) {
        achievements[id] = true;
        localStorage.setItem('demokrasi_achievements', JSON.stringify(achievements));
        return true;
    }
    return false;
}

// Helper function to get emoji with correct skin tone
export function getSkinTonedEmoji(baseEmoji, skinTone) {
    const tones = SKIN_TONES[skinTone] || SKIN_TONES['#C68642'];
    if (baseEmoji === '👦') return tones.boy;
    if (baseEmoji === '👧') return tones.girl;
    if (baseEmoji === '🧓') return tones.elder;
    return baseEmoji;
}

export function setPlayerEmoji(emoji) {
    player.emoji = emoji;
}

export function setPlayerSkinTone(hex) {
    player.skinTone = hex;
}

export function setPlayerVoterData(data) {
    player.voterData = data;
    player.hasVoterId = true;
}

export function setPlayerVoted(val) {
    player.voted = val;
}

export function setGameState(val) {
    gameState = val;
}

// Export all maps as named exports
export const map = mainMap;
export const mapReg = regOfficeMap;
export const mapPoll = pollingMap;

// ============================================
// MISSING EXPORTS (added to fix import errors)
// ============================================

// collectCard = alias for addCollectedCard
export function collectCard(id) {
    return addCollectedCard(id);
}

// updateTimeline stub (timeline is managed by ui.js but evm.js imports this)
export function updateTimeline() {
    // Timeline update is handled by ui.js — this stub prevents import errors
    if (typeof window !== 'undefined' && window._updateTimeline) {
        window._updateTimeline();
    }
}

// resetGameState — reset all mutable state to defaults
export function resetGameState() {
    Object.assign(player, {
        x: 7, y: 5, dir: 'down', moving: false,
        name: 'Citizen', age: 18, state: 'DL',
        emoji: '🧑', skinTone: '#C68642',
        xp: 0, level: 1, voted: false,
        hasVoterId: false, voterData: null, quizScore: 0
    });
    currentQuest = 1;
    Object.keys(quests).forEach(q => {
        quests[q].steps.forEach(s => { s.completed = false; });
    });
    collectedCards.length = 0;
    Object.keys(achievements).forEach(k => delete achievements[k]);
}

// setAudioContext — store audio context reference on window
export function setAudioContext(ctx) {
    window.audioCtx = ctx;
}

// toggleMute stub for gameState (actual implementation in interactions.js)
export function toggleMute() {
    window._isMuted = !window._isMuted;
}
