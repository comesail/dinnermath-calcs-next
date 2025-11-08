/* runner.v2.js (shared) - v5
   Loads /data/<slug>.json and merges /data/_registry/<category>.controls.json (if present).
   Works with Editorial v1.4 skin (ids s1,s2,s3,s5) without visual changes.
   ASCII only.
*/
(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  async function loadJSON(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load " + url);
    return await res.json();
  }

  function getSlugFromLocation() {
    const u = new URL(window.location.href);
    const p = u.searchParams.get("slug");
    if (p) return p;
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
    return { adults: A, teens: T, children: C, role: parseFloat(roleVal), appetite: parseFloat(appetiteVal), toppings_bar: toppingsBar };
  }

  function writeResults(result) {
    const numEl = qs("#result-number");
    if (numEl) {
      const n = (Math.round(result.rounded * 10) / 10).toFixed(1);
      const unit = result.unit || "servings";
      // Keep existing skins that include the unit in markup
      if (numEl.textContent && /servings/i.test(numEl.textContent)) {
        numEl.textContent = n + " " + unit;
      } else {
        numEl.textContent = n;
      }
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

  // Accept multiple possible selectors per logical key
  const SECTION_SELECTORS = {
    role:        ["#s1", "#section-role"],
    guests:      ["#s2", "#section-guests"],
    appetite:    ["#s3", "#section-appetite"],
    controls:    ["#s4", "#s5", "#section-controls"],
    eventLength: ["#s6", "#section-length"]
  };
  function resolveSectionEl(key) {
    const list = SECTION_SELECTORS[key] || [];
    for (const sel of list) {
      const el = qs(sel);
      if (el) return el;
    }
    return null;
  }

  function reorderSections(order) {
    const first = resolveSectionEl(order[0]);
    const container =
      qs("#inputs-container") ||
      (first ? first.parentElement : null) ||
      qs("main") ||
      document.body;
    if (!container || !order || !order.length) return;
    order.forEach(function (key) {
      const el = resolveSectionEl(key);
      if (el) container.appendChild(el);
    });
  }

  function renumberSteps() {
    const sections = qsa(".step, [data-step-section]");
    let idx = 1;
    sections.forEach(function (sec) {
      const hidden = sec.hasAttribute("hidden") || sec.style.display === "none";
      if (hidden) return;
      const lbl = qs(".step-label", sec);
      if (lbl) { lbl.textContent = String(idx); }
      // For skins using big background numerals
      const bg = qs(".bgnum", sec);
      if (bg) { bg.textContent = String(idx); }
      idx += 1;
    });
  }

  function applyUiMeta(data, regForSlug, regDefaults) {
    const title = (regForSlug?.ui?.title) || data?.ui?.title || data?.name || data?.display_name || data?.slug || "Calculator";
    const h1 = qs("#page-title") || qs("h1");
    if (h1) h1.textContent = title + " Quantity Calculator";
    document.title = title + " — DinnerMath";

    const roleFam = (regForSlug?.ui?.role_family) || data?.ui?.role_family || data?.role_family;
    if (roleFam) document.body.setAttribute("data-role-family", roleFam);

    const defaultOrderByCategory = {
      desserts: ["guests", "appetite", "role", "controls"],
      meat:     ["guests", "eventLength", "appetite", "role", "controls"],
      drinks:   ["guests", "eventLength", "appetite", "role", "controls"]
    };
    const cat = (data.category || "").toLowerCase();
    const order =
      (regForSlug?.ui?.input_order && regForSlug.ui.input_order.length && regForSlug.ui.input_order) ||
      (regDefaults?.input_order && regDefaults.input_order.length && regDefaults.input_order) ||
      defaultOrderByCategory[cat] ||
      ["guests", "appetite", "role", "controls"];
    reorderSections(order);
    renumberSteps();
  }

  function deepMergeInto(target, source) {
    if (!source || typeof source !== "object") return;
    Object.keys(source).forEach(function (k) {
      const sv = source[k];
      if (sv && typeof sv === "object" && !Array.isArray(sv)) {
        if (!target[k] || typeof target[k] !== "object") target[k] = {};
        deepMergeInto(target[k], sv);
      } else {
        target[k] = sv;
      }
    });
  }

  async function bootstrap() {
    try {
      const slug = getSlugFromLocation();
      if (!slug) { console.warn("No slug found"); return; }

      const dataUrl = "/data/" + slug + ".json";
      const data = await loadJSON(dataUrl);

      let reg = null, regForSlug = null, regDefaults = null;
      const cat = (data.category || "").toLowerCase();
      if (cat) {
        const regUrl = "/data/_registry/" + cat + ".controls.json";
        try {
          reg = await loadJSON(regUrl);
          regDefaults = reg?.defaults || null;
          regForSlug = reg?.slugs?.[slug] || null;
          if (regForSlug) deepMergeInto(data, regForSlug);
        } catch (e) { console.warn("No registry for category:", cat); }
      }

      window.DM_DATA = data;

      applyUiMeta(data, regForSlug, regDefaults);

      ["adults", "teens", "children"].forEach(selectAllBehavior);

      function recalc() {
        const inputs = readInputs();
        const result = window.DM && window.DM.engine && window.DM.engine.computeDessert
          ? window.DM.engine.computeDessert(data, inputs)
          : { rounded: 0, unit: "servings" };
        writeResults(result);
      }

      ["input", "change"].forEach(function (evt) {
        qsa("input,select").forEach(function (el) { el.addEventListener(evt, recalc); });
      });

      recalc();
    } catch (err) {
      console.error(err);
      const errBox = document.getElementById("error-box");
      if (errBox) errBox.textContent = "Error loading calculator.";
    }
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})();