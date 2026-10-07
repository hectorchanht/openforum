import { Box, Button, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { useRouter } from 'next/router';
import React from 'react';
import AddPost from '../components/AddPost';
import Layout from '../components/layout/Layout';
import Logo from '../components/Logo';
import PollsSection from '../components/PollsSection';
import PostList from '../components/PostList';
import PresentView from '../components/PresentView';
import RoomHeader from '../components/RoomHeader';
import Spotlight from '../components/Spotlight';
import ThreadMeta from '../components/ThreadMeta';
import { authorFilterAtom, myOnlyAtom, searchAtom, sortModeAtom, statusFilterAtom, threadIdAtom } from "../libs/jotaiAtoms";

const Hero = () => (
  <Box textAlign="center" py={{ base: 8, md: 14 }} px={0}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* fluid wordmark: clamp() scales with the viewport so "OpenQ"
          never clips on narrow phones (was cut off at 360px with nowrap). */}
      <Box display="flex" justifyContent="center" mb={4} maxW="100%">
        <Logo size={64} wordmark wordmarkFontSize="clamp(1.75rem, 9vw, 2.75rem)" />
      </Box>
      <Heading
        size="2xl"
        mb={3}
        bgGradient="linear(to-r, #a78bfa, #e879f9)"
        bgClip="text"
      >
        A forum in a queue
      </Heading>
      <Text fontSize="lg" opacity={0.8} mb={6} maxW="560px" mx="auto">
        OpenQ turns your event into a live question queue. The audience joins
        from their phones, asks anything, and upvotes the best to the front —
        you just work the queue from the stage. No signup, no app.
      </Text>
      <Button
        size="lg"
        colorScheme="purple"
        onClick={() => {
          const input = document.querySelector('header input');
          if (input) input.focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        boxShadow="0 8px 30px rgba(139,92,246,0.4)"
        mb={10}
        /* wrap-friendly: long label must never force horizontal overflow */
        whiteSpace="normal"
        textAlign="center"
        maxW="100%"
        h="auto"
        py={4}
      >
        🚀 Open the Q — it takes 10 seconds
      </Button>
    </motion.div>

    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} maxW="760px" mx="auto" textAlign="left">
      {[
        { emoji: '🔗', title: '1. Open the Q', body: 'Name a room and flash the QR code. The audience joins instantly from their phones — no signup, no app to install.' },
        { emoji: '📋', title: '2. Questions queue up', body: 'They arrive live and the crowd upvotes the best to the front of the line. Duplicates get flagged, spam gets slow mode.' },
        { emoji: '🎙', title: '3. Work the queue', body: 'Spotlight questions on the big screen, mark them answered as you go, export the results when you\u2019re done.' },
      ].map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
        >
          <Box layerStyle="glass" p={5} h="100%">
            <Text fontSize="2xl" mb={2}>{s.emoji}</Text>
            <Text fontWeight="bold" mb={1}>{s.title}</Text>
            <Text fontSize="sm" opacity={0.75}>{s.body}</Text>
          </Box>
        </motion.div>
      ))}
    </SimpleGrid>

    <HStack justify="center" spacing={4} mt={8} fontSize="xs" opacity={0.6} flexWrap="wrap">
      <Text>🗳 Upvotes</Text>
      <Text>🎙 Present mode</Text>
      <Text>👥 Authors</Text>
      <Text>🐢 Slow mode</Text>
      <Text>📥 CSV export</Text>
      <Text>🔔 Host alerts</Text>
      <Text>🌐 Decentralized (Gun.js)</Text>
    </HStack>
  </Box>
);

export default function Home() {
  const [thread] = useAtom(threadIdAtom);
  const [, setSearch] = useAtom(searchAtom);
  const [, setSortMode] = useAtom(sortModeAtom);
  const [, setStatusFilter] = useAtom(statusFilterAtom);
  const [, setMyOnly] = useAtom(myOnlyAtom);
  const [, setAuthorFilter] = useAtom(authorFilterAtom);
  const router = useRouter();

  // reset list controls when leaving a room
  React.useEffect(() => {
    if (!thread) {
      setSearch('');
      setSortMode('top');
      setStatusFilter('open');
      setMyOnly(false);
      setAuthorFilter(null);
    }
  }, [thread, setSearch, setSortMode, setStatusFilter, setMyOnly, setAuthorFilter]);

  // ?present=1 — projector view showing only the spotlighted question, live.
  const present = React.useMemo(
    () => typeof window !== 'undefined' && /[?&]present=1\b/.test(router.asPath),
    [router.asPath]
  );

  return (
    <Layout>
      {thread && present ? (
        <PresentView />
      ) : (
        <>
          {!thread && <Hero />}
          <ThreadMeta />
          {thread && <RoomHeader />}
          {thread && <Spotlight />}
          <AddPost />
          <Box mt={4} />
          {!thread && (
            <Text fontSize="xs" opacity={0.55} mb={3} textTransform="uppercase" letterSpacing="wider">
              Public board — anyone can post
            </Text>
          )}
          {thread && <PollsSection />}
          <PostList />
          {/* spacer so the fixed composer never covers the last question */}
          {thread && <Box h="130px" />}
        </>
      )}
    </Layout>
  );
}
