# Cloudflare Pages deployment

## Automatic deployment

In `deepcozy/lab_homepage`, pushes to main, published/edited/deleted releases,
manual dispatch and `android-release` repository dispatch run
`.github/workflows/deploy-pages.yml`. Every deployment checks out current main,
including release events whose ref is an Android tag. Production deployments
are serialized, and each resolves the newest APK after acquiring its slot.

The runner uses Node.js 24, runs `npm ci` and `npm test`, and ensures the Pages
project exists. The build queries public homepage releases, checks anonymous
APK accessibility and size, generates both platform QR codes and the static Android download redirect,
and uploads `dist/` using the official Cloudflare Wrangler action. R2 and Pages
Functions are not used. No Cloudflare CLI is installed on the developer machine.

After uploading, Actions compares every published static file with the build
on both deployment and production URLs. Verification allows up to eight minutes
for HTTPS provisioning and propagation without bypassing certificate checks.
It then checks public Android metadata, the fixed entry's 302 target and the
APK's anonymous HEAD response. The summary records the actual URLs and APK.

## GitHub configuration

Keep this repository public so APK assets are anonymously downloadable. Enable
Actions and configure these repository Actions secrets:

| Name | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Token granting Cloudflare Pages Edit for the account |

No R2 storage permission, subscription, S3 key or mobile-repository access token
is needed. Never commit credentials.

Optional repository Actions variables:

| Name | Default | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | `cozie` | Pages project name |
| `COZIE_SITE_URL` | `https://cozie.pages.dev` | Production origin used by scheduled sync |

The first run creates a Direct Upload project with production branch main.
Action versions are pinned to source revisions; Wrangler is pinned to
`4.156.0` and runs only in Actions. The deployment's built-in GitHub token has
Contents read access. The scheduled sync token additionally has Actions write
access so it can dispatch deployment; it does not receive Cloudflare secrets.

## Android updates

See [ANDROID_RELEASES.md](./ANDROID_RELEASES.md) for the mobile publication
contract. The signed APK belongs in public homepage Releases, tagged
`android-v<version>` and named `cozie.apk`. Include prereleases and upload assets
before publishing the draft release. The stable QR entry is
`https://cozie.pages.dev/download/android`; metadata is served at
`https://cozie.pages.dev/api/android-release.json` with `Cache-Control: no-store`.

The separate Sync Android release workflow runs at minutes 17 and 47 each hour
and supports manual runs. It dispatches deployment only when release selection
changed or public verification fails. It catches missed release events and
late asset uploads. GitHub schedules can be delayed or disabled for inactive
public repositories. Publication takes effect after deployment, not instantly.

## Domain

The production site is `https://cozie.pages.dev`. The build uses the actual
Pages production URL returned by the API, rather than assuming a subdomain.
If changing the project, also update the scheduled sync's `COZIE_SITE_URL`.

A custom hostname requires a domain controlled by the owner. Add it to the
Pages project's Custom domains settings and configure the required DNS records.
Domain purchase and DNS changes are outside this workflow.

## Checks and rollback

```sh
npm ci
npm test
npm run build
```

The build requires access to the public GitHub releases API and APK HEAD URL.
Local preview serves static files; Pages `_redirects` rules are verified on the
deployed site, not emulated by the local preview server.

`download-platform.js` selects the platform before page rendering. The build
copies that script and generates Android and iOS SVG QR assets. The iOS QR and
button use `https://testflight.apple.com/join/51gqyeCn`; the test suite checks
their consistency. Device selection runs in the browser without API requests
and does not require changes to Actions secrets or Cloudflare configuration.

For failures, inspect the failing Actions step. Fix token permissions if needed
and rerun on main. Cloudflare account tokens are verified before Pages API calls.
To redeploy, dispatch the workflow on main. For source rollback, revert the
relevant commit and push. For an APK rollback, draft or delete the faulty release
and run deployment; it resolves the newest remaining complete APK. Republishing
an older tag with a new publication timestamp intentionally makes it newest.
A failed build/upload does not delete the previously deployed site.
