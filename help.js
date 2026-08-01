const helpApp = document.querySelector("#help-app");
const starterQuestions = [
  "What is the difference between ATAR and selection rank?",
  "What happens if I miss a prerequisite?",
  "How should I order my UAC preferences?",
  "What pathways can I use without an ATAR?",
  "How do I compare two similar courses?",
  "Which tool should I use first?"
];

const safeRoutes = {
  courses: { href: "./#courses", label: "Search courses" },
  tools: { href: "./tools", label: "Open Tools" },
  guide: { href: "./guide", label: "Build a Guide plan" },
  advisor: { href: "./advisor", label: "Find a course direction" },
  calculator: { href: "./atar-calculator", label: "Estimate my ATAR" },
  subjects: { href: "./subject-helper", label: "Open Subject Helper" },
  pathways: { href: "./pathways", label: "Explore pathways" },
  tafe: { href: "./tafe-tools", label: "Open TAFE tools" },
  saved: { href: "./#saved", label: "View saved courses" },
  universities: { href: "./#providers", label: "Browse universities" }
};

const params = new URLSearchParams(location.search);
const state = {
  messages: [],
  pending: false,
  status: {
    checked: false,
    configured: false,
    connected: false,
    provider: "Local course knowledge"
  }
};

function render() {
  helpApp.innerHTML = `
    <a class="skip-link" href="#help-chat">Skip to help chat</a>
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main"></nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
    <main class="help-page">
      <section class="help-page-hero">
        <span class="eyebrow">General help</span>
        <h1>Ask a course, ATAR or UAC question</h1>
        <p>Get a plain-English answer first, then jump to the exact part of the site you need.</p>
        <span class="helper-availability" data-help-status>${statusLabel()}</span>
      </section>
      <section class="help-layout">
        <aside class="help-starters" aria-labelledby="popular-help-title">
          <h2 id="popular-help-title">Popular questions</h2>
          <div class="help-starter-list">
            ${starterQuestions.map((question) => `
              <button type="button" data-help-question="${escapeHtml(question)}">${escapeHtml(question)}</button>
            `).join("")}
          </div>
          <div class="help-route-list">
            <strong>Go straight to</strong>
            <a href="./#courses">Course search</a>
            <a href="./tools">All tools</a>
            <a href="./advisor">Course direction</a>
            <a href="./pathways">Alternative pathways</a>
          </div>
        </aside>
        <section id="help-chat" class="help-chat" aria-labelledby="help-chat-title">
          <div class="help-chat-head">
            <div>
              <span class="eyebrow">Sydney Course Finder helper</span>
              <h2 id="help-chat-title">What do you want to understand?</h2>
            </div>
          </div>
          <div class="help-chat-log" data-help-log aria-live="polite"></div>
          <form class="help-chat-form" data-help-form>
            <label class="sr-only" for="help-message">Your question</label>
            <textarea id="help-message" name="message" rows="2" placeholder="Ask about ATAR, UAC, pathways, subjects or this website" aria-describedby="help-keyboard-hint" required></textarea>
            <button type="submit">Ask</button>
            <small class="chat-key-hint" id="help-keyboard-hint">Enter to send · Shift+Enter for a new line</small>
          </form>
          <small class="help-disclaimer">Planning support only. Confirm current course rules, dates and admission criteria with UAC or the provider.</small>
        </section>
      </section>
    </main>
  `;
  window.courseFinderTheme?.bind?.(helpApp);
  bindEvents();
  renderMessages();
}

function renderMessages() {
  const log = helpApp.querySelector("[data-help-log]");
  if (!log) return;
  log.innerHTML = state.messages.length
    ? state.messages.map((message) => `
        <article class="help-message ${message.role}${message.pending ? " is-pending" : ""}">
          <strong>${message.role === "user" ? "You" : "Helper"}${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}</strong>
          <div>${formatMessage(message.text)}</div>
          ${message.sources?.length ? `
            <div class="help-message-sources" aria-label="Official sources">
              <span>Official sources checked</span>
              ${message.sources.map((source, index) => `<a href="${escapeHtml(source.uri)}" target="_blank" rel="noopener noreferrer">${index + 1}. ${escapeHtml(source.title)}</a>`).join("")}
            </div>
          ` : ""}
          ${message.actions?.length ? `
            <div class="help-message-actions">
              ${message.actions.map((action) => `<a href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`).join("")}
            </div>
          ` : ""}
        </article>
      `).join("")
    : `
      <div class="help-chat-empty">
        <strong>Ask normally — spelling does not need to be perfect.</strong>
        <p>For example: “is selection rank my actual ATAR?” or “where do I find courses if I left school in Year 11?”</p>
      </div>
    `;
  requestAnimationFrame(() => {
    log.scrollTop = log.scrollHeight;
  });
}

