export const VENDOR_CONTRACT_VERSION = '2026-03-04-v1';
export const LEGACY_VENDOR_CONTRACT_URL = '/assets/contracts/Contracrt.docx';
export const DEFAULT_VENDOR_CONTRACT_URL = '/assets/contracts/Vendor-Contract-Source.docx';
export const VENDOR_CONTRACT_SIGN_ROUTE = '/vendor-contract';

export const VENDOR_CONTRACT_TERMS = [
  {
    title: 'Exhibit Location and Conduct',
    body: 'Your location within the exhibit area will be determined by Winn Productions Inc. You will occupy only the licensed area and conduct your business at your own risk and in a business-like manner in accordance with all state, local and other laws. Any violation of this promise will result in ejection from the show at the sole discretion of Winn Productions Inc with no refund and no liability on the part of Winn Productions Inc.'
  },
  {
    title: 'Exhibit Operations and Removal',
    body: 'All exhibits must remain intact during the duration of the show hours and all materials must be removed from the premises by you at your own cost and expense by 5pm on Monday February 23rd, 2026. No security will be provided after 5pm on Monday, February 23rd, 2026. You agree to staff your booth for the entire period the show is open on all days the show is open.'
  },
  {
    title: 'Event Changes or Cancellation',
    body: 'Neither Winn Productions Inc or the Convention Center shall be responsible if the event is cancelled or shortened or the dates changed due to inclement weather, acts of God or nature, acts of war or any other reason whatsoever.'
  },
  {
    title: 'Fees, Cancellation, and Payment Authorization',
    body: 'Winn Productions Inc will not be obligated to refund any part of the Exhibitor fee should the Exhibitor cancel for any reason after submitting this Exhibitor Agreement. All vendors must be paid in full January 21st, 2026. Winn Productions Inc is authorized to collect payment with credit card on file for balances due if not paid by the due date.'
  },
  {
    title: 'Indemnification and Insurance',
    body: "Exhibitor shall and does agree to indemnify, defend and hold Winn Productions Inc and the Putnam County Convention Center, their successors and assigns, harmless for any and all liability for damages to property or injury to persons resulting from or arising out of the operations of the Exhibitor's business or booth pursuant to this agreement, including the setting up and dismantling of the exhibits, and supply a certificate of liability insurance for no less than one million dollars."
  },
  {
    title: 'Breach and Termination',
    body: 'If the Exhibitor breaches any part of this agreement, Winn Productions Inc may terminate it at their sole discretion and without notice, and will not be liable to the Exhibitor.'
  },
  {
    title: 'Winn Productions Contract Rights',
    body: 'Winn Productions Inc. reserves the right to dissolve this contract for any reason and at any time.'
  },
  {
    title: 'Electronic Submission',
    body: 'When you submit this form electronically, you are agreeing to all terms stated above.'
  }
];

function isSafeContractUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (raw.startsWith('/')) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeContractUrl(value) {
  const raw = String(value || '').trim();
  if (!isSafeContractUrl(raw)) return '';

  if (raw === LEGACY_VENDOR_CONTRACT_URL) return DEFAULT_VENDOR_CONTRACT_URL;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.pathname === LEGACY_VENDOR_CONTRACT_URL) {
      return DEFAULT_VENDOR_CONTRACT_URL;
    }
  } catch {}

  return raw;
}

export function getVendorContractUrl(vendor = null) {
  const fromVendor = normalizeContractUrl(vendor?.contractUrl);
  if (fromVendor) return fromVendor;

  try {
    const fromWindow = normalizeContractUrl(window.VENDOR_CONTRACT_URL);
    if (fromWindow) return fromWindow;
  } catch {}

  try {
    const fromStorage = normalizeContractUrl(localStorage.getItem('vendorContractUrl'));
    if (fromStorage) return fromStorage;
  } catch {}

  return DEFAULT_VENDOR_CONTRACT_URL;
}

export function isVendorContractSigned(vendor = null) {
  return vendor?.contractSigned === true;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value?.seconds === 'number') {
    try {
      return new Date(value.seconds * 1000);
    } catch {
      return null;
    }
  }
  try {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function formatVendorContractSignedAt(value) {
  const date = toDate(value);
  if (!date) return '';
  try {
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}
