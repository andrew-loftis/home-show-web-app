import LogoBox from '@/components/LogoBox';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient';
import { useLayoutContext } from '@/context/useLayoutContext';
import { getMenuItems } from '@/helpers/Manu';
import AppMenu from './components/AppMenu';
import HoverMenuToggle from './components/HoverMenuToggle';
const VerticalNavigationBar = () => {
  const menuItems = getMenuItems();
  const {
    toggleBackdrop
  } = useLayoutContext();
  return <div className="sidenav-menu">
      <LogoBox />
      {/* <button className="button-sm-hover">
        <IconifyIcon icon='tabler:circle' className="align-middle" />
       </button> */}
      <HoverMenuToggle />
      <button onClick={toggleBackdrop} className="button-close-fullsidebar">
        <IconifyIcon icon='tabler:x' className="align-middle" />
      </button>
      <SimplebarReactClient data-simplebar>
        <AppMenu menuItems={menuItems} />
        <div className="help-box text-center">
          <h5 className="fw-semibold fs-16">Unlimited Access</h5>
          <p className="mb-3 text-muted">Upgrade to plan to get access to unlimited reports</p>
          <a href="javascript: void(0);" className="btn btn-danger btn-sm">Upgrade</a>
        </div>
        <div className="clearfix" />
      </SimplebarReactClient>
    </div>;
};
export default VerticalNavigationBar;