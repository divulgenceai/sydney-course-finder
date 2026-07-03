const pathwaysApp = document.querySelector("#pathways-app");
const pathwayCourses = window.uacCourses || [];
const pathwayPlanSnapshotKey = "sydneyCourseFinder.guidePlanSnapshot";

const officialPathwayLinks = [
  {
    label: "UAC pathways to university",
    url: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university"
  },
  {
    label: "Schools Recommendation Scheme",
    url: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes"
  },
  {
    label: "Educational Access Scheme",
    url: "https://uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes"
  },
  {
    label: "TAFE NSW pathways",
    url: "https://www.tafensw.edu.au/study/pathways"
  },
  {
    label: "Open Universities Australia pathways",
    url: "https://www.open.edu.au/study-online/pathways-pre-university/oua-pathways"
  }
];

const pathwaySituations = [
  {
    id: "year10",
    label: "Year 10 or below",
    short: "Build the backup early",
    route: "pathway-course",
    note: "Choose Year 11/12 subjects for the dream course, but keep a pathway preference ready in case the ATAR target changes."
  },
  {
    id: "senior-low-atar",
    label: "Year 11/12 and worried about ATAR",
    short: "Protect entry options",
    route: "srs-eas",
    note: "Use SRS/EAS if eligible, then list a diploma, undergraduate certificate or preparation program below the dream course."
  },
  {
    id: "no-atar",
    label: "No ATAR / left school",
    short: "Start with a bridge",
    route: "pathway-course",
    note: "Look at diplomas, undergraduate certificates, uni preparation programs, STAT and recognised VET/TAFE study."
  },
  {
    id: "vet",
    label: "Have or want TAFE/VET first",
    short: "Turn training into credit",
    route: "tafe-vet",
    note: "A Certificate IV, diploma, advanced diploma or associate degree may support entry and sometimes credit toward a bachelor degree."
  },
  {
    id: "creative",
    label: "Creative, design or performance",
    short: "Use evidence of ability",
    route: "portfolio",
    note: "Some providers assess portfolio, audition, interview, CV or relevant practice instead of relying only on ATAR."
  },
  {
    id: "mature",
    label: "Mature-age / returning to study",
    short: "Use adult entry evidence",
    route: "stat",
    note: "STAT, previous tertiary study, work evidence and prep programs can be stronger than trying to rebuild a school ATAR."
  }
];

