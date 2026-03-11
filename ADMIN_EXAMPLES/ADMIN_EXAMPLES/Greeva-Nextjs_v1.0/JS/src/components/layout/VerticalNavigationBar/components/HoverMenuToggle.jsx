"use client";

import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
const HoverMenuToggle = () => {
  const {
    menu: {
      size
    },
    changeMenu: {
      size: changeMenuSize
    }
  } = useLayoutContext();
  const handleHoverMenu = () => {
    if (size === 'sm-hover-active') changeMenuSize('sm-hover');else changeMenuSize('sm-hover-active');
  };
  return <>
      <button onClick={handleHoverMenu} className="button-sm-hover">
        {/* <span> */}
        {size == 'sm-hover' ? <IconifyIcon width={20} height={20} icon='tabler:circle' className="align-middle sm-hover" /> : size == 'sm-hover-active' && <IconifyIcon width={20} height={20} icon='tabler:circle-dot' className="align-middle sm-hover-active" />}
        {/* </span> */}
      </button>
    </>;
};
export default HoverMenuToggle;