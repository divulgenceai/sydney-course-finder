(function () {
  const storageKey = "sydneyCourseFinder.theme";
  const guidePlanSnapshotKey = "sydneyCourseFinder.guidePlanSnapshot";
  const appSurfaceKey = "sydneyCourseFinder.appSurface";
  const root = document.documentElement;
  const logoSources = {
    light: "./assets/logo-light.svg",
    dark: "./assets/logo-dark.svg"
  };
  const faviconSources = {
    light: "./assets/favicon-light.svg",
    dark: "./assets/favicon-dark.svg"
  };
  const mobileNavIcons = {
    Courses: "\u2302",
    Guide: "✦",
    "My Plan": "✓",
    Pathways: "↗",
    ATAR: "◎",
    Calculator: "\u03a3",
    Subjects: "○",
    "Course help": "?",
    Saved: "♡",
    Universities: "◆",
    FAQ: "?"
  };
  const mobileNavLabels = {
    "Course help": "Help",
    Universities: "Unis",
    Calculator: "Calc"
  };
  Object.assign(mobileNavIcons, {
    Universities: "\u25c6",
    Tools: "\u2699",
    Saved: "\u2661",
    About: "\u24d8"
  });
  const mobileNavMedia = "(max-width: 760px)";
  const mobilePrimaryLabels = ["Courses", "Universities", "Tools", "Saved", "About"];
  const mobilePrimaryDestinations = {
    Courses: "./#courses",
    Universities: "./#providers",
    Tools: "./#tools",
    Saved: "./#saved",
    About: "./#about"
  };
  const mobilePrimaryItems = mobilePrimaryLabels.map((label) => ({
    label,
    href: mobilePrimaryDestinations[label]
  }));
  let mobileNavSetupDone = false;
  let routePendingTimer = 0;
  const prefetchedShellUrls = new Set();

  function detectAppSurface() {
    try {
      const requestedSurface = new URLSearchParams(window.location.search).get("source");
      if (requestedSurface === "android") {
        localStorage.setItem(appSurfaceKey, "android");
        return "android";
      }
      return localStorage.getItem(appSurfaceKey) === "android" ? "android" : "";
    } catch {
      return new URLSearchParams(window.location.search).get("source") === "android" ? "android" : "";
    }
  }

  const appSurface = detectAppSurface();
  if (appSurface) root.dataset.appSurface = appSurface;

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
    syncThemeColor(next);
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

  function hasGuidePlanSnapshot() {
    try {
      const raw = localStorage.getItem(guidePlanSnapshotKey);
      if (!raw) return false;
      const snapshot = JSON.parse(raw);
      return Boolean(snapshot && snapshot.version && (snapshot.primary?.name || snapshot.goalLabel || snapshot.savedAt));
    } catch {
      return false;
    }
  }

  function myPlanNavMarkup({ current = false } = {}) {
    if (!hasGuidePlanSnapshot()) return "";
    return `<a href="./my-plan"${current ? ' aria-current="page"' : ""}>My Plan</a>`;
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

  function syncThemeColor(theme = currentTheme()) {
    const color = theme === "dark" ? "#000000" : "#ffffff";
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", color);
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

  function plainNavText(link) {
    return (link.textContent || "")
      .replace(/\(\d+\)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function savedCourseCount() {
    try {
      const value = JSON.parse(localStorage.getItem("sydneyCourseFinder.savedCourses") || "[]");
      return Array.isArray(value) ? new Set(value.filter((item) => typeof item === "string")).size : 0;
    } catch {
      return 0;
    }
  }

  function canonicalNavigationMarkup() {
    const saved = savedCourseCount();
    return `
      <a href="./#courses">Courses</a>
      <a href="./#providers">Universities</a>
      <a href="./#tools">Tools</a>
      <a href="./#saved">Saved${saved ? ` (${saved})` : ""}</a>
      <a href="./#about">About</a>
    `;
  }

  function canonicalSectionForLocation() {
    const path = location.pathname
      .replace(/\/index\.html$/i, "/")
      .replace(/\.html$/i, "")
      .replace(/\/+$/, "") || "/";
    const toolPaths = new Set([
      "/guide",
      "/pathways",
      "/no-atar",
      "/atar-calculator",
      "/calculator",
      "/subject-helper",
      "/subjects",
      "/advisor",
      "/my-plan",
      "/plan"
    ]);
    if (toolPaths.has(path)) return "Tools";
    if (location.hash === "#providers") return "Universities";
    if (location.hash === "#tools") return "Tools";
    if (location.hash === "#saved") return "Saved";
    if (location.hash === "#about" || location.hash === "#faq") return "About";
    return "Courses";
  }

  function syncCanonicalNavCurrent() {
    const active = canonicalSectionForLocation();
    document.querySelectorAll(".topnav").forEach((nav) => {
      nav.querySelectorAll(":scope > a").forEach((link) => {
        if (plainNavText(link) === active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    });
  }

  function rewritePrimaryNavigation(scope = document) {
    scope.querySelectorAll(".topnav").forEach((nav) => {
      if (nav.dataset.canonicalNav === "true") return;
      nav.innerHTML = canonicalNavigationMarkup();
      nav.dataset.canonicalNav = "true";
    });
    syncCanonicalNavCurrent();
  }

  function ensureSiteFooter() {
    if (document.querySelector(".site-footer")) return;
    const footer = document.createElement("footer");
    footer.className = "site-footer site-footer-global";
    footer.innerHTML = `
      <div>
        <strong>Sydney Course Finder</strong>
        <p>Planning support only. Confirm current admission criteria, fees, CSP status and offer rules with UAC and the university.</p>
      </div>
      <nav aria-label="Footer">
        <a href="./#courses">Courses</a>
        <a href="./#about">About the data</a>
        <a href="./#faq">FAQ</a>
      </nav>
    `;
    document.body.appendChild(footer);
  }

  function decorateMobileNav(scope = document) {
    scope.querySelectorAll(".topnav a, .topnav button, .mobile-page-menu a, .mobile-page-menu button").forEach((link) => {
      const label = plainNavText(link);
      link.dataset.mobileIcon = mobileNavIcons[label] || "•";
      link.dataset.mobileLabel = mobileNavLabels[label] || label;
      if (!link.getAttribute("aria-label")) link.setAttribute("aria-label", label);
    });
  }

  function isMobileNavViewport() {
    return window.matchMedia?.(mobileNavMedia)?.matches || window.innerWidth <= 760;
  }

  function sameOriginPageUrl(href) {
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return null;
      if (url.protocol === "file:") return null;
      url.hash = "";
      return url;
    } catch {
      return null;
    }
  }

  function prefetchAppShell(href) {
    const url = sameOriginPageUrl(href);
    if (!url || prefetchedShellUrls.has(url.href)) return;
    prefetchedShellUrls.add(url.href);

    const addPrefetchLink = () => {
      if (!document.head || document.querySelector(`link[rel="prefetch"][href="${url.href}"]`)) return;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url.href;
      link.as = "document";
      document.head.appendChild(link);
    };

    addPrefetchLink();
  }

  function prefetchVisibleShellLinks(scope = document) {
    const run = () => {
      const links = [...scope.querySelectorAll(".topnav a[href], .brand[href]")];
      const visibleLinks = isMobileNavViewport()
        ? links.filter((link) => link.classList.contains("brand") || link.dataset.mobilePrimary === "true")
        : links;
      visibleLinks.forEach((link) => {
        prefetchAppShell(link.getAttribute("href"));
      });
    };
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: isMobileNavViewport() ? 700 : 1400 });
    } else {
      window.setTimeout(run, isMobileNavViewport() ? 120 : 240);
    }
  }

  function clearFastPageClasses() {
    root.classList.remove("is-fast-page-leaving", "is-fast-page-entering", "is-fast-section-jump", "is-route-pending");
    window.clearTimeout(routePendingTimer);
  }

  function markUiReady() {
    window.setTimeout(() => root.classList.add("ui-ready"), 460);
  }

  function pulseFastSectionJump() {
    root.classList.add("is-fast-section-jump");
    window.setTimeout(() => root.classList.remove("is-fast-section-jump"), 220);
  }

  function markNavPressed(link) {
    if (!link) return;
    link.classList.add("is-nav-pressed");
    window.setTimeout(() => link.classList.remove("is-nav-pressed"), 260);
  }

  function beginFastPageTransition(link) {
    if (!link || link.tagName !== "A") return;
    const href = link.getAttribute("href");
    const url = sameOriginPageUrl(href);
    if (!url) return;
    if (link.target && link.target !== "_self") return;

    const currentPath = location.pathname.replace(/\/$/, "/index.html");
    const nextPath = url.pathname.replace(/\/$/, "/index.html");
    if (currentPath === nextPath && new URL(link.href, location.href).hash) {
      pulseFastSectionJump();
      return;
    }

    markNavPressed(link);
    root.classList.add("is-route-pending");
    window.clearTimeout(routePendingTimer);
    routePendingTimer = window.setTimeout(() => root.classList.remove("is-route-pending"), 2200);
  }

  function setMobileNavExpanded(expanded) {
    root.classList.toggle("mobile-nav-expanded", Boolean(expanded) && isMobileNavViewport());
    document.querySelectorAll("[data-action='toggle-mobile-nav']").forEach((button) => {
      button.setAttribute("aria-expanded", String(root.classList.contains("mobile-nav-expanded")));
    });
    document.querySelectorAll("[data-mobile-nav-scrim]").forEach((scrim) => {
      scrim.setAttribute("aria-hidden", String(!root.classList.contains("mobile-nav-expanded")));
    });
  }

  function closeMobileOverlays() {
    setMobileNavExpanded(false);
    closeAppSelectSheet();
  }

  function navigateMobileLink(link, event) {
    if (!isMobileNavViewport() || !link || link.tagName !== "A") return false;
    const href = link.getAttribute("href");
    const url = sameOriginPageUrl(href);
    if (!url) return false;
    const target = new URL(href, location.href);

    event.preventDefault();
    closeMobileOverlays();
    beginFastPageTransition(link);

    const current = new URL(location.href);
    const sameDocument = current.pathname === url.pathname && current.search === url.search;
    if (sameDocument && target.hash) {
      const hash = target.hash;
      if (current.hash === hash) {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        location.hash = hash;
      }
      return true;
    }

    location.assign(target.href);
    return true;
  }

  function buildMobilePrimaryNav(scope = document) {
    document.querySelectorAll(".mobile-primary-nav").forEach((nav) => nav.remove());
    document.querySelectorAll(".mobile-page-menu").forEach((nav) => nav.remove());
    document.querySelectorAll("[data-mobile-nav-scrim]").forEach((scrim) => scrim.remove());
    const sourceNav = scope.querySelector(".topnav");
    if (!sourceNav) return;

    sourceNav.querySelectorAll("[data-mobile-primary]").forEach((item) => {
      delete item.dataset.mobilePrimary;
    });
    const nav = document.createElement("nav");
    nav.className = "mobile-primary-nav";
    nav.setAttribute("aria-label", "Quick navigation");

    mobilePrimaryItems.forEach(({ label, href }) => {
      const source = [...sourceNav.querySelectorAll("a")].find((link) => plainNavText(link) === label);
      if (source) source.dataset.mobilePrimary = "true";
      const link = document.createElement("a");
      link.href = href;
      link.setAttribute("aria-label", label);
      link.dataset.mobileIcon = mobileNavIcons[label] || "\u2022";
      link.dataset.mobileLabel = mobileNavLabels[label] || label;
      nav.appendChild(link);
    });

    document.body?.appendChild(nav);
  }

  function syncMobilePrimaryCurrent() {
    const sourceNav = document.querySelector(".topnav");
    const mobileNav = document.querySelector(".mobile-primary-nav");
    if (!sourceNav || !mobileNav) return;
    const current = sourceNav.querySelector('[aria-current="page"]');
    const currentUrl = new URL(location.href);
    const normalisePath = (value) => {
      const path = String(value || "/")
        .replace(/\/index\.html$/i, "/")
        .replace(/\.html$/i, "")
        .replace(/\/+$/, "");
      return path || "/";
    };
    const activeHash = currentUrl.hash || (normalisePath(currentUrl.pathname) === "/" ? "#courses" : "");
    const canonicalActive = canonicalSectionForLocation();
    mobileNav.querySelectorAll("a").forEach((link) => {
      const target = new URL(link.getAttribute("href"), location.href);
      const samePath = normalisePath(target.pathname) === normalisePath(currentUrl.pathname);
      const sameSection = !target.hash || target.hash === activeHash;
      const sameCanonicalSection = link.getAttribute("aria-label") === canonicalActive;
      if ((samePath && sameSection) || sameCanonicalSection) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const hasCurrent = [...mobileNav.querySelectorAll("a")].some((link) => link.hasAttribute("aria-current"));
    const more = mobileNav.querySelector("[data-action='toggle-mobile-nav']");
    if (more) more.toggleAttribute("aria-current", Boolean(current) && !hasCurrent);
    const mobileMenu = document.querySelector(".mobile-page-menu");
    if (mobileMenu) {
      const currentHref = current?.getAttribute("href") || "";
      mobileMenu.querySelectorAll("a").forEach((link) => {
        if (currentHref && link.getAttribute("href") === currentHref) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }
  }

  function setupMobileNav(scope = document) {
    buildMobilePrimaryNav(scope);
    setMobileNavExpanded(false);
    if (mobileNavSetupDone) return;
    mobileNavSetupDone = true;

    document.addEventListener("click", (event) => {
      const close = event.target.closest("[data-action='close-mobile-nav']");
      if (close) {
        event.preventDefault();
        setMobileNavExpanded(false);
        return;
      }

      const toggle = event.target.closest("[data-action='toggle-mobile-nav']");
      if (toggle) {
        event.preventDefault();
        setMobileNavExpanded(!root.classList.contains("mobile-nav-expanded"));
        return;
      }

      const navLink = event.target.closest(".topnav a, .topnav button, .mobile-page-menu a, .mobile-page-menu button, .mobile-primary-nav a, .brand");
      if (navLink) {
        if (navLink.matches(".mobile-primary-nav a, .mobile-page-menu a, .topnav a") && navigateMobileLink(navLink, event)) return;
        if (navLink.tagName === "A") beginFastPageTransition(navLink);
        if (isMobileNavViewport()) setMobileNavExpanded(false);
        return;
      }

      if (root.classList.contains("mobile-nav-expanded")) setMobileNavExpanded(false);
    });

    document.addEventListener("pointerdown", (event) => {
      const navLink = event.target.closest(".topnav a, .topnav button, .mobile-page-menu a, .mobile-page-menu button, .mobile-primary-nav a, .brand");
      if (!navLink) return;
      if (navLink.tagName === "A") prefetchAppShell(navLink.getAttribute("href"));
      markNavPressed(navLink);
    }, { passive: true });

    document.addEventListener("pointerover", (event) => {
      const navLink = event.target.closest(".topnav a[href], .mobile-page-menu a[href], .mobile-primary-nav a[href], .brand[href]");
      if (navLink) prefetchAppShell(navLink.getAttribute("href"));
    }, { passive: true });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMobileNavExpanded(false);
    });
    window.addEventListener("hashchange", () => {
      syncCanonicalNavCurrent();
      syncMobilePrimaryCurrent();
    });
    window.addEventListener("resize", () => {
      if (!isMobileNavViewport()) setMobileNavExpanded(false);
    }, { passive: true });
  }

  function appSelectSheet() {
    let overlay = document.querySelector("[data-app-select-overlay]");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.className = "app-select-overlay";
    overlay.dataset.appSelectOverlay = "true";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <button class="app-select-backdrop" type="button" data-app-select-close aria-label="Close options"></button>
      <section class="app-select-sheet" role="dialog" aria-modal="true" aria-labelledby="app-select-title">
        <header>
          <div>
            <span>Choose one</span>
            <h2 id="app-select-title">Options</h2>
          </div>
          <button type="button" data-app-select-close aria-label="Close options">Done</button>
        </header>
        <div class="app-select-options" role="listbox"></div>
      </section>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll("[data-app-select-close]").forEach((button) => {
      button.addEventListener("click", closeAppSelectSheet);
    });
    return overlay;
  }

  function closeAppSelectSheet() {
    const overlay = document.querySelector("[data-app-select-overlay]");
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    root.classList.remove("app-select-open");
  }

  function openAppSelectSheet(select, trigger) {
    if (!select?.isConnected) return;
    const overlay = appSelectSheet();
    const title = select.closest("label")?.querySelector(":scope > span")?.textContent?.trim() || "Choose an option";
    const options = [...select.options];
    const list = overlay.querySelector(".app-select-options");
    overlay.querySelector("#app-select-title").textContent = title;
    list.innerHTML = options.map((option) => `
      <button
        type="button"
        role="option"
        data-app-select-value="${escapeAppAttribute(option.value)}"
        aria-selected="${option.selected}"
        ${option.disabled ? "disabled" : ""}
      >
        <span>${escapeAppText(option.textContent || option.label || option.value)}</span>
        <i aria-hidden="true">${option.selected ? "✓" : ""}</i>
      </button>
    `).join("");

    list.querySelectorAll("[data-app-select-value]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextValue = button.dataset.appSelectValue || "";
        closeAppSelectSheet();
        if (!select.isConnected || select.value === nextValue) return;
        select.value = nextValue;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        syncAppSelectTrigger(select, trigger);
      });
    });

    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    root.classList.add("app-select-open");
    requestAnimationFrame(() => {
      list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
    });
  }

  function syncAppSelectTrigger(select, trigger) {
    const selected = select.selectedOptions?.[0];
    const text = selected?.textContent?.trim() || "Choose one";
    const label = select.closest("label")?.querySelector(":scope > span")?.textContent?.trim() || "Option";
    trigger.querySelector("span").textContent = text;
    trigger.setAttribute("aria-label", `${label}: ${text}`);
  }

  function enhanceAndroidSelects(scope = document) {
    if (appSurface !== "android" || !isMobileNavViewport()) return;
    scope.querySelectorAll("select:not([data-app-select-ready])").forEach((select) => {
      select.dataset.appSelectReady = "true";
      select.classList.add("app-native-select");
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "app-select-trigger";
      trigger.innerHTML = '<span></span><i aria-hidden="true"></i>';
      syncAppSelectTrigger(select, trigger);
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openAppSelectSheet(select, trigger);
      });
      select.addEventListener("change", () => syncAppSelectTrigger(select, trigger));
      select.insertAdjacentElement("afterend", trigger);
    });
  }

  function escapeAppText(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function escapeAppAttribute(value) {
    return escapeAppText(value)
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function bind(scope = document) {
    syncButtons();
    syncBrandAssets(currentTheme());
    syncThemeColor(currentTheme());
    scope.querySelectorAll("[data-plan-nav-slot]").forEach((slot) => {
      slot.innerHTML = myPlanNavMarkup({ current: slot.dataset.planNavSlot === "current" });
    });
    rewritePrimaryNavigation(scope);
    ensureSiteFooter();
    decorateMobileNav(scope);
    setupMobileNav(scope);
    enhanceAndroidSelects(scope);
    syncMobilePrimaryCurrent();
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => undefined)
      .catch(() => {
      // The site still works if a local browser blocks service worker registration.
      });
  }

  function scheduleServiceWorkerRegistration() {
    if (navigator.serviceWorker?.controller) {
      registerServiceWorker();
      return;
    }
    const register = () => registerServiceWorker();
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(register, { timeout: 2600 });
      } else {
        window.setTimeout(register, 900);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
  }

  applyTheme(currentTheme());

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='toggle-theme']");
    if (!button) return;
    event.preventDefault();
    toggleTheme();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && root.classList.contains("app-select-open")) closeAppSelectSheet();
  });

  document.addEventListener("DOMContentLoaded", () => {
    bind(document);
    scheduleServiceWorkerRegistration();
    clearFastPageClasses();
    prefetchVisibleShellLinks(document);
    markUiReady();
  });
  window.addEventListener("pageshow", clearFastPageClasses);
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) applyTheme(currentTheme());
    if (event.key === guidePlanSnapshotKey) bind(document);
  });

  window.courseFinderTheme = {
    current: currentTheme,
    apply: applyTheme,
    toggle: toggleTheme,
    buttonMarkup,
    hasGuidePlanSnapshot,
    myPlanNavMarkup,
    bind,
    decorateMobileNav,
    setupMobileNav,
    syncMobilePrimaryCurrent,
    prefetchAppShell,
    prefetchVisibleShellLinks,
    beginFastPageTransition,
    logoSrc,
    faviconSrc
  };
})();
