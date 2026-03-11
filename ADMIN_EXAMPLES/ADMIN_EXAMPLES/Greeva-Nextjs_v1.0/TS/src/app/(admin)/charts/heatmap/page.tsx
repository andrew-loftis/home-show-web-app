import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllHeatmapChart from './components/AllHeatmapChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Heatmap Charts' }

const HeatmapChart = () => {
  return (
    <>
      <PageTitle title='Heatmap Charts' subTitle="Apex" />
      <AllHeatmapChart />
    </>
  )
}

export default HeatmapChart