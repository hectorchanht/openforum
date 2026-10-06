import { ArrowRightIcon, CloseIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Box, HStack, IconButton, Input, Text, useColorMode } from "@chakra-ui/react";
import { useAtom } from "jotai";
import { useRouter } from 'next/router';
import React from "react";
import gun from "../../libs/gun";
import { useFocus, useRelayOnline } from "../../libs/hooks";
import { alertMsgAtom, aliasAtom, threadIdAtom } from "../../libs/jotaiAtoms";

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
      <Text fontSize="sm" fontWeight="semibold" color="purple.300">
        u/{gun.user()?.is?.alias}
      </Text>
      {/* <IconButton variant={"ghost"} onClick={deleteUser} icon={<DeleteIcon />} /> */}
      <IconButton variant={"ghost"} onClick={logout} color={'red'} icon={<CloseIcon />} aria-label="log out" />
    </>
  };

  const handleEnterShortSecret = (event) => (event.key === 'Enter' && password.length === 0) && setThread();

  return (
    <Box as={"header"} mb={3} position="sticky" top={2} zIndex={20}>
      <HStack
        p={2}
        pl={3}
        borderRadius="2xl"
        spacing={1}
        justifyContent="space-between"
        layerStyle="glass"
      >
        <HStack spacing={1} flexShrink={0}>
          <RelayStatus />
          <Text
            fontSize="xl"
            fontWeight="extrabold"
            bgGradient="linear(to-r, #a78bfa, #e879f9)"
            bgClip="text"
            cursor="pointer"
            onClick={exitThread}
            title="OpenMic home"
            userSelect="none"
          >
            🎤
          </Text>
          <ToggleColor />
        </HStack>

        {
          gun.user().is
            ? <IsLogin />
            : (thread
              ? (
                <HStack spacing={1}>
                  <Text fontSize="sm" fontWeight="bold" color="purple.300" maxW="40vw" isTruncated>
                    t/{thread}
                  </Text>
                  <IconButton variant="ghost" onClick={exitThread} color="red.400" icon={<CloseIcon />} aria-label="exit room" />
                </HStack>
              ) : (
                <HStack spacing={1} flexWrap="wrap" justify="flex-end">
                  <Input
                    ref={usernameRef}
                    value={username} width="auto" placeholder="room name"
                    onChange={setUsername} onKeyDown={handleEnterShortSecret}
                    size="sm" maxW="150px" />

                  {username && username.length >= 4 && (
                    <Input value={password} width="auto" onChange={setPassword} placeholder="password" type="password" size="sm" maxW="130px" />)}

                  <IconButton
                    aria-label={password.length >= 8 ? 'open holy page' : 'join room'}
                    title={password.length >= 8
                      ? 'Purple arrow: password-protected holy page (u/your-alias)'
                      : 'Green arrow: join room (password empty)'}
                    isDisabled={!username.length || alertMsg.length}
                    variant="solid"
                    colorScheme={password.length >= 8 ? 'purple' : 'green'}
                    onClick={password.length >= 8 ? loginGun : setThread}
                    icon={<ArrowRightIcon />} />
                </HStack>
              ))}
      </HStack>
    </Box>
  );
};

export default Header;
