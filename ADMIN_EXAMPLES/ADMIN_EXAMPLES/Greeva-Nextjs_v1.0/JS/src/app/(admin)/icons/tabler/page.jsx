import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Button, Card, CardBody, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { tablerIconData } from './data';
export const metadata = {
  title: 'Tabler Icons'
};
const TablerIcon = () => {
  return <>
      <PageTitle title='Tabler Icons' subTitle="Icons" />
      <div className="d-flex flex-wrap gap-3 justify-content-center icon-box mb-3">
        {tablerIconData.map((item, idx) => <OverlayTrigger key={idx} trigger={["hover", "focus"]} placement="top" overlay={<Tooltip>{item}</Tooltip>}>
              <Card data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="ti ti-a-b-2">
                <CardBody>
                  <IconifyIcon icon={item} className="fs-2" />
                </CardBody>
              </Card>
            </OverlayTrigger>)}
      </div>
      <div className="text-center">
        <Button variant='danger' href="https://tabler.io/icons" target="_blank">View All Icons</Button>
      </div>

    </>;
};
export default TablerIcon;