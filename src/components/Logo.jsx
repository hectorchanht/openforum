import { HStack, Text } from "@chakra-ui/react";
import React from "react";

// Inline SVG logo mark — the "Q": a gradient ring (the O in OpenForum) with
// a speech-bubble tail, so it reads as Q, ?, and a chat bubble at once.
// Same artwork as public/logo.svg, rendered inline so it stays sharp at any
// size and needs no extra request.
export const LogoMark = ({ size = 32, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    role="img"
    aria-label="OpenForum logo"
    style={{ display: "block", flexShrink: 0 }}
    {...rest}
  >
    <defs>
      <radialGradient id="ofq-glow" cx="50%" cy="42%" r="55%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
        <stop offset="55%" stopColor="#c084fc" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#e879f9" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="ofq-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#e879f9" />
      </linearGradient>
    </defs>
    <circle cx="30" cy="28" r="24" fill="url(#ofq-glow)" />
    {/* Q ring */}
    <circle
      cx="28"
      cy="27"
      r="16"
      fill="none"
      stroke="url(#ofq-grad)"
      strokeWidth="10"
    />
    {/* speech-bubble tail — turns the O into a Q */}
    <path
      d="M39 38 L51 51"
      stroke="url(#ofq-grad)"
      strokeWidth="10"
      strokeLinecap="round"
    />
  </svg>
);

// Horizontal lockup: mark + "OpenForum" wordmark ("Forum" in the brand gradient).
// wordmarkFontSize accepts a CSS clamp() so the hero wordmark can scale with
// the viewport and never clip on narrow phones.
const Logo = ({ size = 32, wordmark = false, wordmarkFontSize, onClick, ...rest }) => (
  <HStack
    spacing={2.5}
    onClick={onClick}
    cursor={onClick ? "pointer" : undefined}
    title={onClick ? "OpenForum home" : undefined}
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
          Forum
        </Text>
      </Text>
    )}
  </HStack>
);

export default Logo;
