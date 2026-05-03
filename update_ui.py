import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update <head>
head_start = content.find('<head>')
head_end = content.find('</head>')
old_head = content[head_start:head_end]

new_head = """<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DemoKrasi — The Voting Adventure</title>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Nunito:wght@400;700;800&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        :root {
            --bg-color: #202020;
            --text-color: #ffffff;
            --panel-bg: rgba(30, 30, 30, 0.7);
            --border-color: rgba(255, 255, 255, 0.1);
            --highlight: #f1c40f;
            --grass: #8bc34a;
            --path: #9e9e9e;
            --wall: #795548;
            --building: #e0e0e0;
            --tree: #2e7d32;
            --accent-india: linear-gradient(135deg, #FF9933, #FFFFFF, #138808);
            --glass-blur: blur(12px);
        }

        body {
            margin: 0; padding: 0;
            background-color: var(--bg-color); color: var(--text-color);
            font-family: 'Nunito', sans-serif;
            display: flex; flex-direction: column;
            height: 100vh; overflow: hidden; user-select: none;
        }

        h1, h2, h3 { font-family: 'Press Start 2P', cursive; text-align: center; line-height: 1.5; margin-top: 0; }

        /* Scrollbars */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }

        /* Animations */
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,153,51,0.7); } 70% { box-shadow: 0 0 0 10px rgba(255,153,51,0); } 100% { box-shadow: 0 0 0 0 rgba(255,153,51,0); } }
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(231,76,60,0.7); } 70% { box-shadow: 0 0 0 10px rgba(231,76,60,0); } 100% { box-shadow: 0 0 0 0 rgba(231,76,60,0); } }
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes confettiDrop { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes fadeOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
        @keyframes bounceCursor { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        /* Shimmer Loading Text */
        .shimmer-text {
            background: linear-gradient(90deg, #555 25%, #fff 50%, #555 75%);
            background-size: 200% auto;
            color: transparent;
            -webkit-background-clip: text;
            background-clip: text;
            animation: shimmer 1.5s linear infinite;
        }

        #game-container { display: flex; flex: 1; height: 100vh; position: relative; }
        #canvas-wrapper { flex: 1; background-color: var(--bg-color); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        canvas { image-rendering: pixelated; width: 100%; height: 100%; object-fit: contain; }

        .material-icons { vertical-align: middle; }

        /* FABs */
        .fab {
            position: absolute;
            background: var(--panel-bg);
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--border-color);
            color: #fff;
            width: 48px; height: 48px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; z-index: 50; display: none;
            transition: all 0.2s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            font-family: 'Material Icons';
            font-size: 24px;
            padding: 0;
        }
        .fab:hover { background: rgba(50,50,50,0.9); transform: scale(1.1); }
        .fab:active { transform: scale(0.9); }
        #btn-tasks { top: 20px; left: 20px; }
        #btn-controls { top: 20px; right: 20px; }
        
        .tooltip {
            position: absolute; top: 75px; background: rgba(0,0,0,0.8);
            color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px;
            pointer-events: none; opacity: 0; transition: opacity 0.2s; white-space: nowrap; font-family: 'Nunito', sans-serif;
        }
        #btn-tasks:hover::after { content: "Tasks"; position: absolute; top: 55px; background: #000; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: 'Nunito', sans-serif; }
        #btn-controls:hover::after { content: "Controls"; position: absolute; top: 55px; background: #000; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-family: 'Nunito', sans-serif; }

        /* Timer */
        #timer-panel {
            position: absolute; top: 20px; left: 50%; transform: translateX(-50%);
            background: var(--panel-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--border-color); border-radius: 20px;
            padding: 8px 16px; font-size: 18px; color: #fff; font-weight: bold;
            display: flex; align-items: center; gap: 8px; z-index: 50; display: none;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: color 0.3s;
        }
        .timer-urgent { color: #FF9933 !important; animation: pulse 2s infinite; }

        /* Quest Tracker */
        #quest-panel {
            position: absolute; top: 80px; left: 20px; width: 280px;
            background: var(--panel-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--border-color); border-radius: 12px; padding: 15px;
            z-index: 50; display: none; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease;
        }
        #quest-title { color: var(--highlight); margin-bottom: 15px; font-size: 14px; font-family: 'Press Start 2P', cursive; text-align: left; }
        #quest-steps { list-style: none; padding: 0; margin: 0; font-size: 14px; line-height: 1.6; }
        .quest-step { margin-bottom: 12px; color: #aaa; display: flex; align-items: center; gap: 8px; transition: all 0.3s; }
        .quest-step i { font-size: 18px; }
        .quest-step.active { color: #fff; border-left: 3px solid var(--highlight); padding-left: 8px; animation: pulse 2s infinite; text-shadow: 0 0 5px rgba(255,255,255,0.3); }
        .quest-step.completed { color: #4caf50; }
        #quest-progress-container { width: 100%; background: #222; border-radius: 4px; height: 6px; margin-top: 15px; overflow: hidden; }
        #quest-progress-bar { height: 100%; background: var(--accent-india); width: 0%; transition: width 0.3s ease; }

        /* Controls Guide */
        #controls-panel {
            position: absolute; top: 80px; right: 20px; width: 260px;
            background: var(--panel-bg); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
            border: 1px solid var(--border-color); border-radius: 12px; padding: 20px;
            z-index: 50; display: none; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            animation: fadeIn 0.3s ease;
        }
        .ctrl-grid { display: grid; grid-template-columns: auto 1fr; gap: 15px; align-items: center; font-size: 14px; color: #ddd; margin-top: 15px; }
        .key-chip { background: #eee; color: #333; padding: 4px 8px; border-radius: 4px; font-weight: bold; border-bottom: 3px solid #ccc; font-family: monospace; font-size: 12px; text-align: center; }

        /* Dialogue Box */
        #dialogue-box {
            position: absolute; bottom: 20px; left: 15%; width: 70%; min-height: 140px;
            background: rgba(10, 10, 10, 0.85); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
            color: #fff; border: 1px solid var(--border-color); border-left: 6px solid #e74c3c; border-radius: 12px;
            box-sizing: border-box; padding: 25px 25px 20px 25px; font-size: 18px; line-height: 1.6;
            display: none; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.5); transition: border-left-color 0.3s;
        }
        #dialogue-name {
            position: absolute; top: -15px; left: 20px; background: #e74c3c; color: white;
            padding: 4px 12px; font-size: 14px; font-weight: bold; border-radius: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: background 0.3s; letter-spacing: 1px;
        }
        #dialogue-text { height: 100%; overflow-y: auto; padding-right: 20px; }
        #dialogue-indicator { position: absolute; bottom: 15px; right: 20px; font-size: 16px; display: none; animation: bounceCursor 1s infinite; color: var(--highlight); }

        #building-ui-header {
            display: none; position: absolute; top: 0; left: 0; width: 100%;
            background: linear-gradient(90deg, #1A2980 0%, #26D0CE 100%);
            color: #fff; padding: 15px; text-align: center; font-size: 18px; font-weight: bold;
            border-bottom: 4px solid var(--highlight); z-index: 40; box-sizing: border-box;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3); animation: slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            display: flex; align-items: center; justify-content: center; gap: 10px;
        }

        /* Overlays */
        .overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: var(--glass-blur); -webkit-backdrop-filter: var(--glass-blur);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 200; display: none; animation: fadeIn 0.3s; overflow-y: auto;
        }
        .overlay.fade-out { animation: fadeOut 0.3s forwards; }

        .btn {
            font-family: 'Nunito', sans-serif; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;
            background: var(--accent-india); color: #333; border: none; border-radius: 8px;
            padding: 15px 30px; font-size: 16px; cursor: pointer; margin: 10px;
            box-shadow: 0 4px 0 #ccc; transition: all 0.1s; position: relative; overflow: hidden;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 0 #bbb; }
        .btn:active { transform: translateY(4px); box-shadow: 0 0 0 #aaa; }
        .btn:disabled { background: #555; color: #888; box-shadow: none; cursor: not-allowed; transform: none; }
        
        .btn-shimmer::after {
            content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%;
            background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%);
            transform: skewX(-20deg); animation: shimmer 3s infinite;
        }

        /* Title Screen */
        #overlay-title { background: linear-gradient(135deg, #0f2027, #203a43, #2c5364); background-size: 400% 400%; animation: shimmer 10s ease infinite; }
        .title-text { font-size: 50px; text-shadow: 0 0 10px #FF9933, 0 0 20px #FFFFFF, 0 0 30px #138808; margin-bottom: 20px; color: #fff; }
        .tagline { font-family: 'Nunito', sans-serif; font-size: 18px; color: #ddd; margin-bottom: 40px; letter-spacing: 2px; }
        .hero-icon { font-size: 80px; margin-bottom: 40px; animation: float 3s ease-in-out infinite; }

        /* Form Popup */
        #form-popup {
            background: #fff; color: #333; padding: 40px; border-radius: 16px; width: 400px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.5); position: relative;
        }
        .input-group { position: relative; margin-bottom: 30px; }
        .input-group input {
            font-family: 'Nunito', sans-serif; width: 100%; padding: 10px 0; font-size: 16px; color: #333;
            border: none; border-bottom: 2px solid #ccc; outline: none; background: transparent; transition: border-color 0.2s;
        }
        .input-group label { position: absolute; top: 10px; left: 0; font-size: 16px; color: #999; pointer-events: none; transition: 0.2s ease all; }
        .input-group input:focus ~ label, .input-group input:valid ~ label { top: -15px; font-size: 12px; color: #3498db; }
        .input-group input:focus { border-bottom: 2px solid #3498db; }
        .validation-icon { position: absolute; right: 0; top: 10px; color: #4caf50; display: none; }

        /* Voter ID Card */
        #voter-id-card {
            background: #fff; width: 350px; height: 220px; border-radius: 12px; position: relative; padding: 20px; color: #333;
            box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden; font-family: 'Nunito', sans-serif;
        }
        .epic-stripe { position: absolute; top: 0; left: 0; width: 100%; height: 10px; background: var(--accent-india); }
        .epic-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 120px; opacity: 0.05; pointer-events: none; }
        .valid-badge { position: absolute; top: 20px; right: 20px; background: #e8f5e9; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; border: 1px solid #a5d6a7; }

        /* EVM UI */
        #evm-ui {
            background: #2c3e50; background-image: radial-gradient(#34495e 1px, transparent 1px); background-size: 20px 20px;
            width: 80%; max-width: 600px; border: 12px solid #1a252f; padding: 30px; border-radius: 16px; color: #fff; box-shadow: inset 0 0 50px rgba(0,0,0,0.5), 0 15px 30px rgba(0,0,0,0.7);
        }
        .evm-candidate {
            display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; margin-bottom: 12px;
            background: #ecf0f1; border-radius: 8px; color: #333; border-left: 8px solid #95a5a6; transition: all 0.2s; cursor: pointer;
        }
        .evm-candidate:hover { transform: translateX(5px); }
        .evm-candidate.selected { border: 2px solid #3498db; border-left: 8px solid #3498db; background: #fff; box-shadow: 0 0 15px rgba(52, 152, 219, 0.5); }
        .evm-btn { width: 40px; height: 40px; border-radius: 50%; background: #bdc3c7; border: 3px solid #7f8c8d; box-shadow: inset 0 2px 5px rgba(0,0,0,0.3); transition: all 0.2s; }
        .evm-candidate.selected .evm-btn { background: #e74c3c; border-color: #c0392b; animation: pulse-red 1.5s infinite; }

        #vvpat-slip {
            position: absolute; background: #fdfaf6; border: 2px dashed #bdc3c7; padding: 20px; color: #333; font-family: monospace; font-size: 14px;
            width: 250px; bottom: -200px; right: 50px; transition: bottom 1s cubic-bezier(0.175, 0.885, 0.32, 1.275); text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.3); z-index: 300;
        }

        /* Leaderboard */
        .lb-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
        .lb-table th { border-bottom: 2px solid #eee; padding-bottom: 10px; text-align: left; color: #888; }
        .lb-table td { padding: 12px 0; border-bottom: 1px solid #eee; }
        .lb-table tr.rank-1 { background: linear-gradient(90deg, rgba(255,215,0,0.2), transparent); font-weight: bold; font-size: 16px; }
        .lb-table tr.rank-2 { background: linear-gradient(90deg, rgba(192,192,192,0.2), transparent); font-weight: bold; }
        .lb-table tr.rank-3 { background: linear-gradient(90deg, rgba(205,127,50,0.2), transparent); font-weight: bold; }

        /* Report */
        #report-content {
            background: #fff; color: #333; padding: 40px; width: 80%; max-width: 800px; max-height: 70%; overflow-y: auto;
            border-radius: 12px; border: 8px solid #f1f2f6; box-shadow: 0 20px 40px rgba(0,0,0,0.5); font-size: 16px; line-height: 1.8; text-align: left; position: relative;
        }
        .report-header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; position: relative; }
        .report-header::before { content: ''; position: absolute; top: -40px; left: -40px; width: calc(100% + 80px); height: 10px; background: var(--accent-india); }
    </style>
"""

