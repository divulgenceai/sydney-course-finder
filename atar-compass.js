const compassApp = document.querySelector("#atar-compass-app");
const compassCourses = window.uacCourses || [];
const compassProviders = window.uacProviders || [];
const compassMeta = window.uacImportMeta || {};

const compassStorageKey = "sydneyCourseFinder.atarCompass";
const savedStorageKey = "sydneyCourseFinder.savedCourses";
const compareStorageKey = "sydneyCourseFinder.compareCourses";

const compassAreas = [
  { label: "All study areas", pattern: null },
  { label: "Technology", pattern: /computer|software|cyber|information technology|data science|artificial intelligence|digital systems|informatics/i },
  { label: "Engineering", pattern: /engineering|mechatronic|robotic|construction management|surveying/i },
  { label: "Health and medicine", pattern: /medicine|medical|nursing|midwif|health|physio|pharmacy|dent|occupational therapy|speech path|exercise science/i },
  { label: "Business and commerce", pattern: /business|commerce|account|finance|econom|marketing|management|entrepreneur|property/i },
  { label: "Law and justice", pattern: /\blaw\b|legal|crimin|justice|policing|security studies/i },
  { label: "Education", pattern: /education|teaching|teacher|early childhood|primary|secondary/i },
  { label: "Science", pattern: /\bscience\b|biology|chemistry|physics|environment|mathematics|biotechnology/i },
  { label: "Arts, media and design", pattern: /arts|design|media|communication|creative|animation|music|film|writing|architecture/i },
  { label: "Society and psychology", pattern: /psychology|social|humanities|international|politic|community|counselling/i }
];

const compassIncomeOptions = ["Any income direction", "$80k+ broad career signal", "$100k+ broad career signal", "$120k+ broad career signal"];
const compassSubjects = [
  "English Advanced",
  "English Standard",
  "Mathematics Advanced",
  "Mathematics Extension 1",
  "Mathematics Standard 2",
  "Biology",
  "Chemistry",
  "Physics",
  "Business Studies",
  "Economics",
  "Legal Studies",
  "Enterprise Computing",
  "Software Engineering",
  "Engineering Studies",
  "Visual Arts",
  "Design and Technology",
  "Health and Movement Science"
];

const providerStrength = {
  UNSW: 100,
  USYD: 99,
  UTS: 96,
  MQ: 93,
  UOW: 90,
  WS: 87,
  ACU: 84,
  UND: 83,
  UON: 82,
  GU: 81
};

const salarySignals = [
  [/medicine|dentistry|medical practitioner|surgeon/i, 160],
  [/software|cyber|data scientist|actuar|engineer/i, 135],
  [/lawyer|solicitor|finance|investment|construction manager/i, 125],
  [/pharmac|physio|occupational therapist|psychologist|nursing/i, 105],
  [/teacher|accountant|marketing|designer|scientist|business/i, 90]
];

const compassState = loadCompassState();
let compassUpdateTimer = 0;

renderCompass();

