import { Box, Button, HStack, Select, Text, VStack } from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { track } from "../libs/analytics";
import { useThreadMeta } from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";

const TTL_OPTIONS = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Never expires', ms: 0 },
];

// One-time orientation: a first-time visitor should get what to do within
// seconds of joining a room. Dismissed once per browser (localStorage).
const FirstRunHint = ({ thread, voteBudget }) => {
  const [dismissed, setDismissed] = React.useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem('openforum-seen-room') === '1'
  );
  if (dismissed) return null;
  const dismiss = () => {
    try { window.localStorage.setItem('openforum-seen-room', '1'); } catch { /* private mode */ }
    setDismissed(true);
  };
  return (
    <Box layerStyle="glass" p={4} mb={4} borderColor="purple.400" borderWidth="1px">
      <HStack justify="space-between" align="start" spacing={3}>
        <VStack align="start" spacing={1} minW={0}>
          <Text fontWeight="bold" fontSize="sm">👋 Welcome to “{thread}”</Text>
          <Text fontSize="sm" opacity={0.8} lineHeight="1.6" minW={0}>
            Ask a question in the box below · tap <Text as="b">▲</Text> to upvote the ones
            you want answered{voteBudget > 0 ? <> — you get <Text as="b">{voteBudget}</Text> votes in this queue</> : null}
            {' · '}park half-formed thoughts with <Text as="b">🧠 Heap</Text> so you don&apos;t forget them.
          </Text>
        </VStack>
        <Button size="sm" minH="44px" variant="ghost" onClick={dismiss} flexShrink={0}>
          Got it
        </Button>
      </HStack>
    </Box>
  );
};

// Thread bootstrap: creation card for unclaimed rooms + read-only banners.
// The rest of the room UI (title, stats, host controls) lives in RoomHeader.
const ThreadMeta = () => {
  const [thread] = useAtom(threadIdAtom);
  const { meta, expired, closed, needsCreation, createThread } = useThreadMeta(thread);
  const [ttl, setTtl] = React.useState(TTL_OPTIONS[1].ms);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => { setDismissed(false); }, [thread]);

  // Key funnel action: someone claimed a room as host.
  const openQueue = () => {
    const ttlLabel = (TTL_OPTIONS.find((o) => o.ms === ttl) || {}).label || 'unknown';
    track('queue_opened', { ttl_label: ttlLabel });
    createThread(ttl);
  };

  if (!thread) return null;

  if (needsCreation && !dismissed) {
    return (
      <Box layerStyle="glass" p={5} mb={4}>
        <Text fontWeight="extrabold" fontSize="lg" mb={1}>
          🎤 Start this queue as host?
        </Text>
        <Text fontSize="sm" opacity={0.8} mb={3}>
          <Text as="span" fontWeight="bold">“{thread}”</Text> has no host yet. Whoever starts it
          becomes the host — pin &amp; spotlight questions, mark them answered, export results.
          <br />💡 After creating, open <b>🔑 Host key</b> under 🛠 Host tools and save it — it&apos;s the
          only way to regain host on another device.
        </Text>
        <HStack flexWrap="wrap">
          <Select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} maxW="190px" minH="44px" size="md">
            {TTL_OPTIONS.map((o) => (
              <option key={o.label} value={o.ms}>{o.label}</option>
            ))}
          </Select>
          <Button colorScheme="purple" minH="44px" onClick={openQueue}>
            Open queue
          </Button>
          <Button variant="ghost" minH="44px" onClick={() => setDismissed(true)}>
            Later
          </Button>
        </HStack>
      </Box>
    );
  }

  if (closed || expired) {
    return (
      <Box
        bg="red.500"
        color="white"
        borderRadius="2xl"
        px={4}
        py={3}
        mb={4}
        fontSize="sm"
        fontWeight="semibold"
        boxShadow="lg"
      >
        {closed
          ? '🔒 Queue closed by host — read-only. Questions and votes are still visible.'
          : '⏰ Queue expired — read-only. Questions and votes are still visible.'}
      </Box>
    );
  }

  // Room is live — show the one-time orientation hint (null after dismissal).
  return <FirstRunHint thread={thread} voteBudget={meta ? meta.voteBudget : 5} />;
};

export default ThreadMeta;
