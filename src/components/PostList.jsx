import { DeleteIcon, StarIcon, TriangleUpIcon } from "@chakra-ui/icons";
import { HStack, IconButton, Tag, Text, Wrap, WrapItem } from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import gun from "../libs/gun";
import { getVoterId, useThreadMeta } from "../libs/hooks";
import { aliasAtom, threadIdAtom } from "../libs/jotaiAtoms";

// 'meta' and 'v' are sub-nodes of a thread (host meta, vote tallies) —
// they show up in the parent's .on() data but are not posts.
const SKIP_KEYS = new Set(['_', 'meta', 'v']);

const PostList = () => {
  const [allPosts, setAllPosts] = React.useState([]);
  const [votes, setVotes] = React.useState({});
  const [thread] = useAtom(threadIdAtom);
  const [alias] = useAtom(aliasAtom);
  const { meta, isHost, readOnly, updateMeta } = useThreadMeta(thread);

  const path = React.useMemo(
    () => thread
      ? `t/${thread}`
      : alias
        ? `u/${alias}`
        : 'd/public'
    , [thread, alias]
  );

  React.useEffect(() => {
    setAllPosts([]);  // keep this line to make 'password' functioning
    const node = alias ? gun.user().get(path) : gun.get(path);
    node.on((d) => setAllPosts(parseD(d)));
    return () => node.off();  // unsubscribe when switching threads/aliases
  }, [path, alias]);

  // Vote tallies live at t/<thread>/v/<postKey> = {voterId: 1}.
  React.useEffect(() => {
    setVotes({});
    if (!thread) return;
    const vnode = gun.get(`t/${thread}/v`);
    vnode.on((d) => setVotes(d || {}));
    return () => vnode.off();
  }, [thread]);

  const parseD = (d) => {
    return d && Object.entries(d)
      .map(([k, v]) => {
        if (SKIP_KEYS.has(k)) return;
        return { key: k, datetime: k, text: v };
      })
      .filter(Boolean);
  };

  const voteCount = (key) => {
    const o = votes[key];
    if (!o || typeof o !== 'object') return 0;
    return Object.keys(o).filter((k) => k !== '_' && o[k]).length;
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
  };

  const togglePin = (key) => {
    if (!thread || !isHost) return;
    updateMeta({ pinnedKey: meta && meta.pinnedKey === key ? null : key });
  };

  // pinned first, then votes desc, then newest first
  // (post keys start with a ms timestamp, so key desc ≈ newest first)
  const posts = React.useMemo(() => {
    const pinnedKey = thread && meta ? meta.pinnedKey : null;
    return [...allPosts]
      .map((p) => ({ ...p, voteCount: thread ? voteCount(p.key) : 0 }))
      .sort((a, b) => {
        const ap = pinnedKey && a.key === pinnedKey ? 1 : 0;
        const bp = pinnedKey && b.key === pinnedKey ? 1 : 0;
        if (ap !== bp) return bp - ap;
        if (a.voteCount !== b.voteCount) return b.voteCount - a.voteCount;
        return a.key < b.key ? 1 : a.key > b.key ? -1 : 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPosts, votes, thread, meta]);

  return (
    <Wrap>
      {posts.map((p) => {
        const pinned = !!(thread && meta && meta.pinnedKey === p.key);
        const voted = !!(thread && hasVoted(p.key));
        return (
          <WrapItem key={p.key + String(p.text)}>
            <HStack spacing={1} borderWidth="1px" borderRadius="md" px={2} py={1}>
              {thread && (
                <>
                  <IconButton
                    size="xs" variant="ghost"
                    aria-label={voted ? 'remove upvote' : 'upvote'}
                    icon={<TriangleUpIcon />}
                    colorScheme={voted ? 'cyan' : 'gray'}
                    onClick={() => toggleVote(p.key)}
                    isDisabled={readOnly}
                  />
                  <Text fontSize="sm" minW="18px" textAlign="center">{p.voteCount}</Text>
                </>
              )}
              {pinned && <StarIcon color="yellow.400" boxSize={3} />}
              <Tag variant="outline" maxW="60vw">{String(p.text)}</Tag>
              {thread && isHost && (
                <>
                  <IconButton
                    size="xs" variant="ghost"
                    aria-label={pinned ? 'unpin post' : 'pin post'}
                    icon={<StarIcon />}
                    color={pinned ? 'yellow.400' : 'gray.400'}
                    onClick={() => togglePin(p.key)}
                  />
                  <IconButton
                    size="xs" variant="ghost" aria-label="delete post"
                    icon={<DeleteIcon />} color="red.400"
                    onClick={() => deletePost(p.key)}
                  />
                </>
              )}
            </HStack>
          </WrapItem>
        );
      })}
    </Wrap>
  );
};

export default PostList;
