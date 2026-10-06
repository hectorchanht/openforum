import { ArrowRightIcon, CloseIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Box, HStack, IconButton, Input, Text, VStack, useColorMode } from "@chakra-ui/react";
import { useAtom } from "jotai";
import { motion } from "framer-motion";
import { useRouter } from 'next/router';
import React from "react";
import gun from "../../libs/gun";
import { useFocus, useRelayOnline } from "../../libs/hooks";
import { alertMsgAtom, aliasAtom, threadIdAtom } from "../../libs/jotaiAtoms";
import Logo from "../Logo";
import ThoughtHeapButton from "../ThoughtHeap";

const defaultUser = { username: '', password: '' };

// Relay status: silent when healthy — the green dot was always on, pure
// noise. Only speaks up on failure: a pulsing red "Offline" pill.
// (null = still checking on first paint; render nothing to avoid a false alarm.)
const RelayStatus = () => {
  const online = useRelayOnline();
  if (online !== false) return null;
  return (
    <Box
      display="flex" alignItems="center" gap={1.5} px={2.5} py={1}
      borderRadius="full" bg="red.500" color="white"
      fontSize="xs" fontWeight="bold" flexShrink={0}
      title="Couldn't reach the relay — your posts stay on this device only"
      aria-label="relay connection failed"
    >
      <motion.span
        style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#fff" }}
        animate={{ opacity: [1, 0.25, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      Offline
    </Box>
  );
};

const Header = () => {
  const router = useRouter();
  const [_, setAliasAtom] = useAtom(aliasAtom);
  const [alertMsg, setAlertMsg] = useAtom(alertMsgAtom);
  const [thread, setThreadIdAtom] = useAtom(threadIdAtom);

  const { toggleColorMode, colorMode } = useColorMode();
  const [{ username, password }, setUser] = React.useState(defaultUser);
  const [usernameRef, setInputUsernameFocus] = useFocus()

  React.useEffect(() => {
    setInputUsernameFocus();
  }, [setInputUsernameFocus]);

  const setThread = () => setThreadIdAtom(username.replace(/ /g, ''));
  const exitThread = React.useCallback(() => {
    setThreadIdAtom('');
    setUser(d => ({ ...d, username: '' }));
  }, [setThreadIdAtom]);

  React.useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        exitThread()
      }
    }
    document.addEventListener('keydown', handleKeyDown);

    // Don't forget to clean up
    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
    }
  }, [exitThread]);

  React.useEffect(() => {
    // strip any query string (e.g. ?present=1) before treating the path as a room id
    const secret = router.asPath.split('?')[0].slice(1);

    if (secret) {
      setThreadIdAtom(secret);
    }
  }, [router.asPath, setThreadIdAtom]);

  const setUsername = (e) => setUser((d) => ({ ...d, username: e.target.value }));
  const setPassword = (e) => setUser((d) => ({ ...d, password: e.target.value }));
  const transErrMsg = (msg) => msg.toLowerCase().replace('User', 'Secret').replace('user', 'secret').replace('created', 'taken');

  const registerGun = () => {
    gun.user().create(username.replace(/ /g, ''), password.replace(/ /g, ''), (d) => {
      if (d.err) {
        setAlertMsg(transErrMsg(d.err));
      } else {
        setAliasAtom(username)
        setUser(dd => ({ ...dd, ...d }))
        setAlertMsg("");
      }
    });
  };

  const loginGun = () => {
    gun.user().auth(username.replace(/ /g, ''), password.replace(/ /g, ''), (d) => {
      if (d.err) {
        registerGun();
        // setAlertMsg(transErrMsg(d.err));
      } else {
        setAliasAtom(username)
        setUser(dd => ({ ...dd, ...d }))
        setAlertMsg("");
      }
    });
  };

  const ToggleColor = () => <IconButton
    variant={"ghost"}
    color={colorMode === "light" ? "blue.400" : 'yellow.300'}
    aria-label="toggle ColorMode"
    icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
    onClick={toggleColorMode}
  />;

  const IsLogin = () => {
    const logout = () => {
      gun.user().leave();
      setUser(defaultUser);
      setAliasAtom('');
    }
    // const deleteUser = () => gun.user().delete(username, password);

    return <>
      <Text fontSize="sm" fontWeight="semibold" color="purple.300" minW={0} flex={1} isTruncated>
        u/{gun.user()?.is?.alias}
      </Text>
      {/* <IconButton variant={"ghost"} onClick={deleteUser} icon={<DeleteIcon />} /> */}
      <IconButton variant={"ghost"} onClick={logout} color={'red'} icon={<CloseIcon />} aria-label="log out" flexShrink={0} />
    </>
  };

  const handleEnterShortSecret = (event) => (event.key === 'Enter' && password.length === 0) && setThread();
  const handleEnterPassword = (event) => {
    if (event.key !== 'Enter') return;
    if (password.length >= 8) loginGun(); else setThread();
  };

  const showPassword = username && username.length >= 4;
  // "privateMode": with an 8+ character password the arrow turns purple and
  // opens your private page (u/alias) instead of the room. Renamed from the
  // old "holy" terminology — user-facing copy now says "private page".
  const privateMode = password.length >= 8;

  // Joined input group: room-name input with the » button attached at its
  // right end (search-bar style). The button's -1px overlap + square inner
  // corners make them read as one control; it can never wrap onto its own
  // row, which was the mobile shrink-to-fit trigger.
  const roomEntry = (
    <VStack w="100%" spacing={1.5} align="stretch">
      <HStack spacing={0} w="100%">
        <Input
          ref={usernameRef}
          value={username}
          placeholder="Room name — e.g. town-hall"
          onChange={setUsername}
          onKeyDown={handleEnterShortSecret}
          size="lg"
          flex={1}
          minW={0}
          borderRightRadius={0}
          position="relative"
          _focus={{ zIndex: 1 }}
        />
        <IconButton
          aria-label={privateMode ? 'open your private page' : 'join room'}
          title={privateMode
            ? 'Private page: with an 8+ character password this opens your private page (u/your-name) instead of the room'
            : 'Join room — no signup needed'}
          isDisabled={!username.length || !!alertMsg.length}
          variant="solid"
          colorScheme={privateMode ? 'purple' : 'green'}
          onClick={privateMode ? loginGun : setThread}
          icon={<ArrowRightIcon />}
          size="lg"
          minW="56px"
          minH="48px"
          borderLeftRadius={0}
          ml="-1px"
          flexShrink={0}
        />
      </HStack>
      <Text fontSize="xs" opacity={0.6} px={1} lineHeight="1.5">
        {privateMode ? (
          <>🔑 <b>Private page mode</b> — the purple arrow opens <b>your private page</b> (u/{username.replace(/ /g, '') || 'your-name'}), not the room. Clear the password to join the room instead.</>
        ) : (
          <>💡 Type a room name and hit <b>→</b> to join the discussion. No signup, no app.</>
        )}
      </Text>
      {showPassword && (
        <Input
          value={password}
          onChange={setPassword}
          onKeyDown={handleEnterPassword}
          placeholder="Optional password (8+ characters)"
          type="password"
          size="md"
          w="100%"
          minW={0}
        />
      )}
    </VStack>
  );

  return (
    <Box as={"header"} mb={3} position="sticky" top={2} zIndex={20}>
      <VStack
        layerStyle="glass"
        borderRadius="2xl"
        p={3}
        spacing={3}
        align="stretch"
      >
        {/* Row 1: brand lockup left, status controls right */}
        <HStack justifyContent="space-between" alignItems="center" w="100%" spacing={2}>
          <Logo size={30} wordmark onClick={exitThread} />
          <HStack spacing={0} flexShrink={0}>
            <ThoughtHeapButton />
            <RelayStatus />
            <ToggleColor />
          </HStack>
        </HStack>

        {/* Row 2: context-dependent — room entry, in-room, or logged in */}
        {gun.user().is ? (
          <HStack spacing={2} w="100%" alignItems="center">
            <IsLogin />
          </HStack>
        ) : thread ? (
          <HStack spacing={2} w="100%" alignItems="center" justifyContent="space-between">
            <Text fontSize="sm" fontWeight="bold" color="purple.300" minW={0} flex={1} isTruncated title={`Room: ${thread}`}>
              🏠 {thread}
            </Text>
            <IconButton variant="ghost" onClick={exitThread} color="red.400" icon={<CloseIcon />} aria-label="exit room" flexShrink={0} />
          </HStack>
        ) : (
          roomEntry
        )}
      </VStack>
    </Box>
  );
};

export default Header;
