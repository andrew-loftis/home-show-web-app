import PageTitle from '@/components/PageTitle'
import React from 'react'
import AllRating from './components/AllRating'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ratings' }

const Ratings = () => {
  return (
    <>
      <PageTitle title='Ratings' subTitle="Extended UI" />
      <AllRating />
    </>
  )
}

export default Ratings