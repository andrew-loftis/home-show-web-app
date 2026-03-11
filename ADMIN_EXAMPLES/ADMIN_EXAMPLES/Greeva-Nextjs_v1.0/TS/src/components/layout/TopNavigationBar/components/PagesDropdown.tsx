import IconifyIcon from "@/components/wrappers/IconifyIcon"
import Link from "next/link"
import { Col, Dropdown, DropdownMenu, DropdownToggle, Row } from "react-bootstrap"
import { applicationsPagesData, uiComponentPageData } from "../data"

const PagesDropdown = () => {
  const extraPages = ['Left Sidebar with User', 'Menu Collapsed', 'Small Left Sidebar', 'New Header Style', 'My Account']
  return (
    <div className="topbar-item d-none d-md-flex">
      <Dropdown>
        <DropdownToggle as={'a'} className="topbar-link btn btn-link px-2 dropdown-toggle drop-arrow-none fw-medium" data-bs-toggle="dropdown" data-bs-trigger="hover" data-bs-offset="0,17" aria-haspopup="false" aria-expanded="false">
          Pages <IconifyIcon icon='tabler:chevron-down' className="ms-1" />
        </DropdownToggle>
        <DropdownMenu className="dropdown-menu-xxl p-0">
          <Row className="g-0">
            <Col md={4}>
              <div className="p-3">
                <h5 className="mb-2 fw-semibold">UI Components</h5>
                <ul className="list-unstyled megamenu-list">
                  {
                    uiComponentPageData.map((item, idx) => {
                      return (
                        <li key={idx} className='d-flex arrow-none align-items-center'>
                          <IconifyIcon icon='tabler:chevron-right' />
                          <Link href={`${item.path}`}>{item.title}</Link>
                        </li>
                      )
                    })
                  }
                </ul>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-3">
                <h5 className="mb-2 fw-semibold">Applications</h5>
                <ul className="list-unstyled megamenu-list">
                  {
                    applicationsPagesData.map((item, idx) => {
                      return (
                        <li key={idx} className='d-flex arrow-none align-items-center'>
                          <IconifyIcon icon='tabler:chevron-right' />
                          <Link href={`${item.path}`}>{item.title}</Link>
                        </li>
                      )
                    })
                  }
                </ul>
              </div>
            </Col>
            <Col md={4} className="bg-light bg-opacity-50">
              <div className="p-3">
                <h5 className="mb-2 fw-semibold">Extra Pages</h5>
                <ul className="list-unstyled megamenu-list">
                  {
                    extraPages.map((item, idx) => (
                      <li key={idx} className='d-flex arrow-none align-items-center'>
                        <IconifyIcon icon='tabler:chevron-right' />
                        <Link href="">{item}</Link>
                      </li>
                    ))
                  }
                  <li className="arrow-none align-items-center">
                  <IconifyIcon icon='tabler:chevron-right' />
                    <Link href='/coming-soon'>Maintenance &amp; Coming Soon</Link>
                  </li>
                </ul>
              </div>
            </Col>
          </Row>
        </DropdownMenu>
      </Dropdown>
    </div>
  )
}

export default PagesDropdown