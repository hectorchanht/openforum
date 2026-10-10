import { BellIcon, DownloadIcon, EditIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  IconButton,
  Input,
  Select,
  Skeleton,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { avatarFor, downloadCSV, fmtCountdown, pseudonym, timeAgo } from "../libs/helpers";
import { track } from "../libs/analytics";
import {
  approvePending,
  countKeys,
  getVoterId,
  rejectPending,
  setMutedAuthor,
  useAuthors,
  useNewQuestionNotify,
  usePending,
  usePolls,
  usePosts,
  usePostStatus,
  useThreadMeta,
  useVotes,
} from "../libs/hooks";
import {
  authorFilterAtom,
  densityAtom,
  myOnlyAtom,
  searchAtom,
  sortModeAtom,
  statusFilterAtom,
  threadIdAtom,
} from "../libs/jotaiAtoms";
import ShareQR from "./ShareQR";
import { PollCreateModal } from "./PollsSection";

const SLOW_OPTIONS = [
  { label: 'Off', sec: 0 },
  { label: '15s', sec: 15 },
  { label: '30s', sec: 30 },
  { label: '60s', sec: 60 },
];

const FilterTabs = () => {
  const [filter, setFilter] = useAtom(statusFilterAtom);
  const [myOnly, setMyOnly] = useAtom(myOnlyAtom);
  const [, setAuthorFilter] = useAtom(authorFilterAtom);
  const tabs = [
    { id: 'open', label: '🟢 Open' },
    { id: 'answered', label: '✅ Answered' },
    { id: 'all', label: '📋 All' },
  ];
  return (
    <HStack spacing={1} flexWrap="wrap">
      <HStack spacing={1} bg="whiteAlpha.100" p={1} borderRadius="xl" flexWrap="wrap">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="md"
            minH="44px"
            variant={filter === t.id ? 'solid' : 'ghost'}
            colorScheme={filter === t.id ? 'purple' : 'gray'}
            borderRadius="lg"
            onClick={() => setFilter(t.id)}
            aria-pressed={filter === t.id}
          >
            {t.label}
          </Button>
        ))}
      </HStack>
      <Tooltip label="Show only the questions you asked">
        <Button
          size="md"
          minH="44px"
          variant={myOnly ? 'solid' : 'ghost'}
          colorScheme={myOnly ? 'cyan' : 'gray'}
          borderRadius="lg"
          onClick={() => {
            setMyOnly(!myOnly);
            if (!myOnly) setAuthorFilter(null); // mutually exclusive with author filter
          }}
          aria-pressed={myOnly}
        >
          🙋 Mine
        </Button>
      </Tooltip>
    </HStack>
  );
};

// Host-only authors panel: distinct pseudonymous authors with per-author
// counts; click a row to filter the question list, mute to hide their posts
// from the audience (client-enforced, like all host controls).
const AuthorsPanel = ({ thread, posts, votes, authors, mutedMap }) => {
  const [open, setOpen] = React.useState(false);
  const [authorFilter, setAuthorFilter] = useAtom(authorFilterAtom);
  const [, setMyOnly] = useAtom(myOnlyAtom);

  const rows = React.useMemo(() => {
    const by = {};
    posts.forEach((p) => {
      const id = authors[p.key];
      if (!id) return;
      if (!by[id]) by[id] = { id, questions: 0, votes: 0 };
      by[id].questions += 1;
      by[id].votes += countKeys(votes[p.key]);
    });
    return Object.values(by).sort(
      (a, b) => b.questions - a.questions || b.votes - a.votes
    );
  }, [posts, votes, authors]);

  if (!rows.length) return null;

  return (
    <Box>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        minH="40px"
      >
        👥 Authors ({rows.length}) {open ? '▾' : '▸'}
      </Button>
      <Collapse in={open} animateOpacity>
        <VStack align="stretch" spacing={1} mt={2} layerStyle="glass" p={2} borderRadius="xl">
          {rows.map((r) => {
            const av = avatarFor(r.id);
            const muted = !!mutedMap[r.id];
            const active = authorFilter === r.id;
            return (
              <HStack
                key={r.id}
                w="100%"
                justify="space-between"
                p={2}
                borderRadius="lg"
                bg={active ? 'whiteAlpha.200' : undefined}
                _hover={{ bg: 'whiteAlpha.100' }}
                cursor="pointer"
                onClick={() => {
                  setAuthorFilter(active ? null : r.id);
                  setMyOnly(false);
                }}
              >
                <HStack spacing={2} minW={0}>
                  <Avatar
                    size="xs"
                    bg={`${av.color}.500`}
                    icon={<Text fontSize="sm">{av.emoji}</Text>}
                  />
                  <VStack align="start" spacing={0} minW={0}>
                    <Text fontSize="sm" fontWeight="semibold" isTruncated>
                      {pseudonym(r.id)}
                    </Text>
                    <Text fontSize="xs" opacity={0.6}>
                      {r.questions} question{r.questions !== 1 ? 's' : ''} · {r.votes} vote{r.votes !== 1 ? 's' : ''}
                    </Text>
                  </VStack>
                  {muted && <Badge colorScheme="red">muted</Badge>}
                </HStack>
                <Button
                  size="sm"
                  minH="36px"
                  variant="outline"
                  colorScheme={muted ? 'green' : 'red'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMutedAuthor(thread, r.id, !muted);
                  }}
                >
                  {muted ? 'Unmute' : 'Mute'}
                </Button>
              </HStack>
            );
          })}
          <Text fontSize="xs" opacity={0.55} px={2} pb={1}>
            Muting hides an author&apos;s questions from the audience (host still sees them, dimmed).
            Client-enforced — a modified client could still read them.
          </Text>
        </VStack>
      </Collapse>
    </Box>
  );
};

