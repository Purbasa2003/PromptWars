/**
 * evm.js - Electronic Voting Machine (EVM) and VVPAT logic
 * DEMOKRATIC Election Education Game
 * 
 * This file handles the voting interface, candidate selection, 
 * vote casting, and VVPAT slip generation.
 */

import { 
    player, gameState, getCandidates, completeQuestStep, addXP, collectCard,
    updateTimeline, unlockAchievement
} from './gameState.js';
import { showOverlay, closeOverlays, showDialogue, updateQuestUI } from './ui.js';

let candidates = [];
let selectedCandidate = 0;

/**
 * Show the EVM voting overlay
 */
export function showEVM() {
    candidates = getCandidates();
    selectedCandidate = 0;
    
    const stateNames = { 
        DL: 'Delhi', MH: 'Maharashtra', UP: 'Uttar Pradesh', 
        WB: 'West Bengal', TN: 'Tamil Nadu', KA: 'Karnataka', 
        GJ: 'Gujarat', RJ: 'Rajasthan', OTHER: 'India' 
    };
    
    const constituencyEl = document.getElementById('evm-constituency');
    const stateEl = document.getElementById('evm-state');
    const candidatesEl = document.getElementById('evm-candidates');
    const castBtn = document.getElementById('evm-cast-btn');
    
    if (constituencyEl) constituencyEl.innerText = (stateNames[player.state] || player.state) + ' - Constituency 1';
    if (stateEl) stateEl.innerText = stateNames[player.state] || player.state;
    
    if (candidatesEl) {
        let html = '';
        candidates.forEach((c, idx) => {
            const symHtml = c.logoUrl
                ? `<img src="${c.logoUrl}" style="width:38px;height:38px;object-fit:contain;border-radius:4px;" onerror="this.style.display='none';this.nextSibling.style.display='inline'"><span style="display:none;font-size:22px;">${c.symbol}</span>`
                : `<span style="font-size:22px;">${c.symbol}</span>`;
            
            html += `
                <div class="evm-cand" id="cand-${c.id}" onclick="selectCandidate(${c.id})" style="border-left-color:${c.color};">
                    <div style="font-size:13px; width:30px; text-align:center; color:#999; font-weight:bold;">${idx + 1}</div>
                    <div style="flex:1;">
                        <div style="font-weight:800; font-family:'Nunito',sans-serif;">${c.name}</div>
                        <div style="font-size:11px; color:#7f8c8d;">${c.party}</div>
                    </div>
                    <div style="width:50px; text-align:center; display:flex; align-items:center; justify-content:center;">${symHtml}</div>
                    <div class="evm-btn"></div>
                </div>`;
        });
        candidatesEl.innerHTML = html;
    }
    
    if (castBtn) {
        castBtn.disabled = true; 
        castBtn.style.opacity = '0.4';
    }
    
    showOverlay('overlay-evm');
    window.gameState = 'EVM_VOTING';
}

/**
 * Handle candidate selection in EVM
 * @param {number} id - Candidate ID
 */
export function selectCandidate(id) {
    if (window.gameState !== 'EVM_VOTING' || player.voted) return;
    
    // Play beep sound
    const audioCtx = window.audioCtx;
    if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = 800; gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    }
    
    document.querySelectorAll('.evm-cand').forEach(el => el.classList.remove('selected'));
    const candEl = document.getElementById(`cand-${id}`);
    if (candEl) candEl.classList.add('selected');
    
    selectedCandidate = id;
    const castBtn = document.getElementById('evm-cast-btn');
    if (castBtn) {
        castBtn.disabled = false; 
        castBtn.style.opacity = '1';
    }
}

/**
 * Cast the vote and show VVPAT slip
 */
export function castVote() {
    if (selectedCandidate === 0) {
        alert("Please select a candidate first!");
        return;
    }
    
    if (player.voted) return;
    
    player.voted = true;
    
    // Play success sound
    const audioCtx = window.audioCtx;
    if (audioCtx) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.value = 523.25; gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    }
    
    const cand = candidates.find(c => c.id === selectedCandidate);
    const castBtn = document.getElementById('evm-cast-btn');
    if (castBtn) {
        castBtn.disabled = true;
        castBtn.style.opacity = '0.4';
        castBtn.innerText = '✅ VOTE RECORDED';
    }

    // Generate VVPAT slip
    showVVPATSlip(cand);
    
    setTimeout(() => {
        const slip = document.getElementById('vvpat-slip');
        if (slip) slip.style.bottom = '-300px';
        
        closeOverlays();
        showDialogue("System", "Vote recorded successfully! ✅ VVPAT slip verified. Now talk to the Exit Officer (👮‍♀️) to leave.", "⚙️");
        
        completeQuestStep(3, 4);
        updateTimeline();
        collectCard(5);
        
        setTimeout(() => {
            showIVotedCard();
        }, 2500);
    }, 5000);
}

