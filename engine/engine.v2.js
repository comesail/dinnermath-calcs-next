/* DinnerMath engine v2 (global refactor harness)
   Delegates compute/render to per-calculator CALC_CONFIG hooks.
   Requires engine-utils.js loaded first. No CSS or class changes. ASCII only. */

(function(global){
  "use strict";

  // Helpers
  function $(id){ return document.getElementById(id); }
  function N(v,d){ const n = parseFloat(v); return isFinite(n)? n : (d||0); }
  function money(n){ return (isFinite(n) && n>0) ? ("$" + n.toFixed(2)) : "$—"; }

  // Strong select-all on focus/click for numeric inputs
  function enableSelectAll(ids){
    (ids||[]).forEach(id=>{
      const el = $(id); if(!el) return;
      ["focus","click"].forEach(evt=>el.addEventListener(evt,()=>{ try{ el.select(); }catch(_){ /* no-op */ } }));
    });
  }

  function attachInputListeners(root, onChange){
    const scope = root || document;
    const handler = ()=>{ try{ onChange(); }catch(e){ /* no-op */ } };
    scope.querySelectorAll("input, select").forEach(el=>{
      el.addEventListener("input", handler);
      el.addEventListener("change", handler);
    });
  }

  function run(){
    const C = global.CALC_CONFIG || {};
    if(typeof EngineUtils === "undefined"){
      console.error("EngineUtils not found. Load engine-utils.js first.");
      return;
    }

    // Select-all handler as requested in project locks
    enableSelectAll(C.selectAllIds || []);

    // Optional calculator-specific init before matrix
    if(typeof C.init === "function"){ try{ C.init(); }catch(_){ } }

    // Apply inclusion matrix and pricing isolation
    EngineUtils.applyInclusionMatrix(C.inclusion || {}, C.idMap || {});
    EngineUtils.pricingIsolationGuard({ pricingSectionSelector: C.pricingSectionSelector || "section.pricing" });

    // Initial relabel of steps
    EngineUtils.relabelSteps();

    // Render pipeline
    function render(){
      if(typeof C.compute !== "function" || typeof C.onRender !== "function"){
        console.error("CALC_CONFIG must provide compute(stateHelpers) and onRender(state).");
        return;
      }
      const state = C.compute({ $, N, money });
      C.onRender(state, { $, N, money });
      EngineUtils.updateChips(state, {
        outChipsId: C.outChipsId || "outChips",
        inRoleId: C.inRoleId || "inRole",
        inAppetiteId: C.inAppetiteId || "inAppetite",
        foodChipIds: C.foodChipIds || []
      });
      // Relabel after any visibility toggles that happened inside onRender
      EngineUtils.relabelSteps();
    }

    // Attach listeners
    attachInputListeners(document.querySelector("main#calculator"), render);

    // Optional reset button
    if(C.resetButtonId){
      const b = $(C.resetButtonId);
      if(b && typeof C.onReset === "function"){
        b.addEventListener("click", ()=>{ try{ C.onReset(); render(); }catch(_){ } });
      }
    }

    // Compute once on load
    render();

    // Expose for debugging
    global.Engine = { run, render, $, N, money };
  }

  // Auto-run on DOM ready
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", run);
  }else{
    run();
  }

  // Also expose helpers
  global.Engine = Object.assign((global.Engine||{}), { run, $, N, money });

})(window);

