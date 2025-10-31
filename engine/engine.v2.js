/* DinnerMath engine v2
   File: /engine/engine.v2.js
   Purpose: shared behaviors + ladders + compute pipeline for Editorial Skin v1.1
   Notes:
   - ASCII only
   - No HTML in this file
   - Calculator pages can supply either window.DM_COMPUTE(ctx) and window.DM_RENDER(out),
     OR a legacy window.compute(ctx). If both exist, DM_COMPUTE wins.
*/
(function () {
  "use strict";

  // ---------- Helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

  const pow10 = n => Math.pow(10, n);
  const fmtNum = (n, d = 2) => {
    if (!isFinite(n)) return "";
    const s = (Math.round(n * pow10(d)) / pow10(d)).toFixed(d);
    return String(s).replace(/\.?0+$/, "");
  };
  const money = (n) => isFinite(n) ? "$" + fmtNum(n, 2) : "$-";
  const roundTo = (n, step = 0.25, mode = "nearest") => {
    if (!isFinite(n)) return 0;
    if (mode === "up")   return Math.ceil(n / step) * step;
    if (mode === "down") return Math.floor(n / step) * step;
    return Math.round(n / step) * step;
  };

  // ---------- Locked ladders (v1.8) ----------
  const APPETITE = { Light: 0.90, Moderate: 1.00, Generous: 1.15 };
  const EVENT_LENGTH = { Short: 0.75, Standard: 1.00, Long: 1.25, Extended: 1.50 };
  // Category wording varies in UI; values are stable
  const ROLE_MEAL_SHARE = { Full: 1.00, Major: 0.60, Supporting: 0.45, Small: 0.35 };
  const LEFTOVERS = {
    mains: { None: 1.00, Some: 1.10, Plenty: 1.20 },
    desserts: { None: 1.00, Some: 1.05, Plenty: 1.10 }
  };

  // ---------- Input wiring ----------
  function applyNumericOnly(input) {
    if (!input) return;
    input.setAttribute("inputmode", "numeric");
    input.setAttribute("pattern", "[0-9]*");
    input.addEventListener("input", () => {
      // strip non-digits
      const cleaned = input.value.replace(/[^\d]/g, "");
      if (cleaned !== input.value) input.value = cleaned;
    });
  }

  function applySelectAllStrong(input) {
    if (!input) return;
    const selectAll = () => { try { input.select(); } catch (_) {} };
    input.addEventListener("focus", selectAll);
    input.addEventListener("click", selectAll);
  }

  function wireGuestInputs(ids) {
    ["adults", "teens", "children"].forEach((k) => {
      const node = $("#" + ids[k]);
      applyNumericOnly(node);
      applySelectAllStrong(node);
    });
  }

  // ---------- Context collection ----------
  function getValueFromSelect(idOrNode, fallback) {
    const node = typeof idOrNode === "string" ? $("#" + idOrNode) : idOrNode;
    if (!node) return fallback;
    const raw = node.value;
    const asNum = Number(raw);
    return isFinite(asNum) && raw !== "" ? asNum : fallback;
  }

  function parseIntSafe(nodeOrId, fallback) {
    const node = typeof nodeOrId === "string" ? $("#" + nodeOrId) : nodeOrId;
    if (!node) return fallback;
    const n = parseInt(node.value, 10);
    return isFinite(n) ? n : fallback;
    }

  function collectContext(opts) {
    const ids = opts.ids || {};
    const category = opts.category || "mains"; // "mains" or "desserts"

    const A = parseIntSafe(ids.adults || "adults", 0);
    const T = parseIntSafe(ids.teens || "teens", 0);
    const C = parseIntSafe(ids.children || "children", 0);

    // These selects should store numeric values matching the ladders
    const appetite = getValueFromSelect(ids.appetite || "appetite", 1.00);
    const role     = getValueFromSelect(ids.role || "role", 1.00);
    const length   = getValueFromSelect(ids.length || "length", 1.00);
    const leftovers = getValueFromSelect(ids.leftovers || "leftovers", 1.00);

    // Any calculator-specific extras (ex: cut yield) can be fetched here if provided
    // Example ID: "cutYield" holding a decimal like 0.60 for 40 percent shrink
    const cutYield = getValueFromSelect(ids.cutYield || "cutYield", 1.00);

    const guests = { adults: A, teens: T, children: C, total: A + T + C };

    return {
      guests,
      factors: {
        appetite,
        role,
        length,
        leftovers,
        cutYield
      },
      ladders: { APPETITE, EVENT_LENGTH, ROLE_MEAL_SHARE, LEFTOVERS },
      category,
      util: { fmtNum, money, roundTo, el, $, $$ }
    };
  }

  // ---------- Main boot / pipeline ----------
  function triggerCompute(ctx) {
    // New-style
    if (typeof window.DM_COMPUTE === "function") {
      const out = window.DM_COMPUTE(ctx) || {};
      if (typeof window.DM_RENDER === "function") window.DM_RENDER(out, ctx);
      return;
    }
    // Legacy fallback
    if (typeof window.compute === "function") {
      window.compute(ctx);
      return;
    }
    console.warn("DinnerMath engine: no compute function found");
  }

  function init(opts = {}) {
    const ids = Object.assign({
      adults: "adults",
      teens: "teens",
      children: "children",
      appetite: "appetite",
      role: "role",
      length: "length",
      leftovers: "leftovers",
      cutYield: "cutYield"
    }, opts.ids || {});

    // Strong wiring on guest inputs
    wireGuestInputs(ids);

    // Recompute on any change inside #calculator or body if not present
    const root = $("#calculator") || document.body;
    root.addEventListener("change", onChange, true);
    root.addEventListener("input", onChange, true);

    // Initial compute after DOM is ready
    setTimeout(() => onChange(), 0);

    function onChange() {
      const ctx = collectContext({ ids, category: opts.category || "mains" });
      window.DM_CONTEXT = ctx; // exposed for debugging
      triggerCompute(ctx);
    }
  }

  // ---------- Public API ----------
  window.DM = Object.freeze({
    init,
    collectContext,
    fmtNum,
    money,
    roundTo,
    ladders: { APPETITE, EVENT_LENGTH, ROLE_MEAL_SHARE, LEFTOVERS }
  });

})();
