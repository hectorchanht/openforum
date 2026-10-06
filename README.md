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

- **Upvotes** — every question has a big ▲ button with a vote count. Click to vote,
  click again to retract. Votes are stored per post at
  `t/<thread>/v/<postKey>` as `{voterId: 1}`; your anonymous voter id lives in
  `localStorage` (`rg_vid`). Cards animate as they re-sort.
- **Host controls** — the first visitor to a thread with no host becomes the
  host by creating it (`t/<thread>/meta` = `{hostId, createdAt, expiresAt, closed}`).
  The host id is kept in `localStorage` (`rg_host_<thread>`). Hosts can pin one
  post to the top, delete posts (votes and status are cleared too), and close/reopen the
  thread. All host controls are client-enforced (see caveat below).
- **Mark answered** — the host taps ✓ on a question to mark it answered
  (stored at `t/<thread>/st/<postKey>` as `{answered, hidden, flags: {voterId: 1}}`).
  Answered questions get a green badge; filter tabs switch between
  🟢 Open / ✅ Answered / 📋 All.
- **Spotlight + present mode** — the host spotlights a question ("🎙 now discussing",
  stored as `meta.discussingKey`) and it renders as a teleprompter-style banner
  in the room. Open `/<room>?present=1` on a projector/second screen for a
  full-screen live view showing only the spotlighted question — it updates
  automatically as the host moves on.
- **Search & sort** — a search box filters questions as they arrive; sort by
  🔥 Top votes or 🕐 Newest (pinned questions always stay first).
- **Duplicate guard** — while typing, a fuzzy token-overlap match warns
  "Similar question already asked" so the audience upvotes instead of re-posting.
- **Audience flagging** — any viewer can flag a question; 3 flags auto-hide it
  from non-hosts. The host sees flagged posts (dimmed, with flag count) and can
  unhide or delete them. Client-enforced.
- **Slow mode** — the host can set a 15/30/60s per-browser cooldown between posts
  (`meta.slowModeSec`, localStorage-enforced). Client-enforced — noted in the UI.
- **Host notifications** — opt-in toggle: a browser notification + subtle ping
  whenever a new question arrives (permission asked on toggle, choice persisted).
- **Live stats** — question count, total votes, and ~participants
  (distinct voter ids from votes + author ids) in the room header.
- **CSV export** — the host downloads every question with author pseudonym,
  votes, status (answered/open/hidden), flag count, and timestamp.
- **Room title & description** — host-editable (`meta.title`, `meta.desc`),
  shown at the top of the room.
- **Anonymous avatars** — each post gets a deterministic emoji+color badge
  derived from the asker's anonymous id (stored additively at
  `t/<thread>/a/<postKey>`; old posts just show a default).
- **Pseudonymous authors** — every author id deterministically maps to a
  friendly pseudonym like "Clever Fox-7Q2" (same browser always gets the same
  name). Everyone sees the emoji avatar; the **host sees the pseudonym** next to
  it, and every viewer sees it as a tooltip. Your own questions get a cyan ring
  + "you" badge so you can spot them, and the 🙋 **Mine** chip filters the list
  to just your questions.
- **Host Authors panel** — lists every distinct author in the room with their
  question count and total votes received. Click a row to filter the question
  list to that author (combines with the Open/Answered/All tabs and search).
  Each row has a **Mute** button: muted authors' questions are hidden from the
  audience (the host still sees them, dimmed, and can unmute). Mutes are stored
  at `t/<thread>/meta/mutedAuthors` and are client-enforced.
- **Host replies (visible answers)** — the host can reply to any question; replies
  render threaded under the question card for everyone, with a HOST badge. One
  level only (no nested replies). Stored at `t/<thread>/r/<postKey>/<replyKey>`,
  host-only writes (client-enforced, same trust model as pin/delete).
- **Host key / co-hosts** — the host id lives in `localStorage` (`rg_host_<thread>`),
  so clearing site data orphans the room. The room header's **🔑 Host key** panel
  shows the key with a copy button: save it, enter it on another device to regain
  host (**🔑 Have a host key?** claim box), or share it to add a co-host. Anyone
  holding the key can moderate the room. Note: the key is a *shared secret*, not
  cryptographic auth — any client that can write to the Gun graph could overwrite
  `meta.hostId` directly (last-writer-wins), so treat it like a password.
- **Pre-moderation mode** — host toggle (`meta.moderated`). When on, audience
  questions go to a pending queue (`t/<thread>/p/<postKey>`) instead of the visible
  list; the asker gets a "Sent for review 👀" toast and the host gets a
  "⏳ Pending review (n)" queue with Approve / Reject per item. Approving copies the
  text into the main node (votes/flags/answered then apply); rejecting drops it.
  Author ids are still recorded at `a/<postKey>` so the host sees who asked.
  Client-enforced.
- **Merge duplicates** — the host can merge a question into another ("🔀 Merge" →
  searchable picker). The merged question disappears from the list and its votes
  are added to the target's displayed total (stored at `st/<sourceKey>` as
  `{mergedInto: <targetKey>}`). The target card shows a "🔀 +N merged" badge for
  the host — click it to see the merged questions and Unmerge them. Edge case: if
  the target is deleted, merged sources stay hidden from the audience; the host
  still sees them flagged ("merged into a deleted question") with an Unmerge
  button, so nothing is ever permanently stuck. Client-enforced.
- **Expiring threads** — when creating a thread, the host picks a lifetime:
  1 hour, 24 hours, 7 days, or never. The thread view shows a live countdown.
  Expired or closed threads are read-only (posting and voting disabled, posts
  still readable).

All moderation state (`st/` nodes, `r/` replies, `p/` pending, `meta.discussingKey`,
`meta.slowModeSec`, `meta.moderated`, `meta.title`, `meta.desc`,
`meta.mutedAuthors`, `a/` author ids, `st/<key>.mergedInto`) is **additive**:
rooms created by older versions keep working, they just don't have the new fields.

> **Pseudonymity model (read this):** OpenMic is *pseudonymous*, not
> unlinkably anonymous. Your browser gets a random id (`rg_vid` in
> localStorage); every question you ask is stamped with it (at
> `t/<thread>/a/<postKey>`) and deterministically mapped to a public
> pseudonym like "Clever Fox-7Q2" so the app and host can correlate which
> questions came from the same sender. The audience never sees your real
> identity — but anyone who can read the Gun graph (it's decentralized and
> public to peers) can correlate a browser's posts, and clearing localStorage
> gives you a fresh identity. If you need true unlinkability, don't rely on
> this.
>
> **Client-enforced caveat:** Gun has no server-side TTL or auth, so expiry,
> close, slow mode, hiding, muting, flagging, pre-moderation, merging, and host
> replies are UX features enforced by each client — a modified client could still
> read/write. The host key is a shared secret, not cryptographic auth: anyone who
> can write to the graph can overwrite `meta.hostId` (last-writer-wins) and seize
> host. Treat all of it as moderation conveniences, not a security boundary.

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
- [Chakra UI](https://chakra-ui.com) for components (custom dark-first glassmorphism theme)
- [Gun.js](https://gun.eco) (+ SEA for user auth) for decentralized storage
- [Jotai](https://jotai.org) for state
- [Framer Motion](https://www.framer.com/motion/) for card animations

## License

MIT — see [LICENSE](LICENSE).
