'use client'
import DashboardPage from '@/app/(admin)/dashboard/page'
import VerticalLayout from '@/components/layout/VerticalLayout'
import { useLayoutContext } from '@/context/useLayoutContext'
import { useEffect } from 'react'

const Detached = () => {
  const { changeLayoutMode } = useLayoutContext()
  useEffect(() => {
    changeLayoutMode('detached')
  }, [])
  return (<>
    <VerticalLayout>
      <DashboardPage />
    </VerticalLayout>
  </>)
}

export default Detached