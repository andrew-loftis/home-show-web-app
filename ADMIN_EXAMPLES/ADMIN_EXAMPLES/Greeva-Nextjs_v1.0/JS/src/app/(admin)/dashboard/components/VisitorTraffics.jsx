import { WorldVectorMap } from '@/components/VectorMap';
import { visitorTrafficsData } from '../data';
import { Fragment } from 'react';
import Image from 'next/image';
import { Card, CardBody, CardHeader, Col, ProgressBar, Row } from 'react-bootstrap';
const VisitorTraffics = () => {
  const worldMapOptions = {
    map: "world_merc",
    zoomOnScroll: false,
    zoomButtons: false,
    markers: [{
      name: "Greenland",
      coords: [72, -42]
    }, {
      name: "Canada",
      coords: [56.1304, -106.3468]
    }, {
      name: "Brazil",
      coords: [-14.2350, -51.9253]
    }, {
      name: "Egypt",
      coords: [26.8206, 30.8025]
    }, {
      name: "Russia",
      coords: [61, 105]
    }, {
      name: "China",
      coords: [35.8617, 104.1954]
    }, {
      name: "United States",
      coords: [37.0902, -95.7129]
    }, {
      name: "Norway",
      coords: [60.472024, 8.468946]
    }, {
      name: "Ukraine",
      coords: [48.379433, 31.16558]
    }],
    lines: [{
      from: "Canada",
      to: "Egypt"
    }, {
      from: "Russia",
      to: "Egypt"
    }, {
      from: "Greenland",
      to: "Egypt"
    }, {
      from: "Brazil",
      to: "Egypt"
    }, {
      from: "United States",
      to: "Egypt"
    }, {
      from: "China",
      to: "Egypt"
    }, {
      from: "Norway",
      to: "Egypt"
    }, {
      from: "Ukraine",
      to: "Egypt"
    }],
    regionStyle: {
      initial: {
        stroke: "#9ca3af",
        strokeWidth: 0.25,
        fill: '#9ca3af69',
        fillOpacity: 1
      }
    },
    markerStyle: {
      initial: {
        fill: "#9ca3af"
      },
      selected: {
        fill: "#9ca3af"
      }
    },
    lineStyle: {
      animation: true,
      strokeDasharray: "6 3 6"
    }
  };
  return <Col xl={8}>
      <Card>
        <CardHeader className="d-flex flex-wrap align-items-center gap-2 border-bottom border-dashed">
          <h4 className="header-title me-auto">Visitor Traffics</h4>
          <div>
            <button type="button" className="btn btn-light btn-sm">
              All
            </button>&nbsp;
            <button type="button" className="btn btn-light active btn-sm">
              1M
            </button>&nbsp;
            <button type="button" className="btn btn-light btn-sm">
              6M
            </button>&nbsp;
            <button type="button" className="btn btn-light btn-sm">
              1Y
            </button>&nbsp;
          </div>
        </CardHeader>
        <CardBody>
          <Row>
            <Col xl={7}>
              <WorldVectorMap height="300px" width="100%" options={worldMapOptions} />
            </Col>
            <Col xl={5} dir="ltr">
              <div className="p-3">
                {visitorTrafficsData.map((item, idx) => <Fragment key={idx}>
                      <div className="d-flex justify-content-between align-items-center">
                        <p className="mb-1"><Image src={item.flag} alt="user-image" className="me-1 rounded-circle" height={20} /> <span className="align-middle">United States</span> </p>
                        <div>
                          <h5 className="fw-semibold mb-0">{item.count}k
                          </h5>
                        </div>
                      </div>
                      <Row className="align-items-center mb-3">
                        <Col>
                          <ProgressBar now={item.progress} className={`progress-sm progress-soft`} variant={item.variant} />
                        </Col>
                        <Col xs={'auto'}>
                          <p className="mb-0 text-muted fs-13">{item.progress}%</p>
                        </Col>
                      </Row>
                    </Fragment>)}
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </Col>;
};
export default VisitorTraffics;