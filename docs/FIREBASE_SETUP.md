# Firebase setup and data model

This app is a static, modular Firebase (v12) web app loaded from CDN. It already initializes Firebase in `index.html` and observes auth in `js/store.js`. This guide turns on real Auth and Firestore, defines collections, and gives security rules and indexes.

## What’s already wired
- `index.html` initializes Firebase with your project config and exposes `window.FIREBASE_CONFIG`.
- `js/firebase.js` wraps the modular SDK and provides:
  - `initFirebase()`, `observeAuth()`, `signInWithGoogle()`, `signOutUser()`
  - Firestore helpers: `loadUserPreferences()`, `saveUserPreferences()`, `fetchApprovedVendors()`
  - Additional scaffolding helpers for attendees, vendors, and leads (see file for full list)
- `js/store.js` listens to auth and persists a `user` object in local state.

## Enable Firebase products
1) Authentication
- Providers: Google (for quick sign-in), Email/Password (optional), Anonymous (recommended for attendees who don’t want to fully sign in yet).
- Add your domain(s) to Authorized domains.

2) Firestore database
- Mode: Production (rules required). Optionally use the Emulator for local dev.

3) Storage (optional for later)
- For profile images, vendor cards, and uploads. Can be added later; rules are included below as a start.

## Collections and documents
We’ll start with four top-level collections. You can add subcollections later for denormalized reads.

- users/{uid}
  - role: "attendee" | "vendor" | "organizer"
  - vendorId?: string (if this user controls a vendor)
  - preferences?: { theme: "light"|"dark", ... }
  - createdAt, updatedAt (server timestamps)

- vendors/{vendorId}
  - name, category, booth, contactEmail, contactPhone, logoUrl
  - approved: boolean (public directory visibility)
  - verified: boolean (internal signal)
  - ownerUid: string (user id who can edit this vendor)
  - profile: { backgroundImage, profileImage, homeShowVideo, description, specialOffer, businessCardFront, businessCardBack, bio, selectedSocials: string[], ... }
  - boothCoordinates: { x: number, y: number }
  - createdAt, updatedAt

- attendees/{attendeeId}
  - ownerUid: string (auth uid; supports anonymous auth)
  - name, email, phone, zip, interests: string[]
  - qrData, shortCode (for scans), consentEmail, consentSMS
  - savedBusinessCards: string[] (vendor ids)
  - card: { profileImage, backgroundImage, familySize, visitingReasons: string[], bio, location }
  - createdAt, updatedAt

- leads/{leadId}
### Booths collection
- booths/{boothId}
  - number: string (e.g., A12)
  - size: string (e.g., 8x8, 8x16)
  - label?: string (e.g., Corner L)
  - price: number
  - status: 'available' | 'reserved' | 'sold' | 'held'
  - vendorId?: string (assigned vendor id)
  - createdAt, updatedAt

Rules snippet (admins manage stock):
```
match /booths/{boothId} {
  allow read: if true;
  allow create, update, delete: if isAdmin();
}
```
  - attendeeId, vendorId
  - createdAt (server timestamp), timestamp (number) [redundant but used in UI]
  - exchangeMethod: "card_share" | "manual"
  - notes?: string
  - emailSent?: boolean, cardShared?: boolean
  - createdByUid: string (who wrote it: vendor owner or attendee owner)

Notes:
- You can also mirror leads under vendor or attendee subcollections for faster reads, but start with a single `leads` collection and add composite indexes.

