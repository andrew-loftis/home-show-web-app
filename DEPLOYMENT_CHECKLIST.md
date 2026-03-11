# Production Deployment Checklist

## ✅ Pre-Deployment Readiness

### 1. Firebase Configuration

#### Firebase Console Setup
- [ ] **Authentication Providers**
  - [x] Google Sign-In enabled
  - [x] Email/Password enabled
  - [x] Anonymous sign-in enabled
  - [ ] **Authorized domains**: Add your production domain (e.g., `winnpro-shows.app`, `*.netlify.app`)

- [ ] **Firestore Database**
  - [ ] Deploy production-ready security rules (`firestore.rules`)
  - [ ] Create indexes from `firestore.indexes.json` (or let auto-indexing run)
  - [ ] Test rules with emulator or console
  
- [ ] **Storage**
  - [ ] Deploy storage rules (`storage.rules`)
  - [ ] Configure CORS for storage bucket (see `docs/STORAGE_CORS.md`)
  - [ ] Test image uploads
  
- [ ] **Cloud Messaging (Optional - for push notifications)**
  - [ ] Generate Web Push certificate (VAPID key)
  - [ ] Add VAPID key to `index.html` (uncomment `window.FCM_VAPID_KEY`)
  - [ ] Register service worker for push

#### Firebase in index.html
- [x] Firebase config in `index.html` is set (currently configured for test project)
- [ ] **For production**: Replace with production Firebase config

```javascript
// Current config in index.html (lines 36-43)
const firebaseConfig = {
  apiKey: "YOUR_PRODUCTION_API_KEY",
  authDomain: "your-production-project.firebaseapp.com",
  projectId: "your-production-project",
  storageBucket: "your-production-project.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Netlify Environment Variables

Configure these in **Netlify Dashboard** > **Site Settings** > **Environment Variables**:

#### Required (Stripe Payments)
- [ ] `STRIPE_SECRET_KEY` - Your live Stripe secret key (starts with `sk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (from Stripe Dashboard)
- [ ] `SITE_URL` - Your production site URL (e.g., `https://winnpro-shows.app`)

#### Required (Firebase Admin - for serverless functions)
- [ ] `FIREBASE_PROJECT_ID` - Your Firebase project ID
- [ ] `FIREBASE_CLIENT_EMAIL` - Service account email
- [ ] `FIREBASE_PRIVATE_KEY` - Service account private key (wrap in quotes)
  - OR: `FIREBASE_SERVICE_ACCOUNT` - Full JSON service account key

**How to get Firebase service account:**
1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file
4. Either:
   - Extract individual values (`project_id`, `client_email`, `private_key`)
   - OR: Stringify entire JSON and set as `FIREBASE_SERVICE_ACCOUNT`

#### Required (Email Notifications)
- [ ] `SENDGRID_API_KEY` - SendGrid API key for transactional emails
- [ ] `FROM_EMAIL` - Your verified sender email (e.g., `noreply@winnpro-shows.app`)
- [ ] `APP_NAME` - Display name in emails (e.g., "WinnPro Shows")
- [ ] `APP_URL` - Your site URL (for email links)

#### Required (Admin Access)
- [ ] `ADMIN_EMAILS` - Comma-separated list of admin emails (e.g., `admin@winnpro.com,manager@winnpro.com`)

### 3. Stripe Configuration

#### Stripe Dashboard Setup
- [ ] Switch from Test mode to Live mode
- [ ] Add product/pricing (or use dynamic pricing in functions)
- [ ] **Configure Webhook Endpoint**:
  1. Go to Stripe Dashboard > Developers > Webhooks
  2. Add endpoint: `https://your-site.netlify.app/.netlify/functions/stripe-webhook`
  3. Select events to listen for:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `invoice.paid`
     - `invoice.payment_failed`
  4. Copy the webhook signing secret and set as `STRIPE_WEBHOOK_SECRET` in Netlify

- [ ] Test webhook with Stripe CLI (optional):
  ```bash
  stripe listen --forward-to https://your-site.netlify.app/.netlify/functions/stripe-webhook
  stripe trigger checkout.session.completed
  ```

