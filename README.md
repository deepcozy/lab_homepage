# Cozie homepage

Static, responsive implementation of the [1920 × 1080 Figma homepage](https://www.figma.com/design/HiiOTYn7wU4dTd2g4Jjt0L/Cozei-Official-Web?node-id=9-14).

## Preview

Requires Node.js 20 or later. Install build and test dependencies with `npm ci`.

```sh
node scripts/serve.mjs
```

Open the printed local URL, normally `http://127.0.0.1:4173`.

## Build

```sh
npm ci
node scripts/build.mjs
```

Upload the contents of `dist/` to any static host. All image, SVG and font files are included locally; the website makes no requests to temporary Figma asset URLs or third-party font services. If `dist/` exists, the preview server serves the built output.

## Design notes

- Desktop reference size: **1920 × 1080**.
- Mobile layouts stack the copy, scan area and cloud.
- The QR code links to `/download/android` on the production site. It is also a clickable, keyboard-accessible download link. The APK is streamed from private R2; see [ANDROID_RELEASES.md](./ANDROID_RELEASES.md) for the mobile upload contract.
- Outfit is licensed under the SIL Open Font License in `assets/fonts/OFL.txt`.
- Detailed design source and layout decisions: [DESIGN.md](./DESIGN.md).

## Deploy

Pushes to `main` deploy the build to Cloudflare Pages through GitHub Actions.
Cloudflare CLI tools run only on the GitHub runner. The workflow creates the
Pages project if needed and verifies the published files after deployment.

The default project name is `cozie`; the actual production URL appears in the
Actions job summary. See [DEPLOY.md](./DEPLOY.md) for the required GitHub secrets,
project configuration, custom domains, and rollback instructions.

The local preview server serves static files only. Test R2 downloads through
the deployed Pages Functions; it does not expose the local filesystem as a
download source.
