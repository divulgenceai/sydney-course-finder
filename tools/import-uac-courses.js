const fs = require("node:fs/promises");
const path = require("node:path");

const API = "https://coursehub.uac.edu.au/backend";
const ROOT = path.resolve(__dirname, "..");
const LEVELS = ["undergraduate"];

const SYDNEY_POSTCODE_RANGES = [
  [2000, 2234],
  [2555, 2574],
  [2745, 2770]
];

const NON_SYDNEY_CAMPUS_WORDS = [
  "melbourne",
  "brisbane",
  "canberra",
  "adelaide",
  "perth",
  "darwin",
  "hobart",
  "gold coast",
  "newcastle",
  "wollongong campus",
  "batemans bay",
  "bega",
  "orange",
  "wagga",
  "bathurst",
  "port macquarie",
  "armidale",
  "lismore",
  "coffs harbour",
  "tweed",
  "albury",
  "dubbo",
  "goulburn"
];

const PROVIDER_SLUG_FIX = {
  AIEAD: "AIE",
  AIEAD_AD: "AIE",
  AIE: "AIEI",
  AVON: "AVU",
  EXLSI: "EXC",
  SPJGM: "SPJ",
  UND: "UNDA"
};

const UTS_COLLEGE_LOGO = "https://utscollege.edu.au/hubfs/raw_assets/uts-college-theme-new/1532/js_client_assets/assets/www_UTSInsearch-BlOn8dNI.svg";
const UTS_COLLEGE_DURATIONS = "8 months accelerated / 12 months standard";
const UTS_COLLEGE_ENTRY = "Check UTS College official entry requirements. Diploma entry, pace and articulation conditions vary by applicant background and destination UTS degree.";
const UTS_COLLEGE_FEES = "Check UTS College official program fees. Eligible domestic students may be able to use FEE-HELP; confirm current details with UTS College.";
const UTS_COLLEGE_PATHWAY_TEXT = "UTS College diploma pathway in central Sydney. Most diplomas are designed as first-year-equivalent study with the opportunity to progress to a related UTS degree after meeting progression requirements.";

const MANUAL_PATHWAY_COURSES = [
  {
    code: "UTSC-DIP-ANIM",
    name: "Diploma of Animation Production",
    area: "Animation, 2D production, 3D production, creative technology and screen production.",
    careers: "Animation assistant, junior animator, 3D artist, motion graphics assistant, digital content production roles, or pathway to related UTS animation and creative production study.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-animation-production"
  },
  {
    code: "UTSC-DIP-BUS",
    name: "Diploma of Business",
    area: "Accounting, economics, finance, marketing, management and business foundations.",
    careers: "Business analyst, marketing assistant, finance or accounting support roles, administration, operations, or pathway to a related UTS business degree.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-business"
  },
  {
    code: "UTSC-DIP-COMM",
    name: "Diploma of Communication",
    area: "Media, digital and social media, public communication, journalism, writing, culture and communication practice.",
    careers: "Communications assistant, media assistant, content producer, public relations support, digital marketing support, or pathway to related UTS communication study.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-communication"
  },
  {
    code: "UTSC-DIP-DESARCH",
    name: "Diploma of Design & Architecture",
    area: "Architecture, design, built environment, visual communication and creative design practice.",
    careers: "Design assistant, architecture pathway roles, visual communication support, built-environment study pathway, or pathway to related UTS design and architecture degrees.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-design-architecture"
  },
  {
    code: "UTSC-DIP-ENG",
    name: "Diploma of Engineering",
    area: "Engineering foundations, mathematics, physics, design, systems thinking and engineering practice.",
    careers: "Engineering pathway roles, technical assistant roles, project support, or pathway to a related UTS engineering degree after meeting progression requirements.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-engineering"
  },
  {
    code: "UTSC-DIP-IT",
    name: "Diploma of Information Technology",
    area: "Programming, databases, cyber security foundations, systems, web technologies and information technology practice.",
    careers: "Junior developer, IT support, systems support, web support, cyber or data pathway roles, or pathway to a related UTS information technology degree.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-information-technology"
  },
  {
    code: "UTSC-DIP-SCI",
    name: "Diploma of Science",
    area: "Science foundations, laboratory skills, mathematics, chemistry, biology, physics and analytical thinking.",
    careers: "Laboratory assistant, science support roles, environmental or health science pathway roles, or pathway to a related UTS science degree.",
    url: "https://utscollege.edu.au/programs/diplomas/diploma-of-science"
  }
].map((course) => ({
  id: `manual-${course.code}-SYD`,
  level: "undergraduate",
  courseCode: course.code,
  name: course.name,
  providerId: "UTSC",
  university: "UTS College",
  providerWebsite: "https://utscollege.edu.au/",
  providerLogo: UTS_COLLEGE_LOGO,
  campus: "UTS College Sydney campus",
  campusCode: "SYD",
  campusPostcode: "2000",
  area: course.area,
  courseLevel: "Diploma",
  atar: "Not listed by UAC.",
  atarYear: "",
  duration: UTS_COLLEGE_DURATIONS,
  modes: ["On campus", "Full-time"],
  intake: "Check official UTS College intake dates.",
  prerequisites: UTS_COLLEGE_ENTRY,
  assumed: "Not listed by UAC. Check the official UTS College course page for recommended preparation.",
  additionalCriteria: "Progression to UTS depends on successfully completing the diploma and meeting the stated progression requirements for the destination degree.",
  fees: UTS_COLLEGE_FEES,
  summary: `${UTS_COLLEGE_PATHWAY_TEXT} This entry is included from UTS College's official diploma pages because it is a Sydney pathway offering not exposed as a normal UAC course row.`,
  careers: course.careers,
  practicalExperience: "",
  uacUrl: course.url,
  officialUrl: course.url,
  sourceLabel: "UTS College",
  source: "UTS College official diploma pages, manually added 2026-06-17"
}));

