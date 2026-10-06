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
    <Container maxW={'888px'} display={'flex'} flexDirection={'column'} height={'calc(92vh)'}>
      <Head>
        {/* <!-- Primary Meta Tags --> */}
        <title>OpenMic — give your audience an open mic</title>
        <meta name="title" content="OpenMic — give your audience an open mic" />
        <meta name="description" content="Live anonymous Q&A for events. Open a link, get questions in realtime. No signup." />

        {/* <!-- Open Graph / Facebook --> */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://openmic.hectorchan.com/" />
        <meta property="og:title" content="OpenMic — give your audience an open mic" />
        <meta property="og:description" content="Live anonymous Q&A for events. Open a link, get questions in realtime. No signup." />
        <meta property="og:image" content="https://openmic.hectorchan.com/gun-logo.png" />

        {/* <!-- Twitter --> */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://openmic.hectorchan.com/" />
        <meta property="twitter:title" content="OpenMic — give your audience an open mic" />
        <meta property="twitter:description" content="Live anonymous Q&A for events. Open a link, get questions in realtime. No signup." />
        <meta property="twitter:image" content="https://openmic.hectorchan.com/gun-logo.png" />

        <link rel="icon" href="/gun-logo.png" />
      </Head>
      <Header />
      <Box p={2} as={'main'} flex={1}>
        {children}
      </Box>
      <AlertMsg msg={alertMsg} setMsg={setAlertMsg} />
      <Footer />
    </Container>
  )
}

export default Layout;