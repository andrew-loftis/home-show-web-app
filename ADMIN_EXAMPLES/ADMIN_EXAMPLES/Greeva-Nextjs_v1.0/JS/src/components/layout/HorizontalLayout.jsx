import React, { Suspense, useEffect } from 'react';
import HorizontalNavBar from './HorizontalNav/page';
import FallbackLoading from '../FallbackLoading';
import Footer from './Footer';
import TopNavigationBarPage from '../../components/layout/TopNavigationBar/page';
import { getHorizontalMenuItems } from '@/helpers/Manu';
import { toggleDocumentAttribute } from '@/utils/layout';
import { useLayoutContext } from '@/context/useLayoutContext';
const HorizontalLayout = ({
  children
}) => {
  const menuItems = getHorizontalMenuItems();
  const {
    layoutOrientation
  } = useLayoutContext();
  useEffect(() => {
    toggleDocumentAttribute('data-layout', layoutOrientation === 'vertical' ? '' : 'topnav');
    return () => {
      toggleDocumentAttribute('data-layout', layoutOrientation === 'vertical' ? '' : 'topnav', true);
    };
  });
  return <div className="wrapper">
      <Suspense>
        <TopNavigationBarPage />
      </Suspense>

      <Suspense fallback={<FallbackLoading />}>
        <HorizontalNavBar menuItems={menuItems} />
      </Suspense>

      <div className="page-content">
        <div className="page-container">
          {children}
        </div>
        <Footer />
      </div>
    </div>;
};
export default HorizontalLayout;