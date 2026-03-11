import React from 'react';
import AllTreemap from './components/AllTreemap';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Apex Treemap Charts'
};
const page = () => {
  return <>
      <PageTitle title='Treemap Charts' subTitle="Apex" />
      <AllTreemap />
    </>;
};
export default page;