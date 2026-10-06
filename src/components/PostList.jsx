import { ChatIcon, CheckIcon, CloseIcon, DeleteIcon, StarIcon, TriangleUpIcon, ViewIcon, WarningIcon } from "@chakra-ui/icons";
import {
  Avatar, Badge, Box, Button, Collapse, HStack, IconButton, Input, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Skeleton, Text, Textarea,
  Tooltip, useToast, VStack,
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import React from "react";
import gun from "../libs/gun";
import { avatarFor, pseudonym, timeAgo, uniqueKey } from "../libs/helpers";
import {
  addReply, countKeys, deleteReply, getVoterId, mergeInto, unmerge,
  useAuthors, usePosts, usePostStatus, useReplies, useThreadMeta, useVotes,
} from "../libs/hooks";
import { aliasAtom, authorFilterAtom, myOnlyAtom, searchAtom, sortModeAtom, statusFilterAtom, threadIdAtom } from "../libs/jotaiAtoms";

const MotionBox = motion(Box);
const FLAG_THRESHOLD = 3; // N audience flags auto-hide a post from non-hosts

const QuestionCard = ({
  post, thread, meta, isHost, readOnly,
  voteCount, voted, onVote, authorId,
  budgetExhausted, voteBudget, mineId, slowSec,
  status, flagCount, hidden,
  onToggleAnswered, onToggleHidden, onFlag, onTogglePin, onDelete, onSpotlight,
  isMine, mutedAuthor,
  replies, onSendReply, onDeleteReply,
  mergedCount, onOpenMerge, onOpenManageMerged, orphanedMerge, onUnmerge,
}) => {
  const pinned = !!(thread && meta && meta.pinnedKey === post.key);
  const answered = !!status?.answered;
  const spotlighted = !!(thread && meta && meta.discussingKey === post.key);
  const hostId = meta && meta.hostId;
  const av = avatarFor(authorId);
  const name = authorId ? pseudonym(authorId) : null;
  const toast = useToast();
  const [threadOpen, setThreadOpen] = React.useState(false);
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');

  const sendReply = () => {
    const text = replyText.trim();
    if (!text) return;
    // Slow mode applies to replies too — localStorage-enforced, like questions.
    if (slowSec > 0 && typeof window !== 'undefined') {
      const last = Number(window.localStorage.getItem(`rg_lastreply_${thread}`) || 0);
      const waitMs = slowSec * 1000 - (Date.now() - last);
      if (waitMs > 0) {
        toast({
          title: `Slow mode is on — wait ${Math.ceil(waitMs / 1000)}s`,
          status: 'warning',
          duration: 2000,
          isClosable: true,
        });
        return;
      }
    }
    onSendReply(post.key, uniqueKey(), text, isHost);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`rg_lastreply_${thread}`, String(Date.now()));
    }
    setReplyText('');
    setReplyOpen(false);
    setThreadOpen(true); // reveal the thread so the reply is seen
  };

  const voteDisabled = readOnly || (budgetExhausted && !voted);
  const voteLabel = voted
    ? 'Retract upvote'
    : budgetExhausted
      ? `Vote budget used up (${voteBudget} votes) — retract one to re-vote`
      : 'Upvote this question';

  return (
    <MotionBox
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      layerStyle="glass"
      p={3}
      opacity={hidden || mutedAuthor ? 0.55 : 1}
      borderColor={spotlighted ? 'purple.400' : pinned ? 'yellow.400' : isMine ? 'cyan.400' : undefined}
      borderWidth={spotlighted || pinned || isMine ? '2px' : '1px'}
    >
      <HStack align="flex-start" spacing={3}>
        {thread && (
          <VStack spacing={1} minW="56px" pt={1}>
            <Tooltip label={voteLabel}>
              <IconButton
                size="md"
                minW="48px"
                minH="48px"
                variant={voted ? 'solid' : 'ghost'}
                colorScheme={voted ? 'cyan' : 'gray'}
                aria-label={voted ? 'remove upvote' : 'upvote'}
                aria-pressed={voted}
                icon={<TriangleUpIcon boxSize={5} />}
                onClick={() => onVote(post.key)}
                isDisabled={voteDisabled}
                borderRadius="xl"
                borderWidth={voted ? '0' : '1px'}
                borderColor="whiteAlpha.200"
                boxShadow={voted ? '0 0 14px rgba(34,211,238,0.35)' : undefined}
              />
            </Tooltip>
            <Text
              fontWeight="extrabold"
              fontSize="lg"
              color={voted ? 'cyan.300' : 'gray.400'}
              aria-label={`${voteCount} upvotes${voted ? ' — you upvoted this' : ''}`}
            >
              ▲ {voteCount}
            </Text>
          </VStack>
        )}

        <VStack align="stretch" flex={1} minW={0} spacing={1.5}>
          <HStack spacing={2} flexWrap="wrap" fontSize="xs" opacity={0.9}>
            <Avatar
              size="sm"
              bg={`${av.color}.500`}
              icon={<Text fontSize="sm">{av.emoji}</Text>}
              title={name ? `asked by ${name}` : 'anonymous asker'}
            />
            {(isHost || isMine) && name && (
              <Tooltip label="Pseudonym — the app can't see who this really is">
                <Text fontWeight="semibold" color={`${av.color}.300`}>
                  {isHost ? name : 'you'}
                </Text>
              </Tooltip>
            )}
            {isMine && <Badge colorScheme="cyan">you</Badge>}
            {mutedAuthor && isHost && <Badge colorScheme="red">muted author</Badge>}
            <Text opacity={0.6}>{timeAgo(Number(String(post.key).split('-')[0]))}</Text>
            {answered && (
              <Badge colorScheme="green" display="flex" alignItems="center" gap={1}>
                <CheckIcon boxSize={2.5} /> answered
              </Badge>
            )}
            {pinned && (
              <Badge colorScheme="yellow" display="flex" alignItems="center" gap={1}>
                <StarIcon boxSize={2.5} /> pinned
              </Badge>
            )}
            {spotlighted && (
              <Badge colorScheme="purple">🎙 now discussing</Badge>
            )}
            {hidden && (
              <Badge colorScheme="red">hidden{flagCount >= FLAG_THRESHOLD ? ` · ${flagCount} flags` : ''}</Badge>
            )}
            {orphanedMerge && isHost && (
              <Badge colorScheme="orange">⚠ merged into a deleted question</Badge>
            )}
            {mergedCount > 0 && isHost && (
              <Tooltip label="This question includes votes from merged duplicates — click to manage">
                <Badge
                  as="button"
                  colorScheme="teal"
                  cursor="pointer"
                  onClick={onOpenManageMerged}
                >
                  🔀 +{mergedCount} merged
                </Badge>
              </Tooltip>
            )}
          </HStack>

          <Text
            fontSize="md"
            lineHeight="1.5"
            wordBreak="break-word"
            textDecoration={answered ? 'none' : undefined}
            opacity={answered ? 0.85 : 1}
          >
            {String(post.text)}
          </Text>

          {/* Replies — threaded discussion, one level. Host replies get a
              HOST badge; audience replies show the author's pseudonym avatar.
              Legacy plain-text replies (host-only era) render as HOST. */}
          {replies && replies.length > 0 && (
            <Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setThreadOpen(!threadOpen)}
                aria-expanded={threadOpen}
                px={1}
              >
                💬 {replies.length} {replies.length === 1 ? 'reply' : 'replies'} {threadOpen ? '▾' : '▸'}
              </Button>
              <Collapse in={threadOpen} animateOpacity>
                <VStack align="stretch" spacing={1.5} pl={3} mt={1} borderLeftWidth="2px" borderColor="purple.400">
                  {replies.map((r) => {
                    const isHostReply = !r.by || r.by === hostId;
                    const canDelete = isHost || (r.by && r.by === mineId);
                    const rav = !isHostReply && r.by ? avatarFor(r.by) : null;
                    return (
                      <HStack key={r.key} align="start" spacing={2}>
                        {isHostReply ? (
                          <Badge colorScheme="purple" mt={1} flexShrink={0} fontSize="2xs">HOST</Badge>
                        ) : (
                          <Avatar
                            size="2xs"
                            bg={`${rav.color}.500`}
                            icon={<Text fontSize="xs">{rav.emoji}</Text>}
                            mt={0.5}
                            flexShrink={0}
                            title={pseudonym(r.by)}
                          />
                        )}
                        <VStack align="start" spacing={0} flex={1} minW={0}>
                          {!isHostReply && (
                            <Text fontSize="2xs" fontWeight="semibold" color={`${rav.color}.300`}>
                              {r.by === mineId ? 'you' : pseudonym(r.by)}
                            </Text>
                          )}
                          <Text fontSize="sm" wordBreak="break-word" opacity={0.95}>
                            {String(r.text)}
                          </Text>
                        </VStack>
                        {canDelete && (
                          <IconButton
                            size="sm"
                            variant="ghost"
                            aria-label="delete reply"
                            icon={<DeleteIcon />}
                            color="red.400"
                            flexShrink={0}
                            onClick={() => onDeleteReply(post.key, r)}
                          />
                        )}
                      </HStack>
                    );
                  })}
                </VStack>
              </Collapse>
            </Box>
          )}

          {thread && (
            <HStack spacing={1} flexWrap="wrap">
              {!readOnly && (
                replyOpen ? (
                  <HStack align="flex-end" w="100%" spacing={2} mt={1}>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={isHost ? "Write a reply as host… (Enter to send)" : "Join the discussion… (Enter to send)"}
                      rows={2}
                      fontSize="sm"
                      minW={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                      autoFocus
                    />
                    <VStack spacing={1}>
                      <IconButton
                        aria-label="send reply"
                        icon={<CheckIcon />}
                        colorScheme="purple"
                        size="sm"
                        onClick={sendReply}
                        isDisabled={!replyText.trim()}
                      />
                      <IconButton
                        aria-label="cancel reply"
                        icon={<CloseIcon />}
                        variant="ghost"
                        size="sm"
                        onClick={() => { setReplyOpen(false); setReplyText(''); }}
                      />
                    </VStack>
                  </HStack>
                ) : (
                  <Tooltip label={isHost ? "Reply as host — visible to everyone" : "Reply — join the discussion"}>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<ChatIcon />}
                      onClick={() => setReplyOpen(true)}
                    >
                      Reply
                    </Button>
                  </Tooltip>
                )
              )}
              {!isHost && !readOnly && (
                <Tooltip label="Flag as inappropriate (3 flags hides it)">
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="flag question"
                    icon={<WarningIcon />}
                    color={flagCount > 0 ? 'orange.400' : 'gray.500'}
                    onClick={() => onFlag(post.key)}
                  />
                </Tooltip>
              )}
              {isHost && (
                <>
                  <Tooltip label={answered ? 'Mark as unanswered' : 'Mark as answered'}>
                    <IconButton
                      size="sm" variant="ghost"
                      aria-label="toggle answered"
                      icon={<CheckIcon />}
                      color={answered ? 'green.400' : 'gray.500'}
                      onClick={() => onToggleAnswered(post.key, answered)}
                    />
                  </Tooltip>
                  <Tooltip label={spotlighted ? 'Remove from spotlight' : 'Spotlight — now discussing'}>
                    <IconButton
                      size="sm" variant="ghost"
                      aria-label="spotlight question"
                      icon={<ViewIcon />}
                      color={spotlighted ? 'purple.400' : 'gray.500'}
                      onClick={() => onSpotlight(post.key, spotlighted)}
                    />
                  </Tooltip>
                  {!orphanedMerge && (
                    <Tooltip label="Merge this duplicate into another question — its votes are added to the target">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onOpenMerge}
                      >
                        🔀 Merge…
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip label={hidden ? 'Unhide' : 'Hide from audience'}>
                    <IconButton
                      size="sm" variant="ghost"
                      aria-label="toggle hidden"
                      icon={<WarningIcon />}
                      color={hidden ? 'red.400' : 'gray.500'}
                      onClick={() => onToggleHidden(post.key, hidden)}
                    />
                  </Tooltip>
                  <Tooltip label={pinned ? 'Unpin' : 'Pin to top'}>
                    <IconButton
                      size="sm" variant="ghost"
                      aria-label="toggle pin"
                      icon={<StarIcon />}
                      color={pinned ? 'yellow.400' : 'gray.500'}
                      onClick={() => onTogglePin(post.key, pinned)}
                    />
                  </Tooltip>
                  <Tooltip label="Delete question">
                    <IconButton
                      size="sm" variant="ghost"
                      aria-label="delete post"
                      icon={<DeleteIcon />}
                      color="red.400"
                      onClick={() => onDelete(post.key)}
                    />
                  </Tooltip>
                  {orphanedMerge && (
                    <Tooltip label="This question was merged into a deleted one — unmerge to restore it">
                      <Button
                        size="sm"
                        variant="outline"
                        colorScheme="orange"
                        onClick={() => onUnmerge(post.key)}
                      >
                        Unmerge
                      </Button>
                    </Tooltip>
                  )}
                </>
              )}
            </HStack>
          )}
        </VStack>
      </HStack>
    </MotionBox>
  );
};

