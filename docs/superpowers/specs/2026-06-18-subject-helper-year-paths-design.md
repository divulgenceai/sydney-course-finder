# Subject Helper Year Paths and Eligibility Design

## Goal

Turn the Subject Helper into a year-aware planning tool:

- Year 10 or below completes a required visual Direction Deck, then receives subject, course and career recommendations.
- Year 11 and Year 12 students enter up to six current subjects and receive an ATAR eligibility check plus course prerequisite warnings.

The feature remains deterministic and data-based. It uses the local HSC subject metadata and imported Sydney UAC course records.

## Entry Flow

The Subject Helper begins with a simple year selector:

- `Year 10 or below`
- `Year 11`
- `Year 12`

The chosen year controls the rest of the page. Changing year resets only year-specific answers after a confirmation-free inline notice; the degree/job search remains available.

## Year 10 Direction Flow

### Initial Questions

Year 10 students may enter:

- dream job;
- dream course;
- passions or interests;
- how they are currently tracking at school.

These answers can be incomplete. The student must still complete the Direction Deck before recommendations unlock.

### Required Direction Deck

The approved visual deck contains 12 rounds. Each round presents two large visual cards and a `Not sure yet` option. There is no `Both` option.

The topics are:

1. higher income and longer hours versus more free time and lower pressure;
2. technology and systems versus people and communication;
3. office/project work versus hands-on/practical work;
4. maths/science versus writing/business;
5. helping people directly versus building useful outcomes;
6. creating something original versus improving something existing;
7. stable/predictable work versus changing challenges;
8. competitive direct entry versus a safer flexible pathway;
9. longer specialised study versus a quicker broad route;
10. leadership versus specialist expertise;
11. ambitious competition versus supportive steady work;
12. security and clear demand versus growth and possibility.

The UI includes:

- a visible required-state label;
- progress from 1 to 12;
- Back;
- short card-selection and directional transition animations;
- `Not sure yet`;
- a locked recommendation action until all 12 rounds are answered;
- reduced-motion support.

The deck must not trigger full-page navigation or refresh between cards.

### Year 10 Recommendations

The result combines dream job, dream course, passions, school tracking and card answers.

It includes:

- a primary direction;
- exactly six suggested Year 11 subjects where possible;
- one appropriate English course;
- detected prerequisites before optional subjects;
- a possible Year 12 drop that never removes English or a detected prerequisite and leaves at least 10 eligible units;
- relevant Sydney university and pathway courses;
- future jobs and broad income ranges;
- an ATAR target;
- prerequisite and assumed-knowledge warnings;
- a practical timeline from subject selection to university application and employment.

Explicit dream-job and dream-course answers outweigh deck preferences. The deck improves incomplete or broad answers rather than overriding a clear goal.

Course recommendations use an intent-first threshold. A course must match the student's course, career or passion direction before ATAR fit, income, provider quality or entry ease can boost it.

## Year 11 and Year 12 Subject Checker

### Inputs

Students can add up to six unique HSC subjects from the existing searchable subject list.

The checker shows:

- subject name;
- units;
- whether it is an English course;
- whether it is ATAR eligible according to the local subject dataset;
- Remove.

Marks are not required for this feature. The checker assesses subject-pattern eligibility, not the final ATAR value.

### Year 11 Check

Year 11 output is an `on track` assessment rather than a final eligibility verdict.

It checks whether the selected subjects can support:

- the usual 12 Preliminary units;
- at least two units of English;
- a viable transition to at least 10 HSC units in Year 12;
- at least three two-unit Board Developed courses;
- at least four subject areas.

Because the form is capped at six subjects, extension-course combinations and one-unit subjects are counted by units rather than by row count.

Statuses are:

- `On track`
- `Needs attention`
- `Not enough information`

### Year 12 Check

Year 12 output directly checks the selected pattern against the local ATAR eligibility rules:

- at least 10 eligible units;
- at least two units of English;
- at least three two-unit Board Developed courses;
- at least four subject areas.

Statuses are:

- `ATAR pattern eligible`
- `Not currently ATAR eligible`
- `Needs official confirmation`

The result lists every failed rule and the smallest practical correction, such as adding English or another subject area.

The page clearly states that final eligibility is determined officially by NESA and UAC and that unusual course combinations need school confirmation.

