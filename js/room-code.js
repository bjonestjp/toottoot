/**
 * room-code.js
 * Utility functions for generating and parsing Room Codes
 */

const ROOM_PREFIX = 'TOOT-';

/**
 * Generates a random 4-digit room code string.
 * Example: 'TOOT-3847'
 * @returns {string}
 */
export function generateRoomCode() {
  const min = 1000;
  const max = 9999;
  const num = Math.floor(Math.random() * (max - min + 1)) + min;
  return `${ROOM_PREFIX}${num}`;
}

/**
 * Validates if a string looks like a room code.
 * @param {string} code 
 * @returns {boolean}
 */
export function isValidRoomCode(code) {
  if (!code) return false;
  // Allows optional prefix, standardizes to checking the 4 digits
  const cleanCode = code.toUpperCase().trim();
  const regex = /^TOOT-\d{4}$/;
  if (regex.test(cleanCode)) return true;
  
  // Also allow just the 4 digits
  if (/^\d{4}$/.test(cleanCode)) return true;
  
  return false;
}

/**
 * Convert a user-friendly room code to a lowercase PeerJS ID
 * @param {string} code (e.g. 'TOOT-1234' or '1234')
 * @returns {string} (e.g. 'toot-1234')
 */
export function codeToPeerId(code) {
  let cleanCode = code.toUpperCase().trim();
  if (/^\d{4}$/.test(cleanCode)) {
    cleanCode = `${ROOM_PREFIX}${cleanCode}`;
  }
  return cleanCode.toLowerCase();
}

/**
 * Convert a PeerJS ID back to a displayable Room Code
 * @param {string} peerId (e.g. 'toot-1234')
 * @returns {string} (e.g. 'TOOT-1234')
 */
export function peerIdToCode(peerId) {
  return peerId.toUpperCase();
}
