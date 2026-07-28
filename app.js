const app = document.querySelector("#app");
const importedCourses = window.uacCourses || [];
const dedupedImport = collapseDuplicateCourses(importedCourses);
const allCourses = dedupedImport.courses;
const duplicateCourseMap = dedupedImport.redirects;
const providerCourseCounts = allCourses.reduce((counts, course) => {
  counts.set(course.providerId, (counts.get(course.providerId) || 0) + 1);
  return counts;
}, new Map());
const allProviders = (window.uacProviders || []).map((provider) => ({
  ...provider,
  courseCount: providerCourseCounts.get(provider.id) || 0
}));
const meta = window.uacImportMeta || {};
const courseTextCache = new WeakMap();
const primaryCourseTextCache = new WeakMap();
const topicScoreCache = new WeakMap();
const searchFieldCache = new WeakMap();
const incomeOutcomeCache = new WeakMap();
const providerProfileCache = new Map();
const filteredCourseCache = { key: "", results: [] };
const searchQueryPlanCache = new Map();
let searchLexicon = null;
let searchLexiconWarmupScheduled = false;
let incomeWarmupIndex = 0;
let incomeWarmupScheduled = false;
let renderPass = 0;

const levelLabels = {
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  international: "International",
  online: "Online"
};

const subjectOptions = [
  "Mathematics Standard 2",
  "Mathematics Advanced",
  "Mathematics Extension 1",
  "English Advanced",
  "English Standard",
  "Physics",
  "Chemistry",
  "Biology",
  "Software Engineering",
  "Engineering Studies",
  "Business Studies",
  "Economics",
  "Legal Studies",
  "Design and Technology",
  "Visual Arts",
  "Health and Movement Science (HMS)",
  "Community and Family Studies",
  "Society and Culture",
  "Modern History"
];

const topicOptions = [
  { label: "All interests", keywords: [] },
  { label: "Technology", keywords: ["technology", "computer", "software", "cyber", "data", "information technology", "artificial intelligence", "game", "coding", "programming", "developer", "web", "app", "enterprise computing", "information systems"] },
  { label: "Medicine and Health", keywords: ["medicine", "medical", "health", "nursing", "clinical", "psychology", "nutrition", "physiotherapy", "pharmacy", "biomedical"] },
  { label: "Engineering", keywords: ["engineering", "civil", "mechanical", "electrical", "mechatronic", "construction", "robotics"] },
  { label: "Architecture and Built Environment", keywords: ["architecture", "architectural", "built environment", "construction", "property", "planning", "interior architecture", "landscape", "urban", "building"] },
  { label: "Business", keywords: ["business", "commerce", "finance", "accounting", "marketing", "management", "economics", "analytics"] },
  { label: "Food, Hospitality and Tourism", keywords: ["cooking", "cook", "chef", "culinary", "food", "baking", "nutrition", "hospitality", "tourism", "event management", "events", "hotel", "restaurant", "dietetics", "food science", "food technology", "food innovation"] },
  { label: "Law and Justice", keywords: ["law", "legal", "justice", "criminology", "policy"] },
  { label: "Creative Arts and Design", keywords: ["design", "creative", "animation", "music", "screen", "media", "arts", "visual", "game"] },
  { label: "Education", keywords: ["education", "teaching", "teacher", "early childhood", "primary", "secondary"] },
  { label: "Sport and Exercise", keywords: ["sport", "sports", "exercise", "fitness", "coaching", "hms", "health and movement science", "pdhpe", "health promotion", "physical education", "athlete"] },
  { label: "Social Work and Community", keywords: ["social work", "community", "counselling", "counseling", "human services", "youth", "welfare", "support work", "mental health"] },
  { label: "Science", keywords: ["science", "biology", "chemistry", "physics", "environment", "mathematics", "research"] }
];

const providerQuality = {
  Technology: {
    USYD: { score: 98, note: "Sydney's strongest 2026 QS computer science subject result" },
    UNSW: { score: 96, note: "Very strong computing, research and employer outcomes" },
    UTS: { score: 94, note: "Strong industry focus and a top Sydney computing profile" },
    MQ: { score: 82, note: "Good computing and analytics options" },
    WS: { score: 74, note: "Large Sydney course range and practical access" }
  },
  "Medicine and Health": {
    USYD: { score: 98, note: "Very high health and medicine reputation" },
    UNSW: { score: 96, note: "Strong medicine and biomedical reputation" },
    WS: { score: 87, note: "Major Western Sydney clinical and health presence" },
    UTS: { score: 84, note: "Strong nursing and health sciences options" },
    MQ: { score: 80, note: "Clinical science and health pathways" }
  },
  Engineering: {
    UNSW: { score: 98, note: "Top-tier engineering reputation and employment strength" },
    USYD: { score: 93, note: "High prestige and broad engineering strength" },
    UTS: { score: 88, note: "Practical and industry-linked engineering" },
    WS: { score: 76, note: "Accessible engineering pathways in Western Sydney" },
    MQ: { score: 72, note: "Relevant engineering and technology options" }
  },
  "Architecture and Built Environment": {
    UNSW: { score: 93, note: "Strong built environment and design reputation" },
    USYD: { score: 91, note: "High prestige architecture and planning pathways" },
    UTS: { score: 86, note: "Industry-linked built environment options" },
    WS: { score: 76, note: "Accessible construction and planning pathways" }
  },
  Business: {
    UNSW: { score: 97, note: "Very strong commerce and employment profile" },
    USYD: { score: 94, note: "High prestige business and economics reputation" },
    UTS: { score: 86, note: "Practical city-campus business options" },
    MQ: { score: 84, note: "Strong business, finance and analytics options" },
    ICMS: { score: 74, note: "Industry-focused management provider" }
  },
  "Food, Hospitality and Tourism": {
    WS: { score: 82, note: "Strong food science, tourism and applied industry options" },
    ACU: { score: 80, note: "Strong nutrition and food-health pathways" },
    ICMS: { score: 78, note: "Hospitality and tourism industry focus" },
    UTS: { score: 72, note: "City access for related business and events pathways" }
  },
  "Law and Justice": {
    USYD: { score: 98, note: "Highest prestige law pathway in Sydney" },
    UNSW: { score: 95, note: "Very strong law and social justice reputation" },
    UTS: { score: 86, note: "Practical city-campus law option" },
    MQ: { score: 83, note: "Established law program" },
    WS: { score: 75, note: "Broad law and criminology access" }
  },
  "Creative Arts and Design": {
    UNSW: { score: 91, note: "Strong art and design campus reputation" },
    UTS: { score: 88, note: "Strong design and creative technology profile" },
    NAS: { score: 86, note: "Specialist fine-art institution" },
    AIT: { score: 78, note: "Specialist interactive technology and animation" },
    JMC: { score: 76, note: "Specialist creative industries provider" }
  },
  Education: {
    USYD: { score: 94, note: "High prestige education pathway" },
    ACU: { score: 86, note: "Large education and teaching provider" },
    WS: { score: 82, note: "Strong access across Western Sydney" },
    UTS: { score: 76, note: "Relevant education-related pathways" }
  },
  "Sport and Exercise": {
    ACU: { score: 85, note: "Strong sport, exercise and health-linked options" },
    WS: { score: 80, note: "Broad sport and health options in Western Sydney" },
    ACPE: { score: 78, note: "Specialist physical education and sport provider" },
    UTS: { score: 74, note: "Relevant health and sport science pathways" }
  },
  "Social Work and Community": {
    ACU: { score: 86, note: "Strong social work, counselling and community pathways" },
    WS: { score: 84, note: "Major Western Sydney social work and community presence" },
    ACAP: { score: 78, note: "Specialist counselling and psychology provider" },
    USYD: { score: 78, note: "High prestige social science options" }
  },
  Science: {
    USYD: { score: 96, note: "High prestige and broad science strength" },
    UNSW: { score: 94, note: "Strong science and research reputation" },
    UTS: { score: 83, note: "Applied science and analytics pathways" },
    MQ: { score: 81, note: "Strong science and clinical science options" },
    WS: { score: 74, note: "Broad science access across Sydney" }
  }
};

const providerCurrentStanding = {
  UNSW: {
    score: 100,
    label: "QS 2027: #1 in Australia and #19 globally",
    shortLabel: "QS 2027 Australia #1",
    source: "https://www.topuniversities.com/qs-top-uni-wur"
  },
  USYD: {
    score: 94,
    label: "QS 2027: #28 globally",
    shortLabel: "QS 2027 world #28",
    source: "https://www.topuniversities.com/universities/university-sydney"
  }
};

const providerAliases = buildProviderAliasGroups([
  { id: "WS", label: "Western Sydney University", aliases: ["wsu", "western sydney university", "western sydney uni", "western sydney"] },
  { id: "UTS", label: "University of Technology Sydney", aliases: ["uts", "university of technology sydney", "uts university", "technology sydney"] },
  { id: "UTSC", label: "UTS College", aliases: ["uts college", "uts insearch", "insearch"] },
  { id: "UNSW", label: "UNSW", aliases: ["unsw", "university of new south wales", "new south wales uni"] },
  { id: "UNSWC", label: "UNSW College", aliases: ["unsw college", "unsw global"] },
  { id: "USYD", label: "University of Sydney", aliases: ["usyd", "sydney uni", "sydney university", "university of sydney"] },
  { id: "MQ", label: "Macquarie University", aliases: ["mq", "macquarie", "macquarie university"] },
  { id: "ACU", label: "Australian Catholic University", aliases: ["acu", "australian catholic university"] },
  { id: "SCU", label: "Southern Cross University", aliases: ["scu", "southern cross", "southern cross university"] },
  { id: "CQU", label: "CQUniversity", aliases: ["cqu", "cquniversity", "central queensland university"] },
  { id: "ICMS", label: "International College of Management, Sydney", aliases: ["icms", "international college of management"] },
  { id: "AIT", label: "Academy of Interactive Technology", aliases: ["ait", "academy of interactive technology"] }
]);

function buildProviderAliasGroups(curatedGroups) {
  const ignoredShortNames = new Set(["sydney", "australia", "university", "college", "technology sydney"]);
  const groups = new Map(curatedGroups.map((group) => [group.id, {
    ...group,
    aliases: [...group.aliases]
  }]));

  allProviders.forEach((provider) => {
    const name = String(provider.name || "").trim();
    const current = groups.get(provider.id) || { id: provider.id, label: name, aliases: [] };
    const shortened = name
      .replace(/^university of\s+/i, "")
      .replace(/\s+university(?:\s+college)?$/i, "")
      .trim();
    const localShortened = shortened.replace(/\s+australia$/i, "").trim();
    const generated = [
      name,
      name.replace(/\buniversity\b/gi, "uni"),
      provider.id.length >= 3 ? provider.id.toLowerCase() : "",
      shortened && !ignoredShortNames.has(cleanSearchText(shortened)) ? shortened : "",
      localShortened && !ignoredShortNames.has(cleanSearchText(localShortened)) ? localShortened : ""
    ];
    current.aliases = [...new Set([...current.aliases, ...generated]
      .map(cleanSearchText)
      .filter(Boolean))];
    groups.set(provider.id, current);
  });

  return [...groups.values()];
}

const rankCodeMeanings = {
  NC: "New course; no published selection-rank profile yet.",
  NO: "No offers were made on ATAR alone.",
  NR: "No reportable selection-rank profile.",
  NP: "Not provided by the institution.",
  NS: "No semester 1 offers.",
  NN: "Selection-rank profile unavailable.",
  "<5": "Fewer than five ATAR-based offers were made."
};

const glossary = {
  ATAR: "Australian Tertiary Admission Rank. A rank used for university admission.",
  "selection rank": "The rank used for offers. It may include ATAR adjustment factors.",
  prerequisites: "Requirements that must be met before entry.",
  "assumed knowledge": "Knowledge expected before starting the course.",
  CSP: "Commonwealth Supported Place. The government subsidises part of the course fee.",
  UAC: "Universities Admissions Centre, the NSW/ACT admissions and course-search service."
};

const searchAliases = {
  medicine: ["medicine", "medical", "doctor of medicine", "medical studies"],
  med: ["medicine", "medical", "health"],
  doctor: ["medicine", "medical", "doctor of medicine"],
  medical: ["medical", "medicine"],
  law: ["law", "laws", "legal"],
  laws: ["law", "laws", "legal"],
  ai: ["ai", "artificial intelligence"],
  "artificial intelligence": ["artificial intelligence", "ai", "machine learning"],
  it: ["it", "information technology"],
  coding: ["coding", "programming", "software", "computer", "information technology"],
  coder: ["coding", "programming", "software", "computer science"],
  developer: ["software", "programming", "computer science", "information technology"],
  programming: ["programming", "coding", "software", "computer", "information technology"],
  "computer science": ["computer science", "computing", "software", "information technology"],
  "software engineering": ["software engineering", "software", "computing", "computer science", "information technology"],
  "business analytics": ["business analytics", "business analysis", "data analytics", "information systems", "commerce"],
  "data analytics": ["data analytics", "data science", "statistics", "business analytics"],
  "primary education": ["education primary", "primary education", "primary teaching", "teaching"],
  "secondary education": ["education secondary", "secondary education", "secondary teaching", "teaching"],
  accounting: ["accounting", "accountancy", "commerce", "business"],
  computers: ["computer", "computing", "computer science", "information technology"],
  cybersecurity: ["cybersecurity", "cyber security", "cyber", "information security"],
  "cyber security": ["cybersecurity", "cyber security", "cyber", "information security"],
  "data science": ["data science", "data analytics", "analytics", "statistics"],
  "game development": ["game development", "games", "game design", "programming"],
  psychology: ["psychology", "psychological science", "counselling", "mental health"],
  counselling: ["counselling", "counseling", "psychology", "mental health"],
  architecture: ["architecture", "architectural", "built environment", "planning"],
  architect: ["architecture", "architectural", "built environment", "design"],
  construction: ["construction", "building", "built environment", "property"],
  engineer: ["engineering", "engineer", "civil", "mechanical", "electrical", "software"],
  sport: ["sport", "sports", "exercise", "fitness", "pdhpe"],
  exercise: ["exercise", "sport", "sports", "fitness", "pdhpe"],
  food: ["food", "nutrition", "culinary", "hospitality", "food science"],
  cooking: ["cooking", "food", "culinary", "nutrition", "hospitality"],
  hospitality: ["hospitality", "hotel", "tourism", "events"],
  tourism: ["tourism", "hospitality", "events", "travel"],
  teaching: ["teaching", "teacher", "education"],
  teacher: ["teaching", "teacher", "education"],
  nursing: ["nursing", "nurse", "health"],
  nurse: ["nursing", "nurse", "health"],
  police: ["policing", "police", "criminology", "justice", "public safety"],
  social: ["social work", "community", "human services", "welfare"],
  "social work": ["social work", "community", "human services", "welfare"]
};

const searchIntentAliases = [
  ["software developer", "software engineering"],
  ["software engineer", "software engineering"],
  ["web developer", "software engineering"],
  ["app developer", "software engineering"],
  ["business analyst", "business analytics"],
  ["data analyst", "data analytics"],
  ["primary school teacher", "primary education"],
  ["primary teacher", "primary education"],
  ["primary teaching", "primary education"],
  ["high school teacher", "secondary education"],
  ["secondary teacher", "secondary education"],
  ["secondary teaching", "secondary education"],
  ["medical doctor", "medicine"],
  ["police officer", "criminology"],
  ["physiotherapist", "physiotherapy"],
  ["accountant", "accounting"],
  ["solicitor", "law"],
  ["lawyer", "law"],
  ["architect", "architecture"],
  ["nurse", "nursing"],
  ["doctor", "medicine"],
  ["comp sci", "computer science"],
  ["computer sciences", "computer science"],
  ["compsci", "computer science"],
  ["cs", "computer science"],
  ["info tech", "information technology"],
  ["infotech", "information technology"],
  ["it", "information technology"],
  ["soft eng", "software engineering"],
  ["software dev", "software development"],
  ["data sci", "data science"],
  ["datasci", "data science"],
  ["cyber sec", "cybersecurity"],
  ["cybersec", "cybersecurity"],
  ["artificial intel", "artificial intelligence"],
  ["ai", "artificial intelligence"],
  ["psych", "psychology"],
  ["physio", "physiotherapy"],
  ["paramed", "paramedicine"],
  ["biomed", "biomedical science"],
  ["med sci", "medical science"],
  ["archi", "architecture"],
  ["biz", "business"]
];

const broadTopicQueries = new Set([
  "technology",
  "computer science",
  "information technology",
  "software engineering",
  "artificial intelligence",
  "coding",
  "programming",
  "data",
  "data science",
  "cyber",
  "cybersecurity",
  "engineering",
  "architecture",
  "construction",
  "business",
  "food",
  "hospitality",
  "tourism",
  "health",
  "medicine",
  "medical science",
  "biomedical science",
  "nursing",
  "psychology",
  "physiotherapy",
  "sport",
  "exercise",
  "law",
  "social work",
  "community",
  "creative arts",
  "design",
  "education",
  "science"
]);

const storageKeys = {
  saved: "sydneyCourseFinder.savedCourses",
  compare: "sydneyCourseFinder.compareCourses",
  separatedSavedCompare: "sydneyCourseFinder.separatedSavedCompareV1"
};

const pathwayLinks = [
  {
    title: "Educational Access Scheme",
    text: "For students whose education was affected by long-term disadvantage. It can increase selection rank for some courses.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes"
  },
  {
    title: "Schools Recommendation Scheme",
    text: "Early-offer pathway using criteria other than, or in addition to, ATAR.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes/how-to-apply"
  },
  {
    title: "Selection-rank adjustments",
    text: "Subject, equity, location or other adjustments may lift your selection rank for specific courses.",
    url: "https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/"
  },
  {
    title: "UAC course preferences",
    text: "Use preferences strategically: dream course first, then realistic related courses and pathways.",
    url: "https://www.uac.edu.au/future-applicants/how-to-apply-for-uni/selecting-your-course-preferences/"
  },
  {
    title: "UTS College",
    text: "Diploma pathway options into UTS, including IT, engineering, business, science, design and communication.",
    url: "https://www.uts.edu.au/for-students/admissions-entry/pathways/uts-college"
  },
  {
    title: "UNSW College",
    text: "Diploma pathway programs for students who do not receive direct entry into some UNSW degrees.",
    url: "https://www.unswcollege.edu.au/diplomas"
  },
  {
    title: "Western Sydney pathways",
    text: "Search The College and VET-to-university pathways into Western Sydney University degrees.",
    url: "https://www.westernsydney.edu.au/tertiary-education-pathways-and-partnerships/pathways-available"
  },
  {
    title: "TAFE NSW pathways",
    text: "Vocational study and credit-transfer pathways can lead into university study for eligible students.",
    url: "https://www.tafensw.edu.au/study/pathways"
  }
];

const incomeOptions = ["Any income", "$60k+", "$80k+", "$100k+", "$120k+"];
const incomeMinimums = {
  "Any income": 0,
  "$60k+": 60000,
  "$80k+": 80000,
  "$100k+": 100000,
  "$120k+": 120000
};
const courseTypeOptions = [
  "All course types",
  "Bachelor",
  "Double degree",
  "Honours",
  "Diploma",
  "Advanced Diploma",
  "Associate Degree",
  "Undergraduate Certificate",
  "Other"
];
const studyAreaOptions = ["All study areas", ...topicOptions.filter((topic) => topic.label !== "All interests").map((topic) => topic.label)];
const searchSortOptions = ["Relevance", "Closest campus", "Study area fit", "Lowest selection rank", "Highest selection rank", "Income potential"];
const durationOptions = ["Any duration", "1 year or less", "2 years", "3 years", "4 years or more"];
const prerequisiteOptions = ["Any prerequisite status", "No listed prerequisites", "Has subject prerequisites", "Has additional entry criteria"];
const pathwayFilterOptions = ["Any pathway status", "Pathway mentioned", "Direct degree results"];
const guaranteedEntryOptions = ["Any guaranteed-entry status", "Guaranteed entry mentioned", "No guaranteed rank published"];
const degreeStructureOptions = ["Any degree structure", "Single degrees", "Double degrees"];
const knownLocations = [
  { names: ["sydney", "sydney cbd", "cbd", "city", "2000"], lat: -33.8688, lng: 151.2093 },
  { names: ["ultimo", "broadway", "haymarket", "uts", "2007"], lat: -33.8832, lng: 151.2006 },
  { names: ["chippendale", "2008"], lat: -33.8875, lng: 151.2009 },
  { names: ["redfern", "2016"], lat: -33.8928, lng: 151.2041 },
  { names: ["waterloo", "zetland", "2017"], lat: -33.9037, lng: 151.2086 },
  { names: ["alexandria", "2015"], lat: -33.9022, lng: 151.2004 },
  { names: ["mascot", "2020"], lat: -33.9258, lng: 151.1934 },
  { names: ["botany", "2019"], lat: -33.9456, lng: 151.1966 },
  { names: ["surry hills", "2010"], lat: -33.8846, lng: 151.2124 },
  { names: ["darlinghurst", "2010 nas"], lat: -33.8790, lng: 151.2190 },
  { names: ["newtown", "2042"], lat: -33.8985, lng: 151.1770 },
  { names: ["marrickville", "2204"], lat: -33.9116, lng: 151.1556 },
  { names: ["leichhardt", "2040"], lat: -33.8844, lng: 151.1565 },
  { names: ["five dock", "2046"], lat: -33.8674, lng: 151.1297 },
  { names: ["burwood", "2134"], lat: -33.8774, lng: 151.1035 },
  { names: ["ashfield", "2131"], lat: -33.8883, lng: 151.1236 },
  { names: ["camperdown", "darlington", "university of sydney", "usyd", "2050"], lat: -33.8886, lng: 151.1873 },
  { names: ["kensington", "unsw", "nida", "2033"], lat: -33.9173, lng: 151.2313 },
  { names: ["randwick", "2031"], lat: -33.9166, lng: 151.2411 },
  { names: ["bondi junction", "2022"], lat: -33.8910, lng: 151.2488 },
  { names: ["bondi", "bondi beach", "2026"], lat: -33.8915, lng: 151.2767 },
  { names: ["coogee", "2034"], lat: -33.9205, lng: 151.2552 },
  { names: ["maroubra", "2035"], lat: -33.9465, lng: 151.2551 },
  { names: ["north sydney", "2060"], lat: -33.8399, lng: 151.2073 },
  { names: ["neutral bay", "2089"], lat: -33.8310, lng: 151.2195 },
  { names: ["mosman", "2088"], lat: -33.8282, lng: 151.2441 },
  { names: ["lane cove", "2066"], lat: -33.8150, lng: 151.1667 },
  { names: ["st leonards", "2065"], lat: -33.8230, lng: 151.1930 },
  { names: ["chatswood", "2067"], lat: -33.7969, lng: 151.1835 },
  { names: ["gordon", "2072"], lat: -33.7553, lng: 151.1511 },
  { names: ["pymble", "2073"], lat: -33.7444, lng: 151.1410 },
  { names: ["hornsby", "2077"], lat: -33.7032, lng: 151.0993 },
  { names: ["dee why", "2099"], lat: -33.7511, lng: 151.2889 },
  { names: ["brookvale", "2100"], lat: -33.7611, lng: 151.2740 },
  { names: ["strathfield", "2135"], lat: -33.8736, lng: 151.0947 },
  { names: ["epping", "2121"], lat: -33.7727, lng: 151.0818 },
  { names: ["eastwood", "2122"], lat: -33.7918, lng: 151.0805 },
  { names: ["ryde", "2112"], lat: -33.8136, lng: 151.1050 },
  { names: ["macquarie park", "macquarie", "north ryde", "mq", "2113"], lat: -33.7756, lng: 151.1127 },
  { names: ["manly", "2095"], lat: -33.7970, lng: 151.2888 },
  { names: ["the rocks", "2000 rocks"], lat: -33.8599, lng: 151.2090 },
  { names: ["sydney olympic park", "olympic park", "2127"], lat: -33.8487, lng: 151.0682 },
  { names: ["lidcombe", "2141"], lat: -33.8644, lng: 151.0432 },
  { names: ["auburn", "2144"], lat: -33.8493, lng: 151.0328 },
  { names: ["granville", "2142"], lat: -33.8348, lng: 151.0107 },
  { names: ["parramatta", "2150"], lat: -33.8136, lng: 151.0034 },
  { names: ["merrylands", "2160"], lat: -33.8362, lng: 150.9889 },
  { names: ["castle hill", "2154"], lat: -33.7312, lng: 151.0076 },
  { names: ["baulkham hills", "2153"], lat: -33.7588, lng: 150.9929 },
  { names: ["rouse hill", "2155"], lat: -33.6821, lng: 150.9154 },
  { names: ["bankstown", "2200"], lat: -33.9173, lng: 151.0359 },
  { names: ["canterbury", "2193"], lat: -33.9119, lng: 151.1181 },
  { names: ["lakemba", "2195"], lat: -33.9199, lng: 151.0764 },
  { names: ["fairfield", "2165"], lat: -33.8674, lng: 150.9561 },
  { names: ["cabramatta", "2166"], lat: -33.8958, lng: 150.9341 },
  { names: ["liverpool", "2170"], lat: -33.9209, lng: 150.9231 },
  { names: ["blacktown", "2148"], lat: -33.7710, lng: 150.9063 },
  { names: ["mount druitt", "mt druitt", "2770"], lat: -33.7666, lng: 150.8179 },
  { names: ["st marys", "saint marys", "2760"], lat: -33.7652, lng: 150.7740 },
  { names: ["campbelltown", "2560"], lat: -34.0667, lng: 150.8140 },
  { names: ["ingleburn", "2565"], lat: -34.0002, lng: 150.8670 },
  { names: ["narellan", "2567"], lat: -34.0433, lng: 150.7359 },
  { names: ["camden", "2570"], lat: -34.0545, lng: 150.6958 },
  { names: ["penrith", "2750"], lat: -33.7511, lng: 150.6942 },
  { names: ["windsor", "2756"], lat: -33.6167, lng: 150.8170 },
  { names: ["hawkesbury", "richmond", "2753"], lat: -33.5995, lng: 150.7534 }
].map((item) => ({
  ...item,
  cleanNames: item.names.map(cleanSearchText)
}));
const providerLocationHints = {
  UTS: "ultimo",
  UTSC: "haymarket",
  UNSW: "kensington",
  UNSWC: "kensington",
  USYD: "camperdown",
  MQ: "macquarie park",
  WS: "parramatta",
  ACU: "north sydney",
  ACPE: "sydney olympic park",
  AIT: "ultimo",
  AIM: "the rocks",
  NAS: "darlinghurst",
  NIDA: "kensington",
  JMC: "ultimo",
  ICMS: "manly",
  MIT: "sydney cbd",
  SAE: "chippendale",
  ACAP: "sydney cbd"
};

