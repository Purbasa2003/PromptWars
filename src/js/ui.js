/**
 * ui.js - UI Management (Overlays, HUD, Toasts, Announcements)
 * DEMOKRATIC Election Education Game
 * 
 * This file handles all user interface elements: overlays, HUD updates,
 * toast notifications, screen reader announcements, and UI animations.
 */

import { 
    player, currentQuest, quests, collectedCards, achievements, 
    gameState, timeInSeconds, mapType,
    CIVIC_CARDS, ACHIEVEMENT_DEFS, LEVEL_NAMES, INDIA_STATES,
    setCurrentQuest, addXP, addCollectedCard, unlockAchievement,
    SKIN_TONES, setPlayerEmoji, setPlayerSkinTone, setPlayerVoterData,
    setPlayerVoted, setGameState
} from './gameState.js';

import { fetchGeminiNews, getGeminiHint, fetchGeminiReport } from './ai.js';
import { startTimer, stopTimer } from './main.js';

// ============================================
// DOM ELEMENT REFERENCES
// ============================================

let dialogueQueue = [];
let isTyping = false;
let typeInterval = null;

// ============================================
// INITIALIZATION
// ============================================

export function initUI() {
    setupLandingPage();
    setupFABButtons();
    setupZoomControls();
    setupTickerClick();
    setupOverlayCloseButtons();
    setupCharacterCreation();
    setupRegistrationForm();
    setupVerificationHandlers();
    setupInkHandlers();
    setupMapTabs();
    setupDiyaHandlers();
    setupReportHandlers();
    setupMuteButton();
    setupCompletionCheerHandlers();
    initParticles();
}

function setupLandingPage() {
    const beginBtn = document.querySelector('button[aria-label*="Begin your election"]');
    if (beginBtn) {
        beginBtn.addEventListener('click', () => beginLandingTransition());
    }

    const newGameBtn = document.getElementById('btn-new-game');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => showOverlay('overlay-char-create'));
    }

    const startJourneyBtn = document.getElementById('btn-start-journey');
    if (startJourneyBtn) {
        startJourneyBtn.addEventListener('click', () => closeControlsIntro());
    }
}

function setupCompletionCheerHandlers() {
    // Report button in completion cheer
    const reportBtn = document.querySelector('button[onclick*="openReportFromCheer"]');
    if (reportBtn) {
        reportBtn.removeAttribute('onclick');
        reportBtn.addEventListener('click', () => openReportFromCheer());
    }
    
    // Download button in completion cheer
    const downloadBtn = document.querySelector('button[onclick*="downloadIVoted"]');
    if (downloadBtn) {
        downloadBtn.removeAttribute('onclick');
        downloadBtn.addEventListener('click', () => downloadIVoted());
    }
    
    // Close button in completion cheer
    const closeBtn = document.querySelector('#overlay-completion-cheer button[onclick*="style.display"]');
    if (closeBtn) {
        closeBtn.removeAttribute('onclick');
        closeBtn.addEventListener('click', () => {
            document.getElementById('overlay-completion-cheer').style.display = 'none';
            setGameState('PLAYING');
        });
    }
}

function setupMuteButton() {
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
        muteBtn.removeAttribute('onclick');
        muteBtn.addEventListener('click', async () => {
            const { toggleMute } = await import('./interactions.js');
            toggleMute();
        });
    }
}

function setupFABButtons() {
    // Civics Deck button
    const cardsBtn = document.getElementById('fab-deck');
    if (cardsBtn) {
        cardsBtn.addEventListener('click', () => showOverlay('overlay-cards'));
    }
    
    // Achievements button
    const achievementsBtn = document.getElementById('fab-achievements');
    if (achievementsBtn) {
        achievementsBtn.addEventListener('click', () => showOverlay('overlay-achievements'));
    }
    
    // Timeline button
    const timelineBtn = document.getElementById('fab-timeline');
    if (timelineBtn) {
        timelineBtn.addEventListener('click', () => toggleTimeline());
    }
    
    // EPIC Card button (initially hidden, shown after registration)
    const cardBtn = document.getElementById('fab-card');
    if (cardBtn) {
        cardBtn.addEventListener('click', () => showOverlay('overlay-idcard'));
    }
}

function setupZoomControls() {
    const zoomIn = document.querySelector('#zoom-controls button:first-child');
    const zoomOut = document.querySelector('#zoom-controls button:last-child');
    
    if (zoomIn) {
        zoomIn.removeAttribute('onclick');
        zoomIn.addEventListener('click', () => {
            window.zoomMultiplier = Math.min(window.zoomMultiplier + 0.2, window.MAX_ZOOM || 2.5);
        });
    }
    
    if (zoomOut) {
        zoomOut.removeAttribute('onclick');
        zoomOut.addEventListener('click', () => {
            window.zoomMultiplier = Math.max(window.zoomMultiplier - 0.2, window.MIN_ZOOM || 0.6);
        });
    }
}

function setupTickerClick() {
    const ticker = document.getElementById('ticker-text-inner');
    if (ticker) {
        ticker.addEventListener('click', () => {
            showOverlay('overlay-map');
        });
    }
}

function setupOverlayCloseButtons() {
    // Close button in achievements overlay
    const closeAchievements = document.querySelector('#overlay-achievements button:first-child');
    if (closeAchievements) {
        closeAchievements.addEventListener('click', () => closeOverlays());
    }
    
    // Close buttons in various overlays
    document.querySelectorAll('.overlay .btn').forEach(btn => {
        if (btn.innerText.includes('CLOSE') || btn.innerText.includes('Close') || btn.innerText.includes('✕')) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeOverlays();
            });
        }
    });
}

// ============================================
// OVERLAY MANAGEMENT
// ============================================

