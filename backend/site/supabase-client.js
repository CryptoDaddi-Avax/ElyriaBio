/* =====================================================================
   ELYRIA BIO  ·  SUPABASE CLIENT SHIM
   Thin wrapper the storefront + admin use to talk to the backend.
   If backend-config.js is empty, everything falls back gracefully to
   local browser storage so the site keeps working during setup.
   Load order on a page:  backend-config.js  ->  supabase-client.js
   ===================================================================== */
(function () {
  "use strict";
  var cfg = window.ELYRIA_BACKEND || {};
  var configured = !!(cfg.url && cfg.anonKey);
  var clientPromise = null;

  function getClient() {
    if (!configured) return Promise.resolve(null);
    if (clientPromise) return clientPromise;
    clientPromise = new Promise(function (resolve) {
      if (window.supabase && window.supabase.createClient) {
        return resolve(window.supabase.createClient(cfg.url, cfg.anonKey));
      }
      var s = document.createElement("script");
      s.src = "https://esm.sh/@supabase/supabase-js@2?bundle";
      s.type = "module";
      // esm module can't set window global directly; use UMD build instead:
      var u = document.createElement("script");
      u.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
      u.onload = function () { resolve(window.supabase.createClient(cfg.url, cfg.anonKey)); };
      u.onerror = function () { resolve(null); };
      document.head.appendChild(u);
    });
    return clientPromise;
  }

  window.ElyriaAPI = {
    configured: configured,

    // ---- storefront reads live stock for one product ----
    getStock: function (id) {
      return getClient().then(function (c) {
        if (!c) return null;
        return c.from("products").select("stock").eq("id", id).single()
          .then(function (r) { return r.data ? r.data.stock : null; })
          .catch(function () { return null; });
      });
    },

    // ---- storefront saves a "notify me" signup ----
    saveNotifySignup: function (id, name, email) {
      return getClient().then(function (c) {
        if (!c) return false;
        return c.from("notify_signups").insert({ product_id: id, name: name, email: email })
          .then(function (r) { return !r.error; })
          .catch(function () { return false; });
      });
    },

    // ---- admin: update a stock number ----
    setStock: function (id, qty) {
      return getClient().then(function (c) {
        if (!c) return false;
        return c.from("products").update({ stock: qty }).eq("id", id)
          .then(function (r) { return !r.error; });
      });
    },

    // ---- admin: trigger restock emails via the edge function ----
    sendRestockEmails: function (id) {
      if (!configured) return Promise.resolve({ error: "backend not configured" });
      return fetch(cfg.url + "/functions/v1/send-restock", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.anonKey },
        body: JSON.stringify({ product_id: id })
      }).then(function (r) { return r.json(); });
    }
  };
})();
