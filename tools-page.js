const toolsApp = document.querySelector("#tools-app");

const toolGroups = [
  {
    eyebrow: "Build a plan",
    title: "Turn an idea into a realistic route",
    text: "Start here if you are deciding what to study or how to reach a particular career.",
    tools: [
      {
        href: "./guide",
        title: "Guide",
        text: "Build a personalised sequence from subject selection to UAC preferences and careers.",
        tag: "Full plan"
      },
      {
        href: "./advisor",
        title: "Course direction",
        text: "Answer focused questions, then discuss the strongest course directions with the helper.",
        tag: "Not sure yet"
      },
      {
        href: "./my-plan",
        title: "My Plan",
        text: "Continue the plan you previously built in Guide.",
        tag: "Saved locally",
        requiresPlan: true
      }
    ]
  },
  {
    eyebrow: "Check your options",
    title: "Test entry, subjects and backup routes",
    text: "Use one of these when you already know the decision you need to make.",
    tools: [
      {
        href: "./atar-calculator",
        title: "ATAR calculator",
        text: "Estimate an ATAR range and see which marks have the greatest effect.",
        tag: "Estimate"
      },
      {
        href: "./subject-helper",
        title: "Subject helper",
        text: "Match a degree or job to useful Year 11 and 12 subjects.",
        tag: "HSC"
      },
      {
        href: "./pathways",
        title: "Alternative pathways",
        text: "Compare non-ATAR, diploma, foundation, portfolio and transfer routes.",
        tag: "Backup routes"
      }
    ]
  },
  {
    eyebrow: "TAFE and answers",
    title: "Practical routes and quick explanations",
    text: "Keep the course search focused while these dedicated pages handle the extra detail.",
    tools: [
      {
        href: "./tafe-tools",
        title: "TAFE tools",
        text: "Choose between trades, job-ready training and TAFE-to-university routes.",
        tag: "Vocational"
      },
      {
        href: "./help",
        title: "General help",
        text: "Ask about ATAR, UAC, selection ranks, pathways, subjects or how to use the site.",
        tag: "Ask"
      }
    ]
  }
];

function hasSavedGuidePlan() {
  return window.courseFinderTheme?.hasGuidePlanSnapshot?.() || false;
}

function renderToolCard(tool) {
  if (tool.requiresPlan && !hasSavedGuidePlan()) return "";
  return `
    <a class="tools-page-card" href="${escapeHtml(tool.href)}">
      <span class="tools-card-tag">${escapeHtml(tool.tag)}</span>
      <strong>${escapeHtml(tool.title)}</strong>
      <p>${escapeHtml(tool.text)}</p>
      <span class="tools-card-action">Open tool <span aria-hidden="true">&rarr;</span></span>
    </a>
  `;
}

function render() {
  toolsApp.innerHTML = `
    <a class="skip-link" href="#tool-list">Skip to tools</a>
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main"></nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
    <main class="tools-page">
      <section class="tools-page-hero">
        <span class="eyebrow">Planning toolkit</span>
        <h1>
          <span class="tools-heading-desktop">Use the right tool for the next decision</span>
          <span class="tools-heading-mobile">Tools</span>
        </h1>
        <p>Course search stays simple. The deeper planning, subject, ATAR, pathway and help systems live here.</p>
      </section>
      <div id="tool-list" class="tools-page-groups">
        ${toolGroups.map((group) => `
          <section class="tools-page-group">
            <div class="tools-page-group-copy">
              <span class="eyebrow">${escapeHtml(group.eyebrow)}</span>
              <h2>${escapeHtml(group.title)}</h2>
              <p>${escapeHtml(group.text)}</p>
            </div>
            <div class="tools-page-grid">
              ${group.tools.map(renderToolCard).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </main>
  `;
  window.courseFinderTheme?.bind?.(toolsApp);
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
