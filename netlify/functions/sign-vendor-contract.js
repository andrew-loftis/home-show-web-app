/**
 * Sign Vendor Contract Function
 * Captures a vendor's in-app digital signature and sends confirmation emails.
 */

const { verifyAuth, verifyAdmin, getAdmin } = require('./utils/verify-admin');
const { collectAdminEmails } = require('./utils/admin-email-recipients');
const VALID_SIGNATURE_MODES = new Set(['draw', 'type']);
const LEGACY_CONTRACT_PATH = '/assets/contracts/Contracrt.docx';
const SOURCE_CONTRACT_PATH = '/assets/contracts/Vendor-Contract-Source.docx';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));
}

function resolveBaseUrl() {
  const raw = normalizeText(process.env.APP_URL || process.env.SITE_URL || process.env.URL || 'https://winnpro-shows.app');
  return raw.replace(/\/+$/, '').split('#')[0];
}

function joinAppUrl(baseUrl, path) {
  const base = normalizeText(baseUrl).replace(/\/+$/, '');
  const suffix = normalizeText(path);
  if (!suffix) return base;
  return `${base}${suffix.startsWith('/') ? '' : '/'}${suffix}`;
}

function normalizeContractUrl(baseUrl, value) {
  const raw = normalizeText(value);
  if (!raw) return joinAppUrl(baseUrl, SOURCE_CONTRACT_PATH);
  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname === LEGACY_CONTRACT_PATH) {
        return joinAppUrl(baseUrl, SOURCE_CONTRACT_PATH);
      }
      return raw;
    } catch {
      return raw;
    }
  }
  if (raw === LEGACY_CONTRACT_PATH) return joinAppUrl(baseUrl, SOURCE_CONTRACT_PATH);
  if (raw.startsWith('/')) return joinAppUrl(baseUrl, raw);
  return joinAppUrl(baseUrl, `/${raw}`);
}

