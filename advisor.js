const advisorApp = document.querySelector("#advisor-app");
const importedCourses = window.uacCourses || [];
const collapsedImport = collapseDuplicateCourses(importedCourses);
const allCourses = collapsedImport.courses;
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
const topicScoreCache = new WeakMap();
const providerScoreCache = new Map();
const advisorRankCache = { key: "", value: [] };

const levelLabels = {
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  international: "International",
  online: "Online"
};

const topicOptions = [
  { label: "Technology", keywords: ["technology", "computer", "software", "cyber", "data", "information technology", "it", "artificial intelligence", "game", "analytics", "coding", "programming", "developer", "web", "app", "enterprise computing", "information systems"] },
  { label: "Medicine and Health", keywords: ["medicine", "medical", "health", "nursing", "clinical", "psychology", "nutrition", "physiotherapy", "pharmacy", "biomedical", "chiropractic"] },
  { label: "Engineering", keywords: ["engineering", "civil", "mechanical", "electrical", "mechatronic", "construction", "robotics"] },
  { label: "Architecture and Built Environment", keywords: ["architecture", "architectural", "built environment", "construction", "property", "planning", "interior architecture", "landscape", "urban", "building"] },
  { label: "Business", keywords: ["business", "commerce", "finance", "accounting", "marketing", "management", "economics"] },
  { label: "Food, Hospitality and Tourism", keywords: ["cooking", "cook", "chef", "culinary", "food", "baking", "nutrition", "hospitality", "tourism", "event management", "events", "hotel", "restaurant", "dietetics", "food science", "food technology", "food innovation"] },
  { label: "Law and Justice", keywords: ["law", "legal", "justice", "criminology", "policy"] },
  { label: "Creative Arts and Design", keywords: ["design", "creative", "animation", "music", "screen", "media", "arts", "visual", "game"] },
  { label: "Education", keywords: ["education", "teaching", "teacher", "early childhood", "primary", "secondary"] },
  { label: "Sport and Exercise", keywords: ["sport", "sports", "exercise", "fitness", "coaching", "pdhpe", "health promotion", "physical education", "athlete"] },
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

const pathwayLinks = [
  {
    title: "Educational Access Scheme",
    text: "For long-term educational disadvantage that may affect selection rank.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes"
  },
  {
    title: "Schools Recommendation Scheme",
    text: "Early offers using criteria beyond ATAR for eligible Year 12 students.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes/how-to-apply"
  },
  {
    title: "Selection-rank adjustments",
    text: "Subject, equity, location or other adjustments can help for specific courses.",
    url: "https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/"
  },
  {
    title: "TAFE NSW pathways",
    text: "Vocational study and credit-transfer routes into later university study.",
    url: "https://www.tafensw.edu.au/study/pathways"
  }
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
    placeholder: "Example: too much maths, long commute, heavy placements"
  },
  {
    key: "pathways",
    label: "Open to pathways if direct entry is hard?",
    type: "select",
    options: ["Yes", "Maybe", "No"]
  }
];

const params = new URLSearchParams(window.location.search);
const advisorDefaults = Object.fromEntries(advisorQuestions.map((question) => [question.key, ""]));
const state = {
  advisor: {
    ...advisorDefaults,
    atar: params.get("atar") || "75",
    careerPriority: "High employability",
    studyMode: "Any mode",
    campus: "Any Sydney campus",
    pathways: "Maybe"
  },
  advisorRun: false,
  advisorChat: [],
  aiBusy: false,
  aiProvider: "Site-trained helper"
};

function render() {
  const profile = advisorProfile();
  const ranked = state.advisorRun ? advisorRankedCourses().slice(0, 6) : [];
  advisorApp.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
        <a href="./index.html#atar">ATAR match</a>
        <a href="./advisor.html" aria-current="page">Course helper</a>
        <a href="./index.html#ask">Ask?</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
    </header>

    <main class="advisor-main">
      <section class="hero advisor-hero">
        <div>
          <h1>Course helper</h1>
          <p>Answer a focused set of questions, then get a data-based first direction from the Sydney UAC course dataset. The chat is trained on this page's course data and pathway rules so it stays fast and grounded.</p>
        </div>
        <dl class="stats two">
          <div><dt>Course records</dt><dd>${number(allCourses.length)}</dd></div>
          <div><dt>Imported</dt><dd>${escapeHtml((meta.importedAt || "").slice(0, 10) || "Today")}</dd></div>
        </dl>
      </section>

      <section class="panel advisor-panel">
        <div class="panel-head">
          <div>
            <h2>Find a direction</h2>
            <p>The first answer is mostly data scoring from course name, field, ATAR fit, subjects, interests, mode, campus and provider profile.</p>
          </div>
          <a class="help-link" href="./index.html#atar">Back to ATAR match</a>
        </div>
        ${renderAdvisor(ranked, profile)}
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Pathways if direct entry is tight</h2>
            <p>Use these when your ATAR is below the course profile, the course has no ATAR-only offers, or you want a safer backup.</p>
          </div>
        </div>
        <div class="pathway-grid">
          ${pathwayLinks.map((link) => `
            <a class="pathway-card" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">
              <strong>${escapeHtml(link.title)}</strong>
              <small>${escapeHtml(link.text)}</small>
            </a>
          `).join("")}
        </div>
      </section>
    </main>
  `;
  bindEvents();
}

function renderAdvisor(ranked, profile) {
  return `
    <form class="advisor-form" data-form="advisor">
      ${advisorQuestions.map(renderAdvisorQuestion).join("")}
      <button type="submit" class="match-btn">Find my course direction</button>
    </form>
    ${state.advisorRun ? renderAdvisorResult(ranked, profile) : `<p class="empty-note">The first recommendation is algorithmic. The follow-up chat uses the same imported course data, pathway rules and your answers. No popups or unsupported external claims.</p>`}
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

function renderAdvisorResult(ranked, profile) {
  const primary = ranked[0]?.course;
  return `
    <div id="result" class="advisor-result">
      <div class="advisor-summary">
        <h3>${primary ? `Best first direction: ${highlight(primary.name)}` : "Best first direction"}</h3>
        <p>${escapeHtml(advisorSummaryText(primary, profile))}</p>
        <small>How this was decided: the app scores topic fit, subject fit, ATAR gap, campus/mode preference, provider profile and avoid-list penalties. The chat then explains that score in plain language.</small>
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
        <div class="chat-head">
          <h3>Chat with the helper</h3>
          <span>${state.aiBusy ? "Thinking..." : escapeHtml(state.aiProvider)}</span>
        </div>
        <div class="chat-log">
          ${state.advisorChat.length ? state.advisorChat.map((message) => `
            <div class="chat-message ${message.role}${message.pending ? " pending" : ""}">
              <strong>
                ${message.role === "user" ? "You" : "Helper"}
                ${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}
              </strong>
              <p>${highlight(cleanAiText(message.text))}</p>
            </div>
          `).join("") : `<p class="empty-note">Ask about career fit, ATAR risk, pathways, workload, income potential or which option is safest.</p>`}
        </div>
        <form class="chat-form" data-form="advisor-chat">
          <input name="message" autocomplete="off" placeholder="Ask a follow-up question" ${state.aiBusy ? "disabled" : ""} />
          <button type="submit" ${state.aiBusy ? "disabled" : ""}>${state.aiBusy ? "Thinking" : "Ask"}</button>
        </form>
      </div>
    </div>
  `;
}

function bindEvents() {
  advisorApp.querySelector('[data-form="advisor"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    advisorApp.querySelectorAll("[data-advisor-field]").forEach((field) => {
      state.advisor[field.dataset.advisorField] = field.value.trim();
    });
    state.advisorRun = true;
    state.advisorChat = [{
      role: "assistant",
      text: advisorOpeningMessage(advisorRankedCourses().slice(0, 8))
    }];
    render();
    scrollToResult();
  });

  advisorApp.querySelectorAll("[data-advisor-field]").forEach((field) => {
    field.addEventListener("input", () => {
      state.advisor[field.dataset.advisorField] = field.value;
    });
    field.addEventListener("change", () => {
      state.advisor[field.dataset.advisorField] = field.value;
    });
  });

  advisorApp.querySelector('[data-form="advisor-chat"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = event.target.message.value.trim();
    if (!message || state.aiBusy) return;
    state.advisorChat.push({ role: "user", text: message });
    const pendingMessage = { role: "assistant", text: "Checking your answers against the UAC course data...", pending: true, provider: "Thinking" };
    state.advisorChat.push(pendingMessage);
    state.aiBusy = true;
    state.aiProvider = "Thinking";
    event.target.message.value = "";
    renderPreservingScroll(true);
    const reply = await advisorChatReply(message);
    pendingMessage.text = cleanAiText(reply.text);
    pendingMessage.provider = reply.provider;
    pendingMessage.pending = false;
    state.aiBusy = false;
    state.aiProvider = reply.provider;
    renderPreservingScroll(true);
  });
}

