# Sydney Course Finder

Clean website for searching Sydney-campus UAC undergraduate course records, comparing courses, saving a short list, matching by ATAR, estimating ATAR, and using Gemini-backed course helpers.

## What It Uses

- `uac-courses.js`: imported UAC undergraduate records filtered to Sydney campuses or Sydney-location study options.
- `app.js`: course search, filters, ATAR matching, saved courses, compare library, provider list, FAQ and the Ask sidebar.
- `advisor.js`: question-based course direction helper grounded in the imported UAC course data.
- `api/ai.js`: server-side Gemini endpoint used by the Ask sidebar and Course helper chats. The browser never receives the API key.
- `subject-helper.html`, `subject-helper.js`: degree/job-to-HSC-subject helper using course matches, prerequisites and assumed knowledge signals.
- `atar-calculator.html`, `atar-calculator.js`, `atar-data.js`: NSW HSC ATAR estimator using public UAC 2025 scaling-report summaries.
- The Ask sidebar and Course helper use Gemini when `GEMINI_API_KEY` is configured. If the key is missing or quota fails, they fall back to local site-data rules.

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

Optional: set `GEMINI_MODEL` to change the model. The default is `gemini-3.5-flash`, chosen because Google lists it on the Gemini API free developer tier and it is fast enough for chat UI.

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
