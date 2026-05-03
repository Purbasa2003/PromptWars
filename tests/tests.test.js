
import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { addXP, completeQuestStep, player, quests } from '../src/js/gameState.js';
import { formatTime } from '../src/js/ui.js';
import { selectCandidate } from '../src/js/evm.js';
import * as ai from '../src/js/ai.js';

// Mock DOM environment if needed (already handled by jest-environment-jsdom)
global.fetch = jest.fn();

describe('Election Game Logic Tests', () => {
    
    beforeEach(() => {
        // Reset player state
        player.xp = 0;
        player.level = 1;
        player.voted = false;
        
        // Reset quests
        Object.keys(quests).forEach(q => {
            quests[q].steps.forEach(s => s.completed = false);
        });
        
        // Mock global window objects used in modules
        global.window = {
            gameState: 'PLAYING',
            timeInSeconds: 0,
            zoomMultiplier: 1.2,
            audioCtx: null
        };
        
        // Mock document elements
        document.body.innerHTML = '<div id="btn-mute">volume_up</div><div id="evm-cast-btn"></div>';
    });

    test('addXP should increase XP and trigger level up', () => {
        const leveledUp = addXP(150);
        expect(player.xp).toBe(150);
        expect(player.level).toBe(2);
        expect(leveledUp).toBe(true);
    });

    test('formatTime should format seconds into MM:SS', () => {
        expect(formatTime(65)).toBe('1:05');
        expect(formatTime(125)).toBe('2:05');
        expect(formatTime(10)).toBe('0:10');
        expect(formatTime(0)).toBe('0:00');
    });

    test('completeQuestStep should mark a step as completed', () => {
        const result = completeQuestStep(1, 1);
        expect(quests[1].steps[0].completed).toBe(true);
        expect(player.xp).toBe(50);
        expect(result).toBe(true);
    });

    test('selectCandidate should update UI and state', () => {
        window.gameState = 'EVM_VOTING';
        player.voted = false;
        
        // Create mock elements
        document.body.innerHTML = `
            <div id="cand-1" class="evm-cand"></div>
            <button id="evm-cast-btn"></button>
        `;
        
        selectCandidate(1);
        
        const candEl = document.getElementById('cand-1');
        expect(candEl.classList.contains('selected')).toBe(true);
        
        const castBtn = document.getElementById('evm-cast-btn');
        expect(castBtn.disabled).toBe(false);
    });

    test('fetchGeminiQuiz should return processed quiz data', async () => {
        const mockData = {
            candidates: [{
                content: {
                    parts: [{ text: JSON.stringify({ 
                        questions: [
                            { q: "Mock Question 1?", options: ["A", "B", "C", "D"], answer: 0, explanation: "Exp 1" },
                            { q: "Mock Question 2?", options: ["A", "B", "C", "D"], answer: 1, explanation: "Exp 2" },
                            { q: "Mock Question 3?", options: ["A", "B", "C", "D"], answer: 2, explanation: "Exp 3" }
                        ] 
                    }) }]
                }
            }]
        };
        
        global.fetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue(mockData)
        });

        const data = await ai.fetchGeminiQuiz();
        expect(data).toHaveLength(3);
        expect(data[0].q).toBe("Mock Question 1?");
    });
});
