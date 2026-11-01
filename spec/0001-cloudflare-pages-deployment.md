# Cloudflare Pages deployment

## Objective

Publish the static Cozie homepage through GitHub Actions without installing
Cloudflare CLI tools on the developer machine.

## Build and deployment

- Run `npm run build` with Node.js 24 and publish only `dist/`.
- Deploy pushes to `main` and allow manual deployment from `main`.
- Use a single production deployment concurrency group.
- Store the Cloudflare API token and account ID in GitHub Actions secrets.
- Read the project name from the `CLOUDFLARE_PAGES_PROJECT` repository variable,
  defaulting to `cozie`.
- Look up the Pages project using the Cloudflare API in Actions. Create it as a
  Direct Upload project with production branch `main` only when it does not exist.
- Deploy with the official Cloudflare Wrangler action, which installs the CLI
  exclusively on the GitHub runner.
- Verify the production homepage and its referenced static assets after upload.
- Allow up to eight minutes for initial HTTPS provisioning and propagation
  while continuing to validate TLS certificates.
- Record the production and deployment URLs in the Actions job summary.

## Credentials and domain

The supplied credentials originate from an R2 token creation screen. Deployment
must verify whether this token grants Pages access; R2 S3 credentials are not
needed. If authorization fails, report the failure and require a Cloudflare API
token with Account / Cloudflare Pages / Edit access to the selected account.

The desired initial hostname is `cozie.pages.dev`. Cloudflare assigns the
actual project subdomain, which must be read from the project API response.
A custom hostname requires a concrete domain controlled by the user and a
separate Pages custom-domain and DNS configuration.

## Verification and rollback

Check workflow syntax, run the existing build, exercise project lookup and
creation behavior with mocked API responses, and inspect the actual Actions
run. The successful deployed site must serve the expected HTML, CSS, images,
font, and license. To roll back, revert the source change and push to `main`,
or deploy a previously verified source revision through a new commit on `main`.
