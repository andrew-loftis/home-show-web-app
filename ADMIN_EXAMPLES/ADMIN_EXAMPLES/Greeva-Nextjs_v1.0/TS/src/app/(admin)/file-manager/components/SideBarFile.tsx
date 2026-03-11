import Image from 'next/image'
import React from 'react'
import coffeeCup from '@/assets/images/coffee-cup.svg'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import Link from 'next/link'

const SideBarFile = () => {
  return (
    <div className="offcanvas-xl offcanvas-start file-manager" tabIndex={-1} id="fileManagerSidebar" aria-labelledby="fileManagerSidebarLabel">
      <div className="d-flex flex-column">
        <div className="p-3">
          <div className="d-flex flex-column">
            <button type="button" className="btn fw-medium btn-danger drop-arrow-none dropdown-toggle w-100 mb-3">
              Create New <IconifyIcon icon='tabler:plus' className="ms-1" />
            </button>
            <div className="file-menu">
              <Link href="" className="list-group-item d-flex align-items-center active"><IconifyIcon icon='tabler:folder' className="fs-18 align-middle me-2" />My Files</Link>
              <Link href="" className="list-group-item d-flex align-items-center"><IconifyIcon icon='tabler:brand-google-drive' className="fs-18 align-middle me-2" />Google Drive</Link>
              <Link href="" className="list-group-item d-flex align-items-center"><IconifyIcon icon='tabler:share-3' className="fs-18 align-middle me-2" />Share with me</Link>
              <Link href="" className="list-group-item d-flex align-items-center"><IconifyIcon icon='tabler:clock' className="fs-18 align-middle me-2" />Recent</Link>
              <Link href="" className="list-group-item d-flex align-items-center"><IconifyIcon icon='tabler:star' className="fs-18 align-middle me-2" />Starred</Link>
              <Link href="" className="list-group-item d-flex align-items-center"><IconifyIcon icon='tabler:trash' className="fs-18 align-middle me-2" />Deleted Files</Link>
            </div>
            <div className="mt-5 pt-5">
              <div className="alert alert-secondary p-3 pt-0 text-center mb-0" role="alert">
                <Image src={coffeeCup} alt='coffeeCup' className="img-fluid mt-n5" style={{ maxWidth: 135 }} />
                <div>
                  <h5 className="alert-heading fw-medium fs-18 mt-2">Get more space for files</h5>
                  <p>We offer you unlimited storage space for all you needs</p>
                  <Link href="" className="btn btn-secondary">Upgrade to Pro</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SideBarFile