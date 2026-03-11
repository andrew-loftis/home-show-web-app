import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllFiles } from '@/helpers/data'
import Image from 'next/image'
import React from 'react'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap'
import Link from 'next/link'

const Files = async () => {
  const fileData = await getAllFiles()
  return (
    <div className="w-100 border-start">
      <div className="p-3 d-flex align-items-center justify-content-between">
        <h4 className="header-title">Files</h4>
        <Link href="" className="link-reset fw-medium text-decoration-underline link-offset-2">View All <IconifyIcon icon='tabler:arrow-right' /></Link>
      </div>
      <div className="table-responsive">
        <table className="table table-centered table-nowrap border-top mb-0">
          <thead className="bg-light bg-opacity-25">
            <tr>
              <th className="ps-3 fs-12 text-uppercase text-muted">Name</th>
              <th className="fs-12 text-uppercase text-muted">Uploaded By</th>
              <th className="fs-12 text-uppercase text-muted">Size</th>
              <th className="fs-12 text-uppercase text-muted">Last Update</th>
              <th className="fs-12 text-uppercase text-muted">Members</th>
              <th className="fs-12 text-uppercase text-muted" style={{ width: 80 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {
              fileData.map((item, idx) => (
                <tr key={idx}>
                  <td className="ps-3">
                    <div className="d-flex align-items-center gap-2">
                      <div className={`flex-shrink-0 avatar-md bg-${item.fileVariant}-subtle d-inline-flex align-items-center justify-content-center rounded-2`}>
                        <IconifyIcon icon={item.icon} className={`fs-22 text-${item.fileVariant}`} />
                      </div>
                      <div>
                        <span className="fw-medium"><a href="javascript: void(0);" className="text-reset">{item.title}</a></span>
                        <p className="mb-0 fs-12">{item.file}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div>
                        <a href="javascript: void(0);">
                          {
                            item.user?.avatar &&
                            <Image src={item.user?.avatar} className="rounded-circle avatar-md" alt="friend" />
                          }
                        </a>
                      </div>
                      <div>
                        <p className="mb-0 fw-medium">{item.user?.name}</p>
                        <span className="fs-12">{item.user?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{item.size} MB</td>
                  <td>
                    {item.date.toLocaleString('en-us', { month: 'short', day: '2-digit', year: 'numeric' })}
                  </td>
                  <td id="tooltips-container">
                    <div className="avatar-group flex-nowrap">
                      {
                        item.members.map((member, idx) => (
                          <div className="avatar avatar-sm" key={idx}>
                            <span className={`avatar-title bg-${member.variant} rounded-circle fw-bold`}>
                              {member.text}
                            </span>
                          </div>
                        ))
                      }
                    </div>
                  </td>
                  <td>
                    <Dropdown className="flex-shrink-0 text-muted">
                      <DropdownToggle as={'a'} className="drop-arrow-none fs-20 link-reset" data-bs-toggle="dropdown" aria-expanded="false">
                        <IconifyIcon icon='tabler:dots-vertical' />
                      </DropdownToggle>
                      <DropdownMenu className="dropdown-menu-end">
                        <DropdownItem><IconifyIcon icon='tabler:share' className="me-1" /> Share</DropdownItem>
                        <DropdownItem><IconifyIcon icon='tabler:link' className="me-1" /> Get Sharable Link</DropdownItem>
                        <DropdownItem href={avatar1.src} download><IconifyIcon icon='tabler:download' className="me-1" /> Download</DropdownItem>
                        <DropdownItem><IconifyIcon icon='tabler:pin' className="me-1" /> Pin</DropdownItem>
                        <DropdownItem><IconifyIcon icon='tabler:edit' className="me-1" /> Edit</DropdownItem>
                        <DropdownItem><IconifyIcon icon='tabler:trash' className="me-1" /> Delete</DropdownItem>
                      </DropdownMenu>
                    </Dropdown>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Files