export function showOverlay(id) {
    playUISound('beep');
    
    // Hide all overlays first
    document.querySelectorAll('.overlay').forEach(el => {
        el.style.display = 'none';
    });
    
    const overlay = document.getElementById(id);
    if (overlay) {
        overlay.style.display = 'flex';
        
        // Render dynamic content if needed
        if (id === 'overlay-cards') {
            renderCards();
        }
        if (id === 'overlay-achievements') {
            renderAchievements();
        }
        if (id === 'overlay-map') {
            renderStates();
        }
        
        // Focus management for accessibility
        const focusableElements = overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusableElements.length > 0) {
            setTimeout(() => focusableElements[0].focus(), 100);
        }
        
        // Trap focus inside overlay
        trapFocus(overlay, focusableElements);
    }
    
    window.gameState = 'MENU';
}

export function closeOverlays() {
    playUISound('beep');
    
    document.querySelectorAll('.overlay').forEach(el => {
        el.style.display = 'none';
    });
    
    window.gameState = 'PLAYING';
    
    // Return focus to canvas for keyboard navigation
    const canvas = document.getElementById('game-canvas');
    if (canvas) canvas.focus();
}

function trapFocus(overlay, focusableElements) {
    if (focusableElements.length === 0) return;
    
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };
    
    const handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
            closeOverlays();
        }
    };
    
    overlay.addEventListener('keydown', handleTabKey);
    overlay.addEventListener('keydown', handleEscapeKey);
    
    // Store for cleanup
    overlay._focusHandlers = { handleTabKey, handleEscapeKey };
}

// ============================================
// HUD UPDATES
// ============================================

export function updateHUD() {
    const levelEl = document.getElementById('hud-level');
    const xpBarEl = document.getElementById('hud-xp-bar');
    const xpTextEl = document.getElementById('hud-xp-text');
    const hudNameEl = document.getElementById('hud-name');
    const hudStateEl = document.getElementById('hud-state');
    const hudAvatarEl = document.getElementById('hud-avatar');
    
    if (levelEl) levelEl.innerText = `Civic Lvl ${player.level}`;
    if (hudNameEl) hudNameEl.innerText = player.name;
    if (hudStateEl) hudStateEl.innerText = player.state + " 🇮🇳";
    if (hudAvatarEl) hudAvatarEl.innerText = player.emoji;
    
    // XP calculation
    const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];
    const nextThreshold = LEVEL_THRESHOLDS[Math.min(player.level, LEVEL_THRESHOLDS.length - 1)];
    const currentThreshold = LEVEL_THRESHOLDS[player.level - 1];
    const range = nextThreshold - currentThreshold;
    const progress = player.xp - currentThreshold;
    let percent = range === 0 ? 100 : (progress / range) * 100;
    
    if (xpBarEl) xpBarEl.style.width = `${percent}%`;
    if (xpTextEl) xpTextEl.innerText = `${player.xp} / ${nextThreshold} XP`;
}

export function updateQuestUI() {
    const q = quests[currentQuest];
    if (!q) {
        const panel = document.getElementById('quest-panel');
        if (panel) panel.style.display = 'none';
        return;
    }
    
    const panel = document.getElementById('quest-panel');
    const hudQuestName = document.getElementById('hud-quest-name');
    const questTitle = document.getElementById('quest-title');
    const stepsContainer = document.getElementById('quest-steps');
    const progressBar = document.getElementById('quest-progress-bar');
    
    if (panel) panel.style.display = 'block';
    if (hudQuestName) hudQuestName.innerText = `Q${currentQuest}: ${q.title}`;
    if (questTitle) questTitle.innerText = `QUEST ${currentQuest}: ${q.title}`;
    
    if (stepsContainer) {
        stepsContainer.innerHTML = '';
        let foundActive = false;
        let completedCount = 0;
        
        q.steps.forEach(step => {
            const li = document.createElement('div');
            li.className = 'quest-step';
            let icon = 'radio_button_unchecked';
            
            if (step.completed) {
                li.classList.add('completed');
                icon = 'check_circle';
                completedCount++;
            } else if (!foundActive) {
                li.classList.add('active');
                foundActive = true;
                icon = 'radio_button_checked';
            }
            
            li.innerHTML = `<span class="material-symbols-outlined">${icon}</span> <span>${step.text}</span>`;
            stepsContainer.appendChild(li);
        });
        
        const progress = (completedCount / q.steps.length) * 100;
        if (progressBar) progressBar.style.width = `${progress}%`;
    }
}

export function updateTimer() {
    const timerEl = document.getElementById('timer-text');
    if (timerEl) {
        const mins = Math.floor(window.timeInSeconds / 60);
        const secs = window.timeInSeconds % 60;
        timerEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        
        // Urgent color after 3 minutes
        const timerPanel = document.getElementById('timer-panel');
        if (timerPanel && window.timeInSeconds > 180) {
            timerPanel.classList.add('timer-urgent');
        }
    }
}

// ============================================
// DIALOGUE SYSTEM
// ============================================

export function showDialogue(name, text, emoji) {
    if (!window.dialogueQueue) window.dialogueQueue = [];
    window.dialogueQueue.push({ name, text, emoji });
    
    if (window.gameState !== 'DIALOGUE') {
        window.gameState = 'DIALOGUE';
        playDialogue();
    }
}

