import { CheckIcon, CloseIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import {
  Badge, Box, Button, Drawer, DrawerBody, DrawerCloseButton, DrawerContent,
  DrawerHeader, DrawerOverlay, HStack, IconButton, Input, Text, Textarea,
  useDisclosure, VStack,
} from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import { loadHeap, makeHeapItem, saveHeap } from "../libs/heap";
import { timeAgo } from "../libs/helpers";
import { heapDraftAtom, threadIdAtom } from "../libs/jotaiAtoms";

// 🧠 Thought Heap — private quick-capture scratchpad.
// Born from Hector's philosophy-meetup story: strangers discussing, one
// speaker at a time, thoughts held and risked forgotten. Park a thought here
// in one tap, turn it into a question when it's your turn.
//
// Privacy: localStorage ONLY, never the Gun graph (see src/libs/heap.js).

const HeapItem = ({ item, onPromote, onUpdate, onDelete }) => {
  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(item.text);

  const saveEdit = () => {
    const text = editText.trim();
    if (text && text !== item.text) onUpdate(item.id, text);
    setEditing(false);
  };

  return (
    <Box layerStyle="glass" borderRadius="xl" p={3} w="100%" minW={0}>
      <HStack spacing={2} mb={2} flexWrap="wrap">
        <Badge colorScheme="purple" borderRadius="full" px={2} flexShrink={0}>
          {item.room === 'lobby' ? '🏠 lobby' : `🏠 ${item.room}`}
        </Badge>
        <Text fontSize="xs" opacity={0.55} flexShrink={0}>
          {timeAgo(item.createdAt)}
        </Text>
      </HStack>

      {editing ? (
        <VStack spacing={2} align="stretch" w="100%" minW={0}>
          <Textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            fontSize="md"
            minW={0}
            autoFocus
          />
          <HStack spacing={2} justifyContent="flex-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="purple" leftIcon={<CheckIcon />} onClick={saveEdit}>
              Save
            </Button>
          </HStack>
        </VStack>
      ) : (
        <>
          <Text fontSize="md" mb={3} minW={0} wordBreak="break-word" whiteSpace="pre-wrap">
            {item.text}
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            <Button
              size="sm"
              colorScheme="purple"
              onClick={() => onPromote(item)}
              title="Load into the room composer as a draft (not posted yet)"
              flexShrink={0}
            >
              → Question
            </Button>
            <IconButton
              size="sm"
              variant="ghost"
              aria-label="edit thought"
              title="Edit"
              icon={<EditIcon />}
              onClick={() => { setEditText(item.text); setEditing(true); }}
              flexShrink={0}
            />
            <IconButton
              size="sm"
              variant="ghost"
              colorScheme="red"
              aria-label="delete thought"
              title="Delete"
              icon={<DeleteIcon />}
              onClick={() => {
                if (window.confirm('Delete this thought?')) onDelete(item.id);
              }}
              flexShrink={0}
            />
          </HStack>
        </>
      )}
    </Box>
  );
};

const ThoughtHeapButton = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [thread, setThreadIdAtom] = useAtom(threadIdAtom);
  const [, setHeapDraft] = useAtom(heapDraftAtom);
  const [items, setItems] = React.useState([]);
  const [capture, setCapture] = React.useState('');
  const captureRef = React.useRef(null);

  // Refresh from localStorage every time the drawer opens (heap can change
  // across tabs) and after any mutation.
  const refresh = React.useCallback(() => {
    setItems(loadHeap().slice().sort((a, b) => b.createdAt - a.createdAt));
  }, []);
  React.useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  const persist = (next) => {
    saveHeap(next);
    refresh();
  };

  const park = () => {
    const text = capture.trim();
    if (!text) return;
    persist([makeHeapItem(text, thread), ...loadHeap()]);
    setCapture('');
    // Keep the drawer open + refocus so the next thought is one tap away.
    captureRef.current?.focus();
  };

  const promote = (item) => {
    // Fill the composer as a DRAFT — never auto-post, let him edit first.
    const target = item.room === 'lobby' ? '' : item.room;
    if (target !== thread) setThreadIdAtom(target); // navigate if needed
    setHeapDraft({ text: item.text });
    onClose();
  };

  const update = (id, text) =>
    persist(loadHeap().map((it) => (it.id === id ? { ...it, text } : it)));

  const remove = (id) =>
    persist(loadHeap().filter((it) => it.id !== id));

  const clearAll = () => {
    if (items.length && window.confirm(`Delete all ${items.length} parked thoughts?`)) {
      persist([]);
    }
  };

  return (
    <>
      <Box position="relative" flexShrink={0}>
        <Button
          size="sm"
          variant="ghost"
          minH="44px"
          px={2}
          leftIcon={<Text fontSize="lg" lineHeight={1}>🧠</Text>}
          aria-label="Thought heap — park a thought before you forget it"
          title="🧠 Thought heap — your private scratchpad (stays on this device)"
          onClick={onOpen}
        >
          Heap
        </Button>
        {items.length > 0 && (
          <Badge
            position="absolute"
            top="-4px"
            right="-4px"
            colorScheme="purple"
            borderRadius="full"
            fontSize="10px"
            minW="18px"
            h="18px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
          >
            {items.length > 99 ? '99+' : items.length}
          </Badge>
        )}
      </Box>

      <Drawer isOpen={isOpen} onClose={onClose} placement="bottom" initialFocusRef={captureRef}>
        <DrawerOverlay />
        <DrawerContent
          borderTopRadius="2xl"
          bg="#14141f"
          maxH="85vh"
        >
          <Box maxW="640px" mx="auto" w="100%" display="flex" flexDirection="column" minH={0}>
            <DrawerHeader px={4} pt={4} pb={2} minW={0}>
              <HStack justifyContent="space-between" alignItems="center" w="100%" minW={0}>
                <Text fontWeight="bold" minW={0} isTruncated>
                  🧠 Thought Heap
                  <Text as="span" fontWeight="normal" fontSize="xs" opacity={0.55} ml={2}>
                    private — stays on this device
                  </Text>
                </Text>
                <DrawerCloseButton position="static" flexShrink={0} />
              </HStack>
            </DrawerHeader>
            <DrawerBody px={4} pb={6} overflowY="auto" minW={0}>
              {/* Quick capture — one tap, no room switching, no confirmation */}
              <HStack spacing={2} mb={4} w="100%">
                <Input
                  ref={captureRef}
                  value={capture}
                  onChange={(e) => setCapture(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') park(); }}
                  placeholder={thread ? `Park a thought for “${thread}”…` : 'Park a thought…'}
                  size="md"
                  flex={1}
                  minW={0}
                />
                <Button
                  colorScheme="purple"
                  onClick={park}
                  isDisabled={!capture.trim()}
                  flexShrink={0}
                  minH="44px"
                  aria-label="Park this thought"
                >
                  Park
                </Button>
              </HStack>

              {items.length === 0 ? (
                <Box textAlign="center" py={8} px={2} opacity={0.75}>
                  <Text fontSize="3xl" mb={3}>🧠</Text>
                  <Text fontSize="md" mb={1} fontWeight="semibold">
                    Heard something that sparked a thought?
                  </Text>
                  <Text fontSize="sm" opacity={0.7}>
                    Park it here while someone else has the floor — turn it
                    into a question when it&apos;s your turn.
                  </Text>
                </Box>
              ) : (
                <VStack spacing={3} align="stretch" w="100%" minW={0} mb={4}>
                  {items.map((item) => (
                    <HeapItem
                      key={item.id}
                      item={item}
                      onPromote={promote}
                      onUpdate={update}
                      onDelete={remove}
                    />
                  ))}
                </VStack>
              )}

              {items.length > 0 && (
                <Box textAlign="center">
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    leftIcon={<CloseIcon />}
                    onClick={clearAll}
                  >
                    Clear all ({items.length})
                  </Button>
                </Box>
              )}
            </DrawerBody>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default ThoughtHeapButton;
