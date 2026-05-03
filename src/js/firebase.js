/**
 * firebase.js - Firebase Realtime Database integration
 * DEMOKRATIC Election Education Game
 * 
 * This file handles all Firebase operations: leaderboard submission,
 * live player counts, and activity feeds.
 */

// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    push, 
    set, 
    get, 
    query, 
    orderByChild, 
    limitToFirst, 
    limitToLast,
    onValue,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// ============================================
// FIREBASE CONFIGURATION
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyAPHsCCB8lJUK9FPytifGeY1xz1OgXpQVY",
    authDomain: "promptwarsvirtual-494014.firebaseapp.com",
    databaseURL: "https://promptwarsvirtual-494014-default-rtdb.firebaseio.com",
    projectId: "promptwarsvirtual-494014",
    storageBucket: "promptwarsvirtual-494014.firebasestorage.app",
    messagingSenderId: "96676882486",
    appId: "1:96676882486:web:926d7ec49f4827abd6d097",
    measurementId: "G-31T17CYNHC"
};

// ============================================
// GLOBAL STATE
// ============================================

let db = null;
let firebaseReady = false;
let leaderboardListeners = [];
let activityListeners = [];

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize Firebase connection
 * @returns {boolean} - Whether initialization was successful
 */
export function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        firebaseReady = true;
        console.log('✅ Firebase initialized successfully');
        return true;
    } catch (e) {
        console.warn('⚠️ Firebase init failed - running in offline mode:', e.message);
        firebaseReady = false;
        return false;
    }
}

/**
 * Check if Firebase is ready
 * @returns {boolean}
 */
export function isFirebaseReady() {
    return firebaseReady && db !== null;
}

// ============================================
// LEADERBOARD OPERATIONS
// ============================================

/**
 * Submit player score to leaderboard
 * @param {Object} playerData - Player information
 * @param {number} playerData.timeInSeconds - Completion time
 * @param {number} playerData.quizScore - Quiz score (0-3)
 * @param {number} playerData.level - Player level (1-5)
 * @param {string} playerData.name - Player name
 * @param {number} playerData.age - Player age
 * @param {string} playerData.state - Player state
 * @param {string} playerData.emoji - Player avatar emoji
 * @returns {Promise<boolean>} - Success status
 */
export async function submitScore(playerData) {
    if (!firebaseReady || !db) {
        console.warn('Firebase not available - score not submitted');
        return false;
    }
    
    try {
        const leaderboardRef = ref(db, 'leaderboard');
        
        const scoreData = {
            name: playerData.name || 'Citizen',
            age: playerData.age || 18,
            state: playerData.state || 'IN',
            emoji: playerData.emoji || '🧑',
            time: playerData.timeInSeconds || 0,
            score: playerData.quizScore || 0,
            level: playerData.level || 1,
            timestamp: new Date().toISOString(),
            serverTime: serverTimestamp()
        };
        
        await push(leaderboardRef, scoreData);
        console.log('✅ Score submitted successfully');
        
        // Also add to activity feed
        await addActivity(`${scoreData.name} completed the voting journey!`);
        
        return true;
    } catch (error) {
        console.error('❌ Score submission failed:', error.message);
        return false;
    }
}

/**
 * Get top leaderboard entries
 * @param {number} limit - Number of entries to fetch (default: 10)
 * @returns {Promise<Array>} - Array of leaderboard entries
 */