content = content[:head_start] + new_head + content[head_end:]

# Next, body structure update
body_start = content.find('<body>')
body_end = content.find('<!-- Firebase SDKs -->')

old_body = content[body_start:body_end]

new_body = """<body>

    <div id="game-container">
        <div id="canvas-wrapper">
            <canvas id="game-canvas" width="640" height="480"></canvas>
            
            <button class="fab" id="btn-tasks" onclick="toggleTasks()">assignment</button>
            <button class="fab" id="btn-controls" onclick="toggleControls()">settings</button>

            <div id="timer-panel"><i class="material-icons">timer</i> <span id="timer-text">00:00</span></div>
            
            <div id="quest-panel">
                <div id="quest-title">QUEST 1: Become a Voter</div>
                <ul id="quest-steps">
                    <!-- Populated dynamically -->
                </ul>
                <div id="quest-progress-container"><div id="quest-progress-bar"></div></div>
            </div>

            <div id="controls-panel">
                <h3 style="color:#fff; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 15px; display:flex; align-items:center; gap:8px;">
                    <i class="material-icons">keyboard</i> CONTROLS
                </h3>
                <div class="ctrl-grid">
                    <div class="key-chip">↑↓←→</div><div>Move Character</div>
                    <div class="key-chip">ENTER</div><div>Interact / Next</div>
                    <div class="key-chip">ESC</div><div>Close Menus</div>
                </div>
            </div>

            <!-- Dialog Box -->
            <div id="dialogue-box">
                <div id="dialogue-name">Name</div>
                <div id="dialogue-text"></div>
                <div id="dialogue-indicator"><i class="material-icons">keyboard_arrow_down</i></div>
            </div>
            
            <div id="building-ui-header">
                <i class="material-icons">location_on</i> <span id="building-name">BUILDING</span>
            </div>
        </div>
    </div>

    <!-- Overlays -->
    
    <!-- Title Screen -->
    <div id="overlay-title" class="overlay" style="display:flex;">
        <h1 class="title-text">DemoKrasi</h1>
        <h2 style="font-size: 20px; color:#fff; margin-bottom: 10px;">The Voting Adventure</h2>
        <div class="tagline">Learn. Register. Vote. 🇮🇳</div>
        <div class="hero-icon">🚶</div>
        <button class="btn btn-shimmer" onclick="startGame()">Press Start</button>
    </div>

    <!-- Role Select -->
    <div id="overlay-role" class="overlay">
        <h2 style="color: #fff; margin-bottom: 30px;">Choose your role:</h2>
        <button class="btn" onclick="selectRole('voter')">🗳️ VOTER</button>
    </div>

    <!-- Registration Form -->
    <div id="overlay-form" class="overlay">
        <div id="form-popup">
            <h2 style="margin-bottom: 30px;">Voter Registration</h2>
            <div class="input-group">
                <input type="text" id="reg-name" required oninput="checkForm()">
                <label>Full Name</label>
                <i class="material-icons validation-icon" id="icon-name">check_circle</i>
            </div>
            <div class="input-group">
                <input type="number" id="reg-age" required oninput="checkForm()">
                <label>Age (must be 18+)</label>
                <i class="material-icons validation-icon" id="icon-age">check_circle</i>
            </div>
            <div class="input-group">
                <input type="text" id="reg-address" required oninput="checkForm()">
                <label>City/State</label>
                <i class="material-icons validation-icon" id="icon-address">check_circle</i>
            </div>
            <button class="btn" id="btn-reg-submit" style="width: 100%; margin:0;" onclick="submitRegistration()">Generate Voter ID</button>
            <button class="btn" style="width: 100%; margin:15px 0 0 0; background: #95a5a6; box-shadow: 0 4px 0 #7f8c8d;" onclick="closeOverlays()">Cancel</button>
        </div>
    </div>

    <!-- Voter ID Card -->
    <div id="overlay-idcard" class="overlay">
        <div id="voter-id-card">
            <div class="epic-stripe"></div>
            <div class="epic-watermark">☸️</div>
            <div class="valid-badge">VALID VOTER</div>
            <div style="text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px; margin-top: 10px;">
                <span style="font-size: 14px; font-weight: 800;">ELECTION COMMISSION OF INDIA 🇮🇳</span>
            </div>
            <div style="display: flex; align-items: center;">
                <div style="font-size: 50px; margin-right: 20px;">🧑</div>
                <div style="font-size: 14px; line-height: 1.6;">
                    EPIC: <span id="id-epic" style="font-weight: bold; color: #1A2980;"></span><br>
                    Name: <span id="id-name" style="font-weight: bold;"></span><br>
                    Age: <span id="id-age"></span><br>
                    State: <span style="font-weight: bold;">India</span>
                </div>
            </div>
            <button class="btn" style="position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%);" onclick="closeOverlays()">Close [X]</button>
        </div>
    </div>

    <!-- EVM UI -->
    <div id="overlay-evm" class="overlay">
        <div id="evm-ui">
            <h2 style="text-align: center; border-bottom: 2px solid #555; padding-bottom: 15px; margin-bottom: 20px;">🗳️🇮🇳 ELECTRONIC VOTING MACHINE</h2>
            <div id="evm-candidates">
                <!-- Populated dynamically -->
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #aaa;">
                Use <strong>↑ / ↓</strong> arrows to select. Press <strong>ENTER</strong> to vote.
            </div>
        </div>
        <div id="vvpat-slip"></div>
    </div>

    <!-- Leaderboard -->
    <div id="overlay-leaderboard" class="overlay">
        <div id="form-popup" style="width: 500px; text-align: center;">
            <h2 style="margin-bottom: 20px; color: #FF9933; font-size: 24px;">🏆 LEADERBOARD 🏆</h2>
            <div id="leaderboard-list" style="margin-bottom: 25px;">
                Loading...
            </div>
            <div class="input-group" id="lb-input-group" style="display:none; text-align: left;">
                <input type="text" id="lb-name" required maxlength="15">
                <label>Enter your name</label>
            </div>
            <button class="btn" id="lb-submit" style="width: 100%; margin:0; display:none;" onclick="submitScore()">Submit Score</button>
            <button class="btn" style="width: 100%; margin:15px 0 0 0; background: #95a5a6; box-shadow: 0 4px 0 #7f8c8d;" onclick="closeOverlays()">Close [ESC]</button>
        </div>
    </div>

    <!-- Report overlay -->
    <div id="overlay-report" class="overlay">
        <div id="report-content-wrapper" style="width: 80%; max-width: 800px; max-height: 80%; display: flex; flex-direction: column; align-items: center;">
            <div id="report-content">
                <div class="report-header">
                    <h2 style="color: #1A2980; margin: 0;">VOTER EDUCATION CERTIFICATE</h2>
                </div>
                <div id="report-text" class="shimmer-text" style="font-size: 18px; text-align: center; font-weight: bold; padding: 40px;">
                    Generating your personalized Voter Education Report...
                </div>
            </div>
            <div style="margin-top: 20px; display: flex; gap: 15px;">
                <button class="btn" id="btn-download" style="display:none; background: #3498db; box-shadow: 0 4px 0 #2980b9;" onclick="downloadReport()"><i class="material-icons">download</i> Download</button>
                <button class="btn" style="background: #95a5a6; box-shadow: 0 4px 0 #7f8c8d;" onclick="closeOverlays()">Close</button>
            </div>
        </div>
    </div>

    """