async function sendTemplateEmailViaFunction({ to, template, data, baseUrl }) {
  const internalKey = normalizeText(process.env.INTERNAL_FUNCTIONS_KEY || process.env.STRIPE_WEBHOOK_SECRET);
  if (!internalKey) {
    throw new Error('Missing INTERNAL_FUNCTIONS_KEY/STRIPE_WEBHOOK_SECRET for send-email dispatch');
  }

  const response = await fetch(`${baseUrl}/.netlify/functions/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Function-Key': internalKey
    },
    body: JSON.stringify({ to, template, data })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `send-email failed (${response.status})`);
  }

  return payload;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const auth = await verifyAuth(event);
  if (auth.error) {
    return {
      statusCode: auth.status || 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    };
  }

  const adminAuth = await verifyAdmin(event);
  const isAdmin = !adminAuth.error;

  try {
    const body = JSON.parse(event.body || '{}');
    const vendorId = normalizeText(body.vendorId);
    const signatureMode = normalizeText(body.signatureMode).toLowerCase();
    const signerName = normalizeText(body.signerName);
    const typedSignature = normalizeText(body.typedSignature || signerName);
    const drawnSignatureDataUrl = normalizeText(body.drawnSignatureDataUrl);
    const contractVersion = normalizeText(body.contractVersion || '2026-03-04-v1');
    const requestedContractUrl = normalizeText(body.contractUrl);
    const resendNotifications = body.resendNotifications === true && isAdmin;

    if (!vendorId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'vendorId is required' })
      };
    }

    if (!VALID_SIGNATURE_MODES.has(signatureMode)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'signatureMode must be "draw" or "type"' })
      };
    }

    if (!signerName || signerName.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'signerName is required' })
      };
    }

    if (signatureMode === 'type' && typedSignature.length < 2) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'typedSignature is required for type mode' })
      };
    }

    if (signatureMode === 'draw') {
      if (!/^data:image\/(png|jpeg);base64,/i.test(drawnSignatureDataUrl)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'drawnSignatureDataUrl must be a base64 image data URL' })
        };
      }
      if (drawnSignatureDataUrl.length > 350000) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'drawnSignatureDataUrl is too large' })
        };
      }
    }

    const admin = getAdmin();
    const db = admin.firestore();
    const vendorRef = db.collection('vendors').doc(vendorId);
    const vendorSnap = await vendorRef.get();
    if (!vendorSnap.exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Vendor not found' })
      };
    }

    const vendor = vendorSnap.data() || {};
    const ownerUid = normalizeText(vendor.ownerUid);
    const requesterUid = normalizeText(auth.uid);

    if (!isAdmin && (!ownerUid || ownerUid !== requesterUid)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to sign this vendor contract' })
      };
    }

    const existingSigned = vendor.contractSigned === true;
    const existingSigner = normalizeText(vendor.contractSignerName);
    const existingMode = normalizeText(vendor.contractSignatureMode).toLowerCase();
    const existingTyped = normalizeText(vendor.contractSignatureTyped);
    const existingDrawn = normalizeText(vendor.contractSignatureImage);
    const existingHasSignature = !!(existingMode || existingTyped || existingDrawn);

    const isSameSignature = existingSigner === signerName
      && existingMode === signatureMode
      && (
        (signatureMode === 'type' && existingTyped === typedSignature)
        || (signatureMode === 'draw' && existingDrawn === drawnSignatureDataUrl)
      );

    if (existingSigned && existingHasSignature && !isSameSignature && !isAdmin) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'Contract is already signed and locked. Contact an admin for corrections.' })
      };
    }

    const baseUrl = resolveBaseUrl();
    const contractUrl = normalizeContractUrl(baseUrl, requestedContractUrl || vendor.contractUrl || SOURCE_CONTRACT_PATH);
    const signerEmail = normalizeEmail(vendor.contactEmail || auth.emailRaw || auth.email);

    const patch = {
      contractRequired: true,
      contractSigned: true,
      contractSignerName: signerName,
      contractSignerEmail: signerEmail,
      contractVersion: contractVersion || normalizeText(vendor.contractVersion) || '2026-03-04-v1',
      contractUrl,
      contractSignatureMode: signatureMode,
      contractSignatureTyped: signatureMode === 'type' ? typedSignature : admin.firestore.FieldValue.delete(),
      contractSignatureImage: signatureMode === 'draw' ? drawnSignatureDataUrl : admin.firestore.FieldValue.delete(),
      contractSignedByUid: requesterUid,
      contractSignedSource: 'in_app',
      contractSignedAt: existingSigned && vendor.contractSignedAt ? vendor.contractSignedAt : admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await vendorRef.set(patch, { merge: true });

    const adminEmails = await collectAdminEmails({ db });
    const vendorEmailShouldSend = isValidEmail(signerEmail);
    const vendorAlreadyNotified = !!vendor.contractConfirmationVendorSentAt;
    const adminAlreadyNotified = !!vendor.contractConfirmationAdminSentAt;

    const sendVendorEmail = vendorEmailShouldSend && (resendNotifications || !vendorAlreadyNotified);
    const sendAdminEmail = adminEmails.length > 0 && (resendNotifications || !adminAlreadyNotified);

    let vendorEmailSent = false;
    let adminEmailSent = false;
    const emailErrors = [];
    const showName = normalizeText(vendor.showName || 'WinnPro Home Show');
    const businessName = normalizeText(vendor.name || vendor.companyName || 'Vendor');
    const signedAtIso = new Date().toISOString();

    if (sendVendorEmail) {
      try {
        await sendTemplateEmailViaFunction({
          baseUrl,
          to: signerEmail,
          template: 'vendorContractSignedVendor',
          data: {
            businessName,
            showName,
            signerName,
            signedAt: signedAtIso,
            contractUrl,
            dashboardUrl: joinAppUrl(baseUrl, '/#/vendor-dashboard')
          }
        });
        vendorEmailSent = true;
      } catch (error) {
        emailErrors.push(`vendor_email:${String(error?.message || error)}`);
      }
    }

    if (sendAdminEmail) {
      try {
        await sendTemplateEmailViaFunction({
          baseUrl,
          to: adminEmails,
          template: 'vendorContractSignedAdmin',
          data: {
            businessName,
            showName,
            signerName,
            signerEmail,
            signedAt: signedAtIso,
            contractUrl,
            vendorId,
            vendorDashboardUrl: joinAppUrl(baseUrl, '/#/admin')
          }
        });
        adminEmailSent = true;
      } catch (error) {
        emailErrors.push(`admin_email:${String(error?.message || error)}`);
      }
    }

    const notificationPatch = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (vendorEmailSent) {
      notificationPatch.contractConfirmationVendorSentAt = admin.firestore.FieldValue.serverTimestamp();
      notificationPatch.contractConfirmationVendorEmail = signerEmail;
    }
    if (adminEmailSent) {
      notificationPatch.contractConfirmationAdminSentAt = admin.firestore.FieldValue.serverTimestamp();
      notificationPatch.contractConfirmationAdminCount = adminEmails.length;
    }

    if (vendorEmailSent || adminEmailSent) {
      await vendorRef.set(notificationPatch, { merge: true });
    }

    return {
      statusCode: emailErrors.length ? 207 : 200,
      headers,
      body: JSON.stringify({
        success: true,
        vendorId,
        signed: true,
        signerName,
        signatureMode,
        vendorEmailSent,
        adminEmailSent,
        adminEmailCount: adminEmails.length,
        emailErrors
      })
    };
  } catch (error) {
    console.error('[sign-vendor-contract] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error?.message || 'Failed to sign vendor contract' })
    };
  }
};
