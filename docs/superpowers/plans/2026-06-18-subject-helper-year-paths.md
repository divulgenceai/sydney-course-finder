# Subject Helper Year Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a required Year 10 Direction Deck and a Year 11/12 ATAR-pattern and course-prerequisite checker to the Subject Helper.

**Architecture:** Create a small UMD-style `subject-helper-logic.js` module containing pure eligibility, exact-course, prerequisite and deck-scoring helpers. Load it before `subject-helper.js`; keep rendering and state management in the existing page script. Use Node's built-in test runner for red-green coverage without adding dependencies.

**Tech Stack:** Static HTML, vanilla JavaScript, CSS, Node.js `node:test`, imported UAC/HSC datasets, in-app Browser validation.

---

### Task 1: Pure eligibility and prerequisite logic

**Files:**
- Create: `subject-helper-logic.js`
- Create: `tests/subject-helper-logic.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Cover:

```js
test("Year 12 is eligible with 10 units, English, three 2u courses and four areas", () => {});
test("Year 12 without English reports the English rule", () => {});
test("duplicate subjects do not inflate units", () => {});
test("Year 11 six 2u subjects including English is on track", () => {});
test("exact course title search returns one course", () => {});
test("broad career search returns all displayed courses", () => {});
test("missing prerequisite blocks a course", () => {});
test("assumed knowledge warns but does not block", () => {});
test("ambiguous prerequisite requires an official check", () => {});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/subject-helper-logic.test.js`

Expected: FAIL because `subject-helper-logic.js` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Export:

```js
evaluateSubjectPattern({ year, subjects })
selectCoursesForEligibility(query, displayedMatches)
assessCourseSubjects(course, selectedSubjects, aliases)
normaliseSubjectName(value)
```

The Year 12 checker enforces current UAC rules: 10 Board Developed units, 2 English units, three courses of 2 units or greater, and four subject areas.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/subject-helper-logic.test.js`

Expected: all tests pass.

- [ ] **Step 5: Add the test script**

Add:

```json
"test": "node --test tests/*.test.js"
```

### Task 2: Direction Deck scoring and Year 10 subject plan logic

**Files:**
- Modify: `subject-helper-logic.js`
- Modify: `tests/subject-helper-logic.test.js`

- [ ] **Step 1: Write failing tests**

Cover:

```js
test("deck stays locked before all 12 answers", () => {});
test("explicit software goal outweighs people-oriented deck answers", () => {});
test("Year 10 subject plan contains six unique subjects and English", () => {});
test("possible Year 12 drop keeps English, prerequisites and 10 units", () => {});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/subject-helper-logic.test.js`

Expected: new tests fail because deck helpers are missing.

- [ ] **Step 3: Implement the minimal helpers**

Export:

```js
isDirectionDeckComplete(answers, requiredCount)
scoreDirectionDeck(answers, cards)
buildYear10SubjectPlan({ profileSubjects, requiredSubjects, hscSubjects })
choosePossibleDrop(subjectPlan, protectedSubjects)
```

The subject plan returns six unique subjects, prefers a 2-unit English course, protects prerequisites, and only returns a possible drop when at least 10 eligible units remain.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `node --test tests/subject-helper-logic.test.js`

Expected: all tests pass.

### Task 3: Integrate year-aware UI and state

**Files:**
- Modify: `subject-helper.html`
- Modify: `subject-helper.js`
- Modify: `styles.css`

- [ ] **Step 1: Load the logic module**

Add before `subject-helper.js`:

```html
<script src="./subject-helper-logic.js"></script>
```

- [ ] **Step 2: Extend state**

Add:

```js
year: "Year 10 or below",
year10: { dreamJob: "", dreamCourse: "", passions: "", schoolPerformance: "Not sure yet", deckIndex: 0, deckAnswers: [] },
selectedSubjects: [],
eligibilityRun: false,
eligibilityMessage: ""
```

Persist year-specific values in local storage while keeping the search query in the URL.

- [ ] **Step 3: Render the year selector and conditional panels**

Year 10 renders the required 12-card deck and hides results until complete.

Year 11/12 renders a searchable subject picker, selected rows, unit summary and `Check my subjects`.

- [ ] **Step 4: Bind interactions without full rerenders while typing**

Deck card choices animate to the next card. Subject additions prevent duplicates and cap the list at six. The eligibility result updates only when the check button is used.

### Task 4: Render recommendations and grouped course checks

**Files:**
- Modify: `subject-helper.js`
- Modify: `styles.css`

- [ ] **Step 1: Render Year 10 output**

Show:

- six Year 11 subject cards;
- possible Year 12 drop;
- relevant course evidence;
- job and income guidance from existing course/job mappings;
- ATAR target and next steps.

- [ ] **Step 2: Render Year 11/12 eligibility**

Show a concise status card with units, English, 2-unit course count, subject-area count and fixes.

- [ ] **Step 3: Render course groups**

For exact course queries assess one course; otherwise assess displayed matches. Group courses into:

- no detected block;
- blocked by missing prerequisite;
- official check needed.

Assumed knowledge is shown separately and does not block.

### Task 5: Verify and release

**Files:**
- Modify if needed: `README.md`
- Modify if needed: `.gitignore`

- [ ] **Step 1: Run automated verification**

Run:

```powershell
npm test
npm run check
npm run audit:data
```

Expected: all commands exit 0.

- [ ] **Step 2: Run Browser QA**

The flow under test is: `/subject-helper.html` -> choose Year 10 and complete 12 cards -> recommendations unlock; then choose Year 12, add subjects and check -> ATAR-pattern and grouped course statuses render.

Check desktop and mobile, console health, no horizontal overflow, no focus loss, and no page reload between cards.

- [ ] **Step 3: Commit intended changes**

Stage the Subject Helper feature, tests, logic module, styles, package script and documentation while preserving unrelated modifications.

- [ ] **Step 4: Push and deploy**

Push the current `codex/` branch to GitHub, deploy through the configured Vercel project, and verify the deployed Subject Helper route.
