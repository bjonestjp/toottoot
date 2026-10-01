import { initAudio, playNote, startNote, stopNote, playFail } from './audio.js?v=9';
import { PlayerTransport } from './transport.js?v=9';
import { SEQUENCER_NOTES, encodeSongToCode, decodeSongFromCode, buildCustomSong } from './songs.js?v=9';

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

// Sequencer State
let seqNotes = [];        // current sequence (note names + 'REST')
let seqName = '';         // song name
let seqBpm = 120;
let seqTimeSig = 4;
let isPreviewPlaying = false;
let previewTimeouts = [];

// DOM Elements
const views = {
    join: document.getElementById('join-view'),
    waiting: document.getElementById('waiting-view'),
    playing: document.getElementById('playing-view'),
    win: document.getElementById('win-view'),
    sequencer: document.getElementById('sequencer-view')
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
    
    // Sequencer Listeners
    if (btnCreateTune) {
        btnCreateTune.addEventListener('click', () => {
            switchView('sequencer');
            buildSeqPalette();
        });
    }
    if (btnSeqBack) {
        btnSeqBack.addEventListener('click', () => {
            stopPreview();
            switchView('waiting');
        });
    }
    if (seqBpmSlider) {
        seqBpmSlider.addEventListener('input', (e) => {
            seqBpm = parseInt(e.target.value, 10);
            seqBpmVal.textContent = seqBpm;
        });
    }
    if (btnSeqTimesig) {
        btnSeqTimesig.addEventListener('click', () => {
            seqTimeSig = seqTimeSig === 4 ? 3 : 4;
            btnSeqTimesig.textContent = `${seqTimeSig}/4`;
        });
    }
    if (btnSeqPreview) btnSeqPreview.addEventListener('click', previewSequence);
    if (btnSeqSubmit) btnSeqSubmit.addEventListener('click', submitSong);
    if (btnSeqSave) btnSeqSave.addEventListener('click', saveSongCode);
    if (btnSeqLoad) btnSeqLoad.addEventListener('click', loadSongCode);

    // Prevent zooming and scrolling
    document.addEventListener('touchmove', (e) => {
        if (e.target.tagName !== 'INPUT' && !e.target.closest('#seq-strip')) e.preventDefault();
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
            stopPreview(); // stop sequencer preview if playing
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

const KAZOO_HUE_FILTERS = {
    'c': 'hue-rotate(330deg) saturate(1.1)',
    'c#': 'hue-rotate(345deg)',
    'd': 'hue-rotate(0deg)',
    'd#': 'hue-rotate(20deg) saturate(1.2)',
    'e': 'hue-rotate(38deg) saturate(1.2)',
    'f': 'hue-rotate(95deg) saturate(1.1)',
    'f#': 'hue-rotate(130deg)',
    'g': 'hue-rotate(160deg)',
    'g#': 'hue-rotate(185deg)',
    'a': 'hue-rotate(210deg) saturate(1.1)',
    'a#': 'hue-rotate(235deg)',
    'b': 'hue-rotate(260deg)'
};

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
        btn.className = 'note-btn kazoo-btn';
        
        // Determine pitch and octave display
        const letter = note.replace(/[0-9]/g, '');
        const octave = parseInt(note.replace(/[^0-9]/g, ''), 10) || 4;
        const pitch = letter.toLowerCase();
        let octaveTag = '';
        
        if (letterCounts[letter] > 1) {
            const playerOctaves = notes
                .filter(n => n.replace(/[0-9]/g, '') === letter)
                .map(n => parseInt(n.replace(/[^0-9]/g, ''), 10) || 4)
                .sort((a, b) => a - b);
            const minOct = playerOctaves[0];
            const maxOct = playerOctaves[playerOctaves.length - 1];

            if (octave === minOct) {
                octaveTag = 'low';
            } else if (octave === maxOct) {
                octaveTag = 'high';
            }
        }

        // Set hue filter
        let filterValue = KAZOO_HUE_FILTERS[pitch] || 'hue-rotate(0deg)';
        if (note === 'C5') {
            filterValue = 'hue-rotate(295deg)';
        }
        btn.style.setProperty('--kazoo-filter', filterValue);

        // Build Kazoo wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'kazoo-wrapper';

        const img = document.createElement('img');
        img.src = 'kazoo.png';
        img.alt = `kazoo ${note}`;
        img.className = 'kazoo-img';
        img.draggable = false;
        wrapper.appendChild(img);

        // Circular note resonator badge
        const badge = document.createElement('div');
        badge.className = 'kazoo-note-badge';

        const pitchSpan = document.createElement('span');
        pitchSpan.className = 'badge-pitch';
        pitchSpan.textContent = pitch;
        badge.appendChild(pitchSpan);

        if (octaveTag) {
            const octSpan = document.createElement('span');
            octSpan.className = 'badge-octave';
            octSpan.textContent = octaveTag;
            badge.appendChild(octSpan);
        }
        wrapper.appendChild(badge);

        // Highlight starting note if conductor in practice mode
        if (isConductor && note === startingNote && subMode === 'practice') {
            btn.classList.add('starting-note');
            const firstBadge = document.createElement('span');
            firstBadge.className = 'first-badge';
            firstBadge.textContent = '1st';
            wrapper.appendChild(firstBadge);
        }

        btn.appendChild(wrapper);
        
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
// Sequencer DOM Elements
const btnCreateTune = document.getElementById('btn-create-tune');
const btnSeqBack = document.getElementById('btn-seq-back');
const seqNameInput = document.getElementById('seq-name');
const seqBpmSlider = document.getElementById('seq-bpm-slider');
const seqBpmVal = document.getElementById('seq-bpm-val');
const btnSeqTimesig = document.getElementById('btn-seq-timesig');
const seqStrip = document.getElementById('seq-strip');
const seqPalette = document.getElementById('seq-palette');
const btnSeqPreview = document.getElementById('btn-seq-preview');
const btnSeqSubmit = document.getElementById('btn-seq-submit');
const btnSeqSave = document.getElementById('btn-seq-save');
const btnSeqLoad = document.getElementById('btn-seq-load');

function stopPreview() {
    isPreviewPlaying = false;
    previewTimeouts.forEach(clearTimeout);
    previewTimeouts = [];
    document.querySelectorAll('.seq-chip').forEach(c => c.classList.remove('playing'));
}

function buildSeqPalette() {
    if (seqPalette.children.length > 0) return; // already built
    
    const notesToBuild = [...SEQUENCER_NOTES, 'REST'];
    notesToBuild.forEach(note => {
        const btn = document.createElement('button');
        btn.className = 'seq-palette-btn';
        
        if (note === 'REST') {
            btn.classList.add('rest');
            btn.textContent = '⏸';
        } else {
            const letter = note.replace(/[0-9]/g, '');
            const octave = parseInt(note.replace(/[^0-9]/g, ''), 10) || 4;
            let displayNote = letter;
            
            if (octave === 3) displayNote += '<sub>3</sub>';
            if (octave === 5) displayNote += '<sub>5</sub>';
            
            btn.innerHTML = displayNote;
            
            const colorVar = `--note-${letter.toLowerCase().replace('#', 's')}${octave === 5 ? '5' : ''}`;
            btn.style.backgroundColor = `var(${colorVar})`;
        }
        
        btn.addEventListener('click', () => {
            if (note !== 'REST') playNote(note, 0.2);
            seqNotes.push(note);
            renderSeqStrip();
        });
        
        seqPalette.appendChild(btn);
    });
}

function renderSeqStrip() {
    seqStrip.innerHTML = '';
    seqNotes.forEach((note, index) => {
        const chip = document.createElement('div');
        chip.className = 'seq-chip';
        
        if (note === 'REST') {
            chip.classList.add('rest');
            chip.textContent = '⏸';
        } else {
            const letter = note.replace(/[0-9]/g, '');
            const octave = parseInt(note.replace(/[^0-9]/g, ''), 10) || 4;
            let displayNote = letter;
            
            if (octave === 3) displayNote += '<sub>3</sub>';
            if (octave === 5) displayNote += '<sub>5</sub>';
            
            chip.innerHTML = displayNote;
            const colorVar = `--note-${letter.toLowerCase().replace('#', 's')}${octave === 5 ? '5' : ''}`;
            chip.style.backgroundColor = `var(${colorVar})`;
        }
        
        chip.addEventListener('click', () => {
            seqNotes.splice(index, 1);
            renderSeqStrip();
        });
        
        seqStrip.appendChild(chip);
    });
    
    seqStrip.scrollLeft = seqStrip.scrollWidth;
}

function previewSequence() {
    if (isPreviewPlaying) {
        stopPreview();
        return;
    }
    
    if (seqNotes.length === 0) return;
    
    isPreviewPlaying = true;
    const msPerBeat = 60000 / seqBpm;
    
    let delay = 0;
    seqNotes.forEach((note, index) => {
        const timeout = setTimeout(() => {
            if (!isPreviewPlaying) return;
            
            document.querySelectorAll('.seq-chip').forEach(c => c.classList.remove('playing'));
            const chip = seqStrip.children[index];
            if (chip) chip.classList.add('playing');
            
            if (note !== 'REST') {
                playNote(note, msPerBeat / 1000 - 0.05);
            }
            
            if (index === seqNotes.length - 1) {
                setTimeout(stopPreview, msPerBeat);
            }
        }, delay);
        
        previewTimeouts.push(timeout);
        delay += msPerBeat;
    });
}

function submitSong() {
    if (gameState !== 'waiting') return;
    if (seqNotes.length === 0) {
        alert('add some notes first!');
        return;
    }
    
    seqName = seqNameInput.value || 'my tune';
    
    const song = buildCustomSong(seqName, seqBpm, seqTimeSig, seqNotes, playerName);
    
    if (transport) {
        transport.sendToHost({ 
            type: 'custom-song', 
            song: {
                name: seqName,
                bpm: seqBpm,
                timeSignature: seqTimeSig,
                notes: seqNotes,
                creator: playerName
            }
        });
    }
    
    stopPreview();
    switchView('waiting');
}

function saveSongCode() {
    if (seqNotes.length === 0) return;
    seqName = seqNameInput.value || 'my tune';
    const code = encodeSongToCode(seqName, seqBpm, seqTimeSig, seqNotes);
    
    navigator.clipboard.writeText(code).then(() => {
        alert(`copied code: ${code}`);
    }).catch(() => {
        prompt('copy this code:', code);
    });
}

function loadSongCode() {
    const code = prompt('paste song code:');
    if (!code) return;
    
    const song = decodeSongFromCode(code);
    if (!song) {
        alert('invalid code!');
        return;
    }
    
    seqNameInput.value = song.name;
    seqName = song.name;
    
    seqBpmSlider.value = song.bpm;
    seqBpm = song.bpm;
    seqBpmVal.textContent = seqBpm;
    
    seqTimeSig = song.timeSignature;
    btnSeqTimesig.textContent = `${seqTimeSig}/4`;
    
    seqNotes = song.notes;
    renderSeqStrip();
}