function isSydneyPostcode(code) {
  const value = Number(String(code || "").replace(/^A/, ""));
  return SYDNEY_POSTCODE_RANGES.some(([start, end]) => value >= start && value <= end);
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, numberValue) => String.fromCodePoint(Number(numberValue)))
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDuration(duration = []) {
  if (!Array.isArray(duration) || duration.length === 0) return "Not listed";
  return duration
    .map((item) => {
      if (item === "eqp") return "equivalent part-time";
      const [amount, unit, mode] = item.split("_");
      const unitText = unit === "y" ? "year" : unit === "m" ? "month" : unit || "";
      const modeText = { f: "full-time", p: "part-time", d: "distance/online" }[mode] || mode || "";
      return `${amount} ${unitText}${amount === "1" ? "" : "s"} ${modeText}`.trim();
    })
    .join(" / ");
}

function formatModes(modes = []) {
  const labels = {
    on_campus: "On campus",
    full_time: "Full-time",
    part_time: "Part-time",
    online: "Online"
  };
  return modes.map((mode) => labels[mode] || mode).filter(Boolean);
}

function formatStarts(offerings = []) {
  const starts = [...new Set(offerings.map((offering) => offering.startDate).filter(Boolean))];
  return starts.length ? starts.join(", ") : "Not listed";
}

function logoUrl(providerId, providerLogo) {
  const id = providerId.replace("_AD", "");
  const slug = PROVIDER_SLUG_FIX[id] || id;
  if (slug) return `https://uac.edu.au/assets/images/Institution-logos/2025/${slug}_h.svg`;
  if (providerLogo) return `https://uac.edu.au${providerLogo}`;
  return "";
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function pool(items, limit, worker) {
  const output = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next++;
        output[index] = await worker(items[index], index);
      }
    })
  );
  return output;
}

