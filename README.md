# Sydney Course Finder

Clean static website for searching Sydney-campus UAC undergraduate course records, comparing courses, saving a short list, matching by ATAR, and using rule-based course helpers.

## What It Uses

- `uac-courses.js`: imported UAC undergraduate records filtered to Sydney campuses or Sydney-location study options.
- `app.js`: course search, filters, ATAR matching, saved courses, compare library, provider list, FAQ and the Ask sidebar.
- `advisor.js`: question-based course direction helper grounded in the imported UAC course data.
- The Ask sidebar and Course helper currently use deterministic local rules and imported course records only. No external model calls are made.

## Local Preview

```bash
npm start
```

Open `http://127.0.0.1:4180`.

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

No environment variables are required for the current static version.

## Data Note

ATAR profiles, prerequisites, assumed knowledge, fees and course details are shown from the imported UAC record. Final admissions information should always be confirmed on UAC or the official university course page.