function playDialogue() {
    if (!window.dialogueQueue || window.dialogueQueue.length === 0) return;
    
    const data = window.dialogueQueue[0];
    const box = document.getElementById('dialogue-box');
    const nameTag = document.getElementById('diag-name-text');
    const avatarEl = document.getElementById('diag-avatar');
    const textEl = document.getElementById('dialogue-text');
    const indicator = document.getElementById('dialogue-indicator');
    const geminiBadge = document.getElementById('diag-gemini-badge');
    
    if (box) box.style.display = 'block';
    if (nameTag) nameTag.innerText = data.name;
    if (avatarEl) avatarEl.innerText = data.emoji;
    if (indicator) indicator.style.display = 'none';
    if (geminiBadge && data.text.includes('AI')) {
        geminiBadge.style.display = 'flex';
    } else if (geminiBadge) {
        geminiBadge.style.display = 'none';
    }
    
    updateDialogueColors(data.name);
    
    if (textEl) {
        textEl.innerHTML = '';
        window.isTyping = true;
        let i = 0;
        
        if (window.typeInterval) clearInterval(window.typeInterval);
        
        window.typeInterval = setInterval(() => {
            textEl.innerHTML += data.text.charAt(i);
            if (i % 2 === 0) playUISound('beep');
            i++;
            if (i >= data.text.length) {
                clearInterval(window.typeInterval);
                window.isTyping = false;
                if (indicator) indicator.style.display = 'flex';
            }
        }, 30);
    }
}

function updateDialogueColors(name) {
    const box = document.getElementById('dialogue-box');
    const nameTag = document.getElementById('dialogue-name');
    
    if (!box || !nameTag) return;
    
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
// TOAST NOTIFICATIONS
// ============================================

export function showToast(message, duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast rajdhani';
    toast.innerHTML = `<span class="material-symbols-outlined" style="color:var(--saffron);">workspace_premium</span> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function showCelebration(title, xpAmount) {
    spawnConfetti(150);
    playUISound('fanfare');
    
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;text-align:center;animation:float-up 0.5s ease;pointer-events:none;';
    banner.innerHTML = `
        <div style="font-size:64px;margin-bottom:10px;">🗳️</div>
        <div style="font-family:'Cinzel Decorative',serif;font-size:28px;color:var(--accent-gold);text-shadow:0 2px 20px rgba(242,204,143,0.5);margin-bottom:5px;">${title}</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:20px;color:var(--india-green);">+${xpAmount} XP</div>
    `;
    document.body.appendChild(banner);
    
    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.5s';
    }, 2500);
    setTimeout(() => banner.remove(), 3200);
    
    announceToScreenReader(`${title}! You gained ${xpAmount} experience points.`);
}

function spawnConfetti(count = 100) {
    const colors = ['#FFBE85', '#FDF6EC', '#7EC8A4', '#F2CC8F', '#F4A261', '#A8D8B9'];
    
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-particle';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-20px';
        el.style.width = (Math.random() * 8 + 4) + 'px';
        el.style.height = (Math.random() * 8 + 4) + 'px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.position = 'fixed';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'none';
        el.style.animation = `confetti-fall ${Math.random() * 2 + 1.5}s linear forwards`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

// ============================================
// SCREEN READER ANNOUNCEMENTS
// ============================================

export function announceToScreenReader(message) {
    const announcer = document.getElementById('game-announcer');
    if (announcer) {
        announcer.textContent = message;
        setTimeout(() => {
            announcer.textContent = '';
        }, 3000);
    }
}

// ============================================
// COLLECTIBLES UI (Cards & Achievements)
// ============================================

export function renderCards() {
    const container = document.getElementById('cards-container');
    const countEl = document.getElementById('cards-count');
    
    if (!container) return;
    
    let html = '';
    if (countEl) countEl.innerText = `${collectedCards.length}/6 Cards`;
    
    CIVIC_CARDS.forEach(card => {
        const locked = !collectedCards.includes(card.id);
        html += `
            <div class="civic-card ${locked ? 'locked' : ''}">
                <div style="font-size: 40px; margin-bottom:10px;">${card.emoji}</div>
                <div style="font-weight:bold; color:var(--saffron); margin-bottom:5px;">${card.title}</div>
                <div style="font-size:12px; color:#aaa;">${locked ? '🔒 Complete quests to unlock' : card.desc}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

export function renderAchievements() {
    const container = document.getElementById('achievements-list');
    if (!container) return;
    
    let html = '';
    
    for (let id in ACHIEVEMENT_DEFS) {
        const a = ACHIEVEMENT_DEFS[id];
        const unlocked = achievements[a.id];
        
        html += `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid ${unlocked ? 'var(--accent-gold)' : 'rgba(255,255,255,0.1)'}; padding: 15px; border-radius: 8px; display:flex; align-items:center; gap: 15px; opacity: ${unlocked ? 1 : 0.5}">
                <div style="font-size: 30px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 50%;">${unlocked ? a.emoji : '🔒'}</div>
                <div>
                    <div style="font-weight:bold; color: ${unlocked ? 'var(--accent-gold)' : '#aaa'};">${a.name}</div>
                    <div style="font-size:12px; color:#888;">${a.desc}</div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ============================================
// TIMELINE SIDEBAR
// ============================================

const TIMELINE_STEPS = [
    { id: 1, title: 'Notification', desc: 'ECI announces poll dates & Model Code of Conduct begins.' },
    { id: 2, title: 'Registration', desc: 'Form 6 submitted. Electoral Roll updated.' },
    { id: 3, title: 'Nominations', desc: 'Candidates file affidavits. Scrutiny & withdrawals.' },
    { id: 4, title: 'Campaigning', desc: 'Rallies & manifestos. Ends 48 hours before polling.' },
    { id: 5, title: 'Polling Day', desc: 'EVMs & VVPATs deployed. Citizens cast their vote.' },
    { id: 6, title: 'Exit Polls', desc: 'Post-voting surveys. Banned during multi-phase polling.' }
];

export function initTimeline() {
    const container = document.getElementById('timeline-steps');
    if (!container) return;
    
    let html = '';
    TIMELINE_STEPS.forEach(step => {
        html += `
            <div class="timeline-step" id="tl-step-${step.id}">
                <div class="timeline-line"></div>
                <div class="timeline-icon rajdhani">${step.id}</div>
                <div class="timeline-content">
                    <div class="timeline-title">${step.title}</div>
                    <div class="timeline-desc">${step.desc}</div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
    updateTimeline();
}

export function updateTimeline() {
    let current = 1;
    if (player.hasVoterId) current = 3;
    if (window.currentQuest === 3) current = 5;
    if (player.voted) current = 7;
    
    TIMELINE_STEPS.forEach(step => {
        const el = document.getElementById(`tl-step-${step.id}`);
        if (el) {
            el.classList.remove('active', 'completed');
            if (step.id < current) {
                el.classList.add('completed');
            } else if (step.id === current) {
                el.classList.add('active');
            }
        }
    });
}

export function toggleTimeline() {
    const el = document.getElementById('timeline-sidebar');
    if (!el) return;
    
    if (el.style.display === 'block') {
        el.style.display = 'none';
    } else {
        el.style.display = 'block';
        playUISound('beep');
    }
}

// ============================================
// LEVEL UP OVERLAY
// ============================================

export function showLevelUp() {
    const overlay = document.getElementById('overlay-levelup');
    const titleEl = document.getElementById('levelup-title');
    
    if (overlay && titleEl) {
        titleEl.innerText = LEVEL_NAMES[player.level - 1];
        overlay.style.display = 'flex';
        playUISound('fanfare');
        announceToScreenReader(`Level up! You are now a ${LEVEL_NAMES[player.level - 1]}.`);
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function playUISound(type) {
    if (window.isMuted) return;
    
    try {
        const audioCtx = window.audioCtx;
        if (!audioCtx || audioCtx.state !== 'running') return;
        
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
            case 'fanfare':
                osc.type = 'square';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(659.25, now + 0.15);
                osc.frequency.setValueAtTime(783.99, now + 0.3);
                gain.gain.setValueAtTime(0.1, now);
                gain.gain.linearRampToValueAtTime(0, now + 0.6);
                osc.start(now);
                osc.stop(now + 0.6);
                break;
            default:
                break;
        }
    } catch(e) {
        // Silent fail
    }
}

// ============================================
// MAP TAB FUNCTIONALITY
// ============================================

export function mapTab(tab) {
    const tabs = ['map', 'states', 'learn', 'find'];
    
    tabs.forEach(t => {
        const btn = document.getElementById(`maptab-${t}`);
        const content = document.getElementById(`maptab-content-${t}`);
        
        if (btn && content) {
            const active = t === tab;
            btn.style.background = active ? 'rgba(244,163,85,0.12)' : 'transparent';
            btn.style.borderBottomColor = active ? '#F4A355' : 'transparent';
            btn.style.color = active ? '#F4A355' : '#888';
            content.style.display = active ? (t === 'map' ? 'flex' : 'block') : 'none';
        }
    });
}

// Make some functions globally available for inline onclick (temporary until index.html is cleaned)
window.mapTab = mapTab;
window.closeOverlays = closeOverlays;
window.applyInk = applyInk;
window.completeVerification = completeVerification;
window.beginLandingTransition = beginLandingTransition;
window.closeControlsIntro = closeControlsIntro;
window.submitRegistration = submitRegistration;
window.startGame = startGame;
window.toggleDiyaDrawer = toggleDiyaDrawer;
window.sendDiyaMessage = sendDiyaMessage;
window.nextQuizSideQuestion = nextQuizSideQuestion;
window.closeQuizPanel = closeQuizPanel;
window.generateReport = generateReport;
window.downloadReport = downloadReport;
window.downloadIVoted = downloadIVoted;
window.startGuardScan = startGuardScan;

// ============================================
// CHARACTER CREATION
// ============================================

function setupCharacterCreation() {
    const startBtn = document.getElementById('btn-start-adventure');
    if (startBtn) {
        startBtn.addEventListener('click', () => startGame());
    }

    // Skin tone swatches
    document.querySelectorAll('.skin-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const hex = e.target.dataset.color || e.target.style.backgroundColor;
            selectSkinTone(e.target, hex);
        });
    });

    // Avatar options
    document.querySelectorAll('.avatar-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const target = e.target.closest('.avatar-option');
            selectAvatar(target);
        });
    });
}

