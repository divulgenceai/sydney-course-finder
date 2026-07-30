# Sydney Course Finder

A standalone review snapshot of a Sydney-focused university course discovery and planning product.

The main goal is to help NSW students find, understand, save, and compare realistic university options without confusing an ATAR, selection rank, prerequisite, or alternative pathway.

## Feedback wanted

Reviews are especially useful around:

- course-search relevance and typo handling;
- whether course cards contain the right decision-making information;
- comparison clarity on desktop and mobile;
- admission-data terminology and trust;
- Guide, Subject Helper, Pathways, and ATAR-calculator usefulness;
- accessibility, performance, responsive layout, and animation smoothness;
- code structure, maintainability, and data-quality risks.

Please use GitHub Issues for focused feedback.

## Main features

- Search more than 1,400 imported Sydney study options by course, career, university, ATAR, campus, duration, mode, prerequisites, pathways, degree structure, and income.
- Fuzzy search for common abbreviations, provider names, keywords, and spelling mistakes.
- Save courses independently and compare up to three courses in a row-based difference view.
- Distinguish lowest selection rank from lowest raw ATAR where the imported data supports both.
- Explore university profiles and study-area strengths.
- Build a personalised Year 10–12 Guide and linear My Plan.
- Find Year 11 and 12 subject suggestions from a known career or degree.
- Explore TAFE, diploma, foundation, SRS/EAS, portfolio, mature-age, transfer, and other non-ATAR pathways.
- Estimate an NSW ATAR and inspect subject break-even guidance.
- Install the site as a PWA or build the included Android wrapper.

## Run locally

Requirements: Node.js 18 or newer.

```bash
npm start
```

Open `http://127.0.0.1:4180`.

## Validate

```bash
npm test
npm run check
npm run audit:data
npm run audit:admission
```

## Optional AI helpers

General Help and Course Direction work without an external model by using verified local guidance and the imported course catalogue. For longer conversational answers, the server-side `/api/ai` endpoint supports Groq first and Gemini as an alternative. No secret is exposed to the browser or committed to Git.

Copy `.env.example` to `.env`, then configure either provider:

```env
# Recommended free-tier starting point
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-20b

# Optional alternative
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-2.5-flash
```

Model answers are grounded with relevant imported UAC records and the user’s current local plan context. The interface falls back to deterministic local guidance if a provider is unavailable or rate-limited.

## Project map

- `app.js` — course search, filters, results, saving, comparison, universities, and home-page tools.
- `guide.js` — personalised Year 10–12 planning flow.
- `subject-helper.js` — career/degree-to-subject planning.
- `pathways.js` and `pathways-logic.js` — situation-aware alternative-entry routes.
- `atar-calculator.js` and `atar-data.js` — NSW ATAR estimation and subject guidance.
- `tools.html` and `tools-page.js` — the dedicated planning-tools index.
- `help.html` and `help.js` — general course, ATAR and UAC help with local fallbacks.
- `tafe-tools.html` and `tafe-tools.js` — trade, job-ready and TAFE-to-university route guidance.
- `advisor.js` — conversational course-direction helper.
- `api/ai.js` — server-side Groq/Gemini gateway with course-data retrieval and rate limiting.
- `uac-courses-lite.js` — browser-optimised imported course records.
- `course-data/` — source data, detail chunks and verified provider-admission overrides.
- `tests/` — product contracts and planning-logic tests.
- `android/` — Android WebView wrapper source.

## Admission-data workflow

UAC lowest selection rank, UAC lowest raw ATAR and university-published ATAR are separate fields. Provider figures are only displayed after their official page and year are recorded in `course-data/provider-admission-overrides.json`.

```bash
npm run build:data-lite
npm run audit:admission
```

The audit writes `audits/provider-admission-audit.json`, including every record that still needs provider verification. Suppressed UAC figures such as “fewer than 5 offers” remain suppressed; the app links to the official provider page rather than estimating a number.

## Data and admissions note

This is a planning tool, not official admissions advice. Entry figures are historical and may change. A selection rank may include adjustment factors and is not always the same as a raw ATAR. Prerequisites, assumed knowledge, portfolios, interviews, and other criteria can also affect admission.

Always confirm current information with UAC and the official university course page.

## Repository note

This repository has its own Git history and is intentionally separate from the original development repository so reviewers can assess this snapshot without changing the main project.
