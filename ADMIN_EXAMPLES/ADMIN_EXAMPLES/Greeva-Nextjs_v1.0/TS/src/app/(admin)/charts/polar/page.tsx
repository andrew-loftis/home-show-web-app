import React from 'react'
import AllPolarChart from './components/AllPolarChart'
import PageTitle from '@/components/PageTitle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Polar Area Charts' }

const PolarChart = () => {
  return (
    <>
      <PageTitle title='Polar Area Charts' subTitle="Apex" />
      <AllPolarChart />
    </>
  )
}

export default PolarChart