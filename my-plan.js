const myPlanApp = document.querySelector("#my-plan-app");
const myPlanCourses = window.uacCourses || [];
const myPlanProviders = window.uacProviders || [];
const myPlanHscSubjects = window.hscSubjectData || [];
const myPlanStorageKeys = {
  guide: "sydneyCourseFinder.guideProgress",
  guidePlan: "sydneyCourseFinder.guidePlanSnapshot"
};
const myPlanQuickPrompts = [
  "Change my career goal to cyber security analyst",
  "I am in Year 11 now",
  "I want to study computer science instead",
  "Make my plan safer for entry"
];
const myPlanSafeRoutes = Object.freeze({
  courses: { href: "./#courses", label: "Search courses" },
  guide: { href: "./guide", label: "Open Guide" },
  advisor: { href: "./advisor", label: "Explore course directions" },
  calculator: { href: "./atar-calculator", label: "Estimate my ATAR" },
  subjects: { href: "./subject-helper", label: "Open Subject Helper" },
  pathways: { href: "./pathways", label: "Explore pathways" },
  saved: { href: "./#saved", label: "View saved courses" },
  universities: { href: "./#providers", label: "Browse universities" }
});
const myPlanActionDefinitions = Object.freeze({
  set_year: { field: "year", label: "School year", impact: "Changes which stages and school checkpoints appear in the Guide." },
  set_career_goal: { field: "dreamJob", label: "Career target", impact: "Re-ranks courses, subjects, jobs and the UAC shortlist." },
  set_degree_goal: { field: "dreamCourse", label: "Degree target", impact: "Gives exact degree matches more weight across the Guide." },
  set_income_goal: { field: "dreamIncome", label: "Income goal", impact: "Changes career and course ranking, but never overrides entry requirements." },
  set_priority: { field: "preference", label: "Planning priority", impact: "Changes how the Guide balances safety, income, prestige and fit." },
  set_interests: { field: "passions", label: "Interests", impact: "Adds personal-fit signals to the course and career ranking." },
  set_avoid: { field: "avoid", label: "Avoid list", impact: "Penalises matching workload, fields or providers without deleting every alternative." },
  add_subject: { field: "subjectsWithMarks", label: "Add subject", impact: "Changes the subject pattern, projected ATAR evidence and drop check." },
  remove_subject: { field: "subjectsWithMarks", label: "Remove subject", impact: "Changes the subject pattern, projected ATAR evidence and drop check." }
});
const myPlanChatState = {
  messages: [],
  pending: false,
  guideChanged: false,
  status: {
    checked: false,
    connected: false,
    provider: "Offline plan guidance"
  }
};

renderMyPlanPage();
checkMyPlanAiStatus();

function renderMyPlanPage() {
  const guideState = loadGuideProgress();
  const guideSnapshot = loadGuidePlanSnapshot();
  const plan = window.SubjectHelperLogic?.buildPersonalPlanView?.(guideState || {}, guideSnapshot, new Date());
  const hasProgress = hasSavedGuideProgress(guideState);

  myPlanApp.innerHTML = `
    ${renderMyPlanTopbar()}
    <main class="my-plan-page">
      ${plan?.source === "guide-result"
        ? renderPersonalLinearPlan(plan)
        : hasProgress && plan?.items
          ? renderProgressOnlyPlan(plan)
          : renderEmptyPlan()}
      ${renderMyPlanCopilot(plan, guideState, guideSnapshot)}
    </main>
  `;

  window.courseFinderTheme?.bind?.(myPlanApp);
  bindMyPlanCopilot();
  renderMyPlanMessages();
  revealMyPlanHashTarget();
}

function revealMyPlanHashTarget() {
  if (window.location.hash !== "#plan-copilot") return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      myPlanApp.querySelector("#plan-copilot")?.scrollIntoView({ block: "start" });
    });
  });
}

