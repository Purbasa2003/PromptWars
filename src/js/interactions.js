/**
 * interactions.js - Player interaction and dialogue system
 * DEMOKRATIC Election Education Game
 * 
 * This file handles all player interactions: talking to NPCs, entering buildings,
 * triggering quests, and managing dialogue flow.
 */

import { 
    player, currentMap, mapType, currentQuest, quests, npcs,
    gameState, dialogueQueue, isTyping, typeInterval,
    mainMap, regOfficeMap, pollingMap,
    setCurrentMap, setCurrentQuest, addXP, addCollectedCard,
    unlockAchievement, ACHIEVEMENT_DEFS, CIVIC_CARDS
} from './gameState.js';

import { showOverlay, closeOverlays, showDialogue as uiShowDialogue, updateQuestUI, showToast, announceToScreenReader } from './ui.js';
import { showEVM, selectCandidate, castVote } from './evm.js';
export { showEVM, selectCandidate, castVote };

// Audio context reference
let audioCtx = null;
let isMuted = false;

export function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-mute');
    if (btn) {
        btn.innerText = isMuted ? 'volume_off' : 'volume_up';
    }
    return isMuted;
}

// Keyboard state
export const keys = { 
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, 
    Enter: false, Escape: false 
};

// ============================================
// INITIALIZATION
// ============================================

export function initInteractions(audioContext) {
    audioCtx = audioContext;
    setupKeyboardListeners();
    setupTouchControls();
}

function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
        
        // WASD support
        if (e.key.toLowerCase() === 'w') keys.ArrowUp = true;
        if (e.key.toLowerCase() === 's') keys.ArrowDown = true;
        if (e.key.toLowerCase() === 'a') keys.ArrowLeft = true;
        if (e.key.toLowerCase() === 'd') keys.ArrowRight = true;
        
        // Interact with X or Enter
        if (e.key.toLowerCase() === 'x' || e.key === 'Enter') {
            e.preventDefault();
            handleInteract();
        }
        
        // Close menus with Escape
        if (e.key === 'Escape') {
            closeOverlays();
        }
        
        // Zoom controls
        if (e.key === '=' || e.key === '+') {
            if (window.gameState === 'PLAYING') {
                window.zoomMultiplier = Math.min(window.zoomMultiplier + 0.15, window.MAX_ZOOM);
            }
        }
        if (e.key === '-' || e.key === '_') {
            if (window.gameState === 'PLAYING') {
                window.zoomMultiplier = Math.max(window.zoomMultiplier - 0.15, window.MIN_ZOOM);
            }
        }
    });
    
    window.addEventListener('keyup', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
        if (e.key.toLowerCase() === 'w') keys.ArrowUp = false;
        if (e.key.toLowerCase() === 's') keys.ArrowDown = false;
        if (e.key.toLowerCase() === 'a') keys.ArrowLeft = false;
        if (e.key.toLowerCase() === 'd') keys.ArrowRight = false;
    });
}

function setupTouchControls() {
    const bindTouch = (id, keyToBind) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            keys[keyToBind] = true; 
        });
        el.addEventListener('touchend', (e) => { 
            e.preventDefault(); 
            keys[keyToBind] = false; 
        });
    };
    
    bindTouch('btn-up', 'ArrowUp');
    bindTouch('btn-down', 'ArrowDown');
    bindTouch('btn-left', 'ArrowLeft');
    bindTouch('btn-right', 'ArrowRight');
    
    const interactBtn = document.getElementById('btn-interact');
    if (interactBtn) {
        interactBtn.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            handleInteract(); 
        });
    }
}

// ============================================
// MAIN INTERACTION HANDLER
// ============================================

