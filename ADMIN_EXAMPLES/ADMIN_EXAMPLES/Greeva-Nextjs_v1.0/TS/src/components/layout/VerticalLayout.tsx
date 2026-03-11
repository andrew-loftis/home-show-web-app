import React, { Suspense } from 'react'
import FallbackLoading from '../FallbackLoading'
import VerticalNavigationBar from './VerticalNavigationBar/page'
import Footer from './Footer'
import TopNavigationBarPage from '../../components/layout/TopNavigationBar/page'
import { ChildrenType } from '@/types/component-props'

const VerticalLayout = ({ children }: ChildrenType) => {
  return (
    <div className="wrapper">
    <Suspense>
      <TopNavigationBarPage />
    </Suspense>

    <Suspense fallback={<FallbackLoading />}>
      <VerticalNavigationBar />
    </Suspense>

    <div className="page-content">
      <div className="container-fluid">{children}</div>
      <Footer />
    </div>
  </div>
  )
}

export default VerticalLayout