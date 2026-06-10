const subjectHelperApp = document.querySelector("#subject-helper-app");
const importedCourses = window.uacCourses || [];
const collapsedImport = collapseDuplicateCourses(importedCourses);
const allCourses = collapsedImport.courses;
const meta = window.uacImportMeta || {};
const hscSubjects = (window.hscSubjectData || [])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name));

const subjectIndex = new Map(hscSubjects.map((subject) => [cleanSearchText(subject.name), subject]));
const courseFieldCache = new WeakMap();
const profileCourseScoreCache = new WeakMap();
const params = new URLSearchParams(window.location.search);

const helperState = {
  draft: params.get("q") || "",
  query: params.get("q") || "",
  profile: params.get("area") || "Auto detect",
  processing: ""
};

const subjectProfiles = [
  {
    label: "Technology",
    keywords: ["technology", "software", "coding", "programming", "computer science", "it", "information technology", "cyber", "data", "ai", "artificial intelligence", "game development", "software engineer", "developer", "web developer", "systems analyst"],
    subjects: [
      ["Mathematics Advanced", "priority", "Keeps computer science, software, AI, data and engineering-adjacent options open."],
      ["Enterprise Computing", "priority", "Directly useful for programming, data, systems and IT study."],
      ["Software Engineering", "priority", "Good match if your school offers it and you want coding or software design."],
      ["English Advanced", "useful", "Useful for reports, presentations and technical communication."],
      ["Mathematics Extension 1", "stretch", "Helpful for high-level computer science, AI, data science and UNSW/USYD-style maths-heavy pathways."],
      ["Physics", "useful", "Helpful if you may switch toward engineering, robotics or hardware."],
      ["Design & Technology", "useful", "Useful for product design, UX, interactive media and project-style tech courses."]
    ]
  },
  {
    label: "Medicine and Health",
    keywords: ["medicine", "medical", "doctor", "health", "nursing", "clinical", "pharmacy", "physio", "physiotherapy", "psychology", "biomedical", "nutrition", "paramedic", "dentistry", "chiropractic"],
    subjects: [
      ["Chemistry", "priority", "Commonly useful for medicine, pharmacy, biomedical and health science pathways."],
      ["Biology", "priority", "Strong preparation for anatomy, physiology, health and life-science content."],
      ["Mathematics Advanced", "useful", "Useful for statistics, science units and competitive health pathways."],
      ["English Advanced", "useful", "Useful for communication-heavy applications, essays and professional practice."],
      ["Health and Movement Science (HMS)", "useful", "Relevant for sport, exercise, health promotion and some allied-health interests."],
      ["Physics", "stretch", "Helpful for medical imaging, physiotherapy, engineering-health or very science-heavy paths."],
      ["Community & Family Studies", "useful", "Relevant for care, wellbeing, social health and people-focused courses."]
    ]
  },
  {
    label: "Engineering",
    keywords: ["engineering", "engineer", "civil", "mechanical", "electrical", "mechatronic", "robotics", "aerospace", "construction engineer", "renewable energy"],
    subjects: [
      ["Mathematics Advanced", "priority", "Core preparation for engineering maths and physics units."],
      ["Physics", "priority", "Strong preparation for mechanics, circuits, structures and engineering fundamentals."],
      ["Mathematics Extension 1", "stretch", "A strong choice for competitive or maths-heavy engineering degrees."],
      ["Engineering Studies", "priority", "Directly relevant if your school offers it."],
      ["Chemistry", "useful", "Helpful for chemical, environmental, materials, biomedical and some civil pathways."],
      ["Software Engineering", "useful", "Useful for software, mechatronics, electrical and robotics pathways."],
      ["Design & Technology", "useful", "Useful for design process, prototyping and project work."]
    ]
  },
  {
    label: "Architecture and Built Environment",
    keywords: ["architecture", "architect", "built environment", "construction", "property", "planning", "interior", "landscape", "urban", "building designer"],
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
    subjects: [
      ["Visual Arts", "priority", "Strong fit for portfolio, visual thinking and design communication."],
      ["Design & Technology", "priority", "Good preparation for design process, product thinking and creative projects."],
      ["English Advanced", "useful", "Useful for concept writing, analysis and communication."],
      ["Drama", "useful", "Relevant for performance, screen, media and presentation confidence."],
      ["Music 1", "useful", "Relevant for music, performance and sound-focused creative pathways."],
      ["Enterprise Computing", "useful", "Useful for interactive design, games, web and digital media."],
      ["Software Engineering", "useful", "Helpful if the creative goal includes games, apps or creative technology."]
    ]
  },
  {
    label: "Education",
    keywords: ["education", "teaching", "teacher", "primary teacher", "secondary teacher", "early childhood", "mentor", "school"],
    subjects: [
      ["English Advanced", "priority", "Strong communication helps in most teaching pathways."],
      ["Mathematics Standard 2", "priority", "Useful for primary teaching and general numeracy expectations."],
      ["Society & Culture", "useful", "Helpful for understanding learners, communities and social contexts."],
      ["Community & Family Studies", "useful", "Relevant for child development, wellbeing and family contexts."],
      ["Biology", "useful", "Useful if you may teach science, HMS or health-related content."],
      ["Modern History", "useful", "Useful if you may teach humanities or HSIE subjects."],
      ["Visual Arts", "useful", "Useful if you may teach arts, primary or creative subjects."]
    ]
  },
  {
    label: "Science",
    keywords: ["science", "scientist", "research", "biology", "chemistry", "physics", "environment", "laboratory", "biotech", "mathematics", "statistics"],
    subjects: [
      ["Mathematics Advanced", "priority", "Keeps most science, statistics and research pathways open."],
      ["Chemistry", "priority", "Very useful for lab science, biomedical, environmental and health-related science."],
      ["Biology", "priority", "Strong for life science, psychology, health science and environmental paths."],
      ["Physics", "priority", "Strong for physical sciences, engineering-adjacent science and quantitative pathways."],
      ["Science Extension", "stretch", "Good if you want research-style science work and your school offers it."],
      ["Earth & Environmental Science", "useful", "Relevant for environmental, climate, geology and sustainability pathways."]
    ]
  },
  {
    label: "Food, Hospitality and Tourism",
    keywords: ["food", "cooking", "chef", "culinary", "hospitality", "tourism", "hotel", "events", "nutrition", "dietetics", "food science", "restaurant"],
    subjects: [
      ["Food Technology", "priority", "Directly relevant for food science, nutrition, hospitality and product development."],
      ["Hospitality Exam", "priority", "Useful if your school offers VET hospitality and you want practical industry skills."],
      ["Biology", "useful", "Helpful for nutrition, dietetics and health-linked food pathways."],
      ["Chemistry", "useful", "Helpful for food science, nutrition and product development."],
      ["Business Studies", "useful", "Useful for hospitality management, events and tourism business."],
      ["English Standard", "useful", "Communication matters in service, management and applied study."]
    ]
  },
  {
    label: "Sport and Exercise",
    keywords: ["sport", "sports", "exercise", "fitness", "coach", "athlete", "hms", "health and movement science", "pdhpe", "physiology", "strength conditioning"],
    subjects: [
      ["Health and Movement Science (HMS)", "priority", "Directly relevant for sport, health, exercise and coaching pathways."],
      ["Biology", "priority", "Strong preparation for anatomy, physiology and health science content."],
      ["Mathematics Standard 2", "useful", "Useful for data, coaching analysis and general university study."],
      ["Chemistry", "useful", "Helpful for exercise science, nutrition and health science pathways."],
      ["Physics", "useful", "Helpful for biomechanics and movement analysis."],
      ["Community & Family Studies", "useful", "Relevant for health, wellbeing and community contexts."]
    ]
  },
  {
    label: "Social Work and Community",
    keywords: ["social work", "counselling", "counseling", "community", "welfare", "youth", "support worker", "mental health", "human services", "case worker"],
    subjects: [
      ["English Advanced", "priority", "Useful for communication, case notes, reports and people-focused study."],
      ["Society & Culture", "priority", "Strong fit for communities, identity, social research and welfare topics."],
      ["Community & Family Studies", "priority", "Relevant for care, families, wellbeing and social support."],
      ["Legal Studies", "useful", "Helpful for rights, policy, welfare systems and justice-connected pathways."],
      ["Biology", "useful", "Useful where mental health, development or health content appears."],
      ["Health and Movement Science (HMS)", "useful", "Helpful for health, wellbeing and youth support interests."]
    ]
  }
];

