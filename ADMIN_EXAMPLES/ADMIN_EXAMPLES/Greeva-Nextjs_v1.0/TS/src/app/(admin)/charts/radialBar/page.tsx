import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllRadialBarChart from './components/AllRadialBarChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex RadialBar Charts' }

const RadialBar = () => {
  return (
    <>
      <PageTitle title='RadialBar Charts' subTitle="Apex" />
      <AllRadialBarChart />
    </>
  )
}

export default RadialBar