'use client';

import logoDark from '@/assets/images/logo-dark.png';
import logo from '@/assets/images/logo.png';
import { currentYear } from '@/context/constants';
import Image from 'next/image';
import Link from 'next/link';
import { Card, Col, Row } from 'react-bootstrap';
import useSignIn from './useSignIn';
import TextFormInput from '@/components/form/TextFormInput';
const Login = () => {
  const {
    loading,
    login,
    control
  } = useSignIn();
  return <div className="auth-bg d-flex min-vh-100 justify-content-center align-items-center">
      <Row className="g-0 justify-content-center w-100 m-xxl-5 px-xxl-4 m-3">
        <Col xl={4} lg={5} md={6}>
          <Card className="overflow-hidden text-center h-100 p-xxl-4 p-3 mb-0">
            <a href="/" className="auth-brand mb-4">
              <Image src={logoDark} alt="dark logo" height={26} className="logo-dark" />
              <Image src={logo} alt="logo light" height={26} className="logo-light" />
            </a>
            <h4 className="fw-semibold mb-2 fs-18">Log in to your account</h4>
            <p className="text-muted mb-4">Enter your email address and password to access admin panel.</p>
            <form onSubmit={login} action="/" className="text-start mb-3">
              <div className="mb-3">
                <TextFormInput control={control} name="email" placeholder="Enter your email" className="bg-light bg-opacity-50 border-light py-2" label="Email" />
              </div>
              <div className="mb-3">
                <TextFormInput control={control} name="password" placeholder="Enter your password" className="bg-light bg-opacity-50 border-light py-2" label="Password" />
              </div>
              <div className="d-flex justify-content-between mb-3">
                <div className="form-check">
                  <input type="checkbox" className="form-check-input" id="checkbox-signin" />
                  <label className="form-check-label" htmlFor="checkbox-signin">Remember me</label>
                </div>
                <Link href="/auth/recover-password" className="text-muted border-bottom border-dashed">Forget Password</Link>
              </div>
              <div className="d-grid">
                <button disabled={loading} className="btn btn-primary fw-semibold" type="submit">Login</button>
              </div>
            </form>
            <p className="text-muted fs-14 mb-4">Don't have an account? <Link href="/auth/register" className="fw-semibold text-danger ms-1">Sign Up !</Link></p>
            <p className="mt-auto mb-0">
              {currentYear} © Greeva - By <span className="fw-bold text-decoration-underline text-uppercase text-reset fs-12">Coderthemes</span>
            </p>
          </Card>
        </Col>
      </Row>
    </div>;
};
export default Login;