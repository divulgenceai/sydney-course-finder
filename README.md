# Sydney Course Finder

Clean static website for searching Sydney-campus UAC undergraduate course records, comparing courses, saving a short list, matching by ATAR, and using a data-grounded course helper.

## What It Uses

- `uac-courses.js`: imported UAC undergraduate records filtered to Sydney campuses or Sydney-location study options.
- `app.js`: course search, filters, ATAR matching, saved courses, compare library, provider list, FAQ and the Ask sidebar.
- `api/ask-ai.js`: Vercel-compatible free AI proxy for the Ask sidebar. It keeps model calls server-side and falls back to local rules if unavailable.
- `advisor.js`: question-based course direction helper grounded in the imported UAC course data.
- No paid API key is required. The Ask sidebar and Course helper use a free Pollinations text model when reachable, with local UAC/pathway rules, imported course records and official course links as the fallback and guardrail.

## Local Preview

```bash
npm start
```

Open `http://127.0.0.1:4180`. This local server also enables the `/api/ask-ai` route used by the Ask sidebar.

## Local Checks

```bash
npm run check
npm run audit:data
```

To refresh the UAC import when the UAC API is reachable:

```bash
npm run import:uac
```

## Vercel

This is a static site. In Vercel, import the GitHub repo and use:

- Framework preset: `Other`
- Build command: leave empty
- Output directory: `.`
- Install command: leave empty or default

`vercel.json` enables clean `/advisor` routing and conservative cache headers for the course dataset.

## Data Note

ATAR profiles, prerequisites, assumed knowledge, fees and course details are shown from the imported UAC record. Final admissions information should always be confirmed on UAC or the official university course page.
