"use client"
import Footer from '@/components/layout/Footer'
import HorizontalNavBar from '@/components/layout/HorizontalNav/page'
import { useLayoutContext } from '@/context/useLayoutContext'
import { Suspense } from 'react'
import TopNavigationBarPage from '../../components/layout/TopNavigationBar/page'
import VerticalNavigationBar from '../../components/layout/VerticalNavigationBar/page'
import { ChildrenType } from '../../types/component-props'
import { getHorizontalMenuItems } from '@/helpers/Manu'
import FallbackLoading from '@/components/FallbackLoading'
import VerticalLayout from '@/components/layout/VerticalLayout'
import HorizontalLayout from '@/components/layout/HorizontalLayout'

const AdminLayout = ({ children }: ChildrenType) => {
  const { layoutOrientation } = useLayoutContext()

  return (
    <>
      {layoutOrientation === 'vertical' ?
        <VerticalLayout>
          {children}
        </VerticalLayout>
        :
        <>
          <HorizontalLayout>
            {children}
          </HorizontalLayout>
        </>
      }
    </>
  )
}

export default AdminLayout