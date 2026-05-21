# Sydney Course Finder

Clean static website for searching Sydney-campus UAC undergraduate course records, comparing courses, saving a short list, matching by ATAR, and using a data-grounded course helper.

## What It Uses

- `uac-courses.js`: imported UAC undergraduate records filtered to Sydney campuses or Sydney-location study options.
- `app.js`: course search, filters, ATAR matching, saved courses, compare library, provider list and FAQ.
- `advisor.js`: question-based course direction helper grounded in the imported UAC course data.
- No paid API key is required. The helper tries free browser AI when available and only uses Puter if the visitor is already signed in/approved; otherwise it uses the local course-data adviser.

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
