/**
 * Admin Image Upload Netlify Function
 * Uploads an image to Firebase Storage using admin credentials after admin auth verification.
 *
 * Request:
 *   POST /.netlify/functions/admin-upload-image
 *   Authorization: Bearer <firebase-id-token>
 *   Content-Type: application/json
 *   {
 *     "dataUrl": "data:image/jpeg;base64,...",
 *     "pathPrefix": "shows/putnam-spring-2026/floorplan",
 *     "fileName": "floorplan.jpg"
 *   }
 */

const crypto = require('crypto');
const { verifyAdmin, getAdmin } = require('./utils/verify-admin');

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function toSafePathPrefix(value) {
  const raw = String(value || 'uploads').trim();
  const parts = raw.split('/').filter(Boolean).map((segment) => (
    segment.replace(/[^a-zA-Z0-9._-]/g, '_')
  ));
  return parts.length ? parts.join('/') : 'uploads';
}

function toSafeFileName(value) {
  const base = String(value || 'image')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'image';
}

function getExtForMime(mimeType) {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  return map[mimeType] || 'jpg';
}

function parseDataUrl(dataUrl) {
  const input = String(dataUrl || '').trim();
  const match = input.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) {
    throw new Error('Invalid image payload');
  }
  const mimeType = match[1].toLowerCase();
  const base64 = match[2].replace(/\s+/g, '');
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length) throw new Error('Empty image payload');
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large after compression (max 10 MB)');
  }
  return { mimeType, buffer };
}

function getBucketCandidates(adminSdk) {
  const app = adminSdk.app();
  const projectId = String(
    app?.options?.projectId
    || process.env.FIREBASE_PROJECT_ID
    || process.env.GCLOUD_PROJECT
    || ''
  ).trim();

  const configured = [
    process.env.FIREBASE_STORAGE_BUCKET,
    process.env.GCLOUD_STORAGE_BUCKET,
    app?.options?.storageBucket,
    projectId ? `${projectId}.firebasestorage.app` : '',
    projectId ? `${projectId}.appspot.com` : ''
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  return Array.from(new Set(configured));
}

async function saveToBucket(adminSdk, bucketCandidates, objectPath, buffer, mimeType) {
  const token = crypto.randomUUID();
  let lastError = null;

  for (const bucketName of bucketCandidates) {
    try {
      const bucket = adminSdk.storage().bucket(bucketName);
      const file = bucket.file(objectPath);
      await file.save(buffer, {
        resumable: false,
        contentType: mimeType,
        validation: false,
        metadata: {
          contentType: mimeType,
          metadata: {
            firebaseStorageDownloadTokens: token
          }
        }
      });

      return { bucketName, token };
    } catch (error) {
      lastError = error;
      const message = String(error?.message || '').toLowerCase();
      const shouldTryRestFallback =
        message.includes('stream was destroyed')
        || message.includes('cannot call write')
        || message.includes('socket hang up')
        || message.includes('econnreset')
        || message.includes('timeout');

      if (shouldTryRestFallback) {
        try {
          const ok = await uploadViaStorageRestApi(adminSdk, bucketName, objectPath, buffer, mimeType, token);
          if (ok) {
            return { bucketName, token };
          }
        } catch (restError) {
          lastError = restError;
        }
      }
    }
  }

  throw lastError || new Error('Failed to upload image to storage bucket');
}

async function getServiceAccessToken(adminSdk) {
  const credential = adminSdk.app()?.options?.credential;
  if (!credential || typeof credential.getAccessToken !== 'function') {
    throw new Error('Firebase admin credentials do not support access tokens');
  }
  const token = await credential.getAccessToken();
  const value = token?.access_token || token?.accessToken || '';
  if (!value) throw new Error('Failed to obtain service access token');
  return value;
}

async function uploadViaStorageRestApi(adminSdk, bucketName, objectPath, buffer, mimeType, downloadToken) {
  const accessToken = await getServiceAccessToken(adminSdk);
  const encodedObjectPath = encodeURIComponent(objectPath);
  const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucketName)}/o?uploadType=media&name=${encodedObjectPath}`;

  const uploadResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': mimeType
    },
    body: buffer
  });

  if (!uploadResp.ok) {
    const details = await safeReadText(uploadResp);
    throw new Error(`REST upload failed (${uploadResp.status}): ${details || 'unknown error'}`);
  }

  const patchUrl = `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucketName)}/o/${encodedObjectPath}`;
  const patchResp = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      metadata: {
        firebaseStorageDownloadTokens: downloadToken
      }
    })
  });

  if (!patchResp.ok) {
    const details = await safeReadText(patchResp);
    throw new Error(`REST metadata patch failed (${patchResp.status}): ${details || 'unknown error'}`);
  }

  return true;
}

async function safeReadText(response) {
  try {
    const text = await response.text();
    return String(text || '').slice(0, 500);
  } catch {
    return '';
  }
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const auth = await verifyAdmin(event);
  if (auth.error) {
    return { statusCode: auth.status, headers, body: JSON.stringify({ error: auth.error }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { mimeType, buffer } = parseDataUrl(body.dataUrl);

    const pathPrefix = toSafePathPrefix(body.pathPrefix || 'uploads');
    const providedName = toSafeFileName(body.fileName || 'image');
    const ext = getExtForMime(mimeType);
    const hasExt = /\.[a-zA-Z0-9]+$/.test(providedName);
    const fileName = hasExt ? providedName : `${providedName}.${ext}`;
    const objectPath = `${pathPrefix}/${Date.now()}_${fileName}`;

    const adminSdk = getAdmin();
    const bucketCandidates = getBucketCandidates(adminSdk);
    if (!bucketCandidates.length) {
      throw new Error('No Firebase Storage bucket configured for admin upload');
    }

    const { bucketName, token } = await saveToBucket(adminSdk, bucketCandidates, objectPath, buffer, mimeType);
    const encodedPath = encodeURIComponent(objectPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url,
        path: objectPath,
        bucket: bucketName
      })
    };
  } catch (error) {
    console.error('Admin upload failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Upload failed'
      })
    };
  }
};
