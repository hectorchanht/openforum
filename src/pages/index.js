import { Box, Button, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { useRouter } from 'next/router';
import React from 'react';
import AddPost from '../components/AddPost';
import Layout from '../components/layout/Layout';
import PostList from '../components/PostList';
import PresentView from '../components/PresentView';
import RoomHeader from '../components/RoomHeader';
import Spotlight from '../components/Spotlight';
import ThreadMeta from '../components/ThreadMeta';
import { searchAtom, sortModeAtom, statusFilterAtom, threadIdAtom } from "../libs/jotaiAtoms";

const Hero = () => (
  <Box textAlign="center" py={{ base: 8, md: 14 }} px={4}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Text fontSize="6xl" mb={2}>🎤</Text>
      <Heading
        size="2xl"
        mb={3}
        bgGradient="linear(to-r, #a78bfa, #e879f9)"
        bgClip="text"
      >
        Give your audience an open mic
      </Heading>
      <Text fontSize="lg" opacity={0.8} mb={6} maxW="520px" mx="auto">
        Live anonymous Q&amp;A for events. Open a room, flash the QR code —
        questions stream in, the crowd upvotes the best. No signup, no app.
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
      >
        🚀 Start a room — it takes 10 seconds
      </Button>
    </motion.div>

    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} maxW="760px" mx="auto" textAlign="left">
      {[
        { emoji: '🔗', title: '1. Share a link', body: 'Type a room name above — share the link or QR. The audience joins instantly from their phones.' },
        { emoji: '⚡', title: '2. Questions fly in', body: 'Anonymous questions arrive in realtime. Duplicates are flagged, spam gets slow mode.' },
        { emoji: '🎙', title: '3. Run the show', body: 'Spotlight questions on the big screen, mark them answered, export the CSV after.' },
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
  const router = useRouter();

  // reset list controls when leaving a room
  React.useEffect(() => {
    if (!thread) {
      setSearch('');
      setSortMode('top');
      setStatusFilter('open');
    }
  }, [thread, setSearch, setSortMode, setStatusFilter]);

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
          <PostList />
          {/* spacer so the fixed composer never covers the last question */}
          {thread && <Box h="130px" />}
        </>
      )}
    </Layout>
  );
}
