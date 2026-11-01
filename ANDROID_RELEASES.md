# Mobile APK upload contract

The mobile repository stays private. Its own GitHub Actions workflow selects a
published release, retrieves the signed APK, and uploads it to private R2.
The homepage's Pages Function makes only the selected APK publicly downloadable.

## Destination

| Setting | Value |
| --- | --- |
| R2 bucket | `cozie-downloads` |
| S3 endpoint | `https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com` |
| Region | `auto` |
| APK key | `android/releases/<version>/cozie-<version>.apk` |
| Latest manifest key | `android/latest.json` |
| Public download | `https://cozie.pages.dev/download/android` |
| Public metadata | `https://cozie.pages.dev/api/android-release` |
| Pages R2 binding | `ANDROID_RELEASES` |

Do not enable public bucket access or use an expiring presigned URL for the QR.
The QR encodes the fixed public download endpoint. Updating `android/latest.json`
changes the download immediately without changing the QR or redeploying Pages.

## Manifest

Example structure; compute the real size and SHA-256 from the signed APK:

```json
{
  "version": "1.0.0",
  "key": "android\/releases\/1.0.0\/cozie-1.0.0.apk",
  "filename": "cozie-1.0.0.apk",
  "size": 123456789,
  "sha256": "0000000000000000000000000000000000000000000000000000000000000000",
  "publishedAt": "2026-11-01T12:00:00Z"
}
```

The version must be semantic (an optional `v` prefix and prerelease/build suffix
are accepted). The filename must match the APK key's last component. The size
must be the exact byte count; SHA-256 must be 64 lowercase hexadecimal digits.
Use the GitHub release's publication timestamp for `publishedAt`.

## Changes for lab_mobile

Add the R2 upload steps to the existing `mobile-build.yml` release job, after
`python3 tool/ci/release.py publish` succeeds. This is also compatible with a
separate scheduled reconciliation job or a manually dispatched workflow.

The current publisher creates staging prereleases, so include published
prereleases when selecting the latest release; exclude drafts. Select by
`published_at`, then use the `.apk` asset. Do not use the GitHub REST
`releases/latest` endpoint, which excludes prereleases. Fail clearly if the APK
selection is ambiguous.

Do not rely only on a separate `release: published` workflow: releases created
with the workflow's `GITHUB_TOKEN` do not start another ordinary event workflow.
Putting the upload in the existing release job avoids a cross-repository token.

Configure these Actions secrets in `lab_mobile`:

- `CLOUDFLARE_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Map the S3 credentials to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, and
set `AWS_DEFAULT_REGION=auto`. Use R2 credentials with object read/write access
to `cozie-downloads`. S3 credentials remain exclusively in Actions.

Publication order:

1. Resolve the newest published release and download its signed APK.
2. Compute the APK's SHA-256 and exact byte count.
3. Upload the APK to its versioned key with content type
   `application/vnd.android.package-archive`, attachment disposition, and custom
   metadata `sha256=<computed digest>`.
4. Check the uploaded object's size and SHA-256 metadata.
5. Upload the manifest to `android/latest.json` with content type
   `application/json` and cache control `no-store`.
6. Check public metadata and HEAD the public download URL. Its content length,
   `X-Cozie-Version`, and `X-Cozie-SHA256` must match the manifest.

Never replace the latest manifest before the APK is fully uploaded. Keep
versioned APKs immutable. For rollback, restore a known-good manifest.

Before the first APK is uploaded, the public endpoints return HTTP 503 and the
homepage Actions summary says that the first release is pending.