function renderMyPlanTopbar() {
  return `
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./#courses">Courses</a>
        <a href="./guide">Guide</a>
        ${window.courseFinderTheme?.myPlanNavMarkup?.({ current: true }) || ""}
        <a href="./pathways">Pathways</a>
        <a href="./#atar">ATAR</a>
        <a href="./atar-calculator">Calculator</a>
        <a href="./subject-helper">Subjects</a>
        <a href="./advisor">Course help</a>
        <a href="./#saved">Saved</a>
        <a href="./#providers">Universities</a>
        <a href="./#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function renderPersonalLinearPlan(plan) {
  const stages = plan.linearStages || [];
  return `
    <section class="hero guide-hero my-plan-hero">
      <div>
        <p class="eyebrow">Personal pathway</p>
        <h1>My Plan</h1>
        <p>${escapeHtml(plan.status.text)} This page is separate from Course Search so you can read it like a proper pathway: subjects, Year 11 drop decision, UAC options, uni and job applications.</p>
      </div>
      <dl class="stats">
        <div><dt>Mode</dt><dd>Saved Guide</dd></div>
        <div><dt>Timeline</dt><dd>${stages.length || 6} stages</dd></div>
        <div><dt>Focus</dt><dd>${escapeHtml(plan.status.label)}</dd></div>
        <p class="data-note">This mirrors the Guide result saved in this browser. Confirm school deadlines, UAC dates and prerequisites officially before decisions.</p>
      </dl>
    </section>

    <section class="panel my-plan-linear-panel">
      <div class="panel-head">
        <div>
          <h2>Linear plan</h2>
          <p>Path: Year 10 subject selection → subject drop → Projected ATAR → Dream course → UAC list → Jobs to apply to. Year 11 and Year 12 plans start from the subject-drop check.</p>
        </div>
        <a class="help-link" href="./guide#guide-form">Adjust in Guide</a>
      </div>
      <ol class="linear-plan-road">
        ${stages.map(renderLinearPlanStage).join("")}
      </ol>
    </section>
  `;
}

function renderLinearPlanStage(stage, index) {
  return `
    <li class="linear-plan-stage" style="--item-delay:${Math.min(index, 8) * 34}ms">
      <div class="linear-stage-marker">
        <span>${index + 1}</span>
      </div>
      <article>
        <div class="linear-stage-head">
          <span>${escapeHtml(stage.phase || stage.when || "Plan stage")}</span>
          <h2>${escapeHtml(stage.title || "")}</h2>
          <p>${escapeHtml(stage.summary || "")}</p>
        </div>
        <div class="linear-stage-items">
          ${(stage.items || []).map((item) => renderLinearStageItem(item, stage)).join("")}
        </div>
      </article>
    </li>
  `;
}

function renderLinearStageItem(item, stage) {
  const logo = item.kind === "course" ? providerLogoForOption(item) : "";
  const isJobs = item.kind === "jobs" || /job applications/i.test(stage.phase || "");
  return `
    <section class="linear-stage-item ${logo ? "with-logo" : ""}">
      ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(item.university || item.title)} logo" loading="lazy" />` : ""}
      <div>
        <strong>${escapeHtml(item.title || "")}</strong>
        ${item.meta ? `<span>${escapeHtml(item.meta)}</span>` : ""}
        ${item.text ? `<p>${escapeHtml(item.text)}</p>` : ""}
        ${isJobs ? renderJobSiteLinks() : ""}
      </div>
    </section>
  `;
}

function renderJobSiteLinks() {
  const links = [
    ["SEEK", "https://www.seek.com.au/"],
    ["LinkedIn", "https://www.linkedin.com/jobs/"],
    ["GradConnection", "https://au.gradconnection.com/"],
    ["Prosple", "https://au.prosple.com/"]
  ];
  return `
    <div class="job-site-links" aria-label="Job application sites">
      ${links.map(([label, href]) => `<a href="${href}" target="_blank" rel="noreferrer">${label}</a>`).join("")}
    </div>
  `;
}

function renderProgressOnlyPlan(plan) {
  return `
    <section class="hero guide-hero my-plan-hero">
      <div>
        <p class="eyebrow">Saved progress</p>
        <h1>My Plan</h1>
        <p>${escapeHtml(plan.status.text)} Build the full Guide result to unlock course, subject, UAC and job stages.</p>
      </div>
      <dl class="stats">
        <div><dt>Status</dt><dd>${escapeHtml(plan.status.label)}</dd></div>
        <div><dt>Next</dt><dd>Build Guide</dd></div>
        <p class="data-note">The dates below are generic until you build a full Guide recommendation.</p>
      </dl>
    </section>
    <section class="panel my-plan-linear-panel">
      <div class="panel-head">
        <div>
          <h2>Upcoming checkpoints</h2>
          <p>These are broad NSW/UAC planning checkpoints. Build the Guide result to personalise them.</p>
        </div>
        <a class="help-link" href="./guide">Open Guide</a>
      </div>
      <ol class="my-plan-timeline">
        ${(plan.items || []).map((item) => `
          <li class="${escapeHtml(item.status || "check")}">
            <time>${escapeHtml(item.when)}</time>
            <div>
              <strong>${escapeHtml(item.title)}</strong>
              <p>${escapeHtml(item.text)}</p>
              <small>${escapeHtml(item.impact)}</small>
            </div>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function renderEmptyPlan() {
  return `
    <section class="hero guide-hero my-plan-hero">
      <div>
        <p class="eyebrow">Personal pathway</p>
        <h1>My Plan</h1>
        <p>Build a Guide plan first, then this page becomes your separate linear pathway from Year 10 subject selection to uni and job applications.</p>
      </div>
      <dl class="stats">
        <div><dt>Status</dt><dd>Not built</dd></div>
        <div><dt>Route</dt><dd>Guide first</dd></div>
        <p class="data-note">No saved Guide result was found in this browser yet.</p>
      </dl>
    </section>
    <section class="panel my-plan-empty">
      <strong>Start in Guide, then come back here.</strong>
      <p>Guide saves your goal, subjects, school tracking, course target and UAC ladder locally. My Plan turns that into a readable journey.</p>
      <a class="match-btn" href="./guide">Build my Guide plan</a>
    </section>
  `;
}

function renderMyPlanCopilot(plan, guideState, guideSnapshot) {
  const hasSavedPlan = plan?.source === "guide-result";
  return `
    <section class="panel my-plan-copilot" id="plan-copilot" aria-labelledby="plan-copilot-title">
      <div class="my-plan-copilot-head">
        <div>
          <p class="eyebrow">Plan copilot</p>
          <h2 id="plan-copilot-title">Chat about this plan — and change it safely</h2>
          <p>${hasSavedPlan
            ? "Ask why something was recommended or request a change. The copilot reads this saved plan and shows exactly what it wants to update before anything changes."
            : "Set or refine your Guide inputs here, then open Guide to build the full recommendation."}</p>
        </div>
        <span class="helper-availability" data-plan-ai-status>${escapeHtml(myPlanAiStatusLabel())}</span>
      </div>

      <div class="my-plan-copilot-rules" role="note">
        <strong>You stay in control.</strong>
        <span>The assistant can only propose approved Guide fields. It cannot silently edit the plan, run code or submit an application.</span>
      </div>

      <div class="my-plan-prompt-row" aria-label="Example plan requests">
        ${myPlanQuickPrompts.map((prompt) => `<button type="button" data-plan-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("")}
      </div>

      <div class="my-plan-chat-log" data-plan-chat-log aria-live="polite"></div>

      <form class="my-plan-chat-form" data-plan-chat-form>
        <label class="sr-only" for="my-plan-message">Ask about or change your plan</label>
        <textarea id="my-plan-message" name="message" rows="2" placeholder="Example: change my degree goal to Bachelor of Computer Science" aria-describedby="my-plan-keyboard-hint" required></textarea>
        <button type="submit">Ask copilot</button>
        <small class="chat-key-hint" id="my-plan-keyboard-hint">Enter to send · Shift+Enter for a new line</small>
      </form>

      <div class="my-plan-change-status${myPlanChatState.guideChanged ? " is-visible" : ""}" data-plan-change-status>
        <div>
          <strong>Guide inputs updated</strong>
          <span>Your previous recommendation is now marked stale so it cannot be mistaken for the updated plan.</span>
        </div>
        <a href="./guide#guide-form">Review and rebuild Guide</a>
      </div>
      <small class="help-disclaimer">Planning support only. Rebuild the Guide after an approved change, then confirm official prerequisites, dates and entry rules.</small>
    </section>
  `;
}

function bindMyPlanCopilot() {
  myPlanApp.querySelectorAll("[data-plan-prompt]").forEach((button) => {
    button.addEventListener("click", () => askMyPlanCopilot(button.dataset.planPrompt || ""));
  });
  const form = myPlanApp.querySelector("[data-plan-chat-form]");
  const input = form?.elements.message;
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = String(input?.value || "").trim();
    if (!message || myPlanChatState.pending) return;
    input.value = "";
    askMyPlanCopilot(message);
  });
  input?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    if (!myPlanChatState.pending) form?.requestSubmit();
  });
  myPlanApp.querySelector("[data-plan-chat-log]")?.addEventListener("click", (event) => {
    const applyButton = event.target.closest("[data-plan-apply]");
    if (applyButton) {
      applyMyPlanProposal(applyButton.dataset.planApply || "");
      return;
    }
    const dismissButton = event.target.closest("[data-plan-dismiss]");
    if (dismissButton) dismissMyPlanProposal(dismissButton.dataset.planDismiss || "");
  });
}

