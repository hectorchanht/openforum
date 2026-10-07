import { Badge, Box, HStack, Progress, Text, VStack } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import React from "react";
import { countKeys, usePosts, usePostStatus, usePolls, useThreadMeta, useVotes } from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";

// Present mode: open /<room>?present=1 on the projector/second screen.
// Shows the spotlighted question huge (updates live as the host moves on),
// plus any open poll with live results — the two things a projector
// audience needs to see. No chrome, no voting, just the show.
const PresentView = () => {
  const [thread] = useAtom(threadIdAtom);
  const { meta } = useThreadMeta(thread);
  const posts = usePosts(thread, null);
  const votes = useVotes(thread);
  const status = usePostStatus(thread);
  const polls = usePolls(thread);

  const q = meta?.discussingKey
    ? posts.find((p) => p.key === meta.discussingKey)
    : null;
  const answered = q ? !!status[q.key]?.answered : false;
  // usePolls returns newest-first — the first open one is the live poll.
  const livePoll = polls.find((p) => !p.closed) || null;

  return (
    <VStack
      minH="70vh"
      justify="center"
      textAlign="center"
      px={4}
      py={10}
      spacing={10}
      align="stretch"
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

      {/* Live poll — projector shows results as votes stream in */}
      {livePoll && (
        <Box
          w="100%"
          maxW="760px"
          mx="auto"
          layerStyle="glass"
          p={{ base: 5, md: 7 }}
          borderRadius="2xl"
          textAlign="left"
        >
          <Text
            fontSize="xs"
            fontWeight="bold"
            letterSpacing="0.3em"
            bgGradient="linear(to-r, #67e8f9, #a78bfa)"
            bgClip="text"
          >
            📊 LIVE POLL
          </Text>
          <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="extrabold" mt={2} mb={5} wordBreak="break-word">
            {String(livePoll.q)}
          </Text>
          <VStack align="stretch" spacing={4}>
            {livePoll.options.map((opt, i) => {
              const c = livePoll.counts[i] || 0;
              const pct = livePoll.total > 0 ? Math.round((c / livePoll.total) * 100) : 0;
              return (
                <Box key={i}>
                  <HStack justify="space-between" mb={1.5} spacing={3}>
                    <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="semibold" minW={0} wordBreak="break-word">
                      {String(opt)}
                    </Text>
                    <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="extrabold" flexShrink={0}>
                      {c} <Text as="span" opacity={0.6} fontWeight="semibold">· {pct}%</Text>
                    </Text>
                  </HStack>
                  <Progress
                    value={pct}
                    size="lg"
                    borderRadius="full"
                    colorScheme="purple"
                    bg="whiteAlpha.100"
                    hasStripe
                    isAnimated
                  />
                </Box>
              );
            })}
          </VStack>
          <Text fontSize="sm" opacity={0.6} mt={4}>
            ▲ {livePoll.total} vote{livePoll.total !== 1 ? 's' : ''} — updates live
          </Text>
        </Box>
      )}
    </VStack>
  );
};

export default PresentView;
