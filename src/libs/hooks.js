import React from 'react';
import gun from './gun';

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

// ---- Event Q&A (Phase A): thread meta / host / expiry ----

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

// Subscribes to t/<thread>/meta. The first visitor to a thread with no meta
// becomes host by creating it (see createThread).
// NOTE: expiry is client-enforced. Gun has no server-side TTL, so every
// client just hides/disables UI past expiresAt — a modified client could
// still read/write. Treat it as a UX feature, not a security boundary.
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
