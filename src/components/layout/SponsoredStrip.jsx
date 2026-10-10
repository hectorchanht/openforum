import { CloseIcon } from "@chakra-ui/icons";
import { Box, Button, IconButton, Text } from "@chakra-ui/react";
import React from "react";
import { STORAGE_KEY, tipJar, visibleReferralLinks } from "../../libs/sponsored";

const pillProps = {
  size: "xs",
  fontSize: "11px",
  borderRadius: "full",
  fontWeight: "semibold",
  flexShrink: 0, // never clip a button — scroll the row instead
  whiteSpace: "nowrap",
};

// Slim sponsored strip: first content block under the header.
// - horizontally scrollable on narrow screens (hidden scrollbar)
// - tip jar first (Hector's own product: rel="noopener" only)
// - referral pills after (rel="noopener sponsored")
// - subtle × at the end: honor-system "hide for tippers", persisted in
//   localStorage. No restore UI.
// Hydration-safe: localStorage is read inside useEffect; the strip renders
// identically on server and first client render, then hides on mount if
// the user dismissed it before.
const SponsoredStrip = () => {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setHidden(true);
    } catch {
      // storage unavailable (private mode etc.) — strip just stays visible
    }
  }, []);

  const jar = tipJar();
  const referrals = visibleReferralLinks();
  if (hidden || (!jar.url && referrals.length === 0)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setHidden(true);
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      gap={2}
      py={1.5}
      overflowX="auto"
      css={{
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
      aria-label="Sponsored links"
    >
      <Text
        fontSize="10px"
        textTransform="uppercase"
        letterSpacing="wider"
        opacity={0.45}
        flexShrink={0}
      >
        Sponsored
      </Text>

      {jar.url && (
        <Button
          as="a"
          href={jar.url}
          target="_blank"
          rel="noopener"
          bg={jar.bg}
          color={jar.color}
          _hover={{ bg: jar.bg, opacity: 0.85 }}
          {...pillProps}
        >
          {jar.label}
        </Button>
      )}

      {referrals.map(({ id, label, url, bg, color }) => (
        <Button
          key={id}
          as="a"
          href={url}
          target="_blank"
          rel="noopener sponsored"
          bg={bg}
          color={color}
          _hover={{ opacity: 0.85 }}
          {...pillProps}
        >
          {label}
        </Button>
      ))}

      <IconButton
        aria-label="Hide sponsored strip"
        title="Tipped? Hide the sponsored strip"
        icon={<CloseIcon boxSize={2.5} />}
        size="xs"
        variant="ghost"
        opacity={0.4}
        _hover={{ opacity: 0.9 }}
        onClick={dismiss}
        flexShrink={0}
      />
    </Box>
  );
};

export default SponsoredStrip;
