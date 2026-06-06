/* Per-deploy config. Overwritten at deploy time to point at the live backend.
   Leave window.__PP_API_BASE__ empty (or unset) to use http://localhost:3000. */
window.__PP_API_BASE__ = "https://preventive-api-production.up.railway.app";
