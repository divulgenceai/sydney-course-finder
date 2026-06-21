const guideApp = document.querySelector("#guide-app");
const importedGuideCourses = window.uacCourses || [];
const guideCourses = collapseDuplicateCourses(importedGuideCourses).courses;
const guideProviders = window.uacProviders || [];
const hscSubjects = (window.hscSubjectData || []).slice().sort((a, b) => a.name.localeCompare(b.name));
const atarThresholds = (window.atarAggregateThresholds2025 || []).slice().sort((a, b) => b.aggregate - a.aggregate);
const guideMeta = window.uacImportMeta || {};
const guidePlanningLogic = window.SubjectHelperLogic;
const guideStorageKey = "sydneyCourseFinder.guideProgress";
const storedGuideState = guidePlanningLogic.restoreGuideState(localStorage.getItem(guideStorageKey));
const guideSubjectLookup = buildSubjectLookup();
const guideFieldCache = new WeakMap();
const guideIncomeCache = new WeakMap();
let guidePrewarmStarted = false;
let guidePrewarmIndex = 0;
let guidePersistTimer = 0;
let guideRestoreHandled = false;

const guideProviderQuality = {
  Technology: {
    UNSW: { score: 97, note: "very strong computing and employer outcomes" },
    UTS: { score: 93, note: "strong industry focus and technology reputation" },
    USYD: { score: 91, note: "high prestige and computer science reputation" },
    MQ: { score: 82, note: "good computing and analytics options" },
    WS: { score: 74, note: "large Sydney course range and practical access" }
  },
  "Medicine and Health": {
    USYD: { score: 98, note: "very high health and medicine reputation" },
    UNSW: { score: 96, note: "strong medicine and biomedical reputation" },
    WS: { score: 87, note: "major Western Sydney clinical and health presence" },
    UTS: { score: 84, note: "strong nursing and health sciences options" },
    MQ: { score: 80, note: "clinical science and health pathways" }
  },
  Engineering: {
    UNSW: { score: 98, note: "top-tier engineering reputation and employment strength" },
    USYD: { score: 93, note: "high prestige and broad engineering strength" },
    UTS: { score: 88, note: "practical and industry-linked engineering" },
    WS: { score: 76, note: "accessible engineering pathways in Western Sydney" },
    MQ: { score: 72, note: "relevant engineering and technology options" }
  },
  "Architecture and Built Environment": {
    UNSW: { score: 93, note: "strong built environment and design reputation" },
    USYD: { score: 91, note: "high prestige architecture and planning pathways" },
    UTS: { score: 86, note: "industry-linked built environment options" },
    WS: { score: 76, note: "accessible construction and planning pathways" }
  },
  Business: {
    UNSW: { score: 97, note: "very strong commerce and employment profile" },
    USYD: { score: 94, note: "high prestige business and economics reputation" },
    UTS: { score: 86, note: "practical city-campus business options" },
    MQ: { score: 84, note: "strong business, finance and analytics options" },
    ICMS: { score: 74, note: "industry-focused management provider" }
  },
  "Law and Justice": {
    USYD: { score: 98, note: "highest prestige law pathway in Sydney" },
    UNSW: { score: 95, note: "very strong law and social justice reputation" },
    UTS: { score: 86, note: "practical city-campus law option" },
    MQ: { score: 83, note: "established law program" },
    WS: { score: 75, note: "broad law and criminology access" }
  },
  "Creative Arts and Design": {
    UNSW: { score: 91, note: "strong art and design campus reputation" },
    UTS: { score: 88, note: "strong design and creative technology profile" },
    NAS: { score: 86, note: "specialist fine-art institution" },
    AIT: { score: 78, note: "specialist interactive technology and animation" },
    JMC: { score: 76, note: "specialist creative industries provider" }
  },
  Education: {
    USYD: { score: 94, note: "high prestige education pathway" },
    ACU: { score: 86, note: "large education and teaching provider" },
    WS: { score: 82, note: "strong access across Western Sydney" },
    UTS: { score: 76, note: "relevant education-related pathways" }
  },
  Science: {
    USYD: { score: 96, note: "high prestige and broad science strength" },
    UNSW: { score: 94, note: "strong science and research reputation" },
    UTS: { score: 83, note: "applied science and analytics pathways" },
    MQ: { score: 81, note: "strong science and clinical science options" },
    WS: { score: 74, note: "broad science access across Sydney" }
  },
  "Food, Hospitality and Tourism": {
    WS: { score: 82, note: "strong food science, tourism and applied industry options" },
    ACU: { score: 80, note: "strong nutrition and food-health pathways" },
    ICMS: { score: 78, note: "hospitality and tourism industry focus" },
    UTS: { score: 72, note: "city access for related business and events pathways" }
  },
  "Sport and Exercise": {
    ACU: { score: 85, note: "strong sport, exercise and health-linked options" },
    WS: { score: 80, note: "broad sport and health options in Western Sydney" },
    ACPE: { score: 78, note: "specialist physical education and sport provider" },
    UTS: { score: 74, note: "relevant health and sport science pathways" }
  },
  "Social Work and Community": {
    ACU: { score: 86, note: "strong social work, counselling and community pathways" },
    WS: { score: 84, note: "major Western Sydney social work and community presence" },
    ACAP: { score: 78, note: "specialist counselling and psychology provider" },
    USYD: { score: 78, note: "high prestige social science options" }
  }
};

const guideProviderAliases = [
  { id: "WS", label: "Western Sydney University", aliases: ["wsu", "western sydney university", "western sydney uni", "western sydney"] },
  { id: "UTS", label: "University of Technology Sydney", aliases: ["uts", "university of technology sydney", "technology sydney"] },
  { id: "UNSW", label: "UNSW", aliases: ["unsw", "university of new south wales", "new south wales uni"] },
  { id: "USYD", label: "University of Sydney", aliases: ["usyd", "sydney uni", "sydney university", "university of sydney"] },
  { id: "MQ", label: "Macquarie University", aliases: ["mq", "macquarie", "macquarie university"] },
  { id: "ACU", label: "Australian Catholic University", aliases: ["acu", "australian catholic university"] },
  { id: "SCU", label: "Southern Cross University", aliases: ["scu", "southern cross", "southern cross university"] },
  { id: "CQU", label: "CQUniversity", aliases: ["cqu", "cquniversity", "central queensland university"] },
  { id: "ICMS", label: "International College of Management, Sydney", aliases: ["icms", "international college of management"] },
  { id: "AIT", label: "Academy of Interactive Technology", aliases: ["ait", "academy of interactive technology"] }
];

const guideRankMeanings = {
  NC: "New course; UAC does not have a published ATAR profile yet.",
  NO: "No offers were made on ATAR alone.",
  NR: "No reportable ATAR profile.",
  NP: "Not provided by the institution.",
  NS: "No semester 1 offers.",
  NN: "ATAR profile unavailable.",
  "<5": "Fewer than five ATAR-based offers were made."
};

const guideIncomeOptions = ["Any income", "$60k+", "$80k+", "$100k+", "$120k+"];
const guideIncomeMinimums = {
  "Any income": 0,
  "$60k+": 60000,
  "$80k+": 80000,
  "$100k+": 100000,
  "$120k+": 120000
};

