'use client';

import IconifyIcon from '@/components/wrappers/IconifyIcon';
import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap';
const Statistics = () => {
  const StatisticsOpts = {
    series: [{
      name: "Open Compaign",
      type: "bar",
      data: [89.25, 98.58, 68.74, 108.87, 77.54, 84.03, 51.24, 28.57, 92.57, 42.36, 88.51, 36.57]
    }, {
      name: "Marketing Cost",
      type: "bar",
      data: [30.28, 33.45, 50.0, 31.12, 26.59, 34.06, 39.79, 14.38, 33.44, 48.12, 27.91, 23.91]
    }],
    chart: {
      height: 301,
      type: "line",
      toolbar: {
        show: false
      }
    },
    stroke: {
      dashArray: [0, 0, 0, 8],
      width: [0, 0, 2, 2],
      curve: 'smooth'
    },
    fill: {
      opacity: [1, 1],
      type: ['gradient', 'gradient'],
      gradient: {
        shade: 'dark',
        gradientToColors: ['#35b8e0'],
        type: "vertical",
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100]
      }
    },
    markers: {
      size: [0, 0, 0, 0],
      strokeWidth: 2,
      hover: {
        size: 4
      }
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisTicks: {
        show: false
      },
      axisBorder: {
        show: false
      }
    },
    yaxis: {
      stepSize: 25,
      min: 0,
      labels: {
        formatter: function (val) {
          return val + "k";
        },
        offsetX: -15
      },
      axisBorder: {
        show: false
      }
    },
    grid: {
      show: true,
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
      padding: {
        top: 0,
        right: -15,
        bottom: 15,
        left: -15
      }
    },
    legend: {
      show: true,
      horizontalAlign: "center",
      offsetX: 0,
      offsetY: -5,
      markers: {
        //   width: 9,
        //   height: 9,
        //   radius: 6,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 0
      }
    },
    plotOptions: {
      bar: {
        columnWidth: "50%",
        barHeight: "70%",
        borderRadius: 3
      }
    },
    colors: ["#6b5eae", "#fbcc5c"],
    tooltip: {
      shared: true,
      y: [{
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return "$" + y.toFixed(2) + "k";
          }
          return y;
        }
      }, {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return "$" + y.toFixed(2) + "k";
          }
          return y;
        }
      }, {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return "$" + y.toFixed(2) + "k";
          }
          return y;
        }
      }, {
        formatter: function (y) {
          if (typeof y !== "undefined") {
            return "$" + y.toFixed(2) + "k";
          }
          return y;
        }
      }]
    }
  };
  return <Card>
      <CardBody>
        <div className="d-flex justify-content-between">
          <div>
            <h4 className="header-title mb-1">Statistics</h4>
          </div>
          <Dropdown align={'end'}>
            <DropdownToggle as={'a'} className="drop-arrow-none card-drop" data-bs-toggle="dropdown" aria-expanded="false">
              <IconifyIcon icon='tabler:dots-vertical' />
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
              <DropdownItem>Sales Report</DropdownItem>
              <DropdownItem>Export Report</DropdownItem>
              <DropdownItem>Profit</DropdownItem>
              <DropdownItem>Action</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        <Row className="text-center">
          <Col sm={4} className="mt-3">
            <h3 className="fw-normal">4,335</h3>
            <p className="text-muted text-overflow">Total Sales</p>
          </Col>
          <Col sm={4} className="mt-3">
            <h3 className="fw-normal">874</h3>
            <p className="text-muted text-overflow">Open Compaign</p>
          </Col>
          <Col sm={4} className="mt-3">
            <h3 className="fw-normal">2,548</h3>
            <p className="text-muted text-overflow">Total Sales</p>
          </Col>
        </Row>
        <div dir="ltr">
          <ReactApexChart height={300} options={StatisticsOpts} series={StatisticsOpts.series} type="line" className="apex-charts" data-colors="#6b5eae,#fbcc5c" />
        </div>
      </CardBody>
    </Card>;
};
export default Statistics;