export function handleInteract() {
    // Handle dialogue progression
    if (window.gameState === 'DIALOGUE') {
        handleDialogueProgress();
        return;
    }
    
    if (window.gameState !== 'PLAYING') return;
    
    // Get tile in front of player
    let fx = Math.floor(player.x + 0.5);
    let fy = Math.floor(player.y + 0.5);
    
    switch(player.dir) {
        case 'up': fy -= 1; break;
        case 'down': fy += 1; break;
        case 'left': fx -= 1; break;
        case 'right': fx += 1; break;
    }
    
    // Check if player is on a door
    let sx = Math.floor(player.x + 0.5);
    let sy = Math.floor(player.y + 0.5);
    
    if (currentMap[sy] && currentMap[sy][sx] === 5) {
        handleDoor(sx, sy);
        return;
    }
    if (currentMap[fy] && currentMap[fy][fx] === 5) {
        handleDoor(fx, fy);
        return;
    }
    
    // Check for NPC interaction
    for (let npc of npcs) {
        if (npc.map === mapType && Math.floor(npc.x) === fx && Math.floor(npc.y) === fy) {
            interactWithNPC(npc);
            return;
        }
    }
}

// ============================================
// DIALOGUE SYSTEM
// ============================================

function handleDialogueProgress() {
    if (isTyping) {
        // Skip typing animation
        clearInterval(typeInterval);
        const dialogueText = document.getElementById('dialogue-text');
        if (dialogueText && dialogueQueue[0]) {
            dialogueText.innerHTML = dialogueQueue[0].text;
        }
        window.isTyping = false;
        const indicator = document.getElementById('dialogue-indicator');
        if (indicator) indicator.style.display = 'flex';
    } else {
        // Move to next dialogue
        dialogueQueue.shift();
        if (dialogueQueue.length > 0) {
            playDialogue();
        } else {
            // Close dialogue box
            document.getElementById('dialogue-box').style.display = 'none';
            window.gameState = 'PLAYING';
            
            // Post-dialogue actions
            if (window._guardClearing) {
                window._guardClearing = false;
                completeQuestStep(2, 3);
                completeQuest(2);
                unlockAchievement('security_cleared', ACHIEVEMENT_DEFS);
                announceToScreenReader('Security check passed. You may enter the polling station.');
            }
            
            if (window._startVerification) {
                window._startVerification = false;
                setTimeout(() => showVerification(), 300);
            }
            
            if (window._exitOfficerDone) {
                window._exitOfficerDone = false;
                setTimeout(() => exitPollingStation(), 500);
            }
        }
    }
}

function playDialogue() {
    if (!dialogueQueue || dialogueQueue.length === 0) return;
    
    const data = dialogueQueue[0];
    const box = document.getElementById('dialogue-box');
    if (box) box.style.display = 'block';
    
    document.getElementById('diag-name-text').innerText = data.name;
    document.getElementById('diag-avatar').innerText = data.emoji;
    document.getElementById('dialogue-indicator').style.display = 'none';
    updateDialogueColors(data.name);
    
    const txtObj = document.getElementById('dialogue-text');
    txtObj.innerHTML = '';
    window.isTyping = true;
    let i = 0;
    
    window.typeInterval = setInterval(() => {
        txtObj.innerHTML += data.text.charAt(i);
        if (i % 2 === 0) playSound('beep');
        i++;
        if (i >= data.text.length) {
            clearInterval(window.typeInterval);
            window.isTyping = false;
            document.getElementById('dialogue-indicator').style.display = 'flex';
        }
    }, 30);
}

function updateDialogueColors(name) {
    const box = document.getElementById('dialogue-box');
    const nameTag = document.getElementById('dialogue-name');
    
    if (name === 'System') {
        box.style.borderLeftColor = '#4A7BD4';
        nameTag.style.background = '#4A7BD4';
        nameTag.style.color = '#fff';
    } else if (name.includes('Hint') || name.includes('DIYA')) {
        box.style.borderLeftColor = '#E8C070';
        nameTag.style.background = '#E8C070';
        nameTag.style.color = '#1A1200';
    } else {
        box.style.borderLeftColor = '#F4A355';
        nameTag.style.background = '#F4A355';
        nameTag.style.color = '#0E1318';
    }
}

// ============================================
// DOOR HANDLING (Building Entry/Exit)
// ============================================

