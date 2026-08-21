const universityFormsApp = document.querySelector("#university-forms-app");
const formsCatalogue = window.universityFormsCatalogue || { meta: {}, categories: [], providers: [] };
const profileStorageKey = "sydneyCourseFinder.formProfile";

const formsState = {
  query: "",
  category: "All forms",
  access: "all",
  selectedProviderId: "",
  editor: null
};

const profileFields = [
  { key: "fullName", label: "Full name", placeholder: "As shown on your ID" },
  { key: "familyName", label: "Family name", placeholder: "Surname" },
  { key: "givenNames", label: "Given name(s)", placeholder: "All given names" },
  { key: "studentId", label: "Student number", placeholder: "University student ID" },
  { key: "uacReference", label: "UAC reference number", placeholder: "Your UAC application number" },
  { key: "email", label: "Email", placeholder: "Student or personal email" },
  { key: "phone", label: "Phone", placeholder: "Mobile number" },
  { key: "dob", label: "Date of birth", placeholder: "DD/MM/YYYY" },
  { key: "address", label: "Address", placeholder: "Current postal address" },
  { key: "course", label: "Course or program", placeholder: "Your current course" },
  { key: "courseCode", label: "Course code", placeholder: "University course code" },
  { key: "date", label: "Date", placeholder: "DD/MM/YYYY" }
];

const questionnaireProfileKeys = ["fullName", "dob", "email", "uacReference"];

renderFormsPage();

function renderFormsPage() {
  const fillableCount = formsCatalogue.providers.reduce((count, provider) =>
    count + provider.forms.filter((form) => form.editable).length, 0);
  const directoryCount = formsCatalogue.providers.filter((provider) => provider.access !== "limited").length;

  universityFormsApp.innerHTML = `
    ${renderFormsTopbar()}
    <main class="university-forms-page">
      <section class="hero university-forms-hero">
        <div>
          <p class="eyebrow">Official student documents</p>
          <h1>Find, fill and download the right university form</h1>
          <p>Search the provider first, choose the exact official form, then complete supported PDFs privately in your browser. Portal-only requests open on the university's own website.</p>
          <div class="forms-hero-actions">
            <a class="match-btn" href="#form-finder">Find a form</a>
            <a class="secondary-btn" href="#how-it-works">How privacy works</a>
          </div>
        </div>
        <dl class="forms-hero-stats" aria-label="University form catalogue coverage">
          <div><dt>Providers checked</dt><dd>${number(formsCatalogue.providers.length)}</dd></div>
          <div><dt>Fillable documents</dt><dd>${number(fillableCount)}</dd></div>
          <div><dt>Public directories</dt><dd>${number(directoryCount)}</dd></div>
          <p>Official sources checked ${formatDate(formsCatalogue.meta.checkedAt)}.</p>
        </dl>
      </section>

      <section class="forms-privacy-strip" id="how-it-works">
        <span class="forms-privacy-icon" aria-hidden="true">✓</span>
        <div><strong>Your details stay on this device</strong><p>The editor sends only the selected form ID to this site. Your name, student number and answers are added locally in your browser.</p></div>
        <span class="forms-privacy-state">Private by default</span>
      </section>

      <section class="panel forms-finder-panel" id="form-finder">
        <div class="panel-head">
          <div>
            <h2>University form finder</h2>
            <p>Search a university, abbreviation or form name. Small spelling mistakes are handled.</p>
          </div>
          <span data-forms-result-count>${number(formsCatalogue.providers.length)} providers</span>
        </div>
        <div class="forms-filter-grid">
          <label class="forms-search-field">
            <span>University or form</span>
            <span class="forms-search-control">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
              <input type="search" name="forms-query" autocomplete="off" placeholder="Try UTS, UNSW, refund or change of details" />
            </span>
          </label>
          <label>
            <span>Form category</span>
            <select name="forms-category">
              ${formsCatalogue.categories.map((category) => `<option>${escapeHtml(category)}</option>`).join("")}
            </select>
          </label>
          <label>
            <span>Access type</span>
            <select name="forms-access">
              <option value="all">PDFs and online forms</option>
              <option value="pdf">All official PDFs</option>
              <option value="editable">Editable in this tool</option>
              <option value="online">Online or portal forms</option>
            </select>
          </label>
        </div>
        <div class="forms-active-summary" aria-live="polite" data-forms-summary>Showing every checked provider.</div>
        <div class="forms-provider-grid" data-forms-provider-grid></div>
      </section>

      <section class="panel forms-provider-detail" data-forms-provider-detail hidden></section>

      <section class="panel forms-method-panel">
        <div class="panel-head">
          <div><h2>What this tool can safely do</h2><p>It never guesses whether a university still accepts an old document.</p></div>
        </div>
        <div class="forms-method-grid">
          <article><span>1</span><strong>Find the official source</strong><p>Every provider links back to its university directory or student portal.</p></article>
          <article><span>2</span><strong>See changes while you type</strong><p>Interactive fields, supported flat PDFs and structured questionnaires update their document preview live.</p></article>
          <article><span>3</span><strong>Download a completed copy</strong><p>Your final PDF is created locally. Signatures and certified evidence must still follow the university's rules.</p></article>
        </div>
        <p class="forms-source-note">${escapeHtml(formsCatalogue.meta.disclaimer || "")}</p>
      </section>
    </main>
    <div id="forms-editor-root"></div>
  `;

  bindFormsPage();
  renderProviderDirectory();
  window.courseFinderTheme?.bind?.(universityFormsApp);
}

function renderFormsTopbar() {
  return `
    <header class="topbar">
      <a class="brand" href="./#courses">
        <img class="site-logo" src="${window.courseFinderTheme?.logoSrc?.() || "./assets/logo-light.svg"}" alt="Sydney Course Finder logo" />
        <span>Sydney Course Finder</span>
      </a>
      <nav class="topnav" aria-label="Main">
        <a href="./#courses">Courses</a>
        <a href="./#providers">Universities</a>
        <a href="./#tools" aria-current="page">Tools</a>
        <a href="./#saved">Saved</a>
        <a href="./#about">About</a>
      </nav>
      <div class="topbar-actions">${window.courseFinderTheme?.buttonMarkup?.() || ""}</div>
    </header>
  `;
}

function bindFormsPage() {
  const query = universityFormsApp.querySelector('[name="forms-query"]');
  const category = universityFormsApp.querySelector('[name="forms-category"]');
  const access = universityFormsApp.querySelector('[name="forms-access"]');

  query?.addEventListener("input", () => {
    formsState.query = query.value;
    renderProviderDirectory();
  });
  category?.addEventListener("change", () => {
    formsState.category = category.value;
    renderProviderDirectory();
  });
  access?.addEventListener("change", () => {
    formsState.access = access.value;
    renderProviderDirectory();
  });

  universityFormsApp.addEventListener("click", (event) => {
    const providerButton = event.target.closest("[data-provider-id]");
    if (providerButton) {
      selectFormsProvider(providerButton.dataset.providerId);
      return;
    }
    const editButton = event.target.closest("[data-edit-form]");
    if (editButton) openFormEditor(editButton.dataset.editForm);
  });
}

