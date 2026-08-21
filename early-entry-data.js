window.earlyEntryCatalogue = {
  meta: {
    intake: "2027 entry",
    cycle: "2026 applications",
    checkedAt: "2026-08-12",
    uacSource: "https://uac.edu.au/current-applicants/undergraduate-applications-and-offers/early-offer-schemes-for-year-12-students",
    srsSource: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes",
    uacApplyUrl: "https://apply.uac.edu.au/",
    preferenceAdviceUrl: "https://uac.edu.au/media-centre/news/uac-course-preferences-tips"
  },
  srs: {
    name: "Schools Recommendation Scheme (SRS)",
    type: "UAC SRS",
    audience: "Students completing an Australian Year 12 qualification or eligible November IB in 2026.",
    assessment: "Year 11 studies, a school aptitude rating and sometimes EAS, ATAR or course-specific checks.",
    dateSummary: "Apply by 11 September; lock preferences by 5 November; offers on 12 November 2026.",
    windows: [{ open: "2026-04-08", close: "2026-09-11", closeLabel: "Applications close 11 Sep" }],
    applyUrl: "https://apply.uac.edu.au/",
    infoUrl: "https://uac.edu.au/future-applicants/scholarships-and-schemes/schools-recommendation-schemes",
    actionLabel: "Start UAC application",
    note: "Submit a UAC undergraduate application first. Not every participating institution offers every course through SRS."
  },
  institutions: [
    {
      id: "AMPA",
      providerId: "AMPA",
      name: "Academy of Music and Performing Arts",
      aliases: ["AMPA"],
      srs: true,
      routes: []
    },
    {
      id: "AIT",
      providerId: "AIT",
      name: "Academy of Interactive Technology",
      aliases: ["AIT"],
      routes: [{
        name: "Early Entry",
        type: "Direct",
        audience: "Domestic applicants who will complete Year 12 and are at least 17 when applying.",
        assessment: "Year 12 completion and provider eligibility checks; creative courses may involve a portfolio conversation.",
        dateSummary: "UAC currently lists applications as open. Confirm that the form is for the 2027 intake before submitting.",
        statusText: "Check intake",
        applyUrl: "https://info.ait.edu.au/early-entry-program",
        infoUrl: "https://uac.edu.au/current-applicants/undergraduate-applications-and-offers/early-offer-schemes-for-year-12-students",
        actionLabel: "Open exact early-entry form",
        note: "AIT's linked form still names an older February intake, so the intake must be confirmed with AIT."
      }]
    },
    {
      id: "AIE",
      providerId: "AIE",
      name: "AIE Institute",
      aliases: ["AIE"],
      srs: true,
      routes: [{
        name: "AIE Early Entry",
        type: "Direct",
        audience: "Current Year 12 students interested in games, film or related creative technology study.",
        assessment: "Year 11 or Year 12 reports plus creative work related to the degree major.",
        dateSummary: "Applications are listed as open by UAC.",
        statusText: "Open / check now",
        applyUrl: "https://aieinstitute.edu.au/early-entry",
        infoUrl: "https://aieinstitute.edu.au/early-entry",
        actionLabel: "Start AIE early entry"
      }]
    },
    {
      id: "ACU",
      providerId: "ACU",
      name: "Australian Catholic University",
      aliases: ["ACU", "ACU Guarantee"],
      routes: [{
        name: "ACU Guarantee",
        type: "Direct",
        audience: "Domestic Year 12 students who completed Year 11 in Australia and are working towards an ATAR or equivalent.",
        assessment: "Year 11 results, eligible adjustment factors and optional personal statements; prerequisites still apply.",
        dateSummary: "Applications open 20 July and close 14 September; offers 3 and 24 September 2026.",
        windows: [{ open: "2026-07-20", close: "2026-09-14", closeLabel: "Closes 14 Sep" }],
        applyUrl: "https://www.acu.edu.au/study-at-acu/admission-pathways/acu-guarantee/applying-to-acu-guarantee",
        infoUrl: "https://www.acu.edu.au/study-at-acu/admission-pathways/acu-guarantee",
        actionLabel: "Start ACU Guarantee",
        note: "Most undergraduate courses participate, but ACU publishes an exclusion list by campus."
      }]
    },
    {
      id: "ACPE",
      providerId: "ACPE",
      name: "Australian College of Physical Education",
      aliases: ["ACPE"],
      srs: true,
      routes: [{
        name: "Early Entry Program",
        type: "Direct",
        audience: "Year 12 students considering sport, health, dance or education courses.",
        assessment: "Performance in relevant Year 11 subjects and completion of Year 12.",
        dateSummary: "Applications opened in April; offers are released from September.",
        statusText: "Open / check now",
        applyUrl: "https://acpe.edu.au/admissions/entry-pathways",
        infoUrl: "https://acpe.edu.au/admissions/entry-pathways",
        actionLabel: "Open ACPE entry pathways"
      }]
    },
    {
      id: "ANU",
      name: "Australian National University",
      aliases: ["ANU"],
      routes: [{
        name: "Direct application early admission",
        type: "Direct",
        audience: "Domestic school leavers applying for ANU undergraduate study in 2027.",
        assessment: "ANU selection rank from Year 11 results and adjustment factors; applicants must later receive an ATAR.",
        dateSummary: "Applications closed 8 May; conditional offers are released 3 September 2026.",
        windows: [{ open: "2026-03-11", close: "2026-05-08", closeLabel: "Closed 8 May" }],
        applyUrl: "https://study.anu.edu.au/apply/domestic-undergraduate/how-apply/early-offer-application",
        infoUrl: "https://study.anu.edu.au/apply/domestic-undergraduate/how-apply/early-offer-application",
        actionLabel: "Check ANU application"
      }]
    },
    {
      id: "AVON",
      providerId: "AVON",
      name: "Avondale University",
      aliases: ["Avondale"],
      routes: [{
        name: "Avondale Early Entry",
        type: "Direct",
        audience: "Domestic Year 12 students eligible for an ATAR.",
        assessment: "An average Year 11 mark of 65%, or at least two Bs and three Cs across assessable subjects.",
        dateSummary: "Applications are open, offers begin 1 September and applications close 10 November 2026.",
        windows: [{ open: "2026-01-01", close: "2026-11-10", closeLabel: "Closes 10 Nov" }],
        applyUrl: "https://avondale.edu.au/study/apply/early-entry",
        infoUrl: "https://avondale.edu.au/study/apply/early-entry",
        actionLabel: "Start Avondale early entry"
      }]
    },
    {
      id: "CSU",
      providerId: "CSU",
      name: "Charles Sturt University",
      aliases: ["CSU", "Charles Sturt Advantage"],
      srs: true,
      routes: [{
        name: "Charles Sturt Advantage",
        type: "Direct",
        audience: "Current Year 12 students seeking an offer based on strengths beyond final exam results.",
        assessment: "Year 11 results and a short written submission about qualities such as resilience, empathy and motivation.",
        dateSummary: "Round 2 applications close 31 August; offers are released 23 September 2026.",
        windows: [{ open: "2026-02-02", close: "2026-08-31", closeLabel: "Round 2 closes 31 Aug" }],
        applyUrl: "https://study.csu.edu.au/study-options/pathways/charles-sturt-advantage",
        infoUrl: "https://study.csu.edu.au/study-options/pathways/charles-sturt-advantage",
        actionLabel: "Start Charles Sturt Advantage"
      }]
    },
    {
      id: "ICMS",
      providerId: "ICMS",
      name: "International College of Management, Sydney",
      aliases: ["ICMS"],
      srs: true,
      routes: [{
        name: "ICMS Early Entry",
        type: "Direct",
        audience: "Year 12 students considering an ICMS undergraduate course.",
        assessment: "The current application asks for school and course information; confirm any course-specific requirements.",
        dateSummary: "Applications are listed as open.",
        statusText: "Open / check now",
        applyUrl: "https://icms.edu.au/future-students/entry-pathways/early-entry",
        infoUrl: "https://icms.edu.au/future-students/entry-pathways/early-entry",
        actionLabel: "Start ICMS early entry"
      }, {
        name: "Leadership Entry Program",
        type: "Leadership",
        audience: "Students who can demonstrate leadership, service or extracurricular contribution.",
        assessment: "Leadership evidence and the program's current entry checks.",
        dateSummary: "Applications are listed as open.",
        statusText: "Open / check now",
        applyUrl: "https://icms.edu.au/future-students/entry-pathways/leadership-entry-program",
        infoUrl: "https://icms.edu.au/future-students/entry-pathways/leadership-entry-program",
        actionLabel: "Open leadership application"
      }]
    },
    {
      id: "JMC",
      providerId: "JMC",
      name: "JMC Academy",
      aliases: ["JMC", "Breakthrough"],
      routes: [{
        name: "Breakthrough Early Entry",
        type: "Creative",
        audience: "Year 12 students applying to JMC's creative courses.",
        assessment: "A direct application followed by an interview, audition or portfolio where the course requires it; no ATAR is required.",
        dateSummary: "Applications are listed as open.",
        statusText: "Open / check now",
        applyUrl: "https://www.jmcacademy.edu.au/study-at-jmc/early-entry-program",
        infoUrl: "https://www.jmcacademy.edu.au/study-at-jmc/early-entry-program",
        actionLabel: "Start JMC early entry"
      }]
    },
    {
      id: "LATROBE",
      name: "La Trobe University",
      aliases: ["La Trobe", "Aspire"],
      routes: [{
        name: "Aspire programs",
        type: "Direct",
        audience: "Current Year 12 students applying through Community Contribution, Academic Impact or Everyday Impact.",
        assessment: "The route may assess volunteering and leadership, Year 11 results, or broader future impact; prerequisites still apply.",
        dateSummary: "Applications close 4 September; conditional offers are released in October 2026.",
        windows: [{ open: "2026-04-01", close: "2026-09-04", closeLabel: "Closes 4 Sep" }],
        applyUrl: "https://www.latrobe.edu.au/study/aspire",
        infoUrl: "https://www.latrobe.edu.au/study/aspire",
        actionLabel: "Choose an Aspire route"
      }]
    },
    {
      id: "MQ",
      providerId: "MQ",
      name: "Macquarie University",
      aliases: ["MQ", "Leaders and Achievers"],
      srs: true,
      routes: [{
        name: "Leaders and Achievers Early Entry",
        type: "Direct",
        audience: "Students completing Year 12 or the November IB in 2026 who performed well in Year 11.",
        assessment: "Year 11 studies plus leadership, service, work, sport or positive community contribution in Years 11 or 12.",
        dateSummary: "Round 2 applications close 3 September; offers are released 23 September 2026.",
        windows: [{ open: "2026-06-01", close: "2026-09-03", closeLabel: "Round 2 closes 3 Sep" }],
        applyUrl: "https://www.mq.edu.au/study/admissions-and-entry/pathways/schemes/leaders-achievers",
        infoUrl: "https://www.mq.edu.au/study/admissions-and-entry/pathways/schemes/leaders-achievers",
        actionLabel: "Start Leaders and Achievers"
      }]
    },
    {
      id: "NAS",
      providerId: "NAS",
      name: "National Art School",
      aliases: ["NAS"],
      srs: true,
      routes: []
    },
    {
      id: "SAE",
      providerId: "SAE",
      name: "SAE University College",
      aliases: ["SAE"],
      srs: true,
      routes: [{
        name: "SAE Early Offer",
        type: "Creative",
        audience: "Australian citizens or permanent residents currently in Year 12 with passing subject marks.",
        assessment: "Year 12 standing plus any normal course admission checks; final Year 12 evidence is still required.",
        dateSummary: "Applications are listed as open.",
        statusText: "Open / check now",
        applyUrl: "https://sae.edu.au/how-to-apply/early-offer-program/",
        infoUrl: "https://sae.edu.au/how-to-apply/early-offer-program/",
        actionLabel: "Start SAE early offer"
      }]
    },
    {
      id: "SCU",
      providerId: "SCU",
      name: "Southern Cross University",
      aliases: ["SCU", "STAR"],
      routes: [{
        name: "Early Offer Program",
        type: "Direct",
        audience: "Current Year 12 students applying for 2027 entry.",
        assessment: "High-school grades and a school recommendation based on academic performance and likely course success.",
        dateSummary: "Applications close 30 September; offers are released from 9 November 2026.",
        windows: [{ open: "2026-04-13", close: "2026-09-30", closeLabel: "Closes 30 Sep" }],
        applyUrl: "https://www.scu.edu.au/study/high-school-students/entry-pathways/early-offer/",
        infoUrl: "https://www.scu.edu.au/study/high-school-students/entry-pathways/early-offer/",
        actionLabel: "Start SCU Early Offer"
      }]
    },
    {
      id: "TUA",
      providerId: "TUA",
      name: "Torrens University Australia",
      aliases: ["Torrens"],
      srs: true,
      routes: [{
        name: "Early Entry Program",
        type: "Direct",
        audience: "Current Year 12 students seeking a conditional 2027 offer.",
        assessment: "Standard course admission criteria; a conditional offer still requires Year 12 completion and course conditions.",
        dateSummary: "Applications opened in April and conditional offers begin in September 2026.",
        statusText: "Open / check now",
        applyUrl: "https://www.torrens.edu.au/how-to-apply/early-entry-program",
        infoUrl: "https://www.torrens.edu.au/how-to-apply/early-entry-program",
        actionLabel: "Start Torrens early entry"
      }]
    },
    {
      id: "UC",
      providerId: "UC",
      name: "University of Canberra",
      aliases: ["UC"],
      srs: true,
      routes: [{
        name: "UC Early Offer Scheme",
        type: "Direct",
        audience: "Current Year 12 students applying for University of Canberra study in 2027.",
        assessment: "Year 11 results and a 300-word personal statement.",
        dateSummary: "Applications closed 9 August; supporting documents are due 23 August and offers release 7 September 2026.",
        windows: [{ open: "2026-03-27", close: "2026-08-09", closeLabel: "Closed 9 Aug" }],
        applyUrl: "https://www.canberra.edu.au/future-students/apply-to-uc/early-offer-scheme",
        infoUrl: "https://www.canberra.edu.au/future-students/apply-to-uc/early-offer-scheme",
        actionLabel: "Check UC application"
      }]
    },
    {
      id: "UNE",
      name: "University of New England",
      aliases: ["UNE"],
      srs: true,
      routes: [{
        name: "UNE Early Entry",
        type: "Direct",
        audience: "Year 12 or eligible TAFE applicants seeking 2027 entry, including applicants not expecting an ATAR.",
        assessment: "Your school or TAFE provider assesses independent learning and potential for academic success.",
        dateSummary: "Round 2 applications close 14 September; offers are released 5 November 2026.",
        windows: [{ open: "2026-02-02", close: "2026-09-14", closeLabel: "Round 2 closes 14 Sep" }],
        applyUrl: "https://www.une.edu.au/study/study-on-campus/early-entry",
        infoUrl: "https://www.une.edu.au/study/study-on-campus/early-entry",
        actionLabel: "Start UNE Early Entry"
      }]
    },
    {
      id: "UON",
      providerId: "UON",
      name: "University of Newcastle",
      aliases: ["UON", "Newcastle"],
      srs: true,
      routes: [{
        name: "Early Entry Program",
        type: "Direct",
        audience: "Domestic NSW Year 12 HSC or IB students at a participating secondary school.",
        assessment: "The strongest eligible rank from at least eight RoSA units including English, or a completed Certificate III or IV.",
        dateSummary: "Apply by 3 September for round 1 or 24 September for round 2; offers release 10 September and 1 October.",
        windows: [{ open: "2026-04-08", close: "2026-09-24", closeLabel: "Final round closes 24 Sep" }],
        applyUrl: "https://www.newcastle.edu.au/early",
        infoUrl: "https://www.newcastle.edu.au/early",
        actionLabel: "Start Newcastle Early Entry"
      }, {
        name: "Indigenous and Refugee Law Early Entry",
        type: "Equity",
        audience: "Eligible Indigenous or refugee-background applicants for the combined Bachelor of Laws (Honours).",
        assessment: "School performance, school recommendation and a selection interview; UAC course code 483100 must be a preference.",
        dateSummary: "Applications close 10 September; interviews are 21–22 September and offers release 9 October 2026.",
        windows: [{ open: "2026-04-08", close: "2026-09-10", closeLabel: "Closes 10 Sep" }],
        applyUrl: "https://www.newcastle.edu.au/study/undergraduate/admissions-and-entry/entry-options/indigenous-early-entry-scheme",
        infoUrl: "https://www.newcastle.edu.au/study/undergraduate/admissions-and-entry/entry-options/indigenous-early-entry-scheme",
        actionLabel: "Open law scheme application"
      }]
    },
    {
      id: "UND",
      providerId: "UND",
      name: "University of Notre Dame Australia",
      aliases: ["Notre Dame", "UNDA"],
      srs: true,
      routes: [{
        name: "Early Offer Program",
        type: "Direct",
        audience: "Current Year 12 students applying for Notre Dame undergraduate study.",
        assessment: "Year 11 courses and grades, Year 11 and 12 school reports, application questions and supporting documents.",
        dateSummary: "Applications remain open through several rounds; final listed completion deadline is 30 November 2026.",
        windows: [{ open: "2026-05-01", close: "2026-11-30", closeLabel: "Final round closes 30 Nov" }],
        applyUrl: "https://www.notredame.edu.au/early-offer",
        infoUrl: "https://www.notredame.edu.au/early-offer",
        actionLabel: "Start Notre Dame Early Offer"
      }]
    },
    {
      id: "USYD",
      providerId: "USYD",
      name: "University of Sydney",
      aliases: ["USYD", "Sydney Uni", "Gadigal", "CASAS"],
      routes: [{
        name: "Gadigal Entry Program",
        type: "Equity",
        audience: "Aboriginal and Torres Strait Islander applicants to eligible University of Sydney undergraduate courses.",
        assessment: "A UAC application, an eligible Sydney preference, self-identification and the additional Gadigal application in UAC.",
        dateSummary: "Applications opened 8 April; the early conditional-offer deadline is in August and offers release in September 2026.",
        statusText: "Deadline this month",
        applyUrl: "https://apply.uac.edu.au/",
        infoUrl: "https://www.sydney.edu.au/study/applying/admission-pathways/gadigal-program.html",
        actionLabel: "Start in UAC"
      }, {
        name: "Creative Arts Special Admission Scheme",
        type: "Creative",
        audience: "Domestic current Year 12 applicants to eligible visual arts or music study.",
        assessment: "Visual arts uses a portfolio plus current Year 11 and 12 results; music uses an audition/interview and academic results.",
        dateSummary: "Visual Arts portfolio due 13 August and UAC application due 27 August 2026; music dates vary by audition round.",
        windows: [{ open: "2026-04-01", close: "2026-08-27", closeLabel: "UAC deadline 27 Aug" }],
        applyUrl: "https://sydneyuniversity.slideroom.com/#/login/program/25888",
        infoUrl: "https://www.sydney.edu.au/arts/schools/sydney-college-of-the-arts/creative-arts-special-admission-scheme-casas.html",
        actionLabel: "Open Visual Arts portfolio"
      }]
    },
    {
      id: "UOW",
      providerId: "UOW",
      name: "University of Wollongong",
      aliases: ["UOW", "Wollongong"],
      routes: [{
        name: "UOW Early Admission",
        type: "Direct",
        audience: "Students finishing an Australian Year 12 qualification or an eligible Australian IB in 2026.",
        assessment: "Year 11 results and written responses about readiness, motivation, planning, persistence and collaboration.",
        dateSummary: "Applications closed 7 August; offers are released 1 September 2026.",
        windows: [{ open: "2026-06-15", close: "2026-08-07", closeLabel: "Closed 7 Aug" }],
        applyUrl: "https://www.uow.edu.au/early-admission/",
        infoUrl: "https://www.uow.edu.au/early-admission/",
        actionLabel: "Check UOW application"
      }]
    },
    {
      id: "UNSW",
      providerId: "UNSW",
      name: "UNSW Sydney",
      aliases: ["UNSW", "Gateway"],
      routes: [{
        name: "Gateway Admission Pathway",
        type: "Equity",
        audience: "Current or recent Australian Year 12 applicants who meet a listed equity criterion.",
        assessment: "Eligibility includes a low-SES area, a Gateway partner school, Indigenous identity or an eligible protection visa.",
        dateSummary: "Round 2 opens 3 September and closes 10 November; offers release 3 December 2026.",
        windows: [
          { open: "2026-04-27", close: "2026-07-23", closeLabel: "Round 1 closed" },
          { open: "2026-09-03", close: "2026-11-10", openLabel: "Round 2 opens 3 Sep", closeLabel: "Round 2 closes 10 Nov" }
        ],
        applyUrl: "https://unsw.uac.edu.au/unsw-gateway",
        infoUrl: "https://www.unsw.edu.au/study/how-to-apply/undergraduate/admission-pathways/gateway-admission-pathway",
        actionLabel: "Start UNSW Gateway"
      }, {
        name: "Portfolio Entry Early Conditional Offer",
        type: "Creative",
        audience: "Australian residents applying to selected Arts, Design & Architecture or Engineering degrees.",
        assessment: "A portfolio is assessed for an early conditional offer with an adjusted ATAR requirement; course restrictions apply.",
        dateSummary: "Round 2 opens 5 September and closes 16 November; offers release 4 December 2026.",
        windows: [
          { open: "2026-05-04", close: "2026-07-20", closeLabel: "Round 1 closed" },
          { open: "2026-09-05", close: "2026-11-16", openLabel: "Round 2 opens 5 Sep", closeLabel: "Round 2 closes 16 Nov" }
        ],
        applyUrl: "https://www.unsw.edu.au/study/how-to-apply/undergraduate/admission-pathways/portfolio-entry",
        infoUrl: "https://www.unsw.edu.au/study/how-to-apply/undergraduate/admission-pathways/portfolio-entry",
        actionLabel: "Start UNSW Portfolio Entry"
      }]
    },
    {
      id: "UTS",
      providerId: "UTS",
      name: "University of Technology Sydney",
      aliases: ["UTS"],
      srs: true,
      note: "UTS retired its direct Early Entry Program for Autumn 2027. Its current early-offer route is UAC SRS; direct UTS pathways and adjustment schemes remain separate.",
      routes: []
    },
    {
      id: "WS",
      providerId: "WS",
      name: "Western Sydney University",
      aliases: ["WSU", "Western", "True Reward"],
      srs: true,
      routes: [{
        name: "HSC True Reward",
        type: "Direct",
        audience: "Domestic and international NSW HSC students completing Year 12 in 2026.",
        assessment: "Specified Year 11 or Year 12 subject results aligned with the chosen degree; excluded courses and conditions apply.",
        dateSummary: "Applications are open. The next Year 11-results deadline is 2 September; later rounds continue to 31 December 2026.",
        windows: [{ open: "2026-04-08", close: "2026-12-31", closeLabel: "Final listed round closes 31 Dec" }],
        applyUrl: "https://www.westernsydney.edu.au/future/study/application-pathways/hsc-true-reward",
        infoUrl: "https://www.westernsydney.edu.au/future/study/application-pathways/hsc-true-reward",
        actionLabel: "Start HSC True Reward"
      }]
    }
  ]
};
