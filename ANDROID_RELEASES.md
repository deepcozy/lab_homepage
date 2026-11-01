# Public Android release contract

The mobile repository stays private. Its publisher uploads only the signed APK
to GitHub Releases in the public `deepcozy/lab_homepage` repository. No R2 or
Cloudflare credentials are needed by the mobile publisher.

## Publication

1. Build and verify the signed APK in `lab_mobile` Actions.
2. Create a draft release in `deepcozy/lab_homepage`, tagged
   `android-v<version>` (for example `android-v0.0.3`).
3. Upload the complete signed file as `cozie.apk` and verify the uploaded asset.
4. Publish the draft only after the asset upload succeeds. Prereleases are
   supported and are included in homepage selection.

Use immutable versioned releases. Do not commit APK binaries or private mobile
source to the homepage repository. If several architecture APKs are published,
`cozie.apk` must be the intended universal APK. Without that name, the homepage
requires exactly one uploaded `.apk` asset; ambiguous selections fail.

## Authorization

Use a fine-grained PAT or GitHub App installation token restricted to the
homepage repository with Contents read/write. Store it in the mobile repository
as `HOMEPAGE_RELEASE_TOKEN`, scoped to the publication step. Keep the normal
mobile `GITHUB_TOKEN` for mobile repository operations. The token must not be
committed, printed, sent to browsers, or shared with Cloudflare.

A release published with a PAT or GitHub App token triggers homepage Actions.
A release created using `GITHUB_TOKEN` may not trigger another workflow. The
homepage's scheduled reconciliation also catches missed events and assets
uploaded after publication. If needed, the publisher can explicitly dispatch
`deploy-pages.yml` on `main` using a separately authorized Actions-write token,
or send the `android-release` repository dispatch with Contents-write access.
Ordinary publication needs no additional dispatch permission.

## Homepage behavior

The QR always points to `https://cozie.pages.dev/download/android`. A deployment
lists all release pages, includes published prereleases, excludes drafts and
non-`android-*` releases, then selects the newest complete APK by `published_at`.
The GitHub REST `/releases/latest` endpoint is not used.

Actions generates a static HTTP 302 redirect to the selected asset's exact
`browser_download_url`, and `/api/android-release.json` with its release/asset
IDs, filename, size, timestamp and GitHub SHA-256 digest when available. The old
`/api/android-release` entry redirects to the JSON endpoint.

New releases, release edits/deletions, main pushes and manual dispatch deploy
the current main branch. The Sync Android release workflow also runs at minutes
17 and 47 each hour. It compares deployed metadata with the newest complete
release, verifies the fixed entry and anonymous APK HEAD response, and dispatches
main deployment when an update or repair is needed.

A new release becomes downloadable after deployment finishes, usually within a
few minutes. Scheduled runs can be delayed by GitHub; this is eventual
synchronization, not a per-scan API lookup. Actions must remain enabled, and
inactive public repositories may need their scheduled workflows re-enabled.
If there is no complete APK, selection fails without replacing the live site.
