const subjectHelperApp = document.querySelector("#subject-helper-app");
const importedCourses = window.uacCourses || [];
const collapsedImport = collapseDuplicateCourses(importedCourses);
const allCourses = collapsedImport.courses;
const meta = window.uacImportMeta || {};
const subjectHelperLogic = window.SubjectHelperLogic;
const hscSubjects = (window.hscSubjectData || [])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

const params = new URLSearchParams(window.location.search);
const helperStorageKey = "sydneyCourseFinder.subjectHelper";
const savedLookup = loadLookupState();
const courseFieldCache = new WeakMap();
const profileCourseScoreCache = new WeakMap();

const helperState = {
  draft: params.get("q") || savedLookup.query || "",
  query: params.get("q") || savedLookup.query || "",
  processing: "",
  intent: null
};

const subjectProfiles = [
  {
    label: "Technology",
    keywords: ["technology", "software", "coding", "programming", "computer science", "information technology", "cyber", "data", "ai", "game development", "software engineer", "developer", "web developer", "systems analyst"],
    degrees: ["Computer Science", "Information Technology", "Software Engineering", "Cyber Security", "Data Science"],
    subjects: [
      ["Mathematics Advanced", "priority", "Keeps computer science, software, AI, data and engineering-adjacent options open."],
      ["Enterprise Computing", "priority", "Directly useful for programming, data, systems and IT study."],
      ["Software Engineering", "priority", "Good match if your school offers it and you want coding or software design."],
      ["English Advanced", "useful", "Useful for reports, presentations and technical communication."],
      ["Mathematics Extension 1", "stretch", "Helpful for high-level computer science, AI and data science pathways."],
      ["Physics", "useful", "Helpful if you may switch toward engineering, robotics or hardware."]
    ]
  },
  {
    label: "Medicine and Health",
    keywords: ["medicine", "medical", "doctor", "health", "nursing", "clinical", "pharmacy", "physio", "physiotherapy", "psychology", "biomedical", "nutrition", "paramedic", "dentistry"],
    degrees: ["Medicine", "Nursing", "Pharmacy", "Physiotherapy", "Psychology", "Biomedical Science", "Health Science"],
    subjects: [
      ["Chemistry", "priority", "Commonly useful for medicine, pharmacy, biomedical and health science pathways."],
      ["Biology", "priority", "Strong preparation for anatomy, physiology, health and life-science content."],
      ["Mathematics Advanced", "useful", "Useful for statistics, science units and competitive health pathways."],
      ["English Advanced", "useful", "Useful for communication-heavy applications, essays and professional practice."],
      ["Health and Movement Science (HMS)", "useful", "Relevant for sport, exercise, health promotion and allied-health interests."],
      ["Physics", "stretch", "Helpful for medical imaging, physiotherapy and science-heavy paths."]
    ]
  },
  {
    label: "Engineering",
    keywords: ["engineering", "engineer", "civil", "mechanical", "electrical", "mechatronic", "robotics", "aerospace", "construction engineer", "renewable energy"],
    degrees: ["Engineering", "Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Mechatronic Engineering", "Renewable Energy Engineering"],
    subjects: [
      ["Mathematics Advanced", "priority", "Core preparation for engineering maths and physics units."],
      ["Physics", "priority", "Strong preparation for mechanics, circuits, structures and engineering fundamentals."],
      ["Mathematics Extension 1", "stretch", "A strong choice for competitive or maths-heavy engineering degrees."],
      ["Engineering Studies", "priority", "Directly relevant if your school offers it."],
      ["Chemistry", "useful", "Helpful for chemical, environmental, materials, biomedical and some civil pathways."],
      ["Software Engineering", "useful", "Useful for software, mechatronics, electrical and robotics pathways."]
    ]
  },
  {
    label: "Architecture and Built Environment",
    keywords: ["architecture", "architect", "built environment", "construction", "property", "planning", "interior", "landscape", "urban", "building designer"],
    degrees: ["Architecture", "Built Environment", "Construction Management", "Property", "Planning", "Interior Architecture"],
    subjects: [
      ["Design & Technology", "priority", "Good preparation for design thinking, projects and portfolio-style work."],
      ["Visual Arts", "priority", "Useful for visual communication, portfolio development and design confidence."],
      ["Mathematics Advanced", "useful", "Helpful for structures, measurement, digital design and built-environment analysis."],
      ["Physics", "useful", "Helpful for structures, materials and building performance."],
      ["English Advanced", "useful", "Useful for design statements, research and presentation writing."],
      ["Engineering Studies", "useful", "Relevant for construction, structures and technical design."]
    ]
  },
  {
    label: "Business",
    keywords: ["business", "commerce", "accounting", "finance", "marketing", "management", "economics", "entrepreneur", "banking", "consulting", "human resources"],
    degrees: ["Commerce", "Business", "Accounting", "Finance", "Marketing", "Economics", "Management"],
    subjects: [
      ["Business Studies", "priority", "Directly relevant to management, marketing, operations and business strategy."],
      ["Economics", "priority", "Strong preparation for commerce, finance, policy and analytical business degrees."],
      ["Mathematics Advanced", "useful", "Useful for finance, analytics, economics, accounting and quantitative business units."],
      ["English Advanced", "useful", "Useful for reports, presentations and persuasive communication."],
      ["Legal Studies", "useful", "Helpful for business law, commerce/law and regulation-heavy interests."],
      ["Enterprise Computing", "useful", "Useful for analytics, information systems and digital business."]
    ]
  },
  {
    label: "Law and Justice",
    keywords: ["law", "lawyer", "legal", "justice", "criminology", "policy", "court", "solicitor", "barrister", "policing", "crime"],
    degrees: ["Law", "Criminology", "Justice Studies", "Policing", "Legal Studies", "Social Science"],
    subjects: [
      ["English Advanced", "priority", "Strong reading, writing and argument skills matter for law and justice."],
      ["Legal Studies", "priority", "Directly relevant for legal systems, rights, cases and justice topics."],
      ["Modern History", "useful", "Builds essay writing, evidence analysis and argument structure."],
      ["Society & Culture", "useful", "Useful for social research, justice, policy and people-focused analysis."],
      ["Economics", "useful", "Helpful for policy, commerce/law and regulation-heavy pathways."],
      ["Business Studies", "useful", "Useful if you are considering commerce/law or corporate law."]
    ]
  },
  {
    label: "Creative Arts and Design",
    keywords: ["design", "designer", "creative", "animation", "game art", "music", "screen", "media", "film", "visual art", "artist", "ux", "graphic design"],
    degrees: ["Design", "Visual Communication", "Creative Arts", "Media", "Animation", "Music", "Film"],
    subjects: [
      ["Visual Arts", "priority", "Strong fit for portfolio, visual thinking and design communication."],
      ["Design & Technology", "priority", "Good preparation for design process, product thinking and creative projects."],
      ["English Advanced", "useful", "Useful for concept writing, analysis and communication."],
      ["Drama", "useful", "Relevant for performance, screen, media and presentation confidence."],
      ["Music 1", "useful", "Relevant for music, performance and sound-focused creative pathways."],
      ["Enterprise Computing", "useful", "Useful for interactive design, games, web and digital media."]
    ]
  },
  {
    label: "Education",
    keywords: ["education", "teaching", "teacher", "primary teacher", "secondary teacher", "early childhood", "mentor", "school"],
    degrees: ["Education", "Teaching", "Primary Education", "Secondary Education", "Early Childhood Education"],
    subjects: [
      ["English Advanced", "priority", "Strong communication helps in most teaching pathways."],
      ["Mathematics Standard 2", "priority", "Useful for primary teaching and general numeracy expectations."],
      ["Society & Culture", "useful", "Helpful for understanding learners, communities and social contexts."],
      ["Community & Family Studies", "useful", "Relevant for child development, wellbeing and family contexts."],
      ["Biology", "useful", "Useful if you may teach science, HMS or health-related content."],
      ["Modern History", "useful", "Useful if you may teach humanities or HSIE subjects."]
    ]
  },
  {
    label: "Science",
    keywords: ["science", "scientist", "research", "biology", "chemistry", "physics", "environment", "laboratory", "biotech", "mathematics", "statistics"],
    degrees: ["Science", "Advanced Science", "Biotechnology", "Environmental Science", "Mathematics", "Statistics"],
    subjects: [
      ["Mathematics Advanced", "priority", "Keeps most science, statistics and research pathways open."],
      ["Chemistry", "priority", "Very useful for lab science, biomedical, environmental and health-related science."],
      ["Biology", "priority", "Strong for life science, psychology, health science and environmental paths."],
      ["Physics", "priority", "Strong for physical sciences, engineering-adjacent science and quantitative pathways."],
      ["Science Extension", "stretch", "Useful if you enjoy independent research and your school offers it."],
      ["English Advanced", "useful", "Helpful for scientific writing and research communication."]
    ]
  },
  {
    label: "Humanities and Social Impact",
    keywords: ["social work", "society", "culture", "history", "politics", "international", "community", "humanities", "journalism", "communications", "psychology", "counselling"],
    degrees: ["Arts", "Social Work", "Social Science", "International Studies", "Communications", "Psychology", "Counselling"],
    subjects: [
      ["English Advanced", "priority", "Strong reading, writing and communication skills are central."],
      ["Society & Culture", "priority", "Directly relevant for social research, communities and human behaviour."],
      ["Modern History", "useful", "Builds evidence, essay and context skills."],
      ["Legal Studies", "useful", "Helpful for policy, rights, advocacy and justice interests."],
      ["Community & Family Studies", "useful", "Relevant for social work, wellbeing and support roles."],
      ["Economics", "useful", "Useful for policy, development and social-impact analysis."]
    ]
  }
];

