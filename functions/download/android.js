import { readAndroidRelease, unavailableDownload } from "../../lib/android-release.mjs";

export async function onRequest({ request, env }) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const unavailable = (status = 503) => {
    const response = unavailableDownload(status);
    return request.method === "HEAD" ? new Response(null, response) : response;
  };
  try {
    const release = await readAndroidRelease(env.ANDROID_RELEASES);
    if (!release) return unavailable();
    const apk = request.method === "HEAD"
      ? await env.ANDROID_RELEASES.head(release.key)
      : await env.ANDROID_RELEASES.get(release.key);
    if (!apk || apk.size !== release.size ||
        (apk.customMetadata?.sha256 && apk.customMetadata.sha256 !== release.sha256)) {
      throw new Error("The Android APK does not match the published manifest.");
    }
    const headers = new Headers({
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": `attachment; filename="${release.filename}"`,
      "Content-Length": String(apk.size),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Cozie-Version": release.version,
      "X-Cozie-SHA256": release.sha256,
    });
    if (apk.httpEtag) headers.set("ETag", apk.httpEtag);
    return new Response(request.method === "HEAD" ? null : apk.body, { headers });
  } catch (error) {
    console.error("Android download failed:", error.message);
    return unavailable(502);
  }
}
