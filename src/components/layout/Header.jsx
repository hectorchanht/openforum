import { ArrowRightIcon, CloseIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Box, HStack, IconButton, Input, Text, VStack, useColorMode } from "@chakra-ui/react";
import { useAtom } from "jotai";
import { useRouter } from 'next/router';
import React from "react";
import gun from "../../libs/gun";
import { useFocus, useRelayOnline } from "../../libs/hooks";
import { alertMsgAtom, aliasAtom, threadIdAtom } from "../../libs/jotaiAtoms";
import Logo from "../Logo";

const defaultUser = { username: '', password: '' };

// Green dot = connected to the Gun relay (posts sync to others live).
// Red dot = no relay connection (posts stay on this device only).
const RelayStatus = () => {
  const online = useRelayOnline();
  return (
    <Box
      title={online
        ? 'relay connected — posts sync to others live'
        : 'relay disconnected — posts stay on this device only'}
      aria-label="relay connection status"
      display="flex" alignItems="center" px={1}
    >
      <Box as="span" display="inline-block" w="10px" h="10px" borderRadius="full"
        bg={online ? 'green.400' : 'red.500'}
        boxShadow={online ? '0 0 8px #48bb78' : 'none'} />
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
  const holyMode = password.length >= 8;

  // Joined input group: room-name input with the » button attached at its
  // right end (search-bar style). The button's -1px overlap + square inner
  // corners make them read as one control; it can never wrap onto its own
  // row, which was the mobile shrink-to-fit trigger.
  const roomEntry = (
    <VStack w="100%" spacing={2} align="stretch">
      <HStack spacing={0} w="100%">
        <Input
          ref={usernameRef}
          value={username}
          placeholder="room name"
          onChange={setUsername}
          onKeyDown={handleEnterShortSecret}
          size="md"
          flex={1}
          minW={0}
          borderRightRadius={0}
          position="relative"
          _focus={{ zIndex: 1 }}
        />
        <IconButton
          aria-label={holyMode ? 'open holy page' : 'join room'}
          title={holyMode
            ? 'Purple arrow: password-protected holy page (u/your-alias)'
            : 'Green arrow: join room (password empty)'}
          isDisabled={!username.length || !!alertMsg.length}
          variant="solid"
          colorScheme={holyMode ? 'purple' : 'green'}
          onClick={holyMode ? loginGun : setThread}
          icon={<ArrowRightIcon />}
          size="md"
          borderLeftRadius={0}
          ml="-1px"
          flexShrink={0}
        />
      </HStack>
      {showPassword && (
        <Input
          value={password}
          onChange={setPassword}
          onKeyDown={handleEnterPassword}
          placeholder="password — 8+ chars opens your private page"
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
            <Text fontSize="sm" fontWeight="bold" color="purple.300" minW={0} flex={1} isTruncated>
              t/{thread}
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
