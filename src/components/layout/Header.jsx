import { ArrowRightIcon, CloseIcon, MoonIcon, SunIcon } from "@chakra-ui/icons";
import { Box, HStack, IconButton, Input, useColorMode } from "@chakra-ui/react";
import { useAtom } from "jotai";
import { useRouter } from 'next/router';
import React from "react";
import gun from "../../libs/gun";
import { useFocus } from "../../libs/hooks";
import { alertMsgAtom, aliasAtom, threadIdAtom } from "../../libs/jotaiAtoms";

const defaultUser = { username: '', password: '' };

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
    const secret = router.asPath.slice(1);

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
    color={colorMode === "light" ? "blue.400" : 'red.400'}
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
      <Box>
        u/{gun.user()?.is?.alias}
      </Box>
      {/* <IconButton variant={"ghost"} onClick={deleteUser} icon={<DeleteIcon />} /> */}
      <IconButton variant={"ghost"} onClick={logout} color={'red'} icon={<CloseIcon />} />
    </>
  };

  const handleEnterShortSecret = (event) => (event.key === 'Enter' && password.length === 0) && setThread();

  return (
    <Box as={"header"} mb={2}>
      <HStack p={2} borderRadius={8} boxShadow="lg" spacing={'4px'} justifyContent={"space-between"}>
        {/* <Image src={"/gun-logo.png"} alt={"logo"} height={"38px"} width={"38px"} /> */}

        <ToggleColor />

        {
          gun.user().is
            ? <IsLogin />
            : (thread
              ? (
                <>
                  <Box>t/{thread}</Box>
                  <IconButton variant={"ghost"} onClick={exitThread} color={'red.600'} icon={<CloseIcon />} />
                </>
              ) : (
                <>
                  <Input
                    ref={usernameRef}
                    value={username} width="auto" placeholder="secret token"
                    onChange={setUsername} onKeyDown={handleEnterShortSecret} />

                  {username && username.length >= 4 && (
                    <Input value={password} width="auto" onChange={setPassword} placeholder="password" />)}

                  <IconButton
                    isDisabled={!username.length || alertMsg.length} variant={"ghost"}
                    onClick={password.length >= 8 ? loginGun : setThread}
                    color={password.length >= 8 ? '#805AD5' : 'green.400'} icon={<ArrowRightIcon />} />
                </>
              ))}
      </HStack>
    </Box>
  );
};

export default Header;
