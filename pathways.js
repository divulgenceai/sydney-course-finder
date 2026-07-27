const pathwaysApp = document.querySelector("#pathways-app");
const pathwayCourses = window.uacCourses || [];
const pathwayPlanSnapshotKey = "sydneyCourseFinder.guidePlanSnapshot";
const PathwayLogic = window.PathwayLogic;

const officialPathwayLinks = [
  {
    label: "UAC pathways",
    url: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university"
  },
  {
    label: "SRS early offers",
    url: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes"
  },
  {
    label: "EAS access support",
    url: "https://uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes"
  },
  {
    label: "TAFE NSW pathways",
    url: "https://www.tafensw.edu.au/study/pathways"
  },
  {
    label: "Western Sydney University The College",
    url: "https://www.westernsydney.edu.au/future/study/application-pathways/the-college/courses"
  },
  {
    label: "ADFA",
    url: "https://www.adfcareers.gov.au/students-and-education/australian-defence-force-academy"
  },
  {
    label: "Open Universities Australia",
    url: "https://www.open.edu.au/study-online/pathways-pre-university/oua-pathways"
  }
];

const pathwayState = {
  situation: initialSituation(),
  goal: initialPathwayGoal()
};
let pathwaysRenderPass = 0;

renderPathwaysPage();

function renderPathwaysPage() {
  if (pathwaysRenderPass > 0) pathwaysApp.classList.add("is-state-update");
  const result = currentPathwayResult();

  pathwaysApp.innerHTML = `
    ${renderPathwaysTopbar()}
    <main class="pathways-page simple-pathways-page">
      ${renderPathwaysHero()}
      ${renderPathwayFinder(result)}
      ${renderWaysToGetThere(result)}
      ${renderPathwayProviders(result)}
      ${renderSimplePathwayChecklist(result)}
      ${renderOfficialSources()}
    </main>
  `;

  bindPathwayEvents();
  window.courseFinderTheme?.bind?.(pathwaysApp);
  pathwaysRenderPass += 1;
}