/**
 * Show VVPAT slip animation
 * @param {Object} cand - Selected candidate object
 */
function showVVPATSlip(cand) {
    const symbolSVG = getPartySymbolSVG(cand.party, cand.symbol);
    const slip = document.getElementById('vvpat-slip');
    if (!slip) return;
    
    slip.innerHTML = `
        <div style="font-weight:bold; font-size:13px; letter-spacing:1px; color:#333;">🗳️ &nbsp;VVPAT SLIP</div>
        <hr style="border:none; border-top:1px solid #ccc; margin:6px 0;">
        <div style="font-size:11px; color:#888; margin:4px 0;">Serial: ${Math.floor(Math.random() * 9000) + 1000}</div>
        <div style="margin:10px 0;">${symbolSVG}</div>
        <div style="font-weight:bold; font-size:14px; color:#111;">${cand.name}</div>
        <div style="font-size:11px; color:#555; margin:4px 0;">${cand.party}</div>
        <hr style="border:none; border-top:1px solid #ccc; margin:6px 0;">
        <div style="font-size:9px; color:#999;">TIME: ${new Date().toLocaleTimeString()}</div>
        <div style="font-size:9px; color:#999; margin-bottom:6px;">BOOTH: STATION A</div>
        <button onclick="downloadVVPATSlip()" style="background:#F4A355; border:none; border-radius:6px; padding:6px 12px; font-size:11px; cursor:pointer; font-weight:700; color:#0E1318; display:flex; align-items:center; gap:5px; margin:0 auto;">📥 Download Slip</button>`;
    
    slip.style.bottom = '20px';
}

/**
 * Get SVG for party symbol
 */
function getPartySymbolSVG(partyName, emoji) {
    const symbols = {
        BJP: `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#FF9933" stroke="#fff" stroke-width="1"/><text x="18" y="24" text-anchor="middle" font-size="20">🪷</text></svg>`,
        INC: `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#1565C0" stroke="#fff" stroke-width="1"/><text x="18" y="26" text-anchor="middle" font-size="14" fill="#fff" font-weight="bold">HAND</text></svg>`,
        TMC: `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#00BFA5" stroke="#fff" stroke-width="1"/><text x="18" y="24" text-anchor="middle" font-size="18">🌺</text></svg>`,
        AAP: `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#00838F" stroke="#fff" stroke-width="1"/><text x="18" y="24" text-anchor="middle" font-size="16">🧹</text></svg>`,
        BSP: `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#1A237E" stroke="#fff" stroke-width="1"/><text x="18" y="24" text-anchor="middle" font-size="18">🐘</text></svg>`,
        NOTA: `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#555" stroke="#fff" stroke-width="1"/><text x="18" y="24" text-anchor="middle" font-size="16">❌</text></svg>`
    };
    
    if (partyName.includes('BJP')) return symbols.BJP;
    if (partyName.includes('INC') || partyName.includes('Congress')) return symbols.INC;
    if (partyName.includes('TMC')) return symbols.TMC;
    if (partyName.includes('AAP')) return symbols.AAP;
    if (partyName.includes('BSP')) return symbols.BSP;
    if (partyName.includes('NOTA')) return symbols.NOTA;
    
    return `<svg width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="17" fill="#444" stroke="#fff" stroke-width="1"/><text x="18" y="24" text-anchor="middle" font-size="18">${emoji || '🗳️'}</text></svg>`;
}

/**
 * Show "I Voted" card overlay
 */
function showIVotedCard() {
    const emojiEl = document.getElementById('ivoted-emoji');
    const nameEl = document.getElementById('ivoted-name');
    const stateEl = document.getElementById('ivoted-state');
    const dateEl = document.getElementById('ivoted-date');
    
    if (emojiEl) emojiEl.innerText = player.emoji;
    if (nameEl) nameEl.innerText = player.name;
    if (stateEl) stateEl.innerText = 'State: ' + player.state;
    if (dateEl) dateEl.innerText = 'Date: ' + new Date().toLocaleDateString('en-IN');
    
    showOverlay('overlay-ivoted');
}

// Global exposure for HTML onclicks
window.selectCandidate = selectCandidate;
window.castVote = castVote;

export default {
    showEVM,
    selectCandidate,
    castVote
};
