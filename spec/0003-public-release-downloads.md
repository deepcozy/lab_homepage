# Public GitHub release downloads

## Objective

Replace the R2 design in spec 0002 with public GitHub release assets. Keep the
mobile source private, Cloudflare tools exclusively in Actions, and the existing
QR frame. The homepage repository is public and already contains the published
prerelease `android-v0.0.3` with `cozie.apk`.

## Release selection and publication

List all pages of homepage releases through the GitHub REST API. Consider
published, non-draft releases whose tags begin with `android-`, including
prereleases. Order by publication timestamp, then release ID. Prefer the single
uploaded asset named `cozie.apk`; otherwise require exactly one uploaded APK.
Skip releases with no completed APK; fail on ambiguous APK selection instead of
silently selecting an architecture. Validate positive size and the public
browser download URL. Retain GitHub's SHA-256 asset digest when supplied.

The mobile publisher must upload assets to a draft release before publishing.
Never upload APKs to Git commits. Immutable versioned releases are preferred.

## Static download entry

The QR always encodes the production origin plus `/download/android`. Each
deployment resolves the newest complete Android release and generates a Pages
302 redirect from that entry to the exact public GitHub asset URL. Generate
`/api/android-release.json` with the selected tag, release/asset IDs, timestamp,
size, digest and download URL, and a compatibility redirect from the former
metadata endpoint. Serve metadata with `Cache-Control: no-store`.

Clean the build directory first so old Functions routes cannot survive locally.
Remove R2 initialization, bindings, Functions and bucket-specific tests. The
homepage stores only metadata and the redirect, never the APK binary.

## Automation and consistency

Deploy on main pushes, manual dispatch, release publication/edit/deletion and
an optional `android-release` repository dispatch. Always check out current main,
including for release events whose Git ref is an Android tag. Serialize
production deployments without cancelling an in-flight deployment. Resolve
releases after acquiring that serialization slot to prevent queued events from
publishing an older precomputed selection.

Every 30 minutes, compare public metadata with current release selection and
verify the fixed entry's redirect and the anonymous asset HEAD response. If
selection changed or the deployed download is broken, dispatch deployment on
main using the repository's Actions-scoped token. Scheduled runs must never use
Cloudflare secrets. API errors fail explicitly; a release without an APK does
not invalidate an older complete release.

After deployment, compare published static files with the build, then verify
the redirect and public APK size against the selected metadata. Release updates
take effect after Actions and Pages finish; they are not instantaneous. GitHub
schedules can be delayed and inactive public repositories can have schedules
disabled. Event-driven publication is the primary trigger.

## Verification

Test pagination, prereleases, draft and unrelated release exclusion, timestamp
ordering, completed uploads, ambiguity, URL validation, metadata and redirect
generation, reconciliation, anonymous APK verification and independent QR
decoding. Run build and workflow lint, then deploy and check the real public APK.
Do not change the mobile repository or copy a local OAuth token into Actions.
