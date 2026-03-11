import PageTitle from '@/components/PageTitle';
import FileManager from './components/FileManager';
export const metadata = {
  title: 'File Manager'
};
const FileManagerPage = () => {
  return <>
      <PageTitle title='File Manager' subTitle='Apps' />
      <FileManager />
    </>;
};
export default FileManagerPage;