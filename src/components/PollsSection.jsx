import { CheckIcon, CloseIcon, DeleteIcon, LockIcon } from "@chakra-ui/icons";
import {
  Badge, Box, Button, Collapse, HStack, IconButton, Input, Modal, ModalBody,
  ModalCloseButton, ModalContent, ModalHeader, ModalOverlay, Text, Tooltip,
  useToast, VStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import React from "react";
import { timeAgo, uniqueKey } from "../libs/helpers";
import { track } from "../libs/analytics";
import {
  createPoll, deletePoll, setPollClosed, usePolls, useThreadMeta, votePoll,
} from "../libs/hooks";
import { threadIdAtom } from "../libs/jotaiAtoms";

// Host-only poll creation. 2–6 options, single choice.
// (Client-enforced like all host controls — a modified client could create
// polls directly on the graph.)
export const PollCreateModal = ({ isOpen, onClose, thread }) => {
  const [q, setQ] = React.useState('');
  const [options, setOptions] = React.useState(['', '']);
  const toast = useToast();
  const optRefs = React.useRef([]);

  React.useEffect(() => {
    if (isOpen) {
      setQ('');
      setOptions(['', '']);
      optRefs.current = [];
    }
  }, [isOpen]);

  const setOpt = (i, v) =>
    setOptions((prev) => prev.map((o, j) => (j === i ? v : o)));

  const create = () => {
    const clean = options.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || clean.length < 2) {
      toast({
        title: 'Give the poll a question and at least 2 options',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }
    createPoll(thread, uniqueKey(), { q: q.trim(), options: clean, by: null });
    onClose();
    toast({ title: '📊 Poll is live', status: 'success', duration: 1500, isClosable: true });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader fontSize="md">📊 New poll</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <VStack align="stretch" spacing={3}>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
              placeholder="Poll question — e.g. Which topic next?"
              maxLength={140}
              autoFocus
            />
            {options.map((o, i) => (
              <HStack key={i} spacing={2}>
                <Input
                  value={o}
                  onChange={(e) => setOpt(i, e.target.value)}
                  ref={(el) => (optRefs.current[i] = el)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    if (i === options.length - 1 && options.length < 6) {
                      setOptions((prev) => [...prev, '']);
                      setTimeout(() => optRefs.current[options.length]?.focus(), 0);
                    } else {
                      optRefs.current[i + 1]?.focus();
                    }
                  }}
                  placeholder={`Option ${i + 1}`}
                  maxLength={80}
                  minW={0}
                />
                {options.length > 2 && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={`remove option ${i + 1}`}
                    icon={<CloseIcon />}
                    onClick={() =>
                      setOptions((prev) => prev.filter((_, j) => j !== i))
                    }
                  />
                )}
              </HStack>
            ))}
            {options.length < 6 && (
              <Button
                size="sm"
                variant="ghost"
                alignSelf="flex-start"
                onClick={() => setOptions((prev) => [...prev, ''])}
              >
                + Add option ({options.length}/6)
              </Button>
            )}
            <Text fontSize="xs" opacity={0.6}>
              Single choice — one vote per person, changeable while the poll is open.
            </Text>
            <Button colorScheme="purple" onClick={create}>
              Launch poll 🚀
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

const PollCard = ({ thread, poll, isHost, readOnly }) => {
  const toast = useToast();
  const votedIdx = poll.myVote;

  const doVote = (idx) => {
    if (readOnly || poll.closed) return;
    track('poll_voted', { changed: votedIdx != null });
    votePoll(thread, poll.id, idx);
  };

  const doCloseToggle = () => {
    if (!isHost) return;
    setPollClosed(thread, poll.id, !poll.closed);
    toast({
      title: poll.closed ? '📊 Poll reopened' : '🔒 Poll closed — results frozen',
      status: 'info',
      duration: 1800,
      isClosable: true,
    });
  };

  const doDelete = () => {
    if (!isHost) return;
    if (typeof window !== 'undefined' && !window.confirm('Delete this poll and all its votes?')) return;
    deletePoll(thread, poll.id);
  };

  return (
    <Box layerStyle="glass" p={3} borderColor={poll.closed ? undefined : 'purple.400'} borderWidth={poll.closed ? '1px' : '2px'}>
      <HStack spacing={2} flexWrap="wrap" fontSize="xs" mb={2}>
        <Badge colorScheme="purple" display="flex" alignItems="center" gap={1}>📊 poll</Badge>
        {poll.closed ? (
          <Badge colorScheme="gray" display="flex" alignItems="center" gap={1}>
            <LockIcon boxSize={2.5} /> closed
          </Badge>
        ) : (
          <Badge colorScheme="green">live</Badge>
        )}
        <Text opacity={0.6}>{timeAgo(poll.createdAt)}</Text>
        <Text opacity={0.6}>· {poll.total} vote{poll.total !== 1 ? 's' : ''}</Text>
        {isHost && (
          <HStack spacing={1} ml="auto">
            <Tooltip label={poll.closed ? 'Reopen poll' : 'Close poll — freeze results'}>
              <Button size="sm" minH="36px" variant="ghost" onClick={doCloseToggle}>
                {poll.closed ? 'Reopen' : 'Close'}
              </Button>
            </Tooltip>
            <Tooltip label="Delete poll">
              <IconButton
                size="sm"
                variant="ghost"
                aria-label="delete poll"
                icon={<DeleteIcon />}
                color="red.400"
                onClick={doDelete}
              />
            </Tooltip>
          </HStack>
        )}
      </HStack>

      <Text fontWeight="bold" fontSize="md" mb={2} wordBreak="break-word">
        {poll.q}
      </Text>

      <VStack align="stretch" spacing={1.5}>
        {poll.options.map((opt, i) => {
          const c = poll.counts[i] || 0;
          const pct = poll.total > 0 ? Math.round((c / poll.total) * 100) : 0;
          const mine = votedIdx === i;
          const canVote = !readOnly && !poll.closed;
          return (
            <Box
              key={i}
              as={canVote ? 'button' : 'div'}
              onClick={canVote ? () => doVote(i) : undefined}
              position="relative"
              overflow="hidden"
              borderRadius="lg"
              borderWidth={mine ? '2px' : '1px'}
              borderColor={mine ? 'purple.400' : 'whiteAlpha.200'}
              textAlign="left"
              w="100%"
              cursor={canVote ? 'pointer' : 'default'}
              minW={0}
            >
              {/* animated result bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 160, damping: 26 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, rgba(139,92,246,0.35), rgba(232,121,249,0.35))',
                }}
              />
              <HStack
                position="relative"
                px={3}
                py={2}
                spacing={2}
                minW={0}
              >
                {mine && <CheckIcon boxSize={3} color="purple.300" flexShrink={0} />}
                <Text fontSize="sm" flex={1} minW={0} wordBreak="break-word" fontWeight={mine ? 'bold' : 'normal'}>
                  {opt}
                </Text>
                <Text fontSize="sm" fontWeight="bold" flexShrink={0}>
                  {pct}%
                </Text>
                <Text fontSize="xs" opacity={0.65} flexShrink={0} minW="36px" textAlign="right">
                  {c}
                </Text>
              </HStack>
            </Box>
          );
        })}
      </VStack>

      {votedIdx != null && !poll.closed && !readOnly && (
        <Text fontSize="xs" opacity={0.6} mt={2}>
          ✓ You voted “{(poll.options[votedIdx] || '').slice(0, 40)}” — tap another option to change it.
        </Text>
      )}
      {readOnly && (
        <Text fontSize="xs" opacity={0.6} mt={2}>
          Queue is read-only — voting disabled.
        </Text>
      )}
    </Box>
  );
};

// Polls render above the question list — obvious on mobile, always visible.
const PollsSection = () => {
  const [thread] = useAtom(threadIdAtom);
  const { meta, isHost, readOnly } = useThreadMeta(thread);
  const polls = usePolls(thread);
  const [open, setOpen] = React.useState(true);

  if (!thread || !meta || polls.length === 0) return null;

  return (
    <Box mb={4}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        mb={2}
        fontWeight="bold"
      >
        📊 Polls ({polls.length}) {open ? '▾' : '▸'}
      </Button>
      <Collapse in={open} animateOpacity>
        <VStack align="stretch" spacing={3}>
          {polls.map((p) => (
            <PollCard
              key={p.id}
              thread={thread}
              poll={p}
              isHost={isHost}
              readOnly={readOnly}
            />
          ))}
        </VStack>
      </Collapse>
    </Box>
  );
};

export default PollsSection;
