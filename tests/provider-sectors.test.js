const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sectors = require('../provider-sectors');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../uac-courses-lite.js'), 'utf8'), context);

test('every imported provider belongs to exactly one explicit public/private group', () => {
  const providers = context.window.uacProviders;
  assert.equal(Object.keys(sectors.records).length, providers.length);
  assert(providers.every(provider => ['public', 'private'].includes(sectors.get(provider.id).sector)));
  assert.equal(providers.filter(provider => sectors.get(provider.id).sector === 'public').length, 16);
  assert.equal(providers.filter(provider => sectors.get(provider.id).sector === 'private').length, 16);
});

test('Catholic identity, corporate form and university names do not infer provider sector', () => {
  assert.equal(sectors.get('ACU').sector, 'public');
  assert.equal(sectors.get('UND').sector, 'private');
  assert.equal(sectors.get('TUA').sector, 'private');
  for (const id of ['UTSC', 'UNSWC']) assert.match(sectors.get(id).label, /controlled college/);
  assert.equal(sectors.get('NAS').sector, 'public');
  assert.equal(sectors.get('NEW').sector, 'unclassified');
});

test('bundled provider logos are passive SVGs and cover the primary public and private rankings', () => {
  const directory = path.join(__dirname, '../assets/providers');
  const files = fs.readdirSync(directory).filter(file => file.endsWith('.svg'));
  assert.equal(files.length, 31);
  for (const id of ['USYD', 'UNSW', 'UTS', 'TUA', 'ICMS', 'SAE']) assert(files.includes(id.toLowerCase()+'.svg'));
  for (const file of files) {
    const svg = fs.readFileSync(path.join(directory, file), 'utf8');
    assert.match(svg, /<svg\b/);
    assert.doesNotMatch(svg, /<script|<foreignObject|\bon\w+\s*=|@import|(?:href|src)\s*=\s*['"](?:https?:|javascript:)/i);
  }
});
