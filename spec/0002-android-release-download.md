# Android release downloads

Status: superseded by [spec 0003](./0003-public-release-downloads.md).
R2 was rejected because account activation requires billing setup.
The following is the historical design and is no longer deployed.

## Objective

Replace the homepage scan placeholder with a working QR code for the newest
published Android APK without requiring visitors to authenticate to GitHub.
Keep Cloudflare administration and deployment in GitHub Actions.

## Storage and publisher contract

Use the private R2 bucket `cozie-downloads`, bound to Pages Functions as
`ANDROID_RELEASES`. The mobile repository owns release selection and upload
using its own Actions GitHub token and R2 S3 credentials.

After a GitHub release is published, including staging prereleases, its Actions
workflow uploads the APK to an immutable key:
`android/releases/<version>/cozie-<version>.apk`.
It then replaces `android/latest.json` only after the APK upload and integrity
check succeed. The manifest contains `version`, `key`, `filename`, `size`,
`sha256`, and `publishedAt`. Versioned files must not be overwritten.

No private GitHub URL, expiring signed URL, or storage credentials are encoded in
the QR code. Publishing the first mobile release is an upstream prerequisite
for a successful APK download; the homepage must not manufacture a release.

## Homepage and download endpoint

Generate an SVG QR code in the build, using the actual Pages production URL
and the stable path `/download/android`. Keep the existing scan frame, layout,
and text, and make the QR code a keyboard-accessible download link.

The download Function reads and validates the latest manifest, then streams
the referenced APK from R2 with an attachment filename and APK content type.
It supports GET and HEAD, returns 503 before the first upload, and prevents
unrelated bucket objects from being served. It never buffers the complete APK.
The response is not cached so a new manifest takes effect immediately.

Expose public release metadata at `/api/android-release` for Actions checks.
After each deployment and on a schedule, Actions checks this metadata and the
download response. An empty bucket is reported as awaiting the first release;
inconsistent manifests or broken published downloads fail verification.

## Verification

Test manifest validation, unpublished and invalid releases, GET/HEAD download
behavior, and response headers. Decode a generated QR code to verify its URL.
Run the build and workflow lint, then inspect the actual Cloudflare deployment
and production endpoints. Do not change `lab_mobile` or its release workflow
as part of the homepage implementation; provide the upload contract separately.
