/* Directory grouping, not a funding/fee classification or a quality ranking.
 * Reviewed 2026-09-19. Keep an explicit entry for every imported provider;
 * an unknown new provider must never silently become "private".
 * University list: https://www.studyaustralia.gov.au/en/plan-your-studies/list-of-australian-universities
 * Independent providers: https://ihea.edu.au/members-directory/
 * ACU: https://www.acu.edu.au/about-acu/leadership-and-governance
 * Notre Dame: https://www.notredame.edu.au/about-us/introducing-unda
 * UNSW College: https://www.unswcollege.edu.au/about
 * UTS College: https://utscollege.edu.au/getmedia/673f985c-9807-406a-b0dc-d74c9cdd32c5/UTS-College-FY24-Final-signed.pdf
 * NAS: https://nas.edu.au/media/National-Art-School-Annual-Report-2025.pdf
 */
(function (root) {
  const groups = [
    { id: "public", title: "Public universities & providers", shortTitle: "Public", description: "Public universities, their controlled colleges, and publicly controlled specialist providers." },
    { id: "private", title: "Private universities & providers", shortTitle: "Private", description: "Independent universities and colleges, including not-for-profit institutions." }
  ];
  const records = {};
  const add = (ids, sector, label) => ids.forEach(id => { records[id] = Object.freeze({ sector, label }); });
  add(["ACU", "CSU", "CQU", "GU", "MQ", "SCU", "UC", "UON", "USYD", "UTS", "UOW", "UNSW", "WS"], "public", "Public university");
  add(["UTSC", "UNSWC"], "public", "Public university-controlled college");
  add(["NAS"], "public", "NSW Government-controlled art school");
  add(["AVON", "TUA", "UND"], "private", "Private university");
  add(["AIT", "AMPA", "ACAP", "AIE", "ACPE", "CA", "AIM", "EXLSI", "ICMS", "JMC", "MIT", "SPJGM", "SAE"], "private", "Independent higher education provider");
  const unknown = Object.freeze({ sector: "unclassified", label: "Provider type under review" });
  const api = Object.freeze({
    groups: Object.freeze(groups.map(Object.freeze)),
    records: Object.freeze(records),
    get: id => records[id] || unknown
  });
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.courseFinderProviderSectors = api;
})(typeof window === "object" ? window : globalThis);
