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
import { avatarFor, downloadCSV, fmtCountdown, pseudonym } from "../libs/helpers";
import {
  countKeys,
  setMutedAuthor,
  useAuthors,
  useNewQuestionNotify,
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
  const { meta, isHost, expired, closed, updateMeta } = useThreadMeta(thread);
  const posts = usePosts(thread, null);
  const votes = useVotes(thread);
  const status = usePostStatus(thread);
  const authors = useAuthors(thread);
  const notify = useNewQuestionNotify(thread);
  const toast = useToast();

  const [editing, setEditing] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState('');
  const [descDraft, setDescDraft] = React.useState('');
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
        const stLabel = st.answered ? 'answered' : st.hidden || flagN >= 3 ? 'hidden' : 'open';
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
    downloadCSV(`openmic-${thread}-export.csv`, rows);
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
              <Box>
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
      </VStack>
    </Box>
  );
};

export default RoomHeader;
