import { CheckIcon } from '@chakra-ui/icons';
import { Box, HStack, IconButton, Text, Textarea, useToast } from '@chakra-ui/react';
import { useAtom } from "jotai";
import React from 'react';
import gun from '../libs/gun';
import { findSimilarPost } from '../libs/helpers';
import { getVoterId, usePosts, useThreadMeta } from '../libs/hooks';
import { aliasAtom, heapDraftAtom, threadIdAtom } from "../libs/jotaiAtoms";

// Keys must be unique per post: unix-seconds collide when two posts land
// in the same second, silently overwriting each other.
const postKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const AddPost = () => {
  const [value, setValue] = React.useState('');
  const [thread] = useAtom(threadIdAtom);
  const [alias] = useAtom(aliasAtom);
  const [heapDraft, setHeapDraft] = useAtom(heapDraftAtom);
  const { readOnly, expired, closed, meta, isHost } = useThreadMeta(thread);
  const toast = useToast();
  const posts = usePosts(thread, alias);

  // Thought Heap "→ Question": a promoted heap item arrives as a DRAFT —
  // fill the composer for editing, never auto-post.
  React.useEffect(() => {
    if (heapDraft && typeof heapDraft.text === 'string') {
      setValue(heapDraft.text);
      setHeapDraft(null);
    }
  }, [heapDraft, setHeapDraft]);

  const disabledMsg = closed
    ? 'Room closed by host — read-only'
    : expired
      ? 'Room expired — read-only'
      : null;

  const slowSec = thread && meta ? meta.slowModeSec || 0 : 0;
  // Pre-moderation: when on, audience questions wait in the pending queue
  // (t/<thread>/p) for host approval; the host's own posts go straight in.
  const moderated = !!(thread && meta && meta.moderated && !isHost);

  const path = React.useMemo(
    () => thread
      ? `t/${thread}`
      : alias
        ? `u/${alias}`
        : 'd/public'
    , [thread, alias]
  )
  const handleInputChange = (e) => setValue(e?.target?.value);

  // Autogrow composer: 1 line by default, grows with content (capped, then
  // it scrolls internally). Manual drag-resize still works — Chakra keeps
  // resize: vertical.
  const taRef = React.useRef(null);
  const autogrow = React.useCallback(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);
  React.useEffect(() => { autogrow(); }, [value, autogrow, thread]);

  // Duplicate guard: fuzzy-match what they're typing against existing posts.
  const similar = React.useMemo(
    () => (thread && value.trim() ? findSimilarPost(value, posts) : null),
    [thread, value, posts]
  );

  const submitValue = () => {
    const text = value.trim();
    if (!text || readOnly) return;

    // Slow mode: host-toggleable per-thread cooldown, localStorage-enforced.
    // Client-enforced only — a modified client could bypass it.
    if (thread && slowSec > 0 && typeof window !== 'undefined') {
      const last = Number(window.localStorage.getItem(`rg_lastpost_${thread}`) || 0);
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

    const key = postKey();
    if (alias) {
      gun.user().get(path).put({ [key]: text });
    } else if (thread && moderated) {
      // Pre-moderation on: audience posts go to the pending queue instead of
      // the visible node. Author id is still recorded (a/<key>) for the host.
      gun.get(`t/${thread}/p`).put({ [key]: text });
      gun.get(`t/${thread}/a`).get(key).put(getVoterId());
    } else {
      gun.get(path).put({ [key]: text });
      if (thread) {
        // Additive: record the anonymous author id for avatars + self-filtering.
        // Old posts simply don't have an author entry.
        gun.get(`t/${thread}/a`).get(key).put(getVoterId());
      }
    }

    if (thread && typeof window !== 'undefined') {
      window.localStorage.setItem(`rg_lastpost_${thread}`, String(Date.now()));
    }
    setValue('');
    if (thread) {
      if (moderated) {
        toast({
          title: 'Sent for review 👀',
          description: 'The host will approve your question shortly.',
          status: 'info',
          duration: 2500,
          isClosable: true,
        });
      } else {
        toast({ title: 'Question posted 🎤', status: 'success', duration: 1500, isClosable: true });
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitValue();
    }
  };

  const composer = (
    <Box layerStyle="glass" p={3}>
      <HStack align="flex-end" spacing={2}>
        <Textarea
          ref={taRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          isDisabled={readOnly}
          rows={1}
          resize="vertical"
          overflowY="auto"
          fontSize="md"
          minW={0}
          placeholder={disabledMsg || (thread ? 'Ask a question… (Enter to send)' : 'leave secrets here for people to find ~')}
        />
        <IconButton
          aria-label="post"
          colorScheme="purple"
          size="md"
          minW="44px"
          minH="44px"
          isDisabled={!value.trim() || readOnly}
          onClick={submitValue}
          icon={<CheckIcon boxSize={5} />}
        />
      </HStack>
      {similar && (
        <Text fontSize="sm" color="orange.300" mt={2} px={1}>
          🔁 Similar question already asked — consider upvoting it instead:
          <Text as="span" opacity={0.85}> “{String(similar.text).slice(0, 90)}”</Text>
        </Text>
      )}
      {slowSec > 0 && !readOnly && (
        <Text fontSize="xs" opacity={0.6} mt={1} px={1}>
          🐢 Slow mode: one question every {slowSec}s
        </Text>
      )}
      {moderated && !readOnly && (
        <Text fontSize="xs" opacity={0.6} mt={1} px={1}>
          🛡 Pre-moderation is on — your question will be reviewed by the host before going live
        </Text>
      )}
    </Box>
  );

  // In a thread the composer sticks to the bottom of the viewport
  // (big touch target, always reachable on phones).
  if (thread) {
    return (
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={10}
        px={4}
        pb="calc(env(safe-area-inset-bottom, 0px) + 12px)"
        pt={6}
        bgGradient="linear(to-t, #0b0b14 55%, transparent)"
      >
        {/* px-4 + maxW 960px: aligns the composer with the page gutter */}
        <Box maxW="960px" mx="auto">
          {composer}
        </Box>
      </Box>
    );
  }

  return composer;
}

export default AddPost;
