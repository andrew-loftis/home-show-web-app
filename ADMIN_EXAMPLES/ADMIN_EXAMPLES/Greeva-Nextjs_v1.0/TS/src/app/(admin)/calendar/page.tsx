import PageTitle from '@/components/PageTitle'
import React from 'react'
import { Row } from 'react-bootstrap'
import CalendarPage from './components/CalendarPage'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Calender' }

const CalendarPageMain = () => {
  return (
    <>
      <PageTitle title='Calendar' />
      <Row>
        <CalendarPage />
      </Row>
    </>

  )
}

export default CalendarPageMain