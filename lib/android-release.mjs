export function validateAndroidRelease(value) {
  if (!value || typeof value !== "object" ||
      typeof value.version !== "string" ||
      !/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value.version) ||
      typeof value.key !== "string" ||
      !/^android\/releases\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.apk$/.test(value.key) ||
      value.key.split("/").some((part) => part === "." || part === "..") ||
      value.filename !== value.key.split("/").at(-1) ||
      !Number.isSafeInteger(value.size) || value.size <= 0 ||
      typeof value.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(value.sha256) ||
      typeof value.publishedAt !== "string" || !Number.isFinite(Date.parse(value.publishedAt))) {
    throw new Error("Invalid Android release manifest.");
  }
  return {
    version: value.version,
    key: value.key,
    filename: value.filename,
    size: value.size,
    sha256: value.sha256,
    publishedAt: value.publishedAt,
  };
}

export async function readAndroidRelease(bucket) {
  if (!bucket) throw new Error("ANDROID_RELEASES binding is missing.");
  const object = await bucket.get("android/latest.json");
  if (!object) return null;
  return validateAndroidRelease(await object.json());
}

export function unavailableDownload(status = 503) {
  const message = status === 503
    ? "Cozie for Android is not available yet. Please check back after the first release."
    : "The Android download is temporarily unavailable. Please try again later.";
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": "300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
