const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "uac-courses.js");
const outputPath = path.join(root, "uac-courses-lite.js");
const detailRoot = path.join(root, "course-data", "details");
const source = fs.readFileSync(sourcePath, "utf8");
const sandbox = { window: {} };

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });

const compactText = (value, limit) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || text.length <= limit) return text;
  return `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
};

const detailChunkName = (providerId) => {
  const raw = String(providerId || "unknown-provider");
  const readable = raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "provider";
  const suffix = crypto.createHash("sha1").update(raw).digest("hex").slice(0, 8);
  return `${readable}-${suffix}`;
};

const subjectSignalPatterns = [
  ["Any English course", /(?:any|at least)?\s*2\s*units?\s*(?:of|in)?\s*english|english/i],
  ["English Advanced", /english advanced/i],
  ["English Standard", /english standard/i],
  ["Mathematics Extension 1", /mathematics extension 1|maths extension 1/i],
  ["Mathematics Advanced", /mathematics advanced|advanced mathematics|maths advanced/i],
  ["Mathematics Standard 2", /mathematics standard 2|maths standard 2/i],
  ["Physics", /\bphysics\b/i],
  ["Chemistry", /\bchemistry\b/i],
  ["Biology", /\bbiology\b/i],
  ["Software Engineering", /software engineering/i],
  ["Engineering Studies", /engineering studies/i],
  ["Enterprise Computing", /enterprise computing/i],
  ["Business Studies", /business studies/i],
  ["Economics", /\beconomics\b/i],
  ["Legal Studies", /legal studies/i],
  ["Modern History", /modern history/i],
  ["Society and Culture", /society (?:and|&) culture/i],
  ["Visual Arts", /visual arts/i],
  ["Design and Technology", /design (?:and|&) technology/i],
  ["Health and Movement Science", /health and movement science|\bhms\b/i]
];

const entryFlagPatterns = [
  ["portfolio", /\bportfolio\b/i],
  ["interview", /\binterview\b/i],
  ["audition", /\baudition\b/i],
  ["test or assessment", /\btest\b|assessment|admission test/i],
  ["work experience", /work experience|employment experience/i],
  ["registration or accreditation rule", /registration|accreditation|english language proficiency/i]
];

const compactEntryRule = (value, kind) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const signals = subjectSignalPatterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  const flags = entryFlagPatterns.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
  const parts = [];
  if (signals.length) parts.push(`${kind === "assumed" ? "Assumed HSC subjects" : "HSC subject signals"}: ${signals.join(", ")}.`);
  if (kind !== "assumed" && flags.length) parts.push(`Other entry checks: ${flags.join(", ")}.`);
  if (!parts.length) parts.push(kind === "assumed" ? "Other assumed knowledge is listed." : "Other entry requirements are listed.");
  return parts.join(" ");
};

const providerOverridesPath = path.join(root, "course-data", "provider-admission-overrides.json");
const providerOverrides = fs.existsSync(providerOverridesPath)
  ? JSON.parse(fs.readFileSync(providerOverridesPath, "utf8"))
  : { entries: [] };
const providerOverrideByCourseCode = new Map();
for (const entry of providerOverrides.entries || []) {
  for (const courseCode of entry.courseCodes || []) {
    providerOverrideByCourseCode.set(String(courseCode), entry);
  }
}
const fullCourses = (sandbox.window.uacCourses || []).map((course) => {
  const override = providerOverrideByCourseCode.get(String(course.courseCode || ""));
  if (!override || (override.providerId && override.providerId !== course.providerId)) return course;
  const { courseCodes, providerId, ...admissionFields } = override;
  return { ...course, ...admissionFields };
});

const standardUacUrl = (course) => {
  const level = String(course.level || "");
  const code = String(course.courseCode || "");
  const expected = `https://uac.edu.au/course-search/search/${level}/course/${code}`;
  return String(course.uacUrl || "") === expected ? "" : course.uacUrl;
};