function renderMyPlanMessages({ preservePageScroll = false } = {}) {
  const log = myPlanApp.querySelector("[data-plan-chat-log]");
  if (!log) return;
  const pageScroll = preservePageScroll ? window.scrollY : null;
  log.innerHTML = myPlanChatState.messages.length
    ? myPlanChatState.messages.map((message) => `
        <article class="my-plan-message ${message.role}${message.pending ? " is-pending" : ""}">
          <strong>${message.role === "user" ? "You" : "Plan copilot"}${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}</strong>
          <div>${formatPlanMessage(message.text)}</div>
          ${message.sources?.length ? `
            <div class="help-message-sources" aria-label="Official sources">
              <span>Official sources checked</span>
              ${message.sources.map((source, index) => `<a href="${escapeHtml(source.uri)}" target="_blank" rel="noopener noreferrer">${index + 1}. ${escapeHtml(source.title)}</a>`).join("")}
            </div>
          ` : ""}
          ${message.proposals?.length ? `<div class="my-plan-proposals">${message.proposals.map(renderMyPlanProposal).join("")}</div>` : ""}
          ${message.actions?.length ? `<div class="help-message-actions">${message.actions.map((action) => `<a href="${escapeHtml(action.href)}">${escapeHtml(action.label)}</a>`).join("")}</div>` : ""}
        </article>
      `).join("")
    : `
      <div class="my-plan-chat-empty">
        <strong>Ask a question or describe a change normally.</strong>
        <p>Try “why was this course picked?”, “make entry safer”, “I’m in Year 11 now” or “add Biology to my subjects”.</p>
      </div>
    `;
  requestAnimationFrame(() => {
    log.scrollTop = log.scrollHeight;
    if (pageScroll !== null) window.scrollTo({ top: pageScroll, left: window.scrollX, behavior: "instant" });
  });
}

