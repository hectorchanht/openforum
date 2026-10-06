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
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { avatarFor, downloadCSV, fmtCountdown, pseudonym, timeAgo } from "../libs/helpers";
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
      <HStack spacing={1} bg="whiteAlpha.100" p={1} borderRadius="xl">
        {tabs.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={filter === t.id ? 'solid' : 'ghost'}
            colorScheme={filter === t.id ? 'purple' : 'gray'}
            borderRadius="lg"
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </HStack>
      <Tooltip label="Show only the questions you asked">
        <Button
          size="sm"
          variant={myOnly ? 'solid' : 'ghost'}
          colorScheme={myOnly ? 'cyan' : 'gray'}
          borderRadius="lg"
          onClick={() => {
            setMyOnly(!myOnly);
            if (!myOnly) setAuthorFilter(null); // mutually exclusive with author filter
          }}
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
                  size="xs"
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
const RoomHeader = () => {
  const [thread] = useAtom(threadIdAtom);
  const [sortMode, setSortMode] = useAtom(sortModeAtom);
  const [search, setSearch] = useAtom(searchAtom);
  const { meta, isHost, expired, closed, updateMeta, hostId, claimHost } = useThreadMeta(thread);
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

  if (!thread || !meta) return null;

  const openPresent = () => {
    window.open(`${window.location.origin}/${thread}?present=1`, '_blank', 'noopener');
  };

  const exportCSV = () => {
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
    downloadCSV(`openforum-${thread}-export.csv`, rows);
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
      description: 'If the key matches this room, host controls are now unlocked.',
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
        {/* Title / description (host-editable) */}
        <Box>
          {editing ? (
            <VStack align="stretch" spacing={2}>
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="Room title — e.g. Town Hall Q&A"
                maxLength={80}
              />
              <Input
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder="Short description for the audience"
                maxLength={160}
              />
              <HStack>
                <Button size="sm" colorScheme="purple" onClick={saveTitleDesc}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </HStack>
            </VStack>
          ) : (
            <HStack align="start" justify="space-between">
              <Box minW={0}>
                <Text fontSize="xl" fontWeight="extrabold" lineHeight="1.2">
                  {meta.title || `t/${thread}`}
                </Text>
                {meta.desc && (
                  <Text fontSize="sm" opacity={0.75} mt={1}>{meta.desc}</Text>
                )}
              </Box>
              {isHost && (
                <Tooltip label="Edit room title & description">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="edit room title"
                    icon={<EditIcon />}
                    onClick={() => {
                      setTitleDraft(meta.title || '');
                      setDescDraft(meta.desc || '');
                      setEditing(true);
                    }}
                  />
                </Tooltip>
              )}
            </HStack>
          )}
        </Box>

        {/* Live stats */}
        <HStack spacing={2} flexWrap="wrap" fontSize="sm">
          {isHost && <Badge colorScheme="purple" fontSize="xs" px={2} py={1}>👑 host</Badge>}
          <Badge fontSize="xs" px={2} py={1} colorScheme="cyan">💬 {stats.questions} questions</Badge>
          <Badge fontSize="xs" px={2} py={1} colorScheme="blue">▲ {stats.votes} votes</Badge>
          <Badge fontSize="xs" px={2} py={1} colorScheme="green">👥 ~{stats.participants} here</Badge>
          {meta.expiresAt != null && !expired && (
            <Badge fontSize="xs" px={2} py={1} colorScheme="orange">⏳ {fmtCountdown(meta.expiresAt - Date.now())}</Badge>
          )}
          {meta.expiresAt == null && (
            <Badge fontSize="xs" px={2} py={1} colorScheme="gray">∞ never expires</Badge>
          )}
          {meta.slowModeSec > 0 && (
            <Badge fontSize="xs" px={2} py={1} colorScheme="yellow">🐢 slow mode {meta.slowModeSec}s</Badge>
          )}
          {meta.moderated && (
            <Badge fontSize="xs" px={2} py={1} colorScheme="orange">🛡 questions reviewed by host</Badge>
          )}
          {voteBudget > 0 ? (
            <Tooltip label={votesLeft <= 0 ? 'Retract an upvote to get a vote back' : 'Upvoting spends one — retracting refunds it'}>
              <Badge fontSize="xs" px={2} py={1} colorScheme={votesLeft <= 0 ? 'red' : 'teal'}>
                🗳️ {votesLeft} vote{votesLeft !== 1 ? 's' : ''} left
              </Badge>
            </Tooltip>
          ) : (
            <Badge fontSize="xs" px={2} py={1} colorScheme="gray">🗳️ unlimited votes</Badge>
          )}
        </HStack>

        {/* Search / sort / filter */}
        <HStack spacing={2} flexWrap="wrap">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search questions…"
            maxW={{ base: '100%', md: '240px' }}
            size="sm"
          />
          <Select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            maxW="150px"
            aria-label="sort questions"
          >
            <option value="top">🔥 Top votes</option>
            <option value="newest">🕐 Newest</option>
          </Select>
          <FilterTabs />
        </HStack>

        {/* Host controls */}
        <HStack spacing={2} flexWrap="wrap">
          <Button size="sm" variant="outline" leftIcon={<ExternalLinkIcon />} onClick={openPresent}>
            Present mode
          </Button>
          <Button size="sm" variant="outline" leftIcon={<DownloadIcon />} onClick={exportCSV}>
            Export CSV
          </Button>
          <Tooltip label={notify.enabled ? 'Turn off new-question alerts' : 'Get a ping when a new question arrives'}>
            <Button
              size="sm"
              variant={notify.enabled ? 'solid' : 'outline'}
              colorScheme={notify.enabled ? 'purple' : 'gray'}
              leftIcon={<BellIcon />}
              onClick={toggleNotify}
            >
              {notify.enabled ? 'Alerts on' : 'Notify me'}
            </Button>
          </Tooltip>
          <ShareQR thread={thread} />
          {isHost && (
            <>
              <Tooltip label="New questions need your approval before going live">
                <Button
                  size="sm"
                  variant={meta.moderated ? 'solid' : 'outline'}
                  colorScheme={meta.moderated ? 'orange' : 'gray'}
                  onClick={() => updateMeta({ moderated: !meta.moderated })}
                >
                  🛡 {meta.moderated ? 'Moderation on' : 'Pre-moderation'}
                </Button>
              </Tooltip>
              {pending.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="orange"
                  onClick={() => setPendingOpen(!pendingOpen)}
                >
                  ⏳ Pending review ({pending.length})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setKeyOpen(!keyOpen); setClaimOpen(false); }}
              >
                🔑 Host key
              </Button>
              <Tooltip label="Create a live single-choice poll for the audience">
                <Button size="sm" variant="outline" onClick={() => setPollOpen(true)}>
                  📊 New poll
                </Button>
              </Tooltip>
            </>
          )}
          {!isHost && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setClaimOpen(!claimOpen); setKeyOpen(false); }}
            >
              🔑 Have a host key?
            </Button>
          )}
          {isHost && (
            <>
              <Select
                value={meta.slowModeSec || 0}
                onChange={(e) => updateMeta({ slowModeSec: Number(e.target.value) })}
                maxW="130px"
                aria-label="slow mode cooldown"
              >
                {SLOW_OPTIONS.map((o) => (
                  <option key={o.sec} value={o.sec}>🐢 {o.label}</option>
                ))}
              </Select>
              <Tooltip label="How many upvotes each person gets in this room — retracting a vote refunds it">
                <Select
                  value={voteBudget}
                  onChange={(e) => updateMeta({ voteBudget: Number(e.target.value) })}
                  maxW="150px"
                  aria-label="vote budget per person"
                >
                  <option value={0}>🗳️ Unlimited</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <option key={n} value={n}>🗳️ {n} vote{n !== 1 ? 's' : ''} each</option>
                  ))}
                </Select>
              </Tooltip>
              <Button
                size="sm"
                variant="outline"
                colorScheme={closed ? 'green' : 'red'}
                onClick={() => updateMeta({ closed: !closed })}
              >
                {closed ? 'Reopen room' : 'Close room'}
              </Button>
            </>
          )}
        </HStack>

        {/* Host access panels: host key / claim host */}
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
                <Button size="sm" onClick={copyHostKey} flexShrink={0}>
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
                  placeholder="Paste the room's host key…"
                  size="sm"
                  fontFamily="mono"
                  minW={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') doClaimHost(); }}
                />
                <Button size="sm" colorScheme="purple" onClick={doClaimHost} isDisabled={!claimDraft.trim()} flexShrink={0}>
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
                      size="xs"
                      colorScheme="green"
                      onClick={() => doApprove(item.key, String(item.text))}
                      isDisabled={readOnly}
                    >
                      Approve
                    </Button>
                    <Button
                      size="xs"
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
