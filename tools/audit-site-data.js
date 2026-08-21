const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("uac-courses.js", "utf8");
const context = { window: {} };
vm.runInNewContext(source, context);

const courses = context.window.uacCourses || [];
const providers = context.window.uacProviders || [];
const meta = context.window.uacImportMeta || {};

const requiredFields = ["id", "name", "university", "campus", "courseCode", "uacUrl", "summary"];
const nonSydneyCampusWords = [
  "melbourne",
  "brisbane",
  "canberra",
  "adelaide",
  "perth",
  "darwin",
  "hobart",
  "gold coast",
  "newcastle",
  "wollongong",
  "lismore",
  "bathurst",
  "orange",
  "wagga"
];

const keywordChecks = [
  ["artificial intelligence", /artificial intelligence|information technology/i],
  ["medicine", /medicine|medical|biomedical|clinical/i],
  ["coding", /information technology|computer|software|cyber|data|artificial intelligence|game/i],
  ["cooking", /food|nutrition|hospitality|tourism/i],
  ["law", /law|legal|justice|criminology/i],
  ["psychology", /psychology|psychological|counselling|mental health/i],
  ["architecture", /architecture|built environment|construction|planning/i],
  ["sport", /sport|exercise|physical education/i],
  ["business", /business|commerce|finance|accounting|marketing|management/i]
];

const queryAliases = {
  cooking: ["cooking", "food", "nutrition", "culinary", "hospitality"],
  coding: ["coding", "programming", "software", "computer", "information technology"],
  sport: ["sport", "sports", "exercise", "fitness", "pdhpe"],
  architecture: ["architecture", "built environment", "construction", "planning"]
};

function clean(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function text(course) {
  return clean([
    course.name,
    course.area,
    course.summary,
    course.careers,
    course.assumed,
    course.prerequisites
  ].join(" "));
}

function scoreCourse(course, query) {
  const aliases = queryAliases[clean(query)] || [query];
  return aliases.reduce((best, item) => Math.max(best, scoreCourseTerm(course, item)), 0);
}

function scoreCourseTerm(course, query) {
  const cleanQuery = clean(query);
  const title = clean(course.name);
  const body = text(course);
  const words = cleanQuery.split(" ").filter(Boolean);
  let score = 0;
  if (title === cleanQuery) score += 1000;
  if (title.includes(cleanQuery)) score += 500;
  if (body.includes(cleanQuery)) score += 80;
  score += words.filter((word) => title.includes(word)).length * 80;
  score += words.filter((word) => body.includes(word)).length * 10;
  return score;
}

const ids = new Set();
const duplicateIds = [];
for (const course of courses) {
  if (ids.has(course.id)) duplicateIds.push(course.id);
  ids.add(course.id);
}

const missingFields = courses
  .filter((course) => requiredFields.some((field) => !String(course[field] || "").trim()))
  .map((course) => `${course.id}: ${requiredFields.filter((field) => !String(course[field] || "").trim()).join(", ")}`);

const suspiciousCampuses = courses.filter((course) => {
  const campus = clean(course.campus);
  return nonSydneyCampusWords.some((word) => campus.includes(word)) && !campus.includes("sydney") && !campus.includes("online");
});

const keywordFailures = keywordChecks.flatMap(([query, expected]) => {
  const top = [...courses]
    .map((course) => ({ course, score: scoreCourse(course, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return top.some(({ course }) => expected.test([course.name, course.area, course.summary, course.careers].join(" ")))
    ? []
    : [`${query}: top results did not match expected field`];
});

const failures = [
  courses.length ? "" : "No courses loaded",
  providers.length ? "" : "No providers loaded",
  duplicateIds.length ? `Duplicate ids: ${duplicateIds.slice(0, 5).join(", ")}` : "",
  missingFields.length ? `Missing required fields: ${missingFields.slice(0, 5).join(" | ")}` : "",
  suspiciousCampuses.length ? `Suspicious non-Sydney campuses: ${suspiciousCampuses.slice(0, 5).map((course) => `${course.name} at ${course.campus}`).join(" | ")}` : "",
  keywordFailures.length ? keywordFailures.join(" | ") : ""
].filter(Boolean);

console.log(JSON.stringify({
  courses: courses.length,
  providers: providers.length,
  importedAt: meta.importedAt || null,
  duplicateIds: duplicateIds.length,
  missingRequiredRows: missingFields.length,
  suspiciousCampuses: suspiciousCampuses.length,
  keywordChecks: keywordChecks.length,
  status: failures.length ? "fail" : "pass",
  failures
}, null, 2));

if (failures.length) process.exitCode = 1;
