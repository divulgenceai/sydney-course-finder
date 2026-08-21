const uacPlannerApp = document.querySelector("#uac-planner-app");
const plannerCourses = (window.uacCourses || []).filter((course) => course.level === "undergraduate");
const plannerProviders = window.uacProviders || [];
const earlyCatalogue = window.earlyEntryCatalogue || { meta: {}, srs: {}, institutions: [] };
const plannerStorageKey = "sydneyCourseFinder.uacPreferenceDraft";
const savedCoursesKey = "sydneyCourseFinder.savedCourses";
const providerById = new Map(plannerProviders.map((provider) => [provider.id, provider]));
const providerByName = new Map(plannerProviders.map((provider) => [provider.name, provider]));
const courseById = new Map(plannerCourses.map((course) => [course.id, course]));
const plannerInstitutions = ["All institutions", ...new Set(plannerCourses.map((course) => course.university).filter(Boolean))]
  .sort((a, b) => a === "All institutions" ? -1 : b === "All institutions" ? 1 : plannerInstitutionLabel(a).localeCompare(plannerInstitutionLabel(b)));

const plannerState = {
  view: location.hash === "#early-entry" ? "early-entry" : "preferences",
  preferences: [],
  targetAtar: "",
  courseQuery: "",
  institution: "All institutions",
  suggestionsOpen: false,
  earlyQuery: "",
  earlyType: "All routes",
  earlyStatus: "All statuses",
  earlyStage: "Year 12 in 2026",
  notice: ""
};

loadPreferenceDraft();
renderUacPlanner();

function renderUacPlanner() {
  uacPlannerApp.innerHTML = `
    ${renderPlannerTopbar()}
    <main class="uac-planner-page">
      <section class="hero uac-planner-hero">
        <div>
          <p class="eyebrow">UAC application tools</p>
          <h1>Plan your UAC application</h1>
          <p>Build a five-course practice preference list, then check the current early-entry routes you can apply for outside the main ATAR offer round.</p>
        </div>
        <aside class="uac-planner-source">
          <span>Verified cycle</span>
          <strong>${escapeHtml(earlyCatalogue.meta.cycle || "Current applications")}</strong>
          <p>${escapeHtml(earlyCatalogue.meta.intake || "Next intake")} · official sources checked ${formatCheckedDate(earlyCatalogue.meta.checkedAt)}.</p>
          <a href="${escapeAttribute(earlyCatalogue.meta.uacSource)}" target="_blank" rel="noopener">Open UAC's current scheme list ${externalIcon()}</a>
        </aside>
      </section>

      <nav class="uac-planner-tabs" aria-label="UAC planner tools">
        <button type="button" data-planner-view="preferences" aria-selected="${plannerState.view === "preferences"}">
          <span>1</span><strong>Preference planner</strong><small>Build a practice top five</small>
        </button>
        <button type="button" data-planner-view="early-entry" aria-selected="${plannerState.view === "early-entry"}">
          <span>2</span><strong>Early-entry finder</strong><small>Use exact official routes</small>
        </button>
      </nav>

      <section class="uac-planner-view" data-planner-panel="preferences" ${plannerState.view === "preferences" ? "" : "hidden"}>
        ${renderPreferencePlanner()}
      </section>
      <section class="uac-planner-view" data-planner-panel="early-entry" ${plannerState.view === "early-entry" ? "" : "hidden"}>
        ${renderEarlyEntryFinder()}
      </section>
      <p class="sr-only" aria-live="polite" data-planner-live>${escapeHtml(plannerState.notice)}</p>
    </main>
  `;

  bindPlannerEvents();
  bindPlannerLogoFallbacks(uacPlannerApp);
  window.courseFinderTheme?.bind?.(uacPlannerApp);
}

