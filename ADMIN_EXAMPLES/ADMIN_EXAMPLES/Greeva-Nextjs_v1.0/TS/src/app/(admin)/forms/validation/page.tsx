import React from 'react'
import AllValidation from './components/AllValidation'
import PageTitle from '@/components/PageTitle'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Form Validation' }

const ValidationPage = () => {
  return (
    <>
      <PageTitle title='Form Validation' subTitle="Forms" />
      <AllValidation />
    </>
  )
}

export default ValidationPage