import { CheckIcon } from '@chakra-ui/icons';
import { HStack, IconButton, Textarea } from '@chakra-ui/react';
import { useAtom } from "jotai";
import React from 'react';
import gun from '../libs/gun';
import { useThreadMeta } from '../libs/hooks';
import { aliasAtom, threadIdAtom } from "../libs/jotaiAtoms";

// Keys must be unique per post: unix-seconds collide when two posts land
// in the same second, silently overwriting each other.
const postKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const AddPost = () => {
  const [value, setValue] = React.useState('');
  const [thread] = useAtom(threadIdAtom);
  const [alias] = useAtom(aliasAtom);
  const { readOnly, expired, closed } = useThreadMeta(thread);
  const disabledMsg = closed
    ? 'thread closed by host — read-only'
    : expired
      ? 'thread expired — read-only'
      : null;

  const path = React.useMemo(
    () => thread
      ? `t/${thread}`
      : alias
        ? `u/${alias}`
        : 'd/public'
    , [thread, alias]
  )
  const handleInputChange = (e) => setValue(e?.target?.value);

  const submitValue = () => {
    if (!value) return;

    if (alias) {
      gun.user().get(path).put({ [postKey()]: value });
    } else {
      gun.get(path).put({ [postKey()]: value });
    }

    setValue('');
  }

  return (
    <HStack>
      <Textarea
        value={value}
        onChange={handleInputChange}
        isDisabled={readOnly}
        placeholder={disabledMsg || (thread ? 'Ask a question…' : 'leave secrets here for people to find ~')}
      />
      <IconButton
        color={!value ? 'white' : 'cyan.400'}
        isDisabled={!value || readOnly}
        variant={"ghost"}
        onClick={submitValue}
        icon={<CheckIcon />}
      />
    </HStack>
  );
}

export default AddPost;