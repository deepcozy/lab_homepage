# Cloudflare Pages deployment

## Automatic deployment

Push to `main` in `deepcozy/lab_homepage` to run
`.github/workflows/deploy-pages.yml`. It can also be started manually from the
GitHub Actions tab on `main`.

The runner builds the site with Node.js 24, checks the Pages project, creates
it if missing, and uploads `dist/` with the official Cloudflare Wrangler action.
It verifies both the deployment URL and the production URL by comparing every
published file with the build. The job summary records both URLs.

No Cloudflare CLI, Wrangler dependency, or Cloudflare configuration file is
required on the developer machine. This static site has no application secrets,
database, middleware, or server infrastructure to configure.

## GitHub configuration

Repository Actions secrets:

| Name | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Token granting Account / Cloudflare Pages / Edit for that account |

An R2-only API token cannot deploy Pages. The R2 access key and secret access key
are not used by this workflow. Never commit any token or S3 credentials.

Optional repository Actions variable:

| Name | Default | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | `cozie` | Pages project name |

The first run creates a Direct Upload project with production branch `main`.
An existing project must also use `main` as its production branch.
Action versions are pinned to source revisions and Wrangler is pinned to
`4.156.0` so tool upgrades are explicit.

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

Local checks require only Node.js:

```sh
node --test scripts/ensure-pages-project.test.mjs
npm run build
```

For deployment failures, inspect the failing step in GitHub Actions. Permission
errors during project initialization require correcting the API token secret,
then rerunning the workflow.

To redeploy the current source, manually run the workflow on `main`. To roll
back, revert the relevant source commit and push to `main`; the workflow
publishes and verifies the reverted build. A failed upload does not delete
the previously deployed site.
