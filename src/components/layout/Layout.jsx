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
        <title>OpenForum — live anonymous Q&A for events</title>
        <meta name="title" content="OpenForum — live anonymous Q&A for events" />
        <meta name="description" content="Open a room, share the link or QR — questions come in live, the audience upvotes the best. Spotlight questions on the big screen, export results. No signup." />

        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://openforum.hectorchan.com/" />
        <meta property="og:title" content="OpenForum — live anonymous Q&A for events" />
        <meta property="og:description" content="Open a room, share the link or QR — questions come in live, the audience upvotes the best. No signup." />
        <meta property="og:image" content="https://openforum.hectorchan.com/og.png" />

        {/* <!-- Twitter --> */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://openforum.hectorchan.com/" />
        <meta property="twitter:title" content="OpenForum — live anonymous Q&A for events" />
        <meta property="twitter:description" content="Open a room, share the link or QR — questions come in live, the audience upvotes the best. No signup." />
        <meta property="twitter:image" content="https://openforum.hectorchan.com/og.png" />

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
