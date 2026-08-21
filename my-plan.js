const myPlanApp = document.querySelector("#my-plan-app");
const myPlanCourses = window.uacCourses || [];
const myPlanProviders = window.uacProviders || [];
const myPlanStorageKeys = {
  guide: "sydneyCourseFinder.guideProgress",
  guidePlan: "sydneyCourseFinder.guidePlanSnapshot"
};

renderMyPlanPage();

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
    </main>
  `;

  window.courseFinderTheme?.bind?.(myPlanApp);
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
