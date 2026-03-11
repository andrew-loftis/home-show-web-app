import { currency } from "@/context/constants";
import usFlag from "@/assets/images/flags/us.svg";
import inFlag from "@/assets/images/flags/in.svg";
import brFlag from "@/assets/images/flags/br.svg";
import caFlag from "@/assets/images/flags/ca.svg";
export const statData = [{
  title: 'Total Orders',
  icon: 'solar:case-round-minimalistic-bold-duotone',
  otherIcon: 'solar:cart-2-line-duotone',
  count: '687.3k',
  change: 9.19,
  variant: 'danger'
}, {
  title: 'Total Returns',
  icon: 'solar:bill-list-bold-duotone',
  otherIcon: 'solar:banknote-2-line-duotone',
  count: '9.62k',
  change: 26.87,
  variant: 'success'
}, {
  title: 'Avg. Sales Earnings',
  icon: 'solar:wallet-money-bold-duotone',
  otherIcon: 'solar:cardholder-line-duotone',
  count: `${currency}98.24 USD`,
  change: 3.51,
  variant: 'success'
}, {
  title: 'Number of Visits',
  icon: 'solar:eye-bold-duotone',
  otherIcon: 'solar:eye-scan-bold-duotone',
  count: '87.94M',
  change: 1.05,
  variant: 'danger'
}];
export const visitorTrafficsData = [{
  flag: usFlag,
  count: 67.5,
  country: 'United States',
  progress: 72.15,
  variant: 'secondary'
}, {
  flag: inFlag,
  count: 7.92,
  country: 'India',
  progress: 28.65,
  variant: 'info'
}, {
  flag: brFlag,
  count: 80.05,
  country: 'Brazil',
  progress: 62.5,
  variant: 'warning'
}, {
  flag: caFlag,
  count: 5.3,
  country: 'Canada',
  progress: 42.2,
  variant: 'success'
}];