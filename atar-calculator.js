const calculatorApp = document.querySelector("#calculator-app");
const hscSubjects = (window.hscSubjectData || []).slice().sort((a, b) => a.name.localeCompare(b.name));
const aggregateThresholds = (window.atarAggregateThresholds2025 || []).slice().sort((a, b) => b.aggregate - a.aggregate);
const calculatorMeta = window.atarCalculatorMeta || {};
const calculatorStorageKey = "sydney-course-finder-atar-calculator";
const subjectByName = new Map(hscSubjects.map((subject) => [subject.name, subject]));
const fields = ["All fields", ...Array.from(new Set(hscSubjects.map((subject) => subject.field))).sort()];
const subjectAliases = {
  "Business Studies": ["BUS", "BST"],
  "Community & Family Studies": ["CAFS"],
  "Design & Technology": ["DT", "D&T"],
  "Earth & Environmental Science": ["EES"],
  "English Advanced": ["ENGA", "English Adv"],
  "English EALD": ["EALD"],
  "English Extension 1": ["Eng Ext 1", "English Ext 1", "EX1"],
  "English Extension 2": ["Eng Ext 2", "English Ext 2", "EX2"],
  "English Standard": ["ENGS", "English Std"],
  "English Studies Exam": ["English Studies"],
  "Enterprise Computing": ["ENTC", "Enterprise", "Computing"],
  "Food Technology": ["Food Tech"],
  "Information & Digital Technology Exam": ["IDT", "Info Digital Tech"],
  "Legal Studies": ["Legal"],
  "Mathematics Advanced": ["MATHA", "Math Adv", "Maths Advanced"],
  "Mathematics Extension 1": ["MX1", "Math Ext 1", "Maths Ext 1"],
  "Mathematics Extension 2": ["MX2", "Math Ext 2", "Maths Ext 2"],
  "Mathematics Standard 1 Exam": ["Math Standard 1", "Maths Standard 1", "MST1"],
  "Mathematics Standard 2": ["Math Standard 2", "Maths Standard 2", "MST2"],
  "Modern History": ["Modern"],
  "Health and Movement Science (HMS)": ["HMS", "Health and Movement Science", "PDHPE", "PDH&PE", "PDH"],
  "Software Engineering": ["SENG", "Software"],
  "Studies of Religion I": ["SOR1", "SOR I"],
  "Studies of Religion II": ["SOR2", "SOR II"],
  "Society & Culture": ["SAC", "Society and Culture"]
};
const subjectLookup = buildSubjectLookup();

const calculatorState = {
  rows: loadRows(),
  guideQuery: "",
  guideField: "All fields",
  guideLimit: defaultGuideLimit(),
  activeSubjectRowId: "",
  activeSubjectOptionIndex: -1,
  highlightRowId: "",
  processing: ""
};
let calculatorRenderPass = 0;

function defaultGuideLimit() {
  return window.matchMedia?.("(max-width: 820px)")?.matches ? 10 : 18;
}

renderCalculator();

function renderCalculator() {
  if (calculatorRenderPass > 0) calculatorApp.classList.add("is-state-update");
  const estimate = calculateEstimate(calculatorState.rows);
  calculatorApp.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./#courses">Courses</a>
        <a href="./guide">Guide</a>
        ${window.courseFinderTheme?.myPlanNavMarkup?.() || ""}
        <a href="./pathways">Pathways</a>
        <a href="./#atar">ATAR</a>
        <a href="./atar-calculator" aria-current="page">Calculator</a>
        <a href="./subject-helper">Subjects</a>
        <a href="./advisor">Course help</a>
        <a href="./#saved">Saved</a>
        <a href="./#providers">Universities</a>
        <a href="./#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
    ${renderCalculatorProgress()}

    <main class="calculator-main calculator-uac-page">
      <section class="hero calculator-hero calculator-uac-hero">
        <div>
          <p class="eyebrow">NSW HSC estimate</p>
          <h1>Estimate your ATAR</h1>
          <p>Add your expected HSC marks. The estimate applies subject scaling, keeps the best 10 eligible units and includes at least 2 units of English.</p>
        </div>
        <aside class="calculator-model-note">
          <span>Scaling model</span>
          <strong>UAC ${escapeHtml(String(calculatorMeta.year || 2025))} summary data</strong>
          <p>This is a planning estimate, not an official ATAR calculation or admission result.</p>
        </aside>
      </section>

      <section class="panel calculator-panel" id="calculator">
        <div class="panel-head calculator-panel-head">
          <div>
            <p class="section-kicker">Your subjects</p>
            <h2>HSC marks</h2>
            <p>Use expected or trial marks. Search by the full subject name or a common code such as ENTC, HMS, CAFS or MX1.</p>
          </div>
          <span>${calculatorState.rows.length} entered</span>
        </div>

        <div class="calculator-layout">
          <form class="calculator-form" data-form="calculator">
            ${renderCalculatorProcessStrip("calculator", "Updating estimate")}
            <div class="calculator-table-head" aria-hidden="true">
              <span>Subject</span><span>HSC mark</span><span>Historical contribution</span><span>Action</span>
            </div>
            <div class="subject-rows">
              ${calculatorState.rows.map(renderSubjectRow).join("")}
            </div>
            <div class="calc-toolbar">
              <button type="button" class="match-btn" data-action="add-row">Add subject</button>
              <button type="button" class="secondary-btn" data-action="boost-all">Test +2 marks each</button>
              <button type="button" class="clear-btn" data-action="clear-marks">Clear marks</button>
              <button type="button" class="clear-btn" data-action="reset-example">Restore example</button>
            </div>
          </form>

          <aside class="calculator-result" data-role="summary">
            ${renderEstimateSummary(estimate)}
          </aside>
        </div>
      </section>
    </main>
  `;

  bindCalculatorEvents();
  window.courseFinderTheme?.bind?.(calculatorApp);
  calculatorRenderPass += 1;
  requestAnimationFrame(scrollActiveNavIntoView);
}

function renderCalculatorProgress() {
  if (!calculatorState.processing) return "";
  return `<div class="app-progress is-active" aria-hidden="true"><div class="app-progress-track"></div></div>`;
}

function renderCalculatorProcessStrip(key, label) {
  if (calculatorState.processing !== key) return "";
  return `
    <div class="process-strip" role="status" aria-live="polite">
      <span>${escapeHtml(label)}</span>
      <span class="process-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  `;
}

function renderCalculatorStable(highlightRowId = "") {
  const x = window.scrollX;
  const y = window.scrollY;
  calculatorState.highlightRowId = highlightRowId;
  calculatorState.processing = "";
  renderCalculator();
  requestAnimationFrame(() => {
    window.scrollTo(x, y);
    calculatorState.highlightRowId = "";
    window.setTimeout(clearFreshCalculatorRows, 560);
  });
}

