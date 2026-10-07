import { HStack, Image, Text } from "@chakra-ui/react";
import React from "react";

// Logo mark — the favicon Q artwork, used everywhere: header, footer,
// hero. One source of truth, so the mark can never drift from the icon
// again. Serves a size-appropriate file: no reason to ship the 74KB
// 512px PNG to render a 26px header mark.
const srcForSize = (size) =>
  size <= 40 ? "/logo-64.png" : size <= 96 ? "/logo-128.png" : "/logo.png";

export const LogoMark = ({ size = 32, ...rest }) => (
  <Image
    src={srcForSize(size)}
    alt="OpenQ logo"
    /* string px: a bare number would hit the Chakra spacing scale
       (boxSize={64} → 16rem = 256px — the giant-icon bug) */
    boxSize={`${size}px`}
    borderRadius="22%"
    display="block"
    flexShrink={0}
    draggable={false}
    {...rest}
  />
);

// Horizontal lockup: mark + "OpenQ" wordmark ("Q" in the brand gradient,
// echoing the Q mark — the logo holds both the O and the Q).
// wordmarkFontSize accepts a CSS clamp() so the hero wordmark can scale with
// the viewport and never clip on narrow phones.
const Logo = ({ size = 32, wordmark = false, wordmarkFontSize, onClick, ...rest }) => (
  <HStack
    spacing={2.5}
    onClick={onClick}
    cursor={onClick ? "pointer" : undefined}
    title={onClick ? "OpenQ home" : undefined}
    userSelect="none"
    maxW="100%"
    {...rest}
  >
    <LogoMark size={size} />
    {wordmark && (
      <Text
        fontSize={wordmarkFontSize || size * 0.58}
        fontWeight="extrabold"
        letterSpacing="-0.02em"
        lineHeight="1"
        whiteSpace="nowrap"
      >
        Open
        <Text
          as="span"
          bgGradient="linear(to-r, #a78bfa, #e879f9)"
          bgClip="text"
        >
          Q
        </Text>
      </Text>
    )}
  </HStack>
);

export default Logo;
