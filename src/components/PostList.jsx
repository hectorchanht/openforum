import { ChatIcon, CheckIcon, CloseIcon, DeleteIcon, StarIcon, TriangleUpIcon, ViewIcon, WarningIcon } from "@chakra-ui/icons";
import {
  Avatar, Badge, Box, Button, HStack, IconButton, Input, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Text, Textarea,
  Tooltip, VStack,
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
  status, flagCount, hidden,
  onToggleAnswered, onToggleHidden, onFlag, onTogglePin, onDelete, onSpotlight,
  isMine, mutedAuthor,
  replies, onSendReply, onDeleteReply,
  mergedCount, onOpenMerge, onOpenManageMerged, orphanedMerge, onUnmerge,
}) => {
  const pinned = !!(thread && meta && meta.pinnedKey === post.key);
  const answered = !!status?.answered;
  const spotlighted = !!(thread && meta && meta.discussingKey === post.key);
  const av = avatarFor(authorId);
  const name = authorId ? pseudonym(authorId) : null;
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [replyText, setReplyText] = React.useState('');

  const sendReply = () => {
    const text = replyText.trim();
    if (!text) return;
    onSendReply(post.key, uniqueKey(), text);
    setReplyText('');
    setReplyOpen(false);
  };

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
          <VStack spacing={0} minW="52px" pt={1}>
            <Tooltip label={voted ? 'Retract upvote' : 'Upvote this question'}>
              <IconButton
                size="md"
                variant={voted ? 'solid' : 'ghost'}
                colorScheme={voted ? 'cyan' : 'gray'}
                aria-label={voted ? 'remove upvote' : 'upvote'}
                icon={<TriangleUpIcon />}
                onClick={() => onVote(post.key)}
                isDisabled={readOnly}
                borderRadius="xl"
              />
            </Tooltip>
            <Text fontWeight="bold" fontSize="lg" color={voted ? 'cyan.300' : undefined}>
              {voteCount}
            </Text>
          </VStack>
        )}

        <VStack align="stretch" flex={1} spacing={1.5}>
          <HStack spacing={2} flexWrap="wrap" fontSize="xs" opacity={0.9}>
            <Avatar
              size="xs"
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

          {/* Host replies — visible answers, threaded under the question */}
          {replies && replies.length > 0 && (
            <VStack align="stretch" spacing={1.5} pl={3} borderLeftWidth="2px" borderColor="purple.400">
              {replies.map((r) => (
                <HStack key={r.key} align="start" spacing={2}>
                  <Badge colorScheme="purple" mt={1} flexShrink={0} fontSize="2xs">HOST</Badge>
                  <Text fontSize="sm" flex={1} wordBreak="break-word" opacity={0.95}>
                    {String(r.text)}
                  </Text>
                  {isHost && (
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label="delete reply"
                      icon={<DeleteIcon />}
                      color="red.400"
                      onClick={() => onDeleteReply(post.key, r.key)}
                    />
                  )}
                </HStack>
              ))}
            </VStack>
          )}

          {thread && (
            <HStack spacing={1} flexWrap="wrap">
              {isHost && !readOnly && (
                replyOpen ? (
                  <HStack align="flex-end" w="100%" spacing={2} mt={1}>
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply as host… (Enter to send)"
                      rows={2}
                      fontSize="sm"
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
                  <Tooltip label="Reply as host — visible to everyone">
                    <Button
                      size="xs"
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
                    size="xs"
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
                      size="xs" variant="ghost"
                      aria-label="toggle answered"
                      icon={<CheckIcon />}
                      color={answered ? 'green.400' : 'gray.500'}
                      onClick={() => onToggleAnswered(post.key, answered)}
                    />
                  </Tooltip>
                  <Tooltip label={spotlighted ? 'Remove from spotlight' : 'Spotlight — now discussing'}>
                    <IconButton
                      size="xs" variant="ghost"
                      aria-label="spotlight question"
                      icon={<ViewIcon />}
                      color={spotlighted ? 'purple.400' : 'gray.500'}
                      onClick={() => onSpotlight(post.key, spotlighted)}
                    />
                  </Tooltip>
                  {!orphanedMerge && (
                    <Tooltip label="Merge this duplicate into another question — its votes are added to the target">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={onOpenMerge}
                      >
                        🔀 Merge…
                      </Button>
                    </Tooltip>
                  )}
                  <Tooltip label={hidden ? 'Unhide' : 'Hide from audience'}>
                    <IconButton
                      size="xs" variant="ghost"
                      aria-label="toggle hidden"
                      icon={<WarningIcon />}
                      color={hidden ? 'red.400' : 'gray.500'}
                      onClick={() => onToggleHidden(post.key, hidden)}
                    />
                  </Tooltip>
                  <Tooltip label={pinned ? 'Unpin' : 'Pin to top'}>
                    <IconButton
                      size="xs" variant="ghost"
                      aria-label="toggle pin"
                      icon={<StarIcon />}
                      color={pinned ? 'yellow.400' : 'gray.500'}
                      onClick={() => onTogglePin(post.key, pinned)}
                    />
                  </Tooltip>
                  <Tooltip label="Delete question">
                    <IconButton
                      size="xs" variant="ghost"
                      aria-label="delete post"
                      icon={<DeleteIcon />}
                      color="red.400"
                      onClick={() => onDelete(post.key)}
                    />
                  </Tooltip>
                  {orphanedMerge && (
                    <Tooltip label="This question was merged into a deleted one — unmerge to restore it">
                      <Button
                        size="xs"
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
                  <Button size="xs" variant="outline" onClick={() => onUnmerge(s.key)}>
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
  const [search] = useAtom(searchAtom);
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
    const vnode = gun.get(`t/${thread}/v/${key}`);
    if (hasVoted(key)) {
      vnode.get(getVoterId()).put(null); // retract vote
    } else {
      vnode.put({ [getVoterId()]: 1 });
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

  const handleSendReply = (postKey, replyKey, text) => {
    if (!thread || !isHost || readOnly) return;
    addReply(thread, postKey, replyKey, text);
  };

  const handleDeleteReply = (postKey, replyKey) => {
    if (!thread || !isHost) return;
    deleteReply(thread, postKey, replyKey);
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

  if (!visible.length) {
    return (
      <Box textAlign="center" py={14} opacity={0.6}>
        <Text fontSize="5xl" mb={3}>🎤</Text>
        <Text fontSize="lg" fontWeight="semibold" mb={1}>
          {search.trim() ? 'No questions match your search' : 'No questions yet'}
        </Text>
        <Text fontSize="sm">
          {search.trim()
            ? 'Try a different keyword — or be the first to ask it.'
            : thread
              ? 'Be the first to ask — the mic is yours.'
              : 'Drop the first secret above.'}
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={3}>
      {authorFilterName && (
        <HStack layerStyle="glass" p={2} px={3} borderRadius="xl" fontSize="sm" justify="space-between">
          <Text>👤 Showing questions by <Text as="span" fontWeight="bold">{authorFilterName}</Text></Text>
          <IconButton
            size="xs"
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
