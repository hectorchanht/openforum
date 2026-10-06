import React from 'react';
import { useAtom } from 'jotai';
import gun from './gun';
import { playBeep } from './helpers';
import { hostKeyBumpAtom } from './jotaiAtoms';

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
  const [bump, setBump] = useAtom(hostKeyBumpAtom);

  // Host key lives in localStorage. The bump atom refreshes every
  // useThreadMeta instance when claimHost() is called from any of them.
  React.useEffect(() => {
    setHostId(getStoredHostId(thread));
  }, [thread, bump]);

  React.useEffect(() => {
    setMeta(null);
    setLoaded(false);
    setGrace(false);
    if (!thread) return;
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
            moderated: !!d.moderated,
            mutedAuthors: parseMutedAuthors(d),
            // vote budget per browser: 0 = unlimited, undefined = default 5
            voteBudget: d.voteBudget == null ? 5 : d.voteBudget,
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

  const claimHost = (id) => {
    if (!thread) return;
    const clean = String(id || '').trim();
    if (!clean) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`rg_host_${thread}`, clean);
    }
    setBump((b) => b + 1); // refresh hostId in every useThreadMeta instance
  };

  return { meta, loaded, isHost, expired, closed, readOnly, needsCreation, createThread, updateMeta, hostId, claimHost };
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

// 'meta', 'v', 'st', 'a', 'p', 'r', 'polls' are sub-nodes of a thread (host
// meta, vote tallies, post status, author ids, moderation-pending posts,
// replies, live polls) — they show up in the parent's .on() data but are not
// posts. Adding 'p'/'r'/'polls' keeps old + new threads both working.
const SKIP_KEYS = new Set(['_', 'meta', 'v', 'st', 'a', 'p', 'r', 'polls']);

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

// ---- Pre-moderation queue ----

// Pending posts awaiting host approval at t/<thread>/p/<postKey> = text.
// Only used when meta.moderated is on; audience posts go here instead of
// the main node. Author ids are still recorded at a/<postKey>.
export const usePending = (thread) => {
  const [pending, setPending] = React.useState([]);
  React.useEffect(() => {
    setPending([]);
    if (!thread) return;
    const node = gun.get(`t/${thread}/p`);
    node.on((d) => {
      if (!d) {
        setPending([]);
        return;
      }
      setPending(
        Object.entries(d)
          .map(([k, v]) => (k === '_' ? null : { key: k, text: v }))
          .filter(Boolean)
      );
    });
    return () => node.off();
  }, [thread]);
  return pending;
};

// Host approves a pending post: copy it into the main thread node (votes,
// flags, answered then apply to it) and remove it from the queue.
export const approvePending = (thread, key, text) => {
  if (!thread || !key) return;
  gun.get(`t/${thread}`).put({ [key]: text });
  gun.get(`t/${thread}/p`).get(key).put(null);
};

// Host rejects a pending post: drop it from the queue and clear its author stamp.
export const rejectPending = (thread, key) => {
  if (!thread || !key) return;
  gun.get(`t/${thread}/p`).get(key).put(null);
  gun.get(`t/${thread}/a`).get(key).put(null);
};

// ---- Replies (threaded discussion) ----

// Replies live at t/<thread>/r/<postKey>/<replyKey> (one level only).
// Two shapes exist: legacy plain-string replies (host-only era — always
// rendered with a HOST badge) and {text, by} objects (by = hostId for host
// replies, voterId for audience replies). Writes are client-enforced like
// all host controls.
export const useReplies = (thread) => {
  const [replies, setReplies] = React.useState({});
  React.useEffect(() => {
    setReplies({});
    if (!thread) return;
    const node = gun.get(`t/${thread}/r`);
    node.on((d) => {
      const out = {};
      if (d) {
        Object.entries(d).forEach(([pk, rv]) => {
          if (pk === '_' || !rv || typeof rv !== 'object') return;
          const list = Object.entries(rv)
            .map(([rk, v]) => {
              if (rk === '_') return null;
              if (typeof v === 'string') return { key: rk, text: v, by: null }; // legacy: host
              if (v && typeof v === 'object' && typeof v.text === 'string') {
                return { key: rk, text: v.text, by: v.by || null };
              }
              return null;
            })
            .filter(Boolean)
            .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
          if (list.length) out[pk] = list;
        });
      }
      setReplies(out);
    });
    return () => node.off();
  }, [thread]);
  return replies;
};

