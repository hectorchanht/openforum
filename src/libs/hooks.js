import React from 'react';
import gun from './gun';
import { playBeep } from './helpers';

export const useFocus = () => {
  const htmlElRef = React.useRef(null)
  const setFocus = React.useCallback(() => { htmlElRef.current && htmlElRef.current.focus() }, [])

  return [htmlElRef, setFocus]
}

// Tracks whether the Gun relay websocket is actually open.
// Polls the peer wire state instead of relying on 'hi'/'bye' events,
// which can fire before a component mounts (race = stuck offline).
export const useRelayOnline = () => {
  const [online, setOnline] = React.useState(false);
  React.useEffect(() => {
    const countOpenPeers = () => {
      try {
        const root = (gun.back && gun.back(-1)) || gun;
        const peers = (root._ && root._.opt && root._.opt.peers) || {};
        return Object.values(peers).filter(
          (p) => p && p.wire && p.wire.readyState === 1
        ).length;
      } catch {
        return 0;
      }
    };
    const tick = () => setOnline(countOpenPeers() > 0);
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);
  return online;
}

// ---- Event Q&A: thread meta / host / expiry ----

const randId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// Anonymous voter identity for upvotes. One per browser, persisted.
export const getVoterId = () => {
  if (typeof window === 'undefined') return 'ssr';
  let vid = window.localStorage.getItem('rg_vid');
  if (!vid) {
    vid = randId('v');
    window.localStorage.setItem('rg_vid', vid);
  }
  return vid;
};

const getStoredHostId = (thread) => {
  if (typeof window === 'undefined' || !thread) return null;
  return window.localStorage.getItem(`rg_host_${thread}`);
};

// Sub-nodes of meta arrive with a '_' key; strip it into a plain map.
const parseMutedAuthors = (d) => {
  const out = {};
  const m = d && d.mutedAuthors;
  if (m && typeof m === 'object') {
    Object.entries(m).forEach(([k, v]) => {
      if (k !== '_' && v) out[k] = 1;
    });
  }
  return out;
};

// Subscribes to t/<thread>/meta. The first visitor to a thread with no meta
// becomes host by creating it (see createThread).
// NOTE: expiry is client-enforced. Gun has no server-side TTL, so every
// client just hides/disables UI past expiresAt — a modified client could
// still read/write. Treat it as a UX feature, not a security boundary.
// Same caveat applies to ALL host controls (pin/delete/close/answered/hidden:
// any client can write these nodes directly).
export const useThreadMeta = (thread) => {
  const [meta, setMeta] = React.useState(null);
  const [loaded, setLoaded] = React.useState(false);
  const [grace, setGrace] = React.useState(false);
  const [hostId, setHostId] = React.useState(null);

  React.useEffect(() => {
    setMeta(null);
    setLoaded(false);
    setGrace(false);
    setHostId(null);
    if (!thread) return;
    setHostId(getStoredHostId(thread));
    const g = setTimeout(() => setGrace(true), 1500); // let network data arrive first
    const fallback = setTimeout(() => setLoaded(true), 4000); // .on may never fire for empty nodes
    const node = gun.get(`t/${thread}/meta`);
    node.on((d) => {
      setLoaded(true);
      setMeta(d && d.hostId
        ? {
            hostId: d.hostId,
            createdAt: d.createdAt || 0,
            expiresAt: d.expiresAt ?? null,
            closed: !!d.closed,
            pinnedKey: d.pinnedKey || null,
            // additive fields — older rooms simply don't have them
            title: d.title || null,
            desc: d.desc || null,
            discussingKey: d.discussingKey || null,
            slowModeSec: d.slowModeSec || 0,
            mutedAuthors: parseMutedAuthors(d),
          }
        : null);
    });
    return () => { clearTimeout(g); clearTimeout(fallback); node.off(); };
  }, [thread]);

  const isHost = !!meta && !!hostId && meta.hostId === hostId;
  const expired = !!meta && meta.expiresAt != null && Date.now() > meta.expiresAt;
  const closed = !!meta && !!meta.closed;
  const readOnly = expired || closed;
  const needsCreation = !!thread && grace && loaded && !meta;

  const createThread = (ttlMs) => {
    if (!thread || meta) return;
    const id = getStoredHostId(thread) || randId('h');
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`rg_host_${thread}`, id);
    }
    setHostId(id);
    gun.get(`t/${thread}/meta`).put({
      hostId: id,
      createdAt: Date.now(),
      expiresAt: ttlMs ? Date.now() + ttlMs : null,
      closed: false,
    });
  };

  const updateMeta = (patch) => {
    if (thread) gun.get(`t/${thread}/meta`).put(patch);
  };

  return { meta, loaded, isHost, expired, closed, readOnly, needsCreation, createThread, updateMeta };
}

// Mute/unmute an author for a thread (host only, client-enforced like all
// host controls). Stored at t/<thread>/meta/mutedAuthors = {voterId: 1}.
// Muted authors' posts are hidden from everyone except the host.
export const setMutedAuthor = (thread, voterId, muted) => {
  if (!thread || !voterId) return;
  const mnode = gun.get(`t/${thread}/meta`).get('mutedAuthors');
  if (muted) {
    mnode.put({ [voterId]: 1 });
  } else {
    mnode.get(voterId).put(null);
  }
};

// ---- Posts / votes / status / authors ----

