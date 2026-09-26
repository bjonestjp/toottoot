/**
 * songs.js
 * Contains the catalog of songs for Toot.
 */

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
    id: 'greensleeves',
    name: 'Greensleeves',
    difficulty: 5,
    notes: ['A3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'B3', 'G3', 'A3', 'B3', 'C4', 'A3', 'A3', 'G#3', 'A3', 'B3', 'G#3', 'E3', 'A3', 'C4', 'D4', 'E4', 'F4', 'E4', 'D4', 'B3', 'G3', 'A3', 'B3', 'C4', 'B3', 'A3', 'G#3', 'A3', 'B3', 'A3'],
    emoji: '🏰'
  }
];

// Precompute uniqueNotes for all songs
songs.forEach(song => {
  song.uniqueNotes = getUniqueNotes(song);
});

/**
 * Helper to get unique notes from a song, sorted logically.
 * @param {Object} song 
 * @returns {string[]} Array of unique note names
 */
export function getUniqueNotes(song) {
  const unique = [...new Set(song.notes)];
  
  // Custom sorting function based on frequency or chromatic scale
  // For simplicity, we can sort by string, but 'G3' should be before 'C4'
  const noteOrder = {
    'C3': 1, 'C#3': 2, 'D3': 3, 'D#3': 4, 'E3': 5, 'F3': 6, 'F#3': 7, 'G3': 8, 'G#3': 9, 'A3': 10, 'A#3': 11, 'B3': 12,
    'C4': 13, 'C#4': 14, 'D4': 15, 'D#4': 16, 'E4': 17, 'F4': 18, 'F#4': 19, 'G4': 20, 'G#4': 21, 'A4': 22, 'A#4': 23, 'B4': 24,
    'C5': 25
  };
  
  return unique.sort((a, b) => (noteOrder[a] || 0) - (noteOrder[b] || 0));
}

/**
 * Find a song by its ID
 * @param {string} id 
 * @returns {Object|undefined}
 */
export function getSongById(id) {
  return songs.find(s => s.id === id);
}

/**
 * Get a random song, optionally filtered by max difficulty
 * @param {number} [maxDifficulty=5] 
 * @returns {Object}
 */
export function getRandomSong(maxDifficulty = 5) {
  const filtered = songs.filter(s => s.difficulty <= maxDifficulty);
  if (filtered.length === 0) return songs[0];
  const randIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randIndex];
}
