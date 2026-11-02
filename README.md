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
- Desktop shows labeled Android and iOS QR codes. Android links to `/download/android`; iOS links to the Cozie TestFlight invitation. Both QR codes are clickable and keyboard accessible.
- Android and iOS devices see only their platform's QR. A compact installation button sits to its right, aligned to the QR's bottom edge, with the platform description above it. Detection includes iPadOS desktop mode and does not depend on window width. Without JavaScript or on unknown devices, both QR links remain available.
- Actions resolves the newest complete public GitHub release APK and generates the Android download redirect; see [ANDROID_RELEASES.md](./ANDROID_RELEASES.md) for the mobile upload contract.
- Outfit is licensed under the SIL Open Font License in `assets/fonts/OFL.txt`.
- Detailed design source and layout decisions: [DESIGN.md](./DESIGN.md).

## Deploy

Pushes to `main` deploy the build to Cloudflare Pages through GitHub Actions.
Cloudflare CLI tools run only on the GitHub runner. The workflow creates the
Pages project if needed and verifies the published files after deployment.

The default project name is `cozie`; the actual production URL appears in the
Actions job summary. See [DEPLOY.md](./DEPLOY.md) for the required GitHub secrets,
project configuration, custom domains, and rollback instructions.

The build reads public GitHub release metadata and checks the APK download.
The local preview server serves static files only; test the generated Pages
redirect on the deployed site. New releases trigger deployment, with scheduled
reconciliation twice hourly. The QR remains unchanged across APK versions.