## Course Blocking Check

The existing degree/job search remains the course context.

- If the search clearly matches one exact course title, assess only that course.
- Otherwise, assess all displayed matching courses.

Each assessed course receives one of:

- `Subjects meet detected prerequisites`
- `Blocked by missing prerequisite`
- `No subject prerequisite detected`
- `Official check needed`

A course is blocked only when the imported prerequisite text identifies a required HSC subject that is not in the student's selected set.

Assumed knowledge never creates a blocked status. It appears as a preparation warning with suggested bridging or revision advice.

Generic, ambiguous or non-subject admission criteria produce `Official check needed`, not a false eligible or blocked answer.

The results are grouped for scanning:

1. courses with no detected subject block;
2. courses blocked by missing subjects;
3. courses needing an official check.

Each course retains links to UAC and the university page.

## Matching Subject Names

The checker reuses and expands the existing subject aliases:

- ENTC and Enterprise Computing;
- HMS and legacy PDHPE wording;
- maths and English extension variants;
- common abbreviations such as CAFS, MX1, MX2 and SDD.

Matching must be conservative. A word such as `software` in general course text must not falsely become a Software Engineering prerequisite unless it appears in the imported prerequisite or assumed-knowledge field.

## State and Persistence

The current year, selected subjects, Direction Deck answers and search text are stored locally so the student can leave and return without losing the plan.

The URL continues to carry the search query. Personal choices and subjects remain in local storage rather than being written into the URL.

## UI Structure

The page remains one calm, mobile-first experience:

1. hero and year selector;
2. year-specific input area;
3. degree/job search;
4. results.

Year 10 uses the full-width Direction Deck before showing results.

Year 11/12 uses a compact subject-entry panel with:

- Add subject;
- up to six rows;
- a live units summary;
- a single `Check my subjects` action;
- a concise eligibility card;
- grouped course checks below it.

Animations are limited to card selection, short section reveals and status changes. Inputs must not rerender on every keystroke, jump to the top or lose focus.

## Pure Logic Boundaries

Extract testable helpers for:

- subject-pattern eligibility;
- unit and area counting;
- English-unit counting;
- exact-course query detection;
- required-subject extraction;
- selected-subject versus prerequisite comparison;
- Direction Deck signal scoring;
- Year 10 six-subject selection and possible-drop validation.

Rendering consumes these helper results rather than duplicating eligibility logic in HTML templates.

## Error States

- Duplicate selected subjects are prevented.
- The seventh subject cannot be added; the UI explains the six-subject limit.
- Empty rows are ignored.
- Fewer than the needed Year 11/12 units shows exactly what is missing.
- No course search means the ATAR pattern can still be checked, with a prompt to search when the student wants course-blocking results.
- No clear course matches produces no invented prerequisite advice.
- Missing or ambiguous imported prerequisite data is labelled for official checking.

## Testing

Write failing tests before production implementation.

Required logic cases:

- Year 12 with five two-unit subjects including English and four areas is eligible.
- Year 12 without English is ineligible.
- Year 12 below 10 eligible units is ineligible.
- Year 11 with six normal two-unit subjects including English is on track.
- Duplicate subjects do not inflate units.
- One-unit and extension subjects count correctly.
- Exact title search checks one course.
- Broad job search checks all displayed matches.
- A true missing prerequisite blocks the course.
- Assumed knowledge does not block the course.
- Ambiguous prerequisite text returns official-check-needed.
- Year 10 recommendations remain relevant to explicit interests.
- The Direction Deck cannot unlock recommendations before all 12 answers.
- Year 10 returns six subjects and a safe possible Year 12 drop.

Browser checks:

- complete the Year 10 deck on desktop and mobile;
- add and remove Year 11/12 subjects;
- hit the six-subject limit;
- verify eligibility status updates only after the check action;
- search an exact course and a broad career;
- confirm grouped course status results;
- verify no horizontal overflow, focus loss, scroll jump or console errors.

Run:

- focused logic tests;
- `npm run check`;
- `npm run audit:data`;
- in-app Browser validation at `/subject-helper.html`.

## Release

After implementation passes:

1. commit only intended product changes while preserving existing user work;
2. push the current `codex/` branch to GitHub;
3. update the existing Vercel deployment;
4. verify the deployed Subject Helper on desktop and mobile.
