import ComponentContainerCard from '@/components/ComponentContainerCard';
import MaskedInput from '@/components/MaskedInput';
import PageTitle from '@/components/PageTitle';
import { Col, Row } from 'react-bootstrap';
export const metadata = {
  title: 'Form Inputmask'
};
const InputmaskPage = () => {
  return <>
      <PageTitle title='Form Inputmask' subTitle="Forms" />
      <ComponentContainerCard title='Form Inputmask' description={<>A Java-Script Plugin to make masks on form fields and HTML elements.</>}>

        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Date</label> <br />
              <MaskedInput mask={'00/00/0000'} placeholder="__/__/____" className="form-control" />
              <span className="font-13 text-muted">e.g "DD/MM/YYYY"</span>
            </div>
          </Col>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Telephone</label> <br />
              <MaskedInput mask={'0000-0000'} placeholder="____-____" className="form-control" />
              <span className="font-13 text-muted">e.g "xxxx-xxxx"</span>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Hour</label> <br />
              <MaskedInput mask={'00:00:00'} placeholder="__:__:__" className="form-control" />
              <span className="font-13 text-muted">e.g "HH:MM:SS"</span>
            </div>
          </Col>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Telephone with Code Area</label> <br />
              <MaskedInput mask={'(+00) 0000-0000'} placeholder="(__) ____-____" className="form-control" />
              <span className="font-13 text-muted">e.g "(xx) xxxx-xxxx"</span>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Date & Hour</label> <br />
              <MaskedInput mask={'00/00/0000 00:00:00'} placeholder="__/__/____ __:__:__" className="form-control" />
              <span className="font-13 text-muted">e.g "DD/MM/YYYY HH:MM:SS"</span>
            </div>
          </Col>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">US Telephone</label> <br />
              <MaskedInput mask={'(000) 000-0000'} placeholder="(___) ___-____" className="form-control" />
              <span className="font-13 text-muted">e.g "(xxx) xxx-xxxx"</span>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">ZIP Code</label> <br />
              <MaskedInput mask={'00000-000'} placeholder="_____-___" className="form-control" />
              <span className="font-13 text-muted">e.g "xxxxx-xxx"</span>
            </div>
          </Col>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">São Paulo Celphone</label> <br />
              <MaskedInput mask={'(00) 00000-0000'} placeholder="(__) _____-____" className="form-control" />
              <span className="font-13 text-muted">e.g "(xx) xxxxx-xxxx"</span>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Crazy Zip Code</label> <br />
              <MaskedInput mask={'0-00-00-00'} placeholder="_-__-__-__" className="form-control" />
              <span className="font-13 text-muted">e.g "x-xx-xx-xx"</span>
            </div>
          </Col>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">CPF</label> <br />
              <MaskedInput mask={'000.000.0000-00'} placeholder="___.___.____-__" className="form-control" />
              <span className="font-13 text-muted">e.g "xxx.xxx.xxxx-xx"</span>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">Money</label> <br />
              <MaskedInput mask={'000,000,000,000,000,00'} placeholder="___-___-___-___-___-__" className="form-control" />
              <span className="font-13 text-muted">e.g "Your money"</span>
            </div>
          </Col>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">CNPJ</label> <br />
              <MaskedInput mask={'00.000.000/0000-00'} placeholder="__.___.___/____-__" className="form-control" />
              <span className="font-13 text-muted">e.g "xx.xxx.xxx/xxxx-xx"</span>
            </div>
          </Col>
        </Row>
        <Row>
          <Col lg={6}>
            <div className="mb-3">
              <label className="form-label">IP Address</label> <br />
              <MaskedInput mask={'000.000.000.000'} placeholder="___.___.___.___" className="form-control" />
              <span className="font-13 text-muted">e.g "xxx.xxx.xxx.xxx"</span>
            </div>
          </Col>
        </Row>
      </ComponentContainerCard>
    </>;
};
export default InputmaskPage;