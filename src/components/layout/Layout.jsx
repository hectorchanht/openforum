import { Box, Container } from "@chakra-ui/react";
import { useAtom } from "jotai";
import Head from 'next/head';
import { alertMsgAtom } from "../../libs/jotaiAtoms";
import AlertMsg from "../AlertMsg";
import Footer from "./Footer";
import Header from "./Header";


const Layout = ({ children }) => {
  const [alertMsg, setAlertMsg] = useAtom(alertMsgAtom);
  return (
    <Container maxW="960px" display="flex" flexDirection="column" minH="100dvh" pb={4} px={4} overflowX="clip">
      {/* px={4}: the single page gutter — header, hero, cards, footer all
          align to it (children must not add their own horizontal padding). */}
      {/* overflowX="clip": defensive guard — no single misbehaving element
          can ever trigger mobile Chrome's shrink-to-fit again. `clip` (unlike
          `hidden`) doesn't create a scroll container, so the sticky header
          keeps working. */}
      <Head>
        {/* <!-- Primary Meta Tags --> */}
        <title>OpenQ — the forum in a queue</title>
        <meta name="title" content="OpenQ — the forum in a queue" />
        <meta name="description" content="A live question queue for events — the audience asks from their phones, upvotes the best to the front, and you work the queue from the stage. No signup, no app." />

        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://openq.hectorchan.com/" />
        <meta property="og:title" content="OpenQ — the forum in a queue" />
        <meta property="og:description" content="A live question queue for events — the audience upvotes the best to the front. No signup, no app." />
        <meta property="og:image" content="https://openq.hectorchan.com/og.png" />

        {/* <!-- Twitter --> */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://openq.hectorchan.com/" />
        <meta property="twitter:title" content="OpenQ — the forum in a queue" />
        <meta property="twitter:description" content="A live question queue for events — the audience upvotes the best to the front. No signup, no app." />
        <meta property="twitter:image" content="https://openq.hectorchan.com/og.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#000000" />
      </Head>
      <Header />
      <Box as="main" flex={1} px={0}>
        {children}
      </Box>
      <AlertMsg msg={alertMsg} setMsg={setAlertMsg} />
      <Footer />
    </Container>
  )
}

export default Layout;
