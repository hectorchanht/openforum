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
      <radialGradient id="om-glow" cx="50%" cy="42%" r="55%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.55" />
        <stop offset="55%" stopColor="#c084fc" stopOpacity="0.28" />
        <stop offset="100%" stopColor="#e879f9" stopOpacity="0" />
      </radialGradient>
      <clipPath id="om-head">
        <rect x="24" y="10" width="16" height="30" rx="8" />
      </clipPath>
    </defs>
    <rect x="2" y="2" width="60" height="60" rx="16" fill="#0b0b14" />
    <circle cx="32" cy="28" r="24" fill="url(#om-glow)" />
    <rect x="24" y="10" width="16" height="30" rx="8" fill="#f5eeda" />
    <g clipPath="url(#om-head)" stroke="#0b0b14" strokeWidth="2.1" strokeLinecap="round">
      <line x1="25.5" y1="16.5" x2="38.5" y2="16.5" />
      <line x1="25.5" y1="21.5" x2="38.5" y2="21.5" />
      <line x1="25.5" y1="26.5" x2="38.5" y2="26.5" />
    </g>
    <path
      d="M17.5 29 v7 a14.5 14.5 0 0 0 29 0 v-7"
      fill="none"
      stroke="#f5eeda"
      strokeWidth="3.6"
      strokeLinecap="round"
    />
    <rect x="30.4" y="49" width="3.2" height="6.5" rx="1.6" fill="#f5eeda" />
    <rect x="24.5" y="55.5" width="15" height="2.8" rx="1.4" fill="#f5eeda" />
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
