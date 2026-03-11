import { userData } from '@/assets/data/other'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getUserData } from '@/helpers/data'
import Image from 'next/image'
import Link from 'next/link'
import { Button, Card, CardBody, CardFooter, CardHeader, Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'

const NewSignup = () => {
  return (
    <Card className="card-h-100">
      <CardHeader className="d-flex flex-wrap align-items-center gap-2">
        <h4 className="header-title me-auto">Recent New Signup</h4>
        <div className="d-flex gap-2 justify-content-end text-end">
          <Button variant='light' size='sm'>Import <IconifyIcon icon="tabler:download" className='ms-1' /></Button>
          <Button variant='primary' size='sm'>Export <IconifyIcon icon="tabler:file-export" className='ms-1' /></Button>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        <div className="bg-light bg-opacity-50 py-1 text-center">
          <p className="m-0"><b>895k</b> Active users out of <span className="fw-medium">965k</span>
          </p>
        </div>
        <div className="table-responsive">
          <table className="table table-custom table-centered table-sm table-nowrap table-hover mb-0">
            <tbody>
              {
                userData.slice(0,5).map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="d-flex align-items-center">
                        <div className="avatar-md flex-shrink-0 me-2">
                          <span className="avatar-title bg-primary-subtle rounded-circle">
                            <Image src={item.avatar} alt='avatar' height={22} className="rounded-circle" />
                          </span>
                        </div>
                        <div>
                          <span className="text-muted fs-12">Name</span> <br />
                          <h5 className="fs-14 mt-1">{item.name}</h5>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-muted fs-12">Email</span>
                      <h5 className="fs-14 mt-1 fw-normal">{item.email}</h5>
                    </td>
                    <td>
                      <span className="text-muted fs-12">Role</span> <br />
                      <h5 className="fs-14 mt-1 fw-normal">{item.role}</h5>
                    </td>
                    <td>
                      <span className="text-muted fs-12">Status</span>
                      <h5 className="fs-14 mt-1 fw-normal"><IconifyIcon icon='tabler:circle-filled' className={`fs-12 text-${item.status == 'Pending' ? 'warning' : item.status == 'Inactive' ? 'danger' : 'success'} success`} /> {item.status}
                      </h5>
                    </td>
                    <td style={{ width: 30 }}>
                      <Dropdown>
                        <DropdownToggle className="text-muted drop-arrow-none card-drop p-0" data-bs-toggle="dropdown" aria-expanded="false">
                          <IconifyIcon icon="tabler:dots-vertical" />
                        </DropdownToggle>
                        <DropdownMenu className="dropdown-menu-end">
                          <DropdownItem>View
                            Profile</DropdownItem>
                          <DropdownItem>Deactivate</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </CardBody>
      <CardFooter>
        <div className="align-items-center justify-content-between row text-center text-sm-start">
          <div className="col-sm">
            <div className="text-muted">
              Showing <span className="fw-semibold">5</span> of <span className="fw-semibold">10</span> Results
            </div>
          </div>
          <div className="col-sm-auto mt-3 mt-sm-0">
            <ul className="pagination pagination-boxed pagination-sm mb-0 justify-content-center">
              <li className="page-item disabled">
                <Link href="" className="page-link"><IconifyIcon icon="tabler:chevron-left" /></Link>
              </li>
              <li className="page-item active">
                <Link href="" className="page-link">1</Link>
              </li>
              <li className="page-item">
                <Link href="" className="page-link">2</Link>
              </li>
              <li className="page-item">
                <Link href="" className="page-link"><IconifyIcon icon="tabler:chevron-right" /></Link>
              </li>
            </ul>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

export default NewSignup