import { Alert } from "@chakra-ui/react";
import React from "react";

const AlertMsg = ({ msg, setMsg }) => {
  React.useEffect(() => {
    if (!msg || !msg.length) return;
    const timer = setTimeout(() => setMsg(''), 3000);
    return () => clearTimeout(timer);
  }, [msg, setMsg]);

  if (!msg) return null;

  return <Alert alignItems='center' justifyContent='center' bg={'#AB47BC'}
    borderRadius={8} position={'fixed'} bottom={'24px'} left={'0'}
    textAlign='center' status="error">
    {msg}
  </Alert>;
};

export default AlertMsg;