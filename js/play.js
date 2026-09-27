import { initAudio, playNote, startNote, stopNote, playFail } from './audio.js?v=7';
import { PlayerTransport } from './transport.js?v=7';

// State
let playerName = '';
let roomCode = '';
let transport = null;
let assignedNotes = [];
let gameState = 'join'; // join | waiting | playing | win
let audioInitialized = false;
let isConductor = false;
let startingNote = null;
let conductorName = '';
let currentSongName = '';
let currentSongEmoji = '🎵';
let subMode = 'practice'; // practice | performance

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
const playerSongTitle = document.getElementById('player-song-title');
const playerSongEmoji = document.getElementById('player-song-emoji');
const playerModeBadge = document.getElementById('player-mode-badge');
const startingNoteBanner = document.getElementById('starting-note-banner');
const conductorControls = document.getElementById('conductor-controls');
const btnStartPerformance = document.getElementById('btn-start-performance');
const countdownOverlay = document.getElementById('countdown-overlay');
const playerCountdownText = document.getElementById('player-countdown-text');

// Initialize
function init() {
    // Check URL params
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
        roomInput.value = roomParam.toLowerCase();
    }

    // Try loading saved name
    const savedName = localStorage.getItem('toot-player-name');
    if (savedName) {
        nameInput.value = savedName.toLowerCase();
    }

    joinBtn.addEventListener('click', handleJoin);
    
    if (btnStartPerformance) {
        btnStartPerformance.addEventListener('click', () => {
            if (transport) {
                transport.sendToHost({ type: 'start-performance' });
            }
        });
    }
    
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
    playerName = nameInput.value.trim().toLowerCase();
    roomCode = roomInput.value.trim().toLowerCase();

    if (!playerName || !roomCode) {
        showError('please enter both name and room code');
        return;
    }

    localStorage.setItem('toot-player-name', playerName);
    errorMsg.classList.add('hidden');
    joinBtn.textContent = 'connecting...';
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
            joinBtn.textContent = 'join';
            joinBtn.disabled = false;
        },
        onError: (err) => {
            console.error('Connection error:', err);
            showError('unable to connect to game room. please check connection and try again.');
            switchView('join');
            joinBtn.textContent = 'join';
            joinBtn.disabled = false;
        }
    });
}

function updateModeUI() {
    if (subMode === 'practice') {
        if (playerModeBadge) {
            playerModeBadge.className = 'player-mode-badge badge-rehearsal';
            playerModeBadge.textContent = 'rehearsal';
        }
        if (startingNoteBanner) {
            if (isConductor) {
                startingNoteBanner.className = 'starting-banner is-conductor';
                startingNoteBanner.textContent = '🌟 you play the first note!';
                startingNoteBanner.classList.remove('hidden');
            } else {
                startingNoteBanner.className = 'starting-banner';
                startingNoteBanner.textContent = conductorName ? `waiting for ${conductorName.toLowerCase()} to play note 1...` : 'listen for the first note...';
                startingNoteBanner.classList.remove('hidden');
            }
        }
        if (conductorControls) {
            if (isConductor) {
                conductorControls.classList.remove('hidden');
            } else {
                conductorControls.classList.add('hidden');
            }
        }
    } else {
        if (playerModeBadge) {
            playerModeBadge.className = 'player-mode-badge badge-performance';
            playerModeBadge.textContent = 'showtime';
        }
        if (startingNoteBanner) startingNoteBanner.classList.add('hidden');
        if (conductorControls) conductorControls.classList.add('hidden');
        removeStartingNoteHighlights();
    }
}

function removeStartingNoteHighlights() {
    if (!noteContainer) return;
    noteContainer.querySelectorAll('.note-btn').forEach(btn => {
        btn.classList.remove('starting-note');
        const badge = btn.querySelector('.first-badge');
        if (badge) badge.remove();
    });
}

function handleMessage(msg) {
    console.log('Received:', msg);
    switch (msg.type) {
        case 'welcome':
            // Logged in successfully
            break;
        case 'assign-notes':
            assignedNotes = msg.notes || [];
            isConductor = !!msg.isConductor;
            startingNote = msg.startingNote || null;
            conductorName = msg.conductorName || '';
            currentSongName = msg.songName || '';
            currentSongEmoji = msg.songEmoji || '🎵';
            subMode = msg.subMode || 'practice';

            if (playerSongTitle) playerSongTitle.textContent = currentSongName;
            if (playerSongEmoji) playerSongEmoji.textContent = currentSongEmoji;
            updateModeUI();

            buildNoteButtons(assignedNotes);
            switchView('playing');
            break;
        case 'performance-countdown':
            if (countdownOverlay) {
                countdownOverlay.classList.remove('hidden');
                let count = 3;
                if (playerCountdownText) playerCountdownText.textContent = count;
                const countInterval = setInterval(() => {
                    count--;
                    if (count > 0) {
                        if (playerCountdownText) playerCountdownText.textContent = count;
                    } else if (count === 0) {
                        if (playerCountdownText) playerCountdownText.textContent = 'go!';
                    } else {
                        clearInterval(countInterval);
                        countdownOverlay.classList.add('hidden');
                        subMode = 'performance';
                        updateModeUI();
                    }
                }, 1000);
            }
            break;
        case 'performance-started':
            if (countdownOverlay) countdownOverlay.classList.add('hidden');
            subMode = 'performance';
            updateModeUI();
            break;
        case 'note-correct':
            if (msg.subMode) subMode = msg.subMode;
            if (subMode === 'practice' && msg.progress > 0 && !isConductor) {
                if (startingNoteBanner) {
                    startingNoteBanner.textContent = `practicing ${currentSongName.toLowerCase()}...`;
                }
            }
            break;
        case 'note-wrong':
            triggerFail();
            break;
        case 'restart':
            failOverlay.classList.remove('show');
            if (countdownOverlay) countdownOverlay.classList.add('hidden');
            if (gameState === 'win' || gameState === 'fail') {
                 switchView('playing');
            }
            break;
        case 'win':
            if (countdownOverlay) countdownOverlay.classList.add('hidden');
            winMessage.textContent = `completed in ${msg.time}s with ${msg.fails} fails!`;
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
        let displayName = letter.toLowerCase();
        let isCompoundLabel = false;
        
        if (letterCounts[letter] > 1) {
            const playerOctaves = notes
                .filter(n => n.replace(/[0-9]/g, '') === letter)
                .map(n => parseInt(n.replace(/[^0-9]/g, ''), 10) || 4)
                .sort((a, b) => a - b);
            const minOct = playerOctaves[0];
            const maxOct = playerOctaves[playerOctaves.length - 1];

            if (octave === minOct) {
                displayName = `low ${letter.toLowerCase()}`;
                isCompoundLabel = true;
            } else if (octave === maxOct) {
                displayName = `high ${letter.toLowerCase()}`;
                isCompoundLabel = true;
            } else {
                displayName = letter.toLowerCase();
            }
        }
        
        const labelSpan = document.createElement('span');
        labelSpan.className = 'note-label';
        labelSpan.textContent = displayName;
        if (isCompoundLabel) labelSpan.style.fontSize = '32px';
        btn.appendChild(labelSpan);

        // Highlight starting note if conductor in practice mode
        if (isConductor && note === startingNote && subMode === 'practice') {
            btn.classList.add('starting-note');
            const badge = document.createElement('span');
            badge.className = 'first-badge';
            badge.textContent = '1st';
            btn.appendChild(badge);
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
