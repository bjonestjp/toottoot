import { initAudio, playNote, startNote, stopNote, playFail } from './audio.js?v=4';
import { PlayerTransport } from './transport.js?v=4';

// State
let playerName = '';
let roomCode = '';
let transport = null;
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
    if (transport) {
        transport.destroy();
    }

    transport = new PlayerTransport(roomCode, playerName, {
        onMessage: handleMessage,
        onReady: (myId) => {
            console.log('Connected to host as', myId);
            waitingName.textContent = playerName;
            switchView('waiting');
            joinBtn.textContent = 'Join';
            joinBtn.disabled = false;
        },
        onError: (err) => {
            console.error('Connection error:', err);
            showError('Unable to connect to game room. Please check connection and try again.');
            switchView('join');
            joinBtn.textContent = 'Join';
            joinBtn.disabled = false;
        }
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
        
        // Touch / Click events with hold sustain
        let activeNoteHandle = null;

        const pressHandler = (e) => {
            e.preventDefault(); // Prevent click delay and double tap
            if (!audioInitialized) {
                initAudio();
                audioInitialized = true;
            }
            
            // Visual feedback
            btn.classList.add('active');
            
            // Haptic
            if (navigator.vibrate) navigator.vibrate(40);
            
            // Start audio locally
            if (activeNoteHandle) {
                stopNote(activeNoteHandle);
            }
            activeNoteHandle = startNote(note);
            
            // Network
            if (transport) {
                transport.sendToHost({ type: 'note-down', note: note });
            }
        };

        const releaseHandler = (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            
            // Stop audio locally
            if (activeNoteHandle) {
                stopNote(activeNoteHandle);
                activeNoteHandle = null;
            }

            // Network
            if (transport) {
                transport.sendToHost({ type: 'note-up', note: note });
            }
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
