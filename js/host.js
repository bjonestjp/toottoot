import { initAudio, playNote, startNote, stopNote, playSuccess, playFail } from './audio.js?v=7';
import { songs, getSongById, getRandomSong, getUniqueNotes, DIFFICULTY_LEVELS, getSongsByDifficulty, getNextSongAtDifficulty, hasNextDifficulty } from './songs.js?v=7';
import { generateRoomCode } from './room-code.js?v=7';
import { HostTransport } from './transport.js?v=7';

// DOM Elements
const views = {
    lobby: document.getElementById('view-lobby'),
    countdown: document.getElementById('view-countdown'),
    playing: document.getElementById('view-playing'),
    fail: document.getElementById('view-fail'),
    win: document.getElementById('view-win')
};

const elRoomCode = document.getElementById('room-code');
const elQrCodeContainer = document.getElementById('qr-code-container');
const elJoinUrl = document.getElementById('join-url');
const elPlayerList = document.getElementById('player-list');
const elPlayerCount = document.getElementById('player-count');
const elDifficultyChips = document.getElementById('difficulty-chips');
const elDifficultyPreview = document.getElementById('difficulty-preview');
const btnStartGame = document.getElementById('btn-start-game');
const elCountdownTitle = document.getElementById('countdown-title');
const elCountdownNumber = document.getElementById('countdown-number');
const elModeBadge = document.getElementById('mode-badge');
const elConductorDisplay = document.getElementById('conductor-display');
const elConductorName = document.getElementById('conductor-name');
const elSongTitle = document.getElementById('song-title');
const elSongEmoji = document.getElementById('song-emoji');
const elProgressDots = document.getElementById('progress-dots');
const elStatFails = document.getElementById('stat-fails');
const elFailCountDisplay = document.getElementById('fail-count-display');
const elStatTimer = document.getElementById('stat-timer');
const elTimerDisplay = document.getElementById('timer-display');
const elRehearsalPrompt = document.getElementById('rehearsal-prompt');
const btnHostStartPerformance = document.getElementById('btn-host-start-performance');
const elWinTime = document.getElementById('win-time');
const elWinFails = document.getElementById('win-fails');
const elWinActions = document.getElementById('win-actions');

// State
let gameState = 'lobby'; // lobby | countdown | playing | fail | win
let subMode = 'practice'; // 'practice' | 'performance'
let roomCode = '';
let transport = null;
let players = []; // { id, name, assignedNotes }
let conductorId = null;
let startingNote = null;
let conductorName = '';
let selectedDifficulty = 1; // 1 to 5
let playedSongIds = new Set();
let currentSong = null;
let progress = 0; // index into currentSong.notes[]
let failCount = 0;
let startTime = null;
let timerInterval = null;
let activeHostNoteHandle = null; // sustained note on host speaker

// Initialize
function init() {
    roomCode = generateRoomCode();
    
    // UI updates
    elRoomCode.textContent = roomCode.toLowerCase();
    
    // Correct URL resolving relative to current page location (works on GitHub Pages and localhost)
    const playUrl = new URL('play.html', window.location.href).href;
    if (elJoinUrl) elJoinUrl.textContent = playUrl;
    
    // Generate QR Code
    if (typeof qrcode !== 'undefined' && elQrCodeContainer) {
        const qr = qrcode(0, 'M');
        qr.addData(`${playUrl}?room=${roomCode}`);
        qr.make();
        elQrCodeContainer.innerHTML = qr.createImgTag(4, 8);
    }

    renderDifficultySelector();

    // Connect Host WebSocket Transport
    if (transport) transport.destroy();
    transport = new HostTransport(roomCode, {
        onPlayerMessage: (playerId, data) => handlePlayerMessage(playerId, data),
        onReady: () => {
            console.log('Host connected to room:', roomCode);
        },
        onError: (err) => {
            console.error('Host connection error:', err);
        }
    });

    btnStartGame.addEventListener('click', () => startGame());
    if (btnHostStartPerformance) {
        btnHostStartPerformance.addEventListener('click', () => {
            startPerformanceCountdown();
        });
    }
    
    // Pre-init audio context on user interaction
    document.body.addEventListener('click', () => {
        initAudio();
    }, { once: true });
}

function renderDifficultySelector() {
    if (!elDifficultyChips) return;
    elDifficultyChips.innerHTML = DIFFICULTY_LEVELS.map(d => `
        <button class="difficulty-chip ${d.level === selectedDifficulty ? 'active' : ''}" data-level="${d.level}">
            ${d.name}
        </button>
    `).join('');

    updateDifficultyPreview();

    elDifficultyChips.querySelectorAll('.difficulty-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            selectedDifficulty = parseInt(chip.dataset.level, 10);
            elDifficultyChips.querySelectorAll('.difficulty-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            updateDifficultyPreview();
        });
    });
}

