/* ============================================================
   ELYRIA BIO — CONSOLE / DATA LAYER
   Deterministic mock dataset (seeded) + localStorage persistence.
   Replace the generators with API calls at handoff — the shapes
   here mirror a typical commerce backend (orders, line items,
   customers, lots/COA, discounts).
   ============================================================ */
(function () {
  "use strict";

  /* ---------- seeded RNG (mulberry32) so metrics are stable ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function gauss(r, mean, sd) {
    var u = 1 - r(), v = r();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ---------- catalog (real Elyria SKUs) ---------- */
  // cost = our landed cost basis; used for margin. unit = sellable units on hand.
  var PRODUCTS = [
    { id: "tirz",    name: "GLP-2",          cat: "metabolic",  size: "10 mg",  price: 179,    cost: 71,   purity: "99.3%", stock: 38,  reorder: 40 },
    { id: "reta",    name: "GLP-3",          cat: "metabolic",  size: "10 mg",  price: 55.99,  cost: 21,   purity: "99.0%", stock: 22,  reorder: 35 },
    { id: "bpc157",  name: "BPC-157",              cat: "repair",     size: "10 mg",  price: 39.99,  cost: 9.4,  purity: "99.4%", stock: 412, reorder: 120 },
    { id: "tb500",   name: "TB-500",               cat: "repair",     size: "10 mg",  price: 44.99,  cost: 9.8,  purity: "99.2%", stock: 286, reorder: 120 },
    { id: "ghkcu",   name: "GHK-Cu",               cat: "longevity",  size: "50 mg",  price: 29.99,  cost: 6.1,  purity: "99.6%", stock: 540, reorder: 150 },
    { id: "ipa",     name: "Ipamorelin",           cat: "growth",     size: "10 mg",  price: 39.99,  cost: 11.2, purity: "99.5%", stock: 318, reorder: 120 },
    { id: "tesa",    name: "Tesamorelin",          cat: "growth",     size: "10 mg",  price: 49.99,  cost: 19,   purity: "99.2%", stock: 96,  reorder: 60 },
    { id: "cjcipa",  name: "CJC-1295/Ipamorelin",  cat: "growth",     size: "10 mg",  price: 47.99,  cost: 14.5, purity: "99.3%", stock: 174, reorder: 90 },
    { id: "epi",     name: "Epithalon",            cat: "longevity",  size: "10 mg",  price: 23.99,  cost: 5.8,  purity: "99.7%", stock: 263, reorder: 100 },
    { id: "semax",   name: "Semax",                cat: "longevity",  size: "10 mg",  price: 23.99,  cost: 6.4,  purity: "99.4%", stock: 198, reorder: 90 },
    { id: "selank",  name: "Selank",               cat: "longevity",  size: "10 mg",  price: 23.99,  cost: 6.6,  purity: "99.3%", stock: 156, reorder: 90 },
    { id: "mt2",     name: "Melanotan II",         cat: "metabolic",  size: "10 mg",  price: 23.99,  cost: 5.2,  purity: "99.1%", stock: 384, reorder: 120 },
    { id: "dsip",    name: "DSIP",                 cat: "longevity",  size: "10 mg",  price: 23.99,  cost: 6.9,  purity: "99.5%", stock: 142, reorder: 80 },
    { id: "kiss",    name: "Kisspeptin",           cat: "metabolic",  size: "10 mg",  price: 54,     cost: 18,   purity: "99.2%", stock: 74,  reorder: 60 },
    { id: "kpv",     name: "KPV",                  cat: "repair",     size: "10 mg",  price: 31.99,  cost: 9.1,  purity: "99.4%", stock: 168, reorder: 80 },
    { id: "motsc",   name: "MOTS-c",               cat: "metabolic",  size: "20 mg",  price: 59.99,  cost: 10.2, purity: "99.2%", stock: 121, reorder: 70 },
    { id: "nad",     name: "NAD+",                 cat: "longevity",  size: "500 mg", price: 55.99,  cost: 17.5, purity: "99.5%", stock: 132, reorder: 70 },
    { id: "gluta",   name: "Glutathione",          cat: "longevity",  size: "10 mg",  price: 47.99,  cost: 13,   purity: "99.6%", stock: 144, reorder: 70 },
    { id: "mt1",     name: "Melanotan I",          cat: "metabolic",  size: "10 mg",  price: 23.99,  cost: 5.4,  purity: "99.1%", stock: 210, reorder: 90 },
    { id: "pt141",   name: "PT-141",               cat: "metabolic",  size: "10 mg",  price: 23.99,  cost: 5.9,  purity: "99.2%", stock: 256, reorder: 100 },
    { id: "aod",     name: "AOD-9604",             cat: "metabolic",  size: "10 mg",  price: 39.99,  cost: 12,   purity: "99.3%", stock: 118, reorder: 70 },
    { id: "cagri",   name: "Cagrilintide",         cat: "metabolic",  size: "10 mg",  price: 55.99,  cost: 20,   purity: "99.2%", stock: 88,  reorder: 60 },
    { id: "igf1lr3", name: "IGF-1 LR3",            cat: "growth",     size: "1 mg",   price: 55.99,  cost: 19.5, purity: "99.0%", stock: 64,  reorder: 50 },
    { id: "amino1mq",name: "5-Amino-1MQ",          cat: "metabolic",  size: "10 mg",  price: 39.99,  cost: 12.8, purity: "99.4%", stock: 102, reorder: 60 },
    { id: "klow",    name: "KLOW Blend",           cat: "repair",     size: "80 mg",  price: 99.99,  cost: 28,   purity: "99.2%", stock: 51,  reorder: 40 },
    { id: "wolverine",name: "BPC-157 / TB-500 Blend", cat: "repair",  size: "20 mg",  price: 79.99,  cost: 15.6, purity: "99.3%", stock: 96,  reorder: 50 },
    { id: "snap8",   name: "SNAP-8",               cat: "longevity",  size: "10 mg",  price: 23.99,  cost: 6.8,  purity: "99.3%", stock: 84,  reorder: 50 },
    { id: "ta1",     name: "Thymosin Alpha-1",     cat: "longevity",  size: "10 mg",  price: 31.99,  cost: 9.6,  purity: "99.4%", stock: 67,  reorder: 50 },
    { id: "glow",    name: "GLOW Blend",           cat: "longevity",  size: "10 mg",  price: 91.99,  cost: 26,   purity: "99.3%", stock: 79,  reorder: 50 }
  ];

  // relative demand weight per product (bestsellers pulled harder)
  var WEIGHT = {
    ghkcu: 9, bpc157: 8, ipa: 6, tb500: 5, pt141: 5, mt2: 5, tirz: 3,
    cjcipa: 4, nad: 4, epi: 4, semax: 3, mt1: 3, gluta: 3, tesa: 3,
    reta: 3, motsc: 3, selank: 2, dsip: 2, kpv: 3, kiss: 2, aod: 2,
    cagri: 3, igf1lr3: 2, amino1mq: 2
  };

  var FIRST = ["Marcus", "Elena", "Priya", "David", "Sara", "Liam", "Noah", "Maya", "Owen", "Ava",
    "Ethan", "Chloe", "Lucas", "Mila", "Hiro", "Yuki", "Anders", "Ingrid", "Diego", "Sofia",
    "Omar", "Lena", "Ravi", "Tara", "Felix", "Nora", "Jonah", "Iris", "Kai", "Vera",
    "Theo", "Mara", "Soren", "Dahlia", "Quinn", "Reese", "Cyrus", "Petra", "Milo", "Esme"];
  var LAST = ["Chen", "Rosenberg", "Patel", "Okafor", "Lindqvist", "Tanaka", "Moreau", "Kovac",
    "Vasquez", "Larsen", "Haddad", "Singh", "Nakamura", "Brandt", "Costa", "Reyes", "Falk",
    "Adeyemi", "Sato", "Novak", "Mendez", "Ericsson", "Khan", "Whitfield", "Romano", "Berg"];
  var INSTITUTIONS = ["", "", "", "", "Helix Research Labs", "Northbridge Biosciences", "Apex In-Vitro Group",
    "Meridian Assay Co.", "Cellucent Labs", "Vanta Peptide Research", "Orion Biolab", "Stratos Research"];
  var COUNTRY = ["US", "US", "US", "US", "US", "US", "CA", "GB", "AU", "DE", "NL", "SE"];
  var STATES = ["CA", "NY", "TX", "FL", "WA", "MA", "CO", "IL", "GA", "AZ", "PA", "OR", "NC", "MI", "OH"];
  var SOURCES = [
    { k: "Organic search", w: 30 }, { k: "Direct", w: 22 }, { k: "Reddit", w: 14 },
    { k: "Email", w: 12 }, { k: "Referral", w: 9 }, { k: "Paid social", w: 8 }, { k: "Affiliate", w: 16 }
  ];

  function weightedSource(r) {
    var tot = SOURCES.reduce(function (a, s) { return a + s.w; }, 0), n = r() * tot;
    for (var i = 0; i < SOURCES.length; i++) { n -= SOURCES[i].w; if (n <= 0) return SOURCES[i].k; }
    return SOURCES[0].k;
  }
  function weightedProduct(r) {
    var pool = [];
    PRODUCTS.forEach(function (p) { var w = WEIGHT[p.id] || 1; for (var i = 0; i < w; i++) pool.push(p); });
    return pool[Math.floor(r() * pool.length)];
  }

  var STATUSES = ["paid", "verifying", "packing", "shipped", "delivered", "refunded", "cancelled"];
  var DISCOUNTS = [];

  /* ---------- affiliate program ---------- */
  var AFF_CHANNELS = ["YouTube", "Reddit", "Research blog", "Instagram", "Newsletter", "Podcast", "X / Twitter", "Forum", "TikTok"];
  var AFF_TIERS = [
    { id: "partner", name: "Partner", rate: 10, min: 0 }
  ];
  function tierFor(rev) {
    for (var i = AFF_TIERS.length - 1; i >= 0; i--) if (rev >= AFF_TIERS[i].min) return AFF_TIERS[i];
    return AFF_TIERS[0];
  }
  function codeFrom(name, r) {
    var stop = { DR: 1, MR: 1, MS: 1, MRS: 1, THE: 1, R: 1 };
    var words = name.toUpperCase().replace(/[^A-Z ]/g, " ").split(/\s+/).filter(function (w) { return w && !stop[w]; });
    var base = (words.sort(function (a, b) { return b.length - a.length; })[0] || "ELYRIA");
    return base.slice(0, 8) + (Math.floor(r() * 89) + 10);
  }

  function buildAffiliates(orders, r) {
    // active/paused affiliates (have performance)
    var roster = [
      { name: "Dr. Marcus Vell", handle: "peptidelab", channel: "YouTube", aud: "148k subs" },
      { name: "Elena Fross", handle: "thelongevitydesk", channel: "Newsletter", aud: "32k readers" },
      { name: "BioHackedRoutine", handle: "biohackedroutine", channel: "Instagram", aud: "96k followers" },
      { name: "r/PeptideResearch mods", handle: "peptideresearch", channel: "Reddit", aud: "210k members" },
      { name: "Sara Lindqvist", handle: "slindqvist", channel: "Research blog", aud: "71k monthly" },
      { name: "The Protocol Pod", handle: "protocolpod", channel: "Podcast", aud: "54k listeners" },
      { name: "Owen Brandt", handle: "obrandt_rx", channel: "X / Twitter", aud: "88k followers" },
      { name: "Apex In-Vitro Group", handle: "apexinvitro", channel: "Forum", aud: "Institutional" },
      { name: "Maya Okafor", handle: "mokafor", channel: "YouTube", aud: "63k subs" },
      { name: "NorthLab Notes", handle: "northlabnotes", channel: "Newsletter", aud: "19k readers" },
      { name: "Diego Mendez", handle: "dmendez", channel: "TikTok", aud: "122k followers" },
      { name: "Cellucent Labs", handle: "cellucent", channel: "Forum", aud: "Institutional" },
      { name: "Priya Nair", handle: "pnair_bio", channel: "Instagram", aud: "41k followers" },
      { name: "Felix Romano", handle: "fromano", channel: "Research blog", aud: "28k monthly" },
      { name: "The Assay Report", handle: "assayreport", channel: "Podcast", aud: "22k listeners" },
      { name: "Iris Whitfield", handle: "iwhitfield", channel: "X / Twitter", aud: "37k followers" },
      { name: "Kai Berg", handle: "kberg", channel: "YouTube", aud: "45k subs" },
      { name: "Vanta Peptide Research", handle: "vantapeptide", channel: "Forum", aud: "Institutional" }
    ];
    var affs = roster.map(function (a, i) {
      var rr = rng(900 + i);
      var joined = Date.now() - (40 + Math.floor(rr() * 500)) * 86400000;
      var status = rr() < 0.1 ? "paused" : "active";
      return {
        id: "AF-" + (1001 + i), name: a.name, handle: a.handle, email: a.handle.replace(/[^a-z0-9]/g, "") + "@" + pick(rr, ["gmail.com", "proton.me", "lab.org"]),
        code: codeFrom(a.name, rr), channel: a.channel, audience: a.aud, status: status, joined: joined,
        clicksLife: 0, clicks30: 0, conversions: 0, revenue: 0, payouts: []
      };
    });

    // attribute affiliate-sourced orders across active affiliates (weighted by index → power-law)
    var active = affs.filter(function (a) { return a.status !== "pending"; });
    var pool = [];
    active.forEach(function (a, i) { var w = Math.max(1, 12 - i); for (var k = 0; k < w; k++) pool.push(a); });
    orders.forEach(function (o) {
      if (o.source !== "Affiliate") return;
      var a = pool[Math.floor(r() * pool.length)];
      o.affiliate = a.id; o.affCode = a.code;
      a.conversions++;
      if (o.status !== "cancelled" && o.status !== "refunded") a.revenue += o.total;
    });

    // clicks + tier + commission, generate payout history
    affs.forEach(function (a, i) {
      var rr = rng(1500 + i);
      // clicks imply a conversion rate of ~2.5-5%
      var cr = 0.025 + rr() * 0.03;
      a.clicksLife = Math.max(a.conversions, Math.round(a.conversions / cr));
      a.clicks30 = Math.round(a.clicksLife * (0.18 + rr() * 0.12));
      a.cr = a.clicksLife ? a.conversions / a.clicksLife * 100 : 0;
      var tier = tierFor(a.revenue); a.tier = tier.id; a.tierName = tier.name; a.rate = tier.rate;
      a.guidelinesAck = (a.status === "active" && rr() > 0.12) ? a.joined + (1 + Math.floor(rr() * 4)) * 86400000 : 0;
      a.earned = a.revenue * tier.rate / 100;
      // monthly payouts for ~ the last N months, leaving a current balance owed
      var months = Math.min(6, Math.max(0, Math.floor((Date.now() - a.joined) / (30 * 86400000))));
      var paidTotal = 0;
      for (var m = months; m >= 1; m--) {
        var amt = a.earned / (months + 1.4) * (0.7 + rr() * 0.6);
        if (amt < 50) continue;
        amt = Math.round(amt * 100) / 100;
        paidTotal += amt;
        a.payouts.push({ date: Date.now() - m * 30 * 86400000, amount: amt, method: pick(rr, ["PayPal", "Bank (ACH)", "Store credit", "USDC"]), status: "paid" });
      }
      a.paid = Math.min(paidTotal, a.earned);
      a.owed = Math.max(0, a.earned - a.paid);
      a.payouts.sort(function (x, y) { return y.date - x.date; });
    });

    // pending applications (no performance yet)
    var apps = [
      { name: "Theo Larsson", handle: "tlarsson", channel: "YouTube", aud: "77k subs", note: "Reviews research compounds; audience skews lab/clinical." },
      { name: "Meridian Assay Co.", handle: "meridianassay", channel: "Forum", aud: "Institutional", note: "Would refer partner labs for bulk reference standards." },
      { name: "Nora Haddad", handle: "nhaddad", channel: "Newsletter", aud: "14k readers", note: "Longevity research digest, weekly." },
      { name: "The Bench Notes", handle: "benchnotes", channel: "Podcast", aud: "31k listeners", note: "In-vitro methods podcast." },
      { name: "Quinn Reyes", handle: "qreyes", channel: "Instagram", aud: "58k followers", note: "Science communication, peptide explainers." },
      { name: "Soren Falk", handle: "sfalk", channel: "X / Twitter", aud: "24k followers", note: "Posts assay data threads." }
    ];
    var applications = apps.map(function (a, i) {
      var rr = rng(2200 + i);
      return { id: "APP-" + (501 + i), name: a.name, handle: a.handle, email: a.handle + "@" + pick(rr, ["gmail.com", "proton.me", "lab.org"]),
        channel: a.channel, audience: a.aud, note: a.note, applied: Date.now() - Math.floor(rr() * 12 + 1) * 86400000, status: "pending" };
    });

    return { affiliates: affs, applications: applications, tiers: AFF_TIERS };
  }

  /* ---------- generate ~120 days of orders ---------- */
  function build() {
    var r = rng(20260411);
    var DAYS = 120;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var orders = [], custMap = {}, seq = 24817;

    for (var d = DAYS; d >= 0; d--) {
      var date = new Date(now); date.setDate(now.getDate() - d);
      var dow = date.getDay();
      // baseline demand grows over time + weekly seasonality + noise
      var growth = 1 + (DAYS - d) / DAYS * 0.7;          // ramp ~70% over window
      var weekend = (dow === 0 || dow === 6) ? 0.72 : 1; // quieter weekends
      var base = 18 * growth * weekend;
      var count = Math.max(2, Math.round(gauss(r, base, base * 0.22)));

      for (var i = 0; i < count; i++) {
        seq++;
        // returning vs new customer
        var existing = Object.keys(custMap);
        var returning = existing.length > 12 && r() < 0.34;
        var cust;
        if (returning) {
          cust = custMap[pick(r, existing)];
        } else {
          var fn = pick(r, FIRST), ln = pick(r, LAST);
          var inst = pick(r, INSTITUTIONS);
          var em = (fn[0] + ln).toLowerCase() + (Math.floor(r() * 90) + 10) + "@" + (inst ? "lab.org" : pick(r, ["gmail.com", "proton.me", "outlook.com", "icloud.com"]));
          cust = { id: "C" + (10000 + existing.length), name: fn + " " + ln, email: em, inst: inst,
            country: pick(r, COUNTRY), state: pick(r, STATES), orders: 0, spent: 0, first: date.getTime(), source: weightedSource(r) };
          custMap[cust.id] = cust;
        }

        // line items
        var nItems = r() < 0.46 ? 1 : (r() < 0.8 ? 2 : (r() < 0.94 ? 3 : 4));
        var items = [], sub = 0, chosen = {};
        for (var j = 0; j < nItems; j++) {
          var p = weightedProduct(r);
          if (chosen[p.id]) { p = weightedProduct(r); }
          chosen[p.id] = 1;
          var qty = r() < 0.7 ? 1 : (r() < 0.92 ? 2 : 3);
          items.push({ id: p.id, name: p.name, size: p.size, qty: qty, price: p.price, cost: p.cost });
          sub += p.price * qty;
        }

        // discount sometimes
        var disc = 0, code = "";
        if (r() < 0.28) {
          var dc = pick(r, DISCOUNTS.filter(function (x) { return x.status === "active"; }));
          code = dc.code;
          if (dc.type === "pct") disc = sub * dc.value / 100;
          else if (dc.type === "fixed") disc = Math.min(dc.value, sub);
        }
        var ship = (sub - disc) >= 150 || code === "COLDSHIP" ? 0 : 14;
        var total = Math.max(0, sub - disc) + ship;

        // status by recency
        var status;
        if (d > 6) {
          var rr = r();
          status = rr < 0.9 ? "delivered" : (rr < 0.955 ? "refunded" : "cancelled");
        } else if (d > 3) {
          status = r() < 0.85 ? "delivered" : "shipped";
        } else if (d > 1) {
          status = pick(r, ["shipped", "shipped", "packing", "delivered"]);
        } else if (d === 1) {
          status = pick(r, ["packing", "verifying", "shipped", "paid"]);
        } else {
          status = pick(r, ["paid", "verifying", "packing", "paid", "verifying"]);
        }

        var ts = date.getTime() + Math.floor(r() * 86400000);
        var lot = "26-" + pick(r, ["A", "A", "B", "B", "B", "C"]);
        var carrier = pick(r, ["UPS", "UPS", "FedEx", "USPS"]);
        var ordObj = {
          id: "EB-" + seq, ts: ts, cust: cust.id, custName: cust.name, email: cust.email,
          items: items, sub: sub, disc: disc, code: code, ship: ship, total: total,
          status: status, lot: lot, carrier: carrier,
          track: status === "shipped" || status === "delivered" ? "1Z" + Math.floor(r() * 1e9).toString().padStart(9, "0") : "",
          country: cust.country, state: cust.state, source: cust.source, coa: true
        };
        orders.push(ordObj);

        if (status !== "refunded" && status !== "cancelled") {
          cust.orders++; cust.spent += total;
        }
        cust.last = ts;
      }
    }

    orders.sort(function (a, b) { return b.ts - a.ts; });

    // lots / COA register (aggregated from catalog + lot codes)
    var lots = [];
    var lotDefs = [
      { lot: "26-A", released: "2026-01-08", purityFloor: "99.0%" },
      { lot: "", released: "2026-03-02", purityFloor: "99.0%" },
      { lot: "26-C", released: "2026-04-19", purityFloor: "99.0%" }
    ];
    PRODUCTS.forEach(function (p, idx) {
      var ld = lotDefs[idx % lotDefs.length];
      lots.push({
        lot: ld.lot + "-" + p.id.toUpperCase().slice(0, 4),
        product: p.name, productId: p.id, released: ld.released,
        purity: p.purity, endo: "< 0.5 EU/mg", identity: "Confirmed (MS)",
        lab: pick(rng(idx + 7), ["Janoshik Analytical", "Colmaric Analyticals", "MZ Biolabs"]),
        units: Math.round(p.stock * (1.4 + (idx % 3) * 0.3)), remaining: p.stock,
        status: parseFloat(p.purity) >= 99.0 ? "released" : "hold"
      });
    });

    var aff = buildAffiliates(orders, r);
    return { orders: [], customers: [], lots: [], affiliates: [], applications: [], tiers: aff.tiers };
  }

  /* ---------- persistence ---------- */
  var SEED_STRIKES = {
    "AF-1014": [{ id: "STR-2601", date: Date.now() - 9 * 86400000, severity: "major", reason: "Dosing / administration claim", note: "Research-blog post included an administration protocol. Removal requested; balance frozen pending correction." }]
  };
  var KEY = "elyria_admin_v1";
  function loadState() {
    var saved;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) { saved = null; }

    var discounts = (saved && saved.discounts) ? saved.discounts : JSON.parse(JSON.stringify(DISCOUNTS));
    var stockOverrides = (saved && saved.stockOverrides) || {};

    // Stock starts at 0 — real numbers come from Supabase
    var products = PRODUCTS.map(function (p) {
      var s = stockOverrides[p.id] != null ? stockOverrides[p.id] : 0;
      return Object.assign({}, p, { stock: s });
    });

    return {
      orders: [], customers: [], lots: [], affiliates: [], applications: [],
      tiers: AFF_TIERS, products: products, discounts: discounts,
      statusOverrides: {}, affOverrides: {}, approvedApps: {}, strikes: {},
      stockOverrides: stockOverrides
    };
  }
  function setStock(state, id, qty) {
    qty = Math.max(0, parseInt(qty, 10) || 0);
    state.stockOverrides[id] = qty;
    var p = state.products.filter(function (x) { return x.id === id; })[0];
    if (p) p.stock = qty;
    persist(state);
  }
  function persist(state) {
    try { localStorage.setItem(KEY, JSON.stringify({ statusOverrides: state.statusOverrides, discounts: state.discounts, affOverrides: state.affOverrides, approvedApps: state.approvedApps, strikes: state.strikes, stockOverrides: state.stockOverrides })); } catch (e) {}
  }

  window.ElyriaData = {
    PRODUCTS: PRODUCTS, STATUSES: STATUSES, SOURCES: SOURCES, TIERS: AFF_TIERS,
    load: loadState, persist: persist, setStock: setStock, KEY: KEY
  };
})();
