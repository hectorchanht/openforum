import { CheckIcon, CloseIcon, DeleteIcon, StarIcon, TriangleUpIcon, ViewIcon, WarningIcon } from "@chakra-ui/icons";
import { Avatar, Badge, Box, HStack, IconButton, Text, Tooltip, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import React from "react";
import gun from "../libs/gun";
import { avatarFor, pseudonym, timeAgo } from "../libs/helpers";
import { countKeys, getVoterId, useAuthors, usePosts, usePostStatus, useThreadMeta, useVotes } from "../libs/hooks";
import { aliasAtom, authorFilterAtom, myOnlyAtom, searchAtom, sortModeAtom, statusFilterAtom, threadIdAtom } from "../libs/jotaiAtoms";

const MotionBox = motion(Box);
const FLAG_THRESHOLD = 3; // N audience flags auto-hide a post from non-hosts

const QuestionCard = ({
  post, thread, meta, isHost, readOnly,
  voteCount, voted, onVote, authorId,
  status, flagCount, hidden,
  onToggleAnswered, onToggleHidden, onFlag, onTogglePin, onDelete, onSpotlight,
  isMine, mutedAuthor,
}) => {
  const pinned = !!(thread && meta && meta.pinnedKey === post.key);
  const answered = !!status?.answered;
  const spotlighted = !!(thread && meta && meta.discussingKey === post.key);
  const av = avatarFor(authorId);
  const name = authorId ? pseudonym(authorId) : null;

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

          {thread && (
            <HStack spacing={1} flexWrap="wrap">
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
                </>
              )}
            </HStack>
          )}
        </VStack>
      </HStack>
    </MotionBox>
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
  const { meta, isHost, readOnly, updateMeta } = useThreadMeta(thread);
  const mine = getVoterId();
  const mutedMap = (thread && meta && meta.mutedAuthors) || {};

  const voteCount = (key) => countKeys(votes[key]);
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

  const flagCountFor = (key) => countKeys(status[key]?.flags);

  // pinned first → sort mode → newest first
  // (post keys start with a ms timestamp, so key desc ≈ newest first)
  const visible = React.useMemo(() => {
    const pinnedKey = thread && meta ? meta.pinnedKey : null;
    const q = search.trim().toLowerCase();
    return posts
      .map((p) => {
        const st = status[p.key] || {};
        const flags = countKeys(st.flags);
        const hidden = !!st.hidden || (!isHost && flags >= FLAG_THRESHOLD);
        const authorId = authors[p.key] || null;
        const isMine = !!authorId && authorId === mine;
        const mutedByHost = !!authorId && !!mutedMap[authorId];
        return {
          ...p,
          voteCount: thread ? voteCount(p.key) : 0,
          answered: !!st.answered,
          hidden,
          flagCount: flags,
          authorId,
          isMine,
          mutedByHost,
        };
      })
      .filter((p) => {
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
          />
        ))}
      </AnimatePresence>
    </VStack>
  );
};

export default PostList;