### 4. SendGrid Email Setup

- [ ] Create SendGrid account (free tier available)
- [ ] Verify sender identity (domain or single sender)
- [ ] Create API key with "Mail Send" permission
- [ ] Add API key to Netlify environment variables
- [ ] Test email sending via function:
  ```bash
  curl -X POST https://your-site.netlify.app/.netlify/functions/send-email \
    -H "Content-Type: application/json" \
    -d '{"to":"test@example.com","template":"welcome","data":{}}'
  ```

### 5. DNS & Domain Configuration

- [ ] **Custom Domain** (if using):
  - [ ] Point DNS to Netlify
  - [ ] Enable HTTPS (automatic with Netlify)
  - [ ] Force HTTPS redirects

- [ ] **Firebase Authorized Domains**:
  - [ ] Add custom domain to Firebase Console > Authentication > Settings > Authorized domains

### 6. Code & Content Review

- [ ] Review and update hardcoded URLs in:
  - [ ] `js/utils/payments.js` - Success/cancel URLs
  - [ ] `netlify/functions/create-checkout.js` - SITE_URL fallback
  - [ ] Email templates in `netlify/functions/send-email.js`

- [ ] Update contact/support emails:
  - [ ] Search for `support@example.com` and replace with real support email
  - [ ] Check `VendorDashboard.js` line 103

- [ ] Review admin email configuration:
  - [ ] `js/config.js` - ADMIN_EMAILS array
  - [ ] Firestore `adminEmails` collection (runtime override)

- [ ] Test all critical paths:
  - [ ] Vendor registration flow
  - [ ] Payment checkout
  - [ ] Card swapping (lead generation)
  - [ ] Admin dashboard access
  - [ ] Multi-show filtering

### 7. Security & Performance

- [ ] **Firestore Security Rules** - Ensure production-ready:
  ```javascript
  // Verify rules prevent:
  // 1. Unauthorized admin access
  // 2. Data modification by non-owners
  // 3. Sensitive data exposure
  ```

- [ ] **Storage Security Rules** - Restrict uploads:
  ```javascript
  // Verify:
  // 1. Max file size limits
  // 2. Authenticated uploads only
  // 3. Content type restrictions
  ```

- [ ] **API Rate Limiting** - Consider adding to Netlify Functions

- [ ] **Content Security Policy** - Review CSP headers in `netlify.toml`

- [ ] **Analytics** - Set up (optional):
  - [ ] Google Analytics
  - [ ] Firebase Analytics
  - [ ] Netlify Analytics

### 8. Testing Before Go-Live

#### Manual Testing Checklist
- [ ] **User Flows**:
  - [ ] Sign up (Google, Email, Anonymous)
  - [ ] Create attendee card
  - [ ] Save vendor as favorite
  - [ ] Swap cards with vendor
  - [ ] Vendor registration (all steps)
  - [ ] Vendor dashboard (approved state)
  - [ ] Payment flow (test mode first!)
  - [ ] Admin dashboard access
  - [ ] Multi-show selection

- [ ] **Cross-Browser Testing**:
  - [ ] Chrome/Edge (desktop & mobile)
  - [ ] Safari (desktop & iOS)
  - [ ] Firefox (desktop & mobile)

- [ ] **Responsive Design**:
  - [ ] Mobile (320px+)
  - [ ] Tablet (768px+)
  - [ ] Desktop (1024px+)

- [ ] **Performance**:
  - [ ] Lighthouse score (aim for 90+ on all metrics)
  - [ ] Page load time < 3s
  - [ ] Image optimization
  - [ ] Bundle size check

#### Automated Testing (if implemented)
- [ ] Run test suite
- [ ] Check console for errors
- [ ] Verify no broken links

### 9. Monitoring & Alerts

- [ ] **Netlify Monitoring**:
  - [ ] Deploy notifications (webhook or email)
  - [ ] Function execution monitoring
  - [ ] Error tracking

- [ ] **Firebase Monitoring** (optional):
  - [ ] Enable Crashlytics
  - [ ] Set up performance monitoring
  - [ ] Configure alerts for:
    - Auth failures spike
    - Database writes spike
    - Storage quota approaching limit

