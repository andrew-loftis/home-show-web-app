'use client';

import Image from 'next/image';
import React from 'react';
import americanExpress from '@/assets/images/cards/american-express.svg';
import discoverCard from '@/assets/images/cards/discover-card.svg';
import mastercard from '@/assets/images/cards/mastercard.svg';
import ReactApexChart from 'react-apexcharts';
import { Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
const DailySales = () => {
  const DailySalesOpts = {
    series: [{
      name: "Orders",
      type: "line",
      data: [89.25, 98.58, 68.74, 108.87, 77.54, 84.03, 51.24, 28.57, 92.57, 42.36, 88.51, 36.57]
    }, {
      name: "Delivered",
      type: "line",
      data: [22.25, 24.58, 36.74, 22.87, 19.54, 25.03, 29.24, 10.57, 24.57, 35.36, 20.51, 17.57]
    }],
    chart: {
      height: 300,
      type: "line",
      toolbar: {
        show: false
      }
    },
    stroke: {
      dashArray: [0, 5],
      width: [2, 2],
      curve: 'smooth'
    },
    fill: {
      opacity: [1, 1],
      type: ['gradient', 'gradient'],
      gradient: {
        shade: 'dark',
        gradientToColors: ['#FDD835'],
        type: "horizontal",
        shadeIntensity: 1,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100, 100, 100]
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
        // width: 9,
        // height: 9,
        // radius: 6,
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
    colors: ["#6ac75a", "#188ae2"],
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
      }]
    }
  };
  return <Card>
      <CardBody>
        <div className="d-flex justify-content-between">
          <div>
            <h4 className="header-title mb-1">Daily Sales</h4>
            <p className="text-muted">March 26 - April 01</p>
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
        <div className="my-2 d-flex align-items-center justify-content-between">
          <h2 className="fw-normal">$8,459.56</h2>
          <div>
            <Image src={americanExpress} alt="user-card" height={36} />&nbsp;
            <Image src={discoverCard} alt="user-card" height={36} />&nbsp;
            <Image src={mastercard} alt="user-card" height={36} />&nbsp;
          </div>
        </div>
        <div dir="ltr">
          <ReactApexChart height={300} options={DailySalesOpts} series={DailySalesOpts.series} type="line" className="apex-charts" data-colors="#6ac75a,#188ae2" />
        </div>
      </CardBody>
    </Card>;
};
export default DailySales;