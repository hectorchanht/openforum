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

// Bumped whenever claimHost() writes a new host key, so every useThreadMeta
// instance re-reads localStorage (host key can be claimed from any component).
export const hostKeyBumpAtom = atom(0);

// Thought Heap: promoting a heap item to a question fills the composer as a
// draft (never auto-posts). Payload {text} | null — AddPost consumes it.
export const heapDraftAtom = atom(null);