function bindEvents() {
  helpApp.querySelectorAll("[data-help-question]").forEach((button) => {
    button.addEventListener("click", () => askQuestion(button.dataset.helpQuestion || ""));
  });
  const form = helpApp.querySelector("[data-help-form]");
  const input = form?.elements.message;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = String(input?.value || "").trim();
    if (!message || state.pending) return;
    input.value = "";
    askQuestion(message);
  });
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (!state.pending) form?.requestSubmit();
  });
}

async function askQuestion(message) {
  const clean = String(message || "").trim();
  if (!clean || state.pending) return;
  state.messages.push({ role: "user", text: clean });
  const pending = {
    role: "assistant",
    text: "Checking the course and UAC guidance...",
    provider: state.status.connected ? state.status.provider : "Checking grounded AI",
    pending: true
  };
  state.messages.push(pending);
  state.pending = true;
  renderMessages();

  const reply = await requestHelpReply(clean);
  pending.text = reply.text;
  pending.provider = reply.provider;
  pending.actions = reply.actions;
  pending.sources = reply.sources;
  pending.pending = false;
  state.pending = false;
  renderMessages();
}

async function requestHelpReply(message) {
  const commandReply = runLocalWebsiteCommand(message);
  if (commandReply) return commandReply;
  const history = state.messages
    .filter((item) => !item.pending)
    .slice(-12)
    .map((item) => ({ role: item.role, text: item.text }));
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "help",
        message,
        history,
        context: localContext()
      })
    });
    const payload = await response.json();
    if (response.ok && payload.ok && payload.text) {
      return {
        text: payload.text,
        provider: payload.provider || "Course Finder AI",
        actions: normaliseActions(payload.actions),
        sources: normaliseSources(payload.sources)
      };
    }
  } catch {
    // Keep a clearly-labelled reference answer available while the hosted model reconnects.
  }
  const offline = localHelpReply(message, false, history);
  if (offline) return { ...offline, provider: "Offline reference answer" };
  return reply(
    "The hosted AI is temporarily unavailable, so I cannot give you a genuine conversational answer to that message yet. Retry in a moment. Course Search and the planning tools still work while the model reconnects.",
    "AI unavailable",
    ["courses", "tools"]
  );
}

function localContext() {
  let plan = null;
  let saved = [];
  try {
    plan = JSON.parse(localStorage.getItem("sydneyCourseFinder.guidePlanSnapshot") || "null");
    saved = JSON.parse(localStorage.getItem("sydneyCourseFinder.savedCourses") || "[]");
  } catch {
    // Local context is optional.
  }
  return {
    currentPage: "General Help",
    plan: plan ? {
      year: plan.year || plan.profile?.year || "",
      goal: plan.goalLabel || plan.primary?.name || "",
      atar: plan.projectedAtar || plan.atar || ""
    } : null,
    savedCourseCount: Array.isArray(saved) ? saved.length : 0
  };
}

function runLocalWebsiteCommand(message) {
  const query = normalise(message);
  const currentTheme = window.courseFinderTheme?.current?.() || document.documentElement.dataset.theme || "light";
  let requestedTheme = "";
  if (/\b(?:turn|switch|set|enable|use|make)\b.*\bdark\s*mode\b|\bdark\s*mode\s+(?:on|please)\b/.test(query)) requestedTheme = "dark";
  if (/\b(?:turn|switch|set|enable|use|make)\b.*\blight\s*mode\b|\blight\s*mode\s+(?:on|please)\b/.test(query)) requestedTheme = "light";
  if (/\b(?:toggle|change|switch)\s+(?:the\s+)?(?:colour\s+)?theme\b/.test(query) && !requestedTheme) {
    requestedTheme = currentTheme === "dark" ? "light" : "dark";
  }
  if (!requestedTheme) return null;
  if (currentTheme !== requestedTheme) window.courseFinderTheme?.toggle?.();
  const alreadySet = currentTheme === requestedTheme;
  return reply(
    alreadySet
      ? `${requestedTheme === "dark" ? "Dark" : "Light"} mode is already on.`
      : `Done - ${requestedTheme === "dark" ? "dark" : "light"} mode is now on and saved for the rest of the website.`,
    "Website control",
    []
  );
}