function updateDifficultyPreview() {
    if (!elDifficultyPreview) return;
    const levelSongs = getSongsByDifficulty(selectedDifficulty);
    const songNames = levelSongs.map(s => s.name.toLowerCase()).join(', ');
    const diffInfo = DIFFICULTY_LEVELS.find(d => d.level === selectedDifficulty);
    elDifficultyPreview.textContent = `${diffInfo.description} • songs: ${songNames}`;
}

function switchView(viewName) {
    gameState = viewName;
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
}

function handlePlayerMessage(playerId, data) {
    if (data.type === 'join') {
        let player = players.find(p => p.id === playerId);
        if (!player) {
            player = {
                id: playerId,
                name: data.name,
                assignedNotes: []
            };
            players.push(player);
            updatePlayerList();
            
            // Send welcome
            transport.sendToPlayer(playerId, {
                type: 'welcome',
                playerId: playerId,
                playerName: data.name
            });
            
            // Broadcast player list to everyone
            broadcastPlayerList();
        }
    } else if (data.type === 'note-down' || data.type === 'note') {
        handleNoteDown(playerId, data.note);
    } else if (data.type === 'note-up') {
        handleNoteUp(playerId, data.note);
    } else if (data.type === 'start-performance') {
        if (subMode === 'practice' && gameState === 'playing') {
            startPerformanceCountdown();
        }
    }
}

function updatePlayerList() {
    if (elPlayerCount) elPlayerCount.textContent = players.length;
    
    if (players.length === 0) {
        elPlayerList.innerHTML = '<div class="waiting-text">waiting for players...</div>';
    } else {
        elPlayerList.innerHTML = players.map(p => 
            `<div class="player-item">${p.name.toLowerCase()}</div>`
        ).join('');
    }
    
    btnStartGame.disabled = players.length < 2;
}

function broadcastPlayerList() {
    const list = players.map(p => ({ id: p.id, name: p.name }));
    broadcast({ type: 'player-list', players: list });
}

function broadcast(msg) {
    if (transport) {
        transport.broadcast(msg);
    }
}

function distributeNotes(uniqueNotes, players) {
    const shuffled = [...uniqueNotes].sort(() => Math.random() - 0.5);
    const assignments = {};
    players.forEach(p => assignments[p.id] = []);
    
    shuffled.forEach((note, i) => {
        const player = players[i % players.length];
        assignments[player.id].push(note);
    });
    
    if (players.length > uniqueNotes.length) {
        players.forEach(p => {
            if (assignments[p.id].length === 0) {
                const randomNote = shuffled[Math.floor(Math.random() * shuffled.length)];
                assignments[p.id].push(randomNote);
            }
        });
    }
    return assignments;
}

function renderProgressDots() {
    elProgressDots.innerHTML = currentSong.notes.map((_, i) => 
        `<div class="dot" id="dot-${i}"></div>`
    ).join('');
}

function updateProgressUI() {
    // Reset all
    for (let i = 0; i < currentSong.notes.length; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) {
            dot.className = 'dot';
            if (i < progress) dot.classList.add('played');
            if (i === progress) dot.classList.add('active');
        }
    }
    elFailCountDisplay.textContent = failCount;
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (gameState !== 'playing') return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const m = Math.floor(elapsed / 60);
        const s = elapsed % 60;
        elTimerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

function setRehearsalUI() {
    if (elModeBadge) {
        elModeBadge.className = 'mode-badge badge-rehearsal';
        elModeBadge.textContent = '🎶 rehearsal (safe practice)';
    }
    if (elConductorDisplay) {
        elConductorDisplay.style.display = 'block';
    }
    if (elConductorName) {
        elConductorName.textContent = conductorName.toLowerCase();
    }
    if (elStatFails) elStatFails.classList.add('hidden');
    if (elStatTimer) elStatTimer.classList.add('hidden');
    if (elRehearsalPrompt) {
        elRehearsalPrompt.classList.remove('hidden');
        elRehearsalPrompt.textContent = 'practice safely with no penalty! when ready, conductor can take the stage.';
    }
    if (btnHostStartPerformance) btnHostStartPerformance.classList.remove('hidden');
}

