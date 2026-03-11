import React from 'react';
import logoDark from '@/assets/images/logo-dark.png';
import logo from '@/assets/images/logo.png';
import Image from 'next/image';
import { currentYear } from '@/context/constants';
import { Card, Col, Row } from 'react-bootstrap';
import Link from 'next/link';
export const metadata = {
  title: 'Confirm Mail'
};
const ConfirmMailPage = () => {
  return <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={4} lg={5} md={6}>
          <Card className="overflow-hidden text-center h-100 p-xxl-4 p-3 mb-0">
            <Link href="/" className="auth-brand mb-4">
              <Image src={logoDark} alt="dark logo" height={26} className="logo-dark" />
              <Image src={logo} alt="logo light" height={26} className="logo-light" />
            </Link>
            <h4 className="fw-semibold mb-2 fs-20">Verify Your Account</h4>
            <p className="text-muted mb-4">Please enter the 6-digit code sent to abc@xyz.com to proceed </p>
            <form action="/" className="text-start mb-3">
              <div className="mb-3">
                <label className="form-label" htmlFor="email-code">Enter 6 Digit Code</label>
                <input type="number" id="email-code" name="email-code" className="form-control" placeholder="CODE" />
              </div>
              <div className="mb-3 d-grid">
                <button className="btn btn-primary fw-semibold" type="submit">Verify My Account</button>
              </div>
              <p className="mb-0 text-center text-muted">Don't received code yet? <Link href="" className="link-primary fw-semibold text-decoration-underline">Send Again</Link></p>
            </form>
            <p className="text-muted fs-14 mb-4">Back To <Link href="/" className="fw-semibold text-danger ms-1">Home!</Link></p>
            <p className="mt-auto mb-0">
             {currentYear} © Greeva - By <span className="fw-bold text-decoration-underline text-uppercase text-reset fs-12">Coderthemes</span>
            </p>
          </Card>
        </Col>
      </Row>
    </div>;
};
export default ConfirmMailPage;