function localHelpReply(message, includeFallback = true, history = []) {
  const query = normalise(message);
  const historyText = normalise((history || []).map((item) => item.text || "").join(" "));
  if (/\b(?:how|where)\b.*\b(?:check|find|see|know)\b|\bhow do i check\b/.test(query)
    && /\b(?:adjustment|adjustment factor|bonus point|selection rank)\b/.test(historyText)) {
    return reply(
      "Open the exact university course page, then find its entry requirements or selection-rank adjustments section. Check each adjustment category you may qualify for, such as HSC subject results, EAS, location, school or elite athlete/performer schemes. The amounts and eligibility are university- and course-specific, so confirm them on the provider page and UAC's adjustment-factors page rather than adding points to your ATAR yourself.",
      "Verified local guidance",
      ["courses", "calculator"]
    );
  }
  if (!/\b(?:selection|entry|admission|atar)\s+rank\b/.test(query)
    && /\b(?:uni|unis|university|universities)\b.*\b(?:rank|ranks|ranking|rankings|score|scores)\b|\b(?:rank|ranks|ranking|rankings)\b.*\b(?:uni|unis|university|universities)\b/.test(query)) {
    return reply(
      "There are two different things here. Sydney Course Finder's overall /100 score is a local planning score based on course breadth, Sydney availability, study flexibility and field strength; it is not an official league table. Its specialised /100 score changes by study area. In the current overall view UNSW is placed first, University of Sydney next, while universities such as UTS can rank more strongly for a particular practical or technology-focused course. Use rankings to shortlist, then compare the actual degree, accreditation, entry rules, campus, cost and support.",
      "Verified local guidance",
      ["universities", "courses"]
    );
  }
  if (/\b(selection rank|bonus point|adjustment|adjusted atar)\b/.test(query)) {
    return reply(
      "Your ATAR does not change. A university may add eligible adjustment factors to create a selection rank for a specific course. That selection rank is what may be compared with the course entry profile, while prerequisites and other criteria still apply.",
      "Verified local guidance",
      ["calculator", "courses"]
    );
  }
  if (/\b(atar)\b/.test(query) && /\b(what|whats|mean|difference|same)\b/.test(query)) {
    return reply(
      "ATAR is your rank among your age group in NSW. It is not a mark and it is not the same as a course selection rank. Course pages should be read carefully because some figures include adjustments and some show the raw ATAR of an offer-holder.",
      "Verified local guidance",
      ["calculator", "courses"]
    );
  }
  if (/\b(prerequisite|assumed knowledge|subject)\b/.test(query)) {
    return reply(
      "A prerequisite can block entry if you do not meet it. Assumed knowledge usually does not automatically block entry, but the first year may be harder without it. Recommended subjects are preparation rather than a formal rule unless the official course page says otherwise.",
      "Verified local guidance",
      ["subjects", "courses"]
    );
  }
  if (/\b(preference|uac order|dream course)\b/.test(query)) {
    return reply(
      "Put courses in the order you genuinely want them, with the dream option above safer backups. UAC considers your preferences in order, so placing a safer course first can stop you being considered for a lower preference in that offer round.",
      "Verified local guidance",
      ["courses", "guide"]
    );
  }
  if (/\b(?:what|how|who|where)\b.*\buac\b|\buac\b.*\b(?:application|apply|offer|round|deadline|preference)\b/.test(query)) {
    return reply(
      "UAC is the Universities Admissions Centre. For most NSW undergraduate applications, you submit one application, order your course preferences by genuine preference, then UAC coordinates offer rounds using each institution's entry rules. Dates and preferences can change, so confirm the current application, offer-round and preference deadlines directly with UAC.",
      "Verified local guidance",
      ["guide", "courses"]
    );
  }
  if (/\b(no atar|without atar|left school|drop.?out|pathway|diploma|foundation|tafe)\b/.test(query)) {
    return reply(
      "You still have several routes: TAFE or a diploma with credit, university foundation studies, portfolio or audition entry, SRS or EAS where eligible, a related lower-entry course followed by transfer, or mature-age entry later. The best route depends on whether you finished Year 12 and the field you want.",
      "Verified local guidance",
      ["pathways", "tafe"]
    );
  }
  if (/\b(compare|difference|similar course|double degree|combined degree)\b/.test(query)) {
    return reply(
      "Compare the degree structure first: single, double or combined degrees can differ in length, majors and career breadth. Then compare entry figures, prerequisites, campus, mode, accreditation, placements, pathways and official course costs.",
      "Verified local guidance",
      ["courses", "saved"]
    );
  }
  if (/\b(fee|fees|cost|costs|hecs|help loan|csp|commonwealth supported)\b/.test(query)) {
    return reply(
      "Check whether the place is Commonwealth supported before comparing fees. A CSP reduces the tuition amount and eligible students may defer the student contribution through HECS-HELP; private or full-fee places work differently. Also budget for the Student Services and Amenities Fee, equipment, placements, travel and accommodation. Confirm every figure on the official provider page because fees change by year and subject load.",
      "Verified local guidance",
      ["courses"]
    );
  }
  if (/\b(scholarship|scholarships|financial support|eas|equity)\b/.test(query)) {
    return reply(
      "Check both university scholarships and UAC equity schemes. Eligibility can depend on academic results, financial hardship, location, leadership, sport, course or personal circumstances. EAS may also affect selection rank, but it does not change your ATAR. Apply early and verify documents and closing dates on the official scholarship or UAC page.",
      "Verified local guidance",
      ["courses", "guide"]
    );
  }
  if (/\b(campus|commute|distance|travel|online|part time|full time)\b/.test(query)) {
    return reply(
      "Compare the actual teaching campus and timetable, not only the university name. Check door-to-door travel, required on-campus days, placement locations, online attendance rules and whether part-time study is genuinely offered for that course. Course Search can filter campus, mode and duration before you save a shortlist.",
      "Verified local guidance",
      ["courses"]
    );
  }
  if (/\b(career|careers|job|jobs|salary|income|earn|pay)\b/.test(query)) {
    return reply(
      "Treat career and income ranges as broad planning signals, not guarantees. Start with the occupations a degree is accredited or commonly used for, then check placements, graduate roles, registration requirements and whether further study is needed. Income varies with experience, location, employer and specialisation.",
      "Verified local guidance",
      ["advisor", "guide", "courses"]
    );
  }
  if (/\b(where|navigate|find|tool|start|help me choose)\b/.test(query)) {
    return reply(
      "Use Course search when you know a field or course. Use Course direction when you are unsure what fits. Use Guide for a complete school-to-university plan, ATAR calculator for a mark estimate, Subject Helper for Year 11/12 choices, and Pathways or TAFE tools for alternative entry.",
      "Verified local guidance",
      ["tools", "advisor", "guide"]
    );
  }
  if (!includeFallback) return null;
  return reply(
    "I can give a reliable general answer, but I need one more detail to make this specific. Tell me the course or career, your school year, and what you are worried about — entry rank, subjects, commute, pathways or career outcomes.",
    "Verified local guidance",
    ["advisor", "courses"]
  );
}

