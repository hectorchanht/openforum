import { HStack, Text } from "@chakra-ui/react";
import React from "react";

// Inline SVG logo mark — same artwork as public/logo.svg, rendered inline so
// it stays sharp at any size and needs no extra request.
export const LogoMark = ({ size = 32, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    role="img"
    aria-label="OpenMic logo"
    style={{ display: "block", flexShrink: 0 }}
    {...rest}
  >
    <defs>
      <radialGradient id="oma-glow" cx="50%" cy="42%" r="55%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.45" />
        <stop offset="55%" stopColor="#c084fc" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#e879f9" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="oma-bubble" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#e879f9" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="16" fill="#0b0b14" />
    <circle cx="32" cy="30" r="24" fill="url(#oma-glow)" />
    {/* back bubble: violet gradient, tail bottom-left */}
    <path d="M13 33 l-5.5 9.5 l10.5 -5.5 z" fill="#a78bfa" />
    <rect x="10" y="11" width="33" height="23" rx="9" fill="url(#oma-bubble)" />
    {/* front bubble: cream, tail bottom-right */}
    <path d="M51 47 l5.5 9.5 l-10.5 -5.5 z" fill="#f5eeda" />
    <rect x="20" y="27" width="35" height="23" rx="9" fill="#f5eeda" />
    {/* text lines inside the front bubble */}
    <rect x="25.5" y="33" width="24" height="3.4" rx="1.7" fill="#0b0b14" opacity="0.85" />
    <rect x="25.5" y="39.5" width="16.5" height="3.4" rx="1.7" fill="#0b0b14" opacity="0.55" />
  </svg>
);

// Horizontal lockup: mark + "OpenMic" wordmark ("Mic" in the brand gradient).
const Logo = ({ size = 32, wordmark = false, onClick, ...rest }) => (
  <HStack
    spacing={2.5}
    onClick={onClick}
    cursor={onClick ? "pointer" : undefined}
    title={onClick ? "OpenMic home" : undefined}
    userSelect="none"
    {...rest}
  >
    <LogoMark size={size} />
    {wordmark && (
      <Text
        fontSize={size * 0.58}
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
          Mic
        </Text>
      </Text>
    )}
  </HStack>
);

export default Logo;