function renderCompass() {
  compassApp.innerHTML = `
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

    <main class="atar-compass-page">
      <section class="compass-intro">
        <div>
          <h1>ATAR Compass</h1>
          <p>Use an approximate ATAR to find Sydney courses that sit in reach, target and safer ranges.</p>
        </div>
        <aside class="compass-trust-note">
          <strong>Selection rank is not an ATAR guarantee.</strong>
          <span>Adjustment factors, prerequisites and additional entry criteria can still affect admission.</span>
        </aside>
      </section>

      <section class="panel compass-controls-panel" aria-labelledby="compass-controls-title">
        <h2 id="compass-controls-title" class="sr-only">Course match controls</h2>
        <form class="compass-form" data-compass-form>
          <div class="compass-atar-control">
            <label for="compass-atar">Approximate ATAR</label>
            <div>
              <input id="compass-atar" name="atar" type="number" min="30" max="99.95" step="0.05" inputmode="decimal" value="${escapeAttribute(formatAtar(compassState.atar))}" />
              <input name="atar-range" type="range" min="30" max="99.95" step="0.05" value="${escapeAttribute(String(compassState.atar))}" aria-label="Approximate ATAR slider" />
            </div>
          </div>
          ${renderCompassSelect("area", "Study area", compassAreas.map((item) => item.label), compassState.area)}
          ${renderCompassSelect("provider", "Provider", ["All providers", ...compassProviders.map((item) => item.name)], compassState.provider)}
          ${renderCompassSelect("income", "Income direction", compassIncomeOptions, compassState.income)}
          <button class="match-btn compass-submit" type="submit">Find course matches</button>
        </form>
        <div class="compass-subject-row">
          <label>
            <span>Optional HSC subjects</span>
            <select name="compass-subject">
              <option value="">Add a subject</option>
              ${compassSubjects.filter((subject) => !compassState.subjects.includes(subject)).map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}
            </select>
          </label>
          <div class="compass-subject-chips" data-compass-subjects>${renderSubjectChips()}</div>
          ${compassState.subjects.length ? `<button class="clear-btn compass-clear-subjects" type="button" data-compass-clear-subjects>Clear</button>` : ""}
        </div>
      </section>

      <section class="compass-band-panel" aria-label="How course match bands work">
        <div class="compass-band-track">
          ${renderBandButton("reach", "Reach", "Up to about 5 points above", "↑")}
          ${renderBandButton("target", "Target", "Around your current rank", "◎")}
          ${renderBandButton("safer", "Safer", "Below your current rank", "↓")}
          <span class="compass-band-marker" aria-hidden="true"><b>${escapeHtml(formatAtar(compassState.atar))}</b><i></i></span>
        </div>
        <p><strong>Use the bands as a shortlist, not a prediction.</strong> Published selection ranks are historical and may include adjustments.</p>
      </section>

      <section class="compass-results" data-compass-results aria-live="polite">
        ${renderCompassResults()}
      </section>
    </main>
  `;

  bindCompassEvents();
  window.courseFinderTheme?.bind?.(compassApp);
  window.courseFinderToolkit?.enhance?.(compassApp);
}

