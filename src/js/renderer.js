/**
 * renderer.js - Canvas drawing and rendering logic
 * DEMOKRATIC Election Education Game
 * 
 * This file handles all visual rendering: tiles, NPCs, player, signs, and UI overlays.
 * It imports game state from gameState.js and draws everything to canvas.
 */

import { 
    TILE_SIZE, player, currentMap, mapType, npcs, zoomMultiplier,
    gameState, mainMap, regOfficeMap, pollingMap
} from './gameState.js';

// Canvas references
let canvas = null;
let ctx = null;

// Animation frame reference
let animationId = null;

// ============================================
// INITIALIZATION
// ============================================

export function initRenderer(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
    resizeCanvas();
    window.addEventListener('resize', () => resizeCanvas());
}

export function startRenderLoop() {
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(draw);
}

export function stopRenderLoop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function resizeCanvas() {
    if (!canvas) return;
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
}

// ============================================
// MAIN DRAW FUNCTION
// ============================================

function draw() {
    if (!ctx || !canvas) return;
    
    const cw = canvas.width;
    const ch = canvas.height;
    
    // Clear canvas with dark background
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#0E1318';
    ctx.fillRect(0, 0, cw, ch);

    // Calculate world dimensions and camera position
    const worldW = currentMap[0].length * TILE_SIZE;
    const worldH = currentMap.length * TILE_SIZE;
    const baseScale = Math.min((cw * 0.9) / worldW, (ch * 0.9) / worldH);
    const cameraScale = baseScale * (zoomMultiplier || 1.2);

    const scaledW = worldW * cameraScale;
    const scaledH = worldH * cameraScale;
    
    let offsetX = (cw - scaledW) / 2 - (player.x * TILE_SIZE - worldW / 2) * cameraScale;
    let offsetY = (ch - scaledH) / 2 - (player.y * TILE_SIZE - worldH / 2) * cameraScale;
    
    // Camera bounds clamping
    if (cameraScale > baseScale) {
        offsetX = Math.min(offsetX, (cw - scaledW) / 2 + (scaledW - cw) / 2 + (cw - scaledW) / 2);
        offsetX = Math.min(0, Math.max(cw - scaledW, offsetX));
        offsetY = Math.min(0, Math.max(ch - scaledH, offsetY));
        if (scaledW < cw) offsetX = (cw - scaledW) / 2;
        if (scaledH < ch) offsetY = (ch - scaledH) / 2;
    }

    // Apply camera transformation
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(cameraScale, cameraScale);

    const T = TILE_SIZE;
    const isIndoor = (mapType === 'reg' || mapType === 'poll');
    const animTime = Date.now() / 1000;

    // Draw all tiles
    for (let y = 0; y < currentMap.length; y++) {
        for (let x = 0; x < currentMap[y].length; x++) {
            const tile = currentMap[y][x];
            drawTile(ctx, tile, x * T, y * T, T, x, y, isIndoor, animTime);
        }
    }

    // Draw building shadows (exterior only)
    if (!isIndoor) {
        for (let y = 0; y < currentMap.length; y++) {
            for (let x = 0; x < currentMap[y].length; x++) {
                const tile = currentMap[y][x];
                if (tile === 2 || tile === 3) {
                    // Shadow to the right
                    if (currentMap[y] && currentMap[y][x + 1] === 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.06)';
                        ctx.fillRect((x + 1) * T, y * T, T / 3, T);
                    }
                    // Shadow below
                    if (currentMap[y + 1] && currentMap[y + 1][x] === 0) {
                        ctx.fillStyle = 'rgba(0,0,0,0.06)';
                        ctx.fillRect(x * T, (y + 1) * T, T, T / 3);
                    }
                }
            }
        }
    }

    // Draw building signs
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (mapType === 'main') {
        drawSign(ctx, 2, 1, '📋 VOTER REGISTRATION', T);
        drawSign(ctx, 8, 4, '🗳️ POLLING STATION', T);
        drawSign(ctx, 12, 8, '🗺️ MAP CENTER', T);
    }
    if (mapType === 'poll') {
        drawSign(ctx, 5, 2, '👨💼 VERIFY', T);
        drawSign(ctx, 6, 2, '✋ INK', T);
        drawSign(ctx, 2, 1, '🗳️ EVM', T);
        drawSign(ctx, 8, 1, '🚪 EXIT', T);
    }

    // Draw all NPCs
    npcs.forEach(npc => {
        if (npc.map !== mapType) return;
        drawNPC(ctx, npc, T, animTime);
    });

    // Draw player character
    drawPlayer(ctx, player, T, animTime);

    // Draw door interaction hint
    drawDoorHint(ctx, T);

    ctx.restore();
    
    // Continue the loop
    animationId = requestAnimationFrame(draw);
}