// Room command center: title, live stats, search/sort/filter, host controls.
// Layout priority on mobile: title → compact stats → search/sort/filter
// (audience core) → a few audience actions → host tools tucked into one
// collapsible so the room header never becomes a wall of controls.
const RoomHeader = () => {
  const [thread] = useAtom(threadIdAtom);
  const [sortMode, setSortMode] = useAtom(sortModeAtom);
  const [search, setSearch] = useAtom(searchAtom);
  const [density, setDensity] = useAtom(densityAtom);
  const { meta, isHost, expired, closed, readOnly, updateMeta, hostId, claimHost, needsCreation } = useThreadMeta(thread);
  const posts = usePosts(thread, null);
  const votes = useVotes(thread);
  const status = usePostStatus(thread);
  const authors = useAuthors(thread);
  const pending = usePending(thread);
  const notify = useNewQuestionNotify(thread);
  const polls = usePolls(thread);
  const toast = useToast();

  const [editing, setEditing] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState('');
  const [descDraft, setDescDraft] = React.useState('');
  const [keyOpen, setKeyOpen] = React.useState(false);
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [claimDraft, setClaimDraft] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [pendingOpen, setPendingOpen] = React.useState(false);
  const [pollOpen, setPollOpen] = React.useState(false);
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [, force] = React.useReducer((x) => x + 1, 0);

  // re-render the countdown text
  React.useEffect(() => {
    if (!meta || meta.expiresAt == null || expired) return;
    const id = setInterval(force, 30000);
    return () => clearInterval(id);
  }, [meta, expired]);

  React.useEffect(() => { setSearch(''); }, [thread, setSearch]);

  const stats = React.useMemo(() => {
    const voterIds = new Set();
    let totalVotes = 0;
    Object.values(votes || {}).forEach((o) => {
      if (o && typeof o === 'object') {
        Object.keys(o).forEach((k) => {
          if (k !== '_' && o[k]) {
            voterIds.add(k);
            totalVotes++;
          }
        });
      }
    });
    Object.values(authors || {}).forEach((id) => voterIds.add(id));
    return {
      questions: posts.length,
      votes: totalVotes,
      participants: voterIds.size,
    };
  }, [posts, votes, authors]);

  // Vote budget: spent count derived honestly from the graph (v/<postKey>
  // entries containing our voter id), not a local counter.
  const voteBudget = meta ? meta.voteBudget : 5; // 0 = unlimited; missing → 5 (parsed)
  const myId = getVoterId();
  const spentVotes = React.useMemo(() => {
    let n = 0;
    Object.entries(votes || {}).forEach(([k, o]) => {
      if (k === '_' || !o || typeof o !== 'object') return;
      if (o[myId]) n++;
    });
    return n;
  }, [votes, myId]);
  const votesLeft = voteBudget > 0 ? Math.max(0, voteBudget - spentVotes) : null;

  if (!thread) return null;

  // Skeleton only while the room's metadata might still be streaming in from
  // the relay. For a room that was never created, meta never arrives —
  // once the load settles (needsCreation) we drop the skeleton instead of
  // leaving it spinning forever; ThreadMeta's "Start this room as host?"
  // card covers that state.
  if (!meta && !needsCreation) {
    return (
      <Box layerStyle="glass" p={4} mb={4} aria-label="Loading queue…">
        <VStack align="stretch" spacing={3}>
          <Skeleton height="26px" width="55%" borderRadius="md" />
          <Skeleton height="16px" width="80%" borderRadius="md" />
          <Skeleton height="44px" width="100%" borderRadius="xl" />
        </VStack>
      </Box>
    );
  }
  if (!meta) return null; // uncreated room — nothing to head

  const openPresent = () => {
    track('present_view_opened');
    window.open(`${window.location.origin}/${thread}?present=1`, '_blank', 'noopener');
  };

  const exportCSV = () => {
    track('queue_exported');
    const rows = [
      ['question', 'author', 'votes', 'status', 'flags', 'asked_at'],
      ...posts.map((p) => {
        const st = status[p.key] || {};
        const flagN = countKeys(st.flags);
        const stLabel = st.mergedInto
          ? 'merged'
          : st.answered
            ? 'answered'
            : st.hidden || flagN >= 3
              ? 'hidden'
              : 'open';
        const ts = Number(String(p.key).split('-')[0]);
        return [
          String(p.text),
          pseudonym(authors[p.key]),
          String(countKeys(votes[p.key])),
          stLabel,
          String(flagN),
          Number.isNaN(ts) ? '' : new Date(ts).toISOString(),
        ];
      }),
    ];
    if (polls.length > 0) {
      rows.push([]);
      rows.push(['POLLS']);
      rows.push(['poll', 'option', 'votes', 'percent', 'status', 'created_at']);
      polls.forEach((p) => {
        const pts = Number(p.createdAt);
        p.options.forEach((opt, i) => {
          const c = p.counts[i] || 0;
          rows.push([
            p.q,
            opt,
            String(c),
            p.total > 0 ? `${Math.round((c / p.total) * 100)}%` : '0%',
            p.closed ? 'closed' : 'open',
            !pts || Number.isNaN(pts) ? '' : new Date(pts).toISOString(),
          ]);
        });
      });
    }
    downloadCSV(`openq-${thread}-export.csv`, rows);
    toast({ title: 'CSV exported', status: 'success', duration: 1500, isClosable: true });
  };

  const toggleNotify = async () => {
    const res = await notify.toggle();
    if (res === 'denied') {
      toast({
        title: 'Notifications blocked',
        description: 'Allow notifications in your browser settings, then try again.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
    } else if (res === 'unsupported') {
      toast({ title: 'Notifications not supported in this browser', status: 'warning', duration: 3000 });
    } else if (!notify.enabled) {
      toast({ title: '🔔 You\'ll be notified of new questions', status: 'success', duration: 2000 });
    }
  };

  const saveTitleDesc = () => {
    updateMeta({ title: titleDraft.trim() || null, desc: descDraft.trim() || null });
    setEditing(false);
  };

  const copyHostKey = async () => {
    if (!hostId) return;
    try {
      await navigator.clipboard.writeText(hostId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Copy failed — select the key manually', status: 'warning', duration: 2000 });
    }
  };

  const doClaimHost = () => {
    if (!claimDraft.trim()) return;
    claimHost(claimDraft);
    setClaimDraft('');
    setClaimOpen(false);
    toast({
      title: 'Host key saved 🔑',
      description: 'If the key matches this queue, host controls are now unlocked.',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  const doApprove = (key, text) => {
    approvePending(thread, key, text);
    toast({ title: 'Question approved ✅', status: 'success', duration: 1500, isClosable: true });
  };

  const doReject = (key) => {
    rejectPending(thread, key);
    toast({ title: 'Question rejected', status: 'info', duration: 1500, isClosable: true });
  };

  return (
    <Box layerStyle="glass" p={4} mb={4}>
      <VStack align="stretch" spacing={3}>
        {/* Room hero — the room name lives here, below the slim header,
            with its own breathing room instead of competing for header
            space. (host-editable) */}
        <Box>
          {editing ? (
            <VStack align="stretch" spacing={2}>
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitleDesc(); }}
                placeholder="Queue title — e.g. Town Hall Q&A"
                maxLength={80}
              />
              <Input
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveTitleDesc(); }}
                placeholder="Short description for the audience"
                maxLength={160}
              />
              <HStack>
                <Button size="sm" colorScheme="purple" onClick={saveTitleDesc}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </HStack>
            </VStack>
          ) : (
            <HStack align="start" justify="space-between" spacing={3}>
              <Box minW={0}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  letterSpacing="0.14em"
                  textTransform="uppercase"
                  color="purple.300"
                  mb={1}
                >
                  📋 The queue
                </Text>
                <Text
                  fontSize={{ base: '2xl', md: '3xl' }}
                  fontWeight="extrabold"
                  lineHeight="1.15"
                  wordBreak="break-word"
                >
                  {meta.title || thread}
                </Text>
                {meta.desc && (
                  <Text fontSize="md" opacity={0.75} mt={1.5}>{meta.desc}</Text>
                )}
              </Box>
              {isHost && (
                <Tooltip label="Edit queue title & description">
                  <IconButton
                    size="sm"
                    minH="40px"
                    minW="40px"
                    variant="ghost"
                    aria-label="edit queue title"
                    icon={<EditIcon />}
                    onClick={() => {
                      setTitleDraft(meta.title || '');
                      setDescDraft(meta.desc || '');
                      setEditing(true);
                    }}
                    flexShrink={0}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
        </Box>

        {/* Live stats — one compact line instead of a badge wall */}
        <Text fontSize="sm" lineHeight="1.6">
          {isHost && <Text as="span" mr={1}>👑</Text>}
          💬 <Text as="span" fontWeight="bold">{stats.questions}</Text> question{stats.questions !== 1 ? 's' : ''}
          {' · '}▲ <Text as="span" fontWeight="bold">{stats.votes}</Text> vote{stats.votes !== 1 ? 's' : ''}
          {' · '}👥 ~<Text as="span" fontWeight="bold">{stats.participants}</Text> here
          {meta.expiresAt != null && !expired && (
            <Text as="span"> · ⏳ {fmtCountdown(meta.expiresAt - Date.now())}</Text>
          )}
          {meta.expiresAt == null && <Text as="span"> · ∞ never expires</Text>}
        </Text>

        {/* Room status badges — only the ones that need attention */}
        <HStack spacing={2} flexWrap="wrap">
          {meta.slowModeSec > 0 && (
            <Badge fontSize="xs" px={2} py={1} colorScheme="yellow">🐢 slow mode {meta.slowModeSec}s</Badge>
          )}
          {meta.moderated && (
            <Badge fontSize="xs" px={2} py={1} colorScheme="orange">🛡 host reviews questions before they go live</Badge>
          )}
          {voteBudget > 0 ? (
            <Tooltip label={votesLeft <= 0 ? 'You\'ve used all your votes — retract one to get it back' : 'Tapping ▲ spends one vote — retracting refunds it'}>
              <Badge fontSize="xs" px={2} py={1} colorScheme={votesLeft <= 0 ? 'red' : 'teal'}>
                🗳️ {votesLeft} of {voteBudget} votes left
              </Badge>
            </Tooltip>
          ) : (
            <Badge fontSize="xs" px={2} py={1} colorScheme="gray">🗳️ unlimited votes</Badge>
          )}
        </HStack>

        {/* Search + sort — primary audience controls */}
        <HStack spacing={2}>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            placeholder="🔍 Search questions…"
            size="md"
            minH="44px"
            flex={1}
            minW={0}
            aria-label="Search questions"
          />
          <Select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            maxW="148px"
            flexShrink={0}
            size="md"
            minH="44px"
            aria-label="Sort questions"
          >
            <option value="top">🔥 Top votes</option>
            <option value="newest">🕐 Newest</option>
          </Select>
        </HStack>
        <FilterTabs />

        {/* Audience actions — the few things everyone needs */}
        <HStack spacing={2} flexWrap="wrap">
          <Tooltip label={density === 'compact' ? 'Switch to comfortable spacing' : 'Switch to compact spacing — fit more questions on screen'}>
            <Button
              size="sm"
              minH="40px"
              variant="outline"
              onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              aria-pressed={density === 'compact'}
            >
              {density === 'compact' ? '↕️ Comfortable' : '↕️ Compact'}
            </Button>
          </Tooltip>
          <Tooltip label={notify.enabled ? 'Turn off new-question alerts' : 'Get a ping when a new question arrives'}>
            <Button
              size="sm"
              minH="40px"
              variant={notify.enabled ? 'solid' : 'outline'}
              colorScheme={notify.enabled ? 'purple' : 'gray'}
              leftIcon={<BellIcon />}
              onClick={toggleNotify}
            >
              {notify.enabled ? 'Alerts on' : 'Notify me'}
            </Button>
          </Tooltip>
          <ShareQR thread={thread} />
          <Tooltip label="Download all questions, votes, and poll results as a spreadsheet">
            <Button size="sm" minH="40px" variant="outline" leftIcon={<DownloadIcon />} onClick={exportCSV}>
              📥 Export
            </Button>
          </Tooltip>
          <Tooltip label="Fullscreen projector view — shows the spotlighted question big and updates live as the host moves on">
            <Button size="sm" minH="40px" variant="outline" leftIcon={<ExternalLinkIcon />} onClick={openPresent}>
              🎙 Present
            </Button>
          </Tooltip>
          {isHost && (
            <Button
              size="sm"
              minH="40px"
              variant={toolsOpen ? 'solid' : 'outline'}
              colorScheme="purple"
              onClick={() => setToolsOpen(!toolsOpen)}
              aria-expanded={toolsOpen}
            >
              🛠 Host tools{pending.length > 0 ? ` (${pending.length} ⏳)` : ''} {toolsOpen ? '▾' : '▸'}
            </Button>
          )}
          {!isHost && (
            <Button
              size="sm"
              minH="40px"
              variant="ghost"
              onClick={() => { setClaimOpen(!claimOpen); setKeyOpen(false); }}
            >
              🔑 Have a host key?
            </Button>
          )}
        </HStack>

        {/* Host tools — everything host-only lives in this one collapsible */}
        {isHost && (
          <Collapse in={toolsOpen} animateOpacity>
            <VStack align="stretch" spacing={2} layerStyle="glass" p={3} borderRadius="xl">
              <Button
                size="sm"
                minH="44px"
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => setPollOpen(true)}
              >
                📊 New poll
                <Text as="span" fontWeight="normal" opacity={0.6} fontSize="xs" ml={2}>
                  single choice, results update live
                </Text>
              </Button>
              {pending.length > 0 && (
                <Button
                  size="sm"
                  minH="44px"
                  justifyContent="flex-start"
                  variant="ghost"
                  colorScheme="orange"
                  onClick={() => setPendingOpen(!pendingOpen)}
                >
                  ⏳ Review pending questions ({pending.length})
                </Button>
              )}
              <HStack justify="space-between" flexWrap="wrap" spacing={2}>
                <Tooltip label="Limit how often each person can post — slows down spam">
                  <Text fontSize="sm">🐢 Slow mode</Text>
                </Tooltip>
                <Select
                  value={meta.slowModeSec || 0}
                  onChange={(e) => updateMeta({ slowModeSec: Number(e.target.value) })}
                  maxW="140px"
                  size="md"
                  aria-label="Slow mode cooldown"
                >
                  {SLOW_OPTIONS.map((o) => (
                    <option key={o.sec} value={o.sec}>🐢 {o.label}</option>
                  ))}
                </Select>
              </HStack>
              <HStack justify="space-between" flexWrap="wrap" spacing={2}>
                <Tooltip label="How many upvotes each person gets in this queue — retracting a vote refunds it">
                  <Text fontSize="sm">🗳️ Votes per person <Text as="span" opacity={0.55} fontSize="xs">(0 = unlimited)</Text></Text>
                </Tooltip>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={voteBudget}
                  onChange={(e) => {
                    const n = Math.floor(Number(e.target.value));
                    if (Number.isFinite(n) && n >= 0 && n <= 999) updateMeta({ voteBudget: n });
                  }}
                  maxW="110px"
                  size="md"
                  aria-label="Votes per person — type any number, 0 means unlimited"
                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                />
              </HStack>
              <Button
                size="sm"
                minH="44px"
                justifyContent="flex-start"
                variant="ghost"
                colorScheme={meta.moderated ? 'orange' : 'gray'}
                onClick={() => updateMeta({ moderated: !meta.moderated })}
              >
                🛡 {meta.moderated ? 'Pre-moderation on — tap to turn off' : 'Pre-moderation — approve questions before they go live'}
              </Button>
              <Button
                size="sm"
                minH="44px"
                justifyContent="flex-start"
                variant="ghost"
                onClick={() => { setKeyOpen(!keyOpen); setClaimOpen(false); }}
              >
                🔑 Host key — save it or share with a co-host
              </Button>
              <Button
                size="sm"
                minH="44px"
                justifyContent="flex-start"
                variant="ghost"
                colorScheme={closed ? 'green' : 'red'}
                onClick={() => updateMeta({ closed: !closed })}
              >
                {closed ? '🟢 Reopen queue' : '🔴 Close queue (read-only for everyone)'}
              </Button>
            </VStack>
          </Collapse>
        )}

        {/* Host key panel (host) */}
        {isHost && (
          <Collapse in={keyOpen} animateOpacity>
            <Box layerStyle="glass" p={3} borderRadius="xl">
              <Text fontSize="sm" fontWeight="bold" mb={2}>🔑 Your host key</Text>
              <HStack>
                <Input
                  value={hostId || ''}
                  isReadOnly
                  size="sm"
                  fontFamily="mono"
                  minW={0}
                  onFocus={(e) => e.target.select()}
                />
                <Button size="sm" minH="40px" onClick={copyHostKey} flexShrink={0}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </HStack>
              <Text fontSize="xs" opacity={0.7} mt={2} lineHeight="1.5">
                This key is the only proof that you&apos;re the host. <b>Save it somewhere safe</b> —
                enter it on another device to regain host access, or share it with someone to make
                them a co-host. Anyone holding this key can moderate the room. It lives in this
                browser&apos;s localStorage — clearing site data orphans the room unless you saved the key.
                (Client-enforced: anyone who can write to the Gun graph could overwrite the host id
                directly — treat the key as a shared secret, not cryptographic auth.)
              </Text>
            </Box>
          </Collapse>
        )}
        {!isHost && (
          <Collapse in={claimOpen} animateOpacity>
            <Box layerStyle="glass" p={3} borderRadius="xl">
              <Text fontSize="sm" fontWeight="bold" mb={2}>🔑 Claim host access</Text>
              <HStack>
                <Input
                  value={claimDraft}
                  onChange={(e) => setClaimDraft(e.target.value)}
                  placeholder="Paste the queue's host key…"
                  size="sm"
                  fontFamily="mono"
                  minW={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') doClaimHost(); }}
                />
                <Button size="sm" minH="40px" colorScheme="purple" onClick={doClaimHost} isDisabled={!claimDraft.trim()} flexShrink={0}>
                  Claim host
                </Button>
              </HStack>
              <Text fontSize="xs" opacity={0.6} mt={2}>
                Entering the room&apos;s host key restores host controls in this browser.
                Ask the original host (or a co-host) for the key.
              </Text>
            </Box>
          </Collapse>
        )}

        {/* Pending moderation queue */}
        {isHost && pendingOpen && (
          <Box layerStyle="glass" p={3} borderRadius="xl">
            <Text fontSize="sm" fontWeight="bold" mb={2}>
              ⏳ Pending review ({pending.length})
            </Text>
            {readOnly && (
              <Text fontSize="xs" color="orange.300" mb={2}>
                Room is read-only — approvals are disabled, but you can still reject.
              </Text>
            )}
            <VStack align="stretch" spacing={2}>
              {pending.map((item) => (
                <HStack
                  key={item.key}
                  justify="space-between"
                  align="start"
                  bg="whiteAlpha.50"
                  p={2}
                  borderRadius="lg"
                >
                  <Box minW={0} flex={1}>
                    <Text fontSize="sm" wordBreak="break-word">{String(item.text)}</Text>
                    <Text fontSize="xs" opacity={0.6} mt={0.5}>
                      {pseudonym(authors[item.key])} · {timeAgo(Number(String(item.key).split('-')[0]))}
                    </Text>
                  </Box>
                  <HStack flexShrink={0}>
                    <Button
                      size="sm"
                      minH="40px"
                      colorScheme="green"
                      onClick={() => doApprove(item.key, String(item.text))}
                      isDisabled={readOnly}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      minH="40px"
                      variant="outline"
                      colorScheme="red"
                      onClick={() => doReject(item.key)}
                    >
                      Reject
                    </Button>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </Box>
        )}

        {/* Host: authors panel (pseudonymity + mute) */}
        {isHost && (
          <AuthorsPanel
            thread={thread}
            posts={posts}
            votes={votes}
            authors={authors}
            mutedMap={meta.mutedAuthors || {}}
          />
        )}

        {/* Poll creation modal (host) */}
        <PollCreateModal
          isOpen={pollOpen}
          onClose={() => setPollOpen(false)}
          thread={thread}
        />
      </VStack>
    </Box>
  );
};

export default RoomHeader;
