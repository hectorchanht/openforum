import { Box, Button, Text } from "@chakra-ui/react";
import React from "react";
import {
  SPONSORED_HIDE_EVENT,
  isSponsoredHidden,
  tipJar,
  visibleReferralLinks,
} from "../../libs/sponsored";

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
// - The old honor-system × is gone. The strip renders nothing ONLY while
//   localStorage dawn_sponsored_hidden === "1" (the explicit toggle in
//   Settings); being a supporter (dawn_supporter) does NOT hide the strip.
//   It stays in sync same-tab via SPONSORED_HIDE_EVENT and cross-tab via
//   the native "storage" event.
// Hydration-safe: localStorage is read inside useEffect; the strip renders
// identically on server and first client render, then hides on mount if
// the flag is set.
const SponsoredStrip = () => {
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setHidden(isSponsoredHidden());
    sync();
    window.addEventListener(SPONSORED_HIDE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SPONSORED_HIDE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const jar = tipJar();
  const referrals = visibleReferralLinks();
  if (hidden || (!jar.url && referrals.length === 0)) return null;

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
    </Box>
  );
};

export default SponsoredStrip;