- [ ] **Stripe Alerts**:
  - [ ] Failed payment notifications
  - [ ] Webhook delivery failures
  - [ ] Radar alerts (fraud detection)

### 10. Documentation & Training

- [ ] **Admin Documentation**:
  - [ ] How to approve vendors
  - [ ] How to manage shows
  - [ ] How to create invoices
  - [ ] How to handle support requests

- [ ] **Vendor Onboarding Guide**:
  - [ ] Registration instructions
  - [ ] Payment process
  - [ ] How to access dashboard
  - [ ] Lead management

- [ ] **Support Resources**:
  - [ ] FAQ page
  - [ ] Contact email
  - [ ] Support workflow

---

## 🚀 Deployment Steps

### Pre-Deployment (Test Mode)
1. Deploy to Netlify staging site
2. Use Stripe test keys
3. Run through all test scenarios
4. Verify emails are sending
5. Check Firestore data is saving correctly

### Production Deployment
1. **Switch to production keys**:
   - Update Netlify environment variables with live Stripe keys
   - Update Firebase config if using separate prod project
   
2. **Deploy to production**:
   ```bash
   # Via Git (recommended)
   git push origin main
   
   # OR via Netlify CLI
   netlify deploy --prod --dir .
   ```

3. **Verify deployment**:
   - [ ] Site loads correctly
   - [ ] Firebase authentication works
   - [ ] Vendor registration saves to Firestore
   - [ ] Payment flow redirects (test with small amount if possible)
   - [ ] Webhook receives events from Stripe
   - [ ] Emails are delivered

4. **Post-deployment monitoring** (first 24-48 hours):
   - [ ] Watch Netlify function logs
   - [ ] Monitor Stripe webhook delivery
   - [ ] Check Firebase usage/quotas
   - [ ] Review error logs

---

## ⚠️ Known Issues & Workarounds

### Payment System
- **Status**: ✅ Fully implemented
- **Components**:
  - ✅ Checkout session creation
  - ✅ Invoice generation
  - ✅ Webhook handling
  - ✅ Firestore payment status updates
  - ✅ Email notifications
- **Requires**: Environment variables configured (see Section 2)

### Webhook Signature Verification
- **Status**: ⚠️ Optional (enabled if `STRIPE_WEBHOOK_SECRET` is set)
- **For production**: MUST set `STRIPE_WEBHOOK_SECRET`
- **Fallback**: Webhook will work without signature but less secure

### Email Delivery
- **Status**: ✅ Implemented with SendGrid
- **Templates available**:
  - Welcome email
  - Payment confirmation
  - Admin notifications
  - Password reset
  - Vendor approval
  - Lead notifications
- **Requires**: Valid SendGrid API key and verified sender

### Firebase Admin SDK in Functions
- **Status**: ✅ Implemented
- **Requires**: Service account credentials in environment variables
- **Fallback**: Functions gracefully degrade if Firebase unavailable

---

## 📊 Current Status Summary

### ✅ Complete & Production-Ready
- ✅ Vendor onboarding (visual booth selection, multi-step wizard)
- ✅ Digital business card creation and swapping
- ✅ Lead generation and management
- ✅ Admin dashboard (vendor approval, user management, show management)
- ✅ Multi-show support with Firestore backend
- ✅ Payment integration (Stripe Checkout & Invoices)
- ✅ Webhook handling for payment events
- ✅ Email notification system
- ✅ Authentication (Google, Email, Anonymous)
- ✅ Responsive design (mobile-first)
- ✅ PWA support (installable, offline-capable via service worker)
- ✅ Firebase emulator support (local development)

### ⚠️ Requires Configuration
- ⚠️ Environment variables (Stripe, Firebase, SendGrid)
- ⚠️ Firebase security rules deployment
- ⚠️ Stripe webhook configuration
- ⚠️ Custom domain setup (optional)

### 🔄 Optional Enhancements (Post-Launch)
- Analytics implementation
- Push notifications (FCM)
- Mobile app builds (Capacitor - already configured)
- Advanced reporting
- A/B testing
- SEO optimization