function handleDoor(tx, ty) {
    playSound('beep');
    addXP(10);
    
    if (mapType === 'main') {
        // Voter Registration Office door
        if (tx === 2 && ty === 2) {
            enterRegistrationOffice();
        }
        // Polling Station door
        else if (tx === 8 && ty === 5) {
            if (quests[2] && quests[2].steps[2] && quests[2].steps[2].completed) {
                enterPollingStation();
            } else if (!player.hasVoterId) {
                showDialogue("Security Guard", "You need a Voter ID first! Register at the office.", '👮');
            } else {
                showDialogue("Security Guard", "Talk to the guard for ID verification first!", '👮');
            }
        }
        // Map Center door
        else if (tx === 12 && ty === 9) {
            showOverlay('overlay-map');
        }
    } 
    else if (mapType === 'reg') {
        // Exit registration office
        if (tx === 4 && ty === 5) {
            exitToMainMap(2, 3);
            document.getElementById('building-ui-header').style.display = 'none';
        }
    } 
    else if (mapType === 'poll') {
        // Exit polling station
        if (tx === 5 && ty === 7) {
            exitToMainMap(8, 7);
            document.getElementById('building-ui-header').style.display = 'none';
        }
    }
}

function enterRegistrationOffice() {
    setCurrentMap(regOfficeMap, 'reg');
    player.x = 4;
    player.y = 5;
    document.getElementById('building-ui-header').style.display = 'flex';
    document.getElementById('building-name').innerText = 'VOTER REGISTRATION OFFICE';
    
    if (currentQuest === 1) {
        completeQuestStep(1, 2);
        announceToScreenReader('Entered Voter Registration Office. Talk to the Clerk to begin registration.');
    }
}

function enterPollingStation() {
    setCurrentMap(pollingMap, 'poll');
    player.x = 5;
    player.y = 6;
    completeQuestStep(3, 1);
    document.getElementById('building-ui-header').style.display = 'flex';
    document.getElementById('building-name').innerText = 'POLLING STATION (BOOTH A)';
    showDialogue("System", "You've entered the Polling Station. Talk to the Queue Manager or go directly to the Verification Officer.", "⚙️");
    announceToScreenReader('Entered Polling Station. Follow the voting process: ID Check, Ink Mark, then EVM.');
}

function exitToMainMap(x, y) {
    setCurrentMap(mainMap, 'main');
    player.x = x;
    player.y = y;
}

function exitPollingStation() {
    setCurrentMap(mainMap, 'main');
    player.x = 8;
    player.y = 7;
    document.getElementById('building-ui-header').style.display = 'none';
    playSound('success');
    showDialogue("System", "You've exited the Polling Station! Your civic duty is complete. 🇮🇳", "⚙️");
    announceToScreenReader('Voting complete! Thank you for participating in democracy.');
    setTimeout(() => completeQuest(3), 2000);
}

// ============================================
// NPC INTERACTIONS
// ============================================

function interactWithNPC(npc) {
    playSound('beep');
    addXP(15);
    
    switch(npc.id) {
        case 'noticeboard':
            handleNoticeBoard(npc);
            break;
        case 'leaderboard':
            showOverlay('overlay-leaderboard');
            break;
        case 'clerk':
            handleClerk(npc);
            break;
        case 'terminal':
            handleTerminal(npc);
            break;
        case 'guard':
            handleGuard(npc);
            break;
        case 'queue_mgr':
            handleQueueManager(npc);
            break;
        case 'verif_officer':
            handleVerificationOfficer(npc);
            break;
        case 'ink_station':
            handleInkStation(npc);
            break;
        case 'evm':
            handleEVM(npc);
            break;
        case 'exit_officer':
            handleExitOfficer(npc);
            break;
        case 'mapboard':
            handleMapBoard(npc);
            break;
        default:
            if (npc.gemini) {
                handleGeminiNPC(npc);
            } else {
                showDialogue(npc.name, "Namaste! How can I help you today?", npc.emoji);
            }
    }
}

// ============================================
// SPECIFIC NPC HANDLERS
// ============================================

function handleNoticeBoard(npc) {
    unlockAchievement('notice_seeker', ACHIEVEMENT_DEFS);
    
    if (currentQuest === 1) {
        showDialogue(npc.name, "NOTICE: Register at the Voter Reg. Office (Top Left).", npc.emoji);
        completeQuestStep(1, 1);
        announceToScreenReader('Notice Board: Go to Voter Registration Office at the top left.');
    } else if (currentQuest === 2) {
        showDialogue(npc.name, "BOOTH ASSIGNMENTS: POLLING STATION A, Center", npc.emoji);
        completeQuestStep(2, 1);
        announceToScreenReader('Polling Station assigned. Go to the building with the voting icon.');
    } else {
        showDialogue(npc.name, "Election Day is underway!", npc.emoji);
    }
}

