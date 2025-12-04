/**
 * Push Notifications with Firebase Cloud Messaging
 * Handles FCM token management and notification permissions
 */

import { logTagged } from './logger.js';

// FCM Vapid Key (public key for web push)
// This should be set in index.html or config: window.FCM_VAPID_KEY
const getVapidKey = () => window.FCM_VAPID_KEY || null;

let messaging = null;
let currentToken = null;

/**
 * Check if notifications are supported
 */
export function isNotificationSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted', 'denied', or 'default'
}

/**
 * Initialize Firebase Messaging
 */
async function initMessaging() {
  if (messaging) return messaging;
  
  try {
    const { getMessaging, isSupported } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js');
    
    // Check if messaging is supported in this browser
    const supported = await isSupported();
    if (!supported) {
      logTagged('FCM', 'Messaging not supported in this browser');
      return null;
    }
    
    messaging = getMessaging();
    return messaging;
  } catch (error) {
    console.error('[FCM] Failed to initialize messaging:', error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Notifications not supported' };
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied', permission };
    }
    
    // Get FCM token
    const token = await getFCMToken();
    
    if (token) {
      return { success: true, token, permission };
    } else {
      return { success: false, error: 'Failed to get FCM token', permission };
    }
  } catch (error) {
    console.error('[FCM] Permission request failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get FCM token for this device
 */
export async function getFCMToken() {
  try {
    const msg = await initMessaging();
    if (!msg) return null;
    
    const vapidKey = getVapidKey();
    if (!vapidKey) {
      logTagged('FCM', 'No VAPID key configured');
      return null;
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      logTagged('FCM', 'No service worker registration found');
      return null;
    }
    
    const { getToken } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js');
    
    currentToken = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: registration
    });
    
    logTagged('FCM', 'Token obtained');
    return currentToken;
  } catch (error) {
    console.error('[FCM] Failed to get token:', error);
    return null;
  }
}

/**
 * Save FCM token to Firestore for a user
 */
export async function saveTokenToFirestore(userId, token) {
  if (!token || !userId) return false;
  
  try {
    const { getDb } = await import('../firebase.js');
    const db = getDb();
    const { doc, setDoc, arrayUnion } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
    
    // Save token to user's document
    await setDoc(doc(db, 'fcmTokens', userId), {
      tokens: arrayUnion(token),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    logTagged('FCM', 'Token saved to Firestore');
    return true;
  } catch (error) {
    console.error('[FCM] Failed to save token:', error);
    return false;
  }
}

/**
 * Listen for foreground messages
 */
export async function onForegroundMessage(callback) {
  try {
    const msg = await initMessaging();
    if (!msg) return null;
    
    const { onMessage } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js');
    
    return onMessage(msg, (payload) => {
      logTagged('FCM', 'Foreground message received');
      
      // Show notification manually for foreground
      if (Notification.permission === 'granted') {
        const { title, body, icon } = payload.notification || {};
        new Notification(title || 'HomeShow', {
          body: body || 'You have a new notification',
          icon: icon || '/assets/icons/icon-192.svg',
          badge: '/assets/icons/icon-192.svg',
          tag: 'homeshow-notification',
          data: payload.data
        });
      }
      
      // Call the callback with payload
      if (callback) callback(payload);
    });
  } catch (error) {
    console.error('[FCM] Failed to setup message listener:', error);
    return null;
  }
}

/**
 * Show a local notification (for testing or non-FCM notifications)
 */
export function showLocalNotification(title, options = {}) {
  if (Notification.permission !== 'granted') {
    return null;
  }
  
  return new Notification(title, {
    icon: '/assets/icons/icon-192.svg',
    badge: '/assets/icons/icon-192.svg',
    tag: 'homeshow-local',
    ...options
  });
}

/**
 * Check if user has enabled notifications and get current status
 */
export function getNotificationStatus() {
  const supported = isNotificationSupported();
  const permission = getNotificationPermission();
  const hasToken = !!currentToken;
  
  return {
    supported,
    permission,
    hasToken,
    enabled: permission === 'granted' && hasToken
  };
}

export default {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  getFCMToken,
  saveTokenToFirestore,
  onForegroundMessage,
  showLocalNotification,
  getNotificationStatus
};