const guideJobProfiles = [
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

const preparedGuideJobProfiles = guideJobProfiles.map((profile) => ({
  ...profile,
  cleanTitle: cleanSearchText(profile.title),
  cleanKeywords: profile.keywords.map(cleanSearchText).filter(Boolean)
}));

const guidePathwayLinks = [
  {
    title: "Educational Access Scheme",
    text: "For long-term educational disadvantage. It can raise selection rank for some courses.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes"
  },
  {
    title: "Schools Recommendation Scheme",
    text: "Early-offer pathway using criteria other than, or in addition to, ATAR.",
    url: "https://www.uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes/how-to-apply"
  },
  {
    title: "Selection-rank adjustments",
    text: "Subject, equity, location or other adjustment factors may lift selection rank for a specific course.",
    url: "https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/"
  },
  {
    title: "UAC preferences",
    text: "Put the dream course first, then realistic related courses and pathway options.",
    url: "https://www.uac.edu.au/future-applicants/how-to-apply-for-uni/selecting-your-course-preferences/"
  },
  {
    title: "UTS College",
    text: "Diploma pathways into UTS areas including IT, engineering, business, science, design and communication.",
    url: "https://www.uts.edu.au/for-students/admissions-entry/pathways/uts-college"
  },
  {
    title: "UNSW College",
    text: "Diploma pathways for students who do not receive direct entry into some UNSW degrees.",
    url: "https://www.unswcollege.edu.au/diplomas"
  },
  {
    title: "Western Sydney pathways",
    text: "The College and VET-to-university pathways into Western Sydney University degrees.",
    url: "https://www.westernsydney.edu.au/tertiary-education-pathways-and-partnerships/pathways-available"
  },
  {
    title: "TAFE NSW pathways",
    text: "Vocational study and credit-transfer pathways can lead into university study for eligible students.",
    url: "https://www.tafensw.edu.au/study/pathways"
  }
];

const guideProfiles = [
  {
    label: "Technology",
    keywords: ["technology", "software", "coding", "programming", "computer science", "it", "information technology", "cyber", "data", "ai", "artificial intelligence", "game development", "software engineer", "developer", "web developer", "systems analyst", "apps"],
    subjects: ["Mathematics Advanced", "Enterprise Computing", "Software Engineering", "English Advanced", "Mathematics Extension 1", "Physics", "Design & Technology"]
  },
  {
    label: "Medicine and Health",
    keywords: ["medicine", "medical", "doctor", "health", "nursing", "clinical", "pharmacy", "physio", "physiotherapy", "psychology", "biomedical", "nutrition", "paramedic", "dentistry", "chiropractic"],
    subjects: ["Chemistry", "Biology", "Mathematics Advanced", "English Advanced", "Health and Movement Science (HMS)", "Physics", "Community & Family Studies"]
  },
  {
    label: "Engineering",
    keywords: ["engineering", "engineer", "civil", "mechanical", "electrical", "mechatronic", "robotics", "aerospace", "construction engineer", "renewable energy"],
    subjects: ["Mathematics Advanced", "Physics", "Mathematics Extension 1", "Engineering Studies", "Chemistry", "Software Engineering", "Design & Technology"]
  },
  {
    label: "Architecture and Built Environment",
    keywords: ["architecture", "architect", "built environment", "construction", "property", "planning", "interior", "landscape", "urban", "building designer"],
    subjects: ["Design & Technology", "Visual Arts", "Mathematics Advanced", "Physics", "English Advanced", "Engineering Studies"]
  },
  {
    label: "Business",
    keywords: ["business", "commerce", "accounting", "finance", "marketing", "management", "economics", "entrepreneur", "banking", "consulting", "human resources", "income", "money"],
    subjects: ["Business Studies", "Economics", "Mathematics Advanced", "English Advanced", "Legal Studies", "Enterprise Computing"]
  },
  {
    label: "Law and Justice",
    keywords: ["law", "lawyer", "legal", "justice", "criminology", "policy", "court", "solicitor", "barrister", "policing", "crime"],
    subjects: ["English Advanced", "Legal Studies", "Modern History", "Society & Culture", "Economics", "Business Studies"]
  },
  {
    label: "Creative Arts and Design",
    keywords: ["design", "designer", "creative", "animation", "game art", "music", "screen", "media", "film", "visual art", "artist", "ux", "graphic design"],
    subjects: ["Visual Arts", "Design & Technology", "English Advanced", "Drama", "Music 1", "Enterprise Computing", "Software Engineering"]
  },
  {
    label: "Education",
    keywords: ["education", "teaching", "teacher", "primary teacher", "secondary teacher", "early childhood", "mentor", "school"],
    subjects: ["English Advanced", "Mathematics Standard 2", "Society & Culture", "Community & Family Studies", "Biology", "Modern History", "Visual Arts"]
  },
  {
    label: "Science",
    keywords: ["science", "scientist", "research", "biology", "chemistry", "physics", "environment", "laboratory", "biotech", "mathematics", "statistics"],
    subjects: ["Mathematics Advanced", "Chemistry", "Biology", "Physics", "Science Extension", "Earth & Environmental Science"]
  },
  {
    label: "Food, Hospitality and Tourism",
    keywords: ["food", "cooking", "chef", "culinary", "hospitality", "tourism", "hotel", "events", "nutrition", "dietetics", "food science", "restaurant"],
    subjects: ["Food Technology", "Hospitality Exam", "Biology", "Chemistry", "Business Studies", "English Standard"]
  },
  {
    label: "Sport and Exercise",
    keywords: ["sport", "sports", "exercise", "fitness", "coach", "athlete", "hms", "health and movement science", "pdhpe", "physiology", "strength conditioning"],
    subjects: ["Health and Movement Science (HMS)", "Biology", "Mathematics Standard 2", "Chemistry", "Physics", "Community & Family Studies"]
  },
  {
    label: "Social Work and Community",
    keywords: ["social work", "counselling", "counseling", "community", "welfare", "youth", "support worker", "mental health", "human services", "case worker"],
    subjects: ["English Advanced", "Society & Culture", "Community & Family Studies", "Legal Studies", "Biology", "Health and Movement Science (HMS)"]
  }
].map((profile) => ({ ...profile, cleanKeywords: profile.keywords.map(cleanSearchText) }));

const directionCards = [
  {
    label: "Lifestyle",
    question: "Which work-life trade-off suits you?",
    a: { title: "Higher income, longer hours", copy: "More pressure is fine if the reward and career growth are stronger.", icon: "↗", signals: { Business: 2, Technology: 2, Engineering: 1, "Law and Justice": 1 } },
    b: { title: "More time, lower pressure", copy: "Predictable hours and energy outside work matter more.", icon: "⏱", signals: { Education: 2, "Social Work and Community": 2, "Creative Arts and Design": 1 } }
  },
  {
    label: "People",
    question: "Who do you want to help most?",
    a: { title: "Individuals face-to-face", copy: "I like supporting people directly and seeing the human impact.", icon: "♥", signals: { "Medicine and Health": 3, Education: 2, "Social Work and Community": 3 } },
    b: { title: "Teams, clients or organisations", copy: "I like solving problems through systems, products, strategy or projects.", icon: "◈", signals: { Business: 2, Technology: 2, Engineering: 2, "Architecture and Built Environment": 1 } }
  },
  {
    label: "Thinking style",
    question: "Which problems feel more satisfying?",
    a: { title: "Numbers, code and logic", copy: "I enjoy technical answers, patterns and exact problem solving.", icon: "Σ", signals: { Technology: 3, Engineering: 3, Science: 2, Business: 1 } },
    b: { title: "Words, behaviour and arguments", copy: "I enjoy writing, persuasion, people and social questions.", icon: "¶", signals: { "Law and Justice": 3, Education: 2, "Humanities and Social Impact": 3, "Social Work and Community": 2 } }
  },
  {
    label: "Environment",
    question: "Where would you rather work?",
    a: { title: "Desk, lab or technical space", copy: "I like focused work with tools, data, science or design software.", icon: "⌘", signals: { Technology: 2, Science: 2, Engineering: 2, "Creative Arts and Design": 1 } },
    b: { title: "Active, social or changing places", copy: "I want movement, people, placements, sites or real-world settings.", icon: "◎", signals: { "Medicine and Health": 2, "Sport and Exercise": 3, Education: 2, "Food, Hospitality and Tourism": 2 } }
  },
  {
    label: "Subject comfort",
    question: "What school work feels more natural?",
    a: { title: "Maths/science/technology", copy: "I do not mind formulas, technical subjects or precise answers.", icon: "∞", signals: { Engineering: 3, Technology: 3, Science: 3, "Medicine and Health": 1 } },
    b: { title: "English/humanities/creative", copy: "I prefer communication, interpretation, design or human stories.", icon: "✦", signals: { "Creative Arts and Design": 3, "Law and Justice": 2, "Humanities and Social Impact": 3, Education: 1 } }
  },
  {
    label: "Creativity",
    question: "How much creative freedom do you want?",
    a: { title: "A lot of creative ownership", copy: "I want to make, design, perform, write or shape original work.", icon: "✎", signals: { "Creative Arts and Design": 4, "Architecture and Built Environment": 2, "Food, Hospitality and Tourism": 1 } },
    b: { title: "Clear rules and proven methods", copy: "I like structured work where standards and correctness matter.", icon: "✓", signals: { "Law and Justice": 2, Engineering: 2, "Medicine and Health": 2, Business: 1 } }
  },
  {
    label: "Risk",
    question: "Which path feels safer to you?",
    a: { title: "Stable job market first", copy: "I want a practical pathway with steady employability.", icon: "▣", signals: { Education: 2, "Medicine and Health": 3, Engineering: 2, Technology: 2 } },
    b: { title: "Chase upside and interest", copy: "I can handle uncertainty if the work is exciting or high-upside.", icon: "⚡", signals: { Business: 2, Technology: 2, "Creative Arts and Design": 2, "Food, Hospitality and Tourism": 1 } }
  },
  {
    label: "Study load",
    question: "What kind of degree difficulty are you willing to take on?",
    a: { title: "Hard content is okay", copy: "I can take demanding subjects if they open strong options.", icon: "▲", signals: { "Medicine and Health": 2, Engineering: 3, Science: 2, Technology: 2 } },
    b: { title: "I need a manageable route", copy: "I want a pathway that builds confidence and has backup options.", icon: "▤", signals: { Business: 1, Education: 2, "Social Work and Community": 2, "Food, Hospitality and Tourism": 2 } }
  },
  {
    label: "Impact",
    question: "What kind of impact motivates you?",
    a: { title: "Build useful things", copy: "Products, structures, systems and tools sound satisfying.", icon: "⚙", signals: { Technology: 3, Engineering: 3, "Architecture and Built Environment": 2 } },
    b: { title: "Improve people’s lives", copy: "Care, education, justice, wellbeing and community matter most.", icon: "☀", signals: { "Medicine and Health": 3, Education: 3, "Social Work and Community": 3, "Law and Justice": 1 } }
  },
  {
    label: "Money",
    question: "How important is income?",
    a: { title: "Very important", copy: "I want the plan to prioritise income potential and progression.", icon: "$", signals: { Business: 3, Technology: 3, Engineering: 2, "Law and Justice": 1 } },
    b: { title: "Important, but not everything", copy: "Fit, meaning and manageable study matter too.", icon: "◇", signals: { Education: 2, "Social Work and Community": 2, "Creative Arts and Design": 1, Science: 1 } }
  },
  {
    label: "Learning style",
    question: "Which learning style would you choose?",
    a: { title: "Projects and practical work", copy: "I learn best by making, testing, placing or doing.", icon: "▧", signals: { Engineering: 2, Technology: 2, "Architecture and Built Environment": 2, "Food, Hospitality and Tourism": 2, "Sport and Exercise": 2 } },
    b: { title: "Reading, discussion and theory", copy: "I can handle essays, cases, research and concepts.", icon: "☰", signals: { "Law and Justice": 2, "Humanities and Social Impact": 3, Education: 2, Science: 1 } }
  },
  {
    label: "Future self",
    question: "Which future sounds more like you?",
    a: { title: "Specialist with technical skill", copy: "I want a clear skill set people hire me for.", icon: "◆", signals: { Technology: 3, Engineering: 3, "Medicine and Health": 2, Science: 2 } },
    b: { title: "Flexible communicator/leader", copy: "I want broad skills across people, organisations and ideas.", icon: "✺", signals: { Business: 2, Education: 2, "Law and Justice": 2, "Humanities and Social Impact": 2 } }
  }
];

const guideQuickGoals = ["Software engineer", "Nursing", "Lawyer", "Civil engineer", "Business analyst", "Psychology", "Teacher", "High income tech"];
const guideYears = ["Year 10 or below", "Year 11", "Year 12"];
const guidePreferences = [
  "Balanced plan",
  "Easiest job that pays a lot",
  "Highest income potential",
  "Safest entry option",
  "Most prestigious uni",
  "Helping people",
  "Creative work",
  "Avoid heavy maths",
  "Avoid heavy science",
  "Flexible pathway"
];
const guideCampuses = ["Any Sydney campus", "City / inner Sydney", "Western Sydney", "North Sydney / Macquarie", "Online or flexible"];
const guideSchoolLevels = [
  "Not sure yet",
  "Consistently strong",
  "Above average",
  "Around average",
  "Building momentum",
  "Needs a pathway plan"
];
const guideSchoolLevelEstimates = {
  "Consistently strong": { atar: 88, label: "Strong school tracking", text: "Used as a planning signal only because you have not entered senior marks yet." },
  "Above average": { atar: 78, label: "Above-average tracking", text: "Used as a planning signal only because you have not entered senior marks yet." },
  "Around average": { atar: 68, label: "Average tracking", text: "Used as a planning signal only because you have not entered senior marks yet." },
  "Building momentum": { atar: 58, label: "Building momentum", text: "Used to keep the plan realistic and pathway-aware before senior marks exist." },
  "Needs a pathway plan": { atar: 50, label: "Pathway-first planning", text: "Used to prioritise accessible courses and backup pathways before senior marks exist." }
};
const guideTermFields = {
  year11: [
    { key: "y11Term1", label: "Y11 T1" },
    { key: "y11Term2", label: "Y11 T2" },
    { key: "y11Term3", label: "Y11 T3" },
    { key: "y11Term4", label: "Y11 T4" }
  ],
  year12: [
    { key: "y12Term1", label: "Y12 T1" },
    { key: "y12Term2", label: "Y12 T2" },
    { key: "y12Term3", label: "Y12 T3" },
    { key: "y12Term4", label: "Y12 T4" }
  ]
};
const trueRewardUrl = "https://www.westernsydney.edu.au/future/study/application-pathways/hsc-true-reward";
let guideSubjectRowId = 0;

const guideState = guidePlanningLogic.createGuideState({
  ...storedGuideState,
  dreamJob: new URLSearchParams(window.location.search).get("q") || storedGuideState.dreamJob || "",
  subjectsWithMarks: storedGuideState.subjectsWithMarks.length
    ? normaliseGuideSubjectRows(storedGuideState.subjectsWithMarks)
    : [createGuideSubjectRow()]
});
guideState.processing = false;
guideState.result = null;

renderGuide();
restoreGuideResultIfNeeded();

function renderGuide(options = {}) {
  const x = window.scrollX;
  const y = window.scrollY;
  guideApp.innerHTML = `
    <header class="topbar">
      <a class="brand" href="./index.html#courses">
        <img class="site-logo" src="./assets/logo.svg" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./index.html#courses">Courses</a>
        <a href="./guide.html" aria-current="page">Guide</a>
        <a href="./index.html#atar">ATAR match</a>
        <a href="./atar-calculator.html">ATAR calculator</a>
        <a href="./subject-helper.html">Subject helper</a>
        <a href="./advisor.html">Course helper</a>
        <a href="./index.html#saved">Saved</a>
        <a href="./index.html#providers">Universities</a>
        <a href="./index.html#faq">FAQ</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>

    <main class="guide-main">
      <section class="hero guide-hero">
        <div>
          <p class="eyebrow">Student planning</p>
          <h1>Guide</h1>
          <p>Answer anything you know. The site builds a course, job and subject plan from imported UAC courses, Sydney provider scoring, income signals and HSC scaling data.</p>
        </div>
        <dl class="stats">
          <div><dt>Courses</dt><dd>${number(guideCourses.length)}</dd></div>
          <div><dt>Subjects</dt><dd>${hscSubjects.length}</dd></div>
          <div><dt>Mode</dt><dd>Data plan</dd></div>
          <p class="data-note">This is planning support, not official entry advice. Always confirm prerequisites, adjustment factors and offer rules on UAC or the university page.</p>
        </dl>
      </section>

      <section class="panel guide-panel" id="guide-form">
        <div class="panel-head">
          <div>
            <h2>Build your plan</h2>
            <p>Start with the big intent. Subject marks only appear when they are useful for Year 11 or Year 12 planning.</p>
          </div>
          <span>${escapeHtml((guideMeta.importedAt || "").slice(0, 10) || "UAC data")}</span>
        </div>
        <form class="guide-form" data-guide-form>
          ${guideState.processing ? renderGuideProcessStrip("Building plan") : ""}
          <div class="guide-question-grid">
            ${renderGuideSelect("year", "What year are you in?", guideYears, guideState.year)}
            ${renderGuideInput("dreamJob", "Dream job", "text", "Example: software engineer, nurse, high-paying office job", guideState.dreamJob)}
            ${renderGuideInput("dreamCourse", "Dream course", "text", "Example: computer science, nursing, business analytics", guideState.dreamCourse)}
            ${renderGuideSelect("dreamIncome", "Dream income", guideIncomeOptions, guideState.dreamIncome)}
            ${renderGuideInput("passions", "What are you passionate about?", "text", "Example: coding, helping people, business, design, sport", guideState.passions)}
            ${guideState.year === "Year 10 or below" ? renderGuideSelect("schoolPerformance", "How are you tracking at school?", guideSchoolLevels, guideState.schoolPerformance) : ""}
            ${renderGuideSelect("preference", "Preference", guidePreferences, guideState.preference)}
          </div>
          ${renderGuideDirectionDeck()}
          ${renderGuideSubjectMarks()}
          <details class="guide-optional">
            <summary>Anything to avoid?</summary>
            ${renderGuideInput("avoid", "Optional avoid list", "text", "Example: WSU, heavy maths, long commute, placements", guideState.avoid)}
          </details>
          <div class="guide-actions">
            <button class="match-btn" type="submit">Build my plan</button>
            <button class="clear-btn" type="button" data-guide-reset>Reset</button>
          </div>
          <div class="guide-quick" aria-label="Quick goals">
            ${guideQuickGoals.map((goal) => `<button type="button" data-guide-job="${escapeHtml(goal)}">${escapeHtml(goal)}</button>`).join("")}
          </div>
        </form>
      </section>

      ${guideState.result ? renderGuideResult(guideState.result) : renderGuideEmpty()}
    </main>
  `;

  bindGuideEvents();
  requestAnimationFrame(() => {
    scrollGuideNavIntoView();
    scheduleGuidePrewarm();
    if (options.preserveScroll) window.scrollTo(x, y);
  });
}

function renderGuideInput(key, label, type, placeholder, value) {
  const inputMode = type === "number" ? ` inputmode="decimal" min="0" max="99.95" step="0.05"` : "";
  return `
    <label class="guide-field">
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(key)}" type="${escapeHtml(type)}"${inputMode} value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
    </label>
  `;
}

function renderGuideSelect(key, label, options, value) {
  return `
    <label class="guide-field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(key)}">
        ${options.map((option) => `<option ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
      </select>
    </label>
  `;
}

function renderGuideDirectionDeck() {
  const index = Math.min(directionCards.length - 1, guideState.deckIndex || 0);
  const card = directionCards[index];
  const answer = guideState.deckAnswers[index] || "";
  const complete = guidePlanningLogic.isDirectionDeckComplete(guideState.deckAnswers, directionCards.length);
  return `
    <section class="guide-direction-deck" data-guide-deck>
      <div class="guide-deck-head">
        <div>
          <span>Direction questions</span>
          <h3>Pick the card that feels more like you</h3>
          <p>These answers improve the course, career and subject plan. "Not sure yet" is valid.</p>
        </div>
        <strong>${index + 1} / ${directionCards.length}</strong>
      </div>
      <div class="guide-deck-progress" aria-hidden="true"><i style="width:${((index + 1) / directionCards.length) * 100}%"></i></div>
      <div class="guide-deck-question">
        <span>${escapeHtml(card.label)}</span>
        <h4>${escapeHtml(card.question)}</h4>
      </div>
      <div class="guide-deck-options">
        ${renderGuideDirectionOption(card.a, "a", answer)}
        ${renderGuideDirectionOption(card.b, "b", answer)}
      </div>
      <div class="guide-deck-actions">
        <button type="button" class="clear-btn" data-guide-deck-back ${index === 0 ? "disabled" : ""}>Back</button>
        <button type="button" class="clear-btn" data-guide-deck-answer="unsure" aria-pressed="${answer === "unsure"}">Not sure yet</button>
        <span>${complete ? "Direction questions complete" : `${directionCards.length - guideState.deckAnswers.filter(Boolean).length} remaining`}</span>
      </div>
    </section>
  `;
}

function renderGuideDirectionOption(option, value, selected) {
  return `
    <button
      type="button"
      class="guide-direction-option"
      data-guide-deck-answer="${escapeHtml(value)}"
      aria-pressed="${selected === value}"
    >
      <span class="guide-direction-icon" aria-hidden="true">${escapeHtml(option.icon)}</span>
      <small>Pick this card</small>
      <strong>${escapeHtml(option.title)}</strong>
      <p>${escapeHtml(option.copy)}</p>
    </button>
  `;
}

function renderGuideSubjectMarks() {
  if (!needsGuideSubjectMarks()) {
    return `
      <div class="guide-year-note">
        <strong>Subject picking comes next.</strong>
        <span>For Year 10 or below, the plan recommends Year 11/12 subjects after it sees the job, course, income, passions and school tracking.</span>
      </div>
    `;
  }
  const rows = guideState.subjectsWithMarks.length ? guideState.subjectsWithMarks : [createGuideSubjectRow()];
  guideState.subjectsWithMarks = rows;
  const isYear12 = guideState.year === "Year 12";
  return `
    <section class="guide-mark-panel" aria-label="Current subjects and marks">
      <div class="guide-mark-head">
        <div>
          <h3>${isYear12 ? "Year 11 and Year 12 marks so far" : "Year 11 subjects and marks so far"}</h3>
          <p>${isYear12 ? "Optional. Add Year 11 marks and any Year 12 term marks you have. The Guide weights Year 12 more when projecting." : "Optional. Add term marks you have so far. The Guide will estimate a rough ATAR direction from the filled terms."}</p>
        </div>
        <button type="button" class="clear-btn" data-guide-add-subject>Add subject</button>
      </div>
      <div class="guide-mark-rows">
        ${rows.map(renderGuideSubjectRow).join("")}
      </div>
    </section>
  `;
}

function renderGuideSubjectRow(row, index) {
  const selectedSubject = findGuideSubject(row.subject);
  const maxMark = selectedSubject?.units === 1 ? 50 : 100;
  const projection = projectedMarkForGuideRow(row, selectedSubject);
  const termFields = guideTermFieldsForYear(guideState.year);
  return `
    <div class="guide-mark-row" data-guide-row="${row.id}">
      <label class="guide-field">
        <span>Subject ${index + 1}</span>
        <select data-guide-subject-row="${row.id}">
          <option value="">Choose subject</option>
          ${hscSubjects.map((subject) => `<option value="${escapeHtml(subject.name)}" ${subject.name === row.subject ? "selected" : ""}>${escapeHtml(subject.name)}</option>`).join("")}
        </select>
      </label>
      <div class="guide-term-grid" aria-label="Term marks for subject ${index + 1}">
        ${termFields.map((term) => `
          <label class="guide-term-field">
            <span>${escapeHtml(term.label)}</span>
            <input type="number" inputmode="decimal" min="0" max="${maxMark}" step="0.5" value="${escapeHtml(row[term.key] || "")}" placeholder="/${maxMark}" data-guide-term-row="${row.id}" data-guide-term-key="${escapeHtml(term.key)}" />
          </label>
        `).join("")}
      </div>
      <div class="guide-row-summary">
        <span>Projected mark</span>
        <strong>${projection.hasMarks ? `${escapeHtml(formatNumber(projection.mark, 1))}/${maxMark}` : "No marks yet"}</strong>
        <small>${escapeHtml(projection.note)}</small>
      </div>
      <button type="button" class="clear-btn guide-row-remove" data-guide-remove-subject="${row.id}" ${guideState.subjectsWithMarks.length <= 1 ? "disabled" : ""}>Remove</button>
    </div>
  `;
}

function createGuideSubjectRow(subject = "", mark = "") {
  guideSubjectRowId += 1;
  const row = {
    id: `subject-${guideSubjectRowId}`,
    subject,
    y11Term1: "",
    y11Term2: "",
    y11Term3: "",
    y11Term4: "",
    y12Term1: "",
    y12Term2: "",
    y12Term3: "",
    y12Term4: ""
  };
  if (mark !== "") row.y12Term1 = mark;
  return row;
}

function normaliseGuideSubjectRows(rows) {
  return (rows || []).map((row) => {
    guideSubjectRowId += 1;
    return {
      id: row?.id || `subject-${guideSubjectRowId}`,
      subject: row?.subject || "",
      y11Term1: row?.y11Term1 || "",
      y11Term2: row?.y11Term2 || "",
      y11Term3: row?.y11Term3 || "",
      y11Term4: row?.y11Term4 || "",
      y12Term1: row?.y12Term1 || row?.mark || "",
      y12Term2: row?.y12Term2 || "",
      y12Term3: row?.y12Term3 || "",
      y12Term4: row?.y12Term4 || ""
    };
  });
}

function guideTermFieldsForYear(year) {
  if (year === "Year 12") return [...guideTermFields.year11, ...guideTermFields.year12];
  return guideTermFields.year11;
}

function projectedMarkForGuideRow(row, subject = findGuideSubject(row.subject)) {
  const maxMark = subject?.units === 1 ? 50 : 100;
  const year11 = guideTermFields.year11
    .map((term) => parseGuideTermMark(row?.[term.key], maxMark))
    .filter((value) => value !== null);
  const year12 = guideTermFields.year12
    .map((term) => parseGuideTermMark(row?.[term.key], maxMark))
    .filter((value) => value !== null);
  const legacyMark = Number(row?.mark);
  if (!year11.length && !year12.length && Number.isFinite(legacyMark)) {
    return {
      hasMarks: true,
      mark: clamp(legacyMark, 0, maxMark),
      count: 1,
      note: "Uses the old expected mark saved for this row."
    };
  }
  const average = (items) => items.reduce((sum, value) => sum + value, 0) / items.length;
  if (guideState.year === "Year 12") {
    if (year12.length && year11.length) {
      return {
        hasMarks: true,
        mark: clamp(average(year12) * 0.7 + average(year11) * 0.3, 0, maxMark),
        count: year11.length + year12.length,
        note: "Year 12 terms weighted 70%, Year 11 terms 30%."
      };
    }
    if (year12.length) {
      return {
        hasMarks: true,
        mark: clamp(average(year12), 0, maxMark),
        count: year12.length,
        note: "Uses the Year 12 terms entered so far."
      };
    }
    if (year11.length) {
      return {
        hasMarks: true,
        mark: clamp(average(year11), 0, maxMark),
        count: year11.length,
        note: "Uses Year 11 marks until Year 12 terms are added."
      };
    }
  }
  if (year11.length) {
    return {
      hasMarks: true,
      mark: clamp(average(year11), 0, maxMark),
      count: year11.length,
      note: `Uses ${year11.length} Year 11 term${year11.length === 1 ? "" : "s"}.`
    };
  }
  return {
    hasMarks: false,
    mark: null,
    count: 0,
    note: "Add any term marks you have."
  };
}

function parseGuideTermMark(value, maxMark) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? clamp(number, 0, maxMark) : null;
}

function needsGuideSubjectMarks() {
  return guideState.year === "Year 11" || guideState.year === "Year 12";
}

function renderGuideProcessStrip(label) {
  return `
    <div class="process-strip" role="status" aria-live="polite">
      <span>${escapeHtml(label)}</span>
      <span class="process-dots" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  `;
}

function renderGuideEmpty() {
  return `
    <section class="panel guide-empty-panel">
      <div class="guide-empty">
        <div>
          <h2>Start with any answer</h2>
          <p>You can type just a career, just your subjects, just an income goal, or all of it. The plan will rank Sydney courses and show what to check next.</p>
        </div>
        <div class="guide-empty-steps">
          <span>1. Match direction</span>
          <span>2. Pick courses</span>
          <span>3. Set subject targets</span>
        </div>
      </div>
    </section>
  `;
}

function renderGuideResult(result) {
  const primary = result.primary.course;
  const primaryJobs = result.jobs.slice(0, 3);
  const providerNote = result.providerNote ? ` ${result.providerNote}` : "";
  const deckNote = guideState.deckAnswers.some(Boolean) ? " Your direction-card choices also influenced this match." : "";
  return `
    <section class="panel guide-result" id="guide-result">
      <div class="guide-result-head">
        <div>
          <span class="guide-pill">${escapeHtml(result.profile.label)}</span>
          <h2>Best direction: ${escapeHtml(primary.name)}</h2>
          <p>${escapeHtml(primary.name)} at ${escapeHtml(primary.university)} is the strongest first plan because it fits your job/course/passion signals, ${escapeHtml(result.entryLine.toLowerCase())}, and the preference you gave.${escapeHtml(providerNote)}${escapeHtml(deckNote)}</p>
        </div>
        <div class="guide-score-card">
          <span>Course reach</span>
          <strong>${escapeHtml(result.reach.label)}</strong>
          <small>${escapeHtml(result.reach.text)}</small>
        </div>
      </div>

      <div class="guide-plan-grid">
        <article class="guide-plan-card primary">
          <span>Course target</span>
          <img src="${escapeHtml(primary.providerLogo)}" alt="${escapeHtml(primary.university)} logo" loading="lazy" />
          <h3>${escapeHtml(primary.name)}</h3>
          <p>${escapeHtml(primary.university)} - ${escapeHtml(primary.campus)}</p>
          <dl>
            <div><dt>ATAR profile</dt><dd>${escapeHtml(displayRank(primary.atar))}</dd></div>
            <div><dt>Mode</dt><dd>${escapeHtml((primary.modes || []).join(", ") || primary.studyMode || primary.mode || "Check course page")}</dd></div>
            <div><dt>Duration</dt><dd>${escapeHtml(primary.duration || "Check course page")}</dd></div>
          </dl>
          <div class="guide-link-row">
            ${primary.uacUrl ? `<a href="${escapeHtml(primary.uacUrl)}" target="_blank" rel="noreferrer">UAC course ${icon("external")}</a>` : ""}
            ${primary.officialUrl ? `<a href="${escapeHtml(primary.officialUrl)}" target="_blank" rel="noreferrer">Uni page ${icon("external")}</a>` : ""}
          </div>
        </article>

        <article class="guide-plan-card">
          <span>Job direction</span>
          <h3>${escapeHtml(primaryJobs[0]?.title || "Graduate role in this field")}</h3>
          <p>${escapeHtml(primaryJobs[0]?.range || "$60k-$90k")} typical broad planning range. Use this as a rough career signal, not a salary guarantee.</p>
          <ul class="guide-mini-list">
            ${primaryJobs.map((job) => `<li><strong>${escapeHtml(job.title)}</strong><em>${escapeHtml(job.range)}</em></li>`).join("")}
          </ul>
        </article>

        <article class="guide-plan-card">
          <span>ATAR target</span>
          <h3>${escapeHtml(result.atarTargetLabel)}</h3>
          <p>${escapeHtml(result.atarMessage)}</p>
          <div class="guide-meter" aria-hidden="true"><i style="width:${Math.min(100, Math.max(8, result.atarMeter))}%"></i></div>
          <small>${escapeHtml(result.atarSource)}</small>
        </article>
      </div>

      ${result.markEstimate?.hasMarks ? renderGuideEstimatePanel(result.markEstimate) : ""}
      ${!result.markEstimate?.hasMarks && result.schoolEstimate?.hasEstimate ? renderGuideSchoolPanel(result.schoolEstimate) : ""}
      ${result.hasTrueReward ? renderTrueRewardCard() : ""}

      ${renderPlanSection("Subjects to pick / keep", result.subjectIntro, `
        <div class="guide-subject-targets">
          ${result.subjectTargets.map(renderGuideSubjectTarget).join("")}
        </div>
      `, true)}

      ${renderPlanSection("ATAR and entry checks", "Prerequisites can block entry. Assumed knowledge usually does not block entry, but it can make first year harder.", `
        <div class="guide-entry-checks">
          ${renderEntryCheck("Prerequisites", primary.prerequisites, "Must confirm")}
          ${renderEntryCheck("Assumed knowledge", primary.assumed, "Preparation")}
          ${renderEntryCheck("Extra notes", primary.summary || primary.careers, "Course context")}
        </div>
      `, true)}

      ${renderPlanSection("Universities to apply for through UAC", "Keep your first choice first, then add realistic related courses and backup pathways.", `
        <div class="guide-course-options">
          ${result.options.map((entry, index) => renderGuideCourseOption(entry, index)).join("")}
        </div>
      `, true)}

      ${renderPlanSection("Jobs this can lead to", "These are broad career signals matched from course titles and career text. Salaries are rough planning ranges.", `
        <div class="guide-job-grid">
          ${primaryJobs.map((job) => `<article><strong>${escapeHtml(job.title)}</strong><span>${escapeHtml(job.range)}</span><p>${escapeHtml(job.text || "Build practical experience, internships and projects while studying.")}</p></article>`).join("")}
        </div>
      `)}

      ${renderPlanSection("Backup and pathway options", result.pathwayReason, `
        <div class="guide-pathway-grid">
          ${result.pathways.map((item) => `
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
              <strong>${escapeHtml(item.title)}</strong>
              <small>${escapeHtml(item.text)}</small>
            </a>
          `).join("")}
        </div>
      `)}

      ${renderPlanSection("Next steps by year group", result.timelineIntro, `
        <ol class="guide-timeline">
          ${result.steps.map((step) => `<li><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.text)}</p></li>`).join("")}
        </ol>
      `, true)}

      <p class="guide-disclaimer">How this was made: dream job/course/passion matches, projected ATAR or school-tracking fit, provider profile, income signal, subject fit, preference and avoid-list penalties. It uses imported UAC records plus public HSC scaling summary data, so final decisions still need official UAC/university confirmation.</p>
      ${renderGuideEasNote()}
    </section>
  `;
}

function renderPlanSection(title, intro, body, open = false) {
  return `
    <details class="guide-plan-section" ${open ? "open" : ""}>
      <summary>
        <span>${escapeHtml(title)}</span>
        <small>${escapeHtml(intro)}</small>
      </summary>
      <div class="guide-section-body">${body}</div>
    </details>
  `;
}

function renderGuideEstimatePanel(estimate) {
  return `
    <section class="guide-estimate-panel">
      <div>
        <span>Projected ATAR from marks</span>
        <strong>${escapeHtml(estimate.atarLabel)}</strong>
        <small>${escapeHtml(estimate.note)}</small>
      </div>
      <div class="guide-estimate-list">
        ${estimate.subjects.slice(0, 5).map((subject) => `
          <article class="${subject.impact >= 0 ? "up" : "down"}">
            <strong>${escapeHtml(subject.name)}</strong>
            <span>${escapeHtml(formatNumber(subject.scaledTotal, 1))}</span>
            <small>${escapeHtml(formatNumber(subject.projectedMark, 1))}/${subject.maxMark} projected. ${subject.impact >= 0 ? "+" : ""}${escapeHtml(formatNumber(subject.impact, 1))} vs break-even line</small>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderGuideSchoolPanel(estimate) {
  return `
    <section class="guide-estimate-panel guide-school-panel">
      <div>
        <span>School tracking signal</span>
        <strong>${escapeHtml(estimate.atarLabel)}</strong>
        <small>${escapeHtml(estimate.text)}</small>
      </div>
      <p>This is not an ATAR prediction. It only helps the Guide avoid suggesting courses that are wildly unrealistic before Year 11/12 marks exist.</p>
    </section>
  `;
}

function renderGuideEasNote() {
  return `
    <section class="guide-eas-note">
      <strong>EAS and adjustment reminder</strong>
      <p>You may be eligible for EAS, subject adjustments, location adjustments, SRS or other selection-rank schemes depending on your circumstances, school, course and uni. This Guide does not add those points to your projected ATAR or recommendations because they are provider-specific and need official checking.</p>
      <div>
        <a href="https://www.uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes" target="_blank" rel="noreferrer">Check EAS ${icon("external")}</a>
        <a href="https://www.uac.edu.au/future-applicants/admission-criteria/university-selection-rank-adjustments/" target="_blank" rel="noreferrer">Check adjustments ${icon("external")}</a>
      </div>
    </section>
  `;
}

function renderTrueRewardCard() {
  return `
    <section class="guide-true-reward">
      <div>
        <span>Western Sydney pathway check</span>
        <h3>Consider HSC True Reward?</h3>
        <p>Because Western Sydney University appears in the recommended options, check HSC True Reward as a backup or early-offer pathway. WSU says it uses Year 11/12 subject results rather than your scaled ATAR, but it is not automatic entry: excluded courses, subject-band rules and official dates must be confirmed on WSU's page.</p>
      </div>
      <a href="${trueRewardUrl}" target="_blank" rel="noreferrer">Open WSU HSC True Reward ${icon("external")}</a>
    </section>
  `;
}

function renderGuideSubjectTarget(item) {
  const tone = item.required ? "required" : item.current ? "current" : "suggested";
  return `
    <article class="guide-subject-target ${tone}">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.badge)}</span>
      <p>${escapeHtml(item.reason)}</p>
      <small>${escapeHtml(item.target)}</small>
    </article>
  `;
}

function renderEntryCheck(label, value, badge) {
  const info = normaliseSubjectDisplay(decodeHtmlEntities(value || "")).trim();
  const hasInfo = hasSpecificInfo(info);
  return `
    <article class="${hasInfo ? "has-info" : ""}">
      <span>${escapeHtml(badge)}</span>
      <strong>${escapeHtml(label)}</strong>
      <p>${escapeHtml(hasInfo ? truncateText(info, 260) : "Not listed in the imported data. Check the official course page before relying on this.")}</p>
    </article>
  `;
}

function renderGuideCourseOption(entry, index) {
  const course = entry.course;
  const rank = displayRank(course.atar);
  const job = courseIncomeOutcomes(course)[0];
  return `
    <article class="guide-course-option">
      <span>${index + 1}</span>
      <img src="${escapeHtml(course.providerLogo)}" alt="${escapeHtml(course.university)} logo" loading="lazy" />
      <div>
        <strong>${escapeHtml(course.name)}</strong>
        <small>${escapeHtml(course.university)} - ${escapeHtml(course.campus)} - ATAR ${escapeHtml(rank)}</small>
        <p>${escapeHtml(entry.reasons.slice(0, 2).join(" "))}</p>
        <em>${escapeHtml(job.title)} ${escapeHtml(job.range)}</em>
      </div>
      <a href="${escapeHtml(course.uacUrl || course.officialUrl || "#")}" target="_blank" rel="noreferrer">Open</a>
    </article>
  `;
}

function bindGuideEvents() {
  window.courseFinderTheme?.bind?.(guideApp);
  const form = guideApp.querySelector("[data-guide-form]");
  bindGuideDeckEvents();
  form?.addEventListener("input", (event) => {
    const target = event.target;
    if (target.dataset.guideTermRow) {
      const row = guideState.subjectsWithMarks.find((item) => item.id === target.dataset.guideTermRow);
      if (row && target.dataset.guideTermKey) row[target.dataset.guideTermKey] = target.value;
      scheduleGuideProgressSave();
      return;
    }
    if (target.dataset.guideMarkRow) {
      const row = guideState.subjectsWithMarks.find((item) => item.id === target.dataset.guideMarkRow);
      if (row) row.mark = target.value;
      scheduleGuideProgressSave();
      return;
    }
    if (!target.name) return;
    guideState[target.name] = target.value;
    guideState.result = null;
    scheduleGuideProgressSave();
  });
  form?.addEventListener("change", (event) => {
    const target = event.target;
    if (target.dataset.guideSubjectRow) {
      const row = guideState.subjectsWithMarks.find((item) => item.id === target.dataset.guideSubjectRow);
      if (row) row.subject = target.value;
      persistGuideProgress();
      renderGuide({ preserveScroll: true });
      return;
    }
    if (!target.name) return;
    guideState[target.name] = target.value;
    if (target.name === "year") {
      if (guideState.year !== "Year 10 or below") guideState.schoolPerformance = "Not sure yet";
      persistGuideProgress();
      renderGuide({ preserveScroll: true });
      return;
    }
    persistGuideProgress();
  });
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    readGuideForm(form);
    if (!hasAnyGuideAnswer()) {
      guideState.result = null;
      persistGuideProgress();
      renderGuide({ preserveScroll: true });
      return;
    }
    guideState.processing = true;
    renderGuide({ preserveScroll: true });
    window.setTimeout(() => {
      guideState.result = buildGuidePlan();
      guideState.processing = false;
      persistGuideProgress();
      renderGuide({ preserveScroll: true });
      requestAnimationFrame(() => {
        guideApp.querySelector("#guide-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 220);
  });
  guideApp.querySelector("[data-guide-reset]")?.addEventListener("click", () => {
    localStorage.removeItem(guideStorageKey);
    Object.assign(guideState, guidePlanningLogic.createGuideState({
      subjectsWithMarks: [createGuideSubjectRow()]
    }));
    guideState.processing = false;
    guideState.result = null;
    renderGuide({ preserveScroll: true });
  });
  guideApp.querySelector("[data-guide-add-subject]")?.addEventListener("click", () => {
    guideState.subjectsWithMarks.push(createGuideSubjectRow());
    persistGuideProgress();
    renderGuide({ preserveScroll: true });
  });
  guideApp.querySelectorAll("[data-guide-remove-subject]").forEach((button) => {
    button.addEventListener("click", () => {
      guideState.subjectsWithMarks = guideState.subjectsWithMarks.filter((row) => row.id !== button.dataset.guideRemoveSubject);
      if (!guideState.subjectsWithMarks.length) guideState.subjectsWithMarks.push(createGuideSubjectRow());
      persistGuideProgress();
      renderGuide({ preserveScroll: true });
    });
  });
  guideApp.querySelectorAll("[data-guide-job]").forEach((button) => {
    button.addEventListener("click", () => {
      guideState.dreamJob = button.dataset.guideJob || "";
      guideState.result = null;
      persistGuideProgress();
      renderGuide({ preserveScroll: true });
      guideApp.querySelector('input[name="dreamJob"]')?.focus();
    });
  });
}

function replaceGuideDeck() {
  const current = guideApp.querySelector("[data-guide-deck]");
  if (!current) return;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderGuideDirectionDeck().trim();
  current.replaceWith(wrapper.firstElementChild);
  bindGuideDeckEvents();
}

function bindGuideDeckEvents() {
  guideApp.querySelectorAll("[data-guide-deck-answer]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = guidePlanningLogic.updateDirectionAnswer(
        guideState,
        guideState.deckIndex,
        button.dataset.guideDeckAnswer
      );
      guideState.deckAnswers = next.deckAnswers;
      guideState.deckIndex = next.deckIndex;
      guideState.resultRequested = false;
      guideState.result = null;
      persistGuideProgress();
      replaceGuideDeck();
    });
  });
  guideApp.querySelector("[data-guide-deck-back]")?.addEventListener("click", () => {
    guideState.deckIndex = Math.max(0, guideState.deckIndex - 1);
    persistGuideProgress();
    replaceGuideDeck();
  });
}

function persistGuideProgress() {
  localStorage.setItem(guideStorageKey, guidePlanningLogic.serialiseGuideState({
    ...guideState,
    resultRequested: Boolean(guideState.result)
  }));
}

function scheduleGuideProgressSave() {
  window.clearTimeout(guidePersistTimer);
  guidePersistTimer = window.setTimeout(persistGuideProgress, 150);
}

function restoreGuideResultIfNeeded() {
  if (guideRestoreHandled) return;
  guideRestoreHandled = true;
  if (storedGuideState.resultRequested && hasAnyGuideAnswer()) {
    guideState.result = buildGuidePlan();
    renderGuide({ preserveScroll: true });
  }
}

function readGuideForm(form) {
  const data = new FormData(form);
  for (const key of ["year", "dreamJob", "dreamCourse", "dreamIncome", "passions", "schoolPerformance", "preference", "avoid"]) {
    guideState[key] = String(data.get(key) || "").trim();
  }
  if (guideState.year !== "Year 10 or below") guideState.schoolPerformance = "Not sure yet";
}

function hasAnyGuideAnswer() {
  return ["dreamJob", "dreamCourse", "passions", "avoid"].some((key) => String(guideState[key] || "").trim())
    || guideState.dreamIncome !== "Any income"
    || guideState.schoolPerformance !== "Not sure yet"
    || guideState.preference !== "Balanced plan"
    || guideState.deckAnswers.some(Boolean)
    || guideState.subjectsWithMarks.some((row) => guideSubjectRowHasValue(row));
}

function guideSubjectRowHasValue(row) {
  return Boolean(String(row?.subject || row?.mark || "").trim())
    || guideTermFieldsForYear(guideState.year).some((term) => String(row?.[term.key] || "").trim());
}

function buildGuidePlan() {
  const values = normalisedGuideValues();
  const profile = detectGuideProfile(values);
  const ranked = rankGuideCourses(values, profile);
  const primary = ranked[0] || fallbackGuideCourse(profile);
  const options = uniqueProviderOptions(ranked, primary.course).slice(0, 5);
  const jobs = courseIncomeOutcomes(primary.course);
  const rank = numericRank(primary.course.atar);
  const estimatedAtar = values.planningAtar ?? null;
  const targetAtar = rank || estimatedAtar || fallbackAtarForProfile(profile);
  const subjectTargets = buildSubjectTargets(values, profile, primary.course, targetAtar);
  const gap = rank !== null && estimatedAtar !== null ? rank - estimatedAtar : null;
  const pathwayNeeded = gap !== null ? gap > 3 : estimatedAtar !== null && estimatedAtar < 65;
  const providerQuality = guideProviderQuality[profile.label]?.[primary.course.providerId];
  const reach = courseReachLevel(rank, estimatedAtar);
  const hasTrueReward = [primary, ...options].some((entry) => entry?.course?.providerId === "WS" || /western sydney/i.test(entry?.course?.university || ""));

  return {
    profile,
    primary,
    options,
    jobs,
    subjectTargets,
    markEstimate: values.markEstimate,
    schoolEstimate: values.schoolEstimate,
    reach,
    hasTrueReward,
    entryLine: rank === null
      ? "the ATAR profile needs official confirmation"
      : estimatedAtar === null
        ? `the imported ATAR profile is ${displayRank(primary.course.atar)}`
        : rank <= estimatedAtar
          ? `the imported ATAR profile is within your ${formatAtar(estimatedAtar)} estimate`
          : `the imported ATAR profile is ${formatAtar(rank - estimatedAtar)} above your estimate`,
    providerNote: providerQuality ? `The provider profile also helped: ${providerQuality.note}.` : "",
    scoreNote: primary.reasons.slice(0, 2).join(" "),
    atarTargetLabel: rank === null ? "Official profile needed" : `Aim for ${displayRank(primary.course.atar)}+`,
    atarMessage: atarTargetMessage(rank, estimatedAtar, primary.course),
    atarSource: rank === null ? "The imported course record has no numeric ATAR profile." : "Based on the imported UAC ATAR profile for this course.",
    atarMeter: rank || estimatedAtar || 70,
    subjectIntro: subjectIntroForYear(values.year, values.subjects),
    timelineIntro: timelineIntroForYear(values.year),
    steps: buildGuideSteps(values, primary.course, subjectTargets, pathwayNeeded),
    pathwayReason: pathwayNeeded
      ? "Because the target may be above your estimate, build a backup ladder now."
      : "Even if direct entry looks realistic, add backup options so one result does not control the whole plan.",
    pathways: pathwayNeeded ? guidePathwayLinks : guidePathwayLinks.slice(0, 5)
  };
}

function normalisedGuideValues() {
  const markEstimate = calculateGuideAtarEstimate(guideState.subjectsWithMarks);
  const schoolEstimate = guideState.year === "Year 10 or below" ? schoolPerformanceEstimate(guideState.schoolPerformance) : null;
  const planningAtar = markEstimate.atarNumber ?? schoolEstimate?.atar ?? null;
  const subjectNames = guideState.subjectsWithMarks
    .map((row) => findGuideSubject(row.subject)?.name || row.subject)
    .filter(Boolean)
    .join(", ");
  const goal = [guideState.dreamJob, guideState.dreamCourse].filter(Boolean).join(" ");
  const passionSignal = [guideState.passions, guideState.dreamJob, guideState.dreamCourse, guideState.preference, guideState.dreamIncome === "Any income" ? "" : guideState.dreamIncome].filter(Boolean).join(" ");
  return {
    year: guideState.year || "Year 10 or below",
    dreamJob: guideState.dreamJob.trim(),
    dreamCourse: guideState.dreamCourse.trim(),
    dreamIncome: guideState.dreamIncome || "Any income",
    schoolPerformance: guideState.schoolPerformance || "Not sure yet",
    goal: goal.trim(),
    passions: passionSignal.trim(),
    subjects: subjectNames,
    subjectsWithMarks: guideState.subjectsWithMarks,
    atar: planningAtar === null ? "" : String(planningAtar),
    planningAtar,
    income: guideState.dreamIncome || "Any income",
    preference: guideState.preference || "Balanced plan",
    campus: "Any Sydney campus",
    avoid: guideState.avoid.trim(),
    markEstimate,
    schoolEstimate,
    cleanDreamJob: cleanSearchText(guideState.dreamJob),
    cleanDreamCourse: cleanSearchText(guideState.dreamCourse),
    cleanGoal: cleanSearchText(goal),
    cleanPassions: cleanSearchText(passionSignal),
    cleanSubjects: cleanSearchText(subjectNames),
    cleanPreference: cleanSearchText(guideState.preference),
    cleanAvoid: cleanSearchText(guideState.avoid)
  };
}

function schoolPerformanceEstimate(value) {
  const estimate = guideSchoolLevelEstimates[value];
  if (!estimate) return null;
  return {
    ...estimate,
    hasEstimate: true,
    atarLabel: formatAtar(estimate.atar)
  };
}

function guideDeckScores() {
  return guidePlanningLogic.scoreDirectionDeck(guideState.deckAnswers, directionCards);
}

function detectGuideProfile(values) {
  const source = cleanSearchText([
    values.goal,
    values.passions,
    values.subjects,
    values.preference,
    values.income === "Any income" ? "" : "income money salary"
  ].join(" "));
  const deckScores = guideDeckScores();
  const scored = guideProfiles.map((profile) => {
    let score = 0;
    for (const keyword of profile.cleanKeywords) {
      if (!keyword) continue;
      if (source === keyword) score += 40;
      if (source.includes(keyword)) score += keyword.includes(" ") ? 28 : 16;
      for (const token of tokenise(keyword)) {
        if (tokenMatch(source, token)) score += 4;
      }
    }
    score += Number(deckScores[profile.label] || 0) * 5;
    return { profile, score };
  }).sort((a, b) => b.score - a.score);

  if (scored[0]?.score > 0) return scored[0].profile;
  if (/\b(high income|good pay|salary|money|rich|easy)\b/.test(source)) return guideProfiles.find((profile) => profile.label === "Technology");
  return guideProfiles.find((profile) => profile.label === "Business") || guideProfiles[0];
}

function rankGuideCourses(values, profile) {
  return guideCourses
    .filter((course) => isGuideCourseEligible(course))
    .map((course) => scoreGuideCourse(course, values, profile))
    .filter((entry) => entry.score > 8)
    .sort((a, b) => b.score - a.score || a.course.name.localeCompare(b.course.name))
    .slice(0, 80);
}

function isGuideCourseEligible(course) {
  const level = cleanSearchText((course.levels || [course.level]).join(" "));
  if (level && !level.includes("undergraduate")) return false;
  const campus = cleanSearchText(course.campus);
  if (campus === "online") return true;
  return !/(canberra|bathurst|orange|wagga|port macquarie|lismore|coffs harbour|gold coast|melbourne)/.test(campus);
}

function scoreGuideCourse(course, values, profile) {
  const fields = guideCourseFields(course);
  const query = cleanSearchText([values.goal, values.passions].join(" "));
  const dreamCourse = values.cleanDreamCourse;
  const dreamJob = values.cleanDreamJob;
  const queryTokens = tokenise(query).filter((word) => word.length > 1);
  const jobs = courseIncomeOutcomes(course);
  const reasons = [];
  let score = 0;
  const estimate = parseAtar(values.atar);
  const titleIsPathway = /^(associate degree|assocdeg|advanced diploma|diploma|undergraduate certificate)\b|\bvia diploma\b/.test(fields.title);
  const wantsPathway = /safest entry|flexible pathway/.test(cleanSearchText(values.preference)) || (estimate !== null && estimate < 62);

  if (titleIsPathway && !wantsPathway && (estimate === null || estimate >= 65)) {
    return {
      course,
      score: 0,
      reasons: ["Pathway course kept for backup rather than first recommendation."]
    };
  }

  if (/^bachelor\b/.test(fields.title)) score += 13;
  if (titleIsPathway) {
    score += wantsPathway ? 4 : -18;
  }

  if (dreamCourse) {
    if (fields.title === dreamCourse || fields.title.includes(`bachelor of ${dreamCourse}`)) {
      score += 72;
      reasons.push("Course title directly matches the dream course.");
    } else if (fieldPhraseMatch(fields, "title", dreamCourse)) {
      score += 54;
      reasons.push("Course title strongly matches the dream course.");
    } else if (tokenise(dreamCourse).some((word) => fieldTokenMatch(fields, "title", word))) {
      score += 18;
      reasons.push("Course title partly matches the dream course.");
    }
    if ((/\/|bachelor of .+ and bachelor/.test(fields.title)) && !/law|laws|double|combined/.test(dreamCourse)) {
      score -= 18;
    }
  }

  if (dreamJob) {
    const jobTokens = tokenise(dreamJob).filter((word) => word.length > 2);
    const jobHits = jobTokens.filter((word) => fieldTokenMatch(fields, "title", word) || fieldTokenMatch(fields, "careers", word) || fieldTokenMatch(fields, "area", word)).length;
    score += jobHits * 8;
    if (jobHits) reasons.push("The course points toward the dream job.");
    if (/\b(software engineer|software developer|developer|coding|programming)\b/.test(dreamJob) && /\b(law|laws|criminology|justice)\b/.test(fields.title)) {
      score -= 24;
    }
  }

  if (query) {
    if (fields.title === query || fields.title.includes(`bachelor of ${query}`)) {
      score += 44;
      reasons.push("Course title closely matches the goal.");
    } else if (fieldPhraseMatch(fields, "title", query)) {
      score += 34;
      reasons.push("Course title matches the goal.");
    }
    const titleHits = queryTokens.filter((word) => fieldTokenMatch(fields, "title", word)).length;
    const fieldHits = queryTokens.filter((word) => fieldTokenMatch(fields, "area", word) || fieldTokenMatch(fields, "careers", word)).length;
    score += titleHits * 9 + fieldHits * 5;
    if (titleHits || fieldHits) reasons.push("Keywords match the course field or career outcomes.");
  }

  const careerScore = careerSpecificScore(fields, values, profile);
  score += careerScore.score;
  if (careerScore.reason) reasons.push(careerScore.reason);

  const topicScore = topicScoreForCourse(course, profile);
  score += topicScore;
  if (topicScore > 18) reasons.push(`Strong ${profile.label.toLowerCase()} match.`);

  const subjectScore = subjectFitScore(fields, values.cleanSubjects, profile);
  score += subjectScore;
  if (subjectScore > 6) reasons.push("Subjects line up with the study area.");

  const rankScore = atarFitScore(course, values);
  score += rankScore.score;
  if (rankScore.reason) reasons.push(rankScore.reason);

  const incomeScore = incomeFitScore(jobs, values);
  score += incomeScore.score;
  if (incomeScore.reason) reasons.push(incomeScore.reason);

  const providerScore = guideProviderQuality[profile.label]?.[course.providerId]?.score;
  if (Number.isFinite(providerScore)) score += providerScore / 8;
  else score += providerOverallScore(course.providerId) / 14;

  const campusScore = campusFitScore(course, values.campus);
  score += campusScore.score;
  if (campusScore.reason) reasons.push(campusScore.reason);

  score += preferenceFitScore(course, jobs, values, profile);
  score -= avoidPenalty(course, values);

  return {
    course,
    score,
    reasons: reasons.length ? [...new Set(reasons)].slice(0, 4) : [`Best available ${profile.label.toLowerCase()} match from the imported course data.`]
  };
}

function topicScoreForCourse(course, profile) {
  const fields = guideCourseFields(course);
  return profile.cleanKeywords.reduce((sum, keyword) => {
    if (!keyword) return sum;
    if (fieldPhraseMatch(fields, "title", keyword)) return sum + 17;
    if (fieldPhraseMatch(fields, "area", keyword)) return sum + 11;
    if (fieldPhraseMatch(fields, "careers", keyword)) return sum + 7;
    if (fieldPhraseMatch(fields, "summary", keyword)) return sum + 3;
    return sum;
  }, 0);
}

function careerSpecificScore(fields, values, profile) {
  const source = cleanSearchText(`${values.goal} ${values.passions}`);
  if (profile.label === "Technology" && /\b(software engineer|software developer|developer|coding|programming|apps?|computer science)\b/.test(source)) {
    if (/\b(actuarial|quantum|advanced science|medical science|health science|business administration)\b/.test(fields.title)) {
      return { score: -24, reason: "This is tech-adjacent, but less direct for a software goal." };
    }
    if (/\bsoftware engineering\b/.test(fields.title)) return { score: 30, reason: "Software engineering directly matches the career goal." };
    if (/\bcomputer science\b|\badvanced computer science\b/.test(fields.title)) return { score: 24, reason: "Computer science is a strong software pathway." };
    if (/\bcomputing\b/.test(fields.title)) return { score: 18, reason: "Computing is a strong software pathway." };
    if (/\binformation technology\b|\bit\b/.test(fields.title)) return { score: 15, reason: "Information technology is a practical software pathway." };
    if (/\binformation systems\b/.test(fields.title)) return { score: 10, reason: "Information systems can lead toward software and business technology work." };
    if (/\bgame\b/.test(fields.title)) return { score: 6, reason: "Game development can fit coding, but compare it with broader software degrees." };
  }
  if (profile.label === "Medicine and Health" && /\b(nursing|nurse)\b/.test(source) && /\bnursing\b/.test(fields.title)) {
    return { score: 26, reason: "Nursing directly matches the career goal." };
  }
  if (profile.label === "Law and Justice" && /\b(lawyer|law|solicitor|barrister)\b/.test(source) && /\b(law|laws)\b/.test(fields.title)) {
    return { score: 26, reason: "Law directly matches the career goal." };
  }
  if (profile.label === "Education" && /\b(teacher|teaching|education)\b/.test(source) && /\beducation|teaching\b/.test(fields.title)) {
    return { score: 22, reason: "Education directly matches the career goal." };
  }
  return { score: 0, reason: "" };
}

function subjectFitScore(fields, cleanSubjects, profile) {
  const source = cleanSearchText([cleanSubjects, profile.subjects.join(" ")].join(" "));
  if (!source) return 0;
  const subjectTokens = tokenise(source).filter((word) => word.length > 2);
  return subjectTokens.reduce((sum, word) => {
    if (fieldTokenMatch(fields, "title", word)) return sum + 2.8;
    if (fieldTokenMatch(fields, "area", word) || fieldTokenMatch(fields, "assumed", word) || fieldTokenMatch(fields, "prerequisites", word)) return sum + 1.4;
    return sum;
  }, 0);
}

function atarFitScore(course, values) {
  const estimate = parseAtar(values.atar);
  const rank = numericRank(course.atar);
  if (rank === null && estimate === null) return { score: 0, reason: "" };
  if (rank === null) return { score: estimate === null ? -1 : -10, reason: "ATAR profile needs official checking." };
  if (estimate === null) return { score: Math.max(0, 12 - Math.max(0, rank - 80) / 4), reason: `Imported ATAR profile is ${displayRank(course.atar)}.` };
  const gap = rank - estimate;
  if (gap <= -8) return { score: 17, reason: `ATAR profile is comfortably below your estimate.` };
  if (gap <= 0) return { score: 22, reason: `ATAR profile is within your estimate.` };
  if (gap <= 5) return { score: 12 - gap, reason: `ATAR profile is a small stretch above your estimate.` };
  if (gap <= 12) return { score: 2 - gap * 0.5, reason: `ATAR profile is a stretch, so add backups.` };
  return { score: -9 - gap * 0.25, reason: `ATAR profile is well above your estimate, so pathways matter.` };
}

function incomeFitScore(jobs, values) {
  const minimum = guideIncomeMinimums[values.income] || incomeMinimumFromText(`${values.goal} ${values.passions} ${values.preference}`);
  if (!minimum) return { score: 0, reason: "" };
  const best = jobs[0];
  if (best && best.max >= minimum) return { score: 13 + Math.min(8, (best.max - minimum) / 10000), reason: `Job outcomes can reach ${values.income === "Any income" ? "$100k+" : values.income}.` };
  return { score: -6, reason: "Income goal may need a different specialisation or senior role." };
}

function campusFitScore(course, campusPreference) {
  const campus = cleanSearchText(`${course.campus} ${course.university}`);
  if (campusPreference === "Any Sydney campus") return { score: 0, reason: "" };
  if (campusPreference === "City / inner Sydney") {
    const ok = /(city|cbd|sydney|ultimo|haymarket|kensington|darlington|camperdown|surry hills|broadway|the rocks)/.test(campus);
    return ok ? { score: 8, reason: "Campus preference fits." } : { score: -3, reason: "" };
  }
  if (campusPreference === "Western Sydney") {
    const ok = /(western|parramatta|campbelltown|bankstown|blacktown|penrith|hawkesbury|liverpool)/.test(campus);
    return ok ? { score: 8, reason: "Western Sydney preference fits." } : { score: -4, reason: "" };
  }
  if (campusPreference === "North Sydney / Macquarie") {
    const ok = /(north sydney|macquarie|north ryde|strathfield)/.test(campus);
    return ok ? { score: 8, reason: "North-side campus preference fits." } : { score: -3, reason: "" };
  }
  if (campusPreference === "Online or flexible") {
    const ok = /(online|flexible|external)/.test(cleanSearchText(`${course.campus} ${(course.modes || []).join(" ")}`));
    return ok ? { score: 8, reason: "Flexible study preference fits." } : { score: 0, reason: "" };
  }
  return { score: 0, reason: "" };
}

function preferenceFitScore(course, jobs, values, profile) {
  const preference = cleanSearchText(values.preference);
  const fields = guideCourseFields(course);
  const rank = numericRank(course.atar);
  let score = 0;
  if (/easiest job that pays a lot/.test(preference)) {
    const broadEasyRequest = !values.cleanDreamCourse && !values.cleanDreamJob;
    score += jobs[0] ? jobs[0].max / 12000 : 0;
    if (rank !== null) score += Math.max(0, 90 - rank) / 7;
    if (/information technology|information systems|business analytics|data analytics|construction management|project management|cyber security|business information systems/.test(fields.primary)) score += 18;
    if (broadEasyRequest && /information technology|information systems|business analytics|data analytics|construction management|project management|cyber security|business information systems/.test(fields.primary)) score += 18;
    if (/\bcommerce\b|\bbusiness\b/.test(fields.title) && !/advanced studies|laws|law|engineering/.test(fields.title)) score += 8;
    if (/advanced studies|advanced science|honours|double degree|\/|bachelor of .+ and bachelor|laws|law|medicine|architecture/.test(fields.title)) score -= 26;
    if (/bachelor of .+ and bachelor|\/.*bachelor|bachelor.*\/bachelor/.test(fields.title)) score -= 18;
    if (broadEasyRequest && /(science|engineering|advanced|honours|bachelor of .+ and bachelor)/.test(fields.title)) score -= 20;
    if (/medicine|law|architecture|actuarial|pharmacy|physiotherapy|occupational therapy|paramedicine|midwifery|veterinary|advanced mathematics/.test(fields.title)) score -= 12;
    if (/placement|clinical|portfolio|audition|interview|chemistry|mathematics extension|physics/.test(fields.prerequisites)) score -= 6;
  }
  if (/highest income/.test(preference)) score += jobs[0] ? jobs[0].max / 9000 : 0;
  if (/safest entry/.test(preference) && rank !== null) score += Math.max(0, 85 - rank) / 4;
  if (/prestigious/.test(preference)) score += (guideProviderQuality[profile.label]?.[course.providerId]?.score || providerOverallScore(course.providerId)) / 6;
  if (/helping people/.test(preference) && /(health|nursing|education|social|psychology|community|medicine|teacher)/.test(fields.primary)) score += 10;
  if (/creative/.test(preference) && /(design|creative|media|animation|music|arts|game)/.test(fields.primary)) score += 10;
  if (/flexible pathway/.test(preference) && /(diploma|advanced diploma|pathway|online)/.test(fields.primary)) score += 8;
  if (/avoid heavy maths/.test(preference) && /(mathematics|maths|engineering|physics|actuarial|data science)/.test(fields.primary)) score -= 11;
  if (/avoid heavy science/.test(preference) && /(chemistry|physics|biology|biomedical|medicine|laboratory|science)/.test(fields.primary)) score -= 10;
  return score;
}

function avoidPenalty(course, values) {
  const avoid = values.cleanAvoid;
  if (!avoid) return 0;
  const fields = guideCourseFields(course);
  let penalty = 0;
  if (fields.primary.includes(avoid)) penalty += 40;
  for (const group of guideProviderAliases) {
    if (group.aliases.some((alias) => avoid.includes(cleanSearchText(alias))) && course.providerId === group.id) {
      penalty += 55;
    }
  }
  if (/heavy maths|too much maths|math/.test(avoid) && /(mathematics|maths|engineering|physics|actuarial|data science)/.test(fields.primary)) penalty += 18;
  if (/placement|clinical/.test(avoid) && /(placement|clinical|nursing|teaching|medicine|social work)/.test(fields.primary)) penalty += 14;
  if (/long commute/.test(avoid)) penalty += 2;
  return penalty;
}

function uniqueProviderOptions(ranked, primaryCourse) {
  const seen = new Set([primaryCourse.providerId || primaryCourse.university]);
  const options = [];
  for (const entry of ranked) {
    if (!entry.course || entry.course.id === primaryCourse.id) continue;
    const key = entry.course.providerId || entry.course.university;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push(entry);
  }
  return [ranked.find((entry) => entry.course.id === primaryCourse.id) || { course: primaryCourse, score: 0, reasons: [] }, ...options].slice(0, 5);
}

function fallbackGuideCourse(profile) {
  const sorted = guideCourses
    .filter(isGuideCourseEligible)
    .map((course) => ({ course, score: topicScoreForCourse(course, profile), reasons: [`Best available ${profile.label.toLowerCase()} match.`] }))
    .sort((a, b) => b.score - a.score);
  return sorted[0] || {
    course: guideCourses[0] || {},
    score: 0,
    reasons: ["No strong course match was found."]
  };
}

function buildSubjectTargets(values, profile, course, targetAtar) {
  const entered = parseSubjectList(values.subjects);
  const required = requiredSubjectsFromCourse(course);
  const recommended = [...required, ...profile.subjects];
  const seen = new Set();
  const subjectNames = [];
  for (const name of [...entered, ...recommended]) {
    const subject = findGuideSubject(name);
    if (!subject || seen.has(subject.name)) continue;
    seen.add(subject.name);
    subjectNames.push(subject.name);
    if (subjectNames.length >= 6) break;
  }
  if (!subjectNames.length) {
    for (const name of ["English Advanced", "Mathematics Standard 2", "Business Studies", "Enterprise Computing", "Biology"]) {
      const subject = findGuideSubject(name);
      if (subject) subjectNames.push(subject.name);
    }
  }

  const targetAggregate = aggregateForAtar(targetAtar);
  const targetScaledPerUnit = clamp((targetAggregate || 300) / 10, 25, 45);
  return subjectNames.map((name) => {
    const subject = findGuideSubject(name);
    const requiredHit = required.some((requiredName) => sameSubject(requiredName, subject.name));
    const current = entered.some((enteredName) => sameSubject(enteredName, subject.name));
    const breakEven = breakEvenMark(subject);
    const targetMark = targetMarkForSubject(subject, targetScaledPerUnit);
    const outOf = subject.units * 50;
    const targetText = targetMark === null
      ? "Use your school feedback and official scaling data as a guide."
      : `Aim around ${formatNumber(targetMark, 0)}/${outOf}${breakEven !== null ? `; estimated ATAR break-even is ${formatNumber(breakEven, 1)}/${outOf}` : ""}.`;
    return {
      name: subject.name,
      required: requiredHit,
      current,
      badge: requiredHit ? "possible prerequisite" : current ? "your subject" : "recommended",
      reason: requiredHit
        ? "This appears in the imported prerequisites or entry text, so confirm it before choosing subjects."
        : current
          ? "Keep tracking this because it is already in your subject set."
          : subjectReason(profile, subject.name),
      target: targetText
    };
  });
}

function subjectReason(profile, subjectName) {
  const clean = cleanSearchText(subjectName);
  if (/english/.test(clean)) return "English units are required for ATAR eligibility and help with uni communication.";
  if (/math/.test(clean)) return "Useful for quantitative courses, problem solving and keeping pathways open.";
  if (/enterprise|software|computing/.test(clean)) return "Directly useful for technology, systems and coding paths.";
  if (/biology|chemistry|physics/.test(clean)) return "Useful for science, health or engineering-adjacent pathways.";
  if (/business|economics|legal/.test(clean)) return "Useful for commerce, law, management and decision-making pathways.";
  return `Useful preparation for ${profile.label.toLowerCase()} courses.`;
}

function requiredSubjectsFromCourse(course) {
  const text = cleanSearchText(course.prerequisites || "");
  const matches = [];
  for (const subject of hscSubjects) {
    const cleanName = cleanSearchText(subject.name);
    if (!cleanName) continue;
    if (text.includes(cleanName)) matches.push(subject.name);
    if (subject.name === "Health and Movement Science (HMS)" && /\bpdhpe\b|\bhealth and movement science\b/.test(text)) matches.push(subject.name);
  }
  if (/\bchemistry\b/.test(text)) matches.push("Chemistry");
  if (/\bbiology\b/.test(text)) matches.push("Biology");
  if (/\bphysics\b/.test(text)) matches.push("Physics");
  if (/\bmathematics advanced\b|\bmaths advanced\b/.test(text)) matches.push("Mathematics Advanced");
  if (/\bmathematics extension 1\b|\bmaths extension 1\b|\bmx1\b/.test(text)) matches.push("Mathematics Extension 1");
  return [...new Set(matches)].slice(0, 4);
}

function buildGuideSteps(values, course, subjects, pathwayNeeded) {
  const rank = numericRank(course.atar);
  const targetLine = rank === null ? "Confirm the exact entry profile on UAC and the university page." : `Use ${displayRank(course.atar)} as the first ATAR target.`;
  const subjectLine = subjects.slice(0, 3).map((subject) => subject.name).join(", ");
  if (values.year === "Year 10 or below") {
    return [
      { title: "Pick subjects for doors, not just vibes", text: `Start with English, then choose ${subjectLine || "subjects linked to the course"}. If a course lists prerequisites, those come before nice-to-have subjects.` },
      { title: "Set the ATAR target", text: `${targetLine} Build a higher target if you want the safer version of the plan.` },
      { title: "Use Year 11 to test the direction", text: "Try projects, work experience, competitions, volunteering or short courses that match the job so you know the day-to-day work is actually bearable." },
      { title: "Create a backup ladder", text: pathwayNeeded ? "Add direct-entry, lower-ATAR, diploma and TAFE-to-uni options early." : "Still add a lower-entry related course and a pathway option so one exam period does not ruin the plan." },
      { title: "Work toward the job", text: "In uni, prioritise internships, projects, placements, accreditation and a portfolio or resume that proves practical skill." }
    ];
  }
  if (values.year === "Year 11") {
    return [
      { title: "Check prerequisites now", text: "If a required subject is missing, talk to school and check the university page before it becomes a Year 12 problem." },
      { title: "Set subject mark targets", text: `${targetLine} Use the subject targets above as rough planning marks, then adjust with real school feedback.` },
      { title: "Build three preference bands", text: "Band 1: dream course. Band 2: realistic related courses. Band 3: pathway courses or diplomas that still point to the same job." },
      { title: "Collect evidence", text: "Projects, work experience, volunteering and portfolio pieces help with early entry, scholarships and interviews where relevant." },
      { title: "Review after each assessment block", text: "Update your ATAR estimate, course list and pathway ladder instead of waiting until trial exams." }
    ];
  }
  return [
    { title: "Confirm every entry rule", text: "Open the UAC and university pages for your top courses. Check prerequisites, assumed knowledge, adjustment factors, deadlines and whether offers use selection rank." },
    { title: "Make the preference list strategic", text: "Put your dream course first, then realistic related options, then pathway courses that still move toward the same job." },
    { title: "Use the ATAR gap honestly", text: rank === null ? "When no profile is listed, treat the course as uncertain and keep backups." : `If your final estimate is below ${displayRank(course.atar)}, add lower-entry and pathway options immediately.` },
    { title: "Prepare documents", text: "Keep UAC details, EAS/SRS evidence, portfolio requirements, interviews and scholarship deadlines in one checklist." },
    { title: "Plan the first-year move", text: "After entry, aim for strong first-year marks, internships, placements or internal transfer if you want to move into a more competitive course." }
  ];
}

function atarTargetMessage(rank, estimate, course) {
  if (rank === null) {
    return `${course.name} does not have a numeric imported ATAR profile. Treat it as a course to inspect, then add at least two backup options with clear entry data.`;
  }
  if (estimate === null) {
    return `The imported profile is ${displayRank(course.atar)}. Use that as a first target, then build backups below and around it.`;
  }
  const gap = rank - estimate;
  if (gap <= -5) return `Your estimate is above the imported profile by about ${formatAtar(Math.abs(gap))}. Keep the course, but still use backups.`;
  if (gap <= 0) return `Your estimate is close enough to the imported profile that this is a serious option. Selection-rank rules still matter.`;
  if (gap <= 5) return `This is a stretch by about ${formatAtar(gap)}. Keep it, but add realistic related courses and adjustment-factor checks.`;
  return `This is above your estimate by about ${formatAtar(gap)}. Keep it as a dream course, then build a pathway ladder.`;
}

function subjectIntroForYear(year, subjectText) {
  if (year === "Year 10 or below") return "Choose subjects that protect the pathway first, then choose the subjects you will actually work in.";
  if (subjectText.trim()) return "These targets use your entered subjects first, then fill gaps with useful subjects for the direction.";
  return "Add your current subjects for a sharper plan. For now, these are useful subjects for the matched direction.";
}

function timelineIntroForYear(year) {
  if (year === "Year 10 or below") return "A subject-choice and pathway plan you can follow before Year 11 starts.";
  if (year === "Year 11") return "A Year 11 plan focused on keeping entry options open before Year 12.";
  return "A Year 12 plan focused on applications, backups and realistic entry checks.";
}

function parseSubjectList(value) {
  return String(value || "")
    .split(/[,;/|]+|\band\b/gi)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => findGuideSubject(part)?.name || part)
    .filter(Boolean);
}

function findGuideSubject(value) {
  const clean = cleanSearchText(normaliseSubjectDisplay(value));
  if (!clean) return null;
  if (guideSubjectLookup.has(clean)) return guideSubjectLookup.get(clean);
  for (const [key, subject] of guideSubjectLookup.entries()) {
    if (key.includes(clean) || clean.includes(key)) return subject;
  }
  return null;
}

function buildSubjectLookup() {
  const aliases = {
    "Business Studies": ["BUS", "BST"],
    "Community & Family Studies": ["CAFS", "Community and Family Studies"],
    "Design & Technology": ["DT", "D&T", "Design and Technology"],
    "Earth & Environmental Science": ["EES"],
    "English Advanced": ["ENGA", "English Adv", "Advanced English"],
    "English Standard": ["ENGS", "English Std", "Standard English"],
    "Enterprise Computing": ["ENTC", "Enterprise", "Computing"],
    "Food Technology": ["Food Tech"],
    "Information & Digital Technology Exam": ["IDT", "Info Digital Tech"],
    "Legal Studies": ["Legal"],
    "Mathematics Advanced": ["MATHA", "Math Adv", "Maths Advanced"],
    "Mathematics Extension 1": ["MX1", "Math Ext 1", "Maths Ext 1"],
    "Mathematics Extension 2": ["MX2", "Math Ext 2", "Maths Ext 2"],
    "Mathematics Standard 1 Exam": ["Math Standard 1", "Maths Standard 1", "MST1"],
    "Mathematics Standard 2": ["Math Standard 2", "Maths Standard 2", "MST2"],
    "Health and Movement Science (HMS)": ["HMS", "Health and Movement Science", "PDHPE", "PDH&PE", "PDH"],
    "Software Engineering": ["SENG", "Software"],
    "Studies of Religion I": ["SOR1", "SOR I"],
    "Studies of Religion II": ["SOR2", "SOR II"],
    "Society & Culture": ["SAC", "Society and Culture"]
  };
  const lookup = new Map();
  for (const subject of hscSubjects) {
    const values = [subject.name, subject.field, ...(aliases[subject.name] || [])];
    for (const item of values) {
      lookup.set(cleanSearchText(item), subject);
    }
  }
  return lookup;
}

function sameSubject(a, b) {
  const first = findGuideSubject(a);
  const second = findGuideSubject(b);
  return first && second && first.name === second.name;
}

function guideCourseFields(course) {
  if (guideFieldCache.has(course)) return guideFieldCache.get(course);
  const title = cleanSearchText(course.name);
  const provider = cleanSearchText(course.university);
  const campus = cleanSearchText(course.campus);
  const area = cleanSearchText(course.area);
  const summary = cleanSearchText(course.summary);
  const careers = cleanSearchText(course.careers);
  const prerequisites = cleanSearchText(course.prerequisites);
  const assumed = cleanSearchText(course.assumed);
  const primary = cleanSearchText([
    course.name,
    course.university,
    course.campus,
    course.area,
    course.summary,
    course.careers,
    course.prerequisites,
    course.assumed
  ].join(" "));
  const fields = {
    title,
    provider,
    campus,
    area,
    summary,
    careers,
    prerequisites,
    assumed,
    primary,
    titleTokens: new Set(tokenise(title)),
    providerTokens: new Set(tokenise(provider)),
    campusTokens: new Set(tokenise(campus)),
    areaTokens: new Set(tokenise(area)),
    summaryTokens: new Set(tokenise(summary)),
    careersTokens: new Set(tokenise(careers)),
    prerequisitesTokens: new Set(tokenise(prerequisites)),
    assumedTokens: new Set(tokenise(assumed)),
    primaryTokens: new Set(tokenise(primary))
  };
  guideFieldCache.set(course, fields);
  return fields;
}

function courseIncomeOutcomes(course) {
  if (guideIncomeCache.has(course)) return guideIncomeCache.get(course);
  const fields = guideCourseFields(course);
  const scored = preparedGuideJobProfiles
    .map((profile) => {
      const titleHit = fields.title.includes(profile.cleanTitle) ? 20 : 0;
      const keywordHits = profile.cleanKeywords.reduce((sum, keyword) => {
        if (fieldPhraseMatch(fields, "careers", keyword)) return sum + 16;
        if (fieldPhraseMatch(fields, "title", keyword)) return sum + 10;
        if (fieldPhraseMatch(fields, "primary", keyword)) return sum + 4;
        return sum;
      }, 0);
      return { ...profile, score: titleHit + keywordHits };
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
  const outcomes = unique.length ? unique : [{ title: "Graduate role in this field", min: 60000, max: 90000, range: "$60k-$90k" }];
  guideIncomeCache.set(course, outcomes);
  return outcomes;
}

function scheduleGuidePrewarm() {
  if (guidePrewarmStarted) return;
  guidePrewarmStarted = true;
  window.setTimeout(runGuidePrewarmChunk, 80);
}

function runGuidePrewarmChunk() {
  const startedAt = Date.now();
  while (guidePrewarmIndex < guideCourses.length && Date.now() - startedAt < 12) {
    const course = guideCourses[guidePrewarmIndex];
    guideCourseFields(course);
    courseIncomeOutcomes(course);
    guidePrewarmIndex += 1;
  }
  if (guidePrewarmIndex < guideCourses.length) {
    window.setTimeout(runGuidePrewarmChunk, 24);
  }
}

function providerOverallScore(providerId) {
  const scores = Object.values(guideProviderQuality)
    .map((area) => area[providerId]?.score)
    .filter((score) => Number.isFinite(score));
  if (scores.length) return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const provider = guideProviders.find((item) => item.id === providerId);
  return provider ? Math.min(70, 42 + (provider.courseCount || 0) * 0.08) : 55;
}

function calculateGuideAtarEstimate(rows) {
  const entries = [];
  const bySubject = new Map();
  for (const row of rows || []) {
    const subject = findGuideSubject(row.subject);
    const projection = projectedMarkForGuideRow(row, subject);
    if (!subject || !projection.hasMarks || !Number.isFinite(projection.mark)) continue;
    const max = subject.units * 50;
    const hscTotal = clamp(projection.mark, 0, max);
    const scaledPerUnit = estimateScaledPerUnit(subject, hscTotal / subject.units);
    const entry = {
      name: subject.name,
      units: subject.units,
      maxMark: max,
      projectedMark: hscTotal,
      sourceNote: projection.note,
      hscTotal,
      scaledPerUnit,
      scaledTotal: scaledPerUnit * subject.units,
      impact: scaledPerUnit * subject.units - 25 * subject.units,
      isEnglish: /english/i.test(subject.name)
    };
    const existing = bySubject.get(subject.name);
    if (!existing || entry.scaledTotal > existing.scaledTotal) bySubject.set(subject.name, entry);
  }
  entries.push(...bySubject.values());
  if (!entries.length) {
    return {
      hasMarks: false,
      atarNumber: null,
      atarLabel: "No marks yet",
      aggregate: null,
      note: "Add term marks if you want the Guide to estimate reach level.",
      subjects: []
    };
  }

  const counted = [];
  const bestEnglish = entries.filter((entry) => entry.isEnglish).sort((a, b) => b.scaledTotal - a.scaledTotal)[0];
  if (bestEnglish) counted.push({ ...bestEnglish, countedUnits: Math.min(2, bestEnglish.units) });
  const remaining = entries
    .filter((entry) => entry.name !== bestEnglish?.name)
    .sort((a, b) => b.scaledPerUnit - a.scaledPerUnit || b.scaledTotal - a.scaledTotal);
  for (const entry of remaining) {
    const usedUnits = counted.reduce((sum, item) => sum + item.countedUnits, 0);
    if (usedUnits >= 10) break;
    counted.push({ ...entry, countedUnits: Math.min(entry.units, 10 - usedUnits) });
  }

  const countedUnits = counted.reduce((sum, item) => sum + item.countedUnits, 0);
  const countedAggregate = counted.reduce((sum, item) => sum + item.scaledPerUnit * item.countedUnits, 0);
  const missingUnits = Math.max(0, 10 - countedUnits);
  const assumedAggregate = countedAggregate + missingUnits * 25;
  const atarNumber = estimateAtarFromAggregate(assumedAggregate);
  const warnings = [];
  if (!bestEnglish) warnings.push("Official ATAR eligibility needs English units.");
  if (missingUnits > 0) warnings.push(`${formatNumber(missingUnits, 0)} missing units temporarily held at the neutral break-even line.`);

  return {
    hasMarks: true,
    atarNumber,
    atarLabel: atarNumber === null ? "Not enough data" : formatAtar(atarNumber),
    aggregate: assumedAggregate,
    note: warnings.length ? warnings.join(" ") : "Uses projected subject marks from entered terms and counts your best 10 eligible units, including English.",
    subjects: entries.sort((a, b) => b.scaledTotal - a.scaledTotal)
  };
}

function estimateAtarFromAggregate(aggregate) {
  const value = Number(aggregate);
  if (!Number.isFinite(value) || !atarThresholds.length) return null;
  const sorted = [...atarThresholds].sort((a, b) => b.aggregate - a.aggregate);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];
  if (value >= highest.aggregate) return highest.atar;
  if (value <= lowest.aggregate) return lowest.atar;
  for (let index = 1; index < sorted.length; index += 1) {
    const high = sorted[index - 1];
    const low = sorted[index];
    if (value <= high.aggregate && value >= low.aggregate) {
      const ratio = (value - low.aggregate) / (high.aggregate - low.aggregate);
      return low.atar + ratio * (high.atar - low.atar);
    }
  }
  return null;
}

function courseReachLevel(rank, estimate) {
  if (rank === null && estimate === null) {
    return { label: "Check", text: "No numeric course profile or mark estimate yet." };
  }
  if (rank === null) {
    return { label: "Check", text: "The course has no numeric imported ATAR profile, so confirm entry rules." };
  }
  if (estimate === null) {
    return { label: "Target", text: `Use ${displayRank(rank)} as the planning target until marks are entered.` };
  }
  const gap = rank - estimate;
  if (gap <= 0) return { label: "Likely", text: `Your estimate is at or above the imported ${displayRank(rank)} profile.` };
  if (gap <= 5) return { label: "Stretch", text: `About ${formatAtar(gap)} ATAR points above the estimate. Keep backups.` };
  return { label: "Pathway", text: `About ${formatAtar(gap)} above the estimate. Build lower-entry and pathway options.` };
}

function aggregateForAtar(targetAtar) {
  const atar = Number(targetAtar);
  if (!Number.isFinite(atar) || !atarThresholds.length) return null;
  const highest = atarThresholds[0];
  const lowest = atarThresholds[atarThresholds.length - 1];
  if (atar >= highest.atar) return highest.aggregate;
  if (atar <= lowest.atar) return lowest.aggregate;
  for (let index = 1; index < atarThresholds.length; index += 1) {
    const high = atarThresholds[index - 1];
    const low = atarThresholds[index];
    if (atar <= high.atar && atar >= low.atar) {
      const ratio = (atar - low.atar) / (high.atar - low.atar);
      return low.aggregate + ratio * (high.aggregate - low.aggregate);
    }
  }
  return null;
}

function targetMarkForSubject(subject, targetScaledPerUnit) {
  if (!subject || !Number.isFinite(targetScaledPerUnit)) return null;
  const max = subject.units * 50;
  if (estimateScaledPerUnit(subject, 50) < targetScaledPerUnit) return max;
  let low = 0;
  let high = max;
  for (let index = 0; index < 34; index += 1) {
    const mid = (low + high) / 2;
    const scaled = estimateScaledPerUnit(subject, mid / subject.units);
    if (scaled >= targetScaledPerUnit) high = mid;
    else low = mid;
  }
  return clamp(high, 0, max);
}

function estimateScaledPerUnit(subject, hscPerUnit) {
  const mark = clamp(Number(hscPerUnit) || 0, 0, 50);
  const percentileKeys = [
    ["hscP25", "scaledP25"],
    ["hscP50", "scaledP50"],
    ["hscP75", "scaledP75"],
    ["hscP90", "scaledP90"],
    ["hscP99", "scaledP99"]
  ];
  const anchors = [[0, 0]];
  for (const [hscKey, scaledKey] of percentileKeys) {
    if (isFiniteNumber(subject[hscKey]) && isFiniteNumber(subject[scaledKey])) anchors.push([subject[hscKey], subject[scaledKey]]);
  }
  if (isFiniteNumber(subject.hscMax) && isFiniteNumber(subject.scaledMax)) anchors.push([subject.hscMax, subject.scaledMax]);
  if (isFiniteNumber(subject.scaledMax)) anchors.push([50, Math.min(50, Math.max(subject.scaledMax, subject.scaledP99 || 0))]);
  const cleaned = mergeAnchors(anchors);
  if (cleaned.length >= 3 && cleaned.some(([x]) => x >= mark)) {
    for (let index = 1; index < cleaned.length; index += 1) {
      const [leftX, leftY] = cleaned[index - 1];
      const [rightX, rightY] = cleaned[index];
      if (mark <= rightX) {
        const ratio = rightX === leftX ? 0 : (mark - leftX) / (rightX - leftX);
        return clamp(leftY + ratio * (rightY - leftY), 0, 50);
      }
    }
  }
  if (isFiniteNumber(subject.hscMean) && isFiniteNumber(subject.hscSd) && subject.hscSd > 0 && isFiniteNumber(subject.scaledMean)) {
    const z = (mark - subject.hscMean) / subject.hscSd;
    return clamp(subject.scaledMean + z * (subject.scaledSd || 0), 0, 50);
  }
  return clamp(subject.scaledMean || mark, 0, 50);
}

function breakEvenMark(subject) {
  const max = subject.units * 50;
  if (estimateScaledPerUnit(subject, 50) < 25) return null;
  let low = 0;
  let high = max;
  for (let index = 0; index < 32; index += 1) {
    const mid = (low + high) / 2;
    const scaled = estimateScaledPerUnit(subject, mid / subject.units);
    if (scaled >= 25) high = mid;
    else low = mid;
  }
  return high;
}

function mergeAnchors(anchors) {
  const map = new Map();
  anchors
    .filter(([x, y]) => isFiniteNumber(x) && isFiniteNumber(y))
    .sort((a, b) => a[0] - b[0])
    .forEach(([x, y]) => {
      const key = x.toFixed(3);
      map.set(key, Math.max(map.get(key) ?? -Infinity, y));
    });
  return Array.from(map.entries()).map(([x, y]) => [Number(x), y]).sort((a, b) => a[0] - b[0]);
}

function fallbackAtarForProfile(profile) {
  const defaults = {
    Technology: 75,
    "Medicine and Health": 85,
    Engineering: 82,
    "Architecture and Built Environment": 80,
    Business: 75,
    "Law and Justice": 90,
    "Creative Arts and Design": 70,
    Education: 70,
    Science: 75,
    "Food, Hospitality and Tourism": 65,
    "Sport and Exercise": 68,
    "Social Work and Community": 68
  };
  return defaults[profile.label] || 75;
}

function incomeMinimumFromText(value) {
  const clean = cleanSearchText(value);
  const numeric = clean.match(/\b(60|70|80|90|100|110|120|130|140|150)\s*k\b/);
  if (numeric) return Number(numeric[1]) * 1000;
  if (/six figure|100k|high income|high pay|good pay|salary|income|money|rich/.test(clean)) return 100000;
  return 0;
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
  const collapsed = [...groups.values()].map((group) => {
    const ordered = [...group].sort((a, b) => duplicatePreferenceScore(b) - duplicatePreferenceScore(a));
    const primary = ordered[0];
    return {
      ...primary,
      modes: uniqueValues(group.flatMap((course) => course.modes || [])),
      dedupedCount: group.length
    };
  });
  collapsed.sort((a, b) => a.university.localeCompare(b.university) || a.name.localeCompare(b.name) || a.campus.localeCompare(b.campus));
  return { courses: collapsed };
}

function duplicatePreferenceScore(course) {
  return [
    course.level === "undergraduate" ? 20 : 0,
    numericRank(course.atar) !== null ? 12 : 0,
    hasSpecificInfo(course.prerequisites) ? 8 : 0,
    hasSpecificInfo(course.assumed) ? 6 : 0,
    hasSpecificInfo(course.careers) ? 4 : 0,
    hasSpecificInfo(course.summary) ? 3 : 0
  ].reduce((sum, value) => sum + value, 0);
}

function numericRank(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function parseAtar(value) {
  const numberValue = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(numberValue) && numberValue > 0 && numberValue <= 99.95 ? numberValue : null;
}

function displayRank(value) {
  const parsed = numericRank(value);
  if (parsed !== null) return parsed.toFixed(parsed % 1 ? 2 : 0);
  const code = String(value || "").trim();
  if (!code || code === "0") return "Not listed by UAC.";
  return guideRankMeanings[code] || code;
}

function hasSpecificInfo(value) {
  const text = String(value || "").trim().toLowerCase();
  return Boolean(text && text !== "not listed" && text !== "not listed by uac." && text !== "check official course page.");
}

function normaliseSubjectDisplay(value) {
  return String(value || "")
    .replace(/\bPersonal Development,\s*Health and Physical Education\s*\(PDHPE\)/gi, "Health and Movement Science (HMS)")
    .replace(/\bPersonal Development Health and Physical Education\s*\(PDHPE\)/gi, "Health and Movement Science (HMS)")
    .replace(/\bPersonal Development,\s*Health and Physical Education\b/gi, "Health and Movement Science (HMS)")
    .replace(/\bPersonal Development Health and Physical Education\b/gi, "Health and Movement Science (HMS)")
    .replace(/\bPDH&PE\b/gi, "HMS")
    .replace(/\bPDHPE\b/gi, "HMS");
}

function fieldPhraseMatch(fields, key, phrase) {
  const cleanPhrase = cleanSearchText(phrase);
  if (!cleanPhrase) return false;
  const phraseTokens = tokenise(cleanPhrase);
  if (phraseTokens.length === 1) return fieldTokenMatch(fields, key, phraseTokens[0]);
  return String(fields[key] || "").includes(cleanPhrase);
}

function fieldTokenMatch(fields, key, word) {
  return tokenSetHas(fields[`${key}Tokens`], word);
}

function phraseMatch(text, phrase) {
  const cleanPhrase = cleanSearchText(phrase);
  if (!cleanPhrase) return false;
  const phraseTokens = tokenise(cleanPhrase);
  if (phraseTokens.length === 1) return tokenMatch(text, phraseTokens[0]);
  return cleanSearchText(text).includes(cleanPhrase);
}

function tokenMatch(text, word) {
  const tokens = new Set(tokenise(text));
  return tokenSetHas(tokens, word);
}

function tokenSetHas(tokens, word) {
  if (!tokens) return false;
  return [...tokenVariants(word)].some((variant) => tokens.has(variant));
}

function tokenVariants(word) {
  const clean = cleanSearchText(word);
  const variants = new Set([clean]);
  if (clean.endsWith("ies") && clean.length > 4) variants.add(`${clean.slice(0, -3)}y`);
  if (clean.endsWith("s") && clean.length > 3) variants.add(clean.slice(0, -1));
  if (!clean.endsWith("s") && clean.length > 2) variants.add(`${clean}s`);
  if (clean === "medicine") variants.add("medical");
  if (clean === "medical") variants.add("medicine");
  if (clean === "law") variants.add("laws");
  if (clean === "laws") variants.add("law");
  if (clean === "it") variants.add("information");
  return variants;
}

function tokenise(value) {
  return cleanSearchText(value).split(" ").filter(Boolean);
}

function cleanSearchText(value) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncateText(value, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trim()}...` : text;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
}

function formatAtar(value) {
  const rounded = Math.round(Number(value) * 20) / 20;
  return rounded.toFixed(2);
}

function formatNumber(value, digits = 1) {
  if (!Number.isFinite(value)) return "-";
  return Number(value).toFixed(digits);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(value);
}

function icon(name) {
  const paths = {
    external: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>'
  };
  return `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</svg>`;
}

function scrollGuideNavIntoView() {
  const nav = guideApp.querySelector(".topnav");
  if (!nav || nav.scrollWidth <= nav.clientWidth + 2) return;
  nav.querySelector('[aria-current="page"]')?.scrollIntoView({
    block: "nearest",
    inline: "start"
  });
}