## Security rules (Firestore)
Paste into Firestore rules. These are strict, map to current code, and use the `adminEmails` collection for admin privileges. Bootstrap your first admin by creating a document in `adminEmails/{your-email}` via the Firebase Console, then manage others from the in-app Admin panel.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null && request.auth.uid != null; }
    // Admins are users whose email exists as a document ID in adminEmails
    // Note: our app stores admin emails lowercased; most providers return lowercased emails.
    function isAdmin() { return isSignedIn() && exists(/databases/$(database)/documents/adminEmails/$(request.auth.token.email)); }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    // Admin registry
    match /adminEmails/{emailId} {
      // Only admins can read the list and modify it
      allow read: if isAdmin();
      allow create, update, delete: if isAdmin();
    }

    // Users: owners can read; owners can update safe fields; only admins can set role=organizer
    match /users/{uid} {
      allow read: if isOwner(uid) || isAdmin();
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) && (
        // Prevent privilege escalation: role cannot change to organizer unless caller is admin
        (request.resource.data.role == resource.data.role) ||
        (isAdmin())
      );
    }

    // Vendors directory
    match /vendors/{vendorId} {
      // Public can read approved vendors; vendor owners and admins can read all
      allow read: if resource.data.approved == true ||
                  (isSignedIn() && (
                    get(/databases/$(database)/documents/vendors/$(vendorId)).data.ownerUid == request.auth.uid ||
                    isAdmin()
                  ));
      // Create if setting yourself as owner; admins can also create
      allow create: if isSignedIn() && (
        request.resource.data.ownerUid == request.auth.uid || isAdmin()
      );
      // Update/delete by owner or admin
      allow update, delete: if isSignedIn() && (
        request.auth.uid == resource.data.ownerUid || isAdmin()
      );
    }

    // Attendees: owner-only; allow create when ownerUid == self
    match /attendees/{attendeeId} {
      allow read, update, delete: if isSignedIn() && request.auth.uid == resource.data.ownerUid;
      allow create: if isSignedIn() && request.resource.data.ownerUid == request.auth.uid;
    }

    // Leads: visible to the attendee owner and the vendor owner; writable by either party who is the creator
    match /leads/{leadId} {
      allow read: if isSignedIn() && (
        (
          exists(/databases/$(database)/documents/attendees/$(resource.data.attendeeId)) &&
          get(/databases/$(database)/documents/attendees/$(resource.data.attendeeId)).data.ownerUid == request.auth.uid
        ) || (
          exists(/databases/$(database)/documents/vendors/$(resource.data.vendorId)) &&
          get(/databases/$(database)/documents/vendors/$(resource.data.vendorId)).data.ownerUid == request.auth.uid
        ) || isAdmin()
      );
      allow create, update: if isSignedIn() && (
        request.resource.data.createdByUid == request.auth.uid && (
          (exists(/databases/$(database)/documents/attendees/$(request.resource.data.attendeeId)) &&
           get(/databases/$(database)/documents/attendees/$(request.resource.data.attendeeId)).data.ownerUid == request.auth.uid) ||
          (exists(/databases/$(database)/documents/vendors/$(request.resource.data.vendorId)) &&
           get(/databases/$(database)/documents/vendors/$(request.resource.data.vendorId)).data.ownerUid == request.auth.uid)
        )
      ) || isAdmin();
    }

    // Default deny
    match /{document=**} { allow read, write: if false; }
  }
}
```

### Admin bootstrap
- First time only: in Firestore, create `adminEmails` collection and add a doc with ID equal to your admin email (e.g., `you@example.com`).
- After that, use the in-app Admin panel (Profile > Admin Tools) to add/remove emails.

## Composite indexes (Firestore)
Add these to support UI queries efficiently:
- leads: where vendorId == X order by createdAt desc
- leads: where attendeeId == X order by createdAt desc
- vendors: where approved == true (automatic single-field index ok)

If prompted by Firestore, it will give you a one-click link to create the index. For reference, the JSON looks like:

```
{
  "indexes": [
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "vendorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "leads",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "attendeeId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Storage rules (optional for later)
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isSignedIn() { return request.auth != null; }
    match /users/{uid}/{allPaths=**} {
      allow read: if true; // or owner-only
      allow write: if isSignedIn() && request.auth.uid == uid;
    }
    match /vendors/{vendorId}/{allPaths=**} {
      allow read: if true; // public assets
      allow write: if isSignedIn(); // tighten to vendor owner with Firestore lookup when needed
    }
  }
}
```

## Local development with emulators (optional)
If you use the Firebase CLI:

- Install CLI (admin rights may be required once):
```powershell
npm install -g firebase-tools
```

- Login and init (inside the project folder):
```powershell
firebase login
firebase init emulators
```
Choose Firestore and Authentication emulators. Then run:
```powershell
firebase emulators:start
```
Update `js/firebase.js` to connect to emulators by calling `connectAuthEmulator` and `connectFirestoreEmulator` when on localhost. A toggle is already supported via `window.USE_FIREBASE_EMULATORS = true`.

## Next steps to go live in the app
1) Vendor identity
- Decide how vendors authenticate: organizer invites/adds vendor accounts (ownerUid) OR a signed-in user submits a vendor doc that an organizer approves and sets `ownerUid`.

2) Persist real data
- Replace local writes in `store.js` with Firestore writes using the helpers in `js/firebase.js`:
  - attendee profile -> attendees collection
  - vendor edits -> vendors doc (owner only)
  - card share / manual scan -> create lead doc

3) Admin approval screen
- Implement approvals list: show vendors where `approved == false`; organizer sets `approved = true`.

4) QR scanning / attendee lookup
- When a vendor scans a `shortCode`, look up attendees where `shortCode == code`; then create a lead.

---

Keep this doc updated as we evolve roles, approvals, and data flows.

## Stripe webhook -> Firestore payment sync
To automatically mark vendors as paid when Stripe invoices are paid, the Netlify Function `stripe-webhook.js` listens for `invoice.payment_succeeded` and updates `vendors/{vendorId}`. Configure these environment variables in Netlify Site settings:

- STRIPE_SECRET_KEY: Your Stripe secret key
- STRIPE_WEBHOOK_SECRET: The webhook signing secret from your Stripe endpoint
- FIREBASE_PROJECT_ID: Firebase project id
- FIREBASE_CLIENT_EMAIL: Service account client email
- FIREBASE_PRIVATE_KEY: Service account private key (paste with escaped newlines, Netlify will pass as `\n`)

Notes
- The create-invoice function sets `metadata.vendorId` on the invoice, which the webhook uses to identify which vendor to update.
- The webhook writes the following fields on success: `paymentStatus: 'paid'`, `paid: true`, `paymentPaidAt`, `lastInvoiceId`, `lastInvoiceStatus`, `paymentProvider: 'stripe'`, and `invoicePaidAmount`.
- On failure/void/uncollectible events, it updates `paymentStatus: 'not_paid'` and `lastInvoiceStatus` accordingly.