function handleClerk(npc) {
    addCollectedCard(1);
    
    if (currentQuest === 1 && quests[1].steps[1] && quests[1].steps[1].completed && !player.hasVoterId) {
        showDialogue(npc.name, "Welcome! Use the terminal behind me to register.", npc.emoji);
        completeQuestStep(1, 3);
        announceToScreenReader('Clerk directs you to the registration terminal.');
    } 
    else if (player.hasVoterId && quests[1] && !quests[1].steps[4].completed) {
        showDialogue(npc.name, "Congratulations! Check the Notice Board for your booth.", npc.emoji);
        completeQuestStep(1, 5);
        completeQuest(1);
        announceToScreenReader('Registration complete! You have received your Voter ID card.');
    } 
    else {
        showDialogue(npc.name, "Hello citizen!", npc.emoji);
    }
}

function handleTerminal(npc) {
    if (currentQuest === 1 && quests[1].steps[2] && quests[1].steps[2].completed && !player.hasVoterId) {
        completeQuestStep(1, 4);
        showRegistrationForm();
        announceToScreenReader('Registration terminal activated. Please fill out Form 6.');
    } else {
        showDialogue("Terminal", "Machine is locked. Talk to the Clerk first.", npc.emoji);
    }
}

function handleGuard(npc) {
    if (!player.hasVoterId) {
        showDialogue(npc.name, "You need to register and get a Voter ID first!", npc.emoji);
    } 
    else if (currentQuest >= 2 && player.hasVoterId) {
        if (quests[2] && !quests[2].steps[0].completed) completeQuestStep(2, 1);
        completeQuestStep(2, 2);
        showGuardScanOverlay();
        announceToScreenReader('Security Guard: Please present your Voter ID for scanning.');
    } 
    else {
        showDialogue(npc.name, "Hello citizen! Complete your registration first.", npc.emoji);
    }
}

function handleQueueManager(npc) {
    if (currentQuest === 3 && quests[3].steps[0].completed && !quests[3].steps[1].completed) {
        showDialogue(npc.name, "Please proceed to the Verification Officer's desk (top area) to show your ID.", npc.emoji);
        announceToScreenReader('Queue Manager directs you to the Verification Officer.');
    } else if (currentQuest === 3) {
        showDialogue(npc.name, "Follow the process: ID Check → Ink → EVM → Exit.", npc.emoji);
    } else {
        showDialogue(npc.name, "Welcome to the polling station!", npc.emoji);
    }
}

function handleVerificationOfficer(npc) {
    addCollectedCard(6);
    
    if (currentQuest === 3 && quests[3].steps[0].completed && !quests[3].steps[1].completed) {
        showDialogue(npc.name, "Let me verify your EPIC card against our Electoral Roll.", npc.emoji);
        window._startVerification = true;
        announceToScreenReader('Verification Officer is checking your ID. Please wait.');
    } 
    else if (quests[3].steps[1].completed && !quests[3].steps[2].completed) {
        showDialogue(npc.name, "Go to the Ink Station next (✋) to get your finger marked.", npc.emoji);
    } 
    else {
        showDialogue(npc.name, "Please proceed.", npc.emoji);
    }
}

function handleInkStation(npc) {
    addCollectedCard(3);
    
    if (currentQuest === 3 && quests[3].steps[1].completed && !quests[3].steps[2].completed) {
        showInkOverlay();
        announceToScreenReader('Ink Station: Present your left index finger for indelible ink.');
    } 
    else if (quests[3].steps[2].completed) {
        showDialogue("Ink Station", "Your finger is already marked. Proceed to the EVM (🗳️).", npc.emoji);
    } 
    else {
        showDialogue("Ink Station", "You need ID verification first.", npc.emoji);
    }
}