function renderProviderDirectory() {
  const grid = universityFormsApp.querySelector("[data-forms-provider-grid]");
  if (!grid) return;
  const ranked = filteredProviders();
  const count = universityFormsApp.querySelector("[data-forms-result-count]");
  const summary = universityFormsApp.querySelector("[data-forms-summary]");
  if (count) count.textContent = `${number(ranked.length)} provider${ranked.length === 1 ? "" : "s"}`;
  if (summary) summary.textContent = directorySummary(ranked.length);

  grid.innerHTML = ranked.length
    ? ranked.map(({ provider }) => renderProviderCard(provider)).join("")
    : renderFormsEmptyState();
  bindProviderLogoFallbacks(grid);

  if (formsState.selectedProviderId && !ranked.some(({ provider }) => provider.id === formsState.selectedProviderId)) {
    formsState.selectedProviderId = "";
    const detail = universityFormsApp.querySelector("[data-forms-provider-detail]");
    if (detail) detail.hidden = true;
  }
}

function filteredProviders() {
  const hasQuery = Boolean(formsState.query.trim());
  return formsCatalogue.providers
    .map((provider, index) => ({ provider, score: providerSearchScore(provider, formsState.query), index }))
    .filter(({ provider, score }) => {
      if (formsState.query.trim() && score <= 0) return false;
      if (formsState.category !== "All forms" && !provider.forms.some((form) => form.category === formsState.category)) return false;
      if (formsState.access === "pdf" && !provider.forms.some((form) => isPdfForm(form))) return false;
      if (formsState.access === "editable" && !provider.forms.some((form) => form.editable)) return false;
      if (formsState.access === "online" && !provider.forms.some((form) => form.format === "online")) return false;
      return true;
    })
    .sort((a, b) => hasQuery
      ? b.score - a.score || accessPriority(a.provider) - accessPriority(b.provider) || a.index - b.index
      : a.index - b.index);
}

function renderProviderCard(provider) {
  const pdfCount = provider.forms.filter((form) => isPdfForm(form)).length;
  const editableCount = provider.forms.filter((form) => form.editable).length;
  const onlineCount = provider.forms.filter((form) => form.format === "online").length;
  const selected = formsState.selectedProviderId === provider.id;
  return `
    <button class="forms-provider-card${selected ? " is-selected" : ""}" type="button" data-provider-id="${escapeAttribute(provider.id)}" aria-pressed="${selected}">
      ${renderProviderMark(provider)}
      <span class="forms-provider-copy">
        <strong>${escapeHtml(provider.name)}</strong>
        <small>${escapeHtml(accessLabel(provider.access))}</small>
      </span>
      <span class="forms-provider-counts">
        ${pdfCount ? `<i>${pdfCount} PDF${pdfCount === 1 ? "" : "s"}</i>` : ""}
        ${editableCount ? `<i>${editableCount} fill here</i>` : ""}
        ${onlineCount ? `<i>${onlineCount} online</i>` : ""}
        ${!pdfCount && !onlineCount ? "<i>Source only</i>" : ""}
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  `;
}

function renderFormsEmptyState() {
  return `
    <div class="forms-empty-state">
      <strong>No verified match yet</strong>
      <p>Try the full university name, remove one filter, or search a broader form term such as refund, enrolment or details.</p>
      <button class="secondary-btn" type="button" data-action="reset-forms-search">Reset form search</button>
    </div>
  `;
}

