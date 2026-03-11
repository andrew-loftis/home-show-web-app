// 'use client'
// import { ChildrenType } from '@/types/component-props'
// import type SimpleBarCore from 'simplebar-core'
// import SimpleBar, { type Props } from 'simplebar-react'

// type SimplebarReactClientProps = React.ForwardRefExoticComponent<Props & React.RefAttributes<SimpleBarCore | null>>['defaultProps'] & ChildrenType

// const SimplebarReactClient = ({ children, ...options }: SimplebarReactClientProps) => {
//   return <SimpleBar {...options}>{children}</SimpleBar>
// }

// export default SimplebarReactClient

'use client';

import React from 'react';
import SimpleBar from 'simplebar-react';
const SimplebarReactClient = React.forwardRef(({
  children,
  ...options
}, ref) => {
  return <SimpleBar {...options} ref={ref}>
        {children}
      </SimpleBar>;
});
SimplebarReactClient.displayName = 'SimplebarReactClient';
export default SimplebarReactClient;