function renderMyPlanProposal(proposal) {
  const definition = myPlanActionDefinitions[proposal.action];
  if (!definition) return "";
  const applied = proposal.status === "applied";
  const dismissed = proposal.status === "dismissed";
  const failed = proposal.status === "failed";
  return `
    <section class="my-plan-proposal ${escapeHtml(proposal.status || "pending")}">
      <span>Proposed Guide change</span>
      <strong>${escapeHtml(definition.label)} <b aria-hidden="true">→</b> ${escapeHtml(proposal.value)}</strong>
      <p>${escapeHtml(definition.impact)}</p>
      ${applied
        ? `<em>Applied — rebuild Guide when you are ready.</em>`
        : dismissed
          ? `<em>Kept your current setting.</em>`
          : failed
            ? `<em>${escapeHtml(proposal.error || "This change could not be applied.")}</em>`
            : `<div><button type="button" data-plan-apply="${escapeHtml(proposal.id)}">Apply change</button><button type="button" class="clear-btn" data-plan-dismiss="${escapeHtml(proposal.id)}">Keep current</button></div>`}
    </section>
  `;
}

async function askMyPlanCopilot(message) {
  const clean = String(message || "").trim();
  if (!clean || myPlanChatState.pending) return;
  myPlanChatState.messages.push({ role: "user", text: clean });
  const pending = {
    role: "assistant",
    text: "Reading your saved Guide and checking what this would affect...",
    provider: myPlanChatState.status.connected ? myPlanChatState.status.provider : "Checking grounded AI",
    pending: true
  };
  myPlanChatState.messages.push(pending);
  myPlanChatState.pending = true;
  renderMyPlanMessages();

  const proposals = detectMyPlanProposals(clean);
  const reply = await requestMyPlanReply(clean, proposals);
  pending.text = reply.text;
  pending.provider = reply.provider;
  pending.actions = reply.actions;
  pending.sources = reply.sources;
  pending.proposals = proposals;
  pending.pending = false;
  myPlanChatState.pending = false;
  renderMyPlanMessages();
}

async function requestMyPlanReply(message, proposals) {
  const history = myPlanChatState.messages
    .filter((item) => !item.pending)
    .slice(-8)
    .map((item) => ({ role: item.role, text: item.text }));
  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "plan",
        message,
        history,
        context: {
          ...myPlanAiContext(),
          requestedChanges: proposals.map((proposal) => ({ action: proposal.action, value: proposal.value }))
        }
      })
    });
    const payload = await response.json();
    if (response.ok && payload.ok && payload.text) {
      return {
        text: payload.text,
        provider: payload.provider || "Course Finder AI",
        actions: normaliseMyPlanRouteActions(payload.actions),
        sources: normaliseMyPlanSources(payload.sources)
      };
    }
  } catch {
    // The grounded local planner below remains useful when the model is unavailable.
  }
  return localMyPlanReply(message, proposals, true);
}