function selectFormsProvider(providerId) {
  const provider = formsCatalogue.providers.find((item) => item.id === providerId);
  const detail = universityFormsApp.querySelector("[data-forms-provider-detail]");
  if (!provider || !detail) return;
  formsState.selectedProviderId = providerId;
  universityFormsApp.querySelectorAll("[data-provider-id]").forEach((button) => {
    const selected = button.dataset.providerId === providerId;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  detail.hidden = false;
  detail.innerHTML = renderProviderDetail(provider);
  bindProviderLogoFallbacks(detail);
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const isCompactSurface = document.documentElement.dataset.appSurface === "android"
    || window.matchMedia?.("(max-width: 820px)")?.matches;
  const isLongJump = Math.abs(detail.getBoundingClientRect().top) > window.innerHeight * 1.5;
  const revealDetail = () => {
    const stickyOffset = isCompactSurface
      ? (document.querySelector(".topbar")?.getBoundingClientRect().height || 0)
        + (document.querySelector(".tool-context-bar")?.getBoundingClientRect().height || 0)
        + 10
      : 0;
    const top = Math.max(0, detail.getBoundingClientRect().top + window.scrollY - stickyOffset);
    if (prefersReducedMotion || isCompactSurface || isLongJump) {
      const previousScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, top);
      window.requestAnimationFrame(() => {
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
      });
      return;
    }
    window.scrollTo({ top, behavior: "smooth" });
  };
  if (isCompactSurface) {
    revealDetail();
    return;
  }
  window.requestAnimationFrame(() => window.requestAnimationFrame(revealDetail));
}

function renderProviderDetail(provider) {
  const forms = provider.forms.filter((form) => {
    if (formsState.category !== "All forms" && form.category !== formsState.category) return false;
    if (formsState.access === "pdf" && !isPdfForm(form)) return false;
    if (formsState.access === "editable" && !form.editable) return false;
    if (formsState.access === "online" && form.format !== "online") return false;
    if (!formsState.query.trim()) return true;
    return fuzzyTextMatch([form.title, form.category, form.description].join(" "), formsState.query)
      || fuzzyTextMatch([provider.name, provider.code, ...provider.aliases].join(" "), formsState.query);
  });
  return `
    <div class="forms-provider-detail-head">
      <div class="forms-provider-detail-identity">
        ${renderProviderMark(provider, true)}
        <div>
          <p class="eyebrow">${escapeHtml(provider.code)} official source</p>
          <h2>${escapeHtml(provider.name)}</h2>
          <p>${escapeHtml(provider.note)}</p>
        </div>
      </div>
      <div class="forms-provider-detail-actions">
        <span class="forms-access-badge ${escapeAttribute(provider.access)}">${escapeHtml(accessLabel(provider.access))}</span>
        <a class="secondary-btn" href="${escapeAttribute(provider.hubUrl)}" target="_blank" rel="noreferrer">Browse all official forms ↗</a>
      </div>
    </div>
    <div class="forms-source-verified">
      <span aria-hidden="true">✓</span>
      <p><strong>Official provider source</strong> Checked ${formatDate(provider.checkedAt)}. A university portal may require your student login.</p>
    </div>
    <div class="forms-document-list">
      ${forms.length ? forms.map((form) => renderFormRow(provider, form)).join("") : renderNoProviderForms(provider)}
    </div>
  `;
}

function renderFormRow(provider, form) {
  const isPdf = isPdfForm(form);
  const canEdit = Boolean(form.editable);
  const isQuestionnaire = form.format === "questionnaire";
  const primaryLabel = isQuestionnaire ? "Fill questionnaire" : "Fill PDF";
  const sourceLabel = isQuestionnaire ? "Open original template" : isPdf ? (canEdit ? "Open original" : "Open PDF") : "Start application";
  return `
    <article class="forms-document-row">
      <div class="forms-document-icon ${isQuestionnaire ? "is-questionnaire" : isPdf ? "is-pdf" : "is-online"}" aria-hidden="true">
        ${isQuestionnaire ? "FORM" : isPdf ? "PDF" : "WEB"}
      </div>
      <div class="forms-document-copy">
        <span>${escapeHtml(form.category)}</span>
        <h3>${escapeHtml(form.title)}</h3>
        <p>${escapeHtml(form.description)}</p>
        ${form.status ? `<small class="forms-status"><strong>Status:</strong> ${escapeHtml(form.status)}</small>` : ""}
        ${form.requirements ? `<small><strong>Have ready:</strong> ${escapeHtml(form.requirements)}</small>` : ""}
        ${form.submit ? `<small><strong>Submit:</strong> ${escapeHtml(form.submit)}</small>` : ""}
        ${form.caution ? `<small class="forms-caution"><strong>Check first:</strong> ${escapeHtml(form.caution)}</small>` : ""}
        ${form.editorNote ? `<small class="forms-editor-note"><strong>Editing:</strong> ${escapeHtml(form.editorNote)}</small>` : ""}
      </div>
      <div class="forms-document-actions">
        ${canEdit ? `<button class="match-btn" type="button" data-edit-form="${escapeAttribute(form.id)}">${primaryLabel}</button>` : `<a class="match-btn" href="${escapeAttribute(form.url)}" target="_blank" rel="noreferrer">${sourceLabel} ↗</a>`}
        ${canEdit ? `<a class="secondary-btn" href="${escapeAttribute(form.url)}" target="_blank" rel="noreferrer">${sourceLabel} ↗</a>` : ""}
        ${form.infoUrl ? `<a class="secondary-btn" href="${escapeAttribute(form.infoUrl)}" target="_blank" rel="noreferrer">Official instructions ↗</a>` : ""}
      </div>
    </article>
  `;
}

function renderProviderMark(provider, large = false) {
  const hasLogo = Boolean(provider.logo);
  return `
    <span class="forms-provider-mark${large ? " is-large" : ""}${hasLogo ? "" : " is-fallback"}" aria-hidden="true">
      ${hasLogo ? `<img src="${escapeAttribute(provider.logo)}" alt="" loading="lazy" decoding="async" data-provider-logo />` : ""}
      <span class="forms-provider-monogram">${escapeHtml(provider.code.slice(0, 5))}</span>
    </span>
  `;
}

function bindProviderLogoFallbacks(root) {
  root?.querySelectorAll?.("[data-provider-logo]").forEach((image) => {
    const mark = image.closest(".forms-provider-mark");
    if (image.complete && !image.naturalWidth) mark?.classList.add("is-fallback");
    image.addEventListener("error", () => mark?.classList.add("is-fallback"), { once: true });
  });
}

function openFormEditor(formId) {
  const located = locateForm(formId);
  if (!located) return;
  if (located.form.format === "questionnaire") openQuestionnaireEditor(located);
  else if (located.form.format === "pdf") openPdfEditor(formId);
}

function renderNoProviderForms(provider) {
  return `
    <div class="forms-no-public-documents">
      <strong>No stable public PDF was verified</strong>
      <p>${escapeHtml(provider.note)} The official source button is safer than presenting an old or guessed document.</p>
      <a class="match-btn" href="${escapeAttribute(provider.hubUrl || provider.website)}" target="_blank" rel="noreferrer">Open official provider site ↗</a>
    </div>
  `;
}

function openQuestionnaireEditor(located) {
  formsState.editor = {
    ...located,
    kind: "questionnaire",
    status: "ready",
    profile: loadFormProfile(),
    remember: Boolean(loadRememberedProfile()),
    answers: Object.fromEntries((located.form.questions || []).map((question) => [question.id, ""]))
  };
  renderEditor();
  document.documentElement.classList.add("forms-editor-open");
}

async function openPdfEditor(formId) {
  const located = locateForm(formId);
  if (!located || located.form.format !== "pdf") return;
  formsState.editor = {
    ...located,
    kind: "pdf",
    status: "loading",
    error: "",
    originalBytes: null,
    pdfjs: null,
    pdfJsDocument: null,
    pdfFields: [],
    fieldValues: {},
    pageNumber: 1,
    pageCount: 0,
    viewport: null,
    placements: (located.form.autoPlacements || []).map((placement) => ({ ...placement, auto: true })),
    placementKey: "",
    profile: loadFormProfile(),
    remember: Boolean(loadRememberedProfile()),
    previewTimer: 0,
    previewRevision: 0,
    renderTask: null
  };
  renderEditor();
  document.documentElement.classList.add("forms-editor-open");
  try {
    const response = await fetch(`./api/form-proxy?id=${encodeURIComponent(formId)}`, { cache: "no-store" });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Could not load the PDF (${response.status})`);
    }
    const originalBytes = new Uint8Array(await response.arrayBuffer());
    const pdfDoc = await window.PDFLib.PDFDocument.load(originalBytes.slice(), { ignoreEncryption: true });
    const fields = describePdfFields(pdfDoc.getForm());
    const pdfjs = await import("./vendor/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "./vendor/pdf.worker.min.mjs";
    const pdfJsDocument = await pdfjs.getDocument({ data: originalBytes.slice(), verbosity: 0 }).promise;
    formsState.editor = {
      ...formsState.editor,
      status: "ready",
      originalBytes,
      pdfjs,
      pdfJsDocument,
      pdfFields: fields,
      fieldValues: Object.fromEntries(fields.map((field) => [field.name, field.value || ""])),
      pageCount: pdfJsDocument.numPages
    };
    renderEditor();
    fillMatchingFields(false);
    await renderEditorPage();
  } catch (error) {
    if (!formsState.editor || formsState.editor.form.id !== formId) return;
    formsState.editor.status = "error";
    formsState.editor.error = String(error?.message || "The official PDF could not be opened.");
    renderEditor();
  }
}

function renderEditor() {
  const root = document.querySelector("#forms-editor-root");
  const editor = formsState.editor;
  if (!root) return;
  if (!editor) {
    root.innerHTML = "";
    document.documentElement.classList.remove("forms-editor-open");
    return;
  }
  root.innerHTML = `
    <div class="forms-editor-backdrop" data-close-editor></div>
    <section class="forms-editor" role="dialog" aria-modal="true" aria-labelledby="forms-editor-title">
      <header class="forms-editor-header">
        <div>
          <p>${escapeHtml(editor.provider.name)} · ${editor.kind === "questionnaire" ? "Official questionnaire workspace" : "Official PDF"}</p>
          <h2 id="forms-editor-title">${escapeHtml(editor.form.title)}</h2>
        </div>
        <div>
          <a class="secondary-btn" href="${escapeAttribute(editor.form.infoUrl || editor.form.url)}" target="_blank" rel="noreferrer">Official source ↗</a>
          <button class="forms-editor-close" type="button" data-close-editor aria-label="Close form editor">×</button>
        </div>
      </header>
      ${renderEditorBody(editor)}
    </section>
  `;
  bindEditorEvents();
}

function renderEditorBody(editor) {
  if (editor.status === "loading") {
    return `<div class="forms-editor-status"><span class="forms-loading-spinner" aria-hidden="true"></span><strong>Loading the official PDF</strong><p>Checking the document and detecting editable fields…</p></div>`;
  }
  if (editor.status === "error") {
    return `
      <div class="forms-editor-status is-error">
        <strong>The in-browser editor could not load this PDF</strong>
        <p>${escapeHtml(editor.error)}</p>
        <div><button class="match-btn" type="button" data-retry-editor>Try again</button><a class="secondary-btn" href="${escapeAttribute(editor.form.url)}" target="_blank" rel="noreferrer">Open official PDF ↗</a></div>
      </div>
    `;
  }
  if (editor.kind === "questionnaire") return renderQuestionnaireEditor(editor);
  return `
    <div class="forms-editor-layout">
      <aside class="forms-editor-sidebar">
        <div class="forms-editor-sidebar-head">
          <p class="eyebrow">Reusable details</p>
          <h3>Enter once, then fill</h3>
          <p>Only save these details on a private device.</p>
        </div>
        <div class="forms-profile-grid">
          ${profileFields.map((field) => `
            <label><span>${escapeHtml(field.label)}</span><input data-profile-field="${escapeAttribute(field.key)}" value="${escapeAttribute(editor.profile[field.key] || "")}" placeholder="${escapeAttribute(field.placeholder)}" /></label>
          `).join("")}
        </div>
        <label class="forms-remember-row"><input type="checkbox" data-remember-profile ${editor.remember ? "checked" : ""} /><span>Remember on this device</span></label>
        ${editor.pdfFields.length ? renderDetectedFields(editor) : renderPlacementTools(editor)}
        <div class="forms-editor-warning"><strong>Before submitting</strong><p>Check every answer against the original instructions. Typed text here is not automatically a legally valid signature, witness or certified document.</p></div>
      </aside>
      <div class="forms-pdf-stage">
        <div class="forms-pdf-toolbar">
          <div class="forms-page-controls">
            <button type="button" data-page-step="-1" ${editor.pageNumber <= 1 ? "disabled" : ""} aria-label="Previous PDF page">←</button>
            <span>Page <strong>${editor.pageNumber}</strong> of ${editor.pageCount}</span>
            <button type="button" data-page-step="1" ${editor.pageNumber >= editor.pageCount ? "disabled" : ""} aria-label="Next PDF page">→</button>
          </div>
          <div class="forms-pdf-actions">
            ${editor.pdfFields.length ? `<button class="secondary-btn" type="button" data-auto-fill>Fill matching fields</button>` : ""}
            <button class="match-btn" type="button" data-download-pdf>Download completed PDF</button>
          </div>
        </div>
        <div class="forms-pdf-canvas-shell${editor.placementKey ? " is-placing" : ""}" data-pdf-canvas-shell>
          <canvas data-pdf-canvas aria-label="PDF page ${editor.pageNumber}"></canvas>
          <div class="forms-pdf-placement-layer" data-placement-layer></div>
        </div>
        <p class="forms-pdf-help">${editor.pdfFields.length
          ? `${editor.pdfFields.length} interactive field${editor.pdfFields.length === 1 ? "" : "s"} detected. The downloaded copy stays editable.`
          : editor.placementKey
            ? `Click the exact position on page ${editor.pageNumber} to place ${profileLabel(editor.placementKey)}.`
            : "This is a flat PDF. Choose a detail on the left, then click where it should appear on the page."}</p>
      </div>
    </div>
  `;
}

function renderQuestionnaireEditor(editor) {
  const fields = profileFields.filter((field) => questionnaireProfileKeys.includes(field.key));
  const questions = editor.form.questions || [];
  return `
    <div class="forms-questionnaire-layout">
      <aside class="forms-questionnaire-sidebar">
        <div class="forms-editor-sidebar-head">
          <p class="eyebrow">Official UTS questions</p>
          <h3>Write here, preview instantly</h3>
          <p>Your answers stay in this browser and are only added to the PDF you download.</p>
        </div>
        <div class="forms-questionnaire-status">
          <strong>${escapeHtml(editor.form.status || "Check the official deadline")}</strong>
          <span>Verify eligibility before relying on this route.</span>
        </div>
        <div class="forms-questionnaire-profile">
          ${fields.map((field) => `
            <label>
              <span>${escapeHtml(field.label)}</span>
              <input data-questionnaire-profile="${escapeAttribute(field.key)}" value="${escapeAttribute(editor.profile[field.key] || "")}" placeholder="${escapeAttribute(field.placeholder)}" />
            </label>
          `).join("")}
        </div>
        <label class="forms-remember-row"><input type="checkbox" data-remember-profile ${editor.remember ? "checked" : ""} /><span>Remember personal details on this device</span></label>
        <div class="forms-questionnaire-questions">
          ${questions.map((question) => {
            const count = countWords(editor.answers[question.id]);
            return `
              <label class="forms-questionnaire-question${count > question.maxWords ? " is-over-limit" : ""}">
                <span><strong>${escapeHtml(question.title)}</strong><i data-question-word-count="${escapeAttribute(question.id)}">${count} / ${question.maxWords} words</i></span>
                <small>${escapeHtml(question.prompt)}</small>
                <textarea rows="8" data-questionnaire-answer="${escapeAttribute(question.id)}" placeholder="Write your own response here…">${escapeHtml(editor.answers[question.id] || "")}</textarea>
              </label>
            `;
          }).join("")}
        </div>
        <div class="forms-editor-warning"><strong>Keep it your work</strong><p>Use this workspace to organise your own response. Check every answer, the 250-word limits and the current UTS instructions before submitting.</p></div>
      </aside>
      <div class="forms-questionnaire-stage">
        <div class="forms-questionnaire-toolbar">
          <span><strong>Live document preview</strong><small>Updates as you type</small></span>
          <div>
            <a class="secondary-btn" href="${escapeAttribute(editor.form.url)}" target="_blank" rel="noreferrer">Original DOCX ↗</a>
            <button class="match-btn" type="button" data-download-questionnaire>Download completed PDF</button>
          </div>
        </div>
        <div class="forms-questionnaire-preview-shell">
          ${renderQuestionnairePreview(editor)}
        </div>
        <p class="forms-pdf-help">UTS instructs applicants to upload completed questionnaire responses as a PDF through UAC. The official template remains the source of truth.</p>
      </div>
    </div>
  `;
}

function renderQuestionnairePreview(editor) {
  const questions = editor.form.questions || [];
  return `
    <article class="forms-questionnaire-paper" data-questionnaire-preview>
      <header>
        <div><span>UTS</span><small>UNIVERSITY OF<br />TECHNOLOGY SYDNEY</small></div>
        <p>Official questionnaire response workspace</p>
      </header>
      <section class="forms-questionnaire-document-title">
        <p>Engineering and Information Technology</p>
        <h3>${escapeHtml(editor.form.documentTitle || editor.form.title)}</h3>
        <span>Based on the official template currently linked by UTS</span>
      </section>
      <dl class="forms-questionnaire-details">
        <div><dt>Name</dt><dd data-questionnaire-preview-profile="fullName">${previewValue(editor.profile.fullName)}</dd></div>
        <div><dt>Date of birth</dt><dd data-questionnaire-preview-profile="dob">${previewValue(editor.profile.dob)}</dd></div>
        <div><dt>Email</dt><dd data-questionnaire-preview-profile="email">${previewValue(editor.profile.email)}</dd></div>
        <div><dt>UAC reference number</dt><dd data-questionnaire-preview-profile="uacReference">${previewValue(editor.profile.uacReference)}</dd></div>
      </dl>
      <div class="forms-questionnaire-preview-questions">
        ${questions.map((question) => `
          <section>
            <span>${escapeHtml(question.title)} · maximum ${question.maxWords} words</span>
            <h4>${escapeHtml(question.prompt)}</h4>
            <p data-questionnaire-preview-answer="${escapeAttribute(question.id)}">${previewAnswer(editor.answers[question.id])}</p>
          </section>
        `).join("")}
      </div>
      <footer>Review the official UTS eligibility, deadline and upload instructions before submitting through UAC.</footer>
    </article>
  `;
}

function previewValue(value) {
  return escapeHtml(String(value || "").trim() || "Not entered yet");
}

function previewAnswer(value) {
  const text = String(value || "").trim();
  return text ? escapeHtml(text).replace(/\n/g, "<br />") : "<em>Your response will appear here as you type.</em>";
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function renderDetectedFields(editor) {
  return `
    <div class="forms-detected-fields">
      <div><p class="eyebrow">Detected PDF fields</p><span>${editor.pdfFields.length}</span></div>
      <div class="forms-detected-field-list">
        ${editor.pdfFields.map((field) => renderDetectedFieldControl(field, editor.fieldValues[field.name])).join("")}
      </div>
    </div>
  `;
}

function renderDetectedFieldControl(field, value) {
  const encoded = escapeAttribute(field.name);
  if (field.type === "checkbox") {
    return `<label class="forms-checkbox-field"><input type="checkbox" data-pdf-field="${encoded}" ${value === true || value === "true" ? "checked" : ""} /><span>${escapeHtml(field.label)}</span></label>`;
  }
  if ((field.type === "dropdown" || field.type === "radio" || field.type === "option-list") && field.options.length) {
    return `<label><span>${escapeHtml(field.label)}</span><select data-pdf-field="${encoded}"><option value="">Choose…</option>${field.options.map((option) => `<option value="${escapeAttribute(option)}" ${String(value) === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
  }
  if (field.type === "signature") {
    return `<div class="forms-signature-field"><strong>${escapeHtml(field.label)}</strong><span>Complete this signature in the official PDF app after downloading.</span></div>`;
  }
  return `<label><span>${escapeHtml(field.label)}</span><input data-pdf-field="${encoded}" value="${escapeAttribute(value || "")}" /></label>`;
}

function renderPlacementTools(editor) {
  const hasPresetPlacements = editor.placements.some((placement) => placement.auto);
  return `
    <div class="forms-placement-tools">
      <p class="eyebrow">${hasPresetPlacements ? "Live document fields" : "Click-to-place text"}</p>
      ${hasPresetPlacements ? `<p class="forms-placement-note">Known boxes are pre-positioned. Enter your details above and the document preview updates immediately.</p>` : ""}
      <div class="forms-placement-buttons">
        ${profileFields.map((field) => `<button type="button" data-place-profile="${escapeAttribute(field.key)}" class="${editor.placementKey === field.key ? "is-active" : ""}" ${editor.profile[field.key] ? "" : "disabled"}>${escapeHtml(field.label)}</button>`).join("")}
      </div>
      ${editor.placements.length ? `
        <div class="forms-placement-list">
          ${editor.placements.map((placement, index) => `<span>${escapeHtml(profileLabel(placement.key))} · page ${placement.page}${placement.auto ? " · placed" : ""}<button type="button" data-remove-placement="${index}" aria-label="Remove ${escapeAttribute(profileLabel(placement.key))}">×</button></span>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function bindEditorEvents() {
  const root = document.querySelector("#forms-editor-root");
  if (!root) return;
  root.querySelectorAll("[data-close-editor]").forEach((button) => button.addEventListener("click", closePdfEditor));
  root.querySelector("[data-retry-editor]")?.addEventListener("click", () => openPdfEditor(formsState.editor?.form.id));
  if (formsState.editor?.kind === "questionnaire") {
    root.querySelectorAll("[data-questionnaire-profile]").forEach((input) => {
      input.addEventListener("input", () => {
        const editor = formsState.editor;
        if (!editor || editor.kind !== "questionnaire") return;
        const key = input.dataset.questionnaireProfile;
        editor.profile[key] = input.value;
        const preview = root.querySelector(`[data-questionnaire-preview-profile="${cssEscape(key)}"]`);
        if (preview) preview.textContent = input.value.trim() || "Not entered yet";
        persistFormProfile();
      });
    });
    root.querySelectorAll("[data-questionnaire-answer]").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        const editor = formsState.editor;
        if (!editor || editor.kind !== "questionnaire") return;
        const questionId = textarea.dataset.questionnaireAnswer;
        const question = editor.form.questions.find((item) => item.id === questionId);
        editor.answers[questionId] = textarea.value;
        const count = countWords(textarea.value);
        const counter = root.querySelector(`[data-question-word-count="${cssEscape(questionId)}"]`);
        if (counter) counter.textContent = `${count} / ${question.maxWords} words`;
        textarea.closest(".forms-questionnaire-question")?.classList.toggle("is-over-limit", count > question.maxWords);
        const preview = root.querySelector(`[data-questionnaire-preview-answer="${cssEscape(questionId)}"]`);
        if (preview) preview.innerHTML = previewAnswer(textarea.value);
        updateQuestionnaireDownloadState(root, editor);
      });
    });
    root.querySelector("[data-remember-profile]")?.addEventListener("change", (event) => {
      if (!formsState.editor) return;
      formsState.editor.remember = event.currentTarget.checked;
      persistFormProfile();
    });
    root.querySelector("[data-download-questionnaire]")?.addEventListener("click", downloadQuestionnairePdf);
    updateQuestionnaireDownloadState(root, formsState.editor);
    return;
  }
  root.querySelectorAll("[data-profile-field]").forEach((input) => {
    input.addEventListener("input", () => {
      if (!formsState.editor) return;
      formsState.editor.profile[input.dataset.profileField] = input.value;
      persistFormProfile();
      root.querySelector(`[data-place-profile="${cssEscape(input.dataset.profileField)}"]`)?.toggleAttribute("disabled", !input.value.trim());
      renderPlacementMarkers();
    });
  });
  root.querySelector("[data-remember-profile]")?.addEventListener("change", (event) => {
    if (!formsState.editor) return;
    formsState.editor.remember = event.currentTarget.checked;
    persistFormProfile();
  });
  root.querySelectorAll("[data-pdf-field]").forEach((control) => {
    control.addEventListener("input", () => {
      if (!formsState.editor) return;
      formsState.editor.fieldValues[control.dataset.pdfField] = control.type === "checkbox" ? control.checked : control.value;
      schedulePdfPreview();
    });
  });
  root.querySelector("[data-auto-fill]")?.addEventListener("click", () => fillMatchingFields(true));
  root.querySelectorAll("[data-page-step]").forEach((button) => button.addEventListener("click", async () => {
    if (!formsState.editor) return;
    formsState.editor.pageNumber = Math.max(1, Math.min(formsState.editor.pageCount, formsState.editor.pageNumber + Number(button.dataset.pageStep)));
    renderEditor();
    await renderEditorPage();
  }));
  root.querySelectorAll("[data-place-profile]").forEach((button) => button.addEventListener("click", () => {
    if (!formsState.editor) return;
    formsState.editor.placementKey = formsState.editor.placementKey === button.dataset.placeProfile ? "" : button.dataset.placeProfile;
    renderEditor();
    renderEditorPage();
  }));
  root.querySelectorAll("[data-remove-placement]").forEach((button) => button.addEventListener("click", () => {
    if (!formsState.editor) return;
    formsState.editor.placements.splice(Number(button.dataset.removePlacement), 1);
    renderEditor();
    renderEditorPage();
  }));
  root.querySelector("[data-download-pdf]")?.addEventListener("click", downloadCompletedPdf);
  root.querySelector("[data-pdf-canvas-shell]")?.addEventListener("click", placeProfileText);
}

function updateQuestionnaireDownloadState(root, editor) {
  const overLimit = editor.form.questions.some((question) => countWords(editor.answers[question.id]) > question.maxWords);
  const button = root.querySelector("[data-download-questionnaire]");
  if (!button) return;
  button.disabled = overLimit;
  button.title = overLimit ? "Shorten the highlighted answer to its official word limit first." : "Create a completed PDF from this live preview.";
}

async function downloadQuestionnairePdf() {
  const editor = formsState.editor;
  if (!editor || editor.kind !== "questionnaire" || !window.PDFLib) return;
  const overLimit = editor.form.questions.find((question) => countWords(editor.answers[question.id]) > question.maxWords);
  if (overLimit) {
    announceEditor(`${overLimit.title} is over ${overLimit.maxWords} words. Shorten it before downloading.`, true);
    document.querySelector(`[data-questionnaire-answer="${cssEscape(overLimit.id)}"]`)?.focus();
    return;
  }
  const missingProfile = questionnaireProfileKeys.find((key) => !String(editor.profile[key] || "").trim());
  const missingQuestion = editor.form.questions.find((question) => !String(editor.answers[question.id] || "").trim());
  if (missingProfile || missingQuestion) {
    const target = missingProfile
      ? document.querySelector(`[data-questionnaire-profile="${cssEscape(missingProfile)}"]`)
      : document.querySelector(`[data-questionnaire-answer="${cssEscape(missingQuestion.id)}"]`);
    target?.focus();
    announceEditor(`Complete ${missingProfile ? profileLabel(missingProfile) : missingQuestion.title} before downloading the final questionnaire.`, true);
    return;
  }
  const button = document.querySelector("[data-download-questionnaire]");
  if (button) {
    button.disabled = true;
    button.textContent = "Preparing PDF…";
  }
  try {
    const bytes = await buildQuestionnairePdfBytes(editor);
    downloadPdfBytes(bytes, `${safeFileName(editor.provider.code)}-${safeFileName(editor.form.title)}-completed.pdf`);
    announceEditor("Completed questionnaire PDF downloaded. Compare it with the official UTS instructions before uploading it to UAC.");
  } catch (error) {
    announceEditor(`Could not create the questionnaire PDF: ${String(error?.message || "unknown PDF error")}`, true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Download completed PDF";
    }
  }
}

async function buildQuestionnairePdfBytes(editor) {
  const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0.055, 0.23, 0.56);
  const ink = rgb(0.04, 0.06, 0.1);
  const muted = rgb(0.32, 0.36, 0.43);
  const line = rgb(0.78, 0.82, 0.88);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let page;
  let y;

  const addPage = () => {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawText("UTS", { x: margin, y: pageHeight - 48, size: 22, font: bold, color: ink });
    page.drawText("ENGINEERING AND INFORMATION TECHNOLOGY QUESTIONNAIRE", { x: margin + 58, y: pageHeight - 43, size: 8.5, font: bold, color: muted });
    page.drawLine({ start: { x: margin, y: pageHeight - 60 }, end: { x: pageWidth - margin, y: pageHeight - 60 }, thickness: 1, color: line });
    page.drawText(`Page ${pdfDoc.getPageCount()}`, { x: pageWidth - margin - 36, y: 25, size: 8, font: regular, color: muted });
    page.drawText("Generated from the official UTS-linked questionnaire - verify before submitting through UAC.", { x: margin, y: 25, size: 7.5, font: regular, color: muted });
    y = pageHeight - 88;
  };

  const ensureSpace = (height) => {
    if (!page || y - height < 48) addPage();
  };

  const drawLines = (text, options = {}) => {
    const font = options.font || regular;
    const size = options.size || 10;
    const lineHeight = options.lineHeight || size * 1.42;
    const color = options.color || ink;
    const x = options.x || margin;
    const maxWidth = options.maxWidth || contentWidth;
    const lines = wrapPdfText(safePdfText(text), font, size, maxWidth);
    lines.forEach((lineText) => {
      ensureSpace(lineHeight + (options.keepAfter || 0));
      if (lineText) page.drawText(lineText, { x, y, size, font, color, maxWidth });
      y -= lineHeight;
    });
    y -= options.after || 0;
  };

  addPage();
  drawLines("Applying for UTS - UAC", { font: bold, size: 18, lineHeight: 23, color: blue, after: 7 });
  drawLines("Engineering and Information Technology questionnaire responses", { font: bold, size: 11, lineHeight: 15, after: 13 });

  const details = [
    ["Name", editor.profile.fullName],
    ["Date of birth", editor.profile.dob],
    ["Email", editor.profile.email],
    ["UAC reference number", editor.profile.uacReference]
  ];
  details.forEach(([label, value]) => {
    ensureSpace(30);
    page.drawText(safePdfText(label), { x: margin, y, size: 9, font: bold, color: muted });
    page.drawText(safePdfText(value), { x: margin + 135, y, size: 10.5, font: regular, color: ink, maxWidth: contentWidth - 135 });
    y -= 18;
    page.drawLine({ start: { x: margin, y: y + 5 }, end: { x: pageWidth - margin, y: y + 5 }, thickness: 0.6, color: line });
  });
  y -= 10;

  editor.form.questions.forEach((question) => {
    ensureSpace(95);
    drawLines(`${question.title} - maximum ${question.maxWords} words`, { font: bold, size: 10.5, lineHeight: 14, color: blue, after: 3 });
    drawLines(question.prompt, { font: bold, size: 9.5, lineHeight: 13, after: 8, keepAfter: 20 });
    drawLines(editor.answers[question.id], { font: regular, size: 10, lineHeight: 14.5, after: 12 });
    ensureSpace(8);
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: pageWidth - margin, y: y + 4 }, thickness: 0.7, color: line });
    y -= 10;
  });

  pdfDoc.setTitle("UTS Engineering and IT Questionnaire responses");
  pdfDoc.setAuthor(String(editor.profile.fullName || "Applicant"));
  pdfDoc.setSubject("Applicant responses prepared from the official UTS-linked questionnaire template");
  pdfDoc.setCreator("Sydney Course Finder local form workspace");
  return pdfDoc.save({ useObjectStreams: false });
}

