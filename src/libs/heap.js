// Thought Heap storage — private quick-capture scratchpad.
//
// PRIVACY MODEL (honest, by design): heap items live in localStorage ONLY
// (`openforum-heap`) and are NEVER written to the Gun graph. Half-formed
// thoughts stay on this device. Clearing browser storage wipes the heap.

import { uniqueKey } from './helpers';

export const HEAP_KEY = 'openforum-heap';

export const loadHeap = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(HEAP_KEY);
    const items = raw ? JSON.parse(raw) : [];
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
};

export const saveHeap = (items) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HEAP_KEY, JSON.stringify(items));
  } catch {
    /* storage full/blocked — heap is best-effort */
  }
};

// {id, text, room, createdAt}. Room is the thread name at capture time,
// or 'lobby' when captured from the home page / public board.
export const makeHeapItem = (text, room) => ({
  id: uniqueKey(),
  text: String(text).trim(),
  room: room || 'lobby',
  createdAt: Date.now(),
});