const profileCareers = {
  "Technology": [
    ["Software engineer", "$90k-$160k"],
    ["Cyber security analyst", "$85k-$150k"],
    ["Data analyst", "$75k-$125k"],
    ["Product manager", "$100k-$170k"]
  ],
  "Medicine and Health": [
    ["Registered nurse", "$75k-$110k"],
    ["Doctor", "$90k-$250k+"],
    ["Physiotherapist", "$75k-$120k"],
    ["Pharmacist", "$75k-$120k"]
  ],
  "Engineering": [
    ["Civil engineer", "$80k-$140k"],
    ["Mechanical engineer", "$80k-$145k"],
    ["Electrical engineer", "$85k-$155k"],
    ["Project engineer", "$90k-$160k"]
  ],
  "Architecture and Built Environment": [
    ["Architect", "$75k-$130k"],
    ["Construction manager", "$95k-$180k"],
    ["Urban planner", "$75k-$120k"],
    ["Property analyst", "$75k-$130k"]
  ],
  "Business": [
    ["Accountant", "$70k-$120k"],
    ["Financial analyst", "$80k-$150k"],
    ["Marketing manager", "$85k-$160k"],
    ["Management consultant", "$90k-$180k"]
  ],
  "Law and Justice": [
    ["Solicitor", "$75k-$180k+"],
    ["Policy adviser", "$80k-$140k"],
    ["Criminologist", "$70k-$115k"],
    ["Compliance officer", "$75k-$135k"]
  ],
  "Creative Arts and Design": [
    ["UX designer", "$80k-$145k"],
    ["Graphic designer", "$60k-$100k"],
    ["Animator", "$65k-$120k"],
    ["Media producer", "$70k-$130k"]
  ],
  "Education": [
    ["Primary teacher", "$75k-$115k"],
    ["Secondary teacher", "$75k-$120k"],
    ["Early childhood teacher", "$65k-$105k"],
    ["Education coordinator", "$80k-$130k"]
  ],
  "Science": [
    ["Laboratory scientist", "$70k-$115k"],
    ["Environmental scientist", "$75k-$125k"],
    ["Research assistant", "$65k-$105k"],
    ["Statistician", "$85k-$145k"]
  ],
  "Humanities and Social Impact": [
    ["Social worker", "$75k-$115k"],
    ["Communications adviser", "$75k-$130k"],
    ["Policy analyst", "$80k-$140k"],
    ["Community program manager", "$80k-$130k"]
  ]
};

