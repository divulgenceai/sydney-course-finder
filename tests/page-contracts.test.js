const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Subject Helper presents one automatic job-or-degree search", () => {
  const source = read("subject-helper.js");
  assert.match(source, /Search a job or degree/i);
  assert.match(source, /detectPlanningIntent/);
  assert.doesNotMatch(source, /renderYearSelector/);
  assert.doesNotMatch(source, /renderSeniorSubjectChecker/);
  assert.doesNotMatch(source, /directionCards/);
  assert.doesNotMatch(source, /Check my subjects/);
});

test("ATAR Match supports income filtering and income-only course search", () => {
  const source = read("app.js");
  assert.match(source, /matcherIncome/);
  assert.match(source, /data-action="matcherIncome"/);
  assert.match(source, /data-atar-income-filter/);
  assert.match(source, /courseMeetsIncome\(course,\s*state\.matcherIncome\)/);
  assert.match(source, /hasIncomeOnlySearch/);
  assert.match(source, /Search by income only/i);
});

test("My Plan has its own page and every nav points to it", () => {
  const app = read("app.js");
  const guide = read("guide.js");
  const subjectHelper = read("subject-helper.js");
  const calculator = read("atar-calculator.js");
  const advisor = read("advisor.js");
  const myPlanHtml = read("my-plan.html");
  const myPlan = read("my-plan.js");
  const vercel = read("vercel.json");

  for (const source of [app, guide, subjectHelper, calculator, advisor, myPlan]) {
    assert.match(source, /My Plan/);
    assert.match(source, /\.\/my-plan\.html/);
  }
  assert.doesNotMatch(app, /#my-plan/);
  assert.doesNotMatch(app, /renderMyPlan/);
  assert.doesNotMatch(app, /renderLegacyPlanPanel/);
  assert.doesNotMatch(app, /id="my-plan"/);
  assert.doesNotMatch(app, /my-plan-panel/);
  assert.doesNotMatch([app, guide, subjectHelper, calculator, advisor].join("\n"), /index\.html#my-plan/);
  assert.match(myPlanHtml, /id="my-plan-app"/);
  assert.match(myPlanHtml, /my-plan\.js/);
  assert.match(myPlanHtml, /subject-helper-logic\.js/);
  assert.match(vercel, /"source":\s*"\/my-plan"/);
  assert.match(vercel, /"destination":\s*"\/my-plan\.html"/);
});

test("Pathways has its own page and every nav points to it", () => {
  const app = read("app.js");
  const guide = read("guide.js");
  const subjectHelper = read("subject-helper.js");
  const calculator = read("atar-calculator.js");
  const advisor = read("advisor.js");
  const myPlan = read("my-plan.js");
  const pathwaysHtml = read("pathways.html");
  const noAtarHtml = read("no-atar.html");
  const pathways = read("pathways.js");
  const server = read("server.js");
  const vercel = read("vercel.json");
  const packageJson = read("package.json");

  for (const source of [app, guide, subjectHelper, calculator, advisor, myPlan, pathways]) {
    assert.match(source, /Pathways/);
    assert.match(source, /\.\/pathways\.html/);
  }

  assert.match(pathwaysHtml, /id="pathways-app"/);
  assert.match(pathwaysHtml, /uac-courses\.js/);
  assert.match(pathwaysHtml, /pathways-logic\.js/);
  assert.match(pathwaysHtml, /pathways\.js/);
  assert.match(noAtarHtml, /id="pathways-app"/);
  assert.match(noAtarHtml, /uac-courses\.js/);
  assert.match(noAtarHtml, /pathways-logic\.js/);
  assert.match(noAtarHtml, /pathways\.js/);
  assert.match(server, /pathways/);
  assert.match(server, /no-atar/);
  assert.match(vercel, /"source":\s*"\/pathways"/);
  assert.match(vercel, /"destination":\s*"\/pathways\.html"/);
  assert.match(vercel, /"source":\s*"\/no-atar"/);
  assert.match(packageJson, /node --check pathways\.js/);
});

test("Pathways covers no-ATAR and alternative university entry routes", () => {
  const source = read("pathways.js");
  const logic = read("pathways-logic.js");

  assert.match(logic, /Year 12 but no ATAR/);
  assert.match(logic, /Left school in Year 11/);
  assert.match(logic, /Finished Year 12 without an ATAR/);
  assert.doesNotMatch(logic, /No ATAR \/ left school/);
  assert.match(logic, /STAT/);
  assert.match(logic, /Schools Recommendation Scheme/);
  assert.match(logic, /Educational Access Scheme/);
  assert.match(logic, /TAFE\/VET/);
  assert.match(logic, /Open Universities Australia/);
  assert.match(logic, /Undergraduate Certificate/);
  assert.match(logic, /Diploma/);
  assert.match(logic, /foundation/i);
  assert.match(logic, /portfolio/i);
  assert.match(source, /renderWaysToGetThere/);
  assert.match(source, /What do you want to study/i);
  assert.match(source, /Ways to get there/i);
  assert.doesNotMatch(source, /Pathway-style courses in the imported UAC data/);
  assert.doesNotMatch(source, /imported UAC data/);
  assert.doesNotMatch(source, /renderPathwayCourseCard/);
});

test("Header navigation stays compact after adding Pathways", () => {
  const sources = [
    read("app.js"),
    read("guide.js"),
    read("my-plan.js"),
    read("pathways.js"),
    read("subject-helper.js"),
    read("atar-calculator.js"),
    read("advisor.js")
  ].join("\n");
  const topnavs = (sources.match(/<nav class="topnav"[\s\S]*?<\/nav>/g) || []).join("\n");

  assert.match(topnavs, /href="\.\/index\.html#atar">ATAR</);
  assert.match(topnavs, /href="\.\/atar-calculator\.html"[^>]*>Calculator</);
  assert.match(topnavs, /href="\.\/subject-helper\.html"[^>]*>Subjects</);
  assert.match(topnavs, /href="\.\/advisor\.html"[^>]*>Course help</);
  assert.doesNotMatch(topnavs, /href="\.\/atar-calculator\.html"[^>]*>ATAR calculator</);
});

test("My Plan page reads the saved Guide result as a linear plan", () => {
  const myPlan = read("my-plan.js");
  const guide = read("guide.js");

  assert.match(guide, /guidePlanSnapshotKey/);
  assert.match(guide, /createGuidePlanSnapshot/);
  assert.match(guide, /goalLabel/);
  assert.match(guide, /projectedAtar/);
  assert.match(guide, /renderGuideLinearPlanPreview/);
  assert.match(guide, /sydneyCourseFinder\.guidePlanSnapshot/);
  assert.match(myPlan, /loadGuidePlanSnapshot/);
  assert.match(myPlan, /buildPersonalPlanView/);
  assert.match(myPlan, /renderLinearPlanStage/);
  assert.match(myPlan, /providerLogoForOption/);
  assert.match(myPlan, /Year 10 subject selection/);
  assert.match(myPlan, /Projected ATAR/);
  assert.match(myPlan, /UAC list/);
  assert.match(myPlan, /SEEK|LinkedIn|GradConnection|Prosple/);
});

test("Guide exposes manual adjustment controls with impact warnings", () => {
  const source = read("guide.js");
  assert.match(source, /renderGuidePlanAdjustments/);
  assert.match(source, /data-guide-adjust/);
  assert.match(source, /applyGuideAdjustment/);
  assert.match(source, /addEventListener\("blur"/);
  assert.match(source, /changes the recommendation/i);
  assert.match(source, /does not break/i);
});

test("Page entrance animation keeps panels readable on first paint", () => {
  const styles = read("styles.css");
  assert.doesNotMatch(styles, /@keyframes pageSectionIn\s*{\s*from\s*{\s*opacity:\s*0[;\s]/);
  assert.match(styles, /@keyframes pageSectionIn\s*{\s*from\s*{\s*opacity:\s*0\.[7-9]/);
});

test("Subject Helper keeps its own route and navigation entry", () => {
  const server = read("server.js");
  const app = read("app.js");
  assert.match(server, /subject-helper/);
  assert.match(app, /Subjects/);
});

test("both planning pages load the shared planning logic", () => {
  assert.match(read("subject-helper.html"), /subject-helper-logic\.js/);
  assert.match(read("guide.html"), /subject-helper-logic\.js/);
});

test("Guide owns the school-year modes and direction questionnaire", () => {
  const source = read("guide.js");
  assert.match(source, /Year 10 or below/);
  assert.match(source, /Year 11/);
  assert.match(source, /Year 12/);
  assert.match(source, /directionCards/);
  assert.match(source, /deckAnswers/);
  assert.match(source, /localStorage/);
});
