import React from 'react'
import AllPieChart from './components/AllPieChart'
import PageTitle from '@/components/PageTitle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Pie Charts' }

const PieChart = () => {
  return (
    <>
      <PageTitle title='Pie Charts' subTitle="Apex" />
      <AllPieChart />
    </>
  )
}

export default PieChart