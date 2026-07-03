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
  assert.match(pathwaysHtml, /pathways\.js/);
  assert.match(pathways, /providerLogo/);
  assert.match(server, /pathways/);
  assert.match(server, /no-atar/);
  assert.match(vercel, /"source":\s*"\/pathways"/);
  assert.match(vercel, /"destination":\s*"\/pathways\.html"/);
  assert.match(vercel, /"source":\s*"\/no-atar"/);
  assert.match(packageJson, /node --check pathways\.js/);
});

test("Pathways covers no-ATAR and alternative university entry routes", () => {
  const source = read("pathways.js");

  assert.match(source, /No ATAR/);
  assert.match(source, /STAT/);
  assert.match(source, /Schools Recommendation Scheme/);
  assert.match(source, /Educational Access Scheme/);
  assert.match(source, /TAFE\/VET/);
  assert.match(source, /Open Universities Australia/);
  assert.match(source, /pathway course/i);
  assert.match(source, /Undergraduate Certificate/);
  assert.match(source, /Diploma/);
  assert.match(source, /foundation/i);
  assert.match(source, /portfolio/i);
  assert.match(source, /coursePathwayType/);
  assert.match(source, /recommendedRoute/);
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
  assert.match(app, /Subject helper/);
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
