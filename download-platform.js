(() => {
  const agent = navigator.userAgent || "";
  const platform = navigator.userAgentData?.platform || navigator.platform || "";
  let downloadPlatform = "desktop";

  if (/Android/i.test(`${agent} ${platform}`)) {
    downloadPlatform = "android";
  } else if (
    /iPhone|iPad|iPod/i.test(`${agent} ${platform}`) ||
    (/Mac/i.test(platform) && navigator.maxTouchPoints > 1)
  ) {
    // iPadOS can identify itself as a Mac when requesting desktop websites.
    downloadPlatform = "ios";
  }

  document.documentElement.dataset.downloadPlatform = downloadPlatform;
})();
