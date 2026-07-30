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
            <textarea id="help-message" name="message" rows="2" placeholder="Ask about ATAR, UAC, pathways, subjects or this website" required></textarea>
            <button type="submit">Ask</button>
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
  helpApp.querySelector("[data-help-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.elements.message;
    const message = input.value.trim();
    if (!message || state.pending) return;
    input.value = "";
    askQuestion(message);
  });
}

async function askQuestion(message) {
  const clean = String(message || "").trim();
  if (!clean || state.pending) return;
  state.messages.push({ role: "user", text: clean });
  const pending = {
    role: "assistant",
    text: "Checking the course and UAC guidance...",
    provider: state.status.connected ? state.status.provider : "Local course knowledge",
    pending: true
  };
  state.messages.push(pending);
  state.pending = true;
  renderMessages();

  const reply = await requestHelpReply(clean);
  pending.text = reply.text;
  pending.provider = reply.provider;
  pending.actions = reply.actions;
  pending.pending = false;
  state.pending = false;
  renderMessages();
}

async function requestHelpReply(message) {
  const history = state.messages
    .filter((item) => !item.pending)
    .slice(-8)
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
        actions: normaliseActions(payload.actions)
      };
    }
  } catch {
    // The verified local answer below keeps Help useful without an external model.
  }
  return localHelpReply(message);
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

function localHelpReply(message) {
  const query = normalise(message);
  if (/\b(selection rank|bonus point|adjustment|adjusted atar)\b/.test(query)) {
    return reply(
      "Your ATAR does not change. A university may add eligible adjustment factors to create a selection rank for a specific course. That selection rank is what may be compared with the course entry profile, while prerequisites and other criteria still apply.",
      "Verified local guidance",
      ["calculator", "courses"]
    );
  }
  if (/\b(atar)\b/.test(query) && /\b(what|mean|difference|same)\b/.test(query)) {
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
  if (/\b(where|navigate|find|tool|start|help me choose)\b/.test(query)) {
    return reply(
      "Use Course search when you know a field or course. Use Course direction when you are unsure what fits. Use Guide for a complete school-to-university plan, ATAR calculator for a mark estimate, Subject Helper for Year 11/12 choices, and Pathways or TAFE tools for alternative entry.",
      "Verified local guidance",
      ["tools", "advisor", "guide"]
    );
  }
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

function statusLabel() {
  if (!state.status.checked) return "Verified local guidance ready";
  if (state.status.connected) return `${state.status.provider} connected`;
  return "Verified local guidance ready — AI can be added with a server key";
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
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
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
