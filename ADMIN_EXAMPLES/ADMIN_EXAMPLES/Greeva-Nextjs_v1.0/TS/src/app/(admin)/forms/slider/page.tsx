import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllSlider from './components/AllSlider'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Range Slider' }

const RangeSlider = () => {
  return (
    <>
      <PageTitle title='Range Slider' subTitle="Forms" />
      <AllSlider />
    </>
  )
}

export default RangeSlider