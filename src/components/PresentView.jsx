import { Badge, Box, HStack, Text, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import React from "react";
import { countKeys, usePosts, usePostStatus, useThreadMeta, useVotes } from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";

// Present mode: open /<room>?present=1 on the projector/second screen.
// Shows ONLY the spotlighted question, huge — and updates live as the host
// spotlights different questions. No chrome, no voting, just the question.
const PresentView = () => {
  const [thread] = useAtom(threadIdAtom);
  const { meta } = useThreadMeta(thread);
  const posts = usePosts(thread, null);
  const votes = useVotes(thread);
  const status = usePostStatus(thread);

  const q = meta?.discussingKey
    ? posts.find((p) => p.key === meta.discussingKey)
    : null;
  const answered = q ? !!status[q.key]?.answered : false;

  return (
    <Box
      minH="70vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      textAlign="center"
      px={4}
      py={10}
    >
      <AnimatePresence mode="wait">
        {!q ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <VStack spacing={4} opacity={0.7}>
              <Text fontSize="7xl">🎤</Text>
              <Text fontSize="2xl" fontWeight="semibold">
                Waiting for the host to spotlight a question…
              </Text>
              <Text fontSize="md" opacity={0.7}>
                This screen updates automatically. “{thread}”
              </Text>
            </VStack>
          </motion.div>
        ) : (
          <motion.div
            key={q.key}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35 }}
            style={{ width: '100%' }}
          >
            <VStack spacing={6}>
              <Text
                fontSize="xs"
                fontWeight="bold"
                letterSpacing="0.3em"
                bgGradient="linear(to-r, #a78bfa, #e879f9)"
                bgClip="text"
              >
                🎙 NOW DISCUSSING
              </Text>
              <Text
                fontSize={{ base: '3xl', md: '5xl', lg: '6xl' }}
                fontWeight="extrabold"
                lineHeight="1.25"
                wordBreak="break-word"
                maxW="1000px"
              >
                {String(q.text)}
              </Text>
              <HStack spacing={3} opacity={0.8}>
                <Badge fontSize="md" px={3} py={1} borderRadius="full" colorScheme="cyan">
                  ▲ {countKeys(votes[q.key])}
                </Badge>
                {answered && (
                  <Badge fontSize="md" px={3} py={1} borderRadius="full" colorScheme="green">
                    ✓ answered
                  </Badge>
                )}
              </HStack>
            </VStack>
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default PresentView;
