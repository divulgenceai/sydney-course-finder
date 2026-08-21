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

  function activeTool() {
    const id = cleanPath() === "/uac-planner" && location.hash === "#early-entry"
      ? "early-entry"
      : pathAliases[cleanPath()];
    return tools.find((item) => item.id === id) || null;
  }

  function enhance() {
    const tool = activeTool();
    if (!tool) return;
    root.dataset.toolSurface = tool.id;
    root.dataset.toolGroup = tool.group.toLowerCase();
  }

  window.courseFinderToolkit = { enhance, tools };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => enhance(document));
  else enhance(document);
})();