function wrapPdfText(value, font, size, maxWidth) {
  const paragraphs = String(value || "").replace(/\r/g, "").split("\n");
  const lines = [];
  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        return;
      }
      lines.push(line);
      line = word;
    });
    if (line) lines.push(line);
    if (!words.length || paragraphIndex < paragraphs.length - 1) lines.push("");
  });
  return lines.length ? lines : [""];
}

function safePdfText(value) {
  return String(value || "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n]/g, "?");
}

function downloadPdfBytes(bytes, filename) {
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
}

async function renderEditorPage() {
  const editor = formsState.editor;
  const canvas = document.querySelector("[data-pdf-canvas]");
  if (!editor?.pdfJsDocument || !canvas) return;
  editor.renderTask?.cancel?.();
  const page = await editor.pdfJsDocument.getPage(editor.pageNumber);
  if (formsState.editor !== editor || !canvas.isConnected) return;
  const shell = canvas.closest("[data-pdf-canvas-shell]");
  const availableWidth = Math.max(280, Math.min(shell?.clientWidth || 820, 920));
  const baseViewport = page.getViewport({ scale: 1 });
  const cssScale = Math.min(1.55, availableWidth / baseViewport.width);
  const outputScale = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: cssScale });
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  const context = canvas.getContext("2d", { alpha: false });
  const renderTask = page.render({
    canvasContext: context,
    viewport,
    transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0]
  });
  editor.renderTask = renderTask;
  try {
    await renderTask.promise;
  } catch (error) {
    if (error?.name === "RenderingCancelledException") return;
    throw error;
  }
  if (formsState.editor !== editor) return;
  editor.viewport = viewport;
  renderPlacementMarkers();
}

