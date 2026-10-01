import { noteToFrequency } from './audio.js';

export const songs = [
  {
    id: 'hot-cross-buns',
    name: 'Hot Cross Buns',
    difficulty: 1,
    bpm: 105,
    timeSignature: 4,
    notes: ['E4', 'D4', 'C4', 'E4', 'D4', 'C4', 'C4', 'C4', 'C4', 'C4', 'D4', 'D4', 'D4', 'D4', 'E4', 'D4', 'C4'],
    emoji: '⭐'
  },
  {
    id: 'mary-had-a-little-lamb',
    name: 'Mary Had a Little Lamb',
    difficulty: 1,
    bpm: 115,
    timeSignature: 4,
    notes: ['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'D4', 'D4', 'D4', 'E4', 'G4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'E4', 'D4', 'D4', 'E4', 'D4', 'C4'],
    emoji: '🐑'
  },
  {
    id: 'jingle-bells',
    name: 'Jingle Bells',
    difficulty: 1,
    bpm: 125,
    timeSignature: 4,
    notes: ['E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'G4', 'C4', 'D4', 'E4', 'F4', 'F4', 'F4', 'F4', 'F4', 'E4', 'E4', 'E4', 'E4', 'D4', 'D4', 'E4', 'D4', 'G4'],
    emoji: '🔔'
  },
  {
    id: 'frere-jacques',
    name: 'Frère Jacques',
    difficulty: 2,
    bpm: 110,
    timeSignature: 4,
    notes: ['C4', 'D4', 'E4', 'C4', 'C4', 'D4', 'E4', 'C4', 'E4', 'F4', 'G4', 'E4', 'F4', 'G4', 'G4', 'A4', 'G4', 'F4', 'E4', 'C4', 'G4', 'A4', 'G4', 'F4', 'E4', 'C4', 'C4', 'G3', 'C4', 'C4', 'G3', 'C4'],
    emoji: '🔔'
  },
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle Little Star',
    difficulty: 2,
    bpm: 105,
    timeSignature: 4,
    notes: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'],
    emoji: '⭐'
  },
  {
    id: 'happy-birthday',
    name: 'Happy Birthday',
    difficulty: 2,
    bpm: 100,
    timeSignature: 3,
    notes: ['G3', 'G3', 'A3', 'G3', 'C4', 'B3', 'G3', 'G3', 'A3', 'G3', 'D4', 'C4', 'G3', 'G3', 'G4', 'E4', 'C4', 'B3', 'A3', 'F4', 'F4', 'E4', 'C4', 'D4', 'C4'],
    emoji: '🎂'
  },
  {
    id: 'ode-to-joy',
    name: 'Ode to Joy',
    difficulty: 3,
    bpm: 115,
    timeSignature: 4,
    notes: ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4', 'E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'D4', 'C4', 'C4'],
    emoji: '🎵'
  },
  {
    id: 'saints-go-marching',
    name: 'When the Saints Go Marching In',
    difficulty: 3,
    bpm: 128,
    timeSignature: 4,
    notes: ['C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4', 'E4', 'C4', 'E4', 'D4', 'E4', 'E4', 'D4', 'C4', 'C4', 'E4', 'G4', 'G4', 'F4', 'E4', 'F4', 'G4', 'E4', 'C4', 'D4', 'C4'],
    emoji: '🎺'
  },
  {
    id: 'beethoven-5th',
    name: "Beethoven's 5th",
    difficulty: 3,
    bpm: 108,
    timeSignature: 4,
    notes: ['G4', 'G4', 'G4', 'D#4', 'F4', 'F4', 'F4', 'D4', 'G4', 'G4', 'G4', 'D#4', 'F4', 'F4', 'F4', 'D4', 'D#4', 'D#4', 'D#4', 'C4'],
    emoji: '⚡'
  },
  {
    id: 'amazing-grace',
    name: 'Amazing Grace',
    difficulty: 4,
    bpm: 85,
    timeSignature: 3,
    notes: ['G3', 'C4', 'E4', 'C4', 'E4', 'D4', 'C4', 'A3', 'G3', 'G3', 'C4', 'E4', 'C4', 'E4', 'D4', 'G4', 'E4', 'C4', 'E4', 'C4', 'A3', 'G3', 'A3', 'C4'],
    emoji: '🙏'
  },
  {
    id: 'auld-lang-syne',
    name: 'Auld Lang Syne',
    difficulty: 4,
    bpm: 90,
    timeSignature: 4,
    notes: ['G3', 'C4', 'C4', 'C4', 'E4', 'D4', 'C4', 'D4', 'E4', 'C4', 'C4', 'E4', 'G4', 'A4', 'A4', 'G4', 'E4', 'E4', 'C4', 'D4', 'C4', 'D4', 'E4', 'C4', 'A3', 'A3', 'G3', 'C4'],
    emoji: '🥂'
  },
  {
    id: 'tetris',
    name: 'Tetris (Korobeiniki)',
    difficulty: 4,
    bpm: 135,
    timeSignature: 4,
    notes: ['E4', 'B3', 'C4', 'D4', 'C4', 'B3', 'A3', 'A3', 'C4', 'E4', 'D4', 'C4', 'B3', 'C4', 'D4', 'E4', 'C4', 'A3', 'A3', 'D4', 'F4', 'A4', 'G4', 'F4', 'E4', 'C4', 'E4', 'D4', 'C4', 'B3', 'B3', 'C4', 'D4', 'E4', 'C4', 'A3', 'A3'],
    emoji: '🕹️'
  },
  {
    id: 'greensleeves',
    name: 'Greensleeves',
    difficulty: 5,
    bpm: 105,
    timeSignature: 3,
    notes: ['A3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'B3', 'G3', 'A3', 'B3', 'C4', 'A3', 'A3', 'G#3', 'A3', 'B3', 'G#3', 'E3', 'A3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'B3', 'G3', 'A3', 'B3', 'C4', 'B3', 'A3', 'G#3', 'A3', 'B3', 'A3'],
    emoji: '🏰'
  },
  {
    id: 'mountain-king',
    name: 'Mountain King',
    difficulty: 5,
    bpm: 125,
    timeSignature: 4,
    notes: ['B3', 'C#4', 'D4', 'E4', 'F#4', 'D4', 'F#4', 'F4', 'C4', 'F4', 'E4', 'C4', 'E4', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'D4', 'F#4', 'B4', 'F#4', 'D4', 'C#4', 'B3'],
    emoji: '🏔️'
  }
];

