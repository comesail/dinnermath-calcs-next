
(function(){
  async function loadJSON(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error('Failed to load '+url);
    return await res.json();
  }
  function getSlugFromLocation(){
    // Try ?slug= param first; else derive from previews/<slug>.html
    const u = new URL(window.location.href);
    const qs = u.searchParams.get('slug');
    if(qs) return qs;
    const match = u.pathname.match(/(?:\/|^)([^\/]+)\.html$/);
    return match ? match[1] : null;
  }
  function selectAllBehavior(id){
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('focus', function(){ this.select(); });
    el.addEventListener('click', function(){ this.select(); });
  }
  function readInputs(){
    const A = Number(document.getElementById('adults')?.value||0);
    const T = Number(document.getElementById('teens')?.value||0);
    const C = Number(document.getElementById('children')?.value||0);
    const role = document.querySelector('input[name="role"]:checked')?.value || '1.00';
    const appetite = document.querySelector('input[name="appetite"]:checked')?.value || '1.00';
    const toppings_bar = document.getElementById('toppings')?.value === 'yes';
    return {adults:A, teens:T, children:C, role:parseFloat(role), appetite:parseFloat(appetite), toppings_bar};
  }
  function writeResults(result, data){
    const numEl = document.getElementById('result-number');
    if(numEl){
      const n = (Math.round(result.rounded*10)/10).toFixed(1);
      numEl.textContent = n+' '+(result.unit || 'servings');
    }
    const summary = document.getElementById('input-summary');
    if(summary){
      const A = Number(document.getElementById('adults')?.value||0);
      const T = Number(document.getElementById('teens')?.value||0);
      const C = Number(document.getElementById('children')?.value||0);
      const ap = document.querySelector('input[name="appetite"]:checked')?.dataset?.label || 'Moderate';
      const rl = document.querySelector('input[name="role"]:checked')?.dataset?.label || 'Only dessert';
      summary.textContent = 'Guests: '+A+'/'+T+'/'+C+' · Appetite: '+ap+' · Role: '+rl;
    }
  }
  async function bootstrap(){
    const slug = getSlugFromLocation();
    if(!slug){ console.warn('No slug found'); return; }
    const dataUrl = '/data/'+slug+'.json';
    const data = await loadJSON(dataUrl);
    window.DM_DATA = data;

    ['adults','teens','children'].forEach(selectAllBehavior);

    function recalc(){
      const inputs = readInputs();
      const result = window.DM.engine.computeDessert(data, inputs);
      writeResults(result, data);
    }
    ['input','change'].forEach(evt => {
      document.querySelectorAll('input,select').forEach(el => el.addEventListener(evt, recalc));
    });
    recalc();
  }
  document.addEventListener('DOMContentLoaded', bootstrap);
})();
