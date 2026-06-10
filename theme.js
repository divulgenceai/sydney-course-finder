(function () {
  const storageKey = "sydneyCourseFinder.theme";
  const root = document.documentElement;
  const logoSources = {
    light: "./assets/logo-light.svg",
    dark: "./assets/logo-dark.svg"
  };
  const faviconSources = {
    light: "./assets/favicon-light.svg",
    dark: "./assets/favicon-dark.svg"
  };

  function storedTheme() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function currentTheme() {
    return storedTheme() === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    const next = theme === "dark" ? "dark" : "light";
    root.dataset.theme = next;
    root.style.colorScheme = next;
    syncBrandAssets(next);
    syncButtons();
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch {
      // Theme still changes for the current page if storage is blocked.
    }
  }

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    saveTheme(next);
    applyTheme(next);
    return next;
  }

  function iconMarkup(theme = currentTheme()) {
    if (theme === "dark") {
      return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg><span class="sr-only">Switch to light mode</span>';
    }
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3Z"/></svg><span class="sr-only">Switch to dark mode</span>';
  }

  function buttonLabel(theme = currentTheme()) {
    return theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }

  function buttonMarkup() {
    const theme = currentTheme();
    return `<button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="${buttonLabel(theme)}" title="${buttonLabel(theme)}" aria-pressed="${theme === "dark"}">${iconMarkup(theme)}</button>`;
  }

  function logoSrc(theme = currentTheme()) {
    return logoSources[theme === "dark" ? "dark" : "light"];
  }

  function faviconSrc(theme = currentTheme()) {
    return faviconSources[theme === "dark" ? "dark" : "light"];
  }

  function syncBrandAssets(theme = currentTheme()) {
    document.querySelectorAll(".site-logo").forEach((logo) => {
      logo.setAttribute("src", logoSrc(theme));
    });
    document.querySelectorAll('link[rel~="icon"]').forEach((icon) => {
      icon.setAttribute("href", faviconSrc(theme));
    });
  }

  function syncButtons() {
    const theme = currentTheme();
    document.querySelectorAll("[data-action='toggle-theme']").forEach((button) => {
      button.innerHTML = iconMarkup(theme);
      button.setAttribute("aria-label", buttonLabel(theme));
      button.setAttribute("title", buttonLabel(theme));
      button.setAttribute("aria-pressed", String(theme === "dark"));
    });
  }

  applyTheme(currentTheme());

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='toggle-theme']");
    if (!button) return;
    event.preventDefault();
    toggleTheme();
  });

  document.addEventListener("DOMContentLoaded", syncButtons);
  document.addEventListener("DOMContentLoaded", () => syncBrandAssets(currentTheme()));
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) applyTheme(currentTheme());
  });

  window.courseFinderTheme = {
    current: currentTheme,
    apply: applyTheme,
    toggle: toggleTheme,
    buttonMarkup,
    logoSrc,
    faviconSrc
  };
})();
