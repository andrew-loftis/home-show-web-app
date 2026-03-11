'use client';

import Image from 'next/image';
import React from 'react';
import americanExpress from "@/assets/images/cards/american-express.svg";
import discoverCard from "@/assets/images/cards/discover-card.svg";
import mastercard from "@/assets/images/cards/mastercard.svg";
import { Card, CardBody, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import ReactApexChart from 'react-apexcharts';
const TotalRevenue = () => {
  const TotalRevenueOpts = {
    series: [{
      name: "Total Income",
      type: "area",
      data: [81.98, 90.55, 63.14, 100.0, 71.22, 77.18, 47.07, 26.24, 85.03, 38.91, 81.3, 33.59]
    }, {
      name: "Total Expenses",
      type: "area",
      data: [30.28, 33.45, 50.0, 31.12, 26.59, 34.06, 39.79, 14.38, 33.44, 48.12, 27.91, 23.91]
    }],
    chart: {
      height: 300,
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
        opacityTo: 0.7,
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
        offsetX: -10
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
        right: 0,
        bottom: 15,
        left: 0
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
    colors: ["#31ce77", "#188ae2"],
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
            <h4 className="header-title mb-1">Total Revenue</h4>
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
          <h2 className="fw-normal">$96.56k</h2>
          <div>
            <Image src={americanExpress} alt="user-card" height={36} />
            <Image src={discoverCard} alt="user-card" height={36} />
            <Image src={mastercard} alt="user-card" height={36} />
          </div>
        </div>
        <div dir="ltr">
          <ReactApexChart height={300} options={TotalRevenueOpts} series={TotalRevenueOpts.series} type="line" className="apex-charts" data-colors="#6ac75a,#188ae2" />
        </div>
      </CardBody>
    </Card>;
};
export default TotalRevenue;