function renderPlacementMarkers() {
  const editor = formsState.editor;
  const layer = document.querySelector("[data-placement-layer]");
  if (!editor?.viewport || !layer) return;
  layer.style.width = `${editor.viewport.width}px`;
  layer.style.height = `${editor.viewport.height}px`;
  layer.innerHTML = editor.placements
    .filter((placement) => placement.page === editor.pageNumber)
    .filter((placement) => placementText(placement))
    .map((placement) => {
      const [left, top] = editor.viewport.convertToViewportPoint(placement.x, placement.y);
      return `<span style="left:${left}px;top:${top}px">${escapeHtml(placementText(placement))}</span>`;
    }).join("");
}

function placementText(placement) {
  if (placement?.key) return String(formsState.editor?.profile?.[placement.key] || placement.text || "").trim();
  return String(placement?.text || "").trim();
}

function placeProfileText(event) {
  const editor = formsState.editor;
  if (!editor?.placementKey || !editor.viewport) return;
  const text = String(editor.profile[editor.placementKey] || "").trim();
  if (!text) return;
  const canvas = document.querySelector("[data-pdf-canvas]");
  if (!canvas || !event.target.closest("[data-pdf-canvas-shell]")) return;
  const rect = canvas.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
  const point = editor.viewport.convertToPdfPoint(event.clientX - rect.left, event.clientY - rect.top);
  editor.placements.push({
    key: editor.placementKey,
    text,
    page: editor.pageNumber,
    x: point[0],
    y: point[1],
    size: 10
  });
  editor.placementKey = "";
  renderEditor();
  renderEditorPage();
  schedulePdfPreview();
}