function clearFreshCalculatorRows() {
  calculatorApp.querySelectorAll(".calc-subject-row.is-fresh").forEach((row) => {
    row.classList.remove("is-fresh");
  });
}

function scrollActiveNavIntoView() {
  const nav = calculatorApp.querySelector(".topnav");
  if (!nav || nav.scrollWidth <= nav.clientWidth + 2) return;
  nav.querySelector('[aria-current="page"]')?.scrollIntoView({
    block: "nearest",
    inline: "start"
  });
}

function renderSubjectRow(row, index = 0) {
  const subject = subjectByName.get(row.subject);
  const max = subject ? subject.units * 50 : 100;
  const freshClass = row.id === calculatorState.highlightRowId ? " is-fresh" : "";
  const suggestionsId = `subject-suggestions-${row.id}`;
  const suggestionMarkup = row.id === calculatorState.activeSubjectRowId ? renderSubjectSuggestions(row) : "";
  const suggestionsOpen = Boolean(suggestionMarkup);
  return `
    <div class="calc-subject-row${freshClass}" data-row-id="${escapeHtml(row.id)}">
      <div class="subject-picker">
        <span class="calc-field-label">Subject</span>
        <input
          type="search"
          value="${escapeHtml(subjectInputValue(row))}"
          placeholder="Type subject or alias, e.g. ENTC"
          data-action="subject-change"
          aria-label="Subject"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded="${suggestionsOpen ? "true" : "false"}"
          aria-controls="${escapeHtml(suggestionsId)}"
          autocomplete="off"
          title="${escapeHtml(subjectInputValue(row))}"
        />
        <div
          class="subject-suggestions"
          id="${escapeHtml(suggestionsId)}"
          data-output="subject-suggestions"
          role="listbox"
          aria-label="Matching HSC subjects"
          ${suggestionsOpen ? "" : "hidden"}
        >
          ${suggestionMarkup}
        </div>
      </div>
      <label>
        <span>HSC mark <small data-output="mark-max">/${max}</small></span>
        <input
          type="number"
          min="0"
          max="${max}"
          step="0.5"
          value="${escapeHtml(String(row.mark ?? ""))}"
          placeholder="${subject?.units === 1 ? "42" : "82"}"
          data-action="mark-change"
          aria-label="Expected mark for ${escapeHtml(subject?.name || "selected subject")}"
        />
      </label>
      <div class="row-breakdown" data-output="row-breakdown">
        ${renderRowBreakdown(row)}
      </div>
      <button type="button" class="row-remove" data-action="remove-row" aria-label="Remove subject">Remove</button>
    </div>
  `;
}

