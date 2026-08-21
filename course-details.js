(function () {
  const chunkPromises = new Map();
  const hydratedCourses = new WeakSet();
  const dataVersion = "13";

  function hasFullDetails(course) {
    return Boolean(course && hydratedCourses.has(course));
  }

  function chunkUrl(course) {
    const chunk = String(course?.detailChunk || "").trim();
    if (!chunk) return "";
    return new URL(`./course-data/details/${encodeURIComponent(chunk)}.json?v=${dataVersion}`, document.baseURI).href;
  }

  function loadChunk(course) {
    const url = chunkUrl(course);
    if (!url) return Promise.resolve(new Map());
    if (chunkPromises.has(url)) return chunkPromises.get(url);

    const promise = fetch(url, { cache: "force-cache", credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Course details request failed (${response.status})`);
        return response.json();
      })
      .then((payload) => new Map((payload?.courses || []).map((item) => [String(item.id), item])))
      .catch((error) => {
        chunkPromises.delete(url);
        throw error;
      });

    chunkPromises.set(url, promise);
    return promise;
  }

  async function get(course) {
    if (!course || hasFullDetails(course)) return course;
    const records = await loadChunk(course);
    const complete = records.get(String(course.id));
    if (complete) Object.assign(course, complete);
    hydratedCourses.add(course);
    return course;
  }

  function preload(course) {
    return loadChunk(course).catch(() => undefined);
  }

  window.courseFinderCourseDetails = { get, preload, hasFullDetails };
})();
