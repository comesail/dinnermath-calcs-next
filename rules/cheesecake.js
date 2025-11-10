// Auto-generated rules module for Dessert calculator
(function(){
  const AE = { adult:1.00, teen:0.75, child:0.50 };
  function num(s){
    if(!s) return 0;
    s=String(s).trim();
    if(s.includes('/')){ const a=s.split('/'); const A=Number(a[0]),B=Number(a[1]); if(isFinite(A)&&isFinite(B)&&B){ return A/B; } }
    const n = Number(s.replace(/[^0-9.]/g,'')); return isFinite(n)?n:0;
  }
  function parseBaseline(str, fallbackUnit){
    const m = (str||'').match(/^([\d.\/]+)\s*(.+)?$/);
    return { n: m? num(m[1]) : 0, u: (m&&m[2])?m[2].trim():(fallbackUnit||'servings') };
  }
  function roundDessert(n){
    n=Number(n)||0; const base=Math.floor(n), rem=n-base;
    if(n<=8) return Math.ceil(n);
    if(rem>=0.8) return base+1;
    return Math.round(n);
  }

  const BASE = parseBaseline("1 slice","pieces");

  window.DM_COMPUTE = function(inputs){
    const A = (inputs.adults||0)*AE.adult + (inputs.teens||0)*AE.teen + (inputs.children||0)*AE.child;
    const role = Number(inputs.role||1.00);
    const appetite = Number(inputs.appetite||1.00);
    let total = A * BASE.n * role * appetite;
    if(inputs.toppings===true){ total *= 1.10; }
    const rounded = roundDessert(total);
    return { value: rounded, unit: BASE.u };
  };
    // --- Cheesecake UI & Copy (adds the category-specific text and hides Step 4) ---
  window.DM_UI = {
    itemControls: [],
    hideItemInputs: true,
    pricingUnitLabel: 'per slice'
  };

  window.DM_COPY = {
    h1: 'Cheesecake Quantity Calculator',
    lede2: 'We start with a standard slice and customize for guests, appetite, and role.',
    results: {
      label: 'Estimated number of pieces to buy',
      second_line: 'Estimated from {guests} guests – cheesecake slice{appetite}{role}.',
      note: 'The estimate includes a small built-in cushion. Additional rounding is usually not needed.'
    }
  };
  // --- Force result label & optional secondary/extra lines (no skin edit needed)
window.DM_RESULT_LABEL = 'Estimated number of slices to buy';    // replaces "Estimated servings"
window.DM_SECONDARY    = '';                                      // e.g., 'About 1 cake total.' (optional)
window.DM_EXTRA        = '';                                      // another optional clarifier

// --- Show Step 4 again (you can flip this later per item)
if (window.DM_UI) window.DM_UI.hideItemInputs = false;

// --- Make sure the calculator returns the unit you want
// If your DM_COMPUTE already exists, just ensure it returns { value, unit: 'slice' }
window.DM_COMPUTE = window.DM_COMPUTE || function (inp) {
  const AE = inp.adults + 0.75*inp.teens + 0.50*inp.children;
  const baseline = 1;               // 1 slice baseline for desserts
  const value = AE * baseline * inp.role * inp.appetite;
  return { value, unit: 'slice' };
};

})();   // <-- Leave this line exactly where it is!