function renderEstimateSummary(estimate) {
  const atarLabel = estimate.ready ? estimate.atarLabel : "—";
  const target = nextAtarTarget(estimate);
  return `
    <div class="atar-uac-summary">
      <span>Estimated ATAR</span>
      <strong>${escapeHtml(atarLabel)}</strong>
      <p>${estimateModeLabel(estimate)}</p>
      <dl>
        <div><dt>Estimated aggregate</dt><dd>${estimate.ready ? `${formatNumber(estimate.aggregate, 1)} / 500` : "Complete pattern"}</dd></div>
        <div><dt>Eligible units entered</dt><dd>${Math.min(10, estimate.previewUnits)} / 10</dd></div>
        <div><dt>English requirement</dt><dd>${englishUnitCount(estimate) >= 2 ? "Covered" : `${englishUnitCount(estimate)} / 2 units`}</dd></div>
      </dl>
    </div>
    <div class="atar-next-step">
      <span>Next useful target</span>
      <strong>${target ? `Aim for ${formatAtar(target.targetAtar)}` : "Complete the subject pattern"}</strong>
      <p>${target ? `About ${formatNumber(Math.max(0, target.aggregateGap), 1)} more scaled aggregate points from the best 10 units.` : "Enter marks for English and enough subjects to reach 10 eligible units."}</p>
    </div>
    ${estimate.warnings.length ? `<ul class="calc-warnings">${estimate.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
    <details class="atar-analysis-details">
      <summary><span><strong>Scaling details and what-if planner</strong><small>See subject strengths, weak points and mark-lift scenarios</small></span><i aria-hidden="true">⌄</i></summary>
      <div>
        ${renderSubjectFocusCard(estimate)}
        ${renderAtarSmartPlanner(estimate)}
        ${renderSubjectImpactList(estimate)}
      </div>
    </details>
  `;
}

function englishUnitCount(estimate) {
  return estimate.subjects
    .filter((entry) => entry.english && entry.eligible)
    .reduce((sum, entry) => sum + entry.effectiveUnits, 0);
}

function renderAtarSmartPlanner(estimate) {
  const rows = subjectFocusRows(estimate);
  const focusRows = [...rows]
    .filter((entry) => entry.rowId && entry.listUnits > 0)
    .sort((a, b) => a.listImpact - b.listImpact || a.listScaled - b.listScaled)
    .slice(0, 3);
  const strongest = [...rows].sort((a, b) => b.listImpact - a.listImpact || b.listScaled - a.listScaled)[0];
  const target = nextAtarTarget(estimate);
  const scenarios = buildWhatIfScenarios(estimate, focusRows);
  const englishUnits = estimate.subjects
    .filter((entry) => entry.english && entry.eligible)
    .reduce((sum, entry) => sum + entry.effectiveUnits, 0);
  const enteredUnits = estimate.subjects
    .filter((entry) => entry.eligible)
    .reduce((sum, entry) => sum + entry.effectiveUnits, 0);
  const bestMove = focusRows[0];

  return `
    <div class="atar-smart-planner" aria-label="Smart ATAR planner">
      <article class="atar-smart-card primary">
        <span>Next target</span>
        <strong>${target ? `Aim for ${formatAtar(target.targetAtar)}` : "Add marks first"}</strong>
        <p>${target ? `You need about ${formatNumber(Math.max(0, target.aggregateGap), 1)} more scaled aggregate points from your best 10 units.` : "Enter at least one subject and mark so the calculator can set a realistic next ATAR step."}</p>
      </article>
      <article class="atar-smart-card">
        <span>Best move</span>
        <strong>${bestMove ? subjectDisplayName(bestMove.subject) : "Build the base"}</strong>
        <p>${bestMove ? bestMoveAdvice(bestMove, strongest) : "Start with English plus enough subjects to reach 10 eligible units."}</p>
      </article>
      <article class="atar-smart-card">
        <span>Readiness check</span>
        <strong>${estimate.ready ? "Full estimate" : `${Math.min(10, enteredUnits)} / 10 units`}</strong>
        <p>${englishUnits >= 2 ? "English requirement is covered." : "Add 2 units of English for a real ATAR pattern."} ${estimate.ready ? "The result uses the best 10 eligible units." : `${Math.max(0, 10 - enteredUnits)} unit${Math.max(0, 10 - enteredUnits) === 1 ? "" : "s"} still missing.`}</p>
      </article>
      ${scenarios.length ? `
        <div class="atar-what-if-strip">
          <span>What-if boost</span>
          ${scenarios.map((scenario) => `
            <div>
              <b>${escapeHtml(scenario.label)}</b>
              <strong>${escapeHtml(scenario.atarLabel)}</strong>
              <small>${escapeHtml(scenario.deltaLabel)}</small>
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function bestMoveAdvice(focusRow, strongest) {
  const focusName = subjectDisplayName(focusRow.subject);
  const strongestName = strongest ? subjectDisplayName(strongest.subject) : "";
  if (focusRow.listImpact < -0.05) {
    return `${focusName} is pulling the estimate down most. Lift it first before chasing tiny gains elsewhere.`;
  }
  if (strongest && strongest.rowId !== focusRow.rowId) {
    return `No subject is badly dragging. Protect ${strongestName}, then raise your lowest counted subject.`;
  }
  return "No subject is clearly dragging. Keep lifting the lower mark while protecting your strongest one.";
}

function buildWhatIfScenarios(estimate, focusRows) {
  if (!estimate.assumedReady || !focusRows.length) return [];
  const focusIds = focusRows.slice(0, 2).map((entry) => entry.rowId);
  const allFocusIds = focusRows.map((entry) => entry.rowId);
  const scenarios = [
    { label: "+3 to focus", lift: 3, rowIds: allFocusIds },
    { label: "+5 to weakest", lift: 5, rowIds: focusIds.slice(0, 1) },
    { label: "+8 to focus", lift: 8, rowIds: focusIds }
  ];
  if (!estimate.ready) return [];
  const baseAtar = atarNumberFromLabel(estimate.atarLabel);
  return scenarios
    .map((scenario) => {
      const lifted = estimateWithLift(scenario.rowIds, scenario.lift);
      const nextAtar = atarNumberFromLabel(lifted.atarLabel);
      const delta = nextAtar === null || baseAtar === null ? null : nextAtar - baseAtar;
      return {
        label: scenario.label,
        atarLabel: lifted.atarLabel,
        deltaLabel: delta === null ? "rough" : `${delta >= 0 ? "+" : ""}${formatNumber(delta, 2)} ATAR`
      };
    })
    .filter((scenario) => scenario.atarLabel && scenario.atarLabel !== "-");
}

function estimateWithLift(rowIds, lift) {
  const idSet = new Set(rowIds);
  const adjustedRows = calculatorState.rows.map((row) => {
    if (!idSet.has(row.id)) return { ...row };
    const subject = subjectByName.get(row.subject);
    if (!subject) return { ...row };
    const mark = parseMark(row.mark, subject);
    if (mark === null) return { ...row };
    return {
      ...row,
      mark: String(clamp(mark + lift, 0, subject.units * 50))
    };
  });
  return calculateEstimate(adjustedRows);
}

function nextAtarTarget(estimate) {
  if (!estimate.ready) return null;
  const currentAtar = atarNumberFromLabel(estimate.atarLabel);
  if (currentAtar === null) return null;
  const targetAtar = [60, 65, 70, 75, 80, 85, 90, 95, 98]
    .find((target) => target > currentAtar + 0.15) || 99;
  const targetAggregate = aggregateForAtar(targetAtar);
  if (targetAggregate === null) return null;
  return {
    targetAtar,
    targetAggregate,
    aggregateGap: targetAggregate - estimate.aggregate
  };
}

function atarNumberFromLabel(label) {
  if (!label || label === "-") return null;
  if (/^<\s*50/.test(label)) return 49.95;
  const value = Number(label);
  return Number.isFinite(value) ? value : null;
}

function aggregateForAtar(targetAtar) {
  const thresholds = aggregateThresholds;
  const target = Number(targetAtar);
  if (!Number.isFinite(target) || !thresholds.length) return null;
  if (target >= thresholds[0].atar) return thresholds[0].aggregate;
  const lowest = thresholds[thresholds.length - 1];
  if (target <= lowest.atar) return lowest.aggregate;
  for (let index = 1; index < thresholds.length; index += 1) {
    const high = thresholds[index - 1];
    const low = thresholds[index];
    if (target <= high.atar && target >= low.atar) {
      const ratio = (target - low.atar) / (high.atar - low.atar);
      return low.aggregate + ratio * (high.aggregate - low.aggregate);
    }
  }
  return null;
}

function subjectFocusRows(estimate) {
  const rows = estimate.ready
    ? estimate.subjects
      .filter((entry) => entry.countedUnits > 0)
      .map((entry) => ({
        ...entry,
        listUnits: entry.countedUnits,
        listScaled: entry.contribution,
        listImpact: entry.countedBreakEvenImpact,
        listMax: entry.countedUnits * 50
      }))
    : estimate.subjects
      .filter((entry) => entry.eligible && entry.courseScaled > 0)
      .map((entry) => ({
        ...entry,
        listUnits: entry.effectiveUnits,
        listScaled: entry.courseScaled,
        listImpact: entry.courseBreakEvenImpact,
        listMax: entry.effectiveUnits * 50
      }));

  rows.sort((a, b) => b.listImpact - a.listImpact || b.listScaled - a.listScaled);
  return rows;
}

function renderSubjectFocusCard(estimate) {
  const rows = subjectFocusRows(estimate);
  if (!rows.length) {
    return `
      <article class="atar-focus-card">
        <span>Subject focus</span>
        <strong>Add marks to see focus</strong>
        <p>Enter subjects and marks to see what is carrying your estimate and what needs the most attention.</p>
      </article>
    `;
  }

  const strongRows = rows.filter((entry) => entry.listImpact >= -0.05).slice(0, 2);
  const focusRows = [...rows].sort((a, b) => a.listImpact - b.listImpact || a.listScaled - b.listScaled).slice(0, 2);
  const lead = focusRows.some((entry) => entry.listImpact < -0.05)
    ? "Work on the focus subjects first; they are pulling the estimate down the most."
    : "No subject is clearly dragging. Keep lifting the lower-scoring subjects while protecting your strengths.";

  return `
    <article class="atar-focus-card">
      <span>Subject focus</span>
      <div class="focus-groups">
        <div>
          <em>Strong</em>
          ${renderMiniSubjectList(strongRows.length ? strongRows : rows.slice(0, 1), "strong")}
        </div>
        <div>
          <em>Weak / focus</em>
          ${renderMiniSubjectList(focusRows, "focus")}
        </div>
      </div>
      <p>${escapeHtml(lead)}</p>
    </article>
  `;
}

function renderMiniSubjectList(rows, type = "strong") {
  if (!rows.length) return `<small>No subjects yet</small>`;
  return rows.map((entry) => {
    const status = type === "focus"
      ? entry.listImpact < -0.05 ? "weak" : "lowest"
      : entry.listImpact >= -0.05 ? "strong" : "watch";
    return `
    <small class="${scaleClass(entry.listImpact)} ${type === "focus" ? "focus-subject" : "strong-subject"}">
      <b>${escapeHtml(subjectDisplayName(entry.subject))}</b>
      <span>${status} ${formatSigned(entry.listImpact)}</span>
    </small>
  `;
  }).join("");
}

function renderSubjectImpactList(estimate) {
  const rows = subjectFocusRows(estimate);
  if (!rows.length) return "";

  return `
    <div class="subject-impact-list">
      <div class="subject-impact-head">
        <h3>Subject strengths and focus areas</h3>
        <p>${estimate.ready ? "Best 10 eligible units are counted." : `Entered ${estimate.previewUnits} eligible unit${estimate.previewUnits === 1 ? "" : "s"}. Complete the pattern before relying on an ATAR result.`}</p>
      </div>
      ${rows.map((entry) => `
        <article class="subject-impact-card ${scaleClass(entry.listImpact)}">
          <div class="subject-impact-title">
            <strong>${escapeHtml(subjectDisplayName(entry.subject))}</strong>
            <span>${breakEvenImpactSummary(entry.listImpact)}</span>
          </div>
          <div class="subject-impact-meta">
            <span>Historical contribution <strong>${formatNumber(entry.listScaled, 1)} / ${entry.listMax}</strong></span>
            <span>Neutral-contribution HSC mark <strong>${formatBreakEven(entry.subject)}</strong></span>
            <span>${entry.listUnits}/${entry.effectiveUnits} unit${entry.effectiveUnits === 1 ? "" : "s"} ${estimate.ready ? "counted" : "entered"}</span>
          </div>
          <p>${subjectImpactSentence(entry)}</p>
        </article>
      `).join("")}
      ${!estimate.ready ? `<p class="missing-baseline-note">No marks have been invented for missing units. Add the full pattern to calculate an indicative ATAR.</p>` : ""}
    </div>
  `;
}

function renderSubjectSuggestions(row) {
  const query = normalizeText(row.subjectInput || row.subject || "");
  const selectedSubject = subjectByName.get(row.subject);
  const selectedValues = selectedSubject
    ? [selectedSubject.name, subjectDisplayName(selectedSubject), ...(subjectAliases[selectedSubject.name] || [])].map(normalizeText)
    : [];
  if (query && selectedValues.includes(query)) return "";
  const common = ["English Standard", "English Advanced", "Mathematics Standard 2", "Mathematics Advanced", "Enterprise Computing", "Business Studies", "Physics", "Chemistry", "Biology"];
  const matches = query
    ? hscSubjects
      .map((subject) => ({ subject, score: subjectSuggestionScore(subject, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.subject.name.localeCompare(b.subject.name))
      .slice(0, 8)
      .map((entry) => entry.subject)
    : common.map((name) => subjectByName.get(name)).filter(Boolean);

  if (!matches.length) {
    return `<div class="subject-suggestion-empty">No subject found. Try the full HSC subject name.</div>`;
  }

  return matches.map((subject, index) => `
    <button
      type="button"
      id="subject-option-${escapeHtml(row.id)}-${index}"
      class="subject-suggestion${index === calculatorState.activeSubjectOptionIndex ? " is-active" : ""}"
      data-subject-option="${escapeHtml(subject.name)}"
      role="option"
      aria-selected="${index === calculatorState.activeSubjectOptionIndex ? "true" : "false"}"
    >
      <span>
        <strong>${escapeHtml(subject.name)}</strong>
        <small>${escapeHtml(subject.field)} - ${subject.units}u</small>
      </span>
      ${primarySubjectCode(subject) ? `<em>${escapeHtml(primarySubjectCode(subject))}</em>` : ""}
    </button>
  `).join("");
}

function renderRowBreakdown(row) {
  const subject = subjectByName.get(row.subject);
  if (!subject) return "<span>Select a subject.</span>";
  const mark = parseMark(row.mark, subject);
  if (mark === null) {
    return `<span>Break-even ${formatBreakEven(subject)}</span>`;
  }
  const perUnit = mark / subject.units;
  const scaled = estimateScaledPerUnit(subject, perUnit);
  const courseScaled = scaled * subject.units;
  const breakEvenImpact = courseScaled - (subject.units * 25);
  const breakEven = breakEvenMark(subject);
  return `
    <span class="calc-scaled-output"><small>Historical aggregate contribution</small><strong>${formatNumber(courseScaled, 1)} / ${subject.units * 50}</strong></span>
    <span class="calc-scale-impact ${scaleClass(breakEvenImpact)}">${neutralImpactSummary(breakEvenImpact)}</span>
    <small class="calc-break-even-note">UAC 2025 interpolation · neutral at about ${formatBreakEven(subject)}</small>
  `;
}

function renderSubjectGuide() {
  const query = normalizeText(calculatorState.guideQuery);
  const rows = hscSubjects
    .filter((subject) => calculatorState.guideField === "All fields" || subject.field === calculatorState.guideField)
    .filter((subject) => !query || subjectSearchText(subject).includes(query));
  const visible = rows.slice(0, calculatorState.guideLimit);

  if (!rows.length) {
    return `<p class="empty-note">No HSC subjects match that search.</p>`;
  }

  return `
    <div class="guide-table" role="table" aria-label="Subject break-even guide">
      <div class="guide-row guide-head" role="row">
        <span>Subject</span>
        <span>Units</span>
        <span>Neutral mark</span>
        <span>Median contribution</span>
        <span>Data</span>
      </div>
      ${visible.map(renderGuideRow).join("")}
    </div>
    ${rows.length > visible.length ? `<button type="button" class="load-more" data-action="show-more-guide">Show more subjects</button>` : ""}
  `;
}

function renderGuideRow(subject) {
  return `
    <div class="guide-row" role="row">
      <strong>${escapeHtml(subjectDisplayName(subject))}</strong>
      <span>${subject.units}</span>
      <span>${formatBreakEven(subject)}</span>
      <span>${subject.scaledP50 === null ? "Limited data" : formatNumber(subject.scaledP50 * subject.units, 1)}</span>
      <span>${subject.fallback ? "Fallback" : "UAC 2025"}</span>
    </div>
  `;
}

function bindCalculatorEvents() {
  calculatorApp.querySelector("[data-form='calculator']").addEventListener("submit", (event) => event.preventDefault());

  calculatorApp.querySelectorAll("[data-action='add-row']").forEach((button) => {
    button.addEventListener("click", () => {
      const row = createRow("", "");
      calculatorState.activeSubjectRowId = "";
      calculatorState.rows.push(row);
      persistRows();
      renderCalculatorStable(row.id);
    });
  });

  calculatorApp.querySelectorAll("[data-action='reset-example']").forEach((button) => {
    button.addEventListener("click", () => {
      calculatorState.activeSubjectRowId = "";
      calculatorState.rows = defaultRows();
      persistRows();
      renderCalculatorStable(calculatorState.rows[0]?.id || "");
    });
  });

  calculatorApp.querySelectorAll("[data-action='boost-all']").forEach((button) => {
    button.addEventListener("click", () => {
      calculatorState.activeSubjectRowId = "";
      calculatorState.rows = calculatorState.rows.map((row) => {
        const subject = subjectByName.get(row.subject);
        const mark = Number(row.mark);
        if (!subject || !Number.isFinite(mark)) return row;
        return { ...row, mark: Math.min(subject.units * 50, mark + 2) };
      });
      persistRows();
      renderCalculatorStable();
    });
  });

  calculatorApp.querySelectorAll("[data-action='clear-marks']").forEach((button) => {
    button.addEventListener("click", () => {
      calculatorState.activeSubjectRowId = "";
      calculatorState.rows = calculatorState.rows.map((row) => ({ ...row, mark: "" }));
      persistRows();
      renderCalculatorStable();
    });
  });

  calculatorApp.querySelectorAll("[data-action='remove-row']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      calculatorState.activeSubjectRowId = "";
      calculatorState.rows = calculatorState.rows.filter((row) => row.id !== rowElement.dataset.rowId);
      persistRows();
      renderCalculatorStable();
    });
  });

  calculatorApp.querySelectorAll("[data-action='subject-change']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!row) return;
      calculatorState.activeSubjectRowId = row.id;
      calculatorState.activeSubjectOptionIndex = -1;
      row.subjectInput = event.currentTarget.value;
      const resolvedSubject = resolveSubjectInput(event.currentTarget.value);
      row.subject = resolvedSubject ? resolvedSubject.name : "";
      const subject = subjectByName.get(row.subject);
      const markInput = rowElement.querySelector("[data-action='mark-change']");
      if (subject && Number(row.mark) > subject.units * 50) {
        row.mark = subject.units * 50;
        markInput.value = row.mark;
      }
      persistRows();
      updateEstimateDom();
    });

    input.addEventListener("focus", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      calculatorState.activeSubjectRowId = rowElement.dataset.rowId;
      calculatorState.activeSubjectOptionIndex = -1;
      updateEstimateDom();
    });

    input.addEventListener("click", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      if (calculatorState.activeSubjectRowId === rowElement.dataset.rowId) return;
      calculatorState.activeSubjectRowId = rowElement.dataset.rowId;
      calculatorState.activeSubjectOptionIndex = -1;
      updateEstimateDom();
    });

    input.addEventListener("keydown", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!row) return;

      if (event.key === "Escape") {
        event.preventDefault();
        dismissSubjectSuggestions();
        return;
      }

      if (event.key === "Tab") {
        dismissSubjectSuggestions();
        return;
      }

      let options = Array.from(rowElement.querySelectorAll("[data-subject-option]"));
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !options.length) {
        calculatorState.activeSubjectRowId = row.id;
        calculatorState.activeSubjectOptionIndex = -1;
        updateEstimateDom();
        options = Array.from(rowElement.querySelectorAll("[data-subject-option]"));
      }
      if ((event.key === "ArrowDown" || event.key === "ArrowUp") && options.length) {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex = calculatorState.activeSubjectOptionIndex < 0
          ? (direction > 0 ? 0 : options.length - 1)
          : (calculatorState.activeSubjectOptionIndex + direction + options.length) % options.length;
        setActiveSubjectOption(rowElement, nextIndex);
        return;
      }

      if (event.key === "Enter" && calculatorState.activeSubjectOptionIndex >= 0) {
        const option = options[calculatorState.activeSubjectOptionIndex];
        const subject = option ? subjectByName.get(option.dataset.subjectOption) : null;
        if (!subject) return;
        event.preventDefault();
        chooseSubject(rowElement, row, subject);
      }
    });

    input.addEventListener("change", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!row) return;
      const resolvedSubject = resolveSubjectInput(event.currentTarget.value);
      if (resolvedSubject) {
        row.subject = resolvedSubject.name;
        row.subjectInput = resolvedSubject.name;
        event.currentTarget.value = subjectInputValue(row);
      } else if (!event.currentTarget.value.trim()) {
        row.subject = "";
        row.subjectInput = "";
      }
      calculatorState.activeSubjectRowId = "";
      calculatorState.activeSubjectOptionIndex = -1;
      persistRows();
      updateEstimateDom();
    });
  });

  if (!calculatorApp.dataset.subjectOptionBound) {
    calculatorApp.dataset.subjectOptionBound = "true";
    calculatorApp.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("[data-subject-option]");
      if (!button) return;
      event.preventDefault();
    });
    calculatorApp.addEventListener("click", (event) => {
      const button = event.target.closest("[data-subject-option]");
      if (!button) return;
      const rowElement = button.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      const subject = subjectByName.get(button.dataset.subjectOption);
      if (!row || !subject) return;
      chooseSubject(rowElement, row, subject);
    });
  }

  if (!calculatorApp.dataset.subjectDismissBound) {
    calculatorApp.dataset.subjectDismissBound = "true";
    document.addEventListener("pointerdown", (event) => {
      if (!calculatorState.activeSubjectRowId) return;
      const picker = event.target.closest?.(".subject-picker");
      const rowId = picker?.closest("[data-row-id]")?.dataset.rowId || "";
      if (rowId === calculatorState.activeSubjectRowId) return;
      dismissSubjectSuggestions();
    }, true);
  }

  calculatorApp.querySelectorAll("[data-action='mark-change']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!row) return;
      row.mark = event.currentTarget.value;
      persistRows();
      updateEstimateDom();
    });
  });

  const guideQuery = calculatorApp.querySelector("[data-action='guide-query']");
  if (guideQuery) {
    guideQuery.addEventListener("input", (event) => {
      calculatorState.guideQuery = event.currentTarget.value;
      calculatorState.guideLimit = defaultGuideLimit();
      updateSubjectGuide();
    });
  }

  const guideField = calculatorApp.querySelector("[data-action='guide-field']");
  if (guideField) {
    guideField.addEventListener("change", (event) => {
      calculatorState.guideField = event.currentTarget.value;
      calculatorState.guideLimit = defaultGuideLimit();
      updateSubjectGuide();
    });
  }

  calculatorApp.querySelectorAll("[data-action='show-more-guide']").forEach((button) => {
    button.addEventListener("click", () => {
      calculatorState.guideLimit += 24;
      updateSubjectGuide();
    });
  });
}

