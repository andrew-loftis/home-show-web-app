import PageTitle from '@/components/PageTitle'
import AllAreaChart from './components/AllAreaChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Area Chart' }

const Area = () => {
  return (
    <>
      <PageTitle title='Area Charts' subTitle="Apex" />
      <AllAreaChart />
    </>
  )
}

export default Area