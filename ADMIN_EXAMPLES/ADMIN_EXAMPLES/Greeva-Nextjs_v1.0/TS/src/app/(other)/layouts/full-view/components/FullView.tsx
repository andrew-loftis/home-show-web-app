'use client'
import DashboardPage from '@/app/(admin)/dashboard/page'
import VerticalLayout from '@/components/layout/VerticalLayout'
import { useLayoutContext } from '@/context/useLayoutContext'
import dynamic from 'next/dynamic'
import { useEffect } from 'react'


const FullView = () => {
  const { changeMenu } = useLayoutContext()
  useEffect(() => {
    changeMenu.size('full')
  }, [])
  return (
    <>
      <VerticalLayout>
        <DashboardPage />
      </VerticalLayout>
    </>
  )
}

export default FullView
