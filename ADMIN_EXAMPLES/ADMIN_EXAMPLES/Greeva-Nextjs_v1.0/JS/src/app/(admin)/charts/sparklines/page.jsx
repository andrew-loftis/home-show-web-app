import React from 'react';
import SparkChart from './components/SparkChart';
import PageTitle from '@/components/PageTitle';
export const metadata = {
  title: 'Apex Sparklines Charts'
};
const SparkLinesChart = () => {
  return <>
      <PageTitle title='Sparklines Charts' subTitle="Apex" />
      <SparkChart /> 
    </>;
};
export default SparkLinesChart;