function handleEVM(npc) {
    addCollectedCard(4);
    
    if (currentQuest === 3 && quests[3].steps[2].completed && !player.voted) {
        showEVM();
        announceToScreenReader('EVM Machine activated. Select your candidate and cast your vote.');
    } 
    else if (!quests[3].steps[2].completed) {
        showDialogue("System", "Get your ink mark first before voting.", "⚙️");
    } 
    else {
        showDialogue("System", "You have already voted. Thank you!", "⚙️");
    }
}

function handleExitOfficer(npc) {
    if (player.voted) {
        showDialogue(npc.name, "Thank you for voting! India is proud of you! 🇮🇳 You may now exit the building.", npc.emoji);
        completeQuestStep(3, 5);
        window._exitOfficerDone = true;
        announceToScreenReader('Thank you for voting! You may now exit the polling station.');
    } else {
        showDialogue(npc.name, "Exit is this way after you vote.", npc.emoji);
    }
}

function handleMapBoard(npc) {
    playSound('beep');
    addCollectedCard(6);
    addXP(30);
    
    const stateInfo = { 
        DL: 'Delhi has 70 Assembly & 7 Lok Sabha constituencies. AAP swept 67/70 seats in 2020!', 
        MH: 'Maharashtra has 288 Assembly & 48 Lok Sabha seats — the 2nd largest state by seats.', 
        UP: 'Uttar Pradesh has 403 Assembly & 80 Lok Sabha seats — the most of any state!', 
        WB: 'West Bengal has 294 Assembly & 42 Lok Sabha seats. Famous for high voter turnout!', 
        TN: 'Tamil Nadu has 234 Assembly & 39 Lok Sabha seats with a strong biparty tradition.', 
        DEFAULT: 'Your constituency Returning Officer manages all local polling stations & count centres.' 
    };
    
    const info = stateInfo[player.state] || stateInfo['DEFAULT'];
    showDialogue('Electoral Map', '🗺️ Your State: ' + player.state + '. ' + info + ' You can check your constituency at voters.eci.gov.in', '📍');
    announceToScreenReader(`Electoral Map: ${info}`);
}

// ============================================
// GEMINI AI NPC HANDLER
// ============================================

async function handleGeminiNPC(npc) {
    playSound('beep');
    showDialogue(npc.name, "Thinking...", npc.emoji);
    document.getElementById('dialogue-text').classList.add('shimmer-text');
    document.getElementById('diag-gemini-badge').style.display = 'flex';
    
    if (npc.id === 'ai_citizen') {
        // Elder Citizen shares wisdom
        const response = await fetchGeminiElderDialogue();
        document.getElementById('dialogue-text').classList.remove('shimmer-text');
        showDialogue(npc.name, response, npc.emoji);
        addXP(30);
    } else {
        const response = await fetchGeminiDialogue(npc);
        document.getElementById('dialogue-text').classList.remove('shimmer-text');
        showDialogue(npc.name, response, npc.emoji);
    }
}

async function fetchGeminiElderDialogue() {
    // Fallback for now - will be replaced with actual API call
    return "Beta, I've voted since 1952 — 18 elections! Each vote felt like a prayer for India's future. Never miss yours. 🙏";
}

async function fetchGeminiDialogue(npc) {
    return "Vote responsibly! Every vote counts in building our nation's future. 🇮🇳";
}

// ============================================
// QUEST SYSTEM
// ============================================

export function completeQuestStep(questNum, stepNum) {
    if (quests[questNum] && quests[questNum].steps[stepNum - 1] && 
        !quests[questNum].steps[stepNum - 1].completed) {
        quests[questNum].steps[stepNum - 1].completed = true;
        updateQuestUI();
        addXP(50);
        announceToScreenReader(`Quest step completed: ${quests[questNum].steps[stepNum - 1].text}`);
        return true;
    }
    return false;
}

export function completeQuest(questNum) {
    if (questNum < 3) {
        setCurrentQuest(questNum + 1);
        updateQuestUI();
        window.showCelebration('QUEST COMPLETE!', 100);
        window.triggerQuiz();
        announceToScreenReader(`Quest ${questNum} complete! Moving to next quest.`);
    } else {
        document.getElementById('quest-panel').style.display = 'none';
        window.stopTimer();
        unlockAchievement('voter', ACHIEVEMENT_DEFS);
        if (window.timeInSeconds < 300) unlockAchievement('speed_voter', ACHIEVEMENT_DEFS);
        window.showCelebration('DEMOCRACY GUARDIAN!', 500);
        window.submitScore();
        window.showCompletionCheer();
        announceToScreenReader('Congratulations! You have completed all quests and become a Democracy Guardian!');
    }
}

