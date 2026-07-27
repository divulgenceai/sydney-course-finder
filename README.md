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
```

## Optional AI helper

The course-help chat can use Gemini through the server-side `/api/ai` endpoint. It is optional; no API key is committed.

Copy `.env.example` to `.env`, then add your own key:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash
```

## Project map

- `app.js` — course search, filters, results, saving, comparison, universities, and home-page tools.
- `guide.js` — personalised Year 10–12 planning flow.
- `subject-helper.js` — career/degree-to-subject planning.
- `pathways.js` and `pathways-logic.js` — situation-aware alternative-entry routes.
- `atar-calculator.js` and `atar-data.js` — NSW ATAR estimation and subject guidance.
- `advisor.js` — course-choice helper.
- `uac-courses-lite.js` — browser-optimised imported course records.
- `course-data/` — source data and admission-profile enrichment inputs.
- `tests/` — product contracts and planning-logic tests.
- `android/` — Android WebView wrapper source.

## Data and admissions note

This is a planning tool, not official admissions advice. Entry figures are historical and may change. A selection rank may include adjustment factors and is not always the same as a raw ATAR. Prerequisites, assumed knowledge, portfolios, interviews, and other criteria can also affect admission.

Always confirm current information with UAC and the official university course page.

## Repository note

This repository has its own Git history and is intentionally separate from the original development repository so reviewers can assess this snapshot without changing the main project.