function schedulePdfPreview() {
  const editor = formsState.editor;
  if (!editor || editor.kind !== "pdf" || !editor.pdfFields.length) return;
  clearTimeout(editor.previewTimer);
  editor.previewTimer = setTimeout(refreshPdfPreview, 180);
}

async function refreshPdfPreview() {
  const editor = formsState.editor;
  if (!editor || editor.kind !== "pdf" || !editor.pdfjs || !editor.pdfFields.length) return;
  const revision = ++editor.previewRevision;
  try {
    const bytes = await buildCompletedPdfBytes(editor);
    if (formsState.editor !== editor || revision !== editor.previewRevision) return;
    const nextDocument = await editor.pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 }).promise;
    if (formsState.editor !== editor || revision !== editor.previewRevision) {
      nextDocument.destroy?.();
      return;
    }
    const previousDocument = editor.pdfJsDocument;
    editor.pdfJsDocument = nextDocument;
    await renderEditorPage();
    if (previousDocument && previousDocument !== nextDocument) previousDocument.destroy?.();
  } catch {
    // Keep the original preview available if an unusual field appearance cannot be regenerated live.
  }
}

function describePdfFields(form) {
  return form.getFields().map((field) => {
    const typeName = field.constructor?.name || "PDFField";
    const name = field.getName();
    const type = typeName === "PDFCheckBox" ? "checkbox"
      : typeName === "PDFDropdown" ? "dropdown"
        : typeName === "PDFRadioGroup" ? "radio"
          : typeName === "PDFOptionList" ? "option-list"
            : typeName === "PDFSignature" ? "signature"
              : "text";
    let value = "";
    let options = [];
    try {
      if (type === "checkbox") value = field.isChecked();
      else if (type === "dropdown" || type === "option-list") {
        value = field.getSelected()?.[0] || "";
        options = field.getOptions?.() || [];
      } else if (type === "radio") {
        value = field.getSelected?.() || "";
        options = field.getOptions?.() || [];
      } else if (type === "text") value = field.getText?.() || "";
    } catch {
      value = "";
    }
    return { name, label: readableFieldName(name), type, value, options };
  });
}