function updateEstimateDom() {
  const estimate = calculateEstimate(calculatorState.rows);
  const summary = calculatorApp.querySelector("[data-role='summary']");
  if (summary) summary.innerHTML = renderEstimateSummary(estimate);

  calculatorApp.querySelectorAll("[data-row-id]").forEach((rowElement) => {
    const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
    if (!row) return;
    const subject = subjectByName.get(row.subject);
    const max = subject ? subject.units * 50 : 100;
    const markMax = rowElement.querySelector("[data-output='mark-max']");
    const markInput = rowElement.querySelector("[data-action='mark-change']");
    const breakdown = rowElement.querySelector("[data-output='row-breakdown']");
    if (markMax) markMax.textContent = `/${max}`;
    if (markInput) markInput.max = String(max);
    if (breakdown) breakdown.innerHTML = renderRowBreakdown(row);
    const subjectInput = rowElement.querySelector("[data-action='subject-change']");
    if (subjectInput) subjectInput.title = subjectInputValue(row);
    const suggestions = rowElement.querySelector("[data-output='subject-suggestions']");
    const suggestionMarkup = row.id === calculatorState.activeSubjectRowId ? renderSubjectSuggestions(row) : "";
    if (suggestions) {
      suggestions.innerHTML = suggestionMarkup;
      suggestions.hidden = !suggestionMarkup;
    }
    if (subjectInput) {
      subjectInput.setAttribute("aria-expanded", suggestionMarkup ? "true" : "false");
      subjectInput.removeAttribute("aria-activedescendant");
    }
  });
}

