import PageTitle from '@/components/PageTitle'
import FileManager from './components/FileManager'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'File Manager' }

const FileManagerPage = () => {
  return (
    <>
      <PageTitle title='File Manager' subTitle='Apps' />
      <FileManager />
    </>
  )
}

export default FileManagerPage