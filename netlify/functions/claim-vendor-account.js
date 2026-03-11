/**
 * Claim Vendor Account Function
 * Links vendor profiles to the signed-in user when contactEmail matches auth email.
 * This is used for imported vendors who already had attendee accounts.
 */

const { verifyAuth, getAdmin } = require('./utils/verify-admin');

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

  try {
    const body = JSON.parse(event.body || '{}');
    const requestedShowId = String(body.showId || '').trim();

    const admin = getAdmin();
    const db = admin.firestore();
    const uid = String(auth.uid || '').trim();
    const emailRaw = String(auth.emailRaw || auth.email || '').trim();
    const email = emailRaw.toLowerCase();
    const emailVariants = Array.from(new Set([email, emailRaw].filter(Boolean)));
    if (!uid || !emailVariants.length) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing uid/email in auth token' })
      };
    }

    const vendorDocsById = new Map();
    const emailFields = ['contactEmail', 'email'];
    for (const field of emailFields) {
      for (const variant of emailVariants) {
        try {
          const snap = await db.collection('vendors')
            .where(field, '==', variant)
            .limit(100)
            .get();
          snap.forEach((docSnap) => vendorDocsById.set(docSnap.id, docSnap));
        } catch {}
      }
    }

    const claimed = [];
    const alreadyOwned = [];
    const unchanged = [];
    const conflicts = [];
    const touched = [];
    const updated = [];

    const updates = [];
    vendorDocsById.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const docShowId = String(data.showId || 'putnam-spring-2026');
      if (requestedShowId && docShowId !== requestedShowId) return;

      const ownerUid = String(data.ownerUid || '').trim();
      if (ownerUid && ownerUid !== uid) {
        conflicts.push(docSnap.id);
        return;
      }

      touched.push(docSnap.id);

      const patch = {};
      let docChanged = false;

      if (!ownerUid) {
        patch.ownerUid = uid;
        patch.ownerLinkedAt = admin.firestore.FieldValue.serverTimestamp();
        claimed.push(docSnap.id);
        docChanged = true;
      } else {
        alreadyOwned.push(docSnap.id);
      }

      const inviteStatus = String(data.inviteStatus || '').trim().toLowerCase();
      if (inviteStatus !== 'claimed') {
        patch.inviteStatus = 'claimed';
        patch.inviteClaimedAt = admin.firestore.FieldValue.serverTimestamp();
        docChanged = true;
      }

      if (!docChanged) {
        unchanged.push(docSnap.id);
        return;
      }

      patch.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      updated.push(docSnap.id);
      updates.push(db.collection('vendors').doc(docSnap.id).set(patch, { merge: true }));
    });

    if (updates.length) {
      await Promise.all(updates);
    }

    // Promote attendee role to vendor for linked users.
    let attendeeUpdatedCount = 0;
    if (claimed.length || alreadyOwned.length) {
      const attendees = await db.collection('attendees')
        .where('ownerUid', '==', uid)
        .limit(20)
        .get();

      const attendeeUpdates = [];
      attendees.forEach((attDoc) => {
        const attData = attDoc.data() || {};
        if (String(attData.role || '').trim().toLowerCase() === 'vendor') return;
        attendeeUpdatedCount += 1;
        attendeeUpdates.push(
          db.collection('attendees').doc(attDoc.id).set({
            role: 'vendor',
            roleUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true })
        );
      });
      if (attendeeUpdates.length) {
        await Promise.all(attendeeUpdates);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        uid,
        email,
        emailVariants,
        requestedShowId: requestedShowId || null,
        claimedCount: claimed.length,
        alreadyOwnedCount: alreadyOwned.length,
        unchangedCount: unchanged.length,
        conflictCount: conflicts.length,
        vendorIds: touched,
        updatedVendorIds: updated,
        attendeeUpdatedCount,
        conflicts
      })
    };
  } catch (error) {
    console.error('[claim-vendor-account] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to claim vendor account' })
    };
  }
};
