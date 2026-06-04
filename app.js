const app = document.querySelector("#app");
const importedCourses = window.uacCourses || [];
const dedupedImport = collapseDuplicateCourses(importedCourses);
const allCourses = dedupedImport.courses;
const duplicateCourseMap = dedupedImport.redirects;
const providerCourseCounts = allCourses.reduce((counts, course) => {
  counts.set(course.providerId, (counts.get(course.providerId) || 0) + 1);
  return counts;
}, new Map());
const allProviders = (window.uacProviders || []).map((provider) => ({
  ...provider,
  courseCount: providerCourseCounts.get(provider.id) || 0
}));
const meta = window.uacImportMeta || {};
const courseTextCache = new WeakMap();
const primaryCourseTextCache = new WeakMap();
const topicScoreCache = new WeakMap();

const levelLabels = {
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  international: "International",
  online: "Online"
};

const subjectOptions = [
  "Mathematics Standard 2",
  "Mathematics Advanced",
  "Mathematics Extension 1",
  "English Advanced",
  "English Standard",
  "Physics",
  "Chemistry",
  "Biology",
  "Software Engineering",
  "Engineering Studies",
  "Business Studies",
  "Economics",
  "Legal Studies",
  "Design and Technology",
  "Visual Arts",
  "Health and Movement Science (HMS)",
  "Community and Family Studies",
  "Society and Culture",
  "Modern History"
];

const topicOptions = [
  { label: "All interests", keywords: [] },
  { label: "Technology", keywords: ["technology", "computer", "software", "cyber", "data", "information technology", "it", "artificial intelligence", "game", "coding", "programming", "developer", "web", "app", "enterprise computing", "information systems"] },
  { label: "Medicine and Health", keywords: ["medicine", "medical", "health", "nursing", "clinical", "psychology", "nutrition", "physiotherapy", "pharmacy", "biomedical"] },
  { label: "Engineering", keywords: ["engineering", "civil", "mechanical", "electrical", "mechatronic", "construction", "robotics"] },
  { label: "Architecture and Built Environment", keywords: ["architecture", "architectural", "built environment", "construction", "property", "planning", "interior architecture", "landscape", "urban", "building"] },
  { label: "Business", keywords: ["business", "commerce", "finance", "accounting", "marketing", "management", "economics", "analytics"] },
  { label: "Food, Hospitality and Tourism", keywords: ["cooking", "cook", "chef", "culinary", "food", "baking", "nutrition", "hospitality", "tourism", "event management", "events", "hotel", "restaurant", "dietetics", "food science", "food technology", "food innovation"] },
  { label: "Law and Justice", keywords: ["law", "legal", "justice", "criminology", "policy"] },
  { label: "Creative Arts and Design", keywords: ["design", "creative", "animation", "music", "screen", "media", "arts", "visual", "game"] },
  { label: "Education", keywords: ["education", "teaching", "teacher", "early childhood", "primary", "secondary"] },
  { label: "Sport and Exercise", keywords: ["sport", "sports", "exercise", "fitness", "coaching", "hms", "health and movement science", "pdhpe", "health promotion", "physical education", "athlete"] },
  { label: "Social Work and Community", keywords: ["social work", "community", "counselling", "counseling", "human services", "youth", "welfare", "support work", "mental health"] },
  { label: "Science", keywords: ["science", "biology", "chemistry", "physics", "environment", "mathematics", "research"] }
];

const providerQuality = {
  Technology: {
    UNSW: { score: 97, note: "Very strong computing and employer outcomes" },
    UTS: { score: 93, note: "Strong industry focus and technology reputation" },
    USYD: { score: 91, note: "High prestige and computer science reputation" },
    MQ: { score: 82, note: "Good computing and analytics options" },
    WS: { score: 74, note: "Large Sydney course range and practical access" }
  },
  "Medicine and Health": {
    USYD: { score: 98, note: "Very high health and medicine reputation" },
    UNSW: { score: 96, note: "Strong medicine and biomedical reputation" },
    WS: { score: 87, note: "Major Western Sydney clinical and health presence" },
    UTS: { score: 84, note: "Strong nursing and health sciences options" },
    MQ: { score: 80, note: "Clinical science and health pathways" }
  },
  Engineering: {
    UNSW: { score: 98, note: "Top-tier engineering reputation and employment strength" },
    USYD: { score: 93, note: "High prestige and broad engineering strength" },
    UTS: { score: 88, note: "Practical and industry-linked engineering" },
    WS: { score: 76, note: "Accessible engineering pathways in Western Sydney" },
    MQ: { score: 72, note: "Relevant engineering and technology options" }
  },
  "Architecture and Built Environment": {
    UNSW: { score: 93, note: "Strong built environment and design reputation" },
    USYD: { score: 91, note: "High prestige architecture and planning pathways" },
    UTS: { score: 86, note: "Industry-linked built environment options" },
    WS: { score: 76, note: "Accessible construction and planning pathways" }
  },
  Business: {
    UNSW: { score: 97, note: "Very strong commerce and employment profile" },
    USYD: { score: 94, note: "High prestige business and economics reputation" },
    UTS: { score: 86, note: "Practical city-campus business options" },
    MQ: { score: 84, note: "Strong business, finance and analytics options" },
    ICMS: { score: 74, note: "Industry-focused management provider" }
  },
  "Food, Hospitality and Tourism": {
    WS: { score: 82, note: "Strong food science, tourism and applied industry options" },
    ACU: { score: 80, note: "Strong nutrition and food-health pathways" },
    ICMS: { score: 78, note: "Hospitality and tourism industry focus" },
    UTS: { score: 72, note: "City access for related business and events pathways" }
  },
  "Law and Justice": {
    USYD: { score: 98, note: "Highest prestige law pathway in Sydney" },
    UNSW: { score: 95, note: "Very strong law and social justice reputation" },
    UTS: { score: 86, note: "Practical city-campus law option" },
    MQ: { score: 83, note: "Established law program" },
    WS: { score: 75, note: "Broad law and criminology access" }
  },
  "Creative Arts and Design": {
    UNSW: { score: 91, note: "Strong art and design campus reputation" },
    UTS: { score: 88, note: "Strong design and creative technology profile" },
    NAS: { score: 86, note: "Specialist fine-art institution" },
    AIT: { score: 78, note: "Specialist interactive technology and animation" },
    JMC: { score: 76, note: "Specialist creative industries provider" }
  },
  Education: {
    USYD: { score: 94, note: "High prestige education pathway" },
    ACU: { score: 86, note: "Large education and teaching provider" },
    WS: { score: 82, note: "Strong access across Western Sydney" },
    UTS: { score: 76, note: "Relevant education-related pathways" }
  },
  "Sport and Exercise": {
    ACU: { score: 85, note: "Strong sport, exercise and health-linked options" },
    WS: { score: 80, note: "Broad sport and health options in Western Sydney" },
    ACPE: { score: 78, note: "Specialist physical education and sport provider" },
    UTS: { score: 74, note: "Relevant health and sport science pathways" }
  },
  "Social Work and Community": {
    ACU: { score: 86, note: "Strong social work, counselling and community pathways" },
    WS: { score: 84, note: "Major Western Sydney social work and community presence" },
    ACAP: { score: 78, note: "Specialist counselling and psychology provider" },
    USYD: { score: 78, note: "High prestige social science options" }
  },
  Science: {
    USYD: { score: 96, note: "High prestige and broad science strength" },
    UNSW: { score: 94, note: "Strong science and research reputation" },
    UTS: { score: 83, note: "Applied science and analytics pathways" },
    MQ: { score: 81, note: "Strong science and clinical science options" },
    WS: { score: 74, note: "Broad science access across Sydney" }
  }
};

const rankCodeMeanings = {
  NC: "New course; no published selection-rank profile yet.",
  NO: "No offers were made on ATAR alone.",
  NR: "No reportable selection-rank profile.",
  NP: "Not provided by the institution.",
  NS: "No semester 1 offers.",
  NN: "Selection-rank profile unavailable.",
  "<5": "Fewer than five ATAR-based offers were made."
};

const glossary = {
  ATAR: "Australian Tertiary Admission Rank. A rank used for university admission.",
  "selection rank": "The rank used for offers. It may include ATAR adjustment factors.",
  prerequisites: "Requirements that must be met before entry.",
  "assumed knowledge": "Knowledge expected before starting the course.",
  CSP: "Commonwealth Supported Place. The government subsidises part of the course fee.",
  UAC: "Universities Admissions Centre, the NSW/ACT admissions and course-search service."
};

const searchAliases = {
  medicine: ["medicine", "medical", "doctor of medicine", "medical studies"],
  doctor: ["medicine", "medical", "doctor of medicine"],
  medical: ["medical", "medicine"],
  law: ["law", "laws", "legal"],
  laws: ["law", "laws", "legal"],
  ai: ["ai", "artificial intelligence"],
  "artificial intelligence": ["artificial intelligence", "ai", "machine learning"],
  it: ["it", "information technology"],
  coding: ["coding", "programming", "software", "computer", "information technology"],
  programming: ["programming", "coding", "software", "computer", "information technology"],
  "computer science": ["computer science", "computing", "software", "information technology"],
  cybersecurity: ["cybersecurity", "cyber security", "cyber", "information security"],
  "cyber security": ["cybersecurity", "cyber security", "cyber", "information security"],
  "data science": ["data science", "data analytics", "analytics", "statistics"],
  "game development": ["game development", "games", "game design", "programming"],
  psychology: ["psychology", "psychological science", "counselling", "mental health"],
  counselling: ["counselling", "counseling", "psychology", "mental health"],
  architecture: ["architecture", "architectural", "built environment", "planning"],
  construction: ["construction", "building", "built environment", "property"],
  sport: ["sport", "sports", "exercise", "fitness", "pdhpe"],
  exercise: ["exercise", "sport", "sports", "fitness", "pdhpe"],
  food: ["food", "nutrition", "culinary", "hospitality", "food science"],
  cooking: ["cooking", "food", "culinary", "nutrition", "hospitality"],
  hospitality: ["hospitality", "hotel", "tourism", "events"],
  tourism: ["tourism", "hospitality", "events", "travel"],
  teaching: ["teaching", "teacher", "education"],
  nursing: ["nursing", "nurse", "health"],
  social: ["social work", "community", "human services", "welfare"],
  "social work": ["social work", "community", "human services", "welfare"]
};

