# Firebase Storage CORS setup

When uploading directly from the browser using the Firebase Storage Web SDK, the resumable upload starts with a POST that includes the `x-goog-resumable: start` header and triggers a preflight (OPTIONS). If your bucket has a strict CORS config, you must allow your app’s origin, methods, and headers or the browser will report a CORS/preflight error.

If you never set CORS on the bucket before, you can either:
- Leave CORS empty (Firebase SDK generally works without a custom CORS config), or
- Apply the config below to explicitly allow your Netlify site and dev origins.

## Recommended CORS JSON

Allow your production Netlify site, Netlify preview deploys, and localhost for dev. Include the headers Firebase uses for resumable uploads.

```json
[
  {
    "origin": [
      "https://scintillating-youtiao-b7581b.netlify.app",
      "https://*.netlify.app",
      "http://localhost:3000",
      "http://localhost:8888"
    ],
    "method": ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Authorization",
      "x-goog-resumable",
      "x-goog-meta-*"
    ],
    "maxAgeSeconds": 3600
  }
]
```

Notes
- `x-goog-resumable` is required for resumable upload initiation.
- `Content-Type` is required when sending blobs/files.
- `Authorization` covers authenticated requests.
- `x-goog-meta-*` enables optional custom metadata headers if you add them later.

## Apply in Google Cloud Console
1) Open Google Cloud Console > Cloud Storage > Buckets.
2) Select `putnam-county-home-show-130cb.appspot.com`.
3) Go to the Configuration tab.
4) Find the CORS section and click Edit.
5) Paste the JSON above and Save.

## Apply via gsutil (optional)
If you have the gcloud SDK installed:

1) Save the JSON above to a file, e.g. `cors.json`.
2) Run:

```powershell
# Authenticate (if needed)
gcloud auth login

# Set the CORS on the Firebase Storage bucket
gsutil cors set cors.json gs://putnam-county-home-show-130cb.appspot.com

# Verify
gsutil cors get gs://putnam-county-home-show-130cb.appspot.com
```

## Also ensure Anonymous Auth is enabled
The app will sign users in anonymously before uploading if they’re not already signed in. In Firebase Console > Authentication > Sign-in method, toggle “Anonymous” to Enabled.

After updating CORS and ensuring Anonymous is enabled, hard refresh your app and try uploading again.
