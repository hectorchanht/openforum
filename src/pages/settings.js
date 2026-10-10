import { CopyIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  FormControl,
  Heading,
  HStack,
  IconButton,
  Input,
  Switch,
  Text,
  VStack,
} from "@chakra-ui/react";
import Head from "next/head";
import React from "react";
import Layout from "../components/layout/Layout";
import {
  getStoredTipKey,
  isSponsoredHidden,
  isSupporter,
  setSponsoredHidden,
  setStoredTipKey,
  setSupporter,
} from "../libs/sponsored";

const VERIFY_ENDPOINT = "/api/verify-tip";

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API unavailable (permissions, non-secure context) — fall back
    // to the classic temp-textarea trick
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

const SupporterSection = () => {
  const [verified, setVerified] = React.useState(false);
  const [hideStrip, setHideStrip] = React.useState(false);
  const [key, setKey] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  // Hydration-safe: localStorage is only read on the client. Whenever a
  // stored key exists the input comes pre-filled. Legacy tippers (verified
  // under the old auto-hide model) carry dawn_sponsored_hidden but no
  // dawn_supporter — backfill the supporter flag so they keep their status.
  React.useEffect(() => {
    const legacy = isSponsoredHidden();
    if (legacy && !isSupporter()) setSupporter();
    setVerified(isSupporter() || legacy);
    setHideStrip(legacy);
    setKey(getStoredTipKey());
  }, []);

  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(VERIFY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: key }),
      });
      const data = await res.json();
      if (data && data.ok === true) {
        // Choice model: verifying marks you a supporter — the strip stays
        // visible unless you flip the toggle below. No auto-hide.
        setSupporter();
        setStoredTipKey(key.trim());
        setVerified(true);
      } else {
        setError(
          "That key didn't verify — check the license key in your Gumroad receipt email."
        );
      }
    } catch {
      setError(
        "That key didn't verify — check the license key in your Gumroad receipt email."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleHideStrip = () => {
    const next = !hideStrip;
    setHideStrip(next);
    setSponsoredHidden(next); // fires SPONSORED_HIDE_EVENT — strip updates live
    setError("");
  };

  const copyKey = async () => {
    if (!key) return;
    if (await copyToClipboard(key)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Box layerStyle="glass" borderRadius="2xl" p={{ base: 4, md: 6 }} w="100%">
      <Heading as="h2" size="md" mb={2}>
        Supporter
      </Heading>
      <VStack align="stretch" spacing={3}>
        {verified ? (
          <>
            <Text fontSize="sm" opacity={0.8}>
              ☕ You're a supporter — thanks for tipping!
            </Text>
            <HStack spacing={3} align="center">
              <Switch
                id="hide-sponsored-strip"
                isChecked={hideStrip}
                onChange={toggleHideStrip}
                colorScheme="purple"
              />
              <Text
                as="label"
                htmlFor="hide-sponsored-strip"
                fontSize="sm"
                opacity={0.85}
                cursor="pointer"
              >
                Hide sponsored strip
              </Text>
            </HStack>
            <Text fontSize="xs" opacity={0.6} lineHeight="1.5">
              Supporters can hide the strip anytime.
            </Text>
          </>
        ) : (
          <Text fontSize="sm" opacity={0.8} lineHeight="1.6">
            Tipped us on Gumroad? Enter the license key from your purchase
            receipt email to verify your support.
          </Text>
        )}
        <Text fontSize="xs" opacity={0.6} lineHeight="1.5">
          Your key is saved on this device only — copy it to reuse on your
          other devices or Dawn Studio apps.
        </Text>
        <FormControl>
          <HStack spacing={2} align="stretch">
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="Gumroad license key"
              size="md"
              autoComplete="off"
              spellCheck={false}
            />
            <IconButton
              aria-label="Copy license key"
              title="Copy license key"
              icon={<CopyIcon />}
              onClick={copyKey}
              isDisabled={!key}
              variant="outline"
              flexShrink={0}
            />
          </HStack>
        </FormControl>
        {copied && (
          <Text fontSize="xs" color="green.300">
            Copied
          </Text>
        )}
        {error && (
          <Text fontSize="sm" color="red.300" role="alert">
            {error}
          </Text>
        )}
        <HStack spacing={4} align="center">
          <Button
            colorScheme="purple"
            onClick={verify}
            isLoading={busy}
            isDisabled={!key.trim() || busy}
          >
            {verified ? "Verify again" : "Verify"}
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

const Settings = () => (
  <Layout>
    <Head>
      <title>Settings — OpenQ</title>
      <meta name="description" content="OpenQ settings" />
    </Head>
    <VStack align="stretch" spacing={6} mt={2}>
      <Heading as="h1" size="xl" textStyle="brandGradient">
        Settings
      </Heading>
      <SupporterSection />
    </VStack>
  </Layout>
);

export default Settings;