// Precompute uniqueNotes for all songs
songs.forEach(song => {
  song.uniqueNotes = getUniqueNotes(song);
});

/**
 * Helper to get unique notes from a song, sorted logically by pitch.
 * @param {Object} song 
 * @returns {string[]} Array of unique note names
 */
export function getUniqueNotes(song) {
  const unique = [...new Set(song.notes)];
  return unique.sort((a, b) => (noteToFrequency(a) || 0) - (noteToFrequency(b) || 0));
}

/**
 * Find a song by its ID
 * @param {string} id 
 * @returns {Object|undefined}
 */
export function getSongById(id) {
  return songs.find(s => s.id === id);
}

export function getRandomSong(maxDifficulty = 5) {
  const filtered = songs.filter(s => s.difficulty <= maxDifficulty);
  if (filtered.length === 0) return songs[0];
  const randIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randIndex];
}

export const DIFFICULTY_LEVELS = [
  { level: 1, name: 'easy', emoji: '⭐', description: 'simple 3–5 note melodies' },
  { level: 2, name: 'challenging', emoji: '⭐⭐', description: 'familiar 7-note melodies' },
  { level: 3, name: 'difficult', emoji: '⭐⭐⭐', description: 'trickier steps & jumps' },
  { level: 4, name: 'frustrating', emoji: '⭐⭐⭐⭐', description: 'wider ranges & intervals' },
  { level: 5, name: 'preposterous', emoji: '⭐⭐⭐⭐⭐', description: 'rapid changes & master challenge' }
];

/**
 * Get all songs for a specific difficulty level
 * @param {number} level (1-5)
 * @returns {Object[]}
 */
export function getSongsByDifficulty(level) {
  return songs.filter(s => s.difficulty === level);
}

/**
 * Get the next song at a given difficulty level, prioritizing unplayed ones.
 * @param {number} level
 * @param {Set|Array} playedSongIds
 * @param {string} [excludeId]
 * @returns {Object|null}
 */
export function getNextSongAtDifficulty(level, playedSongIds = new Set(), excludeId = null) {
  const levelSongs = getSongsByDifficulty(level);
  if (levelSongs.length === 0) return null;

  const playedSet = playedSongIds instanceof Set ? playedSongIds : new Set(playedSongIds);

  // First priority: unplayed songs at this level (not matching excludeId)
  const unplayed = levelSongs.filter(s => !playedSet.has(s.id) && s.id !== excludeId);
  if (unplayed.length > 0) {
    return unplayed[0];
  }

  // Second priority: any song at this level that isn't the current song
  const others = levelSongs.filter(s => s.id !== excludeId);
  if (others.length > 0) {
    return others[0];
  }

  // Fallback to the same song
  return levelSongs[0];
}

/**
 * Check if a higher difficulty level is available
 * @param {number} currentLevel
 * @returns {boolean}
 */
export function hasNextDifficulty(currentLevel) {
  return currentLevel < 5;
}

// ─────────────────────────────────────────────
// Custom Song Support & Save-Code Encoding
// ─────────────────────────────────────────────

/** Ordered palette of every note the sequencer / game can use. */
export const SEQUENCER_NOTES = [
  'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3',
  'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
  'C5'
];

const REST_TOKEN = 'REST';
const CODE_PREFIX = 'TOOT';
const CODE_VERSION = 1;

// Build index maps for encoding
const NOTE_TO_IDX = {};
SEQUENCER_NOTES.forEach((n, i) => { NOTE_TO_IDX[n] = i; });
NOTE_TO_IDX[REST_TOKEN] = SEQUENCER_NOTES.length; // 21

const IDX_TO_NOTE = [...SEQUENCER_NOTES, REST_TOKEN];
const SYMBOL_COUNT = IDX_TO_NOTE.length; // 22, fits in 5 bits (0-31)

