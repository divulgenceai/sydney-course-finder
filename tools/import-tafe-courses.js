const fs = require("node:fs");
const path = require("node:path");

const SITEMAP_URL = "https://www.tafensw.edu.au/sitemap.xml";
const OUTPUT_FILE = path.resolve(__dirname, "..", "tafe-courses.js");
const COURSE_URL_PATTERN = /<loc>(https:\/\/www\.tafensw\.edu\.au\/course-areas\/[^<]+\/courses\/[^<]+)<\/loc>/g;

const areaProfiles = {
  "aboriginal-cultural-programs": ["Aboriginal Cultural Programs", "Social Work and Community", "Aboriginal culture language community country"],
  "accounting-and-finance": ["Accounting and Finance", "Business", "accountant bookkeeping payroll finance tax"],
  "animal-care-and-horse-industry": ["Animal Care and Horse Industry", "Science", "animal care veterinary nursing vet nurse horse equine"],
  "art-and-design": ["Art and Design", "Creative Arts and Design", "artist graphic design illustration photography interior jewellery ceramics"],
  automotive: ["Automotive", "Engineering", "mechanic automotive vehicle motorcycle diesel panel beating"],
  "aviation-and-aircraft-maintenance": ["Aviation and Aircraft Maintenance", "Engineering", "aviation aircraft maintenance avionics pilot"],
  "building-and-construction-trades": ["Building and Construction Trades", "Architecture and Built Environment", "builder construction bricklaying painting tiling waterproofing"],
  "business-and-marketing": ["Business and Marketing", "Business", "business administration management marketing human resources project management"],
  "carpentry-joinery-and-furniture": ["Carpentry, Joinery and Furniture", "Architecture and Built Environment", "carpenter carpentry joinery cabinet maker furniture"],
  "civil-construction-and-surveying": ["Civil Construction and Surveying", "Engineering", "civil construction surveying excavation plant operator"],
  "community-and-youth-services": ["Community and Youth Services", "Social Work and Community", "community services youth work disability support case management"],
  "education-and-training": ["Education and Training", "Education", "teacher aide education support early childhood training assessment"],
  electrotechnology: ["Electrotechnology", "Engineering", "electrician electrical electrotechnology renewable energy refrigeration air conditioning"],
  engineering: ["Engineering", "Engineering", "engineering fabrication welding metal machining mechanical technical"],
  "environment-and-sustainability": ["Environment and Sustainability", "Science", "environment conservation sustainability natural resources"],
  farming: ["Farming and Primary Production", "Science", "agriculture farming livestock wool rural"],
  "farming-and-primary-production": ["Farming and Primary Production", "Science", "agriculture farming livestock wool rural"],
  fashion: ["Fashion", "Creative Arts and Design", "fashion design clothing textile patternmaking"],
  "food-and-hospitality": ["Food and Hospitality", "Food, Hospitality and Tourism", "chef cook cooking commercial cookery baking patisserie hospitality restaurant"],
  "foundation-skills-english-language-and-auslan": ["Foundation Skills, English Language and Auslan", "Education", "english language literacy numeracy auslan foundation skills"],
  "government-library-and-legal-services": ["Government, Library and Legal Services", "Law and Justice", "legal services library government public sector justice"],
  "hair-and-beauty": ["Hair and Beauty", "Creative Arts and Design", "hairdresser barber beauty therapy salon makeup nails"],
  healthcare: ["Healthcare", "Medicine and Health", "nursing enrolled nurse dental allied health pathology pharmacy health services"],
  horticulture: ["Horticulture", "Science", "horticulture landscaping parks gardens arboriculture nursery"],
  "information-and-communication-technology": ["Information and Communication Technology", "Technology", "information technology it cyber security networking programming software web data cloud games"],
  "laboratory-science": ["Laboratory Science", "Science", "laboratory technician pathology testing science"],
  maritime: ["Maritime", "Engineering", "maritime marine vessel boating deckhand"],
  "mining-and-resources": ["Mining and Resources", "Engineering", "mining resources drilling"],
  "music-and-production": ["Music and Production", "Creative Arts and Design", "music performance sound production live production"],
  "property-services": ["Property Services", "Business", "real estate property strata facilities"],
  "sales-and-retail": ["Sales and Retail", "Business", "retail sales customer service"],
  "screen-media-and-games": ["Screen, Media and Games", "Creative Arts and Design", "screen media film television animation games visual effects"],
  "sport-and-recreation": ["Sport and Recreation", "Sport and Exercise", "sport recreation fitness outdoor coaching"],
  "study-and-career-pathways": ["Study and Career Pathways", "Education", "tertiary preparation university entrance pathway career preparation hsc"],
  "tourism-and-events": ["Tourism and Events", "Food, Hospitality and Tourism", "tourism travel events guiding"],
  "trade-and-logistics": ["Trade and Logistics", "Business", "logistics warehousing supply chain transport forklift"],
  "transport-and-logistics": ["Transport and Logistics", "Business", "logistics warehousing supply chain transport forklift"]
};

