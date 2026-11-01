# Cloudflare Pages deployment

## Automatic deployment

Push to `main` in `deepcozy/lab_homepage` to run
`.github/workflows/deploy-pages.yml`. It can also be started manually from the
GitHub Actions tab on `main`.

The runner uses Node.js 24, checks the Pages project and private R2 bucket,
creates them if missing, generates the QR code during the build, and uploads
`dist/` and the Pages Functions with the official Cloudflare Wrangler action.
It verifies both the deployment URL and the production URL by comparing every
published file with the build. Verification allows up to eight minutes for
initial HTTPS provisioning and propagation, without bypassing certificate
validation. The job summary records both URLs.

No Cloudflare CLI or Wrangler dependency is installed on the developer machine.
`wrangler.toml` binds the private `cozie-downloads` bucket as `ANDROID_RELEASES`.
`_routes.json` limits Functions execution to the two Android endpoints; all
other public files are served statically.

R2 must first be activated by the account owner in the Cloudflare dashboard.
If bucket initialization fails with `10042 / NotEntitled`, complete that
account setup and rerun the workflow. The workflow does not enroll the account
in a subscription or accept billing terms.

## GitHub configuration

Repository Actions secrets:

| Name | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Token granting Cloudflare Pages Edit and Workers R2 Storage Edit for that account |

An R2-only API token cannot deploy Pages. The R2 access key and secret access key
are not used by the homepage workflow; they belong only in the mobile upload
workflow's Actions secrets. Never commit any token or S3 credentials.

Optional repository Actions variable:

| Name | Default | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | `cozie` | Pages project name |

The first run creates a Direct Upload project with production branch `main`.
An existing project must also use `main` as its production branch.
Action versions are pinned to source revisions and Wrangler is pinned to
`4.156.0` so tool upgrades are explicit.

## Android downloads

The QR encodes the production origin plus `/download/android`. The build uses
`SITE_URL`, populated from the Pages project API response. Pages Functions
read `android/latest.json` from private R2, validate it, and stream the referenced
APK. No GitHub access token or S3 secret is exposed to visitors.

`/api/android-release` provides public release metadata. After a deployment,
Actions checks it and verifies the APK HEAD response. The separate Check
Android release workflow repeats this check twice hourly and supports manual
runs. Its optional `COZIE_SITE_URL` repository variable defaults to
`https://cozie.pages.dev`.

The first APK must be published by `lab_mobile`; until then, the endpoints
return HTTP 503 and Actions reports that publication is pending. The mobile
upload contract and required credentials are in [ANDROID_RELEASES.md](./ANDROID_RELEASES.md).

## Domain

The requested project name is `cozie`; the desired default address is
`https://cozie.pages.dev`. Cloudflare may assign a different subdomain when the
name is already taken. The workflow uses the actual subdomain returned by the
Pages API rather than assuming that the desired address is available.

A custom hostname such as `cozie.example.com` requires an actual domain
controlled by the owner. Add the hostname to the Pages project's Custom domains
settings and configure the DNS records Cloudflare requests. Domain purchase or
custom DNS changes are not part of this workflow.

## Checks and rollback

Local checks:

```sh
npm ci
npm test
npm run build
```

For deployment failures, inspect the failing step in GitHub Actions. Permission
errors during project initialization require correcting the API token secret,
then rerunning the workflow. Account tokens are checked against Cloudflare's
token verification endpoint before any Pages request, so invalid credentials
and missing Pages permissions produce separate errors.

To redeploy the current source, manually run the workflow on `main`. To roll
back, revert the relevant source commit and push to `main`; the workflow
publishes and verifies the reverted build. A failed upload does not delete
the previously deployed site.
