
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, query, orderByChild, limitToFirst, get, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

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

let db = null;
let firebaseReady = false;

export function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        firebaseReady = true;
        console.log('Firebase initialized successfully');
        return { db, firebaseReady };
    } catch (e) {
        console.warn('Firebase init failed - running in offline mode:', e.message);
        return { db: null, firebaseReady: false };
    }
}

export function submitScore(playerData, timeInSeconds) {
    if (!firebaseReady || !db) return Promise.resolve(null);
    
    const data = { 
        name: playerData.name, 
        age: playerData.age, 
        state: playerData.state, 
        emoji: playerData.emoji, 
        time: timeInSeconds, 
        score: playerData.quizScore, 
        level: playerData.level, 
        timestamp: new Date().toISOString() 
    };
    
    return push(ref(db, 'leaderboard'), data);
}

export function setupLiveListeners(onLeaderboardUpdate, onFeedUpdate) {
    if (!firebaseReady || !db) return;
    
    const q = query(ref(db, 'leaderboard'), orderByChild('time'), limitToFirst(5));
    onValue(q, (snapshot) => {
        if (snapshot.exists()) {
            const scores = [];
            snapshot.forEach(child => {
                scores.push(child.val());
            });
            onLeaderboardUpdate(scores);
        }
    });
    
    const qFeed = query(ref(db, 'leaderboard'), limitToFirst(3));
    onValue(qFeed, (s) => {
        if (s.exists()) {
            let items = [];
            s.forEach(c => items.push(c.val().name));
            onFeedUpdate(items[items.length - 1]);
        }
    });
}
