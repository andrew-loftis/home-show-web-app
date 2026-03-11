import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllLineChart from './components/AllLineChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Line Charts' }

const LineChart = () => {
  return (
    <>
      <PageTitle title='Line Charts' subTitle="Apex" />
      <AllLineChart />
    </>
  )
}

export default LineChart