/**
 * Encode a custom song into a compact alphanumeric save-code.
 *
 * Binary format:
 *   [version:1][nameLen:1][nameBytes:N][bpm:1][timeSig:1][noteCount:1][5-bit-packed notes]
 *
 * @param {string} name
 * @param {number} bpm
 * @param {number} timeSignature (3 or 4)
 * @param {string[]} notes - array of note names (e.g. 'C4') and 'REST'
 * @returns {string} code like "TOOT-abc123..."
 */
export function encodeSongToCode(name, bpm, timeSignature, notes) {
  const nameBytes = new TextEncoder().encode(name.substring(0, 30));
  const noteBytes = Math.ceil((notes.length * 5) / 8);
  const totalLen = 1 + 1 + nameBytes.length + 1 + 1 + 1 + noteBytes;
  const buf = new Uint8Array(totalLen);

  let pos = 0;
  buf[pos++] = CODE_VERSION;
  buf[pos++] = nameBytes.length;
  buf.set(nameBytes, pos); pos += nameBytes.length;
  buf[pos++] = Math.min(255, Math.max(40, bpm));
  buf[pos++] = timeSignature;
  buf[pos++] = notes.length;

  // Pack notes as 5-bit values
  let bitPos = 0;
  for (const note of notes) {
    const idx = NOTE_TO_IDX[note] ?? NOTE_TO_IDX[REST_TOKEN];
    const byteOff = pos + Math.floor(bitPos / 8);
    const bitOff = bitPos % 8;
    buf[byteOff] |= (idx << bitOff) & 0xFF;
    if (bitOff + 5 > 8 && byteOff + 1 < buf.length) {
      buf[byteOff + 1] |= (idx >> (8 - bitOff)) & 0xFF;
    }
    bitPos += 5;
  }

  // base64url encode
  const b64 = btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${CODE_PREFIX}-${b64}`;
}

/**
 * Decode a save-code back into song data.
 * @param {string} code
 * @returns {{ name:string, bpm:number, timeSignature:number, notes:string[] } | null}
 */
export function decodeSongFromCode(code) {
  try {
    let raw = code.trim();
    if (raw.toUpperCase().startsWith(CODE_PREFIX + '-')) {
      raw = raw.substring(CODE_PREFIX.length + 1);
    }
    // base64url → standard base64
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const binStr = atob(b64);
    const buf = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) buf[i] = binStr.charCodeAt(i);

    let pos = 0;
    const version = buf[pos++];
    if (version !== CODE_VERSION) return null;

    const nameLen = buf[pos++];
    const nameBytes = buf.slice(pos, pos + nameLen);
    pos += nameLen;
    const name = new TextDecoder().decode(nameBytes);

    const bpm = buf[pos++];
    const timeSignature = buf[pos++];
    const noteCount = buf[pos++];

    const notes = [];
    let bitPos = 0;
    for (let i = 0; i < noteCount; i++) {
      const byteOff = pos + Math.floor(bitPos / 8);
      const bitOff = bitPos % 8;
      let idx = (buf[byteOff] >> bitOff) & 0x1F;
      if (bitOff + 5 > 8 && byteOff + 1 < buf.length) {
        idx |= ((buf[byteOff + 1] << (8 - bitOff)) & 0x1F);
        idx &= 0x1F;
      }
      notes.push(IDX_TO_NOTE[idx] || REST_TOKEN);
      bitPos += 5;
    }

    return { name, bpm, timeSignature, notes };
  } catch (e) {
    console.error('Failed to decode song code:', e);
    return null;
  }
}

/**
 * Auto-calculate difficulty (1-5) from unique note count.
 */
export function calculateDifficulty(uniqueNoteCount) {
  if (uniqueNoteCount <= 3) return 1;
  if (uniqueNoteCount <= 5) return 2;
  if (uniqueNoteCount <= 7) return 3;
  if (uniqueNoteCount <= 9) return 4;
  return 5;
}

/**
 * Build a full song object from custom song data.
 */
export function buildCustomSong(name, bpm, timeSignature, notes, creator) {
  const gameNotes = notes.filter(n => n !== REST_TOKEN);
  const uniqueNotes = [...new Set(gameNotes)].sort(
    (a, b) => (noteToFrequency(a) || 0) - (noteToFrequency(b) || 0)
  );
  const difficulty = calculateDifficulty(uniqueNotes.length);
  return {
    id: 'custom-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    name,
    difficulty,
    bpm: bpm || 120,
    timeSignature: timeSignature || 4,
    notes: gameNotes,
    allNotes: notes,       // includes rests (for preview playback)
    uniqueNotes,
    emoji: '✏️',
    isCustom: true,
    creator: creator || 'unknown'
  };
}

/** Session-level custom song storage (host-side). */
export const customSongs = [];

export function addCustomSong(song) {
  customSongs.push(song);
  return song;
}

export function getAllSongs() {
  return [...songs, ...customSongs];
}

export function getAllSongsByDifficulty(level) {
  return getAllSongs().filter(s => s.difficulty === level);
}
