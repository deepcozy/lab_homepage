import { readAndroidRelease } from "../../lib/android-release.mjs";

export async function onRequestGet({ request, env }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const release = await readAndroidRelease(env.ANDROID_RELEASES);
    if (!release) {
      return Response.json({ available: false }, { status: 503, headers });
    }
    const { key, ...metadata } = release;
    return Response.json({
      available: true,
      ...metadata,
      url: new URL("/download/android", request.url).href,
    }, { headers });
  } catch (error) {
    console.error("Android release metadata failed:", error.message);
    return Response.json({ available: false }, { status: 502, headers });
  }
}
