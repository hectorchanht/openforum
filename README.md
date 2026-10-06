# 🎤 OpenMic

**Give your audience an open mic** — live anonymous Q&A for events. Open a
link, get questions in realtime. No signup, no app, no friction.

Live demo: [openmic.hectorchan.com](https://openmic.hectorchan.com)

## How it works

Text data is stored with [Gun.js](https://gun.eco), a decentralized graph
database, in 3 levels:

1. **Public landing page** — anything goes, visible to everyone.
2. **A secret page** — type a `secret token` and hit the green arrow
   (or visit `/your-token`) to open a room only people with the token can find.
3. **A password-protected holy page** — type a `secret token` + a `password`
   (8+ chars) and hit the purple arrow. First login creates the account;
   `u/your-alias` shows your own private page. Press `Esc` to leave a thread.

## Event Q&A features

Threads double as live Q&A rooms:

- **Upvotes** — every post has an ▲ button with a vote count. Click to vote,
  click again to retract. Votes are stored per post at
  `t/<thread>/v/<postKey>` as `{voterId: 1}`; your anonymous voter id lives in
  `localStorage` (`rg_vid`). Posts sort pinned-first, then by votes, then newest.
- **Host controls** — the first visitor to a thread with no host becomes the
  host by creating it (`t/<thread>/meta` = `{hostId, createdAt, expiresAt, closed}`).
  The host id is kept in `localStorage` (`rg_host_<thread>`). Hosts can pin one
  post to the top, delete posts (votes are cleared too), and close/reopen the
  thread.
- **Expiring threads** — when creating a thread, the host picks a lifetime:
  1 hour, 24 hours, 7 days, or never. The thread view shows a live countdown.
  Expired or closed threads are read-only (posting and voting disabled, posts
  still readable). Note: expiry is client-enforced — Gun has no server-side
  TTL, so treat it as a UX feature, not a security boundary.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

By default the app syncs through a self-hosted Gun relay. Point it at your
own relay(s) instead:

```bash
# .env.local
NEXT_PUBLIC_GUN_PEERS=https://your-relay.example.com/gun
```

(Comma-separated for multiple relays — Gun's mesh uses whichever are reachable.)

## Self-hosting a relay

The original Heroku relay is long gone. To run your own:

1. Deploy [rushgun-relay](https://github.com/hectorchanht/rushgun-relay)
   (tiny Node Gun server — Railway, Render, Fly.io, or any Node host).
2. Set `NEXT_PUBLIC_GUN_PEERS` to `https://your-relay/gun`.

## Tech

- [Next.js](https://nextjs.org) 14 + React 18
- [Chakra UI](https://chakra-ui.com) for components
- [Gun.js](https://gun.eco) (+ SEA for user auth) for decentralized storage
- [Jotai](https://jotai.org) for state

## License

MIT — see [LICENSE](LICENSE).
