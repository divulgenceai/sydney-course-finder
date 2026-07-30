const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "uac-courses.js");
const overridesPath = path.join(root, "course-data", "provider-admission-overrides.json");
const outputPath = path.join(root, "audits", "provider-admission-audit.json");
const suppressedCodes = new Set(["<5", "NO", "NR", "NP", "NS", "NN", "NC", ""]);

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(sourcePath, "utf8"), sandbox, { filename: sourcePath, timeout: 3000 });
const courses = sandbox.window.uacCourses || [];
const overrides = fs.existsSync(overridesPath)
  ? JSON.parse(fs.readFileSync(overridesPath, "utf8"))
  : { entries: [] };
const verifiedByCode = new Map();
for (const entry of overrides.entries || []) {
  for (const code of entry.courseCodes || []) verifiedByCode.set(String(code), entry);
}

const suppressed = courses.filter((course) => {
  const selection = String(course.selectionRank || course.atar || "").trim();
  const raw = String(course.lowestAtar || "").trim();
  return suppressedCodes.has(selection) || suppressedCodes.has(raw);
});
const verified = suppressed.filter((course) => verifiedByCode.has(String(course.courseCode)));
const unresolved = suppressed.filter((course) => !verifiedByCode.has(String(course.courseCode)));
const report = {
  generatedAt: new Date().toISOString(),
  importedCourses: courses.length,
  suppressedUacProfiles: suppressed.length,
  providerFiguresVerified: verified.length,
  providerFiguresStillToVerify: unresolved.length,
  rules: [
    "Provider-published figures never overwrite UAC lowest selection rank or UAC lowest raw ATAR.",
    "Only a figure with a course-specific official source and review date is promoted into the interface.",
    "Suppressed UAC data remains visibly labelled even when a provider figure is available."
  ],
  verified: verified.map((course) => {
    const entry = verifiedByCode.get(String(course.courseCode));
    return {
      id: course.id,
      courseCode: course.courseCode,
      course: course.name,
      provider: course.university,
      uacSelectionRank: course.selectionRank || course.atar || "",
      uacLowestAtar: course.lowestAtar || "",
      providerPublishedAtar: entry.providerPublishedAtar || "",
      providerPublishedSelectionRank: entry.providerPublishedSelectionRank || "",
      source: entry.providerFigureSourceUrl || "",
      checkedAt: entry.providerFigureCheckedAt || ""
    };
  }),
  unresolved: unresolved.map((course) => ({
    id: course.id,
    courseCode: course.courseCode,
    course: course.name,
    provider: course.university,
    officialUrl: course.officialUrl || "",
    uacSelectionRank: course.selectionRank || course.atar || "",
    uacLowestAtar: course.lowestAtar || ""
  }))
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Provider admission audit: ${verified.length} verified; ${unresolved.length} suppressed profiles still require provider verification.`);