content = content[:body_start] + new_body + content[body_end:]

# Now JS changes:
# 1. formatTime to update timer color
js_update_1_old = """        function startTimer() {
            timerInterval = setInterval(() => {
                timeInSeconds++;
                document.getElementById('timer-panel').innerText = formatTime(timeInSeconds);
            }, 1000);
        }"""

js_update_1_new = """        function startTimer() {
            timerInterval = setInterval(() => {
                timeInSeconds++;
                document.getElementById('timer-text').innerText = formatTime(timeInSeconds);
                if (timeInSeconds > 180) {
                    document.getElementById('timer-panel').classList.add('timer-urgent');
                }
            }, 1000);
        }"""
content = content.replace(js_update_1_old, js_update_1_new)

# 2. updateQuestUI
js_update_2_old = """        function updateQuestUI() {
            const q = quests[currentQuest];
            if (!q) {
                document.getElementById('quest-panel').style.display = 'none';
                return;
            }
            
            document.getElementById('quest-panel').style.display = 'block';
            document.getElementById('quest-title').innerText = `QUEST ${currentQuest}: ${q.title}`;
            
            const ul = document.getElementById('quest-steps');
            ul.innerHTML = '';
            
            let foundActive = false;
            q.steps.forEach(step => {
                const li = document.createElement('li');
                li.className = 'quest-step';
                li.innerText = step.text;
                
                if (step.completed) {
                    li.classList.add('completed');
                } else if (!foundActive) {
                    li.classList.add('active');
                    foundActive = true;
                }
                
                ul.appendChild(li);
            });
        }"""