export function selectSkinTone(el, hex) {
    document.querySelectorAll('.skin-swatch').forEach(s => s.classList.remove('selected'));
    if (el) el.classList.add('selected');
    
    setPlayerSkinTone(hex);
    
    const tones = SKIN_TONES[hex] || SKIN_TONES['#C68642'];
    document.querySelectorAll('#avatar-grid .avatar-option').forEach(opt => {
        const style = opt.dataset.style;
        if (style === 'boy') opt.childNodes[0].textContent = tones.boy;
        else if (style === 'girl') opt.childNodes[0].textContent = tones.girl;
        else if (style === 'elder') opt.childNodes[0].textContent = tones.elder;
    });
    
    const selectedOpt = document.querySelector('#avatar-grid .avatar-option.selected');
    if (selectedOpt) {
        const style = selectedOpt.dataset.style;
        setPlayerEmoji(tones[style] || tones.boy);
    }
    
    syncAvatarDisplays();
}

export function selectAvatar(el) {
    document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    
    const style = el.dataset.style || 'boy';
    const hex = player.skinTone || '#C68642';
    const tones = SKIN_TONES[hex] || SKIN_TONES['#C68642'];
    
    setPlayerEmoji(tones[style] || tones.boy);
    syncAvatarDisplays();
}

function syncAvatarDisplays() {
    const ids = ['hud-avatar', 'id-avatar', 'diag-avatar', 'verify-avatar', 'ivoted-emoji', 'guard-card-emoji'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = player.emoji;
    });
}

