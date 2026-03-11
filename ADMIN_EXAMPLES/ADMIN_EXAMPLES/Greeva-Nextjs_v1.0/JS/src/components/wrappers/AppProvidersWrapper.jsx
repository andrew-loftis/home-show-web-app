'use client';

import { ToastContainer } from 'react-toastify';
import dynamic from 'next/dynamic';
import { EmailProvider } from '@/context/useEmailContext';
const LayoutProvider = dynamic(() => import('@/context/useLayoutContext').then(mod => mod.LayoutProvider), {
  ssr: false
});
const AppProvidersWrapper = ({
  children
}) => {
  return <>
      <LayoutProvider>
        <EmailProvider>
          {children}
          <ToastContainer theme="colored" />
        </EmailProvider>
      </LayoutProvider>
    </>;
};
export default AppProvidersWrapper;