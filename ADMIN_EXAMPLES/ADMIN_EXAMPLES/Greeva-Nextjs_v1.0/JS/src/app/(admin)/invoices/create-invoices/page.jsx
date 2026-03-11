import PageTitle from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import Image from 'next/image';
import React from 'react';
import logoDark from '@/assets/images/logo-dark.png';
import PreviewButton from './Preview';
import { Button, Card, CardBody, Col, Row } from 'react-bootstrap';
import CustomFlatpickr from '@/components/CustomFlatpickr';
export const metadata = {
  title: 'Create Invoice'
};
const CreateInvoices = () => {
  return <>
      <PageTitle title='Create Invoice' subTitle='Invoices' />
      <Row>
        <Col xs={12}>
          <Card className="position-relative">
            <form>
              <CardBody>
                <div className="d-flex align-items-start justify-content-between mb-4">
                  <div className="overflow-hidden position-relative border rounded d-flex align-items-center justify-content-start px-2" style={{
                  height: 60,
                  width: 260
                }}>
                    <label htmlFor="imageInput" className="position-absolute top-0 start-0 end-0 bottom-0" />
                    <input className="d-none" type="file" id="imageInput" />
                    <Image id="preview" src={logoDark} alt="Preview Image" height={28} />
                  </div>
                  <div className="text-end">
                    <Row className="g-1 align-items-center">
                      <Col xs={'auto'}>
                        <label htmlFor="invoiceNo" className="col-form-label fs-16 fw-bold">#INV</label>
                      </Col>
                      <Col xs={'auto'}>
                        <input type="number" id="invoiceNo" className="form-control" placeholder={'00001234'} />
                      </Col>
                    </Row>
                  </div>
                </div>
                <Row>
                  <Col xl={4} lg={4} md={6} sm={6} className="mt-sm-0 mt-3">
                    <div className="mb-2">
                      <label className="form-label">Invoice Date :</label>
                      <CustomFlatpickr className="form-control" placeholder="Select Date" options={{
                      enableTime: false
                    }} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label">Due Date :</label>
                      <CustomFlatpickr className="form-control" placeholder="Select Date" options={{
                      enableTime: false
                    }} />
                    </div>
                    <div className="mb-2">
                      <label htmlFor="InvoicePaymentStatus" className="form-label">Payment Status</label>
                      <select className="form-select" id="InvoicePaymentStatus">
                        <option>Select Status</option>
                        <option value="Choice 1">Paid</option>
                        <option value="Choice 2">Unpaid</option>
                        <option value="Choice 3">Cancelled</option>
                        <option value="Choice 4">Refunded</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="InvoicePaymentMethod" className="form-label">Payment Method</label>
                      <select className="form-select" id="InvoicePaymentMethod">
                        <option>Select Method</option>
                        <option value="Choice 1">Credit / Debit Card</option>
                        <option value="Choice 2">Bank Transfer</option>
                        <option value="Choice 3">PayPal</option>
                        <option value="Choice 4">Payoneer</option>
                        <option value="Choice 5">Cash On Delivery</option>
                        <option value="Choice 6">Wallet</option>
                        <option value="Choice 7">UPI (Gpay)</option>
                      </select>
                    </div>
                  </Col>
                  <Col lg={4} md={6} sm={6}>
                    <div className="mb-4">
                      <label className="form-label">Billing Address :</label>
                      <div className="mb-2 pb-1">
                        <input type="text" id="BName" className="form-control" placeholder="Full Name" />
                      </div>
                      <div className="mb-2 pb-1">
                        <textarea id="BAddress" rows={3} className="form-control" placeholder="Address" defaultValue={""} />
                      </div>
                      <div>
                        <input type="text" id="BNumber" className="form-control" placeholder="Phone Number" />
                      </div>
                    </div>
                  </Col>
                  <Col xl={4} lg={4} md={6} sm={6} className="mt-sm-0 mt-3">
                    <div className="mb-4">
                      <label className="form-label">Shipping Address :</label>
                      <div className="mb-2 pb-1">
                        <input type="text" id="SName" className="form-control" placeholder="Full Name" />
                      </div>
                      <div className="mb-2 pb-1">
                        <textarea id="SAddress" rows={3} className="form-control" placeholder="Address" defaultValue={""} />
                      </div>
                      <div>
                        <input type="text" id="SNumber" className="form-control" placeholder="Phone Number" />
                      </div>
                    </div>
                  </Col>
                </Row>
                <div className="mt-4">
                  <div className="table-responsive">
                    <table className="table text-center table-nowrap align-middle mb-0">
                      <thead>
                        <tr className="bg-light bg-opacity-50">
                          <th scope="col" className="border-0" style={{
                          width: 70
                        }}>#</th>
                          <th scope="col" className="border-0 text-start">Product Details</th>
                          <th scope="col" className="border-0" style={{
                          width: 140
                        }}>Quantity</th>
                          <th scope="col" className="border-0" style={{
                          width: 140
                        }}>Unit price</th>
                          <th scope="col" className="border-0" style={{
                          width: 240
                        }}>Amount</th>
                          <th scope="col" className="border-0" style={{
                          width: 50
                        }}>•••</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <th scope="row">01</th>
                          <td className="text-start">
                            <input type="text" id="product-detail-one" className="form-control mb-1" placeholder="Product One" />
                            <input type="text" id="product-desc-one" className="form-control" placeholder="Item description" />
                          </td>
                          <td>
                            <input type="number" id="product-category-one" className="form-control" placeholder="Quantity" />
                          </td>
                          <td>
                            <input type="number" className="form-control" placeholder="Price" />
                          </td>
                          <td>
                            <input type="number" className="form-control  w-auto" placeholder="$0.00" />
                          </td>
                          <td>
                            <button type="button" className="btn flex-shrink-0 rounded-circle btn-icon btn-ghost-danger"><IconifyIcon icon="solar:trash-bin-trash-bold-duotone" className="fs-20" /></button>
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">02</th>
                          <td className="text-start">
                            <input type="text" id="product-detail-two" className="form-control mb-1" placeholder="Product Two" />
                            <input type="text" id="product-desc-two" className="form-control" placeholder="Item description" />
                          </td>
                          <td>
                            <input type="number" id="product-category-two" className="form-control" placeholder="Quantity" />
                          </td>
                          <td>
                            <input type="number" className="form-control" placeholder="Price" />
                          </td>
                          <td>
                            <input type="number" className="form-control  w-auto" placeholder="$0.00" />
                          </td>
                          <td>
                            <button type="button" className="btn flex-shrink-0 rounded-circle btn-icon btn-ghost-danger"><IconifyIcon icon="solar:trash-bin-trash-bold-duotone" className="fs-20" /></button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="p-2">
                      <button type="button" className="btn btn-primary"><IconifyIcon icon='tabler:circle-plus' className=" me-1" /> Add Products</button>
                    </div>
                  </div>
                  <div>
                    <table className="table table-sm table-borderless table-nowrap align-middle mb-0 ms-auto" style={{
                    width: 300
                  }}>
                      <tbody>
                        <tr>
                          <td className="fw-medium">Subtotal</td>
                          <td className="text-end">
                            <div className="ms-auto" style={{
                            width: 160
                          }}>
                              <input type="number" id="productSubtotal" className="form-control" placeholder="$0.00" />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Shipping</td>
                          <td className="text-end">
                            <div className="ms-auto" style={{
                            width: 160
                          }}>
                              <input type="number" id="productShipping" className="form-control" placeholder="$0.00" />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Discount <small className="text-muted">(10%)</small></td>
                          <td className="text-end">
                            <div className="ms-auto" style={{
                            width: 160
                          }}>
                              <input type="number" id="productDiscount" className="form-control" placeholder="$0.00" />
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Tax <small className="text-muted">(18%)</small></td>
                          <td className="text-end">
                            <div className="ms-auto" style={{
                            width: 160
                          }}>
                              <input type="number" id="productTaxes" className="form-control" placeholder="$0.00" />
                            </div>
                          </td>
                        </tr>
                        <tr className="fs-15">
                          <th scope="row" className="fw-bold">Total Amount</th>
                          <th className="text-end">
                            <div className="ms-auto" style={{
                            width: 160
                          }}>
                              <input type="number" id="productTotalAmount" disabled className="form-control" placeholder="$0.00" />
                            </div>
                          </th>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="InvoiceNote"> Note : </label>
                  <textarea className="form-control" id="InvoiceNote" placeholder="Thanks for your business " rows={3} defaultValue={""} />
                </div>
              </CardBody>
            </form>
          </Card>
          <div className="mb-5">
            <div className="d-flex justify-content-center gap-2">
              <PreviewButton />
              <Button variant='success' className="gap-1"><IconifyIcon icon='tabler:device-floppy' className="fs-16" /> Save</Button>
              <Button variant='info' className="gap-1"><IconifyIcon icon='tabler:send' className="fs-16" /> Send Invoice</Button>
            </div>
          </div>
        </Col>
      </Row>
    </>;
};
export default CreateInvoices;