export const addReply = (thread, postKey, replyKey, text, authorId) => {
  if (!thread || !postKey || !replyKey || !text) return;
  gun.get(`t/${thread}/r`).get(postKey).put({ [replyKey]: { text, by: authorId || null } });
};

export const deleteReply = (thread, postKey, replyKey) => {
  if (!thread || !postKey || !replyKey) return;
  gun.get(`t/${thread}/r`).get(postKey).get(replyKey).put(null);
};

// ---- Merge duplicates ----

// Marks sourceKey as merged into targetKey (st/<sourceKey> = {mergedInto}).
// Gun merges objects on put, so existing status fields (answered, flags)
// are preserved.
export const mergeInto = (thread, sourceKey, targetKey) => {
  if (!thread || !sourceKey || !targetKey || sourceKey === targetKey) return;
  gun.get(`t/${thread}/st`).get(sourceKey).put({ mergedInto: targetKey });
};

export const unmerge = (thread, sourceKey) => {
  if (!thread || !sourceKey) return;
  gun.get(`t/${thread}/st`).get(sourceKey).get('mergedInto').put(null);
};

// ---- Live polls ----

// Poll defs live at t/<thread>/polls/<pollId> =
//   {q, options: {0: "a", 1: "b"}, by, createdAt, closed}.
// Votes live at t/<thread>/polls/<pollId>/votes/<voterId> = optionIndex
// (one vote per browser, changeable while the poll is open).
// Client-enforced like all host controls: host-only creation is a UI
// convention, and a closed poll only disables voting in this client.
export const createPoll = (thread, pollId, { q, options, by }) => {
  if (!thread || !pollId || !q || !options || options.length < 2) return;
  const opts = {};
  options.slice(0, 6).forEach((o, i) => { opts[i] = o; });
  gun.get(`t/${thread}/polls`).put({
    [pollId]: { q, options: opts, by: by || null, createdAt: Date.now(), closed: false },
  });
};

export const votePoll = (thread, pollId, idx) => {
  if (!thread || !pollId || idx == null) return;
  gun.get(`t/${thread}/polls`).get(pollId).get('votes').put({ [getVoterId()]: idx });
};

export const setPollClosed = (thread, pollId, closed) => {
  if (!thread || !pollId) return;
  gun.get(`t/${thread}/polls`).get(pollId).put({ closed: !!closed });
};

export const deletePoll = (thread, pollId) => {
  if (!thread || !pollId) return;
  gun.get(`t/${thread}/polls`).get(pollId).put(null);
};

const parsePollOptions = (o) => {
  if (!o || typeof o !== 'object') return [];
  return Object.entries(o)
    .filter(([k]) => k !== '_')
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, v]) => String(v ?? ''));
};

// Subscribes to poll defs + each poll's votes node.
// Returns [{id, q, options[], by, createdAt, closed, counts[], total, myVote}].
export const usePolls = (thread) => {
  const [defs, setDefs] = React.useState({});
  const [votes, setVotes] = React.useState({});

  React.useEffect(() => {
    setDefs({});
    if (!thread) return;
    const node = gun.get(`t/${thread}/polls`);
    node.on((d) => {
      const out = {};
      if (d) {
        Object.entries(d).forEach(([k, v]) => {
          if (k === '_' || !v) return;
          out[k] = {
            id: k,
            q: v.q || '',
            options: parsePollOptions(v.options),
            by: v.by || null,
            createdAt: v.createdAt || 0,
            closed: !!v.closed,
          };
        });
      }
      setDefs(out);
    });
    return () => node.off();
  }, [thread]);

  const pollIds = Object.keys(defs).sort().join(',');
  React.useEffect(() => {
    setVotes({});
    if (!thread || !pollIds) return;
    const unsubs = pollIds.split(',').map((id) => {
      const node = gun.get(`t/${thread}/polls`).get(id).get('votes');
      node.on((d) => {
        const out = {};
        if (d) {
          Object.entries(d).forEach(([k, v]) => {
            if (k === '_' || v == null) return;
            const n = Number(v);
            if (Number.isFinite(n)) out[k] = n;
          });
        }
        setVotes((prev) => ({ ...prev, [id]: out }));
      });
      return () => node.off();
    });
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, pollIds]);

  const mine = getVoterId();
  return React.useMemo(() => {
    const list = Object.values(defs)
      .map((p) => {
        const vm = votes[p.id] || {};
        const counts = p.options.map((_, i) =>
          Object.values(vm).filter((v) => v === i).length
        );
        return {
          ...p,
          counts,
          total: counts.reduce((a, b) => a + b, 0),
          myVote: vm[mine],
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defs, votes]);
};
