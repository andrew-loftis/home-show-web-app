import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllRadarChart from './components/AllRadarChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Radar Charts' }

const RadarChart = () => {
  return (
    <>
      <PageTitle title='Radar Charts' subTitle="Apex" />
      <AllRadarChart />
    </>
  )
}

export default RadarChart