const pathwayRoutes = [
  {
    id: "pathway-course",
    title: "Pathway course first",
    label: "Diploma / Undergraduate Certificate / foundation",
    confidence: "Best broad backup",
    bestFor: "No ATAR, lower ATAR, Year 10 backup plans and students who want a safer first step.",
    summary: "Use a recognised pathway course to build university-level skills, then apply for the bachelor or move with credit where available.",
    steps: [
      "Pick the target degree and a related pathway course.",
      "Check whether completion guarantees entry, improves competitiveness or gives credit.",
      "Put the pathway course below the dream course in your preference ladder."
    ],
    watch: "Do not assume every diploma gives second-year entry. Credit and progression rules are provider-specific.",
    sourceLabel: "UAC pathway courses",
    sourceUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university"
  },
  {
    id: "tafe-vet",
    title: "TAFE/VET to university",
    label: "Certificate IV / Diploma / Advanced Diploma",
    confidence: "Strong practical route",
    bestFor: "Students who want work-ready skills, a lower-pressure entry route or credit toward a related bachelor.",
    summary: "Complete recognised vocational study, then use it for admission and possible credit transfer into a related university course.",
    steps: [
      "Choose a VET course connected to the degree field.",
      "Check the university credit-transfer or recognition rules before enrolling.",
      "Keep evidence of completed units, results and certificates."
    ],
    watch: "The level of qualification matters. A Certificate III is not treated the same as a diploma at every university.",
    sourceLabel: "TAFE NSW pathways",
    sourceUrl: "https://www.tafensw.edu.au/study/pathways"
  },
  {
    id: "srs-eas",
    title: "Early offer and access schemes",
    label: "SRS / EAS / equity support",
    confidence: "Use if eligible",
    bestFor: "Current Year 12 students with school support, strong non-ATAR evidence or serious educational disadvantage.",
    summary: "SRS can support early offers using criteria beyond ATAR. EAS can help institutions consider disadvantage when selecting applicants.",
    steps: [
      "Submit the UAC undergraduate application first.",
      "Apply for SRS and/or EAS before the listed closing dates.",
      "Still keep pathway courses in preferences because scheme outcomes are not guaranteed."
    ],
    watch: "SRS and EAS do not erase prerequisites. They also depend on institution rules and eligibility evidence.",
    sourceLabel: "UAC SRS and EAS",
    sourceUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university"
  },
  {
    id: "stat",
    title: "STAT or mature-age entry",
    label: "Skills for Tertiary Admissions Test",
    confidence: "Useful when school results are thin",
    bestFor: "Applicants with no recent formal study, mature-age applicants or people returning after a long break.",
    summary: "STAT can give institutions evidence of critical thinking and written communication when there are limited formal qualifications.",
    steps: [
      "Check whether the exact university and course accept STAT.",
      "Confirm which STAT version is required.",
      "Use STAT alongside any work history, certificates or prior study evidence."
    ],
    watch: "STAT acceptance varies by institution and course, so it is a confirmation task, not a shortcut you assume.",
    sourceLabel: "UAC STAT pathway",
    sourceUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university"
  },
  {
    id: "portfolio",
    title: "Portfolio, audition or interview",
    label: "Evidence-based admission",
    confidence: "Great for creative fields",
    bestFor: "Animation, design, media, music, acting, architecture-adjacent and other practical creative pathways.",
    summary: "Some courses assess portfolios, auditions, interviews, CVs or demonstrated practice alongside or instead of an ATAR.",
    steps: [
      "Collect 6-12 strong pieces or examples of relevant work.",
      "Check the exact brief, file format, interview or audition requirement.",
      "Treat the portfolio like a subject: build it across Year 10-12, not the week before."
    ],
    watch: "Portfolio entry is usually course-specific. A good portfolio for animation is not automatically right for architecture or music.",
    sourceLabel: "Check course admission criteria",
    sourceUrl: "https://uac.edu.au/course-search/search"
  },
  {
    id: "transfer",
    title: "Start related, then transfer",
    label: "Lower-entry course / internal transfer",
    confidence: "Good ladder strategy",
    bestFor: "Students close to the target ATAR or aiming for a competitive course with realistic backup options.",
    summary: "Begin in a related bachelor, diploma or associate degree, perform well, then apply to transfer into the target course.",
    steps: [
      "Choose a backup that shares first-year subjects with the dream course.",
      "Check minimum GPA/WAM, credit rules and transfer deadlines.",
      "Build a preference list with dream, realistic and safer related courses."
    ],
    watch: "Transfer is competitive and never automatic unless the provider states a packaged progression rule.",
    sourceLabel: "UAC admission criteria",
    sourceUrl: "https://uac.edu.au/future-applicants/admission-criteria"
  },
  {
    id: "oua",
    title: "Open access study first",
    label: "OUA / single units / open pathways",
    confidence: "Flexible restart route",
    bestFor: "People who need online study, want to prove readiness slowly or cannot commit to a full degree immediately.",
    summary: "Start with open-access subjects or an undergraduate certificate, then use successful study as evidence for a related degree.",
    steps: [
      "Start with a small load and pick subjects that map to the target degree.",
      "Aim for strong results because later entry may use tertiary performance.",
      "Ask the receiving university which units can count for credit."
    ],
    watch: "Open access does not mean every later degree is guaranteed. Results and course rules still matter.",
    sourceLabel: "Open Universities Australia",
    sourceUrl: "https://www.open.edu.au/study-online/pathways-pre-university/oua-pathways"
  },
  {
    id: "work",
    title: "Work experience plus later study",
    label: "Industry evidence / apprenticeship / traineeship",
    confidence: "Slower but real",
    bestFor: "Students who need income now, want an apprenticeship/traineeship or prefer proving skill in industry first.",
    summary: "Build a work record and relevant certificates, then use recognised qualifications, portfolio and experience for later admission.",
    steps: [
      "Pick work that builds evidence in the same field as the future degree.",
      "Add certificates, short courses or a diploma when possible.",
      "Use references, CV evidence and recognised study when applying later."
    ],
    watch: "Experience helps most when it is relevant and documented. It may not replace academic prerequisites.",
    sourceLabel: "UAC institution profiles",
    sourceUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university"
  }
];

const pathwayState = {
  situation: "no-atar",
  goal: initialPathwayGoal(),
  routeFilter: "All pathways"
};

renderPathwaysPage();

