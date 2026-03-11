import PageTitle from "@/components/PageTitle"
import AllAlert from "./components/AllAlert"
import { Metadata } from "next"

export const metadata: Metadata = { title: 'Sweet Alert 2' }

const SweetAlert = () => {
  return (
    <>
      <PageTitle title='Sweet Alert 2' subTitle="Extended UI" />
      <AllAlert />
    </>
  )
}

export default SweetAlert