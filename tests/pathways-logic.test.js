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

test("changing the situation changes the route order for the same goal", () => {
  const stillAtSchool = buildPathwayResults({ goal: "Business", situation: "year12-no-atar" });
  const leftInYear11 = buildPathwayResults({ goal: "Business", situation: "left-y11" });
  const matureAge = buildPathwayResults({ goal: "Business", situation: "mature" });

  assert.equal(leftInYear11.routes[0].id, "tafe-vet");
  assert.equal(matureAge.routes[0].id, "stat");
  assert.notDeepEqual(
    stillAtSchool.routes.map((route) => route.id).slice(0, 3),
    leftInYear11.routes.map((route) => route.id).slice(0, 3)
  );
});

test("business no-ATAR pathways include Western Sydney University The College when relevant", () => {
  const result = buildPathwayResults({ goal: "Business", situation: "year12-no-atar" });
  const wsuRoute = result.routes.find((route) => route.id === "wsu-college");

  assert.ok(wsuRoute);
  assert.match(wsuRoute.title, /Western Sydney University The College/i);
  assert.match(wsuRoute.steps.join(" "), /Diploma in Business|The College/i);
  assert.match(wsuRoute.officialLabel, /Western Sydney/i);
});

test("default pathways avoid duplicate wording and include useful links on every route", () => {
  const result = buildPathwayResults({ goal: "", situation: "year12-no-atar" });
  const combinedTitles = result.routes.map((route) => route.title).join(" ");

  assert.doesNotMatch(combinedTitles, /pathway pathway/i);
  assert.ok(result.routes.length >= 3);
  for (const route of result.routes) {
    assert.ok(Array.isArray(route.links), `${route.id} should expose route links`);
    assert.ok(route.links.length >= 2, `${route.id} should have more than one useful link`);
    for (const link of route.links) {
      assert.match(link.label, /\S/);
      assert.match(link.url, /^https:\/\//);
    }
  }
});

test("defence goals surface ADFA but unrelated pathways do not", () => {
  const defence = buildPathwayResults({ goal: "ADFA army officer cyber security", situation: "year10" });
  const nursing = buildPathwayResults({ goal: "nursing", situation: "left-y11" });

  assert.equal(classifyPathwayGoal("ADFA army officer").id, "defence");
  assert.ok(defence.routes.some((route) => route.id === "adfa"));
  assert.ok(defence.routes.some((route) => /ADFA|Australian Defence Force Academy/i.test(route.title)));
  assert.ok(!defence.routes.some((route) => route.id === "wsu-college"));
  assert.ok(!defence.routes.some((route) => route.title === "Defence / ADFA diploma bridge"));
  assert.ok(defence.routes.some((route) => route.title === "Defence-adjacent study bridge"));
  assert.ok(!nursing.routes.some((route) => route.id === "adfa"));
});

test("Creative searches prioritise portfolio routes", () => {
  const result = buildPathwayResults({ goal: "animation", situation: "year12-no-atar" });

  assert.equal(classifyPathwayGoal("animation").id, "creative");
  assert.equal(result.routes[0].id, "portfolio");
  assert.match(result.routes[0].steps.join(" "), /portfolio|interview|audition/i);
});