const jobIncomeProfiles = [
  { title: "Software developer", keywords: ["software", "programmer", "developer", "coding", "computer science", "information technology", "web developer", "application"], min: 80000, max: 130000, range: "$80k-$130k" },
  { title: "Cyber security analyst", keywords: ["cyber", "cybersecurity", "security analyst", "information security"], min: 90000, max: 145000, range: "$90k-$145k" },
  { title: "Data analyst / data scientist", keywords: ["data", "analytics", "statistics", "artificial intelligence", "machine learning", "business analytics"], min: 80000, max: 135000, range: "$80k-$135k" },
  { title: "Engineer", keywords: ["engineering", "engineer", "civil", "mechanical", "electrical", "mechatronic", "aerospace", "software engineering"], min: 85000, max: 140000, range: "$85k-$140k" },
  { title: "Construction manager", keywords: ["construction management", "construction manager", "building", "property development", "project management"], min: 90000, max: 155000, range: "$90k-$155k" },
  { title: "Registered nurse", keywords: ["nurse", "nursing", "registered nurse"], min: 75000, max: 110000, range: "$75k-$110k" },
  { title: "Medical practitioner", keywords: ["medicine", "doctor", "medical practitioner", "surgery", "clinical medicine"], min: 100000, max: 190000, range: "$100k-$190k+" },
  { title: "Pharmacist", keywords: ["pharmacy", "pharmacist"], min: 85000, max: 125000, range: "$85k-$125k" },
  { title: "Allied health professional", keywords: ["physiotherapy", "physiotherapist", "occupational therapy", "speech pathology", "chiropractic", "exercise physiology", "nutrition", "dietetics"], min: 75000, max: 115000, range: "$75k-$115k" },
  { title: "Psychologist / counsellor", keywords: ["psychology", "psychologist", "counsellor", "counselling", "mental health"], min: 75000, max: 120000, range: "$75k-$120k" },
  { title: "Teacher", keywords: ["teacher", "teaching", "education", "early childhood", "primary education", "secondary education"], min: 75000, max: 115000, range: "$75k-$115k" },
  { title: "Solicitor / legal professional", keywords: ["law", "laws", "solicitor", "legal", "barrister"], min: 80000, max: 155000, range: "$80k-$155k" },
  { title: "Accountant / finance analyst", keywords: ["accounting", "accountant", "finance", "financial", "economics", "actuarial", "banking"], min: 75000, max: 130000, range: "$75k-$130k" },
  { title: "Business / marketing manager", keywords: ["business", "commerce", "marketing", "management", "manager", "human resources", "entrepreneurship"], min: 75000, max: 140000, range: "$75k-$140k" },
  { title: "Architect / planner", keywords: ["architecture", "architect", "urban", "planning", "built environment", "landscape architecture"], min: 75000, max: 125000, range: "$75k-$125k" },
  { title: "UX / graphic designer", keywords: ["ux", "user experience", "graphic designer", "visual communication", "design", "digital media"], min: 70000, max: 115000, range: "$70k-$115k" },
  { title: "Animator / game designer", keywords: ["animation", "animator", "game", "games", "game designer", "interactive media", "vfx"], min: 60000, max: 105000, range: "$60k-$105k" },
  { title: "Social worker / community worker", keywords: ["social work", "social worker", "community", "human services", "welfare", "youth worker"], min: 70000, max: 105000, range: "$70k-$105k" },
  { title: "Policy / justice officer", keywords: ["criminology", "criminal justice", "justice", "policy", "public policy", "international studies"], min: 70000, max: 115000, range: "$70k-$115k" },
  { title: "Scientist / lab professional", keywords: ["science", "scientist", "laboratory", "biology", "chemistry", "physics", "biomedical", "environmental science"], min: 70000, max: 115000, range: "$70k-$115k" },
  { title: "Hospitality / tourism manager", keywords: ["hospitality", "tourism", "hotel", "event", "events", "restaurant", "culinary"], min: 60000, max: 100000, range: "$60k-$100k" },
  { title: "Sport / exercise professional", keywords: ["sport", "sports", "exercise", "fitness", "coaching", "health and movement science", "physical education"], min: 60000, max: 100000, range: "$60k-$100k" },
  { title: "Creative arts professional", keywords: ["music", "performing arts", "screen", "film", "creative arts", "fine art", "artist"], min: 55000, max: 100000, range: "$55k-$100k" }
];
const preparedJobIncomeProfiles = jobIncomeProfiles.map((profile) => ({
  ...profile,
  cleanTitle: cleanSearchText(profile.title),
  keywordMatchers: profile.keywords
    .map(cleanSearchText)
    .filter(Boolean)
    .map((keyword) => ({
      keyword,
      regex: keyword.includes(" ") ? null : new RegExp(`\\b${escapeRegExp(keyword)}\\b`)
    }))
}));

const askStarterPrompts = [
  "How do ATAR adjustment factors work?",
  "What if my ATAR is lower than the course?",
  "Can I get extra points for my subjects?",
  "Show me coding courses around 75 ATAR"
];

const advisorQuestions = [
  {
    key: "atar",
    label: "Approximate ATAR",
    type: "number",
    placeholder: "Example: 72"
  },
  {
    key: "subjects",
    label: "Best or favourite HSC subjects",
    type: "text",
    placeholder: "Example: Maths Advanced, Physics, Biology, Business Studies"
  },
  {
    key: "passions",
    label: "What topics are you naturally interested in?",
    type: "text",
    placeholder: "Example: coding, medicine, justice, design, business, sport"
  },
  {
    key: "strengths",
    label: "What are you good at?",
    type: "select",
    options: ["Problem solving", "Helping people", "Writing and arguing", "Creative work", "Leadership", "Hands-on practical work", "Research and detail"]
  },
  {
    key: "workStyle",
    label: "What kind of work sounds best?",
    type: "select",
    options: ["Office and projects", "Clinical or care work", "Court, policy or advocacy", "Creative studio work", "Teaching and mentoring", "Lab or field work", "Business and clients"]
  },
  {
    key: "careerPriority",
    label: "Most important outcome",
    type: "select",
    options: ["High employability", "High income potential", "Prestige", "Helping people", "Creative freedom", "Flexible pathway", "Lower ATAR risk"]
  },
  {
    key: "studyMode",
    label: "Preferred study mode",
    type: "select",
    options: ["Any mode", "On campus", "Online", "Full-time", "Part-time"]
  },
  {
    key: "campus",
    label: "Campus preference",
    type: "select",
    options: ["Any Sydney campus", "City / inner Sydney", "Western Sydney", "North Sydney / Macquarie", "Online"]
  },
  {
    key: "avoid",
    label: "Anything you want to avoid?",
    type: "text",
    placeholder: "Example: too much maths, long commute, science labs, public speaking"
  },
  {
    key: "pathways",
    label: "Are you open to pathways if direct entry is hard?",
    type: "select",
    options: ["Yes", "Maybe", "No"]
  }
];

const advisorDefaults = Object.fromEntries(advisorQuestions.map((question) => [question.key, ""]));

migrateLegacySavedCompareState();

const state = {
  draft: "",
  query: "",
  level: "All levels",
  courseType: "All course types",
  area: "All study areas",
  provider: "All providers",
  mode: "All modes",
  campus: "All campuses",
  income: "Any income",
  sort: "Relevance",
  locationQuery: "",
  estimatedAtar: "",
  duration: "Any duration",
  prerequisite: "Any prerequisite status",
  pathway: "Any pathway status",
  guaranteedEntry: "Any guaranteed-entry status",
  degreeStructure: "Any degree structure",
  advancedFiltersOpen: false,
  allowAtarStretch: false,
  visible: 24,
  atar: 75,
  matcherProvider: "All providers",
  matcherSubjects: [],
  matcherTopic: "All interests",
  matcherIncome: "Any income",
  matcherRun: false,
  providerTopic: "Technology",
  savedIds: readIdList(storageKeys.saved),
  compareIds: readIdList(storageKeys.compare),
  compareOnlyDifferences: false,
  openCourseIds: new Set(),
  compareMessage: "",
  processing: "",
  mobileFiltersOpen: false,
  askOpen: false,
  aiStatus: { checked: false, configured: false, connected: false, provider: "Gemini", model: "gemini-3.5-flash" },
  askMessages: [{
    role: "assistant",
    intro: true,
    text: "Checking whether Gemini is connected for real AI replies."
  }],
  advisor: { ...advisorDefaults, atar: "75", pathways: "Maybe" },
  advisorRun: false,
  advisorChat: []
};

const levels = ["All levels", ...Object.keys(levelLabels).filter((level) => allCourses.some((course) => course.level === level)).map((level) => levelLabels[level])];
const providers = [
  "All providers",
  ...allProviders
    .map((provider) => provider.name)
    .sort((a, b) => providerOptionLabel(a).localeCompare(providerOptionLabel(b)))
];
const rankedProviders = [...allProviders].sort((a, b) => providerOverallScore(b) - providerOverallScore(a) || a.name.localeCompare(b.name));
const courseById = new Map(allCourses.map((course) => [course.id, course]));
const duplicateRowsHidden = Number(meta.duplicateRowsRemoved ?? importedCourses.length - allCourses.length);
const showLevelFilter = levels.length > 2;
const modes = ["All modes", ...new Set(allCourses.flatMap((course) => course.modes || []))].sort((a, b) =>
  a.startsWith("All") ? -1 : b.startsWith("All") ? 1 : a.localeCompare(b)
);
const allCampuses = sortedCampusOptions(allCourses);

const infoSummary = {
  atar: allCourses.filter((course) => numericRank(course.atar) !== null).length,
  prerequisites: allCourses.filter((course) => hasSpecificInfo(course.prerequisites)).length,
  assumed: allCourses.filter((course) => hasSpecificInfo(course.assumed)).length,
  fees: allCourses.filter((course) => hasSpecificInfo(course.fees)).length
};

function sortedCampusOptions(courses) {
  return ["All campuses", ...new Set(courses.map((course) => course.campus).filter(Boolean))].sort((a, b) =>
    a.startsWith("All") ? -1 : b.startsWith("All") ? 1 : a.localeCompare(b)
  );
}

function campusOptionsForProvider(providerName = state.provider) {
  if (!providerName || providerName === "All providers") return allCampuses;
  return sortedCampusOptions(allCourses.filter((course) => course.university === providerName));
}

function syncCampusWithProvider() {
  if (campusOptionsForProvider(state.provider).includes(state.campus)) return;
  state.campus = "All campuses";
}

function render() {
  if (renderPass > 0) app.classList.add("is-state-update");
  syncCampusWithProvider();
  const results = filteredCourses();
  const searchActive = hasActiveCourseSearch();
  const campusOptions = campusOptionsForProvider(state.provider);
  const savedCourses = savedCourseList();
  const compareCourses = compareCourseList();
  app.innerHTML = `
    <a class="skip-link" href="#courses">Skip to course search</a>
    <header class="topbar">
      <a class="brand" href="#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="#courses" ${navCurrent("#courses")}>Courses</a>
        <a href="#providers" ${navCurrent("#providers")}>Universities</a>
        <a href="#tools" ${navCurrent("#tools")}>Tools</a>
        <a href="#saved" ${navCurrent("#saved")}>Saved${state.savedIds.length ? ` (${state.savedIds.length})` : ""}</a>
        <a href="#about" ${navCurrent("#about")}>About</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
    ${renderAppProgress()}

    <main id="main-content">
      <section class="hero course-finder-hero" aria-labelledby="page-title">
        <div class="hero-copy">
          <h1 id="page-title">Find the right Sydney university course</h1>
          <p>Compare entry requirements, pathways, course length, campuses, and study options across Sydney universities.</p>
          <div class="hero-actions">
            <a class="primary-action" href="#courses">Search courses</a>
            <a class="secondary-action" href="./atar-calculator">Estimate my ATAR</a>
          </div>
        </div>
        <div class="hero-trust" aria-label="Course data summary">
          <strong>${number(allCourses.length)} Sydney course options</strong>
          <span>From ${number(meta.uniqueProviders || allProviders.length)} universities and providers</span>
          <small>UAC import updated ${escapeHtml(formatImportDate())}</small>
        </div>
      </section>

      <section id="courses" class="panel course-search-panel" aria-labelledby="course-search-title">
        <div class="panel-head">
          <div>
            <h2 id="course-search-title">Search courses</h2>
            <p>Start with a course, career or university, then narrow the results. Filters work even when the search box is empty.</p>
          </div>
          <span class="result-count" role="status" aria-live="polite">${searchActive ? `${number(results.length)} results` : "Ready to search"}</span>
        </div>
        <form class="search-form" data-form="search">
          <label>
            <span class="sr-only">Course, career or university</span>
            ${icon("search")}
            <input name="search" type="search" autocomplete="off" value="${escapeHtml(state.draft)}" placeholder="Try computer science, nursing, UTS or law" />
          </label>
          <button type="submit">Search courses</button>
        </form>
        ${renderSearchInterpretation()}
        <button class="mobile-filter-toggle" type="button" data-action="toggle-course-filters" aria-expanded="${state.mobileFiltersOpen}">
          <span>${icon("filter")} Filters${activeCourseFilterCount() ? ` (${activeCourseFilterCount()})` : ""}</span>
          <strong>${searchActive ? `${number(results.length)} results` : "Choose filters"}</strong>
        </button>
        <button class="course-filter-scrim" type="button" data-action="close-course-filters" aria-label="Close filters" tabindex="${state.mobileFiltersOpen ? "0" : "-1"}"></button>
        <div class="course-filter-panel ${state.mobileFiltersOpen ? "is-open" : ""}" data-course-filter-panel>
          <div class="mobile-filter-head">
            <div>
              <strong>Filter courses</strong>
              <span>${activeCourseFilterCount()} active</span>
            </div>
            <button type="button" data-action="clear">Reset</button>
          </div>
          <div class="filters essential-filters">
            ${select("area", "Study area", studyAreaOptions, state.area)}
            ${numberControl("estimatedAtar", "Estimated ATAR", state.estimatedAtar, "Optional", 0, 99.95, 0.05)}
            ${select("provider", "Provider", providers, state.provider)}
            ${select("campus", "Campus", campusOptions, state.campus)}
            ${select("duration", "Course duration", durationOptions, state.duration)}
            ${select("mode", "Mode", modes, state.mode)}
          </div>
          <details class="advanced-filter-disclosure" ${state.advancedFiltersOpen ? "open" : ""}>
            <summary>Advanced filters <span>${advancedCourseFilterCount() ? `${advancedCourseFilterCount()} active` : "Optional"}</span></summary>
            <div class="filters advanced-filters">
              ${showLevelFilter ? select("level", "Study level", levels, state.level) : ""}
              ${select("courseType", "Course type", courseTypeOptions, state.courseType)}
              ${select("degreeStructure", "Degree structure", degreeStructureOptions, state.degreeStructure)}
              ${select("prerequisite", "Prerequisites", prerequisiteOptions, state.prerequisite)}
              ${select("pathway", "Pathways", pathwayFilterOptions, state.pathway)}
              ${select("guaranteedEntry", "Guaranteed entry", guaranteedEntryOptions, state.guaranteedEntry)}
              ${select("income", "Income goal", incomeOptions, state.income)}
              ${select("sort", "Sort by", searchSortOptions, state.sort)}
              ${textControl("locationQuery", "Distance from", state.locationQuery, "Sydney suburb or postcode")}
            </div>
            ${renderDistanceNote()}
          </details>
          <div class="filter-foot">
            <button class="clear-btn" type="button" data-action="clear">Reset all filters</button>
            <small>Admission figures are historical and may change each intake.</small>
          </div>
          <button class="mobile-filter-done" type="button" data-action="close-course-filters">Show ${number(results.length)} results</button>
        </div>
        <div class="search-trust-note">
          <strong>Read entry figures carefully.</strong>
          <span>A selection rank may include adjustments and is not always the same as an ATAR. Prerequisites and additional criteria can still affect admission.</span>
        </div>
        <div class="course-results-region">
          ${searchActive && results.length ? renderSearchFieldLeaders(results) : ""}
          <div class="course-list">
            ${renderProcessStrip("search", "Searching courses")}
            ${searchActive && results.length ? results.slice(0, state.visible).map((course, index) => renderCourse(course, "", index, true)).join("") : ""}
            ${searchActive && !results.length ? renderNoResults() : ""}
            ${!searchActive ? renderCourseSearchStart() : ""}
            ${results.length > state.visible ? `<button class="load-more" type="button" data-action="more">Show more</button>` : ""}
          </div>
        </div>
      </section>

      <section id="saved" class="panel saved-panel">
        <div class="panel-head">
          <div>
            <h2>Your course library</h2>
            <p>Saving and comparing are separate. Save courses to keep them; compare up to three without changing your saved list.</p>
          </div>
          <div class="library-state-counts" aria-label="${number(savedCourses.length)} saved and ${number(compareCourses.length)} comparing">
            <span><strong>${number(savedCourses.length)}</strong> saved</span>
            <span><strong>${number(compareCourses.length)}</strong> comparing</span>
          </div>
        </div>
        ${renderCompareLibrary(compareCourses)}
        <div class="saved-library-head">
          <div>
            <h3>Saved courses</h3>
            <p>These are courses you chose to keep. Removing one here will not remove it from comparison.</p>
          </div>
          ${savedCourses.length ? `<button class="clear-btn" type="button" data-action="clear-saved">Clear saved</button>` : ""}
        </div>
        <div class="course-list compact saved-course-list">
          ${savedCourses.length ? savedCourses.map((course, index) => renderCourse(course, "", index)).join("") : renderSavedEmpty()}
        </div>
      </section>

      <section id="providers" class="panel">
        <div class="panel-head">
          <div>
            <h2>Universities</h2>
            <p>Browse Sydney universities and providers, with an overall site profile and a separate score for the area each provider is strongest in.</p>
          </div>
          <span>${allProviders.length} providers</span>
        </div>
        ${renderProviderScoreExplainer()}
        ${renderTopProviderBlock()}
        <div class="provider-grid">${rankedProviders.map(renderProvider).join("")}</div>
      </section>

      <section id="tools" class="panel tools-panel">
        <div class="panel-head">
          <div>
            <h2>Planning tools</h2>
            <p>Use these only when they support the course decision you are making.</p>
          </div>
        </div>
        <div class="tool-link-list">
          ${renderToolLink("./guide", "Build my guide", "Create a personalised subject-to-course plan.")}
          ${window.courseFinderTheme?.hasGuidePlanSnapshot?.() ? renderToolLink("./my-plan", "My saved plan", "Continue the personalised plan created in Guide.") : ""}
          ${renderToolLink("./atar-calculator", "ATAR calculator", "Estimate a possible ATAR from your HSC subjects and marks.")}
          ${renderToolLink("./subject-helper", "Subject helper", "Find useful Year 11 and 12 subjects for a degree or career.")}
          ${renderToolLink("./pathways", "Alternative pathways", "Explore TAFE, diploma, foundation and non-ATAR routes.")}
          ${renderToolLink("./advisor", "How to choose a course", "Work through interests, entry options, commute and career fit.")}
        </div>
      </section>

      <section id="about" class="panel about-panel">
        <div class="panel-head">
          <div>
            <h2>About the data</h2>
            <p>This tool organises imported UAC course records for comparison. It does not make admission decisions.</p>
          </div>
        </div>
        <div class="trust-grid">
          <div><strong>Data year</strong><span>Each result shows its published rank year and the date this site imported the record.</span></div>
          <div><strong>Correct terminology</strong><span>Selection rank, ATAR, prerequisites and additional criteria are shown separately wherever the data allows.</span></div>
          <div><strong>Official confirmation</strong><span>Every result links to UAC or the provider. Previous entry results never guarantee a future offer.</span></div>
        </div>
      </section>
    </main>
    ${renderCompareTray(compareCourses)}
    <footer class="site-footer" id="faq">
      <div>
        <strong>Sydney Course Finder</strong>
        <p>Planning support only. Confirm current admission criteria, fees, CSP status and offer rules with UAC and the university.</p>
      </div>
      <details class="footer-faq">
        <summary>Frequently asked questions</summary>
        <div class="faq-list">${renderFaq()}</div>
      </details>
      <nav aria-label="Footer">
        <a href="#courses">Courses</a>
        <a href="#about">About the data</a>
        <a href="${escapeHtml(meta.source || "https://www.uac.edu.au/course-search/")}">UAC source</a>
      </nav>
    </footer>
  `;
  bindEvents();
  window.courseFinderTheme?.bind?.(app);
  renderPass += 1;
}