// ============================================
// UI OVERLAYS (Registration, Verification, Ink)
// ============================================

function showRegistrationForm() {
    document.getElementById('reg-name').value = player.name;
    document.getElementById('reg-age').value = player.age;
    document.getElementById('reg-state').value = player.state;
    showOverlay('overlay-form');
    if (window.checkForm) window.checkForm();
}

function showGuardScanOverlay() {
    const overlay = document.getElementById('overlay-guard-scan');
    if (overlay) overlay.style.display = 'flex';
    updateGuardCardDisplay();
}

function updateGuardCardDisplay() {
    const nameEl = document.getElementById('guard-card-name');
    const epicEl = document.getElementById('guard-card-epic');
    const emojiEl = document.getElementById('guard-card-emoji');
    
    if (nameEl) nameEl.textContent = player.name;
    if (epicEl) epicEl.textContent = player.voterData ? player.voterData.epic : '---';
    if (emojiEl) emojiEl.textContent = player.emoji;
}

function showVerification() {
    // Populate verification card
    document.getElementById('verify-avatar').innerText = player.emoji;
    document.getElementById('verify-epic').innerText = player.voterData ? player.voterData.epic : '---';
    document.getElementById('verify-name').innerText = player.name;
    document.getElementById('verify-age').innerText = player.age;
    document.getElementById('verify-state').innerText = player.state;
    showOverlay('overlay-verify');
    startVerificationAnimation();
}

function startVerificationAnimation() {
    // Reset steps
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`vstep-${i}`);
        if (el) {
            el.style.borderLeftColor = '#555';
            const icon = el.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.innerText = 'pending';
                icon.style.color = '#555';
            }
        }
    }
    
    const statusEl = document.getElementById('verify-status');
    if (statusEl) {
        statusEl.innerText = 'Verifying...';
        statusEl.style.color = '#aaa';
    }
    
    const proceedBtn = document.getElementById('verify-proceed-btn');
    if (proceedBtn) proceedBtn.style.display = 'none';
    
    // Animated verification steps
    setTimeout(() => markVerifyStep(1, 'Photo match confirmed ✅'), 1500);
    setTimeout(() => markVerifyStep(2, 'Found in Electoral Roll ✅'), 3000);
    setTimeout(() => {
        markVerifyStep(3, 'Ink mark ready ✅');
        if (statusEl) {
            statusEl.innerText = '✅ IDENTITY VERIFIED';
            statusEl.style.color = '#138808';
        }
        if (proceedBtn) proceedBtn.style.display = 'block';
        completeQuestStep(3, 2);
        announceToScreenReader('Identity verified. Proceed to Ink Station.');
    }, 4500);
}

function markVerifyStep(num, statusText) {
    const el = document.getElementById(`vstep-${num}`);
    if (el) {
        el.style.borderLeftColor = '#7CB69D';
        const icon = el.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.innerText = 'check_circle';
            icon.style.color = '#7CB69D';
        }
    }
    const statusEl = document.getElementById('verify-status');
    if (statusEl) statusEl.innerText = statusText;
}

export function completeVerification() {
    closeOverlays();
    showDialogue("Verif. Officer", "Identity confirmed! Go to the Ink Station (✋) to get your finger marked, then vote on the EVM.", "👨💼");
}

function showInkOverlay() {
    // Reset ink overlay state
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById(`istep-${i}`);
        if (el) {
            el.style.borderLeftColor = '#555';
            const icon = el.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.innerText = 'pending';
                icon.style.color = '#555';
            }
        }
    }
    
    const handEl = document.getElementById('ink-hand');
    if (handEl) {
        handEl.innerText = '🤚';
        handEl.style.filter = 'grayscale(0)';
        handEl.style.transform = 'scale(1)';
    }
    
    const statusEl = document.getElementById('ink-status');
    if (statusEl) {
        statusEl.innerText = 'Present your left hand to begin';
        statusEl.style.color = '#aaa';
    }
    
    const btn = document.getElementById('ink-apply-btn');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = '👆 APPLY INK TO FINGER';
    }
    
    showOverlay('overlay-ink');
}