const broadTopicQueries = new Set([
  "technology",
  "coding",
  "programming",
  "data",
  "cyber",
  "engineering",
  "architecture",
  "construction",
  "business",
  "food",
  "hospitality",
  "tourism",
  "health",
  "medicine",
  "sport",
  "exercise",
  "social work",
  "community",
  "creative arts",
  "design",
  "education",
  "science"
]);

const storageKeys = {
  saved: "sydneyCourseFinder.savedCourses",
  compare: "sydneyCourseFinder.compareCourses"
};

const pathwayLinks = [
  {
    title: "Educational Access Scheme",
    text: "For students whose education was affected by long-term disadvantage. It can increase selection rank for some courses.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes"
  },
  {
    title: "Schools Recommendation Scheme",
    text: "Early-offer pathway using criteria other than, or in addition to, ATAR.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes/how-to-apply"
  },
  {
    title: "Selection-rank adjustments",
    text: "Subject, equity, location or other adjustments may lift your selection rank for specific courses.",
    url: "https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/"
  },
  {
    title: "UAC course preferences",
    text: "Use preferences strategically: dream course first, then realistic related courses and pathways.",
    url: "https://www.uac.edu.au/future-applicants/how-to-apply-for-uni/selecting-your-course-preferences/"
  },
  {
    title: "UTS College",
    text: "Diploma pathway options into UTS, including IT, engineering, business, science, design and communication.",
    url: "https://www.uts.edu.au/for-students/admissions-entry/pathways/uts-college"
  },
  {
    title: "UNSW College",
    text: "Diploma pathway programs for students who do not receive direct entry into some UNSW degrees.",
    url: "https://www.unswcollege.edu.au/diplomas"
  },
  {
    title: "Western Sydney pathways",
    text: "Search The College and VET-to-university pathways into Western Sydney University degrees.",
    url: "https://www.westernsydney.edu.au/tertiary-education-pathways-and-partnerships/pathways-available"
  },
  {
    title: "TAFE NSW pathways",
    text: "Vocational study and credit-transfer pathways can lead into university study for eligible students.",
    url: "https://www.tafensw.edu.au/study/pathways"
  }
];

const askStarterPrompts = [
  "How do ATAR adjustment factors work?",
  "What if my ATAR is lower than the course?",
  "Can I get extra points for my subjects?",
  "Show me coding courses around 75 ATAR"
];

const advisorQuestions = [
  {
    key: "atar",
    label: "Approximate ATAR",
    type: "number",
    placeholder: "Example: 72"
  },
  {
    key: "subjects",
    label: "Best or favourite HSC subjects",
    type: "text",
    placeholder: "Example: Maths Advanced, Physics, Biology, Business Studies"
  },
  {
    key: "passions",
    label: "What topics are you naturally interested in?",
    type: "text",
    placeholder: "Example: coding, medicine, justice, design, business, sport"
  },
  {
    key: "strengths",
    label: "What are you good at?",
    type: "select",
    options: ["Problem solving", "Helping people", "Writing and arguing", "Creative work", "Leadership", "Hands-on practical work", "Research and detail"]
  },
  {
    key: "workStyle",
    label: "What kind of work sounds best?",
    type: "select",
    options: ["Office and projects", "Clinical or care work", "Court, policy or advocacy", "Creative studio work", "Teaching and mentoring", "Lab or field work", "Business and clients"]
  },
  {
    key: "careerPriority",
    label: "Most important outcome",
    type: "select",
    options: ["High employability", "High income potential", "Prestige", "Helping people", "Creative freedom", "Flexible pathway", "Lower ATAR risk"]
  },
  {
    key: "studyMode",
    label: "Preferred study mode",
    type: "select",
    options: ["Any mode", "On campus", "Online", "Full-time", "Part-time"]
  },
  {
    key: "campus",
    label: "Campus preference",
    type: "select",
    options: ["Any Sydney campus", "City / inner Sydney", "Western Sydney", "North Sydney / Macquarie", "Online"]
  },
  {
    key: "avoid",
    label: "Anything you want to avoid?",
    type: "text",
    placeholder: "Example: too much maths, long commute, science labs, public speaking"
  },
  {
    key: "pathways",
    label: "Are you open to pathways if direct entry is hard?",
    type: "select",
    options: ["Yes", "Maybe", "No"]
  }
];

const advisorDefaults = Object.fromEntries(advisorQuestions.map((question) => [question.key, ""]));

const state = {
  draft: "",
  query: "",
  level: "All levels",
  provider: "All providers",
  mode: "All modes",
  campus: "All campuses",
  visible: 24,
  atar: 75,
  matcherProvider: "All providers",
  matcherSubjects: [],
  matcherTopic: "All interests",
  matcherRun: false,
  providerTopic: "Technology",
  savedIds: readIdList(storageKeys.saved),
  compareIds: readIdList(storageKeys.compare),
  openCourseIds: new Set(),
  askOpen: window.location.hash === "#ask",
  askMessages: [{
    role: "assistant",
    text: "Ask me about ATAR adjustments, pathways, prerequisites, course search, saving, comparing, or choosing between Sydney uni options. I answer from this site data plus UAC-style rules, and I will say when something needs official confirmation."
  }],
  advisor: { ...advisorDefaults, atar: "75", pathways: "Maybe" },
  advisorRun: false,
  advisorChat: []
};

const levels = ["All levels", ...Object.keys(levelLabels).filter((level) => allCourses.some((course) => course.level === level)).map((level) => levelLabels[level])];
const providers = ["All providers", ...allProviders.map((provider) => provider.name).sort()];
const rankedProviders = [...allProviders].sort((a, b) => providerOverallScore(b) - providerOverallScore(a) || a.name.localeCompare(b.name));
const courseById = new Map(allCourses.map((course) => [course.id, course]));
const duplicateRowsHidden = Number(meta.duplicateRowsRemoved ?? importedCourses.length - allCourses.length);
const showLevelFilter = levels.length > 2;
const modes = ["All modes", ...new Set(allCourses.flatMap((course) => course.modes || []))].sort((a, b) =>
  a.startsWith("All") ? -1 : b.startsWith("All") ? 1 : a.localeCompare(b)
);
const campuses = ["All campuses", ...new Set(allCourses.map((course) => course.campus).filter(Boolean))].sort((a, b) =>
  a.startsWith("All") ? -1 : b.startsWith("All") ? 1 : a.localeCompare(b)
);

const infoSummary = {
  atar: allCourses.filter((course) => numericRank(course.atar) !== null).length,
  prerequisites: allCourses.filter((course) => hasSpecificInfo(course.prerequisites)).length,
  assumed: allCourses.filter((course) => hasSpecificInfo(course.assumed)).length,
  fees: allCourses.filter((course) => hasSpecificInfo(course.fees)).length
};

