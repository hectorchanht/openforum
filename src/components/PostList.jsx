import { Tag, Wrap, WrapItem } from "@chakra-ui/react";
import { useAtom } from "jotai";
import React from "react";
import gun from "../libs/gun";
import { aliasAtom, threadIdAtom } from "../libs/jotaiAtoms";


const PostList = () => {
  const [allPosts, setAllPosts] = React.useState([]);
  const [thread] = useAtom(threadIdAtom);
  const [alias] = useAtom(aliasAtom);

  const path = React.useMemo(
    () => thread
      ? `t/${thread}`
      : alias
        ? `u/${alias}`
        : 'd/public'
    , [thread, alias]
  );

  React.useEffect(() => {
    setAllPosts([]);  // keep this line to make 'password' functioning
    const node = alias ? gun.user().get(path) : gun.get(path);
    node.on((d) => setAllPosts(parseD(d)));
    return () => node.off();  // unsubscribe when switching threads/aliases
  }, [path, alias]);

  const parseD = (d) => {
    return d && Object.entries(d)
      .map(([k, v]) => {
        if (k === "_") return;
        return {
          datetime: k,
          text: v,
        };
      })
      .filter(Boolean)
      .reverse();
  };

  return (
    <Wrap>
      {allPosts && allPosts.length ? allPosts.map(({ datetime, text }, i) => (
        <WrapItem key={datetime + text}>
          <Tag variant={"outline"}>{text}</Tag>
        </WrapItem>
      )) : null}
    </Wrap>
  );
};

export default PostList;
