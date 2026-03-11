import PageTitle from '@/components/PageTitle'
import AllEditors from './components/AllEditors'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Editors' }

const EditorsPage = () => {
  return (
    <>
      <PageTitle title='Editors' subTitle="Forms" />
      <AllEditors />
    </>
  )
}

export default EditorsPage