js_update_2_new = """        function updateQuestUI() {
            const q = quests[currentQuest];
            if (!q) {
                document.getElementById('quest-panel').style.display = 'none';
                return;
            }
            
            document.getElementById('quest-panel').style.display = 'block';
            document.getElementById('quest-title').innerText = `QUEST ${currentQuest}: ${q.title}`;
            
            const ul = document.getElementById('quest-steps');
            ul.innerHTML = '';
            
            let foundActive = false;
            let completedCount = 0;
            q.steps.forEach(step => {
                const li = document.createElement('li');
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
                
                li.innerHTML = `<i class="material-icons">${icon}</i> ${step.text}`;
                ul.appendChild(li);
            });
            
            const progress = (completedCount / q.steps.length) * 100;
            document.getElementById('quest-progress-bar').style.width = `${progress}%`;
        }"""
content = content.replace(js_update_2_old, js_update_2_new)

# 3. showDialogue (add color border logic and reset thinking state)
js_update_3_old = """        function showDialogue(name, text) {
            dialogueQueue.push({name, text});
            if (gameState !== 'DIALOGUE') {
                gameState = 'DIALOGUE';
                playDialogue();
            }
        }"""

js_update_3_new = """        function showDialogue(name, text) {
            dialogueQueue.push({name, text});
            if (gameState !== 'DIALOGUE') {
                gameState = 'DIALOGUE';
                playDialogue();
            }
        }

        function updateDialogueColors(name) {
            const box = document.getElementById('dialogue-box');
            const nameTag = document.getElementById('dialogue-name');
            if (name === 'System') {
                box.style.borderLeftColor = '#3498db';
                nameTag.style.background = '#3498db';
            } else if (name.includes('Hint')) {
                box.style.borderLeftColor = '#f1c40f';
                nameTag.style.background = '#f1c40f';
                nameTag.style.color = '#333';
            } else {
                box.style.borderLeftColor = '#e74c3c';
                nameTag.style.background = '#e74c3c';
                nameTag.style.color = '#fff';
            }
        }"""