function pickDetail(detail) {
  const content = detail?.contentJson || detail?.courseDoc?.marketingContent || {};
  const aboutDetails = content.aboutDetails || {};
  const secondary = content.secondaryAdmission || {};
  return {
    summary: stripHtml(content.aboutIntro || content.about || ""),
    areasOfStudy: stripHtml(aboutDetails.areasOfStudy || ""),
    careerOpportunities: stripHtml(aboutDetails.careerOpportunities || ""),
    practicalExperience: stripHtml(aboutDetails.practicalExperience || ""),
    prerequisites: stripHtml(secondary.prerequisites || secondary.additionalCriteria || content.allApplicants || ""),
    assumedKnowledge: stripHtml(secondary.assumedKnowledge || secondary.recommendedStudies || ""),
    additionalCriteria: stripHtml(secondary.additionalCriteria || ""),
    fees: stripHtml(detail?.course?.feesAndCharges || detail?.course?.feeNote || ""),
    officialUrl: content.furtherInfo?.useUrl ? content.furtherInfo.url : ""
  };
}

function isSydneyCourse(course, campusByKey) {
  const providerId = course.providerId.replace("_AD", "");
  const campus = campusByKey.get(`${providerId}-${course.campusCode}`) || campusByKey.get(`${course.providerId}-${course.campusCode}`);
  const location = course.campusLocation || campus?.campusLocationCode;
  const campusText = `${campus?.nameShort || ""} ${campus?.nameLong || ""}`.toLowerCase();
  if (NON_SYDNEY_CAMPUS_WORDS.some((word) => campusText.includes(word)) && !campusText.includes("sydney")) {
    return false;
  }
  return isSydneyPostcode(location) || campusText.includes("sydney") || campusText === "online online";
}

function cleanKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function numericRank(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function hasSpecificInfo(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && text !== "not listed" && text !== "not listed by uac." && text !== "check official course page.");
}

function duplicatePreferenceScore(course) {
  const rankScore = numericRank(course.atar) !== null ? 8 : hasSpecificInfo(course.atar) ? 4 : 0;
  const infoScore = [
    course.prerequisites,
    course.assumed,
    course.fees,
    course.careers,
    course.summary
  ].filter(hasSpecificInfo).length;
  return rankScore + infoScore;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function mergeTextValues(values) {
  const cleaned = uniqueValues(values).filter((value) => value !== "Not listed");
  return cleaned.length ? cleaned.join(", ") : "Not listed";
}

function collapseDuplicateCourses(courses) {
  const groups = new Map();
  for (const course of courses) {
    const key = [
      cleanKey(course.name),
      course.providerId,
      cleanKey(course.campus),
      cleanKey(course.courseCode)
    ].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(course);
  }

  return [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => duplicatePreferenceScore(b) - duplicatePreferenceScore(a));
    const primary = ordered[0];
    return {
      ...primary,
      modes: uniqueValues(group.flatMap((course) => course.modes || [])),
      intake: mergeTextValues(group.map((course) => course.intake)),
      dedupedCount: group.length
    };
  });
}

