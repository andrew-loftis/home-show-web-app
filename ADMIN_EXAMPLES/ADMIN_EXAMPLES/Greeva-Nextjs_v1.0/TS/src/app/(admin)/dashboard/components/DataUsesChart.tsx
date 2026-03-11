'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { ApexOptions } from 'apexcharts';
import React from 'react'
import ReactApexChart from 'react-apexcharts'
import { Button, Card, CardBody, CardHeader, Col } from 'react-bootstrap';

const DataUsesChart = () => {
  const TotalRevenueOpts: ApexOptions = {
    chart: {
      height: 347,
      type: 'donut',
  },
  series: [25, 40, 30, 15, 20], // Example age group data
  legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      // verticalAlign: 'middle',
      floating: false,
      fontSize: '14px',
      offsetX: 0,
      offsetY: 7
  },
  labels: ["10-16 (Child)", "18-26 (Young)", "27-35 (Adult)", "36-50 (Middle Age)", "51+ (Senior)"], // Age groups
  colors: ["#188ae2","#6b5eae","#31ce77","#f34943","#fbcc5c","#35b8e0"],
  responsive: [{
      breakpoint: 600,
      options: {
          chart: {
              height: 240
          },
          legend: {
              show: false
          },
      }
  }],
  fill: {
      type: ['gradient'],
      gradient: {
          shade: 'dark',
          gradientToColors: ['#35b8e0'],
          type: "vertical",
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.7,
          stops: [0, 100]
      },
  }
  }
  return (
    <Col xl={4}>
      <Card>
        <CardHeader className="d-flex flex-wrap align-items-center gap-2 border-bottom border-dashed">
          <h4 className="header-title me-auto">Data Uses</h4>
          <div className="d-flex gap-2 justify-content-end text-end">
            <Button variant='primary' size='sm'>Refresh <IconifyIcon icon='tabler:file-export' className="ms-1" /></Button>
          </div>
        </CardHeader>
        <CardBody>
          <div dir="ltr">
            <ReactApexChart height={347} options={TotalRevenueOpts} series={TotalRevenueOpts.series} type="donut" className="apex-charts" data-colors="#188ae2,#6b5eae,#31ce77,#f34943,#fbcc5c,#35b8e0" />
          </div>
        </CardBody>
      </Card>
    </Col>
  )
}

export default DataUsesChart