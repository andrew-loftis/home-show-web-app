
import PageTitle from "@/components/PageTitle"
import AllDragula from "./components/AllDragula"
import { Metadata } from "next"


export const metadata: Metadata = { title: 'Dragula' }

const Dragula = () => {
  return (
    <>
      <PageTitle title='Dragula' subTitle="Extended UI" />
      <AllDragula />
    </>
  )
}

export default Dragula