export function applyInk() {
    const btn = document.getElementById('ink-apply-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.innerText = 'Processing...';
    }
    
    // Step 1: Check finger
    setTimeout(() => {
        markInkStep(1);
        playSound('beep');
        const statusEl = document.getElementById('ink-status');
        if (statusEl) statusEl.innerText = 'No prior ink mark detected ✓';
        const handEl = document.getElementById('ink-hand');
        if (handEl) handEl.style.transform = 'scale(1.1)';
    }, 800);
    
    // Step 2: Apply ink
    setTimeout(() => {
        markInkStep(2);
        playSound('beep');
        const statusEl = document.getElementById('ink-status');
        if (statusEl) statusEl.innerText = 'Applying silver nitrate ink...';
        const handEl = document.getElementById('ink-hand');
        if (handEl) {
            handEl.innerText = '👆';
            handEl.style.filter = 'hue-rotate(200deg) saturate(2)';
            handEl.style.transform = 'scale(1.2)';
        }
    }, 2200);
    
    // Step 3: Dry & verify
    setTimeout(() => {
        markInkStep(3);
        playSound('success');
        const statusEl = document.getElementById('ink-status');
        if (statusEl) {
            statusEl.innerText = '✅ INK MARK APPLIED SUCCESSFULLY';
            statusEl.style.color = '#138808';
        }
        const handEl = document.getElementById('ink-hand');
        if (handEl) {
            handEl.innerText = '☝️';
            handEl.style.filter = 'hue-rotate(220deg) saturate(3) brightness(0.8)';
            handEl.style.transform = 'scale(1.3)';
        }
        completeQuestStep(3, 3);
        
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerText = '✅ PROCEED TO EVM BOOTH';
            btn.onclick = function() { 
                closeOverlays(); 
                showDialogue("System", "Ink mark applied! Head to the EVM Machine (🗳️) to cast your vote.", "⚙️");
                announceToScreenReader('Ink mark applied. Proceed to the EVM machine to cast your vote.');
            };
        }
    }, 3800);
}

function markInkStep(num) {
    const el = document.getElementById(`istep-${num}`);
    if (el) {
        el.style.borderLeftColor = '#7CB69D';
        const icon = el.querySelector('.material-symbols-outlined');
        if (icon) {
            icon.innerText = 'check_circle';
            icon.style.color = '#7CB69D';
        }
    }
}

// ============================================
// AUDIO & UTILITY FUNCTIONS
// ============================================

function playSound(type) {
    if (isMuted || !audioCtx) return;
    
    // Simple beep sound using Web Audio API
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        
        switch(type) {
            case 'beep':
                osc.type = 'sine';
                osc.frequency.value = 800;
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                osc.start(now);
                osc.stop(now + 0.1);
                break;
            case 'success':
                osc.type = 'sine';
                osc.frequency.value = 523.25;
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
                break;
            default:
                break;
        }
    } catch(e) {
        // Silently fail if audio can't play
    }
}


// ============================================
// PUBLIC WRAPPER FUNCTIONS
// ============================================

// Wrapper to expose showDialogue to other modules
export function showDialogue(name, text, emoji) {
    if (!window.dialogueQueue) window.dialogueQueue = [];
    window.dialogueQueue.push({ name, text, emoji });
    if (window.gameState !== 'DIALOGUE') {
        window.gameState = 'DIALOGUE';
        playDialogue();
    }
}

// Wrapper for completeGuardScan (called from guard overlay)
export function completeGuardScan() {
    document.getElementById('overlay-guard-scan').style.display = 'none';
    window._guardClearing = true;
    showDialogue('Security Guard', '✅ Verified! Welcome, ' + player.name + '! Your EPIC card matches our records. No phones allowed inside. Proceed to the Queue Manager. 🇮🇳', '👮');
    announceToScreenReader('Verification successful. You may enter the polling station.');
}

// Store references for global access
window.completeGuardScan = completeGuardScan;
window.completeVerification = completeVerification;
window.applyInk = applyInk;
