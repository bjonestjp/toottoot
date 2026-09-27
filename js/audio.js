/**
 * audio.js
 * Web Audio API implementation for Toot
 */

let audioCtx;
let masterGain;
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
