import { Badge, Box, Button, HStack, Select, Text } from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { useThreadMeta } from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";
import ShareQR from "./ShareQR";

const TTL_OPTIONS = [
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'Never expires', ms: 0 },
];

const fmtLeft = (ms) => {
  if (ms <= 0) return 'expired';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s % 60}s left`;
  return `${s}s left`;
};

const ThreadMeta = () => {
  const [thread] = useAtom(threadIdAtom);
  const { meta, isHost, expired, closed, needsCreation, createThread, updateMeta } = useThreadMeta(thread);
  const [ttl, setTtl] = React.useState(TTL_OPTIONS[1].ms);
  const [dismissed, setDismissed] = React.useState(false);
  const [, force] = React.useReducer((x) => x + 1, 0);

  // re-render the countdown text
  React.useEffect(() => {
    if (!meta || meta.expiresAt == null || expired) return;
    const id = setInterval(force, 30000);
    return () => clearInterval(id);
  }, [meta, expired]);

  React.useEffect(() => { setDismissed(false); }, [thread]);

  if (!thread) return null;

  if (needsCreation && !dismissed) {
    return (
      <Box borderWidth="1px" borderRadius="md" p={3} mb={3}>
        <Text fontWeight="bold" mb={1}>Start this thread as host?</Text>
        <Text fontSize="sm" opacity={0.8} mb={2}>
          t/{thread} has no host yet. Whoever starts it becomes the host
          (pin posts, delete posts, close the thread).
        </Text>
        <HStack>
          <Select value={ttl} onChange={(e) => setTtl(Number(e.target.value))} maxW="190px" size="sm">
            {TTL_OPTIONS.map((o) => (
              <option key={o.label} value={o.ms}>{o.label}</option>
            ))}
          </Select>
          <Button colorScheme="cyan" size="sm" onClick={() => createThread(ttl)}>
            Create thread
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Later
          </Button>
        </HStack>
      </Box>
    );
  }

  if (!meta) return null; // still resolving

  return (
    <Box mb={3}>
      {(closed || expired) && (
        <Box bg="red.500" color="white" borderRadius="md" px={3} py={2} mb={2} fontSize="sm">
          {closed ? 'Thread closed by host — read-only.' : 'Thread expired — read-only.'}
        </Box>
      )}
      <HStack spacing={2} fontSize="sm" opacity={0.85} flexWrap="wrap">
        {isHost && <Badge colorScheme="purple">host</Badge>}
        {meta.expiresAt != null && !expired && <Text>Expires in {fmtLeft(meta.expiresAt - Date.now())}</Text>}
        {meta.expiresAt == null && <Text>Never expires</Text>}
        {isHost && (
          <Button size="xs" variant="outline" onClick={() => updateMeta({ closed: !closed })}>
            {closed ? 'Reopen thread' : 'Close thread'}
          </Button>
        )}
        <ShareQR thread={thread} />
      </HStack>
    </Box>
  );
};

export default ThreadMeta;