content = content.replace(js_update_3_old, js_update_3_new)

js_update_3_1_old = """        function playDialogue() {
            const d = dialogueQueue[0];
            document.getElementById('dialogue-box').style.display = 'block';
            document.getElementById('dialogue-name').innerText = d.name;
            document.getElementById('dialogue-text').innerHTML = '';
            document.getElementById('dialogue-indicator').style.display = 'none';
            
            isTyping = true;
            let i = 0;
            clearInterval(typeInterval);
            typeInterval = setInterval(() => {
                document.getElementById('dialogue-text').innerHTML += d.text.charAt(i);
                i++;
                if (i >= d.text.length) {
                    clearInterval(typeInterval);
                    isTyping = false;
                    document.getElementById('dialogue-indicator').style.display = 'block';
                }
            }, 30);
        }"""

js_update_3_1_new = """        function playDialogue() {
            const d = dialogueQueue[0];
            document.getElementById('dialogue-box').style.display = 'block';
            document.getElementById('dialogue-name').innerText = d.name;
            document.getElementById('dialogue-text').innerHTML = '';
            document.getElementById('dialogue-indicator').style.display = 'none';
            
            updateDialogueColors(d.name);

            if (d.text === "Thinking...") {
                document.getElementById('dialogue-text').innerHTML = '<span class="shimmer-text">Thinking...</span>';
                isTyping = false;
                return;
            }

            isTyping = true;
            let i = 0;
            clearInterval(typeInterval);
            typeInterval = setInterval(() => {
                document.getElementById('dialogue-text').innerHTML += d.text.charAt(i);
                i++;
                if (i >= d.text.length) {
                    clearInterval(typeInterval);
                    isTyping = false;
                    document.getElementById('dialogue-indicator').style.display = 'block';
                }
            }, 30);
        }"""