const profileOptions = ["Auto detect", ...subjectProfiles.map((profile) => profile.label)];
const quickSearches = ["Software engineer", "Medicine", "Primary teacher", "Lawyer", "Civil engineering", "Nursing", "Architecture", "Psychology"];

subjectProfiles.forEach((profile) => {
  profile.cleanKeywords = profile.keywords.map(cleanSearchText);
});

const subjectAliases = [
  ["Any English course", ["any 2 units of english", "two units of english", "2 units of english", "any english"]],
  ["English Advanced", ["english advanced", "advanced english"]],
  ["English Standard", ["english standard", "standard english"]],
  ["English EALD", ["english eald", "english eal", "eald"]],
  ["Mathematics Standard 2", ["mathematics standard 2", "maths standard 2", "standard maths", "mathematics standard"]],
  ["Mathematics Advanced", ["mathematics advanced", "maths advanced", "advanced mathematics", "advanced maths"]],
  ["Mathematics Extension 1", ["mathematics extension 1", "maths extension 1", "extension 1 mathematics", "mx1"]],
  ["Mathematics Extension 2", ["mathematics extension 2", "maths extension 2", "extension 2 mathematics", "mx2"]],
  ["Physics", ["physics"]],
  ["Chemistry", ["chemistry"]],
  ["Biology", ["biology"]],
  ["Science Extension", ["science extension"]],
  ["Earth & Environmental Science", ["earth environmental science", "earth and environmental science", "environmental science"]],
  ["Enterprise Computing", ["enterprise computing", "entc", "computing", "information processes and technology", "information processing and technology", "ipt"]],
  ["Software Engineering", ["software engineering", "software", "software design and development", "sdd"]],
  ["Engineering Studies", ["engineering studies"]],
  ["Design & Technology", ["design technology", "design and technology"]],
  ["Visual Arts", ["visual arts", "visual art"]],
  ["Business Studies", ["business studies"]],
  ["Economics", ["economics"]],
  ["Legal Studies", ["legal studies"]],
  ["Modern History", ["modern history"]],
  ["Ancient History", ["ancient history"]],
  ["Society & Culture", ["society culture", "society and culture"]],
  ["Community & Family Studies", ["community family studies", "community and family studies", "cafs"]],
  ["Health and Movement Science (HMS)", ["health and movement science", "hms", "pdhpe", "pdh pe", "pdh and pe", "personal development health physical education"]],
  ["Food Technology", ["food technology"]],
  ["Hospitality Exam", ["hospitality"]],
  ["Drama", ["drama"]],
  ["Music 1", ["music 1", "music"]],
  ["Dance", ["dance"]],
  ["Textiles & Design", ["textiles design", "textiles and design"]]
];