function setPerformanceUI() {
    if (elModeBadge) {
        elModeBadge.className = 'mode-badge badge-performance';
        elModeBadge.textContent = '🔥 showtime (performance)';
    }
    if (elConductorDisplay) {
        elConductorDisplay.style.display = 'none';
    }
    if (elStatFails) elStatFails.classList.remove('hidden');
    if (elStatTimer) elStatTimer.classList.remove('hidden');
    if (elRehearsalPrompt) elRehearsalPrompt.classList.add('hidden');
    if (btnHostStartPerformance) btnHostStartPerformance.classList.add('hidden');
}

function triggerCorrectPulse() {
    const bg = document.querySelector('.bg-animation');
    if (bg) {
        bg.style.background = 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.4) 0%, rgba(15, 23, 42, 1) 100%)';
        setTimeout(() => {
            bg.style.background = 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)';
        }, 300);
    }
}

function startPerformanceCountdown() {
    if (subMode !== 'practice') return;
    
    if (activeHostNoteHandle) {
        stopNote(activeHostNoteHandle);
        activeHostNoteHandle = null;
    }
    
    // Broadcast countdown to players so they can prepare
    broadcast({ type: 'performance-countdown' });
    
    progress = 0;
    failCount = 0;
    updateProgressUI();
    
    if (elCountdownTitle) elCountdownTitle.textContent = 'showtime in';
    switchView('countdown');
    
    let count = 3;
    elCountdownNumber.textContent = count;
    
    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            elCountdownNumber.textContent = count;
        } else if (count === 0) {
            elCountdownNumber.textContent = 'go!';
        } else {
            clearInterval(countInterval);
            subMode = 'performance';
            setPerformanceUI();
            switchView('playing');
            startTimer();
            broadcast({ type: 'performance-started' });
        }
    }, 1000);
}

