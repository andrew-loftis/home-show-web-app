import PageTitle from '@/components/PageTitle'
import EmailArea from './components/EmailArea'
import { Card } from 'react-bootstrap'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Inbox' }

const EmailPage = () => {
  return (
    <>
      <PageTitle title='Inbox' />
      <Card>
        <div className="d-flex">
          <EmailArea />
        </div>
      </Card>
    </>
  )
}

export default EmailPage