function dismissSubjectSuggestions() {
  if (!calculatorState.activeSubjectRowId) return;
  calculatorState.activeSubjectRowId = "";
  calculatorState.activeSubjectOptionIndex = -1;
  calculatorApp.querySelectorAll("[data-output='subject-suggestions']").forEach((list) => {
    list.innerHTML = "";
    list.hidden = true;
  });
  calculatorApp.querySelectorAll("[data-action='subject-change']").forEach((input) => {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  });
}

function setActiveSubjectOption(rowElement, index) {
  const options = Array.from(rowElement.querySelectorAll("[data-subject-option]"));
  if (!options.length) return;
  calculatorState.activeSubjectOptionIndex = Math.max(0, Math.min(index, options.length - 1));
  options.forEach((option, optionIndex) => {
    const isActive = optionIndex === calculatorState.activeSubjectOptionIndex;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  const input = rowElement.querySelector("[data-action='subject-change']");
  const activeOption = options[calculatorState.activeSubjectOptionIndex];
  if (input && activeOption) input.setAttribute("aria-activedescendant", activeOption.id);
  activeOption?.scrollIntoView({ block: "nearest" });
}

function chooseSubject(rowElement, row, subject) {
  row.subject = subject.name;
  row.subjectInput = subject.name;
  calculatorState.activeSubjectRowId = "";
  calculatorState.activeSubjectOptionIndex = -1;
  const input = rowElement.querySelector("[data-action='subject-change']");
  if (input) {
    input.value = subject.name;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }
  persistRows();
  updateEstimateDom();
  rowElement.classList.remove("is-fresh");
  void rowElement.offsetHeight;
  rowElement.classList.add("is-fresh");
  window.setTimeout(() => rowElement.classList.remove("is-fresh"), 560);
}

function updateSubjectGuide() {
  const guide = calculatorApp.querySelector("[data-role='subject-guide']");
  if (guide) guide.innerHTML = renderSubjectGuide();
  calculatorApp.querySelectorAll("[data-action='show-more-guide']").forEach((button) => {
    button.addEventListener("click", () => {
      calculatorState.guideLimit += 24;
      updateSubjectGuide();
    });
  });
}

function calculateEstimate(rows) {
  const warnings = [];
  const uniqueRows = dedupeRows(rows, warnings);
  const hasMathExtension2 = uniqueRows.some((row) => row.subject === "Mathematics Extension 2");
  const hasMathExtension1 = uniqueRows.some((row) => row.subject === "Mathematics Extension 1");
  const hasEnglishAdvanced = uniqueRows.some((row) => row.subject === "English Advanced");
  const hasEnglishExtension1 = uniqueRows.some((row) => row.subject === "English Extension 1");
  const hasEnglishExtension2 = uniqueRows.some((row) => row.subject === "English Extension 2");

  if (hasMathExtension2 && !hasMathExtension1) {
    warnings.push("Mathematics Extension 2 normally requires Mathematics Extension 1. Add Extension 1 for a closer estimate.");
  }
  if (hasMathExtension2 && hasMathExtension1) {
    warnings.push("When Mathematics Extension 2 is included, this calculator doubles Mathematics Extension 1 and excludes Mathematics Advanced, matching UAC guidance.");
  }
  if (hasEnglishExtension1 && !hasEnglishAdvanced) {
    warnings.push("English Extension 1 normally requires English Advanced.");
  }
  if (hasEnglishExtension2 && !hasEnglishExtension1) {
    warnings.push("English Extension 2 normally requires English Extension 1.");
  }

  const subjects = [];
  const blocks = [];

  for (const row of uniqueRows) {
    const subject = subjectByName.get(row.subject);
    if (!subject) continue;
    const mark = parseMark(row.mark, subject);
    if (mark === null) continue;

    let effectiveUnits = subject.units;
    let eligible = true;
    let note = "";

    if (subject.name === "Mathematics Extension 1" && hasMathExtension2) {
      effectiveUnits = 2;
      note = "Doubled with Extension 2.";
    }

    if (subject.name === "Mathematics Advanced" && hasMathExtension2 && hasMathExtension1) {
      eligible = false;
      note = "Excluded when Extension 2 is counted.";
    }

    const perUnitHsc = clamp(mark / subject.units, 0, 50);
    const scaledPerUnit = estimateScaledPerUnit(subject, perUnitHsc);
    const entry = {
      rowId: row.id,
      name: subject.name,
      english: subject.english,
      subject,
      mark,
      perUnitHsc,
      scaledPerUnit,
      courseScaled: scaledPerUnit * effectiveUnits,
      courseBreakEvenImpact: (scaledPerUnit * effectiveUnits) - (25 * effectiveUnits),
      effectiveUnits,
      countedUnits: 0,
      contribution: 0,
      countedBreakEvenImpact: 0,
      eligible,
      note
    };
    subjects.push(entry);

    if (!eligible) continue;
    for (let index = 0; index < effectiveUnits; index += 1) {
      blocks.push({
        id: `${row.id}-${index}`,
        rowId: row.id,
        name: subject.name,
        english: subject.english,
        scaled: scaledPerUnit
      });
    }
  }

  const englishBlocks = blocks.filter((block) => block.english).sort((a, b) => b.scaled - a.scaled);
  const requiredEnglish = englishBlocks.slice(0, 2);
  const requiredIds = new Set(requiredEnglish.map((block) => block.id));
  const remainingBlocks = blocks.filter((block) => !requiredIds.has(block.id)).sort((a, b) => b.scaled - a.scaled);
  const otherBlocks = remainingBlocks.slice(0, 8);
  const countedBlocks = requiredEnglish.length === 2 ? [...requiredEnglish, ...otherBlocks] : [];
  const countedUnits = countedBlocks.length;
  const aggregate = countedBlocks.reduce((sum, block) => sum + block.scaled, 0);

  if (englishBlocks.length < 2) warnings.push("Add 2 units of English for a full ATAR estimate.");
  if (blocks.length < 10) warnings.push("Add 10 eligible units for an ATAR estimate. Missing units are not guessed.");

  const countedByRow = countedBlocks.reduce((map, block) => {
    const current = map.get(block.rowId) || { units: 0, contribution: 0 };
    current.units += 1;
    current.contribution += block.scaled;
    map.set(block.rowId, current);
    return map;
  }, new Map());

  for (const entry of subjects) {
    const counted = countedByRow.get(entry.rowId);
    if (counted) {
      entry.countedUnits = counted.units;
      entry.contribution = counted.contribution;
      entry.countedBreakEvenImpact = entry.contribution - (25 * counted.units);
    }
  }

  const ready = englishBlocks.length >= 2 && blocks.length >= 10 && countedUnits === 10;
  const assumed = calculateAssumedAggregate({ blocks, englishBlocks, requiredIds, requiredEnglish, remainingBlocks, aggregate, ready });
  const atarLabel = ready ? estimateAtar(aggregate) : "-";
  const previewRows = subjects.filter((entry) => entry.eligible && entry.courseScaled > 0);
  const previewUnits = previewRows.reduce((sum, entry) => sum + entry.effectiveUnits, 0);
  const previewContribution = previewRows.reduce((sum, entry) => sum + entry.courseScaled, 0);
  const totalBreakEvenImpact = assumed.ready ? assumed.aggregate - 250 : 0;

  return {
    ready,
    aggregate,
    atarLabel,
    countedUnits,
    previewUnits,
    previewContribution,
    totalBreakEvenImpact,
    assumedReady: assumed.ready,
    assumedAggregate: assumed.aggregate,
    assumedAtarLabel: assumed.ready ? estimateAtar(assumed.aggregate) : "-",
    assumedMissingUnits: assumed.missingUnits,
    assumedNeutralPerUnit: assumed.neutralPerUnit,
    assumedFillContribution: assumed.fillContribution,
    warnings,
    subjects
  };
}

function calculateAssumedAggregate({ blocks, englishBlocks, requiredIds, requiredEnglish, remainingBlocks, aggregate, ready }) {
  if (!blocks.length) {
    return {
      ready: false,
      aggregate: 0,
      missingUnits: 10,
      neutralPerUnit: 0,
      fillContribution: 0
    };
  }

  if (ready) {
    return {
      ready: true,
      aggregate,
      missingUnits: 0,
      neutralPerUnit: 0,
      fillContribution: 0
    };
  }

  const neutralPerUnit = 25;
  const assumedBlocks = englishBlocks.length >= 2
    ? [
      ...requiredEnglish,
      ...remainingBlocks.filter((block) => !requiredIds.has(block.id)).slice(0, 8)
    ]
    : blocks.slice().sort((a, b) => b.scaled - a.scaled).slice(0, 10);
  const assumedUnits = Math.min(10, assumedBlocks.length);
  const missingUnits = Math.max(0, 10 - assumedUnits);
  const enteredContribution = assumedBlocks.slice(0, 10).reduce((sum, block) => sum + block.scaled, 0);
  const fillContribution = missingUnits * neutralPerUnit;

  return {
    ready: true,
    aggregate: enteredContribution + fillContribution,
    missingUnits,
    neutralPerUnit,
    fillContribution
  };
}

function dedupeRows(rows, warnings) {
  const bySubject = new Map();
  for (const row of rows) {
    if (!row.subject) continue;
    const subject = subjectByName.get(row.subject);
    if (!subject) continue;
    const mark = parseMark(row.mark, subject);
    const existing = bySubject.get(row.subject);
    if (!existing || (mark ?? -1) > (parseMark(existing.mark, subject) ?? -1)) {
      bySubject.set(row.subject, row);
    }
  }

  if (bySubject.size < rows.filter((row) => row.subject).length) {
    warnings.push("Duplicate subjects are estimated once, using the highest mark entered.");
  }

  return Array.from(bySubject.values());
}

function estimateScaledPerUnit(subject, hscPerUnit) {
  const mark = clamp(Number(hscPerUnit) || 0, 0, 50);
  const percentileKeys = [
    ["hscP25", "scaledP25"],
    ["hscP50", "scaledP50"],
    ["hscP75", "scaledP75"],
    ["hscP90", "scaledP90"],
    ["hscP99", "scaledP99"]
  ];

  const anchors = [[0, 0]];
  for (const [hscKey, scaledKey] of percentileKeys) {
    if (isFiniteNumber(subject[hscKey]) && isFiniteNumber(subject[scaledKey])) {
      anchors.push([subject[hscKey], subject[scaledKey]]);
    }
  }
  if (isFiniteNumber(subject.hscMax) && isFiniteNumber(subject.scaledMax)) {
    anchors.push([subject.hscMax, subject.scaledMax]);
  }
  if (isFiniteNumber(subject.scaledMax)) {
    anchors.push([50, Math.min(50, Math.max(subject.scaledMax, subject.scaledP99 || 0))]);
  }

  const cleaned = mergeAnchors(anchors);
  if (cleaned.length >= 3 && cleaned.some(([x]) => x >= mark)) {
    for (let index = 1; index < cleaned.length; index += 1) {
      const [leftX, leftY] = cleaned[index - 1];
      const [rightX, rightY] = cleaned[index];
      if (mark <= rightX) {
        const ratio = rightX === leftX ? 0 : (mark - leftX) / (rightX - leftX);
        return clamp(leftY + ratio * (rightY - leftY), 0, 50);
      }
    }
  }

  if (isFiniteNumber(subject.hscMean) && isFiniteNumber(subject.hscSd) && subject.hscSd > 0 && isFiniteNumber(subject.scaledMean)) {
    const z = (mark - subject.hscMean) / subject.hscSd;
    return clamp(subject.scaledMean + z * (subject.scaledSd || 0), 0, 50);
  }

  return clamp(subject.scaledMean || mark, 0, 50);
}

function mergeAnchors(anchors) {
  const map = new Map();
  anchors
    .filter(([x, y]) => isFiniteNumber(x) && isFiniteNumber(y))
    .sort((a, b) => a[0] - b[0])
    .forEach(([x, y]) => {
      const key = x.toFixed(3);
      map.set(key, Math.max(map.get(key) ?? -Infinity, y));
    });
  return Array.from(map.entries()).map(([x, y]) => [Number(x), y]).sort((a, b) => a[0] - b[0]);
}

function breakEvenMark(subject) {
  const max = subject.units * 50;
  const maxScaled = estimateScaledPerUnit(subject, 50);
  if (maxScaled < 25) return null;

  let low = 0;
  let high = max;
  for (let index = 0; index < 32; index += 1) {
    const mid = (low + high) / 2;
    const scaled = estimateScaledPerUnit(subject, mid / subject.units);
    if (scaled >= 25) high = mid;
    else low = mid;
  }
  return high;
}

function estimateAtar(aggregate) {
  const thresholds = aggregateThresholds;
  if (!thresholds.length) return "-";
  if (aggregate >= thresholds[0].aggregate) return "99.95";
  const lowest = thresholds[thresholds.length - 1];
  if (aggregate < lowest.aggregate) return "<50";

  for (let index = 1; index < thresholds.length; index += 1) {
    const high = thresholds[index - 1];
    const low = thresholds[index];
    if (aggregate <= high.aggregate && aggregate >= low.aggregate) {
      const ratio = (aggregate - low.aggregate) / (high.aggregate - low.aggregate);
      const atar = low.atar + ratio * (high.atar - low.atar);
      return formatAtar(atar);
    }
  }

  return "<50";
}

function buildSubjectLookup() {
  const lookup = new Map();
  for (const subject of hscSubjects) {
    for (const value of [subject.name, subjectDisplayName(subject), ...(subjectAliases[subject.name] || [])]) {
      lookup.set(normalizeText(value), subject);
    }
  }
  return lookup;
}

function resolveSubjectInput(value) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (subjectLookup.has(normalized)) return subjectLookup.get(normalized);
  const exactAlias = hscSubjects.find((subject) => (subjectAliases[subject.name] || []).some((alias) => normalizeText(alias) === normalized));
  if (exactAlias) return exactAlias;
  return null;
}

function subjectSuggestionScore(subject, query) {
  const parts = [
    subject.name,
    subjectDisplayName(subject),
    subject.field,
    ...(subjectAliases[subject.name] || [])
  ].map(normalizeText);
  if (parts.some((part) => part === query)) return 100;
  if (parts.some((part) => part.startsWith(query))) return 75;
  if (parts.some((part) => part.includes(query))) return 50;
  const words = query.split(" ").filter(Boolean);
  if (words.length && words.every((word) => parts.some((part) => part.includes(word)))) return 35;
  return 0;
}

function subjectInputValue(row) {
  if (row.subject && subjectByName.has(row.subject)) {
    const resolved = resolveSubjectInput(row.subjectInput || row.subject);
    if (!row.subjectInput || resolved?.name === row.subject) return row.subject;
  }
  return row.subjectInput || "";
}

function subjectDisplayName(subject) {
  const code = primarySubjectCode(subject);
  return code ? `${subject.name} (${code})` : subject.name;
}

function primarySubjectCode(subject) {
  const aliases = subjectAliases[subject.name] || [];
  return aliases.find((alias) => /^[A-Z0-9&]+$/.test(alias) && alias.length <= 6) || "";
}

function subjectSearchText(subject) {
  return normalizeText([subject.name, subject.field, subjectDisplayName(subject), ...(subjectAliases[subject.name] || [])].join(" "));
}

function parseMark(value, subject) {
  if (value === "" || value === null || value === undefined) return null;
  const max = subject.units * 50;
  const mark = Number(value);
  if (!Number.isFinite(mark)) return null;
  return clamp(mark, 0, max);
}

function formatBreakEven(subject) {
  const mark = breakEvenMark(subject);
  if (mark === null) return "above max";
  return `${formatNumber(mark, 1)} / ${subject.units * 50}`;
}

function formatAtar(value) {
  const rounded = Math.round(value * 20) / 20;
  return rounded.toFixed(2);
}

function formatSigned(value) {
  if (!Number.isFinite(value)) return "-";
  const absolute = Math.abs(value).toFixed(1);
  if (Math.abs(value) < 0.05) return "0.0";
  return `${value > 0 ? "+" : "-"}${absolute}`;
}

function breakEvenImpactSummary(value) {
  if (!Number.isFinite(value)) return "No break-even estimate";
  if (Math.abs(value) < 0.05) return "On break-even";
  return value > 0 ? `Above break-even ${formatSigned(value)}` : `Below break-even ${formatSigned(value)}`;
}

function estimateModeLabel(estimate) {
  if (!estimate.previewUnits) return "Add a subject and mark to start.";
  if (estimate.ready) return "Uses your best 10 eligible units, including English.";
  return `${Math.min(10, estimate.previewUnits)} of 10 eligible units entered. Finish the pattern to see an ATAR estimate.`;
}

function neutralImpactSummary(value) {
  if (!Number.isFinite(value)) return "Historical estimate unavailable";
  if (Math.abs(value) < 0.05) return "Around neutral contribution";
  return `${formatSigned(value)} vs neutral contribution`;
}

function impactSentence(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return "Your entered subjects sit around the break-even line.";
  if (value > 0) return "Your entered subjects are helping compared with the break-even line.";
  return "Your entered subjects are dragging compared with the break-even line.";
}

function subjectImpactSentence(entry) {
  const breakEven = breakEvenMark(entry.subject);
  if (breakEven === null) {
    return "This subject has limited break-even data, so treat the estimate as rough.";
  }
  const gap = entry.mark - breakEven;
  if (Math.abs(gap) < 0.05) {
    return `Your ${formatNumber(entry.mark, 1)} is right on the estimated break-even mark.`;
  }
  return `Your ${formatNumber(entry.mark, 1)} is ${formatNumber(Math.abs(gap), 1)} ${gap > 0 ? "above" : "below"} this subject's break-even mark.`;
}

function markBreakEvenSummary(mark, breakEven) {
  if (breakEven === null) return "No break-even mark available";
  const gap = mark - breakEven;
  if (Math.abs(gap) < 0.05) return "Your mark is on break-even";
  return `Your mark is ${formatNumber(Math.abs(gap), 1)} ${gap > 0 ? "above" : "below"} break-even`;
}

function scaleClass(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.05) return "scale-neutral";
  return value > 0 ? "scale-up" : "scale-down";
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return Number(value).toFixed(digits);
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function createRow(subject, mark, subjectInput = "") {
  return {
    id: `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    subject,
    subjectInput,
    mark
  };
}

function defaultRows() {
  return [
    createRow("English Advanced", 82),
    createRow("Mathematics Advanced", 80),
    createRow("Physics", 78),
    createRow("Chemistry", 78),
    createRow("Business Studies", 82)
  ];
}

function loadRows() {
  try {
    const savedRaw = localStorage.getItem(calculatorStorageKey);
    if (!savedRaw) return defaultRows();
    const saved = JSON.parse(savedRaw);
    if (Array.isArray(saved)) {
      if (!saved.length) return [];
      const rows = saved
        .filter((row) => row && subjectByName.has(row.subject))
        .map((row) => createRow(row.subject, row.mark, row.subjectInput))
        .slice(0, 14);
      if (rows.length) return rows;
    }
  } catch (error) {
    console.warn("Could not load saved calculator rows", error);
  }
  return defaultRows();
}

function persistRows() {
  const rows = calculatorState.rows.map((row) => ({ subject: row.subject, mark: row.mark, subjectInput: row.subjectInput }));
  localStorage.setItem(calculatorStorageKey, JSON.stringify(rows));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