function startGame() {
    const nameInput = document.getElementById('char-name').value;
    const ageInput = document.getElementById('char-age').value;
    const stateInput = document.getElementById('char-state').value;
    
    if (!nameInput || !ageInput || !stateInput) {
        alert("Please complete registration.");
        return;
    }
    
    if (ageInput < 18) {
        alert("You must be 18 to vote!");
        return;
    }
    
    player.name = nameInput;
    player.age = parseInt(ageInput);
    player.state = stateInput;
    
    document.getElementById('overlay-char-create').style.display = 'none';
    
    // Show HUD elements
    document.getElementById('hud-top-left').style.display = 'flex';
    document.getElementById('hud-top-center').style.display = 'flex';
    document.getElementById('hud-top-right').style.display = 'flex';
    document.getElementById('hud-bottom-right').style.display = 'flex';
    document.getElementById('quest-panel').style.display = 'block';
    document.getElementById('diya-chat-btn').style.display = 'flex';
    
    updateQuestUI();
    updateHUD();
    startTimer();
    initTimeline();
    fetchGeminiNews();
    unlockAchievement('first_steps');
    
    setGameState('PLAYING');
    
    setTimeout(() => {
        showDialogue("System", `Welcome ${player.name}, citizen of ${player.state}! Your civic journey begins now.`, "⚙️");
    }, 1000);
}

// ============================================
// LANDING TRANSITION
// ============================================

export function beginLandingTransition() {
    playUISound('fanfare');
    const ws = document.getElementById('wipe-saffron');
    const ww = document.getElementById('wipe-white');
    const wg = document.getElementById('wipe-green');
    
    if (ws) { ws.style.transition = 'left 0.4s ease-in'; ws.left = '0'; }
    setTimeout(() => { if (ww) { ww.style.transition = 'left 0.4s ease-in'; ww.style.left = '0'; } }, 200);
    setTimeout(() => { if (wg) { wg.style.transition = 'left 0.4s ease-in'; wg.style.left = '0'; } }, 400);
    
    setTimeout(() => {
        document.getElementById('overlay-landing').style.display = 'none';
        showControlsIntro();
        setGameState('TITLE');
        if (ws) ws.style.left = '100%';
        if (ww) ww.style.left = '100%';
        if (wg) wg.style.left = '100%';
    }, 1200);
}

function showControlsIntro() {
    const intro = document.getElementById('overlay-controls-intro');
    if (intro) intro.style.display = 'flex';
}

export function closeControlsIntro() {
    const intro = document.getElementById('overlay-controls-intro');
    if (intro) intro.style.display = 'none';
    showOverlay('overlay-char-create');
}

// ============================================
// REGISTRATION FORM
// ============================================

function setupRegistrationForm() {
    const inputs = ['reg-name', 'reg-age', 'reg-state'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => checkForm());
    });

    const submitBtn = document.getElementById('btn-reg-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', () => submitRegistration());
    }
}

export function showForm(type) {
    if (type === 'reg') {
        const name = document.getElementById('reg-name');
        const age = document.getElementById('reg-age');
        const state = document.getElementById('reg-state');
        
        if (name) name.value = player.name;
        if (age) age.value = player.age;
        if (state) state.value = player.state;
        
        showOverlay('overlay-form');
        checkForm();
    }
}

export function checkForm() {
    const name = document.getElementById('reg-name')?.value || '';
    const age = parseInt(document.getElementById('reg-age')?.value || '0');
    const state = document.getElementById('reg-state')?.value || '';
    
    const iconName = document.getElementById('icon-name');
    const iconAge = document.getElementById('icon-age');
    const iconAddress = document.getElementById('icon-address');
    
    if (iconName) iconName.style.display = name.length > 0 ? 'block' : 'none';
    if (iconAge) iconAge.style.display = age >= 18 ? 'block' : 'none';
    if (iconAddress) iconAddress.style.display = state.length > 0 ? 'block' : 'none';
}

export function submitRegistration() {
    const btn = document.getElementById('btn-reg-submit');
    if (!btn) return;
    
    btn.innerHTML = '<i class="material-icons shimmer-text">sync</i> Generating...';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-outlined">fingerprint</span> GENERATE EPIC CARD';
        btn.disabled = false;
        
        playUISound('fanfare');
        
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - player.age;
        const dob = `${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}/${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}/${birthYear}`;
        const genders = ['Male', 'Female', 'Other'];
        const gender = genders[Math.floor(Math.random() * 3)];
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const epicNo = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)] + String(Math.floor(Math.random() * 9000000) + 1000000);
        
        setPlayerVoterData({ epic: epicNo, name: player.name, age: player.age, state: player.state, dob: dob, gender: gender });
        
        // Update ID card display
        document.getElementById('id-epic').innerText = player.voterData.epic;
        document.getElementById('id-avatar').innerText = player.emoji;
        document.getElementById('id-name').innerText = player.voterData.name;
        document.getElementById('id-state').innerText = player.voterData.state;
        document.getElementById('id-dob').innerText = player.voterData.dob;
        document.getElementById('id-gender').innerText = player.voterData.gender;
        
        // Update Guard scan card too
        document.getElementById('guard-card-epic').innerText = player.voterData.epic;
        document.getElementById('guard-card-name').innerText = player.voterData.name;
        
        showOverlay('overlay-idcard');
        completeQuestStep(1, 5);
        unlockAchievement('id_holder');
        addCollectedCard(2);
        updateTimeline();
        
        const fabCard = document.getElementById('fab-card');
        if (fabCard) fabCard.style.display = 'flex';
    }, 1500);
}