function startGame(optionalSong = null) {
    // Need audio context initialized
    initAudio();
    
    // Pick specific song or next song for selected difficulty
    currentSong = optionalSong || getNextSongAtDifficulty(selectedDifficulty, playedSongIds) || getRandomSong(selectedDifficulty);
    playedSongIds.add(currentSong.id);
    
    progress = 0;
    failCount = 0;
    subMode = 'practice';
    if (activeHostNoteHandle) {
        stopNote(activeHostNoteHandle);
        activeHostNoteHandle = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const uniqueNotes = getUniqueNotes(currentSong);
    const assignments = distributeNotes(uniqueNotes, players);
    
    // Identify Conductor & First Note
    const firstNote = currentSong.notes[0];
    startingNote = firstNote;
    const conductor = players.find(p => assignments[p.id] && assignments[p.id].includes(firstNote)) || players[0];
    conductorId = conductor ? conductor.id : (players[0] ? players[0].id : null);
    conductorName = conductor ? conductor.name : 'Conductor';
    
    // Assign to state and send
    players.forEach(p => {
        p.assignedNotes = assignments[p.id] || [];
        const isConductor = (p.id === conductorId);
        transport.sendToPlayer(p.id, {
            type: 'assign-notes',
            notes: p.assignedNotes,
            songName: currentSong.name,
            songEmoji: currentSong.emoji || '🎵',
            difficulty: currentSong.difficulty || selectedDifficulty,
            isConductor: isConductor,
            startingNote: isConductor ? firstNote : null,
            conductorName: conductorName,
            subMode: 'practice'
        });
    });
    
    elSongTitle.textContent = currentSong.name;
    elSongEmoji.textContent = currentSong.emoji || '🎵';
    renderProgressDots();
    updateProgressUI();
    setRehearsalUI();
    
    // Enter Rehearsal Mode immediately
    switchView('playing');
}

function handleNoteDown(playerId, note) {
    if (gameState !== 'playing') return;
    
    const expectedNote = currentSong.notes[progress];
    
    // Is it repeat of previous?
    if (progress > 0 && note === currentSong.notes[progress - 1] && note !== expectedNote) {
        if (activeHostNoteHandle) stopNote(activeHostNoteHandle);
        activeHostNoteHandle = startNote(note);
        return;
    }
    
    if (subMode === 'practice') {
        // --- PRACTICE MODE ---
        if (note === expectedNote) {
            if (activeHostNoteHandle) stopNote(activeHostNoteHandle);
            activeHostNoteHandle = startNote(note);
            progress++;
            
            updateProgressUI();
            broadcast({
                type: 'note-correct',
                progress: progress,
                total: currentSong.notes.length,
                note: note,
                subMode: 'practice'
            });
            
            triggerCorrectPulse();
            
            if (progress === currentSong.notes.length) {
                if (elRehearsalPrompt) {
                    elRehearsalPrompt.textContent = '🎉 Rehearsal complete! Ready for Showtime?';
                }
            }
        } else {
            // Wrong note in Practice: zero penalty audio feedback
            if (activeHostNoteHandle) stopNote(activeHostNoteHandle);
            activeHostNoteHandle = startNote(note);
            
            // Loop practice if whole song was played and first note is tapped again
            if (progress === currentSong.notes.length && note === currentSong.notes[0]) {
                progress = 1;
                updateProgressUI();
                broadcast({
                    type: 'note-correct',
                    progress: progress,
                    total: currentSong.notes.length,
                    note: note,
                    subMode: 'practice'
                });
                triggerCorrectPulse();
            }
        }
    } else {
        // --- PERFORMANCE MODE ---
        if (note === expectedNote) {
            if (activeHostNoteHandle) stopNote(activeHostNoteHandle);
            activeHostNoteHandle = startNote(note);
            progress++;
            
            updateProgressUI();
            broadcast({
                type: 'note-correct',
                progress: progress,
                total: currentSong.notes.length,
                note: note,
                subMode: 'performance'
            });
            
            triggerCorrectPulse();
            
            if (progress === currentSong.notes.length) {
                handleWin();
            }
        } else {
            handleFail();
        }
    }
}

function handleNoteUp(playerId, note) {
    if (activeHostNoteHandle && activeHostNoteHandle.noteName === note) {
        stopNote(activeHostNoteHandle);
        activeHostNoteHandle = null;
    }
}

function handleFail() {
    if (activeHostNoteHandle) {
        stopNote(activeHostNoteHandle);
        activeHostNoteHandle = null;
    }
    playFail();
    failCount++;
    progress = 0;
    
    broadcast({ type: 'note-wrong' });
    
    switchView('fail');
    
    setTimeout(() => {
        broadcast({ type: 'restart' });
        updateProgressUI();
        setPerformanceUI();
        switchView('playing');
    }, 2000);
}

function handleWin() {
    if (activeHostNoteHandle) {
        stopNote(activeHostNoteHandle);
        activeHostNoteHandle = null;
    }
    clearInterval(timerInterval);
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
    
    playSuccess();
    
    elWinTime.textContent = `${timeTaken}s`;
    elWinFails.textContent = failCount;
    
    broadcast({
        type: 'win',
        time: parseFloat(timeTaken),
        fails: failCount
    });
    
    renderWinProgressionActions();
    switchView('win');
}

function renderWinProgressionActions() {
    if (!elWinActions) return;
    elWinActions.innerHTML = '';

    // Check if another song exists at this difficulty (excluding current one)
    const nextSongSameDiff = getNextSongAtDifficulty(selectedDifficulty, playedSongIds, currentSong.id);
    if (nextSongSameDiff && nextSongSameDiff.id !== currentSong.id) {
        const btnSame = document.createElement('button');
        btnSame.className = 'btn-primary';
        btnSame.textContent = `play next: ${nextSongSameDiff.name.toLowerCase()}`;
        btnSame.addEventListener('click', () => {
            startGame(nextSongSameDiff);
        });
        elWinActions.appendChild(btnSame);
    } else {
        // Replay option if all songs at this difficulty were played
        const btnReplay = document.createElement('button');
        btnReplay.className = 'btn-primary';
        btnReplay.textContent = `replay ${currentSong.name.toLowerCase()}`;
        btnReplay.addEventListener('click', () => {
            startGame(currentSong);
        });
        elWinActions.appendChild(btnReplay);
    }

    // Level up option if next difficulty exists
    if (hasNextDifficulty(selectedDifficulty)) {
        const nextLevel = selectedDifficulty + 1;
        const nextDiff = DIFFICULTY_LEVELS.find(d => d.level === nextLevel);
        const btnLevelUp = document.createElement('button');
        btnLevelUp.className = 'btn-primary btn-level-up';
        btnLevelUp.textContent = `level up: ${nextDiff.name} 🚀`;
        btnLevelUp.addEventListener('click', () => {
            selectedDifficulty = nextLevel;
            renderDifficultySelector();
            startGame();
        });
        elWinActions.appendChild(btnLevelUp);
    }

    // Return to Lobby button
    const btnLobby = document.createElement('button');
    btnLobby.className = 'btn-secondary-action';
    btnLobby.textContent = 'change difficulty / lobby';
    btnLobby.addEventListener('click', resetToLobby);
    elWinActions.appendChild(btnLobby);
}

function resetToLobby() {
    if (activeHostNoteHandle) {
        stopNote(activeHostNoteHandle);
        activeHostNoteHandle = null;
    }
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    subMode = 'practice';
    progress = 0;
    failCount = 0;
    renderDifficultySelector();
    switchView('lobby');
    broadcast({ type: 'restart' });
}

// Start
document.addEventListener('DOMContentLoaded', init);
