import {
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { QRCodeSVG } from "qrcode.react";
import React from "react";

// Scan-to-join: shows a large QR code of the thread URL so an audience can
// join instantly from their phones. Meant to be screen-shared at events.
const ShareQR = ({ thread }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [url, setUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setUrl(`${window.location.origin}/${thread}`);
  }, [thread]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable — the URL is visible to type manually */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!thread) return null;

  return (
    <>
      <Button size="sm" minH="40px" variant="outline" onClick={onOpen} title="Show a QR code so the audience can join from their phones">
        <Box as="span" mr={1}>▦</Box> QR join
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontSize="md">Scan to join “{thread}”</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={3}>
              <Box bg="white" p={4} borderRadius="md">
                {url && <QRCodeSVG value={url} size={240} level="M" />}
              </Box>
              <Text fontSize="sm" opacity={0.75} wordBreak="break-all" textAlign="center">
                {url}
              </Text>
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ShareQR;
