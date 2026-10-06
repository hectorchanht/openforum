import { CloseIcon } from "@chakra-ui/icons";
import { Box, HStack, IconButton, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import React from "react";
import { countKeys, usePosts, useThreadMeta, useVotes } from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";

// In-thread "now discussing" banner: shows the host-spotlighted question
// prominently above the list. Teleprompter-style, meant for screen sharing.
const Spotlight = () => {
  const [thread] = useAtom(threadIdAtom);
  const { meta, isHost, updateMeta } = useThreadMeta(thread);
  const posts = usePosts(thread, null);
  const votes = useVotes(thread);

  if (!thread || !meta?.discussingKey) return null;
  const q = posts.find((p) => p.key === meta.discussingKey);
  if (!q) return null;

  return (
    <motion.div
      key={q.key}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
    >
      <Box
        mb={4}
        p={4}
        borderRadius="2xl"
        border="2px solid"
        borderColor="purple.400"
        bgGradient="linear(to-br, purple.900, #1a1033)"
        boxShadow="0 0 40px rgba(139,92,246,0.25)"
      >
        <HStack justify="space-between" mb={2}>
          <Text fontSize="xs" fontWeight="bold" letterSpacing="widest" color="purple.300">
            🎙 NOW DISCUSSING
          </Text>
          {isHost && (
            <IconButton
              size="xs"
              variant="ghost"
              aria-label="clear spotlight"
              icon={<CloseIcon />}
              onClick={() => updateMeta({ discussingKey: null })}
            />
          )}
        </HStack>
        <Text fontSize="xl" fontWeight="semibold" lineHeight="1.5" wordBreak="break-word">
          {String(q.text)}
        </Text>
        <Text fontSize="sm" opacity={0.7} mt={2}>
          ▲ {countKeys(votes[q.key])} upvotes
        </Text>
      </Box>
    </motion.div>
  );
};

export default Spotlight;
