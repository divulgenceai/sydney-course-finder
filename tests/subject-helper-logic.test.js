const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assessCourseSubjects,
  buildYear10SubjectPlan,
  chooseDirectionProfile,
  createGuideState,
  detectPlanningIntent,
  evaluateSubjectPattern,
  isDirectionDeckComplete,
  mergeSubjectRecommendations,
  relatedCareerOutcomes,
  relatedDegreeNames,
  restoreGuideState,
  selectCoursesForEligibility,
  serialiseGuideState,
  updateDirectionAnswer
} = require("../subject-helper-logic.js");

const aliases = [
  ["Any English course", ["any 2 units of english", "2 units of english", "any english"]],
  ["English Advanced", ["english advanced"]],
  ["Mathematics Advanced", ["mathematics advanced", "advanced mathematics"]],
  ["Physics", ["physics"]],
  ["Chemistry", ["chemistry"]]
];

const subject = (name, units, field, english = false) => ({
  name,
  units,
  field,
  english
});

const englishAdvanced = subject("English Advanced", 2, "English", true);
const mathematicsAdvanced = subject("Mathematics Advanced", 2, "Mathematics");
const physics = subject("Physics", 2, "Science");
const chemistry = subject("Chemistry", 2, "Science");
const economics = subject("Economics", 2, "Humanities and commerce");
const softwareEngineering = subject("Software Engineering", 2, "Other");

const intentProfiles = [
  {
    label: "Technology",
    keywords: ["software engineer", "developer", "computer science", "information technology"],
    careers: ["Software engineer", "Web developer"],
    degrees: ["Computer Science", "Information Technology"]
  },
  {
    label: "Medicine and Health",
    keywords: ["nurse", "nursing", "medicine", "doctor"],
    careers: ["Registered nurse", "Doctor"],
    degrees: ["Nursing", "Medicine"]
  }
];

const intentCourses = [
  {
    name: "Bachelor of Computer Science",
    careers: "Software developer, systems analyst",
    area: "Technology"
  },
  {
    name: "Bachelor of Nursing",
    careers: "Registered nurse",
    area: "Medicine and Health"
  }
];