function completeQuestStep(qNum, stepNum) {
    if (quests[qNum]) {
        quests[qNum].steps[stepNum-1].completed = true;
        updateQuestUI();
    }
}

// ============================================
// VERIFICATION FLOW
// ============================================

function setupVerificationHandlers() {
    const proceedBtn = document.getElementById('verify-proceed-btn');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => completeVerification());
    }
}

export function showVerification() {
    document.getElementById('verify-avatar').innerText = player.emoji;
    document.getElementById('verify-epic').innerText = player.voterData?.epic || '---';
    document.getElementById('verify-name').innerText = player.name;
    document.getElementById('verify-age').innerText = player.age;
    document.getElementById('verify-state').innerText = player.state;
    
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
    
    const status = document.getElementById('verify-status');
    if (status) { status.innerText = 'Verifying...'; status.style.color = '#aaa'; }
    
    const proceedBtn = document.getElementById('verify-proceed-btn');
    if (proceedBtn) proceedBtn.style.display = 'none';
    
    showOverlay('overlay-verify');
    
    setTimeout(() => { markVerifyStep(1, 'Photo match confirmed ✅'); playUISound('beep'); }, 1500);
    setTimeout(() => { markVerifyStep(2, 'Found in Electoral Roll ✅'); playUISound('beep'); }, 3000);
    setTimeout(() => {
        markVerifyStep(3, 'Ink mark ready ✅');
        playUISound('fanfare');
        if (status) { status.innerText = '✅ IDENTITY VERIFIED'; status.style.color = '#138808'; }
        if (proceedBtn) proceedBtn.style.display = 'block';
        completeQuestStep(3, 2);
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
    const status = document.getElementById('verify-status');
    if (status) status.innerText = statusText;
}

export function completeVerification() {
    closeOverlays();
    showDialogue("Verif. Officer", "Identity confirmed! Go to the Ink Station (✋) to get your finger marked, then vote on the EVM.", "👨‍💼");
}

// ============================================
// INK MARKING
// ============================================

function setupInkHandlers() {
    const applyBtn = document.getElementById('ink-apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => applyInk());
    }
}

export function showInkOverlay() {
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById('istep-' + i);
        if (el) {
            el.style.borderLeftColor = '#555';
            const icon = el.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.innerText = 'pending';
                icon.style.color = '#555';
            }
        }
    }
    
    const hand = document.getElementById('ink-hand');
    if (hand) {
        hand.innerText = '🤚';
        hand.style.filter = 'grayscale(0)';
        hand.style.transform = 'scale(1)';
    }
    
    const status = document.getElementById('ink-status');
    if (status) { status.innerText = 'Present your left hand to begin'; status.style.color = '#aaa'; }
    
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
    if (!btn) return;
    
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.innerText = 'Processing...';
    
    setTimeout(() => {
        markInkStep(1);
        playUISound('beep');
        const status = document.getElementById('ink-status');
        if (status) status.innerText = 'No prior ink mark detected ✓';
        const hand = document.getElementById('ink-hand');
        if (hand) hand.style.transform = 'scale(1.1)';
    }, 800);
    
    setTimeout(() => {
        markInkStep(2);
        playUISound('beep');
        const status = document.getElementById('ink-status');
        if (status) status.innerText = 'Applying silver nitrate ink...';
        const hand = document.getElementById('ink-hand');
        if (hand) {
            hand.innerText = '👆';
            hand.style.filter = 'hue-rotate(200deg) saturate(2)';
            hand.style.transform = 'scale(1.2)';
        }
    }, 2200);
    
    setTimeout(() => {
        markInkStep(3);
        playUISound('fanfare');
        const status = document.getElementById('ink-status');
        if (status) {
            status.innerText = '✅ INK MARK APPLIED SUCCESSFULLY';
            status.style.color = '#138808';
        }
        const hand = document.getElementById('ink-hand');
        if (hand) {
            hand.innerText = '☝️';
            hand.style.filter = 'hue-rotate(220deg) saturate(3) brightness(0.8)';
            hand.style.transform = 'scale(1.3)';
        }
        completeQuestStep(3, 3);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerText = '✅ PROCEED TO EVM BOOTH';
        
        btn.removeEventListener('click', applyInk);
        btn.addEventListener('click', () => {
            closeOverlays();
            showDialogue("System", "Ink mark applied! Head to the EVM Machine (🗳️) to cast your vote.", "⚙️");
        }, { once: true });
    }, 3800);
}