function fillMatchingFields(showFeedback) {
  const editor = formsState.editor;
  if (!editor?.pdfFields.length) return;
  let matched = 0;
  editor.pdfFields.forEach((field) => {
    if (field.type !== "text" || String(editor.fieldValues[field.name] || "").trim()) return;
    const key = profileKeyForPdfField(field.name);
    const value = key ? String(editor.profile[key] || "").trim() : "";
    if (!value) return;
    editor.fieldValues[field.name] = value;
    matched += 1;
  });
  renderEditor();
  renderEditorPage();
  schedulePdfPreview();
  if (showFeedback) announceEditor(`${matched} matching field${matched === 1 ? "" : "s"} filled. Review everything before downloading.`);
}

async function buildCompletedPdfBytes(editor) {
  const pdfDoc = await window.PDFLib.PDFDocument.load(editor.originalBytes.slice(), { ignoreEncryption: true });
  const form = pdfDoc.getForm();
  editor.pdfFields.forEach((descriptor) => {
    if (descriptor.type === "signature") return;
    let field;
    try {
      field = form.getField(descriptor.name);
    } catch {
      return;
    }
    const value = editor.fieldValues[descriptor.name];
    try {
      if (descriptor.type === "checkbox") {
        if (value === true || value === "true") field.check();
        else field.uncheck();
      } else if (descriptor.type === "dropdown" || descriptor.type === "radio" || descriptor.type === "option-list") {
        if (value) field.select(String(value));
      } else {
        field.setText(String(value || ""));
      }
    } catch {
      // Keep rendering or exporting the remaining fields when a provider uses an unusual widget.
    }
  });
  if (editor.pdfFields.length) {
    const font = await pdfDoc.embedFont(window.PDFLib.StandardFonts.Helvetica);
    try { form.updateFieldAppearances(font); } catch { /* Some PDFs provide their own appearances. */ }
  }
  const pages = pdfDoc.getPages();
  editor.placements.forEach((placement) => {
    const page = pages[placement.page - 1];
    const text = placementText(placement);
    if (!page || !text) return;
    page.drawText(safePdfText(text), {
      x: placement.x,
      y: placement.y,
      size: placement.size,
      color: window.PDFLib.rgb(0.05, 0.08, 0.14),
      maxWidth: placement.maxWidth || Math.max(80, page.getWidth() - placement.x - 24)
    });
  });
  return pdfDoc.save({ useObjectStreams: false, addDefaultPage: false });
}