// 'meta', 'v', 'st', 'a' are sub-nodes of a thread (host meta, vote tallies,
// post status, author ids) — they show up in the parent's .on() data but are
// not posts. Adding 'st'/'a' keeps old + new threads both working.
const SKIP_KEYS = new Set(['_', 'meta', 'v', 'st', 'a']);

const parsePosts = (d) =>
  d && Object.entries(d)
    .map(([k, v]) => {
      if (SKIP_KEYS.has(k)) return null;
      return { key: k, datetime: k, text: v };
    })
    .filter(Boolean);

// Raw posts at t/<thread> (or the public board / holy page path).
export const usePosts = (thread, alias) => {
  const [posts, setPosts] = React.useState([]);
  const path = React.useMemo(
    () => thread
      ? `t/${thread}`
      : alias
        ? `u/${alias}`
        : 'd/public',
    [thread, alias]
  );
  React.useEffect(() => {
    setPosts([]);
    const node = alias ? gun.user().get(path) : gun.get(path);
    node.on((d) => setPosts(parsePosts(d) || []));
    return () => node.off();
  }, [path, alias]);
  return posts;
};

// Vote tallies at t/<thread>/v/<postKey> = {voterId: 1}.
export const useVotes = (thread) => {
  const [votes, setVotes] = React.useState({});
  React.useEffect(() => {
    setVotes({});
    if (!thread) return;
    const vnode = gun.get(`t/${thread}/v`);
    vnode.on((d) => setVotes(d || {}));
    return () => vnode.off();
  }, [thread]);
  return votes;
};

export const countKeys = (o) => {
  if (!o || typeof o !== 'object') return 0;
  return Object.keys(o).filter((k) => k !== '_' && o[k]).length;
};

// Per-post status at t/<thread>/st/<postKey> = {answered, hidden, flags: {voterId: 1}}.
export const usePostStatus = (thread) => {
  const [status, setStatus] = React.useState({});
  React.useEffect(() => {
    setStatus({});
    if (!thread) return;
    const snode = gun.get(`t/${thread}/st`);
    snode.on((d) => setStatus(d || {}));
    return () => snode.off();
  }, [thread]);
  return status;
};

// Author ids at t/<thread>/a/<postKey> = voterId (additive; old posts lack it).
export const useAuthors = (thread) => {
  const [authors, setAuthors] = React.useState({});
  React.useEffect(() => {
    setAuthors({});
    if (!thread) return;
    const anode = gun.get(`t/${thread}/a`);
    anode.on((d) => {
      const out = {};
      if (d) {
        Object.entries(d).forEach(([k, v]) => {
          if (k !== '_' && typeof v === 'string') out[k] = v;
        });
      }
      setAuthors(out);
    });
    return () => anode.off();
  }, [thread]);
  return authors;
};

// Host notification: browser Notification + subtle beep when a new question
// arrives while enabled. Permission is requested only when the host toggles it.
export const useNewQuestionNotify = (thread) => {
  const [enabled, setEnabled] = React.useState(false);
  const [supported] = React.useState(
    () => typeof window !== 'undefined' && 'Notification' in window
  );
  const posts = usePosts(thread, null);
  const authors = useAuthors(thread);
  const mine = getVoterId();
  const seenRef = React.useRef(new Set());
  const primedRef = React.useRef(false);

  // restore the host's previous choice
  React.useEffect(() => {
    if (!thread || typeof window === 'undefined') return;
    if (
      window.localStorage.getItem(`rg_notify_${thread}`) === '1' &&
      supported &&
      Notification.permission === 'granted'
    ) {
      setEnabled(true);
    }
  }, [thread, supported]);

  // prime the seen-set on enable so only NEW questions notify
  React.useEffect(() => {
    if (enabled && !primedRef.current) {
      seenRef.current = new Set(posts.map((p) => p.key));
      primedRef.current = true;
    }
    if (!enabled) primedRef.current = false;
  }, [enabled, posts]);

  React.useEffect(() => {
    if (!enabled || !thread) return;
    posts.forEach((p) => {
      if (seenRef.current.has(p.key)) return;
      seenRef.current.add(p.key);
      if (!primedRef.current) return; // first sync after enable — already primed above
      if (authors[p.key] && authors[p.key] === mine) return; // my own post
      try {
        // eslint-disable-next-line no-new
        new Notification(`🎤 New question — t/${thread}`, {
          body: String(p.text).slice(0, 140),
        });
      } catch {
        /* notifications blocked — beep still plays */
      }
      playBeep();
    });
  }, [posts, authors, enabled, thread, mine]);

  // returns 'ok' | 'denied' | 'unsupported'
  const toggle = async () => {
    if (enabled) {
      setEnabled(false);
      try {
        window.localStorage.removeItem(`rg_notify_${thread}`);
      } catch { /* ignore */ }
      return 'ok';
    }
    if (!supported) return 'unsupported';
    let perm = Notification.permission;
    if (perm === 'default') {
      try {
        perm = await Notification.requestPermission();
      } catch {
        perm = 'denied';
      }
    }
    if (perm !== 'granted') return 'denied';
    seenRef.current = new Set(posts.map((p) => p.key));
    primedRef.current = true;
    setEnabled(true);
    try {
      window.localStorage.setItem(`rg_notify_${thread}`, '1');
    } catch { /* ignore */ }
    return 'ok';
  };

  return { enabled, supported, toggle };
};