function reply(text, provider, routeKeys) {
  return {
    text,
    provider,
    actions: routeKeys.map((key) => safeRoutes[key]).filter(Boolean)
  };
}

function normaliseActions(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.slice(0, 3).map((action) => {
    const routeKey = String(action.route || action.key || "").toLowerCase();
    if (safeRoutes[routeKey]) return safeRoutes[routeKey];
    const allowed = Object.values(safeRoutes).find((route) => route.href === action.href);
    return allowed || null;
  }).filter(Boolean);
}

function normaliseSources(sources) {
  if (!Array.isArray(sources)) return [];
  const seen = new Set();
  return sources.slice(0, 6).map((source) => {
    try {
      const url = new URL(String(source?.uri || source?.url || ""));
      if (!/^https?:$/.test(url.protocol) || seen.has(url.href)) return null;
      seen.add(url.href);
      return {
        uri: url.href,
        title: String(source?.title || url.hostname).trim().slice(0, 100)
      };
    } catch {
      return null;
    }
  }).filter(Boolean).slice(0, 4);
}

function statusLabel() {
  if (!state.status.checked) return "Checking grounded AI";
  if (state.status.connected) return `${state.status.provider} connected`;
  return "Offline guidance ready — start local AI for open questions";
}

async function checkStatus() {
  try {
    const response = await fetch("/api/ai", { headers: { Accept: "application/json" } });
    const payload = await response.json();
    state.status = { ...state.status, ...payload, checked: true };
  } catch {
    state.status.checked = true;
  }
  const badge = helpApp.querySelector("[data-help-status]");
  if (badge) badge.textContent = statusLabel();
}

function formatMessage(value) {
  const escaped = escapeHtml(value);
  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").filter((line) => line.trim());
      if (lines.length && lines.every((line) => /^\s*[-•]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${formatInlineMessage(line.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${formatInlineMessage(paragraph).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function formatInlineMessage(value) {
  return String(value || "")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

function normalise(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

render();
checkStatus();

const initialQuestion = params.get("q");
if (initialQuestion) {
  requestAnimationFrame(() => askQuestion(initialQuestion));
}
