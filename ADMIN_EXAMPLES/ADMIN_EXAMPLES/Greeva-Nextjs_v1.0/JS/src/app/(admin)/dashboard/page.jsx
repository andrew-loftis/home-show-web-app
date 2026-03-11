import PageTitle from '@/components/PageTitle';
import { Col, Row } from 'react-bootstrap';
import BrandsListing from './components/BrandsListing';
import DailySales from './components/DailySales';
import DataUsesChart from './components/DataUsesChart';
import NewSignup from './components/NewSignup';
import Stat from './components/Stat';
import Statistics from './components/Statistics';
import TotalRevenue from './components/TotalRevenue';
import VisitorTraffics from './components/VisitorTraffics';
// export const metadata: Metadata = { title: 'Dashboard' }

const DashboardPage = () => {
  return <>
      <PageTitle title='Dashboard' />
      <Stat />
      <Row>
        <Col xl={4}>
          <DailySales />
        </Col>
        <Col xl={4}>
          <Statistics />
        </Col>
        <Col xl={4}>
          <TotalRevenue />
        </Col>
      </Row>
      <Row>
        <Col xxl={6}>
          <BrandsListing />
        </Col>
        <Col xxl={6}>
          <NewSignup />
        </Col>
      </Row>
      <Row>
        <VisitorTraffics />
        <DataUsesChart />
      </Row>
    </>;
};
export default DashboardPage;