function renderPreservingScroll(keepChatAtBottom = false) {
  const x = window.scrollX;
  const y = window.scrollY;
  render();
  requestAnimationFrame(() => {
    window.scrollTo(x, y);
    if (keepChatAtBottom) scrollChatToBottom();
  });
}

function scrollToResult() {
  requestAnimationFrame(() => {
    advisorApp.querySelector("#result")?.scrollIntoView({ block: "start", behavior: "smooth" });
    scrollChatToBottom();
  });
}

function scrollChatToBottom() {
  const log = advisorApp.querySelector(".chat-log");
  if (log) log.scrollTop = log.scrollHeight;
}

function advisorProfile() {
  const textParts = [
    [state.advisor.passions, 6],
    [state.advisor.subjects, 1.6],
    [state.advisor.strengths, 1.4],
    [state.advisor.workStyle, 1.2],
    [state.advisor.careerPriority, 1]
  ];
  const topicScores = topicOptions.map((topic) => ({
    topic,
    score: textParts.reduce((sum, [text, weight]) => sum + topicSignalScore(text, topic) * weight, 0)
  }));
  const combined = cleanSearchText([
    state.advisor.subjects,
    state.advisor.passions,
    state.advisor.strengths,
    state.advisor.workStyle,
    state.advisor.careerPriority,
    state.advisor.avoid
  ].join(" "));
  const avoid = cleanSearchText(state.advisor.avoid);
  const passionText = cleanSearchText(state.advisor.passions);
  const subjectText = cleanSearchText(state.advisor.subjects);
  const lazyPreference = /lazy|easy|chill|low stress|less stress|not much work|too much work|work life balance|workload|low workload/.test(combined);

  applyQuestionBoosts(topicScores, combined, lazyPreference, passionText, subjectText);
  topicScores.sort((a, b) => b.score - a.score);

  return {
    atar: Number(state.advisor.atar) || 75,
    topic: topicScores[0]?.score > 0 ? topicScores[0].topic : topicOptions[0],
    topicScores,
    text: combined,
    avoid,
    lazyPreference,
    mode: state.advisor.studyMode || "Any mode",
    campus: state.advisor.campus || "Any Sydney campus",
    careerPriority: state.advisor.careerPriority || "High employability",
    pathways: state.advisor.pathways || "Maybe"
  };
}

function topicSignalScore(text, topic) {
  const clean = cleanSearchText(text);
  if (!clean) return 0;
  return topic.keywords.reduce((score, keyword) => {
    if (phraseMatch(clean, keyword)) return score + 4;
    return tokenise(keyword).some((word) => tokenMatch(clean, word)) ? score + 1.2 : score;
  }, 0);
}

function applyQuestionBoosts(topicScores, combined, lazyPreference, passionText, subjectText) {
  const boost = (label, amount) => {
    const row = topicScores.find((entry) => entry.topic.label === label);
    if (row) row.score += amount;
  };

  const foodInterest = /cooking|cook|chef|culinary|food|baking|nutrition|hospitality|tourism|restaurant|hotel|events?|dietetics|food science|food technology/.test(passionText);
  if (foodInterest) {
    boost("Food, Hospitality and Tourism", 34);
    boost("Medicine and Health", /nutrition|dietetics|helping people|clinical|care/.test(combined) ? 8 : 2);
    boost("Technology", -20);
    boost("Business", /business studies|commerce|finance|accounting|management|marketing/.test(subjectText) ? 1 : -6);
  }

  if (/business studies|economics|commerce|finance|accounting|management|marketing/.test(subjectText)) boost("Business", foodInterest ? 3 : 9);
  if (/coding|programming|software|enterprise computing|information technology|technology|data|cyber|computer|developer|web development|app development|information systems/.test(passionText)) boost("Technology", 26);
  if (/coding|programming|software|enterprise computing|information technology|technology|data|cyber|computer|developer|web development|app development|information systems/.test(subjectText)) boost("Technology", foodInterest ? 6 : 14);
  if (/physics|engineering|construction|mechanical|electrical|robotics/.test(combined)) boost("Engineering", 7);
  if (/architecture|architectural|built environment|construction|property|planning|urban|building|interior architecture/.test(combined)) boost("Architecture and Built Environment", 10);
  if (/biology|chemistry|pdhpe|health|clinical|care|medical|medicine|nursing/.test(combined)) boost("Medicine and Health", 6);
  if (/legal studies|law|justice|policy|advocacy/.test(combined)) boost("Law and Justice", 8);
  if (/visual arts|design|creative|music|media|film|animation/.test(combined)) boost("Creative Arts and Design", 8);
  if (/teaching|teacher|education|mentoring/.test(combined)) boost("Education", 7);
  if (/pdhpe|sport|sports|exercise|fitness|coaching|athlete|physical education/.test(combined)) boost("Sport and Exercise", 10);
  if (/social work|community|counselling|counseling|human services|welfare|youth|support work|mental health/.test(combined)) boost("Social Work and Community", 10);
  if (/science|research|mathematics|biology|chemistry|physics/.test(combined)) boost("Science", 5);
  if (/high income|salary|money|pay/.test(combined)) {
    boost("Technology", /coding|programming|software|computer|enterprise computing|data|cyber/.test(combined) ? 12 : 8);
    boost("Business", /business studies|commerce|finance|accounting|economics/.test(combined) ? 7 : 3);
    boost("Engineering", 6);
    boost("Law and Justice", 4);
  }
  if (lazyPreference) {
    boost("Technology", 8);
    boost("Business", 8);
    boost("Medicine and Health", -10);
    boost("Education", -5);
    boost("Science", -4);
  }
}