// ============================================
// TILE DRAWING FUNCTIONS
// ============================================

function drawTile(ctx, tile, px, py, T, gx, gy, isIndoor, anim) {
    switch (tile) {
        case 0: // Grass or Indoor Floor
            if (isIndoor) {
                // Checkered floor pattern for indoors
                ctx.fillStyle = (gx + gy) % 2 === 0 ? '#F5EFE5' : '#EDE4D4';
                ctx.fillRect(px, py, T, T);
                ctx.strokeStyle = 'rgba(0,0,0,0.04)';
                ctx.strokeRect(px, py, T, T);
            } else {
                // Grass with subtle variation
                ctx.fillStyle = ((gx * 7 + gy * 13) % 17) > 8 ? '#A8D5A2' : '#9CCA96';
                ctx.fillRect(px, py, T, T);
                // Grass blades
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.fillRect(px + 2, py + 3, 1, 3);
                ctx.fillRect(px + 8, py + 1, 1, 2);
                ctx.fillRect(px + 12, py + 6, 1, 3);
            }
            break;

        case 1: // Path/Road
            ctx.fillStyle = '#E8D5B7';
            ctx.fillRect(px, py, T, T);
            // Path texture
            ctx.strokeStyle = 'rgba(160,130,100,0.15)';
            ctx.lineWidth = 0.5;
            const hT = T / 2;
            ctx.strokeRect(px + 0.5, py + 0.5, hT - 0.5, hT - 0.5);
            ctx.strokeRect(px + hT, py + hT, hT - 0.5, hT - 0.5);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(px, py, T, 1);
            ctx.lineWidth = 1;
            break;

        case 2: // Wall
            ctx.fillStyle = '#D4A8A8';
            ctx.fillRect(px, py, T, T);
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(px, py, T, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(px, py + T - 2, T, 2);
            // Brick pattern
            ctx.strokeStyle = 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py + T / 3); ctx.lineTo(px + T, py + T / 3);
            ctx.moveTo(px, py + 2 * T / 3); ctx.lineTo(px + T, py + 2 * T / 3);
            ctx.stroke();
            break;

        case 3: // Building exterior
            ctx.fillStyle = '#F0E6D6';
            ctx.fillRect(px, py, T, T);
            ctx.fillStyle = 'rgba(126,200,164,0.35)';
            ctx.fillRect(px + 3, py + 3, T - 6, T - 6);
            // Window effect
            ctx.fillStyle = 'rgba(244,162,97,0.08)';
            ctx.fillRect(px + 3, py + 3, (T - 6) / 3, T - 6);
            ctx.fillRect(px + T - 3 - (T - 6) / 3, py + 3, (T - 6) / 3, T - 6);
            ctx.strokeStyle = 'rgba(0,0,0,0.06)';
            ctx.strokeRect(px, py, T, T);
            break;

        case 4: // Tree
            if (isIndoor) {
                ctx.fillStyle = '#D4A8A8';
                ctx.fillRect(px, py, T, T);
            } else {
                // Trunk
                ctx.fillStyle = '#8B6B4A';
                ctx.fillRect(px + T / 2 - 1.5, py + T * 0.45, 3, T * 0.55);
                // Canopy - layered circles
                ctx.fillStyle = '#5A8A5A';
                ctx.beginPath();
                ctx.arc(px + T / 2, py + T * 0.35, T / 2.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#6B9E6B';
                ctx.beginPath();
                ctx.arc(px + T / 2 - 2, py + T * 0.3, T / 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8CC08C';
                ctx.beginPath();
                ctx.arc(px + T / 2 + 1, py + T * 0.25, T / 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;

        case 5: // Door (interactive)
            ctx.fillStyle = isIndoor ? '#F5EFE5' : '#E8D5B7';
            ctx.fillRect(px, py, T, T);
            ctx.fillStyle = '#C49460';
            ctx.fillRect(px + 1, py, T - 2, T);
            ctx.fillStyle = '#D4A878';
            ctx.fillRect(px + 2.5, py + 1, T - 5, T - 1);
            // Door knob with glow animation
            const glowA = 0.15 + Math.sin(anim * 3) * 0.08;
            ctx.fillStyle = 'rgba(244,162,97,' + glowA + ')';
            ctx.fillRect(px - 1, py - 1, T + 2, T + 2);
            ctx.fillStyle = '#F2CC8F';
            ctx.beginPath();
            ctx.arc(px + T - 4.5, py + T / 2, 1.2, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 6: // Object/Desk
            ctx.fillStyle = isIndoor ? '#F5EFE5' : '#A8D5A2';
            ctx.fillRect(px, py, T, T);
            ctx.fillStyle = '#B8A898';
            ctx.fillRect(px + 1, py + 3, T - 2, T - 5);
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(px + 1, py + 3, T - 2, 2);
            // Desk legs
            ctx.fillStyle = '#9E8E7E';
            ctx.fillRect(px + 2, py + T - 3, 2, 2);
            ctx.fillRect(px + T - 4, py + T - 3, 2, 2);
            break;
    }
}

// ============================================
// NPC DRAWING
// ============================================

function drawNPC(ctx, npc, T, animTime) {
    const nx = npc.x * T + T / 2;
    const ny = npc.y * T + T / 2;
    const floatOff = Math.sin(animTime * 2 + npc.x * 3) * 1.5;
    const ey = ny + floatOff;

    // Drop shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(nx, ny + T * 0.42, T * 0.28, T * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // NPC Emoji
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(T * 0.7)}px Arial`;
    ctx.fillText(npc.emoji, nx, ey);

    // Name tag
    ctx.font = `bold ${Math.round(T * 0.20)}px Nunito, Arial`;
    ctx.textBaseline = 'top';
    const nameW = ctx.measureText(npc.name).width;
    const tagX = nx - nameW / 2 - 5;
    const tagY = ny + T * 0.56;
    const tagH = T * 0.26;
    
    ctx.fillStyle = 'rgba(14,19,24,0.82)';
    roundRect(ctx, tagX, tagY, nameW + 10, tagH, 3);
    ctx.fill();
    
    ctx.fillStyle = npc.type === 'npc' ? '#F4A355' : '#4A90D9';
    roundRect(ctx, tagX, tagY, nameW + 10, 2, 1);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(npc.name, nx - nameW / 2, tagY + 4);
    ctx.textBaseline = 'middle';
}

// ============================================
// PLAYER DRAWING
// ============================================

function drawPlayer(ctx, player, T, animTime) {
    const ppx = player.x * T + T / 2;
    const ppy = player.y * T + T / 2;
    const walkBob = player.moving ? Math.sin(animTime * 10) * 1.5 : 0;
    const pey = ppy + walkBob;

    // Drop shadow
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(ppx, ppy + T * 0.42, T * 0.3, T * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Pulsing ring around player
    const playerPulse = T * 0.48 + Math.sin(animTime * 3) * 1.5;
    ctx.strokeStyle = '#F4A355';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.5 + Math.sin(animTime * 3) * 0.2;
    ctx.beginPath();
    ctx.arc(ppx, pey, playerPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // White circle background for visibility
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(ppx, pey, T * 0.46, 0, Math.PI * 2);
    ctx.fill();

    // Gold border
    ctx.strokeStyle = '#D08040';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ppx, pey, T * 0.46, 0, Math.PI * 2);
    ctx.stroke();

    // Player emoji
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(T * 0.62)}px Arial`;
    ctx.fillText(player.emoji, ppx, pey);
}

// ============================================
// UI ELEMENTS (Signs, Door Hints)
// ============================================

function drawSign(ctx, gx, gy, text, T) {
    const cx = gx * T + T / 2;
    const cy = gy * T - 4;
    ctx.font = 'bold 5.5px Nunito, Arial';
    ctx.textAlign = 'center';
    
    const tw = ctx.measureText(text).width;
    const bw = tw + 10, bh = 12, bx = cx - bw / 2, by = cy - bh / 2;
    
    // Background pill
    ctx.fillStyle = 'rgba(10,15,25,0.92)';
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.fill();
    
    // Accent border
    ctx.strokeStyle = '#F4A355';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.stroke();
    
    // Text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(text, cx, cy);
}

function drawDoorHint(ctx, T) {
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.textBaseline = 'middle';
    
    let fx = Math.floor(player.x + 0.5);
    let fy = Math.floor(player.y + 0.5);
    
    if (player.dir === 'up') fy -= 1;
    if (player.dir === 'down') fy += 1;
    if (player.dir === 'left') fx -= 1;
    if (player.dir === 'right') fx += 1;
    
    if (currentMap[fy] && currentMap[fy][fx] === 5) {
        const pX = fx * T + T / 2;
        const pY = fy * T - 15;
        
        // White pill background
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        roundRect(ctx, pX - 35, pY - 16, 70, 20, 10);
        ctx.fill();
        
        // Orange border
        ctx.strokeStyle = '#D08040';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Text
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 10px "Nunito", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ENTER', pX, pY - 2);
    }
    
    ctx.restore();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// Force a redraw (useful after state changes)
export function forceRedraw() {
    if (ctx && canvas) {
        draw();
    }
}
