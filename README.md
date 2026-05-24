# Sydney Course Finder

Clean static website for searching Sydney-campus UAC undergraduate course records, comparing courses, saving a short list, matching by ATAR, and using a data-grounded course helper.

## What It Uses

- `uac-courses.js`: imported UAC undergraduate records filtered to Sydney campuses or Sydney-location study options.
- `app.js`: course search, filters, ATAR matching, saved courses, compare library, provider list, FAQ and the Ask sidebar.
- `api/ask-ai.js`: Vercel-compatible Gemini proxy for the Ask sidebar and Course helper. It keeps the API key server-side and falls back to local rules if unavailable.
- `advisor.js`: question-based course direction helper grounded in the imported UAC course data.
- The Ask sidebar and Course helper can use a Google AI Studio Gemini API key. Each AI call receives a compact data pack with retrieved course records, ATAR/rank-code meanings, pathway links, provider context, profile scoring evidence and recent chat context. For school-specific or provider-specific questions, the API can also enable Gemini Google Search grounding so answers can check current public pages instead of only falling back to the static dataset. Local UAC/pathway rules, imported course records and official course links remain the fallback and guardrail.

## Local Preview

```bash
npm start
```

Open `http://127.0.0.1:4180`. This local server also enables the `/api/ask-ai` route used by the Ask sidebar.

For Gemini locally, copy `.env.example` to `.env` and set:

```bash
GEMINI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_SEARCH_GROUNDING=true
```

If `GEMINI_API_KEY` is missing, the app still works with the built-in site-data helper.

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

Add these environment variables in Vercel Project Settings:

- `GEMINI_API_KEY`: your Google AI Studio key.
- `GEMINI_MODEL`: optional; defaults to `gemini-3.5-flash`, then falls back to Gemini 2.5 Flash or Flash-Lite if that model is not available to the key.
- `GEMINI_SEARCH_GROUNDING`: optional; set to `false` to disable Google Search grounding. Grounded search can be useful for current official rules, but Google may bill grounded search usage depending on your API plan/model.

## Data Note

ATAR profiles, prerequisites, assumed knowledge, fees and course details are shown from the imported UAC record. Final admissions information should always be confirmed on UAC or the official university course page.