function advisorRankedCourses() {
  const cacheKey = JSON.stringify(state.advisor);
  if (advisorRankCache.key === cacheKey) return advisorRankCache.value;
  const profile = advisorProfile();
  const ranked = allCourses
    .map((course) => advisorScoreCourse(course, profile))
    .filter((entry) => entry.score > 14)
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .slice(0, 12);
  advisorRankCache.key = cacheKey;
  advisorRankCache.value = ranked;
  return ranked;
}

function advisorScoreCourse(course, profile) {
  const rank = numericRank(course.atar);
  const text = courseText(course);
  const topicScore = topicWeightedScore(course, profile.topic);
  const subjectScore = weightedTokenHits(text, state.advisor.subjects, 4);
  const passionScore = weightedTokenHits(text, state.advisor.passions, 7);
  const gap = rank === null ? 0 : profile.atar - rank;
  const atarScore = rank === null ? 6 : gap >= 0 ? 22 - Math.min(gap, 18) * 0.25 : Math.max(0, 18 - Math.abs(gap) * 2.15);
  const modeScore = profile.mode === "Any mode" || (course.modes || []).includes(profile.mode) ? 7 : 0;
  const campusScore = campusPreferenceScore(course, profile.campus);
  const providerScore = searchProviderQuality(course, profile.topic.label) * 0.12;
  const careerScore = careerPriorityScore(course, profile);
  const avoidPenalty = avoidPenaltyScore(course, profile);
  const lowLoadScore = lowLoadFitScore(course, profile);
  const topicFitAdjustment = topicFitScore(course, profile);
  const qualificationAdjustment = qualificationFitScore(course, profile);
  const pathwayBoost = profile.pathways !== "No" && profile.atar < 65 && /diploma|pathway|via diploma/i.test(course.name) ? 5 : 0;
  const topicContribution = Math.min(topicScore, 130) * 0.28;
  const score = Math.max(0, topicContribution + subjectScore + passionScore + atarScore + modeScore + campusScore + providerScore + careerScore + lowLoadScore + topicFitAdjustment + qualificationAdjustment + pathwayBoost - avoidPenalty);
  const fitScore = score ? Math.min(99, (score / (score + 20)) * 100) : 0;
  const reasons = advisorReasons(course, profile, gap, rank, topicScore, modeScore, campusScore, lowLoadScore);
  return { course, score: fitScore, reasons };
}

function topicFitScore(course, profile) {
  const text = courseText(course);
  const title = cleanSearchText(course.name);
  const wantsEducation = /teaching|teacher|education|mentoring/.test(profile.text);
  if (profile.topic.label === "Technology") {
    if (!wantsEducation && /education|teaching|teacher|secondary|early childhood/.test(title)) return -56;
    if (/criminology|law|justice|health|clinical|nursing|psychology|social work/.test(title)) return -42;
    if (/information technology|computer|software|data|cyber|artificial intelligence|coding|programming|developer|web|app development|information systems|business information systems|analytics|games|game development/.test(text)) return 18;
    if (/education|teaching|teacher|fine arts|visual arts|clinical|nursing|law|criminology/.test(text)) return -32;
    return -18;
  }
  if (profile.topic.label === "Business") {
    if (/business|commerce|finance|accounting|economics|management|marketing|analytics/.test(text)) return 14;
    return -10;
  }
  if (profile.topic.label === "Food, Hospitality and Tourism") {
    if (!wantsEducation && /education|teaching|teacher|secondary|early childhood/.test(title)) return -120;
    if (/nutrition|food|culinary|hospitality|tourism|event|hotel|restaurant|dietetics|dietitian|food science|food technology|food innovation/.test(text)) return 24;
    if (/health science|biomedical|public health|exercise|sport/.test(text)) return 5;
    if (/information technology|computer science|software|cyber|engineering|law|criminology|accounting|finance/.test(title)) return -46;
    return -18;
  }
  return 0;
}

function qualificationFitScore(course, profile) {
  const title = cleanSearchText(course.name);
  let score = 0;
  if (profile.atar >= 65 && /via diploma|^diploma|^advanced diploma/.test(title)) score -= 10;
  if (/diploma in industry practice/.test(title)) score -= 5;
  if (!/education|law|medicine|engineering/.test(profile.text) && /\/bachelor|bachelor of .+ bachelor of /.test(title)) score -= 8;
  return score;
}

function weightedTokenHits(text, value, weight) {
  const stopWords = new Set(["and", "the", "with", "for", "too", "much", "work", "standard", "advanced", "studies"]);
  return tokenise(value)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .filter((word) => tokenMatch(text, word))
    .length * weight;
}

function careerPriorityScore(course, profile) {
  const text = courseText(course);
  const priority = profile.careerPriority;
  if (priority === "Helping people") return /health|nursing|medicine|education|teaching|social|psychology|counselling|nutrition|dietetics|hospitality|community/.test(text) ? 8 : 0;
  if (priority === "Creative freedom") return /design|creative|music|animation|media|arts|film|screen/.test(text) ? 8 : 0;
  if (priority === "High income potential") return /engineering|computer|software|data|commerce|business|finance|law|cyber|analytics|accounting/.test(text) ? 10 : 0;
  if (priority === "High employability") return /teaching|nursing|engineering|computer|cyber|accounting|health|construction|data|business|social work|nutrition|hospitality|exercise/.test(text) ? 8 : 0;
  if (priority === "Lower ATAR risk") return numericRank(course.atar) !== null && numericRank(course.atar) <= profile.atar ? 8 : 0;
  if (priority === "Prestige") return courseProviderScore(course) * 0.08;
  return 4;
}

