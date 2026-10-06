import { CopyIcon, ExternalLinkIcon, HamburgerIcon } from "@chakra-ui/icons";
import {
  Box,
  Divider,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  useColorMode,
} from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { useRelayOnline } from "../../libs/hooks";
import { threadIdAtom } from "../../libs/jotaiAtoms";

const GithubIcon = ({ colorMode, ...props }) => (
  <Icon {...props}>
    <path fill={colorMode === 'dark' ? "#fff" : '#000'} d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </Icon>
);

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

const Footer = () => {
  const { colorMode } = useColorMode();
  const [thread] = useAtom(threadIdAtom);
  const relayOnline = useRelayOnline();
  const [copied, setCopied] = React.useState(false);

  const copyThreadLink = async () => {
    if (!thread) return;
    await copyToClipboard(`${window.location.origin}/${thread}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Box as="footer" mt="auto" pt={6}>
      <Divider opacity={0.15} mb={3} />
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Text fontSize="xs" opacity={0.55}>
          🎤 OpenMic — decentralized live Q&A · MIT
        </Text>
        <Box display="flex" alignItems="center" fontSize="xs" opacity={0.7}>
          <Box as="span" display="inline-block" w="8px" h="8px" borderRadius="full" mr={2}
            bg={relayOnline ? 'green.400' : 'red.500'} />
          {relayOnline ? 'relay connected — syncing live' : 'relay disconnected — local only'}
        </Box>
        <Menu placement="top-end">
          <MenuButton
            as={IconButton}
            variant="ghost"
            aria-label="more"
            icon={<HamburgerIcon />}
            size="sm"
            opacity={0.7}
            _hover={{ opacity: 1 }}
          />
          <MenuList textAlign="left">
            <MenuItem icon={<CopyIcon />} onClick={copyThreadLink} isDisabled={!thread}>
              {copied ? 'Link copied!' : thread ? 'Copy room link' : 'Copy room link (no room open)'}
            </MenuItem>
            <MenuItem
              as="a"
              href="https://github.com/hectorchanht/openmic"
              target="_blank"
              rel="noopener noreferrer"
              icon={<GithubIcon colorMode={colorMode} boxSize={4} />}
            >
              GitHub repo <ExternalLinkIcon mx="2px" />
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </Box>
  );
};

export default Footer;