export async function getLeaderboard(limit = 10) {
    if (!firebaseReady || !db) {
        console.warn('Firebase not available - returning empty leaderboard');
        return [];
    }
    
    try {
        const leaderboardRef = ref(db, 'leaderboard');
        const leaderboardQuery = query(
            leaderboardRef, 
            orderByChild('time'), 
            limitToFirst(limit)
        );
        
        const snapshot = await get(leaderboardQuery);
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const entries = [];
        snapshot.forEach((child) => {
            entries.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Sort by time (ascending - faster times are better)
        entries.sort((a, b) => a.time - b.time);
        
        return entries;
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error.message);
        return [];
    }
}

/**
 * Subscribe to real-time leaderboard updates
 * @param {Function} callback - Function called with updated leaderboard data
 * @param {number} limit - Number of entries to fetch (default: 5)
 * @returns {Function} - Unsubscribe function
 */
export function subscribeLeaderboard(callback, limit = 5) {
    if (!firebaseReady || !db) {
        console.warn('Firebase not available - leaderboard updates disabled');
        callback([]);
        return () => {};
    }
    
    const leaderboardRef = ref(db, 'leaderboard');
    const leaderboardQuery = query(
        leaderboardRef, 
        orderByChild('time'), 
        limitToFirst(limit)
    );
    
    const unsubscribe = onValue(leaderboardQuery, (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        
        const entries = [];
        snapshot.forEach((child) => {
            entries.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Sort by time (ascending)
        entries.sort((a, b) => a.time - b.time);
        
        callback(entries);
    }, (error) => {
        console.error('Leaderboard subscription error:', error);
        callback([]);
    });
    
    leaderboardListeners.push(unsubscribe);
    
    // Return unsubscribe function
    return () => {
        const index = leaderboardListeners.indexOf(unsubscribe);
        if (index > -1) leaderboardListeners.splice(index, 1);
        unsubscribe();
    };
}

// ============================================
// ACTIVITY FEED
// ============================================

/**
 * Add an activity to the feed
 * @param {string} activity - Activity description
 * @returns {Promise<boolean>}
 */
export async function addActivity(activity) {
    if (!firebaseReady || !db) {
        console.log('Activity (offline):', activity);
        return false;
    }
    
    try {
        const activitiesRef = ref(db, 'activities');
        await push(activitiesRef, {
            text: activity,
            timestamp: new Date().toISOString(),
            serverTime: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Failed to add activity:', error.message);
        return false;
    }
}

/**
 * Get recent activities
 * @param {number} limit - Number of activities to fetch (default: 5)
 * @returns {Promise<Array>}
 */
export async function getRecentActivities(limit = 5) {
    if (!firebaseReady || !db) {
        return [
            { text: "Welcome to DEMOKRATIC! 🇮🇳", timestamp: new Date().toISOString() },
            { text: "Be the first to complete the voting journey!", timestamp: new Date().toISOString() }
        ];
    }
    
    try {
        const activitiesRef = ref(db, 'activities');
        const activitiesQuery = query(
            activitiesRef, 
            orderByChild('serverTime'), 
            limitToLast(limit)
        );
        
        const snapshot = await get(activitiesQuery);
        
        if (!snapshot.exists()) {
            return [];
        }
        
        const activities = [];
        snapshot.forEach((child) => {
            activities.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Reverse to show newest first
        return activities.reverse();
    } catch (error) {
        console.error('Failed to fetch activities:', error.message);
        return [];
    }
}

/**
 * Subscribe to real-time activity feed
 * @param {Function} callback - Function called with new activities
 * @param {number} limit - Number of activities to keep (default: 5)
 * @returns {Function} - Unsubscribe function
 */
export function subscribeActivities(callback, limit = 5) {
    if (!firebaseReady || !db) {
        callback([]);
        return () => {};
    }
    
    const activitiesRef = ref(db, 'activities');
    const activitiesQuery = query(
        activitiesRef, 
        orderByChild('serverTime'), 
        limitToLast(limit)
    );
    
    const unsubscribe = onValue(activitiesQuery, (snapshot) => {
        if (!snapshot.exists()) {
            callback([]);
            return;
        }
        
        const activities = [];
        snapshot.forEach((child) => {
            activities.push({
                id: child.key,
                ...child.val()
            });
        });
        
        // Reverse to show newest first
        callback(activities.reverse());
    }, (error) => {
        console.error('Activity subscription error:', error);
        callback([]);
    });
    
    activityListeners.push(unsubscribe);
    
    return () => {
        const index = activityListeners.indexOf(unsubscribe);
        if (index > -1) activityListeners.splice(index, 1);
        unsubscribe();
    };
}

// ============================================
// PLAYER COUNT (Live players)
// ============================================

/**
 * Update active player count
 * @param {string} playerId - Unique player identifier
 * @returns {Promise<void>}
 */
export async function updateActivePlayer(playerId) {
    if (!firebaseReady || !db) return;
    
    try {
        const activeRef = ref(db, `active/${playerId}`);
        await set(activeRef, {
            lastSeen: serverTimestamp(),
            name: localStorage.getItem('playerName') || 'Anonymous'
        });
        
        // Remove after 5 minutes of inactivity
        setTimeout(() => {
            const checkRef = ref(db, `active/${playerId}`);
            get(checkRef).then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const lastSeen = data.lastSeen;
                    const now = Date.now();
                    // If last seen was more than 5 minutes ago, remove
                    if (now - lastSeen > 300000) {
                        set(checkRef, null);
                    }
                }
            });
        }, 300000);
    } catch (error) {
        console.error('Failed to update active player:', error.message);
    }
}

/**
 * Get active player count
 * @returns {Promise<number>}
 */
export async function getActivePlayerCount() {
    if (!firebaseReady || !db) {
        return Math.floor(Math.random() * 500) + 1000; // Random fallback
    }
    
    try {
        const activeRef = ref(db, 'active');
        const snapshot = await get(activeRef);
        
        if (!snapshot.exists()) {
            return 0;
        }
        
        let count = 0;
        snapshot.forEach(() => count++);
        return count;
    } catch (error) {
        console.error('Failed to get active player count:', error.message);
        return Math.floor(Math.random() * 500) + 1000;
    }
}

/**
 * Subscribe to active player count updates
 * @param {Function} callback - Function called with updated count
 * @returns {Function} - Unsubscribe function
 */
export function subscribeActivePlayerCount(callback) {
    if (!firebaseReady || !db) {
        // Simulate count changes for demo
        const interval = setInterval(() => {
            callback(Math.floor(Math.random() * 500) + 1000);
        }, 30000);
        return () => clearInterval(interval);
    }
    
    const activeRef = ref(db, 'active');
    
    const unsubscribe = onValue(activeRef, (snapshot) => {
        if (!snapshot.exists()) {
            callback(0);
            return;
        }
        
        let count = 0;
        snapshot.forEach(() => count++);
        callback(count);
    }, (error) => {
        console.error('Active count subscription error:', error);
        callback(Math.floor(Math.random() * 500) + 1000);
    });
    
    return unsubscribe;
}

// ============================================
// CLEANUP
// ============================================

/**
 * Clean up all Firebase listeners
 */
export function cleanupFirebase() {
    leaderboardListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
    });
    leaderboardListeners = [];
    
    activityListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') unsubscribe();
    });
    activityListeners = [];
    
    console.log('Firebase listeners cleaned up');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format time for display
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted MM:SS string
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Format leaderboard entry for display
 * @param {Object} entry - Leaderboard entry
 * @param {number} rank - Player rank
 * @returns {Object} - Formatted entry with medal and display time
 */
export function formatLeaderboardEntry(entry, rank) {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
    return {
        ...entry,
        medal: medals[rank] || rank,
        displayTime: formatTime(entry.time),
        rank: rank
    };
}

// ============================================
// EXPORTS
// ============================================

export default {
    initFirebase,
    isFirebaseReady,
    submitScore,
    getLeaderboard,
    subscribeLeaderboard,
    addActivity,
    getRecentActivities,
    subscribeActivities,
    updateActivePlayer,
    getActivePlayerCount,
    subscribeActivePlayerCount,
    cleanupFirebase,
    formatTime,
    formatLeaderboardEntry
};
