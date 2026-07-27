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

test("Income search remains available as an advanced course filter", () => {
  const source = read("app.js");
  assert.match(source, /select\("income", "Income goal"/);
  assert.match(source, /income:\s*"Any income"/);
  assert.match(source, /hasIncomeOnlySearch/);
  assert.match(source, /courseMeetsIncome\(course,\s*state\.income\)/);
  assert.match(source, /Income potential/);
});

test("Course Search works when users only change filters", () => {
  const source = read("app.js");

  assert.match(source, /hasActiveCourseFilters/);
  assert.match(source, /hasActiveCourseSearch/);
  assert.match(source, /Filters work even when the search box is empty/);
  assert.match(source, /if \(!query && !hasActiveCourseFilters\(\)\) return \[\]/);
  assert.match(source, /state\.courseType !== "All course types"/);
  assert.match(source, /state\.area !== "All study areas"/);
  assert.match(source, /state\.provider !== "All providers"/);
  assert.match(source, /state\.campus !== "All campuses"/);
  assert.match(source, /state\.duration !== "Any duration"/);
  assert.match(source, /state\.mode !== "All modes"/);
  assert.match(source, /Boolean\(cleanSearchText\(state\.locationQuery\)\)/);
});

test("My Plan has its own page and only appears in nav after Guide saves a plan", () => {
  const app = read("app.js");
  const guide = read("guide.js");
  const subjectHelper = read("subject-helper.js");
  const calculator = read("atar-calculator.js");
  const advisor = read("advisor.js");
  const pathways = read("pathways.js");
  const theme = read("theme.js");
  const myPlanHtml = read("my-plan.html");
  const myPlan = read("my-plan.js");
  const vercel = read("vercel.json");

  assert.match(theme, /guidePlanSnapshotKey/);
  assert.match(theme, /hasGuidePlanSnapshot/);
  assert.match(app, /hasGuidePlanSnapshot\?\.\(\)\s*\?\s*renderToolLink\("\.\/my-plan"/);
  assert.match(app, /My saved plan/);
  assert.match(theme, /const mobilePrimaryLabels = \["Courses", "Universities", "Tools", "Saved", "About"\]/);
  assert.doesNotMatch(theme, /canonicalNavigationMarkup\(\)[\s\S]*?<a href="\.\/my-plan"/);
  assert.doesNotMatch([app, guide, subjectHelper, calculator, advisor, pathways].join("\n"), /<a href="\.\/my-plan\.html">My Plan<\/a>/);
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
    assert.match(source, /\.\/pathways/);
  }

  assert.match(pathwaysHtml, /id="pathways-app"/);
  assert.match(pathwaysHtml, /uac-courses-lite\.js/);
  assert.match(pathwaysHtml, /pathways-logic\.js/);
  assert.match(pathwaysHtml, /pathways\.js/);
  assert.match(noAtarHtml, /id="pathways-app"/);
  assert.match(noAtarHtml, /uac-courses-lite\.js/);
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
  assert.match(source, /renderPathwayProviders/);
  assert.match(source, /Pathway providers that fit your situation/);
  assert.match(source, /renderRouteLinks/);
  assert.match(source, /useful-route-links/);
  assert.match(source, /What do you want to study/i);
  assert.match(source, /Ways to get there/i);
  assert.match(source, /Western Sydney University The College/i);
  assert.match(source, /ADFA/i);
  assert.doesNotMatch(source, /Pathway-style courses in the imported UAC data/);
  assert.doesNotMatch(source, /imported UAC data/);
  assert.doesNotMatch(source, /renderPathwayCourseCard/);
});

test("Course cards distinguish selection rank from raw ATAR and cite the source", () => {
  const app = read("app.js");
  const importer = read("tools/import-uac-courses.js");
  const enricher = read("tools/enrich-admission-profiles.js");
  const liteBuilder = read("tools/build-uac-courses-lite.js");

  assert.match(app, /Lowest selection rank/);
  assert.match(app, /Lowest raw ATAR/);
  assert.match(app, /Selection rank can include adjustments/);
  assert.match(app, /admissionProfileUrl/);
  assert.match(importer, /selectionRank:\s*lsr/);
  assert.match(importer, /lowestAtar:\s*profile\.lowestAtar/);
  assert.match(enricher, /profile\.lsr/);
  assert.match(enricher, /profile\.lowestAtar/);
  assert.match(enricher, /Year 12 certificate \/ provider criteria/);
  assert.match(liteBuilder, /selectionRank:\s*course\.selectionRank/);
  assert.match(liteBuilder, /lowestAtar:\s*course\.lowestAtar/);
});

test("Header navigation uses the five-item information architecture", () => {
  const app = read("app.js");
  const theme = read("theme.js");
  const canonical = theme.match(/function canonicalNavigationMarkup\(\)[\s\S]*?^\s*}/m)?.[0] || "";

  for (const label of ["Courses", "Universities", "Tools", "Saved", "About"]) {
    assert.match(canonical, new RegExp(`>${label}`));
  }
  for (const oldLabel of ["Guide", "Pathways", "Calculator", "Subjects", "Course help", "FAQ"]) {
    assert.doesNotMatch(canonical, new RegExp(`>${oldLabel}`));
  }
  assert.match(theme, /rewritePrimaryNavigation/);
  assert.match(app, /<h2>Planning tools<\/h2>/);
  assert.match(app, /How to choose a course/);

  const css = read("styles.css");
  assert.match(css, /\/\* v23 search-first product redesign \*\//);
  assert.match(css, /\.topnav\s*{[\s\S]*gap:\s*clamp\(18px,\s*2\.2vw,\s*36px\)/);
  assert.match(css, /\.topnav a,\s*\n\.topnav button\s*{[\s\S]*font-size:\s*15px/);
});

test("Mobile layout uses an app-style shell with bottom navigation", () => {
  const css = read("styles.css");
  const theme = read("theme.js");

  assert.match(theme, /mobileNavIcons/);
  assert.match(theme, /decorateMobileNav/);
  assert.match(theme, /setupMobileNav/);
  assert.match(theme, /buildMobilePrimaryNav/);
  assert.match(theme, /mobile-primary-nav/);
  assert.match(theme, /dataset\.mobileIcon/);
  assert.match(theme, /dataset\.mobileLabel/);
  assert.match(theme, /const mobilePrimaryLabels = \["Courses", "Universities", "Tools", "Saved", "About"\]/);
  assert.match(theme, /source\.dataset\.mobilePrimary = "true"/);
  assert.match(css, /\.mobile-primary-nav\s*{[\s\S]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)\s*!important/);
  assert.match(css, /\.topnav \[data-mobile-primary="true"\]\s*{\s*display:\s*none/);
  assert.match(css, /\.mobile-primary-nav\s*{[\s\S]*bottom:\s*0/);
  assert.match(css, /\.mobile-nav-peek\s*{\s*display:\s*none\s*!important/);
  assert.doesNotMatch(theme, /mobile-nav-peek/);
  assert.doesNotMatch(theme, /handleMobileNavScroll/);
});

test("Course search keeps every record while full details load lazily", () => {
  const htmlFiles = ["index.html", "guide.html", "pathways.html", "no-atar.html", "subject-helper.html", "subjects.html", "my-plan.html", "advisor.html"];
  const generator = read("tools/build-uac-courses-lite.js");
  const loader = read("course-details.js");
  const app = read("app.js");
  const subjectHelper = read("subject-helper.js");
  const vercel = read("vercel.json");

  for (const file of htmlFiles) {
    const html = read(file);
    assert.match(html, /uac-courses-lite\.js\?v=15/);
    assert.match(html, /course-details\.js\?v=13/);
  }

  assert.match(generator, /fullCourses\.map/);
  assert.match(generator, /detailChunk/);
  assert.match(generator, /course-data["'],\s*["']details/);
  assert.match(generator, /Preserved full details/);
  assert.match(loader, /courseFinderCourseDetails/);
  assert.match(loader, /fetch\(url/);
  assert.match(loader, /Object\.assign\(course, complete\)/);
  assert.match(app, /hydrateCourseDetail/);
  assert.match(subjectHelper, /hydrateSubjectCourseDetail/);
  assert.match(vercel, /course-data\/details/);
});

test("Site is installable as an Android-friendly PWA", () => {
  const htmlFiles = ["index.html", "guide.html", "pathways.html", "no-atar.html", "atar-calculator.html", "calculator.html", "subject-helper.html", "subjects.html", "my-plan.html", "advisor.html"];
  const manifest = JSON.parse(read("manifest.webmanifest"));
  const serviceWorker = read("sw.js");
  const theme = read("theme.js");
  const server = read("server.js");

  for (const file of htmlFiles) {
    const html = read(file);
    assert.match(html, /<link rel="manifest" href="\.\/manifest\.webmanifest" \/>/);
    assert.match(html, /<meta name="mobile-web-app-capable" content="yes" \/>/);
    assert.match(html, /<link rel="apple-touch-icon" href="\.\/assets\/app-icon-192\.png" \/>/);
  }

  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.match(manifest.start_url, /^\//);
  assert.ok(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.type === "image/png"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"));
  assert.match(serviceWorker, /CACHE_NAME/);
  assert.match(serviceWorker, /sydney-course-finder-app-v38/);
  assert.match(serviceWorker, /async function cacheFirstThenRefresh[\s\S]*cache\.match\(request\)/);
  assert.match(serviceWorker, /request\.mode === "navigate"[\s\S]*navigationCacheFirstExact\(request/);
  assert.match(serviceWorker, /async function navigationCacheFirstExact[\s\S]*cache\.match\(request\)/);
  assert.match(serviceWorker, /ROUTE_FALLBACKS/);
  assert.match(serviceWorker, /"\/guide":\s*"\/guide\.html"/);
  assert.match(serviceWorker, /"\/pathways":\s*"\/pathways\.html"/);
  assert.match(serviceWorker, /"\/calculator":\s*"\/calculator\.html"/);
  assert.match(serviceWorker, /"\/subjects":\s*"\/subjects\.html"/);
  assert.match(serviceWorker, /self\.addEventListener\("install"/);
  assert.match(serviceWorker, /self\.addEventListener\("fetch"/);
  assert.match(serviceWorker, /cacheFirstThenRefresh/);
  assert.match(serviceWorker, /refreshCache/);
  assert.match(serviceWorker, /isAppShellAsset/);
  assert.match(serviceWorker, /\.html", "\.js", "\.css", "\.json", "\.webmanifest/);
  assert.match(serviceWorker, /event\.respondWith\(navigationCacheFirstExact\(request/);
  assert.match(serviceWorker, /async function navigationCacheFirstExact/);
  assert.match(serviceWorker, /async function networkFirst/);
  assert.match(serviceWorker, /ignoreSearch:\s*true/);
  assert.match(theme, /serviceWorker\s*\.\s*register\("\/sw\.js",\s*\{ scope:\s*"\/",\s*updateViaCache:\s*"none" \}/);
  assert.match(theme, /scheduleServiceWorkerRegistration/);
  assert.match(theme, /requestIdleCallback/);
  assert.doesNotMatch(theme, /registration\.update\(\)/);
  assert.doesNotMatch(theme, /window\.location\.reload/);
  assert.doesNotMatch(theme, /controllerchange/);
  assert.doesNotMatch(serviceWorker, /"\/uac-courses\.js"/);
  assert.match(server, /\.webmanifest/);
});

test("Android wrapper can build a phone app around the live site", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  const activity = read("android/app/src/main/java/com/sydneycoursefinder/app/MainActivity.java");
  const appGradle = read("android/app/build.gradle");
  const rootGradle = read("android/build.gradle");
  const packageJson = read("package.json");
  const buildScript = read("tools/build-android-debug.ps1");

  assert.match(rootGradle, /com\.android\.application/);
  assert.match(appGradle, /namespace "com\.sydneycoursefinder\.app"/);
  assert.match(appGradle, /compileSdk 36/);
  assert.match(manifest, /android\.permission\.INTERNET/);
  assert.match(manifest, /android:usesCleartextTraffic="true"/);
  assert.match(activity, /refreshWebAssetsOnLoad/);
  assert.match(activity, /navigator\.serviceWorker\.getRegistrations/);
  assert.match(activity, /caches\.keys\(\)/);
  assert.match(manifest, /android:name="\.MainActivity"/);
  assert.match(manifest, /android:screenOrientation="portrait"/);
  assert.match(activity, /WebView/);
  assert.match(appGradle, /https:\/\/sydney-course-finder\.vercel\.app\/\?source=android/);
  assert.match(appGradle, /http:\/\/127\.0\.0\.1:4190\/\?source=android/);
  assert.match(activity, /BuildConfig\.APP_URL/);
  assert.match(activity, /setJavaScriptEnabled\(true\)/);
  assert.match(activity, /setDomStorageEnabled\(true\)/);
  assert.match(activity, /setLayerType\(View\.LAYER_TYPE_HARDWARE/);
  assert.match(activity, /setOffscreenPreRaster\(true\)/);
  assert.match(activity, /setRendererPriorityPolicy\(WebView\.RENDERER_PRIORITY_IMPORTANT,\s*true\)/);
  assert.match(activity, /setCacheMode\(WebSettings\.LOAD_DEFAULT\)/);
  assert.match(activity, /setTextZoom\(100\)/);
  assert.match(activity, /setVerticalScrollBarEnabled\(false\)/);
  assert.match(activity, /WindowInsets\.Type\.statusBars\(\)/);
  assert.match(activity, /BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/);
  assert.match(activity, /onWindowFocusChanged/);
  assert.match(activity, /WebChromeClient/);
  assert.match(activity, /onProgressChanged/);
  assert.match(activity, /Intent\.ACTION_VIEW/);
  assert.match(packageJson, /android:debug/);
  assert.match(buildScript, /assembleDebug/);
  assert.match(buildScript, /SydneyCourseFinder-debug\.apk/);
});

test("Pages avoid render-blocking third-party font requests", () => {
  const htmlFiles = ["index.html", "guide.html", "pathways.html", "no-atar.html", "atar-calculator.html", "calculator.html", "subject-helper.html", "subjects.html", "my-plan.html", "advisor.html"];
  for (const file of htmlFiles) {
    const html = read(file);
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
    assert.match(html, /asset-refresh-v38\.js/);
    assert.match(html, /theme\.js\?v=38/);
    assert.match(html, /styles\.css\?v=38/);
  }
});

test("Mobile startup only prefetches the five primary destinations", () => {
  const theme = read("theme.js");
  assert.match(theme, /function prefetchVisibleShellLinks[\s\S]*link\.dataset\.mobilePrimary === "true"/);
  assert.match(theme, /mobilePrimaryLabels = \["Courses", "Universities", "Tools", "Saved", "About"\]/);
  assert.doesNotMatch(theme, /fetch\(url\.href, \{ cache: "force-cache"/);
});

test("Mobile navigation uses five direct destinations without an overflow menu", () => {
  const theme = read("theme.js");
  const css = read("styles.css");

  assert.match(theme, /const mobilePrimaryDestinations = \{[\s\S]*Courses: "\.\/#courses"[\s\S]*Universities: "\.\/#providers"[\s\S]*Tools: "\.\/#tools"[\s\S]*Saved: "\.\/#saved"[\s\S]*About: "\.\/#about"/);
  assert.match(theme, /mobilePrimaryItems\.forEach/);
  assert.match(theme, /nav\.appendChild\(link\)/);
  assert.doesNotMatch(theme, /data-action = "toggle-mobile-nav"/);
  assert.doesNotMatch(theme, /Open all pages/);
  assert.match(css, /\.topbar > \.topnav\s*{\s*display:\s*none\s*!important/);
  assert.match(css, /\.mobile-primary-nav\s*{[\s\S]*grid-template-columns:\s*repeat\(5/);
});

test("Homepage leads with search, trust information and a three-course comparison", () => {
  const app = read("app.js");

  assert.match(app, /Find the right Sydney university course/);
  assert.match(app, /Compare entry requirements, pathways, course length, campuses, and study options across Sydney universities/);
  assert.match(app, />Search courses<\/a>/);
  assert.match(app, />Estimate my ATAR<\/a>/);
  assert.match(app, /Lowest selection rank/);
  assert.match(app, /Guaranteed entry rank/);
  assert.match(app, /Prerequisites/);
  assert.match(app, /Assumed knowledge/);
  assert.match(app, /Available pathways/);
  assert.match(app, /Commonwealth supported place status/);
  assert.match(app, /Site data last updated/);
  assert.match(app, /Previous entry results never guarantee a future offer/);
  assert.match(app, /compare up to three courses/i);
  assert.match(app, /You can compare up to three courses/);
});

test("Course comparison is rowed, difference-aware and horizontally safe", () => {
  const app = read("app.js");
  const css = read("styles.css");

  assert.match(app, /Compare courses row by row/);
  assert.match(app, /comparisonRows\(compareCourses\)/);
  assert.match(app, /label: "Degree type"/);
  assert.match(app, /label: "Qualifications included"/);
  assert.match(app, /label: "What the structure means"/);
  assert.match(app, /function courseQualificationComponents/);
  assert.match(app, /courseQualificationComponents\(course\)\.length > 1/);
  assert.match(app, /Double degree · \$\{components\.length\} bachelor's qualifications/);
  assert.match(app, /compare-row-different/);
  assert.match(app, /compare-row-major/);
  assert.match(app, /compare-cell-advantage/);
  assert.match(app, /Only differences/);
  assert.match(app, /Lowest listed rank/);
  assert.match(app, /Shortest course/);
  assert.match(app, /Pathway listed/);
  assert.match(app, /<table class="course-compare-table"/);
  assert.match(css, /\.course-compare-table \.compare-attribute[\s\S]*position:\s*sticky/);
  assert.match(css, /\.course-compare-table td\.compare-cell-different/);
  assert.match(css, /\.course-compare-table \.compare-row-major \.compare-attribute/);
  assert.match(css, /\.saved-course-list\.course-list\.compact[\s\S]*grid-template-columns:\s*1fr/);
  assert.match(css, /overscroll-behavior-inline:\s*contain/);
});

test("Saving and comparing courses remain independent without removal scroll jumps", () => {
  const app = read("app.js");
  const css = read("styles.css");
  const saveToggle = app.match(/function toggleSaved[\s\S]*?(?=\nfunction toggleCompare)/)?.[0] || "";
  const compareToggle = app.match(/function toggleCompare[\s\S]*?(?=\nfunction migrateLegacySavedCompareState)/)?.[0] || "";

  assert.match(app, /Saving and comparing are separate/);
  assert.match(app, /class="library-state-counts"/);
  assert.match(app, /\$\{number\(compareCourses\.length\)\} comparing/);
  assert.doesNotMatch(saveToggle, /compareIds|storageKeys\.compare/);
  assert.doesNotMatch(compareToggle, /savedIds|storageKeys\.saved/);
  assert.match(app, /data-action="clear-saved"[\s\S]*renderPreservingViewport/);
  assert.match(app, /data-remove-compare[\s\S]*renderPreservingViewport/);
  assert.match(css, /\.course-compare-table td em[\s\S]*font-size:\s*11\.5px/);
  assert.match(css, /\.course-result-card\.is-removing/);
});

test("Course search exposes essential filters, collapsed advanced filters and useful empty actions", () => {
  const app = read("app.js");
  const css = read("styles.css");

  for (const label of ["Study area", "Estimated ATAR", "Provider", "Campus", "Course duration", "Mode"]) {
    assert.match(app, new RegExp(`"${label}"`));
  }
  assert.match(app, /<details class="advanced-filter-disclosure"/);
  assert.match(app, /Remove one filter/);
  assert.match(app, /Show courses slightly above my ATAR/);
  assert.match(app, /View pathway courses/);
  assert.match(app, /Browse all study areas/);
  assert.match(app, /Reset all filters/);
  assert.match(app, /querySelectorAll\('\[data-action="close-course-filters"\]'\)/);
  assert.match(css, /html:has\(\.course-filter-panel\.is-open\) \.compare-tray,[\s\S]*visibility:\s*hidden/);
});

test("Android app surface uses a concise mobile-only presentation", () => {
  const theme = read("theme.js");
  const css = read("styles.css");

  assert.match(theme, /sydneyCourseFinder\.appSurface/);
  assert.match(theme, /requestedSurface === "android"/);
  assert.match(theme, /root\.dataset\.appSurface = appSurface/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*:root\[data-app-surface="android"\] \.panel-head p/);
  assert.match(css, /:root\[data-app-surface="android"\] \.subject-how-panel/);
  assert.match(css, /:root\[data-app-surface="android"\] \.linear-stage-item p/);
  assert.match(css, /:root\[data-app-surface="android"\] \.course-search-prompt/);
  assert.match(css, /-webkit-line-clamp: 2/);
});

test("Android app replaces native selects with an app-style option sheet", () => {
  const theme = read("theme.js");
  const css = read("styles.css");

  assert.match(theme, /function enhanceAndroidSelects/);
  assert.match(theme, /function openAppSelectSheet/);
  assert.match(theme, /select\.dispatchEvent\(new Event\("change", \{ bubbles: true \}\)\)/);
  assert.match(theme, /role="listbox"/);
  assert.match(theme, /role="option"/);
  assert.match(css, /\.app-select-overlay\.is-open/);
  assert.match(css, /\.app-select-sheet/);
  assert.match(css, /\.app-select-options button\[aria-selected="true"\]/);
});

test("Course search handles provider acronyms, keywords and spelling mistakes", () => {
  const source = read("app.js");
  const styles = read("styles.css");

  assert.match(source, /function providerSearchIntent/);
  assert.match(source, /tokenise\(b\.alias\)\.length - tokenise\(a\.alias\)\.length/);
  assert.match(source, /function boundedDamerauLevenshtein/);
  assert.match(source, /function correctSearchToken/);
  assert.match(source, /plan\.provider && !courseMatchesProviderGroup/);
  assert.match(source, /if \(course\.providerId\) return course\.providerId === group\.id/);
  assert.match(source, /UTS — University of Technology Sydney/);
  assert.match(source, /value="\$\{escapeHtml\(option\)\}"/);
  assert.match(source, /Searching <strong>/);
  assert.match(source, /engineer:\s*\["engineering"/);
  assert.match(source, /coding:\s*\["coding", "programming", "software"/);
  assert.match(source, /\["cs", "computer science"\]/);
  assert.match(source, /function expandSearchIntentQuery/);
  assert.match(source, /wasExpanded:\s*expansion\.query !== cleanQuery/);
  assert.match(source, /Understood <strong>/);
  assert.match(source, /class="atar-requirement"/);
  assert.match(styles, /\.atar-requirement\s*{[\s\S]*font-weight:\s*950/);
});

test("Course search promotes recognised field strength and updates results in place", () => {
  const source = read("app.js");
  const styles = read("styles.css");

  assert.match(source, /function renderSearchFieldLeaders/);
  assert.match(source, /Course relevance comes first\. Field strength then helps order similar matches\./);
  assert.match(source, /signal\.score \* 520/);
  assert.match(source, /document\.startViewTransition/);
  assert.match(styles, /view-transition-name:\s*course-search-results/);
  assert.match(styles, /\.search-field-leaders/);
  assert.match(styles, /html\.is-course-results-transition::view-transition-old\(root\)/);
  assert.match(styles, /\.app-shell\.is-state-update \.panel/);
});

test("Current UAC import includes the latest expanded course set", () => {
  const source = read("uac-courses-lite.js");
  assert.match(source, /"sydneyCourseVariants":1434/);
  assert.match(source, /Bachelor of Business Analytics and AI Management/);
  assert.match(source, /Bachelor of Game Programming/);
  assert.match(source, /"importedAt":"2026-07-23/);
});

test("Dark mode uses a true black page background with stronger contrast", () => {
  const css = read("styles.css");

  assert.match(css, /:root\[data-theme="dark"\]\s*{[\s\S]*--bg:\s*#000000/);
  assert.match(css, /:root\[data-theme="dark"\]\s*{[\s\S]*--page-top:\s*#000000/);
  assert.match(css, /:root\[data-theme="dark"\]\s*{[\s\S]*--page-bottom:\s*#000000/);
  assert.match(css, /:root\[data-theme="dark"\]\s+body\s*{[\s\S]*background:\s*#000000/);
  const darkBodyBlocks = css.match(/:root\[data-theme="dark"\]\s+body\s*{[^}]*}/g) || [];
  assert.ok(darkBodyBlocks.length >= 1);
  for (const block of darkBodyBlocks) {
    assert.doesNotMatch(block, /linear-gradient\(135deg/);
  }
  const darkVars = css.match(/:root\[data-theme="dark"\]\s*{[\s\S]*?}/)?.[0] || "";
  assert.match(darkVars, /--accent:\s*#2563eb/);
  assert.doesNotMatch(darkVars, /--accent:\s*#60a5fa/);
});

test("Dark mode uses black-and-white primary buttons while keeping blue accents", () => {
  const css = read("styles.css");
  const darkVars = css.match(/:root\[data-theme="dark"\]\s*{[\s\S]*?}/)?.[0] || "";
  const primaryButtonBlock = css.match(/:root\[data-theme="dark"\]\s+\.search-form button,\s*\n:root\[data-theme="dark"\]\s+\.match-btn,[\s\S]*?:root\[data-theme="dark"\]\s+\.help-link\s*{[\s\S]*?}/)?.[0] || "";
  const secondaryButtonBlock = css.match(/:root\[data-theme="dark"\]\s+\.secondary-btn,[\s\S]*?:root\[data-theme="dark"\]\s+\.pathway-hero-actions\s+\.secondary-btn\s*{[\s\S]*?}/)?.[0] || "";
  const routeLinkBlock = css.match(/:root\[data-theme="dark"\]\s+\.simple-route-head a,[\s\S]*?:root\[data-theme="dark"\]\s+\.useful-route-links a\s*{[\s\S]*?}/)?.[0] || "";

  assert.match(darkVars, /--accent:\s*#2563eb/);
  assert.match(primaryButtonBlock, /border-color:\s*#ffffff/);
  assert.match(primaryButtonBlock, /background:\s*#ffffff/);
  assert.match(primaryButtonBlock, /color:\s*#020617/);
  assert.match(secondaryButtonBlock, /background:\s*#000000/);
  assert.match(secondaryButtonBlock, /color:\s*#f8fbff/);
  assert.match(secondaryButtonBlock, /rgba\(255,\s*255,\s*255,\s*0\.42\)/);
  assert.match(routeLinkBlock, /color:\s*#93c5fd/);
  assert.match(routeLinkBlock, /rgba\(37,\s*99,\s*235,\s*0\.1\)/);
});

test("Dark mode keeps headers and active nav chrome white while links stay blue", () => {
  const css = read("styles.css");
  const darkHeaderBlock = css.match(/:root\[data-theme="dark"\]\s+h1,[\s\S]*?:root\[data-theme="dark"\]\s+\.panel-head h3\s*{[\s\S]*?}/)?.[0] || "";
  const topNavBlock = css.match(/:root\[data-theme="dark"\]\s+\.topnav a,\s*\n:root\[data-theme="dark"\]\s+\.topnav button\s*{[\s\S]*?}/)?.[0] || "";
  const activeNavBlock = css.match(/:root\[data-theme="dark"\]\s+\.topnav a\[aria-current="page"\],[\s\S]*?:root\[data-theme="dark"\]\s+\.topnav button\[aria-current="page"\]\s*{[\s\S]*?}/)?.[0] || "";
  const linkBlock = css.match(/:root\[data-theme="dark"\]\s+\.term,[\s\S]*?:root\[data-theme="dark"\]\s+a\s*{[\s\S]*?}/)?.[0] || "";
  const themeToggleBlocks = css.match(/:root\[data-theme="dark"\]\s+\.theme-toggle\s*{[\s\S]*?}/g) || [];

  assert.match(darkHeaderBlock, /color:\s*#ffffff/);
  assert.match(topNavBlock, /color:\s*#ffffff/);
  assert.match(activeNavBlock, /background:\s*#ffffff/);
  assert.match(activeNavBlock, /color:\s*#020617/);
  assert.match(activeNavBlock, /rgba\(255,\s*255,\s*255,\s*0\.72\)/);
  assert.match(linkBlock, /color:\s*#93c5fd/);
  assert.ok(themeToggleBlocks.length >= 1);
  for (const block of themeToggleBlocks) {
    assert.match(block, /color:\s*#ffffff/);
    assert.doesNotMatch(block, /#dbeafe|#1e3a8a/);
  }
});

test("University profiles explain overall and specialised scores", () => {
  const app = read("app.js");
  const css = read("styles.css");

  assert.match(app, /Overall site profile/);
  assert.match(app, /Strongest matched area/);
  assert.match(app, /Overall why:/);
  assert.match(app, /Specialised why:/);
  assert.match(app, /Sydney Course Finder planning scores/);
  assert.match(app, /not official university rankings/i);
  assert.match(app, /providerProfileCache/);
  assert.match(app, /Top 3 by study area/);
  assert.match(app, /Specialised rankings/);
  assert.match(app, /providerCurrentStanding/);
  assert.match(app, /QS 2027: #1 in Australia and #19 globally/);
  assert.match(app, /baseOverall \* 0\.75 \+ currentStanding\.score \* 0\.25/);
  assert.match(css, /\.provider-score-explainer/);
  assert.match(css, /\.provider-specialty-score/);
  assert.match(css, /\.top-provider-block/);
  assert.match(css, /\.provider-current-standing/);
});

test("Dark mode preview is true black without white active-nav blocks or card outlines", () => {
  const css = read("styles.css");
  const finalOverrides = css.slice(css.lastIndexOf("v26 final overrides"));

  assert.match(finalOverrides, /--surface:\s*#000/);
  assert.match(finalOverrides, /--surface-soft:\s*#000/);
  assert.match(finalOverrides, /topnav a\[aria-current="page"\][\s\S]*background:\s*transparent\s*!important/);
  assert.match(finalOverrides, /mobile-primary-nav a\[aria-current="page"\][\s\S]*background:\s*transparent\s*!important/);
  assert.match(finalOverrides, /\.provider-card,[\s\S]*border-color:\s*transparent\s*!important/);
});

test("Guide folded answer deck cards are blue in light mode and white in dark mode", () => {
  const css = read("styles.css");
  const lightDeckCardBlock = css.match(/\.guide-deck-fold i\s*{[\s\S]*?}/)?.[0] || "";
  const darkDeckCardBlock = css.match(/:root\[data-theme="dark"\]\s+\.guide-deck-fold i\s*{[\s\S]*?}/)?.[0] || "";

  assert.match(lightDeckCardBlock, /background:\s*linear-gradient\(135deg,\s*var\(--accent\),\s*var\(--accent-dark\)\)/);
  assert.match(lightDeckCardBlock, /rgba\(29,\s*78,\s*216,\s*0\.18\)/);
  assert.match(darkDeckCardBlock, /background:\s*#ffffff/);
  assert.match(darkDeckCardBlock, /rgba\(255,\s*255,\s*255,\s*0\.74\)/);
});

test("Guide term mark fields match the NSW senior-year calendar", () => {
  const guide = read("guide.js");
  const termBlock = guide.match(/const guideTermFields = \{[\s\S]*?\n\};/)?.[0] || "";

  assert.match(termBlock, /label:\s*"Y11 T1"/);
  assert.match(termBlock, /label:\s*"Y11 T2"/);
  assert.match(termBlock, /label:\s*"Y11 T3"/);
  assert.doesNotMatch(guide, /y11Term4|Y11 T4/);
  assert.doesNotMatch(termBlock, /y11Term4|Y11 T4/);
  assert.match(termBlock, /label:\s*"Y12 T1"/);
  assert.match(termBlock, /label:\s*"Y12 T2"/);
  assert.match(termBlock, /label:\s*"Y12 T3"/);
  assert.match(termBlock, /label:\s*"Y12 T3"\s*}\s*,\s*\{\s*key:\s*"y12Term4",\s*label:\s*"Y12 T4"/);
  assert.match(guide, /function renderGuideTermGrid/);
  assert.match(guide, /guide-term-grid is-grouped is-year12/);
  assert.match(guide, /Year 12 marks/);
});

test("Home hash navigation scrolls smoothly without full-page rerender jitter", () => {
  const source = read("app.js");
  const hashChangeBlock = source.match(/window\.addEventListener\("hashchange"[\s\S]*?\n}\);/)?.[0] || "";

  assert.match(source, /function bindHashNavLinks/);
  assert.match(source, /<a class="brand" href="#courses">/);
  assert.match(source, /querySelectorAll\('a\[href\^="#"\]'\)/);
  assert.match(source, /function navigateToHash/);
  assert.match(source, /scrollToHashTarget\(id,\s*preferredHashScrollBehavior\(\)\)/);
  assert.match(source, /preferredHashScrollBehavior/);
  assert.match(source, /isMobileViewport/);
  assert.match(source, /prefersReducedMotion\(\) \|\| isMobileViewport\(\) \? "auto" : "smooth"/);
  assert.match(source, /history\.scrollRestoration = "manual"/);
  assert.match(source, /window\.scrollTo\(\{\s*[\s\S]*behavior:/);
  assert.doesNotMatch(source, /settleHashScroll/);
  assert.match(hashChangeBlock, /updateHashNavCurrent\(\)/);
  assert.match(hashChangeBlock, /scheduleHashScroll\(preferredHashScrollBehavior\(\)\)/);
  assert.doesNotMatch(hashChangeBlock, /render\(\)/);
});

test("ATAR controls keep the range and provider filters aligned", () => {
  const css = read("styles.css");
  const atarInputsBlock = css.match(/\.atar-inputs\s*{[\s\S]*?}/)?.[0] || "";
  const desktopAtarBlock = css.match(/@media\s*\(min-width:\s*980px\)\s*{[\s\S]*?\.atar-controls\s*{[\s\S]*?}[\s\S]*?#atar\s+\.atar-controls > \.match-btn\s*{[\s\S]*?}[\s\S]*?}/)?.[0] || "";

  assert.match(atarInputsBlock, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(96px,\s*112px\)/);
  assert.match(atarInputsBlock, /min-width:\s*0/);
  assert.match(css, /input\[type="range"\]\s*{[\s\S]*min-width:\s*0/);
  assert.match(desktopAtarBlock, /minmax\(320px,\s*1\.2fr\)/);
  assert.match(desktopAtarBlock, /#atar\s+\.atar-controls > label:last-of-type\s*{[\s\S]*grid-column:\s*1 \/ span 3/);
  assert.match(desktopAtarBlock, /#atar\s+\.atar-controls > \.match-btn\s*{[\s\S]*grid-column:\s*4/);
});

test("ATAR calculator adds smart planning beyond a basic UAC-style estimate", () => {
  const source = read("atar-calculator.js");
  const css = read("styles.css");

  assert.match(source, /renderAtarSmartPlanner/);
  assert.match(source, /Next target/);
  assert.match(source, /Best move/);
  assert.match(source, /Readiness check/);
  assert.match(source, /What-if boost/);
  assert.match(source, /buildWhatIfScenarios/);
  assert.match(source, /aggregateForAtar/);
  assert.match(css, /\.atar-smart-planner/);
  assert.match(css, /\.atar-what-if-strip/);
});

test("Stats notes align as full-width cards inside hero stats", () => {
  const css = read("styles.css");
  const statsNoteBlock = css.match(/\.stats\s+\.data-note\s*{[\s\S]*?}/)?.[0] || "";

  assert.match(statsNoteBlock, /margin:\s*0/);
  assert.match(statsNoteBlock, /padding:\s*12px 14px/);
  assert.match(statsNoteBlock, /background:\s*var\(--surface\)/);
});

test("Site polish defines softer radius, shadows and easing tokens", () => {
  const css = read("styles.css");
  const rootVars = css.match(/:root\s*{[\s\S]*?}/)?.[0] || "";
  const darkVars = css.match(/:root\[data-theme="dark"\]\s*{[\s\S]*?}/)?.[0] || "";

  assert.match(rootVars, /--radius:\s*12px/);
  assert.match(rootVars, /--radius-lg:\s*18px/);
  assert.match(rootVars, /--radius-xl:\s*24px/);
  assert.match(rootVars, /--shadow-soft:\s*0 18px 42px/);
  assert.match(rootVars, /--shadow-lift:\s*0 22px 54px/);
  assert.match(rootVars, /--ease:\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\)/);
  assert.match(darkVars, /--shadow-soft:\s*0 18px 42px/);
  assert.match(darkVars, /--shadow-lift:\s*0 24px 58px/);
});

test("Site polish adds aligned surfaces and smooth staggered motion without refresh jitter", () => {
  const css = read("styles.css");
  const polishBlock = css.match(/\/\* Site-wide alignment, softness and motion polish\. \*\/[\s\S]*?@media\s*\(min-width:\s*980px\)/)?.[0] || "";

  assert.match(css, /@keyframes surfaceFloatIn/);
  assert.match(css, /@keyframes softPulseIn/);
  assert.match(polishBlock, /border-radius:\s*var\(--radius-lg\)/);
  assert.match(polishBlock, /animation:\s*surfaceFloatIn 360ms var\(--ease\) both/);
  assert.match(css, /html\.ui-ready\s+:where\(/);
  assert.match(css, /html\.ui-ready[\s\S]*animation:\s*none/);
  assert.match(polishBlock, /align-items:\s*flex-start/);
  assert.match(polishBlock, /display:\s*inline-flex/);
  assert.match(polishBlock, /box-shadow:\s*var\(--shadow-lift\)/);
  assert.match(polishBlock, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("Light mode uses a true white background with darker text and blue", () => {
  const css = read("styles.css");
  const lightVars = css.match(/:root\s*{[\s\S]*?}/)?.[0] || "";
  const bodyBlock = css.match(/^body\s*{[\s\S]*?}/m)?.[0] || "";

  assert.match(lightVars, /--bg:\s*#ffffff/);
  assert.match(lightVars, /--page-top:\s*#ffffff/);
  assert.match(lightVars, /--page-bottom:\s*#ffffff/);
  assert.match(lightVars, /--text:\s*#020617/);
  assert.match(lightVars, /--muted:\s*#263548/);
  assert.match(lightVars, /--accent:\s*#1d4ed8/);
  assert.match(lightVars, /--accent-dark:\s*#1e3a8a/);
  assert.match(bodyBlock, /background:\s*#ffffff/);
  assert.doesNotMatch(bodyBlock, /linear-gradient/);
});

test("Pathways hero and route cards expose clear pathway info without mojibake", () => {
  const source = read("pathways.js");
  const logic = read("pathways-logic.js");

  assert.doesNotMatch(source + logic, /â/);
  assert.match(source, /renderSimpleRouteCard/);
  assert.match(source, /Important details/);
  assert.match(source, /Requirements to check/);
  assert.match(source, /Pathway to university/);
  assert.match(source, /route\.details/);
  assert.match(source, /route\.requirements/);
  assert.match(source, /route\.universityPathway/);
  assert.match(logic, /details:/);
  assert.match(logic, /requirements:/);
  assert.match(logic, /universityPathway:/);
});

test("Pathways hero does not render a duplicate best-start provider card", () => {
  const source = read("pathways.js");

  assert.match(source, /hasMeaningfulPathwayInput/);
  assert.match(source, /displayedPathwayRoutes/);
  assert.match(source, /route\.id !== "wsu-college"/);
  assert.match(source, /primaryPathwayRoute\(result\)/);
  assert.doesNotMatch(source, /renderBestStartCard/);
  assert.doesNotMatch(source, /Your current best start/);
  assert.doesNotMatch(source, /pathway-hero-card/);
});

test("Pathways hero buttons use one app-style CTA system", () => {
  const css = read("styles.css");
  const actionBlock = css.match(/\.pathway-hero-actions\s*{[\s\S]*?}/)?.[0] || "";
  const buttonBlock = css.match(/\.pathway-hero-actions\s+\.match-btn,\s*\n\.pathway-hero-actions\s+\.secondary-btn\s*{[\s\S]*?}/)?.[0] || "";
  const mobileBlock = css.match(/@media\s*\(max-width:\s*760px\)\s*{[\s\S]*?\.pathway-hero-actions\s*{[\s\S]*?}[\s\S]*?\.pathway-hero-actions\s+\.match-btn,\s*\n\s*\.pathway-hero-actions\s+\.secondary-btn\s*{[\s\S]*?}[\s\S]*?}/)?.[0] || "";

  assert.match(actionBlock, /gap:\s*10px/);
  assert.match(buttonBlock, /min-height:\s*46px/);
  assert.match(buttonBlock, /border-radius:\s*10px/);
  assert.match(buttonBlock, /padding:\s*0 18px/);
  assert.match(buttonBlock, /font-weight:\s*900/);
  assert.match(mobileBlock, /flex-direction:\s*column/);
  assert.match(mobileBlock, /width:\s*100%/);
});

test("Pathways does not silently turn a saved Guide plan into default pathway input", () => {
  const source = read("pathways.js");
  const initialGoalBlock = source.match(/function initialPathwayGoal\(\)\s*{[\s\S]*?\n}/)?.[0] || "";

  assert.match(source, /loadPathwaySnapshot/);
  assert.match(initialGoalBlock, /URLSearchParams/);
  assert.doesNotMatch(initialGoalBlock, /loadPathwaySnapshot/);
  assert.doesNotMatch(initialGoalBlock, /goalLabel/);
});

test("Page and result transitions use smooth non-refresh animations", () => {
  const css = read("styles.css");
  const theme = read("theme.js");
  const pathways = read("pathways.js");
  const subjectHelper = read("subject-helper.js");
  const scopedMotion = css.match(/\/\* v38 scoped motion:[\s\S]*$/)?.[0] || "";

  assert.match(scopedMotion, /main,\s*\n\.hero,\s*\n\.panel[\s\S]*animation:\s*none !important/);
  assert.match(scopedMotion, /@view-transition\s*{\s*\n\s*navigation:\s*auto/);
  assert.match(scopedMotion, /view-transition-name:\s*app-page-content/);
  assert.match(scopedMotion, /view-transition-name:\s*subject-helper-results/);
  assert.match(scopedMotion, /view-transition-name:\s*pathway-routes/);
  assert.match(scopedMotion, /view-transition-name:\s*pathway-providers/);
  assert.match(scopedMotion, /::view-transition-old\(root\)[\s\S]*animation:\s*none/);
  assert.match(css, /\.topnav a\.is-nav-pressed/);
  assert.match(theme, /prefetchAppShell/);
  assert.match(theme, /prefetchVisibleShellLinks\(document\)/);
  assert.match(theme, /beginFastPageTransition/);
  assert.match(theme, /markUiReady/);
  assert.match(theme, /is-nav-pressed/);
  assert.match(theme, /is-route-pending/);
  assert.doesNotMatch(css, /html\.is-fast-page-leaving\s+main/);
  assert.doesNotMatch(theme, /navTransitionKey/);
  assert.doesNotMatch(theme, /window\.location\.reload/);
  assert.match(pathways, /refreshPathwaysPage/);
  assert.match(pathways, /document\.startViewTransition/);
  assert.match(pathways, /is-pathway-results-transition/);
  assert.doesNotMatch(pathways, /is-refreshing-results/);
  assert.match(subjectHelper, /is-subject-results-transition/);
});

test("Pathways result refresh does not restart opacity-zero card animations", () => {
  const css = read("styles.css");
  const routeCardBlock = css.match(/\.simple-route-card\s*{[\s\S]*?}/)?.[0] || "";

  assert.match(css, /\.simple-pathways-page\s+\.panel\s*{[\s\S]*animation:\s*none/);
  assert.doesNotMatch(routeCardBlock, /animation:\s*fadeUp/);
  assert.match(css, /#pathways-app\.is-results-updating\s+\.simple-route-list[\s\S]*view-transition-name:\s*pathway-routes/);
  assert.match(css, /#pathways-app\.is-state-update\s+\.pathway-provider-card[\s\S]*animation:\s*none/);
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
