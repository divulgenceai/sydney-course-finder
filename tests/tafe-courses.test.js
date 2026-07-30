const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");
const vm = require("node:vm");

const {
  courseFromUrl,
  humaniseSlug,
  qualificationFromName,
  tafePathwayType
} = require("../tools/import-tafe-courses");

function loadTafeData() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync("tafe-courses.js", "utf8"), context);
  return context.window;
}

test("TAFE importer humanises qualification names and detects routes", () => {
  assert.equal(humaniseSlug("certificate-iv-in-information-technology"), "Certificate IV in Information Technology");
  assert.equal(qualificationFromName("Certificate III in Electrotechnology Electrician"), "Certificate III");
  assert.equal(tafePathwayType("electrotechnology", "Certificate III", "Certificate III in Electrotechnology Electrician"), "trade");
  assert.equal(tafePathwayType("study-and-career-pathways", "Certificate IV", "Certificate IV in Tertiary Preparation"), "university-preparation");

  const course = courseFromUrl("https://www.tafensw.edu.au/course-areas/information-and-communication-technology/courses/certificate-iv-in-information-technology--ICT40120-01");
  assert.equal(course.name, "Certificate IV in Information Technology");
  assert.equal(course.courseCode, "ICT40120-01");
  assert.equal(course.providerId, "TAFENSW");
  assert.equal(course.sourceType, "tafe");
  assert.equal(course.atar, "NA");
});

test("Generated TAFE catalogue has broad official coverage and stable identifiers", () => {
  const data = loadTafeData();
  const courses = data.tafeCourses || [];
  const providers = data.tafeProviders || [];
  const ids = new Set(courses.map((course) => course.id));

  assert.ok(courses.length >= 600, `expected at least 600 TAFE courses, found ${courses.length}`);
  assert.equal(ids.size, courses.length);
  assert.equal(providers.length, 1);
  assert.equal(providers[0].id, "TAFENSW");
  assert.ok(courses.every((course) => course.officialUrl.startsWith("https://www.tafensw.edu.au/course-areas/")));
  assert.ok(courses.every((course) => course.admissionProfileCode === "TAFE"));
  assert.ok(courses.every((course) => course.campus && course.summary && course.courseCode));

  for (const expected of [
    "Certificate III in Electrotechnology Electrician",
    "Certificate III in Commercial Cookery",
    "Certificate IV in Information Technology"
  ]) {
    assert.ok(courses.some((course) => course.name === expected), `missing ${expected}`);
  }
  assert.ok(courses.some((course) => /Tertiary Preparation/i.test(course.name) && course.isUniversityPathway));
});

test("Generated TAFE catalogue uses a compact mobile-friendly payload", () => {
  const source = fs.readFileSync("tafe-courses.js", "utf8");
  assert.match(source, /window\.tafeCourseFields=/);
  assert.match(source, /window\.tafeCourseRows=/);
  assert.match(source, /window\.tafeCourses=window\.tafeCourseRows\.map/);
  assert.ok(Buffer.byteLength(source) < 900_000, `expected compact payload under 900 KB, found ${Buffer.byteLength(source)} bytes`);
});
