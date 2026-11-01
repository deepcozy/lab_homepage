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

This repository contains the homepage source. Pushing it does not itself enable GitHub Pages or configure a domain.
