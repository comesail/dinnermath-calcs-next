/* DinnerMath runner v2
   File: /runner/runner.v2.js
   Purpose: minimal startup for Editorial Skin v1.1 pages.
   Behavior:
   - Sets robots based on DM_IS_DRAFT.
   - Calls DM.init() once the DOM is ready.
   - No JSON fetch, no extras.
   - ASCII only.
*/
(function () {
  "use strict";

  // Flip to false when you are ready to let search engines index.
  window.DM_IS_DRAFT = (typeof window.DM_IS_DRAFT === "boolean") ? window.DM_IS_DRAFT : true;

  // Inject robots meta
  (function applyRobots(){
    try {
      var m = document.createElement("meta");
      m.name = "robots";
      m.content = window.DM_IS_DRAFT ? "noindex,nofollow" : "index,follow";
      document.head.appendChild(m);
    } catch (_) {}
  })();

  // DOM ready helper
  function ready(fn){
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  // Boot the engine with stable defaults
  ready(function () {
    if (!window.DM || typeof DM.init !== "function") {
      console.warn("DinnerMath runner: DM engine not found");
      return;
    }
    DM.init({
      // Change globally by setting window.DM_CATEGORY before load if needed.
      category: (window.DM_CATEGORY || "mains"),
      // Override by setting window.DM_IDS = {adults:"...", ...} before load if your IDs differ.
      ids: (window.DM_IDS || {
        adults: "adults",
        teens: "teens",
        children: "children",
        appetite: "appetite",
        role: "role",
        length: "length",
        leftovers: "leftovers",
        cutYield: "cutYield"
      })
    });
  });

})();
