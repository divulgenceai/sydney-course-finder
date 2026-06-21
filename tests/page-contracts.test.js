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