function formatImportDate() {
  const value = String(meta.importedAt || "");
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function renderToolLink(href, title, text) {
  return `
    <a class="tool-link" href="${escapeHtml(href)}">
      <span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(text)}</small></span>
      <span aria-hidden="true">→</span>
    </a>
  `;
}

function renderCourseSearchStart() {
  return `
    <div class="course-search-start">
      <strong>Start with what matters most</strong>
      <p>Search a degree, career or university—or choose filters such as study area, campus and estimated ATAR.</p>
      <div>
        <button type="button" data-search-example="computer science">Computer science</button>
        <button type="button" data-search-example="nursing">Nursing</button>
        <button type="button" data-search-example="law">Law</button>
        <button type="button" data-search-example="UTS">UTS</button>
      </div>
    </div>
  `;
}

function renderNoResults() {
  return `
    <div class="course-empty-state" role="status">
      <strong>No exact matches yet</strong>
      <p>Keep your goal and loosen one constraint, or explore a realistic alternative.</p>
      <div class="empty-actions">
        <button type="button" data-action="relax-filter">Remove one filter</button>
        <button type="button" data-action="show-atar-stretch">Show courses slightly above my ATAR</button>
        <button type="button" data-action="show-pathways">View pathway courses</button>
        <button type="button" data-action="browse-study-areas">Browse all study areas</button>
        <button type="button" data-action="clear">Reset all filters</button>
      </div>
    </div>
  `;
}

function renderCompareTray(compareCourses) {
  if (!compareCourses.length || window.location.hash === "#saved") return "";
  return `
    <aside class="compare-tray" aria-label="Courses being compared">
      <div>
        <strong>${compareCourses.length} of 3 comparing</strong>
        <span>${compareCourses.map((course) => escapeHtml(shortCourseName(course.name))).join(" · ")}</span>
      </div>
      <div class="compare-tray-actions">
        ${compareCourses.map((course) => `<button type="button" data-remove-compare="${escapeHtml(course.id)}" aria-label="Remove ${escapeHtml(course.name)} from comparison">×</button>`).join("")}
        <a href="#saved">Compare ${compareCourses.length}</a>
      </div>
      <p class="sr-only" aria-live="polite">${escapeHtml(state.compareMessage)}</p>
    </aside>
  `;
}

function shortCourseName(value) {
  const text = decodeHtmlEntities(value || "").replace(/^Bachelor of /i, "").trim();
  return truncateText(text, 34);
}

function navCurrent(targetHash) {
  const hash = window.location.hash || "#courses";
  return hash === targetHash ? 'aria-current="page"' : "";
}

function renderAppProgress() {
  if (!state.processing) return "";
  return `<div class="app-progress is-active" aria-hidden="true"><div class="app-progress-track"></div></div>`;
}

function renderProcessStrip(key, label) {
  if (state.processing !== key) return "";
  return `
    <div class="process-strip" role="status" aria-live="polite">
      <span>${escapeHtml(label)}</span>
      <span class="process-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  `;
}

function runProcessing(key, action, after = null) {
  const x = window.scrollX;
  const y = window.scrollY;
  const commit = () => {
    action();
    state.processing = "";
    render();
  };
  const restore = () => {
    window.scrollTo(x, y);
    if (after) after();
  };

  if (key === "search" && !prefersReducedMotion() && typeof document.startViewTransition === "function") {
    app.classList.add("is-results-updating");
    document.documentElement.classList.add("is-course-results-transition");
    const transition = document.startViewTransition(commit);
    transition.updateCallbackDone.then(
      () => requestAnimationFrame(restore),
      () => requestAnimationFrame(restore)
    );
    const cleanUpTransition = () => {
      app.classList.remove("is-results-updating");
      document.documentElement.classList.remove("is-course-results-transition");
    };
    transition.finished.then(cleanUpTransition, cleanUpTransition);
    return;
  }

  commit();
  requestAnimationFrame(restore);
}

function renderPreservingViewport(anchorSelector = "") {
  const x = window.scrollX;
  const y = window.scrollY;
  const anchorBefore = anchorSelector ? app.querySelector(anchorSelector) : null;
  const anchorBeforeRect = anchorBefore?.getBoundingClientRect();
  const anchorWasVisible = Boolean(anchorBeforeRect
    && anchorBeforeRect.bottom > 72
    && anchorBeforeRect.top < window.innerHeight - 48);
  render();
  const restore = () => {
    window.scrollTo(x, y);
    if (anchorWasVisible) {
      const nextAnchor = app.querySelector(anchorSelector);
      if (nextAnchor) {
        const rect = nextAnchor.getBoundingClientRect();
        const topbarBottom = app.querySelector(".topbar")?.getBoundingClientRect().bottom || 0;
        const stillVisible = rect.bottom > topbarBottom + 48 && rect.top < window.innerHeight - 48;
        if (!stillVisible) {
          window.scrollTo(x, Math.max(0, window.scrollY + rect.top - topbarBottom - 16));
        }
      }
    }
  };
  requestAnimationFrame(() => {
    restore();
    requestAnimationFrame(restore);
  });
}

function animateRemoval(target, action) {
  if (!target || prefersReducedMotion()) {
    action();
    return;
  }
  target.classList.add("is-removing");
  window.setTimeout(action, 150);
}

function hasIncomeOnlySearch() {
  return !normalise(state.query) && state.income !== "Any income";
}

function hasActiveCourseFilters() {
  return (showLevelFilter && state.level !== "All levels")
    || state.courseType !== "All course types"
    || state.area !== "All study areas"
    || state.provider !== "All providers"
    || state.campus !== "All campuses"
    || state.mode !== "All modes"
    || state.income !== "Any income"
    || Boolean(String(state.estimatedAtar || "").trim())
    || state.duration !== "Any duration"
    || state.prerequisite !== "Any prerequisite status"
    || state.pathway !== "Any pathway status"
    || state.guaranteedEntry !== "Any guaranteed-entry status"
    || state.degreeStructure !== "Any degree structure"
    || Boolean(cleanSearchText(state.locationQuery));
}

function hasActiveCourseSearch() {
  return Boolean(normalise(state.query)) || hasActiveCourseFilters();
}

function activeCourseFilterCount() {
  return [
    showLevelFilter && state.level !== "All levels",
    state.courseType !== "All course types",
    state.area !== "All study areas",
    state.provider !== "All providers",
    state.campus !== "All campuses",
    state.mode !== "All modes",
    state.income !== "Any income",
    Boolean(String(state.estimatedAtar || "").trim()),
    state.duration !== "Any duration",
    state.prerequisite !== "Any prerequisite status",
    state.pathway !== "Any pathway status",
    state.guaranteedEntry !== "Any guaranteed-entry status",
    state.degreeStructure !== "Any degree structure",
    state.sort !== "Relevance",
    Boolean(cleanSearchText(state.locationQuery))
  ].filter(Boolean).length;
}

function advancedCourseFilterCount() {
  return [
    showLevelFilter && state.level !== "All levels",
    state.courseType !== "All course types",
    state.degreeStructure !== "Any degree structure",
    state.prerequisite !== "Any prerequisite status",
    state.pathway !== "Any pathway status",
    state.guaranteedEntry !== "Any guaranteed-entry status",
    state.income !== "Any income",
    state.sort !== "Relevance",
    Boolean(cleanSearchText(state.locationQuery))
  ].filter(Boolean).length;
}

function relaxOneCourseFilter() {
  const resetOrder = [
    ["guaranteedEntry", "Any guaranteed-entry status"],
    ["prerequisite", "Any prerequisite status"],
    ["pathway", "Any pathway status"],
    ["degreeStructure", "Any degree structure"],
    ["duration", "Any duration"],
    ["campus", "All campuses"],
    ["provider", "All providers"],
    ["mode", "All modes"],
    ["income", "Any income"],
    ["courseType", "All course types"],
    ["area", "All study areas"],
    ["level", "All levels"]
  ];
  const active = resetOrder.find(([key, fallback]) => state[key] !== fallback);
  if (active) {
    state[active[0]] = active[1];
  } else if (state.estimatedAtar) {
    state.allowAtarStretch = true;
  } else if (state.query) {
    state.query = state.query.split(/\s+/).slice(0, -1).join(" ");
    state.draft = state.query;
  }
  state.visible = 24;
  state.openCourseIds.clear();
}

function filteredCourses() {
  const query = cleanSearchText(state.query);
  const incomeOnly = hasIncomeOnlySearch();
  if (!query && !hasActiveCourseFilters()) return [];
  const queryPlan = query ? searchQueryPlan(query) : null;
  const origin = resolveKnownLocation(state.locationQuery);
  const cacheKey = [
    queryPlan?.cacheKey || query,
    state.level,
    state.courseType,
    state.area,
    state.provider,
    state.campus,
    state.mode,
    state.income,
    state.estimatedAtar,
    state.allowAtarStretch,
    state.duration,
    state.prerequisite,
    state.pathway,
    state.guaranteedEntry,
    state.degreeStructure,
    state.sort,
    origin ? origin.label : cleanSearchText(state.locationQuery)
  ].join("|");
  if (filteredCourseCache.key === cacheKey) return filteredCourseCache.results;
  const ranked = allCourses
    .filter((course) => {
      const queryMatch = !query || courseSearchMatch(course, queryPlan);
      const levelMatch = state.level === "All levels" || courseLevels(course).some((level) => levelLabels[level] === state.level);
      const typeMatch = state.courseType === "All course types" || courseTypeLabel(course) === state.courseType;
      const areaMatch = courseMatchesStudyArea(course, state.area);
      const providerMatch = state.provider === "All providers" || course.university === state.provider;
      const campusMatch = state.campus === "All campuses" || course.campus === state.campus;
      const modeMatch = state.mode === "All modes" || (course.modes || []).includes(state.mode);
      const incomeMatch = courseMeetsIncome(course, state.income);
      const atarMatch = courseMatchesEstimatedAtar(course);
      const durationMatch = courseMatchesDuration(course, state.duration);
      const prerequisiteMatch = courseMatchesPrerequisiteFilter(course, state.prerequisite);
      const pathwayMatch = courseMatchesPathwayFilter(course, state.pathway);
      const guaranteedMatch = courseMatchesGuaranteedEntryFilter(course, state.guaranteedEntry);
      const structureMatch = courseMatchesDegreeStructure(course, state.degreeStructure);
      return queryMatch
        && levelMatch
        && typeMatch
        && areaMatch
        && providerMatch
        && campusMatch
        && modeMatch
        && incomeMatch
        && atarMatch
        && durationMatch
        && prerequisiteMatch
        && pathwayMatch
        && guaranteedMatch
        && structureMatch;
    })
    .map((course) => ({
      course,
      score: searchScore(course, queryPlan),
      areaScore: studyAreaSortScore(course),
      distance: origin ? courseDistanceKm(course, origin) : null,
      incomeScore: courseIncomeOutcomes(course)[0]?.max || 0
    }))
    .sort((a, b) => compareSearchEntries(a, b))
    .map((entry) => entry.course);
  const results = dedupeVisibleCourseResults(ranked);
  filteredCourseCache.key = cacheKey;
  filteredCourseCache.results = results;
  return results;
}

function courseMatchesEstimatedAtar(course) {
  const estimate = Number(state.estimatedAtar);
  if (!Number.isFinite(estimate) || estimate <= 0) return true;
  const rank = numericRank(course.atar);
  if (rank === null) return true;
  const allowance = state.allowAtarStretch ? 5 : 0;
  return rank <= Math.min(99.95, estimate + allowance);
}

function courseMatchesDuration(course, option) {
  if (!option || option === "Any duration") return true;
  const years = courseDurationYears(course);
  if (!Number.isFinite(years)) return false;
  if (option === "1 year or less") return years <= 1.5;
  if (option === "2 years") return years > 1.5 && years < 2.75;
  if (option === "3 years") return years >= 2.75 && years < 3.75;
  if (option === "4 years or more") return years >= 3.75;
  return true;
}

function courseDurationYears(course) {
  const text = cleanSearchText(course.duration || "");
  const year = text.match(/(\d+(?:\.\d+)?)\s*year/);
  if (year) return Number(year[1]);
  const month = text.match(/(\d+(?:\.\d+)?)\s*month/);
  if (month) return Number(month[1]) / 12;
  return null;
}

function courseMatchesPrerequisiteFilter(course, option) {
  if (!option || option === "Any prerequisite status") return true;
  const prerequisites = hasSpecificInfo(course.prerequisites);
  const additional = hasSpecificInfo(course.additionalCriteria);
  if (option === "No listed prerequisites") return !prerequisites && !additional;
  if (option === "Has subject prerequisites") return prerequisites;
  if (option === "Has additional entry criteria") return additional;
  return true;
}

function coursePathwayText(course) {
  return cleanSearchText([
    course.name,
    course.summary,
    course.additionalCriteria,
    course.prerequisites,
    course.careers
  ].join(" "));
}

function courseHasPathwayMention(course) {
  return /\b(pathway|diploma|foundation|preparation program|bridging|transfer|articulation|tafe|vet)\b/.test(coursePathwayText(course));
}

function courseMatchesPathwayFilter(course, option) {
  if (!option || option === "Any pathway status") return true;
  if (option === "Pathway mentioned") return courseHasPathwayMention(course);
  if (option === "Direct degree results") return courseTypeLabel(course) === "Bachelor" || courseTypeLabel(course) === "Honours" || courseTypeLabel(course) === "Double degree";
  return true;
}

function courseHasGuaranteedEntryMention(course) {
  return /\b(guaranteed entry|guaranteed selection rank|guaranteed offer|guaranteed admission)\b/.test(coursePathwayText(course));
}

function courseMatchesGuaranteedEntryFilter(course, option) {
  if (!option || option === "Any guaranteed-entry status") return true;
  const mentioned = courseHasGuaranteedEntryMention(course);
  return option === "Guaranteed entry mentioned" ? mentioned : !mentioned;
}

function courseMatchesDegreeStructure(course, option) {
  if (!option || option === "Any degree structure") return true;
  const isDouble = courseTypeLabel(course) === "Double degree";
  return option === "Double degrees" ? isDouble : !isDouble;
}

function compareSearchEntries(a, b) {
  if (hasIncomeOnlySearch() && state.sort === "Relevance") {
    if (b.incomeScore !== a.incomeScore) return b.incomeScore - a.incomeScore;
  }
  if (state.sort === "Relevance" && state.area !== "All study areas" && b.areaScore !== a.areaScore) {
    return b.areaScore - a.areaScore;
  }
  if (state.sort === "Closest campus") {
    const distanceA = Number.isFinite(a.distance) ? a.distance : Infinity;
    const distanceB = Number.isFinite(b.distance) ? b.distance : Infinity;
    if (distanceA !== distanceB) return distanceA - distanceB;
  }
  if (state.sort === "Study area fit") {
    if (b.areaScore !== a.areaScore) return b.areaScore - a.areaScore;
  }
  if (state.sort === "Lowest selection rank") {
    const rankA = numericRank(a.course.atar);
    const rankB = numericRank(b.course.atar);
    if ((rankA ?? Infinity) !== (rankB ?? Infinity)) return (rankA ?? Infinity) - (rankB ?? Infinity);
  }
  if (state.sort === "Highest selection rank") {
    const rankA = numericRank(a.course.atar);
    const rankB = numericRank(b.course.atar);
    if ((rankB ?? -Infinity) !== (rankA ?? -Infinity)) return (rankB ?? -Infinity) - (rankA ?? -Infinity);
  }
  if (state.sort === "Income potential") {
    if (b.incomeScore !== a.incomeScore) return b.incomeScore - a.incomeScore;
  }
  return b.score - a.score || a.course.name.localeCompare(b.course.name);
}

function courseMatchesStudyArea(course, areaLabel) {
  if (!areaLabel || areaLabel === "All study areas") return true;
  const topic = topicOptions.find((item) => item.label === areaLabel);
  if (!topic) return true;
  return topicWeightedScore(course, topic) >= 35 || phraseMatch(course.area, areaLabel);
}

function dedupeVisibleCourseResults(courses) {
  const seen = new Set();
  return courses.filter((course) => {
    const key = [course.name, course.providerId, course.campus, course.level].map(cleanSearchText).join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function studyAreaSortScore(course) {
  const selected = state.area !== "All study areas"
    ? topicOptions.find((topic) => topic.label === state.area)
    : topicForQuery(state.query);
  return selected ? topicWeightedScore(course, selected) : 0;
}

function courseTypeLabel(course) {
  const title = cleanSearchText(course.name);
  if (courseQualificationComponents(course).length > 1) return "Double degree";
  if (title.startsWith("advanced diploma")) return "Advanced Diploma";
  if (title.startsWith("diploma")) return "Diploma";
  if (title.startsWith("associate degree") || title.startsWith("assocdeg")) return "Associate Degree";
  if (title.startsWith("undergraduate certificate")) return "Undergraduate Certificate";
  if (/bachelor/.test(title) && (/\/.*bachelor|bachelor of .+ and bachelor|double degree/.test(title))) return "Double degree";
  if (title.startsWith("bachelor") && /\bhonours\b/.test(title)) return "Honours";
  if (title.startsWith("bachelor")) return "Bachelor";
  return "Other";
}

function courseQualificationComponents(course) {
  const title = decodeHtmlEntities(course?.name || "").replace(/\s+/g, " ").trim();
  if (!title) return [];
  const qualificationPattern = /\b(?:Bachelor|Master|Doctor|Diploma|Associate Degree|Undergraduate Certificate|Graduate Certificate)\b/gi;
  const matches = [...title.matchAll(qualificationPattern)];
  if (matches.length < 2) return [title];
  return matches
    .map((match, index) => {
      const nextIndex = matches[index + 1]?.index ?? title.length;
      return title
        .slice(match.index, nextIndex)
        .replace(/\s*(?:\/|&|\band\b)\s*$/i, "")
        .trim();
    })
    .filter(Boolean);
}

function courseDegreeStructureLabel(course) {
  const components = courseQualificationComponents(course);
  if (components.length > 1) {
    const bachelorCount = components.filter((component) => /^Bachelor\b/i.test(component)).length;
    return bachelorCount === components.length
      ? `Double degree · ${components.length} bachelor's qualifications`
      : `Combined program · ${components.length} qualifications`;
  }
  const type = courseTypeLabel(course);
  if (type === "Honours") return "Single honours degree";
  if (type === "Bachelor") return "Single bachelor's degree";
  if (type === "Double degree") return "Double or combined degree";
  return `Single ${type.toLowerCase()} qualification`;
}

function courseQualificationsSummary(course) {
  const components = courseQualificationComponents(course);
  if (!components.length) return "Not published";
  if (components.length === 1) return `1 qualification: ${components[0]}`;
  return `${components.length} qualifications: ${components.join(" + ")}`;
}

function courseDegreeStructureExplanation(course) {
  const components = courseQualificationComponents(course);
  if (components.length > 1) {
    return `The title combines ${components.length} qualifications or degree components. This usually gives broader study but can add time and workload; confirm the official award, progression and early-exit rules.`;
  }
  const type = courseTypeLabel(course);
  if (type === "Honours") {
    return "One honours qualification with advanced study or research. Check whether honours is embedded, guaranteed or performance-dependent.";
  }
  if (["Diploma", "Advanced Diploma", "Associate Degree", "Undergraduate Certificate"].includes(type)) {
    return "A shorter standalone qualification that may also provide credit or a pathway into a bachelor degree. Confirm the linked-course and credit rules.";
  }
  return "One main qualification with a more focused course structure. Compare its majors, electives and accreditation with broader combined programs.";
}

function courseDistanceKm(course, origin) {
  if (!origin) return null;
  const campusPoint = courseCampusLocation(course);
  if (!campusPoint) return null;
  return haversineKm(origin, campusPoint);
}

function courseCampusLocation(course) {
  const campusText = cleanSearchText(course.campus || "");
  if (!campusText || campusText === "online") return null;
  const directCampus = resolveKnownLocation(campusText);
  const genericCampus = /^(city|city campus|sydney|sydney campus|campus)$/.test(campusText);
  if (directCampus && !genericCampus) return directCampus;
  const providerHint = providerLocationHints[course.providerId];
  if (providerHint) return resolveKnownLocation(providerHint);
  if (directCampus) return directCampus;
  return resolveKnownLocation(`${course.campus || ""} ${course.university || ""}`);
}

function resolveKnownLocation(value) {
  const clean = cleanSearchText(value);
  if (!clean) return null;
  const postcodeFallback = resolveSydneyPostcode(clean);
  if (postcodeFallback) return postcodeFallback;
  let best = null;
  for (const location of knownLocations) {
    for (const name of location.cleanNames) {
      if (!name) continue;
      const exact = clean === name;
      const contained = clean.includes(name) || name.includes(clean);
      if (!exact && !contained) continue;
      const score = exact ? 1000 + name.length : name.length;
      if (!best || score > best.score) best = { ...location, score, label: location.names[0] };
    }
  }
  return best ? { label: best.label, lat: best.lat, lng: best.lng } : null;
}

function resolveSydneyPostcode(clean) {
  const match = clean.match(/\b(2\d{3})\b/);
  if (!match) return null;
  const postcode = Number(match[1]);
  const exact = {
    2190: ["Greenacre / Chullora 2190", -33.9055, 151.0555],
    2191: ["Belfield / Belmore 2191", -33.9037, 151.0880],
    2192: ["Belmore 2192", -33.9172, 151.0898],
    2194: ["Campsie 2194", -33.9125, 151.1026],
    2196: ["Punchbowl / Roselands 2196", -33.9289, 151.0552],
    2197: ["Bass Hill / Yagoona 2197", -33.9027, 151.0002],
    2198: ["Georges Hall 2198", -33.9085, 150.9884],
    2199: ["Yagoona 2199", -33.9048, 151.0204],
    2200: ["Bankstown 2200", -33.9173, 151.0359]
  };
  if (exact[postcode]) {
    const [label, lat, lng] = exact[postcode];
    return { label, lat, lng };
  }
  const ranges = [
    [2000, 2009, "Sydney CBD / inner city", -33.8688, 151.2093],
    [2010, 2020, "Inner Sydney / eastern city", -33.8890, 151.2195],
    [2021, 2036, "Eastern Suburbs", -33.9200, 151.2440],
    [2037, 2050, "Inner West", -33.8880, 151.1650],
    [2060, 2077, "Lower North Shore", -33.8050, 151.1800],
    [2084, 2107, "Northern Beaches", -33.7450, 151.2850],
    [2110, 2128, "Ryde / inner north-west", -33.8100, 151.0950],
    [2130, 2147, "Inner west / central west", -33.8450, 151.0450],
    [2148, 2164, "Parramatta / Blacktown / Cumberland", -33.8050, 150.9600],
    [2165, 2179, "Fairfield / Liverpool / south-west Sydney", -33.9050, 150.9200],
    [2190, 2234, "Canterbury-Bankstown / St George / Sutherland", -33.9250, 151.0700],
    [2555, 2570, "Macarthur / Camden", -34.0350, 150.8000],
    [2745, 2770, "Penrith / Hawkesbury / Mount Druitt", -33.7350, 150.7400]
  ];
  const range = ranges.find(([from, to]) => postcode >= from && postcode <= to);
  if (!range) return null;
  return { label: `${range[2]} ${postcode}`, lat: range[3], lng: range[4] };
}

function haversineKm(a, b) {
  const earthRadiusKm = 6371;
  const toRad = (degrees) => degrees * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function renderCourse(course, matchLine = "", index = 0, showFieldSignal = false) {
  const saved = state.savedIds.includes(course.id);
  const comparing = state.compareIds.includes(course.id);
  const open = state.openCourseIds.has(course.id);
  const distanceLine = distanceSummaryLine(course);
  const year = courseAdmissionYear(course);
  const selectionRank = compactSelectionRankDisplay(course);
  const rawAtar = compactRawAtarDisplay(course);
  const pathways = coursePathwaySummary(course);
  const guaranteed = courseGuaranteedEntrySummary(course);
  const csp = courseCspSummary(course);
  const fieldSignal = showFieldSignal ? providerFieldSignal(course) : null;
  return `
    <article class="course-item course-result-card" style="--item-delay:${Math.min(index, 8) * 26}ms" data-course-id="${escapeHtml(course.id)}">
      <div class="course-card-head">
        <div class="course-provider">
          <img src="${escapeHtml(course.providerLogo)}" alt="" loading="lazy" />
          <span>${escapeHtml(course.university)}</span>
          ${fieldSignal && fieldSignal.score >= 80 ? `
            <small class="course-field-signal">
              <strong>${escapeHtml(currentSearchTopic()?.label || "Field")} strength</strong>
              <span>${escapeHtml(fieldSignal.note)}</span>
            </small>
          ` : ""}
        </div>
        <div class="course-summary">
          <h3>${highlight(course.name)}</h3>
          <p>${escapeHtml(course.campus)} · Code ${escapeHtml(course.courseCode)}</p>
          <dl class="course-core-facts">
            <div><dt>Duration</dt><dd>${compactCourseField(course.duration, "Confirm duration")}</dd></div>
            <div><dt>Study mode</dt><dd>${compactCourseField((course.modes || []).join(", "), "Confirm study mode")}</dd></div>
            <div><dt>Level</dt><dd>${escapeHtml(levelDisplay(course))}</dd></div>
          </dl>
          ${distanceLine ? `<p class="distance-preview">${escapeHtml(distanceLine)}</p>` : ""}
        </div>
        <div class="course-admission">
          <div class="admission-number">
            <span>${escapeHtml(courseRankLabel(course))}</span>
            <strong class="atar-requirement">${escapeHtml(selectionRank)}</strong>
          </div>
          <div class="admission-number">
            <span>${escapeHtml(courseRawAtarLabel(course))}</span>
            <strong class="atar-requirement">${escapeHtml(rawAtar)}</strong>
          </div>
          ${matchLine ? `<small>${escapeHtml(matchLine)}</small>` : ""}
          <small>${escapeHtml(guaranteed)}</small>
          <small class="admission-definition">Selection rank can include adjustments; lowest ATAR is the raw ATAR of an offer-holder.</small>
          <a href="${escapeHtml(course.admissionProfileUrl || course.uacUrl)}" target="_blank" rel="noreferrer">${escapeHtml(course.admissionProfileSource || primaryCourseLinkLabel(course))} source ${icon("external")}</a>
        </div>
      </div>
      <dl class="course-decision-grid">
        <div><dt>Prerequisites</dt><dd>${compactCourseField(course.prerequisites, "None listed in imported data")}</dd></div>
        <div><dt>Assumed knowledge</dt><dd>${compactCourseField(course.assumed, "None listed in imported data")}</dd></div>
        <div><dt>Available pathways</dt><dd>${escapeHtml(pathways)}</dd></div>
        <div><dt>CSP status</dt><dd>${escapeHtml(csp)}</dd></div>
      </dl>
      <div class="course-card-foot">
        <div class="course-source-line">
          <span>Published profile: ${escapeHtml(String(year))}</span>
          <span>Site data updated ${escapeHtml(formatImportDate())}</span>
          <span>Previous entry results do not guarantee admission.</span>
        </div>
        <div class="course-card-actions">
          <button type="button" data-save-course="${escapeHtml(course.id)}" aria-pressed="${saved}">${saved ? "Saved" : "Save"}</button>
          <button type="button" data-compare-course="${escapeHtml(course.id)}" aria-pressed="${comparing}">${comparing ? "Comparing" : "Compare"}</button>
          <button type="button" data-toggle-course="${escapeHtml(course.id)}" aria-expanded="${open}">${open ? "Hide details" : "View details"}</button>
        </div>
      </div>
      ${open ? (courseDetailsLoaded(course) ? renderCourseDetail(course, saved, comparing) : renderCourseDetailLoading()) : ""}
    </article>
  `;
}

function courseAdmissionYear(course) {
  if (course.admissionProfileCode === "PROVIDER") return course.atarYear || "Provider criteria";
  const importedYear = Number(String(meta.importedAt || "").slice(0, 4));
  return Number(course.atarYear) || (Number.isFinite(importedYear) ? importedYear : new Date().getFullYear());
}

function courseRankLabel(course) {
  if (course.admissionProfileCode === "PROVIDER") return "Selection basis (provider)";
  return `Lowest selection rank (${courseAdmissionYear(course)})`;
}

function courseRawAtarLabel(course) {
  if (course.admissionProfileCode === "PROVIDER") return "Lowest raw ATAR";
  return `Lowest raw ATAR (${courseAdmissionYear(course)})`;
}

function courseSelectionRankValue(course) {
  return course.selectionRank || course.atar || "";
}

function compactSelectionRankDisplay(course) {
  if (course.admissionProfileCode === "PROVIDER") {
    return course.selectionRank || "Provider entry criteria";
  }
  return compactRankDisplay(courseSelectionRankValue(course));
}

function compactRawAtarDisplay(course) {
  if (course.admissionProfileCode === "PROVIDER") return "Not used";
  return compactRankDisplay(course.lowestAtar);
}

function compactRankDisplay(value) {
  const parsed = numericRank(value);
  if (parsed !== null) return parsed.toFixed(parsed % 1 ? 2 : 0);
  const code = String(value || "").trim();
  const compact = {
    NC: "New course",
    NO: "No ATAR-only offers",
    NR: "Not published",
    NP: "Not published",
    NS: "No S1 offers",
    NN: "Not published",
    "<5": "Fewer than 5 offers"
  };
  return compact[code] || "Not published";
}

function compactCourseField(value, fallback) {
  const text = decodeHtmlEntities(value || "").replace(/\s+/g, " ").trim();
  if (!hasSpecificInfo(text)) return escapeHtml(fallback);
  return escapeHtml(truncateText(text, 120));
}

function coursePathwaySummary(course) {
  if (courseHasPathwayMention(course)) {
    if (/diploma/.test(coursePathwayText(course))) return "Diploma or linked pathway mentioned";
    if (/foundation|preparation program|bridging/.test(coursePathwayText(course))) return "Foundation or preparation route mentioned";
    if (/tafe|vet|transfer|articulation/.test(coursePathwayText(course))) return "TAFE, VET or transfer route mentioned";
    return "Pathway option mentioned";
  }
  return "No specific pathway listed; check the provider";
}

function courseGuaranteedEntrySummary(course) {
  return courseHasGuaranteedEntryMention(course)
    ? "Guaranteed-entry information mentioned—confirm the exact current rank"
    : "No guaranteed rank published in this imported record";
}

function courseCspSummary(course) {
  const text = cleanSearchText(`${course.fees || ""} ${course.summary || ""}`);
  if (/\b(commonwealth supported place|csp)\b/.test(text)) return "CSP information mentioned—confirm availability";
  return "Not confirmed in imported data; check the official page";
}

function courseDetailsLoaded(course) {
  return window.courseFinderCourseDetails?.hasFullDetails?.(course) || !course?.detailChunk;
}

function renderCourseDetailLoading(message = "Loading the complete course information…") {
  return `
    <div class="course-detail-loading" role="status" aria-live="polite">
      <span>${escapeHtml(message)}</span>
      <i></i><i></i><i></i>
    </div>
  `;
}

async function hydrateCourseDetail(details, course) {
  if (!details || !course) return;
  if (courseDetailsLoaded(course)) {
    details.querySelector(".course-detail-loading")?.remove();
    if (!details.querySelector(".course-detail")) {
      details.insertAdjacentHTML("beforeend", renderCourseDetail(course, state.savedIds.includes(course.id), state.compareIds.includes(course.id)));
      bindCourseActionButtons(details);
    }
    return;
  }

  if (!details.querySelector(".course-detail-loading")) details.insertAdjacentHTML("beforeend", renderCourseDetailLoading());
  details.classList.add("is-loading-detail");
  try {
    await window.courseFinderCourseDetails.get(course);
    if (!details.isConnected || !state.openCourseIds.has(course.id)) return;
    details.querySelector(".course-detail-loading")?.remove();
    details.querySelector(".course-detail")?.remove();
    details.insertAdjacentHTML("beforeend", renderCourseDetail(course, state.savedIds.includes(course.id), state.compareIds.includes(course.id)));
    bindCourseActionButtons(details);
  } catch {
    const loading = details.querySelector(".course-detail-loading");
    if (loading) loading.outerHTML = renderCourseDetailLoading("Full details could not load. The course links below are still available.");
    if (!details.querySelector(".course-detail")) {
      details.insertAdjacentHTML("beforeend", renderCourseDetail(course, state.savedIds.includes(course.id), state.compareIds.includes(course.id)));
      bindCourseActionButtons(details);
    }
  } finally {
    details.classList.remove("is-loading-detail");
  }
}

function distanceSummaryLine(course) {
  const origin = resolveKnownLocation(state.locationQuery);
  if (!origin) return "";
  const distance = courseDistanceKm(course, origin);
  if (!Number.isFinite(distance)) return "";
  return `Approx. ${distance.toFixed(distance < 10 ? 1 : 0)} km from ${origin.label}`;
}

function renderCourseDetail(course, saved, comparing) {
  return `
    <div class="course-detail">
      <dl>
        ${row("Course code", course.courseCode)}
        ${row("Level", levelDisplay(course))}
        ${row("Campus", course.campus)}
        ${row(courseRankLabel(course), compactSelectionRankDisplay(course), "atar-requirement")}
        ${row(courseRawAtarLabel(course), compactRawAtarDisplay(course), "atar-requirement")}
        ${row("How to read these figures", "Selection rank may include adjustment factors. Lowest raw ATAR does not include those adjustments.")}
        ${row("Guaranteed entry rank", courseGuaranteedEntrySummary(course))}
        ${row("Duration", course.duration)}
        ${row("Study mode", (course.modes || []).join(", "))}
        ${row("Intake", course.intake)}
        ${row("Prerequisites", course.prerequisites)}
        ${row("Assumed knowledge", course.assumed)}
        ${row("Additional entry criteria", course.additionalCriteria)}
        ${row("Fees", course.fees)}
        ${row("Commonwealth supported place status", courseCspSummary(course))}
        ${row("Available pathways", coursePathwaySummary(course))}
        ${row("Careers", course.careers)}
        ${row("Practical experience", course.practicalExperience)}
        ${row("Information source", course.source || primaryCourseLinkLabel(course))}
        ${row("Published profile year", String(courseAdmissionYear(course)))}
        ${row("Site data last updated", formatImportDate())}
      </dl>
      ${renderIncomeOutlook(course)}
      <p>${highlight(course.summary)}</p>
      <div class="actions">
        <a href="${escapeHtml(course.uacUrl)}" target="_blank" rel="noreferrer">${escapeHtml(primaryCourseLinkLabel(course))} ${icon("external")}</a>
        ${course.officialUrl ? `<a href="${escapeHtml(course.officialUrl)}" target="_blank" rel="noreferrer">Course website ${icon("external")}</a>` : ""}
        <button type="button" data-save-course="${escapeHtml(course.id)}">${saved ? "Remove from saved" : "Save course"}</button>
        <button type="button" data-compare-course="${escapeHtml(course.id)}">${comparing ? "Remove from compare" : "Add to compare"}</button>
      </div>
    </div>
  `;
}

function primaryCourseLinkLabel(course) {
  const url = String(course.uacUrl || "");
  if (url.includes("uac.edu.au/course-search")) return "View on UAC";
  return course.sourceLabel ? `View ${course.sourceLabel}` : "View source";
}

function renderAtarResults() {
  const matches = allCourses
    .filter((course) => numericRank(course.atar) !== null)
    .filter((course) => course.level === "undergraduate")
    .filter((course) => state.matcherProvider === "All providers" || course.university === state.matcherProvider)
    .filter((course) => courseMeetsIncome(course, state.matcherIncome))
    .map((course) => {
      const rank = numericRank(course.atar);
      const gap = Number(state.atar) - rank;
      const preference = preferenceScore(course);
      const incomeScore = state.matcherIncome === "Any income" ? 0 : (courseIncomeOutcomes(course)[0]?.max || 0) / 2500;
      const quality = providerQuality[state.matcherTopic]?.[course.providerId]?.score || 60;
      const atarScore = gap >= 0 ? 70 - Math.min(gap, 20) : 70 - Math.abs(gap) * 2.5;
      return { course, gap, score: atarScore + preference + incomeScore + quality * 0.25 + qualificationScore(course) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const courseRows = matches.map(({ course, gap }, index) => {
    const label = gap >= 0 ? `${gap.toFixed(1)} below your ATAR` : `${Math.abs(gap).toFixed(1)} above your ATAR`;
    return renderCourse(course, label, index);
  }).join("");

  return `${renderPathwayAdvice(matches)}${courseRows}`;
}

function qualificationScore(course) {
  const title = cleanSearchText(course.name);
  if (title.includes("via diploma")) return -10;
  if (title.startsWith("diploma") || title.startsWith("advanced diploma")) return -8;
  if (title.startsWith("bachelor")) return 12;
  return 0;
}

function renderPathwayAdvice(matches) {
  const atar = Number(state.atar);
  const realisticCount = matches.filter((match) => match.gap >= -3).length;
  if (atar >= 65 && realisticCount >= 4) return "";
  const reason = atar < 55
    ? "Your ATAR estimate is quite low, so keep direct-entry options but also plan a pathway."
    : "A few matches may sit above your ATAR, so these pathways are worth checking as backups.";
  return `
    <div class="pathway-panel">
      <div>
        <h3>Pathway options to check</h3>
        <p>${escapeHtml(reason)} Use official pages to confirm eligibility, dates, fees and whether credit can transfer into the degree you want.</p>
      </div>
      <div class="pathway-grid">
        ${pathwayLinks.map((item) => `
          <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(item.text)}</small>
            <em>Open official page ${icon("external")}</em>
          </a>
        `).join("")}
      </div>
    </div>
  `;
}

function renderIncomeOutlook(course) {
  const outcomes = courseIncomeOutcomes(course).slice(0, 4);
  return `
    <section class="income-outlook" aria-label="Jobs and income">
      <div>
        <h3>Jobs and income</h3>
        <p>Indicative Australian full-time annual ranges. Actual pay depends on location, experience, employer, registration and extra study.</p>
      </div>
      <div class="income-chip-list">
        ${outcomes.map((job) => `
          <article>
            <strong>${escapeHtml(job.title)}</strong>
            <span>${escapeHtml(job.range)}</span>
          </article>
        `).join("")}
      </div>
      <small>Income bands are broad estimates aligned to Jobs and Skills Australia occupation-profile earnings data, then mapped to this course's listed career directions.</small>
    </section>
  `;
}

function incomeSummaryLine(course) {
  const outcomes = courseIncomeOutcomes(course);
  if (!outcomes.length) return "Jobs: check official career outcomes";
  const top = outcomes[0];
  const extra = outcomes.length > 1 ? ` + ${outcomes.length - 1} more` : "";
  return `${top.title}: ${top.range}${extra}`;
}

function courseMeetsIncome(course, option) {
  const minimum = incomeMinimums[option] || 0;
  if (!minimum) return true;
  return courseIncomeOutcomes(course).some((job) => job.max >= minimum);
}

function courseIncomeOutcomes(course) {
  if (incomeOutcomeCache.has(course)) return incomeOutcomeCache.get(course);
  const text = cleanSearchText([
    course.name,
    course.area,
    course.summary,
    course.careers,
    course.prerequisites,
    course.assumed
  ].join(" "));
  const title = cleanSearchText(course.name);
  const careers = cleanSearchText(course.careers);
  const scored = preparedJobIncomeProfiles
    .map((profile) => {
      const titleHit = cleanTextHas(title, profile.cleanTitle) ? 20 : 0;
      const careerHits = profile.keywordMatchers.filter((matcher) => cleanTextHas(careers, matcher)).length;
      const textHits = profile.keywordMatchers.filter((matcher) => cleanTextHas(text, matcher)).length;
      const score = titleHit + careerHits * 18 + textHits * 6;
      return { ...profile, score };
    })
    .filter((profile) => profile.score > 0)
    .sort((a, b) => b.score - a.score || b.max - a.max);

  const unique = [];
  const seen = new Set();
  for (const profile of scored) {
    if (seen.has(profile.title)) continue;
    seen.add(profile.title);
    unique.push(profile);
    if (unique.length >= 5) break;
  }

  const outcomes = unique.length ? unique : [{
    title: "Graduate role in this field",
    min: 60000,
    max: 90000,
    range: "$60k-$90k"
  }];
  incomeOutcomeCache.set(course, outcomes);
  return outcomes;
}

function cleanTextHas(text, matcher) {
  if (!matcher) return false;
  if (typeof matcher === "string") return text.includes(matcher);
  return matcher.regex ? matcher.regex.test(text) : text.includes(matcher.keyword);
}

function incomeMinimumFromQuery(query) {
  const clean = cleanSearchText(query);
  const numeric = clean.match(/\b(60|70|80|90|100|110|120|130|140|150)\s*k\b/);
  if (numeric) return Number(numeric[1]) * 1000;
  const plainNumber = clean.match(/\b(60000|70000|80000|90000|100000|110000|120000|130000|140000|150000)\b/);
  if (plainNumber) return Number(plainNumber[1]);
  if (/six figure|100k|high income|high pay|good pay|salary|income|money|rich/.test(clean)) return 100000;
  return 0;
}

function scheduleIncomeWarmup() {
  if (incomeWarmupScheduled || incomeWarmupIndex >= allCourses.length) return;
  incomeWarmupScheduled = true;
  const runChunk = (deadline = { timeRemaining: () => 8, didTimeout: true }) => {
    incomeWarmupScheduled = false;
    const startedAt = performance.now();
    while (incomeWarmupIndex < allCourses.length) {
      courseIncomeOutcomes(allCourses[incomeWarmupIndex]);
      incomeWarmupIndex += 1;
      const hasIdleTime = deadline.didTimeout || deadline.timeRemaining() > 3;
      if (!hasIdleTime || performance.now() - startedAt > 12) break;
    }
    if (incomeWarmupIndex < allCourses.length) scheduleIncomeWarmup();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runChunk, { timeout: 1200 });
  } else {
    window.setTimeout(() => runChunk(), 80);
  }
}

function renderCompareLibrary(compareCourses) {
  if (!compareCourses.length) {
    return `
      <div class="compare-empty">
        <strong>Compare courses row by row</strong>
        <p>Select two or three results. This table will mark every field that differs and call out useful advantages without pretending one course is automatically best.</p>
        <a href="#courses">Choose courses to compare</a>
      </div>
    `;
  }
  const rowStates = comparisonRows(compareCourses);
  const differenceCount = rowStates.filter((row) => row.different).length;
  const visibleRows = state.compareOnlyDifferences && compareCourses.length > 1
    ? rowStates.filter((row) => row.different)
    : rowStates;
  const comparisonReady = compareCourses.length > 1;
  return `
    <div class="compare-box course-compare">
      <div class="compare-workspace-head">
        <div>
          <span class="compare-kicker">Decision view</span>
          <h3>Compare courses row by row</h3>
          <p id="compareGuidance">${comparisonReady
            ? `Degree structure and combined-course differences appear first. ${differenceCount} ${differenceCount === 1 ? "difference" : "differences"} found across ${rowStates.length} details. Blue rows differ; stronger practical options are labelled.`
            : "Add one more course to reveal degree-type, entry, duration and pathway differences."}</p>
        </div>
        <div class="compare-toolbar">
          <span class="compare-count">${compareCourses.length} of 3 comparing</span>
          ${comparisonReady ? `
            <button type="button" data-action="toggle-compare-differences" aria-pressed="${state.compareOnlyDifferences}">
              ${state.compareOnlyDifferences ? "Show all rows" : "Only differences"}
            </button>
          ` : ""}
          <button class="clear-btn" type="button" data-action="clear-compare">Clear compare</button>
        </div>
      </div>
      <div class="compare-legend" aria-hidden="true">
        <span><i class="is-different"></i> Different</span>
        <span><i class="is-advantage"></i> Useful advantage</span>
        <span><i class="is-same"></i> Same</span>
      </div>
      <div class="compare-scroll" tabindex="0" aria-label="Scrollable course comparison">
        <table class="course-compare-table" style="--compare-columns:${compareCourses.length}" aria-describedby="compareGuidance">
          <caption class="sr-only">Comparison of ${compareCourses.length} selected university courses by admission, study and pathway details.</caption>
          <thead>
            <tr>
              <th class="compare-attribute" scope="col">Compare by</th>
              ${compareCourses.map((course) => `
                <th scope="col">
                  <div class="compare-course-heading">
                    <span>${escapeHtml(course.university)}</span>
                    <strong>${escapeHtml(course.name)}</strong>
                    <small>${escapeHtml(course.campus)}</small>
                    <button type="button" data-remove-compare="${escapeHtml(course.id)}" aria-label="Remove ${escapeHtml(course.name)} from comparison">Remove</button>
                  </div>
                </th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${visibleRows.map((row) => `
              <tr class="${row.different ? "compare-row-different" : "compare-row-same"} ${row.different && row.emphasis === "major" ? "compare-row-major" : ""}">
                <th class="compare-attribute" scope="row">
                  <span>${escapeHtml(row.label)}</span>
                  <small>${row.different ? escapeHtml(row.differenceLabel || "Different") : "Same"}</small>
                </th>
                ${row.values.map((value, index) => renderComparisonCell(row, value, index)).join("")}
              </tr>
            `).join("")}
            <tr class="compare-links-row">
              <th class="compare-attribute" scope="row">Official sources</th>
              ${compareCourses.map((course) => `
                <td>
                  <a href="${escapeHtml(course.uacUrl)}" target="_blank" rel="noreferrer">${escapeHtml(primaryCourseLinkLabel(course))} ${icon("external")}</a>
                  ${course.officialUrl ? `<a href="${escapeHtml(course.officialUrl)}" target="_blank" rel="noreferrer">Course page ${icon("external")}</a>` : ""}
                </td>
              `).join("")}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function comparisonRows(compareCourses) {
  const definitions = [
    { key: "provider", label: "University", value: (course) => course.university },
    { key: "campus", label: "Campus", value: (course) => course.campus },
    {
      key: "degreeStructure",
      label: "Degree type",
      value: (course) => courseDegreeStructureLabel(course),
      emphasis: "major",
      differenceLabel: "Key difference"
    },
    {
      key: "qualifications",
      label: "Qualifications included",
      value: (course) => courseQualificationsSummary(course),
      emphasis: "major",
      differenceLabel: "Check the degrees"
    },
    {
      key: "degreeStructureMeaning",
      label: "What the structure means",
      value: (course) => courseDegreeStructureExplanation(course),
      emphasis: "major",
      differenceLabel: "Different commitment"
    },
    { key: "level", label: "Course level", value: (course) => levelDisplay(course) },
    { key: "studyArea", label: "Study area / focus", value: (course) => course.area },
    {
      key: "selectionRank",
      label: "Lowest selection rank",
      value: (course) => `${compactSelectionRankDisplay(course)} (${courseAdmissionYear(course)})`,
      score: (course) => numericRank(courseSelectionRankValue(course)),
      preference: "min",
      advantage: "Lowest listed rank"
    },
    {
      key: "rawAtar",
      label: "Lowest raw ATAR",
      value: (course) => `${compactRawAtarDisplay(course)} (${courseAdmissionYear(course)})`,
      score: (course) => numericRank(course.lowestAtar),
      preference: "min",
      advantage: "Lowest listed ATAR"
    },
    {
      key: "duration",
      label: "Duration",
      value: (course) => course.duration,
      score: (course) => comparisonDurationMonths(course.duration),
      preference: "min",
      advantage: "Shortest course"
    },
    {
      key: "studyMode",
      label: "Study mode",
      value: (course) => (course.modes || []).join(", ") || "Not published",
      score: (course) => (course.modes || []).length || null,
      preference: "max",
      advantage: "Most study options"
    },
    { key: "prerequisites", label: "Prerequisites", value: (course) => course.prerequisites },
    { key: "assumed", label: "Assumed knowledge", value: (course) => course.assumed },
    {
      key: "pathways",
      label: "Available pathways",
      value: (course) => coursePathwaySummary(course),
      score: (course) => courseHasPathwayMention(course) ? 1 : 0,
      preference: "max",
      advantage: "Pathway listed"
    },
    {
      key: "guaranteedEntry",
      label: "Guaranteed entry",
      value: (course) => courseGuaranteedEntrySummary(course),
      score: (course) => courseHasGuaranteedEntryMention(course) ? 1 : 0,
      preference: "max",
      advantage: "Entry guarantee info"
    },
    { key: "fees", label: "Fees information", value: (course) => course.fees },
    { key: "csp", label: "CSP status", value: (course) => courseCspSummary(course) },
    { key: "careers", label: "Career outcomes", value: (course) => course.careers },
    { key: "updated", label: "Site data updated", value: () => formatImportDate() }
  ];

  return definitions.map((definition) => {
    const values = compareCourses.map((course) => comparisonValue(definition.value(course)));
    const normalised = values.map(normaliseComparisonValue);
    const different = compareCourses.length > 1 && new Set(normalised).size > 1;
    const advantages = new Set();

    if (different && definition.score && definition.preference) {
      const scores = compareCourses.map((course) => definition.score(course));
      const comparable = scores.every((score) => Number.isFinite(score));
      const uniqueScores = new Set(scores);
      if (comparable && uniqueScores.size > 1) {
        const preferredScore = definition.preference === "min" ? Math.min(...scores) : Math.max(...scores);
        scores.forEach((score, index) => {
          if (score === preferredScore) advantages.add(index);
        });
      }
    }

    return {
      ...definition,
      values,
      different,
      advantages
    };
  });
}

function renderComparisonCell(row, value, index) {
  const isAdvantage = row.advantages.has(index);
  const classes = [
    row.different ? "compare-cell-different" : "compare-cell-same",
    isAdvantage ? "compare-cell-advantage" : ""
  ].filter(Boolean).join(" ");
  const display = truncateText(value, 260);
  const title = display !== value ? ` title="${escapeHtml(value)}"` : "";
  return `
    <td class="${classes}">
      <span${title}>${escapeHtml(display)}</span>
      ${isAdvantage ? `<em>${escapeHtml(row.advantage)}</em>` : ""}
    </td>
  `;
}

function comparisonValue(value) {
  const text = decodeHtmlEntities(value || "").replace(/\s+/g, " ").trim();
  return text || "Not published";
}

function normaliseComparisonValue(value) {
  return comparisonValue(value)
    .toLocaleLowerCase("en-AU")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function comparisonDurationMonths(value) {
  const text = comparisonValue(value).toLocaleLowerCase("en-AU");
  const yearMatch = text.match(/(\d+(?:\.\d+)?)\s*years?/);
  if (yearMatch) return Number(yearMatch[1]) * 12;
  const monthMatch = text.match(/(\d+(?:\.\d+)?)\s*months?/);
  if (monthMatch) return Number(monthMatch[1]);
  const weekMatch = text.match(/(\d+(?:\.\d+)?)\s*weeks?/);
  if (weekMatch) return Number(weekMatch[1]) / 4.345;
  return null;
}

function renderSavedEmpty() {
  return `
    <div class="saved-empty">
      <strong>No saved courses yet</strong>
      <p>Search for a course, then use Save or Compare on the course row. Saved courses stay in this browser.</p>
      <a href="#courses">Search courses</a>
    </div>
  `;
}

function renderAdvisor() {
  const ranked = state.advisorRun ? advisorRankedCourses().slice(0, 6) : [];
  return `
    <form class="advisor-form" data-form="advisor">
      ${advisorQuestions.map(renderAdvisorQuestion).join("")}
      <button type="submit" class="match-btn">Find my course direction</button>
    </form>
    ${renderProcessStrip("advisor", "Scoring your answers")}
    ${state.advisorRun ? renderAdvisorResult(ranked) : `<p class="empty-note">This uses your answers, ATAR estimate and the local UAC course dataset.</p>`}
  `;
}

function renderAdvisorQuestion(question) {
  const value = state.advisor[question.key] || "";
  if (question.type === "select") {
    return `
      <label>
        <span>${escapeHtml(question.label)}</span>
        <select data-advisor-field="${escapeHtml(question.key)}">
          <option value="">Choose one</option>
          ${question.options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }
  return `
    <label>
      <span>${escapeHtml(question.label)}</span>
      <input
        data-advisor-field="${escapeHtml(question.key)}"
        type="${question.type === "number" ? "number" : "text"}"
        ${question.type === "number" ? 'min="30" max="99.95" step="0.05"' : ""}
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(question.placeholder || "")}"
      />
    </label>
  `;
}

function renderAdvisorResult(ranked) {
  const primary = ranked[0]?.course;
  const profile = advisorProfile();
  return `
    <div class="advisor-result">
      <div class="advisor-summary">
        <h3>${primary ? `Best first direction: ${highlight(primary.name)}` : "Best first direction"}</h3>
        <p>${escapeHtml(advisorSummaryText(primary, profile))}</p>
        <small>How this was decided: data scoring from course title, study area, ATAR gap, subjects, passions, preferred mode/campus and provider profile score.</small>
      </div>
      <div class="advisor-picks">
        ${ranked.map(({ course, score, reasons }, index) => `
          <article style="--item-delay:${Math.min(index, 8) * 24}ms">
            <strong>${highlight(course.name)}</strong>
            <small>${escapeHtml(course.university)} - ${escapeHtml(course.campus)} - ${term("ATAR")}: ${escapeHtml(displayRank(course.atar))}</small>
            <p>${escapeHtml(reasons.slice(0, 3).join(" "))}</p>
            <em>Fit score ${Math.round(score)}/100</em>
          </article>
        `).join("")}
      </div>
      <div class="chat-box">
        <h3>Chat with the helper</h3>
        <div class="chat-log">
          ${state.advisorChat.length ? state.advisorChat.map((message) => `
            <div class="chat-message ${message.role}${message.pending ? " pending" : ""}">
              <strong>
                ${message.role === "user" ? "You" : "Helper"}
                ${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}
              </strong>
              <p>${highlight(message.text)}</p>
            </div>
          `).join("") : `<p class="empty-note">Ask things like “which one is safest?”, “what if my ATAR is too low?”, or “compare medicine and technology”.</p>`}
        </div>
        <form class="chat-form" data-form="advisor-chat">
          <input name="message" autocomplete="off" placeholder="Ask a follow-up question" />
          <button type="submit">Ask</button>
        </form>
      </div>
    </div>
  `;
}

function renderTopProviderBlock() {
  const areas = topicOptions.filter((topic) => topic.keywords.length).map((topic) => topic.label);
  return `
    <section class="top-provider-block" aria-labelledby="specialistProviderTitle">
      <div class="top-provider-head">
        <div>
          <span class="eyebrow">Specialised rankings</span>
          <h3 id="specialistProviderTitle">Top 3 by study area</h3>
          <p>Field-specific strength and relevant Sydney course availability, kept separate from the overall profile.</p>
        </div>
        ${select("providerTopic", "Study area", areas, state.providerTopic)}
      </div>
      <div class="top-provider-grid">${renderTopProviders()}</div>
      <p class="rating-note">Specialised fit is a Course Finder planning score for this study area, not a general university ranking. Use it to find a strong shortlist, then compare the actual courses.</p>
    </section>
  `;
}

function renderTopProviders() {
  const topic = topicOptions.find((item) => item.label === state.providerTopic) || topicOptions[1];
  const quality = providerQuality[topic.label] || {};
  const rows = allProviders
    .map((provider) => {
      const courses = allCourses.filter((course) => course.providerId === provider.id);
      const relevant = courses.filter((course) => topicMatch(course, topic));
      const qualityEntry = quality[provider.id];
      const score = qualityEntry ? qualityEntry.score : Math.min(70, 42 + relevant.length * 0.25);
      return { provider, count: relevant.length, score, note: qualityEntry?.note || "Relevant Sydney course availability" };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.score - a.score || b.count - a.count || a.provider.name.localeCompare(b.provider.name))
    .slice(0, 3);

  return rows.map((row, index) => `
    <a class="top-provider-card" style="--item-delay:${Math.min(index, 8) * 22}ms" href="${escapeHtml(row.provider.website)}" target="_blank" rel="noreferrer">
      <span>${index + 1}</span>
      <img src="${escapeHtml(row.provider.logo)}" alt="${escapeHtml(row.provider.name)} logo" loading="lazy" />
      <strong>${escapeHtml(row.provider.name)}</strong>
      <small>${escapeHtml(row.note)}</small>
      <em>Specialised fit ${Math.round(row.score)}/100</em>
    </a>
  `).join("");
}

function renderProvider(provider, index = 0) {
  const profile = providerProfile(provider);
  const link = provider.website || "#courses";
  return `
    <a class="provider-card" style="--item-delay:${Math.min(index, 8) * 22}ms" href="${escapeHtml(link)}" ${provider.website ? 'target="_blank" rel="noreferrer"' : ""}>
      <div class="provider-card-heading">
        <img src="${escapeHtml(provider.logo)}" alt="${escapeHtml(provider.name)} logo" loading="lazy" />
        <div>
          <strong>${escapeHtml(provider.name)}</strong>
          <span>${escapeHtml(profile.band)}</span>
        </div>
      </div>
      <div class="provider-overall-score">
        <span>Overall site profile</span>
        <b>${profile.overall}<small>/100</small></b>
      </div>
      <p class="provider-overall-why"><b>Overall why:</b> ${escapeHtml(profile.overallWhy)}</p>
      ${profile.currentStanding ? `<span class="provider-current-standing">${escapeHtml(profile.currentStanding.shortLabel)}</span>` : ""}
      <div class="provider-specialty-score">
        <span>Strongest matched area</span>
        <strong>${escapeHtml(profile.specialty.label)} <b>${profile.specialty.score}/100</b></strong>
        <small><b>Specialised why:</b> ${escapeHtml(profile.specialty.note)}</small>
      </div>
    </a>
  `;
}

function renderProviderScoreExplainer() {
  return `
    <div class="provider-score-explainer">
      <div>
        <span class="eyebrow">How the ranking works</span>
        <h3>Two scores, for two different questions</h3>
        <p>These are Sydney Course Finder planning scores—not official university rankings, league tables or guarantees of teaching quality.</p>
      </div>
      <dl>
        <div>
          <dt>Overall site profile /100</dt>
          <dd>Blends course breadth, Sydney options, study-mode flexibility, field strength and a small current-standing signal where credible evidence is available.</dd>
        </div>
        <div>
          <dt>Specialised fit /100</dt>
          <dd>Shows the provider’s strongest matched study area. The “why” explains the particular reputation or course evidence behind it.</dd>
        </div>
        <div>
          <dt>How to use it</dt>
          <dd>Use the score to build a shortlist, then compare the actual course, accreditation, campus, entry rules, cost and support.</dd>
        </div>
      </dl>
      <p class="provider-ranking-source">
        Current standing evidence: <a href="${escapeHtml(providerCurrentStanding.UNSW.source)}" target="_blank" rel="noreferrer">QS World University Rankings 2027 places UNSW #1 in Australia and #19 globally ${icon("external")}</a>
      </p>
    </div>
  `;
}

function renderFaq() {
  const items = [
    ["What is the difference between ATAR and selection rank?", "ATAR is your rank from school results. Selection rank is what the university uses for offers and may include adjustment factors."],
    ["Should I choose prestige or the course I like?", "Use prestige as one factor, not the only factor. Course structure, accreditation, campus, internships and whether you can stay motivated matter a lot."],
    ["How important are prerequisites?", "Prerequisites can block entry. Assumed knowledge usually does not block entry, but missing it can make first year harder."],
    ["What subjects should I care about?", "For engineering, computing and science, mathematics and physics can matter. For health, biology and chemistry can help. For law, arts and business, strong English and writing skills are useful."],
    ["What if my ATAR is below the course?", "Check adjustment factors, alternative offers, diploma pathways, internal transfers and related courses with lower entry ranks."],
    ["What should I compare between universities?", "Compare commute, campus, fees, accreditation, placements, graduate employment, course flexibility, internships, support services and transfer options."],
    ["Why do some courses not show an ATAR?", "UAC may mark a course as new, unavailable, non-ATAR entry, or not reportable. The site shows those status notes when UAC publishes them."],
    ["How are university profile scores calculated?", "The overall site profile is a local planning score that blends Sydney course breadth, study-mode flexibility and field-strength signals. The specialised score is separate and shows the provider’s strongest matched study area. Neither is an official university ranking."],
    ["How should I use the income ranges?", "Use them as broad career-planning bands, not guaranteed salaries. The app maps course career fields to likely occupations and indicative Australian full-time earnings ranges; actual income depends on experience, employer, location, registration and extra study."],
    ["What if I do not have the ATAR?", "Look at selection-rank adjustments, Educational Access Scheme, Schools Recommendation Scheme, diploma pathways, TAFE-to-uni pathways, related lower-entry courses and internal transfer after first year."],
    ["Should I still apply if my ATAR is lower?", "Yes, if the course is realistic and you have backups. Put dream courses above safer options, because UAC preferences are considered in order and universities may use adjustment factors."],
    ["How current is this data?", `The local import was generated from UAC on ${(meta.importedAt || "").slice(0, 10) || "the latest import date"}. Always confirm final details on UAC or the university website before applying.`]
  ];
  return items.map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("");
}

function renderAskDrawer() {
  return `
    <div class="ask-drawer${state.askOpen ? " open" : ""}" aria-hidden="${state.askOpen ? "false" : "true"}">
      <div class="ask-backdrop" data-action="close-ask"></div>
      <aside class="ask-panel" role="dialog" aria-modal="true" aria-labelledby="askTitle">
        <div class="ask-head">
          <div>
            <div class="ask-title-row">
              <h2 id="askTitle">Ask</h2>
              ${renderAiStatusBadge()}
            </div>
            <p>${escapeHtml(askIntroCopy())}</p>
          </div>
          <button type="button" class="icon-button" data-action="close-ask" aria-label="Close Ask panel">Close</button>
        </div>
        <div class="ask-suggestions">
          ${askStarterPrompts.map((prompt) => `<button type="button" data-ask-prompt="${escapeHtml(prompt)}">${escapeHtml(prompt)}</button>`).join("")}
        </div>
        <div class="ask-log" aria-live="polite">
          ${state.askMessages.map(renderAskMessage).join("")}
        </div>
        <div class="ask-resources">
          <a href="https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/" target="_blank" rel="noreferrer">Adjustment factors ${icon("external")}</a>
          <a href="https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes" target="_blank" rel="noreferrer">EAS ${icon("external")}</a>
          <a href="https://www.uac.edu.au/future-applicants/how-to-apply-for-uni/selecting-your-course-preferences/" target="_blank" rel="noreferrer">Preferences ${icon("external")}</a>
        </div>
        <form class="ask-form" data-form="ask-chat">
          <input name="message" autocomplete="off" placeholder="Ask about bonus marks, pathways, subjects or courses" />
          <button type="submit">Ask</button>
        </form>
      </aside>
    </div>
  `;
}

function renderAskMessage(message) {
  const lines = String(message.text || "").split(/\n+/).filter(Boolean);
  return `
    <div class="ask-message ${escapeHtml(message.role)}${message.pending ? " pending" : ""}">
      <strong>
        ${message.role === "user" ? "You" : "Ask helper"}
        ${message.provider ? `<span>${escapeHtml(message.provider)}</span>` : ""}
      </strong>
      ${lines.map((line) => `<p>${highlight(line)}</p>`).join("")}
    </div>
  `;
}

async function askReply(message) {
  if (state.aiStatus?.checked && !state.aiStatus.connected) {
    return aiNotReadyReply();
  }
  const history = askConversationContext();
  try {
    const ai = await requestAiReply({
      type: "ask",
      message,
      history: state.askMessages.filter((item) => !item.pending).slice(-12),
      context: {
        conversation: history,
        courses: askCourseMatches(message, 6).map(({ course, score }) => compactAiCourse(course, score))
      }
    });
    return { text: ai.text, provider: ai.provider || "Gemini" };
  } catch (error) {
    logAiIssue("Ask AI failed:", error);
    return aiErrorReply(error);
  }
}

function renderAiStatusBadge() {
  const status = state.aiStatus || {};
  const mode = !status.checked ? "checking" : status.connected ? "on" : status.configured ? "error" : "off";
  const label = !status.checked ? "Checking AI" : status.connected ? "Gemini on" : status.configured ? "AI issue" : "AI off";
  const detail = status.connected
    ? `${status.provider || "Gemini"} is connected and grounded with this site's UAC course data.`
    : status.configured
      ? `Gemini is configured but failing: ${humanAiStatusError(status.error)}`
      : "Set GEMINI_API_KEY on the server to enable real Gemini replies.";
  return `<span class="ai-status ${mode}" title="${escapeHtml(detail)}">${escapeHtml(label)}</span>`;
}

function askIntroCopy() {
  const status = state.aiStatus || {};
  if (!status.checked) return "Checking the Gemini connection for real model replies.";
  if (status.connected) return `${status.provider || "Gemini"} is connected. Ask full follow-up questions about UAC, ATAR adjustments, subjects, courses, pathways or universities.`;
  if (status.configured) return "Gemini is configured, but the connection check is failing. The chat will show the setup issue instead of a scripted reply.";
  return "Real AI is not connected on this server yet. Set GEMINI_API_KEY to enable Gemini; until then chat answers are paused.";
}

function askIntroMessageText() {
  const status = state.aiStatus || {};
  if (!status.checked) return "Checking whether Gemini is connected for real AI replies.";
  if (status.connected) return `${status.provider || "Gemini"} is connected. Ask naturally; I will use the imported Sydney UAC course data, your chat context and search grounding when needed.`;
  if (status.configured) return `Gemini is configured but not working yet: ${humanAiStatusError(status.error)} I will not fake an answer with scripts.`;
  return "AI is not connected right now, so I will not generate scripted chat answers. To make this a real AI chat, add GEMINI_API_KEY to the server or Vercel environment, then restart/redeploy.";
}

function refreshAskIntroMessage() {
  const intro = state.askMessages.find((message) => message.intro);
  if (intro) intro.text = askIntroMessageText();
}

function aiPendingLabel() {
  return state.aiStatus?.connected ? "Gemini" : state.aiStatus?.configured ? "AI issue" : "AI not connected";
}

function aiPendingText() {
  return state.aiStatus?.connected
    ? "Asking Gemini with the course data and chat context..."
    : "Gemini is not ready, so I will show the setup issue instead of a scripted answer.";
}

function aiNotReadyReply() {
  const status = state.aiStatus || {};
  if (status.configured) {
    return {
      text: aiConnectionFailedReply(status.error || "Gemini connection check failed"),
      provider: "AI connection failed"
    };
  }
  return {
    text: "Gemini is not connected on this server yet, so I cannot answer as AI. Add GEMINI_API_KEY locally or in Vercel, restart/redeploy, then ask again.",
    provider: "AI not connected"
  };
}

function aiConnectionFailedReply(error) {
  const message = String(error?.message || error || "");
  const reason = /PERMISSION_DENIED|403|denied/i.test(message)
    ? "Google rejected this key or project with a permission error."
    : /prepayment credits are depleted|RESOURCE_EXHAUSTED|billing|credits/i.test(message)
      ? "Gemini is connected, but this Google project has depleted credits or a billing block."
      : /quota|429|rate limit/i.test(message)
        ? "Gemini is hitting a quota or rate-limit issue."
      : "Gemini failed before a model answer came back.";
  return `${reason} I am not going to fake an answer with local scripts. Use a valid Google AI Studio Gemini API key with API access enabled, then restart or redeploy the server.`;
}

function humanAiStatusError(error) {
  const message = String(error || "");
  if (/PERMISSION_DENIED|403|denied/i.test(message)) return "Google rejected the current key/project with a 403 permission error.";
  if (/prepayment credits are depleted|RESOURCE_EXHAUSTED|billing|credits/i.test(message)) return "the Google project has depleted credits or needs billing/credits fixed in AI Studio.";
  if (/quota|429|rate limit/i.test(message)) return "Gemini is hitting quota or rate limits.";
  if (/aborted|timeout|timed out/i.test(message)) return "the request timed out before Gemini answered.";
  if (/not configured|GEMINI_API_KEY/i.test(message)) return "no Gemini API key is configured.";
  return "the connection check failed.";
}

function aiErrorReply(error) {
  const message = String(error?.message || "");
  if (/GEMINI_API_KEY is not configured|not configured|missing_key/i.test(message)) {
    return { text: "Gemini is not connected on this server yet. Add GEMINI_API_KEY, restart/redeploy, then ask again.", provider: "AI not connected" };
  }
  return { text: aiConnectionFailedReply(error), provider: "AI connection failed" };
}

async function loadAiStatus() {
  try {
    const response = await fetch("/api/ai");
    if (!response.ok) throw new Error(`AI status returned ${response.status}`);
    const data = await response.json();
    state.aiStatus = {
      checked: true,
      configured: Boolean(data.configured),
      connected: Boolean(data.connected),
      provider: data.provider || "Gemini",
      model: data.model || "",
      searchGrounding: Boolean(data.searchGrounding),
      coursesAvailable: Number(data.coursesAvailable || 0),
      error: data.error || ""
    };
  } catch (error) {
    console.warn("AI status unavailable:", error);
    state.aiStatus = { checked: true, configured: false, connected: false, provider: "Gemini", model: "", error: "AI status endpoint unavailable" };
  }
  refreshAskIntroMessage();
  render();
}

function logAiIssue(label, error) {
  const message = String(error?.message || "");
  if (message.includes("GEMINI_API_KEY is not configured")) return;
  console.warn(label, error);
}

async function requestAiReply(payload) {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`AI endpoint returned ${response.status}`);
  const data = await response.json();
  if (!data.ok || !data.text) throw new Error(data.error || "AI endpoint unavailable");
  return data;
}

function compactAiCourse(course, score, reasons = []) {
  return {
    name: course.name,
    provider: course.university,
    campus: course.campus,
    code: course.courseCode,
    atar: displayRank(course.atar),
    prerequisites: truncateText(decodeHtmlEntities(course.prerequisites || ""), 260),
    assumedKnowledge: truncateText(decodeHtmlEntities(course.assumed || ""), 200),
    careers: truncateText(decodeHtmlEntities(course.careers || ""), 220),
    duration: course.duration,
    modes: course.modes || [],
    uacUrl: course.uacUrl,
    officialUrl: course.officialUrl,
    score: typeof score === "number" ? Math.round(score) : undefined,
    reasons: Array.isArray(reasons) ? reasons.slice(0, 3) : []
  };
}

function localAskReply(message, history = "") {
  const question = cleanSearchText(message);
  const context = cleanSearchText(history);
  if (!question) return "Ask me a question about UAC, ATAR, pathways, subjects or finding courses.";

  if (isVagueConfirmationFollowup(question) || isVagueChanceFollowup(question)) {
    return contextualAskFollowupReply(context, question);
  }

  if (isSchoolAdjustmentQuestion(question)) {
    return schoolAdjustmentReply(question);
  }

  if (isCourtOrHardshipQuestion(question)) {
    return "No, being a witness in a trial or having a case dismissed does not automatically give you a free ATAR or guaranteed bonus points. Your ATAR itself does not change. If the court matter seriously disrupted your schooling over time, you may be able to apply for EAS or another access scheme, but UAC or the university would need evidence and they decide eligibility. The right move is to check EAS, speak to your school careers adviser, and keep backup preferences/pathways as well.";
  }

  if (isHonoursExplainerQuestion(question)) {
    return "An honours degree is a bachelor degree with a higher-level honours component. In some courses, like Engineering (Honours), honours is built into the degree; in others, honours can be an extra research-focused year after a bachelor degree. Compared with a standard bachelor degree, honours usually means more advanced study, a major project or research component, and sometimes stronger preparation for professional accreditation, postgraduate research or competitive jobs. The exact structure differs by university, so check whether the course name means built-in honours or a separate honours year.";
  }

  if (isAdjustmentWaysQuestion(question)) {
    return adjustmentWaysReply();
  }

  if (isAdjustmentQuestion(question)) {
    return adjustmentQuestionReply(question, context);
  }

  if (isMarksFollowupQuestion(question)) {
    if (isCourtOrHardshipQuestion(context)) {
      return "No, not automatically. A court matter, being a witness, or a dismissed case does not give free ATAR points by itself, and your ATAR does not change. If it seriously disrupted your schooling over time, you may be able to apply for EAS or another access scheme with evidence, but UAC or the university decides and the adjustment depends on the course/provider.";
    }
    return "No, not automatically. Extra marks are usually selection-rank adjustments, not changes to your ATAR, and they depend on the university, course and eligibility category. Tell me the course/provider and the reason you think you may qualify, and I can point you to the right UAC or uni pathway to check.";
  }

  if (/bonus|extra point|adjust|adjustment|selection rank|scheme|points? for|marks? for/.test(question)) {
    return "There is no universal bonus-mark number. UAC and universities usually call these selection-rank adjustments, and the amount depends on the provider, course and your eligibility. Common categories include subject adjustments, location or school schemes, equity or EAS, elite athlete/performer schemes and other access programs. I can help you narrow it down if you tell me the course/provider plus your subjects or circumstances, but the exact number must be checked on UAC or that university's adjustment-factor page.";
  }

  if (/eas|educational access|disadvantage|hardship|illness|family|financial|equity/.test(question)) {
    return "EAS is for long-term educational disadvantage that affected your studies. It can increase your selection rank for some institutions, but it is not automatic for every course and it does not change your ATAR itself. Keep evidence ready, apply through UAC by the relevant deadline and still list realistic backup courses.";
  }

  if (/srs|school recommendation|early offer|early entry/.test(question)) {
    return "Schools Recommendation Scheme is an early-offer pathway using school recommendations and other criteria, not just ATAR. It can be useful if your ATAR is uncertain, but each institution decides which courses participate and what conditions apply.";
  }

  if (/\b(low atar|below|too low|miss|missed|pathway|backup|alternative|didnt get|don't get|do not get)\b/.test(question)) {
    return "If your ATAR is below a course profile, use a ladder: keep the dream course in your preferences, add related lower-entry courses, check selection-rank adjustments, EAS/SRS, diplomas, TAFE-to-uni pathways and internal transfer options after first year. For a very low ATAR, pathways and related courses usually matter more than trying to force direct entry.";
  }

  if (/prereq|prerequisite|assumed|knowledge|subject needed|required subject/.test(question)) {
    return "Prerequisites can block entry if you do not meet them. Assumed knowledge is different: it usually will not block entry, but missing it can make first year harder. On this site, expand a course row to see the imported UAC prerequisite and assumed-knowledge fields, then confirm on UAC or the university page before applying.";
  }

  if (/choose|which uni|best uni|prestige|employment|employability|graduate|between|uts|unsw|usyd|macquarie|western sydney/.test(question)) {
    if (/uts|unsw/.test(question) && /computer|software|coding|technology|it|data|cyber|artificial intelligence/.test(question)) {
      return "For computing or IT, UNSW usually wins on broad prestige and employer reputation, while UTS is very strong for industry focus, city access and practical project-style learning. Use that as a starting point, then compare the actual course structure, ATAR profile, commute, internships, flexibility and whether the subjects look like work you can keep doing for years. Do not choose only on reputation if the other course has a better fit, clearer pathway or easier commute.";
    }
    return "Use a few factors together: course accreditation, placements or industry projects, commute, campus fit, flexibility, fees/CSP status, prerequisites, student support and whether the actual day-to-day work sounds tolerable. Prestige helps, but it should not beat a course you can realistically enter, finish and use.";
  }

  if (/save|saved|library|compare button|compare tool|comparison table|comparison feature/.test(question)) {
    return "Use Save on course rows to build your library, then Compare on up to four courses to check ATAR, campus, duration, prerequisites, assumed knowledge, fees and links side by side. Different campuses stay separate, so do not delete a row just because the course name is similar.";
  }

  const matches = askCourseMatches(question, 4);
  if (/job|career|employ|income|salary|pay|money/.test(question) && matches.length) {
    return `For jobs and money, start with ${formatAskCoursesWithIncome(matches)}. These income bands are broad planning ranges, not guaranteed salaries, so compare official career outcomes, accreditation and placements before choosing.`;
  }

  if (questionMentionsCourse(question) && matches.length) {
    return `From the imported Sydney UAC records, start by checking ${formatAskCourses(matches)}. Search the course name, then expand each row for ATAR, prerequisites, assumed knowledge, campus, fees and official links.`;
  }

  if ((topicFromQuestion(question) || targetAtarFromQuestion(question) !== null) && matches.length) {
    return `Based on the imported Sydney UAC records, I would inspect ${formatAskCourses(matches)}. Use the Search page to expand each one and check ATAR, prerequisites, assumed knowledge, campus and official links.`;
  }

  if (/fee|fees|cost|csp|commonwealth|hecs|help loan/.test(question)) {
    return "Fees depend on the course, place type and student status. A CSP means the government subsidises part of the cost, and eligible students may use HECS-HELP. This site shows imported fee text when UAC lists it, but final fees must be checked on the official provider page.";
  }

  if (isConversationalFollowup(question) && context) {
    return contextualAskFollowupReply(context, question);
  }

  return "Ask me that with one more detail and I can answer properly: the course, uni, subject, ATAR estimate, school, or pathway you mean. If you are asking about points or entry, the short rule is that your ATAR itself usually does not change; only selection rank can change for eligible courses.";
}

function isCourtOrHardshipQuestion(question) {
  return /witness|trial|court|case|dismissed|legal matter|police|victim|subpoena|testif|charge|crime/.test(question)
    && /atar|bonus|mark|point|adjust|selection rank|eas|scheme|access|free/.test(question);
}

function isMarksFollowupQuestion(question) {
  return /\b(do i|get|receive|eligible|qualify|marks?|points?|bonus|adjustment)\b/.test(question)
    && /\bmarks?|points?|bonus|adjustment\b/.test(question)
    && /\b(do i|did i|can i|so|or not|eligible|qualify|get|receive)\b/.test(question);
}

function isHonoursExplainerQuestion(question) {
  return /\bhonou?rs?\b/.test(question)
    && /\b(what|mean|meaning|differ|difference|different|vs|versus|compare|how)\b/.test(question);
}

function isAdjustmentQuestion(question) {
  return /\b(atar point|points? of atar|extra atar|bonus|bonus marks?|extra points?|adjustment|selection rank|subject adjustment|school scheme|scheme|eligible|qualify)\b/.test(question)
    && /\b(atar|rank|point|points|mark|marks|subject|school|uni|university|course|eligible|qualify|get)\b/.test(question);
}

function isAdjustmentWaysQuestion(question) {
  const asksWays = /\b(how|ways?|options?|methods?|what are|what can|how can|how do|how to|get|increase|improve|lift|boost)\b/.test(question);
  const mentionsAdjustment = /\b(selection marks?|selection rank|adjustment factors?|adjustments?|bonus marks?|bonus points?|extra points?|extra marks?|atar points?|atar boost|rank boost)\b/.test(question);
  return asksWays && mentionsAdjustment;
}

function adjustmentWaysReply() {
  return "You do not get extra ATAR from selection marks. Your ATAR stays the same. What you can improve is your selection rank for a specific uni and course. The main ways are: subject adjustment factors, EAS for long-term disadvantage, SRS or early-entry schemes, school/location-based schemes, elite athlete or performer schemes, and pathway courses like diplomas or internal transfer. The exact points are different for every university and course, so you check the target course on UAC plus that uni's adjustment-factor page.";
}

function isVagueConfirmationFollowup(question) {
  return /^(ok|okay|so|yeah|yea|yep|alright|aight|wait)?\s*(so\s+)?(that\s+)?(means?|mean)\s+(i\s+)?(can|could|will|would|am eligible|qualify)\b/.test(question)
    || /^(ok|okay|so|yeah|yea|yep|alright|aight)\s*$/.test(question)
    || /\b(so that means i can|does that mean i can|so i can|can i then|so yes)\b/.test(question);
}

function isVagueChanceFollowup(question) {
  return /\b(there is a chance|there's a chance|but.*chance|so.*chance|maybe|possibly|possible|could still|could happen|not impossible)\b/.test(question)
    && question.length < 90;
}

function isConversationalFollowup(question) {
  return /^(but|wait|so|yeah|nah|no|ok|okay|what about|how about|then|and)\b/.test(question)
    || /^(why|how|what do you mean|explain|wdym)\b/.test(question)
    || question.split(" ").length <= 5;
}

function contextualAskFollowupReply(context, question = "") {
  const wantsChance = /chance|maybe|possible|could|not impossible/.test(question);
  const asksHow = /\b(how|what steps|what do i do|how do i|how can i|ok but how|but how)\b/.test(question);
  if (/subject adjustment|adjustment factor|bonus mark|bonus point|extra point|extra mark|selection rank|selection mark|eas|srs|early entry/.test(context) && asksHow) {
    return "Do it like this: first pick the exact course and university you care about. Then open the UAC course page and that uni's adjustment-factor page. Check each category: subject adjustments, EAS, SRS/early entry, school or location schemes, elite athlete/performer, and pathway entry. If you match a category, follow that scheme's application steps and evidence requirements. Then still put safer backup courses underneath because adjustments are course-specific and not guaranteed.";
  }
  if (/disadvantaged school|school scheme|location scheme|access scheme|eas|educational access|selection rank|adjustment factor|bonus|extra points|atar itself does not/.test(context)) {
    if (wantsChance) {
      return "Yes, there is a chance, but only as a selection-rank adjustment, not extra ATAR. The chance depends on the exact school, university, course and scheme. So treat it as something to check/apply for, not something to count until UAC or the uni confirms it.";
    }
    return "Not necessarily. It means you might be able to apply or be considered for a selection-rank adjustment, but you cannot assume you get points. Your ATAR itself stays the same. You need the exact school name, target university and target course, then check UAC EAS plus that university's adjustment-factor rules.";
  }
  if (/prerequisite|assumed knowledge|required subject|block entry/.test(context)) {
    if (wantsChance) {
      return "There can be a chance only if the subject is assumed knowledge or the uni accepts an equivalent. If it is a true prerequisite, you need to meet it or get official confirmation of an alternative entry route.";
    }
    return "Not necessarily. If it was a prerequisite, you need to meet it or confirm an accepted equivalent. If it was assumed knowledge, you can usually still enter, but first year may be harder without that background.";
  }
  if (/atar profile|below|pathway|backup|diploma|internal transfer/.test(context)) {
    if (wantsChance) {
      return "Yes, there can still be a chance, especially through adjustment factors, EAS/SRS, lower-entry related courses, diplomas or internal transfer. It is not a guarantee, so keep backup preferences under the dream course.";
    }
    return "Maybe, but do not rely on one path. Keep the dream course, add safer related courses, and check adjustment factors, diplomas, TAFE-to-uni options and internal transfer rules.";
  }
  if (/honours|bachelor|degree|course/.test(context)) {
    return "Yes, but it depends on the exact course wording. Some course names mean the requirement is built in; others mean there is an optional later pathway. Send the course name or uni and I will separate what is required from what is just useful.";
  }
  return "I get what you mean, but I need the thing you are referring to. Send the school, course, uni, subject or ATAR rule and I will answer it directly instead of giving a generic answer.";
}

function adjustmentQuestionReply(question, context = "") {
  const provider = providerAliasFromText(question);
  const subjects = subjectsFromQuestion(question);
  const asksNumber = /\b(how many|how much|number|amount|what.*points?|marks?)\b/.test(question);
  const asksDirectEligibility = /\b(do i|can i|will i|would i|am i|eligible|qualify|get|receive)\b/.test(question);

  if (/point of atar|atar point|extra atar|atar go up|increase my atar|free atar/.test(question)) {
    return "No. Your ATAR itself does not gain a point. What can happen is a selection-rank adjustment for a specific university and course, which may make your application rank higher than your raw ATAR for that course only.";
  }

  if (isCourtOrHardshipQuestion(question) || isCourtOrHardshipQuestion(context)) {
    return "No, not automatically. Legal/court disruption does not give free ATAR points by itself. If it caused serious educational disadvantage over time, EAS or another access scheme may be possible with evidence, but UAC or the university decides and it applies to selection rank, not your ATAR.";
  }

  if (subjects.length && provider) {
    return `Maybe. ${provider.label} may offer subject or other selection-rank adjustments for some courses, but the number depends on the exact course and scheme. Your subjects mentioned here are ${subjects.join(", ")}. Check ${provider.label}'s adjustment-factor page and the UAC entry for the exact course before relying on any points.`;
  }

  if (subjects.length) {
    return `Maybe, but not automatically. Subject adjustments depend on the university and exact course, not just the subject. You mentioned ${subjects.join(", ")}; to estimate it properly, choose the target provider and course, then check that provider's subject-adjustment rules.`;
  }

  if (provider) {
    return `Not enough info. ${provider.label} may use adjustment factors for some courses, but I need the exact course and the reason you think you qualify, such as subjects, location/school scheme, EAS, SRS or elite athlete/performer. Your ATAR itself would not change; only selection rank may change.`;
  }

  if (asksNumber || asksDirectEligibility) {
    return "Not enough info. Adjustment points are not universal. They depend on the exact university, course, year and category, such as subjects, EAS, school/location schemes, SRS or elite athlete/performer. Also, your ATAR does not change; eligible adjustments only affect selection rank for specific courses.";
  }

  return "Adjustment factors are extra selection-rank consideration, not extra ATAR. They can come from subjects, disadvantage/EAS, school or location schemes, SRS, elite athlete/performer schemes and provider-specific pathways. The exact rule must be checked against the exact university and course.";
}

function providerAliasFromText(value) {
  const clean = cleanSearchText(value);
  return providerAliases.find((group) => group.aliases.some((alias) => textMentionsAlias(clean, alias))) || null;
}

function subjectsFromQuestion(question) {
  const clean = cleanSearchText(question);
  return subjectOptions
    .filter((subject) => {
      const subjectText = cleanSearchText(subject);
      return phraseMatch(clean, subjectText) || subjectText.split(" ").some((word) => word.length > 4 && tokenMatch(clean, word));
    })
    .slice(0, 4);
}

function isSchoolAdjustmentQuestion(question) {
  const mentionsSchool = /\b[a-z]{2,6}hs\b/.test(question)
    || /\b(high school|secondary school|school|selective school|public school|private school)\b/.test(question)
    || /\b(go|going|went|attend|attending|from)\b.+\b(school|high|college)\b/.test(question);
  const asksAdjustment = /\b(extra|bonus|adjust|adjustment|selection rank|atar|point|points|mark|marks|eas|scheme|advantage)\b/.test(question);
  return mentionsSchool && asksAdjustment;
}

function schoolAdjustmentReply(question) {
  const school = schoolLabelFromQuestion(question);
  if (/disadvantaged|low ses|equity|educational disadvantage|access school/.test(question)) {
    return "Maybe, but not automatically. Going to a disadvantaged school does not raise your ATAR itself. It may help only if your exact school is recognised through EAS, a school/location scheme, or a university-specific selection-rank adjustment for the exact course you apply to. So the answer is: you can check/apply, but do not count the points until UAC or the university confirms the rule.";
  }
  return `No, not automatically${school ? ` for ${school}` : ""}. Your ATAR itself does not go up just because you attend a particular school. A school can matter only if the exact university/course recognises it through a selection-rank adjustment, access scheme, location/school scheme, EAS-style disadvantage category, or another official pathway. If the school name is an acronym like BBHS, confirm the full school name first because different schools can share initials. The safe check is: pick the target course/provider, then check that provider's adjustment-factor page and UAC access scheme information for that exact school and course.`;
}

function schoolLabelFromQuestion(question) {
  const acronym = question.match(/\b([a-z]{2,6}hs)\b/);
  if (acronym) return acronym[1].toUpperCase();
  const phrase = question.match(/\b(?:going to|go to|attend|attending|from)\s+([a-z0-9 ]{3,45}?(?:high school|secondary school|college|school|high))\b/);
  if (!phrase) return "";
  const label = cleanSearchText(phrase[1]);
  if (/^(a|an|the)\s/.test(label) || /disadvantaged school|public school|private school|selective school/.test(label)) return "";
  return titleCase(phrase[1]);
}

function titleCase(value) {
  return String(value || "").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function askReplyProvider(message, history = "") {
  const question = cleanSearchText(message);
  const context = cleanSearchText(history);
  if (isCourtOrHardshipQuestion(question)
    || isSchoolAdjustmentQuestion(question)
    || isHonoursExplainerQuestion(question)
    || isAdjustmentWaysQuestion(question)
    || isMarksFollowupQuestion(question)
    || ((isVagueConfirmationFollowup(question) || isVagueChanceFollowup(question)) && /eas|school|adjustment|selection rank|atar itself/.test(context))
    || (isConversationalFollowup(question) && /subject adjustment|adjustment factor|bonus mark|bonus point|extra point|extra mark|selection rank|selection mark|eas|srs|early entry/.test(context))
    || (isMarksFollowupQuestion(question) && isCourtOrHardshipQuestion(context))) {
    return "Local UAC guide";
  }
  return "Local guide";
}

function askConversationContext() {
  return state.askMessages
    .filter((item) => !item.pending)
    .slice(-6)
    .map((item) => `${item.role === "user" ? "Student" : "Ask helper"}: ${item.text}`)
    .join("\n");
}

function askCourseMatches(question, limit) {
  const topic = topicFromQuestion(question);
  const targetAtar = targetAtarFromQuestion(question);
  const words = tokenise(question).filter((word) => word.length > 2 && !askStopWords.has(word));
  const seen = new Set();
  return allCourses
    .map((course) => {
      const title = cleanSearchText(course.name);
      const text = primaryCourseText(course);
      const rank = numericRank(course.atar);
      let score = searchScore(course, question) * 0.04;
      if (topic) score += topicWeightedScore(course, topic) * 1.6;
      score += words.filter((word) => tokenMatch(title, word)).length * 34;
      score += words.filter((word) => tokenMatch(text, word)).length * 4;
      if (targetAtar !== null) {
        const gap = rank === null ? 99 : Math.abs(targetAtar - rank);
        score += rank !== null ? Math.max(0, 56 - gap * 3.5) : -80;
        if (gap > 12) score -= 90;
        if (rank === null) score -= 45;
        if (!/pathway|diploma|backup|low atar|alternative/.test(question) && /via diploma|^diploma|^advanced diploma/.test(title)) score -= 60;
      }
      if (course.level === "undergraduate") score += 8;
      if (rank !== null) score += 3;
      return { course, score };
    })
    .filter((entry) => entry.score > 16)
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .filter((entry) => {
      const key = `${cleanSearchText(entry.course.name)}|${entry.course.providerId}|${cleanSearchText(entry.course.campus)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function targetAtarFromQuestion(question) {
  const match = String(question).match(/\b(?:atar|around|about|near|estimate|got|with)?\s*(\d{2}(?:\.\d{1,2})?)\b/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 30 && value <= 99.95 ? value : null;
}

const askStopWords = new Set([
  "about", "with", "have", "this", "that", "what", "which", "course", "courses", "university", "uni", "study", "marks", "points", "atar", "rank", "help", "good", "best", "around"
]);

function topicFromQuestion(question) {
  return topicOptions.find((topic) => {
    if (topic.label === "All interests") return false;
    if (phraseMatch(question, topic.label)) return true;
    return topic.keywords.some((keyword) => phraseMatch(question, keyword) || tokenise(keyword).some((word) => tokenMatch(question, word)));
  });
}

function questionMentionsCourse(question) {
  return /course|degree|study|career|job|coding|programming|software|computer|medicine|medical|health|nursing|law|justice|business|commerce|finance|engineering|design|creative|teaching|education|psychology|science|food|hospitality|sport/.test(question);
}

function formatAskCourses(entries) {
  return entries.map(({ course }) => {
    const rank = displayRank(course.atar);
    return `${course.name} (${course.university}, ${course.campus}, ATAR ${rank})`;
  }).join("; ");
}

function formatAskCoursesWithIncome(entries) {
  return entries.map(({ course }) => {
    const rank = displayRank(course.atar);
    const job = courseIncomeOutcomes(course)[0];
    return `${course.name} (${course.university}, ATAR ${rank}, likely path: ${job.title} ${job.range})`;
  }).join("; ");
}

function bindEvents() {
  bindHashNavLinks();

  app.querySelector('[data-form="search"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = event.target.search.value.trim();
    state.draft = value;
    runProcessing("search", () => {
      state.query = state.draft;
      state.visible = 24;
      state.openCourseIds.clear();
    });
  });

  app.querySelector('[name="search"]')?.addEventListener("input", (event) => {
    state.draft = event.target.value;
  });

  const syncMobileFilterPanel = (open) => {
    state.mobileFiltersOpen = open;
    app.querySelector("[data-course-filter-panel]")?.classList.toggle("is-open", open);
    app.querySelector('[data-action="toggle-course-filters"]')?.setAttribute("aria-expanded", String(open));
  };
  app.querySelector('[data-action="toggle-course-filters"]')?.addEventListener("click", () => {
    syncMobileFilterPanel(!state.mobileFiltersOpen);
  });
  app.querySelectorAll('[data-action="close-course-filters"]').forEach((button) => {
    button.addEventListener("click", () => {
      syncMobileFilterPanel(false);
      if (button.classList.contains("mobile-filter-done")) {
        app.querySelector("#courses .course-list")?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() || isMobileViewport() ? "auto" : "smooth" });
      }
    });
  });

  [
    "level",
    "courseType",
    "area",
    "provider",
    "mode",
    "campus",
    "income",
    "sort",
    "duration",
    "prerequisite",
    "pathway",
    "guaranteedEntry",
    "degreeStructure"
  ].forEach((key) => {
    app.querySelector(`[data-action="${key}"]`)?.addEventListener("change", (event) => {
      const value = event.target.value;
      state[key] = value;
      if (key === "provider") syncCampusWithProvider();
      const update = () => {
        state.visible = 24;
        state.openCourseIds.clear();
      };
      runProcessing("search", update);
    });
  });

  const estimatedAtarInput = app.querySelector('[data-action="estimatedAtar"]');
  const commitEstimatedAtar = (value) => {
    runProcessing("search", () => {
      const numberValue = Number(value);
      state.estimatedAtar = value === "" || !Number.isFinite(numberValue)
        ? ""
        : String(Math.max(0, Math.min(99.95, numberValue)));
      state.allowAtarStretch = false;
      state.visible = 24;
      state.openCourseIds.clear();
    });
  };
  estimatedAtarInput?.addEventListener("change", (event) => commitEstimatedAtar(event.target.value));
  estimatedAtarInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitEstimatedAtar(event.target.value);
  });

  app.querySelector(".advanced-filter-disclosure")?.addEventListener("toggle", (event) => {
    state.advancedFiltersOpen = event.currentTarget.open;
  });

  const locationInput = app.querySelector('[data-action="locationQuery"]');
  const commitLocationInput = (value) => {
    state.locationQuery = String(value || "").trim();
    const update = () => {
      state.visible = 24;
      state.openCourseIds.clear();
    };
    runProcessing("search", update);
  };
  locationInput?.addEventListener("input", (event) => {
    state.locationQuery = event.target.value;
  });
  locationInput?.addEventListener("change", (event) => {
    commitLocationInput(event.target.value);
  });
  locationInput?.addEventListener("blur", (event) => {
    commitLocationInput(event.target.value);
  });
  locationInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitLocationInput(event.target.value);
    }
  });

  app.querySelectorAll("[data-income-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.incomeFilter || "Any income";
      state.income = value;
      if (!state.query && value !== "Any income") state.sort = "Income potential";
      const update = () => {
        state.visible = 24;
        state.openCourseIds.clear();
      };
      runProcessing("search", update);
    });
  });

  app.querySelectorAll('[data-action="clear"]').forEach((button) => {
    button.addEventListener("click", () => {
      runProcessing("search", () => {
        state.draft = "";
        state.query = "";
        state.level = "All levels";
        state.courseType = "All course types";
        state.area = "All study areas";
        state.provider = "All providers";
        state.mode = "All modes";
        state.campus = "All campuses";
        state.income = "Any income";
        state.sort = "Relevance";
        state.locationQuery = "";
        state.estimatedAtar = "";
        state.duration = "Any duration";
        state.prerequisite = "Any prerequisite status";
        state.pathway = "Any pathway status";
        state.guaranteedEntry = "Any guaranteed-entry status";
        state.degreeStructure = "Any degree structure";
        state.advancedFiltersOpen = false;
        state.allowAtarStretch = false;
        state.visible = 24;
        state.mobileFiltersOpen = false;
        state.openCourseIds.clear();
      });
    });
  });

  app.querySelector('[data-action="more"]')?.addEventListener("click", () => {
    runProcessing("search", () => {
      state.visible += 24;
    }, null, 180);
  });

  app.querySelectorAll("[data-search-example]").forEach((button) => {
    button.addEventListener("click", () => {
      runProcessing("search", () => {
        state.draft = button.dataset.searchExample || "";
        state.query = state.draft;
        state.visible = 24;
        state.openCourseIds.clear();
      }, () => scheduleHashScroll("auto"));
    });
  });

  app.querySelectorAll("[data-field-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      runProcessing("search", () => {
        state.provider = button.dataset.fieldProvider || "All providers";
        syncCampusWithProvider();
        state.visible = 24;
        state.openCourseIds.clear();
      });
    });
  });

  app.querySelector('[data-action="relax-filter"]')?.addEventListener("click", () => {
    runProcessing("search", relaxOneCourseFilter);
  });
  app.querySelector('[data-action="show-atar-stretch"]')?.addEventListener("click", () => {
    runProcessing("search", () => {
      if (!state.estimatedAtar) state.estimatedAtar = "75";
      state.allowAtarStretch = true;
      state.sort = "Lowest selection rank";
    });
  });
  app.querySelector('[data-action="show-pathways"]')?.addEventListener("click", () => {
    runProcessing("search", () => {
      state.pathway = "Pathway mentioned";
      state.advancedFiltersOpen = true;
      state.estimatedAtar = "";
      state.allowAtarStretch = false;
    });
  });
  app.querySelector('[data-action="browse-study-areas"]')?.addEventListener("click", () => {
    runProcessing("search", () => {
      state.query = "";
      state.draft = "";
      state.area = "All study areas";
    });
  });

  bindCourseActionButtons(app);

  app.querySelectorAll(".course-item[data-course-id]").forEach((courseItem) => {
    const initialCourse = courseById.get(courseItem.dataset.courseId);
    courseItem.querySelector("[data-toggle-course]")?.addEventListener("click", () => {
      const id = courseItem.dataset.courseId;
      if (!id) return;
      if (state.openCourseIds.has(id)) state.openCourseIds.delete(id);
      else state.openCourseIds.add(id);
      renderPreservingViewport();
    });
    if (state.openCourseIds.has(courseItem.dataset.courseId) && initialCourse) hydrateCourseDetail(courseItem, initialCourse);
  });

  app.querySelectorAll("[data-remove-compare]").forEach((button) => {
    button.addEventListener("click", () => {
      const transitionTarget = button.closest(".course-compare") || button.closest(".compare-tray");
      animateRemoval(transitionTarget, () => {
        state.compareIds = state.compareIds.filter((id) => id !== button.dataset.removeCompare);
        state.compareMessage = "Course removed from comparison. Your saved courses were not changed.";
        persistIdList(storageKeys.compare, state.compareIds);
        renderPreservingViewport("#saved");
      });
    });
  });

  app.querySelector('[data-action="clear-saved"]')?.addEventListener("click", () => {
    animateRemoval(app.querySelector(".saved-course-list"), () => {
      state.savedIds = [];
      persistIdList(storageKeys.saved, state.savedIds);
      renderPreservingViewport("#saved");
    });
  });

  app.querySelector('[data-action="clear-compare"]')?.addEventListener("click", () => {
    animateRemoval(app.querySelector(".course-compare"), () => {
      state.compareIds = [];
      state.compareOnlyDifferences = false;
      state.compareMessage = "Comparison cleared. Your saved courses were not changed.";
      persistIdList(storageKeys.compare, state.compareIds);
      renderPreservingViewport("#saved");
    });
  });

  app.querySelector('[data-action="toggle-compare-differences"]')?.addEventListener("click", () => {
    state.compareOnlyDifferences = !state.compareOnlyDifferences;
    renderPreservingViewport(".course-compare");
  });

  app.querySelector('[data-action="matcherProvider"]')?.addEventListener("change", (event) => {
    state.matcherProvider = event.target.value;
  });

  app.querySelector('[data-action="matcherTopic"]')?.addEventListener("change", (event) => {
    state.matcherTopic = event.target.value;
  });

  app.querySelector('[data-action="matcherIncome"]')?.addEventListener("change", (event) => {
    state.matcherIncome = event.target.value;
  });

  app.querySelectorAll("[data-atar-income-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.matcherIncome = button.dataset.atarIncomeFilter || "Any income";
      runProcessing("atar", () => {
        state.matcherRun = true;
        state.openCourseIds.clear();
      }, null, 220);
    });
  });

  app.querySelector('[data-action="providerTopic"]')?.addEventListener("change", (event) => {
    state.providerTopic = event.target.value;
    render();
  });

  app.querySelector('[data-action="add-subject"]')?.addEventListener("change", (event) => {
    if (event.target.value) {
      state.matcherSubjects.push(event.target.value);
      render();
    }
  });

  app.querySelectorAll("[data-remove-subject]").forEach((button) => {
    button.addEventListener("click", () => {
      state.matcherSubjects = state.matcherSubjects.filter((subject) => subject !== button.dataset.removeSubject);
      render();
    });
  });

  const range = app.querySelector('[data-action="atar-range"]');
  const numberInput = app.querySelector('[data-action="atar-number"]');
  const readout = app.querySelector("#atarValue");
  const updateAtar = (value, source) => {
    const next = Math.max(30, Math.min(99.95, Number(value) || 30));
    state.atar = next;
    if (source !== range) range.value = next;
    if (source !== numberInput) numberInput.value = next.toFixed(2);
    readout.textContent = next.toFixed(2);
  };
  range?.addEventListener("input", (event) => updateAtar(event.target.value, range));
  numberInput?.addEventListener("input", (event) => updateAtar(event.target.value, numberInput));

  app.querySelector('[data-action="run-atar"]')?.addEventListener("click", () => {
    const providerValue = app.querySelector('[data-action="matcherProvider"]').value;
    const topicValue = app.querySelector('[data-action="matcherTopic"]').value;
    const incomeValue = app.querySelector('[data-action="matcherIncome"]').value;
    state.matcherProvider = providerValue;
    state.matcherTopic = topicValue;
    state.matcherIncome = incomeValue;
    runProcessing("atar", () => {
      state.matcherRun = true;
      state.openCourseIds.clear();
    });
  });

  app.querySelector('[data-form="advisor"]')?.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = {};
    app.querySelectorAll("[data-advisor-field]").forEach((field) => {
      values[field.dataset.advisorField] = field.value.trim();
    });
    Object.assign(state.advisor, values);
    runProcessing("advisor", () => {
      state.advisorRun = true;
      state.advisorChat = [{
        role: "assistant",
        text: advisorOpeningMessage(advisorRankedCourses().slice(0, 3))
      }];
    });
  });

  app.querySelectorAll("[data-advisor-field]").forEach((field) => {
    field.addEventListener("input", () => {
      state.advisor[field.dataset.advisorField] = field.value;
    });
    field.addEventListener("change", () => {
      state.advisor[field.dataset.advisorField] = field.value;
    });
  });

  app.querySelector('[data-form="advisor-chat"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = event.target.message.value.trim();
    if (!message) return;
    state.advisorChat.push({ role: "user", text: message });
    const pending = { role: "assistant", text: aiPendingText(), pending: true, provider: aiPendingLabel() };
    state.advisorChat.push(pending);
    event.target.message.value = "";
    renderPreservingViewport();
    const reply = await advisorAiChatReply(message);
    pending.text = reply.text;
    pending.provider = reply.provider;
    pending.pending = false;
    renderPreservingViewport();
  });
}

function bindCourseActionButtons(root) {
  root.querySelectorAll("[data-save-course]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const courseId = button.dataset.saveCourse;
      const savedCard = button.closest(".saved-course-list .course-result-card");
      const removingSavedCard = state.savedIds.includes(courseId)
        ? button.closest(".saved-course-list .course-result-card")
        : null;
      const anchorSelector = savedCard && !removingSavedCard
        ? `#saved [data-course-id="${CSS.escape(courseId)}"]`
        : removingSavedCard
          ? "#saved"
          : "";
      animateRemoval(removingSavedCard, () => toggleSaved(courseId, anchorSelector));
    });
  });

  root.querySelectorAll("[data-compare-course]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const courseId = button.dataset.compareCourse;
      const anchorSelector = button.closest(".saved-course-list .course-result-card")
        ? `#saved [data-course-id="${CSS.escape(courseId)}"]`
        : "";
      toggleCompare(courseId, anchorSelector);
    });
  });
}

async function submitAskMessage(message) {
  const text = String(message || "").trim();
  if (!text) return;
  state.askOpen = true;
  state.askMessages.push({ role: "user", text });
  const pending = { role: "assistant", text: aiPendingText(), pending: true, provider: aiPendingLabel() };
  state.askMessages.push(pending);
  state.askMessages = state.askMessages.slice(-12);
  render();
  scrollAskToBottom();
  const reply = await askReply(text);
  pending.text = reply.text;
  pending.provider = reply.provider;
  pending.pending = false;
  state.askMessages = state.askMessages.slice(-12);
  render();
  scrollAskToBottom();
}

function scrollAskToBottom() {
  requestAnimationFrame(() => {
    const log = app.querySelector(".ask-log");
    if (log) log.scrollTop = log.scrollHeight;
  });
}

function scheduleHashScroll(behavior = "auto") {
  const hash = window.location.hash;
  if (!hash) return;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return;
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToHashTarget(id, behavior)));
}

function bindHashNavLinks() {
  app.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;
      event.preventDefault();
      navigateToHash(hash);
    });
  });
}

