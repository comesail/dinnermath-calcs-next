(function () {
  "use strict";

  // ===== Tiny DOM helpers =====
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const N  = (v, d=0) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
  const txt= (el, v) => { if (el) el.textContent = v; };

  // ===== Config: where to load JSON =====
  // Expect a <meta name="dm-data" content="RAW_JSON_URL"> in the skin.
  const DATA_URL = document.querySelector('meta[name="dm-data"]')?.content || "";

  // ===== Global namespace =====
  window.DM = window.DM || {};
  DM.Data = null;

  // ===== Elements (expected IDs in skins) =====
  const adults   = $("#adults");
  const teens    = $("#teens");
  const children = $("#children");
  const appetite = $("#appetite");
  const role     = $("#role");
  const cut      = $("#cut");
  const purchase = $("#purchaseForm");

  const estLb   = $("#estLb");
  const summary = $("#summary");

  const priceInp = $("#price");
  const taxInp   = $("#tax");
  const feesInp  = $("#fees");

  const subtotalEl = $("#subtotal");
  const taxamtEl   = $("#taxamt");
  const totalEl    = $("#total");
  const perEl      = $("#perperson");

  // ===== UX niceties =====
  function selectAll(e){ e.target.select(); }
  [adults,teens,children].forEach(el=>{
    if (!el) return;
    el.addEventListener("focus", selectAll);
    el.addEventListener("click", selectAll);
  });
  adults?.focus(); adults?.select();

  // Quick presets + Reset (optional, only if present in skin)
  $$(".pill[data-preset]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const v = N(btn.getAttribute("data-preset"), 0);
      if (adults) adults.value = String(v);
      if (teens) teens.value = "0";
      if (children) children.value = "0";
      recalc();
    });
  });
  $("#reset")?.addEventListener("click", ()=>{
    if (adults) adults.value="5";
    if (teens) teens.value="0";
    if (children) children.value="0";
    if (appetite) appetite.value="moderate";
    if (role)     role.value="only";
    if (cut)      cut.value="flat";
    if (purchase) purchase.value="raw";
    if (priceInp) priceInp.value="0";
    if (taxInp)   taxInp.value="0";
    if (feesInp)  feesInp.value="0";
    recalc();
  });

  // ===== Data loading =====
  async function loadDataPack() {
    if (!DATA_URL) { console.warn("No dm-data meta URL found."); return; }
    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      DM.Data = await res.json();
      // Fire once so initial UI fills
      try { adults?.dispatchEvent(new Event("change", { bubbles: true })); } catch(_) {}
      recalc();
    } catch (e) {
      console.warn("Could not load data pack:", DATA_URL, e);
    }
  }

  // ===== Lookups =====
  function getOption(block,id){
    const arr = Array.isArray(block?.options) ? block.options : [];
    return arr.find(o=>o.id===id) || arr.find(o=>o.default) || arr[0] || {value:1,label:""};
  }
  function getYieldForCut(id){
    const v = DM.Data?.yields?.raw_to_cooked?.[id]?.value;
    return Number.isFinite(v) ? v : 0.60;
  }
  function ae(){ const a=DM.Data?.ae_ladder||{}; return {adult:N(a.adult,1),teen:N(a.teen,0.8),child:N(a.child,0.6)}; }
  function adultBaseOz(){ return N(DM.Data?.baseline?.adult_cooked_oz,3.5); }
  function roundStep(){ const s=DM.Data?.rounding_rule||"0.25_lb"; return N(String(s).split("_")[0],0.25); }
  function roundTo(n,step){ return step>0 ? Math.round(n/step)*step : n; }

  // ===== Core math =====
  function compute(){
    const A = N(adults?.value,0), T = N(teens?.value,0), C = N(children?.value,0);
    const ladder = ae();

    const cookedOz = adultBaseOz() * (A*ladder.adult + T*ladder.teen + C*ladder.child);

    const app = getOption(DM.Data?.appetite, appetite?.value).value ?? 1.0;
    const rol = getOption(DM.Data?.role_meal_share, role?.value).value ?? 1.0;

    let cookedLb = (cookedOz/16) * app * rol;

    const isCookedPurchase = (purchase?.value === "cooked");
    const y = getYieldForCut(cut?.value || "flat");
    let primaryLb = isCookedPurchase ? cookedLb : (y>0 ? cookedLb / y : cookedLb);

    primaryLb = roundTo(primaryLb, roundStep());
    if (!Number.isFinite(primaryLb)) primaryLb = 0;

    const guests = A+T+C;

    // Pricing
    const price = N(priceInp?.value,0);
    const taxPct= N(taxInp?.value,0)/100;
    const fees  = N(feesInp?.value,0);

    const subtotal = primaryLb * price;
    const taxAmt   = subtotal * taxPct;
    const total    = subtotal + taxAmt + fees;
    const per      = guests>0 ? total/guests : 0;

    return {A,T,C,primaryLb,cookedLb,guests,subtotal,taxAmt,total,per};
  }

  function recalc(){
    if (!DM.Data) return;
    const r = compute();

    txt(estLb, (r.primaryLb||0).toFixed(1) + " lb");

    const appLabel = getOption(DM.Data?.appetite, appetite?.value).label || "Moderate";
    const roleShort = {only:"Only",alongside:"Alongside",small:"Small",tasting:"Tasting"}[role?.value || "only"] || "Only";
    const cutShort  = {flat:"Flat", point:"Point"}[cut?.value || "flat"] || "Flat";
    txt(summary, `Guests: ${r.A}/${r.T}/${r.C} · Appetite: ${appLabel.split(" — ")[0]} · Role: ${roleShort} · Cut: ${cutShort}`);

    txt(subtotalEl, "$" + (r.subtotal||0).toFixed(2));
    txt(taxamtEl,   "$" + (r.taxAmt||0).toFixed(2));
    txt(totalEl,    "$" + (r.total||0).toFixed(2));
    txt(perEl,      "$" + (r.per||0).toFixed(2));
  }

  // ===== Bind and start =====
  [adults,teens,children,appetite,role,cut,purchase,priceInp,taxInp,feesInp].forEach(el=>{
    el?.addEventListener("input", recalc);
    el?.addEventListener("change", recalc);
  });

  loadDataPack();
})();
