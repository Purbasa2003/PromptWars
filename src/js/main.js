/**
 * main.js - Main entry point for DEMOKRATIC game
 * This file initializes all modules and sets up event listeners
 */

import {
    player, gameState, currentMap, mapType, currentQuest, quests, npcs,
    timeInSeconds, zoomMultiplier, selectedCandidate, candidates,
    collectedCards, achievements, dialogueQueue, isTyping, typeInterval,
    TILE_SIZE, MIN_ZOOM, MAX_ZOOM, LEVEL_THRESHOLDS, LEVEL_NAMES,
    mainMap, regOfficeMap, pollingMap, STATE_PARTIES, DEFAULT_PARTIES,
    CIVIC_CARDS, ACHIEVEMENT_DEFS, SKIN_TONES,
    setCurrentMap, setCurrentQuest, addXP, getCandidates, setSelectedCandidate,
    addCollectedCard, unlockAchievement, updatePlayer, getSkinTonedEmoji,
    resetGameState, setAudioContext, toggleMute as toggleMuteState
} from './gameState.js';

import { initRenderer, startRenderLoop, forceRedraw } from './renderer.js';
import { initInteractions, handleInteract, keys, toggleMute, completeGuardScan, completeVerification, applyInk, showEVM, selectCandidate, castVote } from './interactions.js';
import {
    initUI, showOverlay, closeOverlays, updateHUD, updateQuestUI, updateTimer,
    showDialogue, showToast, showCelebration, announceToScreenReader,
    renderCards, renderAchievements, initTimeline, updateTimeline, toggleTimeline,
    showLevelUp, selectSkinTone, selectAvatar, beginLandingTransition,
    showControlsIntro, closeControlsIntro, showInkOverlay, showVerificationOverlay,
    mapTab
} from './ui.js';
import { initFirebase, submitScore, subscribeLeaderboard, subscribeActivities, updateActivePlayer, getActivePlayerCount, formatTime } from './firebase.js';
import {
    fetchGeminiFact, fetchGeminiNews, fetchGeminiQuiz, fetchGeminiDialogue,
    fetchGeminiElderDialogue, generateReport, fetchGeminiDiya, getGeminiHint
} from './ai.js';

// ============================================
// GLOBAL VARIABLES
// ============================================

let lastTime = 0;
let timerInterval = null;
let animationId = null;
let lastActiveUpdate = 0;
let currentQuizData = null;
let quizStep = 0;
let quizAnswered = false;

// ============================================
// GAME INITIALIZATION
// ============================================

