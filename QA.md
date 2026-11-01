# Homepage validation

Date: 2026-11-01.

- `node scripts/build.mjs` passed; the static output includes the HTML, CSS, cloud PNG, scan-corner SVG, Outfit font and font license.
- Both Node scripts passed `node --check`; `git diff --check` passed.
- Browser screenshots reviewed at 1920 × 1080, 1440 × 900, 768 × 1024, 390 × 844 and 320 × 568. Portrait tablet and phone layouts stack the content; small viewports allow vertical scrolling without horizontal overflow.
- At 1920 × 1080, DOM measurements place the cloud at (895, 228) with size 1025 × 852, matching the Figma image slot. Both image elements load from non-empty repository assets.
- Outfit is self-hosted. Text color `#0A1227` against `#FDFAF9` has a calculated WCAG contrast ratio of 17.91:1.
- The preview browser reported no warning or error logs during the final desktop check.

The scan area remains an empty placeholder from the Figma design. This verification covers the static page in browser viewport emulation, not a real-device test or a working QR destination.
