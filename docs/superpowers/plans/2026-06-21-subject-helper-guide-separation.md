# Subject Helper and Guide Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Subject Helper into one automatic job-or-degree lookup, move the direction questionnaire into Guide, and preserve Guide progress for Year 10 or below, Year 11, and Year 12 without full-page refreshes.

**Architecture:** Extend the existing UMD-style `subject-helper-logic.js` into the shared pure planning module used by both pages. Keep dataset-specific scoring and HTML rendering in each page controller, but move intent detection, subject evidence merging, direction-deck scoring, and Guide state serialization into testable functions. Rewrite the Subject Helper render path around one explicit search submission, and add persisted questionnaire state to Guide without rerendering on text input or each card choice.

**Tech Stack:** Static HTML, vanilla JavaScript, CSS, Node.js built-in test runner, localStorage, existing UAC and HSC datasets.

---

## File Structure

- Modify `subject-helper-logic.js`: shared query detection, evidence merging, degree/job outcomes, direction-deck state, and Guide persistence helpers.
- Modify `tests/subject-helper-logic.test.js`: unit tests for the shared planning behavior.
- Create `tests/page-contracts.test.js`: source-level contracts for page separation, routes, and required script loading.
- Modify `subject-helper.js`: focused smart-search controller and results renderer.
- Modify `subject-helper.html`: focused metadata and shared script loading.
- Modify `guide.js`: direction questionnaire, persisted state, and shared subject recommendation use.
- Modify `guide.html`: load the shared planning module.
- Modify `styles.css`: focused Subject Helper layout, Guide questionnaire states, responsive and dark-mode styling.
- Modify `README.md`: document the distinct roles of Guide and Subject Helper.

### Task 1: Add Shared Job-versus-Degree Detection

**Files:**
- Modify: `tests/subject-helper-logic.test.js`
- Modify: `subject-helper-logic.js`

- [ ] **Step 1: Write failing intent-detection tests**

Add the import and tests:

```js
const {
  assessCourseSubjects,
  buildYear10SubjectPlan,
  chooseDirectionProfile,
  evaluateSubjectPattern,
  isDirectionDeckComplete,
  selectCoursesForEligibility,
  detectPlanningIntent
} = require("../subject-helper-logic.js");

const intentProfiles = [
  {
    label: "Technology",
    keywords: ["software engineer", "developer", "computer science", "information technology"],
    careers: ["Software engineer", "Web developer"],
    degrees: ["Computer Science", "Information Technology"]
  },
  {
    label: "Medicine and Health",
    keywords: ["nurse", "nursing", "medicine", "doctor"],
    careers: ["Registered nurse", "Doctor"],
    degrees: ["Nursing", "Medicine"]
  }
];

const intentCourses = [
  {
    name: "Bachelor of Computer Science",
    careers: "Software developer, systems analyst",
    area: "Technology"
  },
  {
    name: "Bachelor of Nursing",
    careers: "Registered nurse",
    area: "Medicine and Health"
  }
];

test("detects an occupation phrase as a career", () => {
  const result = detectPlanningIntent({
    query: "software engineer",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "career");
  assert.equal(result.label, "Software engineer");
  assert.equal(result.profile, "Technology");
  assert.ok(result.confidence >= 0.8);
});

test("detects a degree title as a degree", () => {
  const result = detectPlanningIntent({
    query: "Bachelor of Nursing",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "degree");
  assert.equal(result.label, "Bachelor of Nursing");
  assert.equal(result.profile, "Medicine and Health");
});

test("returns both interpretations for an ambiguous area term", () => {
  const result = detectPlanningIntent({
    query: "medicine",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "ambiguous");
  assert.ok(result.alternatives.some((item) => item.kind === "career"));
  assert.ok(result.alternatives.some((item) => item.kind === "degree"));
});

test("returns none instead of random guidance for an unknown query", () => {
  const result = detectPlanningIntent({
    query: "zzqv unexplained thing",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "none");
  assert.equal(result.confidence, 0);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
npm test
```

Expected: FAIL because `detectPlanningIntent` is not exported.

- [ ] **Step 3: Implement the minimal detector**

Add these pure helpers inside `createSubjectHelperLogic()`:

```js
function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function detectPlanningIntent({ query, profiles, courses }) {
  const clean = normaliseText(query);
  if (!clean) return { kind: "none", label: "", profile: "", confidence: 0, alternatives: [] };

  const careerCandidates = [];
  const degreeCandidates = [];

  for (const profile of profiles || []) {
    for (const career of profile.careers || []) {
      const candidate = normaliseText(career);
      const score = intentPhraseScore(clean, candidate);
      if (score) careerCandidates.push({ kind: "career", label: career, profile: profile.label, score });
    }
    for (const degree of profile.degrees || []) {
      const candidate = normaliseText(degree);
      const score = intentPhraseScore(clean, candidate);
      if (score) degreeCandidates.push({ kind: "degree", label: degree, profile: profile.label, score });
    }
  }

  for (const course of courses || []) {
    const title = String(course?.name || "").trim();
    const titleScore = intentPhraseScore(clean, normaliseText(title));
    if (titleScore) {
      degreeCandidates.push({
        kind: "degree",
        label: title,
        profile: String(course?.area || ""),
        score: titleScore + (/^(bachelor|diploma|associate|undergraduate)/.test(clean) ? 25 : 0)
      });
    }
    for (const career of String(course?.careers || "").split(/[,;/]+/).map((item) => item.trim()).filter(Boolean)) {
      const careerScore = intentPhraseScore(clean, normaliseText(career));
      if (careerScore) {
        careerCandidates.push({
          kind: "career",
          label: titleCase(career),
          profile: String(course?.area || ""),
          score: careerScore
        });
      }
    }
  }

  const careers = bestIntentCandidates(careerCandidates);
  const degrees = bestIntentCandidates(degreeCandidates);
  const broadProfile = (profiles || []).find((profile) =>
    normaliseText(profile.label) === clean
    || (profile.keywords || []).some((keyword) => normaliseText(keyword) === clean)
  );
  const career = careers[0] || (broadProfile?.careers?.[0]
    ? { kind: "career", label: broadProfile.careers[0], profile: broadProfile.label, score: 58 }
    : null);
  const degree = degrees[0] || (broadProfile?.degrees?.[0]
    ? { kind: "degree", label: broadProfile.degrees[0], profile: broadProfile.label, score: 58 }
    : null);
  if (!career && !degree) return { kind: "none", label: String(query).trim(), profile: "", confidence: 0, alternatives: [] };

  if ((broadProfile && career && degree) || (career && degree && Math.abs(career.score - degree.score) <= 8)) {
    const alternatives = [career, degree].filter(Boolean).map(intentPublicResult);
    return {
      kind: "ambiguous",
      label: String(query).trim(),
      profile: alternatives[0]?.profile || "",
      confidence: 0.55,
      alternatives
    };
  }

  return intentPublicResult(career && (!degree || career.score > degree.score) ? career : degree);
}

function intentPhraseScore(query, candidate) {
  if (!query || !candidate) return 0;
  if (query === candidate) return 100;
  if (candidate.includes(query) || query.includes(candidate)) return 72;
  const queryTokens = new Set(query.split(" "));
  const candidateTokens = candidate.split(" ");
  const overlap = candidateTokens.filter((token) => queryTokens.has(token)).length;
  return overlap ? (overlap / Math.max(queryTokens.size, candidateTokens.length)) * 60 : 0;
}

function bestIntentCandidates(candidates) {
  const seen = new Set();
  return [...(candidates || [])]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .filter((item) => {
      const key = `${item.kind}:${normaliseText(item.label)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function intentPublicResult(item) {
  if (!item) return null;
  return {
    kind: item.kind,
    label: item.label,
    profile: item.profile,
    confidence: Math.min(1, item.score / 100),
    alternatives: []
  };
}
```

Export `detectPlanningIntent`.

- [ ] **Step 4: Run tests and verify GREEN**

Run `npm test`.

Expected: all intent tests and existing tests pass.

- [ ] **Step 5: Commit the shared intent detector**

```powershell
git add subject-helper-logic.js tests/subject-helper-logic.test.js
git commit -m "feat: detect job and degree searches"
```

### Task 2: Add Shared Recommendation and Outcome Helpers

**Files:**
- Modify: `tests/subject-helper-logic.test.js`
- Modify: `subject-helper-logic.js`

- [ ] **Step 1: Write failing evidence and outcome tests**

Add tests:

```js
const {
  assessCourseSubjects,
  buildYear10SubjectPlan,
  chooseDirectionProfile,
  detectPlanningIntent,
  evaluateSubjectPattern,
  isDirectionDeckComplete,
  selectCoursesForEligibility,
  mergeSubjectRecommendations,
  relatedDegreeNames,
  relatedCareerOutcomes
} = require("../subject-helper-logic.js");

test("required subject evidence outranks preparation tiers", () => {
  const result = mergeSubjectRecommendations({
    profileSubjects: [
      { name: "Mathematics Advanced", tier: "priority", reason: "Useful preparation." },
      { name: "Physics", tier: "useful", reason: "Useful preparation." }
    ],
    evidence: [
      { name: "Mathematics Advanced", required: 3, assumed: 2 },
      { name: "Physics", required: 0, assumed: 4 }
    ]
  });

  assert.equal(result[0].name, "Mathematics Advanced");
  assert.equal(result[0].tier, "required");
  assert.equal(result[1].tier, "priority");
});

test("career queries return unique degree titles from matching courses", () => {
  const result = relatedDegreeNames([
    { course: { name: "Bachelor of Computer Science" } },
    { course: { name: "Bachelor of Computer Science" } },
    { course: { name: "Bachelor of Information Technology" } }
  ]);

  assert.deepEqual(result, [
    "Bachelor of Computer Science",
    "Bachelor of Information Technology"
  ]);
});

test("degree queries return unique careers with income ranges", () => {
  const result = relatedCareerOutcomes([
    {
      course: {
        careers: "Software developer, Systems analyst",
        incomeOutcomes: [
          { title: "Software developer", range: "$80k-$130k" },
          { title: "Systems analyst", range: "$85k-$125k" }
        ]
      }
    }
  ]);

  assert.deepEqual(result, [
    { title: "Software developer", range: "$80k-$130k" },
    { title: "Systems analyst", range: "$85k-$125k" }
  ]);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run `npm test`.

Expected: FAIL because the new functions are missing.

- [ ] **Step 3: Implement evidence merging and outcomes**

Add:

```js
function mergeSubjectRecommendations({ profileSubjects, evidence }) {
  const rows = new Map();
  for (const item of profileSubjects || []) {
    const name = String(item?.name || item?.[0] || "").trim();
    if (!name) continue;
    rows.set(normaliseSubjectName(name), {
      name,
      tier: item?.tier || item?.[1] || "useful",
      reason: item?.reason || item?.[2] || "",
      required: 0,
      assumed: 0
    });
  }
  for (const signal of evidence || []) {
    const key = normaliseSubjectName(signal?.name);
    if (!key) continue;
    const row = rows.get(key) || {
      name: signal.name,
      tier: "useful",
      reason: "Detected in matching UAC course information.",
      required: 0,
      assumed: 0
    };
    row.required += Number(signal.required || 0);
    row.assumed += Number(signal.assumed || 0);
    if (row.required) row.tier = "required";
    else if (row.assumed && row.tier !== "required") row.tier = "priority";
    rows.set(key, row);
  }
  const tierWeight = { required: 4, priority: 3, useful: 2, stretch: 1 };
  return [...rows.values()].sort((a, b) =>
    (tierWeight[b.tier] || 0) - (tierWeight[a.tier] || 0)
    || b.required - a.required
    || b.assumed - a.assumed
    || a.name.localeCompare(b.name)
  );
}

function relatedDegreeNames(matches, limit = 6) {
  return uniqueText((matches || []).map((match) => match?.course?.name)).slice(0, limit);
}

function relatedCareerOutcomes(matches, limit = 8) {
  const outcomes = [];
  for (const match of matches || []) {
    const course = match?.course || {};
    const explicit = Array.isArray(course.incomeOutcomes) ? course.incomeOutcomes : [];
    for (const item of explicit) {
      if (item?.title) outcomes.push({ title: item.title, range: item.range || "Income varies" });
    }
    if (!explicit.length) {
      for (const title of String(course.careers || "").split(/[,;/]+/).map((item) => item.trim()).filter(Boolean)) {
        outcomes.push({ title, range: "Income varies" });
      }
    }
  }
  const seen = new Set();
  return outcomes.filter((item) => {
    const key = normaliseText(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function uniqueText(values) {
  const seen = new Set();
  return (values || []).filter((value) => {
    const clean = normaliseText(value);
    if (!clean || seen.has(clean)) return false;
    seen.add(clean);
    return true;
  });
}
```

Export all three functions.

- [ ] **Step 4: Run tests and verify GREEN**

Run `npm test`.

Expected: all tests pass.

- [ ] **Step 5: Commit shared recommendation behavior**

```powershell
git add subject-helper-logic.js tests/subject-helper-logic.test.js
git commit -m "feat: share subject and outcome recommendations"
```

### Task 3: Add Guide Persistence and Direction-Deck State

**Files:**
- Modify: `tests/subject-helper-logic.test.js`
- Modify: `subject-helper-logic.js`

- [ ] **Step 1: Write failing state tests**

Add:

```js
const {
  assessCourseSubjects,
  buildYear10SubjectPlan,
  chooseDirectionProfile,
  detectPlanningIntent,
  evaluateSubjectPattern,
  isDirectionDeckComplete,
  mergeSubjectRecommendations,
  relatedCareerOutcomes,
  relatedDegreeNames,
  selectCoursesForEligibility,
  createGuideState,
  restoreGuideState,
  serialiseGuideState,
  updateDirectionAnswer
} = require("../subject-helper-logic.js");

test("Guide accepts all three school-year modes", () => {
  for (const year of ["Year 10 or below", "Year 11", "Year 12"]) {
    const state = createGuideState({ year });
    assert.equal(state.year, year);
  }
});

test("changing one Guide answer preserves all other answers", () => {
  const initial = createGuideState({
    year: "Year 11",
    dreamJob: "Software engineer",
    passions: "coding",
    deckAnswers: ["a", "unsure"]
  });

  const updated = updateDirectionAnswer(initial, 1, "b");

  assert.equal(updated.year, "Year 11");
  assert.equal(updated.dreamJob, "Software engineer");
  assert.equal(updated.passions, "coding");
  assert.deepEqual(updated.deckAnswers, ["a", "b"]);
});

test("Guide progress serialises and restores safely", () => {
  const state = createGuideState({
    year: "Year 12",
    dreamCourse: "Computer Science",
    deckIndex: 4,
    deckAnswers: ["a", "b", "unsure", "a"],
    resultRequested: true
  });

  const restored = restoreGuideState(serialiseGuideState(state));

  assert.equal(restored.year, "Year 12");
  assert.equal(restored.dreamCourse, "Computer Science");
  assert.equal(restored.deckIndex, 4);
  assert.deepEqual(restored.deckAnswers, ["a", "b", "unsure", "a"]);
  assert.equal(restored.resultRequested, true);
});

test("invalid stored Guide data falls back to defaults", () => {
  const restored = restoreGuideState("{bad json");
  assert.equal(restored.year, "Year 10 or below");
  assert.deepEqual(restored.deckAnswers, []);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run `npm test`.

Expected: FAIL because the state functions are missing.

- [ ] **Step 3: Implement immutable state helpers**

Add:

```js
const GUIDE_YEARS = ["Year 10 or below", "Year 11", "Year 12"];

function guideDefaults() {
  return {
    year: "Year 10 or below",
    dreamJob: "",
    dreamCourse: "",
    dreamIncome: "Any income",
    passions: "",
    schoolPerformance: "Not sure yet",
    preference: "Balanced plan",
    subjectsWithMarks: [],
    avoid: "",
    deckIndex: 0,
    deckAnswers: [],
    resultRequested: false
  };
}

function createGuideState(input = {}) {
  const defaults = guideDefaults();
  const year = GUIDE_YEARS.includes(input.year) ? input.year : defaults.year;
  const next = {
    ...defaults,
    ...input,
    year,
    deckIndex: Math.max(0, Number.isInteger(input.deckIndex) ? input.deckIndex : 0),
    deckAnswers: Array.isArray(input.deckAnswers)
      ? input.deckAnswers.slice(0, 12).map((answer) => ["a", "b", "unsure"].includes(answer) ? answer : "")
      : [],
    subjectsWithMarks: Array.isArray(input.subjectsWithMarks) ? input.subjectsWithMarks : []
  };
  return Object.fromEntries(Object.keys(defaults).map((key) => [key, next[key]]));
}

function updateDirectionAnswer(state, index, answer) {
  if (!["a", "b", "unsure"].includes(answer)) return createGuideState(state);
  const next = createGuideState(state);
  const deckAnswers = next.deckAnswers.slice();
  deckAnswers[index] = answer;
  return createGuideState({
    ...next,
    deckAnswers,
    deckIndex: Math.min(11, Math.max(next.deckIndex, index + 1)),
    resultRequested: false
  });
}

function serialiseGuideState(state) {
  return JSON.stringify(createGuideState(state));
}

function restoreGuideState(value) {
  try {
    return createGuideState(JSON.parse(String(value || "{}")));
  } catch {
    return createGuideState();
  }
}
```

Export the four public functions.

- [ ] **Step 4: Run tests and verify GREEN**

Run `npm test`.

Expected: all state tests pass.

- [ ] **Step 5: Commit state helpers**

```powershell
git add subject-helper-logic.js tests/subject-helper-logic.test.js
git commit -m "feat: persist guide questionnaire state"
```

### Task 4: Rewrite Subject Helper as One Smart Lookup

**Files:**
- Create: `tests/page-contracts.test.js`
- Modify: `subject-helper.html`
- Modify: `subject-helper.js`

- [ ] **Step 1: Write failing page-separation contracts**

Create:

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Subject Helper presents one automatic job-or-degree search", () => {
  const source = read("subject-helper.js");
  assert.match(source, /Search a job or degree/i);
  assert.match(source, /detectPlanningIntent/);
  assert.doesNotMatch(source, /renderYearSelector/);
  assert.doesNotMatch(source, /renderSeniorSubjectChecker/);
  assert.doesNotMatch(source, /directionCards/);
  assert.doesNotMatch(source, /Check my subjects/);
});

test("Subject Helper keeps its own route and navigation entry", () => {
  const server = read("server.js");
  const app = read("app.js");
  assert.match(server, /subject-helper/);
  assert.match(app, /Subject helper/);
});

test("both planning pages load the shared planning logic", () => {
  assert.match(read("subject-helper.html"), /subject-helper-logic\.js/);
  assert.match(read("guide.html"), /subject-helper-logic\.js/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run `npm test`.

Expected: FAIL because the current Subject Helper still contains the year selector, senior checker, and direction deck.

- [ ] **Step 3: Replace Subject Helper state and shell**

Preserve the existing `subjectProfiles`, `profileCareers`, `quickSearches`, `detectedProfile()`, `queryProfileScores()`, `subjectCourseMatches()`, `profileCourseScore()`, `subjectRequirementSignals()`, `renderSubjectResults()`, `renderCourseEvidence()`, `extractSubjectNames()`, `icon()`, `number()`, `cleanSearchText()`, `tokenise()` and `escapeHtml()` implementations. Remove the year/deck/current-subject state and the render/bind functions that only support `renderYearSelector()`, `renderSeniorSubjectChecker()`, `renderDirectionDeck()` and `Check my subjects`. Replace the state and shell with:

```js
const helperStorageKey = "sydneyCourseFinder.subjectHelper";
const savedLookup = loadLookupState();

const helperState = {
  draft: params.get("q") || savedLookup.query || "",
  query: params.get("q") || savedLookup.query || "",
  processing: "",
  intent: null
};

function loadLookupState() {
  try {
    const value = JSON.parse(localStorage.getItem(helperStorageKey) || "{}");
    return { query: String(value.query || "") };
  } catch {
    return { query: "" };
  }
}

function persistLookupState() {
  localStorage.setItem(helperStorageKey, JSON.stringify({ query: helperState.query }));
}

function planningIntentProfiles() {
  return subjectProfiles.map((profile) => ({
    label: profile.label,
    keywords: profile.keywords,
    careers: (profileCareers[profile.label] || []).map(([title]) => title),
    degrees: []
  }));
}

function renderSubjectHeader() {
  return `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
        <a href="./guide.html">Guide</a>
        <a href="./index.html#atar">ATAR match</a>
        <a href="./atar-calculator.html">ATAR calculator</a>
        <a href="./subject-helper.html" aria-current="page">Subject helper</a>
        <a href="./advisor.html">Course helper</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}
```

Render this focused structure:

```js
function render() {
  const query = helperState.query.trim();
  const matches = query ? subjectCourseMatches(query) : [];
  const intent = query
    ? subjectHelperLogic.detectPlanningIntent({
        query,
        profiles: planningIntentProfiles(),
        courses: allCourses
      })
    : null;
  helperState.intent = intent;

  subjectHelperApp.innerHTML = `
    ${renderSubjectHeader()}
    ${renderSubjectHelperProgress()}
    <main class="subject-main">
      <section class="hero subject-hero">
        <div>
          <h1>Subject helper</h1>
          <p>Search a job or degree. The helper automatically detects what you mean, then shows the best Year 11 and 12 subjects and what the pathway can lead to.</p>
        </div>
        <dl class="stats two">
          <div><dt>Course records</dt><dd>${number(allCourses.length)}</dd></div>
          <div><dt>HSC subjects</dt><dd>${number(hscSubjects.length)}</dd></div>
        </dl>
        <p class="data-note">Planning guidance only. Confirm prerequisites, accreditation and course rules with UAC and the official university page.</p>
      </section>

      <section class="panel subject-lookup-panel">
        <div class="panel-head">
          <div>
            <h2>What job or degree are you considering?</h2>
            <p>Try software engineer, nursing, computer science, law, architecture or a similar phrase.</p>
          </div>
          <span>${query ? "Search ready" : "Search first"}</span>
        </div>
        <form class="subject-smart-search" data-subject-search>
          <label>
            <span>Search a job or degree</span>
            <input name="query" type="search" autocomplete="off" value="${escapeHtml(helperState.draft)}" placeholder="Example: software engineer or Bachelor of Nursing" />
          </label>
          <button class="match-btn" type="submit">Find my subjects</button>
        </form>
        <div class="subject-example-row" aria-label="Example searches">
          ${quickSearches.slice(0, 8).map((item) => `<button type="button" data-quick-search="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
        </div>
      </section>

      <div id="subject-helper-result" aria-live="polite">
        ${helperState.processing ? renderSubjectHelperProcessStrip("search", "Finding the best subject pathway") : renderSmartLookupResult(query, intent, matches)}
      </div>
    </main>
  `;
  bindEvents();
}
```

- [ ] **Step 4: Render intent-specific results**

Implement:

```js
function renderSmartLookupResult(query, intent, matches) {
  if (!query) return renderEmptyState();
  if (!intent || intent.kind === "none" || !matches.length) return renderNoMatch(query);

  const profile = detectedProfile(query, matches);
  const evidence = subjectRequirementSignals(matches);
  const merged = subjectHelperLogic.mergeSubjectRecommendations({
    profileSubjects: profile.subjects.map(([name, tier, reason]) => ({ name, tier, reason })),
    evidence
  });
  const plan = subjectPlanFromMerged(merged);
  const degrees = subjectHelperLogic.relatedDegreeNames(matches);
  const careers = subjectHelperLogic.relatedCareerOutcomes(matches.map((match) => ({
    ...match,
    course: {
      ...match.course,
      incomeOutcomes: careerIncomeOutcomesForCourse(match.course, profile)
    }
  })));

  return `
    <section class="panel subject-detection" role="status">
      <span>${intent.kind === "ambiguous" ? "Possible interpretations" : `Detected as a ${intent.kind}`}</span>
      <h2>${escapeHtml(intent.label)}</h2>
      <p>${intent.kind === "ambiguous"
        ? "This phrase can describe both work and study. The results combine the strongest related evidence."
        : "The result below uses matching Sydney UAC courses, entry text, careers and subject evidence."}</p>
    </section>
    ${renderSubjectResults(query, profile, plan, matches)}
    ${intent.kind === "career" || intent.kind === "ambiguous" ? renderDegreePathways(degrees) : ""}
    ${renderCareerOutcomes(careers)}
    ${renderFocusedGuideLink()}
  `;
}

function detectedProfile(query, matches) {
  const scores = queryProfileScores(query).map((entry) => ({
    profile: entry.profile,
    score: entry.score + matches.slice(0, 15).reduce(
      (sum, match) => sum + profileCourseScore(match.course, entry.profile) * 0.06,
      0
    )
  }));
  return scores.sort((a, b) => b.score - a.score)[0]?.profile || subjectProfiles[0];
}

function subjectPlanFromMerged(items) {
  const plan = { required: [], priority: [], useful: [], stretch: [] };
  for (const item of items || []) {
    const target = plan[item.tier] || plan.useful;
    target.push({
      name: item.name,
      tier: item.tier,
      reason: item.reason,
      evidence: { required: item.required, assumed: item.assumed }
    });
  }
  return plan;
}

function careerIncomeOutcomesForCourse(course, profile) {
  const profileOutcomes = (profileCareers[profile.label] || []).map(([title, range]) => ({ title, range }));
  const listedCareers = String(course?.careers || "")
    .split(/[,;/]+/)
    .map((title) => title.trim())
    .filter(Boolean);
  if (!listedCareers.length) return profileOutcomes;
  return listedCareers.slice(0, 8).map((title) => {
    const clean = cleanSearchText(title);
    const match = profileOutcomes.find((item) => {
      const candidate = cleanSearchText(item.title);
      return candidate.includes(clean) || clean.includes(candidate)
        || tokenise(clean).some((token) => token.length > 3 && candidate.includes(token));
    });
    return { title, range: match?.range || "Income varies by role and experience" };
  });
}

function renderNoMatch(query) {
  return `
    <section class="panel subject-empty" role="status">
      <div>
        <h2>We could not confidently match “${escapeHtml(query)}”</h2>
        <p>Try a broader job or degree such as software engineer, nursing, law, computer science or architecture.</p>
      </div>
    </section>
  `;
}

function renderDegreePathways(degrees) {
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Degrees that can lead there</h2><p>These are the strongest matching Sydney course titles, not the only possible routes.</p></div>
      </div>
      <div class="subject-pathway-grid">
        ${(degrees || []).length
          ? degrees.map((degree) => `<article><strong>${escapeHtml(degree)}</strong><p>Check the exact course, accreditation and entry rules before applying.</p></article>`).join("")
          : `<p class="empty-note">No specific degree title was found. Review the course evidence below.</p>`}
      </div>
    </section>
  `;
}

function renderCareerOutcomes(careers) {
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Jobs and indicative income</h2><p>These are related directions, not guaranteed outcomes from a degree.</p></div>
      </div>
      <div class="subject-career-grid">
        ${(careers || []).length
          ? careers.map((career) => `<article><strong>${escapeHtml(career.title)}</strong><span>${escapeHtml(career.range)}</span><p>Actual pay depends on experience, employer, location, registration and further study.</p></article>`).join("")
          : `<p class="empty-note">The imported records do not contain a clear career outcome for this search.</p>`}
      </div>
    </section>
  `;
}

function renderFocusedGuideLink() {
  return `
    <section class="panel subject-guide-link">
      <div><h2>Not sure about the direction yet?</h2><p>Use Guide for the full subject-to-university-to-career plan.</p></div>
      <a class="help-link" href="./guide.html">Open Guide</a>
    </section>
  `;
}
```

Career intent shows degrees plus careers/income. Degree intent shows careers/income; its matching course evidence already provides related degree alternatives. Ambiguous intent shows both.

- [ ] **Step 5: Bind without full-page navigation or keystroke rerenders**

Use:

```js
function bindEvents() {
  window.courseFinderTheme?.bind?.(subjectHelperApp);
  const form = subjectHelperApp.querySelector("[data-subject-search]");
  const input = form?.elements.query;

  input?.addEventListener("input", (event) => {
    helperState.draft = event.target.value;
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = String(new FormData(form).get("query") || "").trim();
    helperState.draft = query;
    helperState.query = query;
    persistLookupState();
    runSubjectHelperProcessing("search", () => {}, 180);
  });

  subjectHelperApp.querySelectorAll("[data-quick-search]").forEach((button) => {
    button.addEventListener("click", () => {
      helperState.draft = button.dataset.quickSearch || "";
      helperState.query = helperState.draft;
      persistLookupState();
      runSubjectHelperProcessing("search", () => {}, 120);
    });
  });
}
```

Update `runSubjectHelperProcessing` so it rerenders only at explicit search start and completion, never on input.

- [ ] **Step 6: Update Subject Helper metadata**

Change `subject-helper.html` description to:

```html
<meta
  name="description"
  content="Search a career or university degree to find recommended Year 11 and 12 HSC subjects, related Sydney courses, jobs and indicative income."
/>
```

- [ ] **Step 7: Run tests and syntax checks**

Run:

```powershell
npm test
npm run check
```

Expected: all tests pass and JavaScript syntax checks exit 0.

- [ ] **Step 8: Commit the focused Subject Helper**

```powershell
git add subject-helper.html subject-helper.js tests/page-contracts.test.js
git commit -m "feat: focus subject helper on jobs and degrees"
```

### Task 5: Move the Direction Questionnaire into Guide and Persist Progress

**Files:**
- Modify: `guide.html`
- Modify: `guide.js`
- Modify: `tests/page-contracts.test.js`

- [ ] **Step 1: Add failing Guide contracts**

Append:

```js
test("Guide owns the school-year modes and direction questionnaire", () => {
  const source = read("guide.js");
  assert.match(source, /Year 10 or below/);
  assert.match(source, /Year 11/);
  assert.match(source, /Year 12/);
  assert.match(source, /directionCards/);
  assert.match(source, /deckAnswers/);
  assert.match(source, /localStorage/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run `npm test`.

Expected: FAIL because Guide does not yet contain the direction questionnaire or persisted progress.

- [ ] **Step 3: Load shared logic and restore initial Guide state**

Add this before `guide.js` in `guide.html`:

```html
<script src="./subject-helper-logic.js"></script>
```

At the top of `guide.js`:

```js
const guidePlanningLogic = window.SubjectHelperLogic;
const guideStorageKey = "sydneyCourseFinder.guideProgress";
const storedGuideState = guidePlanningLogic.restoreGuideState(
  localStorage.getItem(guideStorageKey)
);
```

Initialize `guideState` through the shared helper:

```js
const guideState = guidePlanningLogic.createGuideState({
  ...storedGuideState,
  dreamJob: new URLSearchParams(window.location.search).get("q") || storedGuideState.dreamJob || "",
  subjectsWithMarks: storedGuideState.subjectsWithMarks.length
    ? storedGuideState.subjectsWithMarks
    : [createGuideSubjectRow()]
});
guideState.processing = false;
guideState.result = null;
let guideRestoreHandled = false;
```

- [ ] **Step 4: Move the 12 direction cards into Guide**

Cut the complete `directionCards` array currently at `subject-helper.js:192-265` and paste it into `guide.js` immediately after `guideProfiles`. Remove that array from `subject-helper.js`. Add the questionnaire after the Guide’s main fields and before subject marks:

```js
function renderGuideDirectionDeck() {
  const index = Math.min(directionCards.length - 1, guideState.deckIndex || 0);
  const card = directionCards[index];
  const answer = guideState.deckAnswers[index] || "";
  const complete = guidePlanningLogic.isDirectionDeckComplete(guideState.deckAnswers, directionCards.length);
  return `
    <section class="guide-direction-deck" data-guide-deck>
      <div class="guide-deck-head">
        <div>
          <span>Direction questions</span>
          <h3>Pick the card that feels more like you</h3>
          <p>These answers improve the course, career and subject plan. “Not sure yet” is valid.</p>
        </div>
        <strong>${index + 1} / ${directionCards.length}</strong>
      </div>
      <div class="guide-deck-progress" aria-hidden="true"><i style="width:${((index + 1) / directionCards.length) * 100}%"></i></div>
      <div class="guide-deck-question">
        <span>${escapeHtml(card.label)}</span>
        <h4>${escapeHtml(card.question)}</h4>
      </div>
      <div class="guide-deck-options">
        ${renderGuideDirectionOption(card.a, "a", answer)}
        ${renderGuideDirectionOption(card.b, "b", answer)}
      </div>
      <div class="guide-deck-actions">
        <button type="button" class="clear-btn" data-guide-deck-back ${index === 0 ? "disabled" : ""}>Back</button>
        <button type="button" class="clear-btn" data-guide-deck-answer="unsure" aria-pressed="${answer === "unsure"}">Not sure yet</button>
        <span>${complete ? "Direction questions complete" : `${directionCards.length - guideState.deckAnswers.filter(Boolean).length} remaining`}</span>
      </div>
    </section>
  `;
}

function renderGuideDirectionOption(option, value, selected) {
  return `
    <button
      type="button"
      class="guide-direction-option"
      data-guide-deck-answer="${escapeHtml(value)}"
      aria-pressed="${selected === value}"
    >
      <span class="guide-direction-icon" aria-hidden="true">${icon(option.icon)}</span>
      <small>Pick this card</small>
      <strong>${escapeHtml(option.title)}</strong>
      <p>${escapeHtml(option.copy)}</p>
    </button>
  `;
}
```

- [ ] **Step 5: Update only the questionnaire region on card choice**

Add:

```js
function replaceGuideDeck() {
  const current = guideApp.querySelector("[data-guide-deck]");
  if (!current) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderGuideDirectionDeck().trim();
  current.replaceWith(wrapper.firstElementChild);
  bindGuideDeckEvents();
}

function bindGuideDeckEvents() {
  guideApp.querySelectorAll("[data-guide-deck-answer]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = guidePlanningLogic.updateDirectionAnswer(
        guideState,
        guideState.deckIndex,
        button.dataset.guideDeckAnswer
      );
      guideState.deckAnswers = next.deckAnswers;
      guideState.deckIndex = next.deckIndex;
      guideState.resultRequested = false;
      persistGuideProgress();
      replaceGuideDeck();
    });
  });
  guideApp.querySelector("[data-guide-deck-back]")?.addEventListener("click", () => {
    guideState.deckIndex = Math.max(0, guideState.deckIndex - 1);
    persistGuideProgress();
    replaceGuideDeck();
  });
}
```

Call `bindGuideDeckEvents()` from `bindGuideEvents()`. Do not call `renderGuide()` for card answers.

- [ ] **Step 6: Persist all meaningful Guide changes**

Add:

```js
function persistGuideProgress() {
  localStorage.setItem(guideStorageKey, guidePlanningLogic.serialiseGuideState({
    ...guideState,
    resultRequested: Boolean(guideState.result)
  }));
}
```

Call it after:

- text input state updates, debounced by 150ms;
- select changes;
- year changes before rerender;
- subject/mark changes;
- adding/removing subject rows;
- questionnaire answers;
- quick-goal actions;
- successful plan generation.

Use a small debounce:

```js
let guidePersistTimer = 0;
function scheduleGuideProgressSave() {
  window.clearTimeout(guidePersistTimer);
  guidePersistTimer = window.setTimeout(persistGuideProgress, 150);
}
```

Do not rerender on text input.

- [ ] **Step 7: Feed questionnaire answers into Guide profile scoring**

Use the existing deck scoring:

```js
function guideDeckScores() {
  return guidePlanningLogic.scoreDirectionDeck(guideState.deckAnswers, directionCards);
}
```

In `detectGuideProfile(values)`, add the deck score to each profile score:

```js
const deckScores = guideDeckScores();
const scored = guideProfiles.map((profile) => {
  let score = 0;
  for (const keyword of profile.cleanKeywords) {
    if (!keyword) continue;
    if (source === keyword) score += 40;
    if (source.includes(keyword)) score += keyword.includes(" ") ? 28 : 16;
    for (const token of tokenise(keyword)) {
      if (tokenMatch(source, token)) score += 4;
    }
  }
  score += Number(deckScores[profile.label] || 0) * 5;
  return { profile, score };
}).sort((a, b) => b.score - a.score);
```

In the Guide result explanation, mention that direction-card choices influenced the profile only when at least one card is answered.

- [ ] **Step 8: Restore a previously generated plan**

After the first render:

```js
if (!guideRestoreHandled && storedGuideState.resultRequested && hasAnyGuideAnswer()) {
  guideRestoreHandled = true;
  guideState.result = buildGuidePlan();
  renderGuide({ preserveScroll: true });
}
```

Set `guideRestoreHandled = true` after the first render even when there is no saved result, so restoration cannot loop:

```js
if (!guideRestoreHandled) guideRestoreHandled = true;
```

- [ ] **Step 9: Keep reset explicit**

On Reset:

```js
localStorage.removeItem(guideStorageKey);
Object.assign(guideState, guidePlanningLogic.createGuideState({
  subjectsWithMarks: [createGuideSubjectRow()]
}));
guideState.processing = false;
guideState.result = null;
renderGuide({ preserveScroll: true });
```

- [ ] **Step 10: Run tests and checks**

Run:

```powershell
npm test
npm run check
```

Expected: all tests and syntax checks pass.

- [ ] **Step 11: Commit Guide migration**

```powershell
git add guide.html guide.js tests/page-contracts.test.js
git commit -m "feat: move direction planning into guide"
```

### Task 6: Style, Document, and Verify the Complete Flow

**Files:**
- Modify: `styles.css`
- Modify: `README.md`

- [ ] **Step 1: Add focused Subject Helper styles**

Add component styles using existing variables:

```css
.subject-lookup-panel,
.subject-detection {
  display: grid;
  gap: 18px;
}

.subject-smart-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.subject-smart-search label {
  display: grid;
  gap: 8px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.subject-smart-search input {
  width: 100%;
  min-height: 52px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--text);
  padding: 0 16px;
  font: inherit;
}

.subject-example-row,
.subject-pathway-grid,
.subject-career-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.subject-pathway-grid,
.subject-career-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
```

- [ ] **Step 2: Add Guide direction-deck styles**

Adapt the screenshot’s two-card structure to the existing design system:

```css
.guide-direction-deck {
  display: grid;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-soft);
}

.guide-deck-head,
.guide-deck-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.guide-deck-progress {
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--accent-soft);
}

.guide-deck-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--motion-medium) ease;
}

.guide-deck-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.guide-direction-option {
  display: grid;
  gap: 12px;
  min-height: 210px;
  padding: 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  color: var(--text);
  text-align: left;
}

.guide-direction-option[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
```

Add these dark-mode selectors using the existing surface variables:

```css
:root[data-theme="dark"] .subject-smart-search input,
:root[data-theme="dark"] .guide-direction-deck,
:root[data-theme="dark"] .guide-direction-option,
:root[data-theme="dark"] .subject-pathway-grid article,
:root[data-theme="dark"] .subject-career-grid article {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text);
}

:root[data-theme="dark"] .guide-direction-option[aria-pressed="true"] {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 28%, transparent);
}

:root[data-theme="dark"] .guide-deck-progress {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}
```

- [ ] **Step 3: Add responsive rules**

At `max-width: 640px`:

```css
.subject-smart-search,
.subject-pathway-grid,
.subject-career-grid,
.guide-deck-options {
  grid-template-columns: 1fr;
}

.subject-smart-search .match-btn {
  width: 100%;
}

.guide-deck-head,
.guide-deck-actions {
  align-items: stretch;
  flex-direction: column;
}

.guide-direction-deck {
  padding: 16px;
}
```

- [ ] **Step 4: Update README roles**

Replace the existing tool descriptions with:

```md
- `guide.html`, `guide.js`: full Year 10-or-below, Year 11 and Year 12 plan covering subject choices, degree directions, Sydney universities, UAC preference bands, pathways, careers and income.
- `subject-helper.html`, `subject-helper.js`, `subject-helper-logic.js`: focused automatic job-or-degree lookup that recommends Year 11/12 subjects and shows connected degrees, careers, Sydney course evidence and indicative income.
```

- [ ] **Step 5: Run the complete automated verification**

Run:

```powershell
npm test
npm run check
npm run audit:data
git diff --check
```

Expected:

- All Node tests pass.
- All syntax checks pass.
- Data audit exits 0.
- No whitespace errors.

- [ ] **Step 6: Verify the rendered Subject Helper workflow**

The flow under test is:

`/subject-helper -> search “software engineer” -> detected career -> degree pathways, subject groups, course evidence, jobs and income render without page navigation`.

Check:

- URL remains `/subject-helper`.
- Search value remains visible.
- No year selector, 12-card deck, current-subject checker, or eligibility button appears.
- “Software engineer” is detected as a career.
- “Bachelor of Computer Science” is detected as a degree.
- “medicine” shows an ambiguous interpretation.
- Unknown text shows no-match guidance rather than random results.
- Console has no errors or warnings.

- [ ] **Step 7: Verify the rendered Guide workflow**

The flow under test is:

`/guide -> choose Year 11 -> answer direction cards -> enter goal -> build plan -> reload -> answers and generated-plan inputs restore`.

Check:

- All three year modes remain available.
- Selecting a card advances only the deck region; the page does not jump or reload.
- Text input does not rerender or lose focus.
- Reload restores year, text answers, current deck step, completed answers, subject rows, and generated-plan inputs.
- Reset clears storage and returns to defaults.
- The final output contains subjects, degrees/courses, Sydney universities, UAC/pathway strategy, careers and income.
- Console has no errors or warnings.

- [ ] **Step 8: Verify desktop, mobile, and dark mode**

Use the in-app Browser first at:

- Desktop: 1440 × 900
- Mobile: 390 × 844

Confirm:

- No horizontal page overflow.
- Search controls and questionnaire cards become one column on mobile.
- Long course and career names wrap.
- Focus rings and selected states are visible.
- Dark mode keeps readable text, borders, and selected cards.

- [ ] **Step 9: Compare screenshots to the approved visual references**

Use `view_image` on:

- `C:\Users\ZUBAIR~1\AppData\Local\Temp\codex-clipboard-c290be8d-49f0-4213-ba54-84807b905fe2.png`
- `C:\Users\ZUBAIR~1\AppData\Local\Temp\codex-clipboard-b390f957-1139-40b4-82ed-86f34740be21.png`
- `C:\Users\ZUBAIR~1\AppData\Local\Temp\codex-clipboard-f31a4ec2-7c1a-47e7-aad8-02ab67596b7c.png`

Fidelity ledger:

1. Two-card direction choice and progress indicator.
2. Clear selected state.
3. Existing white/light-blue visual system.
4. Comfortable responsive stacking.
5. No Year 11/12 selector or current-subject checker in Subject Helper.

Fix any material mismatch before completion.

- [ ] **Step 10: Commit final styles and documentation**

```powershell
git add styles.css README.md
git commit -m "style: polish planning tool separation"
```

## Completion Checklist

- [ ] Subject Helper is one auto-detected job-or-degree search.
- [ ] Job results show degrees, subjects, course evidence, careers and income.
- [ ] Degree results show subjects, course evidence, careers and income.
- [ ] Ambiguous and unknown searches are honest and useful.
- [ ] Subject Helper contains no year selector, direction deck, or current-subject eligibility checker.
- [ ] Guide supports Year 10 or below, Year 11 and Year 12.
- [ ] Guide owns the 12-card direction questionnaire.
- [ ] Guide output covers subjects, courses/universities, UAC/pathways, careers and income.
- [ ] Guide progress restores after reload.
- [ ] Text input and card choices do not cause full-page refreshes.
- [ ] Automated checks pass.
- [ ] Desktop, mobile, dark mode, and console health are verified.
