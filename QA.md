# Homepage validation

Date: 2026-11-01.

- `node scripts/build.mjs` passed; the static output includes the HTML, CSS, cloud PNG, scan-corner SVG, Outfit font and font license.
- Both Node scripts passed `node --check`; `git diff --check` passed.
- Browser screenshots reviewed at 1920 × 1080, 1440 × 900, 768 × 1024, 390 × 844 and 320 × 568. Portrait tablet and phone layouts stack the content; small viewports allow vertical scrolling without horizontal overflow.
- At 1920 × 1080, DOM measurements place the cloud at (895, 228) with size 1025 × 852, matching the Figma image slot. Both image elements load from non-empty repository assets.
- Outfit is self-hosted. Text color `#0A1227` against `#FDFAF9` has a calculated WCAG contrast ratio of 17.91:1.
- The preview browser reported no warning or error logs during the final desktop check.

Android download integration (updated 2026-11-02):

- The QR SVG is generated during the build and decodes to `https://cozie.pages.dev/download/android`.
- Browser screenshots at 1920 x 1080 and 390 x 844 retain the existing layout. Both rendered QR codes decode successfully. The document width matches the viewport width at both sizes.
- Unit coverage includes SVG QR decoding, paginated release selection, prereleases, draft/incomplete upload exclusion, ambiguous assets, public URL validation, 302 generation, anonymous APK size checks, and scheduled deployment reconciliation.
- Both GitHub Actions workflows passed actionlint.
- The real public `android-v0.0.3/cozie.apk` asset is selected by the build; its anonymous HEAD response reports 67165920 bytes. APK publication belongs to `lab_mobile`; no artificial release is used for testing.

Browser checks use viewport emulation, not physical-device scanning or APK installation.
