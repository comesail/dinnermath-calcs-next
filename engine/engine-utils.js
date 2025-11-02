/* DinnerMath engine-utils v1.0 (global refactor)
   Utilities for dynamic step labels, pricing isolation, inclusion matrix, and chips.
   No CSS or class changes. ASCII only. */

(function(global){
  "use strict";

  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  // 1) Dynamic step relabeling: renumber visible .step-label sections 1..N
  function relabelSteps(){
    const sections = qsa("main#calculator section.card")
      .filter(sec => !!sec.querySelector(".step-label") && sec.style.display !== "none" && !sec.hidden);
    let n = 1;
    sections.forEach(sec=>{
      const labelEl = sec.querySelector(".step-label");
      if(!labelEl) return;
      const parts = String(labelEl.textContent).split("•");
      const tail = parts.length>1 ? parts[1].trim() : String(labelEl.textContent).replace(/STEP\s*\d+/i,"").trim();
      labelEl.textContent = "STEP " + n + " • " + tail;
      sec.setAttribute("aria-label","STEP " + n);
      n++;
    });
  }

  // 2) Pricing isolation: move any price inputs outside Pricing into a receiver inside Pricing
  function pricingIsolationGuard(opts){
    const cfg = Object.assign({
      pricingSectionSelector: "section.pricing",
      priceInputSelector: 'input[id^="in"][id$="Price"]',
      receiverId: "pricingDynamic",
      receiverHeading: "Additional item prices"
    }, opts||{});

    const pricing = document.querySelector(cfg.pricingSectionSelector);
    if(!pricing) return;

    let receiver = pricing.querySelector("#" + cfg.receiverId);
    if(!receiver){
      receiver = document.createElement("div");
      receiver.id = cfg.receiverId;
      receiver.className = "card";
      receiver.style.margin = "0";
      const h = document.createElement("h3");
      h.textContent = cfg.receiverHeading;
      h.style.margin = "0 0 8px";
      receiver.appendChild(h);
      (pricing.querySelector(".row-2") || pricing).appendChild(receiver);
    }

    qsa(cfg.priceInputSelector).forEach(inp=>{
      const inPricing = !!inp.closest(cfg.pricingSectionSelector);
      if(!inPricing){
        const wrapper = inp.closest("div");
        if(wrapper) receiver.appendChild(wrapper);
      }
    });
  }

  // 3) Inclusion matrix applier
  // inclusion: { key: {ui:true|false, math:true|false, chips:true|false}, ... }
  // idMap: { key: "elementId" }
  function applyInclusionMatrix(inclusion, idMap){
    if(!inclusion || !idMap) return;
    Object.entries(inclusion).forEach(([key,flags])=>{
      const id = idMap[key];
      if(!id) return;
      const el = document.getElementById(id);
      if(!el) return;
      const wrap = el.closest("div");
      if(flags.ui === false){
        if(wrap) wrap.style.display = "none";
        el.setAttribute("data-hidden-ui","1");
      }else{
        if(wrap) wrap.style.display = "";
        el.removeAttribute("data-hidden-ui");
      }
      el.setAttribute("data-math", (flags.math===false ? "0" : "1"));
      el.setAttribute("data-chips", (flags.chips===false ? "0" : "1"));
    });
  }

  // 4) Chips updater
  // state: calculator state returned from compute()
  // opts: { outChipsId, inRoleId, inAppetiteId, foodChipIds: [{id,label}], requiredAlways:["Guests","Role","Appetite"] }
  function updateChips(state, opts){
    const cfg = Object.assign({
      outChipsId: "outChips",
      inRoleId: "inRole",
      inAppetiteId: "inAppetite",
      foodChipIds: []
    }, opts||{});

    const wrap = document.getElementById(cfg.outChipsId);
    if(!wrap) return;
    wrap.innerHTML = "";
    if(!(state && state.guests > 0)) return;

    function chip(text){
      const el = document.createElement("span");
      el.className = "chip";
      el.textContent = text;
      return el;
    }

    // Required chips
    wrap.appendChild(chip("Guests: " + String(state.guests)));
    const roleEl = document.getElementById(cfg.inRoleId);
    if(roleEl && roleEl.selectedOptions && roleEl.selectedOptions[0]){
      const roleText = roleEl.selectedOptions[0].textContent.split(" — ")[0];
      wrap.appendChild(chip("Role: " + roleText));
    }
    const appetEl = document.getElementById(cfg.inAppetiteId);
    if(appetEl && appetEl.selectedOptions && appetEl.selectedOptions[0]){
      const appetText = appetEl.selectedOptions[0].textContent.split(" — ")[0];
      wrap.appendChild(chip("Appetite: " + appetText));
    }

    // Optional food-specific chips
    cfg.foodChipIds.forEach(def=>{
      const el = document.getElementById(def.id);
      if(!el) return;
      const show = el.getAttribute("data-chips")==="1" && el.getAttribute("data-hidden-ui")!=="1";
      if(!show) return;
      const text = el.tagName==="SELECT"
        ? (el.selectedOptions[0] ? el.selectedOptions[0].textContent.split(" — ")[0] : "")
        : el.value;
      if(text) wrap.appendChild(chip(def.label + ": " + text));
    });
  }

  global.EngineUtils = {
    relabelSteps,
    pricingIsolationGuard,
    applyInclusionMatrix,
    updateChips
  };

})(window);
