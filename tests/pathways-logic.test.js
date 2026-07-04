const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPathwayResults,
  classifyPathwayGoal,
  pathwaySituations
} = require("../pathways-logic");

test("Pathways separates Year 12 no-ATAR from leaving school in Year 11", () => {
  const labels = pathwaySituations.map((item) => item.label);

  assert.ok(labels.includes("Year 12 but no ATAR / unsure ATAR"));
  assert.ok(labels.includes("Left school in Year 11"));
  assert.ok(labels.includes("Finished Year 12 without an ATAR"));
  assert.ok(!labels.includes("No ATAR / left school"));
});

test("Business search returns ways to get there rather than unrelated university cards", () => {
  const result = buildPathwayResults({ goal: "Business", situation: "left-y11" });
  const combined = result.routes.map((route) => `${route.title} ${route.steps.join(" ")}`).join(" ");

  assert.equal(result.profile.id, "business");
  assert.ok(result.routes.length >= 3);
  assert.match(combined, /Business|commerce|TAFE|Diploma/i);
  assert.doesNotMatch(combined, /Bachelor of 2D Animation/i);
  assert.ok(result.routes.some((route) => route.year12Rule.includes("does not usually need Year 12")));
});

test("Creative searches prioritise portfolio routes", () => {
  const result = buildPathwayResults({ goal: "animation", situation: "year12-no-atar" });

  assert.equal(classifyPathwayGoal("animation").id, "creative");
  assert.equal(result.routes[0].id, "portfolio");
  assert.match(result.routes[0].steps.join(" "), /portfolio|interview|audition/i);
});
