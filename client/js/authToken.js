// authToken.js - attaches the admin token to every /api/ request.
// Load this BEFORE the module scripts. No changes needed in the modules:
// it wraps window.fetch, adds the X-Admin-Token header on budget API calls,
// and prompts for a token (once) if the server returns 401.
(() => {
  "use strict";

  const TOKEN_KEY = "budget_app_admin_token";
  const nativeFetch = window.fetch.bind(window);

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function promptForToken() {
    const value = window.prompt("Enter the admin access token for saved budgets:");
    if (value && value.trim()) {
      localStorage.setItem(TOKEN_KEY, value.trim());
      return true;
    }
    return false;
  }

  function isBudgetApiRequest(input) {
    const url = typeof input === "string" ? input : input?.url || "";
    return url.includes("/api/budgets");
  }

  window.fetch = async function patchedFetch(input, init = {}, isRetry = false) {
    if (!isBudgetApiRequest(input)) return nativeFetch(input, init);

    const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined) || {});
    const token = getToken();
    if (token) headers.set("X-Admin-Token", token);

    const response = await nativeFetch(input, { ...init, headers });

    if (response.status === 401 && !isRetry) {
      localStorage.removeItem(TOKEN_KEY);
      if (promptForToken()) return window.fetch(input, init, true);
    }

    return response;
  };
})();
