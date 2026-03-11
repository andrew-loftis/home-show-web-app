import PageTitle from '@/components/PageTitle';
import EmailArea from './components/EmailArea';
import { Card } from 'react-bootstrap';
export const metadata = {
  title: 'Inbox'
};
const EmailPage = () => {
  return <>
      <PageTitle title='Inbox' />
      <Card>
        <div className="d-flex">
          <EmailArea />
        </div>
      </Card>
    </>;
};
export default EmailPage;