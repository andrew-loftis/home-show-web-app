import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllBoxplotChart from './components/AllBoxplotChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Boxplot Charts' }

const BoxplotChart = () => {
  return (
    <>
      <PageTitle title='Boxplot Charts' subTitle="Apex" />
      <AllBoxplotChart />
    </>
  )
}

export default BoxplotChart