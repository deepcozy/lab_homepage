# Cozie homepage

Static, responsive implementation of the [1920 × 1080 Figma homepage](https://www.figma.com/design/HiiOTYn7wU4dTd2g4Jjt0L/Cozei-Official-Web?node-id=9-14).

## Preview

Requires Node.js 20 or later. There are no packages to install.

```sh
node scripts/serve.mjs
```

Open the printed local URL, normally `http://127.0.0.1:4173`.

## Build

```sh
node scripts/build.mjs
```

Upload the contents of `dist/` to any static host. All image, SVG and font files are included locally; the website makes no requests to temporary Figma asset URLs or third-party font services. If `dist/` exists, the preview server serves the built output.

## Design notes

- Desktop reference size: **1920 × 1080**.
- Mobile layouts stack the copy, scan area and cloud.
- The QR area is intentionally empty, matching the design. Supply a destination URL and replace this placeholder with a real code before using the scan flow.
- Outfit is licensed under the SIL Open Font License in `assets/fonts/OFL.txt`.
- Detailed design source and layout decisions: [DESIGN.md](./DESIGN.md).

## Deploy

Pushes to `main` deploy the build to Cloudflare Pages through GitHub Actions.
Cloudflare CLI tools run only on the GitHub runner. The workflow creates the
Pages project if needed and verifies the published files after deployment.

The default project name is `cozie`; the actual production URL appears in the
Actions job summary. See [DEPLOY.md](./DEPLOY.md) for the required GitHub secrets,
project configuration, custom domains, and rollback instructions.
