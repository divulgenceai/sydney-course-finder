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