function localMyPlanReply(message, proposals, includeFallback = true) {
  const guideState = loadGuideProgress() || window.SubjectHelperLogic?.createGuideState?.({}) || {};
  const snapshot = loadGuidePlanSnapshot();
  if (proposals.length) {
    return {
      text: `${proposals.length === 1 ? "I found one clear change" : `I found ${proposals.length} clear changes`} in your request. Review ${proposals.length === 1 ? "it" : "them"} below before applying. Any approved change invalidates the old recommendation so Guide can rebuild it accurately.`,
      provider: "Verified local planner",
      actions: [{ href: "./guide#guide-form", label: "Open full Guide editor" }]
    };
  }
  const query = normalisePlanText(message);
  if (/\b(?:uac|preference|preferences|shortlist)\b/.test(query) && /\b(?:why|order|ordered|first|higher|lower|ranked)\b/.test(query)) {
    const ordered = uniquePlanCourses([snapshot?.primary, ...(snapshot?.options || [])]).slice(0, 5);
    const first = ordered[0];
    const projected = snapshot?.projectedAtar?.value || snapshot?.projectedAtar?.label || guideState.projectedAtar || "your current estimate";
    const priority = guideState.preference || "Balanced plan";
    const shortlist = ordered.length
      ? ordered.map((course, index) => `${index + 1}. ${course.name}${course.university ? ` at ${course.university}` : ""}`).join("; ")
      : "No UAC shortlist has been saved yet";
    return {
      text: `That order is a preference ladder, not a university league table. Put courses in the order you genuinely want them: dream choice first, realistic choices next, then safer or pathway backups.\n\n${first ? `${first.name}${first.university ? ` at ${first.university}` : ""} is currently first because it is the strongest match for your career or degree goal.` : "The first course should be your genuine preferred option."} The rest balance course fit against the projected ATAR (${projected}) and your planning priority (${priority}). A safer course placed lower does not reduce your chance of receiving a higher preference.\n\nCurrent shortlist: ${shortlist}.`,
      provider: "Verified local planner",
      actions: [{ href: "./guide#guide-result", label: "Review the UAC ladder" }, { href: "./#courses", label: "Compare these courses" }]
    };
  }
  if (/\b(?:subject|subjects|hsc)\b/.test(query) && /\b(?:why|which|recommend|picked|choose)\b/.test(query)) {
    const subjects = (snapshot?.subjectTargets || []).map((item) => item.name).filter(Boolean);
    return {
      text: subjects.length
        ? `The current subject set is ${subjects.join(", ")}. It protects English and any course-entry evidence first, then favours subjects linked to your goal and subjects your school tracking suggests you can score well in. Recommended subjects are preparation unless an official course page labels one as a prerequisite.`
        : "No complete subject set is saved yet. Build Guide with your school year, goal and school tracking, then Subject Helper can separate prerequisites from useful preparation.",
      provider: "Verified local planner",
      actions: [{ href: "./subject-helper", label: "Check subject evidence" }, { href: "./guide#guide-form", label: "Adjust subjects in Guide" }]
    };
  }
  if (/\b(?:drop|remove)\b/.test(query) && /\b(?:subject|which|why|year 12)\b/.test(query)) {
    const advice = snapshot?.dropAdvice;
    return {
      text: advice?.name
        ? `${advice.name} is the first drop-check candidate, not an automatic instruction. ${advice.reason || "Compare marks, workload and motivation before deciding."} Protect English, confirmed prerequisites, ATAR eligibility and at least 10 Year 12 units before dropping anything.`
        : "The saved plan does not currently name a drop candidate. Compare Year 11 marks, workload and motivation, then protect English, prerequisites and ATAR eligibility before reducing units.",
      provider: "Verified local planner",
      actions: [{ href: "./guide#guide-result", label: "Review the drop check" }]
    };
  }
  if (/\b(?:job|jobs|career|careers|work|employment)\b/.test(query) && /\b(?:which|what|why|apply|lead|after)\b/.test(query)) {
    const jobs = (snapshot?.jobs || []).slice(0, 5).map((item) => `${item.title}${item.range ? ` (${item.range})` : ""}`);
    return {
      text: jobs.length
        ? `The current career directions are ${jobs.join(", ")}. They are broad outcomes connected to the course and goal, not guaranteed jobs or salaries. Use the degree years to build relevant projects, placements, internships and accreditation evidence before applying.`
        : "No job shortlist is saved yet. Rebuild Guide from a clear career or degree goal and it will connect the course ladder to likely roles and application sites.",
      provider: "Verified local planner",
      actions: [{ href: "./advisor", label: "Explore career directions" }, { href: "./guide#guide-result", label: "Review Guide careers" }]
    };
  }
  if (/\bwhy\b|recommend|picked|chosen|match/.test(query)) {
    const target = snapshot?.primary?.name || guideState.dreamCourse || guideState.dreamJob || "your current direction";
    return {
      text: `${target} is being driven by your career or degree goal, subject evidence, projected ATAR, planning priority and the matching imported course records. Ask about one part — entry risk, subjects, the university, UAC backups or careers — and I can make the reasoning more specific.`,
      provider: "Verified local planner",
      actions: [{ href: "./guide#guide-result", label: "Review Guide evidence" }]
    };
  }
  if (/atar|entry|safe|risk|selection rank/.test(query)) {
    const projected = snapshot?.projectedAtar;
    const projectedLabel = projected?.value || projected?.label || "not calculated yet";
    return {
      text: `Your current projected ATAR is ${projectedLabel}. Treat it as a planning range, not a promise. Compare it with each course's correctly labelled selection-rank and raw-ATAR evidence, protect hard prerequisites first, and keep at least one realistic backup or pathway below the dream option.`,
      provider: "Verified local planner",
      actions: [{ href: "./atar-calculator", label: "Review ATAR estimate" }, { href: "./pathways", label: "Review backup pathways" }]
    };
  }
  if (!includeFallback) return null;
  return {
    text: "I can answer why the course was chosen, why the UAC list is ordered that way, which subjects were recommended, what to drop, how the projected ATAR affects the plan, and which jobs it leads toward. I can also prepare a safe change to your year, goal, priority, interests or subjects and show a confirmation card before changing Guide.",
    provider: "Verified local planner",
    actions: [{ href: "./guide#guide-form", label: "Open full Guide editor" }]
  };
}