function lowLoadFitScore(course, profile) {
  if (!profile.lazyPreference) return 0;
  const text = courseText(course);
  let score = 0;
  if (/information technology|computer|software|data|cyber|analytics|business|commerce|accounting|finance|economics|management|marketing|information systems/.test(text)) score += 16;
  if (/online|part time|flexible/.test(text)) score += 3;
  if (/actuarial|advanced mathematics|mathematics extension/.test(text)) score -= 28;
  if (/double degree|combined degree|bachelor of .+ bachelor of|law|engineering/.test(text)) score -= 16;
  if (/clinical|chiropractic|nursing|medicine|paramedicine|physiotherapy|teaching|education|early childhood|social work|counselling|sport|exercise|lab|laboratory|construction/.test(text)) score -= 18;
  return score;
}

function avoidPenaltyScore(course, profile) {
  const text = courseText(course);
  const stopWords = new Set(["too", "much", "work", "course", "job", "study", "sydney", "university", "campus", "college", "institute"]);
  let penalty = tokenise(profile.avoid)
    .filter((word) => word.length > 2 && !stopWords.has(word))
    .filter((word) => tokenMatch(text, word))
    .length * 7;
  if (profile.avoid && phraseMatch(course.university, profile.avoid)) penalty += 44;
  if (/math/.test(profile.avoid) && /mathematics|engineering|physics|data|computer science|software/.test(text)) penalty += 8;
  if (/clinical|care|people|patient/.test(profile.avoid) && /clinical|nursing|medicine|health|psychology|social work|counselling/.test(text)) penalty += 10;
  if (profile.lazyPreference && /actuarial|double degree|combined degree|bachelor of .+ bachelor of|honours|law/.test(text)) penalty += 22;
  if (profile.lazyPreference && /clinical|chiropractic|nursing|medicine|teaching|education|sport|exercise/.test(text)) penalty += 12;
  return penalty;
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

function advisorReasons(course, profile, gap, rank, topicScore, modeScore, campusScore, lowLoadScore) {
  const reasons = [];
  if (topicScore > 0) reasons.push(`Matches your ${profile.topic.label.toLowerCase()} interests.`);
  if (rank !== null) reasons.push(gap >= 0 ? `ATAR profile is ${gap.toFixed(1)} below your estimate.` : `ATAR profile is ${Math.abs(gap).toFixed(1)} above your estimate, so keep a pathway backup.`);
  if (lowLoadScore > 0) reasons.push("Lower physical or clinical load than health-heavy options.");
  if (modeScore) reasons.push("Study mode fits your preference.");
  if (campusScore) reasons.push("Campus preference is a reasonable fit.");
  if (!reasons.length) reasons.push("Included as a broad match from the UAC dataset.");
  return reasons;
}

function advisorSummaryText(primary, profile) {
  if (!primary) return "I could not find a confident match from the current answers. Add more subjects, interests or a broader career direction.";
  const rank = numericRank(primary.atar);
  const atarLine = rank === null ? "UAC does not list a numeric ATAR profile for it." : `Its listed ATAR profile is ${displayRank(primary.atar)} against your estimate of ${profile.atar}.`;
  const loadLine = profile.lazyPreference ? " Because you mentioned workload or wanting an easier day-to-day, clinical-heavy and placement-heavy courses were penalised." : "";
  return `${primary.name} is the strongest first direction because it matches your ${profile.topic.label.toLowerCase()} pattern, preferences and available UAC data. ${atarLine}${loadLine}`;
}

function advisorOpeningMessage(ranked) {
  if (!ranked.length) return "I need a little more detail to make a useful recommendation. Add subjects, interests and what kind of work sounds good.";
  const profile = advisorProfile();
  const names = listCourseNames(ranked, 3);
  if (profile.lazyPreference && profile.careerPriority === "High income potential") {
    return `Based on the data, I would start with these lower-clinical-load options: ${names}. For good pay without a heavy care workload, compare business, IT, data, cyber and finance-style courses first.`;
  }
  return `Based on the course data first, I would start by comparing: ${names}. Ask me about safety, ATAR risk, pathways, workload, careers or which one fits you best.`;
}

function directCourseFactReply(question, ranked, profile) {
  const wantsFacts = /atar|selection|rank|prereq|prerequisite|assumed|knowledge|fee|cost|career|job|campus|mode|duration|intake|link|website|official|uac/.test(question);
  if (!wantsFacts) return "";
  const matches = advisorKnowledgeCourses(question, profile, ranked).slice(0, 2);
  if (!matches.length) return "";
  const lines = matches.map(({ course }) => {
    const facts = [];
    if (/atar|selection|rank/.test(question)) facts.push(`ATAR profile: ${displayRank(course.atar)}`);
    if (/prereq|prerequisite/.test(question)) facts.push(`prerequisites: ${shortField(course.prerequisites)}`);
    if (/assumed|knowledge/.test(question)) facts.push(`assumed knowledge: ${shortField(course.assumed)}`);
    if (/fee|cost/.test(question)) facts.push(`fees: ${shortField(course.fees)}`);
    if (/career|job/.test(question)) facts.push(`careers: ${shortField(course.careers)}`);
    if (/campus|mode|duration|intake/.test(question)) facts.push(`campus/mode: ${course.campus}; ${(course.modes || []).join(", ") || "mode not listed"}; duration ${shortField(course.duration)}; intake ${shortField(course.intake)}`);
    if (/link|website|official|uac/.test(question)) facts.push(`links: UAC ${course.uacUrl}${course.officialUrl ? `; official ${course.officialUrl}` : ""}`);
    if (!facts.length) facts.push(`ATAR profile: ${displayRank(course.atar)}; prerequisites: ${shortField(course.prerequisites)}`);
    return `${course.name} at ${course.university}: ${facts.join("; ")}.`;
  });
  return avoidRepeatedReply(`${lines.join(" ")} I am only using imported UAC fields here, so confirm final details on the official page before applying.`, matches, profile);
}

async function advisorChatReply(message) {
  const ranked = advisorRankedCourses().slice(0, 6);
  const profile = advisorProfile();
  const fallback = localAdvisorChatReply(message);
  const aiReply = await advisorAiReply(message, profile, ranked, fallback);
  if (aiReply?.text) return aiReply;
  return { text: avoidRepeatedReply(cleanAiText(fallback), ranked, profile), provider: "Site-trained helper" };
}

async function advisorAiReply(message, profile, ranked, fallback) {
  try {
    const prompt = buildAdvisorAiPrompt(message, profile, ranked, fallback);
    const text = await withTimeout(fetchAdvisorAiText(prompt), 10000);
    const cleaned = cleanAiText(text);
    if (!cleaned || cleaned.length < 45 || isProviderNotice(cleaned)) return null;
    return { text: avoidRepeatedReply(cleaned, ranked, profile), provider: "Free AI + UAC data" };
  } catch {
    return null;
  }
}

function buildAdvisorAiPrompt(message, profile, ranked, fallback) {
  const profileContext = `ATAR ${profile.atar}; area ${profile.topic.label}; subjects ${state.advisor.subjects || "not provided"}; interests ${state.advisor.passions || "not provided"}; outcome ${state.advisor.careerPriority || "not provided"}; campus ${state.advisor.campus || "not provided"}; avoid ${state.advisor.avoid || "none"}`;
  const topCourses = ranked.slice(0, 3).map(({ course, score, reasons }, index) => {
    return `${index + 1}. ${course.name} | ${course.university} | ${course.campus} | ATAR ${displayRank(course.atar)} | fit ${Math.round(score)}/100 | ${reasons.slice(0, 2).join(" ")}`;
  }).join("\n");
  const facts = advisorKnowledgeCourses(cleanSearchText(message), profile, ranked)
    .slice(0, 4)
    .map(({ course, reason }, index) => `${index + 1}. ${course.name} | ${course.university} | ${course.campus} | ATAR ${displayRank(course.atar)} | ${reason}`)
    .join("\n") || "No extra course facts matched this question.";
  const prompt = [
    "Course helper for a Sydney UAC course finder. Use the local answer as truth and improve wording only. Use only supplied UAC/site data. Do not invent ATARs, prerequisites, rankings, fees, internships or guarantees. If missing, say check UAC/official course page. Direct, 3-5 sentences, plain text only.",
    `Student profile: ${profileContext}`,
    `Algorithm matches:\n${topCourses}`,
    `Question facts:\n${facts}`,
    `Local answer: ${fallback}`,
    `Student question: ${message}`,
    "Answer:"
  ].join("\n\n");
  return prompt.slice(0, 2500);
}

async function fetchAdvisorAiText(prompt) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9800);
    try {
      const response = await fetch("/api/ask-ai", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.text) return data.text;
      }
    } catch {
      // Try one more time; the free model endpoint can occasionally fail cold.
    } finally {
      window.clearTimeout(timer);
    }
    await delay(350);
  }
  return "";
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function advisorKnowledgeContext(message, profile, ranked) {
  return advisorKnowledgeCourses(cleanSearchText(message), profile, ranked)
    .slice(0, 6)
    .map(({ course, reason }, index) => {
      return `${index + 1}. ${course.name} | ${course.university} | ${course.campus} | ATAR ${displayRank(course.atar)} | prerequisites ${shortField(course.prerequisites)} | assumed ${shortField(course.assumed)} | careers ${shortField(course.careers)} | source ${course.uacUrl} | why matched: ${reason}`;
    })
    .join("\n");
}

