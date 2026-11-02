# Platform download options

## Behavior

Desktop visitors see separate Android and iOS QR codes in the existing scan
area. Android retains the stable `/download/android` entry and release update
workflow. The iOS QR encodes the TestFlight invitation
`https://testflight.apple.com/join/51gqyeCn`.

On Android devices, show only the Android QR and a Download for Android link
styled as a button. On iPhone, iPod and iPad, show only the iOS QR and an
Open TestFlight button. Links navigate in the same tab and work without popups.
The TestFlight invitation is the iOS installation entry, not an IPA download.

## Detection and fallback

Run a small local script in the document head before rendering. Detect Android
from user agent or user-agent client hints. Detect iOS from iPhone/iPad/iPod user
agents, including iPadOS desktop-mode user agents with a Mac platform and
multiple touch points. Device detection is independent of viewport size:
narrow desktop windows retain both choices and landscape phones retain one.

Set a document data attribute and use CSS to hide the other platform's entire
card. Unsupported devices and browsers with JavaScript disabled retain both
clickable QR links. No permissions, external scripts or fingerprinting service
are required.

## Assets and layout

Generate both SVG QR codes during the existing build with the same colors,
quiet zone and correction level. Keep committed SVGs for unbuilt local preview.
Keep the TestFlight URL in the QR generator and validate the HTML invitation
links against it in the build's test suite so its QR and button cannot diverge.

Preserve the page's Outfit typography, colors, cloud illustration, scan corners
and responsive structure. Desktop scan cards sit side by side with explicit
platform labels. On detected mobile devices, place the QR and platform
description in the first row and a full-width download button underneath.
The button has a large touch target and visible keyboard focus.

## Verification and delivery

Test Android/iOS/desktop detection, iPadOS desktop mode, client hints and unknown
devices. Independently decode both generated QR codes and check the iOS link.
Inspect real browser layouts for desktop, narrow desktop, Android, iPhone,
iPadOS and landscape mobile viewports, including keyboard focus and overflow.
Run existing release/deployment tests and the build, then publish through the
existing GitHub Actions workflow. Do not install Cloudflare tools locally.
