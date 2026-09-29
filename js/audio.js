/**
 * audio.js
 * Web Audio API implementation for Toot
 */

let audioCtx;
let masterGain;
let beatGain;
let compressor;

/**
 * Initialize the Audio Context.
 * MUST be called after a user interaction (click/touch).
 */
export function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  // Create Master Gain
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.6;

  // Dedicated Beat Gain
  beatGain = audioCtx.createGain();
  beatGain.gain.value = 0.35;
  beatGain.connect(masterGain);

  // Compressor for smooth dynamics and no clipping
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 24;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.15;

  masterGain.connect(compressor);
  compressor.connect(audioCtx.destination);

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Start playing a musical note by name (e.g. "C4", "G#3").
 * Returns a note handle with a .stop() method for release.
 * Sustains cleanly until stopNote() is called (with a 3.5s auto-cutoff safety).
 * 
 * @param {string} noteName
 * @returns {{ stop: Function, noteName: string } | null}
 */
export function startNote(noteName) {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const freq = noteToFrequency(noteName);
  if (!freq) return null;

  const now = audioCtx.currentTime;

  // Fundamental frequency (warm sine)
  const osc1 = audioCtx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, now);

  // Soft octave overtone for body and presence (clean, zero detune)
  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, now);

  // Sub-gain for overtone
  const harmGain = audioCtx.createGain();
  harmGain.gain.setValueAtTime(0.18, now);

  // Voice envelope gain
  const voiceGain = audioCtx.createGain();
  const attackTime = 0.018; // 18ms smooth attack
  const sustainLevel = 0.55;

  voiceGain.gain.setValueAtTime(0.0001, now);
  voiceGain.gain.exponentialRampToValueAtTime(sustainLevel, now + attackTime);

  // Filter to soften the high end
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 4, 3200), now);

  // Routing
  osc1.connect(voiceGain);
  osc2.connect(harmGain);
  harmGain.connect(voiceGain);
  voiceGain.connect(filter);
  filter.connect(masterGain);

  osc1.start(now);
  osc2.start(now);

  let isStopped = false;

  const stop = () => {
    if (isStopped) return;
    isStopped = true;

    const stopTime = audioCtx.currentTime;
    const releaseTime = 0.12; // 120ms natural fade

    try {
      voiceGain.gain.cancelScheduledValues(stopTime);
      voiceGain.gain.setValueAtTime(voiceGain.gain.value, stopTime);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + releaseTime);

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          osc1.disconnect();
          osc2.disconnect();
          harmGain.disconnect();
          voiceGain.disconnect();
          filter.disconnect();
        } catch (e) {}
      }, releaseTime * 1000 + 40);
    } catch (e) {}
  };

  // Safety timer: auto-release after 3.5s to prevent stuck notes
  const safetyTimer = setTimeout(() => {
    stop();
  }, 3500);

  return {
    noteName,
    stop: () => {
      clearTimeout(safetyTimer);
      stop();
    }
  };
}

/**
 * Stop an active note handle cleanly with a release fade.
 * @param {Object} noteHandle
 */
export function stopNote(noteHandle) {
  if (noteHandle && typeof noteHandle.stop === 'function') {
    noteHandle.stop();
  }
}

/**
 * Play a note for a fixed duration (helper for previews and automated play).
 * @param {string} noteName
 * @param {number} durationMs - Default 280ms
 * @returns {Promise}
 */
export function playNote(noteName, durationMs = 280) {
  const handle = startNote(noteName);
  if (!handle) return Promise.resolve();

  return new Promise((resolve) => {
    setTimeout(() => {
      stopNote(handle);
      resolve();
    }, durationMs);
  });
}

/**
 * Play a success jingle (ascending arpeggio C4 E4 G4 C5)
 */
export function playSuccess() {
  if (!audioCtx) initAudio();
  const notes = ['C4', 'E4', 'G4', 'C5'];
  let delay = 0;
  
  notes.forEach((note, i) => {
    setTimeout(() => playNote(note, 220), delay);
    delay += 110;
  });
}

/**
 * Play a fail sound (descending buzz)
 */
export function playFail() {
  if (!audioCtx) initAudio();
  const notes = ['C4', 'F#3', 'C3'];
  let delay = 0;
  
  notes.forEach((note, index) => {
    setTimeout(() => {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      
      osc.type = index === 2 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(noteToFrequency(note), now);
      
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.35, now + 0.03);
      env.gain.linearRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(env);
      env.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.25);
      
      setTimeout(() => {
        osc.disconnect();
        env.disconnect();
      }, 300);
    }, delay);
    delay += 140;
  });
}

// Frequency mapping for equal temperament
const A4_FREQ = 440;
const NOTES = {
  'C': -9, 'C#': -8, 'Db': -8, 'D': -7, 'D#': -6, 'Eb': -6,
  'E': -5, 'F': -4, 'F#': -3, 'Gb': -3, 'G': -2, 'G#': -1, 'Ab': -1,
  'A': 0, 'A#': 1, 'Bb': 1, 'B': 2
};

/**
 * Get the frequency for a standard note name
 * @param {string} noteName (e.g. "C4", "A4", "G#3")
 * @returns {number|null} Frequency in Hz
 */