function advisorKnowledgeCourses(question, profile, ranked) {
  const queryWords = tokenise(question);
  const currentRanked = new Map(ranked.map((entry, index) => [entry.course.id, 80 - index * 5]));
  const hasCourseLikeQuestion = queryWords.length >= 2 || /atar|prereq|career|job|campus|mode|duration|fee|link/.test(question);
  const scored = allCourses.map((course) => {
    const text = courseText(course);
    const title = cleanSearchText(course.name);
    let score = currentRanked.get(course.id) || 0;
    if (question && phraseMatch(title, question)) score += 220;
    if (question && phraseMatch(text, question)) score += 60;
    score += queryWords.filter((word) => word.length > 2 && tokenMatch(title, word)).length * 22;
    score += queryWords.filter((word) => word.length > 2 && tokenMatch(text, word)).length * 5;
    score += Math.min(topicWeightedScore(course, profile.topic), 120) * 0.18;
    if (/atar|selection|rank/.test(question) && numericRank(course.atar) !== null) score += 8;
    if (/prereq|prerequisite/.test(question) && hasSpecificInfo(course.prerequisites)) score += 8;
    if (/career|job|employ/.test(question) && hasSpecificInfo(course.careers)) score += 8;
    return { course, score };
  }).filter((entry) => entry.score > (hasCourseLikeQuestion ? 14 : 35));

  const seen = new Set();
  return scored
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .filter((entry) => {
      const key = `${cleanSearchText(entry.course.name)}|${entry.course.providerId}|${cleanSearchText(entry.course.campus)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map((entry) => ({
      ...entry,
      reason: currentRanked.has(entry.course.id) ? "current recommendation" : "question keyword match"
    }));
}

function localAdvisorChatReply(message) {
  const question = cleanSearchText(message);
  const ranked = advisorRankedCourses().slice(0, 5);
  const profile = advisorProfile();
  const primary = ranked[0]?.course;
  if (!primary) return "I need more answers first. Fill in subjects, passions and ATAR, then run the helper.";

  const directFacts = directCourseFactReply(question, ranked, profile);
  if (directFacts) return directFacts;

  const wantsLowWorkHighPay = /(lazy|easy|chill|low stress|less work|not much work|too much work|workload|work life balance)/.test(question) && /(pay|paid|money|salary|income|good pay|high pay|rich)/.test(question);
  if (wantsLowWorkHighPay) {
    const suggestions = themedSuggestions(profile, "lowWorkHighPay").slice(0, 12);
    const names = suggestions.length ? listCourseNames(suggestions, 3) : listCourseNames(ranked, 3);
    return avoidRepeatedReply(`Real answer: no degree guarantees a lazy high-paying job, but you can aim for lower physical and emotional load with a good pay ceiling. From your answers I would look at ${names}. These point more toward IT, data, cyber, business analytics, finance or commerce-style work. I would be careful with clinical, nursing, teaching, chiropractic or heavy placement courses if "too much work" means stress, unpaid placements or constant people-facing responsibility.`, ranked, profile);
  }

  if (/cooking|cook|chef|culinary|food|baking|nutrition|hospitality|tourism|restaurant|hotel|event/.test(question) || profile.topic.label === "Food, Hospitality and Tourism") {
    const suggestions = themedSuggestions(profile, "food").slice(0, 12);
    const names = suggestions.length ? listCourseNames(suggestions, 3) : listCourseNames(ranked, 3);
    return avoidRepeatedReply(`Yep, cooking should matter. From the dataset I would read that as food, nutrition, hospitality or tourism rather than general IT. The closest course directions to inspect are ${names}. If you want the people-helping side, start with nutrition or health-linked food courses; if you want the service/business side, compare hospitality, tourism and events pathways.`, suggestions.length ? suggestions : ranked, profile);
  }

  if (/why|why not|instead|computer science|comp sci|cs\b|sonion|so why/.test(question) && /computer science|comp sci|cs\b/.test(question)) {
    return computerScienceComparisonReply(ranked, profile);
  }

  if (/coding|programming|software|technology|computer|it|business|why|based|topic|interest|not business/.test(question) && profile.topic.label === "Technology") {
    const techPicks = ranked
      .filter(({ course }) => /information technology|computer|software|data|cyber|artificial intelligence|games|technology/i.test(courseText(course)))
      .slice(0, 3);
    const names = techPicks.length ? listCourseNames(techPicks, 3) : listCourseNames(ranked, 3);
    const businessNote = /business|commerce|finance|accounting/.test(profile.text)
      ? "Business words are present in your subjects, but your typed interest and the course titles are carrying the stronger technology signal."
      : "It is not treating business as the main direction because your interest and course matches point more strongly to computing and IT.";
    return avoidRepeatedReply(`Yes, this recommendation is being driven by the technology signal. I detected coding, computing, IT or apps in your answers, then boosted courses whose UAC title or field includes technology terms. The clearest matches are ${names}. ${businessNote}`, techPicks.length ? techPicks : ranked, profile);
  }

  if (/atar|low|rank|entry|pathway|backup|dont get|do not get|miss out/.test(question)) {
    const rank = numericRank(primary.atar);
    const gap = rank === null ? null : profile.atar - rank;
    const risk = gap === null ? "does not have a numeric UAC profile, so treat it as uncertain" : gap >= 3 ? "looks reasonably safe from the ATAR profile" : gap >= 0 ? "is possible, but still needs backups" : `sits about ${Math.abs(gap).toFixed(1)} points above your estimate`;
    return avoidRepeatedReply(`${primary.name} ${risk}. Keep a dream course first, then add related safer courses and pathways such as EAS, SRS, adjustment factors, diplomas, TAFE-to-uni options and internal transfer after first year.`, ranked, profile);
  }

  if (/compare|which|best|choose|better|between/.test(question)) {
    const comparisons = ranked.slice(0, 3).map(({ course }) => {
      const rank = numericRank(course.atar);
      return `${course.name}: ${course.university}, ${displayRank(course.atar)} ${rank !== null && rank <= profile.atar ? "ATAR fit" : "entry risk to check"}`;
    }).join("; ");
    return avoidRepeatedReply(`Compare them like this: ${comparisons}. My first pick stays ${primary.name}, but the best personal choice is the one with the clearest career path, realistic commute, manageable prerequisites and subjects you can tolerate for three or more years.`, ranked, profile);
  }

  if (/job|career|employ|employment|money|salary|income|pay|graduate/.test(question)) {
    const suggestions = themedSuggestions(profile, "employment").slice(0, 12);
    const names = suggestions.length ? listCourseNames(suggestions, 3) : primary.name;
    return avoidRepeatedReply(`For employment confidence, look for courses with practical experience, accreditation where relevant, internships, industry projects and clear graduate roles. In your current profile I would inspect ${names} first, then compare official course career sections and QILT-style graduate outcomes before deciding.`, ranked, profile);
  }

  if (/subject|prereq|math|english|science|assumed|knowledge/.test(question)) {
    return avoidRepeatedReply(`Check prerequisites before anything else because they can block entry. ${primary.name} lists prerequisites as: ${shortField(primary.prerequisites)}. Assumed knowledge is different: it usually will not block entry, but missing maths, science or English background can make first year harder.`, ranked, profile);
  }

  if (/stress|hard|difficult|workload|placement|practical/.test(question)) {
    return avoidRepeatedReply(`Workload depends on the course type. Clinical, education and health courses often have placements and people-facing pressure. IT, business, analytics and some design courses can still be hard, but the work is usually more project-based. For your profile, check ${primary.name} and then compare assessment style, placement hours and weekly contact hours on the official course page.`, ranked, profile);
  }

  const reply = `I would keep ${primary.name} as your first serious option from the data. To make the decision sharper, ask yourself: do I like the actual subjects, can I meet entry requirements, is the commute realistic, and does the career day-to-day sound acceptable rather than just impressive?`;
  return avoidRepeatedReply(reply, ranked, profile);
}

function computerScienceComparisonReply(ranked, profile) {
  const primary = ranked[0]?.course;
  const primaryScore = ranked[0]?.score || 0;
  const options = computerScienceOptions(profile).slice(0, 4);
  if (!options.length) {
    return "Computer Science is relevant for coding, but I could not find a strong Sydney-campus Computer Science match in the imported UAC data for this profile. Search Computer Science directly and compare the official UAC entries, because some providers list related IT, Information Systems, software or games courses instead.";
  }

  const best = options[0];
  const bestGap = atarGapText(best.course, profile);
  const bestScore = Math.round(best.score);
  const primaryLine = primary
    ? `${primary.name} was ranked higher because it scored better across your topic fit, ATAR estimate, campus/mode preferences and avoid-list rules.`
    : "The current list ranked related technology courses first from your answers.";
  const safeOptions = options
    .filter(({ course }) => numericRank(course.atar) !== null && numericRank(course.atar) <= profile.atar)
    .slice(0, 2);
  const safeLine = safeOptions.length
    ? `The most realistic Computer Science options to inspect are ${listCourseLabels(safeOptions, 2)}.`
    : "Most Computer Science options with a numeric profile sit above your ATAR estimate, so treat them as reach choices and keep pathways/backups.";
  const scoreLine = best.score >= primaryScore - 3
    ? "Computer Science is still a valid direction; it just needs to be compared directly against the current first pick."
    : `The strongest Computer Science match scored ${bestScore}/100 here, below the current first pick's ${Math.round(primaryScore)}/100.`;

  return `${scoreLine} Best Computer Science match from the dataset: ${best.course.name} at ${best.course.university}, ${best.course.campus}, ATAR ${displayRank(best.course.atar)} (${bestGap}). ${primaryLine} ${safeLine} If you specifically want pure software theory, algorithms and programming, search/save Computer Science courses and compare them against IT or Information Systems before deciding.`;
}

function computerScienceOptions(profile) {
  return allCourses
    .filter((course) => /computer science/i.test(course.name))
    .filter((course) => course.level === "undergraduate")
    .filter((course) => profile.campus === "Online" || !/online/i.test(course.campus))
    .filter((course) => !/diploma|associate degree|certificate/i.test(course.name) || profile.pathways !== "No" && profile.atar < 65)
    .map((course) => advisorScoreCourse(course, profile))
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name));
}

