// 'use client'
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getAllInvoices } from '@/helpers/data';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, CardFooter, CardHeader } from 'react-bootstrap';
const InvoicesCard = async () => {
  const invoiceData = await getAllInvoices();
  return <Card>
      <CardHeader className="border-bottom card-tabs d-flex flex-wrap align-items-center gap-2">
        <div className="flex-grow-1">
          <h4 className="header-title">Invoices</h4>
        </div>
        <div className="d-flex flex-wrap flex-lg-nowrap gap-2">
          <div className="flex-shrink-0 d-flex align-items-center gap-2">
            <div className="position-relative">
              <input type="text" className="form-control ps-4" placeholder="Search Here..." />
              <i className="ti ti-search position-absolute top-50 translate-middle-y start-0 ms-2" />
            </div>
          </div>
          <Link href="/invoices/create-invoices" className="btn btn-primary"><IconifyIcon icon='tabler:plus' className="me-1" />Add Invoice</Link>
        </div>
      </CardHeader>
      <div className="table-responsive">
        <table className="table table-hover text-nowrap mb-0">
          <thead className="bg-light-subtle">
            <tr>
              <th className="ps-3" style={{
              width: 50
            }}>
                <input type="checkbox" className="form-check-input" id="customCheck1" />
              </th>
              <th className="fs-12 text-uppercase text-muted">Invoice ID</th>
              <th className="fs-12 text-uppercase text-muted">Category </th>
              <th className="fs-12 text-uppercase text-muted">Created On</th>
              <th className="fs-12 text-uppercase text-muted">Invoice To</th>
              <th className="fs-12 text-uppercase text-muted">Amount</th>
              <th className="fs-12 text-uppercase text-muted">Due Date</th>
              <th className="fs-12 text-uppercase text-muted">Status</th>
              <th className="text-center fs-12 text-uppercase text-muted" style={{
              width: 120
            }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.map((item, idx) => {
            return <tr key={idx}>
                    <td className="ps-3">
                      <input type="checkbox" className="form-check-input" id="customCheck2" />
                    </td>
                    <td><span className="text-muted fw-semibold">#{item.id}</span></td>
                    <td>{item.products?.category}</td>
                    <td><span className="fs-15 text-muted">{item.date.toLocaleString('en-us', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                  })}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div className="avatar-sm">
                          {item.users?.avatar && <Image src={item.users?.avatar} alt='avatar' className="img-fluid rounded-circle" />}
                        </div>
                        <h6 className="fs-14 mb-0">{item.users?.name}</h6>
                      </div>
                    </td>
                    <td>${item.products?.amount}</td>
                    <td><span className="fs-15 text-muted">{item.products?.date.toLocaleString('en-us', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric'
                  })}</span></td>
                    <td>
                      <span className={`badge bg-${item.products?.status == 'Overdue' ? 'warning' : item.products?.status == 'Pending' ? 'primary' : item.products?.status == 'Cancelled' ? 'danger' : 'success'}-subtle text-${item.products?.status == 'Overdue' ? 'warning' : item.products?.status == 'Pending' ? 'primary' : item.products?.status == 'Cancelled' ? 'danger' : 'success'} fs-12 p-1`}>{item.products?.status}</span>
                    </td>
                    <td className="pe-3">
                      <div className="hstack gap-1 justify-content-end">
                        <Button variant='soft-primary' size='sm' className="btn-icon rounded-circle"> <IconifyIcon icon='tabler:eye' /></Button>
                        <Button variant='soft-success' size='sm' className="btn-icon rounded-circle"> <IconifyIcon icon='tabler:edit' className=" fs-16" /></Button>
                        <Button variant='soft-danger' size='sm' className="btn-icon rounded-circle"> <IconifyIcon icon='tabler:trash' /></Button>
                      </div>
                    </td>
                  </tr>;
          })}
          </tbody>
        </table>
      </div>
      <CardFooter>
        <div className="d-flex justify-content-end">
          <ul className="pagination mb-0 justify-content-center">
            <li className="page-item disabled">
              <Link href="" className="page-link"><IconifyIcon icon='tabler:chevrons-left' /></Link>
            </li>
            <li className="page-item">
              <Link href="" className="page-link">1</Link>
            </li>
            <li className="page-item active">
              <Link href="" className="page-link">2</Link>
            </li>
            <li className="page-item">
              <Link href="" className="page-link">3</Link>
            </li>
            <li className="page-item">
              <Link href="" className="page-link"><IconifyIcon icon='tabler:chevrons-right' /></Link>
            </li>
          </ul>
        </div>
      </CardFooter>
    </Card>;
};
export default InvoicesCard;