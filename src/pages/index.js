import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from 'react';
import AddPost from '../components/AddPost';
import Layout from '../components/layout/Layout';
import PostList from '../components/PostList';
import ThreadMeta from '../components/ThreadMeta';
import { threadIdAtom } from "../libs/jotaiAtoms";

const Hero = () => (
  <Box textAlign="center" py={6} px={4}>
    <Text fontSize="4xl" mb={1}>🎤</Text>
    <Heading size="lg" mb={2}>OpenMic</Heading>
    <Text opacity={0.8} mb={5}>
      Live anonymous Q&amp;A for events.<br />
      Open a room, share the link or QR code — the audience joins instantly. No signup.
    </Text>
    <HStack justify="center" spacing={6} fontSize="sm" opacity={0.7} flexWrap="wrap">
      <Box><b>1.</b> Type a room name above</Box>
      <Box><b>2.</b> Share the link / QR</Box>
      <Box><b>3.</b> Questions come in live — upvote the best</Box>
    </HStack>
  </Box>
);

export default function Home() {
  const [thread] = useAtom(threadIdAtom);

  return <Layout>
    {!thread && <Hero />}
    <ThreadMeta />
    <AddPost />
    <br />
    {!thread && (
      <Text fontSize="xs" opacity={0.55} mb={2} textTransform="uppercase" letterSpacing="wider">
        Public board — anyone can post
      </Text>
    )}
    <PostList />
  </Layout>
}