function uniquePlanCourses(courses) {
  const seen = new Set();
  return (courses || []).filter((course) => {
    if (!course?.name) return false;
    const key = `${normalisePlanText(course.name)}|${normalisePlanText(course.university)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectMyPlanProposals(message) {
  const raw = String(message || "").replace(/\s+/g, " ").trim();
  const lower = raw.toLowerCase();
  const proposals = [];
  const add = (action, value) => {
    const definition = myPlanActionDefinitions[action];
    const cleanValue = cleanPlanProposalValue(value);
    if (!definition || !cleanValue || proposals.some((item) => item.action === action && normalisePlanText(item.value) === normalisePlanText(cleanValue))) return;
    proposals.push({ id: `plan-change-${Date.now()}-${proposals.length}`, action, value: cleanValue, status: "pending" });
  };

  const yearMatch = lower.match(/\b(?:i(?:'m| am)?\s+(?:now\s+)?in|change|set|update|move\s+me\s+to)\s+(?:my\s+)?(?:school\s+)?(?:year\s*)?(10|11|12)\b/i)
    || lower.match(/\b(?:change|set|update)\s+(?:my\s+)?(?:school\s+)?year\s+(?:to\s+)?(10|11|12)\b/i);
  if (yearMatch) add("set_year", yearMatch[1] === "10" ? "Year 10 or below" : `Year ${yearMatch[1]}`);

  const degreeMatch = raw.match(/\b(?:change|set|update|make)\s+(?:my\s+)?(?:dream\s+)?(?:course|degree)(?:\s+(?:goal|target))?\s+(?:to|as)\s+(.+?)(?:[.!?]|$)/i)
    || raw.match(/\bI\s+(?:want|would like)\s+to\s+(?:study|do)\s+(.+?)(?:\s+instead)?(?:[.!?]|$)/i);
  if (degreeMatch) add("set_degree_goal", degreeMatch[1]);

  const careerMatch = raw.match(/\b(?:change|set|update|make)\s+(?:my\s+)?(?:dream\s+)?(?:career|job|career goal|career target|goal)\s+(?:to|as)\s+(.+?)(?:[.!?]|$)/i)
    || raw.match(/\bI\s+(?:want|would like)\s+to\s+(?:be|become|work as)\s+(?:an?\s+)?(.+?)(?:[.!?]|$)/i);
  if (careerMatch) add("set_career_goal", careerMatch[1]);

  const incomeMatch = lower.match(/\b(?:income|salary|pay)(?:\s+goal)?\s+(?:to|of|around|over|above|at least)?\s*\$?\s*(60|80|100|120)\s*k?\b/i);
  if (incomeMatch) add("set_income_goal", `$${incomeMatch[1]}k+`);
  if (/\b(any income|no income preference)\b/.test(lower)) add("set_income_goal", "Any income");

  const preference = detectPlanPreference(lower);
  if (preference) add("set_priority", preference);

  const interestsMatch = raw.match(/\b(?:my\s+)?interests?\s+(?:are|include|to)\s+(.+?)(?:[.!?]|$)/i)
    || raw.match(/\bI(?:'m| am)\s+interested\s+in\s+(.+?)(?:[.!?]|$)/i);
  if (interestsMatch) add("set_interests", interestsMatch[1]);

  const avoidMatch = raw.match(/^(?:please\s+)?avoid\s+(.+?)(?:[.!?]|$)/i)
    || raw.match(/\b(?:set|change|update)\s+(?:my\s+)?avoid(?:\s+list)?\s+(?:to\s+)?(.+?)(?:[.!?]|$)/i)
    || raw.match(/\bI\s+(?:want|would like)\s+to\s+avoid\s+(.+?)(?:[.!?]|$)/i);
  if (avoidMatch) add("set_avoid", avoidMatch[1]);

  const addSubjectMatch = raw.match(/\badd\s+(.+?)\s+(?:to|into)\s+(?:my\s+)?subjects?\b/i)
    || raw.match(/^add\s+(?:the\s+subject\s+)?(.+?)(?:[.!?]|$)/i);
  const removeSubjectMatch = raw.match(/\b(?:remove|drop)\s+(.+?)\s+(?:from\s+)?(?:my\s+)?subjects?\b/i)
    || raw.match(/^(?:remove|drop)\s+(?:the\s+subject\s+)?(.+?)(?:[.!?]|$)/i);
  if (addSubjectMatch) add("add_subject", canonicalPlanSubject(addSubjectMatch[1]));
  if (removeSubjectMatch) add("remove_subject", canonicalPlanSubject(removeSubjectMatch[1]));

  return proposals.slice(0, 4);
}

function detectPlanPreference(text) {
  if (/\b(make|keep|entry|plan).{0,18}\b(safe|safer|realistic)|\bsafest entry\b/.test(text)) return "Safest entry option";
  if (/\b(highest income|more money|high(?:est)? pay|income potential)\b/.test(text)) return "Highest income potential";
  if (/\b(easy|easiest).{0,18}\b(pay|income|money)\b/.test(text)) return "Easiest job that pays a lot";
  if (/\b(prestige|prestigious|top uni|best uni)\b/.test(text)) return "Most prestigious uni";
  if (/\b(help(?:ing)? people|people focused)\b/.test(text)) return "Helping people";
  if (/\bcreative work|more creative\b/.test(text)) return "Creative work";
  if (/\bavoid heavy maths?|less maths?\b/.test(text)) return "Avoid heavy maths";
  if (/\bavoid heavy science|less science\b/.test(text)) return "Avoid heavy science";
  if (/\bflexible pathway|more flexible|online or flexible\b/.test(text)) return "Flexible pathway";
  if (/\bbalanced plan|make it balanced\b/.test(text)) return "Balanced plan";
  return "";
}

function applyMyPlanProposal(id) {
  const proposal = findMyPlanProposal(id);
  const definition = proposal && myPlanActionDefinitions[proposal.action];
  if (!proposal || !definition || proposal.status !== "pending") return;
  try {
    const current = loadGuideProgress() || window.SubjectHelperLogic?.createGuideState?.({}) || {};
    const next = { ...current };
    if (proposal.action === "add_subject") {
      const subjects = Array.isArray(next.subjectsWithMarks) ? next.subjectsWithMarks.slice() : [];
      if (!subjects.some((row) => normalisePlanText(row?.subject) === normalisePlanText(proposal.value))) {
        subjects.push(createMyPlanSubjectRow(proposal.value));
      }
      next.subjectsWithMarks = subjects;
    } else if (proposal.action === "remove_subject") {
      const subjects = Array.isArray(next.subjectsWithMarks) ? next.subjectsWithMarks : [];
      const filtered = subjects.filter((row) => normalisePlanText(row?.subject) !== normalisePlanText(proposal.value));
      if (filtered.length === subjects.length) throw new Error(`${proposal.value} is not in your saved Guide subjects.`);
      next.subjectsWithMarks = filtered;
    } else {
      next[definition.field] = validateMyPlanProposalValue(proposal.action, proposal.value);
    }
    if (next.year !== "Year 10 or below") next.schoolPerformance = "Not sure yet";
    next.resultRequested = false;
    const safeState = window.SubjectHelperLogic?.createGuideState?.(next) || next;
    const serialised = window.SubjectHelperLogic?.serialiseGuideState?.(safeState) || JSON.stringify(safeState);
    localStorage.setItem(myPlanStorageKeys.guide, serialised);
    localStorage.removeItem(myPlanStorageKeys.guidePlan);
    proposal.status = "applied";
    myPlanChatState.guideChanged = true;
  } catch (error) {
    proposal.status = "failed";
    proposal.error = String(error?.message || "This change could not be applied.");
  }
  renderMyPlanMessages({ preservePageScroll: true });
  updateMyPlanChangeStatus();
}

function dismissMyPlanProposal(id) {
  const proposal = findMyPlanProposal(id);
  if (!proposal || proposal.status !== "pending") return;
  proposal.status = "dismissed";
  renderMyPlanMessages({ preservePageScroll: true });
}

function findMyPlanProposal(id) {
  for (const message of myPlanChatState.messages) {
    const proposal = message.proposals?.find((item) => item.id === id);
    if (proposal) return proposal;
  }
  return null;
}

function validateMyPlanProposalValue(action, value) {
  const clean = cleanPlanProposalValue(value);
  if (!clean) throw new Error("The requested value is empty.");
  if (action === "set_year" && !["Year 10 or below", "Year 11", "Year 12"].includes(clean)) throw new Error("That school year is not supported.");
  if (action === "set_income_goal" && !["Any income", "$60k+", "$80k+", "$100k+", "$120k+"].includes(clean)) throw new Error("That income band is not supported.");
  if (action === "set_priority" && !["Balanced plan", "Easiest job that pays a lot", "Highest income potential", "Safest entry option", "Most prestigious uni", "Helping people", "Creative work", "Avoid heavy maths", "Avoid heavy science", "Flexible pathway"].includes(clean)) throw new Error("That planning priority is not supported.");
  return clean.slice(0, 140);
}

function createMyPlanSubjectRow(subject) {
  return {
    id: `copilot-subject-${Date.now()}`,
    subject,
    y11Term1: "",
    y11Term2: "",
    y11Term3: "",
    y12Term1: "",
    y12Term2: "",
    y12Term3: "",
    y12Term4: ""
  };
}

function canonicalPlanSubject(value) {
  const clean = normalisePlanText(value)
    .replace(/\b(?:please|instead|course|subject)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return "";
  const aliases = {
    "maths advanced": "Mathematics Advanced",
    "advanced maths": "Mathematics Advanced",
    "math extension 1": "Mathematics Extension 1",
    "maths extension 1": "Mathematics Extension 1",
    "english adv": "English Advanced",
    "english std": "English Standard",
    "business": "Business Studies",
    "software": "Software Engineering"
  };
  if (aliases[clean]) return aliases[clean];
  const exact = myPlanHscSubjects.find((subject) => normalisePlanText(subject?.name) === clean);
  if (exact) return exact.name;
  const containing = myPlanHscSubjects
    .filter((subject) => normalisePlanText(subject?.name).includes(clean) || clean.includes(normalisePlanText(subject?.name)))
    .sort((a, b) => String(a.name).length - String(b.name).length)[0];
  return containing?.name || cleanPlanProposalValue(value);
}

function myPlanAiContext() {
  const guideState = loadGuideProgress() || {};
  const snapshot = loadGuidePlanSnapshot() || {};
  const courseRows = [snapshot.primary, ...(snapshot.options || [])].filter(Boolean).slice(0, 6);
  return {
    currentPage: "My Plan",
    profile: {
      topic: { label: snapshot.profileLabel || guideState.dreamJob || guideState.dreamCourse || "" },
      text: [guideState.dreamJob, guideState.dreamCourse, guideState.passions, guideState.preference].filter(Boolean).join(" "),
      atar: snapshot.projectedAtar?.value || snapshot.projectedAtar?.label || ""
    },
    answers: {
      year: guideState.year || snapshot.year || "",
      careerGoal: guideState.dreamJob || "",
      degreeGoal: guideState.dreamCourse || "",
      incomeGoal: guideState.dreamIncome || "Any income",
      interests: guideState.passions || "",
      planningPriority: guideState.preference || "Balanced plan",
      avoid: guideState.avoid || "",
      subjects: (guideState.subjectsWithMarks || []).map((row) => row.subject).filter(Boolean),
      currentRecommendation: snapshot.primary?.name || "",
      projectedAtar: snapshot.projectedAtar || null,
      uacOptions: (snapshot.options || []).map((item) => `${item.name} — ${item.university}`),
      jobs: (snapshot.jobs || []).map((item) => `${item.title} ${item.range || ""}`.trim())
    },
    courses: courseRows.map((course) => ({
      name: course.name || "",
      university: course.university || "",
      campus: course.campus || "",
      atar: course.atar || "",
      duration: course.duration || "",
      modes: course.modes || []
    }))
  };
}

function normaliseMyPlanRouteActions(actions) {
  if (!Array.isArray(actions)) return [];
  return actions.slice(0, 3).map((action) => {
    const route = String(action?.route || action?.key || "").toLowerCase();
    return myPlanSafeRoutes[route] || null;
  }).filter(Boolean);
}

function normaliseMyPlanSources(sources) {
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

function updateMyPlanChangeStatus() {
  const status = myPlanApp.querySelector("[data-plan-change-status]");
  if (status) status.classList.toggle("is-visible", myPlanChatState.guideChanged);
}

async function checkMyPlanAiStatus() {
  try {
    const response = await fetch("/api/ai", { headers: { Accept: "application/json" } });
    const payload = await response.json();
    myPlanChatState.status = {
      checked: true,
      connected: Boolean(payload.connected),
      provider: payload.connected ? (payload.provider || "Course Finder AI") : "Offline plan guidance"
    };
  } catch {
    myPlanChatState.status.checked = true;
  }
  const badge = myPlanApp.querySelector("[data-plan-ai-status]");
  if (badge) badge.textContent = myPlanAiStatusLabel();
}

function myPlanAiStatusLabel() {
  if (myPlanChatState.status.connected) return `${myPlanChatState.status.provider} connected`;
  return myPlanChatState.status.checked ? "Offline plan help ready" : "Checking grounded AI";
}

function cleanPlanProposalValue(value) {
  return String(value || "")
    .replace(/^[\s:,-]+|[\s,;:.-]+$/g, "")
    .replace(/\b(?:please|thanks|thank you)\b\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function normalisePlanText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9$+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPlanMessage(value) {
  return escapeHtml(value)
    .split(/\n{2,}/)
    .map((paragraph) => {
      const lines = paragraph.split("\n").filter((line) => line.trim());
      if (lines.length && lines.every((line) => /^\s*[-•]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${formatPlanInline(line.replace(/^\s*[-•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${formatPlanInline(paragraph).replaceAll("\n", "<br>")}</p>`;
    })
    .join("");
}