async function initGame() {
    console.log('🎮 DEMOKRATIC - Initializing game...');

    // Initialize Firebase (optional, continues in offline mode if fails)
    initFirebase();

    // Initialize UI components and setup event listeners
    initUI();
    setupEventListeners();

    // Get canvas and initialize renderer
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        initRenderer(canvas);
        startRenderLoop();
    }

    // Initialize Web Audio context on first user interaction
    const initAudio = () => {
        if (!window.audioCtx) {
            window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            initInteractions(window.audioCtx);
            document.removeEventListener('click', initAudio);
            document.removeEventListener('keydown', initAudio);
        }
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);

    // Initialize keyboard controls
    setupKeyboardControls();

    // Initialize timeline
    initTimeline();

    // Setup leaderboard subscription
    subscribeLeaderboard((entries) => {
        const leaderboardList = document.getElementById('leaderboard-list');
        if (leaderboardList) {
            if (entries && entries.length > 0) {
                let html = '<table class="lb-table"><tr><th>Rank</th><th>Name</th><th>Time</th></tr>';
                entries.forEach((entry, index) => {
                    const medal = index === 0 ? '🥇' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : index + 1));
                    const displayTime = formatTime(entry.time);
                    html += `<tr class="rank-${index + 1}">
                        <td>${medal}</td>
                        <td>${entry.emoji || '🧑'} ${entry.name}</td>
                        <td>${displayTime}</td>
                    </tr>`;
                });
                html += '</table>';
                leaderboardList.innerHTML = html;
            } else {
                leaderboardList.innerHTML = '<div style="text-align:center; padding:20px;">Be the first to complete the voting journey! 🗳️</div>';
            }
        }
    });

    // Setup activity feed
    subscribeActivities((activities) => {
        const feedElement = document.getElementById('feed-items');
        if (feedElement && activities && activities.length > 0) {
            const latest = activities[0];
            feedElement.innerHTML = latest.text || 'Someone just voted!';
        }
    });

    // Update active player count
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    updateActivePlayer(playerId);

    const playerCount = await getActivePlayerCount();
    const playerCountElement = document.getElementById('title-players-count');
    if (playerCountElement) {
        playerCountElement.innerText = `🗳️ Live Players: ${playerCount}+ online`;
    }

    // Start periodic updates
    startTimer();
    startPeriodicHints();
    startPeriodicActiveUpdate();

    // Initialize landing page animations
    initLandingPageAnimation();

    console.log('✅ DEMOKRATIC - Game initialized successfully');
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Landing page button
    const beginBtn = document.querySelector('#landing-buttons button');
    if (beginBtn) {
        beginBtn.addEventListener('click', () => beginLandingTransition());
    }

    // Start journey button in controls intro
    const startJourneyBtn = document.getElementById('btn-start-journey');
    if (startJourneyBtn) {
        startJourneyBtn.addEventListener('click', () => closeControlsIntro());
    }

    // New game button
    const newGameBtn = document.getElementById('btn-new-game');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => showOverlay('overlay-char-create'));
    }

    // Start adventure button
    const startAdventureBtn = document.getElementById('btn-start-adventure');
    if (startAdventureBtn) {
        startAdventureBtn.addEventListener('click', () => startGame());
    }

    // Character creation - skin tones
    document.querySelectorAll('.skin-swatch').forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            const color = swatch.getAttribute('data-color');
            if (color) selectSkinTone(swatch, color);
        });
    });

    // Character creation - avatars
    document.querySelectorAll('#avatar-grid .avatar-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const emojiSpan = opt.querySelector('span');
            if (emojiSpan) selectAvatar(opt, emojiSpan.textContent);
        });
    });

    // DIYA chat button
    const diyaChatBtn = document.getElementById('diya-chat-btn');
    if (diyaChatBtn) {
        diyaChatBtn.addEventListener('click', () => toggleDiyaDrawer());
    }

    // DIYA drawer close button
    const diyaCloseBtn = document.querySelector('#diya-drawer button');
    if (diyaCloseBtn) {
        diyaCloseBtn.addEventListener('click', () => toggleDiyaDrawer());
    }

    // DIYA send button
    const diyaSendBtn = document.querySelector('#diya-drawer button:last-of-type');
    if (diyaSendBtn) {
        diyaSendBtn.addEventListener('click', () => sendDiyaChatMessage());
    }

    // DIYA input enter key
    const diyaInput = document.getElementById('diya-input');
    if (diyaInput) {
        diyaInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendDiyaChatMessage();
        });
    }

    // DIYA chip buttons
    document.querySelectorAll('.diya-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const text = chip.textContent.trim();
            document.getElementById('diya-input').value = text;
            sendDiyaChatMessage();
        });
    });

    // FAB buttons (bottom right)
    const fabCard = document.getElementById('fab-card');
    if (fabCard) fabCard.addEventListener('click', () => showOverlay('overlay-idcard'));

    const fabDeck = document.getElementById('fab-deck');
    if (fabDeck) fabDeck.addEventListener('click', () => showOverlay('overlay-cards'));

    const fabAchievements = document.getElementById('fab-achievements');
    if (fabAchievements) fabAchievements.addEventListener('click', () => showOverlay('overlay-achievements'));

    const fabTimeline = document.getElementById('fab-timeline');
    if (fabTimeline) fabTimeline.addEventListener('click', () => toggleTimeline());

    // Mute button
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) muteBtn.addEventListener('click', () => toggleMute());

    // Zoom controls
    const zoomIn = document.querySelector('#zoom-controls button:first-child');
    const zoomOut = document.querySelector('#zoom-controls button:last-child');
    if (zoomIn) zoomIn.addEventListener('click', () => {
        window.zoomMultiplier = Math.min((window.zoomMultiplier || 1.2) + 0.2, MAX_ZOOM);
        forceRedraw();
    });
    if (zoomOut) zoomOut.addEventListener('click', () => {
        window.zoomMultiplier = Math.max((window.zoomMultiplier || 1.2) - 0.2, MIN_ZOOM);
        forceRedraw();
    });

    // Registration form submit
    const regSubmitBtn = document.getElementById('btn-reg-submit');
    if (regSubmitBtn) regSubmitBtn.addEventListener('click', () => submitRegistration());

    // Registration form inputs
    const regName = document.getElementById('reg-name');
    const regAge = document.getElementById('reg-age');
    const regState = document.getElementById('reg-state');
    if (regName) regName.addEventListener('input', () => checkForm());
    if (regAge) regAge.addEventListener('input', () => checkForm());
    if (regState) regState.addEventListener('input', () => checkForm());

    // Close buttons for overlays
    document.querySelectorAll('.overlay .btn').forEach(btn => {
        const btnText = btn.textContent;
        if (btnText.includes('CLOSE') || btnText.includes('Close') || btnText.includes('CANCEL') || btnText === '✕') {
            btn.addEventListener('click', () => closeOverlays());
        }
    });

    // Map tabs
    const mapTabBtn = document.getElementById('maptab-map');
    const statesTabBtn = document.getElementById('maptab-states');
    const learnTabBtn = document.getElementById('maptab-learn');
    const findTabBtn = document.getElementById('maptab-find');
    if (mapTabBtn) mapTabBtn.addEventListener('click', () => mapTab('map'));
    if (statesTabBtn) statesTabBtn.addEventListener('click', () => mapTab('states'));
    if (learnTabBtn) learnTabBtn.addEventListener('click', () => mapTab('learn'));
    if (findTabBtn) findTabBtn.addEventListener('click', () => mapTab('find'));

    // Guard scan button
    const guardScanBtn = document.getElementById('guard-scan-btn');
    if (guardScanBtn) guardScanBtn.addEventListener('click', () => startGuardScan());

    // Ink apply button
    const inkApplyBtn = document.getElementById('ink-apply-btn');
    if (inkApplyBtn) inkApplyBtn.addEventListener('click', () => applyInk());

    // Verification proceed button
    const verifyProceedBtn = document.getElementById('verify-proceed-btn');
    if (verifyProceedBtn) verifyProceedBtn.addEventListener('click', () => completeVerification());

    // EVM cast button
    const evmCastBtn = document.getElementById('evm-cast-btn');
    if (evmCastBtn) evmCastBtn.addEventListener('click', () => castVote());

    // Quiz buttons
    const quizNextBtn = document.getElementById('quiz-side-next-btn');
    const quizCloseBtn = document.getElementById('quiz-side-close-btn');
    if (quizNextBtn) quizNextBtn.addEventListener('click', () => nextQuizSideQuestion());
    if (quizCloseBtn) quizCloseBtn.addEventListener('click', () => closeQuizPanel());

    // View report button
    const viewReportBtn = document.getElementById('btn-view-report');
    if (viewReportBtn) viewReportBtn.addEventListener('click', () => generateAndShowReport());

    // Download report button
    const downloadReportBtn = document.getElementById('btn-download');
    if (downloadReportBtn) downloadReportBtn.addEventListener('click', () => downloadReportAsImage());

    // Download IVoted button
    const downloadIVotedBtn = document.querySelector('#overlay-ivoted .btn-primary');
    if (downloadIVotedBtn) downloadIVotedBtn.addEventListener('click', () => downloadIVotedCard());

    // Completion cheer buttons
    const cheerViewReportBtn = document.querySelector('#overlay-completion-cheer .btn-primary');
    const cheerBackBtn = document.querySelector('#overlay-completion-cheer .btn:last-child');
    if (cheerViewReportBtn) cheerViewReportBtn.addEventListener('click', () => openReportFromCheer());
    if (cheerBackBtn) cheerBackBtn.addEventListener('click', () => {
        document.getElementById('overlay-completion-cheer').style.display = 'none';
        window.gameState = 'PLAYING';
    });

    // Level up close button
    const levelUpBtn = document.querySelector('#overlay-levelup .btn');
    if (levelUpBtn) levelUpBtn.addEventListener('click', () => closeOverlays());
}