test("detects an occupation phrase as a career", () => {
  const result = detectPlanningIntent({
    query: "software engineer",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "career");
  assert.equal(result.label, "Software engineer");
  assert.equal(result.profile, "Technology");
  assert.ok(result.confidence >= 0.8);
});

test("detects a degree title as a degree", () => {
  const result = detectPlanningIntent({
    query: "Bachelor of Nursing",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "degree");
  assert.equal(result.label, "Bachelor of Nursing");
  assert.equal(result.profile, "Medicine and Health");
});

test("returns both interpretations for an ambiguous area term", () => {
  const result = detectPlanningIntent({
    query: "medicine",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "ambiguous");
  assert.ok(result.alternatives.some((item) => item.kind === "career"));
  assert.ok(result.alternatives.some((item) => item.kind === "degree"));
});

test("returns none instead of random guidance for an unknown query", () => {
  const result = detectPlanningIntent({
    query: "zzqv unexplained thing",
    profiles: intentProfiles,
    courses: intentCourses
  });

  assert.equal(result.kind, "none");
  assert.equal(result.confidence, 0);
});

test("required subject evidence outranks preparation tiers", () => {
  const result = mergeSubjectRecommendations({
    profileSubjects: [
      { name: "Mathematics Advanced", tier: "priority", reason: "Useful preparation." },
      { name: "Physics", tier: "useful", reason: "Useful preparation." }
    ],
    evidence: [
      { name: "Mathematics Advanced", required: 3, assumed: 2 },
      { name: "Physics", required: 0, assumed: 4 }
    ]
  });

  assert.equal(result[0].name, "Mathematics Advanced");
  assert.equal(result[0].tier, "required");
  assert.equal(result[1].tier, "priority");
});

test("career queries return unique degree titles from matching courses", () => {
  const result = relatedDegreeNames([
    { course: { name: "Bachelor of Computer Science" } },
    { course: { name: "Bachelor of Computer Science" } },
    { course: { name: "Bachelor of Information Technology" } }
  ]);

  assert.deepEqual(result, [
    "Bachelor of Computer Science",
    "Bachelor of Information Technology"
  ]);
});

test("degree queries return unique careers with income ranges", () => {
  const result = relatedCareerOutcomes([
    {
      course: {
        careers: "Software developer, Systems analyst",
        incomeOutcomes: [
          { title: "Software developer", range: "$80k-$130k" },
          { title: "Systems analyst", range: "$85k-$125k" }
        ]
      }
    }
  ]);

  assert.deepEqual(result, [
    { title: "Software developer", range: "$80k-$130k" },
    { title: "Systems analyst", range: "$85k-$125k" }
  ]);
});

test("Guide accepts all three school-year modes", () => {
  for (const year of ["Year 10 or below", "Year 11", "Year 12"]) {
    const state = createGuideState({ year });
    assert.equal(state.year, year);
  }
});

test("changing one Guide answer preserves all other answers", () => {
  const initial = createGuideState({
    year: "Year 11",
    dreamJob: "Software engineer",
    passions: "coding",
    deckAnswers: ["a", "unsure"]
  });

  const updated = updateDirectionAnswer(initial, 1, "b");

  assert.equal(updated.year, "Year 11");
  assert.equal(updated.dreamJob, "Software engineer");
  assert.equal(updated.passions, "coding");
  assert.deepEqual(updated.deckAnswers, ["a", "b"]);
});

test("Guide progress serialises and restores safely", () => {
  const state = createGuideState({
    year: "Year 12",
    dreamCourse: "Computer Science",
    deckIndex: 4,
    deckAnswers: ["a", "b", "unsure", "a"],
    resultRequested: true
  });

  const restored = restoreGuideState(serialiseGuideState(state));

  assert.equal(restored.year, "Year 12");
  assert.equal(restored.dreamCourse, "Computer Science");
  assert.equal(restored.deckIndex, 4);
  assert.deepEqual(restored.deckAnswers, ["a", "b", "unsure", "a"]);
  assert.equal(restored.resultRequested, true);
});

test("invalid stored Guide data falls back to defaults", () => {
  const restored = restoreGuideState("{bad json");
  assert.equal(restored.year, "Year 10 or below");
  assert.deepEqual(restored.deckAnswers, []);
});

test("Year 12 is eligible with 10 units, English, three 2u courses and four subject areas", () => {
  const result = evaluateSubjectPattern({
    year: "Year 12",
    subjects: [englishAdvanced, mathematicsAdvanced, physics, economics, softwareEngineering]
  });

  assert.equal(result.status, "eligible");
  assert.equal(result.totalUnits, 10);
  assert.equal(result.englishUnits, 2);
  assert.equal(result.twoUnitCourseCount, 5);
  assert.equal(result.subjectAreaCount, 5);
  assert.deepEqual(result.failedRules, []);
});

test("Year 12 without English reports the English rule", () => {
  const result = evaluateSubjectPattern({
    year: "Year 12",
    subjects: [mathematicsAdvanced, physics, chemistry, economics, softwareEngineering]
  });

  assert.equal(result.status, "ineligible");
  assert.ok(result.failedRules.some((rule) => rule.id === "english"));
});

test("duplicate subjects do not inflate units", () => {
  const result = evaluateSubjectPattern({
    year: "Year 12",
    subjects: [englishAdvanced, englishAdvanced, mathematicsAdvanced, physics, economics]
  });

  assert.equal(result.totalUnits, 8);
  assert.equal(result.uniqueSubjects.length, 4);
  assert.ok(result.failedRules.some((rule) => rule.id === "units"));
});

test("Year 11 with six 2u subjects including English is on track", () => {
  const result = evaluateSubjectPattern({
    year: "Year 11",
    subjects: [englishAdvanced, mathematicsAdvanced, physics, chemistry, economics, softwareEngineering]
  });

  assert.equal(result.status, "on-track");
  assert.equal(result.totalUnits, 12);
  assert.deepEqual(result.failedRules, []);
});

test("exact course title search returns only matching title rows", () => {
  const matches = [
    { course: { name: "Bachelor of Computer Science", campus: "City" } },
    { course: { name: "Bachelor of Computer Science", campus: "Parramatta" } },
    { course: { name: "Bachelor of Information Technology", campus: "City" } }
  ];

  const selected = selectCoursesForEligibility("Bachelor of Computer Science", matches);

  assert.equal(selected.exact, true);
  assert.equal(selected.matches.length, 2);
  assert.ok(selected.matches.every((match) => match.course.name === "Bachelor of Computer Science"));
});

test("broad career search returns all displayed courses", () => {
  const matches = [
    { course: { name: "Bachelor of Computer Science" } },
    { course: { name: "Bachelor of Information Technology" } }
  ];

  const selected = selectCoursesForEligibility("software engineer", matches);

  assert.equal(selected.exact, false);
  assert.equal(selected.matches.length, 2);
});

test("missing prerequisite blocks a course", () => {
  const result = assessCourseSubjects({
    course: {
      prerequisites: "Mathematics Advanced",
      assumed: ""
    },
    selectedSubjects: [englishAdvanced, physics],
    subjectAliases: aliases
  });

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.missingRequired, ["Mathematics Advanced"]);
});

test("assumed knowledge warns but does not block", () => {
  const result = assessCourseSubjects({
    course: {
      prerequisites: "Not listed by UAC.",
      assumed: "Mathematics Advanced and Physics"
    },
    selectedSubjects: [englishAdvanced],
    subjectAliases: aliases
  });

  assert.equal(result.status, "open");
  assert.deepEqual(result.missingRequired, []);
  assert.deepEqual(result.missingAssumed, ["Mathematics Advanced", "Physics"]);
});

test("ambiguous prerequisite text requires an official check", () => {
  const result = assessCourseSubjects({
    course: {
      prerequisites: "Applicants must satisfy additional faculty admission requirements.",
      assumed: ""
    },
    selectedSubjects: [englishAdvanced],
    subjectAliases: aliases
  });

  assert.equal(result.status, "check");
});

test("direction deck stays locked before all 12 answers", () => {
  assert.equal(isDirectionDeckComplete(["a", "b", "unsure"], 12), false);
  assert.equal(isDirectionDeckComplete(new Array(12).fill("unsure"), 12), true);
});

test("explicit software goal outweighs people-oriented deck answers", () => {
  const result = chooseDirectionProfile({
    explicitProfile: "Technology",
    deckScores: {
      "Medicine and Health": 12,
      Education: 9,
      Technology: 1
    }
  });

  assert.equal(result, "Technology");
});

test("Year 10 subject plan contains six unique subjects and English", () => {
  const hscSubjects = [
    englishAdvanced,
    mathematicsAdvanced,
    physics,
    chemistry,
    economics,
    softwareEngineering,
    subject("Enterprise Computing", 2, "Other"),
    subject("Business Studies", 2, "Humanities and commerce")
  ];

  const plan = buildYear10SubjectPlan({
    profileSubjects: [
      "Mathematics Advanced",
      "Enterprise Computing",
      "Software Engineering",
      "English Advanced",
      "Physics",
      "Business Studies"
    ],
    requiredSubjects: [],
    hscSubjects
  });

  assert.equal(plan.subjects.length, 6);
  assert.equal(new Set(plan.subjects.map((item) => item.subject.name)).size, 6);
  assert.ok(plan.subjects.some((item) => item.subject.english));
  assert.ok(plan.subjects.reduce((sum, item) => sum + item.subject.units, 0) >= 12);
});

test("possible Year 12 drop keeps English, prerequisites and 10 units", () => {
  const hscSubjects = [
    englishAdvanced,
    mathematicsAdvanced,
    physics,
    chemistry,
    economics,
    softwareEngineering,
    subject("Business Studies", 2, "Humanities and commerce")
  ];

  const plan = buildYear10SubjectPlan({
    profileSubjects: [
      "Mathematics Advanced",
      "Physics",
      "Chemistry",
      "Software Engineering",
      "Economics",
      "Business Studies"
    ],
    requiredSubjects: ["Mathematics Advanced", "Physics"],
    hscSubjects
  });

  assert.ok(plan.possibleDrop);
  assert.notEqual(plan.possibleDrop.subject.name, "English Advanced");
  assert.notEqual(plan.possibleDrop.subject.name, "Mathematics Advanced");
  assert.notEqual(plan.possibleDrop.subject.name, "Physics");

  const remaining = plan.subjects
    .filter((item) => item.subject.name !== plan.possibleDrop.subject.name)
    .map((item) => item.subject);
  assert.equal(evaluateSubjectPattern({ year: "Year 12", subjects: remaining }).status, "eligible");
});

test("Year 10 core six do not let a 1-unit extension replace a full Year 11 course", () => {
  const hscSubjects = [
    englishAdvanced,
    mathematicsAdvanced,
    subject("Mathematics Extension 1", 1, "Mathematics"),
    physics,
    chemistry,
    economics,
    softwareEngineering,
    subject("Enterprise Computing", 2, "Other")
  ];

  const plan = buildYear10SubjectPlan({
    profileSubjects: [
      "Mathematics Advanced",
      "Enterprise Computing",
      "Software Engineering",
      "English Advanced",
      "Mathematics Extension 1",
      "Physics"
    ],
    requiredSubjects: [],
    hscSubjects
  });

  assert.equal(plan.subjects.length, 6);
  assert.equal(plan.subjects.reduce((sum, item) => sum + item.subject.units, 0), 12);
  assert.ok(!plan.subjects.some((item) => item.subject.name === "Mathematics Extension 1"));
});
