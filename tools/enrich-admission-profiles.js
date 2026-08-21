const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const sourcePath = path.join(root, "uac-courses.js");
const apiUrl = "https://coursehub.uac.edu.au/backend/course-search/api/search/undergraduate?size=6000&page=1";

function loadCurrentData() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(sourcePath, "utf8"), sandbox, { filename: sourcePath });
  return {
    courses: sandbox.window.uacCourses || [],
    providers: sandbox.window.uacProviders || [],
    meta: sandbox.window.uacImportMeta || {}
  };
}

function profileMap(results) {
  const map = new Map();
  for (const course of results) {
    const providerId = String(course.providerId || "").replace("_AD", "");
    const profile = course.atarProfile?.AtarProfiles?.[0];
    if (!profile) continue;
    map.set(`${course.courseCode}-${providerId}-${course.campusCode}`, profile);
  }
  return map;
}

async function main() {
  const current = loadCurrentData();
  const response = await fetch(apiUrl, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`UAC admission-profile request failed: ${response.status}`);
  const payload = await response.json();
  const results = payload?.content || payload?.results || [];
  const profiles = profileMap(results);
  let matched = 0;

  const courses = current.courses.map((course) => {
    if (course.providerId === "UTSC") {
      return {
        ...course,
        atar: "PROVIDER",
        selectionRank: "HSC subject average / provider criteria",
        lowestAtar: "Not used",
        medianAtar: "",
        highestAtar: "",
        admissionProfileCode: "PROVIDER",
        admissionProfileSource: "UTS College",
        admissionProfileUrl: course.officialUrl || course.uacUrl
      };
    }

    const profile = profiles.get(`${course.courseCode}-${course.providerId}-${course.campusCode}`);
    if (!profile && course.providerId === "TUA") {
      return {
        ...course,
        atar: "PROVIDER",
        selectionRank: "Year 12 certificate / provider criteria",
        lowestAtar: "Not used",
        medianAtar: "",
        highestAtar: "",
        admissionProfileCode: "PROVIDER",
        admissionProfileSource: "Torrens University",
        admissionProfileUrl: course.officialUrl || course.uacUrl
      };
    }
    if (!profile) {
      return {
        ...course,
        selectionRank: course.selectionRank || "Not published",
        lowestAtar: course.lowestAtar || "Not published",
        admissionProfileCode: course.admissionProfileCode || "NP",
        admissionProfileSource: course.admissionProfileSource || course.university || "Official provider",
        admissionProfileUrl: course.admissionProfileUrl || course.officialUrl || course.uacUrl
      };
    }
    matched += 1;
    return {
      ...course,
      atar: profile.lsr || profile.lowestAtar || course.atar || "",
      selectionRank: profile.lsr || "",
      lowestAtar: profile.lowestAtar || "",
      medianAtar: profile.medianAtar || "",
      highestAtar: profile.highestAtar || "",
      admissionProfileCode: profile.atarProfileCode || "",
      admissionProfileSource: "UAC",
      admissionProfileUrl: course.uacUrl,
      atarYear: profile.year || course.atarYear || ""
    };
  });

  const meta = {
    ...current.meta,
    admissionProfilesUpdatedAt: new Date().toISOString(),
    admissionProfileSource: apiUrl,
    admissionProfilesMatched: matched
  };
  const output = [
    `window.uacCourses = ${JSON.stringify(courses, null, 2)};`,
    `window.uacProviders = ${JSON.stringify(current.providers, null, 2)};`,
    `window.uacImportMeta = ${JSON.stringify(meta, null, 2)};`,
    ""
  ].join("\n");
  fs.writeFileSync(sourcePath, output);
  console.log(`Added separate selection-rank and raw-ATAR data to ${matched} courses.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
