(function () {
  const root = document.documentElement;
  const cleanPath = () => location.pathname
    .replace(/\/index\.html$/i, "/")
    .replace(/\.html$/i, "")
    .replace(/\/+$/, "") || "/";

  const tools = [
    { id: "guide", group: "Decide", name: "Build my guide", href: "./guide", time: "5 min", description: "Create a personal subject-to-course plan." },
    { id: "advisor", group: "Decide", name: "Course direction & ATAR match", href: "./advisor", time: "3 min", description: "Turn interests and an estimated ATAR into reach, target and safer course directions." },
    { id: "subject-helper", group: "Decide", name: "Subject helper", href: "./subject-helper", time: "2 min", description: "Match a degree or career to useful HSC subjects." },
    { id: "atar-calculator", group: "Estimate", name: "ATAR calculator", href: "./atar-calculator", time: "5 min", description: "Estimate an ATAR from expected HSC marks." },
    { id: "uac-planner", group: "Apply", name: "UAC preference planner", href: "./uac-planner#preferences", time: "5 min", description: "Build and check a five-course preference draft." },
    { id: "early-entry", group: "Apply", name: "Early-entry finder", href: "./uac-planner#early-entry", time: "3 min", description: "Compare verified early-offer application routes." },
    { id: "pathways", group: "Apply", name: "Alternative pathways", href: "./pathways", time: "3 min", description: "Compare TAFE, diploma, preparation and transfer routes." },
    { id: "university-forms", group: "Apply", name: "University forms", href: "./university-forms", time: "2 min", description: "Find and prepare official university documents." }
  ];

  const pathAliases = {
    "/guide": "guide",
    "/advisor": "advisor",
    "/subject-helper": "subject-helper",
    "/subjects": "subject-helper",
    "/atar-compass": "advisor",
    "/atar-match": "advisor",
    "/atar-calculator": "atar-calculator",
    "/calculator": "atar-calculator",
    "/uac-planner": "uac-planner",
    "/preference-planner": "uac-planner",
    "/early-entry": "early-entry",
    "/pathways": "pathways",
    "/no-atar": "pathways",
    "/university-forms": "university-forms",
    "/forms": "university-forms"
  };

  let eventsBound = false;

  function activeTool() {
    const id = cleanPath() === "/uac-planner" && location.hash === "#early-entry"
      ? "early-entry"
      : pathAliases[cleanPath()];
    return tools.find((item) => item.id === id) || null;
  }

  function groupedTools() {
    return ["Decide", "Estimate", "Apply"].map((group) => ({
      group,
      items: tools.filter((item) => item.group === group)
    }));
  }

  function toolPosition(tool) {
    const peers = tools.filter((item) => item.group === tool.group);
    return `${peers.findIndex((item) => item.id === tool.id) + 1} of ${peers.length}`;
  }

  function relatedTool(tool) {
    const index = tools.findIndex((item) => item.id === tool.id);
    if (tool.id === "atar-calculator") return tools.find((item) => item.id === "advisor");
    return tools[index + 1] || tools[0];
  }

  function contextBarMarkup(tool) {
    const related = relatedTool(tool);
    return `
      <nav class="tool-context-bar" aria-label="Planning tool navigation">
        <a class="tool-context-back" href="./#tools"><span aria-hidden="true">←</span> All tools</a>
        <span class="tool-context-stage">${escapeHtml(tool.group)} · ${escapeHtml(toolPosition(tool))}</span>
        <strong class="tool-context-name">${escapeHtml(tool.name)}</strong>
        <div class="tool-context-actions">
          <a href="${escapeAttribute(related.href)}">Next: ${escapeHtml(related.name)}</a>
          <button type="button" data-open-tool-launcher>Switch tool</button>
        </div>
      </nav>
    `;
  }

  function launcherMarkup() {
    return `
      <div class="tool-launcher" data-tool-launcher aria-hidden="true">
        <button class="tool-launcher-scrim" type="button" data-close-tool-launcher aria-label="Close tool switcher"></button>
        <section class="tool-launcher-dialog" role="dialog" aria-modal="true" aria-labelledby="tool-launcher-title">
          <header>
            <div><span>Planning toolkit</span><h2 id="tool-launcher-title">Choose another tool</h2></div>
            <button type="button" data-close-tool-launcher aria-label="Close tool switcher">Done</button>
          </header>
          <div class="tool-launcher-groups">
            ${groupedTools().map(({ group, items }) => `
              <section>
                <h3>${escapeHtml(group)}</h3>
                ${items.map((item) => `
                  <a href="${escapeAttribute(item.href)}" data-tool-id="${escapeAttribute(item.id)}">
                    <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></span>
                    <em>${escapeHtml(item.time)}</em>
                  </a>
                `).join("")}
              </section>
            `).join("")}
          </div>
        </section>
      </div>
    `;
  }

  function ensureLauncher() {
    if (document.querySelector("[data-tool-launcher]")) return;
    document.body.insertAdjacentHTML("beforeend", launcherMarkup());
  }

  function setLauncher(open) {
    const launcher = document.querySelector("[data-tool-launcher]");
    if (!launcher) return;
    launcher.classList.toggle("is-open", open);
    launcher.setAttribute("aria-hidden", String(!open));
    root.classList.toggle("tool-launcher-open", open);
    if (open) {
      const current = activeTool();
      launcher.querySelector(`[data-tool-id="${current?.id || ""}"]`)?.setAttribute("aria-current", "page");
      window.setTimeout(() => launcher.querySelector("[data-close-tool-launcher]")?.focus(), 30);
    }
  }

  function bindEvents() {
    if (eventsBound) return;
    eventsBound = true;
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-open-tool-launcher]")) {
        event.preventDefault();
        setLauncher(true);
        return;
      }
      if (event.target.closest("[data-close-tool-launcher]")) {
        event.preventDefault();
        setLauncher(false);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.classList.contains("tool-launcher-open")) setLauncher(false);
    });
  }

  function enhance(scope = document) {
    const tool = activeTool();
    if (!tool) return;
    root.dataset.toolSurface = tool.id;
    root.dataset.toolGroup = tool.group.toLowerCase();
    const topbar = scope.querySelector?.(".topbar") || document.querySelector(".topbar");
    const currentBar = document.querySelector(".tool-context-bar");
    if (currentBar && !topbar?.parentElement?.contains(currentBar)) currentBar.remove();
    if (topbar && !topbar.parentElement.querySelector(":scope > .tool-context-bar")) {
      topbar.insertAdjacentHTML("afterend", contextBarMarkup(tool));
    }
    ensureLauncher();
    bindEvents();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

  window.courseFinderToolkit = { enhance, tools };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => enhance(document));
  else enhance(document);
})();
