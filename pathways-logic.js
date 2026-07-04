(function attachPathwayLogic(global) {
  const pathwaySituations = [
    {
      id: "year10",
      label: "Year 10 or below",
      short: "Plan early",
      focus: "Pick senior subjects for the dream course, but know the backup routes before Year 11 starts."
    },
    {
      id: "year12-no-atar",
      label: "Year 12 but no ATAR / unsure ATAR",
      short: "Still at school",
      focus: "Check SRS/EAS if eligible, then add pathway or diploma backups that do not rely on a final ATAR."
    },
    {
      id: "left-y11",
      label: "Left school in Year 11",
      short: "Restart without panic",
      focus: "Start with TAFE/VET, a tertiary preparation course, or a provider pathway that accepts non-Year 12 evidence."
    },
    {
      id: "finished-y12-no-atar",
      label: "Finished Year 12 without an ATAR",
      short: "Use HSC plus a bridge",
      focus: "Use your Year 12 completion with a prep, diploma, undergraduate certificate or STAT/mature-age route where allowed."
    },
    {
      id: "vet",
      label: "Have or want TAFE/VET first",
      short: "Use practical study",
      focus: "Pick a VET course in the same field, then check university credit transfer or admission rules."
    },
    {
      id: "creative",
      label: "Creative, design or performance",
      short: "Show work",
      focus: "Build a portfolio, audition or interview file while checking any diploma or studio pathway."
    },
    {
      id: "mature",
      label: "Mature-age / returning to study",
      short: "Use adult-entry evidence",
      focus: "STAT, open-access study, work evidence and preparation programs may matter more than old school results."
    }
  ];

  const fieldProfiles = [
    {
      id: "business",
      label: "Business / commerce",
      tokens: ["business", "commerce", "marketing", "accounting", "finance", "management", "entrepreneur", "human resources", "hr"],
      target: "business, commerce, accounting, marketing or management degree",
      vet: "Certificate IV or Diploma of Business, Accounting, Marketing or Leadership",
      diploma: "Diploma of Business, Commerce or Business Analytics",
      portfolio: "business case study, customer research, project evidence or work experience"
    },
    {
      id: "technology",
      label: "Technology / IT",
      tokens: ["software", "computer", "it", "information technology", "cyber", "data", "coding", "programming", "developer", "ai", "game"],
      target: "IT, computer science, software, cyber or data degree",
      vet: "Certificate IV or Diploma of Information Technology, Cyber Security or Programming",
      diploma: "Diploma of IT, Software Development or Engineering pathway",
      portfolio: "GitHub projects, apps, websites, coding challenges or tech portfolio"
    },
    {
      id: "health",
      label: "Health / nursing",
      tokens: ["nursing", "health", "medical", "medicine", "physio", "psychology", "biomed", "pharmacy", "paramedicine", "allied health"],
      target: "health, nursing, biomedical, psychology or allied-health degree",
      vet: "Certificate III/IV health support, Diploma of Nursing or allied-health preparation where available",
      diploma: "Diploma or undergraduate certificate in health science, nursing entry or biomedical preparation",
      portfolio: "first aid, volunteering, aged-care, disability support or health work evidence"
    },
    {
      id: "education",
      label: "Education / teaching",
      tokens: ["teaching", "teacher", "education", "primary", "secondary", "early childhood", "childcare"],
      target: "education, teaching or early-childhood degree",
      vet: "Certificate III or Diploma in Early Childhood Education and Care, school support or community services",
      diploma: "Diploma or pathway course linked to education or arts-to-teaching",
      portfolio: "childcare, tutoring, coaching, youth work or classroom volunteering evidence"
    },
    {
      id: "creative",
      label: "Creative / design",
      tokens: ["animation", "design", "creative", "art", "music", "film", "media", "game design", "acting", "performance", "architecture"],
      target: "design, animation, media, music, performance or creative degree",
      vet: "Certificate IV or Diploma in Design, Screen and Media, Music, Live Production or Visual Arts",
      diploma: "Diploma, foundation studio, design college or creative pathway course",
      portfolio: "portfolio, audition, showreel, interview, sketchbook or project work"
    },
    {
      id: "law",
      label: "Law / justice",
      tokens: ["law", "legal", "justice", "criminology", "policing", "police", "security"],
      target: "law, justice, criminology or policing-related degree",
      vet: "Certificate IV or Diploma in Justice, Legal Services, Government or Community Services",
      diploma: "Diploma or associate-degree pathway into law, arts, criminology or justice",
      portfolio: "debating, legal studies work, volunteering, community or leadership evidence"
    },
    {
      id: "engineering",
      label: "Engineering / built environment",
      tokens: ["engineering", "engineer", "construction", "civil", "mechanical", "electrical", "architecture", "built", "surveying"],
      target: "engineering, construction, built environment or architecture-adjacent degree",
      vet: "Certificate IV or Diploma in Engineering, Building Design, Construction, Surveying or CAD",
      diploma: "Engineering, built environment or construction management diploma pathway",
      portfolio: "CAD work, projects, maths evidence, maker projects or construction/worksite evidence"
    },
    {
      id: "general",
      label: "General degree pathway",
      tokens: [],
      target: "the degree or career area you choose",
      vet: "Certificate IV, diploma or TAFE course in the closest field",
      diploma: "Diploma, undergraduate certificate, foundation or preparation program",
      portfolio: "work samples, references, volunteering, projects or short-course evidence"
    }
  ];

  const routeTemplates = [
    {
      id: "tafe-vet",
      baseTitle: "TAFE/VET pathway",
      shortTitle: "TAFE/VET first",
      year12Rule: "This path does not usually need Year 12 for many VET courses, but the exact course can still have age, literacy, licensing or prerequisite rules.",
      bestFor: "Leaving in Year 11, no ATAR, wanting practical skills first, or needing a lower-pressure restart.",
      officialLabel: "TAFE NSW pathways",
      officialUrl: "https://www.tafensw.edu.au/study/pathways",
      scores: { "left-y11": 45, vet: 46, "finished-y12-no-atar": 28, "year12-no-atar": 22, year10: 16, mature: 24, creative: 18 },
      profileBoosts: { business: 8, technology: 8, health: 7, education: 7, creative: 7, law: 4, engineering: 8 },
      steps(profile) {
        return [
          `Start with ${profile.vet}.`,
          `Use that qualification to apply for a related ${profile.target}.`,
          "Before enrolling, ask the university what credit or admission advantage that exact VET course gives."
        ];
      }
    },
    {
      id: "uni-prep",
      baseTitle: "Uni preparation / foundation",
      shortTitle: "Prep program",
      year12Rule: "Some tertiary preparation courses are made for applicants who have not completed Year 12 and do not require an ATAR.",
      bestFor: "Students who need university skills first or a formal bridge before a diploma or bachelor.",
      officialLabel: "UAC pathway programs",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university",
      scores: { "left-y11": 36, "finished-y12-no-atar": 42, "year12-no-atar": 36, mature: 36, year10: 20, vet: 20, creative: 18 },
      profileBoosts: { general: 4, health: 5, engineering: 5, technology: 4, education: 4 },
      steps(profile) {
        return [
          "Apply for a uni preparation, foundation, enabling or tertiary preparation course.",
          `Choose units that point toward a ${profile.target}.`,
          "After completion, use the result to apply for the degree or a related diploma pathway."
        ];
      }
    },
    {
      id: "diploma",
      baseTitle: "Diploma / Undergraduate Certificate",
      shortTitle: "Diploma bridge",
      year12Rule: "This may or may not need Year 12. Some providers accept VET, work evidence, mature-age evidence or other criteria instead.",
      bestFor: "A structured bridge into a related degree, especially when direct entry is too risky.",
      officialLabel: "UAC admission criteria",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria",
      scores: { "finished-y12-no-atar": 40, "year12-no-atar": 38, "left-y11": 28, vet: 32, mature: 30, year10: 20, creative: 24 },
      profileBoosts: { business: 10, technology: 9, health: 7, education: 5, creative: 8, law: 4, engineering: 8 },
      steps(profile) {
        return [
          `Search for a ${profile.diploma}.`,
          "Check whether completion gives guaranteed entry, competitive entry or credit.",
          "Put the dream degree first, then the diploma/pathway option below it as the safer ladder."
        ];
      }
    },
    {
      id: "portfolio",
      baseTitle: "Portfolio / interview route",
      shortTitle: "Show evidence",
      year12Rule: "ATAR may be less central for some creative or practical courses, but the exact portfolio, audition or interview rule is course-specific.",
      bestFor: "Creative, design, media, animation, music, performance or practical courses where evidence of work matters.",
      officialLabel: "Check UAC course criteria",
      officialUrl: "https://uac.edu.au/course-search/search",
      scores: { creative: 44, "year12-no-atar": 14, "left-y11": 14, "finished-y12-no-atar": 14, mature: 14, year10: 18, vet: 10 },
      profileBoosts: { creative: 46, technology: 8, engineering: 5, business: 3 },
      steps(profile) {
        return [
          `Build ${profile.portfolio}.`,
          "Check the exact file format, due date, interview or audition requirement.",
          "Pair the portfolio with a VET/diploma/prep backup so the plan is not one-shot."
        ];
      }
    },
    {
      id: "srs-eas",
      baseTitle: "SRS / EAS while still in Year 12",
      shortTitle: "School/access schemes",
      year12Rule: "This is mainly for current Year 12 applicants. It does not replace prerequisites and it is not a guarantee.",
      bestFor: "Students still at school who may be eligible for early offers or educational-disadvantage consideration.",
      officialLabel: "UAC SRS and EAS",
      officialUrl: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes",
      scores: { "year12-no-atar": 42, year10: 18, "finished-y12-no-atar": 8, "left-y11": 0, vet: 0, mature: 0, creative: 8 },
      profileBoosts: { general: 4 },
      steps() {
        return [
          "Submit the UAC undergraduate application first.",
          "Apply for Schools Recommendation Scheme and Educational Access Scheme if eligible.",
          "Still keep pathway preferences underneath because scheme outcomes are not guaranteed."
        ];
      }
    },
    {
      id: "stat",
      baseTitle: "STAT / mature-age route",
      shortTitle: "STAT evidence",
      year12Rule: "Usually most relevant for mature-age or non-school-leaver applicants. Each institution decides whether STAT is accepted.",
      bestFor: "People with no recent formal results, older applicants, or students returning after a break.",
      officialLabel: "UAC STAT pathway",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university",
      scores: { mature: 46, "finished-y12-no-atar": 20, "left-y11": 16, vet: 12, "year12-no-atar": 8, year10: 0, creative: 8 },
      profileBoosts: { general: 3 },
      steps(profile) {
        return [
          `Confirm whether the target ${profile.target} accepts STAT.`,
          "Book the correct STAT version only if the institution/course says it can be used.",
          "Use STAT with any work, VET, open-access or previous-study evidence."
        ];
      }
    },
    {
      id: "open-access",
      baseTitle: "Open access / single units",
      shortTitle: "Start small online",
      year12Rule: "Open-access study can be a way to prove readiness without a school ATAR, but later admission still depends on results and course rules.",
      bestFor: "Students who need flexibility, online study or a small test before committing to a full degree.",
      officialLabel: "Open Universities Australia",
      officialUrl: "https://www.open.edu.au/study-online/pathways-pre-university/oua-pathways",
      scores: { mature: 34, "finished-y12-no-atar": 26, "left-y11": 22, vet: 18, "year12-no-atar": 18, year10: 8, creative: 10 },
      profileBoosts: { business: 4, technology: 6, education: 3, general: 5 },
      steps(profile) {
        return [
          `Start with one or two units connected to a ${profile.target}.`,
          "Aim for strong marks because later admission may use tertiary performance.",
          "Ask whether those units can count as credit before you pay for more."
        ];
      }
    },
    {
      id: "transfer",
      baseTitle: "Start related, then transfer",
      shortTitle: "Transfer later",
      year12Rule: "You usually need entry into the first course, then strong results. Transfer is competitive unless the provider guarantees progression.",
      bestFor: "Students near the target but needing a safer first course that shares subjects with the dream degree.",
      officialLabel: "UAC admission criteria",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria",
      scores: { "finished-y12-no-atar": 18, "year12-no-atar": 18, vet: 18, mature: 14, "left-y11": 10, year10: 12, creative: 10 },
      profileBoosts: { engineering: 6, technology: 5, business: 5, health: 4 },
      steps(profile) {
        return [
          `Begin in a related lower-entry course linked to a ${profile.target}.`,
          "Use first-year marks to apply for transfer.",
          "Check minimum GPA/WAM, credit rules and transfer deadlines before choosing the first course."
        ];
      }
    }
  ];

  function classifyPathwayGoal(goal = "") {
    const clean = cleanSearchText(goal);
    if (!clean) return fieldProfiles.find((profile) => profile.id === "general");
    const scored = fieldProfiles
      .filter((profile) => profile.id !== "general")
      .map((profile) => ({
        profile,
        score: profile.tokens.reduce((sum, token) => sum + (clean.includes(cleanSearchText(token)) ? token.length : 0), 0)
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.score ? scored[0].profile : fieldProfiles.find((profile) => profile.id === "general");
  }

  function buildPathwayResults({ goal = "", situation = "year12-no-atar", courses = [] } = {}) {
    const profile = classifyPathwayGoal(goal);
    const currentSituation = pathwaySituations.find((item) => item.id === situation) || pathwaySituations[1];
    const signals = pathwayDataSignals(profile, courses);
    const routes = routeTemplates
      .map((route) => hydrateRoute(route, profile, currentSituation))
      .filter((route) => route.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 4);
    return {
      goal: String(goal || "").trim(),
      profile,
      situation: currentSituation,
      routes,
      signals,
      summary: summaryFor(currentSituation, profile, routes[0])
    };
  }

  function hydrateRoute(route, profile, situation) {
    const profileBoost = route.profileBoosts?.[profile.id] ?? route.profileBoosts?.general ?? 0;
    const situationScore = route.scores?.[situation.id] ?? 0;
    const title = route.id === "tafe-vet"
      ? `${profile.label} via TAFE/VET`
      : route.id === "diploma"
        ? `${profile.label} diploma bridge`
        : route.baseTitle;
    return {
      id: route.id,
      title,
      shortTitle: route.shortTitle,
      bestFor: route.bestFor,
      year12Rule: route.year12Rule,
      officialLabel: route.officialLabel,
      officialUrl: route.officialUrl,
      steps: route.steps(profile),
      score: situationScore + profileBoost,
      check: checkText(route.id, profile)
    };
  }

  function pathwayDataSignals(profile, courses) {
    if (!Array.isArray(courses) || !courses.length) return { count: 0, labels: [] };
    const terms = [profile.label, profile.target, profile.vet, profile.diploma].flatMap((item) => cleanSearchText(item).split(" ")).filter((word) => word.length > 3);
    const labels = [];
    let count = 0;
    for (const course of courses) {
      const text = cleanSearchText([course.name, course.area, course.summary, course.prerequisites, course.careers].filter(Boolean).join(" "));
      if (!terms.some((term) => text.includes(term))) continue;
      if (!/diploma|certificate|foundation|prepar|pathway|portfolio|interview|no|vet|tafe/.test(text) && String(course.atar || "").toUpperCase() !== "NO") continue;
      count += 1;
      if (labels.length < 3 && course.name) labels.push(course.name);
    }
    return { count, labels };
  }

  function summaryFor(situation, profile, bestRoute) {
    return `${situation.focus} For ${profile.label.toLowerCase()}, start by checking ${bestRoute?.shortTitle || "a pathway route"} and then confirm the official entry rules.`;
  }

  function checkText(routeId, profile) {
    if (routeId === "tafe-vet") return `Ask: does this ${profile.vet} give entry, credit, both, or just useful preparation?`;
    if (routeId === "diploma") return "Ask: is progression guaranteed, competitive, or just possible after completion?";
    if (routeId === "portfolio") return "Ask: what evidence format, deadline and interview/audition rules apply?";
    if (routeId === "srs-eas") return "Ask: am I eligible, and does the target course still have prerequisites?";
    if (routeId === "stat") return "Ask: does this institution accept STAT for this exact course?";
    if (routeId === "open-access") return "Ask: can these units count as credit later?";
    return "Ask: what result do I need before I can transfer?";
  }

  function cleanSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const api = {
    buildPathwayResults,
    classifyPathwayGoal,
    pathwaySituations,
    fieldProfiles,
    routeTemplates
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PathwayLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