function renderPlannerTopbar() {
  return `
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./#courses">Courses</a>
        <a href="./#providers">Universities</a>
        <a href="./#tools" aria-current="page">Tools</a>
        <a href="./#saved">Saved</a>
        <a href="./#about">About</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function renderPreferencePlanner() {
  const savedCount = savedCourseIds().filter((id) => courseById.has(id) && !plannerState.preferences.includes(id)).length;
  return `
    <section class="panel preference-planner-panel">
      <div class="panel-head preference-planner-head">
        <div>
          <p class="section-kicker">Practice only</p>
          <h2>Your UAC preference draft</h2>
          <p>Domestic undergraduate applicants can list up to five preferences. Put the course you genuinely want most first—UAC assesses from preference 1 down.</p>
        </div>
        <span>${plannerState.preferences.length} / 5 added</span>
      </div>

      ${renderPreferenceReadiness()}

      <div class="preference-controls">
        <label class="preference-course-search">
          <span>Find a course to add</span>
          <span class="preference-search-control">
            ${searchIcon()}
            <input type="search" name="preference-query" value="${escapeAttribute(plannerState.courseQuery)}" placeholder="Course, university or UAC code" autocomplete="off" />
          </span>
          <div class="preference-suggestions" data-preference-suggestions ${plannerState.suggestionsOpen ? "" : "hidden"}>
            ${renderCourseSuggestions()}
          </div>
        </label>
        <label class="preference-institution-filter">
          <span>Institution</span>
          <select name="preference-institution">
            ${plannerInstitutions.map((institution) => `<option value="${escapeAttribute(institution)}" ${plannerState.institution === institution ? "selected" : ""}>${escapeHtml(plannerInstitutionLabel(institution))}</option>`).join("")}
          </select>
        </label>
        <label class="preference-atar-target">
          <span>Your estimated ATAR <small>optional</small></span>
          <input type="number" name="preference-atar" min="0" max="99.95" step="0.05" value="${escapeAttribute(plannerState.targetAtar)}" placeholder="e.g. 82.50" />
        </label>
      </div>

      <div class="preference-quick-actions">
        ${savedCount ? `<button type="button" class="secondary-btn" data-action="import-saved-preferences">Add from Saved (${savedCount})</button>` : ""}
        <button type="button" class="secondary-btn" data-action="copy-preferences" ${plannerState.preferences.length ? "" : "disabled"}>Copy list</button>
        <button type="button" class="clear-btn" data-action="clear-preferences" ${plannerState.preferences.length ? "" : "disabled"}>Clear draft</button>
      </div>

      <div class="preference-workspace">
        <div class="preference-table-wrap">
          <div class="preference-table-heading" aria-hidden="true">
            <span>Preference</span><span>Institution</span><span>Course</span><span>Entry signal</span><span>Order</span>
          </div>
          <ol class="preference-list" data-preference-list>
            ${Array.from({ length: 5 }, (_, index) => renderPreferenceSlot(index)).join("")}
          </ol>
        </div>
        <aside class="preference-order-check" data-preference-summary>
          ${renderPreferenceSummary()}
        </aside>
      </div>

      <div class="preference-footer-actions">
        <a class="match-btn" href="${escapeAttribute(earlyCatalogue.meta.uacApplyUrl)}" target="_blank" rel="noopener">Open UAC application ${externalIcon()}</a>
        <a class="secondary-btn" href="${escapeAttribute(earlyCatalogue.meta.preferenceAdviceUrl)}" target="_blank" rel="noopener">Read official preference advice ${externalIcon()}</a>
      </div>
      <p class="planner-disclaimer">This draft is stored only in this browser and does not change your real UAC application. Course entry figures are historical and do not guarantee admission.</p>
    </section>
  `;
}

function renderPreferenceReadiness() {
  const courses = plannerState.preferences.map((id) => courseById.get(id)).filter(Boolean);
  const target = numericTargetAtar();
  const hasBackup = target !== null && courses.some((course) => {
    const rank = numericSelectionRank(course);
    return rank !== null && target - rank >= 4;
  });
  const steps = [
    { label: "Dream choice", ready: courses.length > 0 },
    { label: "ATAR context", ready: target !== null },
    { label: "Safer backup", ready: hasBackup },
    { label: "Five preferences", ready: courses.length === 5 }
  ];
  return `
    <ol class="preference-readiness" aria-label="Preference draft readiness">
      ${steps.map((step, index) => `<li class="${step.ready ? "is-ready" : ""}"><span>${step.ready ? "✓" : index + 1}</span><b>${escapeHtml(step.label)}</b></li>`).join("")}
    </ol>
  `;
}

function renderCourseSuggestions() {
  const query = plannerState.courseQuery.trim();
  if (!query && plannerState.institution === "All institutions") return "";
  const matches = rankCourseSuggestions(query);
  if (!matches.length) {
    return `<p class="preference-suggestion-empty">No close course match. Try a broader title, provider name or six-digit UAC code.</p>`;
  }
  return `
    <div class="preference-suggestion-meta" role="status">
      <strong>${number(matches.length)} course${matches.length === 1 ? "" : "s"}</strong>
      <span>Best title and institution matches first</span>
    </div>
    ${matches.map((course) => `
    <button type="button" data-add-preference="${escapeAttribute(course.id)}" ${plannerState.preferences.includes(course.id) ? "disabled" : ""}>
      ${plannerProviderMark(course)}
      <span><strong>${escapeHtml(course.name)}</strong><small><b>${escapeHtml(course.university)}</b> · ${escapeHtml(course.campus || "Campus check required")}</small></span>
      <span><b>${entryFigureLabel(course)}</b><small>Code ${escapeHtml(course.courseCode || "—")}</small></span>
    </button>
    `).join("")}
  `;
}

function renderPreferenceSlot(index) {
  const course = courseById.get(plannerState.preferences[index]);
  if (!course) {
    return `
      <li class="preference-slot is-empty">
        <span class="preference-number">${index + 1}</span>
        <div><strong>Empty preference</strong><small>Search above to add a course here.</small></div>
        <span class="preference-empty-line" aria-hidden="true"></span>
      </li>
    `;
  }
  const fit = courseFit(course);
  return `
    <li class="preference-slot" data-preference-id="${escapeAttribute(course.id)}">
      <span class="preference-number">${index + 1}</span>
      ${plannerProviderMark(course)}
      <div class="preference-course-copy">
        <strong>${escapeHtml(course.name)}</strong>
        <span>${escapeHtml(course.university)} · ${escapeHtml(course.campus || "Campus check required")}</span>
        <small>UAC code ${escapeHtml(course.courseCode || "—")}</small>
      </div>
      <div class="preference-entry-signal ${escapeAttribute(fit.tone)}">
        <strong>${escapeHtml(entryFigureLabel(course))}</strong>
        <span>${escapeHtml(fit.label)}</span>
      </div>
      <div class="preference-row-actions">
        <button type="button" data-move-preference="up" aria-label="Move ${escapeAttribute(course.name)} up" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" data-move-preference="down" aria-label="Move ${escapeAttribute(course.name)} down" ${index === plannerState.preferences.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" data-remove-preference aria-label="Remove ${escapeAttribute(course.name)}">Remove</button>
      </div>
    </li>
  `;
}

function renderPreferenceSummary() {
  if (!plannerState.preferences.length) {
    return `
      <span class="preference-summary-kicker">How to order it</span>
      <h3>Desire first, safety second</h3>
      <ol>
        <li>Put your genuine first choice at number 1.</li>
        <li>Add realistic alternatives you would actually accept.</li>
        <li>Keep at least one safer or pathway option if possible.</li>
      </ol>
      <p>UAC can make only one offer per offer round and checks your list from the highest preference downward.</p>
    `;
  }
  const courses = plannerState.preferences.map((id) => courseById.get(id)).filter(Boolean);
  const target = numericTargetAtar();
  const ranked = courses.filter((course) => numericSelectionRank(course) !== null);
  const saferCount = target === null ? 0 : ranked.filter((course) => target - numericSelectionRank(course) >= 4).length;
  const stretchCount = target === null ? 0 : ranked.filter((course) => numericSelectionRank(course) - target > 4).length;
  const missingEntry = courses.length - ranked.length;
  return `
    <span class="preference-summary-kicker">Draft check</span>
    <h3>${preferenceDraftHeadline(courses, target, saferCount)}</h3>
    <dl>
      <div><dt>Courses listed</dt><dd>${courses.length} / 5</dd></div>
      <div><dt>Safer on current figures</dt><dd>${target === null ? "Add ATAR" : saferCount}</dd></div>
      <div><dt>Stretch choices</dt><dd>${target === null ? "Add ATAR" : stretchCount}</dd></div>
    </dl>
    <p>${target === null ? "Add an estimated ATAR to label entry risk. It will never automatically reorder your preferences." : `Compared with an estimated ATAR of ${formatAtar(target)}. Adjustment factors and prerequisites can change the real outcome.`}</p>
    ${missingEntry ? `<p class="preference-summary-warning">${missingEntry} course${missingEntry === 1 ? " has" : "s have"} no numeric UAC entry figure in the imported record. Check the official course page.</p>` : ""}
  `;
}

function renderEarlyEntryFinder() {
  const results = filteredEarlyInstitutions();
  return `
    <section class="panel early-entry-panel">
      <div class="panel-head early-entry-head">
        <div>
          <p class="section-kicker">Verified application routes</p>
          <h2>Early-entry scheme finder</h2>
          <p>This covers every institution and scheme currently listed on UAC's 2026 early-offer page, including SRS-only routes and specialised equity or portfolio schemes.</p>
        </div>
        <span data-early-count>${results.length} institutions</span>
      </div>

      <div class="early-entry-filters">
        <label class="early-entry-search">
          <span>University or scheme</span>
          <span class="preference-search-control">${searchIcon()}<input type="search" name="early-query" value="${escapeAttribute(plannerState.earlyQuery)}" placeholder="Try UTS, Gateway, SRS or portfolio" /></span>
        </label>
        <label><span>Where you are now</span><select name="early-stage">
          ${["Year 12 in 2026", "Year 11 / planning ahead", "Not a current Year 12 student"].map((value) => `<option ${plannerState.earlyStage === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>
        <label><span>Route type</span><select name="early-type">
          ${["All routes", "UAC SRS", "Direct", "Equity", "Creative", "Leadership"].map((value) => `<option ${plannerState.earlyType === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>
        <label><span>Application status</span><select name="early-status">
          ${["All statuses", "Open now", "Opening later", "Check now", "Closed"].map((value) => `<option ${plannerState.earlyStatus === value ? "selected" : ""}>${value}</option>`).join("")}
        </select></label>
      </div>

      ${renderEarlyStageNotice()}
      <div class="early-entry-results" data-early-results>
        ${results.length ? results.map(renderEarlyInstitutionCard).join("") : renderEarlyEmptyState()}
      </div>

      <div class="early-entry-source-note">
        <div><strong>Accuracy rule</strong><p>Dates and eligibility can change, and competitive courses are often excluded. Every action below opens the exact scheme, application portal or UAC route—not a university homepage.</p></div>
        <a href="${escapeAttribute(earlyCatalogue.meta.uacSource)}" target="_blank" rel="noopener">Check the UAC master list ${externalIcon()}</a>
      </div>
    </section>
  `;
}

function renderEarlyStageNotice() {
  if (plannerState.earlyStage === "Year 12 in 2026") {
    return `<div class="early-stage-notice"><strong>Use more than one route.</strong><span>A direct early-entry application does not stop you applying through UAC. Keep a normal UAC preference list as a backup.</span></div>`;
  }
  if (plannerState.earlyStage === "Year 11 / planning ahead") {
    return `<div class="early-stage-notice is-planning"><strong>Use this as a planning preview.</strong><span>These dates are for students in Year 12 during 2026. Your application cycle will have new dates and possibly different schemes.</span></div>`;
  }
  return `<div class="early-stage-notice is-warning"><strong>Most “early entry” schemes are for current Year 12 students.</strong><span>If you already left school or are returning to study, use Alternative Pathways for TAFE, diploma, STAT and transfer routes.</span><a href="./pathways">Open Alternative Pathways →</a></div>`;
}

function renderEarlyInstitutionCard(entry) {
  const provider = providerById.get(entry.institution.providerId);
  const logo = entry.institution.logo || provider?.logo || "";
  const routes = entry.routes;
  return `
    <article class="early-institution-card">
      <header>
        <span class="early-provider-logo">
          <span class="early-provider-mark" aria-hidden="true">${escapeHtml(initials(entry.institution.name))}</span>
          ${logo ? `<img src="${escapeAttribute(logo)}" alt="${escapeAttribute(entry.institution.name)} logo" loading="lazy" decoding="async" />` : ""}
        </span>
        <div><h3>${escapeHtml(entry.institution.name)}</h3><p>${routes.length} verified route${routes.length === 1 ? "" : "s"}</p></div>
      </header>
      ${entry.institution.note ? `<p class="early-institution-note">${escapeHtml(entry.institution.note)}</p>` : ""}
      <div class="early-route-list">
        ${routes.map((route) => renderEarlyRoute(route)).join("")}
      </div>
    </article>
  `;
}

function renderEarlyRoute(route) {
  const status = routeStatus(route);
  return `
    <section class="early-route">
      <div class="early-route-heading">
        <div><span class="early-route-type">${escapeHtml(route.type)}</span><h4>${escapeHtml(route.name)}</h4></div>
        <span class="early-status ${escapeAttribute(status.tone)}">${escapeHtml(status.label)}</span>
      </div>
      <p class="early-route-date">${escapeHtml(route.dateSummary)}</p>
      <p>${escapeHtml(route.assessment)}</p>
      <details>
        <summary>Who can apply and what to check</summary>
        <p><strong>Best fit:</strong> ${escapeHtml(route.audience)}</p>
        ${route.courses?.length ? `<p><strong>Sydney courses currently listed:</strong> ${route.courses.map(escapeHtml).join(" · ")}</p>` : ""}
        ${route.note ? `<p><strong>Important:</strong> ${escapeHtml(route.note)}</p>` : ""}
      </details>
      <div class="early-route-actions">
        <a class="match-btn" href="${escapeAttribute(route.applyUrl)}" target="_blank" rel="noopener">${escapeHtml(route.actionLabel || "Start application")} ${externalIcon()}</a>
        ${route.infoUrl && route.infoUrl !== route.applyUrl ? `<a class="secondary-btn" href="${escapeAttribute(route.infoUrl)}" target="_blank" rel="noopener">Requirements ${externalIcon()}</a>` : ""}
        ${route.courseUrl ? `<a class="secondary-btn" href="${escapeAttribute(route.courseUrl)}" target="_blank" rel="noopener">Sydney courses ${externalIcon()}</a>` : ""}
      </div>
    </section>
  `;
}

function renderEarlyEmptyState() {
  return `
    <div class="early-entry-empty">
      <strong>No scheme matches every selected filter.</strong>
      <p>Try all statuses, broaden the route type, or search only the university name.</p>
      <button type="button" class="secondary-btn" data-action="reset-early-filters">Reset filters</button>
    </div>
  `;
}

function bindPlannerEvents() {
  uacPlannerApp.querySelectorAll("[data-planner-view]").forEach((button) => {
    button.addEventListener("click", () => setPlannerView(button.dataset.plannerView));
  });

  const courseQuery = uacPlannerApp.querySelector('[name="preference-query"]');
  courseQuery?.addEventListener("input", () => {
    plannerState.courseQuery = courseQuery.value;
    plannerState.suggestionsOpen = true;
    updateCourseSuggestions();
  });
  courseQuery?.addEventListener("focus", () => {
    if (!plannerState.courseQuery.trim() && plannerState.institution === "All institutions") return;
    plannerState.suggestionsOpen = true;
    updateCourseSuggestions();
  });
  courseQuery?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      plannerState.suggestionsOpen = false;
      updateCourseSuggestions();
      return;
    }
    if (event.key !== "Enter") return;
    const first = uacPlannerApp.querySelector("[data-preference-suggestions] [data-add-preference]:not(:disabled)");
    if (!first) return;
    event.preventDefault();
    addPreference(first.dataset.addPreference);
  });

  const targetAtar = uacPlannerApp.querySelector('[name="preference-atar"]');
  targetAtar?.addEventListener("input", () => {
    plannerState.targetAtar = targetAtar.value;
    savePreferenceDraft();
    updatePreferenceWorkspace();
  });

  uacPlannerApp.querySelector('[name="preference-institution"]')?.addEventListener("change", (event) => {
    plannerState.institution = event.currentTarget.value;
    plannerState.suggestionsOpen = plannerState.institution !== "All institutions" || Boolean(plannerState.courseQuery.trim());
    savePreferenceDraft();
    updateCourseSuggestions();
  });

  uacPlannerApp.querySelector('[name="early-query"]')?.addEventListener("input", (event) => {
    plannerState.earlyQuery = event.currentTarget.value;
    updateEarlyResults();
  });
  for (const [name, key] of [["early-stage", "earlyStage"], ["early-type", "earlyType"], ["early-status", "earlyStatus"]]) {
    uacPlannerApp.querySelector(`[name="${name}"]`)?.addEventListener("change", (event) => {
      plannerState[key] = event.currentTarget.value;
      updateEarlyResults();
    });
  }

  uacPlannerApp.addEventListener("click", handlePlannerClick);
  bindPlannerDismissal();
}

function bindPlannerDismissal() {
  if (uacPlannerApp.dataset.dismissBound === "true") return;
  uacPlannerApp.dataset.dismissBound = "true";
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.(".preference-course-search, .preference-institution-filter")) return;
    if (!plannerState.suggestionsOpen) return;
    plannerState.suggestionsOpen = false;
    const output = uacPlannerApp.querySelector("[data-preference-suggestions]");
    if (output) output.hidden = true;
  });
}

function handlePlannerClick(event) {
  const addButton = event.target.closest("[data-add-preference]");
  if (addButton) return addPreference(addButton.dataset.addPreference);

  const slot = event.target.closest("[data-preference-id]");
  if (slot && event.target.closest("[data-remove-preference]")) return removePreference(slot.dataset.preferenceId);
  const moveButton = event.target.closest("[data-move-preference]");
  if (slot && moveButton) return movePreference(slot.dataset.preferenceId, moveButton.dataset.movePreference);

  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "import-saved-preferences") return importSavedPreferences();
  if (action === "copy-preferences") return copyPreferenceList();
  if (action === "clear-preferences") return clearPreferences();
  if (action === "reset-early-filters") return resetEarlyFilters();
}

function setPlannerView(view) {
  if (!['preferences', 'early-entry'].includes(view) || plannerState.view === view) return;
  plannerState.view = view;
  history.replaceState(null, "", view === "early-entry" ? "#early-entry" : "#preferences");
  uacPlannerApp.querySelectorAll("[data-planner-view]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.plannerView === view));
  });
  uacPlannerApp.querySelectorAll("[data-planner-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.plannerPanel !== view;
  });
  const active = uacPlannerApp.querySelector(`[data-planner-panel="${view}"]`);
  active?.animate?.([
    { opacity: 0.72, transform: "translateY(5px)" },
    { opacity: 1, transform: "translateY(0)" }
  ], { duration: 220, easing: "cubic-bezier(.16,1,.3,1)" });
}

function addPreference(courseId) {
  if (!courseById.has(courseId) || plannerState.preferences.includes(courseId)) return;
  if (plannerState.preferences.length >= 5) return announcePlanner("Your UAC draft already has five preferences. Remove one before adding another.");
  plannerState.preferences.push(courseId);
  plannerState.courseQuery = "";
  plannerState.suggestionsOpen = false;
  savePreferenceDraft();
  const input = uacPlannerApp.querySelector('[name="preference-query"]');
  if (input) input.value = "";
  updateCourseSuggestions();
  updatePreferenceWorkspace();
  announcePlanner(`${courseById.get(courseId).name} added as preference ${plannerState.preferences.length}.`);
}

function removePreference(courseId) {
  const index = plannerState.preferences.indexOf(courseId);
  if (index < 0) return;
  const row = uacPlannerApp.querySelector(`[data-preference-id="${cssEscape(courseId)}"]`);
  const finish = () => {
    plannerState.preferences.splice(index, 1);
    savePreferenceDraft();
    updatePreferenceWorkspace();
    announcePlanner("Course removed. The remaining preferences kept their order.");
  };
  if (!row?.animate || prefersReducedMotion()) return finish();
  row.animate([
    { opacity: 1, transform: "translateX(0)" },
    { opacity: 0, transform: "translateX(12px)" }
  ], { duration: 150, easing: "ease-out" }).finished.then(finish, finish);
}

function movePreference(courseId, direction) {
  const from = plannerState.preferences.indexOf(courseId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= plannerState.preferences.length) return;
  [plannerState.preferences[from], plannerState.preferences[to]] = [plannerState.preferences[to], plannerState.preferences[from]];
  savePreferenceDraft();
  updatePreferenceWorkspace();
  announcePlanner(`Moved to preference ${to + 1}.`);
}

function clearPreferences() {
  plannerState.preferences = [];
  savePreferenceDraft();
  updatePreferenceWorkspace();
  announcePlanner("Preference draft cleared.");
}

function importSavedPreferences() {
  const candidates = savedCourseIds().filter((id) => courseById.has(id) && !plannerState.preferences.includes(id));
  const available = Math.max(0, 5 - plannerState.preferences.length);
  const added = candidates.slice(0, available);
  plannerState.preferences.push(...added);
  savePreferenceDraft();
  updatePreferenceWorkspace();
  announcePlanner(added.length ? `${added.length} saved course${added.length === 1 ? "" : "s"} added.` : "No additional saved course could be added.");
}

async function copyPreferenceList() {
  const lines = plannerState.preferences.map((id, index) => {
    const course = courseById.get(id);
    return `${index + 1}. ${course.name} — ${course.university} — UAC ${course.courseCode || "code to confirm"}`;
  });
  const text = ["Practice UAC preference list", ...lines, "", "This is a draft only; update the actual list in UAC."].join("\n");
  try {
    await navigator.clipboard.writeText(text);
    announcePlanner("Preference list copied.");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    announcePlanner("Preference list copied.");
  }
}

function updateCourseSuggestions() {
  const output = uacPlannerApp.querySelector("[data-preference-suggestions]");
  if (!output) return;
  output.hidden = !plannerState.suggestionsOpen
    || (!plannerState.courseQuery.trim() && plannerState.institution === "All institutions");
  output.innerHTML = renderCourseSuggestions();
  bindPlannerLogoFallbacks(output);
}

function bindPlannerLogoFallbacks(root) {
  root.querySelectorAll(".preference-provider-logo img, .early-provider-logo img").forEach((image) => {
    if (image.dataset.fallbackBound === "true") return;
    image.dataset.fallbackBound = "true";
    const reveal = () => image.classList.add("is-loaded");
    image.addEventListener("load", reveal, { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    if (image.complete && image.naturalWidth > 0) reveal();
    else if (image.complete) image.remove();
  });
}

function updatePreferenceWorkspace() {
  const list = uacPlannerApp.querySelector("[data-preference-list]");
  const summary = uacPlannerApp.querySelector("[data-preference-summary]");
  const count = uacPlannerApp.querySelector(".preference-planner-head > span");
  if (list) list.innerHTML = Array.from({ length: 5 }, (_, index) => renderPreferenceSlot(index)).join("");
  if (summary) summary.innerHTML = renderPreferenceSummary();
  if (count) count.textContent = `${plannerState.preferences.length} / 5 added`;
  const copy = uacPlannerApp.querySelector('[data-action="copy-preferences"]');
  const clear = uacPlannerApp.querySelector('[data-action="clear-preferences"]');
  if (copy) copy.disabled = !plannerState.preferences.length;
  if (clear) clear.disabled = !plannerState.preferences.length;
  if (list) bindPlannerLogoFallbacks(list);
}

function updateEarlyResults() {
  const results = filteredEarlyInstitutions();
  const output = uacPlannerApp.querySelector("[data-early-results]");
  const count = uacPlannerApp.querySelector("[data-early-count]");
  const oldNotice = uacPlannerApp.querySelector(".early-stage-notice");
  if (oldNotice) oldNotice.outerHTML = renderEarlyStageNotice();
  if (count) count.textContent = `${results.length} institution${results.length === 1 ? "" : "s"}`;
  if (output) {
    output.innerHTML = results.length ? results.map(renderEarlyInstitutionCard).join("") : renderEarlyEmptyState();
    bindPlannerLogoFallbacks(output);
    if (!prefersReducedMotion()) output.animate([{ opacity: 0.78 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
  }
}

function resetEarlyFilters() {
  plannerState.earlyQuery = "";
  plannerState.earlyType = "All routes";
  plannerState.earlyStatus = "All statuses";
  for (const [name, value] of [["early-query", ""], ["early-type", plannerState.earlyType], ["early-status", plannerState.earlyStatus]]) {
    const control = uacPlannerApp.querySelector(`[name="${name}"]`);
    if (control) control.value = value;
  }
  updateEarlyResults();
}

function filteredEarlyInstitutions() {
  const query = normalizeText(plannerState.earlyQuery);
  return earlyCatalogue.institutions
    .map((institution) => {
      const routes = institutionRoutes(institution).filter((route) => {
        if (plannerState.earlyType !== "All routes" && route.type !== plannerState.earlyType) return false;
        const status = routeStatus(route);
        if (plannerState.earlyStatus !== "All statuses" && status.filter !== plannerState.earlyStatus) return false;
        return true;
      });
      const searchable = normalizeText([
        institution.name,
        ...(institution.aliases || []),
        institution.note || "",
        ...routes.flatMap((route) => [route.name, route.type, route.audience, route.assessment])
      ].join(" "));
      const score = query ? fuzzyScore(searchable, query) : 1;
      return { institution, routes, score };
    })
    .filter((entry) => entry.routes.length && entry.score > 0)
    .sort((a, b) => {
      if (plannerState.earlyQuery.trim()) return b.score - a.score || a.institution.name.localeCompare(b.institution.name);
      const aStatus = Math.min(...a.routes.map((route) => statusPriority(routeStatus(route))));
      const bStatus = Math.min(...b.routes.map((route) => statusPriority(routeStatus(route))));
      return aStatus - bStatus || a.institution.name.localeCompare(b.institution.name);
    });
}

function institutionRoutes(institution) {
  return [...(institution.routes || []), ...(institution.srs ? [{ ...earlyCatalogue.srs }] : [])];
}

function routeStatus(route) {
  if (route.statusText) return { label: route.statusText, tone: "check", filter: "Check now" };
  const today = startOfDay(new Date());
  const windows = (route.windows || []).map((window) => ({
    ...window,
    openDate: startOfDay(new Date(`${window.open}T00:00:00`)),
    closeDate: new Date(`${window.close}T23:59:59`)
  }));
  const active = windows.find((window) => today >= window.openDate && today <= window.closeDate);
  if (active) return { label: active.closeLabel || "Open now", tone: "open", filter: "Open now" };
  const upcoming = windows.find((window) => today < window.openDate);
  if (upcoming) return { label: upcoming.openLabel || `Opens ${formatShortDate(upcoming.openDate)}`, tone: "upcoming", filter: "Opening later" };
  return { label: windows.length ? "Closed for this cycle" : "Check current status", tone: windows.length ? "closed" : "check", filter: windows.length ? "Closed" : "Check now" };
}

function statusPriority(status) {
  return { "Open now": 0, "Opening later": 1, "Check now": 2, "Closed": 3 }[status.filter] ?? 4;
}

function rankCourseSuggestions(query) {
  const normalized = expandPlannerCourseQuery(query);
  return plannerCourses
    .filter((course) => plannerState.institution === "All institutions" || course.university === plannerState.institution)
    .map((course) => ({ course, score: normalized ? courseSearchScore(course, normalized) : 1 }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || providerPrestigeScore(b.course) - providerPrestigeScore(a.course) || a.course.name.localeCompare(b.course.name))
    .map((entry) => entry.course);
}

function expandPlannerCourseQuery(value) {
  const normalized = normalizeText(value);
  const aliases = new Map([
    ["cs", "computer science"],
    ["comp sci", "computer science"],
    ["compsci", "computer science"],
    ["it", "information technology"],
    ["info tech", "information technology"],
    ["se", "software engineering"],
    ["soft eng", "software engineering"],
    ["ai", "artificial intelligence"],
    ["cyber", "cyber security"],
    ["psych", "psychology"],
    ["crim", "criminology"],
    ["med", "medicine"],
    ["biz", "business"],
    ["comm", "commerce"]
  ]);
  if (aliases.has(normalized)) return aliases.get(normalized);
  return normalized.split(" ").map((word) => aliases.get(word) || word).join(" ");
}

function plannerProviderMark(course) {
  const logo = course.providerLogo || providerById.get(course.providerId)?.logo;
  if (logo) return `<span class="preference-provider-logo"><span class="preference-provider-fallback" aria-hidden="true">${escapeHtml(initials(course.university))}</span><img src="${escapeAttribute(logo)}" alt="${escapeAttribute(course.university)} logo" loading="lazy" decoding="async" /></span>`;
  return `<span class="preference-provider-logo is-text" aria-hidden="true">${escapeHtml(initials(course.university))}</span>`;
}

function courseSearchScore(course, query) {
  if (!query) return 0;
  const title = normalizeText(course.name);
  const provider = normalizeText(course.university);
  const code = normalizeText(course.courseCode);
  const campus = normalizeText(course.campus);
  const area = normalizeText(course.area);
  const providerId = normalizeText(course.providerId);
  const providerAliases = normalizeText(providerById.get(course.providerId)?.aliases?.join(" "));
  const full = `${title} ${provider} ${providerId} ${providerAliases} ${code} ${campus} ${area}`;
  let score = fuzzyScore(full, query);
  if (title === query || code === query) score += 900;
  if (title.startsWith(query)) score += 480;
  if (providerId === query) score += 1400;
  if (provider === query) score += 1200;
  if (provider.startsWith(query) && query.length >= 5) score += 260;
  if (title.includes(query)) score += 220;
  if (full.includes(query)) score += 120;
  const words = query.split(" ").filter(Boolean);
  if (words.length > 1 && words.every((word) => full.includes(word) || hasCloseWord(full, word))) score += 190;
  return score > 0 ? score + providerPrestigeScore(course) : 0;
}

function fuzzyScore(text, query) {
  if (!query) return 1;
  if (text.includes(query)) return 180 + Math.min(60, query.length * 3);
  const queryWords = query.split(" ").filter(Boolean);
  const textWords = text.split(" ").filter(Boolean);
  let score = 0;
  for (const queryWord of queryWords) {
    const exact = textWords.some((word) => word === queryWord || word.startsWith(queryWord));
    if (exact) {
      score += 42;
      continue;
    }
    const close = textWords.some((word) => editDistance(word.slice(0, Math.max(word.length, queryWord.length)), queryWord) <= allowedTypos(queryWord));
    if (close) score += 22;
    else return 0;
  }
  return score;
}

function hasCloseWord(text, queryWord) {
  return text.split(" ").some((word) => editDistance(word, queryWord) <= allowedTypos(queryWord));
}

function editDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const held = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = held;
    }
  }
  return row[b.length];
}

function allowedTypos(word) {
  if (word.length >= 9) return 2;
  if (word.length >= 4) return 1;
  return 0;
}

function providerPrestigeScore(course) {
  return { UNSW: 12, USYD: 11, UTS: 10, MQ: 8, UOW: 7, WS: 6, ACU: 5 }[course.providerId] || 0;
}

function plannerInstitutionLabel(institution) {
  if (institution === "All institutions") return institution;
  const provider = providerByName.get(institution);
  if (provider?.id === "UTS") return "UTS — University of Technology Sydney";
  return institution;
}

function courseFit(course) {
  const target = numericTargetAtar();
  const rank = numericSelectionRank(course);
  if (target === null || rank === null) return { label: rank === null ? "Official check needed" : "Add ATAR to compare", tone: "unknown" };
  const gap = target - rank;
  if (gap >= 5) return { label: "Safer on past figures", tone: "safer" };
  if (gap >= 0) return { label: "Within past range", tone: "target" };
  if (gap >= -5) return { label: "Moderate stretch", tone: "stretch" };
  return { label: "High stretch", tone: "high-stretch" };
}

function preferenceDraftHeadline(courses, target, saferCount) {
  if (courses.length < 3) return "Add more real options";
  if (target === null) return "The order is yours—entry risk is not labelled yet";
  if (saferCount === 0) return "Add one realistic backup you would accept";
  return "A useful mix—now order only by what you want most";
}

function numericSelectionRank(course) {
  for (const value of [course.selectionRank, course.atar, course.lowestAtar]) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0 && number <= 99.95) return number;
  }
  return null;
}

function numericTargetAtar() {
  const value = Number(plannerState.targetAtar);
  return Number.isFinite(value) && value >= 0 && value <= 99.95 ? value : null;
}

function entryFigureLabel(course) {
  const rank = numericSelectionRank(course);
  return rank === null ? "No numeric rank" : `Selection rank ${formatAtar(rank)}`;
}

function loadPreferenceDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(plannerStorageKey) || "{}");
    plannerState.preferences = Array.isArray(parsed.preferences)
      ? parsed.preferences.filter((id) => courseById.has(id)).slice(0, 5)
      : [];
    plannerState.targetAtar = parsed.targetAtar === undefined ? "" : String(parsed.targetAtar);
    plannerState.institution = plannerInstitutions.includes(parsed.institution) ? parsed.institution : "All institutions";
  } catch {
    plannerState.preferences = [];
  }
}

function savePreferenceDraft() {
  localStorage.setItem(plannerStorageKey, JSON.stringify({
    preferences: plannerState.preferences,
    targetAtar: plannerState.targetAtar,
    institution: plannerState.institution,
    updatedAt: new Date().toISOString()
  }));
}

function savedCourseIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(savedCoursesKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function announcePlanner(message) {
  plannerState.notice = message;
  const live = uacPlannerApp.querySelector("[data-planner-live]");
  if (live) live.textContent = message;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function initials(value) {
  return String(value || "")
    .split(/\s+/)
    .filter((word) => !["of", "the", "and"].includes(word.toLowerCase()))
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(Number(value) || 0);
}

function formatAtar(value) {
  return Number(value).toFixed(2);
}

function formatCheckedDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "recently" : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(date);
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function cssEscape(value) {
  return window.CSS?.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
}

function searchIcon() {
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>`;
}

function externalIcon() {
  return `<svg class="external-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 5h5v5"/><path d="M10 14 19 5"/><path d="M19 13v6H5V5h6"/></svg>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
