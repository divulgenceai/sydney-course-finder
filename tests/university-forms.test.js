const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const catalogue = require("../university-forms-data");
const formProxy = require("../api/form-proxy");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const expectedProviderCodes = [
  "ACAP", "ACPE", "ACU", "AIE", "AIM", "AIT", "AMPA", "AVON",
  "CA", "CQU", "CSU", "EXLSI", "GU", "ICMS", "JMC", "MIT",
  "MQ", "NAS", "SAE", "SCU", "SPJGM", "TUA", "UC", "UND",
  "UNSW", "UNSWC", "UON", "UOW", "USYD", "UTS", "UTSC", "WSU"
];

test("University Forms covers every provider in the current course catalogue", () => {
  const actualCodes = catalogue.providers.map((provider) => provider.code).sort();
  assert.deepEqual(actualCodes, expectedProviderCodes);
  assert.equal(new Set(catalogue.providers.map((provider) => provider.id)).size, catalogue.providers.length);
  assert.equal(catalogue.providers.length, 32);
  assert.ok(catalogue.providers.every((provider) => provider.website && provider.hubUrl));
  assert.ok(catalogue.providers.every((provider) => provider.logo?.startsWith("https://")));
});

test("Form catalogue distinguishes editable PDFs from official online workflows", () => {
  const forms = catalogue.providers.flatMap((provider) => provider.forms.map((form) => ({ provider, form })));
  const ids = forms.map(({ form }) => form.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.ok(forms.length >= 45);
  assert.ok(forms.filter(({ form }) => form.format === "pdf").length >= 15);
  assert.ok(forms.some(({ form }) => form.format === "external-pdf"));
  assert.ok(forms.some(({ form }) => form.format === "online"));
  assert.ok(forms.some(({ form }) => form.format === "questionnaire"));

  for (const { provider, form } of forms) {
    const url = new URL(form.url);
    assert.equal(url.protocol, "https:", `${provider.code} ${form.title} must use HTTPS`);
    assert.ok(["pdf", "external-pdf", "online", "questionnaire"].includes(form.format));
    assert.equal(form.editable, form.format === "pdf" || form.format === "questionnaire");
    assert.ok(form.checkedAt);
    assert.ok(form.description);
  }
});

test("Current UTS and UNSW application workflows use direct official sources", () => {
  const forms = new Map(catalogue.providers.flatMap((provider) => provider.forms.map((form) => [form.id, form])));
  const questionnaire = forms.get("uts-engineering-it-questionnaire");
  const bitCoop = forms.get("uts-bit-coop-scholarship");
  const gateway = forms.get("unsw-gateway-2027");
  const portfolio = forms.get("unsw-portfolio-entry-2027");
  const unswCoop = forms.get("unsw-coop-2027");

  assert.equal(questionnaire.format, "questionnaire");
  assert.equal(questionnaire.questions.length, 3);
  assert.ok(questionnaire.questions.every((question) => question.maxWords === 250));
  assert.match(questionnaire.status, /8 January 2027/);
  assert.match(bitCoop.url, /^https:\/\/forms\.uts\.edu\.au\//);
  assert.match(gateway.url, /^https:\/\/unsw\.uac\.edu\.au\/unsw-gateway\//);
  assert.match(portfolio.url, /^https:\/\/portfolio-entry\.prod\.unsw\.edu\.au\//);
  assert.match(unswCoop.url, /^https:\/\/scholarships\.online\.unsw\.edu\.au\//);
});

test("PDF proxy only exposes exact catalogued PDF IDs on allowlisted hosts", () => {
  const { isAllowedHost, pdfForms, requestId, safeFilename } = formProxy._private;

  assert.ok(pdfForms.length >= 18);
  assert.ok(pdfForms.every((form) => form.format === "pdf"));
  assert.equal(requestId({ url: "/api/form-proxy?id=unsw-change-details" }), "unsw-change-details");
  assert.equal(requestId({ query: { id: " uts-residency-domestic " } }), "uts-residency-domestic");
  assert.equal(isAllowedHost("www.unsw.edu.au"), true);
  assert.equal(isAllowedHost("evil.example"), false);
  assert.equal(safeFilename("Change / personal details?"), "change-personal-details");
});

test("University Forms is wired into Tools, clean routes and the offline shell", () => {
  const html = read("university-forms.html");
  const app = read("app.js");
  const theme = read("theme.js");
  const server = read("server.js");
  const vercel = read("vercel.json");
  const worker = read("sw.js");
  const manifest = JSON.parse(read("manifest.webmanifest"));

  assert.match(html, /id="university-forms-app"/);
  assert.match(html, /university-forms-data\.js/);
  assert.match(html, /pdf-lib\.min\.js/);
  assert.match(html, /university-forms\.js/);
  assert.match(app, /University forms/);
  assert.match(app, /\.\/university-forms/);
  assert.match(theme, /"\/university-forms"/);
  assert.match(server, /clean === "\/university-forms" \|\| clean === "\/forms"/);
  assert.match(vercel, /"source":\s*"\/university-forms"/);
  assert.match(worker, /"\/university-forms":\s*"\/university-forms\.html"/);
  assert.match(worker, /"\/university-forms-data\.js"/);
  assert.ok(manifest.shortcuts.some((shortcut) => shortcut.url === "/university-forms"));
});

test("PDF completion is local-first and warns about signatures and official submission rules", () => {
  const source = read("university-forms.js");
  const proxy = read("api/form-proxy.js");

  assert.match(source, /Your details stay on this device/);
  assert.match(source, /PDFDocument\.load/);
  assert.match(source, /Download completed PDF/);
  assert.match(source, /Live document preview/);
  assert.match(source, /schedulePdfPreview/);
  assert.match(source, /buildQuestionnairePdfBytes/);
  assert.match(source, /not automatically a legally valid signature/);
  assert.match(source, /localStorage\.setItem\(profileStorageKey/);
  assert.match(source, /if \(editor\.remember\)/);
  assert.match(proxy, /private, no-store/);
  assert.match(proxy, /PDF_MAGIC/);
  assert.match(proxy, /MAX_PDF_BYTES/);
});
