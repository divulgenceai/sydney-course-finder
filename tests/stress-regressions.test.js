const test = require('node:test');
const assert = require('node:assert/strict');
const {buildPersonalPlanView} = require('../subject-helper-logic');
const securityHeaders = require('../security-headers');

test('existing software plans discard incompatible medical-practitioner recommendations without mutating the saved snapshot', () => {
  const snapshot = {
    primary: {name:'Bachelor of Software Engineering',university:'UTS'},
    jobs:[{title:'Medical practitioner'}, {title:'Software engineer'}]
  };
  const view = buildPersonalPlanView({year:'Year 12'},snapshot);
  assert(!JSON.stringify(view).includes('Medical practitioner'));
  assert(JSON.stringify(view).includes('Software engineer'));
  assert.equal(snapshot.jobs.length,2);
});

test('medicine study plans retain the relevant medical career', () => {
  const view = buildPersonalPlanView({year:'Year 12'}, {
    primary:{name:'Bachelor of Medicine and Bachelor of Surgery',university:'UNSW'},
    jobs:[{title:'Medical practitioner'}]
  });
  assert(JSON.stringify(view).includes('Medical practitioner'));
});

test('security policy blocks inline executable scripts and objects while allowing local PDF workers', () => {
  const csp=securityHeaders['Content-Security-Policy'];
  assert(csp.includes("script-src 'self';"));
  assert(csp.includes("object-src 'none'"));
  assert(csp.includes("worker-src 'self' blob:"));
  assert.equal(securityHeaders['X-Content-Type-Options'],'nosniff');
  assert.equal(securityHeaders['Cross-Origin-Resource-Policy'],'same-origin');
});
