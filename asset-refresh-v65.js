(function () {
  const storageKey = "sydneyCourseFinder.assetShellVersion";
  const assetVersion = "65";

  try {
    if (localStorage.getItem(storageKey) === assetVersion) return;
    localStorage.setItem(storageKey, assetVersion);
  } catch {
    // Storage is optional. Never delay or reload the page when it is unavailable.
  }

  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;

  // Activate an already-downloaded worker and check for a newer shell in the
  // background. Do not delete caches or reload the document during navigation.
  navigator.serviceWorker.getRegistration().then((registration) => {
    registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
    return registration?.update();
  }).catch(() => {
    // Offline/privacy modes must not stop the current page from loading.
  });
})();
