/**
 * Send Push Notifications
 * Netlify serverless function for sending branded push notifications
 * Uses Firebase Admin SDK for FCM
 * 
 * Environment Variables Required:
 * - FIREBASE_SERVICE_ACCOUNT: JSON stringified Firebase service account
 * - APP_NAME: Application name for branding (default: "WinnPro Shows")
 * - APP_URL: Base URL for notification click links
 */

// Initialize Firebase Admin
const { getAdmin, verifyAdmin } = require('./utils/verify-admin');
let admin = null;
let messaging = null;
let db = null;

function getHeader(event, key) {
  if (!event || !event.headers) return '';
  const lower = String(key || '').toLowerCase();
  if (!lower) return '';
  const headers = event.headers;
  const direct = headers[lower];
  if (typeof direct === 'string') return direct;
  const alt = Object.keys(headers).find((k) => String(k).toLowerCase() === lower);
  if (alt) return String(headers[alt] || '');
  return '';
}

function hasValidInternalKey(event) {
  const keys = [
    process.env.INTERNAL_FUNCTIONS_KEY,
    process.env.STRIPE_WEBHOOK_SECRET
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!keys.length) return false;
  const received = String(getHeader(event, 'x-internal-function-key') || '').trim();
  return !!received && keys.includes(received);
}

function normalizeAppRoute(path) {
  const raw = String(path || '').trim();
  if (!raw) return '/#/home';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/#/')) return raw;
  if (raw.startsWith('#/')) return `/${raw}`;
  if (raw.startsWith('/')) return `/#${raw}`;
  return `/#/${raw.replace(/^\/+/, '')}`;
}

async function initFirebase() {
  if (admin && messaging && db) return { messaging, db };

  try {
    admin = getAdmin();
    messaging = admin.messaging();
    db = admin.firestore();
    return { messaging, db };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    throw error;
  }
}

// Notification templates with branding
const notificationTemplates = {
  // Payment notifications
  paymentReceived: (data) => ({
    title: `💳 Payment Confirmed!`,
    body: `Thank you! We received your $${data.amount} payment for ${data.description || 'booth rental'}.`,
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'payment',
    data: {
      type: 'payment_received',
      url: '/#/vendor-dashboard',
      ...data
    }
  }),

  invoiceSent: (data) => ({
    title: `📄 Invoice Ready`,
    body: `Your invoice for $${data.amount} is ready. Tap to view and pay.`,
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'invoice',
    data: {
      type: 'invoice_sent',
      url: '/#/vendor-dashboard',
      invoiceUrl: data.invoiceUrl,
      ...data
    }
  }),

  // Vendor notifications
  vendorApproved: (data) => ({
    title: `🎉 You're Approved!`,
    body: `Welcome to ${data.appName || 'the show'}! Your vendor registration has been approved.`,
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'vendor-status',
    data: {
      type: 'vendor_approved',
      url: '/#/vendor-dashboard',
      ...data
    }
  }),

  boothAssigned: (data) => ({
    title: `📍 Booth Assigned`,
    body: `You've been assigned booth ${data.boothNumber}. View your location on the map.`,
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'booth',
    data: {
      type: 'booth_assigned',
      url: '/#/interactive-map',
      boothNumber: data.boothNumber,
      ...data
    }
  }),

  // Lead notifications
  newLead: (data) => ({
    title: `🎯 New Lead!`,
    body: `${data.attendeeName || 'Someone'} just connected with your booth.`,
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'lead',
    data: {
      type: 'new_lead',
      url: '/#/vendor-leads',
      leadId: data.leadId,
      ...data
    }
  }),

  // Event notifications
  eventReminder: (data) => ({
    title: `⏰ ${data.appName || 'Event'} Reminder`,
    body: data.message || 'The event is starting soon!',
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'event',
    data: {
      type: 'event_reminder',
      url: '/#/schedule',
      ...data
    }
  }),

  scheduleChange: (data) => ({
    title: `📅 Schedule Update`,
    body: data.message || 'There has been a change to the event schedule.',
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'schedule',
    data: {
      type: 'schedule_change',
      url: '/#/schedule',
      ...data
    }
  }),

  // Announcement
  announcement: (data) => ({
    title: data.title || `📢 ${data.appName || 'Event'} Update`,
    body: data.message,
    icon: '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: 'announcement',
    data: {
      type: 'announcement',
      url: normalizeAppRoute(data.url || '/#/home'),
      ...data
    }
  }),

  // Custom notification
  custom: (data) => ({
    title: data.title,
    body: data.body,
    icon: data.icon || '/assets/House Logo Only.png',
    badge: '/assets/House Logo Only.png',
    tag: data.tag || 'notification',
    data: {
      type: 'custom',
      url: normalizeAppRoute(data.url || '/#/home'),
      ...data
    }
  })
};

/**
 * Get FCM tokens for a user
 */
async function getUserTokens(userId) {
  const { db } = await initFirebase();
  const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
  
  if (!tokenDoc.exists) return [];
  
  const data = tokenDoc.data();
  return data.tokens || [];
}

/**
 * Get FCM tokens for multiple users
 */
async function getMultipleUserTokens(userIds) {
  const { db } = await initFirebase();
  const tokens = [];
  
  // Batch fetch
  const chunks = [];
  for (let i = 0; i < userIds.length; i += 10) {
    chunks.push(userIds.slice(i, i + 10));
  }
  
  for (const chunk of chunks) {
    const snapshot = await db.collection('fcmTokens')
      .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
      .get();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.tokens) {
        tokens.push(...data.tokens);
      }
    });
  }
  
  return [...new Set(tokens)]; // Remove duplicates
}

