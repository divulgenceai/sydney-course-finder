# Sydney Course Finder

Clean website for searching Sydney-campus UAC undergraduate course records, comparing courses, saving a short list, matching by ATAR, estimating ATAR, and using Gemini-backed course helpers.

## What It Uses

- `uac-courses.js`: imported UAC undergraduate records filtered to Sydney campuses or Sydney-location study options.
- `app.js`: course search, filters, ATAR matching, saved courses, compare library, provider list and FAQ.
- `advisor.js`: question-based course direction helper grounded in the imported UAC course data.
- `api/ai.js`: server-side Gemini endpoint used by Course helper chats. The browser never receives the API key.
- `guide.html`, `guide.js`: full Year 10-or-below, Year 11 and Year 12 plan covering subject choices, degree directions, Sydney universities, UAC preference bands, pathways, careers and income.
- `subject-helper.html`, `subject-helper.js`, `subject-helper-logic.js`: focused automatic job-or-degree lookup that recommends Year 11/12 subjects and shows connected degrees, careers, Sydney course evidence and indicative income.
- `atar-calculator.html`, `atar-calculator.js`, `atar-data.js`: NSW HSC ATAR estimator using public UAC 2025 scaling-report summaries.
- Course helper chat uses the server-side Gemini endpoint only. If the key is missing or Google rejects the key/project/quota, the UI shows the setup issue instead of falling back to scripted local replies.

## Local Preview

```bash
npm start
```

Open `http://127.0.0.1:4180`.

To test Gemini locally in PowerShell:

```powershell
$env:GEMINI_API_KEY="your_google_ai_studio_key"
npm start
```

Or put the key in a local `.env` file:

```env
GEMINI_API_KEY=your_google_ai_studio_key
GEMINI_MODEL=gemini-3.5-flash
```

Optional: set `GEMINI_MODEL` to change the model. The default in this app is `gemini-3.5-flash`, matching Google's current quickstart. No API key is bundled in the repo; add one locally or in Vercel environment variables to enable real AI replies.

The AI status endpoint runs a small connection check, so the UI only shows “Gemini on” after the key actually works. Search grounding is enabled by default; set `GEMINI_DISABLE_SEARCH=1` if you want plain Gemini calls only.

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

In Vercel, import the GitHub repo and use:

- Framework preset: `Other`
- Build command: leave empty
- Output directory: `.`
- Install command: leave empty or default

`vercel.json` enables clean `/advisor`, `/subject-helper`, `/subjects`, `/atar-calculator` and `/calculator` routing with conservative cache headers for the course dataset.

Add this environment variable in Vercel Project Settings:

- `GEMINI_API_KEY`: Google AI Studio API key for Gemini.

Optional:

- `GEMINI_MODEL`: defaults to `gemini-3.5-flash`.
- `AI_PROVIDER_LABEL`: custom label shown in the chat UI.

## Data Note

ATAR profiles, prerequisites, assumed knowledge, fees and course details are shown from the imported UAC record. The ATAR calculator is an estimate only: it interpolates public UAC scaling-report summary statistics and cannot reproduce UAC's official raw-mark scaling process. Final admissions information should always be confirmed on UAC or the official university course page.
