# Push Notifications Setup Guide

This document explains how to configure Firebase Cloud Messaging (FCM) for push notifications in the HomeShow app.

## Overview

Push notifications allow you to:
- Alert attendees about schedule changes
- Notify vendors about new leads
- Send announcements during the event
- Remind users about upcoming sessions

## Setup Steps

### 1. Enable Cloud Messaging in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `putnam-county-home-show-130cb`
3. Navigate to **Project Settings** (gear icon) > **Cloud Messaging**
4. Under "Web Push certificates", click **Generate key pair**
5. Copy the generated **VAPID key** (public key)

### 2. Configure VAPID Key in the App

In `index.html`, uncomment and set the VAPID key:

```html
<script>
  // ... existing Firebase config ...
  
  // FCM VAPID Key for push notifications
  window.FCM_VAPID_KEY = 'YOUR_VAPID_KEY_HERE';
</script>
```

### 3. How It Works

**User Flow:**
1. User visits **Profile** page (More tab)
2. Clicks "Enable" button in Notifications section
3. Browser prompts for notification permission
4. If granted, FCM token is generated and saved to Firestore

**Token Storage:**
- Tokens are stored in `fcmTokens/{userId}` collection
- Each user document has an array of tokens (for multiple devices)

### 4. Sending Notifications

#### From Firebase Console (Testing)
1. Go to Firebase Console > **Cloud Messaging**
2. Click **Send your first message**
3. Enter notification title and body
4. Target: User segment or test on device

#### Programmatically (Production)
Use Firebase Admin SDK from a Cloud Function:

```javascript
const admin = require('firebase-admin');

async function sendNotification(userId, title, body, data = {}) {
  // Get user's FCM tokens
  const tokensDoc = await admin.firestore()
    .collection('fcmTokens')
    .doc(userId)
    .get();
  
  if (!tokensDoc.exists) return;
  
  const tokens = tokensDoc.data().tokens || [];
  
  if (tokens.length === 0) return;
  
  // Send to all user's devices
  await admin.messaging().sendMulticast({
    tokens,
    notification: { title, body },
    data,
    webpush: {
      fcmOptions: {
        link: 'https://your-app-url.netlify.app/'
      }
    }
  });
}
```

### 5. Notification Types (Suggested)

| Event | Title | Body Example |
|-------|-------|--------------|
| New Lead | "New Lead!" | "John Smith scanned your booth" |
| Schedule Change | "Schedule Update" | "Workshop moved to 2:00 PM" |
| Vendor Approved | "Welcome!" | "Your vendor registration is approved" |
| Payment Received | "Payment Confirmed" | "We received your booth payment" |
| Event Reminder | "Starting Soon" | "HomeShow opens in 1 hour!" |

### 6. Service Worker Handling

The `sw.js` service worker handles:
- Background push events (when app is closed)
- Notification click actions
- Opening the app when notification is tapped

### 7. Testing

**Local Testing:**
1. Run `netlify dev` to start local server
2. Enable notifications in Profile
3. Use Firebase Console to send test message
4. Check browser console for `[FCM]` logs (dev only)

**Debug Mode:**
Set `window.DEBUG = true` before app loads to see FCM logs.

### 8. Troubleshooting

**"No VAPID key configured"**
- Ensure `window.FCM_VAPID_KEY` is set in `index.html`

**"Messaging not supported"**
- Browser doesn't support Web Push (Safari < 16.4, some mobile browsers)

**"Permission denied"**
- User blocked notifications; they must re-enable in browser settings

**Token not saving**
- Check Firestore rules allow writing to `fcmTokens` collection

### 9. Firestore Security Rules

Add this rule to allow token storage:

```
match /fcmTokens/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

## Files Involved

- `js/utils/notifications.js` - FCM utility functions
- `js/views/More.js` - Settings UI with enable button  
- `js/app.js` - Foreground message listener
- `sw.js` - Background push handler
- `index.html` - VAPID key configuration