content = content.replace(js_update_3_1_old, js_update_3_1_new)

# 4. Form Validation & Animation
js_update_4_new = """        function checkForm() {
            const name = document.getElementById('reg-name').value;
            const age = parseInt(document.getElementById('reg-age').value);
            const address = document.getElementById('reg-address').value;
            
            document.getElementById('icon-name').style.display = name.length > 0 ? 'block' : 'none';
            document.getElementById('icon-age').style.display = age >= 18 ? 'block' : 'none';
            document.getElementById('icon-address').style.display = address.length > 0 ? 'block' : 'none';
        }
        
        function submitRegistration() {"""
content = content.replace("function submitRegistration() {", js_update_4_new)

js_update_4_1_old = """            if (age < 18) {
                alert("You must be 18 or older to register!");
                return;
            }
            
            closeOverlays();
            
            // Generate ID"""
js_update_4_1_new = """            if (age < 18) {
                alert("You must be 18 or older to register!");
                return;
            }
            
            const btn = document.getElementById('btn-reg-submit');
            btn.innerHTML = '<i class="material-icons shimmer-text">sync</i> Generating...';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = 'Generate Voter ID';
                btn.disabled = false;
                closeOverlays();
                
                // Generate ID"""
content = content.replace(js_update_4_1_old, js_update_4_1_new)
content = content.replace("gameState = 'MENU';\n            document.getElementById('overlay-idcard').style.display = 'flex';", "gameState = 'MENU';\n                document.getElementById('overlay-idcard').style.display = 'flex';")