async function downloadCompletedPdf() {
  const editor = formsState.editor;
  if (!editor?.originalBytes || !window.PDFLib) return;
  const button = document.querySelector("[data-download-pdf]");
  if (button) {
    button.disabled = true;
    button.textContent = "Preparing PDF…";
  }
  try {
    const bytes = await buildCompletedPdfBytes(editor);
    downloadPdfBytes(bytes, `${safeFileName(editor.provider.code)}-${safeFileName(editor.form.title)}-completed.pdf`);
    announceEditor("Completed PDF downloaded. Open it once and verify every page before submitting.");
  } catch (error) {
    announceEditor(`Could not create the completed copy: ${String(error?.message || "unknown PDF error")}`, true);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Download completed PDF";
    }
  }
}

function closePdfEditor() {
  clearTimeout(formsState.editor?.previewTimer);
  formsState.editor?.renderTask?.cancel?.();
  formsState.editor?.pdfJsDocument?.destroy?.();
  formsState.editor = null;
  renderEditor();
}

function persistFormProfile() {
  const editor = formsState.editor;
  if (!editor) return;
  try {
    if (editor.remember) localStorage.setItem(profileStorageKey, JSON.stringify(editor.profile));
    else localStorage.removeItem(profileStorageKey);
  } catch {
    // The profile remains available for the current editor session.
  }
}

function loadRememberedProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(profileStorageKey) || "null");
    return stored && typeof stored === "object" ? stored : null;
  } catch {
    return null;
  }
}

function loadFormProfile() {
  const remembered = loadRememberedProfile();
  const date = new Intl.DateTimeFormat("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  return Object.fromEntries(profileFields.map((field) => [field.key, remembered?.[field.key] || (field.key === "date" ? date : "")]));
}

function locateForm(formId) {
  for (const provider of formsCatalogue.providers) {
    const form = provider.forms.find((item) => item.id === formId);
    if (form) return { provider, form };
  }
  return null;
}

function providerSearchScore(provider, query) {
  const cleanQuery = normalise(query);
  if (!cleanQuery) return 1;
  const providerText = [provider.name, provider.code, ...provider.aliases].join(" ");
  const formText = provider.forms.map((form) => `${form.title} ${form.category} ${form.description}`).join(" ");
  let score = fuzzyTextMatch(providerText, cleanQuery) ? 100 : 0;
  if (normalise(provider.code) === cleanQuery || provider.aliases.some((alias) => normalise(alias) === cleanQuery)) score += 220;
  if (normalise(provider.name).includes(cleanQuery)) score += 140;
  if (fuzzyTextMatch(formText, cleanQuery)) score += 70;
  return score;
}

function fuzzyTextMatch(text, query) {
  const haystack = normalise(text);
  const needle = normalise(query);
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  const hayTokens = haystack.split(" ").filter(Boolean);
  return needle.split(" ").filter(Boolean).every((queryToken) =>
    hayTokens.some((token) => token.includes(queryToken)
      || (token.length >= 3 && queryToken.includes(token))
      || (queryToken.length >= 4 && editDistance(token, queryToken) <= Math.max(1, Math.floor(queryToken.length * 0.28))))
  );
}

function editDistance(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[right.length];
}

function profileKeyForPdfField(name) {
  const value = normalise(name);
  if (/family|surname|last name/.test(value)) return "familyName";
  if (/given|first name|forename/.test(value)) return "givenNames";
  if (/student.*(number|no|id)|(number|id).*student/.test(value)) return "studentId";
  if (/uac.*(number|no|id|reference)|(number|id|reference).*uac/.test(value)) return "uacReference";
  if (/full name|student name|applicant name|your name/.test(value)) return "fullName";
  if (/email/.test(value)) return "email";
  if (/phone|mobile|telephone/.test(value)) return "phone";
  if (/birth|dob/.test(value)) return "dob";
  if (/address/.test(value)) return "address";
  if (/(course|program).*(code|number)|(code|number).*(course|program)/.test(value)) return "courseCode";
  if (/course|program|degree|award/.test(value)) return "course";
  if (/date/.test(value) && !/birth|commence|start|end|visa/.test(value)) return "date";
  return "";
}

function readableFieldName(name) {
  return String(name || "Field")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[_.-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function directorySummary(count) {
  const parts = [];
  if (formsState.query.trim()) parts.push(`Matching “${formsState.query.trim()}”`);
  if (formsState.category !== "All forms") parts.push(formsState.category);
  if (formsState.access === "pdf") parts.push("official PDFs only");
  if (formsState.access === "editable") parts.push("forms editable here only");
  if (formsState.access === "online") parts.push("online and portal forms only");
  return `${parts.length ? parts.join(" · ") : "Showing every checked provider"}. ${count} result${count === 1 ? "" : "s"}.`;
}

function accessPriority(provider) {
  return { "public-pdf": 0, "public-mixed": 1, "portal-only": 2, limited: 3 }[provider.access] ?? 4;
}

function accessLabel(access) {
  return {
    "public-pdf": "Public PDF library",
    "public-mixed": "PDFs and online forms",
    "portal-only": "Official portal forms",
    limited: "Official source only"
  }[access] || "Official source";
}

function isPdfForm(form) {
  return form?.format === "pdf" || form?.format === "external-pdf";
}

function profileLabel(key) {
  return profileFields.find((field) => field.key === key)?.label || key;
}

function announceEditor(message, isError = false) {
  let live = document.querySelector("#forms-editor-live");
  if (!live) {
    live = document.createElement("div");
    live.id = "forms-editor-live";
    live.className = "forms-editor-toast";
    live.setAttribute("role", isError ? "alert" : "status");
    document.body.appendChild(live);
  }
  live.classList.toggle("is-error", isError);
  live.textContent = message;
  live.classList.add("is-visible");
  clearTimeout(announceEditor.timer);
  announceEditor.timer = setTimeout(() => live?.classList.remove("is-visible"), 4200);
}

function normalise(value) {
  return String(value || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function formatDate(value) {
  const date = new Date(`${value || ""}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function safeFileName(value) {
  return normalise(value).replace(/\s+/g, "-").slice(0, 70) || "form";
}

function number(value) {
  return new Intl.NumberFormat("en-AU").format(Number(value || 0));
}

function cssEscape(value) {
  return window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

document.addEventListener("click", (event) => {
  if (event.target.closest('[data-action="reset-forms-search"]')) {
    formsState.query = "";
    formsState.category = "All forms";
    formsState.access = "all";
    const query = universityFormsApp.querySelector('[name="forms-query"]');
    const category = universityFormsApp.querySelector('[name="forms-category"]');
    const access = universityFormsApp.querySelector('[name="forms-access"]');
    if (query) query.value = "";
    if (category) category.value = "All forms";
    if (access) access.value = "all";
    renderProviderDirectory();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && formsState.editor) closePdfEditor();
});

window.addEventListener("resize", () => {
  if (!formsState.editor?.pdfJsDocument) return;
  clearTimeout(window.__formsPdfResizeTimer);
  window.__formsPdfResizeTimer = setTimeout(renderEditorPage, 160);
});
