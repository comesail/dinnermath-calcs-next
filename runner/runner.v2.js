(function () {
  "use strict";

  // ===== Tiny DOM helpers =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const text = (node, value) => { if (node) node.textContent = value; };
  const N = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : (d || 0); };

  // ===== Data pack loader (reads <meta name="dm-data" ...>) =====
  const DATA_URL = document.querySelector('meta[name="dm-data"]')?.content || "";
  window.DM = window.DM || {};
  DM.Data = null;

  async function loadDataPack() {
    if (!DATA_URL) return;
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      DM.Data = await res.json();
      try { $("#adults")?.dispatchEvent(new Event("change", { bubbles: true })); } catch(_) {}
    } catch (e) {
      console.warn("Could not load data pack:", DATA_URL, e);
    }
  }

  // --- Compatibility helpers for legacy skins ---
  function pickVal(selectors, def="") {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.value != null) return el.value;
    }
    return def;
  }
  function pickNum(selectors, def=0) {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && el.value != null) {
        const n = parseFloat(el.value);
        if (Number.isFinite(n)) return n;
      }
    }
    return def;
  }
  function normalizeValue(kind, v) {
    v = (v || "").toString().trim().toLowerCase();
    if (kind === "appetite") {
      if (v === "typical" || v === "standard") return "moderate";
      if (v === "hearty") return "generous";
      if (v === "light") return "light";
      return "moderate";
    }
    if (kind === "role") {
      if (v === "main" || v === "only meat" || v === "only") return "only";
      if (v === "with another" || v === "alongside") return "alongside";
      if (v === "small") return "small";
      if (v === "tasting" || v === "bite") return "tasting";
      return "only";
    }
    if (kind === "cut") {
      if (v === "flat" || v === "flat cut") return "flat";
      if (v === "point" || v === "point cut") return "point";
      return "flat";
    }
    if (kind === "purchase") {
      if (v === "cooked" || v === "prepared") return "cooked";
      return "raw";
    }
    return v;
  }

  // ===== Inputs (supports new + legacy IDs/values) =====
  function getInputs() {
    const adults   = pickNum(["#adults", "#A"], 0);
    const teens    = pickNum(["#teens", "#T"], 0);
    const children = pickNum(["#children", "#C"], 0);

    const appetite = normalizeValue("appetite", pickVal(["#appetite"], "moderate"));
    const role     = normalizeValue("role",     pickVal(["#role", "#course"], "only"));
    const cut      = normalizeValue("cut",      pickVal(["#cut"], "flat"));
    const purchase = normalizeValue("purchase", pickVal(["#purchaseForm", "#form"], "raw"));

    return { adults, teens, children, appetite, role, cut, purchaseForm: purchase };
  }

  // ===== Lookups from DM.Data with safe fallbacks =====
  function getOption(block, id) {
    const arr = (block && Array.isArray(block.options)) ? block.options : [];
    const hit = arr.find(o => o.id === id) || arr.find(o => o.default) || arr[0];
    if (!hit) return { label: "", value: 1.00, id: "" };
    return { label: hit.label, whisper: hit.whisper, value: hit.value, id: hit.id, chips: hit.chips_text };
  }
  function getYieldForCut(cutId) {
    const y = DM.Data?.yields?.raw_to_cooked || {};
    const v = y[cutId]?.value;
    return Number.isFinite(v) ? v : 0.60;
  }
  function getAELadder() {
    const a = DM.Data?.ae_ladder || {};
    return {
      adult: Number.isFinite(a.adult) ? a.adult : 1.00,
      teen:  Number.isFinite(a.teen)  ? a.teen  : 0.80,
      child: Number.isFinite(a.child) ? a.child : 0.60
    };
  }
  function getBaselineAdultCookedOz() {
    const b = DM.Data?.baseline?.adult_cooked_oz;
    return Number.isFinite(b) ? b : 3.5;
  }
  function getRoundingStepLb() {
    const s = DM.Data?.rounding_rule || "0.25_lb";
    const num = parseFloat(String(s).split("_")[0]);
    return Number.isFinite(num) ? num : 0.25;
  }
  function roundToStep(n, step) {
    if (!Number.isFinite(n) || !Number.isFinite(step) || step <= 0) return 0;
    return Math.round(n / step) * step;
  }

  // ===== Core math (driven by JSON) =====
  function computeFromData(inputs) {
    const A = Number(inputs.adults || 0);
    const T = Number(inputs.teens || 0);
    const C = Number(inputs.children || 0);

    const AE = getAELadder();
    const adultBaseOz = getBaselineAdultCookedOz();
    const cookedOz = adultBaseOz * (A * AE.adult + T * AE.teen + C * AE.child);

    const appetiteOpt = getOption(DM.Data?.appetite, inputs.appetite);
    const roleOpt     = getOption(DM.Data?.role_meal_share, inputs.role);
    const appetiteMult = appetiteOpt.value ?? 1.00;
    const roleMult     = roleOpt.value ?? 1.00;

    let cookedLb = (cookedOz / 16) * appetiteMult * roleMult;

    const useYield = (inputs.purchaseForm === "cooked") ? false : true;
    const yieldFactor = getYieldForCut(inputs.cut);
    let primaryLb = useYield ? (yieldFactor >