function listCourseLabels(entries, limit) {
  return entries
    .slice(0, limit)
    .map(({ course }) => `${course.name} at ${course.university} (${course.campus}, ATAR ${displayRank(course.atar)})`)
    .join("; ");
}

function atarGapText(course, profile) {
  const rank = numericRank(course.atar);
  if (rank === null) return "no numeric UAC profile, so check the official entry rules";
  const gap = profile.atar - rank;
  if (gap >= 0) return `${gap.toFixed(1)} below your ATAR estimate`;
  return `${Math.abs(gap).toFixed(1)} above your ATAR estimate`;
}

async function actualAiReply(message, profile, ranked, fallback) {
  const promptMessages = buildAiMessages(message, profile, ranked, fallback);
  const reply = await firstAiReply([
    aiProviderAttempt("Browser AI", chromeAiReply(promptMessages), 4500),
    aiProviderAttempt("Puter AI", puterAiReply(promptMessages), 8500),
    aiProviderAttempt("Pollinations AI", pollinationsAiReply(promptMessages), 3500)
  ], 9000);
  return reply || { text: fallback, provider: "Course data helper" };
}

function aiProviderAttempt(provider, promise, timeoutMs) {
  return withTimeout(promise, timeoutMs)
    .then((text) => {
      const cleaned = cleanAiText(text);
      return cleaned && !isProviderNotice(cleaned) ? { text: cleaned, provider } : null;
    })
    .catch(() => null);
}

