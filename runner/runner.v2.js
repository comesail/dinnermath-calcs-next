/* runner.v2.js  (shared for all calculators)
   - Loads /data/<slug>.json
   - Applies optional per-slug UI overrides:
       ui.title -> sets H1 and document.title
       ui.role_family -> tags <body data-role-family="...">
       ui.input_order -> reorders sections for this slug only
   - Defaults by category remain the same unless overridden
   - Recalculates on input/change; select-all on focus/click for guest fields
   - Renumbers visible steps after layout changes
   ASCII only.
*/
(function () {
  // ---------- small helpers ----------
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load " + url);
    return await res.json();
  }

  function getSlugFromLocation() {
    const u = new URL(window.location.href);
    const qsSlug = u.searchParams.get("slug");
    if (qsSlug) return qsSlug;
    const m = u.pathname.match(/(?:\/|^)([^\/]+)\.html$/);
    return m ? m[1] : null;
  }

  function selectAllBehavior(id) {
    const el = document.getElementById(id);
    if (!el) return;
    function sel() { this.select(); }
    el.addEventListener("focus", sel);
    el.addEventListener("click", sel);
  }

  function readInputs() {
    const A = Number(qs("#adults")?.value || 0);
    const T = Number(qs("#teens")?.value || 0);
    const C = Number(qs("#children")?.value || 0);
    const roleVal = qs('input[name="role"]:checked')?.value || "1.00";
    const appetiteVal = qs('input[name="appetite"]:checked')?.value || "1.00";
    const toppingsBar = qs("#toppings")?.value === "yes";
    return {
      adults: A,
      teens: T,
      children: C,
      role: parseFloat(roleVal),
      appetite: parseFloat(appetiteVal),
      toppings_bar: toppingsBar
    };
  }

  function writeResults(result) {
    const numEl = qs("#result-number");
    if (numEl) {
      const n = (Math.round(result.rounded * 10) / 10).toFixed(1);
      numEl.textContent = n + " " + (result.unit || "servings");
    }
    const summary = qs("#input-summary");
    if (summary) {
      const A = Number(qs("#adults")?.value || 0);
      const T = Number(qs("#teens")?.value || 0);
      const C = Number(qs("#children")?.value || 0);
      const ap = qs('input[name="appetite"]:checked')?.dataset?.label || "Moderate";
      const rl = qs('input[name="role"]:checked')?.dataset?.label || "Only dessert";
      summary.textContent = "Guests: " + A + "/" + T + "/" + C + " · Appetite: " + ap + " · Role: " + rl;
    }
  }

  // ---------- layout helpers ----------
  // Map logical keys to section elements present in the shared skin.
  // Update these selectors only if your skin uses different IDs.
  const SECTION_SELECTORS = {
    role:        '#section-role',
    guests:      '#section-guests',
    appetite:    '#section-appetite',
    controls:    '#section-controls'
    // eventLength optional in other categories: '#section-length'
  };

  function resolveSectionEl(key) {
    const sel = SECTION_SELECTORS[key];
    return sel ? qs(sel) : null;
  }

  function reorderSections(order) {
    // Order is an array of logical keys, e.g., ["role","guests","appetite","controls"]
    // We will append in order inside the main container.
    const container = qs('#inputs-container') || qs('main') || document.body;
    if (!container || !order || !order.length) return;
    order.forEach(function (key) {
      const el = resolveSectionEl(key);
      if (el && el.parentNode !== container) {
        container.appendChild(el);
      } else if (el) {
        // already a child; move to the end in the desired order
        container.appendChild(el);
      }
    });
  }

  function renumberSteps() {
    // Finds each visible step section and updates its number and aria-label.
    // Expects each section to have:
    //   .step-label element for the visible number
    //   role="region" or aria-label on the section wrapper
    const sections = qsa('[data-step-section]');
    let idx = 1;
    sections.forEach(function (sec) {
      const isHidden = sec.hasAttribute('hidden') || sec.style.display === 'none';
      if (isHidden) return;
      const lbl = qs('.step-label', sec) || qs('[data-step-label]', sec);
      if (lbl) lbl.textContent = String(idx);
      const aria = sec.getAttribute('aria-label') || '';
      if (aria) sec.setAttribute('aria-label', aria.replace(/\bStep\s+\d+\b/i, 'Step ' + idx));
      idx += 1;
    });
  }

  function applyUiMeta(data) {
    // Title
    var title = data?.ui?.title || data?.name || data?.display_name || data?.slug || "Calculator";
    const h1 = qs('#page-title') || qs('h1');
    if (h1) h1.textContent = title + " Quantity Calculator";
    document.title = title + " — DinnerMath";

    // Role family tag for copy selection in the skin (if used there)
    if (data?.ui?.role_family || data?.role_family) {
      document.body.setAttribute('data-role-family', data.ui?.role_family || data.role_family);
    }

    // Choose order
    const defaultOrderByCategory = {
      desserts: ["guests", "appetite", "role", "controls"],
      meat:     ["guests", "eventLength", "appetite", "role", "controls"],
      drinks:   ["guests", "eventLength", "appetite", "role", "controls"]
    };
    const cat = (data.category || "").toLowerCase();
    const override = Array.isArray(data?.ui?.input_order) ? data.ui.input_order : null;
    const desired = (override && override.length)
      ? override
      : (defaultOrderByCategory[cat] || ["guests","appetite","role","controls"]);

    reorderSections(desired);
    renumberSteps();
  }

  // ---------- bootstrap ----------
  async function bootstrap() {
    try {
      const slug = getSlugFromLocation();
      if (!slug) { console.warn("No slug found"); return; }

      const dataUrl = "/data/" + slug + ".json";
      const data = await loadJSON(dataUrl);
      window.DM_DATA = data; // expose for skin if needed

      // UI metadata and ordering (shared, but can be overridden per slug)
      applyUiMeta(data);

      // Select-all behavior for guest fields
      ["adults", "teens", "children"].forEach(selectAllBehavior);

      function recalc() {
        // Engine computes per-category logic; runner stays generic
        const inputs = readInputs();
        const result = window.DM && window.DM.engine && window.DM.engine.computeDessert
          ? window.DM.engine.computeDessert(data, inputs)
          : { rounded: 0, unit: "servings" };
        writeResults(result);
      }

      // Listen once for all future inputs
      ["input", "change"].forEach(function (evt) {
        qsa("input,select").forEach(function (el) {
          el.addEventListener(evt, recalc);
        });
      });

      recalc();
    } catch (err) {
      console.error(err);
      const errBox = qs("#error-box");
      if (errBox) errBox.textContent = "Error loading calculator.";
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();

