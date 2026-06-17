# Guide Relevance and Year 10 Subject Plan Design

## Goal

Improve the Guide so recommended courses remain relevant to the student's stated dream job, dream course and passions. For students in Year 10 or below, produce a practical six-subject Year 11 plan and identify one subject that may be considered for dropping in Year 12.

## Scope

This change affects the deterministic Guide in `guide.js` and its rendered styles in `styles.css`.

It does not add AI, alter the ATAR calculator, change the standalone Subject Helper, or import new course data.

## Course Relevance

Course ranking will use an intent-first model:

1. Dream course is the strongest signal.
2. Dream job and passions are the next strongest signals.
3. A course must pass a minimum intent-relevance threshold before supporting factors can make it a primary recommendation.
4. ATAR fit, income potential, provider profile, subject fit and preferences refine the order only after relevance is established.
5. Pathway courses may remain as backups when they clearly lead toward the same field.

The Guide will penalise obvious field conflicts. A course should not rank highly merely because it has a suitable ATAR, income estimate or provider score when its title, study area, career text and summary do not match the student's intent.

If the student supplies no career, course or passion signal, the Guide may use income, school performance, subjects and preference as broader planning signals. The result should be labelled as broad guidance.

## Year 10 Subject Plan

For `Year 10 or below`, the Guide will recommend exactly six Year 11 subjects where the local HSC dataset supports them.

The selection order is:

1. One suitable two-unit English course.
2. Subjects found as prerequisites for the strongest relevant course options.
3. Subjects strongly connected to the student's intended degree, job and passions.
4. Subjects that preserve useful adjacent pathways.
5. A balanced final subject where needed to reach six.

The output will explain why each subject is included. Required subjects will be clearly distinguished from useful preparation.

The plan will aim for the normal NSW Year 11 pattern of 12 units. It will check that the proposed set supports an ATAR-eligible Year 12 pattern: at least 10 eligible units, two units of English, at least three two-unit Board Developed courses, and at least four subject areas.

School offerings vary, so the Guide will tell the student to confirm that each subject is available and that their school approves the combination.

## Possible Year 12 Drop

The Guide will identify at most one `Possible Year 12 drop`.

It must never recommend dropping:

- the selected English course;
- a detected prerequisite for relevant target courses;
- a subject needed to preserve the minimum ATAR-eligible pattern;
- a subject central to the student's strongest course or career intent when a less important option exists.

The drop recommendation will favour the subject with the weakest combination of:

- relevance to the intended course, job and passions;
- prerequisite importance;
- pathway value;
- preparation value for the recommended courses.

The wording will remain cautious. It will explain that dropping is optional, depends on Year 11 performance and school advice, and must leave at least 10 eligible Year 12 units.

If no subject can be safely identified, the Guide will say that no drop recommendation is available yet.

## User Interface

The existing Guide plan layout will remain calm and compact.

The Year 10 subject section will show:

- `Six subjects for Year 11`;
- six subject cards with short reasons and requirement labels;
- a separate `Possible Year 12 drop` card;
- the units remaining after the possible drop;
- a short official-rules note.

Course cards will continue to show primary recommendations and backups, but unrelated results will be excluded from prominent positions.

## Data Flow

1. Normalise the student's dream job, dream course, passions and preferences.
2. Score each imported course for direct intent relevance.
3. Remove low-relevance courses from primary recommendations.
4. Apply ATAR, income, provider, preference and pathway scoring to the remaining courses.
5. Extract prerequisite subjects from the strongest relevant course options.
6. Build the six-subject Year 11 set from English, prerequisites and profile-linked subjects.
7. Validate the subject pattern.
8. Calculate the safest optional Year 12 drop.
9. Render the plan and supporting explanation.

## Error and Empty States

- If fewer than six suitable subjects can be resolved, fill remaining positions from broadly useful ATAR subjects and label them as flexible choices.
- If no relevant course passes the threshold, show broad related directions instead of presenting an unrelated course as a confident recommendation.
- If prerequisite text is unclear, label it `Official check needed`; do not treat it as a confirmed hard prerequisite.
- If ATAR eligibility cannot be confidently checked from the local subject metadata, show a warning and link the student to UAC guidance.

## Testing

Add focused tests for pure scoring and subject-plan helpers before production changes.

Required cases:

- Year 10, `software engineer`: technology courses rank above unrelated business, education and health courses.
- Year 10, passion `coding`, no dream course: six subjects include English and technology-aligned choices.
- Year 10, medicine: detected chemistry or other true prerequisites cannot be selected as the possible drop.
- Year 10, six two-unit subjects: the possible drop leaves ten units and keeps English.
- Year 10, a required subject in the sixth position: a less relevant non-required subject is selected instead.
- Weak or missing intent: output is labelled broad guidance and does not claim a precise match.
- Desktop and mobile rendering: six cards and the drop card fit without horizontal overflow.

Run `npm run check`, the focused tests, and browser interaction checks on `/guide.html`.

## Release

After implementation and verification:

1. Commit the completed code intentionally without including unrelated changes.
2. Push the current `codex/` branch to the configured GitHub repository.
3. Update the existing Vercel deployment.
4. Verify the deployed Guide page loads and the Year 10 plan works.
