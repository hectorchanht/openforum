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
