import logoDark from '@/assets/images/logo-dark.png'
import logoSm from '@/assets/images/logo-sm.png'
import logo from '@/assets/images/logo.png'
import Image from 'next/image'

const LogoBox = () => {
  return (
    <a href="/" className="logo">
      <span className="logo-light">
        <span className="logo-lg"><Image width={109} height={22} src={logo} alt="logo" /></span>
        <span className="logo-sm"><Image width={19} height={24} src={logoSm} alt="small logo" /></span>
      </span>
      <span className="logo-dark">
        <span className="logo-lg"><Image width={109} height={22} src={logoDark} alt="dark logo" /></span>
        <span className="logo-sm"><Image width={19} height={24} src={logoSm} alt="small logo" /></span>
      </span>
    </a>
  )
}

export default LogoBox