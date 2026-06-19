# Subject Helper and Guide Separation Design

## Objective

Make the two planning tools distinct and easy to understand:

- **Subject Helper** is a fast lookup for students who already know a job or degree they are considering.
- **Guide** is the complete planning journey for students in Year 10 or below, Year 11, or Year 12.

Both tools must update in place without full-page refreshes, preserve relevant user progress, and use the existing UAC course and HSC subject data.

## Product Boundary

### Subject Helper

Subject Helper answers one focused question:

> “If I want this job or degree, which subjects should I choose and what can it lead to?”

It must not ask the student’s school year, run the 12-card direction questionnaire, or check an existing Year 11/12 subject pattern.

### Guide

Guide owns the broader planning journey:

> “What should my plan be from school subjects through university applications and into a career?”

It remains available to:

- Year 10 or below
- Year 11
- Year 12

Its final plan covers subject choices, degree directions, Sydney universities, UAC preferences, pathways, careers, and indicative income.

## Subject Helper Experience

### Initial State

The page presents:

- A clear heading explaining that the tool accepts either a job or degree.
- One prominent smart search field.
- A single action button such as **Find my subjects**.
- A few example searches that fill or submit the same smart field.
- A short note explaining that results are planning guidance and official prerequisites must be confirmed.

The page must not show:

- A year selector
- Year 11 or Year 12 cards
- The 12-card direction deck
- “Current subjects” entry
- ATAR-pattern or unit-eligibility checks
- Unrelated preference filters

### Automatic Query Detection

The helper classifies the entered text as one of:

1. **Job or career intent**
2. **Degree or study intent**
3. **Ambiguous intent**

Detection uses normalized text, aliases, known occupation terms, degree/course titles, study-area vocabulary, and matches in the imported course dataset.

Examples:

- `software engineer`, `developer`, `nurse`, `lawyer`, `architect` → job intent
- `computer science`, `bachelor of nursing`, `law degree`, `psychology` → degree intent
- `medicine`, `business`, `design` → ambiguous intent handled by showing the most likely interpretation and related alternatives

Common abbreviations and wording variants must work, including existing aliases such as `ENTC`, `HMS`, `CAFS`, `MX1`, `SOR1`, and reasonable job/degree variants.

The result should visibly state what was detected, for example:

- **Detected as a career: Software engineer**
- **Detected as a degree: Computer Science**

If confidence is low, the page should say so and present job and degree interpretations rather than silently choosing a misleading answer.

### Job Result

When the query is detected as a job, show:

1. The detected career and a plain-language description.
2. The most relevant degree types or study pathways normally used for that career.
3. The strongest Year 11/12 subject recommendations.
4. Separate prerequisite, assumed-knowledge, and useful-preparation signals.
5. Relevant Sydney UAC courses as evidence.
6. Indicative Australian income ranges.
7. Related careers or specialisations.
8. A reminder to verify professional registration or accreditation where applicable.

Recommendations must distinguish:

- **Required:** appears in prerequisite evidence and may block entry.
- **Strong preparation:** repeatedly appears as assumed knowledge or is directly useful for the field.
- **Useful option:** supports the direction but is not an entry requirement.

### Degree Result

When the query is detected as a degree, show:

1. The detected degree or study area.
2. The strongest Year 11/12 subject recommendations.
3. Separate prerequisite, assumed-knowledge, and useful-preparation signals.
4. Relevant Sydney UAC courses and providers.
5. Jobs commonly connected to the degree.
6. Indicative income ranges for those jobs.
7. Closely related degrees where useful.

The tool must not imply that every listed career is guaranteed by completing the degree.

### No Match and Error States

If no useful match is found:

- Keep the entered text in the field.
- Explain that the wording was not recognized.
- Suggest broader examples such as `software engineer`, `nursing`, `law`, or `architecture`.
- Do not show random recommendations.

If data is incomplete:

- Clearly label missing prerequisite, ATAR, career, or income information.
- Do not convert missing information into a confident claim.

## Guide Experience

### Audience and Year Modes

Guide keeps three modes:

- **Year 10 or below:** choosing Year 11/12 subjects and exploring directions.
- **Year 11:** reviewing current direction, readiness, and future options.
- **Year 12:** refining course choices, UAC preferences, entry checks, and pathways.

The questionnaire/card system belongs only in Guide.

### Full Planning Output

Guide should combine the student’s answers into:

