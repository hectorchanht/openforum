import React from 'react';

export const useFocus = () => {
  const htmlElRef = React.useRef(null)
  const setFocus = React.useCallback(() => { htmlElRef.current && htmlElRef.current.focus() }, [])

  return [htmlElRef, setFocus]
}
