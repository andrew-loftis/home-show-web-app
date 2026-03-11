import PageTitle from '@/components/PageTitle'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Metadata } from 'next'
import { Card, CardBody, Col, OverlayTrigger, Row, Tooltip } from 'react-bootstrap'
import { solarIconData, SolarIconType } from './data'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Solar Icons' }

const SolarIconsCard = ({ title, icon }: SolarIconType) => {
  return (
    <OverlayTrigger trigger={["hover", "focus"]}  placement="top" overlay={<Tooltip>{title}</Tooltip>}>
      <Card>
        <CardBody className="d-flex flex-column align-items-center justify-content-center" data-bs-toggle="tooltip" data-bs-placement="top" data-bs-title="4k">
          <IconifyIcon icon={icon} className="fs-2" />
        </CardBody>
      </Card>
    </OverlayTrigger>

  )
}

const SolarIcon = () => {
  return (
    <>
      <PageTitle title='Solar Icons' subTitle="Icons" />
      <Row className="d-none">
        <Col xs={12}>
          <Card>
            <CardBody>
              <h4 className="mt-0 mb-2 fw-semibold">Overview</h4>
              <p className="mb-4 text-muted">Our cutting-edge Solar Iconset boasts an extensive collection of over 7,477 glyphs, encompassing a diverse range of design variants, all conveniently packed into a single font file</p>
              <h4 className="mt-0 mb-2 fw-semibold">Usage</h4>
              <div className="d-flex align-items-center gap-2">
                <IconifyIcon icon="solar:4k-bold" className="fs-2" />
                <IconifyIcon icon="solar:4k-bold-duotone" className="fs-2 text-primary" />
                <IconifyIcon icon="solar:4k-broken" className="fs-2 text-danger" />
                <IconifyIcon icon="solar:4k-line-duotone" className="fs-2 text-info" />
                <IconifyIcon icon="solar:4k-linear" className="fs-2 text-warning" />
                <IconifyIcon icon="solar:4k-outline" className="fs-2 text-secondary" />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <div className="d-flex flex-wrap gap-3 justify-content-center icon-box">
        {
          solarIconData.map((item, idx) => (
            <SolarIconsCard key={idx} {...item} />
          ))
        }
      </div>
      <div className="my-3 text-center">
        <Link href="https://icon-sets.iconify.design/solar/" target="_blank" className="btn btn-danger">View All Icons</Link>
      </div>
    </>
  )
}

export default SolarIcon