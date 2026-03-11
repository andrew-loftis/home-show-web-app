"use client";

import { useEffect, useRef } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
import { usePathname } from 'next/navigation';
import useViewPort from '@/hooks/useViewPort';
const LeftSideBarToggle = () => {
  const {
    menu: {
      size
    },
    changeMenu: {
      size: changeMenuSize
    },
    toggleBackdrop
  } = useLayoutContext();
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const {
    width
  } = useViewPort();
  const handleMenuSize = () => {
    if (size === 'full') toggleBackdrop();
    if (size === 'condensed') changeMenuSize('default');
    if (size === 'fullscreen') changeMenuSize('default');
    if (size === 'compact') changeMenuSize('condensed');else if (size === 'default') changeMenuSize('condensed');
  };
  useEffect(() => {
    // if (isFirstRender.current) {
    //   isFirstRender.current = false
    // }
    // else if (size === 'full') {
    //   toggleBackdrop()
    // }

    if (width <= 768) {
      if (size !== 'full') changeMenuSize('full');
    } else if (width <= 1140) {
      if (size !== 'condensed') changeMenuSize('condensed');
    } else {
      if (size !== 'default') changeMenuSize('default');
    }
  }, [width, pathname]);
  return <button onClick={handleMenuSize} className="sidenav-toggle-button px-2">
      <IconifyIcon icon='tabler:menu-deep' className="fs-24" />
    </button>;
};
export default LeftSideBarToggle;