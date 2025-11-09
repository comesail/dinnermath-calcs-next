/* DinnerMath — Brownies rules (handhelds)
   Placement: /rules/brownies.js
   Purpose: 1) Patch the shared skin’s labels/controls for brownies
            2) Define calculator math via DM_COMPUTE (returns { value, unit })
            3) Nudge results wording from “servings” → “pieces”
   Notes:
   - Event Length is hidden for Desserts (handled by shared skin).
   - Dessert yield lock = 1.00 (handled globally).
   - “Toppings bar” adds +10% cushion.
   - Style / pan / pack are display-only (do not change quantity).
*/

// ---- Calculator math (quantity) -------------------------------------------

window.DM_COMPUTE = function DM_COMPUTE(opts) {
  const A = Number(opts.adults   || 0);
  const T = Number(opts.teens    || 0);
  const C = Number(opts.children || 0);

  // Dessert AE factors (Unified Spec / Dessert Addendum)
  const ae = A + 0.75*T + 0.50*C;

  // Role & Appetite come from the page radios
  const role     = Number(opts.role     || 1.00);   // 1.00 / 0.60 / 0.45 / 0.35
  const appetite = Number(opts.appetite || 1.00);   // 0.90 / 1.00 / 1.15

  // Dessert yield lock = 1.00 (already locked globally). Baseline = 1 piece.
  let pieces = ae * role * appetite;

  // +10% cushion when toppings bar is present
  if (opts.toppings === true || opts.toppings === 'yes') {
    pieces *= 1.10;
  }

  // Round for shopping: whole pieces, bias small remainder up slightly.
  // (Simple rule: round to nearest; if remainder >= .80, push to next integer.)
  const whole = Math.floor(pieces);
  const rem   = pieces - whole;
  const final = rem >= 0.80 ? whole + 1 : Math.round(pieces);

  return { value: final, unit: 'pieces' };
};


// ---- UI patching for the shared skin --------------------------------------

(function bootstrapBrowniesUI() {
  // 1) Replace Role/Meal-Share copy for brownies (handhelds set)
  try {
    // The shared skin has four role cards with inputs values 1.00 / 0.60 / 0.45 / 0.35
    const roleCards = document.querySelectorAll('input[name="role"]');
    roleCards.forEach((inp) => {
      const card = inp.closest('.card-opt');
      if (!card) return;
      const ttl = card.querySelector('.ttl');
      const sub = card.querySelector('.sub');

      if (inp.value === '1.00') {
        if (ttl) ttl.textContent = 'This is the only dessert being served.';
        if (sub) sub.textContent = 'Allows for full servings — 1 to 1½ standard brownie squares per person.';
      } else if (inp.value === '0.60') {
        if (ttl) ttl.textContent = 'There will be two or more desserts offered.';
        if (sub) sub.textContent = 'Allows for smaller servings — 1 standard brownie square per person.';
      } else if (inp.value === '0.45') {
        if (ttl) ttl.textContent = 'I only want to serve a small portion of this dessert.';
        if (sub) sub.textContent = 'Allows for just a taste — 1 brownie square for every 2 people.';
      } else if (inp.value === '0.35') {
        if (ttl) ttl.textContent = 'This is just a small treat to end the meal.';
        if (sub) sub.textContent = 'Allows for minis — 2 to 3 mini brownie squares per person.';
      }
    });

    // Update the role question text to match Dessert spec phrasing
    const roleQ = document.querySelector('#s1 .q');
    if (roleQ) roleQ.textContent = 'Will this be the only dessert you’re serving?';
    const roleHelp = document.querySelector('#s1 .helper');
    if (roleHelp) roleHelp.textContent = 'We will use this starting portion to customize your results.';
  } catch (e) { console.warn('Role copy patch skipped:', e); }

  // 2) Replace Step 4 (Dessert options) with brownie-specific controls
  try {
    const box = document.querySelector('#s5 .row');
    if (box) {
      box.innerHTML = `
        <div>
          <label>Serving style</label>
          <select id="style">
            <option value="standard">Squares ~2×2 in (standard)</option>
            <option value="mini">Mini bites</option>
            <option value="large">Large cafe-style</option>
          </select>
        </div>
        <div>
          <label>Buying mode</label>
          <select id="source">
            <option value="homemade">Homemade (by pan)</option>
            <option value="store">Store-bought (by pack)</option>
          </select>
        </div>
        <div>
          <label>Homemade pan size</label>
          <select id="panSize">
            <option value="9x13">9×13 (about 16 pieces)</option>
            <option value="9x9">9×9 (about 12 pieces)</option>
            <option value="8x8">8×8 (about 9 pieces)</option>
          </select>
        </div>
        <div>
          <label>Store pack yield</label>
          <input id="packYield" type="number" min="1" value="12" />
        </div>
        <div>
          <label>Toppings bar</label>
          <select id="toppings">
            <option value="no">No</option>
            <option value="yes">Yes — add toppings bar (+10%)</option>
          </select>
        </div>
      `;

      // These controls are display-only except toppings → quantity
      ['change', 'input'].forEach(evt => {
        box.addEventListener(evt, () => {
          if (typeof window.updateAll === 'function') window.updateAll();
        });
      });
    }
    const s5Title = document.querySelector('#s5 .q');
    if (s5Title) s5Title.textContent = 'Dessert options';
  } catch (e) { console.warn('Options block patch skipped:', e); }

  // 3) Change results wording from “servings” → “pieces” and header label
  try {
    const hdr = document.querySelector('#box-results h3');
    if (hdr) hdr.textContent = 'Estimated pieces to buy';

    // Monkey-patch renderResults to swap the unit text every time it runs
    if (typeof window.renderResults === 'function' && !window.__DM_patched_results__) {
      const prev = window.renderResults;
      window.renderResults = function patchedRender() {
        prev();
        const out = document.getElementById('result-number');
        if (out) out.textContent = out.textContent.replace(/\bservings\b/i, 'pieces');
      };
      window.__DM_patched_results__ = true;
      // Run once now in case the page already rendered
      try { window.renderResults(); } catch {}
    }
  } catch (e) { console.warn('Results wording patch skipped:', e); }

  // 4) Hook toppings value so DM_COMPUTE receives it (used for +10%)
  function readToppings() {
    const el = document.getElementById('toppings');
    const v  = el ? el.value : 'no';
    return v === 'yes' ? 'yes' : 'no';
  }

  // Patch updateAll() so it forwards toppings to DM_COMPUTE via a global
  // (The shared skin already calls updateAll → renderResults → calcServings → DM_COMPUTE.)
  if (!window.__DM_forward_toppings__) {
    const send = () => { window.__DM_TOPPINGS__ = readToppings(); };
    document.addEventListener('DOMContentLoaded', send);
    document.addEventListener('input', send, true);
    document.addEventListener('change', send, true);
    window.__DM_forward_toppings__ = true;
  }

  // Small helper so calcServings can read toppings consistently
  if (!window.__dm_get_toppings) {
    window.__dm_get_toppings = () => (window.__DM_TOPPINGS__ === 'yes' ? 'yes' : 'no');
  }
})();


// ---- (Optional) helper for existing calcServings integration ---------------
// If your calcServings() already collects adults/teens/children/role/appetite
// and calls DM_COMPUTE({...}), please also pass toppings like this:
//   toppings: (window.__dm_get_toppings ? window.__dm_get_toppings() : 'no')
// If you can’t modify calcServings, the monkey-patch above still updates the
// displayed unit to “pieces”, and DM_COMPUTE will default toppings to “no”.
