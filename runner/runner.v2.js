(function () {
  "use strict";

  // ===== Helpers (DOM + small utils) =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const text = (node, value) => { if (node) node.textContent = value; };
  const N = (v, d) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : (d || 0);
  };

  // ===== Your existing math, preserved =====
  const DM = window.DM || (window.DM = {});
  if (!DM.Engine) DM.Engine = {};
  DM.Engine.calculate = function (inputs) {
    const A = Number(inputs.adults || 0);
    const T = Number(inputs.teens || 0);
    const C = Number(inputs.children || 0);

    const appetiteMult = { light: 0.90, moderate: 1.00, generous: 1.15 }[inputs.appetite || "moderate"];
    const roleMult = { main: 1.00, alongside: 0.60, small: 0.45, tasting: 0.35 }[inputs.role || "main"];

    const people = (A * 1.0) + (T * 0.75) + (C * 0.50);
    const result = people * appetiteMult * roleMult * 0.5;

    return {
      primaryValue: result,
      subLabel: `Estimated from ${A + T + C} guests.`,
      unit: "lb",
      chips: [
        `Appetite: ${capitalize(inputs.appetite || "Moderate")}`,
        inputs.role ? `Role: ${labelForRole(inputs.role)}` : null
      ].filter(Boolean)
    };
  };

  function capitalize(s) {
    s = (s || "").toString();
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function labelForRole(v) {
    switch (v) {
      case "main": return "Main";
      case "alongside": return "Alongside";
      case "small": return "Small";
      case "tasting": return "Tasting";
      default: return v;
    }
  }

  // ===== Input & render helpers (kept from your runner) =====
  function getInputs() {
    return {
      adults:   N($("#adults")?.value, 0),
      teens:    N($("#teens")?.value, 0),
      children: N($("#children")?.value, 0),
      appetite: $("#appetite")?.value || "moderate",
      role:     $("#role")?.value || "main",
      purchaseForm: $("#purchaseForm")?.value || null,
      servingStyle: $("#servingStyle")?.value || null
    };
  }

  function renderChips(list) {
    const wrap = $("#chips"); // NOTE: your page uses #chips for the chips/output
    if (!wrap) return;
    wrap.innerHTML = "";
    (list || []).forEach(textVal => {
      const span = document.createElement("span");
      span.className = "chip";
      span.textContent = textVal;
      wrap.appendChild(span);
    });
  }

  function renderResults(payload) {
    const valNode = $("#resultPrimary");
    const subNode = $("#resultSub");
    if (!valNode || !subNode) return;
    const unit = payload.unit || "";
    const rounded = (Math.round((payload.primaryValue || 0) * 10) / 10).toFixed(1);
    text(valNode, `${rounded} ${unit}`.trim());
    text(subNode, payload.subLabel || "");
    renderChips(payload.chips || []);
  }

  // ===== CALC_CONFIG adapter for engine.v2 =====
  // Engine will call compute() on input/change and then onRender(state).
  // We keep compute very simple and let onRender call your existing math+render.
  window.CALC_CONFIG = {
    // Restores your "select-all on focus/click" for Adults/Teens/Children via engine.v2
    selectAllIds: ["adults", "teens", "children"],

    // Minimal state for chips/summary if needed
    compute: function (H) {
      const A = H.N(H.$("adults")?.value, 0);
      const T = H.N(H.$("teens")?.value, 0);
      const C = H.N(H.$("children")?.value, 0);
      const guests = (A || 0) + (T || 0) + (C || 0);
      return {
        guests,
        summary: "Guests: " + guests
      };
    },

    // Use your math and DOM rendering
    onRender: function (_state, _H) {
      try {
        const inputs = getInputs();
        const out = DM.Engine.calculate(inputs);
        renderResults(out || {});
      } catch (e) {
        // no-op, keep UI responsive even if something is missing
      }
    }
  };

  // No manual listeners here—engine.v2 attaches them for us.
  // Also no manual step renumbering—EngineUtils.relabelSteps() handles it.

})();

