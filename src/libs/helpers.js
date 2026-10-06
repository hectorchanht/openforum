// Small shared helpers: anonymous avatars, pseudonyms, duplicate detection, CSV export, beeps.

const EMOJIS = [
  '🦊', '🐼', '🦁', '🐸', '🦄', '🐝', '🦋', '🐙',
  '🦉', '🐢', '🦩', '🐳', '🦜', '🐿️', '🦔', '🐬',
];
const COLORS = [
  'red', 'orange', 'yellow', 'green', 'teal',
  'blue', 'cyan', 'purple', 'pink',
];

// Deterministic 32-bit hash of a string id.
const hashStr = (id) => {
  const s = String(id || 'anon');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
};

// Deterministic friendly avatar (emoji + color) derived from an id hash.
export const avatarFor = (id) => {
  const h = hashStr(id);
  return {
    emoji: EMOJIS[h % EMOJIS.length],
    color: COLORS[(h >>> 4) % COLORS.length],
  };
};

const PSEUDO_ADJ = [
  'Clever', 'Brave', 'Curious', 'Witty', 'Mellow', 'Nimble',
  'Quiet', 'Bold', 'Cosmic', 'Sunny', 'Lunar', 'Neon',
  'Amber', 'Silent', 'Rapid', 'Gentle', 'Peppy', 'Sly',
];
const PSEUDO_NOUN = [
  'Fox', 'Panda', 'Lion', 'Frog', 'Unicorn', 'Bee',
  'Butterfly', 'Octopus', 'Owl', 'Turtle', 'Flamingo', 'Whale',
  'Parrot', 'Squirrel', 'Hedgehog', 'Dolphin', 'Badger', 'Crane',
];

// Stable pseudonym for an anonymous author id, e.g. "Clever Fox-7Q2".
// Deterministic — same browser always gets the same name, and the app/host
// can correlate a sender's posts. It is NOT unlinkable anonymity: anyone
// reading the Gun graph can see the raw author ids (see README).
export const pseudonym = (id) => {
  if (!id) return 'Anonymous';
  const h = hashStr(id);
  const adj = PSEUDO_ADJ[h % PSEUDO_ADJ.length];
  const noun = PSEUDO_NOUN[(h >>> 5) % PSEUDO_NOUN.length];
  const tag = ((h >>> 10) % 46656).toString(36).toUpperCase().padStart(3, '0');
  return `${adj} ${noun}-${tag}`;
};

const tokenize = (t) =>
  String(t || '')
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fff]+/u)
    .filter((w) => w.length > 2);

// Fuzzy duplicate guard: token-overlap similarity against existing posts.
// Returns the most similar existing post, or null.
export const findSimilarPost = (text, posts) => {
  const mine = new Set(tokenize(text));
  if (mine.size < 3) return null;
  let best = null;
  let bestSim = 0;
  for (const p of posts) {
    const theirs = new Set(tokenize(p.text));
    if (theirs.size < 3) continue;
    let inter = 0;
    mine.forEach((t) => {
      if (theirs.has(t)) inter++;
    });
    const sim = inter / Math.min(mine.size, theirs.size);
    if (sim >= 0.6 && sim > bestSim) {
      best = p;
      bestSim = sim;
    }
  }
  return best;
};

export const timeAgo = (ts) => {
  let ms = Number(ts);
  if (Number.isNaN(ms) || ms <= 0) return 'just now';
  if (ms < 1e12) ms *= 1000; // legacy second-precision keys
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export const fmtCountdown = (ms) => {
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s % 60}s left`;
  return `${s}s left`;
};

// Subtle notification ping (WebAudio, no asset needed).
export const playBeep = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  } catch {
    /* audio unavailable — visual notification is enough */
  }
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const downloadCSV = (filename, rows) => {
  const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};
