import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllTimeLineChart from './components/AllTimeLineChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Timeline Chart' }

const TimelineChart = () => {
  return (
    <>
      <PageTitle title='Timeline Charts' subTitle="Apex" />
      <AllTimeLineChart />
    </>
  )
}

export default TimelineChart