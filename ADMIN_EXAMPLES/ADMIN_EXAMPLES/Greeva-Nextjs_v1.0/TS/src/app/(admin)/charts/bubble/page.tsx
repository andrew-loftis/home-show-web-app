import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllBubbleChart from './components/AllBubbleChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Bubble Charts' }

const BubbleChart = () => {
  return (
    <>
      <PageTitle title='Bubble Charts' subTitle="Apex" />
      <AllBubbleChart />
    </>
  )
}

export default BubbleChart