function navigateToHash(hash) {
  const id = decodeURIComponent(hash.slice(1));
  if (!id || !document.getElementById(id)) return;
  if (window.location.hash !== hash) {
    history.pushState(null, "", hash);
  }
  updateHashNavCurrent(hash);
  scrollToHashTarget(id, preferredHashScrollBehavior());
  window.setTimeout(scheduleIncomeWarmup, isMobileViewport() ? 80 : 300);
}

function scrollToHashTarget(id, behavior = "smooth") {
  const target = document.getElementById(id);
  if (!target) return;
  const topbar = app.querySelector(".topbar");
  const topOffset = (topbar?.getBoundingClientRect().height || 0) + 16;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - topOffset;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior: prefersReducedMotion() ? "auto" : behavior
  });
}

function updateHashNavCurrent(hash = window.location.hash || "#courses") {
  const activeHash = hash || "#courses";
  document.documentElement.classList.toggle("compare-view-active", activeHash === "#saved");
  app.querySelectorAll('.topnav a[href^="#"]').forEach((link) => {
    if (link.getAttribute("href") === activeHash) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function isMobileViewport() {
  return window.matchMedia?.("(max-width: 760px)")?.matches || window.innerWidth <= 760;
}

function preferredHashScrollBehavior() {
  return prefersReducedMotion() || isMobileViewport() ? "auto" : "smooth";
}

function select(key, label, options, value) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <select data-action="${escapeHtml(key)}">
        ${options.map((option) => `
          <option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>
            ${escapeHtml(key === "provider" || key === "matcherProvider" ? providerOptionLabel(option) : option)}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function providerOptionLabel(providerName) {
  if (providerName === "University of Technology Sydney") {
    return "UTS — University of Technology Sydney";
  }
  return providerName;
}

function textControl(key, label, value, placeholder) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input data-action="${escapeHtml(key)}" type="text" autocomplete="off" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `;
}

function numberControl(key, label, value, placeholder, min, max, step) {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input
        data-action="${escapeHtml(key)}"
        type="number"
        inputmode="decimal"
        value="${escapeHtml(value)}"
        placeholder="${escapeHtml(placeholder)}"
        min="${escapeHtml(min)}"
        max="${escapeHtml(max)}"
        step="${escapeHtml(step)}"
      />
    </label>
  `;
}

function renderDistanceNote() {
  const text = String(state.locationQuery || "").trim();
  if (!text) return "";
  const origin = resolveKnownLocation(text);
  if (!origin) {
    return `<p class="distance-note">Could not match "${escapeHtml(text)}" yet. Try a Sydney suburb or postcode such as Sydney, Chatswood, Bondi Junction, Parramatta, Blacktown, Liverpool, Bankstown, Greenacre, Campbelltown, Penrith, North Sydney, Macquarie Park, Kensington, Camperdown, 2190 or 2150.</p>`;
  }
  return `<p class="distance-note">Distance sorting uses approximate straight-line distance from ${escapeHtml(origin.label)} to the listed campus suburb. Use it as a commute shortcut, then check transport time.</p>`;
}

function row(label, value, valueClass = "") {
  return `
    <div>
      <dt>${highlight(label)}</dt>
      <dd${valueClass ? ` class="${escapeHtml(valueClass)}"` : ""}>${fieldValue(value || "Not listed")}</dd>
    </div>
  `;
}

function compareCell(value) {
  const text = decodeHtmlEntities(value || "Not listed").trim() || "Not listed";
  return highlight(truncateText(text, 180));
}

function advisorProfile() {
  const text = [
    state.advisor.subjects,
    state.advisor.passions,
    state.advisor.strengths,
    state.advisor.workStyle,
    state.advisor.careerPriority
  ].join(" ");
  const topicScores = topicOptions
    .filter((topic) => topic.label !== "All interests")
    .map((topic) => ({
      topic,
      score: topic.keywords.reduce((sum, keyword) => sum + (phraseMatch(text, keyword) ? 2 : tokenise(keyword).some((word) => tokenMatch(text, word)) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score);
  const fallbackTopic = topicOptions.find((topic) => topic.label === state.advisor.passions) || topicOptions[1];
  return {
    atar: Number(state.advisor.atar) || 75,
    topic: topicScores[0]?.score > 0 ? topicScores[0].topic : fallbackTopic,
    text: cleanSearchText(text),
    avoid: cleanSearchText(state.advisor.avoid),
    avoidProviders: avoidedProviderLabels(state.advisor.avoid),
    mode: state.advisor.studyMode || "Any mode",
    campus: state.advisor.campus || "Any Sydney campus",
    careerPriority: state.advisor.careerPriority || "High employability",
    pathways: state.advisor.pathways || "Maybe"
  };
}

function advisorRankedCourses() {
  const profile = advisorProfile();
  return allCourses
    .map((course) => advisorScoreCourse(course, profile))
    .filter((entry) => entry.score > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function advisorScoreCourse(course, profile) {
  const rank = numericRank(course.atar);
  const text = courseText(course);
  const topicScore = topicWeightedScore(course, profile.topic);
  const subjectWords = tokenise(state.advisor.subjects);
  const passionWords = tokenise(state.advisor.passions);
  const subjectScore = subjectWords.filter((word) => tokenMatch(text, word)).length * 4;
  const passionScore = passionWords.filter((word) => tokenMatch(text, word)).length * 5;
  const gap = rank === null ? 0 : profile.atar - rank;
  const atarScore = rank === null ? 6 : gap >= 0 ? 22 - Math.min(gap, 16) * 0.35 : Math.max(0, 18 - Math.abs(gap) * 2.2);
  const modeScore = profile.mode === "Any mode" || (course.modes || []).includes(profile.mode) ? 7 : 0;
  const campusScore = campusPreferenceScore(course, profile.campus);
  const providerScore = searchProviderQuality(course, profile.topic.label) * 0.12;
  const careerScore = careerPriorityScore(course, profile.careerPriority);
  const avoidPenalty = tokenise(profile.avoid).filter((word) => tokenMatch(text, word)).length * 8 + providerAvoidPenalty(course, profile.avoid);
  const pathwayBoost = profile.pathways !== "No" && /diploma|pathway|via diploma/i.test(course.name) ? 6 : 0;
  const score = Math.max(0, topicScore * 0.3 + subjectScore + passionScore + atarScore + modeScore + campusScore + providerScore + careerScore + pathwayBoost - avoidPenalty);
  const reasons = advisorReasons(course, profile, gap, rank, topicScore, modeScore, campusScore);
  return { course, score: Math.min(100, score), reasons };
}

function campusPreferenceScore(course, preference) {
  const campus = cleanSearchText(course.campus);
  if (!preference || preference === "Any Sydney campus") return 5;
  if (preference === "Online") return (course.modes || []).includes("Online") || campus.includes("online") ? 8 : 0;
  if (preference === "City / inner Sydney") return /city|kensington|camperdown|darlington|sydney|broadway|surry/.test(campus) ? 8 : 0;
  if (preference === "Western Sydney") return /western|parramatta|penrith|campbelltown|blacktown|bankstown|liverpool/.test(campus) ? 8 : 0;
  if (preference === "North Sydney / Macquarie") return /north|macquarie|ryde/.test(campus) ? 8 : 0;
  return 0;
}

function careerPriorityScore(course, priority) {
  const text = courseText(course);
  if (priority === "Helping people") return /health|nursing|medicine|education|teaching|social|psychology|counselling/.test(text) ? 8 : 0;
  if (priority === "Creative freedom") return /design|creative|music|animation|media|arts|film|screen/.test(text) ? 8 : 0;
  if (priority === "High income potential") return /engineering|computer|software|data|commerce|finance|law|medical/.test(text) ? 8 : 0;
  if (priority === "High employability") return /teaching|nursing|engineering|computer|cyber|accounting|health|construction/.test(text) ? 8 : 0;
  if (priority === "Lower ATAR risk") return numericRank(course.atar) !== null && numericRank(course.atar) <= Number(state.advisor.atar) ? 8 : 0;
  if (priority === "Prestige") return courseProviderScore(course) * 0.08;
  return 4;
}

function providerAvoidPenalty(course, avoidText) {
  const avoided = avoidedProviderGroups(avoidText);
  return avoided.some((group) => courseMatchesProviderGroup(course, group)) ? 72 : 0;
}

function avoidedProviderLabels(value) {
  return avoidedProviderGroups(value).map((group) => group.label);
}

function avoidedProviderGroups(value) {
  const clean = cleanSearchText(value);
  if (!clean) return [];
  return providerAliases.filter((group) => group.aliases.some((alias) => textMentionsAlias(clean, alias)));
}

function courseMatchesProviderGroup(course, group) {
  if (!group) return false;
  if (course.providerId) return course.providerId === group.id;
  const providerText = cleanSearchText(`${course.providerId} ${course.university}`);
  return group.aliases.some((alias) => textMentionsAlias(providerText, alias));
}

function textMentionsAlias(cleanText, alias) {
  const cleanAlias = cleanSearchText(alias);
  if (!cleanAlias) return false;
  if (cleanAlias.length <= 4 || !cleanAlias.includes(" ")) {
    return new RegExp(`\\b${escapeRegExp(cleanAlias)}\\b`).test(cleanText);
  }
  return phraseMatch(cleanText, cleanAlias);
}

function advisorReasons(course, profile, gap, rank, topicScore, modeScore, campusScore) {
  const reasons = [];
  if (topicScore > 0) reasons.push(`Matches your ${profile.topic.label.toLowerCase()} interests.`);
  if (rank !== null) reasons.push(gap >= 0 ? `ATAR profile is ${gap.toFixed(1)} below your estimate.` : `ATAR profile is ${Math.abs(gap).toFixed(1)} above your estimate, so keep a pathway backup.`);
  if (modeScore) reasons.push("Study mode fits your preference.");
  if (campusScore) reasons.push("Campus preference is a reasonable fit.");
  if (!reasons.length) reasons.push("Included as a broad match from the UAC dataset.");
  return reasons;
}

function advisorSummaryText(primary, profile) {
  if (!primary) return "I could not find a confident match from the current answers. Try adding more subjects, interests or a broader career direction.";
  const rank = numericRank(primary.atar);
  const atarLine = rank === null ? "UAC does not list a numeric ATAR profile for it." : `Its listed ATAR profile is ${displayRank(primary.atar)} against your estimate of ${profile.atar}.`;
  return `${primary.name} is the strongest first direction because it matches your ${profile.topic.label.toLowerCase()} pattern, preferences and available UAC data. ${atarLine}`;
}

function advisorOpeningMessage(ranked) {
  if (!ranked.length) return "I need a little more detail to make a useful recommendation. Add subjects, interests and what kind of work sounds good.";
  const names = ranked.map((entry) => entry.course.name).join(", ");
  return `Based on the course data first, I would start by comparing: ${names}. Ask me about safety, ATAR risk, pathways, careers or which one fits you best.`;
}

function advisorChatReply(message) {
  const question = cleanSearchText(message);
  const ranked = advisorRankedCourses().slice(0, 4);
  const profile = advisorProfile();
  const primary = ranked[0]?.course;
  if (!primary) return "I need more answers first. Fill in subjects, passions and ATAR, then run the helper.";
  if (isProviderWhyQuestion(question)) {
    return providerWhyReply(question, ranked, profile);
  }
  if (isOtherUniOptionsQuestion(question)) {
    return otherUniOptionsReply(ranked, profile);
  }
  if (/atar|low|rank|entry|pathway|backup/.test(question)) {
    return `For ATAR risk, start with ${primary.name}, then keep pathway options open: adjustment factors, EAS/SRS, diploma pathways and related lower-entry courses. If a course is above your estimate by more than about 3 points, treat it as possible but not safe.`;
  }
  if (/compare|which|best|choose/.test(question)) {
    return `My data-first pick is ${primary.name}. Compare it against ${ranked.slice(1).map((entry) => entry.course.name).join(" and ")} by ATAR gap, campus commute, prerequisites and whether the career actually sounds like your day-to-day life.`;
  }
  if (/job|career|employ|money|salary/.test(question)) {
    return `${primary.name} looks strongest from your answers, but for career confidence check the course careers section, placements, accreditation and graduate outcomes. Prefer courses with practical experience if employability is your main concern.`;
  }
  if (/subject|prereq|math|english|science/.test(question)) {
    return `Check prerequisites first because they can block entry. Assumed knowledge is different: it usually will not block entry, but missing maths/science background can make first year harder.`;
  }
  return `I would keep ${primary.name} as your first serious option from the data. The next decision should be: do you like the actual subjects, can you meet entry requirements, and is the campus/pathway realistic?`;
}

function isProviderWhyQuestion(question) {
  return /\bwhy\b/.test(question) && /\b(uni|university|provider|campus|wsu|uts|unsw|usyd|macquarie|acu|western sydney)\b/.test(question);
}

function isOtherUniOptionsQuestion(question) {
  return /\b(other|another|alternative|alternatives|else|more|different|options?)\b/.test(question)
    && /\b(uni|unis|university|universities|provider|providers|campus|course|courses|option|options)\b/.test(question);
}

function otherUniOptionsReply(ranked, profile) {
  const primary = ranked[0]?.course;
  const options = uniAlternativeOptions(profile, primary).slice(0, 4);
  if (!options.length) return "I could not find strong alternative university options from the current answers. Try broadening the campus preference or removing anything in the avoid box, then run the helper again.";
  const intro = primary
    ? `Yes. If you are not locked into ${primary.university}, compare these Sydney options:`
    : "Other Sydney university options to compare:";
  const lines = options.map(({ course }) => `${course.university}: ${course.name} (${course.campus}, ATAR ${displayRank(course.atar)})`).join("; ");
  return `${intro} ${lines}. Shortlist two or three, then compare commute, prerequisites, assumed knowledge, course projects/placements and official career outcomes.`;
}

function uniAlternativeOptions(profile, primary) {
  const seenProviders = new Set(primary?.providerId ? [primary.providerId] : []);
  return allCourses
    .map((course) => advisorScoreCourse(course, profile))
    .filter(({ course, score }) => {
      if (primary && course.id === primary.id) return false;
      if (score < 18) return false;
      if (course.level && course.level !== "undergraduate") return false;
      if (profile.campus !== "Online" && /^online$/i.test(String(course.campus || "").trim())) return false;
      if (!isTopicAlternativeCourse(course, profile)) return false;
      const title = cleanSearchText(course.name);
      if (profile.atar >= 65 && /^advanced diploma|^diploma|via diploma/.test(title)) return false;
      return true;
    })
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .filter(({ course }) => {
      if (seenProviders.has(course.providerId)) return false;
      seenProviders.add(course.providerId);
      return true;
    });
}

function isTopicAlternativeCourse(course, profile) {
  const title = cleanSearchText(course.name);
  if (profile.topic.label === "Technology") {
    return /information technology|computer|computing|software|data|cyber|artificial intelligence|games|game development|information systems|analytics|programming|coding|interactive technology/.test(title);
  }
  return topicWeightedScore(course, profile.topic) > 0;
}

function providerWhyReply(question, ranked, profile) {
  const mentioned = providerAliases.find((group) => group.aliases.some((alias) => textMentionsAlias(question, alias)));
  const targetEntry = mentioned ? ranked.find(({ course }) => courseMatchesProviderGroup(course, mentioned)) : ranked[0];
  const course = targetEntry?.course || ranked[0]?.course;
  if (!course) return "I cannot explain the provider yet because there is no ranked course. Run the helper first.";

  if (mentioned && !targetEntry) {
    const avoided = profile.avoidProviders.includes(mentioned.label);
    const rank = numericRank(course.atar);
    const atarLine = rank === null ? "entry safety still needs an official check" : `its imported ATAR profile is ${displayRank(course.atar)} against your ${profile.atar} estimate`;
    const quality = providerQuality[profile.topic.label]?.[course.providerId];
    const qualityLine = quality?.note ? `The provider note for ${course.university} is: ${quality.note.toLowerCase()}.` : `${course.university} matched the course/provider scoring better in this run.`;
    return `${mentioned.label} is not in the current top picks${avoided ? " because you put it in the avoid box and the helper penalised it heavily" : " because the other providers scored better from your answers"}. The current first option is ${course.name} at ${course.university}: it matches your ${profile.topic.label.toLowerCase()} direction, ${atarLine}, and your campus/mode settings. ${qualityLine}`;
  }

  const group = mentioned || providerAliases.find((item) => courseMatchesProviderGroup(course, item));
  const providerName = group?.label || course.university;
  const quality = providerQuality[profile.topic.label]?.[course.providerId];
  const avoided = profile.avoidProviders.includes(providerName);
  const rank = numericRank(course.atar);
  const atarLine = rank === null ? "it has no numeric imported ATAR profile" : `its imported ATAR profile is ${displayRank(course.atar)} against your ${profile.atar} estimate`;
  const providerLine = quality?.note ? `${providerName} also gets a provider-profile boost here because: ${quality.note.toLowerCase()}.` : `${providerName} appears because the course matched your topic, campus and entry pattern better than many alternatives.`;
  const avoidLine = avoided ? `You also said to avoid ${providerName}, so I now penalise it heavily. If it still appears, it means the course fit is strong or there are not many better non-${providerName} options in the current answers.` : "";
  const alternatives = ranked
    .filter(({ course: item }) => item.id !== course.id)
    .slice(0, 2)
    .map(({ course: item }) => `${item.name} at ${item.university}`)
    .join("; ");
  return `${providerName}: it was not chosen just because of the brand. ${course.name} matched your ${profile.topic.label.toLowerCase()} direction, ${atarLine}, and the campus/mode settings were considered. ${providerLine} ${avoidLine} Compare it with ${alternatives || "the next saved courses"} before deciding.`;
}

async function advisorAiChatReply(message) {
  if (state.aiStatus?.checked && !state.aiStatus.connected) {
    return aiNotReadyReply();
  }
  const ranked = advisorRankedCourses().slice(0, 6);
  try {
    const ai = await requestAiReply({
      type: "advisor",
      message,
      history: state.advisorChat.filter((item) => !item.pending).slice(-12),
      context: {
        profile: advisorProfile(),
        answers: state.advisor,
        rankedCourses: ranked.map(({ course, score, reasons }) => compactAiCourse(course, score, reasons))
      }
    });
    return { text: ai.text, provider: ai.provider || "Gemini" };
  } catch (error) {
    logAiIssue("Advisor AI failed:", error);
    return aiErrorReply(error);
  }
}

function searchScore(course, queryOrPlan) {
  const plan = typeof queryOrPlan === "object" && queryOrPlan
    ? queryOrPlan
    : searchQueryPlan(queryOrPlan);
  if (!plan.cleanQuery) return 0;
  if (plan.provider && !courseMatchesProviderGroup(course, plan.provider)) return -1000000;
  const cleanQuery = plan.contentQuery;
  const { title, code, provider, campus, area, summary, careers, primary } = courseSearchFields(course);
  const words = plan.contentTokens;
  const orderedTitleMatch = words.length > 1 && new RegExp(words.map(escapeRegExp).join(".*")).test(title);
  const topic = topicForQuery(cleanQuery);
  const incomeMinimum = incomeMinimumFromQuery(cleanQuery);
  let score = plan.provider ? 60000 : 0;

  if (!cleanQuery) return score + providerOnlyCourseScore(course);
  if (title === cleanQuery) score += 90000;
  if (exactDegreeTitle(title, cleanQuery)) score += topic ? 32000 : 85000;
  if (title.startsWith(cleanQuery)) score += 42000;
  if (phraseMatch(title, cleanQuery)) score += 36000 + Math.max(0, 5000 - title.indexOf(cleanQuery) * 120);
  score += weightedAliasMatchScore(title, cleanQuery);
  if (orderedTitleMatch) score += 22000;
  if (code === cleanQuery) score += 6500;
  if (phraseMatch(provider, cleanQuery)) score += 1200;
  if (phraseMatch(campus, cleanQuery)) score += 300;
  if (phraseMatch(area, cleanQuery) || aliasMatch(area, cleanQuery)) score += 4200;
  if (phraseMatch(careers, cleanQuery) || aliasMatch(careers, cleanQuery)) score += 2600;
  if (phraseMatch(summary, cleanQuery) || aliasMatch(summary, cleanQuery)) score += 80;
  if (topic) score += topicWeightedScore(course, topic) * 120;
  score += words.filter((word) => tokenMatch(title, word)).length * 3500;
  score += words.filter((word) => tokenMatch(primary, word)).length * 70;
  if (course.level === "undergraduate") score += 250;
  if (numericRank(course.atar) !== null) score += 20;
  if (!/\b(diploma|certificate|pathway|foundation)\b/.test(cleanQuery)) {
    const qualification = courseTypeLabel(course);
    if (qualification === "Bachelor" || qualification === "Honours" || qualification === "Double degree") score += 6000;
    if (qualification === "Diploma" || qualification === "Advanced Diploma" || qualification === "Undergraduate Certificate") score -= 6000;
  }
  if (incomeMinimum && courseIncomeOutcomes(course).some((job) => job.max >= incomeMinimum)) score += 3200;
  score += searchProviderQuality(course, cleanQuery);
  return score;
}

function courseSearchMatch(course, queryOrPlan) {
  const plan = typeof queryOrPlan === "object" && queryOrPlan
    ? queryOrPlan
    : searchQueryPlan(queryOrPlan);
  if (plan.provider && !courseMatchesProviderGroup(course, plan.provider)) return false;
  if (!plan.contentQuery) return Boolean(plan.provider);
  const fields = courseSearchFields(course);
  const primaryText = fields.primary;
  const focusedText = cleanSearchText([fields.title, fields.area, fields.careers].join(" "));
  const query = plan.contentQuery;
  const words = plan.contentTokens;
  const topic = topicForQuery(query);
  const incomeMinimum = incomeMinimumFromQuery(query);
  if (plan.provider) {
    if (phraseMatch(focusedText, query)) return true;
    if (focusedAliasMatch(focusedText, query)) return true;
    if (words.length > 1 && words.every((word) => tokenMatch(focusedText, word))) return true;
    if (words.length === 1 && tokenMatch(focusedText, words[0])) return true;
    if (incomeMinimum && courseIncomeOutcomes(course).some((job) => job.max >= incomeMinimum)) return true;
    return false;
  }
  if (phraseMatch(primaryText, query)) return true;
  if (aliasMatch(primaryText, query)) return true;
  if (words.length > 1 && words.every((word) => tokenMatch(primaryText, word))) return true;
  if (words.length === 1 && tokenMatch(primaryText, words[0])) return true;
  if (topic && isBroadTopicQuery(query) && topicWeightedScore(course, topic) >= 35) return true;
  if (incomeMinimum && courseIncomeOutcomes(course).some((job) => job.max >= incomeMinimum)) return true;
  return false;
}

function renderSearchInterpretation() {
  const query = cleanSearchText(state.query);
  if (!query) return "";
  const plan = searchQueryPlan(query);
  const notes = [];
  if (plan.wasExpanded) {
    notes.push(`Understood <strong>${escapeHtml(query)}</strong> as <strong>${escapeHtml(plan.expandedQuery)}</strong>`);
  }
  if (plan.wasCorrected) {
    notes.push(`Corrected spelling to <strong>${escapeHtml(plan.correctedQuery)}</strong>`);
  }
  if (plan.provider) {
    notes.push(`Searching <strong>${escapeHtml(plan.provider.label)}</strong>${plan.contentQuery ? ` for <strong>${escapeHtml(plan.contentQuery)}</strong>` : ""}`);
  }
  if (!notes.length) return "";
  return `<p class="search-interpretation" role="status">${notes.join(" · ")}</p>`;
}

function currentSearchTopic() {
  if (state.area !== "All study areas") {
    return topicOptions.find((topic) => topic.label === state.area) || null;
  }
  const plan = state.query ? searchQueryPlan(state.query) : null;
  return plan?.contentQuery ? topicForQuery(plan.contentQuery) : null;
}

function providerFieldSignal(course, topic = currentSearchTopic()) {
  if (!topic) return null;
  const curated = providerQuality[topic.label]?.[course.providerId];
  if (curated) return { ...curated, curated: true };
  const provider = allProviders.find((item) => item.id === course.providerId);
  const inferred = provider ? providerProfile(provider).topicRows.find((row) => row.label === topic.label) : null;
  return inferred ? { score: inferred.score, note: inferred.note, curated: false } : null;
}

function renderSearchFieldLeaders(results) {
  const topic = currentSearchTopic();
  if (!topic || state.provider !== "All providers") return "";
  const seen = new Set();
  const leaders = results
    .map((course) => ({ course, signal: providerFieldSignal(course, topic) }))
    .filter(({ course, signal }) => {
      if (!signal || seen.has(course.providerId)) return false;
      seen.add(course.providerId);
      return true;
    })
    .sort((a, b) => b.signal.score - a.signal.score || courseProviderScore(b.course) - courseProviderScore(a.course))
    .slice(0, 3);
  if (leaders.length < 2) return "";
  return `
    <aside class="search-field-leaders" aria-label="Strong providers for ${escapeHtml(topic.label)}">
      <div class="field-leader-intro">
        <span>Strong providers for this field</span>
        <strong>${escapeHtml(topic.label)}</strong>
        <small>Course relevance comes first. Field strength then helps order similar matches.</small>
      </div>
      <div class="field-leader-list">
        ${leaders.map(({ course, signal }, index) => `
          <button type="button" class="field-leader" data-field-provider="${escapeHtml(course.university)}">
            <span class="field-leader-rank">${index + 1}</span>
            <img src="${escapeHtml(course.providerLogo)}" alt="" loading="lazy" />
            <span>
              <strong>${escapeHtml(course.university)}</strong>
              <small>${escapeHtml(signal.note)}</small>
            </span>
          </button>
        `).join("")}
      </div>
      <p>This is a Course Finder planning signal, not an official league table. It blends subject standing with relevant Sydney course availability. <a href="https://www.topuniversities.com/subject-rankings" target="_blank" rel="noreferrer">Check QS subject rankings ${icon("external")}</a></p>
    </aside>
  `;
}

function preferenceScore(course) {
  const topic = topicOptions.find((item) => item.label === state.matcherTopic);
  const topicScore = topic && topic.label !== "All interests" ? topicWeightedScore(course, topic) : 0;
  const subjectScore = state.matcherSubjects.reduce((score, subject) => {
    const words = normalise(subject).split(/\s+/).filter(Boolean);
    const priorityText = normalise([course.name, course.area, course.prerequisites, course.assumed].join(" "));
    const fullText = courseText(course);
    if (words.some((word) => priorityText.includes(word))) return score + 22;
    return score + (words.some((word) => fullText.includes(word)) ? 8 : 0);
  }, 0);
  return topicScore + subjectScore;
}

function topicMatch(course, topic) {
  return topicWeightedScore(course, topic) > 0;
}

function topicWeightedScore(course, topic) {
  if (!topic || !topic.keywords.length) return 0;
  let courseCache = topicScoreCache.get(course);
  if (!courseCache) {
    courseCache = new Map();
    topicScoreCache.set(course, courseCache);
  }
  if (courseCache.has(topic.label)) return courseCache.get(topic.label);

  const title = cleanSearchText(course.name);
  const area = cleanSearchText(course.area);
  const careers = cleanSearchText(course.careers);
  const summary = cleanSearchText(course.summary);
  const score = topic.keywords.reduce((sum, keyword) => {
    const word = cleanSearchText(keyword);
    if (phraseMatch(title, word)) return sum + 60;
    if (phraseMatch(area, word)) return sum + 35;
    if (phraseMatch(careers, word)) return sum + 18;
    if (phraseMatch(summary, word)) return sum + 6;
    return sum;
  }, 0);
  courseCache.set(topic.label, score);
  return score;
}

function topicForQuery(query) {
  const clean = cleanSearchText(query);
  if (clean.length < 3) return null;
  return topicOptions.find((topic) => {
    if (topic.label === "All interests") return false;
    const label = normalise(topic.label);
    if (label.includes(clean) || clean.includes(label)) return true;
    return topic.keywords.some((keyword) => {
      const word = normalise(keyword);
      return clean === word || clean.includes(word) || word.includes(clean);
    });
  });
}

function courseText(course) {
  if (courseTextCache.has(course)) return courseTextCache.get(course);
  const text = cleanSearchText([
    course.name,
    course.courseCode,
    course.university,
    course.campus,
    course.area,
    course.summary,
    course.prerequisites,
    course.assumed,
    course.careers,
    course.practicalExperience
  ].join(" "));
  courseTextCache.set(course, text);
  return text;
}

function primaryCourseText(course) {
  if (primaryCourseTextCache.has(course)) return primaryCourseTextCache.get(course);
  const text = cleanSearchText([
    course.name,
    course.courseCode,
    course.university,
    course.campus,
    course.area,
    course.summary,
    course.careers,
    course.practicalExperience
  ].join(" "));
  primaryCourseTextCache.set(course, text);
  return text;
}

function courseSearchFields(course) {
  if (searchFieldCache.has(course)) return searchFieldCache.get(course);
  const fields = {
    title: cleanSearchText(course.name),
    code: cleanSearchText(course.courseCode),
    provider: cleanSearchText(course.university),
    campus: cleanSearchText(course.campus),
    area: cleanSearchText(course.area),
    summary: cleanSearchText(course.summary),
    careers: cleanSearchText(course.careers),
    primary: primaryCourseText(course)
  };
  searchFieldCache.set(course, fields);
  return fields;
}

function numericRank(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function courseLevels(course) {
  return Array.isArray(course.levels) && course.levels.length ? course.levels : [course.level].filter(Boolean);
}

function levelDisplay(course) {
  return courseLevels(course).map((level) => levelLabels[level] || level).join(" + ");
}

function displayRank(value) {
  const parsed = numericRank(value);
  if (parsed !== null) return parsed.toFixed(parsed % 1 ? 2 : 0);
  const code = String(value || "").trim();
  if (!code || code === "0") return "Not listed by UAC.";
  return rankCodeMeanings[code] || code;
}

function hasSpecificInfo(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && text !== "not listed" && text !== "not listed by uac." && text !== "check official course page.");
}

function highlight(value) {
  const words = Object.keys(glossary).sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return escapeHtml(decodeHtmlEntities(value || "")).replace(new RegExp(`\\b(${words})\\b`, "gi"), (match) => term(match));
}

function term(label) {
  const key = Object.keys(glossary).find((item) => item.toLowerCase() === String(label).toLowerCase());
  return key ? `<span class="term" tabindex="0" data-tip="${escapeHtml(glossary[key])}">${escapeHtml(label)}</span>` : escapeHtml(label);
}

function icon(name) {
  const paths = {
    search: '<path d="m21 21-4.2-4.2"/><circle cx="11" cy="11" r="7"/>',
    filter: '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function normalise(value) {
  return String(value || "").toLowerCase();
}

function cleanSearchText(value) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const searchStopWords = new Set(["a", "an", "at", "course", "courses", "degree", "degrees", "for", "in", "of", "program", "programs", "study", "the"]);

function searchQueryPlan(value) {
  const cleanQuery = cleanSearchText(value);
  if (!cleanQuery) {
    return {
      cacheKey: "",
      cleanQuery: "",
      correctedQuery: "",
      expandedQuery: "",
      contentQuery: "",
      contentTokens: [],
      provider: null,
      providerAlias: "",
      wasCorrected: false,
      wasExpanded: false
    };
  }
  if (searchQueryPlanCache.has(cleanQuery)) return searchQueryPlanCache.get(cleanQuery);

  const lexicon = ensureSearchLexicon();
  const expansion = expandSearchIntentQuery(cleanQuery);
  const originalTokens = tokenise(expansion.query);
  const correctedTokens = originalTokens.map((token) => correctSearchToken(token, lexicon));
  const correctedQuery = correctedTokens.join(" ");
  const providerMatch = providerSearchIntent(correctedQuery);
  const providerAliasTokens = new Set(tokenise(providerMatch?.alias || ""));
  const contentTokens = correctedTokens.filter((token) =>
    !searchStopWords.has(token) && !providerAliasTokens.has(token)
  );
  const contentQuery = contentTokens.join(" ");
  const plan = {
    cacheKey: `${correctedQuery}|${providerMatch?.group.id || ""}|${contentQuery}`,
    cleanQuery,
    correctedQuery,
    expandedQuery: expansion.query,
    contentQuery,
    contentTokens,
    provider: providerMatch?.group || null,
    providerAlias: providerMatch?.alias || "",
    wasCorrected: correctedQuery !== expansion.query,
    wasExpanded: expansion.query !== cleanQuery
  };
  searchQueryPlanCache.set(cleanQuery, plan);
  return plan;
}

function expandSearchIntentQuery(value) {
  const original = cleanSearchText(value);
  let query = original;
  const orderedAliases = [...searchIntentAliases]
    .sort((left, right) => tokenise(right[0]).length - tokenise(left[0]).length || right[0].length - left[0].length);
  for (const [alias, replacement] of orderedAliases) {
    const pattern = new RegExp(`(^|\\s)${escapeRegExp(alias)}(?=\\s|$)`, "g");
    query = query.replace(pattern, (_, leadingSpace) => `${leadingSpace}${replacement}`);
  }
  return { query: cleanSearchText(query), original };
}

function providerSearchIntent(cleanQuery) {
  const matches = providerAliases.flatMap((group) =>
    group.aliases.map((alias) => ({ group, alias: cleanSearchText(alias) }))
  )
    .filter(({ alias }) => textMentionsAlias(cleanQuery, alias))
    .sort((a, b) => tokenise(b.alias).length - tokenise(a.alias).length || b.alias.length - a.alias.length);
  return matches[0] || null;
}

function ensureSearchLexicon() {
  if (searchLexicon) return searchLexicon;
  const counts = new Map();
  const add = (value, weight = 1) => {
    tokenise(value).forEach((token) => {
      if (!/^[a-z][a-z0-9]*$/.test(token) || token.length < 3) return;
      counts.set(token, (counts.get(token) || 0) + weight);
    });
  };

  Object.entries(searchAliases).forEach(([query, aliases]) => {
    add(query, 40);
    aliases.forEach((alias) => add(alias, 24));
  });
  providerAliases.forEach((group) => {
    add(group.label, 50);
    group.aliases.forEach((alias) => add(alias, 60));
  });
  topicOptions.forEach((topic) => {
    add(topic.label, 30);
    topic.keywords.forEach((keyword) => add(keyword, 20));
  });
  allCourses.forEach((course) => {
    add(course.name, 10);
    add(course.university, 8);
    add(course.area, 3);
    add(course.careers, 1);
  });

  searchLexicon = [...counts.entries()].map(([token, weight]) => ({ token, weight }));
  return searchLexicon;
}

function correctSearchToken(token, lexicon = ensureSearchLexicon()) {
  if (token.length < 4 || lexicon.some((entry) => entry.token === token)) return token;
  const maxDistance = token.length >= 8 ? 2 : 1;
  let best = null;
  for (const candidate of lexicon) {
    if (Math.abs(candidate.token.length - token.length) > maxDistance) continue;
    const distance = boundedDamerauLevenshtein(token, candidate.token, maxDistance);
    if (distance > maxDistance) continue;
    if (!best
      || distance < best.distance
      || (distance === best.distance && candidate.weight > best.weight)
      || (distance === best.distance && candidate.weight === best.weight && candidate.token.length < best.token.length)) {
      best = { ...candidate, distance };
    }
  }
  return best?.token || token;
}

function boundedDamerauLevenshtein(left, right, maximum) {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > maximum) return maximum + 1;
  const rows = Array.from({ length: left.length + 1 }, () => new Array(right.length + 1).fill(0));
  for (let i = 0; i <= left.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= right.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    let rowMinimum = maximum + 1;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + cost);
      }
      rowMinimum = Math.min(rowMinimum, rows[i][j]);
    }
    if (rowMinimum > maximum) return maximum + 1;
  }
  return rows[left.length][right.length];
}

function scheduleSearchLexiconWarmup() {
  if (searchLexicon || searchLexiconWarmupScheduled) return;
  searchLexiconWarmupScheduled = true;
  const warm = () => {
    searchLexiconWarmupScheduled = false;
    ensureSearchLexicon();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(warm, { timeout: 900 });
  } else {
    window.setTimeout(warm, 180);
  }
}

function tokenise(value) {
  return cleanSearchText(value).split(" ").filter(Boolean);
}

function tokenVariants(word) {
  const variants = new Set([word]);
  if (word.endsWith("ies") && word.length > 4) variants.add(`${word.slice(0, -3)}y`);
  if (word.endsWith("s") && word.length > 3) variants.add(word.slice(0, -1));
  if (!word.endsWith("s") && word.length > 2) variants.add(`${word}s`);
  if (word === "medicine") variants.add("medical");
  if (word === "medical") variants.add("medicine");
  if (word === "law") variants.add("laws");
  if (word === "laws") variants.add("law");
  return variants;
}

function tokenMatch(text, word) {
  const tokens = new Set(tokenise(text));
  return [...tokenVariants(cleanSearchText(word))].some((variant) => tokens.has(variant));
}

function phraseMatch(text, phrase) {
  const cleanPhrase = cleanSearchText(phrase);
  if (!cleanPhrase) return false;
  const phraseTokens = tokenise(cleanPhrase);
  if (phraseTokens.length === 1) return tokenMatch(text, phraseTokens[0]);
  return cleanSearchText(text).includes(cleanPhrase);
}

function aliasMatch(text, query) {
  return (searchAliases[cleanSearchText(query)] || []).some((alias) => phraseMatch(text, alias));
}

function focusedAliasMatch(text, query) {
  return (searchAliases[cleanSearchText(query)] || [])
    .slice(0, 2)
    .some((alias) => phraseMatch(text, alias));
}

function weightedAliasMatchScore(text, query, maximum = 32000) {
  const aliases = searchAliases[cleanSearchText(query)] || [];
  const index = aliases.findIndex((alias) => phraseMatch(text, alias));
  if (index < 0) return 0;
  return Math.max(8000, maximum - index * 6000);
}

function exactDegreeTitle(title, query) {
  const degreeTitles = [
    `bachelor of ${query}`,
    `bachelor of ${query}s`,
    `bachelor of ${query} studies`,
    `master of ${query}`,
    `doctor of ${query}`,
    `diploma of ${query}`
  ];
  if (query === "law") degreeTitles.push("bachelor of laws");
  if (query === "medicine") {
    degreeTitles.push("bachelor of medical studies doctor of medicine");
    degreeTitles.push("doctor of medicine");
  }
  return degreeTitles.includes(title);
}

function collapseDuplicateCourses(courses) {
  const groups = new Map();
  for (const course of courses) {
    const key = [
      cleanSearchText(course.name),
      course.providerId,
      cleanSearchText(course.campus),
      cleanSearchText(course.courseCode)
    ].join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(course);
  }

  const redirects = new Map();
  const collapsed = [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => duplicatePreferenceScore(b) - duplicatePreferenceScore(a));
    const primary = ordered[0];
    for (const course of group) redirects.set(course.id, primary.id);
    return {
      ...primary,
      levels: sortLevels([...new Set(group.flatMap((course) => courseLevels(course)))]),
      modes: uniqueValues(group.flatMap((course) => course.modes || [])),
      intake: mergeTextValues(group.map((course) => course.intake)),
      dedupedCount: group.length
    };
  });

  collapsed.sort((a, b) => a.university.localeCompare(b.university) || a.name.localeCompare(b.name) || a.campus.localeCompare(b.campus));
  return { courses: collapsed, redirects };
}

function duplicatePreferenceScore(course) {
  const levelScore = { undergraduate: 40, postgraduate: 36, international: 24, online: 18 }[course.level] || 0;
  const rankScore = numericRank(course.atar) !== null ? 8 : hasSpecificInfo(course.atar) ? 4 : 0;
  const infoScore = [
    course.prerequisites,
    course.assumed,
    course.fees,
    course.careers,
    course.summary
  ].filter(hasSpecificInfo).length;
  return levelScore + rankScore + infoScore;
}

function sortLevels(levels) {
  const order = { undergraduate: 1, postgraduate: 2, international: 3, online: 4 };
  return levels.filter(Boolean).sort((a, b) => (order[a] || 99) - (order[b] || 99));
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function mergeTextValues(values) {
  const cleaned = uniqueValues(values).filter((value) => value !== "Not listed");
  return cleaned.length ? cleaned.join(", ") : "Not listed";
}

function isBroadTopicQuery(query) {
  const clean = cleanSearchText(query);
  return broadTopicQueries.has(clean) || topicOptions.some((topic) => cleanSearchText(topic.label) === clean);
}

function fieldValue(value) {
  const text = decodeHtmlEntities(value || "Not listed").trim() || "Not listed";
  if (text.length <= 260) return highlight(text);
  return `
    <details class="field-more">
      <summary>${highlight(truncateText(text, 220))} <span>Read full</span></summary>
      <p>${highlight(text)}</p>
    </details>
  `;
}

function truncateText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function providerOverallScore(provider) {
  return providerProfile(provider).overall;
}

function providerProfile(provider) {
  if (providerProfileCache.has(provider.id)) return providerProfileCache.get(provider.id);
  const courses = allCourses.filter((course) => course.providerId === provider.id);
  const topicRows = topicOptions
    .filter((topic) => topic.keywords.length)
    .map((topic) => {
      const relevant = courses.filter((course) => topicMatch(course, topic));
      const curated = providerQuality[topic.label]?.[provider.id];
      if (!relevant.length && !curated) return null;
      const evidenceScore = Math.min(76, 48 + Math.round(Math.log2(relevant.length + 1) * 7));
      return {
        label: topic.label,
        count: relevant.length,
        score: Math.round(curated?.score || evidenceScore),
        note: curated?.note || `${relevant.length} matched Sydney course option${relevant.length === 1 ? "" : "s"} in this study area.`
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.count - a.count || a.label.localeCompare(b.label));

  const specialty = topicRows[0] || {
    label: "General course availability",
    count: courses.length,
    score: Math.min(68, 46 + Math.round(Math.log2(courses.length + 1) * 6)),
    note: `${courses.length} Sydney course option${courses.length === 1 ? "" : "s"} in the imported data.`
  };
  const topStrengths = topicRows.slice(0, 3).map((row) => row.score);
  const strengthAverage = topStrengths.length
    ? topStrengths.reduce((sum, score) => sum + score, 0) / topStrengths.length
    : specialty.score;
  const breadthScore = Math.min(96, 34 + topicRows.length * 5);
  const choiceScore = Math.min(96, 42 + Math.round(Math.log2(courses.length + 1) * 8));
  const modes = new Set(courses.flatMap((course) => course.modes || []));
  const modeScore = Math.min(90, 44 + modes.size * 9);
  const baseOverall = Math.max(40, Math.min(98, Math.round(
    strengthAverage * 0.5 +
    breadthScore * 0.22 +
    choiceScore * 0.18 +
    modeScore * 0.1
  )));
  const currentStanding = providerCurrentStanding[provider.id] || null;
  const overall = currentStanding
    ? Math.max(40, Math.min(98, Math.round(baseOverall * 0.75 + currentStanding.score * 0.25)))
    : baseOverall;
  const topicCount = topicRows.length;
  const modeCopy = [
    modes.has("Online") || modes.has("Distance") ? "online study" : "",
    modes.has("Part-time") ? "part-time study" : ""
  ].filter(Boolean);
  const localOverallWhy = topicCount <= 2
    ? `A more specialised provider with ${courses.length} Sydney course option${courses.length === 1 ? "" : "s"}, strongest in ${specialty.label}${modeCopy.length ? `, with ${modeCopy.join(" and ")}` : ""}.`
    : `${courses.length} Sydney course options across ${topicCount} matched study areas${modeCopy.length ? `, including ${modeCopy.join(" and ")}` : ""}.`;
  const overallWhy = currentStanding
    ? `${localOverallWhy} Current standing signal: ${currentStanding.label}.`
    : localOverallWhy;
  const band = overall >= 85
    ? "Leading breadth and field strength"
    : overall >= 75
      ? "Strong all-round profile"
      : overall >= 65
        ? "Solid Sydney profile"
        : "Specialist or narrower profile";
  const result = { overall, band, overallWhy, specialty, topicRows, currentStanding };
  providerProfileCache.set(provider.id, result);
  return result;
}

function savedCourseList() {
  state.savedIds = state.savedIds.filter((id) => courseById.has(id));
  return state.savedIds.map((id) => courseById.get(id));
}

function compareCourseList() {
  state.compareIds = state.compareIds.filter((id) => courseById.has(id));
  return state.compareIds.map((id) => courseById.get(id));
}

function toggleSaved(id, anchorSelector = "") {
  if (!courseById.has(id)) return;
  state.savedIds = state.savedIds.includes(id)
    ? state.savedIds.filter((item) => item !== id)
    : [...state.savedIds, id];
  persistIdList(storageKeys.saved, state.savedIds);
  renderPreservingViewport(anchorSelector);
}

function toggleCompare(id, anchorSelector = "") {
  if (!courseById.has(id)) return;
  if (state.compareIds.includes(id)) {
    state.compareIds = state.compareIds.filter((item) => item !== id);
    state.compareMessage = "Course removed from comparison. Your saved courses were not changed.";
  } else {
    if (state.compareIds.length >= 3) {
      state.compareMessage = "You can compare up to three courses. Remove one before adding another.";
      renderPreservingViewport(anchorSelector);
      return;
    }
    state.compareIds = [...state.compareIds, id];
    state.compareMessage = "Course added to comparison. Save it separately if you want to keep it.";
  }
  persistIdList(storageKeys.compare, state.compareIds);
  renderPreservingViewport(anchorSelector);
}

function migrateLegacySavedCompareState() {
  try {
    if (localStorage.getItem(storageKeys.separatedSavedCompare)) return;
    const saved = JSON.parse(localStorage.getItem(storageKeys.saved) || "[]");
    const compared = JSON.parse(localStorage.getItem(storageKeys.compare) || "[]");
    if (Array.isArray(saved) && Array.isArray(compared) && compared.length) {
      const legacyComparedIds = new Set(compared.filter((id) => typeof id === "string"));
      localStorage.setItem(
        storageKeys.saved,
        JSON.stringify(saved.filter((id) => !legacyComparedIds.has(id)))
      );
    }
    localStorage.setItem(storageKeys.separatedSavedCompare, "1");
  } catch {
    // Keep the existing session state when storage is blocked or malformed.
  }
}

function readIdList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed
      .filter((id) => typeof id === "string")
      .map((id) => duplicateCourseMap.get(id) || id))];
  } catch {
    return [];
  }
}

function persistIdList(key, ids) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    // Storage can be unavailable in restrictive browser modes; the UI still works for the session.
  }
}

function courseProviderScore(course) {
  const provider = allProviders.find((item) => item.id === course.providerId);
  return provider ? providerOverallScore(provider) : 50;
}

function searchProviderQuality(course, query) {
  const topic = topicForQuery(query);
  if (!topic) return courseProviderScore(course) * 12;
  const signal = providerFieldSignal(course, topic);
  return signal ? signal.score * 65 : courseProviderScore(course) * 25;
}

function providerOnlyCourseScore(course) {
  const qualification = courseTypeLabel(course);
  const title = cleanSearchText(course.name);
  let score = course.level === "undergraduate" ? 900 : 0;
  if (qualification === "Bachelor" || qualification === "Honours") score += 900;
  if (qualification === "Double degree") score += 240;
  if (qualification === "Diploma" || qualification === "Advanced Diploma" || qualification === "Undergraduate Certificate") score -= 350;
  if (numericRank(course.atar) !== null) score += 180;
  score += Math.max(0, 720 - title.length * 7);
  return score;
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, numberValue) => String.fromCodePoint(Number(numberValue)))
    .replaceAll("&apos;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

render();
scheduleHashScroll();
loadAiStatus();
scheduleSearchLexiconWarmup();
window.setTimeout(scheduleIncomeWarmup, 1400);

window.addEventListener("hashchange", () => {
  updateHashNavCurrent();
  scheduleHashScroll(preferredHashScrollBehavior());
  window.setTimeout(scheduleIncomeWarmup, isMobileViewport() ? 80 : 300);
});