render();

function render() {
  const query = helperState.query.trim();
  const matches = query ? subjectCourseMatches(query) : [];
  const profile = query ? detectedProfile(query, matches) : null;
  const plan = query ? buildSubjectPlan(profile, matches) : null;

  subjectHelperApp.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
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
    ${renderSubjectHelperProgress()}

    <main class="subject-main">
      <section class="hero subject-hero">
        <div>
          <h1>Subject helper</h1>
          <p>Search a degree or job, then get a practical Year 11 and Year 12 subject plan based on Sydney course patterns, UAC prerequisite text and assumed knowledge.</p>
        </div>
        <dl class="stats two">
          <div><dt>Course records</dt><dd>${number(allCourses.length)}</dd></div>
          <div><dt>HSC subjects</dt><dd>${number(hscSubjects.length)}</dd></div>
        </dl>
        <p class="data-note">
          This is a planning guide. It cannot replace your school adviser, UAC or the official university course page.
        </p>
      </section>

      <section class="panel subject-helper-panel">
        <div class="panel-head">
          <div>
            <h2>Search by degree or job</h2>
            <p>Try a course name, career, field or simple goal like software engineer, nursing, architecture or business.</p>
          </div>
          <span>${query ? `${number(matches.length)} course matches` : "Search first"}</span>
        </div>
        <form class="subject-search-form" data-form="subject-search">
          <label>${icon("search")}<input name="search" type="search" autocomplete="off" value="${escapeHtml(helperState.draft)}" placeholder="Example: software engineer, medicine, law, UX design" /></label>
          <label>
            <span>Area</span>
            <select name="profile">
              ${profileOptions.map((option) => `<option ${option === helperState.profile ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
            </select>
          </label>
          <button type="submit">Find subjects</button>
        </form>
        ${renderSubjectHelperProcessStrip("subject-search", "Finding subject plan")}
        <div class="quick-subject-searches" aria-label="Example searches">
          ${quickSearches.map((item) => `<button type="button" data-quick-search="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
        </div>
      </section>

      ${query ? renderSubjectResults(query, profile, plan, matches) : renderEmptyState()}

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>How to use this</h2>
            <p>Pick subjects that keep doors open, but do not choose a subject only because it scales well if you hate it or cannot perform in it.</p>
          </div>
        </div>
        <div class="subject-advice-grid">
          <article>
            <strong>Start with requirements</strong>
            <p>Prerequisites can block entry. Assumed knowledge usually does not block entry, but it can make first year harder.</p>
          </article>
          <article>
            <strong>Keep English in mind</strong>
            <p>ATAR eligibility needs English units. Choose the English level that gives you the strongest realistic result.</p>
          </article>
          <article>
            <strong>Balance fit and options</strong>
            <p>A strong plan usually has one English course, one maths level that suits your path, and two to four subjects linked to the degree or job.</p>
          </article>
        </div>
      </section>
    </main>
  `;

  bindEvents();
  requestAnimationFrame(scrollActiveNavIntoView);
}

function renderSubjectHelperProgress() {
  if (!helperState.processing) return "";
  return `<div class="app-progress is-active" aria-hidden="true"><div class="app-progress-track"></div></div>`;
}

function renderSubjectHelperProcessStrip(key, label) {
  if (helperState.processing !== key) return "";
  return `
    <div class="process-strip" role="status" aria-live="polite">
      <span>${escapeHtml(label)}</span>
      <span class="process-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  `;
}

function runSubjectHelperProcessing(key, action, delay = 240) {
  helperState.processing = key;
  render();
  window.setTimeout(() => {
    action();
    helperState.processing = "";
    render();
  }, delay);
}

function renderEmptyState() {
  return `
    <section class="panel subject-empty">
      <div>
        <h2>Tell it what you might want to do</h2>
        <p>No courses are shown until you search. This keeps the page light and avoids random recommendations.</p>
      </div>
      <div class="subject-empty-examples">
        ${quickSearches.slice(0, 6).map((item) => `<button type="button" data-quick-search="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}
      </div>
    </section>
  `;
}

function renderSubjectResults(query, profile, plan, matches) {
  const evidence = subjectRequirementSignals(matches);
  const topMatches = matches.slice(0, 8);
  const entrySummary = entryRequirementSummary(evidence);
  return `
    <section class="panel subject-plan-panel">
      <div class="subject-plan-summary">
        <div>
          <h2>${escapeHtml(profile.label)} subject plan</h2>
          <p>
            Search: <strong>${escapeHtml(query)}</strong>. This separates hard entry requirements from assumed knowledge and useful preparation.
          </p>
        </div>
        <div class="subject-confidence">
          <strong>${confidenceLabel(matches, evidence)}</strong>
          <span>${confidenceDetail(matches, evidence)}</span>
        </div>
      </div>

      ${renderEntrySnapshot(entrySummary)}

      ${renderPlanBoard(plan)}
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Course evidence</h2>
          <p>Expand a course to see whether UAC lists a subject as required, assumed knowledge or just useful preparation.</p>
        </div>
        <span>${number(topMatches.length)} shown</span>
      </div>
      <div class="subject-evidence-list">
        ${topMatches.length ? topMatches.map(renderCourseEvidence).join("") : `<p class="empty-note">No clear course matches. Try a broader search such as health, technology, business, teaching or design.</p>`}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Subject signals found</h2>
          <p>Required means it appears in a prerequisite field. Assumed means it helps, but usually does not block entry.</p>
        </div>
      </div>
      <div class="requirement-signal-grid">
        ${evidence.length ? evidence.slice(0, 10).map(renderSignal).join("") : `<p class="empty-note">The matched UAC records do not list many specific subject names. Use the suggested plan as preparation, then confirm each course page.</p>`}
      </div>
    </section>
  `;
}

function renderEntrySnapshot(summary) {
  return `
    <div class="entry-snapshot">
      <article class="${summary.required.length ? "has-required" : "no-required"}">
        <span>Entry blocker check</span>
        <strong>${summary.required.length ? compactSubjectListText(summary.required, 4) : "No blocking HSC subject found"}</strong>
        <p>${summary.required.length ? "These came from UAC prerequisite fields. If a target course lists one, you may not be eligible without it." : "The matched UAC records do not show a subject you must have for entry. Assumed knowledge still affects readiness."}</p>
      </article>
      <article>
        <span>Assumed knowledge</span>
        <strong>${summary.assumed.length ? compactSubjectListText(summary.assumed, 3) : "None clearly detected"}</strong>
        <p>Assumed knowledge is preparation. Missing it usually means extra work or a bridging course, not automatic rejection.</p>
      </article>
      <article>
        <span>Best move</span>
        <strong>${summary.required.length ? "Meet required first" : "Choose for fit and strength"}</strong>
        <p>Confirm the exact UAC or university course page, then pick subjects you can score well in and use well at uni.</p>
      </article>
    </div>
  `;
}

function renderPlanBoard(plan) {
  const extras = [...plan.useful, ...plan.stretch].slice(0, 8);
  if (plan.required.length) {
    return `
      <div class="subject-plan-grid">
        ${renderPlanGroup("Required to enter", plan.required, "Subjects found in UAC prerequisite fields. Treat these as must-have unless the official page says otherwise.")}
        ${renderPlanGroup("Strong preparation", plan.priority, "Best Year 11/12 picks for this direction.")}
        ${renderPlanGroup("Useful extras", extras, "Good backups or specialist options depending on your school.")}
      </div>
    `;
  }

  return `
    <div class="no-required-strip">
      <strong>No hard HSC subject prerequisite found in the matched records.</strong>
      <span>That means the subjects below are about preparation and fit, not automatic entry blocking. Always confirm the exact course page before choosing.</span>
    </div>
    <div class="subject-plan-grid no-required-board">
      ${renderPlanGroup("Strong preparation", plan.priority, "Best Year 11/12 picks for this direction.")}
      ${renderPlanGroup("Useful extras", extras, "Good backups or specialist options depending on your school.")}
    </div>
  `;
}

function renderPlanGroup(title, items, note, emptyNote = "No strong subjects in this group.") {
  return `
    <article class="subject-plan-group">
      <div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(note)}</p>
      </div>
      <div class="subject-recommendations">
        ${items.length ? items.map(renderSubjectCard).join("") : `<p class="empty-note">${escapeHtml(emptyNote)}</p>`}
      </div>
    </article>
  `;
}

function renderSubjectCard(item, index = 0) {
  const subject = subjectIndex.get(cleanSearchText(item.name));
  const scaled = subject ? `Break-even about ${breakEvenMark(subject)} / 100` : "Check availability at your school";
  const evidence = item.evidence ? evidenceLine(item.evidence) : "Recommended from the degree/job map";
  const badge = {
    required: "Must have",
    priority: "Strong pick",
    useful: "Useful",
    stretch: "Stretch"
  }[item.tier] || "Suggested";
  return `
    <article class="subject-card ${item.tier}" style="--item-delay:${Math.min(index, 8) * 24}ms">
      <div class="subject-card-title">
        <strong>${escapeHtml(item.name)}</strong>
        <em>${escapeHtml(badge)}</em>
      </div>
      <p>${escapeHtml(item.reason)}</p>
      <small>${escapeHtml(evidence)}</small>
      <span>${escapeHtml(scaled)}</span>
    </article>
  `;
}

function renderCourseEvidence(match, index = 0) {
  const course = match.course;
  const entry = courseRequirementProfile(course);
  const prereq = requirementText(entry.hardPrerequisiteText, "No specific HSC subject prerequisite found in the imported UAC record.");
  const assumed = requirementText(entry.assumedText, "No assumed knowledge listed in the imported UAC record.");
  const additional = requirementText(course.additionalCriteria, "No extra criteria listed in the imported UAC record.");
  return `
    <details class="subject-course-card" style="--item-delay:${Math.min(index, 8) * 24}ms">
      <summary>
        <span class="subject-course-title">
          <strong>${escapeHtml(course.name)}</strong>
          <small>${escapeHtml(course.university)} - ${escapeHtml(course.campus)} - ATAR ${escapeHtml(displayRank(course.atar))}</small>
        </span>
        <span class="course-entry-status ${escapeHtml(entry.kind)}">${escapeHtml(entry.status)}</span>
        <em>Expand</em>
      </summary>
      <div class="subject-course-detail">
        <div class="entry-rule ${escapeHtml(entry.kind)}">
          <span>Can I enter with any subjects?</span>
          <strong>${escapeHtml(entry.answer)}</strong>
          <p>${escapeHtml(entry.explanation)}</p>
        </div>
        <dl class="course-field-grid">
          <div><dt>Required subjects</dt><dd>${highlight(entry.requiredSubjects.length ? subjectListText(entry.requiredSubjects) : "No required HSC subject detected.")}</dd></div>
          <div><dt>Assumed knowledge</dt><dd>${highlight(assumed)}</dd></div>
          <div><dt>Other entry checks</dt><dd>${highlight(entry.otherChecks.length ? entry.otherChecks.join(", ") : additional)}</dd></div>
          <div><dt>Why it matched</dt><dd>${escapeHtml(match.reason)}</dd></div>
        </dl>
        <div class="subject-course-actions">
          <a href="${escapeHtml(course.uacUrl)}" target="_blank" rel="noreferrer">View UAC course ${icon("external")}</a>
          ${course.officialUrl ? `<a href="${escapeHtml(course.officialUrl)}" target="_blank" rel="noreferrer">University page ${icon("external")}</a>` : ""}
        </div>
      </div>
    </details>
  `;
}

function renderSignal(signal) {
  return `
    <article>
      <strong>${escapeHtml(signal.name)}</strong>
      <small>${number(signal.required)} required-entry mentions</small>
      <small>${number(signal.assumed)} assumed-knowledge mentions</small>
    </article>
  `;
}

function bindEvents() {
  subjectHelperApp.querySelector('[data-form="subject-search"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const draft = String(form.get("search") || "").trim();
    const profile = String(form.get("profile") || "Auto detect");
    helperState.draft = draft;
    helperState.profile = profile;
    runSubjectHelperProcessing("subject-search", () => {
      helperState.query = helperState.draft;
      syncUrl();
    });
  });

  subjectHelperApp.querySelectorAll("[data-quick-search]").forEach((button) => {
    button.addEventListener("click", () => {
      const draft = button.dataset.quickSearch || "";
      helperState.draft = draft;
      helperState.profile = "Auto detect";
      runSubjectHelperProcessing("subject-search", () => {
        helperState.query = helperState.draft;
        syncUrl();
      });
    });
  });
}

function scrollActiveNavIntoView() {
  subjectHelperApp.querySelector('.topnav [aria-current="page"]')?.scrollIntoView({
    block: "nearest",
    inline: "start"
  });
}

function syncUrl() {
  const url = new URL(window.location.href);
  if (helperState.query) url.searchParams.set("q", helperState.query);
  else url.searchParams.delete("q");
  if (helperState.profile && helperState.profile !== "Auto detect") url.searchParams.set("area", helperState.profile);
  else url.searchParams.delete("area");
  history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function detectedProfile(query, matches) {
  if (helperState.profile !== "Auto detect") {
    return subjectProfiles.find((profile) => profile.label === helperState.profile) || subjectProfiles[0];
  }

  const scores = queryProfileScores(query).map((entry) => ({
    profile: entry.profile,
    score: entry.score + matches.slice(0, 15).reduce((sum, match) => sum + profileCourseScore(match.course, entry.profile) * 0.06, 0)
  }));

  return scores.sort((a, b) => b.score - a.score)[0]?.profile || subjectProfiles[0];
}

function queryProfileScores(query) {
  const cleanQuery = cleanSearchText(query);
  return subjectProfiles.map((profile) => {
    let score = profile.keywords.reduce((sum, keyword) => {
      const cleanKeyword = cleanSearchText(keyword);
      if (cleanQuery === cleanKeyword) return sum + 90;
      if (cleanQuery.includes(cleanKeyword) || cleanKeyword.includes(cleanQuery)) return sum + 48;
      return sum + tokenise(cleanKeyword).filter((word) => tokenMatch(cleanQuery, word)).length * 9;
    }, 0);

    if (profile.label === "Engineering" && /software engineer|developer|coding|programming|computer|information technology|cyber|data/.test(cleanQuery)) {
      score *= 0.25;
    }

    if (profile.label === "Technology" && /software engineer|developer|coding|programming|computer|information technology|cyber|data|ai|artificial intelligence/.test(cleanQuery)) {
      score += 48;
    }

    return { profile, score };
  }).sort((a, b) => b.score - a.score);
}

function subjectCourseMatches(query) {
  const cleanQuery = cleanSearchText(query);
  if (!cleanQuery) return [];
  const queryWords = cleanQuery.split(" ").filter((word) => word.length > 1);
  const profileScores = queryProfileScores(cleanQuery);
  const matches = allCourses
    .map((course) => {
      const score = courseSearchScore(course, cleanQuery, queryWords, profileScores);
      return { course, score };
    })
    .filter((match) => match.score > 12)
    .map((match) => ({ ...match, reason: matchReason(match.course, cleanQuery, match.score) }))
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name));
  return diversifyProviders(matches).slice(0, 80);
}

function courseSearchScore(course, query, words, profileScores) {
  const fields = courseFields(course);
  let score = 0;

  if (fields.title.text === query) score += 900;
  if (fields.title.text.startsWith(query)) score += 560;
  if (fieldHas(fields.title, query)) score += 500;
  if (fieldHas(fields.area, query)) score += 280;
  if (fieldHas(fields.careers, query)) score += 260;
  if (fieldHas(fields.summary, query)) score += 90;
  if (fieldHas(fields.provider, query)) score += 60;
  score += words.filter((word) => fieldHas(fields.title, word)).length * 95;
  score += words.filter((word) => fieldHas(fields.area, word)).length * 52;
  score += words.filter((word) => fieldHas(fields.careers, word)).length * 42;
  score += words.filter((word) => fieldHas(fields.summary, word)).length * 16;

  const topProfileScore = profileScores[0]?.score || 0;
  for (const entry of profileScores) {
    if (!topProfileScore || entry.score < topProfileScore * 0.6) continue;
    score += profileCourseScore(course, entry.profile) * Math.min(1, entry.score / topProfileScore);
  }

  if (course.level === "undergraduate") score += 18;
  if (hasSpecificInfo(course.assumed) || hasSpecificInfo(course.prerequisites)) score += 10;
  return score;
}

function profileCourseScore(course, profile) {
  let cache = profileCourseScoreCache.get(course);
  if (!cache) {
    cache = new Map();
    profileCourseScoreCache.set(course, cache);
  }
  if (cache.has(profile.label)) return cache.get(profile.label);

  const fields = courseFields(course);
  const score = profile.cleanKeywords.reduce((sum, keyword) => {
    if (fieldHas(fields.title, keyword)) return sum + 110;
    if (fieldHas(fields.area, keyword)) return sum + 70;
    if (fieldHas(fields.careers, keyword)) return sum + 46;
    if (fieldHas(fields.summary, keyword)) return sum + 12;
    return sum;
  }, 0);
  cache.set(profile.label, score);
  return score;
}

function diversifyProviders(matches) {
  const providerSeen = new Map();
  return matches
    .map((match) => {
      const seen = providerSeen.get(match.course.providerId) || 0;
      providerSeen.set(match.course.providerId, seen + 1);
      return { ...match, score: match.score - Math.max(0, seen - 2) * 16 };
    })
    .sort((a, b) => b.score - a.score);
}

function matchReason(course, query, score) {
  const bits = [];
  if (phraseMatch(course.name, query)) bits.push("course title");
  if (phraseMatch(course.area, query)) bits.push("study area");
  if (phraseMatch(course.careers, query)) bits.push("career text");
  if (!bits.length && score > 0) bits.push("related course wording");
  return `Matched by ${bits.join(", ")}.`;
}

function buildSubjectPlan(profile, matches) {
  const signals = subjectRequirementSignals(matches);
  const byName = new Map();

  for (const [name, tier, reason] of profile.subjects) {
    addSubjectPlanItem(byName, { name, tier, reason, score: tierScore(tier) });
  }

  for (const signal of signals) {
    if (signal.name === "Any English course" && signal.required === 0) continue;
    const existing = byName.get(signal.name);
    const tier = signal.required > 0 ? "required" : existing?.tier || "useful";
    const reason = signal.required > 0
      ? "Matched UAC course records list this as a prerequisite subject."
      : "Matched UAC course records list this as assumed knowledge, so it is preparation rather than a hard entry rule.";
    addSubjectPlanItem(byName, {
      name: signal.name,
      tier,
      reason,
      score: signal.required * 70 + signal.assumed * 25,
      evidence: signal
    });
  }

  if (![...byName.keys()].some((name) => name.startsWith("English"))) {
    addSubjectPlanItem(byName, {
      name: "English Advanced",
      tier: "useful",
      reason: "English units are part of ATAR eligibility; this is a practical default if you are comfortable with essays.",
      score: 35
    });
  }

  const ordered = [...byName.values()].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    required: ordered.filter((item) => item.tier === "required").slice(0, 6),
    priority: ordered.filter((item) => item.tier === "priority").slice(0, 8),
    useful: ordered.filter((item) => item.tier === "useful").slice(0, 8),
    stretch: ordered.filter((item) => item.tier === "stretch").slice(0, 5)
  };
}

function addSubjectPlanItem(map, item) {
  const existing = map.get(item.name);
  if (!existing) {
    map.set(item.name, item);
    return;
  }
  existing.score += item.score;
  if (tierScore(item.tier) > tierScore(existing.tier)) existing.tier = item.tier;
  if (item.evidence) existing.evidence = item.evidence;
  if (!existing.reason.includes("matched course")) existing.reason = item.reason;
}

function tierScore(tier) {
  return { stretch: 28, useful: 40, priority: 62, required: 90 }[tier] || 30;
}

function subjectRequirementSignals(matches) {
  const signals = new Map();
  for (const match of matches.slice(0, 12)) {
    const profile = courseRequirementProfile(match.course);
    const requiredText = cleanSearchText(profile.hardPrerequisiteText);
    const assumedText = cleanSearchText(profile.assumedText);
    for (const [name, aliases] of subjectAliases) {
      const requiredHit = aliases.some((alias) => phraseMatch(requiredText, alias));
      const assumedHit = aliases.some((alias) => phraseMatch(assumedText, alias));
      if (!requiredHit && !assumedHit) continue;
      const signal = signals.get(name) || { name, required: 0, assumed: 0 };
      if (requiredHit) signal.required += 1;
      if (assumedHit) signal.assumed += 1;
      signals.set(name, signal);
    }
  }
  return [...signals.values()].sort((a, b) => (b.required * 3 + b.assumed) - (a.required * 3 + a.assumed) || a.name.localeCompare(b.name));
}

function entryRequirementSummary(evidence) {
  const assumed = evidence
    .filter((signal) => signal.assumed > 0 && signal.name !== "Any English course")
    .sort((a, b) => b.assumed - a.assumed || a.name.localeCompare(b.name))
    .map((signal) => signal.name);
  return {
    required: evidence.filter((signal) => signal.required > 0).map((signal) => signal.name),
    assumed
  };
}

function courseRequirementProfile(course) {
  const rawPrerequisite = cleanRequirementText(course.prerequisites);
  const rawAssumed = cleanRequirementText(course.assumed);
  const rawAdditional = cleanRequirementText(course.additionalCriteria);
  const hardPrerequisiteText = hardPrerequisiteOnly(rawPrerequisite);
  const assumedText = assumedKnowledgeText(rawPrerequisite, rawAssumed);
  const requiredSubjects = extractSubjectNames(hardPrerequisiteText);
  const assumedSubjects = extractSubjectNames(assumedText);
  const otherChecks = entryChecks(rawPrerequisite, rawAdditional);

  if (requiredSubjects.length) {
    return {
      kind: "required",
      status: `Needs ${subjectListText(requiredSubjects)}`,
      answer: "No, not safely.",
      explanation: "This imported UAC record lists a subject in the prerequisite field, so treat it as required until the official page says otherwise.",
      hardPrerequisiteText,
      assumedText,
      requiredSubjects,
      assumedSubjects,
      otherChecks
    };
  }

  if (hardPrerequisiteText) {
    return {
      kind: "check",
      status: "Check entry rule",
      answer: "Maybe.",
      explanation: "UAC lists an entry rule, but this helper could not turn it into a clear HSC subject name. Open the official page before relying on it.",
      hardPrerequisiteText,
      assumedText,
      requiredSubjects,
      assumedSubjects,
      otherChecks
    };
  }

  return {
    kind: "open",
    status: "No required subject",
    answer: "Usually yes.",
    explanation: "The imported UAC record does not show a specific HSC subject prerequisite. Assumed knowledge can still matter for difficulty or bridging.",
    hardPrerequisiteText: "",
    assumedText,
    requiredSubjects,
    assumedSubjects,
    otherChecks
  };
}

function hardPrerequisiteOnly(text) {
  if (!hasSpecificInfo(text) || isGenericEntryText(text)) return "";
  if (/assumed knowledge/i.test(text)) return "";
  return text;
}

function assumedKnowledgeText(prerequisiteText, assumedText) {
  const parts = [];
  if (hasSpecificInfo(assumedText) && !/^not listed/i.test(assumedText)) parts.push(assumedText);
  if (/assumed knowledge/i.test(prerequisiteText)) parts.push(prerequisiteText.replace(/^assumed knowledge:\s*/i, ""));
  return uniqueValues(parts).join(" ");
}

function entryChecks(prerequisiteText, additionalText) {
  const combined = `${prerequisiteText} ${additionalText}`.toLowerCase();
  const checks = [];
  if (/portfolio/.test(combined)) checks.push("Portfolio may be required");
  if (/interview|screening/.test(combined)) checks.push("Interview or screening may apply");
  if (/audition/.test(combined)) checks.push("Audition may be required");
  if (/questionnaire/.test(combined)) checks.push("Questionnaire may be required");
  if (/working with children|wwcc/.test(combined)) checks.push("Working With Children Check may be required");
  if (/registration|ahpra/.test(combined)) checks.push("Registration or professional check may apply");
  return uniqueValues(checks);
}

function isGenericEntryText(text) {
  const clean = cleanSearchText(text);
  return !clean
    || clean === "not listed by uac"
    || clean === "not listed"
    || /read more about admission criteria/.test(clean)
    || /refer to .*general admission criteria/.test(clean)
    || /general admission criteria/.test(clean)
    || /do not have an atar requirement/.test(clean)
    || /current school leavers and non current school leavers/.test(clean);
}

function extractSubjectNames(text) {
  const clean = cleanSearchText(text);
  if (!clean) return [];
  return subjectAliases
    .filter(([, aliases]) => aliases.some((alias) => phraseMatch(clean, alias)))
    .map(([name]) => name);
}

function evidenceLine(signal) {
  const parts = [];
  if (signal.required) parts.push(`${number(signal.required)} ${plural(signal.required, "course")} list it as required`);
  if (signal.assumed) parts.push(`${number(signal.assumed)} ${plural(signal.assumed, "course")} list it as assumed knowledge`);
  return parts.join(" - ") || "Recommended from the degree/job map";
}

function subjectListText(subjects) {
  const list = [...new Set(subjects)].filter(Boolean);
  if (list.length <= 2) return list.join(" and ");
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}

function compactSubjectListText(subjects, limit = 4) {
  const list = [...new Set(subjects)].filter(Boolean);
  if (list.length <= limit) return subjectListText(list);
  return `${subjectListText(list.slice(0, limit))} + ${list.length - limit} more`;
}

function plural(count, singular) {
  return count === 1 ? singular : `${singular}s`;
}

function cleanRequirementText(value) {
  return decodeHtmlEntities(value || "").replace(/\s+/g, " ").trim();
}

function confidenceLabel(matches, evidence) {
  if (matches.length >= 12 && evidence.length >= 3) return "Good evidence";
  if (matches.length >= 5) return "Moderate evidence";
  return "Broad guidance";
}

function confidenceDetail(matches, evidence) {
  if (matches.length >= 12 && evidence.length >= 3) return "Multiple matching courses and subject signals found.";
  if (matches.length >= 5) return "Enough course matches to guide planning, but still check official pages.";
  return "The search is narrow, so treat this as a starting point.";
}

function requirementText(value, fallback) {
  const text = decodeHtmlEntities(value || "").replace(/\s+/g, " ").trim();
  if (!hasSpecificInfo(text) || /^read more about admission criteria/i.test(text) || /^refer to .*admission criteria/i.test(text)) return fallback;
  return text;
}

function breakEvenMark(subject) {
  const meanHsc = Number(subject.hscMean);
  const meanScaled = Number(subject.scaledMean);
  const sdHsc = Number(subject.hscSd);
  const sdScaled = Number(subject.scaledSd);
  if (!Number.isFinite(meanHsc) || !Number.isFinite(meanScaled) || !Number.isFinite(sdHsc) || !Number.isFinite(sdScaled) || sdScaled === 0) {
    return "not enough data";
  }
  const breakEven = meanHsc + ((25 - meanScaled) / sdScaled) * sdHsc;
  const outOf = subject.units === 1 ? 50 : 100;
  return Math.max(0, Math.min(outOf, subject.units === 1 ? breakEven : breakEven * 2)).toFixed(1);
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

function highlight(value) {
  const glossary = {
    prerequisites: "Requirements that must be met before entry.",
    "assumed knowledge": "Knowledge expected before starting. It usually does not block entry, but it can affect difficulty.",
    ATAR: "Australian Tertiary Admission Rank.",
    UAC: "Universities Admissions Centre."
  };
  const words = Object.keys(glossary).sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return escapeHtml(normaliseSubjectDisplay(value)).replace(new RegExp(`\\b(${words})\\b`, "gi"), (match) => {
    const key = Object.keys(glossary).find((item) => item.toLowerCase() === match.toLowerCase());
    return `<span class="term" tabindex="0" data-tip="${escapeHtml(glossary[key])}">${escapeHtml(match)}</span>`;
  });
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