const tradeAreas = new Set([
  "automotive",
  "aviation-and-aircraft-maintenance",
  "building-and-construction-trades",
  "carpentry-joinery-and-furniture",
  "civil-construction-and-surveying",
  "electrotechnology",
  "engineering",
  "hair-and-beauty",
  "horticulture",
  "maritime",
  "mining-and-resources",
  "trade-and-logistics",
  "transport-and-logistics"
]);

const lowerCaseWords = new Set(["a", "an", "and", "as", "at", "by", "for", "from", "in", "of", "on", "or", "the", "to", "with"]);
const acronymWords = new Map([
  ["ai", "AI"],
  ["aqf", "AQF"],
  ["auslan", "Auslan"],
  ["cad", "CAD"],
  ["cpr", "CPR"],
  ["eal", "EAL"],
  ["esol", "ESOL"],
  ["hsc", "HSC"],
  ["ict", "ICT"],
  ["ndis", "NDIS"],
  ["nsw", "NSW"],
  ["rsa", "RSA"],
  ["tafe", "TAFE"],
  ["tesol", "TESOL"],
  ["vet", "VET"],
  ["whs", "WHS"]
]);

function decodeXml(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function titleCaseWord(word, index) {
  const lower = word.toLowerCase();
  if (/^(?:i|ii|iii|iv|v|vi)$/.test(lower)) return lower.toUpperCase();
  if (/^\d+d$/.test(lower)) return lower.toUpperCase();
  if (acronymWords.has(lower)) return acronymWords.get(lower);
  if (index > 0 && lowerCaseWords.has(lower)) return lower;
  return lower.replace(/(^|['/])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

function humaniseSlug(value) {
  return decodeURIComponent(value)
    .replaceAll("-and-or-", " and/or ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(titleCaseWord)
    .join(" ");
}

function qualificationFromName(name) {
  const patterns = [
    "Graduate Diploma",
    "Graduate Certificate",
    "Undergraduate Certificate",
    "Advanced Diploma",
    "Associate Degree",
    "Bachelor",
    "Diploma",
    "Certificate IV",
    "Certificate III",
    "Certificate II",
    "Certificate I",
    "Statement of Attainment",
    "TAFE Statement",
    "Course"
  ];
  const match = patterns.find((label) => name.startsWith(label)) || "Other";
  return match === "TAFE Statement" ? "Statement of Attainment" : match;
}

function tafePathwayType(areaSlug, qualification, name) {
  const text = `${areaSlug} ${name}`.toLowerCase();
  if (/tertiary preparation|university preparation|foundation studies|career pathways/.test(text)
    || areaSlug === "study-and-career-pathways") {
    return "university-preparation";
  }
  if (["Diploma", "Advanced Diploma", "Associate Degree", "Bachelor"].includes(qualification)) {
    return "qualification-credit";
  }
  if (tradeAreas.has(areaSlug)) return "trade";
  return "job-ready";
}

function fundingChecks(qualification) {
  const checks = ["Smart and Skilled eligibility", "Current fee-free availability"];
  if (/^Certificate (?:I|II|III|IV)$/.test(qualification)) checks.push("Concession eligibility");
  if (["Diploma", "Advanced Diploma"].includes(qualification)) checks.push("VET Student Loan eligibility");
  return checks;
}

function courseFromUrl(url) {
  const match = decodeXml(url).match(/\/course-areas\/([^/]+)\/courses\/(.+)$/);
  if (!match) return null;
  const [, areaSlug, courseSlugWithCode] = match;
  const splitAt = courseSlugWithCode.lastIndexOf("--");
  if (splitAt < 0) return null;
  const nameSlug = courseSlugWithCode.slice(0, splitAt);
  const courseCode = decodeURIComponent(courseSlugWithCode.slice(splitAt + 2)).toUpperCase();
  const name = humaniseSlug(nameSlug);
  const [tafeArea, area, areaTerms] = areaProfiles[areaSlug] || [humaniseSlug(areaSlug), "Other", humaniseSlug(areaSlug)];
  const qualification = qualificationFromName(name);
  const pathwayType = tafePathwayType(areaSlug, qualification, name);
  const isTrade = pathwayType === "trade";
  const isUniversityPathway = pathwayType === "university-preparation" || pathwayType === "qualification-credit";
  const officialUrl = decodeXml(url);

  return {
    id: `tafe-${courseCode.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    level: "vocational",
    levels: ["vocational"],
    courseCode,
    name,
    providerId: "TAFENSW",
    providerLogo: "https://www.tafensw.edu.au/images/TAFE-logo.svg",
    university: "TAFE NSW",
    campus: "TAFE NSW locations and online options vary",
    campusCode: "TAFE",
    campusPostcode: "",
    area,
    tafeArea,
    courseLevel: qualification,
    qualification,
    sourceType: "tafe",
    providerType: "tafe",
    tafePathwayType: pathwayType,
    isTrade,
    isUniversityPathway,
    fundingChecks: fundingChecks(qualification),
    nationallyRecognised: /^(?:Certificate|Diploma|Advanced Diploma|Statement of Attainment)/.test(qualification),
    searchTerms: `${areaTerms} vocational training tafe nsw ${isTrade ? "trade apprenticeship traineeship" : ""} ${isUniversityPathway ? "pathway further study university credit" : ""}`.trim(),
    atar: "NA",
    selectionRank: "NA",
    lowestAtar: "NA",
    medianAtar: "NA",
    highestAtar: "NA",
    admissionProfileCode: "TAFE",
    admissionProfileSource: "TAFE NSW official course page",
    admissionProfileUrl: officialUrl,
    atarYear: new Date().getFullYear(),
    duration: "Varies by location and study option",
    modes: [],
    intake: "Varies by location and offering",
    prerequisites: "No ATAR is used. Entry requirements vary by course and delivery option; check the official TAFE NSW page.",
    assumed: "No HSC assumed knowledge is listed in this catalogue record.",
    additionalCriteria: isTrade
      ? "Some offerings may require an apprenticeship, traineeship, workplace access or other evidence. Check the current offering."
      : "Check the current offering for age, literacy, licence, portfolio, placement or prior-study requirements.",
    fees: `${fundingChecks(qualification).join(", ")} should be checked. Funding and fee-free places are not guaranteed.`,
    summary: `${name} is a TAFE NSW ${tafeArea.toLowerCase()} qualification. Delivery, duration, entry requirements and fees vary by location and intake.`,
    careers: `Skills and roles related to ${areaTerms}. Check the official course page for current career outcomes.`,
    practicalExperience: isTrade
      ? "Workplace, apprenticeship or traineeship arrangements may apply to some offerings."
      : "Practical training or work placement requirements vary by course.",
    uacUrl: officialUrl,
    officialUrl,
    source: "TAFE NSW official course catalogue",
    sourceLabel: "TAFE NSW",
    dedupedCount: 1
  };
}

function coursesFromSitemap(xml) {
  const seen = new Set();
  const courses = [];
  for (const match of xml.matchAll(COURSE_URL_PATTERN)) {
    const course = courseFromUrl(match[1]);
    if (!course || seen.has(course.id)) continue;
    seen.add(course.id);
    courses.push(course);
  }
  return courses.sort((left, right) =>
    left.tafeArea.localeCompare(right.tafeArea)
      || left.name.localeCompare(right.name)
      || left.courseCode.localeCompare(right.courseCode)
  );
}

function buildOutput(courses) {
  const importedAt = new Date().toISOString();
  const providers = [{
    id: "TAFENSW",
    name: "TAFE NSW",
    logo: "https://www.tafensw.edu.au/images/TAFE-logo.svg",
    summary: "NSW's public vocational education and training provider, with certificates, diplomas, trade training and study pathways.",
    website: "https://www.tafensw.edu.au/courses",
    providerType: "tafe"
  }];
  const meta = {
    importedAt,
    source: SITEMAP_URL,
    officialCoursePages: courses.length,
    uniqueProviders: providers.length,
    note: "Course names, codes, study areas and links come from the official TAFE NSW sitemap. Offering-specific delivery, duration, entry and fee details must be confirmed on TAFE NSW."
  };
  const fields = [
    "id",
    "courseCode",
    "name",
    "area",
    "tafeArea",
    "qualification",
    "tafePathwayType",
    "isTrade",
    "isUniversityPathway",
    "nationallyRecognised",
    "searchTerms",
    "careers",
    "officialUrl"
  ];
  const rows = courses.map((course) => fields.map((field) => course[field]));
  return [
    `window.tafeProviders=${JSON.stringify(providers)};`,
    `window.tafeCourseFields=${JSON.stringify(fields)};`,
    `window.tafeCourseRows=${JSON.stringify(rows)};`,
    "window.tafeCourses=window.tafeCourseRows.map(function(row){var value={};for(var i=0;i<window.tafeCourseFields.length;i+=1)value[window.tafeCourseFields[i]]=row[i];var checks=['Smart and Skilled eligibility','Current fee-free availability'];if(/^Certificate (?:I|II|III|IV)$/.test(value.qualification))checks.push('Concession eligibility');if(value.qualification==='Diploma'||value.qualification==='Advanced Diploma')checks.push('VET Student Loan eligibility');var url=value.officialUrl;return Object.assign(value,{level:'vocational',levels:['vocational'],providerId:'TAFENSW',providerLogo:'https://www.tafensw.edu.au/images/TAFE-logo.svg',university:'TAFE NSW',campus:'TAFE NSW locations and online options vary',campusCode:'TAFE',campusPostcode:'',courseLevel:value.qualification,sourceType:'tafe',providerType:'tafe',fundingChecks:checks,atar:'NA',selectionRank:'NA',lowestAtar:'NA',medianAtar:'NA',highestAtar:'NA',admissionProfileCode:'TAFE',admissionProfileSource:'TAFE NSW official course page',admissionProfileUrl:url,atarYear:new Date().getFullYear(),duration:'Varies by location and study option',modes:[],intake:'Varies by location and offering',prerequisites:'No ATAR is used. Entry requirements vary by course and delivery option; check the official TAFE NSW page.',assumed:'No HSC assumed knowledge is listed in this catalogue record.',additionalCriteria:value.isTrade?'Some offerings may require an apprenticeship, traineeship, workplace access or other evidence. Check the current offering.':'Check the current offering for age, literacy, licence, portfolio, placement or prior-study requirements.',fees:checks.join(', ')+' should be checked. Funding and fee-free places are not guaranteed.',summary:value.name+' is a TAFE NSW '+value.tafeArea.toLowerCase()+' qualification. Delivery, duration, entry requirements and fees vary by location and intake.',practicalExperience:value.isTrade?'Workplace, apprenticeship or traineeship arrangements may apply to some offerings.':'Practical training or work placement requirements vary by course.',uacUrl:url,source:'TAFE NSW official course catalogue',sourceLabel:'TAFE NSW',dedupedCount:1});});",
    `window.tafeImportMeta=${JSON.stringify(meta)};`,
    ""
  ].join("\n");
}

async function main() {
  const response = await fetch(SITEMAP_URL, { headers: { "user-agent": "SydneyCourseFinder/1.0 course catalogue importer" } });
  if (!response.ok) throw new Error(`TAFE NSW sitemap request failed: ${response.status}`);
  const xml = await response.text();
  const courses = coursesFromSitemap(xml);
  if (courses.length < 500) throw new Error(`Expected a broad TAFE NSW catalogue but found only ${courses.length} course pages`);
  fs.writeFileSync(OUTPUT_FILE, buildOutput(courses), "utf8");
  console.log(`Imported ${courses.length} official TAFE NSW course pages to ${OUTPUT_FILE}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  buildOutput,
  courseFromUrl,
  coursesFromSitemap,
  humaniseSlug,
  qualificationFromName,
  tafePathwayType
};
