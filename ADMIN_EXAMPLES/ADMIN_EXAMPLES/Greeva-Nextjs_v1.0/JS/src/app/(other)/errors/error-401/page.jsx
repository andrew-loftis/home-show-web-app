import React from 'react';
import logoDark from '@/assets/images/logo-dark.png';
import logo from '@/assets/images/logo.png';
import Image from 'next/image';
import error401 from '@/assets/images/error/error-401.png';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { currentYear } from '@/context/constants';
import { Card, Col, Row } from 'react-bootstrap';
import Link from 'next/link';
export const metadata = {
  title: 'Error 401'
};
const Error401page = () => {
  return <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xxl={4} xl={4} lg={5} md={6}>
          <Card className="overflow-hidden text-center h-100 p-xxl-4 p-3 mb-0">
            <Link href="/" className="auth-brand mb-4">
              <Image src={logoDark} alt="dark logo" height={26} className="logo-dark" />
              <Image src={logo} alt="logo light" height={26} className="logo-light" />
            </Link>
            <div className="mx-auto text-center">
              <Image src={error401} alt='error401' className="mt-3 mb-2" height={230} />
              <h2 className="fw-bold mt-3 text-primary lh-base">Error Unauthorized ! </h2>
              <h4 className="fw-medium mt-2 mb-0 text-dark lh-base">Access to allowed only for registered user</h4>
              <p className="text-muted fs-15 mb-3">Sorry, but you are not authorized to view this page.</p>
              <Link href="/" className="btn btn-primary">Back To Home <IconifyIcon icon='tabler:home' className="ms-1" /></Link>
            </div>
            <p className="mt-3 mb-0">
             {currentYear} © Greeva - By <span className="fw-bold text-decoration-underline text-uppercase text-reset fs-12">Coderthemes</span>
            </p>
          </Card>
        </Col>
      </Row>
    </div>;
};
export default Error401page;