function renderPathwaysPage() {
  const snapshot = loadPathwaySnapshot();
  const route = recommendedRoute();
  const matches = matchingPathwayCourses();

  pathwaysApp.innerHTML = `
    ${renderPathwaysTopbar()}
    <main class="pathways-page">
      ${renderPathwaysHero(snapshot, route)}
      ${renderPathwayPlanner(route)}
      ${renderPathwayRouteSection(route)}
      ${renderPathwayCourseSection(matches)}
      ${renderPathwayChecklist()}
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
        <a href="./my-plan.html">My Plan</a>
        <a href="./pathways.html" aria-current="page">Pathways</a>
        <a href="./index.html#atar">ATAR match</a>
        <a href="./atar-calculator.html">ATAR calculator</a>
        <a href="./subject-helper.html">Subject helper</a>
        <a href="./advisor.html">Course helper</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function renderPathwaysHero(snapshot, route) {
  const savedTarget = snapshot?.primary?.name
    ? `${snapshot.primary.name}${snapshot.primary.university ? ` at ${snapshot.primary.university}` : ""}`
    : "";
  return `
    <section class="hero pathways-hero">
      <div>
        <h1>Pathways to uni without relying only on ATAR</h1>
        <p>For when the normal Year 11/12 → ATAR → direct offer path is not the only plan. Compare diplomas, undergraduate certificates, foundation/prep, TAFE/VET, STAT, SRS, EAS, portfolio entry, open access and transfer ladders.</p>
        <div class="pathway-hero-actions">
          <a class="match-btn" href="#pathway-planner">Find my best route</a>
          <a class="help-link" href="./guide.html">Build full Guide plan</a>
        </div>
      </div>
      <aside class="pathway-hero-card" aria-label="Recommended pathway">
        <span>Best starting route</span>
        <h2>${escapeHtml(route.title)}</h2>
        <p>${escapeHtml(route.summary)}</p>
        ${savedTarget ? `<p class="pathway-saved-note">Saved Guide target: ${escapeHtml(savedTarget)}</p>` : `<p class="pathway-saved-note">Tip: build Guide first and this page can sit beside your saved plan.</p>`}
      </aside>
    </section>
  `;
}

function renderPathwayPlanner(route) {
  const situation = pathwaySituations.find((item) => item.id === pathwayState.situation) || pathwaySituations[0];
  return `
    <section class="panel pathway-planner" id="pathway-planner">
      <div class="panel-head">
        <div>
          <h2>Choose the route that fits your situation</h2>
          <p>This does not replace official admission rules. It tells you which option to check first, and what evidence you need.</p>
        </div>
        <span class="status-pill">${escapeHtml(route.confidence)}</span>
      </div>
      <form class="pathway-form" data-form="pathway-planner">
        <label>
          <span>Your current situation</span>
          <select name="situation">
            ${pathwaySituations.map((item) => `
              <option value="${escapeHtml(item.id)}" ${item.id === pathwayState.situation ? "selected" : ""}>${escapeHtml(item.label)}</option>
            `).join("")}
          </select>
        </label>
        <label>
          <span>Degree, job or field you want</span>
          <input name="goal" value="${escapeHtml(pathwayState.goal)}" placeholder="e.g. nursing, computer science, teaching, animation" />
        </label>
        <button class="match-btn" type="submit">Update pathway plan</button>
      </form>
      <div class="pathway-recommendation">
        <div>
          <p class="eyebrow">Recommended first check</p>
          <h3>${escapeHtml(route.title)}</h3>
          <p>${escapeHtml(situation.note)}</p>
        </div>
        <ol>
          ${route.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </div>
    </section>
  `;
}

function renderPathwayRouteSection(selectedRoute) {
  return `
    <section class="panel pathway-route-panel">
      <div class="panel-head">
        <div>
          <h2>All main alternative pathways</h2>
          <p>Use these like a menu. The “best” one depends on your year level, evidence, target degree and how much time you can spend bridging.</p>
        </div>
      </div>
      <div class="pathway-route-grid">
        ${pathwayRoutes.map((route) => renderPathwayRouteCard(route, route.id === selectedRoute.id)).join("")}
      </div>
    </section>
  `;
}

function renderPathwayRouteCard(route, selected) {
  return `
    <article class="pathway-route-card ${selected ? "is-selected" : ""}">
      <div>
        <span class="pathway-type-tag">${escapeHtml(route.label)}</span>
        <h3>${escapeHtml(route.title)}</h3>
        <p>${escapeHtml(route.summary)}</p>
      </div>
      <dl>
        <div>
          <dt>Best for</dt>
          <dd>${escapeHtml(route.bestFor)}</dd>
        </div>
        <div>
          <dt>Watch</dt>
          <dd>${escapeHtml(route.watch)}</dd>
        </div>
      </dl>
      <div class="pathway-card-actions">
        <button type="button" class="help-link" data-route-pick="${escapeHtml(route.id)}">Show courses</button>
        <a href="${escapeHtml(route.sourceUrl)}" target="_blank" rel="noopener">Official info</a>
      </div>
    </article>
  `;
}

function renderPathwayCourseSection(matches) {
  return `
    <section class="panel pathway-course-panel">
      <div class="panel-head">
        <div>
          <h2>Pathway-style courses in the imported UAC data</h2>
          <p>These are course records that look like a Diploma, Undergraduate Certificate, foundation/preparation program, no-ATAR alternative entry or transfer-friendly ladder. Always confirm the official provider page.</p>
        </div>
        <span class="status-pill" data-pathway-count>${pathwayCountLabel(matches)}</span>
      </div>
      <div class="pathway-filter-row">
        <label>
          <span>Search field</span>
          <input data-pathway-goal value="${escapeHtml(pathwayState.goal)}" placeholder="Try nursing, software, teaching, business, design" />
        </label>
        <label>
          <span>Route type</span>
          <select data-pathway-route-filter>
            ${["All pathways", ...pathwayRoutes.map((route) => route.title), "No ATAR / alternative entry"].map((label) => `
              <option value="${escapeHtml(label)}" ${label === pathwayState.routeFilter ? "selected" : ""}>${escapeHtml(label)}</option>
            `).join("")}
          </select>
        </label>
      </div>
      <div id="pathway-course-results" class="pathway-course-list">
        ${renderPathwayCourseResults(matches)}
      </div>
    </section>
  `;
}

function renderPathwayCourseResults(matches = matchingPathwayCourses()) {
  if (!matches.length) {
    return `
      <div class="pathway-empty">
        <h3>No close pathway course match yet</h3>
        <p>Try a broader field like health, business, IT, teaching, design or science. Some pathway options are institution pages rather than UAC course records, so use the official links below too.</p>
      </div>
    `;
  }
  return matches.slice(0, 12).map(renderPathwayCourseCard).join("");
}

function renderPathwayCourseCard(course) {
  const type = coursePathwayType(course) || "Alternative route";
  const atar = displayRank(course.atar);
  const logo = course.providerLogo
    ? `<img src="${escapeHtml(course.providerLogo)}" alt="${escapeHtml(course.university || "University")} logo" loading="lazy" />`
    : `<span class="pathway-logo-fallback">${escapeHtml((course.university || "U").slice(0, 1))}</span>`;
  return `
    <article class="pathway-course-card">
      <div class="pathway-course-logo">${logo}</div>
      <div>
        <span class="pathway-type-tag">${escapeHtml(type)}</span>
        <h3>${escapeHtml(course.name || "Untitled course")}</h3>
        <p class="pathway-provider">${escapeHtml(course.university || "Provider")} ${course.campus ? `- ${escapeHtml(course.campus)}` : ""}</p>
        <p>${escapeHtml(pathwayCourseReason(course, type))}</p>
        <div class="pathway-course-meta">
          <span>ATAR/profile: ${escapeHtml(atar)}</span>
          ${course.duration ? `<span>${escapeHtml(course.duration)}</span>` : ""}
          ${Array.isArray(course.modes) && course.modes.length ? `<span>${escapeHtml(course.modes.slice(0, 2).join(", "))}</span>` : ""}
        </div>
        <div class="pathway-card-actions">
          ${course.uacUrl ? `<a href="${escapeHtml(course.uacUrl)}" target="_blank" rel="noopener">UAC course</a>` : ""}
          ${course.officialUrl ? `<a href="${escapeHtml(course.officialUrl)}" target="_blank" rel="noopener">Uni page</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderPathwayChecklist() {
  const route = recommendedRoute();
  return `
    <section class="panel pathway-checklist">
      <div class="panel-head">
        <div>
          <h2>How to actually use a pathway</h2>
          <p>The trick is not “skip ATAR and hope”. It is evidence + official rules + a smart preference ladder.</p>
        </div>
      </div>
      <ol class="pathway-linear">
        <li>
          <span>1</span>
          <div><strong>Name the dream course</strong><p>Pick the course/job first so your pathway points somewhere real, not just “any uni”.</p></div>
        </li>
        <li>
          <span>2</span>
          <div><strong>Choose a bridge</strong><p>For you, start by checking: ${escapeHtml(route.title)}. Keep a second route as backup.</p></div>
        </li>
        <li>
          <span>3</span>
          <div><strong>Confirm the rule</strong><p>Look for exact progression, credit transfer, prerequisite, portfolio, STAT, SRS or EAS rules on the university/UAC page.</p></div>
        </li>
        <li>
          <span>4</span>
          <div><strong>Build preferences</strong><p>Put dream course first, realistic related courses next, then pathway courses that protect the same career direction.</p></div>
        </li>
        <li>
          <span>5</span>
          <div><strong>Use performance to upgrade</strong><p>Once in, strong uni/TAFE results can support transfer, credit or a stronger later application.</p></div>
        </li>
      </ol>
    </section>
  `;
}

function renderOfficialSources() {
  return `
    <section class="panel pathway-sources">
      <div class="panel-head">
        <div>
          <h2>Official places to confirm</h2>
          <p>Rules change. Use this site to plan, then verify exact admissions rules, deadlines, fees, credit and prerequisites.</p>
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
    const nextRoute = recommendedRoute();
    pathwayState.routeFilter = nextRoute.title;
    renderPathwaysPage();
    pathwaysApp.querySelector("#pathway-course-results")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  pathwaysApp.querySelectorAll("[data-route-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      const route = pathwayRoutes.find((item) => item.id === button.dataset.routePick);
      if (!route) return;
      pathwayState.routeFilter = route.title;
      updatePathwayCourseResults();
      pathwaysApp.querySelector("#pathway-course-results")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  const goalInput = pathwaysApp.querySelector("[data-pathway-goal]");
  goalInput?.addEventListener("input", () => {
    pathwayState.goal = goalInput.value;
    updatePathwayCourseResults();
  });

  pathwaysApp.querySelector("[data-pathway-route-filter]")?.addEventListener("change", (event) => {
    pathwayState.routeFilter = event.currentTarget.value;
    updatePathwayCourseResults();
  });
}

function updatePathwayCourseResults() {
  const matches = matchingPathwayCourses();
  const results = pathwaysApp.querySelector("#pathway-course-results");
  const count = pathwaysApp.querySelector("[data-pathway-count]");
  if (results) results.innerHTML = renderPathwayCourseResults(matches);
  if (count) count.textContent = pathwayCountLabel(matches);
}

function recommendedRoute() {
  const situation = pathwaySituations.find((item) => item.id === pathwayState.situation) || pathwaySituations[0];
  const goalText = cleanSearchText(pathwayState.goal);
  if (/(art|animation|design|music|acting|film|media|portfolio|game|creative)/.test(goalText)) {
    return pathwayRoutes.find((route) => route.id === "portfolio") || pathwayRoutes[0];
  }
  if (/(mature|return|adult|stat)/.test(goalText)) {
    return pathwayRoutes.find((route) => route.id === "stat") || pathwayRoutes[0];
  }
  if (/(tafe|vet|certificate|apprentice|trade)/.test(goalText)) {
    return pathwayRoutes.find((route) => route.id === "tafe-vet") || pathwayRoutes[0];
  }
  return pathwayRoutes.find((route) => route.id === situation.route) || pathwayRoutes[0];
}

function matchingPathwayCourses() {
  const goalTokens = tokenise(pathwayState.goal);
  const routeFilter = pathwayState.routeFilter;
  const selectedRoute = pathwayRoutes.find((route) => route.title === routeFilter);
  return pathwayCourses
    .map((course) => ({
      course,
      type: coursePathwayType(course),
      score: pathwayCourseScore(course, goalTokens, selectedRoute, routeFilter)
    }))
    .filter((entry) => entry.type && entry.score > 0)
    .sort((a, b) => b.score - a.score || String(a.course.name || "").localeCompare(String(b.course.name || "")))
    .map((entry) => entry.course);
}

function pathwayCourseScore(course, goalTokens, selectedRoute, routeFilter) {
  const type = coursePathwayType(course);
  if (!type) return 0;
  const text = cleanSearchText(courseSearchBlob(course));
  let score = 10;
  if (goalTokens.length) {
    const hits = goalTokens.filter((token) => text.includes(token)).length;
    if (!hits) return 0;
    score += hits * 9;
  }
  if (routeFilter && routeFilter !== "All pathways") {
    const wanted = cleanSearchText(routeFilter);
    const routeWords = selectedRoute ? cleanSearchText([selectedRoute.title, selectedRoute.label, selectedRoute.summary].join(" ")) : wanted;
    const hasRouteMatch = cleanSearchText(type).includes(wanted)
      || routeWords.includes(cleanSearchText(type))
      || routeTypeMatchesRoute(type, selectedRoute?.id || routeFilter);
    if (!hasRouteMatch) score -= 6;
    else score += 8;
  }
  if (String(course.atar || "").toUpperCase() === "NO") score += 5;
  if (/diploma|undergraduate certificate|foundation|prepar|pathway|associate degree/.test(text)) score += 4;
  if (/portfolio|interview|audition|certificate iv|vet diploma|higher education diploma/.test(text)) score += 2;
  return Math.max(0, score);
}

function routeTypeMatchesRoute(type, routeId) {
  const cleanType = cleanSearchText(type);
  if (routeId === "pathway-course") return /diploma|undergraduate certificate|foundation|preparation|pathway|associate/.test(cleanType);
  if (routeId === "tafe-vet") return /tafe|vet|diploma|certificate/.test(cleanType);
  if (routeId === "portfolio") return /portfolio|alternative/.test(cleanType);
  if (routeId === "stat") return /stat|alternative/.test(cleanType);
  if (routeId === "transfer") return /associate|diploma|pathway/.test(cleanType);
  if (routeId === "oua") return /undergraduate certificate|open/.test(cleanType);
  return true;
}

function coursePathwayType(course) {
  const text = cleanSearchText(courseSearchBlob(course));
  if (/undergraduate certificate/.test(text)) return "Undergraduate Certificate";
  if (/associate degree/.test(text)) return "Associate degree";
  if (/advanced diploma|higher education diploma|vet diploma| diploma /.test(` ${text} `)) return "Diploma";
  if (/foundation|preparatory|preparation|tertiary preparation|enabling/.test(text)) return "Foundation / preparation";
  if (/pathway|college/.test(text)) return "Pathway course";
  if (/portfolio|audition|screening interview|interview|relevant work or practice/.test(text)) return "Portfolio / interview";
  if (/certificate iv|tafe|vet/.test(text)) return "TAFE/VET";
  if (String(course.atar || "").toUpperCase() === "NO") return "No ATAR / alternative entry";
  return "";
}

function pathwayCourseReason(course, type) {
  const text = cleanSearchText(courseSearchBlob(course));
  if (type === "Undergraduate Certificate") return "Short university-level study that may support entry or credit into a related degree.";
  if (type === "Diploma") return "A diploma-style pathway can build credit and a stronger entry case for related bachelor study.";
  if (type === "Foundation / preparation") return "Designed to build tertiary readiness before starting a degree-level course.";
  if (type === "Portfolio / interview") return "This record mentions portfolio, interview, audition or practice-based evidence.";
  if (type === "TAFE/VET") return "This record mentions VET, TAFE or certificate evidence that may support entry.";
  if (/certificate iv|vet diploma|higher education diploma/.test(text)) return "This course record recognises completed vocational or higher education study as entry evidence.";
  return "This record has no numeric ATAR/profile or includes alternative pathway signals, so confirm the exact entry rule.";
}

function courseSearchBlob(course) {
  return [
    course.name,
    course.university,
    course.campus,
    course.area,
    course.summary,
    course.prerequisites,
    course.assumed,
    course.additionalCriteria,
    course.careers,
    course.courseLevel,
    course.duration
  ].filter(Boolean).join(" ");
}

function initialPathwayGoal() {
  const query = new URLSearchParams(window.location.search).get("q");
  if (query) return query;
  const snapshot = loadPathwaySnapshot();
  return snapshot?.goalLabel || snapshot?.primary?.name || "";
}

function loadPathwaySnapshot() {
  try {
    return JSON.parse(localStorage.getItem(pathwayPlanSnapshotKey) || "null");
  } catch {
    return null;
  }
}

function displayRank(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Not listed";
  if (raw.toUpperCase() === "NO") return "No numeric ATAR";
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : raw;
}

function pathwayCountLabel(matches) {
  if (!matches.length) return "0 matches";
  const shown = Math.min(matches.length, 12);
  return matches.length > shown ? `${shown} of ${matches.length} shown` : `${matches.length} shown`;
}

function tokenise(value) {
  return cleanSearchText(value)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !["and", "the", "for", "with", "course", "degree", "bachelor"].includes(token));
}

function cleanSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
