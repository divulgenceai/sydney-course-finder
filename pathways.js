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

renderPathwaysPage();

function renderPathwaysPage() {
  const result = currentPathwayResult();

  pathwaysApp.innerHTML = `
    ${renderPathwaysTopbar()}
    <main class="pathways-page simple-pathways-page">
      ${renderPathwaysHero(result)}
      ${renderPathwayFinder(result)}
      ${renderWaysToGetThere(result)}
      ${renderSimplePathwayChecklist(result)}
      ${renderOfficialSources()}
    </main>
  `;

  bindPathwayEvents();
  window.courseFinderTheme?.bind?.(pathwaysApp);
}

function renderPathwaysTopbar() {
  return `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
        <a href="./guide.html">Guide</a>
        ${window.courseFinderTheme?.myPlanNavMarkup?.() || ""}
        <a href="./pathways.html" aria-current="page">Pathways</a>
        <a href="./index.html#atar">ATAR</a>
        <a href="./atar-calculator.html">Calculator</a>
        <a href="./subject-helper.html">Subjects</a>
        <a href="./advisor.html">Course help</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function renderPathwaysHero(result) {
  return `
    <section class="hero pathways-hero simple-pathways-hero">
      <div>
        <h1>Find a way to uni without relying on ATAR</h1>
        <p>Choose where you are now, type the field you want, and this shows the actual routes to check: TAFE/VET, prep, diploma, portfolio, STAT, SRS/EAS or transfer.</p>
        <div class="pathway-hero-actions">
          <a class="match-btn" href="#pathway-finder">Start pathway check</a>
          <a class="secondary-btn" href="./guide.html">Build Guide plan</a>
        </div>
      </div>
      ${renderBestStartCard(result)}
    </section>
  `;
}

function renderBestStartCard(result) {
  const route = result.routes[0];
  if (!route) {
    return `
      <aside class="pathway-hero-card">
        <span>Your current best start</span>
        <h2>Choose a route</h2>
        <p>Pick your situation and field to see the clearest first pathway.</p>
      </aside>
    `;
  }

  return `
    <aside class="pathway-hero-card">
      <span>Your current best start</span>
      <h2>${escapeHtml(route.title)}</h2>
      <p>${escapeHtml(result.summary)}</p>
      <dl class="pathway-hero-details">
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
      <a href="${escapeHtml(route.officialUrl)}" target="_blank" rel="noopener">Open official info</a>
    </aside>
  `;
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
  return `
    <section class="panel simple-ways-panel">
      <div class="panel-head">
        <div>
          <h2>Ways to get there</h2>
          <p>These are pathway routes, not random uni cards. Use them to know what to search/apply for next.</p>
        </div>
        <span class="status-pill">${result.routes.length} routes</span>
      </div>
      <div class="simple-route-list" id="pathway-routes" aria-live="polite">
        ${result.routes.map(renderSimpleRouteCard).join("")}
      </div>
    </section>
  `;
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

function renderSimplePathwayChecklist(result) {
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
          <div><strong>Pick your route</strong><p>Start with ${escapeHtml(result.routes[0]?.shortTitle || "the best route")} for ${escapeHtml(result.profile.label.toLowerCase())}.</p></div>
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
  pathwaysApp.classList.add("is-refreshing-results");
  window.requestAnimationFrame(() => {
    renderPathwaysPage();
    if (scrollToRoutes) {
      pathwaysApp.querySelector("#pathway-routes")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    window.setTimeout(() => pathwaysApp.classList.remove("is-refreshing-results"), 260);
  });
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
  const snapshot = loadPathwaySnapshot();
  return snapshot?.goalLabel || "";
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
