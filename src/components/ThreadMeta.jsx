import { Box, Button, HStack, Select, Text } from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { useThreadMeta } from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";

const TTL_OPTIONS = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Never expires', ms: 0 },
];

// Thread bootstrap: creation card for unclaimed rooms + read-only banners.
// The rest of the room UI (title, stats, host controls) lives in RoomHeader.
const ThreadMeta = () => {
  const [thread] = useAtom(threadIdAtom);
  const { expired, closed, needsCreation, createThread } = useThreadMeta(thread);
  const [ttl, setTtl] = React.useState(TTL_OPTIONS[1].ms);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => { setDismissed(false); }, [thread]);

  if (!thread) return null;

  if (needsCreation && !dismissed) {
    return (
      <Box layerStyle="glass" p={5} mb={4}>
        <Text fontWeight="extrabold" fontSize="lg" mb={1}>
          🎤 Start this room as host?
        </Text>
        <Text fontSize="sm" opacity={0.8} mb={3}>
          <Text as="span" fontWeight="bold">t/{thread}</Text> has no host yet. Whoever starts it
          becomes the host — pin &amp; spotlight questions, mark them answered, export results.
        </Text>
        <HStack flexWrap="wrap">
          <Select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} maxW="190px">
            {TTL_OPTIONS.map((o) => (
              <option key={o.label} value={o.ms}>{o.label}</option>
            ))}
          </Select>
          <Button colorScheme="purple" onClick={() => createThread(ttl)}>
            Create room
          </Button>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
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
          ? '🔒 Room closed by host — read-only. Questions and votes are still visible.'
          : '⏰ Room expired — read-only. Questions and votes are still visible.'}
      </Box>
    );
  }

  return null;
};

export default ThreadMeta;
