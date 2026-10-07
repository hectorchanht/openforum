import { CopyIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import {
  Box,
  Divider,
  Flex,
  Icon,
  Link,
  SimpleGrid,
  Text,
  VStack,
  useColorMode,
} from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { useRelayOfflineConfirmed } from "../../libs/hooks";
import { threadIdAtom } from "../../libs/jotaiAtoms";
import { LogoMark } from "../Logo";

const GithubIcon = ({ colorMode, ...props }) => (
  <Icon {...props}>
    <path fill={colorMode === 'dark' ? "#fff" : '#000'} d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </Icon>
);

const REPO_URL = "https://github.com/hectorchanht/openforum";

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

const FooterLink = ({ children, ...props }) => (
  <Link
    fontSize="sm"
    opacity={0.75}
    _hover={{ opacity: 1, textDecoration: 'none', color: 'purple.300' }}
    display="inline-flex"
    alignItems="center"
    gap={1.5}
    {...props}
  >
    {children}
  </Link>
);

const Footer = () => {
  const { colorMode } = useColorMode();
  const [thread] = useAtom(threadIdAtom);
  const relayOffline = useRelayOfflineConfirmed();
  const [copied, setCopied] = React.useState(false);

  const copyThreadLink = async () => {
    if (!thread) return;
    await copyToClipboard(`${window.location.origin}/${thread}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const openPresent = () => {
    if (!thread) return;
    window.open(`${window.location.origin}/${thread}?present=1`, '_blank', 'noopener');
  };

  return (
    <Box as="footer" mt="auto" pt={8} pb={3}>
      <Divider opacity={0.15} mb={6} />
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={6}>
        {/* Brand */}
        <VStack align="start" spacing={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <LogoMark size={24} />
            <Text fontWeight="extrabold" fontSize="md">OpenForum</Text>
          </Box>
          <Text fontSize="sm" opacity={0.65} lineHeight="1.6" maxW="320px">
            Live anonymous Q&amp;A for events — open a room, share the link,
            the audience asks and upvotes. No signup, no app.
          </Text>
        </VStack>

        {/* In this room — contextual actions, visible where they're useful */}
        <VStack align="start" spacing={2}>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" opacity={0.5}>
            In this room
          </Text>
          {thread ? (
            <>
              <FooterLink as="button" onClick={copyThreadLink}>
                <CopyIcon boxSize={3.5} />
                {copied ? 'Link copied!' : 'Copy room link'}
              </FooterLink>
              <FooterLink as="button" onClick={openPresent}>
                🎙 Present view
              </FooterLink>
              <FooterLink as="button" onClick={copyThreadLink} title={`${window.location.origin}/${thread}`}>
                <Text as="span" opacity={0.7}>🔗 {typeof window !== 'undefined' ? `${window.location.host}/${thread}` : thread}</Text>
              </FooterLink>
            </>
          ) : (
            <Text fontSize="sm" opacity={0.5}>
              Join a room to get quick share actions here.
            </Text>
          )}
        </VStack>

        {/* Project */}
        <VStack align="start" spacing={2}>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="0.08em" opacity={0.5}>
            Project
          </Text>
          <FooterLink href={REPO_URL} isExternal>
            <GithubIcon colorMode={colorMode} boxSize={4} />
            GitHub repo <ExternalLinkIcon boxSize={3} />
          </FooterLink>
          <FooterLink href={`${REPO_URL}/issues`} isExternal>
            🐛 Report a bug <ExternalLinkIcon boxSize={3} />
          </FooterLink>
          <Text fontSize="sm" opacity={0.5}>
            MIT licensed — fork it, run your own relay.
          </Text>
        </VStack>
      </SimpleGrid>

      <Divider opacity={0.1} mb={3} />
      <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Text fontSize="xs" opacity={0.5}>
          © {new Date().getFullYear()} OpenForum · Questions sync through the Gun relay — no accounts, no tracking.
        </Text>
        {/* Relay status: silent when healthy (the green "connected" was always
            on — pure noise). Only the failure state renders. */}
        {relayOffline && (
          <Box display="flex" alignItems="center" fontSize="xs" fontWeight="semibold" color="red.300">
            <Box as="span" display="inline-block" w="8px" h="8px" borderRadius="full" mr={2} bg="red.500" />
            relay disconnected — local only
          </Box>
        )}
      </Flex>
    </Box>
  );
};

export default Footer;
