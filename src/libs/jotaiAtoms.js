import { atom } from 'jotai';

export const threadIdAtom = atom('');
export const aliasAtom = atom('');

export const alertMsgAtom = atom('');

// Q&A view controls
export const sortModeAtom = atom('top'); // 'top' | 'newest'
export const statusFilterAtom = atom('open'); // 'open' | 'answered' | 'all'
export const searchAtom = atom('');
