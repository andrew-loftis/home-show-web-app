import PageTitle from '@/components/PageTitle'
import React from 'react'
import InvoicesCard from './components/InvoicesCard'
import { Col, Row } from 'react-bootstrap'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoices' }

const InvoicesPage = () => {
  return (
    <>
      <PageTitle title='Invoices' subTitle='Invoices' />
      <Row>
        <Col xs={12}>
          <InvoicesCard />
        </Col>
      </Row>
    </>
  )
}

export default InvoicesPage