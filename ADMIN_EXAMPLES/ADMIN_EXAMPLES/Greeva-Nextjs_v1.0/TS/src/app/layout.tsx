import AppProvidersWrapper from "@/components/wrappers/AppProvidersWrapper";
import { DEFAULT_PAGE_TITLE } from "@/context/constants";
import type { Metadata } from "next";

import 'flatpickr/dist/flatpickr.min.css'
import '@/assets/scss/app.scss';

export const metadata: Metadata = {
    title: {
        template: '%s | Greeva NextJs - Responsive Bootstrap 5 Admin Dashboard',
        default: DEFAULT_PAGE_TITLE,
    },
    description: 'A fully featured admin theme which can be used to build CRM, CMS, etc.',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={``}>
                <AppProvidersWrapper>{children}</AppProvidersWrapper>
            </body>
        </html>
    );
}
