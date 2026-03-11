'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useLayoutContext } from '@/context/useLayoutContext'
import React from 'react'

const ThemeModeToggle = () => {
  const { theme, changeTheme } = useLayoutContext()
  const isDark = theme === 'dark'
  return (
    <div className="topbar-item d-none d-sm-flex">
      <button  onClick={() => changeTheme(isDark ? 'light' : 'dark')} className="topbar-link" id="light-dark-mode" type="button">
      {isDark ?
          <IconifyIcon icon='tabler:sun-low' className="fs-22" />
          :
          <IconifyIcon icon='tabler:moon' className="fs-22" />
        }
      </button>
    </div>
  )
}

export default ThemeModeToggle