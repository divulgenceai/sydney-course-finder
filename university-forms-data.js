(function (root, factory) {
  const catalogue = factory();
  if (typeof module === "object" && module.exports) module.exports = catalogue;
  if (root) root.universityFormsCatalogue = catalogue;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const checkedAt = "2026-08-12";
  const providerLogos = {
    ACAP: "https://uac.edu.au/assets/images/Institution-logos/2025/ACAP_h.svg",
    ACPE: "https://uac.edu.au/assets/images/Institution-logos/2025/ACPE_h.svg",
    ACU: "https://uac.edu.au/assets/images/Institution-logos/2025/ACU_h.svg",
    AIE: "https://uac.edu.au/assets/images/Institution-logos/2025/AIEI_h.svg",
    AIM: "https://uac.edu.au/assets/images/Institution-logos/2025/AIM_h.svg",
    AIT: "https://uac.edu.au/assets/images/Institution-logos/2025/AIT_h.svg",
    AMPA: "https://uac.edu.au/assets/images/Institution-logos/2025/AMPA_h.svg",
    AVON: "https://uac.edu.au/assets/images/Institution-logos/2025/AVU_h.svg",
    CA: "https://uac.edu.au/assets/images/Institution-logos/2025/CA_h.svg",
    CQU: "https://uac.edu.au/assets/images/Institution-logos/2025/CQU_h.svg",
    CSU: "https://uac.edu.au/assets/images/Institution-logos/2025/CSU_h.svg",
    EXLSI: "https://uac.edu.au/assets/images/Institution-logos/2025/EXC_h.svg",
    GU: "https://uac.edu.au/assets/images/Institution-logos/2025/GU_h.svg",
    ICMS: "https://uac.edu.au/assets/images/Institution-logos/2025/ICMS_h.svg",
    JMC: "https://uac.edu.au/assets/images/Institution-logos/2025/JMC_h.svg",
    MIT: "https://uac.edu.au/assets/images/Institution-logos/2025/MIT_h.svg",
    MQ: "https://uac.edu.au/assets/images/Institution-logos/2025/MQ_h.svg",
    NAS: "https://uac.edu.au/assets/images/Institution-logos/2025/NAS_h.svg",
    SAE: "https://uac.edu.au/assets/images/Institution-logos/2025/SAE_h.svg",
    SCU: "https://uac.edu.au/assets/images/Institution-logos/2025/SCU_h.svg",
    SPJGM: "https://uac.edu.au/assets/images/Institution-logos/2025/SPJ_h.svg",
    TUA: "https://uac.edu.au/assets/images/Institution-logos/2025/TUA_h.svg",
    UC: "https://uac.edu.au/assets/images/Institution-logos/2025/UC_h.svg",
    UND: "https://uac.edu.au/assets/images/Institution-logos/2025/UNDA_h.svg",
    UNSW: "https://uac.edu.au/assets/images/Institution-logos/2025/UNSW_h.svg",
    UNSWC: "https://uac.edu.au/assets/images/Institution-logos/2025/UNSWC_h.svg",
    UON: "https://uac.edu.au/assets/images/Institution-logos/2025/UON_h.svg",
    UOW: "https://uac.edu.au/assets/images/Institution-logos/2025/UOW_h.svg",
    USYD: "https://uac.edu.au/assets/images/Institution-logos/2025/USYD_h.svg",
    UTS: "https://uac.edu.au/assets/images/Institution-logos/2025/UTS_h.svg",
    UTSC: "https://utscollege.edu.au/hubfs/raw_assets/uts-college-theme-new/1532/js_client_assets/assets/www_UTSInsearch-BlOn8dNI.svg",
    WSU: "https://uac.edu.au/assets/images/Institution-logos/2025/WS_h.svg"
  };

  function provider(config) {
    return {
      aliases: [],
      forms: [],
      access: "limited",
      checkedAt,
      logo: providerLogos[config.code] || "",
      ...config
    };
  }

  function pdf(id, title, category, url, description, options = {}) {
    return {
      id,
      title,
      category,
      url,
      format: "pdf",
      description,
      editable: true,
      checkedAt,
      ...options
    };
  }

  function externalPdf(id, title, category, url, description, options = {}) {
    return {
      id,
      title,
      category,
      url,
      format: "external-pdf",
      description,
      editable: false,
      checkedAt,
      editorNote: "This university blocks secure server-side PDF loading. Open the official PDF and complete it in your PDF app.",
      ...options
    };
  }

  function online(id, title, category, url, description, options = {}) {
    return {
      id,
      title,
      category,
      url,
      format: "online",
      description,
      editable: false,
      checkedAt,
      ...options
    };
  }

  function questionnaire(id, title, category, url, description, options = {}) {
    return {
      id,
      title,
      category,
      url,
      format: "questionnaire",
      description,
      editable: true,
      checkedAt,
      ...options
    };
  }

  const providers = [
    provider({
      id: "uts",
      code: "UTS",
      name: "University of Technology Sydney",
      aliases: ["uts", "technology sydney"],
      website: "https://www.uts.edu.au/",
      hubUrl: "https://www.uts.edu.au/for-students/current-students/managing-your-course/using-uts-systems/student-forms-apps-and-systems",
      access: "public-mixed",
      note: "UTS uses a mix of downloadable PDFs, public web forms and signed-in student systems.",
      forms: [
        pdf("uts-residency-domestic", "Declaration of residency status", "Personal details", "https://www.uts.edu.au/declaration-residency-status", "For domestic residency or citizenship-status evidence. Supporting documents may be required.", {
          submit: "Follow the AskUTS submission instructions printed on the form before the census date.",
          requirements: "Student number, course details, citizenship or residency evidence and a signature.",
          autoPlacements: [
            { key: "studentId", page: 1, x: 112, y: 724, size: 9, maxWidth: 166 },
            { key: "familyName", page: 1, x: 142, y: 682, size: 10, maxWidth: 143 },
            { key: "givenNames", page: 1, x: 142, y: 640, size: 10, maxWidth: 143 },
            { key: "course", page: 1, x: 142, y: 587, size: 9, maxWidth: 143 },
            { key: "courseCode", page: 1, x: 137, y: 545, size: 10, maxWidth: 148 },
            { key: "date", page: 1, x: 450, y: 128, size: 9, maxWidth: 75 }
          ]
        }),
        questionnaire("uts-engineering-it-questionnaire", "Engineering and IT Questionnaire", "Early entry and schemes", "https://www.uts.edu.au/globalassets/shared-media/documents/feit/feit-engineering-it-questionnaire-template-2026.docx", "Strengthen an eligible UTS Engineering or IT UAC application by explaining your motivation, experience and something you have designed or created.", {
          infoUrl: "https://www.uts.edu.au/for-students/admissions-entry/entry-schemes/engineering-questionnaire",
          status: "For 2027 entry - submit by 8 January 2027",
          requirements: "Current Year 12 school leaver, minimum selection rank 75, UTS Engineering or IT first in UAC, plus name, date of birth, email and UAC reference number.",
          submit: "Download your completed responses as a PDF, attach it to your UAC application, then submit through UAC.",
          caution: "UTS excludes BIT Co-op, Engineering Science/Laws, IT/Laws and courses that have reached capacity from this questionnaire route.",
          documentTitle: "Applying for UTS - UAC",
          questions: [
            {
              id: "motivation",
              title: "Question 1",
              prompt: "What motivates you to choose studying Engineering and/or IT at university? If possible, provide specific, personal reasons with examples.",
              maxWords: 250
            },
            {
              id: "interest",
              title: "Question 2",
              prompt: "Why are you interested in Engineering and/or IT in general? If possible, provide examples of experiences or observations which led you to choose a future Engineering or IT career?",
              maxWords: 250
            },
            {
              id: "created",
              title: "Question 3",
              prompt: "Give examples of something you designed or created which demonstrates your affinity for Engineering and/or IT. This could be school projects, hobbies, work, media, code or other relevant examples.",
              maxWords: 250
            }
          ]
        }),
        online("uts-bit-coop-scholarship", "Bachelor of Information Technology (Co-op) Scholarship application", "Early entry and schemes", "https://forms.uts.edu.au/index.cfm?FormId=328", "Direct UTS scholarship application for the BIT Co-op course, completed in addition to the UAC course application.", {
          infoUrl: "https://www.uts.edu.au/for-students/admissions-entry/scholarships/scholarships-search/bachelor-of-information-technology-co-op-scholarship",
          status: "Applications open - closes 6 September 2026",
          requirements: "Eligible domestic recent school leaver, UAC application for BIT Co-op, UTS scholarship form, selection questionnaire and interview availability.",
          caution: "UTS lists a 90+ ATAR expectation, with some 80-90 applicants considered for suitability. Check the official criteria before applying."
        }),
        online("uts-change-details", "Change of student details", "Personal details", "https://www.uts.edu.au/for-students/current-students/managing-your-course/your-student-info", "UTS now directs name, date-of-birth and gender changes through its online application.", {
          requirements: "Certified identity evidence may be required."
        }),
        online("uts-course-withdrawal", "Course withdrawal application", "Enrolment", "https://studentforms.uts.edu.au/", "Official UTS student form for withdrawing from a course; sign-in may be required.")
      ]
    }),
    provider({
      id: "unsw",
      code: "UNSW",
      name: "UNSW Sydney",
      aliases: ["unsw", "university of new south wales"],
      website: "https://www.unsw.edu.au/",
      hubUrl: "https://www.student.unsw.edu.au/forms",
      access: "public-mixed",
      note: "UNSW maintains an A-Z forms directory. Many requests have moved to Student Portal web forms.",
      forms: [
        online("unsw-gateway-2027", "Gateway Admission Pathway - 2027 entry", "Early entry and schemes", "https://unsw.uac.edu.au/unsw-gateway/", "Direct application portal for eligible Year 12 students and recent school leavers applying through the UNSW Gateway Admission Pathway.", {
          infoUrl: "https://www.unsw.edu.au/study/how-to-apply/undergraduate/admission-pathways/gateway/admission-pathway",
          status: "Round 2 opens 3 September 2026 and closes 9 November 2026",
          requirements: "Australian or New Zealand citizenship, Australian permanent residency or an eligible visa; Australian Year 12 now or within five years; and at least one listed equity criterion.",
          submit: "Choose up to two UNSW degrees and complete the personal statement and supporting evidence in the official Gateway portal.",
          caution: "UNSW Canberra at ADFA programs are not eligible for this pathway."
        }),
        online("unsw-portfolio-entry-2027", "Portfolio Entry Early Conditional Offer Scheme - 2027", "Early entry and schemes", "https://portfolio-entry.prod.unsw.edu.au/users/login", "Direct UNSW Portfolio Entry portal for eligible Arts, Design and Architecture degrees.", {
          infoUrl: "https://www.unsw.edu.au/study/how-to-apply/undergraduate/admission-pathways/portfolio-entry",
          status: "Round 2 opens 5 September 2026 and closes 16 November 2026 at 12 pm Sydney time",
          requirements: "Domestic applicant, valid UAC application and UAC ID, an eligible degree, and the category-specific portfolio and written material.",
          submit: "Submit UAC first, prepare the required portfolio, then upload it once through the UNSW Portfolio Entry portal.",
          caution: "If you are eligible for Gateway as well, UNSW says to use Gateway because it provides the more advantageous pathway."
        }),
        online("unsw-coop-2027", "UNSW Co-op Program scholarship application - 2027", "Early entry and schemes", "https://scholarships.online.unsw.edu.au/scholarship/coop_sc_login.main", "Direct registration and login portal for the competitive UNSW Co-op Program scholarship application.", {
          infoUrl: "https://www.unsw.edu.au/co-op-program/apply-now",
          status: "Applications open - submit before 30 September 2026",
          requirements: "High school leaver or up to two gap years without tertiary study, online application, nominated school representative assessment and video snapshot.",
          submit: "Register in the Co-op portal, complete the application and nominate your careers adviser or school representative before submitting.",
          caution: "This is separate from Gateway and from your UAC application. Gateway-eligible applicants still submit both processes independently."
        }),
        pdf("unsw-change-details", "Correction or change of personal details", "Personal details", "https://www.unsw.edu.au/content/dam/pdfs/student-communications/student-forms/change-personal-details-form.pdf", "Update or correct personal details held by UNSW.", {
          requirements: "Student details and the identity evidence named on the form."
        }),
        pdf("unsw-distance-id", "Distance student ID card application", "Student records", "https://www.unsw.edu.au/content/dam/pdfs/student-communications/student-forms/distance-student-id-form.pdf", "Request a student ID card when you cannot attend campus.", {
          requirements: "Identity documents, photo and request details."
        }),
        online("unsw-portal-forms", "UNSW Student Portal web forms", "All forms", "https://portal.insight.unsw.edu.au/web-forms/", "Program leave, progression, RPL, letters, international requests and other current workflows.")
      ]
    }),
    provider({
      id: "usyd",
      code: "USYD",
      name: "University of Sydney",
      aliases: ["usyd", "sydney uni", "university of sydney"],
      website: "https://www.sydney.edu.au/",
      hubUrl: "https://www.sydney.edu.au/students/browse.html?category=administration",
      access: "public-mixed",
      note: "Most coursework requests use Sydney Student or a dedicated online process; selected PDFs remain public.",
      forms: [
        pdf("usyd-change-details", "Change of personal details", "Personal details", "https://www.sydney.edu.au/content/dam/students/documents/admin/change-of-personal-details-form.pdf", "Change or correct a legal name, date of birth or related student-record detail.", {
          requirements: "Student number plus the supporting identification listed on the form."
        }),
        pdf("usyd-international-release", "International student release request", "International students", "https://www.sydney.edu.au/content/dam/students/documents/enrolment/discontinue/international-student-release-request-form.pdf", "Request release to another registered provider before completing six months of the principal course.", {
          requirements: "Statement, evidence and parent or guardian details when applicable."
        }),
        pdf("usyd-special-consideration-external", "Special consideration application", "Assessment", "https://www.sydney.edu.au/content/dam/corporate/documents/study/how-to-apply/special-consideration-application-form.pdf", "Official special-consideration form for the situations described by the University.")
      ]
    }),
    provider({
      id: "mq",
      code: "MQ",
      name: "Macquarie University",
      aliases: ["mq", "macquarie", "macquarie uni"],
      website: "https://www.mq.edu.au/",
      hubUrl: "https://forms.mq.edu.au/",
      access: "public-mixed",
      note: "Macquarie combines public forms with Service Connect and eForms.",
      forms: [
        externalPdf("mq-cross-institution", "Cross-institution study - home institution endorsement", "Enrolment", "https://students.mq.edu.au/__data/assets/pdf_file/0006/1235346/Macquarie-University-Institution-Form-23-Dec-2021.pdf", "For a non-Macquarie student applying to count Macquarie units toward a home-university award.", {
          requirements: "Home-university approval, fee status and student declaration."
        }),
        online("mq-sensitive-files", "Sensitive supporting-file submission", "Supporting documents", "https://eforms.mq.edu.au/sensitive_file_submissions/new", "Securely submit documents requested for personal details, residency, withdrawal or other Service Connect matters.")
      ]
    }),
    provider({
      id: "wsu",
      code: "WSU",
      name: "Western Sydney University",
      aliases: ["wsu", "western sydney", "western sydney uni"],
      website: "https://www.westernsydney.edu.au/",
      hubUrl: "https://www.westernsydney.edu.au/students/using-online-systems/mystudentrecords-help",
      access: "portal-only",
      note: "Current student requests are primarily completed through My Student Records, WesternNow or the Student Forms tile.",
      forms: [
        online("wsu-student-records", "My Student Records and student forms", "All forms", "https://www.westernsydney.edu.au/students/using-online-systems/mystudentrecords-help", "Access enrolment, personal-detail and student-record workflows; sign-in is normally required."),
        online("wsu-westernnow", "WesternNow requests", "Enrolment", "https://www.westernsydney.edu.au/currentstudents/current_students/services_and_facilities/westernnow", "Use WesternNow for requests such as withdrawal without academic or financial penalty.")
      ]
    }),
    provider({
      id: "uon",
      code: "UON",
      name: "University of Newcastle",
      aliases: ["uon", "newcastle uni"],
      website: "https://www.newcastle.edu.au/",
      hubUrl: "https://www.newcastle.edu.au/current-students/study-essentials/forms-and-guides",
      access: "public-mixed",
      note: "The public forms directory contains PDFs, Word files and online requests.",
      forms: [
        pdf("uon-rpl", "Recognition of Prior Learning", "Credit and RPL", "https://policies.newcastle.edu.au/download.php?associated=&id=1037&version=2", "Apply for recognition of informal or non-formal learning.", {
          requirements: "Learning evidence mapped to the relevant course outcomes."
        }),
        externalPdf("uon-cross-institution", "Cross-institutional credit", "Credit and RPL", "https://www.newcastle.edu.au/__data/assets/pdf_file/0016/70621/Application-Cross-Institutional-Credit.pdf", "Apply for incoming or outgoing cross-institutional credit."),
        externalPdf("uon-change-details", "Change of details", "Personal details", "https://www.newcastle.edu.au/__data/assets/pdf_file/0020/143822/Change-of-Details-Form.pdf", "Change name, date of birth, gender or other official student details.", {
          requirements: "The colour scans, certified copies or originals specified by the form."
        })
      ]
    }),
    provider({
      id: "uow",
      code: "UOW",
      name: "University of Wollongong",
      aliases: ["uow", "wollongong uni"],
      website: "https://www.uow.edu.au/",
      hubUrl: "https://www.uow.edu.au/student/admin/forms/",
      access: "public-mixed",
      note: "UOW lists deadlines and requirements in its public forms directory; some requests are completed in SOLS.",
      forms: [
        pdf("uow-rpl", "Recognition of Prior Learning for informal or non-formal learning", "Credit and RPL", "https://documents.uow.edu.au/content/groups/public/%40web/%40currentstudents/documents/doc/uow277347.pdf", "Apply for credit based on relevant learning outside formal accredited study."),
        online("uow-sols-forms", "SOLS student forms", "All forms", "https://www.uow.edu.au/student/admin/forms/", "Leave, documentation and other authenticated requests are linked from the official directory.")
      ]
    }),
    provider({
      id: "und",
      code: "UND",
      name: "University of Notre Dame Australia",
      aliases: ["notre dame", "und", "unda"],
      website: "https://www.notredame.edu.au/",
      hubUrl: "https://www.notredame.edu.au/students/your-enrolment/student-forms",
      access: "public-pdf",
      note: "Notre Dame explicitly provides editable PDFs and submission instructions from the student email account.",
      forms: [
        externalPdf("und-transcript", "Academic transcript or AHEGS application", "Student records", "https://www.notredame.edu.au/__data/assets/pdf_file/0008/110042/academic-transcript-ahegs-application.pdf", "Request an official transcript or Australian Higher Education Graduation Statement."),
        externalPdf("und-refund", "Refund request", "Fees and refunds", "https://www.notredame.edu.au/__data/assets/pdf_file/0033/88179/refund-request-form.pdf", "Request a domestic or continuing-international-student refund under the conditions stated on the form."),
        externalPdf("und-international-refund", "New international student refund request", "International students", "https://www.notredame.edu.au/__data/assets/pdf_file/0028/139708/refund-request-international-form.pdf", "For new international students requesting a tuition-fee refund.")
      ]
    }),
    provider({
      id: "acu",
      code: "ACU",
      name: "Australian Catholic University",
      aliases: ["acu", "catholic university"],
      website: "https://www.acu.edu.au/",
      hubUrl: "https://www.acu.edu.au/study-at-acu/how-to-apply/forms",
      access: "public-mixed",
      note: "ACU's public forms page covers admissions, appeals, examinations and student administration.",
      forms: [
        pdf("acu-special-consideration", "Special consideration application", "Assessment", "https://www.acu.edu.au/-/media/student-portal/forms/sc_application_for_special_consideration_pdf.pdf", "Apply for special consideration for assessable work.", {
          requirements: "Student details, affected assessment information and supporting evidence."
        })
      ]
    }),
    provider({
      id: "uc",
      code: "UC",
      name: "University of Canberra",
      aliases: ["uc", "canberra uni"],
      website: "https://www.canberra.edu.au/",
      hubUrl: "https://www.canberra.edu.au/current-students",
      access: "portal-only",
      note: "UC keeps its complete student-forms area in myUC, with selected public online forms.",
      forms: [
        online("uc-discontinuation-international", "Notification of discontinuation - international student", "International students", "https://www.canberra.edu.au/current-students/forms/notification-of-discontinuation-international-student-visa-holders", "Public online workflow for an international student ceasing study at UC."),
        online("uc-myuc-forms", "All myUC student forms", "All forms", "https://www.canberra.edu.au/current-students", "Log in to myUC to access the complete current catalogue.")
      ]
    }),
    provider({
      id: "griffith",
      code: "GU",
      name: "Griffith University",
      aliases: ["griffith", "gu"],
      website: "https://www.griffith.edu.au/",
      hubUrl: "https://student.griffith.edu.au/",
      access: "portal-only",
      note: "Most current student requests are available after sign-in through myGriffith and Student Connect.",
      forms: [
        online("griffith-student-connect", "Student Connect forms and requests", "All forms", "https://student.griffith.edu.au/", "Access enrolment, records, assessment and support workflows through the official student portal.")
      ]
    }),
    provider({
      id: "csu",
      code: "CSU",
      name: "Charles Sturt University",
      aliases: ["csu", "charles sturt"],
      website: "https://www.csu.edu.au/",
      hubUrl: "https://www.csu.edu.au/forms",
      access: "public-mixed",
      note: "Public admission and course forms are listed openly; the complete current-student list is in the secure Student Portal.",
      forms: [
        online("csu-course-forms", "Course and admission forms", "All forms", "https://www.csu.edu.au/forms", "Browse current public forms and follow the submission instructions on each item."),
        online("csu-student-portal-forms", "Secure current-student forms", "All forms", "https://www.csu.edu.au/current-students/studying/student-admin/forms", "The complete searchable list requires a student login.")
      ]
    }),
    provider({
      id: "cqu",
      code: "CQU",
      name: "CQUniversity",
      aliases: ["cqu", "cq university", "central queensland university"],
      website: "https://www.cqu.edu.au/",
      hubUrl: "https://www.cqu.edu.au/study/current-students",
      access: "portal-only",
      note: "CQUniversity directs current students to the personalised MyCQU portal for forms and support.",
      forms: [
        online("cqu-mycqu", "MyCQU student forms and services", "All forms", "https://www.cqu.edu.au/study/current-students", "Use the official current-student page to sign in to MyCQU.")
      ]
    }),
    provider({
      id: "scu",
      code: "SCU",
      name: "Southern Cross University",
      aliases: ["scu", "southern cross"],
      website: "https://www.scu.edu.au/",
      hubUrl: "https://www.scu.edu.au/current-students/student-forms/",
      access: "public-mixed",
      note: "The official page explains common requests; most active forms are submitted through MyEnrolment.",
      forms: [
        online("scu-myenrolment-forms", "MyEnrolment student forms", "All forms", "https://www.scu.edu.au/current-students/enrolling/", "Change of name, leave, special consideration, transcripts, ID cards, withdrawal and other requests."),
        pdf("scu-international-application", "International application for admission", "Admissions", "https://www.scu.edu.au/media/scu-dep/study/international-students/documents/International-Application-for-Admission-Form-May-2022.pdf", "Paper application route for international admission where the University directs applicants to this form.", {
          caution: "Confirm the current application route before using this PDF because online application may be preferred."
        })
      ]
    }),
    provider({
      id: "avondale",
      code: "AVON",
      name: "Avondale University",
      aliases: ["avondale"],
      website: "https://www.avondale.edu.au/",
      hubUrl: "https://www.avondale.edu.au/current-students/forms-and-procedures/",
      access: "public-mixed",
      note: "Avondale publishes current-student forms and procedures, including financial and cross-institutional requests.",
      forms: [
        pdf("avondale-cross-institution", "Cross-institutional study home-provider endorsement", "Enrolment", "https://www.avondale.edu.au/wp-content/uploads/2024/04/Cross-InstitutionalStudyHomeProviderEndorsement.pdf", "For a student from another institution applying to study units at Avondale.")
      ]
    }),
    provider({
      id: "uts-college",
      code: "UTSC",
      name: "UTS College",
      aliases: ["uts college", "insearch"],
      website: "https://utscollege.edu.au/",
      hubUrl: "https://utscollege.edu.au/current-students/support/student-forms",
      access: "public-mixed",
      note: "UTS College has a dedicated public student-forms directory with evidence guidance.",
      forms: [
        online("utsc-international-application", "International student application guidance", "Admissions", "https://utscollege.edu.au/how-to-apply/international-student-applications", "UTS College currently directs international applicants through an authorised education representative rather than a stable public application PDF."),
        pdf("utsc-professional-authority", "Professional authority", "Supporting documents", "https://utscollege.edu.au/hubfs/Files/Student%20forms/1306086038-Professional-Authority-Form-pdf.pdf?hsLang=en-au", "Medical or professional evidence for attendance and special-consideration situations."),
        pdf("utsc-refund", "Application for refund of fees", "Fees and refunds", "https://utscollege.edu.au/hubfs/Files/Student%20forms/736663302-Application_for_refund_of_fees-INS0005_0224.pdf?hsLang=en-au", "Request a fee refund and provide the supporting evidence named on the form."),
        pdf("utsc-rpl", "Recognition of Prior Learning", "Credit and RPL", "https://utscollege.edu.au/hubfs/Files/Student%20forms/1306086038-Exemption-Application-INS0001.pdf?hsLang=en-au", "Apply for recognised prior learning or subject exemptions.")
      ]
    }),
    provider({
      id: "unsw-college",
      code: "UNSWC",
      name: "UNSW College",
      aliases: ["unsw college", "unsw global"],
      website: "https://www.unswcollege.edu.au/",
      hubUrl: "https://my.unswcollege.edu.au/forms",
      access: "public-mixed",
      note: "UNSW College publishes academic, exam and administrative forms on its current-student site.",
      forms: [
        online("unswc-current-forms", "UNSW College current-student forms", "All forms", "https://my.unswcollege.edu.au/forms", "Browse official document requests, academic and exam forms, appeals and other student workflows.")
      ]
    }),
    provider({
      id: "acpe",
      code: "ACPE",
      name: "Australian College of Physical Education",
      aliases: ["acpe"],
      website: "https://acpe.edu.au/",
      hubUrl: "https://acpe.edu.au/current-students/forms-for-current-students/",
      access: "public-pdf",
      note: "ACPE publishes downloadable fallback forms as well as its MyACPE Support Portal.",
      forms: [
        pdf("acpe-grievance", "Grievance, complaint and appeal", "Appeals and complaints", "https://acpe.edu.au/uploads/2021/04/Grievance-Complaint-Appeal-Form.pdf", "Submit a formal grievance, complaint or appeal under the current ACPE policy.")
      ]
    }),
    provider({
      id: "acap",
      code: "ACAP",
      name: "ACAP University College",
      aliases: ["acap"],
      website: "https://www.acap.edu.au/",
      hubUrl: "https://www.acap.edu.au/student-resources/forms-and-policies/a-z-forms-and-applications/",
      access: "public-mixed",
      note: "ACAP has an A-Z directory covering RPL, enrolment, assessment, records and international requests.",
      forms: [
        online("acap-forms-directory", "ACAP A-Z forms and applications", "All forms", "https://www.acap.edu.au/student-resources/forms-and-policies/a-z-forms-and-applications/", "Open the official directory to choose the current online or downloadable version.")
      ]
    }),
    provider({
      id: "aie",
      code: "AIE",
      name: "AIE Institute",
      aliases: ["aie institute", "academy interactive entertainment"],
      website: "https://aieinstitute.edu.au/",
      hubUrl: "https://aieinstitute.edu.au/student-services/policies-and-procedures/",
      access: "public-mixed",
      note: "AIE lists learner forms with its policies and procedures.",
      forms: [
        online("aie-learner-forms", "AIE learner forms", "All forms", "https://aieinstitute.edu.au/student-services/policies-and-procedures/", "Open the Learner Forms section for the current version, including appeals.")
      ]
    }),
    provider({
      id: "collarts",
      code: "CA",
      name: "Australian College of the Arts (Collarts)",
      aliases: ["collarts", "australian college arts"],
      website: "https://www.collarts.edu.au/",
      hubUrl: "https://www.collarts.edu.au/study-information/handbook-policies-forms/",
      access: "portal-only",
      note: "Collarts publishes selected resources publicly, while current online forms are in MyAdmin.",
      forms: [
        online("collarts-myadmin-forms", "Collarts policies and student forms", "All forms", "https://www.collarts.edu.au/study-information/handbook-policies-forms/", "Use the official page, then MyAdmin for authenticated student forms.")
      ]
    }),
    provider({
      id: "jmc",
      code: "JMC",
      name: "JMC Academy",
      aliases: ["jmc", "jmc academy"],
      website: "https://www.jmcacademy.edu.au/",
      hubUrl: "https://www.jmcacademy.edu.au/about-us/policies-and-procedures/",
      access: "public-mixed",
      note: "JMC lists downloadable and online forms under Policies & Procedures.",
      forms: [
        online("jmc-student-forms", "JMC student forms", "All forms", "https://www.jmcacademy.edu.au/about-us/policies-and-procedures/", "Choose the current deferral, RPL, document, learning-support or other official form.")
      ]
    }),
    provider({
      id: "sae",
      code: "SAE",
      name: "SAE University College",
      aliases: ["sae", "sae institute"],
      website: "https://sae.edu.au/",
      hubUrl: "https://sae.edu.au/current-students/student-forms/",
      access: "public-mixed",
      note: "SAE provides a public form list plus additional forms inside the student portal.",
      forms: [
        pdf("sae-international-declaration", "International student declaration", "International students", "https://sae.edu.au/wp-content/uploads/2025/12/SAE-International-Student-Declaration-Form.pdf", "Declaration required before SAE can issue a Confirmation of Enrolment in the situations described on the form."),
        pdf("sae-student-refund", "Student refund application", "Fees and refunds", "https://sae.edu.au/wp-content/uploads/2025/12/STUDENT_REFUND.pdf", "Provide student and bank details for a refund request."),
        online("sae-current-forms", "SAE current student forms", "All forms", "https://sae.edu.au/current-students/student-forms/", "Remission, refunds, special consideration, records, complaints and other official forms.")
      ]
    }),
    provider({
      id: "torrens",
      code: "TUA",
      name: "Torrens University Australia",
      aliases: ["torrens", "tua"],
      website: "https://www.torrens.edu.au/",
      hubUrl: "https://www.torrens.edu.au/policies-forms",
      access: "public-mixed",
      note: "Torrens publishes policies and selected forms publicly; Student Hub handles many current requests.",
      forms: [
        online("torrens-policies-forms", "Torrens policies and forms", "All forms", "https://www.torrens.edu.au/policies-forms", "Select the current official form, including refund requests, and follow its submission instructions.")
      ]
    }),
    provider({
      id: "excelsia",
      code: "EXLSI",
      name: "Excelsia University College",
      aliases: ["excelsia"],
      website: "https://excelsia.edu.au/",
      hubUrl: "https://excelsia.edu.au/current-students/student-admin-forms/",
      access: "public-mixed",
      note: "Excelsia explains purpose, eligibility, evidence and processing time beside each current form.",
      forms: [
        online("excelsia-student-admin", "Excelsia student administration forms", "All forms", "https://excelsia.edu.au/current-students/student-admin-forms/", "Choose the current extension, transcript, RPL, study-load, leave or records workflow.")
      ]
    }),
    provider({
      id: "mit",
      code: "MIT",
      name: "Melbourne Institute of Technology, Sydney",
      aliases: ["mit sydney", "melbourne institute technology"],
      website: "https://www.mit.edu.au/",
      hubUrl: "https://www.mit.edu.au/study-with-us/how-to-apply",
      access: "public-pdf",
      note: "MIT publishes its current international application form from the official application page.",
      forms: [
        pdf("mit-international-application", "International student application 2026", "Admissions", "https://www.mit.edu.au/sites/default/files/docs/publications/MIT%20International%20Application%20Form_2026_Final.pdf", "Official 2026 international application form for Melbourne Institute of Technology.")
      ]
    }),
    provider({
      id: "nas",
      code: "NAS",
      name: "National Art School",
      aliases: ["nas", "national art school"],
      website: "https://nas.edu.au/",
      hubUrl: "https://nas.edu.au/study-art/how-to-apply/",
      access: "limited",
      note: "NAS uses online application processes for most current study; selected application documents are published when required.",
      forms: [
        online("nas-apply", "National Art School application guidance", "Admissions", "https://nas.edu.au/study-art/how-to-apply/", "Check the current course-specific process before downloading any supplementary document.")
      ]
    }),
    provider({
      id: "ampa",
      code: "AMPA",
      name: "Academy of Music and Performing Arts",
      aliases: ["ampa", "academy music performing arts"],
      website: "https://ampa.edu.au/",
      hubUrl: "https://www.ampa.edu.au/index.php/aboutampa/latest-news/itemlist/category/8-about-us",
      access: "public-mixed",
      note: "AMPA publishes student forms by category and directs students to Student Support when a form is not listed.",
      forms: [
        online("ampa-student-forms", "AMPA student forms", "All forms", "https://www.ampa.edu.au/index.php/aboutampa/latest-news/itemlist/category/8-about-us", "Browse absence, medical, extension and other current student forms.")
      ]
    }),
    provider({
      id: "aim",
      code: "AIM",
      name: "Australian Institute of Music",
      aliases: ["aim", "australian institute music"],
      website: "https://aim.edu.au/",
      hubUrl: "https://aim.edu.au/policies-and-procedures/",
      access: "portal-only",
      note: "AIM says commonly used current-student forms are available through AIM Home.",
      forms: [
        online("aim-current-forms", "AIM Home student forms", "All forms", "https://aim.edu.au/policies-and-procedures/", "Review the official process, then sign in to AIM Home for the current form.")
      ]
    }),
    provider({
      id: "icms",
      code: "ICMS",
      name: "International College of Management, Sydney",
      aliases: ["icms", "international college management"],
      website: "https://www.icms.edu.au/",
      hubUrl: "https://www.icms.edu.au/current-students/subject-enrolment-guide/",
      access: "portal-only",
      note: "ICMS points students to forms in its Policy Library and to Student Services support tickets.",
      forms: [
        online("icms-forms", "ICMS current-student forms", "All forms", "https://www.icms.edu.au/current-students/subject-enrolment-guide/", "Follow the Forms link in the Policy Library or contact Student Services for the current workflow.")
      ]
    }),
    provider({
      id: "spj",
      code: "SPJGM",
      name: "S P Jain School of Global Management",
      aliases: ["sp jain", "spj", "spjgm"],
      website: "https://www.spjain.edu.au/",
      hubUrl: "https://www.spjain.edu.au/governance-policies",
      access: "limited",
      note: "No central public current-student form library was verified; current policies identify applicable processes.",
      forms: [
        online("spj-policy-library", "SP Jain policy and procedure library", "All forms", "https://www.spjain.edu.au/governance-policies", "Confirm the current request form with Student Services using the governing policy.")
      ]
    }),
    provider({
      id: "ait",
      code: "AIT",
      name: "Academy of Interactive Technology",
      aliases: ["ait", "academy interactive technology"],
      website: "https://www.ait.edu.au/",
      hubUrl: "https://www.ait.edu.au/",
      access: "limited",
      note: "No stable public current-student form directory was verified. Use the official site or Student Services for the current document.",
      forms: []
    })
  ];

  return {
    meta: {
      checkedAt,
      scope: "Sydney Course Finder provider catalogue",
      privacy: "PDF editing happens in the browser. Personal details are not sent to Sydney Course Finder.",
      disclaimer: "Universities can replace forms or move them behind a portal. Always read the official instructions before submitting."
    },
    categories: [
      "All forms",
      "Admissions",
      "Enrolment",
      "Personal details",
      "Student records",
      "Credit and RPL",
      "Assessment",
      "Fees and refunds",
      "International students",
      "Supporting documents",
      "Early entry and schemes",
      "Appeals and complaints"
    ],
    providers
  };
});
