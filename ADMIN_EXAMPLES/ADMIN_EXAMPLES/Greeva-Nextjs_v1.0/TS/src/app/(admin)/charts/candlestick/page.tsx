import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllCandlestick from './components/AllCandlestick'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Candlestick Charts' }

const Candlestick = () => {
  return (
    <>
      <PageTitle title='Candlestick Charts' subTitle="Apex" />
      <AllCandlestick />
    </>
  )
}

export default Candlestick