export function noteToFrequency(noteName) {
  // Regex to parse note and octave (e.g. "C#4", "Db3", "G4")
  const match = noteName.match(/^([A-G][#b]?)([0-9])$/);
  if (!match) return null;

  const note = match[1];
  const octave = parseInt(match[2], 10);

  if (NOTES[note] === undefined) return null;

  // Formula: fn = f0 * (a)^n
  // where f0 = A4 (440Hz), a = 2^(1/12), n = number of half steps from A4
  const halfStepsFromA4 = NOTES[note] + (octave - 4) * 12;
  const frequency = A4_FREQ * Math.pow(2, halfStepsFromA4 / 12);
  
  return frequency;
}

// -------------------------------------------------------------
// Web Audio Rhythm Engine (Lookahead Scheduler)
// -------------------------------------------------------------

let beatSchedulerTimer = null;
let isBeatRunning = false;
let beatEnabled = true;
let currentBpm = 115;
let currentTimeSignature = 4;
let nextBeatTime = 0;
let currentBeatNumber = 0;
let beatCallback = null;

const LOOKAHEAD_INTERVAL_MS = 25; // run scheduler every 25ms
const SCHEDULE_AHEAD_TIME_SEC = 0.1; // schedule 100ms in advance

/**
 * Play a synthesized percussion beat hit.
 * @param {number} time - AudioContext exact target time
 * @param {boolean} isDownbeat - true for beat 1, false for beats 2, 3, 4
 */
function playBeatSound(time, isDownbeat) {
  if (!audioCtx || !beatGain) return;

  if (isDownbeat) {
    // Downbeat: punchy low-frequency resonance + transient click
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.08);

    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(beatGain);

    osc.start(time);
    osc.stop(time + 0.14);

    // High transient click
    const click = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    click.type = 'triangle';
    click.frequency.setValueAtTime(900, time);
    click.frequency.exponentialRampToValueAtTime(200, time + 0.02);

    clickGain.gain.setValueAtTime(0.35, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    click.connect(clickGain);
    clickGain.connect(beatGain);

    click.start(time);
    click.stop(time + 0.03);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
        click.disconnect();
        clickGain.disconnect();
      } catch (e) {}
    }, Math.max(0, (time - audioCtx.currentTime + 0.2) * 1000 + 50));
  } else {
    // Offbeat: soft, crisp wooden click
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(320, time + 0.035);

    gain.gain.setValueAtTime(0.40, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

    osc.connect(gain);
    gain.connect(beatGain);

    osc.start(time);
    osc.stop(time + 0.05);

    setTimeout(() => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch (e) {}
    }, Math.max(0, (time - audioCtx.currentTime + 0.1) * 1000 + 50));
  }
}

/**
 * Lookahead scheduler loop.
 */
function beatScheduler() {
  if (!audioCtx || !isBeatRunning) return;

  while (nextBeatTime < audioCtx.currentTime + SCHEDULE_AHEAD_TIME_SEC) {
    const isDownbeat = (currentBeatNumber === 0);
    const beatNum = currentBeatNumber;
    const scheduledTime = nextBeatTime;

    playBeatSound(scheduledTime, isDownbeat);

    if (beatCallback) {
      const delayMs = Math.max(0, (scheduledTime - audioCtx.currentTime) * 1000);
      setTimeout(() => {
        if (isBeatRunning && beatCallback) {
          beatCallback(isDownbeat, beatNum);
        }
      }, delayMs);
    }

    nextBeatTime += 60.0 / currentBpm;
    currentBeatNumber = (currentBeatNumber + 1) % currentTimeSignature;
  }
}

/**
 * Start the backing rhythm beat.
 * @param {number} [bpm=115] - Tempo in beats per minute
 * @param {number} [timeSignature=4] - Meter (e.g. 4 for 4/4, 3 for 3/4)
 * @param {Function} [onBeat] - Callback (isDownbeat, beatNumber)
 */
export function startBeat(bpm = 115, timeSignature = 4, onBeat = null) {
  if (!audioCtx) initAudio();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  stopBeat();

  currentBpm = bpm || 115;
  currentTimeSignature = timeSignature || 4;
  beatCallback = onBeat;
  currentBeatNumber = 0;

  if (!beatEnabled) return;

  isBeatRunning = true;
  nextBeatTime = audioCtx.currentTime + 0.06;
  beatSchedulerTimer = setInterval(beatScheduler, LOOKAHEAD_INTERVAL_MS);
}

/**
 * Stop the backing rhythm beat immediately.
 */
export function stopBeat() {
  isBeatRunning = false;
  if (beatSchedulerTimer) {
    clearInterval(beatSchedulerTimer);
    beatSchedulerTimer = null;
  }
}

/**
 * Enable or disable the backing rhythm beat.
 * @param {boolean} enabled
 */
export function setBeatEnabled(enabled) {
  beatEnabled = !!enabled;
  if (!beatEnabled) {
    stopBeat();
  }
}

/**
 * Check if the backing rhythm beat is enabled.
 * @returns {boolean}
 */
export function isBeatEnabled() {
  return beatEnabled;
}

/**
 * Adjust the backing rhythm beat volume.
 * @param {number} vol - 0.0 to 1.0 (default 0.35)
 */
export function setBeatVolume(vol) {
  if (beatGain) {
    beatGain.gain.value = Math.max(0, Math.min(1, vol));
  }
}