// ============================================
// KEYBOARD CONTROLS
// ============================================

function setupKeyboardControls() {
    window.addEventListener('keydown', (e) => {
        if (keys.hasOwnProperty(e.key)) keys[e.key] = true;

        // WASD support
        if (e.key.toLowerCase() === 'w') keys.ArrowUp = true;
        if (e.key.toLowerCase() === 's') keys.ArrowDown = true;
        if (e.key.toLowerCase() === 'a') keys.ArrowLeft = true;
        if (e.key.toLowerCase() === 'd') keys.ArrowRight = true;

        // Interact with E or Enter
        if (e.key.toLowerCase() === 'e' || e.key === 'Enter') {
            e.preventDefault();
            handleInteract();
        }

        // Close menus with Escape
        if (e.key === 'Escape') {
            closeOverlays();
        }

        // Mute with M
        if (e.key.toLowerCase() === 'm') {
            toggleMute();
        }

        // Zoom controls
        if (e.key === '=' || e.key === '+') {
            if (window.gameState === 'PLAYING') {
                window.zoomMultiplier = Math.min((window.zoomMultiplier || 1.2) + 0.15, MAX_ZOOM);
                forceRedraw();
            }
        }
        if (e.key === '-' || e.key === '_') {
            if (window.gameState === 'PLAYING') {
                window.zoomMultiplier = Math.max((window.zoomMultiplier || 1.2) - 0.15, MIN_ZOOM);
                forceRedraw();
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

// ============================================
// TIMER FUNCTIONS
// ============================================

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        window.timeInSeconds = (window.timeInSeconds || 0) + 1;
        updateTimer();

        const timerText = document.getElementById('timer-text');
        if (timerText) {
            const mins = Math.floor(window.timeInSeconds / 60);
            const secs = window.timeInSeconds % 60;
            timerText.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// PERIODIC UPDATES
// ============================================

function startPeriodicHints() {
    setInterval(async () => {
        if (window.gameState === 'PLAYING' && currentQuest && quests[currentQuest]) {
            const currentStep = quests[currentQuest]?.steps?.find(s => !s.completed);
            if (currentStep) {
                const hint = await getGeminiHint(currentQuest, currentStep.text);
                if (hint) {
                    showToast(`💡 Hint: ${hint}`, 4000);
                }
            }
        }
    }, 60000); // Every minute
}

function startPeriodicActiveUpdate() {
    setInterval(() => {
        const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        updateActivePlayer(playerId);
    }, 30000);
}

// ============================================
// LANDING PAGE
// ============================================

function initLandingPageAnimation() {
    setTimeout(() => {
        const chakra = document.getElementById('landing-chakra');
        if (chakra) chakra.style.opacity = '1';
    }, 500);

    setTimeout(() => {
        const title = document.getElementById('landing-title');
        if (title) {
            title.style.opacity = '1';
            title.style.transform = 'scale(1)';
        }
    }, 2800);

    setTimeout(() => {
        const subtitle = document.getElementById('landing-subtitle');
        if (subtitle) subtitle.style.opacity = '1';
    }, 3500);

    setTimeout(() => {
        const tricolor = document.getElementById('landing-triline');
        if (tricolor) {
            tricolor.style.opacity = '1';
            tricolor.style.width = '180px';
        }
    }, 4000);

    setTimeout(() => {
        const buttons = document.getElementById('landing-buttons');
        if (buttons) buttons.style.opacity = '1';
    }, 5500);
}

// ============================================
// GAME START
// ============================================

function startGame() {
    const nameInput = document.getElementById('char-name').value;
    const ageInput = document.getElementById('char-age').value;
    const stateInput = document.getElementById('char-state').value;

    if (!nameInput || !ageInput || !stateInput) {
        alert("Please complete registration.");
        return;
    }
    if (parseInt(ageInput) < 18) {
        alert("You must be 18 to vote!");
        return;
    }

    player.name = nameInput;
    player.age = parseInt(ageInput);
    player.state = stateInput;

    document.getElementById('overlay-char-create').style.display = 'none';
    document.getElementById('hud-name').innerText = player.name;
    document.getElementById('hud-state').innerText = player.state + " 🇮🇳";
    document.getElementById('hud-top-left').style.display = 'flex';
    document.getElementById('hud-top-center').style.display = 'flex';
    document.getElementById('hud-top-right').style.display = 'flex';
    document.getElementById('hud-bottom-right').style.display = 'flex';
    document.getElementById('quest-panel').style.display = 'block';
    document.getElementById('diya-chat-btn').style.display = 'flex';

    updateQuestUI();
    updateHUD();
    unlockAchievement('first_steps', ACHIEVEMENT_DEFS);
    window.gameState = 'PLAYING';

    announceToScreenReader(`Welcome ${player.name} from ${player.state}. Your civic journey begins now.`);
    showDialogue("System", `Welcome ${player.name}, citizen of ${player.state}! Your civic journey begins now.`, "⚙️");
}

// ============================================
// REGISTRATION FUNCTIONS
// ============================================

function checkForm() {
    const name = document.getElementById('reg-name').value;
    const age = parseInt(document.getElementById('reg-age').value);
    const state = document.getElementById('reg-state').value;

    const iconName = document.getElementById('icon-name');
    const iconAge = document.getElementById('icon-age');
    const iconAddress = document.getElementById('icon-address');

    if (iconName) iconName.style.display = name.length > 0 ? 'block' : 'none';
    if (iconAge) iconAge.style.display = age >= 18 ? 'block' : 'none';
    if (iconAddress) iconAddress.style.display = state.length > 0 ? 'block' : 'none';
}

function submitRegistration() {
    const btn = document.getElementById('btn-reg-submit');
    btn.innerHTML = '<span class="material-symbols-outlined shimmer-text">sync</span> Generating...';
    btn.disabled = true;

    setTimeout(() => {
        btn.innerHTML = '<span class="material-symbols-outlined">fingerprint</span> GENERATE EPIC CARD';
        btn.disabled = false;

        player.hasVoterId = true;

        // Generate DOB from age
        const currentYear = new Date().getFullYear();
        const birthYear = currentYear - player.age;
        const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const dob = `${birthDay}/${birthMonth}/${birthYear}`;
        const genders = ['Male', 'Female', 'Other'];
        const gender = genders[Math.floor(Math.random() * 3)];

        // Generate EPIC number
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const epicLetters = letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)] + letters[Math.floor(Math.random() * 26)];
        const epicNums = String(Math.floor(Math.random() * 9000000) + 1000000);
        const epicNo = epicLetters + epicNums;

        player.voterData = { epic: epicNo, name: player.name, age: player.age, state: player.state, dob: dob, gender: gender };

        const idEpic = document.getElementById('id-epic');
        const idAvatar = document.getElementById('id-avatar');
        const idName = document.getElementById('id-name');
        const idState = document.getElementById('id-state');
        const idDob = document.getElementById('id-dob');
        const idGender = document.getElementById('id-gender');

        if (idEpic) idEpic.innerText = player.voterData.epic;
        if (idAvatar) idAvatar.innerText = player.emoji;
        if (idName) idName.innerText = player.voterData.name;
        if (idState) idState.innerText = player.voterData.state;
        if (idDob) idDob.innerText = player.voterData.dob;
        if (idGender) idGender.innerText = player.voterData.gender;

        showOverlay('overlay-idcard');
        completeQuestStep(1, 5);
        completeQuest(1);
        unlockAchievement('id_holder', ACHIEVEMENT_DEFS);
        addCollectedCard(2);
        updateTimeline();

        const fabCard = document.getElementById('fab-card');
        if (fabCard) fabCard.style.display = 'flex';

        playSound('success');
    }, 1500);
}

function completeQuestStep(questNum, stepNum) {
    if (quests[questNum] && quests[questNum].steps[stepNum - 1] &&
        !quests[questNum].steps[stepNum - 1].completed) {
        quests[questNum].steps[stepNum - 1].completed = true;
        updateQuestUI();
        addXP(50);
    }
}

function completeQuest(questNum) {
    if (questNum < 3) {
        window.currentQuest = questNum + 1;
        updateQuestUI();
        showCelebration('QUEST COMPLETE!', 100);
        triggerQuiz();
        announceToScreenReader(`Quest ${questNum} complete! Moving to next quest.`);
    } else {
        document.getElementById('quest-panel').style.display = 'none';
        stopTimer();
        unlockAchievement('voter', ACHIEVEMENT_DEFS);
        if (window.timeInSeconds < 300) unlockAchievement('speed_voter', ACHIEVEMENT_DEFS);
        showCelebration('DEMOCRACY GUARDIAN!', 500);
        submitScoreToLeaderboard();
        showCompletionCheer();
        announceToScreenReader('Congratulations! You have completed all quests and become a Democracy Guardian!');
    }
}

// ============================================
// QUIZ SYSTEM
// ============================================

async function triggerQuiz() {
    const panel = document.getElementById('quiz-side-panel');
    if (!panel) return;

    const qp = document.getElementById('quest-panel');
    if (qp) {
        const qpRect = qp.getBoundingClientRect();
        const wrapper = document.getElementById('canvas-wrapper');
        const wRect = wrapper.getBoundingClientRect();
        const topOffset = (qpRect.bottom - wRect.top) + 10;
        panel.style.top = topOffset + 'px';
    }

    panel.style.display = 'block';
    document.getElementById('quiz-side-question').innerText = 'Loading quiz via AI...';
    document.getElementById('quiz-side-question').classList.add('shimmer-text');
    document.getElementById('quiz-side-options').innerHTML = '';
    document.getElementById('quiz-side-explanation').style.display = 'none';
    document.getElementById('quiz-side-next-btn').style.display = 'none';
    document.getElementById('quiz-side-close-btn').style.display = 'none';
    document.getElementById('quiz-side-progress').innerText = `Q 1/3 | Score: ${player.quizScore}`;
    quizAnswered = false;

    currentQuizData = await fetchGeminiQuiz();
    quizStep = 0;
    renderQuizSideQuestion();
}

function renderQuizSideQuestion() {
    if (!currentQuizData || quizStep >= currentQuizData.length) return;

    const q = currentQuizData[quizStep];
    quizAnswered = false;

    document.getElementById('quiz-side-progress').innerText = `Q ${quizStep + 1}/3 | Score: ${player.quizScore}`;
    const qEl = document.getElementById('quiz-side-question');
    qEl.classList.remove('shimmer-text');
    qEl.innerText = q.q;
    document.getElementById('quiz-side-explanation').style.display = 'none';
    document.getElementById('quiz-side-next-btn').style.display = 'none';
    document.getElementById('quiz-side-close-btn').style.display = 'none';

    let html = '';
    const letters = ['🅐', '🅑', '🅒', '🅓'];
    q.options.forEach((opt, idx) => {
        html += `<button class="quiz-side-opt" data-opt-index="${idx}" data-correct="${q.answer}">${letters[idx]} ${opt}</button>`;
    });
    document.getElementById('quiz-side-options').innerHTML = html;

    // Add event listeners to quiz options
    document.querySelectorAll('.quiz-side-opt').forEach(btn => {
        btn.addEventListener('click', () => {
            const selected = parseInt(btn.getAttribute('data-opt-index'));
            const correct = parseInt(btn.getAttribute('data-correct'));
            answerQuizSide(selected, correct);
        });
    });
}

function answerQuizSide(selected, correct) {
    if (quizAnswered) return;
    quizAnswered = true;

    const opts = document.querySelectorAll('.quiz-side-opt');
    opts.forEach(o => o.disabled = true);
    opts[selected].classList.add(selected === correct ? 'correct' : 'wrong');

    if (selected !== correct) {
        opts[correct].classList.add('correct');
        playSound('wrong');
    } else {
        playSound('success');
        player.quizScore++;
        addXP(100);
    }

    const expEl = document.getElementById('quiz-side-explanation');
    expEl.innerText = '💡 ' + currentQuizData[quizStep].explanation;
    expEl.style.display = 'block';
    document.getElementById('quiz-side-progress').innerText = `Q ${quizStep + 1}/3 | Score: ${player.quizScore}`;

    if (quizStep < 2) {
        document.getElementById('quiz-side-next-btn').style.display = 'block';
    } else {
        if (player.quizScore === 3) unlockAchievement('quiz_master', ACHIEVEMENT_DEFS);
        document.getElementById('quiz-side-close-btn').style.display = 'block';
        document.getElementById('quiz-side-next-btn').style.display = 'none';
    }
}

function nextQuizSideQuestion() {
    quizStep++;
    if (quizStep < 3) renderQuizSideQuestion();
}

function closeQuizPanel() {
    document.getElementById('quiz-side-panel').style.display = 'none';
    if (window.currentQuest === 3 && !quests[3].steps[0]?.completed) {
        setTimeout(() => enterPollingStation(), 500);
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
}

// ============================================
// GUARD SCAN
// ============================================

function startGuardScan() {
    const btn = document.getElementById('guard-scan-btn');
    const mag = document.getElementById('guard-scan-magnifier');
    const status = document.getElementById('guard-scan-status');
    const msg = document.getElementById('guard-scan-msg');
    const bar = document.getElementById('guard-scan-progress');

    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    if (mag) mag.style.display = 'block';
    if (status) {
        status.textContent = '🔍 SCANNING — Please wait...';
        status.style.color = '#E8C070';
    }
    if (msg) msg.textContent = 'Verifying photo, EPIC number, and electoral roll...';

    let pct = 0;
    const interval = setInterval(() => {
        pct += 2;
        if (bar) bar.style.width = pct + '%';
        if (pct === 30 && msg) msg.textContent = '✅ Photo match verified...';
        if (pct === 60 && msg) msg.textContent = '✅ EPIC number found in electoral roll...';
        if (pct === 85 && msg) msg.textContent = '✅ Biometric cross-check complete...';
        if (pct >= 100) {
            clearInterval(interval);
            if (mag) mag.style.display = 'none';
            if (status) {
                status.textContent = '✅ VERIFIED! Welcome, ' + player.name + '!';
                status.style.color = '#7AB86A';
            }
            if (msg) msg.textContent = 'No phones or cameras allowed inside. Proceed to Queue Manager.';
            if (bar) bar.style.background = '#7AB86A';
            setTimeout(() => completeGuardScan(), 1400);
        }
    }, 40);
}

// ============================================
// REPORT & LEADERBOARD
// ============================================

async function generateAndShowReport() {
    const reportText = await generateReport(window.timeInSeconds || 0, player.name, player.state, player.quizScore, player.level);
    const reportElement = document.getElementById('report-text');
    if (reportElement) {
        reportElement.classList.remove('shimmer-text');
        reportElement.innerHTML = reportText.replace(/\n/g, '<br>');
    }
    const downloadBtn = document.getElementById('btn-download');
    if (downloadBtn) downloadBtn.style.display = 'flex';
}

function downloadReportAsImage() {
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
        html2canvas(reportContent).then(canvas => {
            const link = document.createElement('a');
            link.download = 'Voter_Education_Certificate.png';
            link.href = canvas.toDataURL();
            link.click();
        });
    }
}

function submitScoreToLeaderboard() {
    submitScore({
        name: player.name,
        age: player.age,
        state: player.state,
        emoji: player.emoji,
        timeInSeconds: window.timeInSeconds || 0,
        quizScore: player.quizScore,
        level: player.level
    }).then(() => {
        const viewReportBtn = document.getElementById('btn-view-report');
        if (viewReportBtn) viewReportBtn.style.display = 'block';
    });
}

function showCompletionCheer() {
    const overlay = document.getElementById('overlay-completion-cheer');
    if (overlay) {
        const timeEl = document.getElementById('cheer-time');
        const quizEl = document.getElementById('cheer-quiz');
        const levelEl = document.getElementById('cheer-level');
        const nameEl = document.getElementById('cheer-name');

        if (timeEl) {
            const mins = Math.floor((window.timeInSeconds || 0) / 60);
            const secs = (window.timeInSeconds || 0) % 60;
            timeEl.innerText = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        if (quizEl) quizEl.innerText = `${player.quizScore}/3`;
        if (levelEl) levelEl.innerText = `Lvl ${player.level}`;
        if (nameEl) nameEl.innerText = player.name;

        overlay.style.display = 'flex';
        spawnConfetti(100);
    }
}

function openReportFromCheer() {
    document.getElementById('overlay-completion-cheer').style.display = 'none';
    showOverlay('overlay-report');
    generateAndShowReport();
}

function downloadIVotedCard() {
    const card = document.getElementById('ivoted-card');
    if (card) {
        html2canvas(card, { scale: 2 }).then(canvas => {
            const link = document.createElement('a');
            link.download = `I-VOTED-${player.name || 'Citizen'}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    }
}

// ============================================
// DIYA CHAT
// ============================================

let diyaDrawerOpen = false;

function toggleDiyaDrawer() {
    const drawer = document.getElementById('diya-drawer');
    if (drawer) {
        diyaDrawerOpen = !diyaDrawerOpen;
        drawer.style.left = diyaDrawerOpen ? '0' : '-340px';
    }
}

async function sendDiyaChatMessage() {
    const input = document.getElementById('diya-input');
    const msg = input.value.trim();
    if (!msg) return;

    input.value = '';
    appendDiyaMessage('user', msg);
    appendDiyaMessage('bot', '🙏 Thinking...');

    const response = await fetchGeminiDiya(msg);
    const lastBot = document.querySelector('#diya-messages .diya-bot-last');
    if (lastBot) lastBot.remove();
    appendDiyaMessage('bot', response);
}

function appendDiyaMessage(role, text) {
    const container = document.getElementById('diya-messages');
    if (!container) return;

    const div = document.createElement('div');
    if (role === 'user') {
        div.style.cssText = 'align-self:flex-end; background:var(--saffron); color:#000; padding:10px 14px; border-radius:15px 15px 0 15px; margin-bottom:10px; max-width:85%; font-size:13px;';
    } else {
        div.className = 'diya-bot-last';
        div.style.cssText = 'align-self:flex-start; background:rgba(255,255,255,0.07); color:#fff; padding:10px 14px; border-radius:15px 15px 15px 0; margin-bottom:10px; max-width:85%; font-size:13px;';
    }
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function playSound(type) {
    if (window.isMuted) return;
    // Audio handled by interactions.js
}

function spawnConfetti(count) {
    const colors = ['#FFBE85', '#FDF6EC', '#7EC8A4', '#F2CC8F', '#F4A261', '#A8D8B9'];
    for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-particle';
        el.style.position = 'fixed';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-20px';
        el.style.width = (Math.random() * 8 + 4) + 'px';
        el.style.height = (Math.random() * 8 + 4) + 'px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'none';
        el.style.animation = `confetti-fall ${Math.random() * 2 + 1.5}s linear forwards`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    }
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW (for HTML buttons)
// ============================================

window.showOverlay = showOverlay;
window.closeOverlays = closeOverlays;
window.toggleTimeline = toggleTimeline;
window.mapTab = mapTab;
window.startGame = startGame;
window.selectSkinTone = selectSkinTone;
window.selectAvatar = selectAvatar;
window.beginLandingTransition = beginLandingTransition;
window.showControlsIntro = showControlsIntro;
window.closeControlsIntro = closeControlsIntro;
window.toggleDiyaDrawer = toggleDiyaDrawer;
window.sendDiyaMessage = sendDiyaChatMessage;
window.sendDiyaPrompt = (text) => {
    document.getElementById('diya-input').value = text;
    sendDiyaChatMessage();
};
window.completeGuardScan = completeGuardScan;
window.completeVerification = completeVerification;
window.applyInk = applyInk;
window.showEVM = showEVM;
window.selectCandidate = selectCandidate;
window.castVote = castVote;
window.answerQuizSide = answerQuizSide;
window.nextQuizSideQuestion = nextQuizSideQuestion;
window.closeQuizPanel = closeQuizPanel;
window.generateReport = generateAndShowReport;
window.downloadReport = downloadReportAsImage;
window.submitRegistration = submitRegistration;
window.checkForm = checkForm;
window.triggerQuiz = triggerQuiz;
window.updateHUD = updateHUD;
window.updateQuestUI = updateQuestUI;
window.showCelebration = showCelebration;
window.showToast = showToast;
window.toggleMute = toggleMute;
window.downloadIVoted = downloadIVotedCard;
window.openReportFromCheer = openReportFromCheer;

// Game state globals for debugging
window.player = player;
window.gameState = gameState;
window.timeInSeconds = timeInSeconds;
window.zoomMultiplier = zoomMultiplier;
window.currentQuest = currentQuest;
window.quests = quests;

// ============================================
// START THE GAME
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Also fetch initial data
fetchGeminiFact().then(fact => {
    const factEl = document.getElementById('fact-text');
    if (factEl) {
        factEl.innerText = fact;
        factEl.classList.remove('shimmer-text');
    }
});

fetchGeminiNews().then(news => {
    const tickerEl = document.getElementById('ticker-text-inner');
    if (tickerEl) tickerEl.innerText = news;
});