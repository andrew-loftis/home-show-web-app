'use client';

import { useEffect, useRef } from 'react';
import IMask from 'imask';
const MaskedInput = ({
  mask,
  placeholder,
  className
}) => {
  const element = useRef(null);
  const maskRef = useRef(null);
  useEffect(() => {
    if (element.current) {
      maskRef.current = IMask(element.current, {
        mask
      });
      return () => {
        maskRef.current?.destroy();
      };
    }
  }, [mask]);
  return <input ref={element} placeholder={placeholder} className={className} />;
};
export default MaskedInput;