function renderPathwaysTopbar() {
  return `
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./#courses">Courses</a>
        <a href="./guide">Guide</a>
        ${window.courseFinderTheme?.myPlanNavMarkup?.() || ""}
        <a href="./pathways" aria-current="page">Pathways</a>
        <a href="./#atar">ATAR</a>
        <a href="./atar-calculator">Calculator</a>
        <a href="./subject-helper">Subjects</a>
        <a href="./advisor">Course help</a>
        <a href="./#saved">Saved</a>
        <a href="./#providers">Universities</a>
        <a href="./#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function renderPathwaysHero() {
  return `
    <section class="hero pathways-hero simple-pathways-hero">
      <div>
        <h1>Find a way to uni without relying on ATAR</h1>
        <p>Choose where you are now, type the field you want, and this shows the actual routes to check: TAFE/VET, prep, diploma, portfolio, STAT, SRS/EAS or transfer.</p>
        <div class="pathway-hero-actions">
          <a class="match-btn" href="#pathway-finder">Start pathway check</a>
          <a class="secondary-btn" href="./guide">Build Guide plan</a>
        </div>
      </div>
    </section>
  `;
}

function hasMeaningfulPathwayInput() {
  return Boolean(String(pathwayState.goal || "").trim());
}

function renderPathwayFinder(result) {
  return `
    <section class="panel pathway-planner simple-pathway-finder" id="pathway-finder">
      <div class="panel-head">
        <div>
          <h2>Pathway finder</h2>
          <p>Less random courses, more "what do I do next?" Pick the closest situation and field.</p>
        </div>
        <span class="status-pill">${escapeHtml(result.profile.label)}</span>
      </div>
      <form class="pathway-form simple-pathway-form" data-form="pathway-planner">
        <label>
          <span>Where are you now?</span>
          <select name="situation">
            ${PathwayLogic.pathwaySituations.map((item) => `
              <option value="${escapeHtml(item.id)}" ${item.id === pathwayState.situation ? "selected" : ""}>${escapeHtml(item.label)}</option>
            `).join("")}
          </select>
        </label>
        <label>
          <span>What do you want to study?</span>
          <input name="goal" value="${escapeHtml(pathwayState.goal)}" placeholder="e.g. business, nursing, software, animation" />
        </label>
        <button class="match-btn" type="submit">Show my routes</button>
      </form>
      <p class="pathway-finder-note">${escapeHtml(result.situation.focus)}</p>
    </section>
  `;
}

function renderWaysToGetThere(result) {
  const routes = displayedPathwayRoutes(result);
  return `
    <section class="panel simple-ways-panel">
      <div class="panel-head">
        <div>
          <h2>Ways to get there</h2>
          <p>These are pathway routes, not random uni cards. Use them to know what to search/apply for next.</p>
        </div>
        <span class="status-pill">${routes.length} routes</span>
      </div>
      <div class="simple-route-list" id="pathway-routes" aria-live="polite">
        ${routes.map(renderSimpleRouteCard).join("")}
      </div>
    </section>
  `;
}

function displayedPathwayRoutes(result) {
  const routes = Array.isArray(result.routes) ? result.routes : [];
  if (hasMeaningfulPathwayInput()) return routes;
  return routes.filter((route) => route.id !== "wsu-college");
}

function primaryPathwayRoute(result) {
  return displayedPathwayRoutes(result)[0] || null;
}

function renderSimpleRouteCard(route, index) {
  return `
    <article class="simple-route-card" style="--item-delay:${index * 35}ms">
      <div class="simple-route-rank">${index + 1}</div>
      <div>
        <div class="simple-route-head">
          <div>
            <span class="pathway-type-tag">${escapeHtml(route.shortTitle)}</span>
            <h3>${escapeHtml(route.title)}</h3>
          </div>
          <a href="${escapeHtml(route.officialUrl)}" target="_blank" rel="noopener">${escapeHtml(route.officialLabel)}</a>
        </div>
        <p class="simple-year12-rule">${escapeHtml(route.year12Rule)}</p>
        <div class="simple-route-body">
          <div>
            <h4>Do this</h4>
            <ol>
              ${route.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
            </ol>
          </div>
          <div>
            <h4>Double-check</h4>
            <p>${escapeHtml(route.check)}</p>
            <p>${escapeHtml(route.bestFor)}</p>
          </div>
        </div>
        <dl class="simple-route-info">
          <div>
            <dt>Important details</dt>
            <dd>${escapeHtml(route.details)}</dd>
          </div>
          <div>
            <dt>Requirements to check</dt>
            <dd>${escapeHtml(route.requirements)}</dd>
          </div>
          <div>
            <dt>Pathway to university</dt>
            <dd>${escapeHtml(route.universityPathway)}</dd>
          </div>
        </dl>
        ${renderRouteLinks(route)}
      </div>
    </article>
  `;
}

function renderRouteLinks(route) {
  const links = Array.isArray(route.links) ? route.links : [];
  if (!links.length) return "";

  return `
    <div class="useful-route-links" aria-label="Useful links for ${escapeHtml(route.title)}">
      <h4>Useful links</h4>
      <div>
        ${links.map((link) => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
        `).join("")}
      </div>
    </div>
  `;
}

function renderPathwayProviders(result) {
  const providers = Array.isArray(result.providers) ? result.providers : [];
  if (!providers.length) return "";
  return `
    <section class="panel pathway-provider-panel">
      <div class="panel-head">
        <div>
          <h2>Pathway providers that fit your situation</h2>
          <p>These are ranked for <strong>${escapeHtml(result.situation.label)}</strong> and <strong>${escapeHtml(result.profile.label)}</strong>. They update when either answer changes.</p>
        </div>
        <span class="status-pill">${providers.length} matched</span>
      </div>
      <div class="pathway-provider-grid" aria-live="polite">
        ${providers.map(renderPathwayProviderCard).join("")}
      </div>
      <p class="pathway-provider-disclaimer">A pathway is not automatic admission. Check the linked provider page for current entry, progression, credit, fees and course availability.</p>
    </section>
  `;
}

function renderPathwayProviderCard(provider, index) {
  return `
    <article class="pathway-provider-card" style="--item-delay:${index * 45}ms">
      <div class="pathway-provider-heading">
        <span class="pathway-provider-number">${index + 1}</span>
        <div>
          <span class="eyebrow">Recommended pathway provider</span>
          <h3>${escapeHtml(provider.name)}</h3>
        </div>
      </div>
      <p>${escapeHtml(provider.why)}</p>
      <div class="pathway-program">
        <span>Program to check</span>
        <strong>${escapeHtml(provider.program)}</strong>
      </div>
      <ol class="pathway-provider-journey" aria-label="Pathway steps">
        ${provider.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ol>
      <dl>
        <div><dt>Why this is credible</dt><dd>${escapeHtml(provider.evidence)}</dd></div>
        <div><dt>Requirements to confirm</dt><dd>${escapeHtml(provider.requirements)}</dd></div>
      </dl>
      <a class="secondary-btn pathway-provider-link" href="${escapeHtml(provider.officialUrl)}" target="_blank" rel="noopener">Check official pathway</a>
    </article>
  `;
}

function renderSimplePathwayChecklist(result) {
  const primaryRoute = primaryPathwayRoute(result);
  return `
    <section class="panel pathway-checklist simple-checklist">
      <div class="panel-head">
        <div>
          <h2>Simple order</h2>
          <p>Do not try all pathways at once. Pick the first one that fits, then keep one backup.</p>
        </div>
      </div>
      <ol class="pathway-linear">
        <li>
          <span>1</span>
          <div><strong>Pick your route</strong><p>Start with ${escapeHtml(primaryRoute?.shortTitle || "the best route")} for ${escapeHtml(result.profile.label.toLowerCase())}.</p></div>
        </li>
        <li>
          <span>2</span>
          <div><strong>Confirm entry rules</strong><p>Check if Year 12, ATAR, age, portfolio, STAT, VET level or English/maths prerequisites matter.</p></div>
        </li>
        <li>
          <span>3</span>
          <div><strong>Use the bridge</strong><p>Finish the prep, TAFE/VET, diploma, portfolio or open-access study strongly enough to apply or transfer.</p></div>
        </li>
      </ol>
    </section>
  `;
}

function renderOfficialSources() {
  return `
    <section class="panel pathway-sources simple-sources">
      <div class="panel-head">
        <div>
          <h2>Official places to confirm</h2>
          <p>This page gives the map. These links confirm the real entry rule, deadline, fees and credit.</p>
        </div>
      </div>
      <div class="official-link-grid">
        ${officialPathwayLinks.map((link) => `
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>
        `).join("")}
      </div>
    </section>
  `;
}

function bindPathwayEvents() {
  pathwaysApp.querySelector('[data-form="pathway-planner"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    pathwayState.situation = String(formData.get("situation") || pathwayState.situation);
    pathwayState.goal = String(formData.get("goal") || "").trim();
    refreshPathwaysPage({ scrollToRoutes: true });
  });

  pathwaysApp.querySelector('select[name="situation"]')?.addEventListener("change", (event) => {
    pathwayState.situation = event.currentTarget.value;
    refreshPathwaysPage();
  });
}

function refreshPathwaysPage({ scrollToRoutes = false } = {}) {
  const update = () => renderPathwaysPage();
  const afterUpdate = () => {
    if (scrollToRoutes) {
      pathwaysApp.querySelector("#pathway-routes")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  if (prefersReducedMotion() || typeof document.startViewTransition !== "function") {
    update();
    requestAnimationFrame(afterUpdate);
    return;
  }

  pathwaysApp.classList.add("is-results-updating");
  document.documentElement.classList.add("is-pathway-results-transition");
  const transition = document.startViewTransition(update);
  transition.updateCallbackDone.then(
    () => requestAnimationFrame(afterUpdate),
    () => requestAnimationFrame(afterUpdate)
  );
  const cleanUpTransition = () => {
    pathwaysApp.classList.remove("is-results-updating");
    document.documentElement.classList.remove("is-pathway-results-transition");
  };
  transition.finished.then(cleanUpTransition, cleanUpTransition);
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
}

function currentPathwayResult() {
  return PathwayLogic.buildPathwayResults({
    goal: pathwayState.goal,
    situation: pathwayState.situation,
    courses: pathwayCourses
  });
}

function initialPathwayGoal() {
  const query = new URLSearchParams(window.location.search).get("q");
  if (query) return query;
  return "";
}

function initialSituation() {
  const url = new URL(window.location.href);
  if (url.pathname.includes("no-atar")) return "year12-no-atar";
  return "year12-no-atar";
}

function loadPathwaySnapshot() {
  try {
    return JSON.parse(localStorage.getItem(pathwayPlanSnapshotKey) || "null");
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
