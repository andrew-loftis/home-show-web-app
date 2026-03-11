import IconifyIcon from '@/components/wrappers/IconifyIcon'
import React from 'react'
import { statData, StatType } from '../data'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

const StatCard = ({change,count,icon,otherIcon,title,variant}:StatType) => {
  return (
    <Card className="overflow-hidden">
      <CardBody>
        <h5 className="text-muted fs-13 text-uppercase" title="Number of Orders">{title}</h5>
        <div className="d-flex align-items-center gap-2 my-2 py-1">
          <div className="user-img fs-42 flex-shrink-0">
            <span className="avatar-title text-bg-primary rounded-circle fs-22">
              <IconifyIcon icon={icon} />
            </span>
          </div>
          <h3 className="mb-0 fw-bold">{count}</h3>
          <IconifyIcon icon={otherIcon} className="ms-auto display-1 position-absolute opacity-25 text-muted widget-icon" />
        </div>
        <p className="mb-0 text-muted">
          <span className={`text-${variant} me-2`}>{change}% {variant=='danger' ? <IconifyIcon icon='tabler:caret-down-filled' /> : <IconifyIcon icon='tabler:caret-up-filled' />} </span>
          <span className="text-nowrap">Since last month</span>
        </p>
      </CardBody>
    </Card>
  )
}

const Stat = () => {
  return (
    <Row className="row-cols-xxl-4 row-cols-md-2 row-cols-1">
      {
        statData.map((item, idx) => (
          <Col key={idx}>
            <StatCard {...item}/>
          </Col>
        ))
      }
    </Row>
  )
}

export default Stat