(() => {
  "use strict";

  const data = window.FIELD_GUIDE_DATA;
  if (!data) {
    throw new Error("FIELD_GUIDE_DATA is required before app.js");
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const storagePrefix = "systems-that-survive:";

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value));
      return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
    } catch {
      return "#";
    }
  };

  const readStored = (key, fallback = null) => {
    try {
      const value = localStorage.getItem(storagePrefix + key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };

  const writeStored = (key, value) => {
    try {
      localStorage.setItem(storagePrefix + key, String(value));
    } catch {
      return false;
    }
    return true;
  };

  const toast = (message) => {
    const node = $("#toast");
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 2600);
  };

  const resourceById = new Map(data.resources.map((resource) => [resource.id, resource]));

  function initializeTheme() {
    const root = document.documentElement;
    const button = $("#theme-toggle");
    const modes = ["auto", "light", "dark"];
    const stored = readStored("theme", "auto");
    root.dataset.theme = modes.includes(stored) ? stored : "auto";

    const updateLabel = () => {
      const mode = root.dataset.theme;
      button.setAttribute("aria-label", `Color theme: ${mode}. Activate to change.`);
      button.title = `Color theme: ${mode}`;
    };

    button.addEventListener("click", () => {
      const current = modes.indexOf(root.dataset.theme);
      root.dataset.theme = modes[(current + 1) % modes.length];
      writeStored("theme", root.dataset.theme);
      updateLabel();
      toast(`Theme set to ${root.dataset.theme}`);
    });

    updateLabel();
  }

  function initializeNavigation() {
    const button = $("#mobile-menu-button");
    const menu = $("#mobile-nav");
    const links = $$("a", menu);

    const setOpen = (open) => {
      menu.hidden = !open;
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      $("use", button).setAttribute("href", open ? "#icon-close" : "#icon-menu");
    };

    button.addEventListener("click", () => setOpen(menu.hidden));
    links.forEach((link) => link.addEventListener("click", () => setOpen(false)));

    const navLinks = $$(".desktop-nav a");
    const sectionTargets = navLinks
      .map((link) => document.querySelector(link.hash))
      .filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach((link) => {
        if (link.hash === `#${visible.target.id}`) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -65%", threshold: [0.05, 0.2, 0.5] });

    sectionTargets.forEach((section) => observer.observe(section));
  }

  function initializeReadingProgress() {
    const bar = $("#reading-progress-bar");
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const fraction = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
      bar.style.width = `${(fraction * 100).toFixed(2)}%`;
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function resourceLinks(ids) {
    const resources = (ids || []).map((id) => resourceById.get(id)).filter(Boolean);
    if (!resources.length) return "";
    return `
      <div class="module-resources">
        <h3>Public resources</h3>
        <ul>${resources.map((resource) => `<li><a href="${safeUrl(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)}</a></li>`).join("")}</ul>
      </div>`;
  }

  function renderModules() {
    const root = $("#module-list");
    const currentLens = $("input[name='lens']:checked").value;

    root.innerHTML = data.modules.map((module, index) => {
      const selectedLens = currentLens === "interview" ? module.interviewLens : module.productionLens;
      const completed = readStored(`module:${module.id}`, "false") === "true";
      return `
        <details class="module-card" id="module-${escapeHtml(module.id)}">
          <summary>
            <span class="module-index">${String(index + 1).padStart(2, "0")}</span>
            <span class="module-title">${escapeHtml(module.title)}</span>
            <span class="module-purpose">${escapeHtml(module.purpose)}</span>
            <span class="disclosure-icon" aria-hidden="true"></span>
          </summary>
          <div class="module-body">
            <div>
              <h3>Core concepts</h3>
              <ul class="module-concepts">${module.concepts.map((concept) => `<li><strong>${escapeHtml(concept.name)}</strong><span>${escapeHtml(concept.explanation)}</span><small>${escapeHtml(concept.decisionQuestion)}</small></li>`).join("")}</ul>
              <div class="module-drill">
                <h3>Practice drill</h3>
                <p>${escapeHtml(module.drill.prompt)}</p>
                <p><strong>Deliverable:</strong> ${escapeHtml(module.drill.deliverable)}</p>
                <ul>${module.drill.passCriteria.map((criterion) => `<li>${escapeHtml(criterion)}</li>`).join("")}</ul>
              </div>
              ${resourceLinks(module.resourceIds)}
            </div>
            <div>
              <div class="lens-panel" data-module-lens="${escapeHtml(module.id)}"><h3>${currentLens === "interview" ? "Interview lens" : "Production lens"}</h3><ul>${selectedLens.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></div>
              <label class="module-completion"><input type="checkbox" data-module-complete="${escapeHtml(module.id)}" ${completed ? "checked" : ""}> Mark this module complete</label>
            </div>
          </div>
        </details>`;
    }).join("");

    $$('[data-module-complete]', root).forEach((checkbox) => {
      checkbox.addEventListener("change", () => {
        writeStored(`module:${checkbox.dataset.moduleComplete}`, checkbox.checked);
        toast(checkbox.checked ? "Module marked complete" : "Module completion cleared");
      });
    });
  }

  function initializeLensSwitch() {
    $$("input[name='lens']").forEach((input) => input.addEventListener("change", () => {
      const openIds = $$(".module-card[open]").map((node) => node.id);
      renderModules();
      openIds.forEach((id) => document.getElementById(id)?.setAttribute("open", ""));
    }));
  }

  function renderPatterns() {
    const root = $("#pattern-list");
    root.innerHTML = data.patterns.map((pattern, index) => `
      <details class="pattern-card" id="pattern-${escapeHtml(pattern.id)}" data-pattern-search="${escapeHtml([pattern.title, pattern.symptom, pattern.hiddenMechanism, ...(pattern.topics || [])].join(" ").toLowerCase())}">
        <summary><span class="pattern-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(pattern.title)}</h3></summary>
        <div class="pattern-body">
          <dl>
            <dt>Symptom</dt><dd>${escapeHtml(pattern.symptom)}</dd>
            <dt>Hidden mechanism</dt><dd>${escapeHtml(pattern.hiddenMechanism)}</dd>
            <dt>Safer design</dt><dd>${escapeHtml(pattern.saferDesign)}</dd>
            <dt>Verification</dt><dd>${escapeHtml(pattern.verification)}</dd>
            <dt>Interview line</dt><dd>${escapeHtml(pattern.interviewLine)}</dd>
            <dt>Transfer limit</dt><dd>${escapeHtml(pattern.transferLimit)}</dd>
          </dl>
          <div class="topic-list">${(pattern.topics || []).map((topic) => `<span>${escapeHtml(topic)}</span>`).join("")}</div>
        </div>
      </details>`).join("");
  }

  function initializePatternFilter() {
    const input = $("#pattern-filter");
    input.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      $$(".pattern-card").forEach((card) => { card.hidden = query.length > 0 && !card.dataset.patternSearch.includes(query); });
    });
  }

  function renderDrills() {
    const root = $("#drill-grid");
    root.innerHTML = data.drills.map((drill) => `
      <article class="drill-card" id="drill-${escapeHtml(drill.id)}">
        <span>${escapeHtml(drill.type || drill.category || "Practice")}</span>
        <h3>${escapeHtml(drill.title)}</h3>
        <p>${escapeHtml(drill.prompt || drill.description)}</p>
      </article>`).join("");
  }

  function initializeRandomDrill() {
    const button = $("#random-drill");
    const output = $("#drill-output");
    button.addEventListener("click", () => {
      const drill = data.drills[Math.floor(Math.random() * data.drills.length)];
      output.innerHTML = `<h3>${escapeHtml(drill.title)}</h3><p>${escapeHtml(drill.prompt || drill.description)}</p>`;
      output.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function populateSelect(select, values) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.append(option);
    });
  }

  function renderResources(resources) {
    const body = $("#resource-table-body");
    body.innerHTML = resources.map((resource) => `
      <tr id="resource-${escapeHtml(resource.id)}">
        <td data-label="Resource"><a href="${safeUrl(resource.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(resource.title)} ↗</a><span class="resource-source">${escapeHtml(resource.source || "Public source")}</span></td>
        <td data-label="Type">${escapeHtml(resource.type)}</td>
        <td data-label="Topics"><span class="resource-tags">${resource.topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join("")}</span></td>
        <td data-label="Level">${escapeHtml(resource.level)}</td>
        <td data-label="Why useful">${escapeHtml(resource.description)}</td>
      </tr>`).join("");
    $("#resource-count").textContent = `${resources.length} of ${data.resources.length} resources shown`;
  }

  function initializeResourceFilters() {
    const search = $("#resource-search");
    const topic = $("#resource-topic");
    const type = $("#resource-type");
    const level = $("#resource-level");
    populateSelect(topic, [...new Set(data.resources.flatMap((resource) => resource.topics))].sort());
    populateSelect(type, [...new Set(data.resources.map((resource) => resource.type))].sort());
    populateSelect(level, [...new Set(data.resources.map((resource) => resource.level))].sort());

    const filter = () => {
      const query = search.value.trim().toLowerCase();
      const selectedTopic = topic.value;
      const selectedType = type.value;
      const selectedLevel = level.value;
      const filtered = data.resources.filter((resource) => {
        const haystack = [resource.title, resource.description, resource.source, resource.type, resource.level, ...resource.topics].join(" ").toLowerCase();
        return (!query || haystack.includes(query))
          && (selectedTopic === "all" || resource.topics.includes(selectedTopic))
          && (selectedType === "all" || resource.type === selectedType)
          && (selectedLevel === "all" || resource.level === selectedLevel);
      });
      renderResources(filtered);
    };

    [search, topic, type, level].forEach((control) => control.addEventListener(control === search ? "input" : "change", filter));
    renderResources(data.resources);
  }

  function renderGlossary() {
    const root = $("#glossary-list");
    root.innerHTML = data.glossary.map((item) => `<button class="term-button" type="button" data-term="${escapeHtml(item.term)}">${escapeHtml(item.term)}</button>`).join("");
    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-term]");
      if (!button) return;
      const item = data.glossary.find((entry) => entry.term === button.dataset.term);
      if (!item) return;
      $("#term-dialog-title").textContent = item.term;
      $("#term-dialog-definition").textContent = item.definition;
      $("#term-dialog-consequence").textContent = item.consequence || `Use it precisely when reasoning about ${(item.topics || []).join(", ")}.`;
      $("#term-dialog").showModal();
    });
  }

  function buildSearchIndex() {
    const staticEntries = [
      { title: "Systems concept map", description: "Requirements, contracts, services, state, infrastructure, and feedback.", href: "#map", kind: "Section" },
      { title: "Design loop", description: "Clarify, explore, design, validate, and learn.", href: "#design-loop", kind: "Section" },
      { title: "Failure-mode matrix", description: "Containment, user impact, data impact, recovery, and proof.", href: "#reliability", kind: "Section" },
      { title: "Interview practice plan", description: "Four-week sprint, 45-minute loop, and answer rubric.", href: "#interview-lab", kind: "Section" },
      { title: "Software engineer project ladder", description: "Six levels from one correct service to staff judgment.", href: "#engineering-ladder", kind: "Section" },
      { title: "Final readiness checklist", description: "Understand, design, validate, and deliver.", href: "#checklist", kind: "Section" }
    ];
    const modules = data.modules.map((item) => ({ title: item.title, description: item.purpose, href: `#module-${item.id}`, kind: "Module", search: item.concepts.map((concept) => [concept.name, concept.explanation, concept.decisionQuestion].join(" ")).join(" ") }));
    const patterns = data.patterns.map((item) => ({ title: item.title, description: item.symptom, href: `#pattern-${item.id}`, kind: "Pattern", search: [item.hiddenMechanism, item.saferDesign, ...(item.topics || [])].join(" ") }));
    const resources = data.resources.map((item) => ({ title: item.title, description: item.description, href: item.url, kind: "Resource", external: true, search: item.topics.join(" ") }));
    const glossary = data.glossary.map((item) => ({ title: item.term, description: item.definition, href: "#resources", kind: "Glossary", search: [item.consequence || "", ...(item.topics || [])].join(" ") }));
    return [...staticEntries, ...modules, ...patterns, ...resources, ...glossary];
  }

  function initializeGlobalSearch() {
    const dialog = $("#search-dialog");
    const input = $("#global-search");
    const results = $("#search-results");
    const index = buildSearchIndex();

    const render = () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.innerHTML = `<p>Search ${index.length} concepts, patterns, resources, and glossary terms.</p>`;
        return;
      }
      const matches = index.filter((item) => [item.title, item.description, item.kind, item.search || ""].join(" ").toLowerCase().includes(query)).slice(0, 12);
      results.innerHTML = matches.length
        ? matches.map((item) => `<a class="search-result" href="${item.external ? safeUrl(item.href) : escapeHtml(item.href)}" ${item.external ? 'target="_blank" rel="noopener noreferrer"' : ""}><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.kind)} · ${escapeHtml(item.description)}</span></a>`).join("")
        : `<p>No result for “${escapeHtml(input.value.trim())}”. Try a broader concept.</p>`;
    };

    $$(".search-trigger").forEach((button) => button.addEventListener("click", () => {
      dialog.showModal();
      input.focus();
      render();
    }));
    input.addEventListener("input", render);
    results.addEventListener("click", (event) => {
      if (event.target.closest("a") && !event.target.closest("a").target) dialog.close();
    });
    document.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!dialog.open) {
          dialog.showModal();
          input.focus();
          render();
        }
      }
    });
  }

  function initializeChecklist() {
    const boxes = $$("#readiness-grid input[type='checkbox']");
    boxes.forEach((box, index) => {
      box.checked = readStored(`checklist:${index}`, "false") === "true";
      box.addEventListener("change", () => writeStored(`checklist:${index}`, box.checked));
    });

    $("#copy-checklist").addEventListener("click", async () => {
      const sections = $$("#readiness-grid section").map((section) => {
        const heading = $("h3", section).textContent;
        const items = $$("label", section).map((label) => `[ ] ${label.textContent.trim()}`);
        return `${heading}\n${items.join("\n")}`;
      });
      try {
        await navigator.clipboard.writeText(`Systems That Survive readiness checklist\n\n${sections.join("\n\n")}`);
        toast("Checklist copied");
      } catch {
        toast("Clipboard permission was unavailable. Use Print guide instead.");
      }
    });

    $("#print-guide").addEventListener("click", () => window.print());
  }

  function initializeDialogs() {
    $$("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  function initializeExternalLinks() {
    $$("a[target='_blank']").forEach((link) => {
      link.rel = "noopener noreferrer";
    });
  }

  function initialize() {
    initializeTheme();
    initializeNavigation();
    initializeReadingProgress();
    renderModules();
    initializeLensSwitch();
    renderPatterns();
    initializePatternFilter();
    renderDrills();
    initializeRandomDrill();
    initializeResourceFilters();
    renderGlossary();
    initializeGlobalSearch();
    initializeChecklist();
    initializeDialogs();
    initializeExternalLinks();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize);
  else initialize();
})();