const quickSearches = [
  "software engineer",
  "Bachelor of Nursing",
  "computer science",
  "lawyer",
  "doctor",
  "civil engineer",
  "architecture",
  "teacher",
  "psychology",
  "commerce"
];

const subjectAliases = [
  ["Any English course", ["any 2 units of english", "2 units of english", "english"]],
  ["English Advanced", ["english advanced"]],
  ["English Standard", ["english standard"]],
  ["Mathematics Advanced", ["mathematics advanced", "advanced mathematics", "maths advanced"]],
  ["Mathematics Extension 1", ["mathematics extension 1", "maths extension 1"]],
  ["Mathematics Standard 2", ["mathematics standard 2", "maths standard 2"]],
  ["Physics", ["physics"]],
  ["Chemistry", ["chemistry"]],
  ["Biology", ["biology"]],
  ["Enterprise Computing", ["enterprise computing", "computing"]],
  ["Software Engineering", ["software engineering"]],
  ["Engineering Studies", ["engineering studies"]],
  ["Business Studies", ["business studies"]],
  ["Economics", ["economics"]],
  ["Legal Studies", ["legal studies"]],
  ["Modern History", ["modern history"]],
  ["Society & Culture", ["society and culture", "society culture"]],
  ["Visual Arts", ["visual arts"]],
  ["Design & Technology", ["design and technology", "design technology"]],
  ["Health and Movement Science (HMS)", ["health and movement science", "hms", "pdhpe", "personal development health and physical education"]],
  ["Community & Family Studies", ["community and family studies", "cafs"]],
  ["Science Extension", ["science extension"]]
];