# 5. Leaderboard UI Generation
js_update_5_old = """                        snapshot.forEach(child => {
                            const data = child.val();
                            html += `<li>${data.name} - ${formatTime(data.timeInSeconds)}</li>`;
                        });
                        html += '</ol>';"""
js_update_5_new = """                        let rank = 1;
                        html = '<table class="lb-table"><tr><th>Rank</th><th>Name</th><th>Time</th></tr>';
                        snapshot.forEach(child => {
                            const data = child.val();
                            let medal = rank === 1 ? '🥇' : (rank === 2 ? '🥈' : (rank === 3 ? '🥉' : rank));
                            html += `<tr class="rank-${rank}"><td>${medal}</td><td>${data.name}</td><td>${formatTime(data.timeInSeconds)}</td></tr>`;
                            rank++;
                        });
                        html += '</table>';"""
content = content.replace(js_update_5_old, js_update_5_new)
content = content.replace("document.getElementById('lb-name').style.display = 'block';", "document.getElementById('lb-input-group').style.display = 'block';")
content = content.replace("document.getElementById('lb-name').style.display = 'none';", "document.getElementById('lb-input-group').style.display = 'none';")

# 6. Report generation UI
js_update_6_old = """        async function generateReport() {
            document.getElementById('overlay-report').style.display = 'flex';
            gameState = 'MENU';
            const content = document.getElementById('report-content');
            content.innerHTML = "Generating your personalized Voter Education Report using Vertex AI...";
            
            const prompt = `The player just completed a voting education game in ${formatTime(timeInSeconds)}. They successfully registered, found their polling booth, and cast their vote using an EVM. Generate a personalized, congratulatory 3-paragraph "Voter Education Report" summarizing what they learned about the Indian democratic process. Keep it inspiring and use emojis.`;
            
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const data = await response.json();
                content.innerHTML = data.candidates[0].content.parts[0].text.replace(/\\n/g, '<br>');
            } catch(e) {
                content.innerHTML = "Failed to generate report. But congratulations on completing the game!";
            }
        }"""