async function main() {
  const [campusResult, websites] = await Promise.all([
    getJson(`${API}/course-search/api/campus`),
    getJson("https://uac.edu.au/course-search/search/providerWebsites.json")
  ]);

  const campuses = Array.isArray(campusResult) ? campusResult : campusResult.value || [];
  const campusByKey = new Map(campuses.map((campus) => [`${campus.providerId}-${campus.campusCode}`, campus]));
  const imported = [];
  const detailJobs = [];
  const totals = {};

  for (const level of LEVELS) {
    const result = await getJson(`${API}/course-search/api/search/${level}?size=6000&page=1`);
    const all = result.results || [];
    const sydney = all.filter((course) => isSydneyCourse(course, campusByKey));
    totals[level] = { total: result.stats?.total || all.length, imported: sydney.length };
    console.log(`${level}: total=${totals[level].total}, imported=${sydney.length}`);
    imported.push(...sydney.map((course) => ({ ...course, importLevel: level })));
    for (const course of sydney) {
      if (course.courseUrl) detailJobs.push({ level, id: course.courseUrl });
    }
  }

  const uniqueJobs = [...new Map(detailJobs.map((job) => [`${job.level}:${job.id}`, job])).values()];
  console.log(`Unique detail pages: ${uniqueJobs.length}`);

  const details = new Map();
  await pool(uniqueJobs, 8, async (job, index) => {
    if (index % 150 === 0) console.log(`Fetching details ${index}/${uniqueJobs.length}`);
    try {
      const detail = await getJson(`${API}/course-search/api/details/${job.level}/course/${job.id}`);
      details.set(`${job.level}:${job.id}`, pickDetail(detail));
    } catch {
      details.set(`${job.level}:${job.id}`, {
        summary: "",
        areasOfStudy: "",
        careerOpportunities: "",
        practicalExperience: "",
        prerequisites: "",
        assumedKnowledge: "",
        additionalCriteria: "",
        fees: "",
        officialUrl: ""
      });
    }
  });

  const rawCourses = [
    ...imported.map((course) => {
      const providerId = course.providerId.replace("_AD", "");
      const campus = campusByKey.get(`${providerId}-${course.campusCode}`) || campusByKey.get(`${course.providerId}-${course.campusCode}`) || {};
      const detail = details.get(`${course.importLevel}:${course.courseUrl}`) || {};
      const profile = course.atarProfile?.AtarProfiles?.[0] || {};
      const lsr = profile.lsr || profile.lowestAtar || "";
      return {
        id: `${course.importLevel}-${course.courseCode}-${providerId}-${course.campusCode}`,
        level: course.importLevel,
        courseCode: course.courseCode,
        name: course.title,
        providerId,
        university: course.providerName,
        providerWebsite: websites[providerId] || websites[course.providerId] || "",
        providerLogo: logoUrl(providerId, course.providerLogo),
        campus: campus.nameLong || campus.nameShort || course.campusCode,
        campusCode: course.campusCode,
        campusPostcode: String(course.campusLocation || campus.campusLocationCode || "").replace(/^A/, ""),
        area: detail.areasOfStudy || "Not listed",
        courseLevel: course.courseLevel || "",
        atar: lsr,
        atarYear: profile.year || "",
        duration: formatDuration(course.duration),
        modes: formatModes(course.modeOfAttendance),
        intake: formatStarts(course.offerings),
        prerequisites: detail.prerequisites || "Not listed by UAC.",
        assumed: detail.assumedKnowledge || "Not listed by UAC.",
        additionalCriteria: detail.additionalCriteria || "",
        fees: detail.fees || "Not listed by UAC.",
        summary: detail.summary || "No summary provided by UAC.",
        careers: detail.careerOpportunities || "Not listed by UAC.",
        practicalExperience: detail.practicalExperience || "",
        uacUrl: `https://uac.edu.au/course-search/search/${course.importLevel}/course/${course.courseUrl}`,
        officialUrl: detail.officialUrl || websites[providerId] || "",
        source: `UAC Course Search ${course.importLevel} API, imported ${new Date().toISOString().slice(0, 10)}`
      };
    }),
    ...MANUAL_PATHWAY_COURSES
  ]
    .sort((a, b) => a.university.localeCompare(b.university) || a.name.localeCompare(b.name) || a.campus.localeCompare(b.campus));

  const courses = collapseDuplicateCourses(rawCourses)
    .sort((a, b) => a.university.localeCompare(b.university) || a.name.localeCompare(b.name) || a.campus.localeCompare(b.campus));

  const providers = [...new Map(courses.map((course) => [course.providerId, {
    id: course.providerId,
    name: course.university,
    website: course.providerWebsite,
    logo: course.providerLogo,
    courseCount: courses.filter((item) => item.providerId === course.providerId).length
  }])).values()].sort((a, b) => a.name.localeCompare(b.name));

  await fs.writeFile(
    path.join(ROOT, "uac-courses.js"),
    `window.uacCourses = ${JSON.stringify(courses, null, 2)};\nwindow.uacProviders = ${JSON.stringify(providers, null, 2)};\nwindow.uacImportMeta = ${JSON.stringify({
      importedAt: new Date().toISOString(),
      source: "https://uac.edu.au/course-search/search/find-a-course-undergraduate?search=",
      apiSource: "https://coursehub.uac.edu.au/backend/course-search/api/search/undergraduate",
      levels: totals,
      rawSydneyCourseVariants: rawCourses.length,
      manualPathwayRows: MANUAL_PATHWAY_COURSES.length,
      duplicateRowsRemoved: rawCourses.length - courses.length,
      sydneyCourseVariants: courses.length,
      uniqueProviders: providers.length
    }, null, 2)};\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
