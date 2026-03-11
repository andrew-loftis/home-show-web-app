import PageTitle from '@/components/PageTitle';
import React from 'react';
import AllRating from './components/AllRating';
export const metadata = {
  title: 'Ratings'
};
const Ratings = () => {
  return <>
      <PageTitle title='Ratings' subTitle="Extended UI" />
      <AllRating />
    </>;
};
export default Ratings;