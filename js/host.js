import { initAudio, playNote, playSuccess, playFail } from './audio.js';
import { songs, getSongById, getRandomSong, getUniqueNotes } from './songs.js';
import { generateRoomCode, codeToPeerId, peerIdToCode } from './room-code.js';

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
const btnStartGame = document.getElementById('btn-start-game');
const elCountdownNumber = document.getElementById('countdown-number');
const elSongTitle = document.getElementById('song-title');
const elSongEmoji = document.getElementById('song-emoji');
const elProgressDots = document.getElementById('progress-dots');
const elFailCountDisplay = document.getElementById('fail-count-display');
const elTimerDisplay = document.getElementById('timer-display');
const elWinTime = document.getElementById('win-time');
const elWinFails = document.getElementById('win-fails');
const btnNextSong = document.getElementById('btn-next-song');

// State
let gameState = 'lobby'; // lobby | countdown | playing | fail | win
let roomCode = '';
let peer = null;
let players = []; // { id, name, conn, assignedNotes }
let currentSong = null;
let progress = 0; // index into currentSong.notes[]
let failCount = 0;
let startTime = null;
let timerInterval = null;

// Initialize
function init() {
    roomCode = generateRoomCode();
    const peerId = codeToPeerId(roomCode);
    
    // UI updates
    elRoomCode.textContent = roomCode;
    
    const playUrl = `${window.location.origin}/play.html`;
    elJoinUrl.textContent = playUrl;
    
    // Generate QR Code
    if (typeof qrcode !== 'undefined') {
        const qr = qrcode(0, 'M');
        qr.addData(`${playUrl}?room=${roomCode}`);
        qr.make();
        elQrCodeContainer.innerHTML = qr.createImgTag(5, 10);
    }

    // Init PeerJS
    peer = new Peer(peerId);
    
    peer.on('open', (id) => {
        console.log('Host peer open with ID:', id);
    });

    peer.on('connection', (conn) => {
        conn.on('data', (data) => handlePlayerMessage(conn, data));
        
        conn.on('close', () => {
            players = players.filter(p => p.id !== conn.peer);
            updatePlayerList();
        });
    });

    btnStartGame.addEventListener('click', startGame);
    btnNextSong.addEventListener('click', resetToLobby);
    
    // Pre-init audio context on user interaction
    document.body.addEventListener('click', () => {
        initAudio();
    }, { once: true });
}

function switchView(viewName) {
    gameState = viewName;
    Object.values(views).forEach(v => v.classList.remove('active'));
    views[viewName].classList.add('active');
}

function handlePlayerMessage(conn, data) {
    if (data.type === 'join') {
        const existing = players.find(p => p.id === conn.peer);
        if (!existing) {
            players.push({
                id: conn.peer,
                name: data.name,
                conn: conn,
                assignedNotes: []
            });
            updatePlayerList();
            
            // Send welcome
            conn.send({
                type: 'welcome',
                playerId: conn.peer,
                playerName: data.name
            });
            
            // Broadcast player list to everyone
            broadcastPlayerList();
        }
    } else if (data.type === 'note') {
        handleNotePlayed(conn.peer, data.note);
    }
}

function updatePlayerList() {
    elPlayerCount.textContent = players.length;
    
    if (players.length === 0) {
        elPlayerList.innerHTML = '<div class="waiting-text">Waiting for players...</div>';
    } else {
        elPlayerList.innerHTML = players.map(p => 
            `<div class="player-card">${p.name}</div>`
        ).join('');
    }
    
    btnStartGame.disabled = players.length < 2;
}

function broadcastPlayerList() {
    const list = players.map(p => ({ id: p.id, name: p.name }));
    broadcast({ type: 'player-list', players: list });
}

function broadcast(msg) {
    players.forEach(p => {
        if (p.conn && p.conn.open) {
            p.conn.send(msg);
        }
    });
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

function startGame() {
    // Need audio context initialized
    initAudio();
    
    currentSong = getRandomSong();
    progress = 0;
    failCount = 0;
    
    const uniqueNotes = getUniqueNotes(currentSong);
    const assignments = distributeNotes(uniqueNotes, players);
    
    // Assign to state and send
    players.forEach(p => {
        p.assignedNotes = assignments[p.id] || [];
        if (p.conn && p.conn.open) {
            p.conn.send({
                type: 'assign-notes',
                notes: p.assignedNotes,
                songName: currentSong.name,
                songEmoji: currentSong.emoji || '🎵',
                difficulty: currentSong.difficulty || 1
            });
        }
    });
    
    elSongTitle.textContent = currentSong.name;
    elSongEmoji.textContent = currentSong.emoji || '🎵';
    renderProgressDots();
    updateProgressUI();
    
    // Countdown
    switchView('countdown');
    let count = 3;
    elCountdownNumber.textContent = count;
    
    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            elCountdownNumber.textContent = count;
        } else if (count === 0) {
            elCountdownNumber.textContent = 'GO!';
        } else {
            clearInterval(countInterval);
            switchView('playing');
            startTimer();
        }
    }, 1000);
}

function handleNotePlayed(playerId, note) {
    if (gameState !== 'playing') return;
    
    const expectedNote = currentSong.notes[progress];
    
    // Is it repeat of previous?
    if (progress > 0 && note === currentSong.notes[progress - 1] && note !== expectedNote) {
        // Just play sound, no penalty
        playNote(note);
        return;
    }
    
    if (note === expectedNote) {
        // Correct
        playNote(note);
        progress++;
        
        updateProgressUI();
        broadcast({
            type: 'note-correct',
            progress: progress,
            total: currentSong.notes.length,
            note: note
        });
        
        // Background pulse
        const bg = document.querySelector('.bg-animation');
        bg.style.background = 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.4) 0%, rgba(15, 23, 42, 1) 100%)';
        setTimeout(() => {
            bg.style.background = 'radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 1) 0%, rgba(15, 23, 42, 1) 100%)';
        }, 300);
        
        if (progress === currentSong.notes.length) {
            handleWin();
        }
    } else {
        // Wrong
        handleFail();
    }
}

function handleFail() {
    playFail();
    failCount++;
    progress = 0;
    
    broadcast({ type: 'note-wrong' });
    
    switchView('fail');
    
    setTimeout(() => {
        broadcast({ type: 'restart' });
        updateProgressUI();
        switchView('playing');
    }, 2000);
}

function handleWin() {
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
    
    switchView('win');
}

function resetToLobby() {
    switchView('lobby');
    broadcast({ type: 'restart' });
}

// Start
document.addEventListener('DOMContentLoaded', init);
