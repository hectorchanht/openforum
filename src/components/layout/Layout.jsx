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
    <Container maxW="960px" display="flex" flexDirection="column" minH="100dvh" pb={4} overflowX="clip">
      {/* overflowX="clip": defensive guard — no single misbehaving element
          can ever trigger mobile Chrome's shrink-to-fit again. `clip` (unlike
          `hidden`) doesn't create a scroll container, so the sticky header
          keeps working. */}
      <Head>
        {/* <!-- Primary Meta Tags --> */}
        <title>OpenMic — live anonymous Q&A for events</title>
        <meta name="title" content="OpenMic — live anonymous Q&A for events" />
        <meta name="description" content="Open a room, share the link or QR — questions come in live, the audience upvotes the best. Spotlight questions on the big screen, export results. No signup." />

        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://openmic.hectorchan.com/" />
        <meta property="og:title" content="OpenMic — live anonymous Q&A for events" />
        <meta property="og:description" content="Open a room, share the link or QR — questions come in live, the audience upvotes the best. No signup." />
        <meta property="og:image" content="https://openmic.hectorchan.com/og.png" />

        {/* <!-- Twitter --> */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://openmic.hectorchan.com/" />
        <meta property="twitter:title" content="OpenMic — live anonymous Q&A for events" />
        <meta property="twitter:description" content="Open a room, share the link or QR — questions come in live, the audience upvotes the best. No signup." />
        <meta property="twitter:image" content="https://openmic.hectorchan.com/og.png" />

        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <Header />
      <Box p={1} as="main" flex={1}>
        {children}
      </Box>
      <AlertMsg msg={alertMsg} setMsg={setAlertMsg} />
      <Footer />
    </Container>
  )
}

export default Layout;
