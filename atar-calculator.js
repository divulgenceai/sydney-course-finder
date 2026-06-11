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
  guideLimit: 18,
  activeSubjectRowId: "",
  processing: ""
};

renderCalculator();

function renderCalculator() {
  const estimate = calculateEstimate(calculatorState.rows);
  calculatorApp.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
        <a href="./index.html#atar">ATAR match</a>
        <a href="./atar-calculator.html" aria-current="page">ATAR calculator</a>
        <a href="./subject-helper.html">Subject helper</a>
        <a href="./advisor.html">Course helper</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
    ${renderCalculatorProgress()}

    <main class="calculator-main">
      <section class="hero calculator-hero">
        <div>
          <p class="eyebrow">NSW HSC estimate</p>
          <h1>ATAR calculator</h1>
          <p>
            Add any HSC subject and mark to see the estimated ATAR effect. The calculator focuses on the break-even mark for each subject, so it shows whether your mark is likely helping or hurting your ATAR.
          </p>
        </div>
        <dl class="stats">
          <div>
            <dt>Subjects</dt>
            <dd>${hscSubjects.length}</dd>
          </div>
          <div>
            <dt>Model year</dt>
            <dd>${escapeHtml(String(calculatorMeta.year || 2025))}</dd>
          </div>
          <div>
            <dt>Rule</dt>
            <dd>Break-even impact</dd>
          </div>
          <p class="data-note">Estimate only. Official ATARs use the full UAC scaling process and your final HSC results.</p>
        </dl>
      </section>

      <section class="panel calculator-panel" id="calculator">
        <div class="panel-head">
          <div>
          <h2>Enter your marks</h2>
            <p>Use your expected HSC mark. All ${hscSubjects.length} UAC-listed HSC ATAR subjects are available, including Enterprise Computing. Type aliases like ENTC, HMS, CAFS, MX1 or SOR1.</p>
          </div>
          <span>${hscSubjects.length} subjects</span>
        </div>

        <div class="calculator-layout">
          <form class="calculator-form" data-form="calculator">
            ${renderCalculatorProcessStrip("calculator", "Updating estimate")}
            <div class="calc-toolbar">
              <button type="button" class="match-btn" data-action="add-row">Add subject</button>
              <button type="button" class="clear-btn" data-action="reset-example">Reset example</button>
            </div>
            <div class="subject-rows">
              ${calculatorState.rows.map(renderSubjectRow).join("")}
            </div>
          </form>

          <aside class="calculator-result" data-role="summary">
            ${renderEstimateSummary(estimate)}
          </aside>
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Subject break-even guide</h2>
            <p>The break-even mark is the approximate HSC mark where the subject reaches 25 scaled marks per unit. Above it usually helps; below it usually drags.</p>
          </div>
          <span>${hscSubjects.length} subjects</span>
        </div>
        <div class="guide-controls">
          <label>
            <span>Search subject</span>
            <input type="search" value="${escapeHtml(calculatorState.guideQuery)}" placeholder="Physics, English, Hospitality..." data-action="guide-query" />
          </label>
          <label>
            <span>Field</span>
            <select data-action="guide-field">
              ${fields.map((field) => `<option ${field === calculatorState.guideField ? "selected" : ""}>${escapeHtml(field)}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="subject-guide" data-role="subject-guide">
          ${renderCalculatorProcessStrip("guide", "Filtering subjects")}
          ${renderSubjectGuide()}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>How this estimate works</h2>
            <p>A simple version of the ATAR scaling idea students actually talk about.</p>
          </div>
          <span>Not official</span>
        </div>
        <div class="method-grid">
          <article>
            <strong>1. Estimate the scaled mark</strong>
            <p>The app uses public UAC scaling summary data to estimate what your HSC mark becomes after scaling.</p>
          </article>
          <article>
            <strong>2. Compare to break-even</strong>
            <p>For a 2 unit subject, 50 scaled marks is the simple neutral line. Above that helps, below that drags.</p>
          </article>
          <article>
            <strong>3. Add more subjects</strong>
            <p>With fewer than 10 units, missing units are temporarily held at break-even so you can test one subject at a time.</p>
          </article>
        </div>
      </section>
    </main>
  `;

  bindCalculatorEvents();
  updateEstimateDom();
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

function runCalculatorProcessing(key, action, delay = 220) {
  calculatorState.processing = key;
  renderCalculator();
  window.setTimeout(() => {
    action();
    calculatorState.processing = "";
    renderCalculator();
  }, delay);
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
  return `
    <div class="calc-subject-row" style="--item-delay:${Math.min(index, 8) * 22}ms" data-row-id="${escapeHtml(row.id)}">
      <label class="subject-picker">
        <span>Subject</span>
        <input
          type="search"
          value="${escapeHtml(subjectInputValue(row))}"
          placeholder="Type subject or alias, e.g. ENTC"
          data-action="subject-change"
          aria-label="Subject"
          autocomplete="off"
          title="${escapeHtml(subjectInputValue(row))}"
        />
        <div class="subject-suggestions" data-output="subject-suggestions">
          ${renderSubjectSuggestions(row)}
        </div>
      </label>
      <label>
        <span>Expected mark <small data-output="mark-max">/${max}</small></span>
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
  const atarLabel = estimate.assumedReady ? estimate.assumedAtarLabel : "-";
  const impact = estimate.totalBreakEvenImpact;
  return `
    <div class="atar-simple-summary">
      <article class="atar-main-card">
        <span>Estimated ATAR</span>
        <strong>${escapeHtml(atarLabel)}</strong>
        <p>${estimate.assumedReady ? estimateModeLabel(estimate) : "Add a subject and mark to start."}</p>
      </article>
      <article class="atar-impact-card ${scaleClass(impact)}">
        <span>Scaling effect</span>
        <strong>${estimate.assumedReady ? breakEvenImpactSummary(impact) : "-"}</strong>
        <p>${estimate.assumedReady ? impactSentence(impact) : "Each subject will show whether it helps or drags from break-even."}</p>
      </article>
      <article class="atar-context-card">
        <span>How to read it</span>
        <p><strong>Break-even</strong> is the HSC mark where a subject reaches about 25 scaled marks per unit.</p>
        <p><strong>Above break-even</strong> means it is helping your ATAR estimate. <strong>Below break-even</strong> means it is dragging.</p>
      </article>
    </div>
    ${estimate.warnings.length ? `<ul class="calc-warnings">${estimate.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
    ${renderSubjectImpactList(estimate)}
  `;
}

function renderSubjectImpactList(estimate) {
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
  if (!rows.length) return "";

  return `
    <div class="subject-impact-list">
      <div class="subject-impact-head">
        <h3>Subject scaling</h3>
        <p>${estimate.ready ? "Best 10 eligible units are counted." : `Entered ${estimate.previewUnits} unit${estimate.previewUnits === 1 ? "" : "s"}; missing units are held at break-even for the preview.`}</p>
      </div>
      ${rows.map((entry) => `
        <article class="subject-impact-card ${scaleClass(entry.listImpact)}">
          <div class="subject-impact-title">
            <strong>${escapeHtml(subjectDisplayName(entry.subject))}</strong>
            <span>${breakEvenImpactSummary(entry.listImpact)}</span>
          </div>
          <div class="subject-impact-meta">
            <span>Scaled mark estimate <strong>${formatNumber(entry.listScaled, 1)} / ${entry.listMax}</strong></span>
            <span>Break-even mark <strong>${formatBreakEven(entry.subject)}</strong></span>
            <span>${entry.listUnits}/${entry.effectiveUnits} unit${entry.effectiveUnits === 1 ? "" : "s"} ${estimate.ready ? "counted" : "entered"}</span>
          </div>
          <p>${subjectImpactSentence(entry)}</p>
        </article>
      `).join("")}
      ${estimate.assumedMissingUnits > 0 ? `<p class="missing-baseline-note">${estimate.assumedMissingUnits} missing unit${estimate.assumedMissingUnits === 1 ? "" : "s"} are temporarily held at break-even. Add more subjects to replace that baseline.</p>` : ""}
    </div>
  `;
}

function renderSubjectSuggestions(row) {
  const query = normalizeText(row.subjectInput || row.subject || "");
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

  return matches.map((subject) => `
    <button type="button" class="subject-suggestion" data-subject-option="${escapeHtml(subject.name)}">
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
    <span class="${scaleClass(breakEvenImpact)}">${breakEvenImpactSummary(breakEvenImpact)}</span>
    <span>Scaled mark estimate ${formatNumber(courseScaled, 1)} / ${subject.units * 50}</span>
    <span>Break-even mark ${formatBreakEven(subject)}</span>
    <span>${markBreakEvenSummary(mark, breakEven)}</span>
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
        <span>Break-even</span>
        <span>Median scaled</span>
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
      runCalculatorProcessing("calculator", () => {
        calculatorState.rows.push(createRow("", ""));
        persistRows();
      });
    });
  });

  calculatorApp.querySelectorAll("[data-action='reset-example']").forEach((button) => {
    button.addEventListener("click", () => {
      runCalculatorProcessing("calculator", () => {
        calculatorState.rows = defaultRows();
        persistRows();
      });
    });
  });

  calculatorApp.querySelectorAll("[data-action='remove-row']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      runCalculatorProcessing("calculator", () => {
        calculatorState.rows = calculatorState.rows.filter((row) => row.id !== rowElement.dataset.rowId);
        persistRows();
      }, 180);
    });
  });

  calculatorApp.querySelectorAll("[data-action='subject-change']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!row) return;
      calculatorState.activeSubjectRowId = row.id;
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
      updateEstimateDom();
    });

    input.addEventListener("change", (event) => {
      const rowElement = event.currentTarget.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      if (!row) return;
      const resolvedSubject = resolveSubjectInput(event.currentTarget.value);
      if (resolvedSubject) {
        row.subject = resolvedSubject.name;
        row.subjectInput = subjectDisplayName(resolvedSubject);
      } else if (!event.currentTarget.value.trim()) {
        row.subject = "";
        row.subjectInput = "";
      }
      persistRows();
      renderCalculator();
    });
  });

  if (!calculatorApp.dataset.subjectOptionBound) {
    calculatorApp.dataset.subjectOptionBound = "true";
    calculatorApp.addEventListener("mousedown", (event) => {
      const button = event.target.closest("[data-subject-option]");
      if (!button) return;
      event.preventDefault();
      const rowElement = button.closest("[data-row-id]");
      const row = calculatorState.rows.find((item) => item.id === rowElement.dataset.rowId);
      const subject = subjectByName.get(button.dataset.subjectOption);
      if (!row || !subject) return;
      row.subject = subject.name;
      row.subjectInput = subjectDisplayName(subject);
      calculatorState.activeSubjectRowId = "";
      runCalculatorProcessing("calculator", () => {
        persistRows();
      }, 180);
    });
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
      calculatorState.guideLimit = 18;
      updateSubjectGuide();
    });
  }

  const guideField = calculatorApp.querySelector("[data-action='guide-field']");
  if (guideField) {
    guideField.addEventListener("change", (event) => {
      runCalculatorProcessing("guide", () => {
        calculatorState.guideField = event.currentTarget.value;
        calculatorState.guideLimit = 18;
      }, 180);
    });
  }

  calculatorApp.querySelectorAll("[data-action='show-more-guide']").forEach((button) => {
    button.addEventListener("click", () => {
      runCalculatorProcessing("guide", () => {
        calculatorState.guideLimit += 24;
      }, 160);
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
    if (suggestions) suggestions.innerHTML = row.id === calculatorState.activeSubjectRowId ? renderSubjectSuggestions(row) : "";
  });
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
  if (blocks.length < 10) warnings.push("Add 10 eligible units for a full estimate. Missing units are temporarily held at break-even.");

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
  if (row.subjectInput) return row.subjectInput;
  if (row.subject && subjectByName.has(row.subject)) {
    return subjectDisplayName(subjectByName.get(row.subject));
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
  if (!estimate.assumedReady) return "Add a subject and mark to start.";
  if (estimate.ready) return "Uses your best 10 eligible units, including English.";
  return `${estimate.previewUnits} entered unit${estimate.previewUnits === 1 ? "" : "s"}; ${estimate.assumedMissingUnits} missing unit${estimate.assumedMissingUnits === 1 ? "" : "s"} held at break-even.`;
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