render();

function render() {
  const query = helperState.query.trim();
  const matches = query ? subjectCourseMatches(query) : [];
  const intent = query
    ? subjectHelperLogic.detectPlanningIntent({
        query,
        profiles: planningIntentProfiles(),
        courses: allCourses
      })
    : null;
  helperState.intent = intent;

  subjectHelperApp.innerHTML = `
    ${renderSubjectHeader()}
    ${renderSubjectHelperProgress()}
    <main class="subject-main">
      <section class="hero subject-hero">
        <div>
          <h1>Subject helper</h1>
          <p>Search a job or degree. The helper automatically detects what you mean, then shows the best Year 11 and 12 subjects and what the pathway can lead to.</p>
        </div>
        <dl class="stats two">
          <div><dt>Course records</dt><dd>${number(allCourses.length)}</dd></div>
          <div><dt>HSC subjects</dt><dd>${number(hscSubjects.length)}</dd></div>
        </dl>
        <p class="data-note">Planning guidance only. Confirm prerequisites, accreditation and course rules with UAC and the official university page.</p>
      </section>

      <section class="panel subject-lookup-panel">
        <div class="panel-head">
          <div>
            <h2>What job or degree are you considering?</h2>
            <p>Try software engineer, nursing, computer science, law, architecture or a similar phrase.</p>
          </div>
          <span>${query ? "Search ready" : "Search first"}</span>
        </div>
        <form class="subject-smart-search" data-subject-search>
          <label>
            <span>Search a job or degree</span>
            <input name="query" type="search" autocomplete="off" value="${escapeHtml(helperState.draft)}" placeholder="Example: software engineer or Bachelor of Nursing" />
          </label>
          <button class="match-btn" type="submit">Find my subjects</button>
        </form>
        <div class="subject-example-row" aria-label="Example searches">
          ${quickSearches.map((item) => `<button type="button" data-quick-search="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
        </div>
      </section>

      <div id="subject-helper-result" aria-live="polite">
        ${helperState.processing ? renderSubjectHelperProcessStrip() : renderSmartLookupResult(query, intent, matches)}
      </div>
    </main>
  `;
  bindEvents();
}

function renderSubjectHeader() {
  return `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
        <a href="./guide.html">Guide</a>
        <a href="./index.html#atar">ATAR match</a>
        <a href="./atar-calculator.html">ATAR calculator</a>
        <a href="./subject-helper.html" aria-current="page">Subject helper</a>
        <a href="./advisor.html">Course helper</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function renderSubjectHelperProgress() {
  if (!helperState.processing) return "";
  return `<div class="subject-process-bar"><span></span></div>`;
}

function renderSubjectHelperProcessStrip() {
  return `
    <section class="panel subject-process">
      <span>${icon("search")}</span>
      <div>
        <h2>Finding the best subject pathway</h2>
        <p>Checking courses, prerequisites, assumed knowledge, careers and income clues.</p>
      </div>
    </section>
  `;
}

function renderSmartLookupResult(query, intent, matches) {
  if (!query) return renderEmptyState();
  if (!intent || intent.kind === "none" || !matches.length) return renderNoMatch(query);

  const profile = detectedProfile(query, matches, intent);
  const evidence = subjectRequirementSignals(matches);
  const merged = subjectHelperLogic.mergeSubjectRecommendations({
    profileSubjects: profile.subjects.map(([name, tier, reason]) => ({ name, tier, reason })),
    evidence
  });
  const plan = subjectPlanFromMerged(merged);
  const enrichedMatches = matches.map((match) => ({
    ...match,
    course: {
      ...match.course,
      incomeOutcomes: careerIncomeOutcomesForCourse(match.course, profile)
    }
  }));
  const degrees = subjectHelperLogic.relatedDegreeNames(enrichedMatches);
  const careers = subjectHelperLogic.relatedCareerOutcomes(enrichedMatches);

  return `
    <section class="panel subject-detection" role="status">
      <span>${intent.kind === "ambiguous" ? "Possible interpretations" : `Detected as a ${intent.kind}`}</span>
      <h2>${escapeHtml(intent.label)}</h2>
      <p>${intent.kind === "ambiguous"
        ? "This phrase can describe both work and study. The results combine the strongest related evidence."
        : "The result below uses matching Sydney UAC courses, entry text, careers and subject evidence."}</p>
    </section>
    ${renderSubjectResults(profile, plan, matches)}
    ${intent.kind === "career" || intent.kind === "ambiguous" ? renderDegreePathways(degrees) : ""}
    ${renderCareerOutcomes(careers)}
    ${renderFocusedGuideLink(query)}
  `;
}

function renderEmptyState() {
  return `
    <section class="panel subject-empty">
      <div>
        <span class="eyebrow">Start here</span>
        <h2>Type a career or degree and I’ll map it to subjects.</h2>
        <p>Use this when you already have a goal in mind and want the Year 11/12 subjects that keep that pathway open.</p>
      </div>
    </section>
  `;
}

function renderNoMatch(query) {
  return `
    <section class="panel subject-empty" role="status">
      <div>
        <h2>We could not confidently match “${escapeHtml(query)}”</h2>
        <p>Try a broader job or degree such as software engineer, nursing, law, computer science, medicine, teaching or architecture.</p>
      </div>
    </section>
  `;
}

function renderSubjectResults(profile, plan, matches) {
  const groups = [
    ["required", "Required or strongly detected", "These appeared in matching course prerequisites or repeated course evidence."],
    ["priority", "Best subjects to prioritise", "Strong preparation for this career or degree direction."],
    ["useful", "Useful support subjects", "Good options if they fit your strengths or school timetable."],
    ["stretch", "Stretch subjects", "Helpful for selective or maths/science-heavy versions of this pathway."]
  ];
  return `
    <section class="panel subject-plan-summary">
      <div class="panel-head">
        <div>
          <h2>Recommended Year 11 and 12 subjects</h2>
          <p>Best match: ${escapeHtml(profile.label)}. Pick English plus the strongest subjects below, then confirm exact prerequisites.</p>
        </div>
        <span>${matches.length} course matches</span>
      </div>
      <div class="subject-plan-grid">
        ${groups.map(([key, title, copy]) => renderSubjectGroup(title, copy, plan[key])).join("")}
      </div>
    </section>
    <section class="panel subject-course-evidence">
      <div class="panel-head">
        <div>
          <h2>Sydney course evidence</h2>
          <p>These records influenced the subject recommendation.</p>
        </div>
      </div>
      <div class="subject-course-list">
        ${matches.slice(0, 8).map(renderCourseEvidence).join("")}
      </div>
    </section>
  `;
}

function renderSubjectGroup(title, copy, items) {
  return `
    <article class="subject-plan-card">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(copy)}</p>
      ${(items || []).length
        ? `<ul>${items.slice(0, 6).map((item) => `<li><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.reason || evidenceReason(item))}</span></li>`).join("")}</ul>`
        : `<span class="empty-note">No extra subject found in this group.</span>`}
    </article>
  `;
}

function evidenceReason(item) {
  if (item?.evidence?.required) return "Detected as a prerequisite in matching course text.";
  if (item?.evidence?.assumed) return "Detected as assumed knowledge in matching course text.";
  return "Good fit for this pathway.";
}

function renderCourseEvidence(match) {
  const course = match.course || {};
  return `
    <article class="subject-course-card">
      <div>
        <span>${escapeHtml(course.university || course.providerId || "Sydney provider")}</span>
        <h3>${escapeHtml(course.name || "Unnamed course")}</h3>
        <p>${escapeHtml(course.summary || course.area || "Check the official page for full details.")}</p>
      </div>
      <dl>
        <div><dt>ATAR/profile</dt><dd>${escapeHtml(displayRank(course.atar))}</dd></div>
        <div><dt>Campus</dt><dd>${escapeHtml(course.campus || "Check provider")}</dd></div>
        <div><dt>Prerequisites</dt><dd>${escapeHtml(normaliseSubjectDisplay(course.prerequisites || "Not listed by UAC"))}</dd></div>
        <div><dt>Assumed knowledge</dt><dd>${escapeHtml(normaliseSubjectDisplay(course.assumed || "Not listed by UAC"))}</dd></div>
      </dl>
      ${course.url ? `<a class="help-link" href="${escapeHtml(course.url)}" target="_blank" rel="noreferrer">Official page ${icon("external")}</a>` : ""}
    </article>
  `;
}

function renderDegreePathways(degrees) {
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Degrees that can lead there</h2><p>These are the strongest matching Sydney course titles, not the only possible routes.</p></div>
      </div>
      <div class="subject-pathway-grid">
        ${(degrees || []).length
          ? degrees.map((degree) => `<article><strong>${escapeHtml(degree)}</strong><p>Check the exact course, accreditation and entry rules before applying.</p></article>`).join("")
          : `<p class="empty-note">No specific degree title was found. Review the course evidence above.</p>`}
      </div>
    </section>
  `;
}

function renderCareerOutcomes(careers) {
  return `
    <section class="panel">
      <div class="panel-head">
        <div><h2>Jobs and indicative income</h2><p>These are related directions, not guaranteed outcomes from a degree.</p></div>
      </div>
      <div class="subject-career-grid">
        ${(careers || []).length
          ? careers.map((career) => `<article><strong>${escapeHtml(career.title)}</strong><span>${escapeHtml(career.range)}</span><p>Actual pay depends on experience, employer, location, registration and further study.</p></article>`).join("")
          : `<p class="empty-note">The imported records do not contain a clear career outcome for this search.</p>`}
      </div>
    </section>
  `;
}

function renderFocusedGuideLink(query) {
  const href = query ? `./guide.html?q=${encodeURIComponent(query)}` : "./guide.html";
  return `
    <section class="panel subject-guide-link">
      <div><h2>Need the whole plan?</h2><p>Use Guide for subject selection, UAC preferences, Sydney unis, degrees, pathways, careers and income.</p></div>
      <a class="help-link" href="${href}">Open Guide</a>
    </section>
  `;
}

function bindEvents() {
  window.courseFinderTheme?.bind?.(subjectHelperApp);
  const form = subjectHelperApp.querySelector("[data-subject-search]");
  const input = form?.elements.query;

  input?.addEventListener("input", (event) => {
    helperState.draft = event.target.value;
  });

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    setLookupQuery(String(new FormData(form).get("query") || "").trim(), 180);
  });

  subjectHelperApp.querySelectorAll("[data-quick-search]").forEach((button) => {
    button.addEventListener("click", () => {
      setLookupQuery(button.dataset.quickSearch || "", 120);
    });
  });
}

function setLookupQuery(query, delay) {
  helperState.draft = query;
  helperState.query = query;
  persistLookupState();
  replaceQueryParam(query);
  runSubjectHelperProcessing(delay);
}

function runSubjectHelperProcessing(delay = 160) {
  helperState.processing = "search";
  render();
  window.setTimeout(() => {
    helperState.processing = "";
    render();
  }, delay);
}

function loadLookupState() {
  try {
    const value = JSON.parse(localStorage.getItem(helperStorageKey) || "{}");
    return { query: String(value.query || "") };
  } catch {
    return { query: "" };
  }
}

function persistLookupState() {
  try {
    localStorage.setItem(helperStorageKey, JSON.stringify({ query: helperState.query }));
  } catch {
    // Storage is optional; the current session still works.
  }
}

function replaceQueryParam(query) {
  const url = new URL(window.location.href);
  if (query) url.searchParams.set("q", query);
  else url.searchParams.delete("q");
  window.history.replaceState(null, "", url);
}

function planningIntentProfiles() {
  return subjectProfiles.map((profile) => ({
    label: profile.label,
    keywords: profile.keywords,
    careers: (profileCareers[profile.label] || []).map(([title]) => title),
    degrees: profile.degrees || []
  }));
}

function detectedProfile(query, matches, intent) {
  const intentProfile = subjectProfiles.find((profile) => profile.label === intent?.profile);
  const scores = queryProfileScores(query).map((entry) => ({
    profile: entry.profile,
    score: entry.score + matches.slice(0, 15).reduce(
      (sum, match) => sum + profileCourseScore(match.course, entry.profile) * 0.06,
      0
    ) + (intentProfile === entry.profile ? 30 : 0)
  }));
  return scores.sort((a, b) => b.score - a.score)[0]?.profile || intentProfile || subjectProfiles[0];
}

function queryProfileScores(query) {
  const clean = cleanSearchText(query);
  return subjectProfiles.map((profile) => {
    let score = 0;
    for (const keyword of profile.keywords || []) {
      if (phraseMatch(clean, keyword)) score += cleanSearchText(keyword).includes(" ") ? 36 : 14;
      for (const token of tokenise(keyword)) {
        if (token.length > 3 && tokenMatch(clean, token)) score += 3;
      }
    }
    for (const degree of profile.degrees || []) {
      if (phraseMatch(clean, degree)) score += 24;
    }
    return { profile, score };
  });
}

function subjectPlanFromMerged(items) {
  const plan = { required: [], priority: [], useful: [], stretch: [] };
  for (const item of items || []) {
    const target = plan[item.tier] || plan.useful;
    target.push({
      name: item.name,
      tier: item.tier,
      reason: item.reason,
      evidence: { required: item.required, assumed: item.assumed }
    });
  }
  return plan;
}

function subjectCourseMatches(query) {
  const clean = cleanSearchText(query);
  if (!clean) return [];
  const profileScores = queryProfileScores(query);
  const exactTitle = [];
  const scored = [];

  for (const course of allCourses) {
    const fields = courseFields(course);
    const titleExact = fields.title.text === clean;
    let score = titleExact ? 160 : 0;
    if (fields.title.text.includes(clean)) score += 80;
    if (fields.careers.text.includes(clean)) score += 60;
    if (fields.area.text.includes(clean)) score += 30;
    if (fields.summary.text.includes(clean)) score += 18;

    for (const token of tokenise(clean)) {
      if (token.length < 3) continue;
      if (fieldHas(fields.title, token)) score += 12;
      if (fieldHas(fields.careers, token)) score += 10;
      if (fieldHas(fields.area, token)) score += 6;
      if (fieldHas(fields.summary, token)) score += 3;
    }

    for (const entry of profileScores) {
      score += entry.score * profileCourseScore(course, entry.profile) * 0.015;
    }

    if (titleExact) exactTitle.push({ course, score });
    else if (score > 14) scored.push({ course, score });
  }

  const pool = exactTitle.length ? exactTitle : scored;
  return pool
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .slice(0, 24);
}

function profileCourseScore(course, profile) {
  const cached = profileCourseScoreCache.get(course) || {};
  if (cached[profile.label] !== undefined) return cached[profile.label];
  const fields = courseFields(course);
  let score = 0;
  for (const keyword of profile.keywords || []) {
    if (fieldHas(fields.title, keyword)) score += 10;
    if (fieldHas(fields.careers, keyword)) score += 8;
    if (fieldHas(fields.area, keyword)) score += 5;
    if (fieldHas(fields.summary, keyword)) score += 3;
  }
  cached[profile.label] = score;
  profileCourseScoreCache.set(course, cached);
  return score;
}

function subjectRequirementSignals(matches) {
  const rows = new Map();
  for (const match of matches.slice(0, 12)) {
    const course = match.course || {};
    const prerequisites = String(course.prerequisites || "");
    const assumed = String(course.assumed || "");
    for (const name of extractSubjectNames(prerequisites)) addSignal(name, "required");
    for (const name of extractSubjectNames(assumed)) addSignal(name, "assumed");
  }
  return [...rows.values()];

  function addSignal(name, kind) {
    const key = cleanSearchText(name);
    if (!key) return;
    const row = rows.get(key) || { name, required: 0, assumed: 0 };
    row[kind] += 1;
    rows.set(key, row);
  }
}

function extractSubjectNames(text) {
  const clean = cleanSearchText(text);
  if (!clean || !hasSpecificInfo(text)) return [];
  const found = [];
  for (const [name, aliases] of subjectAliases) {
    const options = [name, ...(aliases || [])].map(cleanSearchText);
    if (options.some((alias) => alias && ` ${clean} `.includes(` ${alias} `))) found.push(name);
  }
  return [...new Set(found)];
}

function careerIncomeOutcomesForCourse(course, profile) {
  const profileOutcomes = (profileCareers[profile.label] || []).map(([title, range]) => ({ title, range }));
  const listedCareers = String(course?.careers || "")
    .split(/[,;/]+/)
    .map((title) => title.trim())
    .filter(Boolean);
  if (!listedCareers.length) return profileOutcomes;
  return listedCareers.slice(0, 8).map((title) => {
    const clean = cleanSearchText(title);
    const match = profileOutcomes.find((item) => {
      const candidate = cleanSearchText(item.title);
      return candidate.includes(clean) || clean.includes(candidate)
        || tokenise(clean).some((token) => token.length > 3 && candidate.includes(token));
    });
    return { title, range: match?.range || "Income varies by role and experience" };
  });
}

function collapseDuplicateCourses(courses) {
  const groups = new Map();
  for (const course of courses) {
    const key = [
      cleanSearchText(course.name),
      course.providerId,
      cleanSearchText(course.campus),
      cleanSearchText(course.courseCode)
    ].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(course);
  }

  return {
    courses: [...groups.values()].map((group) => {
      const ordered = [...group].sort((a, b) => duplicatePreferenceScore(b) - duplicatePreferenceScore(a));
      const primary = ordered[0];
      return {
        ...primary,
        modes: uniqueValues(group.flatMap((course) => course.modes || [])),
        dedupedCount: group.length
      };
    })
  };
}

function duplicatePreferenceScore(course) {
  return [
    course.level === "undergraduate" ? 20 : 0,
    numericRank(course.atar) !== null ? 12 : 0,
    hasSpecificInfo(course.prerequisites) ? 8 : 0,
    hasSpecificInfo(course.assumed) ? 6 : 0,
    hasSpecificInfo(course.careers) ? 4 : 0,
    hasSpecificInfo(course.summary) ? 3 : 0
  ].reduce((sum, value) => sum + value, 0);
}

function courseFields(course) {
  if (courseFieldCache.has(course)) return courseFieldCache.get(course);
  const fields = {
    title: cleanField(course.name),
    area: cleanField(course.area),
    careers: cleanField(course.careers),
    summary: cleanField(course.summary),
    provider: cleanField(course.university)
  };
  courseFieldCache.set(course, fields);
  return fields;
}

function cleanField(value) {
  const text = cleanSearchText(value);
  return { text, tokens: new Set(text.split(" ").filter(Boolean)) };
}

function fieldHas(field, cleanPhrase) {
  const phrase = cleanSearchText(cleanPhrase);
  if (!phrase) return false;
  const parts = phrase.split(" ").filter(Boolean);
  if (parts.length === 1) return [...tokenVariants(parts[0])].some((variant) => field.tokens.has(variant));
  return field.text.includes(phrase);
}

function displayRank(value) {
  const rank = numericRank(value);
  if (rank !== null) return rank.toFixed(rank % 1 ? 2 : 0);
  const text = String(value || "").trim();
  if (!text || text === "0") return "not listed";
  const meanings = {
    NC: "new course",
    NO: "no ATAR-only offers",
    NR: "not reportable",
    NP: "not provided",
    NS: "no semester 1 offers",
    NN: "not available",
    "<5": "fewer than 5 offers"
  };
  return meanings[text] || text;
}

function numericRank(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function hasSpecificInfo(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && text !== "not listed" && text !== "not listed by uac." && text !== "check official course page.");
}

function normaliseSubjectDisplay(value) {
  return String(value || "")
    .replace(/\bPersonal Development,\s*Health and Physical Education\s*\(PDHPE\)/gi, "Health and Movement Science (HMS)")
    .replace(/\bPersonal Development Health and Physical Education\s*\(PDHPE\)/gi, "Health and Movement Science (HMS)")
    .replace(/\bPersonal Development,\s*Health and Physical Education\b/gi, "Health and Movement Science (HMS)")
    .replace(/\bPersonal Development Health and Physical Education\b/gi, "Health and Movement Science (HMS)")
    .replace(/\bPDH&PE\b/gi, "HMS")
    .replace(/\bPDHPE\b/gi, "HMS");
}

function cleanSearchText(value) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value) {
  return cleanSearchText(value).split(" ").filter(Boolean);
}

function tokenVariants(word) {
  const clean = cleanSearchText(word);
  const variants = new Set([clean]);
  if (clean.endsWith("ies") && clean.length > 4) variants.add(`${clean.slice(0, -3)}y`);
  if (clean.endsWith("s") && clean.length > 3) variants.add(clean.slice(0, -1));
  if (!clean.endsWith("s") && clean.length > 2) variants.add(`${clean}s`);
  if (clean === "medicine") variants.add("medical");
  if (clean === "medical") variants.add("medicine");
  if (clean === "law") variants.add("laws");
  if (clean === "laws") variants.add("law");
  if (clean === "it") variants.add("information");
  return variants;
}

function tokenMatch(text, word) {
  const tokens = new Set(tokenise(text));
  return [...tokenVariants(word)].some((variant) => tokens.has(variant));
}

function phraseMatch(text, phrase) {
  const cleanPhrase = cleanSearchText(phrase);
  if (!cleanPhrase) return false;
  const phraseTokens = tokenise(cleanPhrase);
  if (phraseTokens.length === 1) return tokenMatch(text, phraseTokens[0]);
  return cleanSearchText(text).includes(cleanPhrase);
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function decodeHtmlEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function icon(name) {
  const paths = {
    search: '<path d="m21 21-4.2-4.2"/><circle cx="11" cy="11" r="7"/>',
    external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
