import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllMixedChart from './components/AllMixedChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Mixed Charts' }

const MixedChart = () => {
  return (
    <>
      <PageTitle title='Mixed Charts' subTitle="Apex" />
      <AllMixedChart />
    </>
  )
}

export default MixedChart