import LogoBox from '@/components/LogoBox'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Apps from './components/Apps'
import Flags from './components/Country'
import Notifications from './components/Notifications'
import ThemeCustomizeToggle from '@/components/ThemeCustomizeToggle'
import ThemeModeToggle from './components/ThemeModeToggle'
import ProfileDropdown from './components/ProfileDropdown'
import { Suspense } from 'react'
import LeftSideBarToggle from './components/LeftSideBarToggle'
import PagesDropdown from './components/PagesDropdown'
import HorizontalToggle from './components/HorizontalToggle'

const TopNavigationBar = () => {
  return (
    <header className="app-topbar">
      <div className="page-container topbar-menu">
        <div className="d-flex align-items-center gap-2">
          <LogoBox />
          <LeftSideBarToggle />
          {/* <button className="topnav-toggle-button px-2" data-bs-toggle="collapse" data-bs-target="#topnav-menu-content">
            <IconifyIcon icon='tabler:menu-deep' className="fs-22" />
          </button> */}
          <HorizontalToggle />
          <div className="topbar-search text-muted d-none d-xl-flex gap-2 align-items-center" data-bs-toggle="modal" data-bs-target="#searchModal">
            <IconifyIcon icon='tabler:search' className="fs-18" />
            <span className="me-2">Search something..</span>
            <span className="ms-auto fw-medium">⌘K</span>
          </div>
          <PagesDropdown />
        </div>
        <div className="d-flex align-items-center gap-2">
          <div className="topbar-item d-flex d-xl-none">
            <button className="topbar-link" data-bs-toggle="modal" data-bs-target="#searchModal" type="button">
              <IconifyIcon icon='tabler:search' className="fs-22" />
            </button>
          </div>
          <Flags />
          <Notifications />
          <Apps />
            <ThemeCustomizeToggle />
          <ThemeModeToggle />
          <ProfileDropdown />
        </div>
      </div>
    </header>
  )
}

export default TopNavigationBar