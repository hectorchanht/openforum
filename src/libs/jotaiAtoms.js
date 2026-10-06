import { atom } from 'jotai';

export const threadIdAtom = atom('');
export const aliasAtom = atom('');

export const alertMsgAtom = atom('');

// Q&A view controls
export const sortModeAtom = atom('top'); // 'top' | 'newest'
export const statusFilterAtom = atom('open'); // 'open' | 'answered' | 'all'
export const searchAtom = atom('');
export const myOnlyAtom = atom(false); // "My questions" toggle (asker view)
export const authorFilterAtom = atom(null); // voterId | null — filter to one author
