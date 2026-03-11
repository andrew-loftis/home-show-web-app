import PageTitle from '@/components/PageTitle'
import AllSelect from './components/AllSelect'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Form Select' }

const SelectForm = () => {
  return (
    <>
      <PageTitle title='Form Select' subTitle="Forms" />
      <AllSelect />
    </>
  )
}

export default SelectForm