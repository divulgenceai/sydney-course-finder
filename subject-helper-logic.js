(function attachSubjectHelperLogic(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SubjectHelperLogic = api;
}(typeof globalThis !== "undefined" ? globalThis : this, function createSubjectHelperLogic() {
  function normaliseText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normaliseSubjectName(value) {
    return normaliseText(value)
      .replace(/\bpersonal development health and physical education\b/g, "health and movement science")
      .replace(/\bpdhpe\b/g, "health and movement science");
  }

  function uniqueSubjectRows(subjects) {
    const seen = new Set();
    const rows = [];
    for (const subject of subjects || []) {
      if (!subject?.name) continue;
      const key = normaliseSubjectName(subject.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push(subject);
    }
    return rows;
  }

  function subjectArea(subject) {
    if (subject?.subjectArea) return normaliseText(subject.subjectArea);
    const name = normaliseSubjectName(subject?.name);
    if (!name) return "";
    if (name.startsWith("english ")) return "english";
    if (name.startsWith("mathematics ")) return "mathematics";
    if (name === "history extension") return "history";
    if (name === "music extension") return "music";
    if (name === "science extension") return "science";
    const languageFamilies = [
      "arabic", "armenian", "chinese", "classical greek", "classical hebrew",
      "croatian", "dutch", "filipino", "french", "german", "hindi", "hungarian",
      "indonesian", "italian", "japanese", "khmer", "korean", "latin",
      "macedonian", "modern greek", "modern hebrew", "persian", "polish",
      "portuguese", "punjabi", "russian", "serbian", "spanish", "swedish",
      "tamil", "turkish", "vietnamese"
    ];
    const language = languageFamilies.find((family) => name === family || name.startsWith(`${family} `));
    if (language) return language;
    return name.replace(/\s+exam$/, "");
  }

  function patternRule(id, pass, label, fix) {
    return { id, pass, label, fix };
  }

  function evaluateSubjectPattern({ year, subjects }) {
    const uniqueSubjects = uniqueSubjectRows(subjects);
    const eligibleSubjects = uniqueSubjects.filter((subject) => subject.atarEligible !== false);
    const totalUnits = eligibleSubjects.reduce((sum, subject) => sum + positiveUnits(subject.units), 0);
    const englishUnits = eligibleSubjects
      .filter((subject) => subject.english || subjectArea(subject) === "english")
      .reduce((sum, subject) => sum + positiveUnits(subject.units), 0);
    const twoUnitCourseCount = eligibleSubjects.filter((subject) => positiveUnits(subject.units) >= 2).length;
    const subjectAreaCount = new Set(eligibleSubjects.map(subjectArea).filter(Boolean)).size;
    const isYear11 = String(year || "").includes("11");
    const requiredUnits = isYear11 ? 12 : 10;
    const rules = [
      patternRule(
        "units",
        totalUnits >= requiredUnits,
        `${requiredUnits} eligible units`,
        `Add ${Math.max(0, requiredUnits - totalUnits)} more eligible unit${requiredUnits - totalUnits === 1 ? "" : "s"}.`
      ),
      patternRule("english", englishUnits >= 2, "2 units of English", "Add a 2-unit English course."),
      patternRule(
        "two-unit-courses",
        twoUnitCourseCount >= 3,
        "3 Board Developed courses of 2 units or greater",
        `Add ${Math.max(0, 3 - twoUnitCourseCount)} more 2-unit Board Developed course${3 - twoUnitCourseCount === 1 ? "" : "s"}.`
      ),
      patternRule(
        "subject-areas",
        subjectAreaCount >= 4,
        "4 subject areas",
        `Add subject${4 - subjectAreaCount === 1 ? "" : "s"} from ${Math.max(0, 4 - subjectAreaCount)} more area${4 - subjectAreaCount === 1 ? "" : "s"}.`
      )
    ];
    const failedRules = rules.filter((rule) => !rule.pass);
    let status = "ineligible";
    if (!uniqueSubjects.length) status = "insufficient";
    else if (isYear11) status = failedRules.length ? "needs-attention" : "on-track";
    else status = failedRules.length ? "ineligible" : "eligible";

    return {
      year,
      status,
      totalUnits,
      englishUnits,
      twoUnitCourseCount,
      subjectAreaCount,
      uniqueSubjects,
      eligibleSubjects,
      rules,
      failedRules
    };
  }

  function selectCoursesForEligibility(query, displayedMatches) {
    const matches = Array.isArray(displayedMatches) ? displayedMatches : [];
    const cleanQuery = normaliseText(query);
    const exactMatches = matches.filter((match) => normaliseText(match?.course?.name) === cleanQuery);
    return {
      exact: Boolean(cleanQuery && exactMatches.length),
      matches: cleanQuery && exactMatches.length ? exactMatches : matches
    };
  }

  function assessCourseSubjects({ course, selectedSubjects, subjectAliases }) {
    const selected = uniqueSubjectRows(selectedSubjects);
    const prerequisiteText = cleanRequirement(course?.prerequisites);
    const assumedText = cleanRequirement(course?.assumed);
    const hardPrerequisiteText = hardPrerequisiteOnly(prerequisiteText);
    const requiredSubjects = extractSubjects(hardPrerequisiteText, subjectAliases);
    const assumedSubjects = extractSubjects(
      [assumedText, assumedKnowledgeFromPrerequisite(prerequisiteText)].filter(Boolean).join(" "),
      subjectAliases
    );
    const missingRequired = requiredSubjects.filter((required) => !subjectRequirementSatisfied(required, selected));
    const missingAssumed = assumedSubjects.filter((assumed) => !subjectRequirementSatisfied(assumed, selected));

    if (requiredSubjects.length) {
      return {
        status: missingRequired.length ? "blocked" : "eligible",
        requiredSubjects,
        missingRequired,
        assumedSubjects,
        missingAssumed,
        hardPrerequisiteText
      };
    }

    if (hardPrerequisiteText) {
      return {
        status: "check",
        requiredSubjects: [],
        missingRequired: [],
        assumedSubjects,
        missingAssumed,
        hardPrerequisiteText
      };
    }

    return {
      status: "open",
      requiredSubjects: [],
      missingRequired: [],
      assumedSubjects,
      missingAssumed,
      hardPrerequisiteText: ""
    };
  }

  function isDirectionDeckComplete(answers, requiredCount = 12) {
    if (!Array.isArray(answers) || answers.length < requiredCount) return false;
    return answers.slice(0, requiredCount).every((answer) => ["a", "b", "unsure"].includes(answer));
  }

  function scoreDirectionDeck(answers, cards) {
    const scores = {};
    (answers || []).forEach((answer, index) => {
      if (!["a", "b"].includes(answer)) return;
      const signals = cards?.[index]?.[answer]?.signals || {};
      for (const [profile, value] of Object.entries(signals)) {
        scores[profile] = (scores[profile] || 0) + Number(value || 0);
      }
    });
    return scores;
  }

  function chooseDirectionProfile({ explicitProfile, deckScores }) {
    if (explicitProfile) return explicitProfile;
    return Object.entries(deckScores || {})
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
  }

  function buildYear10SubjectPlan({ profileSubjects, requiredSubjects, hscSubjects }) {
    const available = new Map();
    for (const subject of hscSubjects || []) {
      if (!subject?.name) continue;
      available.set(normaliseSubjectName(subject.name), subject);
    }

    const requiredNames = new Set(
      (requiredSubjects || [])
        .map(normaliseSubjectName)
        .filter((name) => name && name !== "any english course")
    );
    const preferredNames = (profileSubjects || []).map(normaliseSubjectName).filter(Boolean);
    const selected = [];
    const selectedNames = new Set();
    const optionalExtras = [];

    const preferredEnglish = preferredNames
      .map((name) => available.get(name))
      .find((subject) => subject?.english);
    const fallbackEnglish = available.get("english advanced")
      || available.get("english standard")
      || [...available.values()].find((subject) => subject.english && positiveUnits(subject.units) >= 2);
    addPlanSubject(preferredEnglish || fallbackEnglish, "English is required for an ATAR pattern.", false);

    for (const requiredName of requiredNames) {
      addPlanSubject(resolveAvailableSubject(requiredName, available), "Detected as a possible course prerequisite.", true);
    }

    for (const preferredName of preferredNames) {
      const preferred = resolveAvailableSubject(preferredName, available);
      if (preferred && positiveUnits(preferred.units) < 2) {
        optionalExtras.push(preferred);
        continue;
      }
      addPlanSubject(preferred, "Strong preparation for this direction.", requiredNames.has(preferredName));
    }

    const flexibleFallbacks = [
      "mathematics advanced",
      "mathematics standard 2",
      "business studies",
      "biology",
      "enterprise computing",
      "design and technology",
      "modern history",
      "community and family studies"
    ];
    for (const fallback of flexibleFallbacks) {
      addPlanSubject(resolveAvailableSubject(fallback, available), "Flexible subject that keeps another study area open.", false);
    }

    for (const subject of available.values()) {
      addPlanSubject(subject, "Flexible subject based on available HSC course data.", false);
      if (selected.length >= 6) break;
    }

    const subjects = selected.slice(0, 6);
    const possibleDrop = choosePossibleDrop(subjects);
    return { subjects, possibleDrop, optionalExtras: uniqueSubjectRows(optionalExtras) };

    function addPlanSubject(subject, reason, required) {
      if (!subject || selected.length >= 6) return;
      if (positiveUnits(subject.units) < 2) {
        optionalExtras.push(subject);
        return;
      }
      const key = normaliseSubjectName(subject.name);
      if (!key || selectedNames.has(key)) return;
      selectedNames.add(key);
      selected.push({
        subject,
        required: Boolean(required || requiredNames.has(key)),
        reason
      });
    }
  }

  function choosePossibleDrop(subjectPlan) {
    const candidates = [...(subjectPlan || [])].reverse();
    for (const item of candidates) {
      if (item.required || item.subject?.english) continue;
      const remaining = subjectPlan
        .filter((candidate) => candidate !== item)
        .map((candidate) => candidate.subject);
      const eligibility = evaluateSubjectPattern({ year: "Year 12", subjects: remaining });
      if (eligibility.status === "eligible") {
        return {
          ...item,
          remainingUnits: eligibility.totalUnits
        };
      }
    }
    return null;
  }

  function titleCase(value) {
    return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function detectPlanningIntent({ query, profiles, courses }) {
    const clean = normaliseText(query);
    if (!clean) return { kind: "none", label: "", profile: "", confidence: 0, alternatives: [] };

    const careerCandidates = [];
    const degreeCandidates = [];

    for (const profile of profiles || []) {
      for (const career of profile.careers || []) {
        const candidate = normaliseText(career);
        const score = intentPhraseScore(clean, candidate);
        if (score) careerCandidates.push({ kind: "career", label: career, profile: profile.label, score });
      }
      for (const degree of profile.degrees || []) {
        const candidate = normaliseText(degree);
        const score = intentPhraseScore(clean, candidate);
        if (score) degreeCandidates.push({ kind: "degree", label: degree, profile: profile.label, score });
      }
    }

    for (const course of courses || []) {
      const title = String(course?.name || "").trim();
      const titleScore = intentPhraseScore(clean, normaliseText(title));
      if (titleScore) {
        degreeCandidates.push({
          kind: "degree",
          label: title,
          profile: String(course?.area || ""),
          score: titleScore + (/^(bachelor|diploma|associate|undergraduate)/.test(clean) ? 25 : 0)
        });
      }
      for (const career of String(course?.careers || "").split(/[,;/]+/).map((item) => item.trim()).filter(Boolean)) {
        const careerScore = intentPhraseScore(clean, normaliseText(career));
        if (careerScore) {
          careerCandidates.push({
            kind: "career",
            label: titleCase(career),
            profile: String(course?.area || ""),
            score: careerScore
          });
        }
      }
    }

    const careers = bestIntentCandidates(careerCandidates);
    const degrees = bestIntentCandidates(degreeCandidates);
    const broadProfile = (profiles || []).find((profile) =>
      normaliseText(profile.label) === clean
      || (profile.keywords || []).some((keyword) => normaliseText(keyword) === clean)
    );
    const career = careers[0] || (broadProfile?.careers?.[0]
      ? { kind: "career", label: broadProfile.careers[0], profile: broadProfile.label, score: 58 }
      : null);
    const degree = degrees[0] || (broadProfile?.degrees?.[0]
      ? { kind: "degree", label: broadProfile.degrees[0], profile: broadProfile.label, score: 58 }
      : null);
    if (!career && !degree) return { kind: "none", label: String(query).trim(), profile: "", confidence: 0, alternatives: [] };

    const exactCareer = career && normaliseText(career.label) === clean && career.score >= 90;
    if ((broadProfile && career && degree && !exactCareer) || (career && degree && Math.abs(career.score - degree.score) <= 8)) {
      const alternatives = [career, degree].filter(Boolean).map(intentPublicResult);
      return {
        kind: "ambiguous",
        label: String(query).trim(),
        profile: alternatives[0]?.profile || "",
        confidence: 0.55,
        alternatives
      };
    }

    return intentPublicResult(career && (!degree || career.score > degree.score) ? career : degree);
  }

  function intentPhraseScore(query, candidate) {
    if (!query || !candidate) return 0;
    if (query === candidate) return 100;
    if (candidate.includes(query) || query.includes(candidate)) return 72;
    const queryTokens = new Set(query.split(" "));
    const candidateTokens = candidate.split(" ");
    const overlap = candidateTokens.filter((token) => queryTokens.has(token)).length;
    return overlap ? (overlap / Math.max(queryTokens.size, candidateTokens.length)) * 60 : 0;
  }

  function bestIntentCandidates(candidates) {
    const seen = new Set();
    return [...(candidates || [])]
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .filter((item) => {
        const key = `${item.kind}:${normaliseText(item.label)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function intentPublicResult(item) {
    if (!item) return null;
    return {
      kind: item.kind,
      label: item.label,
      profile: item.profile,
      confidence: Math.min(1, item.score / 100),
      alternatives: []
    };
  }

  function mergeSubjectRecommendations({ profileSubjects, evidence }) {
    const rows = new Map();
    for (const item of profileSubjects || []) {
      const name = String(item?.name || item?.[0] || "").trim();
      if (!name) continue;
      rows.set(normaliseSubjectName(name), {
        name,
        tier: item?.tier || item?.[1] || "useful",
        reason: item?.reason || item?.[2] || "",
        required: 0,
        assumed: 0
      });
    }
    for (const signal of evidence || []) {
      const key = normaliseSubjectName(signal?.name);
      if (!key) continue;
      const row = rows.get(key) || {
        name: signal.name,
        tier: "useful",
        reason: "Detected in matching UAC course information.",
        required: 0,
        assumed: 0
      };
      row.required += Number(signal.required || 0);
      row.assumed += Number(signal.assumed || 0);
      if (row.required) row.tier = "required";
      else if (row.assumed && row.tier !== "required") row.tier = "priority";
      rows.set(key, row);
    }
    const tierWeight = { required: 4, priority: 3, useful: 2, stretch: 1 };
    return [...rows.values()].sort((a, b) =>
      (tierWeight[b.tier] || 0) - (tierWeight[a.tier] || 0)
      || b.required - a.required
      || b.assumed - a.assumed
      || a.name.localeCompare(b.name)
    );
  }

  function relatedDegreeNames(matches, limit = 6) {
    return uniqueText((matches || []).map((match) => match?.course?.name)).slice(0, limit);
  }

  function relatedCareerOutcomes(matches, limit = 8) {
    const outcomes = [];
    for (const match of matches || []) {
      const course = match?.course || {};
      const explicit = Array.isArray(course.incomeOutcomes) ? course.incomeOutcomes : [];
      for (const item of explicit) {
        if (item?.title) outcomes.push({ title: item.title, range: item.range || "Income varies" });
      }
      if (!explicit.length) {
        for (const title of String(course.careers || "").split(/[,;/]+/).map((item) => item.trim()).filter(Boolean)) {
          outcomes.push({ title, range: "Income varies" });
        }
      }
    }
    const seen = new Set();
    return outcomes.filter((item) => {
      const key = normaliseText(item.title);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  }

  function uniqueText(values) {
    const seen = new Set();
    return (values || []).filter((value) => {
      const clean = normaliseText(value);
      if (!clean || seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }

  const GUIDE_YEARS = ["Year 10 or below", "Year 11", "Year 12"];

  function guideDefaults() {
    return {
      year: "Year 10 or below",
      dreamJob: "",
      dreamCourse: "",
      dreamIncome: "Any income",
      passions: "",
      schoolPerformance: "Not sure yet",
      preference: "Balanced plan",
      subjectsWithMarks: [],
      avoid: "",
      deckIndex: 0,
      deckAnswers: [],
      resultRequested: false
    };
  }

  function createGuideState(input = {}) {
    const defaults = guideDefaults();
    const year = GUIDE_YEARS.includes(input.year) ? input.year : defaults.year;
    const next = {
      ...defaults,
      ...input,
      year,
      deckIndex: Math.max(0, Number.isInteger(input.deckIndex) ? input.deckIndex : 0),
      deckAnswers: Array.isArray(input.deckAnswers)
        ? input.deckAnswers.slice(0, 12).map((answer) => ["a", "b", "unsure"].includes(answer) ? answer : "")
        : [],
      subjectsWithMarks: Array.isArray(input.subjectsWithMarks) ? input.subjectsWithMarks : []
    };
    return Object.fromEntries(Object.keys(defaults).map((key) => [key, next[key]]));
  }

  function updateDirectionAnswer(state, index, answer) {
    if (!["a", "b", "unsure"].includes(answer)) return createGuideState(state);
    const next = createGuideState(state);
    const deckAnswers = next.deckAnswers.slice();
    deckAnswers[index] = answer;
    return createGuideState({
      ...next,
      deckAnswers,
      deckIndex: Math.min(11, Math.max(next.deckIndex, index + 1)),
      resultRequested: false
    });
  }

  function serialiseGuideState(state) {
    return JSON.stringify(createGuideState(state));
  }

  function restoreGuideState(value) {
    try {
      return createGuideState(JSON.parse(String(value || "{}")));
    } catch {
      return createGuideState();
    }
  }

  function buildPlanMilestones(input = {}, now = new Date()) {
    const state = createGuideState(input);
    const year = state.year || "Year 10 or below";
    const goal = [state.dreamJob, state.dreamCourse].map((item) => String(item || "").trim()).filter(Boolean).join(" / ");
    const income = state.dreamIncome && state.dreamIncome !== "Any income" ? `, aiming around ${state.dreamIncome}` : "";
    const status = {
      label: year,
      text: goal
        ? `You are currently planning toward ${goal}${income}.`
        : `You are currently in ${year.toLowerCase()} planning mode. Add a job, degree or course target to sharpen this.`
    };

    const items = year === "Year 10 or below"
      ? year10Milestones()
      : year === "Year 11"
        ? year11Milestones()
        : year12Milestones();

    const datedItems = items.map((item) => ({
      ...item,
      status: milestoneStatus(item.date, now)
    }));

    return {
      status,
      items: datedItems
    };
  }

  function buildPersonalPlanView(input = {}, snapshot = null, now = new Date()) {
    const state = createGuideState(input);
    const milestones = buildPlanMilestones(state, now);
    const plan = snapshot && typeof snapshot === "object" ? snapshot : null;
    if (!plan?.primary?.name) {
      return {
        ...milestones,
        source: "guide-progress",
        sections: []
      };
    }

    const primary = plan.primary;
    const goal = cleanDisplayText(plan.goalLabel)
      || [state.dreamJob, state.dreamCourse].map(cleanDisplayText).filter(Boolean).join(" / ");
    const statusText = `${primary.name} at ${primary.university || "your selected provider"} is your current Guide recommendation${goal ? ` for ${goal}` : ""}.`;
    const sections = [
      {
        title: "Current Guide recommendation",
        intro: "This is the course direction the Guide built from your answers.",
        items: [{
          title: primary.name,
          meta: [primary.university, primary.campus, primary.atar ? `ATAR ${primary.atar}` : ""].filter(Boolean).join(" - "),
          text: [plan.reach?.text, plan.atarTargetLabel, plan.atarMessage].map(cleanDisplayText).filter(Boolean).join(" ")
        }]
      },
      {
        title: "Subjects from your Guide",
        intro: "These are the subject choices or keeps the Guide connected to this pathway.",
        items: (plan.subjectTargets || []).slice(0, 8).map((item) => ({
          title: cleanDisplayText(item.name),
          meta: cleanDisplayText(item.badge),
          text: [item.reason, item.target].map(cleanDisplayText).filter(Boolean).join(" ")
        })).filter((item) => item.title)
      },
      {
        title: "UAC preference ladder",
        intro: "Use the exact order in UAC strategically: dream first, realistic next, pathway backups underneath.",
        items: (plan.options || []).slice(0, 5).map((item, index) => ({
          title: `${index + 1}. ${cleanDisplayText(item.name)}`,
          meta: [item.university, item.campus, item.atar ? `ATAR ${item.atar}` : ""].filter(Boolean).join(" - "),
          text: cleanDisplayText(item.reason || item.reasons)
        })).filter((item) => item.title.replace(/^\d+\.\s*/, ""))
      },
      {
        title: "Jobs and income",
        intro: "These are broad income-linked career directions from the Guide result, not guaranteed salaries.",
        items: (plan.jobs || []).slice(0, 5).map((item) => ({
          title: cleanDisplayText(item.title),
          meta: cleanDisplayText(item.range),
          text: cleanDisplayText(item.text || "Build projects, placements, internships or experience while studying.")
        })).filter((item) => item.title)
      },
      {
        title: "Personal next actions",
        intro: plan.timelineIntro || milestones.status.text,
        items: (plan.steps || []).slice(0, 6).map((item) => ({
          title: cleanDisplayText(item.title),
          meta: "Guide step",
          text: cleanDisplayText(item.text)
        })).filter((item) => item.title)
      }
    ];

    if (plan.dropAdvice?.name) {
      sections.splice(2, 0, {
        title: "Drop check",
        intro: "If you later need to reduce units, start here before dropping anything important.",
        items: [{
          title: cleanDisplayText(plan.dropAdvice.name),
          meta: "Possible Year 12 drop",
          text: cleanDisplayText(plan.dropAdvice.reason)
        }]
      });
    }

    return {
      source: "guide-result",
      status: {
        label: plan.profileLabel || milestones.status.label,
        text: statusText
      },
      sections: sections.filter((section) => section.items.length),
      linearStages: buildLinearMyPlanStages(state, plan, milestones),
      items: milestones.items
    };
  }

  function buildLinearMyPlanStages(state, plan, milestones) {
    const subjects = advancedSubjectAdvice(plan.subjectTargets || [], state);
    const subjectNames = subjects.slice(0, 6).map((item) => cleanDisplayText(item.name)).filter(Boolean);
    const subjectSummary = subjectNames.length
      ? `Start with ${subjectNames.join(", ")}. Confirm the exact school line choices and any UAC prerequisites before locking it in.`
      : "Start with English, one realistic maths level if useful, and two to four subjects that support the course or job direction.";
    const primary = plan.primary || {};
    const options = (plan.options || []).slice(0, 5);
    const jobs = (plan.jobs || []).slice(0, 5);
    const dropTitle = plan.dropAdvice?.name || subjects.find((item) => !/english/i.test(item.name))?.name || "Lowest-fit support subject";
    const dropText = plan.dropAdvice?.reason || "At the end of Year 11, compare marks, workload, prerequisites and motivation before dropping anything.";
    const jobTitles = jobs.length ? jobs.map((job) => cleanDisplayText(job.title)).filter(Boolean).join(", ") : "related entry-level roles";
    const topCourse = primary.name || options[0]?.name || "your target course";
    const uacItems = options.length ? options : [primary].filter((item) => item?.name);

    const projectedAtar = projectedAtarStageInfo(plan, primary);
    const subjectSelectionStage = {
      phase: "Year 10 subject selection",
      when: "Year 10",
      title: "Pick Year 11/12 subjects that keep the pathway open",
      summary: "Begin with subject selection, not university forms. Strong subject choices protect the later course plan.",
      items: [{
        title: "Recommended subject set",
        meta: subjectNames.length ? `${subjectNames.length} subjects` : "Build in Guide",
        text: subjectSummary
      }, ...subjects.slice(0, 6).map((item) => ({
        title: cleanDisplayText(item.name),
        meta: cleanDisplayText(item.badge || "subject"),
        text: [item.reason, item.target].map(cleanDisplayText).filter(Boolean).join(" ")
      }))]
    };
    const dropStage = {
      phase: state.year === "Year 10 or below" ? "End of Year 11 drop check" : "Subject drop",
      when: state.year === "Year 10 or below" ? "End of Year 11" : "Now / before finalising Year 12 pattern",
      title: state.year === "Year 12" ? "Check whether your subject pattern is still safe" : "Decide what to drop before Year 12",
      summary: "Drop only after checking English, prerequisites, assumed knowledge, units and marks.",
      items: [{
        title: dropTitle,
        meta: "First drop-check candidate",
        text: dropText
      }]
    };
    const projectedAtarStage = {
      phase: "Projected ATAR",
      when: state.year === "Year 10 or below" ? "Before finalising course aim" : "Now",
      title: "Check the projected ATAR before choosing the course ladder",
      summary: "This sits before the dream course so the plan stays realistic.",
      items: [{
        title: projectedAtar.label,
        meta: projectedAtar.source,
        text: projectedAtar.text
      }]
    };
    const dreamCourseStage = {
      phase: "Dream course",
      when: "Course target",
      title: "Aim for the dream course",
      summary: "Use the saved Guide recommendation as the main target, then keep backups around it.",
      items: [{
        kind: "course",
        id: primary.id || "",
        university: primary.university || "",
        campus: primary.campus || "",
        atar: primary.atar || "",
        title: topCourse,
        meta: [primary.university, primary.campus, primary.atar ? `ATAR ${primary.atar}` : ""].filter(Boolean).join(" - "),
        text: [plan.reach?.text, plan.atarTargetLabel, plan.atarMessage].map(cleanDisplayText).filter(Boolean).join(" ")
      }]
    };
    const uacStage = {
      phase: "UAC list",
      when: "UAC applications",
      title: "Build the UAC course list",
      summary: "Put dream options first, realistic options next, and pathway backups underneath.",
      items: uacItems.map((item, index) => ({
        kind: "course",
        id: item.id || "",
        university: item.university || "",
        campus: item.campus || "",
        atar: item.atar || "",
        title: `${index + 1}. ${cleanDisplayText(item.name)}`,
        meta: [item.university, item.campus, item.atar ? `ATAR ${item.atar}` : ""].filter(Boolean).join(" - "),
        text: cleanDisplayText(item.reason || "Use this as part of the dream, realistic and backup preference ladder.")
      }))
    };
    const jobsStage = {
      phase: "Jobs to apply to",
      when: "Uni years and after",
      title: "Turn the degree into work experience and job applications",
      summary: "The plan should end with employability, not just an offer letter.",
      items: [{
        kind: "jobs",
        title: jobTitles || "Related careers",
        meta: jobs[0]?.range || "Job-search stage",
        text: `Look for casual roles, internships, placements and graduate programs on SEEK, LinkedIn, GradConnection, Prosple, university career portals and employer career pages. Build projects or experience that prove the skills behind ${cleanDisplayText(plan.goalLabel || state.dreamJob || topCourse)}.`
      }]
    };

    return state.year === "Year 10 or below"
      ? [subjectSelectionStage, dropStage, projectedAtarStage, dreamCourseStage, uacStage, jobsStage]
      : [dropStage, projectedAtarStage, dreamCourseStage, uacStage, jobsStage];
  }

  function projectedAtarStageInfo(plan, primary) {
    const projected = plan.projectedAtar && typeof plan.projectedAtar === "object" ? plan.projectedAtar : null;
    const label = cleanDisplayText(projected?.label)
      || cleanDisplayText(plan.atarTargetLabel)
      || (primary?.atar ? `Target ${primary.atar}` : "No projected ATAR yet");
    const source = cleanDisplayText(projected?.source)
      || (projected?.label ? "Projected estimate" : "Planning target");
    const text = cleanDisplayText(projected?.text)
      || cleanDisplayText(plan.atarMessage)
      || "Add Year 11/12 marks in Guide to estimate reach before relying on this course ladder.";
    return { label, source, text };
  }

  function advancedSubjectAdvice(subjectTargets, state) {
    const strongSchool = ["Consistently strong", "Above average"].includes(state.schoolPerformance);
    const seen = new Set();
    return subjectTargets.map((item) => {
      const name = cleanDisplayText(item.name);
      let next = { ...item, name };
      if (strongSchool && /^English Standard$/i.test(name)) {
        next = {
          ...next,
          name: "English Advanced",
          badge: "advanced option",
          reason: "Because you have a strong school tracking signal, consider English Advanced if your teacher agrees it is realistic.",
          target: next.target || ""
        };
      }
      if (strongSchool && /^Mathematics Standard 2$/i.test(name)) {
        next = {
          ...next,
          name: "Mathematics Advanced",
          badge: "advanced option",
          reason: "Because you have a strong school tracking signal, consider Mathematics Advanced if it fits the course and your marks.",
          target: next.target || ""
        };
      }
      return next;
    }).filter((item) => {
      const key = normaliseText(item.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function cleanDisplayText(value) {
    return String(Array.isArray(value) ? value.join(" ") : value || "").replace(/\s+/g, " ").trim();
  }

  function year10Milestones() {
    return [
      {
        when: "Now",
        title: "Build the direction first",
        text: "Use Subject Helper or Guide to connect a career or degree idea to realistic Year 11/12 subjects.",
        impact: "Changes the subject shortlist, but does not lock the whole plan."
      },
      {
        when: "Term 3-4 Year 10",
        title: "School subject-selection window",
        text: "Most NSW schools run their own subject-selection evening, interview or online form around this period.",
        impact: "This directly affects Year 11 options. Confirm your exact school deadline."
      },
      {
        when: "Before Year 11 starts",
        title: "Check prerequisites and assumed knowledge",
        text: "Open UAC and university pages for the dream course and backup courses before finalising subjects.",
        impact: "Prerequisites can block entry; assumed knowledge usually affects readiness, not automatic entry."
      },
      {
        when: "Year 11 Term 3-4",
        title: "Review workload before Year 12",
        text: "Compare marks, workload and motivation before deciding whether to drop a Year 11 subject for Year 12.",
        impact: "Dropping the wrong subject can close pathways, so protect English and prerequisites first."
      },
      {
        when: "Year 12 application year",
        title: "Track UAC key dates",
        text: "UAC undergraduate applications usually open well before final exams, with offer rounds and preference deadlines later.",
        impact: "Application timing affects offers and fees, but preferences can usually be changed after applying."
      }
    ];
  }

  function year11Milestones() {
    return [
      {
        when: "Now",
        title: "Keep the Year 12 pattern safe",
        text: "Aim to carry enough units and the subjects that protect prerequisites, then use marks to decide what to keep.",
        impact: "Changing subjects now can affect Year 12 eligibility and assumed-knowledge readiness."
      },
      {
        when: "Term 3-4 Year 11",
        title: "Choose what to continue into Year 12",
        text: "Use the drop advice, school marks and teacher feedback before reducing units.",
        impact: "This changes the subject plan. Never drop English or a confirmed prerequisite."
      },
      {
        when: "30 Jun in the HSC year",
        title: "NESA HSC course-entry checkpoint",
        text: "Schools must enter students into HSC courses by the published NESA deadline in the HSC course year.",
        impact: "This affects official exam/course entry, so your school deadline may be earlier."
      },
      {
        when: "April-September Year 12",
        title: "Prepare UAC and early-entry applications",
        text: "Use Year 11 results, projects and preference planning before Year 12 exam pressure peaks.",
        impact: "Early-entry choices can create backups without replacing the main UAC preference plan."
      },
      {
        when: "After trials",
        title: "Rebuild the preference ladder",
        text: "Make dream, realistic and pathway bands based on your latest marks and course requirements.",
        impact: "This changes course order, not your underlying subject history."
      }
    ];
  }

  function year12Milestones() {
    return [
      {
        when: "Now",
        title: "Check your current plan",
        text: "Confirm prerequisites, assumed knowledge, ATAR target, course backups and early-entry options.",
        impact: "This may change UAC preferences, but it does not change your HSC subjects by itself."
      },
      {
        when: "11 Sep 2026",
        date: "2026-09-11",
        title: "Schools Recommendation Scheme closes",
        text: "UAC lists this as the 2026 SRS early-offer application close date for Year 12 students.",
        impact: "Missing it may remove one early-offer pathway, but normal UAC applications still continue."
      },
      {
        when: "30 Sep 2026",
        date: "2026-09-30",
        title: "UAC early-bird processing charge deadline",
        text: "Apply and pay by the early-bird deadline to avoid the higher standard processing charge.",
        impact: "This affects cost more than preference order; preferences can usually be changed later."
      },
      {
        when: "13 Oct 2026",
        date: "2026-10-13",
        title: "2026 HSC written exams begin",
        text: "Use your personalised NESA timetable for exact subject sessions.",
        impact: "This does not change course options directly, but it drives the final ATAR/result timeline."
      },
      {
        when: "16 Dec 2026",
        date: "2026-12-16",
        title: "HSC results release",
        text: "Use the released results and ATAR to adjust preferences before the main offer rounds.",
        impact: "This can change which preferences are realistic, stretch or pathway options."
      },
      {
        when: "5 Feb 2027",
        date: "2027-02-05",
        title: "Semester 1 final application deadline",
        text: "UAC lists this as the final application deadline for semester 1, 2027 undergraduate admissions.",
        impact: "Missing it can block semester-one application through UAC for that cycle."
      }
    ];
  }

  function milestoneStatus(dateValue, now) {
    if (!dateValue) return "check";
    const milestoneDate = new Date(`${dateValue}T23:59:59+11:00`);
    const currentDate = now instanceof Date ? now : new Date(now);
    if (Number.isNaN(milestoneDate.getTime()) || Number.isNaN(currentDate.getTime())) return "check";
    return milestoneDate < currentDate ? "past" : "upcoming";
  }

  function resolveAvailableSubject(name, available) {
    if (available.has(name)) return available.get(name);
    if (name === "mathematics advanced") {
      return available.get("mathematics extension 1") || available.get("mathematics extension 2");
    }
    if (name === "english advanced") {
      return available.get("english extension 1") || available.get("english extension 2");
    }
    return null;
  }

  function positiveUnits(value) {
    const units = Number(value);
    return Number.isFinite(units) && units > 0 ? units : 0;
  }

  function cleanRequirement(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function hardPrerequisiteOnly(text) {
    if (!hasSpecificRequirement(text)) return "";
    if (/assumed knowledge/i.test(text)) return "";
    return text;
  }

  function hasSpecificRequirement(value) {
    const text = normaliseText(value);
    if (!text) return false;
    return !(
      text === "not listed"
      || text === "not listed by uac"
      || text === "check official course page"
      || /read more about admission criteria/.test(text)
      || /refer to .*general admission criteria/.test(text)
      || /general admission criteria apply/.test(text)
      || /do not have an atar requirement/.test(text)
    );
  }

  function assumedKnowledgeFromPrerequisite(text) {
    if (!/assumed knowledge/i.test(text)) return "";
    return text.replace(/^.*?assumed knowledge\s*:?\s*/i, "");
  }

  function extractSubjects(text, subjectAliases) {
    const clean = normaliseText(text);
    if (!clean) return [];
    const found = [];
    for (const [name, aliases] of subjectAliases || []) {
      const options = [name, ...(aliases || [])].map(normaliseText).filter(Boolean);
      if (options.some((alias) => phraseInText(clean, alias))) found.push(name);
    }
    return [...new Set(found)];
  }

  function phraseInText(text, phrase) {
    if (!phrase) return false;
    return ` ${text} `.includes(` ${phrase} `);
  }

  function subjectRequirementSatisfied(required, selectedSubjects) {
    const requiredName = normaliseSubjectName(required);
    if (requiredName === "any english course") {
      return selectedSubjects.some((subject) => subject.english || subjectArea(subject) === "english");
    }
    return selectedSubjects.some((subject) => {
      const selectedName = normaliseSubjectName(subject.name);
      if (selectedName === requiredName) return true;
      if (requiredName === "mathematics advanced") {
        return ["mathematics extension 1", "mathematics extension 2"].includes(selectedName);
      }
      if (requiredName === "mathematics standard 2") {
        return ["mathematics advanced", "mathematics extension 1", "mathematics extension 2"].includes(selectedName);
      }
      if (requiredName === "english advanced") {
        return ["english extension 1", "english extension 2"].includes(selectedName);
      }
      return false;
    });
  }

  return {
    assessCourseSubjects,
    buildPlanMilestones,
    buildPersonalPlanView,
    buildYear10SubjectPlan,
    chooseDirectionProfile,
    choosePossibleDrop,
    createGuideState,
    detectPlanningIntent,
    evaluateSubjectPattern,
    isDirectionDeckComplete,
    mergeSubjectRecommendations,
    normaliseSubjectName,
    relatedCareerOutcomes,
    relatedDegreeNames,
    restoreGuideState,
    scoreDirectionDeck,
    selectCoursesForEligibility,
    serialiseGuideState,
    updateDirectionAnswer,
    subjectArea
  };
}));