const courses = fullCourses.map((course) => ({
  id: course.id,
  level: course.level,
  courseCode: course.courseCode,
  name: course.name,
  providerId: course.providerId,
  campus: course.campus,
  campusCode: course.campusCode,
  campusPostcode: course.campusPostcode,
  area: compactText(course.area, 140),
  courseLevel: course.courseLevel,
  atar: course.atar,
  selectionRank: course.selectionRank,
  lowestAtar: course.lowestAtar,
  medianAtar: course.medianAtar,
  highestAtar: course.highestAtar,
  admissionProfileCode: course.admissionProfileCode,
  admissionProfileSource: course.admissionProfileSource,
  admissionProfileUrl: course.admissionProfileUrl,
  atarYear: course.atarYear,
  providerPublishedAtar: course.providerPublishedAtar,
  providerPublishedSelectionRank: course.providerPublishedSelectionRank,
  providerGuaranteedRank: course.providerGuaranteedRank,
  providerFigureLabel: course.providerFigureLabel,
  providerFigureYear: course.providerFigureYear,
  providerFigureSourceUrl: course.providerFigureSourceUrl,
  providerFigureSourceName: course.providerFigureSourceName,
  providerFigureCheckedAt: course.providerFigureCheckedAt,
  providerFigureNote: compactText(course.providerFigureNote, 260),
  duration: course.duration,
  modes: course.modes,
  intake: course.intake,
  prerequisites: compactEntryRule(course.prerequisites, "required"),
  assumed: compactEntryRule(course.assumed, "assumed"),
  additionalCriteria: course.additionalCriteria ? "Additional entry criteria are listed." : "",
  fees: course.fees ? "Fee information is listed." : "",
  summary: compactText(course.summary, 120),
  careers: compactText(course.careers, 150),
  practicalExperience: course.practicalExperience ? "Practical experience or placement information is listed." : "",
  uacUrl: standardUacUrl(course),
  officialUrl: course.officialUrl,
  dedupedCount: course.dedupedCount,
}));

const providers = (sandbox.window.uacProviders || []).map((provider) => ({
  ...provider,
  detailChunk: detailChunkName(provider.id)
}));
const meta = {
  ...(sandbox.window.uacImportMeta || {}),
  providerAdmissionOverridesReviewedAt: providerOverrides.reviewedAt || "",
  providerAdmissionOverrides: fullCourses.filter((course) =>
    course.providerPublishedAtar
    || course.providerPublishedSelectionRank
    || course.providerGuaranteedRank
  ).length
};
const courseFields = Object.keys(courses[0] || {});
const courseRows = courses.map((course) => courseFields.map((field) => course[field]));
const output = [
  `window.uacCourseFields=${JSON.stringify(courseFields)};`,
  `window.uacCourseRows=${JSON.stringify(courseRows)};`,
  `window.uacCourses=window.uacCourseRows.map((row)=>{const course={};for(let index=0;index<window.uacCourseFields.length;index+=1)course[window.uacCourseFields[index]]=row[index];return course;});`,
  `window.uacProviders=${JSON.stringify(providers)};`,
  `window.uacProviderMap=Object.fromEntries(window.uacProviders.map((provider)=>[provider.id,provider]));`,
  `window.uacCourses.forEach((course)=>{const provider=window.uacProviderMap[course.providerId]||{};course.university=provider.name||"";course.providerLogo=provider.logo||"";course.detailChunk=provider.detailChunk||"";course.uacUrl=course.uacUrl||\`https://uac.edu.au/course-search/search/\${course.level}/course/\${course.courseCode}\`;});`,
  `delete window.uacCourseFields;delete window.uacCourseRows;`,
  `window.uacImportMeta=${JSON.stringify(meta)};`,
  ""
].join("\n");

fs.writeFileSync(outputPath, output);
fs.mkdirSync(detailRoot, { recursive: true });
for (const entry of fs.readdirSync(detailRoot, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".json")) fs.unlinkSync(path.join(detailRoot, entry.name));
}

const chunks = new Map();
for (const course of fullCourses) {
  const chunk = detailChunkName(course.providerId);
  const list = chunks.get(chunk) || [];
  list.push(course);
  chunks.set(chunk, list);
}

let detailBytes = 0;
for (const [chunk, chunkCourses] of chunks) {
  const body = `${JSON.stringify({ version: 1, courses: chunkCourses })}\n`;
  fs.writeFileSync(path.join(detailRoot, `${chunk}.json`), body);
  detailBytes += Buffer.byteLength(body);
}
const sourceKb = Math.round(Buffer.byteLength(source) / 1024);
const outputKb = Math.round(Buffer.byteLength(output) / 1024);
const detailKb = Math.round(detailBytes / 1024);
console.log(`Built course index: ${sourceKb} KB -> ${outputKb} KB`);
console.log(`Preserved full details in ${chunks.size} lazy chunks (${detailKb} KB total)`);