function formatPlanInline(value) {
  return String(value || "")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");
}

function providerLogoForOption(option) {
  const course = myPlanCourses.find((item) => item.id === option.id)
    || myPlanCourses.find((item) => item.name === stripNumberPrefix(option.title) && item.university === option.university)
    || myPlanCourses.find((item) => item.university === option.university);
  if (course?.providerLogo) return course.providerLogo;
  const provider = myPlanProviders.find((item) => item.name === option.university || item.id === option.providerId);
  return provider?.logo || "./assets/logo.svg";
}

function stripNumberPrefix(value) {
  return String(value || "").replace(/^\d+\.\s*/, "").trim();
}

function loadGuideProgress() {
  try {
    const raw = localStorage.getItem(myPlanStorageKeys.guide);
    if (!raw) return null;
    return window.SubjectHelperLogic?.restoreGuideState
      ? window.SubjectHelperLogic.restoreGuideState(raw)
      : JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadGuidePlanSnapshot() {
  try {
    const raw = localStorage.getItem(myPlanStorageKeys.guidePlan);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function hasSavedGuideProgress(value) {
  if (!value) return false;
  return ["dreamJob", "dreamCourse", "passions", "avoid"].some((key) => String(value[key] || "").trim())
    || value.dreamIncome !== "Any income"
    || value.schoolPerformance !== "Not sure yet"
    || value.preference !== "Balanced plan"
    || (Array.isArray(value.deckAnswers) && value.deckAnswers.some(Boolean))
    || (Array.isArray(value.subjectsWithMarks) && value.subjectsWithMarks.some((row) => String(row?.subject || row?.mark || "").trim()));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