function markInkStep(num) {
    const el = document.getElementById('istep-' + num);
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
// GUARD SECURITY SCAN
// ============================================

export function showGuardScanOverlay() {
    const overlay = document.getElementById('overlay-guard-scan');
    if (overlay) overlay.style.display = 'flex';
    
    const msg = document.getElementById('guard-scan-msg');
    if (msg) msg.textContent = '';
    
    const progress = document.getElementById('guard-scan-progress');
    if (progress) progress.style.width = '0%';
    
    const btn = document.getElementById('guard-scan-btn');
    if (btn) {
        btn.style.display = 'block';
        btn.onclick = () => startGuardScan();
    }
    
    const magnifier = document.getElementById('guard-scan-magnifier');
    if (magnifier) magnifier.style.display = 'none';

    setGameState('MENU');
}

export function startGuardScan() {
    const btn = document.getElementById('guard-scan-btn');
    const magnifier = document.getElementById('guard-scan-magnifier');
    const status = document.getElementById('guard-scan-status');
    const progress = document.getElementById('guard-scan-progress');
    
    if (btn) btn.style.display = 'none';
    if (magnifier) magnifier.style.display = 'block';
    if (status) status.innerText = '🛡️ Guard: Scanning your Voter ID...';
    
    let p = 0;
    const interval = setInterval(() => {
        p += 2;
        if (progress) progress.style.width = p + '%';
        if (p >= 100) {
            clearInterval(interval);
            completeGuardScan();
        }
    }, 50);
}

function completeGuardScan() {
    const status = document.getElementById('guard-scan-status');
    const msg = document.getElementById('guard-scan-msg');
    const magnifier = document.getElementById('guard-scan-magnifier');
    
    if (status) {
        status.innerText = '✅ SCAN COMPLETE — IDENTITY VERIFIED';
        status.style.color = '#7AB86A';
    }
    if (msg) {
        msg.textContent = 'Guard: "Everything looks good. You may enter the polling station."';
    }
    if (magnifier) magnifier.style.display = 'none';
    
    playUISound('fanfare');
    
    setTimeout(() => {
        const overlay = document.getElementById('overlay-guard-scan');
        if (overlay) overlay.style.display = 'none';
        
        window._guardClearing = true;
        showDialogue("Security Guard", "Identity verified! You may enter the station now. Good luck!", '👮');
    }, 1500);
}

// ============================================
// MAP TABS
// ============================================

function setupMapTabs() {
    ['map', 'states', 'learn', 'find'].forEach(t => {
        const btn = document.getElementById('maptab-' + t);
        if (btn) {
            btn.addEventListener('click', () => mapTab(t));
        }
    });
}

function mapTab(tab) {
    ['map', 'states', 'learn', 'find'].forEach(t => {
        const btn = document.getElementById('maptab-' + t);
        const content = document.getElementById('maptab-content-' + t);
        if (!btn || !content) return;
        const active = t === tab;
        btn.style.background = active ? 'rgba(244,163,85,0.12)' : 'transparent';
        btn.style.borderBottomColor = active ? '#F4A355' : 'transparent';
        btn.style.color = active ? '#F4A355' : '#888';
        content.style.display = active ? (t === 'map' ? 'flex' : 'block') : 'none';
    });
    
    if (tab === 'states') {
        renderStates();
    }
}

export function renderStates() {
    const container = document.getElementById('states-grid');
    if (!container) return;
    
    let html = '';
    INDIA_STATES.forEach(state => {
        html += `
            <div class="state-card" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:14px; transition:0.2s;">
                <div style="font-weight:800; color:#fff; font-size:14px; margin-bottom:6px;">${state.name}</div>
                <div style="font-size:11px; color:#F4A355;">📊 Turnout: ${state.turnout}</div>
                <div style="font-size:11px; color:#7AB86A;">🏛️ Seats: ${state.seats}</div>
                <div style="font-size:10px; color:#555; margin-top:4px;">${state.code}</div>
            </div>
        `;
    });
    container.innerHTML = html;
}

// ============================================
// DIYA CHAT ASSISTANT
// ============================================

function setupDiyaHandlers() {
    const diyaBtn = document.getElementById('diya-chat-btn');
    if (diyaBtn) {
        diyaBtn.addEventListener('click', () => toggleDiyaDrawer());
    }

    const closeBtn = document.querySelector('.diya-header button');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => toggleDiyaDrawer());
    }

    const sendBtn = document.getElementById('diya-send');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => sendDiyaMessage());
    }

    const input = document.getElementById('diya-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendDiyaMessage();
        });
    }

    // Suggested chips
    document.querySelectorAll('.diya-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (input) {
                input.value = chip.innerText;
                sendDiyaMessage();
            }
        });
    });
}

export function toggleDiyaDrawer() {
    const d = document.getElementById('diya-drawer');
    if (d) d.classList.toggle('open');
}

export function appendDiyaMsg(role, text) {
    const container = document.getElementById('diya-messages');
    if (!container) return;
    
    const div = document.createElement('div');
    div.className = 'diya-' + role + (role === 'bot' ? ' diya-bot-last' : '');
    
    if (role === 'user') {
        div.style.cssText = 'align-self:flex-end; background:var(--saffron); color:#000; padding:10px 14px; border-radius:15px 15px 0 15px; margin-bottom:10px; max-width:85%; font-size:13px; font-weight:600; box-shadow:0 4px 15px rgba(255,153,51,0.2);';
    } else {
        div.style.cssText = 'align-self:flex-start; background:rgba(255,255,255,0.07); color:#fff; padding:10px 14px; border-radius:15px 15px 15px 0; margin-bottom:10px; max-width:85%; font-size:13px; border-left:3px solid var(--india-green); box-shadow:0 4px 15px rgba(0,0,0,0.2); line-height:1.5;';
    }
    
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

export async function sendDiyaMessage() {
    const input = document.getElementById('diya-input');
    const msg = input?.value.trim();
    if (!msg) return;
    
    input.value = '';
    appendDiyaMsg('user', msg);
    appendDiyaMsg('bot', '🙏 Thinking...');

    const response = await fetchGeminiReport(msg, 'diya'); // Using ai.js helper
    
    const lastBot = document.querySelector('#diya-messages .diya-bot-last');
    if (lastBot) lastBot.remove();
    
    appendDiyaMsg('bot', response);
}

// ============================================
// QUIZ SYSTEM
// ============================================

export function triggerQuiz() {
    const panel = document.getElementById('quiz-side-panel');
    if (panel) {
        panel.classList.add('open');
        // Load first question
        window.currentQuizQuestion = 0;
        showQuizQuestion();
    }
}

function showQuizQuestion() {
    const QUESTIONS = [
        { q: "What is the minimum age to vote in India?", a: ["18", "21", "25"], correct: 0 },
        { q: "Which body conducts general elections in India?", a: ["Supreme Court", "Election Commission", "Parliament"], correct: 1 },
        { q: "How long is a Lok Sabha term?", a: ["4 Years", "5 Years", "6 Years"], correct: 1 }
    ];
    
    const idx = window.currentQuizQuestion || 0;
    const q = QUESTIONS[idx];
    
    const qText = document.getElementById('quiz-side-q');
    const options = document.getElementById('quiz-side-options');
    
    if (qText) qText.innerText = q.q;
    if (options) {
        options.innerHTML = '';
        q.a.forEach((opt, i) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option-btn';
            btn.innerText = opt;
            btn.onclick = () => answerQuizSide(i, q.correct);
            options.appendChild(btn);
        });
    }
    
    const nextBtn = document.getElementById('quiz-side-next');
    if (nextBtn) nextBtn.style.display = 'none';
}

