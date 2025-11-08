
window.DM = window.DM || {};
(function(){
  // Global spec constants for Desserts
  const AE = { adult:1.00, teen:0.75, child:0.50 };
  const APPETITE = { Light:0.90, Moderate:1.00, Generous:1.15 };
  const ROLE = [1.00, 0.60, 0.45, 0.35]; // internal order matches UI
  const LOCKS = { raw_to_cooked_yield: 1.00, toppings_cushion: 0.10 };

  function parseQty(str){
    if(!str) return {num:0, unit:''};
    const m = String(str).trim().match(/^([\d.\/]+)\s*(.*)$/);
    if(!m) return {num:0, unit:String(str).trim()};
    // support simple fractions like 1/2
    let n = 0;
    const t = m[1];
    if(t.includes('/')){
      const [a,b] = t.split('/').map(Number);
      n = (isFinite(a)&&isFinite(b)&&b)? (a/b) : Number(t);
    } else {
      n = Number(t);
    }
    return {num: n||0, unit:(m[2]||'').trim()};
  }

  function aeCount(A,T,C){
    return (A||0)*AE.adult + (T||0)*AE.teen + (C||0)*AE.child;
  }

  function applyHybridRounding(pieces, roundingUnit){
    // Unit-based rounding bias per spec:
    // if remainder >= 0.8 of next whole piece -> +1 (cap +1)
    // for groups <= 8 AE -> always round up to next whole
    const n = Number(pieces)||0;
    const base = Math.floor(n);
    const rem = n - base;
    if(n <= 8){ return Math.ceil(n); }
    if(rem >= 0.8) return base + 1;
    return Math.round(n);
  }

  function computeDessert(data, inputs){
    const base = parseQty(data.adult_cooked_baseline); // e.g., "1 slice", "1 piece", "1/2 cup"
    const ae = aeCount(inputs.adults, inputs.teens, inputs.children);
    const roleVal = Number(inputs.role || 1.00);
    const appetiteVal = Number(inputs.appetite || 1.00);

    // Baseline acts as per-person quantity in given unit
    let totalUnits = ae * base.num * roleVal * appetiteVal;

    // Food-specific: toppings bar adds +10% cushion (display-only elsewhere)
    if(inputs.toppings_bar === true){ totalUnits *= (1 + (data.toppings_cushion || LOCKS.toppings_cushion)); }

    // Apply Hybrid cushion note is display-only; rounding bias handled at unit level
    const roundedUnits = applyHybridRounding(totalUnits, data.rounding_increment);

    return {
      unit: base.unit || (data.primary_purchase_unit || 'pieces'),
      raw_estimate: totalUnits,
      rounded: roundedUnits
    };
  }

  window.DM.engine = {
    AE, APPETITE, ROLE, computeDessert, parseQty
  };
})();
