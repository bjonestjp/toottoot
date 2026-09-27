import { noteToFrequency } from './audio.js';

export const songs = [
  {
    id: 'hot-cross-buns',
    name: 'Hot Cross Buns',
    difficulty: 1,
    notes: ['E4', 'D4', 'C4', 'E4', 'D4', 'C4', 'C4', 'C4', 'C4', 'C4', 'D4', 'D4', 'D4', 'D4', 'E4', 'D4', 'C4'],
    emoji: '⭐'
  },
  {
    id: 'mary-had-a-little-lamb',
    name: 'Mary Had a Little Lamb',
    difficulty: 1,
    notes: ['E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'D4', 'D4', 'D4', 'E4', 'G4', 'G4', 'E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4', 'E4', 'D4', 'D4', 'E4', 'D4', 'C4'],
    emoji: '🐑'
  },
  {
    id: 'jingle-bells',
    name: 'Jingle Bells',
    difficulty: 1,
    notes: ['E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'G4', 'C4', 'D4', 'E4', 'F4', 'F4', 'F4', 'F4', 'F4', 'E4', 'E4', 'E4', 'E4', 'D4', 'D4', 'E4', 'D4', 'G4'],
    emoji: '🔔'
  },
  {
    id: 'frere-jacques',
    name: 'Frère Jacques',
    difficulty: 2,
    notes: ['C4', 'D4', 'E4', 'C4', 'C4', 'D4', 'E4', 'C4', 'E4', 'F4', 'G4', 'E4', 'F4', 'G4', 'G4', 'A4', 'G4', 'F4', 'E4', 'C4', 'G4', 'A4', 'G4', 'F4', 'E4', 'C4', 'C4', 'G3', 'C4', 'C4', 'G3', 'C4'],
    emoji: '🔔'
  },
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle Little Star',
    difficulty: 2,
    notes: ['C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'G4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4', 'F4', 'F4', 'E4', 'E4', 'D4', 'D4', 'C4'],
    emoji: '⭐'
  },
  {
    id: 'happy-birthday',
    name: 'Happy Birthday',
    difficulty: 2,
    notes: ['G3', 'G3', 'A3', 'G3', 'C4', 'B3', 'G3', 'G3', 'A3', 'G3', 'D4', 'C4', 'G3', 'G3', 'G4', 'E4', 'C4', 'B3', 'A3', 'F4', 'F4', 'E4', 'C4', 'D4', 'C4'],
    emoji: '🎂'
  },
  {
    id: 'ode-to-joy',
    name: 'Ode to Joy',
    difficulty: 3,
    notes: ['E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'E4', 'D4', 'D4', 'E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4', 'C4', 'C4', 'D4', 'E4', 'D4', 'C4', 'C4'],
    emoji: '🎵'
  },
  {
    id: 'saints-go-marching',
    name: 'When the Saints Go Marching In',
    difficulty: 3,
    notes: ['C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4', 'C4', 'E4', 'F4', 'G4', 'E4', 'C4', 'E4', 'D4', 'E4', 'E4', 'D4', 'C4', 'C4', 'E4', 'G4', 'G4', 'F4', 'E4', 'F4', 'G4', 'E4', 'C4', 'D4', 'C4'],
    emoji: '🎺'
  },
  {
    id: 'beethoven-5th',
    name: "Beethoven's 5th",
    difficulty: 3,
    notes: ['G4', 'G4', 'G4', 'D#4', 'F4', 'F4', 'F4', 'D4', 'G4', 'G4', 'G4', 'D#4', 'F4', 'F4', 'F4', 'D4', 'D#4', 'D#4', 'D#4', 'C4'],
    emoji: '⚡'
  },
  {
    id: 'amazing-grace',
    name: 'Amazing Grace',
    difficulty: 4,
    notes: ['G3', 'C4', 'E4', 'C4', 'E4', 'D4', 'C4', 'A3', 'G3', 'G3', 'C4', 'E4', 'C4', 'E4', 'D4', 'G4', 'E4', 'C4', 'E4', 'C4', 'A3', 'G3', 'A3', 'C4'],
    emoji: '🙏'
  },
  {
    id: 'auld-lang-syne',
    name: 'Auld Lang Syne',
    difficulty: 4,
    notes: ['G3', 'C4', 'C4', 'C4', 'E4', 'D4', 'C4', 'D4', 'E4', 'C4', 'C4', 'E4', 'G4', 'A4', 'A4', 'G4', 'E4', 'E4', 'C4', 'D4', 'C4', 'D4', 'E4', 'C4', 'A3', 'A3', 'G3', 'C4'],
    emoji: '🥂'
  },
  {
    id: 'tetris',
    name: 'Tetris (Korobeiniki)',
    difficulty: 4,
    notes: ['E4', 'B3', 'C4', 'D4', 'C4', 'B3', 'A3', 'A3', 'C4', 'E4', 'D4', 'C4', 'B3', 'C4', 'D4', 'E4', 'C4', 'A3', 'A3', 'D4', 'F4', 'A4', 'G4', 'F4', 'E4', 'C4', 'E4', 'D4', 'C4', 'B3', 'B3', 'C4', 'D4', 'E4', 'C4', 'A3', 'A3'],
    emoji: '🕹️'
  },
  {
    id: 'greensleeves',
    name: 'Greensleeves',
    difficulty: 5,
    notes: ['A3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'B3', 'G3', 'A3', 'B3', 'C4', 'A3', 'A3', 'G#3', 'A3', 'B3', 'G#3', 'E3', 'A3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'B3', 'G3', 'A3', 'B3', 'C4', 'B3', 'A3', 'G#3', 'A3', 'B3', 'A3'],
    emoji: '🏰'
  },
  {
    id: 'mountain-king',
    name: 'Mountain King',
    difficulty: 5,
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
  { level: 1, name: 'Warmup', emoji: '⭐', description: 'Simple 3–5 note melodies' },
  { level: 2, name: 'Casual', emoji: '⭐⭐', description: 'Familiar 7-note melodies' },
  { level: 3, name: 'Melodic', emoji: '⭐⭐⭐', description: 'Tricker steps & jumps' },
  { level: 4, name: 'Harmonic', emoji: '⭐⭐⭐⭐', description: 'Wider ranges & intervals' },
  { level: 5, name: 'Maestro', emoji: '⭐⭐⭐⭐⭐', description: 'Complex minor melody' }
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