// Merge picker modal — two modes:
//   mode 'merge':  pick a target question for sourceKey to merge into
//   mode 'manage': list questions merged into manageKey, with unmerge buttons
const MergeModal = ({
  isOpen, onClose, mode, candidates, mergedSources,
  voteCountOf, onPickTarget, onUnmerge,
}) => {
  const [q, setQ] = React.useState('');
  React.useEffect(() => { if (isOpen) setQ(''); }, [isOpen]);
  const filtered = candidates.filter((c) =>
    !q.trim() || String(c.text).toLowerCase().includes(q.trim().toLowerCase())
  );
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {mode === 'merge' ? '🔀 Merge into…' : '🔀 Merged questions'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {mode === 'merge' ? (
            <VStack align="stretch" spacing={2}>
              <Input
                placeholder="Search questions…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                size="sm"
              />
              <Text fontSize="xs" opacity={0.65}>
                The selected question disappears from the list; its votes are added to the target.
              </Text>
              {filtered.length === 0 && (
                <Text fontSize="sm" opacity={0.6} textAlign="center" py={4}>
                  No other questions to merge into.
                </Text>
              )}
              {filtered.map((c) => (
                <Button
                  key={c.key}
                  variant="ghost"
                  justifyContent="flex-start"
                  h="auto"
                  py={2}
                  whiteSpace="normal"
                  textAlign="left"
                  onClick={() => { onPickTarget(c.key); onClose(); }}
                >
                  <VStack align="start" spacing={0} w="100%">
                    <Text fontSize="sm" noOfLines={2}>{String(c.text)}</Text>
                    <Text fontSize="xs" opacity={0.6}>
                      ▲ {voteCountOf(c.key)} votes{c.answered ? ' · ✓ answered' : ''}
                    </Text>
                  </VStack>
                </Button>
              ))}
            </VStack>
          ) : (
            <VStack align="stretch" spacing={2}>
              <Text fontSize="xs" opacity={0.65}>
                These questions are merged into this one — their votes count toward its total.
              </Text>
              {mergedSources.length === 0 && (
                <Text fontSize="sm" opacity={0.6} textAlign="center" py={4}>Nothing merged.</Text>
              )}
              {mergedSources.map((s) => (
                <HStack key={s.key} justify="space-between" layerStyle="glass" p={2} borderRadius="lg">
                  <VStack align="start" spacing={0} flex={1} minW={0}>
                    <Text fontSize="sm" noOfLines={2}>{String(s.text)}</Text>
                    <Text fontSize="xs" opacity={0.6}>▲ {voteCountOf(s.key)} votes</Text>
                  </VStack>
                  <Button size="sm" variant="outline" onClick={() => onUnmerge(s.key)}>
                    Unmerge
                  </Button>
                </HStack>
              ))}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

const PostList = () => {
  const [thread] = useAtom(threadIdAtom);
  const [alias] = useAtom(aliasAtom);
  const [sortMode] = useAtom(sortModeAtom);
  const [statusFilter] = useAtom(statusFilterAtom);
  const [search, setSearch] = useAtom(searchAtom);
  const [myOnly] = useAtom(myOnlyAtom);
  const [authorFilter, setAuthorFilter] = useAtom(authorFilterAtom);

  const posts = usePosts(thread, alias);
  const votes = useVotes(thread);
  const status = usePostStatus(thread);
  const authors = useAuthors(thread);
  const replies = useReplies(thread);
  const { meta, isHost, readOnly, updateMeta } = useThreadMeta(thread);
  const mine = getVoterId();
  const mutedMap = (thread && meta && meta.mutedAuthors) || {};
  const toast = useToast();

  // Vote budget: per-browser votes per room. 0 = unlimited; meta parse
  // defaults a missing value to 5. Spent count is derived HONESTLY from the
  // graph (v/<postKey> entries containing our voter id), not a local counter.
  const voteBudget = meta ? meta.voteBudget : 5;
  const budgetLimited = voteBudget > 0;
  const spentVotes = React.useMemo(() => {
    let n = 0;
    Object.entries(votes || {}).forEach(([k, o]) => {
      if (k === '_' || !o || typeof o !== 'object') return;
      if (o[mine]) n++;
    });
    return n;
  }, [votes, mine]);
  const votesLeft = budgetLimited ? Math.max(0, voteBudget - spentVotes) : null;
  const slowSec = thread && meta ? meta.slowModeSec || 0 : 0;

  // Merge dialog: { mode: 'merge', sourceKey } | { mode: 'manage', manageKey }
  const [mergeDlg, setMergeDlg] = React.useState(null);

  // Merge resolution: st/<key>.mergedInto points at the merge target.
  // Follow the chain to the root (cycle-guarded); merged sources hide from
  // the list and their votes count toward the root's displayed total.
  const mergedIntoOf = (key) => {
    const st = status[key];
    return st && typeof st === 'object' ? (st.mergedInto || null) : null;
  };
  const rootOf = (key) => {
    let cur = key;
    const seen = new Set([key]);
    for (let i = 0; i < 50; i++) {
      const into = mergedIntoOf(cur);
      if (!into || seen.has(into)) break;
      seen.add(into);
      cur = into;
    }
    return cur;
  };

  const hasVoted = (key) => {
    const o = votes[key];
    return !!(o && o[getVoterId()]);
  };

  const toggleVote = (key) => {
    if (!thread || readOnly) return;
    if (hasVoted(key)) {
      gun.get(`t/${thread}/v/${key}`).get(getVoterId()).put(null); // retract vote
    } else {
      if (budgetLimited && spentVotes >= voteBudget) {
        toast({
          title: `You've used all ${voteBudget} votes — retract one to re-vote`,
          status: 'warning',
          duration: 2500,
          isClosable: true,
        });
        return;
      }
      gun.get(`t/${thread}/v/${key}`).put({ [getVoterId()]: 1 });
    }
  };

  const deletePost = (key) => {
    if (!thread || !isHost) return;
    gun.get(`t/${thread}`).get(key).put(null);
    gun.get(`t/${thread}/v/${key}`).put(null); // clear its votes too
    gun.get(`t/${thread}/st/${key}`).put(null);
  };

  const togglePin = (key, pinned) => {
    if (!thread || !isHost) return;
    updateMeta({ pinnedKey: pinned ? null : key });
  };

  const toggleAnswered = (key, answered) => {
    if (!thread || !isHost) return;
    gun.get(`t/${thread}/st/${key}`).put({ answered: !answered });
  };

  const toggleHidden = (key, hidden) => {
    if (!thread || !isHost) return;
    gun.get(`t/${thread}/st/${key}`).put({ hidden: !hidden });
  };

  const flagPost = (key) => {
    if (!thread || readOnly) return;
    gun.get(`t/${thread}/st/${key}`).put({ flags: { [getVoterId()]: 1 } });
  };

  const toggleSpotlight = (key, spotlighted) => {
    if (!thread || !isHost) return;
    updateMeta({ discussingKey: spotlighted ? null : key });
  };

  const handleSendReply = (postKey, replyKey, text, asHost) => {
    if (!thread || readOnly) return;
    // Host replies carry the host id (HOST badge); audience replies carry
    // the sender's voter id (pseudonym avatar).
    addReply(thread, postKey, replyKey, text, asHost ? (meta && meta.hostId) : getVoterId());
  };

  const handleDeleteReply = (postKey, reply) => {
    if (!thread) return;
    const own = reply.by && reply.by === getVoterId();
    if (!isHost && !own) return; // host can delete any; authors their own
    deleteReply(thread, postKey, reply.key);
  };

  const handlePickTarget = (targetKey) => {
    if (!thread || !isHost || !mergeDlg || mergeDlg.mode !== 'merge') return;
    mergeInto(thread, mergeDlg.sourceKey, targetKey);
  };

  const handleUnmerge = (sourceKey) => {
    if (!thread || !isHost) return;
    unmerge(thread, sourceKey);
  };

  const flagCountFor = (key) => countKeys(status[key]?.flags);

  // pinned first → sort mode → newest first
  // (post keys start with a ms timestamp, so key desc ≈ newest first)
  // Merged sources are hidden from the list (votes roll up into the root).
  const { visible, mergedByTarget, voteCountOf, mergeCandidates } = React.useMemo(() => {
    const pinnedKey = thread && meta ? meta.pinnedKey : null;
    const q = search.trim().toLowerCase();
    const postKeys = new Set(posts.map((p) => p.key));
    const roots = {};
    posts.forEach((p) => { roots[p.key] = rootOf(p.key); });
    const mergedByTarget = {};
    posts.forEach((p) => {
      const r = roots[p.key];
      if (r !== p.key) {
        (mergedByTarget[r] = mergedByTarget[r] || []).push(p);
      }
    });
    const voteCountOf = (key) => {
      let n = thread ? countKeys(votes[key]) : 0;
      (mergedByTarget[key] || []).forEach((s) => { n += countKeys(votes[s.key]); });
      return n;
    };
    const list = posts
      .map((p) => {
        const st = status[p.key] || {};
        const flags = countKeys(st.flags);
        const hidden = !!st.hidden || (!isHost && flags >= FLAG_THRESHOLD);
        const authorId = authors[p.key] || null;
        const isMine = !!authorId && authorId === mine;
        const mutedByHost = !!authorId && !!mutedMap[authorId];
        const root = roots[p.key];
        const isMergedAway = root !== p.key;
        // A source whose target was deleted stays hidden from the audience,
        // but the host sees it flagged so it can be unmerged — never stuck.
        const orphanedMerge = isMergedAway && !postKeys.has(root);
        return {
          ...p,
          voteCount: voteCountOf(p.key),
          answered: !!st.answered,
          hidden,
          flagCount: flags,
          authorId,
          isMine,
          mutedByHost,
          isMergedAway,
          orphanedMerge,
          mergedSources: mergedByTarget[p.key] || [],
        };
      })
      .filter((p) => {
        if (p.isMergedAway && (!p.orphanedMerge || !isHost)) return false;
        if (p.hidden && !isHost) return false; // hidden from audience
        if (p.mutedByHost && !isHost) return false; // muted author: host-only view
        if (q && !String(p.text).toLowerCase().includes(q)) return false;
        if (myOnly && thread && !p.isMine) return false; // "My questions"
        if (authorFilter && thread && p.authorId !== authorFilter) return false;
        if (statusFilter === 'open') return !p.answered;
        if (statusFilter === 'answered') return p.answered;
        return true;
      })
      .sort((a, b) => {
        const ap = pinnedKey && a.key === pinnedKey ? 1 : 0;
        const bp = pinnedKey && b.key === pinnedKey ? 1 : 0;
        if (ap !== bp) return bp - ap;
        if (sortMode === 'top' && a.voteCount !== b.voteCount) return b.voteCount - a.voteCount;
        return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
      });
    const mergeCandidates = posts
      .filter((p) => roots[p.key] === p.key)
      .map((p) => ({
        key: p.key,
        text: p.text,
        answered: !!(status[p.key] || {}).answered,
      }));
    return { visible: list, mergedByTarget, voteCountOf, mergeCandidates };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, votes, status, authors, thread, meta, isHost, sortMode, statusFilter, search, myOnly, authorFilter, mine, mutedMap]);

  // active author filter banner (clear it from here)
  const authorFilterName = authorFilter ? pseudonym(authorFilter) : null;

  // Grace-period loading state: Gun streams questions in async, so flashing
  // "No questions yet" instantly would be wrong on slow connections. Show a
  // skeleton briefly; the real empty state only appears after the grace.
  const [graceDone, setGraceDone] = React.useState(false);
  React.useEffect(() => {
    setGraceDone(false);
    const id = setTimeout(() => setGraceDone(true), 1500);
    return () => clearTimeout(id);
  }, [thread]);

  if (!visible.length) {
    if (thread && !graceDone) {
      return (
        <VStack align="stretch" spacing={3} aria-label="Loading questions…">
          {[0, 1, 2].map((i) => (
            <Box key={i} layerStyle="glass" p={3}>
              <HStack spacing={3}>
                <Skeleton height="48px" width="48px" borderRadius="xl" />
                <VStack align="stretch" flex={1} spacing={2}>
                  <Skeleton height="14px" width="40%" borderRadius="md" />
                  <Skeleton height="18px" width="90%" borderRadius="md" />
                </VStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      );
    }
    const q = search.trim();
    const empty = q
      ? {
          emoji: '🔍',
          title: `No questions match “${q.slice(0, 40)}”`,
          body: 'Try a different keyword — or be the first to ask it.',
          action: <Button size="sm" minH="44px" variant="outline" onClick={() => setSearch('')}>Clear search</Button>,
        }
      : myOnly
        ? {
            emoji: '🙋',
            title: "You haven't asked anything yet",
            body: 'Your questions will show up here — ask one in the box below.',
          }
        : authorFilterName
          ? {
              emoji: '👤',
              title: `No questions from ${authorFilterName} in this view`,
              body: 'Try a different filter, or clear it above.',
            }
          : statusFilter === 'answered'
            ? {
                emoji: '✅',
                title: 'No answered questions yet',
                body: "The host hasn't marked any question as answered.",
              }
            : thread
              ? {
                  emoji: '🎤',
                  title: 'No questions yet',
                  body: 'Be the first to ask — the floor is yours. Tap ▲ on the questions you want answered.',
                }
              : {
                  emoji: '🎤',
                  title: 'Nothing here yet',
                  body: 'Drop the first secret above.',
                };
    return (
      <Box textAlign="center" py={14} px={4}>
        <Text fontSize="5xl" mb={3}>{empty.emoji}</Text>
        <Text fontSize="lg" fontWeight="semibold" mb={1}>
          {empty.title}
        </Text>
        <Text fontSize="sm" opacity={0.7} mb={empty.action ? 4 : 0}>
          {empty.body}
        </Text>
        {empty.action}
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      {authorFilterName && (
        <HStack layerStyle="glass" p={2} px={3} borderRadius="xl" fontSize="sm" justify="space-between">
          <Text>👤 Showing questions by <Text as="span" fontWeight="bold">{authorFilterName}</Text></Text>
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="clear author filter"
            icon={<CloseIcon />}
            onClick={() => setAuthorFilter(null)}
          />
        </HStack>
      )}
      <AnimatePresence initial={false}>
        {visible.map((p) => (
          <QuestionCard
            key={p.key}
            post={p}
            thread={thread}
            meta={meta}
            isHost={isHost}
            readOnly={readOnly}
            voteCount={p.voteCount}
            voted={thread ? hasVoted(p.key) : false}
            onVote={toggleVote}
            authorId={p.authorId}
            budgetExhausted={budgetLimited && votesLeft <= 0}
            voteBudget={voteBudget}
            mineId={mine}
            slowSec={slowSec}
            status={status[p.key]}
            flagCount={p.flagCount}
            hidden={p.hidden}
            onToggleAnswered={toggleAnswered}
            onToggleHidden={toggleHidden}
            onFlag={flagPost}
            onTogglePin={togglePin}
            onDelete={deletePost}
            onSpotlight={toggleSpotlight}
            isMine={p.isMine}
            mutedAuthor={p.mutedByHost && isHost}
            replies={replies[p.key] || []}
            onSendReply={handleSendReply}
            onDeleteReply={handleDeleteReply}
            mergedCount={p.mergedSources.length}
            orphanedMerge={p.orphanedMerge}
            onOpenMerge={() => setMergeDlg({ mode: 'merge', sourceKey: p.key })}
            onOpenManageMerged={() => setMergeDlg({ mode: 'manage', manageKey: p.key })}
            onUnmerge={handleUnmerge}
          />
        ))}
      </AnimatePresence>
      <MergeModal
        isOpen={!!mergeDlg}
        onClose={() => setMergeDlg(null)}
        mode={mergeDlg?.mode}
        candidates={
          mergeDlg?.mode === 'merge'
            ? mergeCandidates.filter((c) => c.key !== mergeDlg.sourceKey)
            : []
        }
        mergedSources={
          mergeDlg?.mode === 'manage'
            ? (mergedByTarget[mergeDlg.manageKey] || []).map((s) => ({
                key: s.key,
                text: s.text,
              }))
            : []
        }
        voteCountOf={voteCountOf}
        onPickTarget={handlePickTarget}
        onUnmerge={(k) => handleUnmerge(k)}
      />
    </VStack>
  );
};

export default PostList;