function renderCompassSelect(name, label, options, value) {
  return `
    <label class="compass-select-field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeAttribute(name)}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderSubjectChips() {
  if (!compassState.subjects.length) return `<span class="compass-subject-empty">Add subjects to improve the “why it fits” explanation.</span>`;
  return compassState.subjects.map((subject) => `
    <button type="button" data-remove-compass-subject="${escapeAttribute(subject)}" aria-label="Remove ${escapeAttribute(subject)}">
      ${escapeHtml(subject)} <span aria-hidden="true">×</span>
    </button>
  `).join("");
}

function renderBandButton(id, label, description, icon) {
  const count = compassState.run ? compassMatches().filter((item) => item.band.id === id).length : 0;
  return `
    <button type="button" class="compass-band ${escapeAttribute(id)}" data-compass-band="${escapeAttribute(id)}" aria-pressed="${compassState.band === id}">
      <span aria-hidden="true">${icon}</span>
      <strong>${escapeHtml(label)}</strong>
      <small>${escapeHtml(description)}</small>
      ${compassState.run ? `<em>${count} match${count === 1 ? "" : "es"}</em>` : ""}
    </button>
  `;
}

function renderCompassResults() {
  if (!compassState.run) {
    return `
      <div class="compass-start-state">
        <strong>Start with one number</strong>
        <p>Enter an approximate ATAR, then narrow by study area or provider only if you need to.</p>
        <div>
          <span><b>1</b> Set your ATAR</span>
          <span><b>2</b> Review all three bands</span>
          <span><b>3</b> Save and compare the realistic options</span>
        </div>
      </div>
    `;
  }

  const allMatches = compassMatches();
  const visible = compassState.band === "all" ? allMatches : allMatches.filter((item) => item.band.id === compassState.band);
  if (!visible.length) return renderCompassEmpty(allMatches.length);

  return `
    <div class="compass-results-head">
      <div>
        <h2>${number(visible.length)} course matches</h2>
        <p>Ordered by course relevance, entry-range fit and the optional context you added.${visible.length > 24 ? ` Showing the strongest 24 in this view.` : ""}</p>
      </div>
      <div class="compass-result-actions">
        ${compassState.band !== "all" ? `<button class="clear-btn" type="button" data-compass-band="all">Show all bands</button>` : ""}
        <a href="./#saved">Open saved and compare</a>
      </div>
    </div>
    <div class="compass-status" data-compass-status role="status" aria-live="polite"></div>
    <div class="compass-result-table" role="table" aria-label="ATAR course matches">
      <div class="compass-result-labels" role="row">
        <span>#</span><span>Course</span><span>University / campus</span><span>Entry profile</span><span>Band</span><span>Why it fits</span><span>Actions</span>
      </div>
      <div class="compass-result-list">
        ${visible.slice(0, 24).map(renderCompassCourse).join("")}
      </div>
    </div>
    ${renderCompassPathwayBackup(visible)}
    <p class="compass-data-note">UAC records imported ${escapeHtml(formatDate(compassMeta.importedAt))}. Always confirm the current course page before making an application decision.</p>
  `;
}

function renderCompassCourse(match, index) {
  const { course, rank, rawAtar, band, why } = match;
  const saved = storedIds(savedStorageKey).includes(course.id);
  const comparing = storedIds(compareStorageKey).includes(course.id);
  return `
    <article class="compass-result-row" role="row" style="--item-delay:${Math.min(index, 10) * 22}ms">
      <span class="compass-result-number" role="cell">${index + 1}</span>
      <div class="compass-result-course" role="cell">
        <a href="${escapeAttribute(course.officialUrl || course.uacUrl)}" target="_blank" rel="noreferrer">${escapeHtml(course.name)}</a>
        <small>UAC code ${escapeHtml(course.courseCode || "—")}</small>
      </div>
      <div class="compass-result-provider" role="cell">
        <strong>${escapeHtml(course.university)}</strong>
        <small>${escapeHtml(course.campus || "Campus check required")}</small>
      </div>
      <div class="compass-result-entry" role="cell">
        <span>Selection rank</span>
        <strong>${escapeHtml(formatAtar(rank))}</strong>
        <small>${rawAtar === null ? "Raw ATAR not numeric" : `Lowest raw ATAR ${formatAtar(rawAtar)}`}</small>
      </div>
      <div class="compass-result-band ${escapeAttribute(band.id)}" role="cell"><span>${escapeHtml(band.label)}</span><small>${escapeHtml(band.gapLabel)}</small></div>
      <p class="compass-result-why" role="cell">${escapeHtml(why)}</p>
      <div class="compass-result-buttons" role="cell">
        <button type="button" data-compass-save="${escapeAttribute(course.id)}" aria-pressed="${saved}">${saved ? "Saved" : "Save"}</button>
        <button type="button" data-compass-compare="${escapeAttribute(course.id)}" aria-pressed="${comparing}">${comparing ? "Comparing" : "Compare"}</button>
        <a href="${escapeAttribute(course.uacUrl || course.officialUrl)}" target="_blank" rel="noreferrer">Official entry</a>
      </div>
    </article>
  `;
}

function renderCompassPathwayBackup(matches) {
  const first = matches[0];
  if (!first) return "";
  const goal = compassState.area === "All study areas" ? shortCourseGoal(first.course.name) : compassState.area;
  return `
    <aside class="compass-pathway-backup">
      <div><strong>Keep one pathway backup</strong><p>Compare a diploma, preparation, TAFE-to-uni or transfer route for ${escapeHtml(goal.toLowerCase())}.</p></div>
      <a href="./pathways?q=${encodeURIComponent(goal)}">Open pathway finder <span aria-hidden="true">→</span></a>
    </aside>
  `;
}

function renderCompassEmpty(hasOtherBands) {
  return `
    <div class="compass-empty-state">
      <strong>No courses fit this exact view</strong>
      <p>${hasOtherBands ? "There are matches in another band." : "Remove one filter or use a nearby study area to build a broader shortlist."}</p>
      <div>
        ${hasOtherBands ? `<button type="button" class="secondary-btn" data-compass-band="all">Show every band</button>` : ""}
        <button type="button" class="secondary-btn" data-compass-reset>Reset optional filters</button>
        <a class="secondary-btn" href="./pathways">Explore pathways</a>
      </div>
    </div>
  `;
}

function compassMatches() {
  const atar = clampAtar(compassState.atar);
  const area = compassAreas.find((item) => item.label === compassState.area) || compassAreas[0];
  const incomeTarget = Number((compassState.income.match(/\$(\d+)/) || [])[1] || 0);
  const prepared = compassCourses
    .filter((course) => course.level === "undergraduate")
    .map((course) => ({ course, rank: courseSelectionRank(course) }))
    .filter((item) => item.rank !== null)
    .filter(({ course }) => compassState.provider === "All providers" || course.university === compassState.provider)
    .filter(({ course }) => !area.pattern || area.pattern.test(courseSearchText(course)))
    .map(({ course, rank }) => {
      const gap = rank - atar;
      const band = courseBand(gap);
      const subjectHits = matchedSubjects(course);
      const salary = salarySignal(course);
      const areaScore = area.pattern ? 35 : 0;
      const incomeScore = incomeTarget ? (salary >= incomeTarget ? 18 : -Math.max(0, incomeTarget - salary) * 0.7) : 0;
      const quality = providerStrength[course.providerId] || 72;
      const titleBonus = /^(bachelor|combined bachelor)/i.test(String(course.name || "")) ? 8 : 0;
      const bandScore = band.id === "target" ? 28 : band.id === "safer" ? 22 : 16;
      const score = areaScore + incomeScore + titleBonus + bandScore + subjectHits.length * 8 + quality * 0.08 - Math.abs(gap) * 1.8;
      return {
        course,
        rank,
        rawAtar: numericEntry(course.lowestAtar),
        gap,
        band,
        score,
        why: matchReason(course, gap, subjectHits, area)
      };
    })
    .filter((item) => item.gap <= 7.5 && item.gap >= -22)
    .sort((a, b) => b.score - a.score || Math.abs(a.gap) - Math.abs(b.gap) || a.course.name.localeCompare(b.course.name));

  return prepared.slice(0, 72);
}

function courseBand(gap) {
  if (gap > 2.5) return { id: "reach", label: "Reach", gapLabel: `${formatNumber(gap)} above` };
  if (gap >= -3.5) return { id: "target", label: "Target", gapLabel: Math.abs(gap) < 0.05 ? "Around your ATAR" : `${formatNumber(Math.abs(gap))} ${gap >= 0 ? "above" : "below"}` };
  return { id: "safer", label: "Safer", gapLabel: `${formatNumber(Math.abs(gap))} below` };
}

function matchReason(course, gap, subjectHits, area) {
  const parts = [];
  if (area.pattern) parts.push(`Strong ${area.label.toLowerCase()} title and course-content match.`);
  if (subjectHits.length === 1) parts.push(`${subjectHits[0]} appears in the course evidence.`);
  if (subjectHits.length > 1) parts.push(`${subjectHits.slice(0, 2).join(" and ")} appear in the course evidence.`);
  if (gap > 2.5) parts.push("Keep this as an aspiration and confirm adjustment factors or pathways.");
  else if (gap >= -3.5) parts.push("Its published selection rank sits close to your current estimate.");
  else parts.push("Its published selection rank sits below your estimate, but entry is never guaranteed.");
  return parts.join(" ");
}

function matchedSubjects(course) {
  const evidence = normalise(`${course.prerequisites || ""} ${course.assumed || ""} ${course.area || ""}`);
  return compassState.subjects.filter((subject) => {
    const words = normalise(subject).split(" ").filter((word) => word.length > 3 && !["advanced", "standard", "studies"].includes(word));
    return words.some((word) => evidence.includes(word));
  });
}

function salarySignal(course) {
  const text = `${course.name || ""} ${course.careers || ""}`;
  return salarySignals.find(([pattern]) => pattern.test(text))?.[1] || 75;
}

function courseSearchText(course) {
  return `${course.name || ""} ${course.area || ""} ${course.summary || ""} ${course.careers || ""}`;
}

function courseSelectionRank(course) {
  return numericEntry(course.selectionRank) ?? numericEntry(course.atar);
}

function numericEntry(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text || /fewer|no offers|not available|^no$|^nc$|^tbp$/i.test(text)) return null;
  const match = text.match(/(?:^|\b)(\d{2}(?:\.\d{1,2})?)(?:\b|$)/);
  const numberValue = match ? Number(match[1]) : NaN;
  return Number.isFinite(numberValue) && numberValue >= 30 && numberValue <= 99.95 ? numberValue : null;
}

function bindCompassEvents() {
  const form = compassApp.querySelector("[data-compass-form]");
  const numberInput = form?.elements.atar;
  const rangeInput = form?.elements["atar-range"];

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    syncCompassForm();
    compassState.run = true;
    compassState.band = "all";
    persistCompassState();
    updateCompassResults();
  });

  rangeInput?.addEventListener("input", () => {
    compassState.atar = clampAtar(rangeInput.value);
    numberInput.value = formatAtar(compassState.atar);
    updateCompassMarker();
    scheduleCompassResults();
  });

  numberInput?.addEventListener("input", () => {
    const value = Number(numberInput.value);
    if (!Number.isFinite(value)) return;
    compassState.atar = clampAtar(value);
    rangeInput.value = String(compassState.atar);
    updateCompassMarker();
    scheduleCompassResults();
  });

  form?.querySelectorAll("select").forEach((select) => {
    select.addEventListener("change", () => {
      syncCompassForm();
      scheduleCompassResults(80);
    });
  });

  compassApp.querySelector('[name="compass-subject"]')?.addEventListener("change", (event) => {
    const subject = event.currentTarget.value;
    if (!subject || compassState.subjects.includes(subject)) return;
    compassState.subjects.push(subject);
    persistCompassState();
    renderCompass();
  });

  if (compassApp.dataset.eventsBound !== "true") {
    compassApp.addEventListener("click", handleCompassClick);
    compassApp.dataset.eventsBound = "true";
  }
}

function handleCompassClick(event) {
  const removeSubject = event.target.closest("[data-remove-compass-subject]");
  if (removeSubject) {
    compassState.subjects = compassState.subjects.filter((subject) => subject !== removeSubject.dataset.removeCompassSubject);
    persistCompassState();
    renderCompass();
    return;
  }

  if (event.target.closest("[data-compass-clear-subjects]")) {
    compassState.subjects = [];
    persistCompassState();
    renderCompass();
    return;
  }

  const bandButton = event.target.closest("[data-compass-band]");
  if (bandButton) {
    compassState.band = bandButton.dataset.compassBand || "all";
    persistCompassState();
    updateCompassResults();
    updateBandPressedStates();
    return;
  }

  if (event.target.closest("[data-compass-reset]")) {
    compassState.area = "All study areas";
    compassState.provider = "All providers";
    compassState.income = "Any income direction";
    compassState.band = "all";
    persistCompassState();
    renderCompass();
    return;
  }

  const saveButton = event.target.closest("[data-compass-save]");
  if (saveButton) {
    toggleLibraryItem(savedStorageKey, saveButton.dataset.compassSave, Infinity, "saved");
    return;
  }

  const compareButton = event.target.closest("[data-compass-compare]");
  if (compareButton) toggleLibraryItem(compareStorageKey, compareButton.dataset.compassCompare, 3, "comparison");
}

function syncCompassForm() {
  const form = compassApp.querySelector("[data-compass-form]");
  if (!form) return;
  compassState.atar = clampAtar(form.elements.atar.value);
  compassState.area = form.elements.area.value;
  compassState.provider = form.elements.provider.value;
  compassState.income = form.elements.income.value;
  persistCompassState();
}

function scheduleCompassResults(delay = 130) {
  persistCompassState();
  if (!compassState.run) return;
  window.clearTimeout(compassUpdateTimer);
  compassUpdateTimer = window.setTimeout(updateCompassResults, delay);
}

function updateCompassResults() {
  const region = compassApp.querySelector("[data-compass-results]");
  if (!region) return;
  const update = () => {
    region.innerHTML = renderCompassResults();
    updateBandCounts();
    updateBandPressedStates();
  };
  if (document.startViewTransition && !isCompactAppSurface() && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    document.startViewTransition(update);
  } else update();
}

function isCompactAppSurface() {
  return document.documentElement.dataset.appSurface === "android"
    || window.matchMedia?.("(max-width: 820px)")?.matches;
}

function updateCompassMarker() {
  compassApp.querySelectorAll(".compass-band-marker b").forEach((node) => {
    node.textContent = formatAtar(compassState.atar);
  });
}

function updateBandCounts() {
  const matches = compassMatches();
  compassApp.querySelectorAll("[data-compass-band]").forEach((button) => {
    const id = button.dataset.compassBand;
    if (id === "all") return;
    const count = matches.filter((item) => item.band.id === id).length;
    let countNode = button.querySelector("em");
    if (!countNode) {
      countNode = document.createElement("em");
      button.appendChild(countNode);
    }
    countNode.textContent = `${count} match${count === 1 ? "" : "es"}`;
  });
}

function updateBandPressedStates() {
  compassApp.querySelectorAll("[data-compass-band]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.compassBand === compassState.band));
  });
}

function toggleLibraryItem(storageKey, id, limit, label) {
  const ids = storedIds(storageKey);
  const existing = ids.includes(id);
  let message = "";
  if (existing) {
    writeStoredIds(storageKey, ids.filter((item) => item !== id));
    message = `Removed from ${label}.`;
  } else if (ids.length >= limit) {
    message = `Compare up to ${limit} courses. Remove one before adding another.`;
  } else {
    writeStoredIds(storageKey, [...ids, id]);
    message = label === "saved" ? "Course saved." : "Added to comparison.";
  }
  syncLibraryButtons(id);
  const status = compassApp.querySelector("[data-compass-status]");
  if (status) status.textContent = message;
}

function syncLibraryButtons(id) {
  const saved = storedIds(savedStorageKey).includes(id);
  const comparing = storedIds(compareStorageKey).includes(id);
  compassApp.querySelectorAll(`[data-compass-save="${cssEscape(id)}"]`).forEach((button) => {
    button.textContent = saved ? "Saved" : "Save";
    button.setAttribute("aria-pressed", String(saved));
  });
  compassApp.querySelectorAll(`[data-compass-compare="${cssEscape(id)}"]`).forEach((button) => {
    button.textContent = comparing ? "Comparing" : "Compare";
    button.setAttribute("aria-pressed", String(comparing));
  });
}

function storedIds(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string"))] : [];
  } catch {
    return [];
  }
}

function writeStoredIds(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the current screen usable if storage is unavailable.
  }
}

function loadCompassState() {
  const defaults = {
    atar: Number(new URLSearchParams(location.search).get("atar")) || 80,
    area: "All study areas",
    provider: "All providers",
    income: "Any income direction",
    subjects: [],
    band: "all",
    run: Boolean(new URLSearchParams(location.search).get("atar"))
  };
  try {
    const stored = JSON.parse(localStorage.getItem(compassStorageKey) || "null");
    if (!stored || typeof stored !== "object") return defaults;
    return {
      ...defaults,
      ...stored,
      atar: clampAtar(stored.atar),
      subjects: Array.isArray(stored.subjects) ? stored.subjects.filter((item) => compassSubjects.includes(item)).slice(0, 8) : []
    };
  } catch {
    return defaults;
  }
}

function persistCompassState() {
  try {
    localStorage.setItem(compassStorageKey, JSON.stringify(compassState));
  } catch {
    // Keep the current session working without persistence.
  }
}

function clampAtar(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return 80;
  return Math.min(99.95, Math.max(30, Math.round(numberValue * 20) / 20));
}

function formatAtar(value) {
  return Number(value).toFixed(2);
}

function formatNumber(value) {
  return Number(value).toFixed(Math.abs(value) < 10 ? 1 : 0);
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function shortCourseGoal(value) {
  return String(value || "course").replace(/^Bachelor of\s+/i, "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function normalise(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