function firstAiReply(attempts, timeoutMs) {
  return new Promise((resolve) => {
    let settled = 0;
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    attempts.forEach((attempt) => {
      attempt.then((result) => {
        settled += 1;
        if (result) {
          finish(result);
          return;
        }
        if (settled === attempts.length) finish(null);
      });
    });
  });
}

function buildAiMessages(message, profile, ranked, fallback) {
  const previous = state.advisorChat
    .filter((item) => !item.pending)
    .slice(-6)
    .map((item) => `${item.role === "user" ? "Student" : "Helper"}: ${item.text}`)
    .join("\n");
  const courseContext = ranked.map(({ course, score, reasons }, index) => {
    return `${index + 1}. ${course.name} | ${course.university} | ${course.campus} | ATAR ${displayRank(course.atar)} | modes ${(course.modes || []).join(", ")} | fit ${Math.round(score)}/100 | ${reasons.join(" ")}`;
  }).join("\n");
  const profileContext = [
    `ATAR estimate: ${profile.atar}`,
    `Main detected area: ${profile.topic.label}`,
    `Subjects: ${state.advisor.subjects || "not provided"}`,
    `Interests: ${state.advisor.passions || "not provided"}`,
    `Strength: ${state.advisor.strengths || "not provided"}`,
    `Work style: ${state.advisor.workStyle || "not provided"}`,
    `Outcome: ${state.advisor.careerPriority || "not provided"}`,
    `Campus preference: ${state.advisor.campus || "not provided"}`,
    `Avoid: ${state.advisor.avoid || "none"}`
  ].join("\n");
  const groundedFacts = advisorKnowledgeContext(message, profile, ranked);

  return [
    {
      role: "system",
      content: "You are a calm Sydney university course adviser for an HSC student. Use only the supplied UAC course facts, user answers and local algorithm result as your source of truth. Do not invent ATARs, prerequisites, fees, campus availability, careers, rankings or guarantees. If a fact is missing, say it is not listed in the imported UAC record and tell the student to check UAC or the official course page. Be specific, direct and not repetitive. If the user asks the same thing again, add a new angle. Keep answers to 4-7 short sentences. Professional but chill tone. Plain text only. No markdown, no asterisks, no headings, no bullet symbols."
    },
    {
      role: "user",
      content: `Student profile:\n${profileContext}\n\nTop matched courses from the local UAC dataset:\n${courseContext || "No confident courses."}\n\nGrounded UAC facts available for this question:\n${groundedFacts || "No extra facts beyond the ranked courses."}\n\nRecent chat:\n${previous || "No previous chat."}\n\nLocal fallback answer if AI is unavailable:\n${fallback}\n\nStudent question:\n${message}\n\nAnswer using the course data first, then your judgement. If the student's typed interests conflict with subjects, treat typed interests as the stronger signal. Do not add unsupported factual claims. Return plain text only.`
    }
  ];
}

async function chromeAiReply(messages) {
  try {
    const modelApi = window.LanguageModel || window.ai?.languageModel;
    if (!modelApi?.availability || !modelApi?.create) return "";
    const availability = await modelApi.availability({ languages: ["en"] }).catch(() => "unavailable");
    if (availability !== "available" && availability !== "downloadable") return "";
    const session = await modelApi.create({
      systemPrompt: messages[0].content,
      initialPrompts: messages.map((item) => ({ role: item.role, content: item.content }))
    });
    const response = await session.prompt(messages[messages.length - 1].content);
    session.destroy?.();
    return cleanAiText(response);
  } catch (error) {
    return "";
  }
}

async function puterAiReply(messages) {
  try {
    await loadPuter();
    if (!window.puter?.ai?.chat) return "";
    if (!window.puter?.auth?.isSignedIn) return "";
    const signedIn = await withTimeout(window.puter.auth.isSignedIn(), 900).catch(() => false);
    if (!signedIn) return "";
    const response = await window.puter.ai.chat(messages, true, {
      model: "openai/gpt-5.4-nano",
      max_tokens: 220,
      temperature: 0.25,
      text_verbosity: "low"
    });
    return cleanAiText(extractAiText(response));
  } catch (error) {
    return "";
  }
}

