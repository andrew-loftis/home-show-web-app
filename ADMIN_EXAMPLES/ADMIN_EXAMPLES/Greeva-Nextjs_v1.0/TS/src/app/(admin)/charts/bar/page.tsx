import PageTitle from '@/components/PageTitle'
import AllBarChart from './components/AllBarChart'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Apex Bar Charts' }

const BarChart = () => {
  return (
    <>
      <PageTitle title='Bar Charts' subTitle="Apex" />
      <AllBarChart />
    </>
  )
}

export default BarChart