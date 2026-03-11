import AppProvidersWrapper from "@/components/wrappers/AppProvidersWrapper";
import { DEFAULT_PAGE_TITLE } from "@/context/constants";
import 'flatpickr/dist/flatpickr.min.css';
import '@/assets/scss/app.scss';
export const metadata = {
  title: {
    template: '%s | Greeva NextJs - Responsive Bootstrap 5 Admin Dashboard',
    default: DEFAULT_PAGE_TITLE
  },
  description: 'A fully featured admin theme which can be used to build CRM, CMS, etc.'
};
export default function RootLayout({
  children
}) {
  return <html lang="en">
            <body className={``}>
                <AppProvidersWrapper>{children}</AppProvidersWrapper>
            </body>
        </html>;
}