js_update_6_new = """        async function generateReport() {
            document.getElementById('overlay-report').style.display = 'flex';
            gameState = 'MENU';
            const content = document.getElementById('report-text');
            content.innerHTML = "Generating your personalized Voter Education Report...";
            content.classList.add('shimmer-text');
            document.getElementById('btn-download').style.display = 'none';
            
            const prompt = `The player just completed a voting education game in ${formatTime(timeInSeconds)}. They successfully registered, found their polling booth, and cast their vote using an EVM. Generate a personalized, congratulatory 3-paragraph "Voter Education Report" summarizing what they learned about the Indian democratic process. Keep it inspiring and use emojis.`;
            
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_API_KEY}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const data = await response.json();
                content.classList.remove('shimmer-text');
                content.style.fontWeight = 'normal';
                content.style.textAlign = 'left';
                content.innerHTML = data.candidates[0].content.parts[0].text.replace(/\\n/g, '<br>');
                document.getElementById('btn-download').style.display = 'block';
            } catch(e) {
                content.classList.remove('shimmer-text');
                content.innerHTML = "Failed to generate report. But congratulations on completing the game!";
            }
        }

        function downloadReport() {
            html2canvas(document.getElementById("report-content")).then(canvas => {
                const link = document.createElement('a');
                link.download = 'Voter_Education_Certificate.png';
                link.href = canvas.toDataURL();
                link.click();
            });
        }"""
content = content.replace(js_update_6_old, js_update_6_new)

# 7. Draw Prompt styling
js_update_7_old = """                    ctx.fillStyle = 'rgba(0,0,0,0.8)';
                    const pX = player.x * tW + tW/2;
                    const pY = player.y * tH - 10;
                    ctx.fillRect(pX - 50, pY - 15, 100, 20);
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.fillText("[ENTER]", pX, pY);"""

js_update_7_new = """                    const pX = player.x * tW + tW/2;
                    const pY = player.y * tH - 15;
                    
                    // Pill background
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.roundRect(pX - 35, pY - 16, 70, 20, 10);
                    ctx.fill();
                    
                    // Border
                    ctx.strokeStyle = '#FF9933';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Text
                    ctx.fillStyle = '#333';
                    ctx.font = 'bold 10px "Nunito", sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText("ENTER", pX, pY - 2);"""
content = content.replace(js_update_7_old, js_update_7_new)


with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Update complete")
