(function () {
  const storageKey = "sydneyCourseFinder.assetShellVersion";
  const assetVersion = "64";

  try {
    if (localStorage.getItem(storageKey) === assetVersion) return;
  } catch {
    return;
  }

  async function refreshOldShell() {
    let removedOldAssets = false;

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length) {
        removedOldAssets = true;
        await Promise.allSettled(registrations.map((registration) => registration.unregister()));
      }
    }

    if ("caches" in window) {
      const keys = await caches.keys();
      if (keys.length) {
        removedOldAssets = true;
        await Promise.allSettled(keys.map((key) => caches.delete(key)));
      }
    }

    try {
      localStorage.setItem(storageKey, assetVersion);
    } catch {
      return;
    }

    if (removedOldAssets) location.reload();
  }

  refreshOldShell().catch(() => {
    // Keep the current page usable if browser privacy settings block cache access.
  });
})();