export function answerQuizSide(idx, correct) {
    const btns = document.querySelectorAll('.quiz-option-btn');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === correct) btn.style.background = 'rgba(122,184,106,0.3)';
        else if (i === idx) btn.style.background = 'rgba(214,74,74,0.3)';
    });
    
    if (idx === correct) {
        playUISound('fanfare');
        player.quizScore = (player.quizScore || 0) + 1;
    } else {
        playUISound('beep');
    }
    
    const nextBtn = document.getElementById('quiz-side-next');
    if (nextBtn) nextBtn.style.display = 'block';
}

export function nextQuizSideQuestion() {
    window.currentQuizQuestion++;
    if (window.currentQuizQuestion < 3) {
        showQuizQuestion();
    } else {
        closeQuizPanel();
        showToast(`Quiz Complete! Score: ${player.quizScore}/3`);
        addXP(100);
    }
}

export function closeQuizPanel() {
    const panel = document.getElementById('quiz-side-panel');
    if (panel) panel.classList.remove('open');
}

// ============================================
// REPORTS & CERTIFICATES
// ============================================

export async function generateReport() {
    showOverlay('overlay-report');
    const textEl = document.getElementById('report-text');
    if (textEl) {
        textEl.innerText = "Generating structured report via Gemini AI...";
        textEl.classList.add('shimmer-text');
    }
    
    const report = await fetchGeminiReport();
    
    if (textEl) {
        textEl.classList.remove('shimmer-text');
        textEl.innerText = report;
    }
    
    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) downloadBtn.style.display = 'block';
}

export function downloadReport() {
    const content = document.getElementById('report-content');
    if (content && window.html2canvas) {
        window.html2canvas(content).then(canvas => {
            const link = document.createElement('a');
            link.download = `Demokratic_Certificate_${player.name}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    }
}

export function downloadIVoted() {
    const content = document.getElementById('ivoted-card');
    if (content && window.html2canvas) {
        window.html2canvas(content).then(canvas => {
            const link = document.createElement('a');
            link.download = `I_Voted_${player.name}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    }
}

function setupReportHandlers() {
    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => downloadReport());
    }
    
    const reportBtn = document.getElementById('btn-view-report');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => generateReport());
    }

    const cheerReportBtn = document.getElementById('cheer-btn-report');
    if (cheerReportBtn) {
        cheerReportBtn.addEventListener('click', () => {
            document.getElementById('overlay-completion-cheer').style.display = 'none';
            generateReport();
        });
    }
}

// ============================================
// EXPORTS
// ============================================

export default {
    initUI,
    showOverlay,
    closeOverlays,
    updateHUD,
    updateQuestUI,
    updateTimer,
    showDialogue,
    showToast,
    showCelebration,
    announceToScreenReader,
    renderCards,
    renderAchievements,
    initTimeline,
    updateTimeline,
    toggleTimeline,
    showLevelUp,
    mapTab,
    beginLandingTransition,
    closeControlsIntro,
    showForm,
    checkForm,
    submitRegistration,
    showVerification,
    completeVerification,
    showInkOverlay,
    applyInk,
    showGuardScanOverlay,
    startGuardScan,
    toggleDiyaDrawer,
    sendDiyaMessage,
    appendDiyaMsg,
    triggerQuiz,
    answerQuizSide,
    nextQuizSideQuestion,
    closeQuizPanel,
    generateReport,
    downloadReport,
    downloadIVoted,
    openReportFromCheer,
    initParticles,
    toggleTimeline
};
export function initParticles() {
    const pCanvas = document.getElementById('particle-canvas');
    if (!pCanvas) return;
    const pCtx = pCanvas.getContext('2d');
    pCanvas.width = window.innerWidth;
    pCanvas.height = window.innerHeight;
    
    let particles = [];
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * pCanvas.width,
            y: Math.random() * pCanvas.height,
            r: Math.random() * 3 + 1,
            c: (Math.random() > 0.6 ? '#7EC8A4' : (Math.random() > 0.5 ? '#FFBE85' : '#FDF6EC')),
            v: Math.random() * 0.5 + 0.1
        });
    }
    
    function drawParticles() {
        if (gameState !== 'TITLE' && gameState !== 'LANDING') {
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
            requestAnimationFrame(drawParticles);
            return;
        }
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);
        particles.forEach(p => {
            pCtx.beginPath();
            pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            pCtx.fillStyle = p.c;
            pCtx.globalAlpha = 0.5;
            pCtx.fill();
            p.y -= p.v;
            if (p.y < -10) p.y = pCanvas.height + 10;
        });
        requestAnimationFrame(drawParticles);
    }
    drawParticles();
    
    window.addEventListener('resize', () => {
        pCanvas.width = window.innerWidth;
        pCanvas.height = window.innerHeight;
    });
}



export function openReportFromCheer() {
    document.getElementById('overlay-completion-cheer').style.display = 'none';
    showOverlay('overlay-report');
    // generateReport() is already called in the game completion logic or report setup
}

export function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

export { showVerification as showVerificationOverlay };
