/**
 * audio.js
 * Web Audio API implementation for Toot
 */

let audioCtx;
let masterGain;
let compressor;
let convolver; // For slight reverb

/**
 * Initialize the Audio Context.
 * MUST be called after a user interaction (click/touch).
 */
export function initAudio() {
  if (audioCtx) return; // Already initialized

  // Create context
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  // Create Master Gain (Volume control)
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.5;

  // Create Compressor to prevent clipping
  compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 30;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Setup simple reverb (delay feedback)
  const delay = audioCtx.createDelay();
  delay.delayTime.value = 0.15; // 150ms
  
  const feedback = audioCtx.createGain();
  feedback.gain.value = 0.25; // Low feedback

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 2000;

  delay.connect(feedback);
  feedback.connect(filter);
  filter.connect(delay);
  
  // Dry/Wet mix
  delay.connect(compressor);

  // Connect routing
  masterGain.connect(compressor);
  masterGain.connect(delay); // Send to reverb
  
  compressor.connect(audioCtx.destination);

  // Resume context if suspended
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

/**
 * Play a synthesized note by name.
 * @param {string} noteName - e.g. "C4", "G#3"
 * @returns {Promise} Resolves when note has finished playing (~300ms)
 */
export function playNote(noteName) {
  if (!audioCtx) initAudio();
  
  return new Promise((resolve) => {
    const freq = noteToFrequency(noteName);
    if (!freq) {
      resolve();
      return;
    }

    const now = audioCtx.currentTime;
    
    // Create oscillators
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'triangle'; // Warm tone
    osc1.frequency.value = freq;

    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq;
    osc2.detune.value = 3; // +3 cents for richness

    // Create Envelope Generator
    const env = audioCtx.createGain();
    
    // ADSR Envelope
    const attack = 0.01;
    const decay = 0.05;
    const sustain = 0.6;
    const release = 0.2;
    
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + attack);
    env.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    env.gain.linearRampToValueAtTime(0, now + attack + decay + release);

    // Connect
    osc1.connect(env);
    osc2.connect(env);
    env.connect(masterGain);

    // Start & Stop
    osc1.start(now);
    osc2.start(now);
    
    const duration = attack + decay + release;
    osc1.stop(now + duration);
    osc2.stop(now + duration);

    // Cleanup & Resolve
    setTimeout(() => {
      osc1.disconnect();
      osc2.disconnect();
      env.disconnect();
      resolve();
    }, duration * 1000 + 50); // slight buffer
  });
}

/**
 * Play a success jingle (ascending arpeggio C4 E4 G4 C5)
 */
export function playSuccess() {
  if (!audioCtx) initAudio();
  const notes = ['C4', 'E4', 'G4', 'C5'];
  let delay = 0;
  
  notes.forEach(note => {
    setTimeout(() => playNote(note), delay);
    delay += 100;
  });
}

/**
 * Play a fail sound (dissonant descending notes)
 */
export function playFail() {
  if (!audioCtx) initAudio();
  const notes = ['C4', 'F#3', 'C3'];
  let delay = 0;
  
  notes.forEach((note, index) => {
    setTimeout(() => {
      // Create a slightly buzzy tone for fail
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const env = audioCtx.createGain();
      
      osc.type = index === 2 ? 'sawtooth' : 'square';
      osc.frequency.value = noteToFrequency(note);
      
      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(0.3, now + 0.05);
      env.gain.linearRampToValueAtTime(0, now + 0.3);
      
      osc.connect(env);
      env.connect(masterGain);
      
      osc.start(now);
      osc.stop(now + 0.3);
    }, delay);
    delay += 150;
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
