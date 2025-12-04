## Quick orientation for AI coding agents

This is a small, static single-page web app (no bundler) deployed as a static site (Netlify). The app uses plain ES modules and the Firebase Web CDN (modular v12). Below are the minimal, repo-specific facts and conventions that make contributions safe and productive.

- App entry: `index.html` and `js/app.js` boot the app. The router lazy-loads views from `js/views/*` using dynamic `import()` (see `js/router.js`). Views export a default function invoked as `default(container, params)`.
- State: lightweight homegrown store in `js/store.js`. Use `hydrateStore()` and `subscribe()` when simulating or triggering app state changes.
- Firebase: `js/firebase.js` wraps the modular CDN SDK. The app expects runtime configuration via the global `window.FIREBASE_CONFIG` (or an initialized Firebase app in the page). Important flags:
  - `window.USE_FIREBASE_EMULATORS = true` — instructs `js/firebase.js` to connect to local emulators (only honored when running on localhost).
  - `window.FORCE_SIMPLE_UPLOAD = true` — forces non-resumable storage uploads (useful to avoid CORS preflight problems).
  - `window.STORAGE_ATTENDEE_LAYOUT` — controls attendee storage path layout (see `uploadImage` comments in `js/firebase.js`).
  - `window.ADMIN_EMAILS` — runtime override for admin emails (falls back to `js/config.js`).

- Deployment / local dev:
  - No build step. The site is published from repository root. See `README.md` for Netlify deploy instructions.
  - Quick local preview: `netlify dev` (requires `netlify-cli`). Alternatively serve `index.html` from any static server.

- Auth/admin patterns:
  - Admins are determined by `isAdminEmail()` which checks `js/config.js` (`ADMIN_EMAILS`) first, then the `adminEmails` Firestore collection.
  - Protect admin functionality by verifying `isAdminEmail(email)` and Firestore security rules (see `docs/FIREBASE_SETUP.md`).

- Common pitfalls and how to handle them:
  - CORS on Firebase Storage uploads — `uploadImage()` contains a resumable upload then falls back to a simple upload. When debugging failed uploads, try `window.FORCE_SIMPLE_UPLOAD = true` and re-run.
  - Missing Firebase config — tests or local runs can set `window.FIREBASE_CONFIG` before app boot or set `USE_FIREBASE_EMULATORS` and run emulators.
  - Views are dynamically imported by filename matched in `js/router.js` (e.g., route `/vendors` -> `views/Vendors.js`). When adding routes, ensure the view file name matches the router mapping.

- Code patterns to follow (observable in repo):
  - Minimal DOM-focused components: views receive a container element and must render into it instead of returning markup strings.
  - Prefer using exported helpers from `js/firebase.js` for DB/storage/auth operations (e.g., `fetchApprovedVendors()`, `createLead()`) rather than re-implementing Firestore calls.
  - Use `getState()` / `hydrateStore()` from `js/store.js` when creating components that depend on persisted app state.

- Useful files to reference when implementing changes:
  - `README.md` — deploy and local dev instructions (Netlify).
  - `js/router.js` — route → view mapping and dynamic import behavior.
  - `js/firebase.js` — Firebase init, emulators, upload behavior, and high-level helpers.
  - `js/config.js` — default admin email(s) and where runtime overrides are supported.
  - `_redirects` and `netlify.toml` — SPA routing and Netlify configuration.

Examples (how to emulate runtime flags before boot):

```html
<!-- in index.html before loading js/app.js -->
<script>
  window.FIREBASE_CONFIG = { /* paste your Firebase config */ };
  window.USE_FIREBASE_EMULATORS = true; // local dev
  window.FORCE_SIMPLE_UPLOAD = true;   // debug storage CORS
  window.ADMIN_EMAILS = ['you@example.com'];
</script>
```

When changing behavior that affects production (auth, uploads, DB schema), prefer adding feature-flag guarded code or explicit runtime flags rather than changing global defaults.

If you want me to extend this with examples of typical small tasks (add a route + view, wire a new Firestore collection, or implement a storage upload flow), tell me which task and I will update this file with concrete, minimal code edits.
