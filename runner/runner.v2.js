(function(){
  "use strict";
  const DM = window.DM || (window.DM = {});
  const log = (...args) => (console && console.debug ? console.debug("[runner]", ...args) : null);
  if (!DM.Engine) {
    DM.Engine = {
      calculate: function(inputs){
        const A = Number(inputs.adults || 0);
        const T = Number(inputs.teens || 0);
        const C = Number(inputs.children || 0);
        const appetiteMult = { light:0.90, moderate:1.00, generous:1.15 }[inputs.appetite || "moderate"];
        const roleMult = { main:1.00, alongside:0.60, small:0.45, tasting:0.35 }[inputs.role || "main"];
        const people = (A * 1.0) + (T * 0.75) + (C * 0.50);
        const result = people * appetiteMult * roleMult * 0.5;
        return {
          primaryValue: result,
          subLabel: `Estimated from ${A+T+C} guests.`,
          unit: "lb",
          chips: [
            `Appetite: ${capitalize(inputs.appetite || "Moderate")}`,
            inputs.role ? `Role: ${labelForRole(inputs.role)}` : null
          ].filter(Boolean)
        };
      }
    };
  }
  function capitalize(s){ return (s||"").toString().charAt(0).toUpperCase() + (s||"").toString().slice(1); }
  function labelForRole(v){
    switch(v){
      case "main": return "Main";
      case "alongside": return "Alongside";
      case "small": return "Small";
      case "tasting": return "Tasting";
      default: return v;
    }
  }
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  function text(node, value){ if (node) node.textContent = value; }
  function renumberSteps(){
    const steps = $$("#calc-sheet .step");
    let n = 1;
    steps.forEach(step => {
      const isResults = step.id === "results";
      const isPricing = step.id === "pricing";
      const isFinder  = step.id === "finder";
      const labelNode = $(".step-head .step-label", step);
      if (!labelNode) return;
      if (isResults) { text(labelNode, "RESULTS"); return; }
      if (isPricing) { text(labelNode, "PRICING"); return; }
      if (isFinder)  { text(labelNode, "FINDER");  return; }
      text(labelNode, `STEP ${n}`);
      n += 1;
    });
  }
  function applyInclusionMatrix(){
    const cfg = (window.dmConfig && window.dmConfig.controls) || {};
    const foodControls = $("#food-controls");
    if (!foodControls) return;
    const enable = (foodControls.getAttribute("data-enable") || "").toLowerCase();
    if (enable === "none") { foodControls.innerHTML = ""; return; }
    $$("#food-controls [data-control]").forEach(node => {
      const key = node.getAttribute("data-control");
      const rule = cfg[key];
      if (rule && rule.ui === "hidden") node.remove();
    });
  }
  function getInputs(){
    return {
      adults:   Number($("#adults")?.value || 0),
      teens:    Number($("#teens")?.value || 0),
      children: Number($("#children")?.value || 0),
      appetite: $("#appetite")?.value || "moderate",
      role:     $("#role")?.value || "main",
      purchaseForm: $("#purchaseForm")?.value || null,
      servingStyle: $("#servingStyle")?.value || null
    };
  }
  function renderChips(list){
    const wrap = $("#chips");
    if (!wrap) return;
    wrap.innerHTML = "";
    (list || []).forEach(textVal => {
      const span = document.createElement("span");
      span.className = "chip";
      span.textContent = textVal;
      wrap.appendChild(span);
    });
  }
  function renderResults(payload){
    const valNode = $("#resultPrimary");
    const subNode = $("#resultSub");
    if (!valNode || !subNode) return;
    const unit = payload.unit || "";
    const rounded = (Math.round((payload.primaryValue || 0) * 10) / 10).toFixed(1);
    text(valNode, `${rounded} ${unit}`.trim());
    text(subNode, payload.subLabel || "");
    renderChips(payload.chips || []);
  }
  function recalc(){
    try {
      const inputs = getInputs();
      const out = DM.Engine.calculate(inputs);
      renderResults(out || {});
    } catch (e){}
  }
  function enableSelectAll(ids){
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => el.select();
      el.addEventListener("focus", handler);
      el.addEventListener("click", handler);
    });
  }
  function wirePricing(){
    const price = $("#pricePerUnit");
    const tax   = $("#taxPercent");
    const fees  = $("#fees");
    const btn   = $("#pricing .btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("dm:pricing:estimate", {
        detail: {
          price: Number(price?.value || 0),
          tax: Number(tax?.value || 0),
          fees: Number(fees?.value || 0)
        }
      }));
    });
  }
  function wireListeners(){
    ["adults","teens","children","appetite","role","purchaseForm","servingStyle"].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      ["input","change"].forEach(evt => el.addEventListener(evt, recalc));
    });
  }
  function init(){
    renumberSteps();
    applyInclusionMatrix();
    enableSelectAll(["adults","teens","children"]);
    wireListeners();
    wirePricing();
    recalc();
  }
  if (document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", init); } else { init(); }
})();