1. Recommended Year 11/12 subjects or current-subject advice appropriate to their year.
2. Suitable degree and study-area directions.
3. Relevant Sydney universities and courses.
4. A UAC preference strategy with aspirational, realistic, and safer/pathway choices.
5. Career directions connected to the recommended degrees.
6. Indicative income information.
7. Prerequisite, assumed-knowledge, ATAR, pathway, and application warnings.
8. A year-appropriate action timeline.

Guide may reuse the same subject recommendation and query-normalization logic as Subject Helper, but it applies that logic to the richer questionnaire profile.

## State and Interaction Behaviour

### No Full-Page Refresh

Submitting either tool must:

- Prevent the browser’s default form navigation.
- Update only the relevant result region.
- Preserve the page shell and navigation.
- Avoid resetting unrelated answers.
- Keep keyboard focus and scroll position sensible.

### Progress Persistence

Use local browser storage for Guide progress:

- Current year mode
- Questionnaire answers
- Current step
- Completed card choices
- Relevant text fields and preferences
- Latest generated plan inputs

Changing one answer must not restart the questionnaire or clear completed answers.

Subject Helper should preserve the most recent search query and result intent during normal rerenders. It may store the last query locally, but it does not need a long-term history feature.

### Render Strategy

Avoid rebuilding the whole application after every keystroke.

- Text input updates state without a full rerender.
- Card or option changes update only the affected step or selected state.
- Results render after explicit submission or a purposeful example action.
- Existing focus, selection, and scroll position are preserved where possible.

## Shared Recommendation Logic

Extract reusable pure logic from the existing Subject Helper implementation so both pages can use the same evidence rules.

The shared module should own:

- Query normalization and aliases
- Job-versus-degree intent detection
- Career-to-degree mapping
- Degree-to-career mapping
- Subject recommendation ranking
- Prerequisite and assumed-knowledge evidence aggregation
- Course evidence selection
- Income mapping
- Confidence and no-match handling

UI rendering and page-specific state remain in `subject-helper.js` and `guide.js`.

## Navigation and Routing

- Keep **Guide** and **Subject helper** as separate navigation items.
- Keep `/guide` and `/subject-helper` as separate routes.
- Subject Helper must not redirect to Guide.
- Cross-links may explain the distinction:
  - Subject Helper can link to Guide for students who do not know their direction yet.
  - Guide can link to Subject Helper for a focused job or degree lookup.

## Accessibility

- The smart search field has a visible label.
- Detection status is announced in the result region.
- Result headings follow a logical hierarchy.
- Buttons have clear accessible names.
- Selected questionnaire cards expose selected state.
- Keyboard users can complete every Guide card and submit both tools.
- Loading and error states use readable text, not color alone.

## Responsive Design

Maintain the existing visual system:

- White/light-blue surfaces
- Blue accent
- Existing typography, border, radius, and dark-mode patterns

On mobile:

- Search controls stack cleanly.
- Recommendations become a single readable column.
- No horizontal page overflow is introduced.
- Guide cards remain comfortably tappable.
- Long degree, university, and career names wrap without clipping.

## Testing Strategy

### Unit Tests

Add tests for:

- Job detection
- Degree detection
- Ambiguous detection
- Aliases and abbreviations
- Job-to-degree output
- Degree-to-job output
- Subject ranking
- Required versus assumed-knowledge classification
- No-match handling
- Duplicate removal
- Income mapping

### State Tests

Add tests proving:

- Guide supports all three year modes.
- Changing one Guide answer preserves other answers.
- Guide progress can be serialized and restored.
- Subject Helper no longer exposes Year 11/12 eligibility workflows.

### Browser Verification

Verify:

- Subject Helper job search path
- Subject Helper degree search path
- Ambiguous and no-match states
- Guide questionnaire progress persistence
- Guide Year 10, Year 11, and Year 12 modes
- No full-page navigation during form interactions
- Desktop and mobile layout
- Console health
- Dark-mode compatibility

## Success Criteria

The work is complete when:

- Subject Helper contains one automatic job/degree search flow.
- The year selector, direction deck, and current-subject eligibility checker are removed from Subject Helper.
- A job query returns degrees, subjects, courses, jobs, and income evidence.
- A degree query returns subjects, courses, jobs, and income evidence.
- Guide retains Year 10 or below, Year 11, and Year 12.
- Guide provides the full subjects-to-UAC-to-career plan.
- Guide progress survives answer changes and page reloads.
- Neither tool performs a full-page refresh during normal use.
- Automated tests and desktop/mobile browser checks pass.