/**
 * Get all FCM tokens (for broadcast)
 */
async function getAllTokens() {
  const { db } = await initFirebase();
  const tokens = [];
  
  const snapshot = await db.collection('fcmTokens').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.tokens) {
      tokens.push(...data.tokens);
    }
  });
  
  return [...new Set(tokens)];
}

/**
 * Get tokens by user role
 */
async function getTokensByRole(role) {
  const { db } = await initFirebase();
  const tokens = [];
  
  // Get users with this role
  let usersQuery;
  
  if (role === 'vendor') {
    // Get all approved vendors
    const vendorsSnapshot = await db.collection('vendors')
      .where('approved', '==', true)
      .get();
    
    const ownerUids = [];
    vendorsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.ownerUid) ownerUids.push(data.ownerUid);
    });
    
    if (ownerUids.length > 0) {
      return await getMultipleUserTokens(ownerUids);
    }
  } else if (role === 'attendee') {
    // Get all non-vendor users (or users with attendee flag)
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'attendee')
      .get();
    
    const userIds = [];
    usersSnapshot.forEach(doc => userIds.push(doc.id));
    
    if (userIds.length > 0) {
      return await getMultipleUserTokens(userIds);
    }
  }
  
  return tokens;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Internal-Function-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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

  // Push sending is admin-only, with internal bypass for trusted server functions.
  if (!hasValidInternalKey(event)) {
    const auth = await verifyAdmin(event);
    if (auth.error) {
      return {
        statusCode: auth.status || 403,
        headers,
        body: JSON.stringify({ error: auth.error || 'Admin authorization required' })
      };
    }
  }

  try {
    const { 
      template,      // Template name: 'paymentReceived', 'newLead', etc.
      data,          // Data to pass to template
      userId,        // Single user ID (optional)
      userIds,       // Array of user IDs (optional)
      role,          // Target by role: 'vendor', 'attendee' (optional)
      broadcast,     // Send to everyone (optional)
      tokens         // Direct tokens (optional, for testing)
    } = JSON.parse(event.body);

    const appName = process.env.APP_NAME || 'WinnPro Shows';
    const appUrl = process.env.APP_URL || 'https://winnpro-shows.app';

    // Get notification content
    const templateFn = notificationTemplates[template];
    if (!templateFn) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Unknown template: ${template}`,
          availableTemplates: Object.keys(notificationTemplates)
        })
      };
    }

    const notification = templateFn({ ...data, appName, appUrl });

    // Get target tokens
    let targetTokens = [];

    if (tokens && tokens.length > 0) {
      // Direct tokens provided
      targetTokens = tokens;
    } else if (userId) {
      // Single user
      targetTokens = await getUserTokens(userId);
    } else if (userIds && userIds.length > 0) {
      // Multiple users
      targetTokens = await getMultipleUserTokens(userIds);
    } else if (role) {
      // By role
      targetTokens = await getTokensByRole(role);
    } else if (broadcast) {
      // Everyone
      targetTokens = await getAllTokens();
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No target specified. Provide userId, userIds, role, broadcast, or tokens.' })
      };
    }

    if (targetTokens.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          sent: 0, 
          message: 'No tokens found for target' 
        })
      };
    }

    // Prepare FCM message
    const { messaging } = await initFirebase();
    
    const targetRoute = normalizeAppRoute(notification.data?.url || '/#/home');
    const clickUrl = /^https?:\/\//i.test(targetRoute) ? targetRoute : `${appUrl}${targetRoute}`;
    const message = {
      notification: {
        title: notification.title,
        body: notification.body
      },
      webpush: {
        notification: {
          icon: notification.icon,
          badge: notification.badge,
          tag: notification.tag,
          renotify: true,
          requireInteraction: notification.data?.type === 'payment_received' || notification.data?.type === 'invoice_sent'
        },
        fcmOptions: {
          link: clickUrl
        }
      },
      android: {
        notification: {
          icon: 'ic_stat_icon',
          color: '#3B82F6',
          channelId: 'default',
          tag: notification.tag,
          priority: 'high'
        },
        priority: 'high'
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body
            },
            badge: 1,
            sound: 'default',
            'mutable-content': 1
          }
        },
        fcmOptions: {
          image: notification.icon
        }
      },
      data: {
        ...notification.data,
        url: targetRoute,
        click_action: clickUrl
      }
    };

    // Send to all tokens (multicast)
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];

    // FCM multicast limit is 500 tokens
    const tokenChunks = [];
    for (let i = 0; i < targetTokens.length; i += 500) {
      tokenChunks.push(targetTokens.slice(i, i + 500));
    }

    for (const chunk of tokenChunks) {
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        ...message
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      // Track failed tokens for cleanup
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(chunk[idx]);
          }
        }
      });
    }

    // Clean up invalid tokens
    if (failedTokens.length > 0) {
      console.log(`Cleaning up ${failedTokens.length} invalid tokens`);
      // Could implement token cleanup here
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        totalTargets: targetTokens.length,
        template,
        notification: {
          title: notification.title,
          body: notification.body
        }
      })
    };

  } catch (error) {
    console.error('Push notification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
