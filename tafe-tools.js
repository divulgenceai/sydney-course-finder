const tafeToolsApp = document.querySelector("#tafe-tools-app");
const tafeCount = window.tafeCourses?.length || 0;

const routes = {
  trade: {
    label: "Trade or apprenticeship",
    lead: "Use an apprenticeship or traineeship when the job requires paid workplace training alongside a qualification.",
    level: "Usually Certificate II, III or IV",
    checks: [
      "Confirm whether you need an employer before enrolment.",
      "Check licensing, white-card, equipment and workplace requirements.",
      "Check apprenticeship support and current training availability."
    ],
    journey: ["Choose the occupation", "Find an employer or pathway", "Complete work and training", "Check licensing"],
    searchHref: "./?education=tafe&route=trade#courses",
    officialHref: "https://www.tafensw.edu.au/study/types-courses/apprenticeships-traineeships"
  },
  job: {
    label: "Job-ready qualification",
    lead: "Choose a certificate or diploma that directly matches the work you want, then check placement and industry requirements.",
    level: "Certificate III or IV for many entry roles; Diploma for advanced or supervisory skills",
    checks: [
      "Check practical placement, police checks, vaccinations or licences.",
      "Compare delivery location, online components and intake availability.",
      "Check Smart and Skilled, fee-free and VET Student Loan eligibility separately."
    ],
    journey: ["Choose the job", "Match the qualification", "Check placement and fees", "Enrol"],
    searchHref: "./?education=tafe&route=job#courses",
    officialHref: "https://www.tafensw.edu.au/course-areas"
  },
  university: {
    label: "TAFE to university",
    lead: "Use a tertiary-preparation course, diploma or higher vocational qualification when you want university entry or possible credit.",
    level: "Tertiary Preparation Certificate, Diploma or Advanced Diploma",
    checks: [
      "Confirm that the target university recognises the exact qualification.",
      "Check whether progression is guaranteed or assessed competitively.",
      "Get credit or articulation promises in writing from the provider."
    ],
    journey: ["Choose the target degree", "Find an approved TAFE route", "Complete the required result", "Apply or progress to university"],
    searchHref: "./?education=tafe&route=university#courses",
    officialHref: "https://www.tafensw.edu.au/study/pathways"
  }
};

let activeRoute = "trade";

function render() {
  tafeToolsApp.innerHTML = `
    <a class="skip-link" href="#tafe-route-result">Skip to route</a>
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main"></nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
    <main class="tafe-tools-page">
      <section class="tafe-tools-hero">
        <span class="eyebrow">TAFE course tools</span>
        <h1>Choose the route before the qualification</h1>
        <p>Start with the outcome you want. Then confirm the current course, entry checks, delivery, funding and workplace rules.</p>
        <small>${number(tafeCount)} official TAFE NSW course pages are searchable in Course Finder.</small>
      </section>
      <section class="tafe-route-picker" aria-labelledby="tafe-route-picker-title">
        <div class="tafe-route-picker-copy">
          <span class="eyebrow">Step 1</span>
          <h2 id="tafe-route-picker-title">What are you trying to do?</h2>
        </div>
        <div class="tafe-route-tabs" role="tablist" aria-label="TAFE route">
          ${Object.entries(routes).map(([key, route]) => `
            <button
              type="button"
              role="tab"
              data-tafe-route="${key}"
              aria-selected="${key === activeRoute}"
              aria-controls="tafe-route-result"
            >${escapeHtml(route.label)}</button>
          `).join("")}
        </div>
      </section>
      <section id="tafe-route-result" class="tafe-route-result" aria-live="polite"></section>
      <section class="tafe-checks-panel">
        <div>
          <span class="eyebrow">Before enrolling</span>
          <h2>Funding and eligibility are separate checks</h2>
          <p>A course appearing in search does not guarantee a subsidised place, fee-free training, a loan, an apprenticeship employer or university credit.</p>
        </div>
        <div class="tafe-official-links">
          <a href="https://education.nsw.gov.au/skills-nsw/students-and-job-seekers/low-cost-and-free-training/smart-and-skilled-student-eligibility" target="_blank" rel="noreferrer">Smart and Skilled eligibility</a>
          <a href="https://www.tafensw.edu.au/study/types-courses/apprenticeships-traineeships" target="_blank" rel="noreferrer">Apprenticeships and traineeships</a>
          <a href="https://www.tafensw.edu.au/study/pathways" target="_blank" rel="noreferrer">TAFE to university pathways</a>
          <a href="https://www.dewr.gov.au/vet-student-loans" target="_blank" rel="noreferrer">VET Student Loans</a>
        </div>
      </section>
    </main>
  `;
  window.courseFinderTheme?.bind?.(tafeToolsApp);
  bindEvents();
  renderRoute();
}

function renderRoute() {
  const route = routes[activeRoute];
  const target = tafeToolsApp.querySelector("#tafe-route-result");
  if (!target || !route) return;
  target.innerHTML = `
    <div class="tafe-route-summary">
      <span class="eyebrow">Recommended starting route</span>
      <h2>${escapeHtml(route.label)}</h2>
      <p>${escapeHtml(route.lead)}</p>
      <dl>
        <div><dt>Qualification level to check</dt><dd>${escapeHtml(route.level)}</dd></div>
      </dl>
      <div class="tafe-route-buttons">
        <a class="primary-action" href="${escapeHtml(route.searchHref)}">Search matching TAFE courses</a>
        <a class="secondary-action" href="${escapeHtml(route.officialHref)}" target="_blank" rel="noreferrer">Open official guidance</a>
      </div>
    </div>
    <div class="tafe-route-detail">
      <div>
        <h3>How the route works</h3>
        <ol class="tafe-route-journey">
          ${route.journey.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
      </div>
      <div>
        <h3>Requirements to confirm</h3>
        <ul>
          ${route.checks.map((check) => `<li>${escapeHtml(check)}</li>`).join("")}
        </ul>
      </div>
    </div>
  `;
  target.animate?.(
    [
      { opacity: 0.7, transform: "translateY(4px)" },
      { opacity: 1, transform: "translateY(0)" }
    ],
    { duration: 180, easing: "cubic-bezier(.16,1,.3,1)" }
  );
}

function bindEvents() {
  tafeToolsApp.querySelectorAll("[data-tafe-route]").forEach((button) => {
    button.addEventListener("click", () => {
      activeRoute = button.dataset.tafeRoute || "trade";
      tafeToolsApp.querySelectorAll("[data-tafe-route]").forEach((item) => {
        item.setAttribute("aria-selected", String(item === button));
      });
      renderRoute();
    });
  });
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(Number(value) || 0);
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
