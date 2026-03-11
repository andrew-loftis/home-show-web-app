import React from 'react'
import AllScatterChart from './components/AllScatterChart'
import PageTitle from '@/components/PageTitle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Scatter Charts' }

const ScatterChart = () => {
  return (
    <>
      <PageTitle title='Scatter Charts' subTitle="Apex" />
      <AllScatterChart />
    </>
  )
}

export default ScatterChart