(function attachPathwayLogic(global) {
  const pathwaySituations = [
    {
      id: "year10",
      label: "Year 10 or below",
      short: "Plan early",
      focus: "Pick senior subjects for the dream course, but know the backup routes before Year 11 starts."
    },
    {
      id: "year12-no-atar",
      label: "Year 12 but no ATAR / unsure ATAR",
      short: "Still at school",
      focus: "Check SRS/EAS if eligible, then add pathway or diploma backups that do not rely on a final ATAR."
    },
    {
      id: "left-y11",
      label: "Left school in Year 11",
      short: "Restart without panic",
      focus: "Start with TAFE/VET, a tertiary preparation course, or a provider pathway that accepts non-Year 12 evidence."
    },
    {
      id: "finished-y12-no-atar",
      label: "Finished Year 12 without an ATAR",
      short: "Use HSC plus a bridge",
      focus: "Use your Year 12 completion with a prep, diploma, undergraduate certificate or STAT/mature-age route where allowed."
    },
    {
      id: "vet",
      label: "Have or want TAFE/VET first",
      short: "Use practical study",
      focus: "Pick a VET course in the same field, then check university credit transfer or admission rules."
    },
    {
      id: "creative",
      label: "Creative, design or performance",
      short: "Show work",
      focus: "Build a portfolio, audition or interview file while checking any diploma or studio pathway."
    },
    {
      id: "mature",
      label: "Mature-age / returning to study",
      short: "Use adult-entry evidence",
      focus: "STAT, open-access study, work evidence and preparation programs may matter more than old school results."
    }
  ];

  const fieldProfiles = [
    {
      id: "business",
      label: "Business / commerce",
      tokens: ["business", "commerce", "marketing", "accounting", "finance", "management", "entrepreneur", "human resources", "hr"],
      target: "business, commerce, accounting, marketing or management degree",
      vet: "Certificate IV or Diploma of Business, Accounting, Marketing or Leadership",
      diploma: "Diploma of Business, Commerce or Business Analytics",
      portfolio: "business case study, customer research, project evidence or work experience"
    },
    {
      id: "defence",
      label: "Defence / ADFA",
      tokens: ["adfa", "defence", "defense", "military", "army", "navy", "air force", "airforce", "officer", "aerospace", "aeronautical", "aviation", "pilot"],
      target: "UNSW Canberra degree through ADFA or another defence-related university pathway",
      vet: "fitness, leadership, maths/English readiness and any related VET or cadet/community leadership evidence",
      diploma: "defence-adjacent enabling, computing, engineering, business, arts or science pathway before applying",
      portfolio: "leadership, teamwork, fitness, service, STEM projects or aviation/defence interest evidence"
    },
    {
      id: "technology",
      label: "Technology / IT",
      tokens: ["software", "computer", "it", "information technology", "cyber", "data", "coding", "programming", "developer", "ai", "game"],
      target: "IT, computer science, software, cyber or data degree",
      vet: "Certificate IV or Diploma of Information Technology, Cyber Security or Programming",
      diploma: "Diploma of IT, Software Development or Engineering pathway",
      portfolio: "GitHub projects, apps, websites, coding challenges or tech portfolio"
    },
    {
      id: "health",
      label: "Health / nursing",
      tokens: ["nursing", "health", "medical", "medicine", "physio", "psychology", "biomed", "pharmacy", "paramedicine", "allied health"],
      target: "health, nursing, biomedical, psychology or allied-health degree",
      vet: "Certificate III/IV health support, Diploma of Nursing or allied-health preparation where available",
      diploma: "Diploma or undergraduate certificate in health science, nursing entry or biomedical preparation",
      portfolio: "first aid, volunteering, aged-care, disability support or health work evidence"
    },
    {
      id: "education",
      label: "Education / teaching",
      tokens: ["teaching", "teacher", "education", "primary", "secondary", "early childhood", "childcare"],
      target: "education, teaching or early-childhood degree",
      vet: "Certificate III or Diploma in Early Childhood Education and Care, school support or community services",
      diploma: "Diploma or pathway course linked to education or arts-to-teaching",
      portfolio: "childcare, tutoring, coaching, youth work or classroom volunteering evidence"
    },
    {
      id: "creative",
      label: "Creative / design",
      tokens: ["animation", "design", "creative", "art", "music", "film", "media", "game design", "acting", "performance", "architecture"],
      target: "design, animation, media, music, performance or creative degree",
      vet: "Certificate IV or Diploma in Design, Screen and Media, Music, Live Production or Visual Arts",
      diploma: "Diploma, foundation studio, design college or creative pathway course",
      portfolio: "portfolio, audition, showreel, interview, sketchbook or project work"
    },
    {
      id: "law",
      label: "Law / justice",
      tokens: ["law", "legal", "justice", "criminology", "policing", "police", "security"],
      target: "law, justice, criminology or policing-related degree",
      vet: "Certificate IV or Diploma in Justice, Legal Services, Government or Community Services",
      diploma: "Diploma or associate-degree pathway into law, arts, criminology or justice",
      portfolio: "debating, legal studies work, volunteering, community or leadership evidence"
    },
    {
      id: "engineering",
      label: "Engineering / built environment",
      tokens: ["engineering", "engineer", "construction", "civil", "mechanical", "electrical", "architecture", "built", "surveying"],
      target: "engineering, construction, built environment or architecture-adjacent degree",
      vet: "Certificate IV or Diploma in Engineering, Building Design, Construction, Surveying or CAD",
      diploma: "Engineering, built environment or construction management diploma pathway",
      portfolio: "CAD work, projects, maths evidence, maker projects or construction/worksite evidence"
    },
    {
      id: "general",
      label: "General degree pathway",
      tokens: [],
      target: "chosen degree or career area",
      vet: "Certificate IV, diploma or TAFE course in the closest field",
      diploma: "Diploma, undergraduate certificate, foundation or preparation program",
      portfolio: "work samples, references, volunteering, projects or short-course evidence"
    }
  ];

  const routeTemplates = [
    {
      id: "tafe-vet",
      baseTitle: "TAFE/VET pathway",
      shortTitle: "TAFE/VET first",
      year12Rule: "This path does not usually need Year 12 for many VET courses, but the exact course can still have age, literacy, licensing or prerequisite rules.",
      bestFor: "Leaving in Year 11, no ATAR, wanting practical skills first, or needing a lower-pressure restart.",
      officialLabel: "TAFE NSW pathways",
      officialUrl: "https://www.tafensw.edu.au/study/pathways",
      scores: { "left-y11": 45, vet: 46, "finished-y12-no-atar": 28, "year12-no-atar": 22, year10: 16, mature: 24, creative: 18 },
      profileBoosts: { business: 8, technology: 8, health: 7, education: 7, creative: 7, law: 4, engineering: 8 },
      steps(profile) {
        return [
          `Start with ${profile.vet}.`,
          `Use that qualification to apply for a related ${profile.target}.`,
          "Before enrolling, ask the university what credit or admission advantage that exact VET course gives."
        ];
      }
    },
    {
      id: "uni-prep",
      baseTitle: "Uni preparation / foundation",
      shortTitle: "Prep program",
      year12Rule: "Some tertiary preparation courses are made for applicants who have not completed Year 12 and do not require an ATAR.",
      bestFor: "Students who need university skills first or a formal bridge before a diploma or bachelor.",
      officialLabel: "UAC pathway programs",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university",
      scores: { "left-y11": 36, "finished-y12-no-atar": 42, "year12-no-atar": 36, mature: 36, year10: 20, vet: 20, creative: 18 },
      profileBoosts: { general: 4, health: 5, engineering: 5, technology: 4, education: 4 },
      steps(profile) {
        return [
          "Apply for a uni preparation, foundation, enabling or tertiary preparation course.",
          `Choose units that point toward a ${profile.target}.`,
          "After completion, use the result to apply for the degree or a related diploma pathway."
        ];
      }
    },
    {
      id: "diploma",
      baseTitle: "Diploma / Undergraduate Certificate",
      shortTitle: "Diploma bridge",
      year12Rule: "This may or may not need Year 12. Some providers accept VET, work evidence, mature-age evidence or other criteria instead.",
      bestFor: "A structured bridge into a related degree, especially when direct entry is too risky.",
      officialLabel: "UAC admission criteria",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria",
      scores: { "finished-y12-no-atar": 40, "year12-no-atar": 38, "left-y11": 28, vet: 32, mature: 30, year10: 20, creative: 24 },
      profileBoosts: { business: 10, technology: 9, health: 7, education: 5, creative: 8, law: 4, engineering: 8 },
      steps(profile) {
        return [
          `Search for a ${profile.diploma}.`,
          "Check whether completion gives guaranteed entry, competitive entry or credit.",
          "Put the dream degree first, then the diploma/pathway option below it as the safer ladder."
        ];
      }
    },
    {
      id: "wsu-college",
      baseTitle: "Western Sydney University The College pathway",
      shortTitle: "WSU College",
      year12Rule: "Western Sydney University The College offers University Foundation Studies and Diploma Programs as WSU's official pathway provider. Entry, length and progression still depend on the exact program.",
      bestFor: "Sydney students who want a local diploma or foundation bridge into Western Sydney University before trying a direct bachelor entry.",
      officialLabel: "Western Sydney University The College",
      officialUrl: "https://www.westernsydney.edu.au/future/study/application-pathways/the-college/courses",
      excludedProfiles: ["defence"],
      scores: { "year12-no-atar": 44, "finished-y12-no-atar": 42, "left-y11": 32, vet: 30, mature: 28, year10: 24, creative: 24 },
      profileBoosts: { business: 12, technology: 12, health: 10, education: 10, creative: 8, law: 6, engineering: 10, general: 5 },
      steps(profile) {
        const diploma = wsuDiplomaForProfile(profile);
        return [
          `Check WSU The College for ${diploma}.`,
          "Confirm whether it is a diploma, extended diploma or foundation/preparation option and what bachelor it can lead into.",
          "Ask whether completion gives guaranteed progression, competitive entry, credit, or just stronger preparation."
        ];
      }
    },
    {
      id: "portfolio",
      baseTitle: "Portfolio / interview route",
      shortTitle: "Show evidence",
      year12Rule: "ATAR may be less central for some creative or practical courses, but the exact portfolio, audition or interview rule is course-specific.",
      bestFor: "Creative, design, media, animation, music, performance or practical courses where evidence of work matters.",
      officialLabel: "Check UAC course criteria",
      officialUrl: "https://uac.edu.au/course-search/search",
      scores: { creative: 44, "year12-no-atar": 14, "left-y11": 14, "finished-y12-no-atar": 14, mature: 14, year10: 18, vet: 10 },
      profileBoosts: { creative: 46, technology: 8, engineering: 5, business: 3 },
      steps(profile) {
        return [
          `Build ${profile.portfolio}.`,
          "Check the exact file format, due date, interview or audition requirement.",
          "Pair the portfolio with a VET/diploma/prep backup so the plan is not one-shot."
        ];
      }
    },
    {
      id: "adfa",
      baseTitle: "ADFA / UNSW Canberra officer pathway",
      shortTitle: "ADFA",
      year12Rule: "ADFA is not a generic no-ATAR shortcut. It is a defence officer pathway where ADF Careers selection and UNSW Canberra degree entry both matter.",
      bestFor: "Students aiming for Navy, Army or Air Force officer roles who also want a UNSW degree and military leadership training.",
      officialLabel: "ADF Careers ADFA",
      officialUrl: "https://www.adfcareers.gov.au/students-and-education/australian-defence-force-academy",
      profiles: ["defence"],
      scores: { year10: 46, "year12-no-atar": 38, "finished-y12-no-atar": 30, mature: 24, "left-y11": 18, vet: 16, creative: 0 },
      profileBoosts: { defence: 36 },
      steps(profile) {
        return [
          "Check ADFA through ADF Careers and UNSW Canberra, not just ordinary UAC course search.",
          `Match the degree area to your target: ${adfaStudyAreasForProfile(profile)}.`,
          "Prepare for officer selection, medical/fitness requirements and service commitment alongside academic entry."
        ];
      }
    },
    {
      id: "srs-eas",
      baseTitle: "SRS / EAS while still in Year 12",
      shortTitle: "School/access schemes",
      year12Rule: "This is mainly for current Year 12 applicants. It does not replace prerequisites and it is not a guarantee.",
      bestFor: "Students still at school who may be eligible for early offers or educational-disadvantage consideration.",
      officialLabel: "UAC SRS and EAS",
      officialUrl: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes",
      scores: { "year12-no-atar": 42, year10: 18, "finished-y12-no-atar": 8, "left-y11": 0, vet: 0, mature: 0, creative: 8 },
      profileBoosts: { general: 4 },
      steps() {
        return [
          "Submit the UAC undergraduate application first.",
          "Apply for Schools Recommendation Scheme and Educational Access Scheme if eligible.",
          "Still keep pathway preferences underneath because scheme outcomes are not guaranteed."
        ];
      }
    },
    {
      id: "stat",
      baseTitle: "STAT / mature-age route",
      shortTitle: "STAT evidence",
      year12Rule: "Usually most relevant for mature-age or non-school-leaver applicants. Each institution decides whether STAT is accepted.",
      bestFor: "People with no recent formal results, older applicants, or students returning after a break.",
      officialLabel: "UAC STAT pathway",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university",
      scores: { mature: 46, "finished-y12-no-atar": 20, "left-y11": 16, vet: 12, "year12-no-atar": 8, year10: 0, creative: 8 },
      profileBoosts: { general: 3 },
      steps(profile) {
        return [
          `Confirm whether the target ${profile.target} accepts STAT.`,
          "Book the correct STAT version only if the institution/course says it can be used.",
          "Use STAT with any work, VET, open-access or previous-study evidence."
        ];
      }
    },
    {
      id: "open-access",
      baseTitle: "Open access / single units",
      shortTitle: "Start small online",
      year12Rule: "Open-access study can be a way to prove readiness without a school ATAR, but later admission still depends on results and course rules.",
      bestFor: "Students who need flexibility, online study or a small test before committing to a full degree.",
      officialLabel: "Open Universities Australia",
      officialUrl: "https://www.open.edu.au/study-online/pathways-pre-university/oua-pathways",
      scores: { mature: 34, "finished-y12-no-atar": 26, "left-y11": 22, vet: 18, "year12-no-atar": 18, year10: 8, creative: 10 },
      profileBoosts: { business: 4, technology: 6, education: 3, general: 5 },
      steps(profile) {
        return [
          `Start with one or two units connected to a ${profile.target}.`,
          "Aim for strong marks because later admission may use tertiary performance.",
          "Ask whether those units can count as credit before you pay for more."
        ];
      }
    },
    {
      id: "transfer",
      baseTitle: "Start related, then transfer",
      shortTitle: "Transfer later",
      year12Rule: "You usually need entry into the first course, then strong results. Transfer is competitive unless the provider guarantees progression.",
      bestFor: "Students near the target but needing a safer first course that shares subjects with the dream degree.",
      officialLabel: "UAC admission criteria",
      officialUrl: "https://uac.edu.au/future-applicants/admission-criteria",
      scores: { "finished-y12-no-atar": 18, "year12-no-atar": 18, vet: 18, mature: 14, "left-y11": 10, year10: 12, creative: 10 },
      profileBoosts: { engineering: 6, technology: 5, business: 5, health: 4 },
      steps(profile) {
        return [
          `Begin in a related lower-entry course linked to a ${profile.target}.`,
          "Use first-year marks to apply for transfer.",
          "Check minimum GPA/WAM, credit rules and transfer deadlines before choosing the first course."
        ];
      }
    }
  ];

  const pathwayProviderTemplates = [
    {
      id: "wsu-college",
      name: "Western Sydney University — The College",
      officialUrl: "https://www.westernsydney.edu.au/future/study/application-pathways/the-college/courses",
      excludedProfiles: ["defence"],
      situations: { year10: 18, "year12-no-atar": 45, "left-y11": 28, "finished-y12-no-atar": 44, vet: 34, creative: 30, mature: 32 },
      profiles: { business: 14, technology: 14, health: 14, education: 14, creative: 14, law: 8, engineering: 14, general: 7 },
      program(profile, situation) {
        if (situation.id === "left-y11") return `Foundation/preparation first, then ${wsuDiplomaForProfile(profile)}`;
        return wsuDiplomaForProfile(profile);
      },
      outcome(profile) {
        return `Complete the linked College program with the required result, then progress or apply to the related Western Sydney University ${profile.target}.`;
      },
      requirements: "Confirm the exact program’s school-completion rule, fees, duration, linked bachelor and whether progression is guaranteed or competitive.",
      evidence: "Official WSU pathway provider; linked diplomas can lead into the related bachelor, often with advanced standing."
    },
    {
      id: "uts-college",
      name: "UTS College",
      officialUrl: "https://utscollege.edu.au/programs/diplomas",
      excludedSituations: ["left-y11"],
      excludedProfiles: ["defence", "law", "education"],
      situations: { year10: 14, "year12-no-atar": 43, "finished-y12-no-atar": 46, vet: 30, creative: 40, mature: 26 },
      profiles: { business: 14, technology: 16, health: 5, creative: 18, engineering: 16, general: 6 },
      program(profile) {
        const programs = {
          business: "Diploma of Business",
          technology: "Diploma of Information Technology",
          creative: "Diploma of Animation Production, Communication, or Design & Architecture",
          engineering: "Diploma of Engineering",
          health: "Diploma of Science",
          general: "field-matched UTS College diploma"
        };
        return programs[profile.id] || programs.general;
      },
      outcome(profile) {
        return `Use the diploma as first-year-equivalent study, meet the stated progression result, then move into the linked UTS ${profile.target}.`;
      },
      requirements: "Domestic diploma entry uses HSC subject averages/provider criteria rather than an ATAR alone. Confirm the required subjects, pace, GPA, credit and destination degree.",
      evidence: "Official UTS pathway college; most diplomas run for 8 or 12 months and are designed around related first-year UTS study."
    },
    {
      id: "macquarie-college",
      name: "Macquarie University College",
      officialUrl: "https://www.mq.edu.au/study/admissions-and-entry/pathways/requirements/domestic",
      excludedProfiles: ["defence"],
      situations: { year10: 16, "year12-no-atar": 38, "left-y11": 46, "finished-y12-no-atar": 40, vet: 44, creative: 24, mature: 45 },
      profiles: { business: 14, technology: 14, health: 8, education: 8, creative: 8, law: 8, engineering: 12, general: 10 },
      program(profile, situation) {
        if (situation.id === "left-y11") return "UniReady or Foundation Program before a diploma/bachelor";
        if (situation.id === "vet") return `recognised Certificate IV/Diploma entry or a ${profile.label.toLowerCase()} diploma`;
        return `${profile.label} diploma, UniReady or Foundation pathway`;
      },
      outcome(profile) {
        return `Complete the approved preparation or diploma result, then progress or apply to a nominated Macquarie ${profile.target}; eligible diplomas can lead to Year 2.`;
      },
      requirements: "Check domestic eligibility, the minimum completion result, nominated destination degrees, credit and whether your VET/work evidence is accepted.",
      evidence: "Official Macquarie pathways include UniReady, Foundation, diplomas and recognised tertiary/VET study."
    },
    {
      id: "unsw-college",
      name: "UNSW College",
      officialUrl: "https://www.unswcollege.edu.au/study/diplomas-overview?studentType=domestic",
      excludedSituations: ["left-y11", "mature"],
      excludedProfiles: ["defence", "health", "education", "law"],
      situations: { year10: 12, "year12-no-atar": 39, "finished-y12-no-atar": 42, vet: 20, creative: 34 },
      profiles: { business: 12, technology: 14, creative: 12, engineering: 16, general: 5 },
      program(profile) {
        const programs = {
          business: "Diploma of Business",
          technology: "Diploma of Computer Science",
          creative: "Diploma of Architecture or Media and Communication",
          engineering: "Diploma of Engineering",
          general: "eligible UNSW College diploma"
        };
        return programs[profile.id] || programs.general;
      },
      outcome(profile) {
        return `Complete the 12-month diploma and meet progression requirements, then enter second year of the linked UNSW ${profile.target}.`;
      },
      requirements: "Confirm domestic entry criteria, English and subject requirements, the exact linked UNSW degree, progression marks, fees and available places.",
      evidence: "Official UNSW College diplomas cover architecture, business, computer science, engineering, media/communication and science."
    },
    {
      id: "sydney-pathways",
      name: "University of Sydney admission pathways",
      officialUrl: "https://www.sydney.edu.au/study/applying/admission-pathways.html",
      excludedProfiles: ["defence"],
      situations: { year10: 8, "year12-no-atar": 35, "finished-y12-no-atar": 18, vet: 14, creative: 46, mature: 48 },
      profiles: { creative: 18, law: 7, health: 7, business: 6, technology: 5, engineering: 5, general: 8 },
      program(profile, situation) {
        if (situation.id === "creative" || profile.id === "creative") return "portfolio, audition or interview pathway where the course offers it";
        if (situation.id === "mature") return "mature-age entry, Tertiary Preparation Certificate or STAT where accepted";
        if (situation.id === "year12-no-atar") return "MySydney, E12 or other eligible admission scheme";
        return "eligible admission or transfer pathway";
      },
      outcome(profile) {
        return `Meet the exact scheme or alternative-entry requirements, then apply to an eligible University of Sydney ${profile.target}; otherwise use tertiary study and transfer later.`;
      },
      requirements: "These routes are course-specific. Confirm eligibility, deadlines, prerequisites, additional criteria and whether the target course participates.",
      evidence: "Official University of Sydney pathways distinguish current-school, mature-age, creative and transfer applicants."
    },
    {
      id: "adfa",
      name: "ADFA — UNSW Canberra",
      officialUrl: "https://www.adfcareers.gov.au/students-and-education/australian-defence-force-academy",
      onlyProfiles: ["defence"],
      situations: { year10: 50, "year12-no-atar": 44, "left-y11": 18, "finished-y12-no-atar": 26, vet: 20, mature: 24 },
      profiles: { defence: 30 },
      program() {
        return "ADF officer application plus an eligible UNSW Canberra degree";
      },
      outcome() {
        return "Pass ADF Careers officer selection and UNSW entry, then study at ADFA while training for a Navy, Army or Air Force officer role.";
      },
      requirements: "Confirm citizenship/eligibility, medical and fitness standards, aptitude and officer selection, service commitment, degree entry and the required application sequence.",
      evidence: "ADFA is a combined defence-employment and university pathway, not a generic no-ATAR shortcut."
    }
  ];

  function classifyPathwayGoal(goal = "") {
    const clean = cleanSearchText(goal);
    if (!clean) return fieldProfiles.find((profile) => profile.id === "general");
    const scored = fieldProfiles
      .filter((profile) => profile.id !== "general")
      .map((profile) => ({
        profile,
        score: profile.tokens.reduce((sum, token) => sum + (clean.includes(cleanSearchText(token)) ? token.length : 0), 0)
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0]?.score ? scored[0].profile : fieldProfiles.find((profile) => profile.id === "general");
  }

  function buildPathwayResults({ goal = "", situation = "year12-no-atar", courses = [] } = {}) {
    const profile = classifyPathwayGoal(goal);
    const currentSituation = pathwaySituations.find((item) => item.id === situation) || pathwaySituations[1];
    const signals = pathwayDataSignals(profile, courses);
    const routes = routeTemplates
      .map((route) => hydrateRoute(route, profile, currentSituation))
      .filter((route) => route.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 4);
    const providers = pathwayProviderTemplates
      .map((provider) => hydratePathwayProvider(provider, profile, currentSituation))
      .filter((provider) => provider.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, profile.id === "defence" ? 1 : 4);
    return {
      goal: String(goal || "").trim(),
      profile,
      situation: currentSituation,
      routes,
      providers,
      signals,
      summary: summaryFor(currentSituation, profile, routes[0])
    };
  }

  function hydratePathwayProvider(provider, profile, situation) {
    if (provider.onlyProfiles && !provider.onlyProfiles.includes(profile.id)) return { id: provider.id, score: 0 };
    if (provider.excludedProfiles?.includes(profile.id)) return { id: provider.id, score: 0 };
    if (provider.excludedSituations?.includes(situation.id)) return { id: provider.id, score: 0 };
    const situationScore = provider.situations?.[situation.id] || 0;
    const profileScore = provider.profiles?.[profile.id] ?? provider.profiles?.general ?? 0;
    if (!situationScore) return { id: provider.id, score: 0 };
    const program = provider.program(profile, situation);
    return {
      id: provider.id,
      name: provider.name,
      officialUrl: provider.officialUrl,
      program,
      why: providerFitExplanation(provider.id, profile, situation, program),
      steps: [
        situation.label,
        program,
        provider.outcome(profile, situation)
      ],
      requirements: provider.requirements,
      evidence: provider.evidence,
      score: situationScore + profileScore
    };
  }

  function providerFitExplanation(providerId, profile, situation, program) {
    const start = situation.id === "year10"
      ? "This is a backup to plan now, not something you need to enrol in yet."
      : `This fits someone who is ${situation.short.toLowerCase()}.`;
    if (providerId === "uts-college") {
      return `${start} ${program} is closely matched to ${profile.label.toLowerCase()} and domestic entry is assessed using provider criteria such as HSC subject averages, not a single ATAR cut-off.`;
    }
    if (providerId === "macquarie-college" && situation.id === "left-y11") {
      return "Macquarie specifically points applicants without standard Year 12 evidence toward UniReady or Foundation preparation before diploma or bachelor entry.";
    }
    if (providerId === "sydney-pathways" && (situation.id === "creative" || profile.id === "creative")) {
      return "This is relevant because some Sydney creative courses assess a portfolio, audition or interview alongside academic eligibility.";
    }
    if (providerId === "adfa") {
      return "This is the direct university-and-employment route for an ADF officer goal, with both defence selection and UNSW Canberra entry.";
    }
    return `${start} This program keeps the study area connected to ${profile.label.toLowerCase()} instead of sending you through an unrelated general course.`;
  }

  function hydrateRoute(route, profile, situation) {
    if (route.profiles && !route.profiles.includes(profile.id)) {
      return { id: route.id, score: 0 };
    }
    if (route.excludedProfiles?.includes(profile.id)) {
      return { id: route.id, score: 0 };
    }
    const profileBoost = route.profileBoosts?.[profile.id] ?? route.profileBoosts?.general ?? 0;
    const situationScore = route.scores?.[situation.id] ?? 0;
    const title = route.id === "tafe-vet"
      ? `${profile.label} via TAFE/VET`
      : route.id === "diploma"
        ? profile.id === "defence"
          ? "Defence-adjacent study bridge"
          : `${profile.label} diploma bridge`
        : route.id === "wsu-college"
          ? wsuRouteTitle(profile)
          : route.baseTitle;
    return {
      id: route.id,
      title,
      shortTitle: route.shortTitle,
      bestFor: route.bestFor,
      year12Rule: route.year12Rule,
      officialLabel: route.officialLabel,
      officialUrl: route.officialUrl,
      links: routeLinks(route, profile),
      details: routeDetails(route.id, profile),
      requirements: routeRequirements(route.id, profile, situation),
      universityPathway: routeUniversityPathway(route.id, profile),
      steps: route.steps(profile),
      score: situationScore + profileBoost,
      check: checkText(route.id, profile)
    };
  }

  function pathwayDataSignals(profile, courses) {
    if (!Array.isArray(courses) || !courses.length) return { count: 0, labels: [] };
    const terms = [profile.label, profile.target, profile.vet, profile.diploma].flatMap((item) => cleanSearchText(item).split(" ")).filter((word) => word.length > 3);
    const labels = [];
    let count = 0;
    for (const course of courses) {
      const text = cleanSearchText([course.name, course.area, course.summary, course.prerequisites, course.careers].filter(Boolean).join(" "));
      if (!terms.some((term) => text.includes(term))) continue;
      if (!/diploma|certificate|foundation|prepar|pathway|portfolio|interview|no|vet|tafe/.test(text) && String(course.atar || "").toUpperCase() !== "NO") continue;
      count += 1;
      if (labels.length < 3 && course.name) labels.push(course.name);
    }
    return { count, labels };
  }

  function summaryFor(situation, profile, bestRoute) {
    return `${situation.focus} For ${profile.label.toLowerCase()}, start by checking ${bestRoute?.shortTitle || "a pathway route"} and then confirm the official entry rules.`;
  }

  function checkText(routeId, profile) {
    if (routeId === "tafe-vet") return `Ask: does this ${profile.vet} give entry, credit, both, or just useful preparation?`;
    if (routeId === "diploma") return "Ask: is progression guaranteed, competitive, or just possible after completion?";
    if (routeId === "wsu-college") return "Ask: which Western bachelor does this exact The College program lead into, and is progression guaranteed or competitive?";
    if (routeId === "portfolio") return "Ask: what evidence format, deadline and interview/audition rules apply?";
    if (routeId === "adfa") return "Ask: am I applying for a defence officer role, and what ADF selection plus UNSW entry checks apply?";
    if (routeId === "srs-eas") return "Ask: am I eligible, and does the target course still have prerequisites?";
    if (routeId === "stat") return "Ask: does this institution accept STAT for this exact course?";
    if (routeId === "open-access") return "Ask: can these units count as credit later?";
    return "Ask: what result do I need before I can transfer?";
  }

  function routeDetails(routeId, profile) {
    const diploma = wsuDiplomaForProfile(profile);
    if (routeId === "tafe-vet") return `Start with a field-matched VET qualification such as ${profile.vet}. This is strongest when the TAFE course clearly connects to the university degree you want.`;
    if (routeId === "uni-prep") return "A preparation, foundation or enabling program is made to build university study skills before a diploma or bachelor application.";
    if (routeId === "diploma") return `A ${profile.diploma} can be a structured bridge when direct bachelor entry is too risky or does not use your situation well.`;
    if (routeId === "wsu-college") return `Western Sydney University The College offers University Foundation Studies and Diploma Programs. For this direction, start by checking ${diploma}.`;
    if (routeId === "portfolio") return `Some ${profile.label.toLowerCase()} courses care heavily about ${profile.portfolio}, not just an ATAR.`;
    if (routeId === "adfa") return "ADFA combines ADF officer selection with UNSW Canberra undergraduate study, so it is both a defence application and a university application.";
    if (routeId === "srs-eas") return "SRS and EAS can support current Year 12 applicants through early-offer or educational-access consideration, but they do not remove course rules.";
    if (routeId === "stat") return "STAT can be useful for some non-school-leaver or mature-age applications when the institution accepts it for the exact course.";
    if (routeId === "open-access") return "Open-access or single-unit study can prove you are ready for tertiary work before applying for a full degree.";
    return "A transfer plan starts in a related course first, then uses strong tertiary results to apply for the target degree.";
  }

  function routeRequirements(routeId, profile, situation) {
    if (routeId === "tafe-vet") return "Check age, literacy/numeracy, licences, placement checks, course fees, and whether the university recognises the exact Certificate IV, Diploma or Advanced Diploma.";
    if (routeId === "uni-prep") return "Check whether Year 12 completion is required, whether the program uses ATAR, English/maths readiness, fees, length and the minimum result needed after completion.";
    if (routeId === "diploma") return "Check exact program entry criteria, whether Year 12 or ATAR is required, whether VET/work evidence is accepted, and whether progression is guaranteed or competitive.";
    if (routeId === "wsu-college") return "Check exact program entry criteria, whether the option is foundation, diploma or preparation, the linked bachelor, duration, fees and progression rules.";
    if (routeId === "portfolio") return "Check portfolio, audition or interview due dates, file format, assumed skills, equipment/software expectations and whether a backup diploma is recommended.";
    if (routeId === "adfa") return "Check Australian citizenship/eligibility, ADF officer selection, medical and fitness checks, service commitment, UNSW entry and any UAC step.";
    if (routeId === "srs-eas") return "Check SRS/EAS eligibility, school recommendation timing, evidence, UAC deadlines, prerequisites and whether the course participates.";
    if (routeId === "stat") return "Check minimum age/non-school-leaver rules, accepted STAT version, booking deadline, score requirement and whether the course accepts STAT.";
    if (routeId === "open-access") return "Check unit prerequisites, fees, census dates, pass/mark requirement, credit transfer and whether the target degree will count the study.";
    return `Check entry into the first course, required marks after first year, credit transfer, deadlines and whether this route still suits someone ${situation.short.toLowerCase()}.`;
  }

  function routeUniversityPathway(routeId, profile) {
    if (routeId === "tafe-vet") return `Complete the VET course, then apply to a related ${profile.target}; eligible students may receive admission consideration or credit depending on the provider.`;
    if (routeId === "uni-prep") return `Finish the preparation/foundation program with the required result, then apply for a ${profile.target} or a linked diploma.`;
    if (routeId === "diploma") return `Complete the diploma or undergraduate certificate strongly, then use the result for entry, credit or progression into the related bachelor degree.`;
    if (routeId === "wsu-college") return "Complete the approved WSU The College foundation, diploma or preparation program, then apply or progress to the linked Western Sydney University bachelor degree.";
    if (routeId === "portfolio") return `Submit strong creative/practical evidence, then combine that with any academic/pathway requirement for the target ${profile.target}.`;
    if (routeId === "adfa") return "Apply through ADF Careers and the required university process; if selected, you study a UNSW Canberra degree while training as an ADF officer.";
    if (routeId === "srs-eas") return "Apply through UAC, add SRS/EAS if eligible, then keep pathway preferences underneath in case direct/early offers do not land.";
    if (routeId === "stat") return "Use an accepted STAT result plus any work/study evidence to apply directly or to a pathway program, depending on the institution.";
    if (routeId === "open-access") return "Pass recognised tertiary units, then use those results to apply for admission and possible credit toward the target degree.";
    return "Enter a related first course, earn strong tertiary marks, then apply for internal or external transfer into the dream degree.";
  }

  function wsuDiplomaForProfile(profile) {
    const options = {
      business: "Diploma in Business",
      technology: "Diploma in Information and Communications Technology",
      health: "Diploma in Health Science",
      education: "Diploma in Education Studies",
      creative: "Diploma in Creative Industries and Communication",
      law: "Diploma in Social Sciences or Arts as a possible bridge",
      engineering: "Diploma in Engineering Studies",
      general: "a diploma, foundation studies or preparation program linked to your target degree"
    };
    return options[profile.id] || options.general;
  }

  function wsuRouteTitle(profile) {
    if (profile.id === "general") return "Western Sydney University The College pathway";
    return `Western Sydney University The College ${profile.label} pathway`;
  }

  function adfaStudyAreasForProfile(profile) {
    if (profile.id === "defence") return "arts, business, computing/cyber security, engineering, science or technology depending on the service role";
    return profile.target;
  }

  function routeLinks(route, profile) {
    const links = [
      { label: route.officialLabel, url: route.officialUrl }
    ];

    if (route.id === "tafe-vet") {
      links.push(
        { label: "TAFE NSW course areas", url: "https://www.tafensw.edu.au/course-areas" },
        { label: "UAC pathways", url: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university" }
      );
    } else if (route.id === "uni-prep") {
      links.push(
        { label: "UAC course search", url: "https://uac.edu.au/course-search/search" },
        { label: "Admission criteria", url: "https://uac.edu.au/future-applicants/admission-criteria" }
      );
    } else if (route.id === "diploma") {
      links.push(
        { label: `${profile.label} course search`, url: "https://uac.edu.au/course-search/search" },
        { label: "UAC pathways", url: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university" }
      );
    } else if (route.id === "wsu-college") {
      links.push(
        { label: "WSU pathways overview", url: "https://www.westernsydney.edu.au/future/study/application-pathways" },
        { label: "UAC pathways", url: "https://uac.edu.au/future-applicants/admission-criteria/pathways-to-university" }
      );
    } else if (route.id === "portfolio") {
      links.push(
        { label: "UAC course search", url: "https://uac.edu.au/course-search/search" },
        { label: "Admission criteria", url: "https://uac.edu.au/future-applicants/admission-criteria" }
      );
    } else if (route.id === "adfa") {
      links.push(
        { label: "UNSW Canberra ADFA", url: "https://www.unsw.edu.au/canberra/about-us/our-campuses/unsw-adfa" },
        { label: "ADF Careers", url: "https://www.adfcareers.gov.au/" }
      );
    } else if (route.id === "srs-eas") {
      links.push(
        { label: "UAC EAS", url: "https://uac.edu.au/future-applicants/scholarships-and-schemes/educational-access-schemes" },
        { label: "How to apply for SRS", url: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes/how-to-apply" }
      );
    } else if (route.id === "stat") {
      links.push(
        { label: "Admission criteria", url: "https://uac.edu.au/future-applicants/admission-criteria" },
        { label: "UAC course search", url: "https://uac.edu.au/course-search/search" }
      );
    } else if (route.id === "open-access") {
      links.push(
        { label: "OUA pathways and pre-uni", url: "https://www.open.edu.au/study-online/pathways-pre-university" },
        { label: "How OUA works", url: "https://www.open.edu.au/about-us/how-oua-works" }
      );
    } else if (route.id === "transfer") {
      links.push(
        { label: "UAC course search", url: "https://uac.edu.au/course-search/search" },
        { label: "Admission criteria", url: "https://uac.edu.au/future-applicants/admission-criteria" }
      );
    }

    return uniqueLinks(links);
  }

  function uniqueLinks(links) {
    const seen = new Set();
    return links.filter((link) => {
      if (!link?.label || !link?.url || seen.has(link.url)) return false;
      seen.add(link.url);
      return true;
    });
  }

  function cleanSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const api = {
    buildPathwayResults,
    classifyPathwayGoal,
    pathwaySituations,
    fieldProfiles,
    routeTemplates,
    pathwayProviderTemplates
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.PathwayLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