async function pollinationsAiReply(messages) {
  try {
    const prompt = [
      messages[0]?.content || "",
      messages.slice(1).map((item) => `${item.role.toUpperCase()}: ${item.content}`).join("\n\n")
    ].join("\n\n").slice(0, 5200);
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&private=true`;
    const response = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
    if (!response.ok) return "";
    return cleanAiText(await response.text());
  } catch (error) {
    return "";
  }
}

function loadPuter() {
  if (window.puter?.ai?.chat) return Promise.resolve();
  if (window.__puterLoading) return window.__puterLoading;
  window.__puterLoading = new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("Puter timed out")), 8000);
    const script = document.createElement("script");
    script.src = "https://js.puter.com/v2/";
    script.async = true;
    script.onload = () => {
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Puter failed to load"));
    };
    document.head.appendChild(script);
  });
  return window.__puterLoading;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("AI timed out")), ms);
    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function extractAiText(response) {
  if (typeof response === "string") return response;
  if (typeof response?.text === "string") return response.text;
  const content = response?.message?.content ?? response?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => typeof part === "string" ? part : part?.text || part?.content || "")
      .filter(Boolean)
      .join(" ");
  }
  return String(response || "");
}

function cleanAiText(value) {
  return stripMarkdown(value)
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/^Helper:\s*/i, "")
    .replace(/\*{1,3}/g, "")
    .replace(/_{2,}/g, "")
    .trim()
    .slice(0, 900);
}

function isProviderNotice(value) {
  return /important notice|deprecated|migrate to|anonymous requests|provider notice|api key/i.test(String(value || ""));
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "");
}

function avoidRepeatedReply(reply, ranked, profile) {
  const previousAssistant = cleanAiText([...state.advisorChat].reverse().find((message) => message.role === "assistant" && !message.pending)?.text || "");
  reply = cleanAiText(reply);
  if (!previousAssistant || similarityKey(previousAssistant) !== similarityKey(reply)) return reply;
  const names = listCourseNames(ranked, 3);
  return `New angle: compare ${names} by the actual weekly work, not just the title. For your ${profile.topic.label.toLowerCase()} direction, ask each course page: how much coding or project work is there, what maths is assumed, are there internships, and how long is the commute? That will separate a course that sounds good from one you can realistically stick with.`;
}

function similarityKey(value) {
  return tokenise(value)
    .filter((word) => word.length > 4)
    .slice(0, 24)
    .join(" ");
}

function listCourseNames(entries, limit) {
  const seen = new Set();
  const names = [];
  for (const entry of entries) {
    const name = entry.course.name;
    const key = cleanSearchText(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= limit) break;
  }
  return names.join(", ");
}

function themedSuggestions(profile, theme) {
  const configs = {
    lowWorkHighPay: {
      include: ["information technology", "computer", "software", "data", "cyber", "analytics", "business", "commerce", "accounting", "finance", "economics", "management", "information systems"],
      exclude: ["clinical", "chiropractic", "nursing", "medicine", "paramedicine", "physiotherapy", "teaching", "education", "early childhood", "social work", "counselling", "psychology", "sport", "exercise", "actuarial", "law", "double degree", "combined degree"]
    },
    food: {
      include: ["nutrition", "food", "culinary", "hospitality", "tourism", "event", "hotel", "restaurant", "dietetics", "dietitian", "food science", "food technology", "food innovation"],
      exclude: ["information technology", "software", "cyber", "law", "criminology", "engineering", "accounting", "finance"]
    },
    employment: {
      include: ["computer", "software", "data", "cyber", "engineering", "nursing", "teaching", "accounting", "business", "health", "construction", "analytics", "nutrition", "hospitality"],
      exclude: []
    }
  };
  const config = configs[theme] || configs.employment;

  return allCourses
    .map((course) => {
      const text = courseText(course);
      const includeHits = config.include.filter((word) => phraseMatch(text, word)).length;
      const excludeHits = config.exclude.filter((word) => phraseMatch(text, word)).length;
      const rank = numericRank(course.atar);
      const atarFit = rank === null ? 4 : rank <= profile.atar ? 12 - Math.min(profile.atar - rank, 16) * 0.2 : Math.max(0, 7 - (rank - profile.atar));
      const doubleDegreePenalty = theme === "lowWorkHighPay" && / and bachelor|\/bachelor|bachelor of .+ bachelor of /.test(cleanSearchText(course.name)) ? 90 : 0;
      const pathwayPenalty = theme === "lowWorkHighPay" && profile.atar >= 70 && /diploma|pathway|via diploma/.test(text) ? 34 : 0;
      const score = includeHits * 18 - excludeHits * 22 - doubleDegreePenalty - pathwayPenalty + atarFit + campusPreferenceScore(course, profile.campus) + courseProviderScore(course) * 0.05;
      return { course, score };
    })
    .filter((entry) => entry.score > 20)
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name));
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

function searchProviderQuality(course, topicLabel) {
  const quality = providerQuality[topicLabel] || {};
  return quality[course.providerId]?.score || courseProviderScore(course);
}

function courseProviderScore(course) {
  if (providerScoreCache.has(course.providerId)) return providerScoreCache.get(course.providerId);
  const provider = allProviders.find((item) => item.id === course.providerId);
  if (!provider) return 45;
  const knownScores = Object.values(providerQuality)
    .map((topic) => topic[provider.id]?.score)
    .filter((score) => Number.isFinite(score));
  const score = knownScores.length
    ? knownScores.reduce((sum, value) => sum + value, 0) / knownScores.length
    : Math.min(70, 42 + provider.courseCount * 0.05);
  providerScoreCache.set(course.providerId, score);
  return score;
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
    course.practicalExperience,
    (course.modes || []).join(" ")
  ].join(" "));
  courseTextCache.set(course, text);
  return text;
}

function numericRank(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function displayRank(value) {
  const parsed = numericRank(value);
  if (parsed !== null) return parsed.toFixed(parsed % 1 ? 2 : 0);
  const code = String(value || "").trim();
  if (!code || code === "0") return "Not listed by UAC.";
  return rankCodeMeanings[code] || code;
}

function shortField(value) {
  const text = decodeHtmlEntities(value || "").trim();
  if (!text || text === "Not listed" || text === "Check official course page.") return "not clearly listed in the imported UAC record, so confirm on UAC or the university page";
  return text.length > 170 ? `${text.slice(0, 170)}...` : text;
}

function levelDisplay(course) {
  const levels = Array.isArray(course.levels) && course.levels.length ? course.levels : [course.level].filter(Boolean);
  return levels.map((level) => levelLabels[level] || level).join(" + ");
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
        levels: sortLevels([...new Set(group.flatMap((course) => courseLevels(course)))]),
        modes: uniqueValues(group.flatMap((course) => course.modes || [])),
        intake: mergeTextValues(group.map((course) => course.intake)),
        dedupedCount: group.length
      };
    })
  };
}

function duplicatePreferenceScore(course) {
  return [
    numericRank(course.atar) !== null ? 12 : 0,
    hasSpecificInfo(course.prerequisites) ? 8 : 0,
    hasSpecificInfo(course.assumed) ? 5 : 0,
    hasSpecificInfo(course.careers) ? 4 : 0,
    hasSpecificInfo(course.summary) ? 3 : 0
  ].reduce((sum, value) => sum + value, 0);
}

function courseLevels(course) {
  return Array.isArray(course.levels) && course.levels.length ? course.levels : [course.level].filter(Boolean);
}

function sortLevels(levels) {
  const order = ["undergraduate", "postgraduate", "international", "online"];
  return levels.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergeTextValues(values) {
  return uniqueValues(values.map((value) => String(value || "").trim()).filter(Boolean)).join(", ");
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

function number(value) {
  return new Intl.NumberFormat("en-AU").format(value);
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function decodeHtmlEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value || "");
  return textarea.value;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

render();
