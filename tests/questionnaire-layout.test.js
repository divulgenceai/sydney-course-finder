const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../university-forms.js'), 'utf8');

async function layout(profile) {
  const pages = [];
  const font = { widthOfTextAtSize: (text, size) => text.length * size * .52 };
  const doc = {
    embedFont: async () => font,
    addPage: () => {
      const commands = [];
      pages.push(commands);
      return { drawText: (text, options) => commands.push({ text, ...options }), drawLine: options => commands.push(options) };
    },
    getPageCount: () => pages.length,
    setTitle() {}, setAuthor() {}, setSubject() {}, setCreator() {}, save: async () => pages
  };
  const context = { window: { PDFLib: { PDFDocument: { create: async () => doc }, StandardFonts: {}, rgb: () => null } } };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('async function buildQuestionnairePdfBytes('), source.indexOf('function downloadPdfBytes(')), context);
  return context.buildQuestionnairePdfBytes({ profile, form: { questions: [] }, answers: {} });
}

test('questionnaire details have clear rule spacing and wrap long single-word values', async () => {
  const pages = await layout({ fullName: 'Sample Applicant', dob: '01/02/2008', email: 'a'.repeat(240) + '@example.test', uacReference: '123456789' });
  const commands = pages.flat();
  const values = commands.filter(command => command.size === 10.5);
  assert(values.length > 4, 'long email should wrap into multiple lines');
  for (const page of pages) {
    const rules = page.filter(command => command.start);
    for (const text of page.filter(command => command.text && [9, 10.5].includes(command.size))) {
      assert(rules.every(rule => Math.abs(rule.start.y - text.y) >= 14), `rule crowds ${text.text}`);
    }
  }
  assert(values.every(command => command.font.widthOfTextAtSize(command.text, command.size) <= 364.28));
});

test('very long personal details paginate within margins without losing characters', async () => {
  const longName = 'x'.repeat(7000);
  const pages = await layout({ fullName: longName, dob: '', email: '', uacReference: '' });
  assert(pages.length > 1);
  const values = pages.flat().filter(command => command.size === 10.5);
  assert.equal(values.map(command => command.text).join(''), longName);
  assert(values.every(command => command.y >= 48 && command.y <= 754));
});
