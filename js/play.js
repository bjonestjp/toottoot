import { initAudio, playNote, playFail } from './audio.js';
import { codeToPeerId, PEER_CONFIG } from './room-code.js';

// State
let playerName = '';
let roomCode = '';
let peer = null;
let conn = null;
let assignedNotes = [];
let gameState = 'join'; // join | waiting | playing | win
let audioInitialized = false;

// DOM Elements
const views = {
    join: document.getElementById('join-view'),
    waiting: document.getElementById('waiting-view'),
    playing: document.getElementById('playing-view'),
    win: document.getElementById('win-view')
};

const joinBtn = document.getElementById('join-btn');
const nameInput = document.getElementById('player-name');
const roomInput = document.getElementById('room-code');
const errorMsg = document.getElementById('error-message');
const waitingName = document.getElementById('waiting-name');
const noteContainer = document.getElementById('note-buttons-container');
const failOverlay = document.getElementById('fail-overlay');
const winMessage = document.getElementById('win-message');

// Initialize
function init() {
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        roomInput.value = roomParam.toUpperCase();
    }

    // Try loading saved name
    const savedName = localStorage.getItem('toot-player-name');
    if (savedName) {
        nameInput.value = savedName;
    }

    joinBtn.addEventListener('click', handleJoin);
    
    // Prevent zooming and scrolling
    document.addEventListener('touchmove', (e) => {
        if (e.target.tagName !== 'INPUT') e.preventDefault();
    }, { passive: false });
}

function switchView(viewName) {
    gameState = viewName;
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[viewName]) {
        views[viewName].classList.add('active');
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

function handleJoin() {
    playerName = nameInput.value.trim();
    roomCode = roomInput.value.trim().toUpperCase();

    if (!playerName || !roomCode) {
        showError('Please enter both name and room code');
        return;
    }

    localStorage.setItem('toot-player-name', playerName);
    errorMsg.classList.add('hidden');
    joinBtn.textContent = 'Connecting...';
    joinBtn.disabled = true;

    // Initialize Audio Context on first interaction
    if (!audioInitialized) {
        initAudio();
        audioInitialized = true;
    }

    connectToHost();
}

function connectToHost() {
    if (peer) {
        peer.destroy();
    }

    peer = new Peer(PEER_CONFIG);

    peer.on('open', (id) => {
        const hostId = codeToPeerId(roomCode);
        conn = peer.connect(hostId, { reliable: true });

        conn.on('open', () => {
            // Connected to host
            conn.send({ type: 'join', name: playerName });
            waitingName.textContent = playerName;
            switchView('waiting');
            joinBtn.textContent = 'Join';
            joinBtn.disabled = false;
        });

        conn.on('data', handleMessage);

        conn.on('close', () => {
            showError('Connection to host lost');
            switchView('join');
            conn = null;
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            let msg = 'Connection error: ' + err.message;
            if (err.message && err.message.includes('Negotiation')) {
                msg = 'Connection negotiation failed. Please check that both devices are connected to the internet and tap Join again.';
            }
            showError(msg);
            switchView('join');
            joinBtn.textContent = 'Join';
            joinBtn.disabled = false;
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        let msg = 'Failed to connect: ' + (err.message || err.type);
        if (err.type === 'peer-unavailable') {
            msg = 'Room not found. Check the code on the host screen.';
        }
        showError(msg);
        switchView('join');
        joinBtn.textContent = 'Join';
        joinBtn.disabled = false;
    });
}

function handleMessage(msg) {
    console.log('Received:', msg);
    switch (msg.type) {
        case 'welcome':
            // Logged in successfully
            break;
        case 'assign-notes':
            assignedNotes = msg.notes;
            buildNoteButtons(assignedNotes);
            switchView('playing');
            break;
        case 'note-correct':
            // Optional: subtle pulse effect
            break;
        case 'note-wrong':
            triggerFail();
            break;
        case 'restart':
            failOverlay.classList.remove('show');
            if (gameState === 'win' || gameState === 'fail') {
                 switchView('playing');
            }
            break;
        case 'win':
            winMessage.textContent = `Completed in ${msg.time}s with ${msg.fails} fails!`;
            switchView('win');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
            break;
        case 'player-list':
            // Ignore on player view
            break;
    }
}

function buildNoteButtons(notes) {
    noteContainer.innerHTML = '';
    
    if (notes.length === 0) return;
    
    let layoutClass = `layout-${notes.length}`;
    if (notes.length > 4) layoutClass = 'layout-more';
    
    noteContainer.className = layoutClass;
    
    // Check for duplicate letters across octaves
    const letterCounts = {};
    notes.forEach(note => {
        const letter = note.replace(/[0-9]/g, '');
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    });

    notes.forEach(note => {
        const btn = document.createElement('button');
        btn.className = 'note-btn';
        
        // Determine display name
        const letter = note.replace(/[0-9]/g, '');
        const octave = parseInt(note.replace(/[^0-9]/g, ''), 10) || 4;
        
        if (letterCounts[letter] > 1) {
            btn.textContent = octave > 4 ? `high ${letter}` : (octave < 4 ? `low ${letter}` : letter);
            btn.style.fontSize = '32px'; // Smaller font for longer text
        } else {
            btn.textContent = letter;
        }
        
        // CSS variable based color mapping
        let colorVarName = `--note-${letter.toLowerCase().replace('#', 's')}`;
        if (note === 'C5') {
            colorVarName = '--note-c5';
        }
        btn.style.backgroundColor = `var(${colorVarName}, #888)`;
        
        // Touch events
        const pressHandler = (e) => {
            e.preventDefault(); // Prevent click delay and double tap
            if (!audioInitialized) {
                initAudio();
                audioInitialized = true;
            }
            
            // Visual feedback
            btn.classList.add('active');
            
            // Haptic
            if (navigator.vibrate) navigator.vibrate(50);
            
            // Audio
            playNote(note);
            
            // Network
            if (conn && conn.open) {
                conn.send({ type: 'note', note: note });
            }
        };

        const releaseHandler = (e) => {
            e.preventDefault();
            btn.classList.remove('active');
        };

        btn.addEventListener('touchstart', pressHandler, { passive: false });
        btn.addEventListener('touchend', releaseHandler, { passive: false });
        btn.addEventListener('touchcancel', releaseHandler, { passive: false });
        
        // Mouse fallbacks for desktop testing
        btn.addEventListener('mousedown', pressHandler);
        btn.addEventListener('mouseup', releaseHandler);
        btn.addEventListener('mouseleave', releaseHandler);

        noteContainer.appendChild(btn);
    });
}

function triggerFail() {
    failOverlay.classList.remove('show');
    // Trigger reflow
    void failOverlay.offsetWidth;
    failOverlay.classList.add('show');
    
    playFail();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    
    setTimeout(() => {
        failOverlay.classList.remove('show');
    }, 400);
}

// Start
document.addEventListener('DOMContentLoaded', init);
