import { Card } from 'react-bootstrap'
import Files from './Files'
import SideBarFile from './SideBarFile'

const FileManager = () => {
  return (
    <Card>
      <div className="d-flex">
        <SideBarFile />
        <Files />
      </div>
    </Card>
  )
}

export default FileManager