function render() {
  const results = filteredCourses();
  const savedCourses = savedCourseList();
  const compareCourses = compareCourseList();
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="#courses" ${navCurrent("#courses")}>Courses</a>
        <a href="#atar" ${navCurrent("#atar")}>ATAR match</a>
        <a href="./atar-calculator.html">ATAR calculator</a>
        <a href="./subject-helper.html">Subject helper</a>
        <a href="./advisor.html">Course helper</a>
        <button class="nav-button" type="button" data-action="open-ask">Ask?</button>
        <a href="#saved" ${navCurrent("#saved")}>Saved ${state.savedIds.length ? `(${state.savedIds.length})` : ""}</a>
        <a href="#providers" ${navCurrent("#providers")}>Universities</a>
        <a href="#faq" ${navCurrent("#faq")}>FAQ</a>
      </nav>
    </header>

    <main>
      <section class="hero">
        <div>
          <h1>Sydney course search</h1>
          <p>Search UAC undergraduate course records linked to Sydney campus or Sydney-location study options. Expand a result to see entry information.</p>
        </div>
        <dl class="stats two">
          <div><dt>Course records</dt><dd>${number(allCourses.length)}</dd></div>
          <div><dt>Providers</dt><dd>${number(meta.uniqueProviders || allProviders.length)}</dd></div>
        </dl>
        <p class="data-note">
          UAC data imported ${escapeHtml((meta.importedAt || "").slice(0, 10) || "today")}.
          ${duplicateRowsHidden ? `${number(duplicateRowsHidden)} duplicate category rows hidden.` : "No duplicate course records shown."}
          ${number(infoSummary.atar)} numeric ATAR profiles, ${number(infoSummary.prerequisites)} prerequisite entries,
          ${number(infoSummary.assumed)} assumed-knowledge entries.
        </p>
      </section>

      <section id="courses" class="panel">
        <div class="panel-head">
          <div>
            <h2>Course Search</h2>
            <p>Search by course, career, field, provider or campus. Results only update when you press Search.</p>
          </div>
          <span>${state.query ? `${number(results.length)} results` : "Search first"}</span>
        </div>
        <form class="search-form" data-form="search">
          <label>${icon("search")}<input name="search" type="search" autocomplete="off" value="${escapeHtml(state.draft)}" placeholder="Example: Artificial Intelligence, Medicine, Law, Nursing" /></label>
          <button type="submit">Search</button>
        </form>
        <div class="filters">
          ${showLevelFilter ? select("level", "Level", levels, state.level) : ""}
          ${select("provider", "Provider", providers, state.provider)}
          ${select("campus", "Campus", campuses, state.campus)}
          ${select("mode", "Mode", modes, state.mode)}
          <button class="clear-btn" type="button" data-action="clear">Clear</button>
        </div>
        <div class="course-list">
          ${state.query ? results.slice(0, state.visible).map((course) => renderCourse(course)).join("") : `<p class="empty-note">Search a course, career, field or university to see results.</p>`}
          ${state.query && !results.length ? `<p class="empty-note">No courses found. Try a broader keyword like technology, health, business, law or design.</p>` : ""}
          ${results.length > state.visible ? `<button class="load-more" type="button" data-action="more">Show more</button>` : ""}
        </div>
      </section>

      <section id="atar" class="panel">
        <div class="panel-head">
          <div>
            <h2>ATAR Match</h2>
            <p>Optional subjects and interests help rank the results. ATAR matching only uses courses with a numeric UAC profile.</p>
          </div>
          <div class="panel-actions">
            <a class="help-link" href="./atar-calculator.html">ATAR calculator</a>
            <a class="help-link" href="./advisor.html?atar=${encodeURIComponent(state.atar)}">Need help?</a>
            <span>${term("selection rank")}</span>
          </div>
        </div>
        <div class="atar-controls">
          <label>
            <span>Approximate ATAR</span>
            <div class="atar-inputs">
              <input type="range" min="30" max="99.95" step="0.05" value="${state.atar}" data-action="atar-range" />
              <input type="number" min="30" max="99.95" step="0.05" value="${state.atar}" data-action="atar-number" />
            </div>
            <small id="atarValue">${Number(state.atar).toFixed(2)}</small>
          </label>
          ${select("matcherProvider", "Provider", providers, state.matcherProvider)}
          ${select("matcherTopic", "Interest topic", topicOptions.map((topic) => topic.label), state.matcherTopic)}
          <label>
            <span>Subjects</span>
            <div class="subject-box">
              ${state.matcherSubjects.map((subject) => `<button type="button" class="chip" data-remove-subject="${escapeHtml(subject)}">${escapeHtml(subject)} x</button>`).join("")}
              <select data-action="add-subject">
                <option value="">Add subject</option>
                ${subjectOptions.filter((subject) => !state.matcherSubjects.includes(subject)).map((subject) => `<option>${escapeHtml(subject)}</option>`).join("")}
              </select>
            </div>
          </label>
          <button type="button" class="match-btn" data-action="run-atar">Find matches</button>
        </div>
        <div class="course-list compact">
          ${state.matcherRun ? renderAtarResults() : `<p class="empty-note">Enter an ATAR estimate, choose optional preferences, then run the matcher.</p>`}
        </div>
      </section>

      <section id="saved" class="panel">
        <div class="panel-head">
          <div>
            <h2>Saved Library</h2>
            <p>Saved courses stay in this browser. Add courses to compare their entry details side by side.</p>
          </div>
          <span>${number(savedCourses.length)} saved</span>
        </div>
        ${renderCompareLibrary(compareCourses)}
        <div class="saved-actions">
          ${savedCourses.length ? `<button class="clear-btn" type="button" data-action="clear-saved">Clear saved</button>` : ""}
          ${compareCourses.length ? `<button class="clear-btn" type="button" data-action="clear-compare">Clear compare</button>` : ""}
        </div>
        <div class="course-list compact">
          ${savedCourses.length ? savedCourses.map((course) => renderCourse(course)).join("") : renderSavedEmpty()}
        </div>
      </section>

      <section id="providers" class="panel">
        <div class="panel-head">
          <div>
            <h2>Universities and Providers</h2>
            <p>Top 3 uses a local profile score based on field strength, broad prestige, employer reputation and Sydney course availability. It is guidance, not an official ranking.</p>
          </div>
          <span>${allProviders.length} providers</span>
        </div>
        <div class="top-provider-block">
          <div class="top-provider-head">
            <div>
              <h3>Top 3 by study area</h3>
              <p>Quality-weighted ranking, not course-count ranking.</p>
            </div>
            ${select("providerTopic", "Area", topicOptions.filter((topic) => topic.label !== "All interests").map((topic) => topic.label), state.providerTopic)}
          </div>
          <div class="top-provider-grid">${renderTopProviders()}</div>
          <p class="rating-note">Profile scores combine the field-specific quality list in this app with provider course availability. Use them as a comparison shortcut, then confirm with UAC, QILT and each university page.</p>
        </div>
        <div class="provider-grid">${rankedProviders.map(renderProvider).join("")}</div>
      </section>

      <section id="faq" class="panel">
        <div class="panel-head">
          <div>
            <h2>HSC and Uni FAQ</h2>
            <p>Quick factors to consider before choosing a course or university.</p>
          </div>
        </div>
        <div class="faq-list">${renderFaq()}</div>
      </section>
    </main>
    ${renderAskDrawer()}
  `;
  bindEvents();
  scheduleHashScroll();
}

function navCurrent(targetHash) {
  const hash = window.location.hash || "#courses";
  return hash === targetHash ? 'aria-current="page"' : "";
}

function filteredCourses() {
  const query = normalise(state.query);
  if (!query) return [];
  return allCourses
    .filter((course) => {
      const queryMatch = !query || courseSearchMatch(course, query);
      const levelMatch = state.level === "All levels" || courseLevels(course).some((level) => levelLabels[level] === state.level);
      const providerMatch = state.provider === "All providers" || course.university === state.provider;
      const campusMatch = state.campus === "All campuses" || course.campus === state.campus;
      const modeMatch = state.mode === "All modes" || (course.modes || []).includes(state.mode);
      return queryMatch && levelMatch && providerMatch && campusMatch && modeMatch;
    })
    .map((course) => ({ course, score: searchScore(course, query) }))
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .map((entry) => entry.course);
}

function renderCourse(course, matchLine = "") {
  const saved = state.savedIds.includes(course.id);
  const comparing = state.compareIds.includes(course.id);
  const open = state.openCourseIds.has(course.id);
  return `
    <details class="course-item" data-course-id="${escapeHtml(course.id)}" ${open ? "open" : ""}>
      <summary>
        <img src="${escapeHtml(course.providerLogo)}" alt="${escapeHtml(course.university)} logo" loading="lazy" />
        <span class="course-summary">
          <strong>${highlight(course.name)}</strong>
          <small>${escapeHtml(course.university)} - ${escapeHtml(course.campus)} - Code ${escapeHtml(course.courseCode)}</small>
          <em>${escapeHtml(levelDisplay(course))} - ${term("ATAR")}: ${escapeHtml(displayRank(course.atar))}${matchLine ? ` - ${escapeHtml(matchLine)}` : ""}</em>
        </span>
        <span class="quick-actions">
          <button type="button" data-save-course="${escapeHtml(course.id)}" aria-pressed="${saved}">${saved ? "Saved" : "Save"}</button>
          <button type="button" data-compare-course="${escapeHtml(course.id)}" aria-pressed="${comparing}">${comparing ? "Comparing" : "Compare"}</button>
        </span>
      </summary>
      ${open ? renderCourseDetail(course, saved, comparing) : ""}
    </details>
  `;
}

function renderCourseDetail(course, saved, comparing) {
  return `
    <div class="course-detail">
      <dl>
        ${row("Course code", course.courseCode)}
        ${row("Level", levelDisplay(course))}
        ${row("Campus", course.campus)}
        ${row("ATAR / selection rank", displayRank(course.atar))}
        ${row("Duration", course.duration)}
        ${row("Study mode", (course.modes || []).join(", "))}
        ${row("Intake", course.intake)}
        ${row("Prerequisites", course.prerequisites)}
        ${row("Assumed knowledge", course.assumed)}
        ${row("Fees", course.fees)}
        ${row("Careers", course.careers)}
        ${row("Information source", course.source)}
      </dl>
      <p>${highlight(course.summary)}</p>
      <div class="actions">
        <a href="${escapeHtml(course.uacUrl)}" target="_blank" rel="noreferrer">View on UAC ${icon("external")}</a>
        ${course.officialUrl ? `<a href="${escapeHtml(course.officialUrl)}" target="_blank" rel="noreferrer">Course website ${icon("external")}</a>` : ""}
        <button type="button" data-save-course="${escapeHtml(course.id)}">${saved ? "Remove from saved" : "Save course"}</button>
        <button type="button" data-compare-course="${escapeHtml(course.id)}">${comparing ? "Remove from compare" : "Add to compare"}</button>
      </div>
    </div>
  `;
}

function renderAtarResults() {
  const matches = allCourses
    .filter((course) => numericRank(course.atar) !== null)
    .filter((course) => course.level === "undergraduate")
    .filter((course) => state.matcherProvider === "All providers" || course.university === state.matcherProvider)
    .map((course) => {
      const rank = numericRank(course.atar);
      const gap = Number(state.atar) - rank;
      const preference = preferenceScore(course);
      const quality = providerQuality[state.matcherTopic]?.[course.providerId]?.score || 60;
      const atarScore = gap >= 0 ? 70 - Math.min(gap, 20) : 70 - Math.abs(gap) * 2.5;
      return { course, gap, score: atarScore + preference + quality * 0.25 + qualificationScore(course) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const courseRows = matches.map(({ course, gap }) => {
    const label = gap >= 0 ? `${gap.toFixed(1)} below your ATAR` : `${Math.abs(gap).toFixed(1)} above your ATAR`;
    return renderCourse(course, label);
  }).join("");

  return `${renderPathwayAdvice(matches)}${courseRows}`;
}

function qualificationScore(course) {
  const title = cleanSearchText(course.name);
  if (title.includes("via diploma")) return -10;
  if (title.startsWith("diploma") || title.startsWith("advanced diploma")) return -8;
  if (title.startsWith("bachelor")) return 12;
  return 0;
}

function renderPathwayAdvice(matches) {
  const atar = Number(state.atar);
  const realisticCount = matches.filter((match) => match.gap >= -3).length;
  if (atar >= 65 && realisticCount >= 4) return "";
  const reason = atar < 55
    ? "Your ATAR estimate is quite low, so keep direct-entry options but also plan a pathway."
    : "A few matches may sit above your ATAR, so these pathways are worth checking as backups.";
  return `
    <div class="pathway-panel">
      <div>
        <h3>Pathway options to check</h3>
        <p>${escapeHtml(reason)} Use official pages to confirm eligibility, dates, fees and whether credit can transfer into the degree you want.</p>
      </div>
      <div class="pathway-grid">
        ${pathwayLinks.map((item) => `
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.text)}</small>
            <em>Open official page ${icon("external")}</em>
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCompareLibrary(compareCourses) {
  if (!compareCourses.length) {
    return `<div class="compare-empty"><strong>Compare courses</strong><p>Use Compare on up to four saved courses to see ATAR, campus, duration, prerequisites and links side by side.</p></div>`;
  }
  const rows = [
    ["Provider", (course) => course.university],
    ["Campus", (course) => course.campus],
    ["ATAR / selection rank", (course) => displayRank(course.atar)],
    ["Duration", (course) => course.duration],
    ["Study mode", (course) => (course.modes || []).join(", ")],
    ["Prerequisites", (course) => course.prerequisites],
    ["Assumed knowledge", (course) => course.assumed],
    ["Fees", (course) => course.fees]
  ];
  return `
    <div class="compare-box">
      <div class="compare-head">
        <div>
          <h3>Compare courses</h3>
          <p>${compareCourses.length}/4 selected</p>
        </div>
      </div>
      <div class="compare-scroll">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              ${compareCourses.map((course) => `
                <th>
                  <strong>${highlight(course.name)}</strong>
                  <small>${escapeHtml(course.university)}</small>
                  <button type="button" data-remove-compare="${escapeHtml(course.id)}">Remove</button>
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(([label, getter]) => `
              <tr>
                <th>${highlight(label)}</th>
                ${compareCourses.map((course) => `<td>${compareCell(getter(course))}</td>`).join("")}
              </tr>
            `).join("")}
            <tr>
              <th>Links</th>
              ${compareCourses.map((course) => `
                <td>
                  <a href="${escapeHtml(course.uacUrl)}" target="_blank" rel="noreferrer">UAC ${icon("external")}</a>
                  ${course.officialUrl ? `<a href="${escapeHtml(course.officialUrl)}" target="_blank" rel="noreferrer">Course page ${icon("external")}</a>` : ""}
                </td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSavedEmpty() {
  return `
    <div class="saved-empty">
      <strong>No saved courses yet</strong>
      <p>Search for a course, then use Save or Compare on the course row. Saved courses stay in this browser.</p>
      <a href="#courses">Search courses</a>
    </div>
  `;
}

function renderAdvisor() {
  const ranked = state.advisorRun ? advisorRankedCourses().slice(0, 6) : [];
  return `
    <form class="advisor-form" data-form="advisor">
      ${advisorQuestions.map(renderAdvisorQuestion).join("")}
      <button type="submit" class="match-btn">Find my course direction</button>
    </form>
    ${state.advisorRun ? renderAdvisorResult(ranked) : `<p class="empty-note">This uses your answers, ATAR estimate and the local UAC course dataset.</p>`}
  `;
}

function renderAdvisorQuestion(question) {
  const value = state.advisor[question.key] || "";
  if (question.type === "select") {
    return `
      <label>
        <span>${escapeHtml(question.label)}</span>
        <select data-advisor-field="${escapeHtml(question.key)}">
          <option value="">Choose one</option>
          ${question.options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }
  return `
    <label>
      <span>${escapeHtml(question.label)}</span>
      <input
        data-advisor-field="${escapeHtml(question.key)}"
        type="${question.type === "number" ? "number" : "text"}"
        ${question.type === "number" ? 'min="30" max="99.95" step="0.05"' : ""}
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(question.placeholder || "")}"
      />
    </label>
  `;
}

function renderAdvisorResult(ranked) {
  const primary = ranked[0]?.course;
  const profile = advisorProfile();
  return `
    <div class="advisor-result">
      <div class="advisor-summary">
        <h3>${primary ? `Best first direction: ${highlight(primary.name)}` : "Best first direction"}</h3>
        <p>${escapeHtml(advisorSummaryText(primary, profile))}</p>
        <small>How this was decided: data scoring from course title, study area, ATAR gap, subjects, passions, preferred mode/campus and provider profile score.</small>
      </div>
      <div class="advisor-picks">
        ${ranked.map(({ course, score, reasons }) => `
          <article>
            <strong>${highlight(course.name)}</strong>
            <small>${escapeHtml(course.university)} - ${escapeHtml(course.campus)} - ${term("ATAR")}: ${escapeHtml(displayRank(course.atar))}</small>
            <p>${escapeHtml(reasons.slice(0, 3).join(" "))}</p>
            <em>Fit score ${Math.round(score)}/100</em>
          </article>
        `).join("")}
      </div>
      <div class="chat-box">
        <h3>Chat with the helper</h3>
        <div class="chat-log">
          ${state.advisorChat.length ? state.advisorChat.map((message) => `
            <div class="chat-message ${message.role}${message.pending ? " pending" : ""}">
              <strong>
                ${message.role === "user" ? "You" : "Helper"}
                ${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}
              </strong>
              <p>${highlight(message.text)}</p>
            </div>
          `).join("") : `<p class="empty-note">Ask things like “which one is safest?”, “what if my ATAR is too low?”, or “compare medicine and technology”.</p>`}
        </div>
        <form class="chat-form" data-form="advisor-chat">
          <input name="message" autocomplete="off" placeholder="Ask a follow-up question" />
          <button type="submit">Ask</button>
        </form>
      </div>
    </div>
  `;
}

function renderTopProviders() {
  const topic = topicOptions.find((item) => item.label === state.providerTopic) || topicOptions[1];
  const quality = providerQuality[topic.label] || {};
  const rows = allProviders
    .map((provider) => {
      const courses = allCourses.filter((course) => course.providerId === provider.id);
      const relevant = courses.filter((course) => topicMatch(course, topic));
      const qualityEntry = quality[provider.id];
      const score = qualityEntry ? qualityEntry.score : Math.min(70, 42 + relevant.length * 0.25);
      return { provider, count: relevant.length, score, note: qualityEntry?.note || "Relevant Sydney course availability" };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.score - a.score || b.count - a.count || a.provider.name.localeCompare(b.provider.name))
    .slice(0, 3);

  return rows.map((row, index) => `
    <a class="top-provider-card" href="${escapeHtml(row.provider.website)}" target="_blank" rel="noreferrer">
      <span>${index + 1}</span>
      <img src="${escapeHtml(row.provider.logo)}" alt="${escapeHtml(row.provider.name)} logo" loading="lazy" />
      <strong>${escapeHtml(row.provider.name)}</strong>
      <small>${escapeHtml(row.note)}</small>
      <em>Profile score ${Math.round(row.score)}/100</em>
    </a>
  `).join("");
}

function renderProvider(provider) {
  return `
    <a class="provider-card" href="${escapeHtml(provider.website)}" target="_blank" rel="noreferrer">
      <img src="${escapeHtml(provider.logo)}" alt="${escapeHtml(provider.name)} logo" loading="lazy" />
      <strong>${escapeHtml(provider.name)}</strong>
      <small>${providerProfile(provider)}</small>
    </a>
  `;
}

function renderFaq() {
  const items = [
    ["What is the difference between ATAR and selection rank?", "ATAR is your rank from school results. Selection rank is what the university uses for offers and may include adjustment factors."],
    ["Should I choose prestige or the course I like?", "Use prestige as one factor, not the only factor. Course structure, accreditation, campus, internships and whether you can stay motivated matter a lot."],
    ["How important are prerequisites?", "Prerequisites can block entry. Assumed knowledge usually does not block entry, but missing it can make first year harder."],
    ["What subjects should I care about?", "For engineering, computing and science, mathematics and physics can matter. For health, biology and chemistry can help. For law, arts and business, strong English and writing skills are useful."],
    ["What if my ATAR is below the course?", "Check adjustment factors, alternative offers, diploma pathways, internal transfers and related courses with lower entry ranks."],
    ["What should I compare between universities?", "Compare commute, campus, fees, accreditation, placements, graduate employment, course flexibility, internships, support services and transfer options."],
    ["Why do some courses not show an ATAR?", "UAC may mark a course as new, unavailable, non-ATAR entry, or not reportable. The site shows those status notes when UAC publishes them."],
    ["How are provider profile scores calculated?", "The profile score is a local guide, not an official ranking. It combines broad field reputation, prestige, employer/industry strength and Sydney course availability so the Top 3 section is not just counting courses."],
    ["What if I do not have the ATAR?", "Look at selection-rank adjustments, Educational Access Scheme, Schools Recommendation Scheme, diploma pathways, TAFE-to-uni pathways, related lower-entry courses and internal transfer after first year."],
    ["Should I still apply if my ATAR is lower?", "Yes, if the course is realistic and you have backups. Put dream courses above safer options, because UAC preferences are considered in order and universities may use adjustment factors."],
    ["How current is this data?", `The local import was generated from UAC on ${(meta.importedAt || "").slice(0, 10) || "the latest import date"}. Always confirm final details on UAC or the university website before applying.`]
  ];
  return items.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("");
}

function renderAskDrawer() {
  return `
    <div class="ask-drawer${state.askOpen ? " open" : ""}" aria-hidden="${state.askOpen ? "false" : "true"}">
      <div class="ask-backdrop" data-action="close-ask"></div>
      <aside class="ask-panel" role="dialog" aria-modal="true" aria-labelledby="askTitle">
        <div class="ask-head">
          <div>
            <h2 id="askTitle">Ask</h2>
            <p>Fast help for HSC, UAC, ATAR adjustments, pathways and using this site.</p>
          </div>
          <button type="button" class="icon-button" data-action="close-ask" aria-label="Close Ask panel">Close</button>
        </div>
        <div class="ask-suggestions">
          ${askStarterPrompts.map((prompt) => `<button type="button" data-ask-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("")}
        </div>
        <div class="ask-log" aria-live="polite">
          ${state.askMessages.map(renderAskMessage).join("")}
        </div>
        <div class="ask-resources">
          <a href="https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/" target="_blank" rel="noreferrer">Adjustment factors ${icon("external")}</a>
          <a href="https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes" target="_blank" rel="noreferrer">EAS ${icon("external")}</a>
          <a href="https://www.uac.edu.au/future-applicants/how-to-apply-for-uni/selecting-your-course-preferences/" target="_blank" rel="noreferrer">Preferences ${icon("external")}</a>
        </div>
        <form class="ask-form" data-form="ask-chat">
          <input name="message" autocomplete="off" placeholder="Ask about bonus marks, pathways, subjects or courses" />
          <button type="submit">Ask</button>
        </form>
      </aside>
    </div>
  `;
}

function renderAskMessage(message) {
  const lines = String(message.text || "").split(/\n+/).filter(Boolean);
  return `
    <div class="ask-message ${escapeHtml(message.role)}${message.pending ? " pending" : ""}">
      <strong>
        ${message.role === "user" ? "You" : "Ask helper"}
        ${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}
      </strong>
      ${lines.map((line) => `<p>${highlight(line)}</p>`).join("")}
    </div>
  `;
}

async function askReply(message) {
  const history = askConversationContext();
  const local = localAskReply(message, history);
  const fallbackProvider = askReplyProvider(message, history);
  try {
    const ai = await requestAiReply({
      type: "ask",
      message,
      history: state.askMessages.filter((item) => !item.pending).slice(-8),
      localReply: local,
      context: {
        courses: askCourseMatches(message, 6).map(({ course, score }) => compactAiCourse(course, score))
      }
    });
    return { text: ai.text, provider: ai.provider || "Gemini" };
  } catch (error) {
    console.warn("Ask AI fallback:", error);
    return { text: local, provider: fallbackProvider };
  }
}

async function requestAiReply(payload) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);
  const data = await response.json();
  if (!data.ok || !data.text) throw new Error(data.error || "AI endpoint unavailable");
  return data;
}

function compactAiCourse(course, score, reasons = []) {
  return {
    name: course.name,
    provider: course.university,
    campus: course.campus,
    code: course.courseCode,
    atar: displayRank(course.atar),
    prerequisites: truncateText(decodeHtmlEntities(course.prerequisites || ""), 260),
    assumedKnowledge: truncateText(decodeHtmlEntities(course.assumed || ""), 200),
    careers: truncateText(decodeHtmlEntities(course.careers || ""), 220),
    duration: course.duration,
    modes: course.modes || [],
    uacUrl: course.uacUrl,
    officialUrl: course.officialUrl,
    score: typeof score === "number" ? Math.round(score) : undefined,
    reasons: Array.isArray(reasons) ? reasons.slice(0, 3) : []
  };
}

function localAskReply(message, history = "") {
  const question = cleanSearchText(message);
  const context = cleanSearchText(history);
  if (!question) return "Ask me a question about UAC, ATAR, pathways, subjects or finding courses.";

  if (isSchoolAdjustmentQuestion(question)) {
    return schoolAdjustmentReply(question);
  }

  if (isMarksFollowupQuestion(question)) {
    if (isCourtOrHardshipQuestion(context)) {
      return "No, not automatically. A court matter, being a witness, or a dismissed case does not give free ATAR points by itself, and your ATAR does not change. If it seriously disrupted your schooling over time, you may be able to apply for EAS or another access scheme with evidence, but UAC or the university decides and the adjustment depends on the course/provider.";
    }
    return "Not automatically. Extra marks are usually selection-rank adjustments, not changes to your ATAR, and they depend on the university, course and eligibility category. Tell me the course/provider and the reason you think you may qualify, and I can point you to the right UAC or uni pathway to check.";
  }

  if (isCourtOrHardshipQuestion(question)) {
    return "No, being a witness in a trial or having a case dismissed does not automatically give you a free ATAR or guaranteed bonus points. Your ATAR itself does not change. If the court matter seriously disrupted your schooling over time, you may be able to apply for EAS or another access scheme, but UAC or the university would need evidence and they decide eligibility. The right move is to check EAS, speak to your school careers adviser, and keep backup preferences/pathways as well.";
  }

  if (isHonoursExplainerQuestion(question)) {
    return "An honours degree is a bachelor degree with a higher-level honours component. In some courses, like Engineering (Honours), honours is built into the degree; in others, honours can be an extra research-focused year after a bachelor degree. Compared with a standard bachelor degree, honours usually means more advanced study, a major project or research component, and sometimes stronger preparation for professional accreditation, postgraduate research or competitive jobs. The exact structure differs by university, so check whether the course name means built-in honours or a separate honours year.";
  }

  if (/bonus|extra point|adjust|adjustment|selection rank|scheme|points? for|marks? for/.test(question)) {
    return "There is no universal bonus-mark number. UAC and universities usually call these selection-rank adjustments, and the amount depends on the provider, course and your eligibility. Common categories include subject adjustments, location or school schemes, equity or EAS, elite athlete/performer schemes and other access programs. I can help you narrow it down if you tell me the course/provider plus your subjects or circumstances, but the exact number must be checked on UAC or that university's adjustment-factor page.";
  }

  if (/eas|educational access|disadvantage|hardship|illness|family|financial|equity/.test(question)) {
    return "EAS is for long-term educational disadvantage that affected your studies. It can increase your selection rank for some institutions, but it is not automatic for every course and it does not change your ATAR itself. Keep evidence ready, apply through UAC by the relevant deadline and still list realistic backup courses.";
  }

  if (/srs|school recommendation|early offer|early entry/.test(question)) {
    return "Schools Recommendation Scheme is an early-offer pathway using school recommendations and other criteria, not just ATAR. It can be useful if your ATAR is uncertain, but each institution decides which courses participate and what conditions apply.";
  }

  if (/\b(low atar|below|too low|miss|missed|pathway|backup|alternative|didnt get|don't get|do not get)\b/.test(question)) {
    return "If your ATAR is below a course profile, use a ladder: keep the dream course in your preferences, add related lower-entry courses, check selection-rank adjustments, EAS/SRS, diplomas, TAFE-to-uni pathways and internal transfer options after first year. For a very low ATAR, pathways and related courses usually matter more than trying to force direct entry.";
  }

  if (/prereq|prerequisite|assumed|knowledge|subject needed|required subject/.test(question)) {
    return "Prerequisites can block entry if you do not meet them. Assumed knowledge is different: it usually will not block entry, but missing it can make first year harder. On this site, expand a course row to see the imported UAC prerequisite and assumed-knowledge fields, then confirm on UAC or the university page before applying.";
  }

  if (/choose|which uni|best uni|prestige|employment|employability|graduate|between|uts|unsw|usyd|macquarie|western sydney/.test(question)) {
    if (/uts|unsw/.test(question) && /computer|software|coding|technology|it|data|cyber|artificial intelligence/.test(question)) {
      return "For computing or IT, UNSW usually wins on broad prestige and employer reputation, while UTS is very strong for industry focus, city access and practical project-style learning. Use that as a starting point, then compare the actual course structure, ATAR profile, commute, internships, flexibility and whether the subjects look like work you can keep doing for years. Do not choose only on reputation if the other course has a better fit, clearer pathway or easier commute.";
    }
    return "Use a few factors together: course accreditation, placements or industry projects, commute, campus fit, flexibility, fees/CSP status, prerequisites, student support and whether the actual day-to-day work sounds tolerable. Prestige helps, but it should not beat a course you can realistically enter, finish and use.";
  }

  if (/save|saved|library|compare button|compare tool|comparison table|comparison feature/.test(question)) {
    return "Use Save on course rows to build your library, then Compare on up to four courses to check ATAR, campus, duration, prerequisites, assumed knowledge, fees and links side by side. Different campuses stay separate, so do not delete a row just because the course name is similar.";
  }

  const matches = askCourseMatches(question, 4);
  if (questionMentionsCourse(question) && matches.length) {
    return `From the imported Sydney UAC records, start by checking ${formatAskCourses(matches)}. Search the course name, then expand each row for ATAR, prerequisites, assumed knowledge, campus, fees and official links.`;
  }

  if (/fee|fees|cost|csp|commonwealth|hecs|help loan/.test(question)) {
    return "Fees depend on the course, place type and student status. A CSP means the government subsidises part of the cost, and eligible students may use HECS-HELP. This site shows imported fee text when UAC lists it, but final fees must be checked on the official provider page.";
  }

  return "I can help with ATAR adjustments, pathways, subjects, prerequisites, saved courses, comparing courses or finding Sydney options. For exact entry numbers, I will use this site's imported UAC data when it is available and point you back to official pages when the rule is provider-specific.";
}

function isCourtOrHardshipQuestion(question) {
  return /witness|trial|court|case|dismissed|legal matter|police|victim|subpoena|testif|charge|crime/.test(question)
    && /atar|bonus|mark|point|adjust|selection rank|eas|scheme|access|free/.test(question);
}

function isMarksFollowupQuestion(question) {
  return /\b(do i|get|receive|eligible|qualify|marks?|points?|bonus|adjustment)\b/.test(question)
    && /\bmarks?|points?|bonus|adjustment\b/.test(question)
    && /\b(do i|did i|can i|so|or not|eligible|qualify|get|receive)\b/.test(question);
}

function isHonoursExplainerQuestion(question) {
  return /\bhonou?rs?\b/.test(question)
    && /\b(what|mean|meaning|differ|difference|different|vs|versus|compare|how)\b/.test(question);
}

function isSchoolAdjustmentQuestion(question) {
  const mentionsSchool = /\b[a-z]{2,6}hs\b/.test(question)
    || /\b(high school|secondary school|school|selective school|public school|private school)\b/.test(question)
    || /\b(go|going|went|attend|attending|from)\b.+\b(school|high|college)\b/.test(question);
  const asksAdjustment = /\b(extra|bonus|adjust|adjustment|selection rank|atar|point|points|mark|marks|eas|scheme|advantage)\b/.test(question);
  return mentionsSchool && asksAdjustment;
}

function schoolAdjustmentReply(question) {
  const school = schoolLabelFromQuestion(question);
  return `${school ? `${school}: ` : ""}not automatically. Your ATAR itself does not go up just because you attend a particular school. A school can matter only if the exact university/course recognises it through a selection-rank adjustment, access scheme, location/school scheme, EAS-style disadvantage category, or another official pathway. If the school name is an acronym like BBHS, confirm the full school name first because different schools can share initials. The safe check is: pick the target course/provider, then check that provider's adjustment-factor page and UAC access scheme information for that exact school and course.`;
}

function schoolLabelFromQuestion(question) {
  const acronym = question.match(/\b([a-z]{2,6}hs)\b/);
  if (acronym) return acronym[1].toUpperCase();
  const phrase = question.match(/\b(?:going to|go to|attend|attending|from)\s+([a-z0-9 ]{3,45}?(?:high school|secondary school|college|school|high))\b/);
  return phrase ? titleCase(phrase[1]) : "";
}

function titleCase(value) {
  return String(value || "").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function askReplyProvider(message, history = "") {
  const question = cleanSearchText(message);
  if (isCourtOrHardshipQuestion(question)
    || isSchoolAdjustmentQuestion(question)
    || isHonoursExplainerQuestion(question)
    || isMarksFollowupQuestion(question)
    || (isMarksFollowupQuestion(question) && isCourtOrHardshipQuestion(cleanSearchText(history)))) {
    return "UAC rule check";
  }
  return "Site data";
}

function askConversationContext() {
  return state.askMessages
    .filter((item) => !item.pending)
    .slice(-6)
    .map((item) => `${item.role === "user" ? "Student" : "Ask helper"}: ${item.text}`)
    .join("\n");
}

function askCourseMatches(question, limit) {
  const topic = topicFromQuestion(question);
  const targetAtar = targetAtarFromQuestion(question);
  const words = tokenise(question).filter((word) => word.length > 2 && !askStopWords.has(word));
  const seen = new Set();
  return allCourses
    .map((course) => {
      const title = cleanSearchText(course.name);
      const text = primaryCourseText(course);
      const rank = numericRank(course.atar);
      let score = searchScore(course, question) * 0.04;
      if (topic) score += topicWeightedScore(course, topic) * 1.6;
      score += words.filter((word) => tokenMatch(title, word)).length * 34;
      score += words.filter((word) => tokenMatch(text, word)).length * 4;
      if (targetAtar !== null) {
        const gap = rank === null ? 99 : Math.abs(targetAtar - rank);
        score += rank !== null ? Math.max(0, 56 - gap * 3.5) : -80;
        if (gap > 12) score -= 90;
        if (rank === null) score -= 45;
        if (!/pathway|diploma|backup|low atar|alternative/.test(question) && /via diploma|^diploma|^advanced diploma/.test(title)) score -= 60;
      }
      if (course.level === "undergraduate") score += 8;
      if (rank !== null) score += 3;
      return { course, score };
    })
    .filter((entry) => entry.score > 16)
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .filter((entry) => {
      const key = `${cleanSearchText(entry.course.name)}|${entry.course.providerId}|${cleanSearchText(entry.course.campus)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function targetAtarFromQuestion(question) {
  const match = String(question).match(/\b(?:atar|around|about|near|estimate|got|with)?\s*(\d{2}(?:\.\d{1,2})?)\b/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 30 && value <= 99.95 ? value : null;
}

const askStopWords = new Set([
  "about", "with", "have", "this", "that", "what", "which", "course", "courses", "university", "uni", "study", "marks", "points", "atar", "rank", "help", "good", "best", "around"
]);

function topicFromQuestion(question) {
  return topicOptions.find((topic) => {
    if (topic.label === "All interests") return false;
    if (phraseMatch(question, topic.label)) return true;
    return topic.keywords.some((keyword) => phraseMatch(question, keyword) || tokenise(keyword).some((word) => tokenMatch(question, word)));
  });
}

function questionMentionsCourse(question) {
  return /course|degree|study|career|job|coding|programming|software|computer|medicine|medical|health|nursing|law|justice|business|commerce|finance|engineering|design|creative|teaching|education|psychology|science|food|hospitality|sport/.test(question);
}

function formatAskCourses(entries) {
  return entries.map(({ course }) => {
    const rank = displayRank(course.atar);
    return `${course.name} (${course.university}, ${course.campus}, ATAR ${rank})`;
  }).join("; ");
}

function bindEvents() {
  app.querySelector('[data-form="search"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.draft = event.target.search.value.trim();
    state.query = state.draft;
    state.visible = 24;
    state.openCourseIds.clear();
    render();
  });

  app.querySelector('[name="search"]')?.addEventListener("input", (event) => {
    state.draft = event.target.value;
  });

  ["level", "provider", "mode", "campus"].forEach((key) => {
    app.querySelector(`[data-action="${key}"]`)?.addEventListener("change", (event) => {
      state[key] = event.target.value;
      state.visible = 24;
      state.openCourseIds.clear();
      render();
    });
  });

  app.querySelector('[data-action="clear"]')?.addEventListener("click", () => {
    state.draft = "";
    state.query = "";
    state.level = "All levels";
    state.provider = "All providers";
    state.mode = "All modes";
    state.campus = "All campuses";
    state.visible = 24;
    state.openCourseIds.clear();
    render();
  });

  app.querySelector('[data-action="more"]')?.addEventListener("click", () => {
    state.visible += 24;
    render();
  });

  bindCourseActionButtons(app);

  app.querySelectorAll(".course-item[data-course-id]").forEach((details) => {
    details.addEventListener("toggle", () => {
      const id = details.dataset.courseId;
      if (!id) return;
      if (details.open) {
        state.openCourseIds.add(id);
        if (!details.querySelector(".course-detail")) {
          const course = courseById.get(id);
          if (course) {
            details.insertAdjacentHTML("beforeend", renderCourseDetail(course, state.savedIds.includes(id), state.compareIds.includes(id)));
            bindCourseActionButtons(details);
          }
        }
      } else {
        state.openCourseIds.delete(id);
      }
    });
  });

  app.querySelectorAll("[data-remove-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      state.compareIds = state.compareIds.filter((id) => id !== button.dataset.removeCompare);
      persistIdList(storageKeys.compare, state.compareIds);
      render();
    });
  });

  app.querySelector('[data-action="clear-saved"]')?.addEventListener("click", () => {
    state.savedIds = [];
    state.compareIds = [];
    persistIdList(storageKeys.saved, state.savedIds);
    persistIdList(storageKeys.compare, state.compareIds);
    render();
  });

  app.querySelector('[data-action="clear-compare"]')?.addEventListener("click", () => {
    state.compareIds = [];
    persistIdList(storageKeys.compare, state.compareIds);
    render();
  });

  app.querySelector('[data-action="matcherProvider"]')?.addEventListener("change", (event) => {
    state.matcherProvider = event.target.value;
  });

  app.querySelector('[data-action="matcherTopic"]')?.addEventListener("change", (event) => {
    state.matcherTopic = event.target.value;
  });

  app.querySelector('[data-action="providerTopic"]')?.addEventListener("change", (event) => {
    state.providerTopic = event.target.value;
    render();
  });

  app.querySelector('[data-action="add-subject"]')?.addEventListener("change", (event) => {
    if (event.target.value) {
      state.matcherSubjects.push(event.target.value);
      render();
    }
  });

  app.querySelectorAll("[data-remove-subject]").forEach((button) => {
    button.addEventListener("click", () => {
      state.matcherSubjects = state.matcherSubjects.filter((subject) => subject !== button.dataset.removeSubject);
      render();
    });
  });

  const range = app.querySelector('[data-action="atar-range"]');
  const numberInput = app.querySelector('[data-action="atar-number"]');
  const readout = app.querySelector("#atarValue");
  const updateAtar = (value, source) => {
    const next = Math.max(30, Math.min(99.95, Number(value) || 30));
    state.atar = next;
    if (source !== range) range.value = next;
    if (source !== numberInput) numberInput.value = next.toFixed(2);
    readout.textContent = next.toFixed(2);
  };
  range?.addEventListener("input", (event) => updateAtar(event.target.value, range));
  numberInput?.addEventListener("input", (event) => updateAtar(event.target.value, numberInput));

  app.querySelector('[data-action="run-atar"]')?.addEventListener("click", () => {
    state.matcherProvider = app.querySelector('[data-action="matcherProvider"]').value;
    state.matcherTopic = app.querySelector('[data-action="matcherTopic"]').value;
    state.matcherRun = true;
    state.openCourseIds.clear();
    render();
  });

  app.querySelector('[data-action="open-ask"]')?.addEventListener("click", () => {
    state.askOpen = true;
    render();
    scrollAskToBottom();
  });

  app.querySelectorAll('[data-action="close-ask"]').forEach((control) => {
    control.addEventListener("click", () => {
      state.askOpen = false;
      if (window.location.hash === "#ask") history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      render();
    });
  });

  app.querySelectorAll("[data-ask-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      submitAskMessage(button.dataset.askPrompt || "");
    });
  });

  app.querySelector('[data-form="ask-chat"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = event.target.message.value.trim();
    event.target.message.value = "";
    submitAskMessage(message);
  });

  app.querySelector('[data-form="advisor"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    app.querySelectorAll("[data-advisor-field]").forEach((field) => {
      state.advisor[field.dataset.advisorField] = field.value.trim();
    });
    state.advisorRun = true;
    state.advisorChat = [{
      role: "assistant",
      text: advisorOpeningMessage(advisorRankedCourses().slice(0, 3))
    }];
    render();
    location.hash = "advisor";
  });

  app.querySelectorAll("[data-advisor-field]").forEach((field) => {
    field.addEventListener("input", () => {
      state.advisor[field.dataset.advisorField] = field.value;
    });
    field.addEventListener("change", () => {
      state.advisor[field.dataset.advisorField] = field.value;
    });
  });

  app.querySelector('[data-form="advisor-chat"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = event.target.message.value.trim();
    if (!message) return;
    state.advisorChat.push({ role: "user", text: message });
    const pending = { role: "assistant", text: "Checking Gemini against the course data...", pending: true, provider: "Gemini" };
    state.advisorChat.push(pending);
    event.target.message.value = "";
    render();
    location.hash = "advisor";
    const reply = await advisorAiChatReply(message);
    pending.text = reply.text;
    pending.provider = reply.provider;
    pending.pending = false;
    render();
    location.hash = "advisor";
  });
}

function bindCourseActionButtons(root) {
  root.querySelectorAll("[data-save-course]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleSaved(button.dataset.saveCourse);
    });
  });

  root.querySelectorAll("[data-compare-course]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      toggleCompare(button.dataset.compareCourse);
    });
  });
}

async function submitAskMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;
  state.askOpen = true;
  state.askMessages.push({ role: "user", text });
  const pending = { role: "assistant", text: "Checking the site data...", pending: true, provider: "Thinking" };
  state.askMessages.push(pending);
  state.askMessages = state.askMessages.slice(-12);
  render();
  scrollAskToBottom();
  const reply = await askReply(text);
  pending.text = reply.text;
  pending.provider = reply.provider;
  pending.pending = false;
  state.askMessages = state.askMessages.slice(-12);
  render();
  scrollAskToBottom();
}

function scrollAskToBottom() {
  requestAnimationFrame(() => {
    const log = app.querySelector(".ask-log");
    if (log) log.scrollTop = log.scrollHeight;
  });
}

function scheduleHashScroll() {
  const hash = window.location.hash;
  if (!hash || hash === "#ask") return;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return;
  requestAnimationFrame(() => requestAnimationFrame(() => settleHashScroll(id)));
}

function settleHashScroll(id, attempts = 0) {
  const target = document.getElementById(id);
  if (!target) return;
  const header = app.querySelector(".topbar");
  const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
  const targetTop = target.getBoundingClientRect().top;
  const desiredTop = headerBottom + 16;
  const delta = targetTop - desiredTop;
  if (Math.abs(delta) > 3) {
    window.scrollBy({ top: delta, behavior: "auto" });
  }
  if (attempts < 5) {
    window.setTimeout(() => settleHashScroll(id, attempts + 1), 120);
  }
}

function select(key, label, options, value) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select data-action="${escapeHtml(key)}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function row(label, value) {
  return `
    <div>
      <dt>${highlight(label)}</dt>
      <dd>${fieldValue(value || "Not listed")}</dd>
    </div>
  `;
}

function compareCell(value) {
  const text = decodeHtmlEntities(value || "Not listed").trim() || "Not listed";
  return highlight(truncateText(text, 180));
}

function advisorProfile() {
  const text = [
    state.advisor.subjects,
    state.advisor.passions,
    state.advisor.strengths,
    state.advisor.workStyle,
    state.advisor.careerPriority
  ].join(" ");
  const topicScores = topicOptions
    .filter((topic) => topic.label !== "All interests")
    .map((topic) => ({
      topic,
      score: topic.keywords.reduce((sum, keyword) => sum + (phraseMatch(text, keyword) ? 2 : tokenise(keyword).some((word) => tokenMatch(text, word)) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);
  const fallbackTopic = topicOptions.find((topic) => topic.label === state.advisor.passions) || topicOptions[1];
  return {
    atar: Number(state.advisor.atar) || 75,
    topic: topicScores[0]?.score > 0 ? topicScores[0].topic : fallbackTopic,
    text: cleanSearchText(text),
    avoid: cleanSearchText(state.advisor.avoid),
    mode: state.advisor.studyMode || "Any mode",
    campus: state.advisor.campus || "Any Sydney campus",
    careerPriority: state.advisor.careerPriority || "High employability",
    pathways: state.advisor.pathways || "Maybe"
  };
}

function advisorRankedCourses() {
  const profile = advisorProfile();
  return allCourses
    .map((course) => advisorScoreCourse(course, profile))
    .filter((entry) => entry.score > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function advisorScoreCourse(course, profile) {
  const rank = numericRank(course.atar);
  const text = courseText(course);
  const topicScore = topicWeightedScore(course, profile.topic);
  const subjectWords = tokenise(state.advisor.subjects);
  const passionWords = tokenise(state.advisor.passions);
  const subjectScore = subjectWords.filter((word) => tokenMatch(text, word)).length * 4;
  const passionScore = passionWords.filter((word) => tokenMatch(text, word)).length * 5;
  const gap = rank === null ? 0 : profile.atar - rank;
  const atarScore = rank === null ? 6 : gap >= 0 ? 22 - Math.min(gap, 16) * 0.35 : Math.max(0, 18 - Math.abs(gap) * 2.2);
  const modeScore = profile.mode === "Any mode" || (course.modes || []).includes(profile.mode) ? 7 : 0;
  const campusScore = campusPreferenceScore(course, profile.campus);
  const providerScore = searchProviderQuality(course, profile.topic.label) * 0.12;
  const careerScore = careerPriorityScore(course, profile.careerPriority);
  const avoidPenalty = tokenise(profile.avoid).filter((word) => tokenMatch(text, word)).length * 8;
  const pathwayBoost = profile.pathways !== "No" && /diploma|pathway|via diploma/i.test(course.name) ? 6 : 0;
  const score = Math.max(0, topicScore * 0.3 + subjectScore + passionScore + atarScore + modeScore + campusScore + providerScore + careerScore + pathwayBoost - avoidPenalty);
  const reasons = advisorReasons(course, profile, gap, rank, topicScore, modeScore, campusScore);
  return { course, score: Math.min(100, score), reasons };
}

function campusPreferenceScore(course, preference) {
  const campus = cleanSearchText(course.campus);
  if (!preference || preference === "Any Sydney campus") return 5;
  if (preference === "Online") return (course.modes || []).includes("Online") || campus.includes("online") ? 8 : 0;
  if (preference === "City / inner Sydney") return /city|kensington|camperdown|darlington|sydney|broadway|surry/.test(campus) ? 8 : 0;
  if (preference === "Western Sydney") return /western|parramatta|penrith|campbelltown|blacktown|bankstown|liverpool/.test(campus) ? 8 : 0;
  if (preference === "North Sydney / Macquarie") return /north|macquarie|ryde/.test(campus) ? 8 : 0;
  return 0;
}

function careerPriorityScore(course, priority) {
  const text = courseText(course);
  if (priority === "Helping people") return /health|nursing|medicine|education|teaching|social|psychology|counselling/.test(text) ? 8 : 0;
  if (priority === "Creative freedom") return /design|creative|music|animation|media|arts|film|screen/.test(text) ? 8 : 0;
  if (priority === "High income potential") return /engineering|computer|software|data|commerce|finance|law|medical/.test(text) ? 8 : 0;
  if (priority === "High employability") return /teaching|nursing|engineering|computer|cyber|accounting|health|construction/.test(text) ? 8 : 0;
  if (priority === "Lower ATAR risk") return numericRank(course.atar) !== null && numericRank(course.atar) <= Number(state.advisor.atar) ? 8 : 0;
  if (priority === "Prestige") return courseProviderScore(course) * 0.08;
  return 4;
}

function advisorReasons(course, profile, gap, rank, topicScore, modeScore, campusScore) {
  const reasons = [];
  if (topicScore > 0) reasons.push(`Matches your ${profile.topic.label.toLowerCase()} interests.`);
  if (rank !== null) reasons.push(gap >= 0 ? `ATAR profile is ${gap.toFixed(1)} below your estimate.` : `ATAR profile is ${Math.abs(gap).toFixed(1)} above your estimate, so keep a pathway backup.`);
  if (modeScore) reasons.push("Study mode fits your preference.");
  if (campusScore) reasons.push("Campus preference is a reasonable fit.");
  if (!reasons.length) reasons.push("Included as a broad match from the UAC dataset.");
  return reasons;
}

function advisorSummaryText(primary, profile) {
  if (!primary) return "I could not find a confident match from the current answers. Try adding more subjects, interests or a broader career direction.";
  const rank = numericRank(primary.atar);
  const atarLine = rank === null ? "UAC does not list a numeric ATAR profile for it." : `Its listed ATAR profile is ${displayRank(primary.atar)} against your estimate of ${profile.atar}.`;
  return `${primary.name} is the strongest first direction because it matches your ${profile.topic.label.toLowerCase()} pattern, preferences and available UAC data. ${atarLine}`;
}

function advisorOpeningMessage(ranked) {
  if (!ranked.length) return "I need a little more detail to make a useful recommendation. Add subjects, interests and what kind of work sounds good.";
  const names = ranked.map((entry) => entry.course.name).join(", ");
  return `Based on the course data first, I would start by comparing: ${names}. Ask me about safety, ATAR risk, pathways, careers or which one fits you best.`;
}

function advisorChatReply(message) {
  const question = cleanSearchText(message);
  const ranked = advisorRankedCourses().slice(0, 4);
  const primary = ranked[0]?.course;
  if (!primary) return "I need more answers first. Fill in subjects, passions and ATAR, then run the helper.";
  if (/atar|low|rank|entry|pathway|backup/.test(question)) {
    return `For ATAR risk, start with ${primary.name}, then keep pathway options open: adjustment factors, EAS/SRS, diploma pathways and related lower-entry courses. If a course is above your estimate by more than about 3 points, treat it as possible but not safe.`;
  }
  if (/compare|which|best|choose/.test(question)) {
    return `My data-first pick is ${primary.name}. Compare it against ${ranked.slice(1).map((entry) => entry.course.name).join(" and ")} by ATAR gap, campus commute, prerequisites and whether the career actually sounds like your day-to-day life.`;
  }
  if (/job|career|employ|money|salary/.test(question)) {
    return `${primary.name} looks strongest from your answers, but for career confidence check the course careers section, placements, accreditation and graduate outcomes. Prefer courses with practical experience if employability is your main concern.`;
  }
  if (/subject|prereq|math|english|science/.test(question)) {
    return `Check prerequisites first because they can block entry. Assumed knowledge is different: it usually will not block entry, but missing maths/science background can make first year harder.`;
  }
  return `I would keep ${primary.name} as your first serious option from the data. The next decision should be: do you like the actual subjects, can you meet entry requirements, and is the campus/pathway realistic?`;
}

async function advisorAiChatReply(message) {
  const ranked = advisorRankedCourses().slice(0, 6);
  const local = advisorChatReply(message);
  try {
    const ai = await requestAiReply({
      type: "advisor",
      message,
      history: state.advisorChat.filter((item) => !item.pending).slice(-8),
      localReply: local,
      context: {
        profile: advisorProfile(),
        answers: state.advisor,
        rankedCourses: ranked.map(({ course, score, reasons }) => compactAiCourse(course, score, reasons))
      }
    });
    return { text: ai.text, provider: ai.provider || "Gemini" };
  } catch (error) {
    console.warn("Advisor AI fallback:", error);
    return { text: local, provider: "Site data" };
  }
}

function searchScore(course, query) {
  if (!query) return 0;
  const cleanQuery = cleanSearchText(query);
  const title = cleanSearchText(course.name);
  const code = cleanSearchText(course.courseCode);
  const provider = cleanSearchText(course.university);
  const campus = cleanSearchText(course.campus);
  const area = cleanSearchText(course.area);
  const summary = cleanSearchText(course.summary);
  const careers = cleanSearchText(course.careers);
  const words = tokenise(cleanQuery);
  const orderedTitleMatch = words.length > 1 && new RegExp(words.map(escapeRegExp).join(".*")).test(title);
  const topic = isBroadTopicQuery(cleanQuery) ? topicForQuery(cleanQuery) : null;
  let score = 0;

  if (title === cleanQuery) score += 90000;
  if (exactDegreeTitle(title, cleanQuery)) score += 85000;
  if (title.startsWith(cleanQuery)) score += 42000;
  if (phraseMatch(title, cleanQuery)) score += 36000 + Math.max(0, 5000 - title.indexOf(cleanQuery) * 120);
  if (aliasMatch(title, cleanQuery)) score += 30000;
  if (orderedTitleMatch) score += 22000;
  if (code === cleanQuery) score += 6500;
  if (phraseMatch(provider, cleanQuery)) score += 1200;
  if (phraseMatch(campus, cleanQuery)) score += 300;
  if (phraseMatch(area, cleanQuery) || aliasMatch(area, cleanQuery)) score += 4200;
  if (phraseMatch(careers, cleanQuery) || aliasMatch(careers, cleanQuery)) score += 2600;
  if (phraseMatch(summary, cleanQuery) || aliasMatch(summary, cleanQuery)) score += 80;
  if (topic) score += topicWeightedScore(course, topic) * 120;
  score += words.filter((word) => tokenMatch(title, word)).length * 3500;
  score += words.filter((word) => tokenMatch(primaryCourseText(course), word)).length * 70;
  if (course.level === "undergraduate") score += 250;
  if (numericRank(course.atar) !== null) score += 20;
  score += searchProviderQuality(course, cleanQuery);
  return score;
}

function courseSearchMatch(course, query) {
  const primaryText = primaryCourseText(course);
  const words = tokenise(query);
  const topic = isBroadTopicQuery(query) ? topicForQuery(query) : null;
  if (phraseMatch(primaryText, query)) return true;
  if (aliasMatch(primaryText, query)) return true;
  if (words.length > 1 && words.every((word) => tokenMatch(primaryText, word))) return true;
  if (topic && topicWeightedScore(course, topic) > 0) return true;
  return false;
}

function preferenceScore(course) {
  const topic = topicOptions.find((item) => item.label === state.matcherTopic);
  const topicScore = topic && topic.label !== "All interests" ? topicWeightedScore(course, topic) : 0;
  const subjectScore = state.matcherSubjects.reduce((score, subject) => {
    const words = normalise(subject).split(/\s+/).filter(Boolean);
    const priorityText = normalise([course.name, course.area, course.prerequisites, course.assumed].join(" "));
    const fullText = courseText(course);
    if (words.some((word) => priorityText.includes(word))) return score + 22;
    return score + (words.some((word) => fullText.includes(word)) ? 8 : 0);
  }, 0);
  return topicScore + subjectScore;
}

function topicMatch(course, topic) {
  return topicWeightedScore(course, topic) > 0;
}

function topicWeightedScore(course, topic) {
  if (!topic || !topic.keywords.length) return 0;
  let courseCache = topicScoreCache.get(course);
  if (!courseCache) {
    courseCache = new Map();
    topicScoreCache.set(course, courseCache);
  }
  if (courseCache.has(topic.label)) return courseCache.get(topic.label);

  const title = cleanSearchText(course.name);
  const area = cleanSearchText(course.area);
  const careers = cleanSearchText(course.careers);
  const summary = cleanSearchText(course.summary);
  const score = topic.keywords.reduce((sum, keyword) => {
    const word = cleanSearchText(keyword);
    if (phraseMatch(title, word)) return sum + 60;
    if (phraseMatch(area, word)) return sum + 35;
    if (phraseMatch(careers, word)) return sum + 18;
    if (phraseMatch(summary, word)) return sum + 6;
    return sum;
  }, 0);
  courseCache.set(topic.label, score);
  return score;
}

function topicForQuery(query) {
  const clean = normalise(query);
  return topicOptions.find((topic) => {
    if (topic.label === "All interests") return false;
    const label = normalise(topic.label);
    if (label.includes(clean) || clean.includes(label)) return true;
    return topic.keywords.some((keyword) => {
      const word = normalise(keyword);
      return clean === word || clean.includes(word) || word.includes(clean);
    });
  });
}

function courseText(course) {
  if (courseTextCache.has(course)) return courseTextCache.get(course);
  const text = cleanSearchText([
    course.name,
    course.courseCode,
    course.university,
    course.campus,
    course.area,
    course.summary,
    course.prerequisites,
    course.assumed,
    course.careers,
    course.practicalExperience
  ].join(" "));
  courseTextCache.set(course, text);
  return text;
}

function primaryCourseText(course) {
  if (primaryCourseTextCache.has(course)) return primaryCourseTextCache.get(course);
  const text = cleanSearchText([
    course.name,
    course.courseCode,
    course.university,
    course.campus,
    course.area,
    course.summary,
    course.careers,
    course.practicalExperience
  ].join(" "));
  primaryCourseTextCache.set(course, text);
  return text;
}

function numericRank(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function courseLevels(course) {
  return Array.isArray(course.levels) && course.levels.length ? course.levels : [course.level].filter(Boolean);
}

function levelDisplay(course) {
  return courseLevels(course).map((level) => levelLabels[level] || level).join(" + ");
}

function displayRank(value) {
  const parsed = numericRank(value);
  if (parsed !== null) return parsed.toFixed(parsed % 1 ? 2 : 0);
  const code = String(value || "").trim();
  if (!code || code === "0") return "Not listed by UAC.";
  return rankCodeMeanings[code] || code;
}

function hasSpecificInfo(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && text !== "not listed" && text !== "not listed by uac." && text !== "check official course page.");
}

function highlight(value) {
  const words = Object.keys(glossary).sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return escapeHtml(decodeHtmlEntities(value || "")).replace(new RegExp(`\\b(${words})\\b`, "gi"), (match) => term(match));
}

function term(label) {
  const key = Object.keys(glossary).find((item) => item.toLowerCase() === String(label).toLowerCase());
  return key ? `<span class="term" tabindex="0" data-tip="${escapeHtml(glossary[key])}">${escapeHtml(label)}</span>` : escapeHtml(label);
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

function normalise(value) {
  return String(value || "").toLowerCase();
}

function cleanSearchText(value) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenise(value) {
  return cleanSearchText(value).split(" ").filter(Boolean);
}

function tokenVariants(word) {
  const variants = new Set([word]);
  if (word.endsWith("ies") && word.length > 4) variants.add(`${word.slice(0, -3)}y`);
  if (word.endsWith("s") && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s") && word.length > 2) variants.add(`${word}s`);
  if (word === "medicine") variants.add("medical");
  if (word === "medical") variants.add("medicine");
  if (word === "law") variants.add("laws");
  if (word === "laws") variants.add("law");
  return variants;
}

function tokenMatch(text, word) {
  const tokens = new Set(tokenise(text));
  return [...tokenVariants(cleanSearchText(word))].some((variant) => tokens.has(variant));
}

function phraseMatch(text, phrase) {
  const cleanPhrase = cleanSearchText(phrase);
  if (!cleanPhrase) return false;
  const phraseTokens = tokenise(cleanPhrase);
  if (phraseTokens.length === 1) return tokenMatch(text, phraseTokens[0]);
  return cleanSearchText(text).includes(cleanPhrase);
}

function aliasMatch(text, query) {
  return (searchAliases[cleanSearchText(query)] || []).some((alias) => phraseMatch(text, alias));
}

function exactDegreeTitle(title, query) {
  const degreeTitles = [
    `bachelor of ${query}`,
    `bachelor of ${query}s`,
    `bachelor of ${query} studies`,
    `master of ${query}`,
    `doctor of ${query}`,
    `diploma of ${query}`
  ];
  if (query === "law") degreeTitles.push("bachelor of laws");
  if (query === "medicine") {
    degreeTitles.push("bachelor of medical studies doctor of medicine");
    degreeTitles.push("doctor of medicine");
  }
  return degreeTitles.includes(title);
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

  const redirects = new Map();
  const collapsed = [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => duplicatePreferenceScore(b) - duplicatePreferenceScore(a));
    const primary = ordered[0];
    for (const course of group) redirects.set(course.id, primary.id);
    return {
      ...primary,
      levels: sortLevels([...new Set(group.flatMap((course) => courseLevels(course)))]),
      modes: uniqueValues(group.flatMap((course) => course.modes || [])),
      intake: mergeTextValues(group.map((course) => course.intake)),
      dedupedCount: group.length
    };
  });

  collapsed.sort((a, b) => a.university.localeCompare(b.university) || a.name.localeCompare(b.name) || a.campus.localeCompare(b.campus));
  return { courses: collapsed, redirects };
}

function duplicatePreferenceScore(course) {
  const levelScore = { undergraduate: 40, postgraduate: 36, international: 24, online: 18 }[course.level] || 0;
  const rankScore = numericRank(course.atar) !== null ? 8 : hasSpecificInfo(course.atar) ? 4 : 0;
  const infoScore = [
    course.prerequisites,
    course.assumed,
    course.fees,
    course.careers,
    course.summary
  ].filter(hasSpecificInfo).length;
  return levelScore + rankScore + infoScore;
}

function sortLevels(levels) {
  const order = { undergraduate: 1, postgraduate: 2, international: 3, online: 4 };
  return levels.filter(Boolean).sort((a, b) => (order[a] || 99) - (order[b] || 99));
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function mergeTextValues(values) {
  const cleaned = uniqueValues(values).filter((value) => value !== "Not listed");
  return cleaned.length ? cleaned.join(", ") : "Not listed";
}

function isBroadTopicQuery(query) {
  const clean = cleanSearchText(query);
  return broadTopicQueries.has(clean) || topicOptions.some((topic) => cleanSearchText(topic.label) === clean);
}

function fieldValue(value) {
  const text = decodeHtmlEntities(value || "Not listed").trim() || "Not listed";
  if (text.length <= 260) return highlight(text);
  return `
    <details class="field-more">
      <summary>${highlight(truncateText(text, 220))} <span>Read full</span></summary>
      <p>${highlight(text)}</p>
    </details>
  `;
}

function truncateText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function providerOverallScore(provider) {
  const qualityScores = Object.values(providerQuality)
    .map((area) => area[provider.id]?.score)
    .filter((score) => Number.isFinite(score));
  if (qualityScores.length) return Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length);
  return Math.min(70, 42 + (provider.courseCount || 0) * 0.08);
}

function providerProfile(provider) {
  return `Profile score ${Math.round(providerOverallScore(provider))}/100`;
}

function savedCourseList() {
  state.savedIds = state.savedIds.filter((id) => courseById.has(id));
  return state.savedIds.map((id) => courseById.get(id));
}

function compareCourseList() {
  state.compareIds = state.compareIds.filter((id) => courseById.has(id));
  return state.compareIds.map((id) => courseById.get(id));
}

function toggleSaved(id) {
  if (!courseById.has(id)) return;
  state.savedIds = state.savedIds.includes(id)
    ? state.savedIds.filter((item) => item !== id)
    : [...state.savedIds, id];
  if (!state.savedIds.includes(id)) {
    state.compareIds = state.compareIds.filter((item) => item !== id);
    persistIdList(storageKeys.compare, state.compareIds);
  }
  persistIdList(storageKeys.saved, state.savedIds);
  render();
}

function toggleCompare(id) {
  if (!courseById.has(id)) return;
  if (state.compareIds.includes(id)) {
    state.compareIds = state.compareIds.filter((item) => item !== id);
  } else {
    state.compareIds = [...state.compareIds.filter((item) => item !== id), id].slice(-4);
    if (!state.savedIds.includes(id)) state.savedIds = [...state.savedIds, id];
  }
  persistIdList(storageKeys.saved, state.savedIds);
  persistIdList(storageKeys.compare, state.compareIds);
  render();
}

function readIdList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed
      .filter((id) => typeof id === "string")
      .map((id) => duplicateCourseMap.get(id) || id))];
  } catch {
    return [];
  }
}

function persistIdList(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    // Storage can be unavailable in restrictive browser modes; the UI still works for the session.
  }
}

function courseProviderScore(course) {
  const provider = allProviders.find((item) => item.id === course.providerId);
  return provider ? providerOverallScore(provider) : 50;
}

function searchProviderQuality(course, query) {
  const topic = topicForQuery(query);
  const fieldScore = topic ? providerQuality[topic.label]?.[course.providerId]?.score : undefined;
  return Number.isFinite(fieldScore) ? fieldScore : courseProviderScore(course) * 0.5;
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, numberValue) => String.fromCodePoint(Number(numberValue)))
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
if (state.askOpen) scrollAskToBottom();

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#ask") {
    state.askOpen = true;
    render();
    scrollAskToBottom();
    return;
  }
  if (state.askOpen) {
    state.askOpen = false;
    render();
    return;
  }
  render();
});
