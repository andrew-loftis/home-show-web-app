import React from 'react'
import AllTreemap from './components/AllTreemap'
import PageTitle from '@/components/PageTitle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Treemap Charts' }

const page = () => {
  return (
    <>
      <PageTitle title='Treemap Charts' subTitle="Apex" />
      <AllTreemap />
    </>
  )
}

export default page