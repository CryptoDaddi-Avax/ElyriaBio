/* ============================================================
   ELYRIA BIO — CONSOLE / APP
   Router, state, view renderers, order drawer, interactions.
   ============================================================ */
(function () {
  "use strict";
  var D = window.ElyriaData, C = window.Charts;
  var state = D.load();
  var range = 30; // days

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function money(n, dec) { return "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function moneyK(n) { return n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n); }
  function pct(n) { return (n >= 0 ? "+" : "") + n.toFixed(1) + "%"; }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
  function fmtDate(ts) { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function fmtDateTime(ts) { return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
  function initials(name) { return name.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase(); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function avatarColor(seed) {
    var hues = [42, 38, 30, 46, 34, 50]; var h = hues[seed.charCodeAt(0) % hues.length];
    return "hsl(" + h + " 55% 62%)";
  }
  var ARROW_UP = "<svg viewBox='0 0 24 24' fill='none' stroke-width='2.4'><path d='M12 19V5M6 11l6-6 6 6'/></svg>";
  var ARROW_DN = "<svg viewBox='0 0 24 24' fill='none' stroke-width='2.4'><path d='M12 5v14M6 13l6 6 6-6'/></svg>";

  function inRange(o, days) { var cut = Date.now() - days * 86400000; return o.ts >= cut; }
  function revOf(o) { return (o.status === "refunded" || o.status === "cancelled") ? 0 : o.total; }
  function liveOrders() { return state.orders.filter(function (o) { return o.status !== "cancelled"; }); }

  /* daily series for a metric over N days */
  function dailySeries(days, valFn) {
    var out = [], labels = [], now = new Date(); now.setHours(0, 0, 0, 0);
    var buckets = {};
    state.orders.forEach(function (o) {
      var k = dayKey(o.ts);
      if (!buckets[k]) buckets[k] = [];
      buckets[k].push(o);
    });
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now); d.setDate(now.getDate() - i);
      var k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      out.push(valFn(buckets[k] || []));
      labels.push(fmtDate(d.getTime()));
    }
    return { data: out, labels: labels };
  }

  function toast(msg) {
    var wrap = $("#toastWrap");
    var el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.8'><path d='M20 6L9 17l-5-5'/></svg>" + msg;
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 320); }, 2600);
  }

  /* ============================================================
     METRICS
     ============================================================ */
  function metrics(days) {
    var cur = state.orders.filter(function (o) { return inRange(o, days); });
    var prevCut1 = Date.now() - days * 86400000, prevCut2 = Date.now() - days * 2 * 86400000;
    var prev = state.orders.filter(function (o) { return o.ts < prevCut1 && o.ts >= prevCut2; });
    function agg(list) {
      var live = list.filter(function (o) { return o.status !== "cancelled"; });
      var paid = live.filter(function (o) { return o.status !== "refunded"; });
      var rev = paid.reduce(function (a, o) { return a + o.total; }, 0);
      var cogs = paid.reduce(function (a, o) { return a + o.items.reduce(function (s, it) { return s + it.cost * it.qty; }, 0); }, 0);
      var refunds = live.filter(function (o) { return o.status === "refunded"; });
      var units = paid.reduce(function (a, o) { return a + o.items.reduce(function (s, it) { return s + it.qty; }, 0); }, 0);
      return { orders: live.length, rev: rev, aov: paid.length ? rev / paid.length : 0, cogs: cogs,
        margin: rev ? (rev - cogs) / rev * 100 : 0, refundRate: live.length ? refunds.length / live.length * 100 : 0, units: units };
    }
    var a = agg(cur), b = agg(prev);
    function delta(x, y) { return y ? (x - y) / y * 100 : 0; }
    // synthetic sessions (for conversion) ~ orders / conv
    var conv = 3.1 + (days <= 7 ? 0.3 : 0);
    var sessions = Math.round(a.orders / (conv / 100));
    var prevSessions = Math.round(b.orders / (conv / 100)) || 1;
    return {
      cur: a, prev: b,
      d: { rev: delta(a.rev, b.rev), orders: delta(a.orders, b.orders), aov: delta(a.aov, b.aov), margin: a.margin - b.margin },
      conv: conv, sessions: sessions, dConv: delta(a.orders, b.orders) - delta(sessions, prevSessions)
    };
  }

  /* ============================================================
     VIEW: OVERVIEW
     ============================================================ */
  function renderOverview() {
    var m = metrics(range);
    var v = $("#view-overview");
    var revS = dailySeries(range, function (os) { return os.reduce(function (a, o) { return a + revOf(o); }, 0); });
    var ordS = dailySeries(range, function (os) { return os.filter(function (o) { return o.status !== "cancelled"; }).length; });

    function kpi(label, val, delta, deltaGood, ic, sparkData, sparkUp) {
      var up = delta >= 0, good = deltaGood === undefined ? up : (deltaGood ? up : !up);
      return "<div class='card kpi'><div class='kpi-top'><span class='kpi-label'>" + label + "</span>"
        + "<span class='kpi-ic'>" + ic + "</span></div>"
        + "<div class='kpi-val'>" + val + "</div>"
        + "<div class='kpi-sub'><span class='delta " + (good ? "up" : "down") + "'>" + (up ? ARROW_UP : ARROW_DN) + pct(Math.abs(delta)) + "</span> vs prev " + range + "d</div>"
        + "<div class='spark' data-spark='" + sparkData + "' data-up='" + sparkUp + "'></div></div>";
    }
    var icR = "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.6'><path d='M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'/></svg>";
    var icO = "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.6'><path d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0'/></svg>";
    var icA = "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.6'><rect x='2' y='5' width='20' height='14' rx='2'/><path d='M2 10h20'/></svg>";
    var icM = "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.6'><path d='M3 3v18h18'/><path d='M7 14l4-4 4 4 4-6'/></svg>";

    var html = "<div class='kpi-grid'>"
      + kpi("Net revenue", money(m.cur.rev), m.d.rev, true, icR, "rev", true)
      + kpi("Orders", m.cur.orders.toLocaleString(), m.d.orders, true, icO, "ord", true)
      + kpi("Avg order value", money(m.cur.aov, 2), m.d.aov, true, icA, "rev", true)
      + kpi("Gross margin", m.cur.margin.toFixed(1) + "%", m.d.margin, true, icM, "ord", true)
      + "</div>";

    // revenue chart + channel donut
    html += "<div class='row c2'>"
      + "<div class='card'><div class='panel-head'><div><h3>Revenue & orders</h3><div class='ph-sub'>Last " + range + " days · net of refunds</div></div>"
      + "<div class='legend'><span><i style='background:#e7c06a'></i>Revenue</span><span><i style='background:#79a8d6'></i>Orders</span></div></div>"
      + "<div class='chart-wrap' id='ovRevChart'></div></div>"
      + "<div class='card'><div class='panel-head'><div><h3>Traffic source</h3><div class='ph-sub'>Orders by channel</div></div></div>"
      + "<div class='donut-wrap'><div id='ovDonut'></div><div class='donut-legend' id='ovDonutLeg'></div></div></div>"
      + "</div>";

    // recent orders + alerts
    html += "<div class='row c2'>"
      + "<div class='card'><div class='panel-head'><div><h3>Recent orders</h3></div><button class='link-btn' data-goto='orders'>View all <svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M5 12h14M13 6l6 6-6 6'/></svg></button></div>"
      + "<div class='tbl-wrap'><table><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th class='t-num'>Total</th></tr></thead><tbody id='ovRecent'></tbody></table></div></div>"
      + "<div class='card'><div class='panel-head'><div><h3>Needs attention</h3></div></div><div class='alert-strip' id='ovAlerts'></div></div>"
      + "</div>";

    // top products
    html += "<div class='row'><div class='card'><div class='panel-head'><div><h3>Top products</h3><div class='ph-sub'>By revenue · last " + range + " days</div></div><button class='link-btn' data-goto='products'>Inventory <svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M5 12h14M13 6l6 6-6 6'/></svg></button></div><div class='barlist' id='ovTop'></div></div></div>";

    html += footNote();
    v.innerHTML = html;

    // charts
    C.lineChart($("#ovRevChart"), [
      { name: "Revenue", color: "#e7c06a", data: revS.data },
      { name: "Orders", color: "#79a8d6", data: ordS.data.map(function (x) { return x * (Math.max.apply(null, revS.data) / (Math.max.apply(null, ordS.data) || 1)); }), dashed: true }
    ], revS.labels, { height: 240, yfmt: moneyK, tipfmt: moneyK });
    // fix orders tooltip: re-render with real values via second pass not needed; keep simple

    // donut channels
    var chan = {};
    state.orders.filter(function (o) { return inRange(o, range) && o.status !== "cancelled"; }).forEach(function (o) { chan[o.source] = (chan[o.source] || 0) + 1; });
    var palette = ["#e7c06a", "#79a8d6", "#7fcf8e", "#d8a6e0", "#e88c6a", "#b9954e", "#9fc4e8"];
    var segs = Object.keys(chan).map(function (k, i) { return { label: k, value: chan[k], color: palette[i % palette.length] }; }).sort(function (a, b) { return b.value - a.value; });
    var totC = segs.reduce(function (a, s) { return a + s.value; }, 0);
    C.donut($("#ovDonut"), segs, { size: 158, stroke: 20, center: totC.toLocaleString(), centerSub: "ORDERS" });
    $("#ovDonutLeg").innerHTML = segs.map(function (s) { return "<div class='dleg'><i style='background:" + s.color + "'></i>" + s.label + "<span class='dl-v'>" + Math.round(s.value / totC * 100) + "%</span></div>"; }).join("");

    // sparklines
    $$("[data-spark]").forEach(function (sp) {
      var key = sp.getAttribute("data-spark");
      var d = key === "rev" ? revS.data : ordS.data;
      C.spark(sp, d.slice(-14), sp.getAttribute("data-up") === "true" ? "#7fcf8e" : "#e88c6a", true);
    });

    // recent orders
    var recent = state.orders.slice(0, 6);
    $("#ovRecent").innerHTML = recent.map(function (o) {
      return "<tr class='clickable' data-order='" + o.id + "'><td class='t-id'>" + o.id + "</td><td class='t-strong'>" + esc(o.custName) + "</td><td><span class='pill " + o.status + "'>" + o.status + "</span></td><td class='t-num'>" + money(o.total, 2) + "</td></tr>";
    }).join("");

    // alerts
    var lowStock = state.products.filter(function (p) { return p.stock <= p.reorder; }).sort(function (a, b) { return (a.stock / a.reorder) - (b.stock / b.reorder); });
    var pending = liveOrders().filter(function (o) { return o.status === "paid" || o.status === "verifying"; }).length;
    var refundsRecent = state.orders.filter(function (o) { return o.status === "refunded" && inRange(o, 7); }).length;
    var alerts = [];
    if (pending) alerts.push({ t: "neg", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><circle cx='12' cy='12' r='9'/><path d='M12 7v5l3 2'/></svg>", title: pending + " orders awaiting verification", sub: "Confirm payment & COA before packing", go: "orders" });
    if (lowStock.length) alerts.push({ t: "warn", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'/></svg>", title: lowStock.length + " products at/below reorder point", sub: lowStock.slice(0, 3).map(function (p) { return p.name; }).join(", "), go: "products" });
    if (refundsRecent) alerts.push({ t: "info", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.5 2.8L3 8'/><path d='M3 4v4h4'/></svg>", title: refundsRecent + " refunds this week", sub: "Review reasons in Orders", go: "orders" });
    alerts.push({ t: "info", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M4 4h16v16H4z'/><path d='M8 8h3v3H8zM14 8h2M14 12h2M14 16h2M8 13h3v3H8z'/></svg>", title: "Lot 26-C released", sub: "3 SKUs updated · COAs on file", go: "products" });
    $("#ovAlerts").innerHTML = alerts.map(function (a) {
      return "<div class='alert-item " + a.t + "' data-goto='" + a.go + "'><span class='ai-ic'>" + a.ic + "</span><div class='ai-body'><div class='ai-title'>" + a.title + "</div><div class='ai-sub'>" + a.sub + "</div></div></div>";
    }).join("");

    // top products
    var prodRev = {};
    state.orders.filter(function (o) { return inRange(o, range) && o.status !== "cancelled" && o.status !== "refunded"; }).forEach(function (o) {
      o.items.forEach(function (it) { prodRev[it.name] = (prodRev[it.name] || 0) + it.price * it.qty; });
    });
    var top = Object.keys(prodRev).map(function (k) { return { name: k, v: prodRev[k] }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
    var maxV = top.length ? top[0].v : 1;
    $("#ovTop").innerHTML = top.map(function (p) {
      return "<div class='barrow'><span class='bl-name'>" + p.name + "</span><span class='bl-val'>" + money(p.v) + "</span><div class='bartrack'><div class='barfill' style='width:" + (p.v / maxV * 100) + "%'></div></div></div>";
    }).join("");
  }

  /* ============================================================
     VIEW: ORDERS
     ============================================================ */
  var ordFilter = { status: "all", q: "", sort: "ts", dir: -1 };
  function renderOrders() {
    var v = $("#view-orders");
    var counts = {}; D.STATUSES.forEach(function (s) { counts[s] = 0; });
    state.orders.forEach(function (o) { counts[o.status]++; });
    var chips = "<button class='chip " + (ordFilter.status === "all" ? "active" : "") + "' data-ostatus='all'>All " + state.orders.length + "</button>"
      + ["paid", "verifying", "packing", "shipped", "delivered", "refunded"].map(function (s) {
        return "<button class='chip " + (ordFilter.status === s ? "active" : "") + "' data-ostatus='" + s + "'>" + s + " " + counts[s] + "</button>";
      }).join("");
    var html = "<div class='toolbar'>" + chips + "<div class='tb-spacer'></div>"
      + "<div class='mini-search'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg><input id='ordSearch' placeholder='Search order, customer, email…' value='" + ordFilter.q + "'></div>"
      + "</div>";
    html += "<div class='card' style='padding:0'><div class='tbl-wrap'><table><thead><tr>"
      + "<th class='sortable' data-sort='id'>Order</th><th>Customer</th><th class='sortable' data-sort='ts'>Date</th><th>Items</th><th>Lot</th><th>Status</th><th class='sortable t-num' data-sort='total'>Total</th>"
      + "</tr></thead><tbody id='ordBody'></tbody></table></div></div>";
    html += footNote();
    v.innerHTML = html;
    paintOrders();
  }
  function paintOrders() {
    var list = state.orders.slice();
    if (ordFilter.status !== "all") list = list.filter(function (o) { return o.status === ordFilter.status; });
    if (ordFilter.q) {
      var q = ordFilter.q.toLowerCase();
      list = list.filter(function (o) { return o.id.toLowerCase().indexOf(q) >= 0 || o.custName.toLowerCase().indexOf(q) >= 0 || o.email.toLowerCase().indexOf(q) >= 0; });
    }
    list.sort(function (a, b) {
      var x = a[ordFilter.sort], y = b[ordFilter.sort];
      if (ordFilter.sort === "id") { x = a.ts; y = b.ts; }
      return (x < y ? -1 : x > y ? 1 : 0) * ordFilter.dir;
    });
    var body = $("#ordBody");
    if (!list.length) { body.innerHTML = "<tr><td colspan='7'><div class='empty'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.5'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg>No orders match.</div></td></tr>"; return; }
    body.innerHTML = list.slice(0, 60).map(function (o) {
      var nItems = o.items.reduce(function (a, it) { return a + it.qty; }, 0);
      var itLabel = o.items[0].name + (o.items.length > 1 ? " +" + (o.items.length - 1) : "");
      return "<tr class='clickable' data-order='" + o.id + "'>"
        + "<td class='t-id'>" + o.id + "</td>"
        + "<td><div class='t-strong'>" + esc(o.custName) + "</div><div class='t-mut' style='font-size:11px;font-family:IBM Plex Mono,monospace'>" + esc(o.email) + "</div></td>"
        + "<td class='t-mut'>" + fmtDate(o.ts) + "</td>"
        + "<td>" + itLabel + " <span class='t-mut'>· " + nItems + "u</span></td>"
        + "<td class='t-id'>" + o.lot + "</td>"
        + "<td><span class='pill " + o.status + "'>" + o.status + "</span></td>"
        + "<td class='t-num'>" + money(o.total, 2) + "</td></tr>";
    }).join("");
    if (list.length > 60) body.innerHTML += "<tr><td colspan='7' style='text-align:center;color:#6f685c;font-size:12px;padding:14px'>Showing 60 of " + list.length + " — refine with filters</td></tr>";
  }

  /* ============================================================
     VIEW: PAYMENTS — manual verification queue (crypto + Venmo)
     Live rows come from storefront checkout (localStorage
     "elyria_orders"); demo rows are seeded for design review.
     ============================================================ */
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var PAY_META = { btc: ["\u20BF", "Bitcoin"], eth: ["\u039E", "Ethereum"], usdc: ["$", "USDC"], venmo: ["V", "Venmo"] };
  var DEMO_PAY = [];
  function payRowsAll() {
    var live = lsGet("elyria_orders", []).filter(function (o) { return o.pay; }).map(function (o) {
      return {
        id: o.id, cust: o.email ? o.email.split("@")[0] : "Storefront order", email: o.email || "\u2014",
        method: o.pay, total: o.total || 0,
        ref: (o.proof && o.proof.ref) || "", img: o.proof && o.proof.img, hasShot: !!(o.proof && o.proof.img),
        ts: (o.proof && o.proof.ts) || o.ts || Date.now(),
        state: o.status === "pending" ? (o.payState === "submitted" ? "submitted" : "awaiting") : "confirmed",
        live: true
      };
    });
    var ovr = lsGet("elyria_admin_paydemo", {});
    var demo = DEMO_PAY.map(function (d) {
      var c = {}; for (var k in d) c[k] = d[k];
      if (ovr[d.id]) c.state = ovr[d.id];
      return c;
    });
    return live.concat(demo);
  }
  var payFilter = "all";
  function renderPayments() {
    var v = $("#view-payments");
    var rows = payRowsAll();
    var counts = { all: rows.length, submitted: 0, awaiting: 0, confirmed: 0 };
    rows.forEach(function (r) { counts[r.state] = (counts[r.state] || 0) + 1; });
    var chips = ["all", "submitted", "awaiting", "confirmed"].map(function (s) {
      var lbl = s === "all" ? "All" : s === "submitted" ? "Needs review" : s.charAt(0).toUpperCase() + s.slice(1);
      return "<button class='chip " + (payFilter === s ? "active" : "") + "' data-paystatus='" + s + "'>" + lbl + " " + (counts[s] || 0) + "</button>";
    }).join("");
    var html = "<div class='toolbar'>" + chips + "<div class='tb-spacer'></div></div>";
    html += "<div class='card' style='padding:0'><div class='tbl-wrap'><table><thead><tr>"
      + "<th>Order</th><th>Customer</th><th>Method</th><th>Reference</th><th>Proof</th><th>Submitted</th><th class='t-num'>Amount</th><th>Status</th><th></th>"
      + "</tr></thead><tbody id='payBody'></tbody></table></div></div>";
    html += "<div class='foot-note'><span class='ruo'>Manual verification</span><span>\u00b7 Confirm once the transaction lands in your wallet / Venmo \u2014 confirming moves the order to packing. Sample rows are demo data.</span></div>";
    v.innerHTML = html;
    paintPayments();
  }
  function paintPayments() {
    var rows = payRowsAll();
    if (payFilter !== "all") rows = rows.filter(function (r) { return r.state === payFilter; });
    rows.sort(function (a, b) { return (a.state === "submitted" ? 0 : 1) - (b.state === "submitted" ? 0 : 1) || b.ts - a.ts; });
    var body = $("#payBody");
    if (!rows.length) { body.innerHTML = "<tr><td colspan='9'><div class='empty'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.5'><rect x='2' y='5' width='20' height='14' rx='2'/><path d='M2 10h20'/></svg>No payments in this state.</div></td></tr>"; return; }
    window.__payShots = {};
    body.innerHTML = rows.map(function (r) {
      var m = PAY_META[r.method] || ["?", r.method];
      var okImg = r.img && String(r.img).indexOf("data:image/") === 0;
      if (okImg) window.__payShots[r.id] = r.img;
      var proof = okImg
        ? "<button class='pay-shot' data-payshot='" + r.id + "' title='View screenshot'><img src='" + r.img + "' alt='Payment screenshot'></button>"
        : (r.hasShot ? "<span class='t-mut' style='font-size:11px'>screenshot.png</span>" : "<span class='t-mut'>\u2014</span>");
      var acts = r.state === "confirmed"
        ? "<span class='t-mut' style='font-size:11px'>Verified</span>"
        : "<span class='pay-acts'><button class='pay-btn ok' data-pay-approve='" + r.id + "'>Confirm</button>"
        + (r.state === "submitted" ? "<button class='pay-btn no' data-pay-reject='" + r.id + "'>Reject</button>" : "") + "</span>";
      var stLbl = r.state === "submitted" ? "needs review" : r.state;
      return "<tr>"
        + "<td class='t-id'>" + r.id + (r.live ? " <span class='pay-live'>live</span>" : "") + "</td>"
        + "<td><div class='t-strong'>" + esc(r.cust) + "</div><div class='t-mut' style='font-size:11px;font-family:IBM Plex Mono,monospace'>" + esc(r.email) + "</div></td>"
        + "<td><span class='pay-m'><span class='pay-g'>" + m[0] + "</span>" + m[1] + "</span></td>"
        + "<td class='t-id' style='max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>" + (r.ref ? esc(r.ref) : "<span class='t-mut'>\u2014</span>") + "</td>"
        + "<td>" + proof + "</td>"
        + "<td class='t-mut'>" + fmtDate(r.ts) + "</td>"
        + "<td class='t-num'>" + money(r.total, 2) + "</td>"
        + "<td><span class='pill pay-" + r.state + "'>" + stLbl + "</span></td>"
        + "<td>" + acts + "</td></tr>";
    }).join("");
  }
  function payDecide(id, ok) {
    var orders = lsGet("elyria_orders", []);
    var live = false;
    orders.forEach(function (o) {
      if (o.id === id) {
        live = true;
        if (ok) { o.status = "confirmed"; }
        else { o.payState = "awaiting"; delete o.proof; }
      }
    });
    if (live) { lsSet("elyria_orders", orders); }
    else {
      var ovr = lsGet("elyria_admin_paydemo", {});
      ovr[id] = ok ? "confirmed" : "awaiting";
      lsSet("elyria_admin_paydemo", ovr);
    }
    toast(ok ? "Payment confirmed \u2014 " + id + " moves to packing" : "Proof rejected \u2014 " + id + " back to awaiting payment");
    renderPayments(); refreshBadges();
  }
  function openPayShot(id) {
    var img = (window.__payShots || {})[id]; if (!img) return;
    var ov = document.createElement("div");
    ov.className = "pay-lightbox";
    ov.innerHTML = "<img src='" + img + "' alt='Payment screenshot'><span>" + id + " \u00b7 click anywhere to close</span>";
    ov.addEventListener("click", function () { ov.remove(); });
    document.body.appendChild(ov);
  }

  /* ---------- order drawer ---------- */
  var FLOW = [
    { k: "paid", name: "Payment confirmed", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M20 6L9 17l-5-5'/></svg>" },
    { k: "verifying", name: "COA verified", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M9 12l2 2 4-4'/><circle cx='12' cy='12' r='9'/></svg>" },
    { k: "packing", name: "Packed (cold-chain)", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'/><path d='M3 6h18'/></svg>" },
    { k: "shipped", name: "Shipped", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M3 7h11v8H3zM14 10h4l3 3v2h-7z'/><circle cx='6.5' cy='17' r='1.5'/><circle cx='17.5' cy='17' r='1.5'/></svg>" },
    { k: "delivered", name: "Delivered", ic: "<svg viewBox='0 0 24 24' fill='none' stroke-width='2'><path d='M20 6L9 17l-5-5'/></svg>" }
  ];
  function openOrder(id) {
    var o = state.orders.filter(function (x) { return x.id === id; })[0];
    if (!o) return;
    var lot = state.lots.filter(function (l) { return l.productId === o.items[0].id; })[0] || state.lots[0];
    var stageIdx = FLOW.map(function (f) { return f.k; }).indexOf(o.status);
    var refunded = o.status === "refunded", cancelled = o.status === "cancelled";

    var flowHtml = FLOW.map(function (f, i) {
      var cls = cancelled ? "idle" : (i < stageIdx ? "done" : i === stageIdx ? "current" : "idle");
      if (refunded) cls = i <= 3 ? "done" : "idle";
      var time = (cls === "done" || cls === "current") ? fmtDateTime(o.ts + i * 7200000) : "—";
      return "<div class='flow-step " + cls + "'><span class='flow-dot'>" + f.ic + "</span><div class='flow-meta'><div class='fm-name'>" + f.name + "</div><div class='fm-time'>" + time + "</div></div></div>";
    }).join("");

    var itemsHtml = o.items.map(function (it) {
      return "<div class='d-item'><span class='prod-chip'>" + it.name.slice(0, 2).toUpperCase() + "</span><div class='di-meta'><div class='di-name'>" + it.name + "</div><div class='di-sub'>" + it.size + " · qty " + it.qty + "</div></div><span class='di-price'>" + money(it.price * it.qty, 2) + "</span></div>";
    }).join("");

    var statusOptions = D.STATUSES.map(function (s) { return "<option value='" + s + "'" + (s === o.status ? " selected" : "") + ">" + s + "</option>"; }).join("");

    var body = "<div class='d-section'><span class='micro'>Fulfillment</span><div style='display:flex;align-items:center;gap:10px;margin-bottom:14px'><span class='pill " + o.status + "'>" + o.status + "</span>"
      + (o.track ? "<span class='t-mut' style='font-family:IBM Plex Mono,monospace;font-size:12px'>" + o.carrier + " · " + o.track + "</span>" : "") + "</div>"
      + (cancelled ? "<div class='alert-item neg'><span class='ai-ic'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M18 6L6 18M6 6l12 12'/></svg></span><div class='ai-body'><div class='ai-title'>Order cancelled</div></div></div>" : "<div class='flow'>" + flowHtml + "</div>") + "</div>";

    body += "<div class='d-section'><span class='micro'>Update status</span><div style='display:flex;gap:9px'><select class='sel' id='drawerStatus' style='flex:1'>" + statusOptions + "</select><button class='abtn solid' id='drawerSave'>Save</button></div></div>";

    body += "<div class='d-section'><span class='micro'>Items</span>" + itemsHtml + "</div>";

    body += "<div class='d-section'><span class='micro'>Summary</span>"
      + "<div class='d-tot'><span class='dt-k'>Subtotal</span><span>" + money(o.sub, 2) + "</span></div>"
      + (o.disc ? "<div class='d-tot'><span class='dt-k'>Discount" + (o.code ? " · " + o.code : "") + "</span><span style='color:var(--pos)'>−" + money(o.disc, 2) + "</span></div>" : "")
      + "<div class='d-tot'><span class='dt-k'>Shipping</span><span>" + (o.ship ? money(o.ship, 2) : "Free") + "</span></div>"
      + "<div class='d-tot grand'><span class='dt-k'>Total</span><span class='dt-v'>" + money(o.total, 2) + "</span></div></div>";

    body += "<div class='d-section'><span class='micro'>Customer</span>"
      + "<div class='d-line'><span class='dl-k'>Name</span><span class='dl-v'>" + esc(o.custName) + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Email</span><span class='dl-v' style='font-family:IBM Plex Mono,monospace;font-size:12px'>" + esc(o.email) + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Ship to</span><span class='dl-v'>" + esc(o.state) + ", " + esc(o.country) + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Source</span><span class='dl-v'>" + o.source + "</span></div></div>";

    body += "<div class='d-section'><span class='micro'>Lot & certificate</span><div class='coa-mini'>"
      + "<div style='display:flex;align-items:center;justify-content:space-between'><span class='t-strong'>" + lot.product + "</span><span class='pill released'>COA on file</span></div>"
      + "<div class='coa-mini-grid'>"
      + "<div><div class='cmg-k'>Lot</div><div class='cmg-v'>" + o.lot + "</div></div>"
      + "<div><div class='cmg-k'>HPLC purity</div><div class='cmg-v'>" + lot.purity + "</div></div>"
      + "<div><div class='cmg-k'>Endotoxin</div><div class='cmg-v'>" + lot.endo + "</div></div>"
      + "<div><div class='cmg-k'>Identity</div><div class='cmg-v'>" + lot.identity + "</div></div>"
      + "<div><div class='cmg-k'>Lab</div><div class='cmg-v'>" + lot.lab + "</div></div>"
      + "<div><div class='cmg-k'>Released</div><div class='cmg-v'>" + lot.released + "</div></div>"
      + "</div></div></div>";

    body += "<div class='d-section'><div class='btn-row'>"
      + "<button class='abtn ghost' data-act='print'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z'/></svg>Packing slip</button>"
      + "<button class='abtn ghost' data-act='coa'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'/><path d='M14 2v6h6'/></svg>Download COA</button>"
      + (refunded || cancelled ? "" : "<button class='abtn danger' data-act='refund'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.5 2.8L3 8'/><path d='M3 4v4h4'/></svg>Refund</button>")
      + "</div></div>";

    $("#drawerTitle").textContent = o.id;
    $("#drawerSub").textContent = fmtDateTime(o.ts) + " · " + o.custName;
    $("#drawerBody").innerHTML = body;
    $("#drawer").classList.add("open");
    $("#drawerBack").classList.add("open");

    $("#drawerSave").addEventListener("click", function () {
      var ns = $("#drawerStatus").value;
      o.status = ns; state.statusOverrides[o.id] = ns; D.persist(state);
      toast("Order " + o.id + " → " + ns);
      closeDrawer(); paintOrders(); refreshBadges();
    });
    $$("[data-act]", $("#drawerBody")).forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        if (act === "refund") { o.status = "refunded"; state.statusOverrides[o.id] = "refunded"; D.persist(state); toast("Refund issued · " + money(o.total, 2)); closeDrawer(); paintOrders(); refreshBadges(); }
        else if (act === "coa") toast("COA " + o.lot + " downloaded");
        else toast("Packing slip sent to printer");
      });
    });
  }
  function closeDrawer() { $("#drawer").classList.remove("open"); $("#drawerBack").classList.remove("open"); }

  /* ============================================================
     VIEW: PRODUCTS / INVENTORY
     ============================================================ */
  var prodFilter = { cat: "all", q: "" };
  function renderProducts() {
    var v = $("#view-products");
    // sales velocity per product (last 30d)
    var sold = {}; var rev = {};
    state.orders.filter(function (o) { return inRange(o, 30) && o.status !== "cancelled" && o.status !== "refunded"; }).forEach(function (o) {
      o.items.forEach(function (it) {
        // track by full key (pid|size or bare pid)
        sold[it.id] = (sold[it.id] || 0) + it.qty;
        rev[it.id]  = (rev[it.id]  || 0) + it.price * it.qty;
        // also roll up to bare pid total
        var bareId = it.pid || (it.id.indexOf("|") > -1 ? it.id.split("|")[0] : it.id);
        if (bareId !== it.id) {
          sold[bareId] = (sold[bareId] || 0) + it.qty;
          rev[bareId]  = (rev[bareId]  || 0) + it.price * it.qty;
        }
      });
    });
    var cats = ["all", "metabolic", "repair", "growth", "longevity"];
    var chips = cats.map(function (c) { return "<button class='chip " + (prodFilter.cat === c ? "active" : "") + "' data-pcat='" + c + "'>" + (c === "all" ? "All" : c) + "</button>"; }).join("");

    var lowCount = state.products.filter(function (p) { return p.stock <= p.reorder; }).length;
    var totalUnits = state.products.reduce(function (a, p) { return a + p.stock; }, 0);
    var invValue = state.products.reduce(function (a, p) {
      if (p.variants && p.variants.length > 1) {
        return a + p.variants.reduce(function (b, v) { return b + (v.stock || 0) * v.cost; }, 0);
      }
      return a + p.stock * p.cost;
    }, 0);
    var html = "<div class='statrow' style='margin-bottom:18px'>"
      + "<div class='sr-cell'><div class='sr-k'>SKUs</div><div class='sr-v'>" + state.products.length + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Units on hand</div><div class='sr-v'>" + totalUnits.toLocaleString() + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Inventory value</div><div class='sr-v'>" + moneyK(invValue) + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Below reorder</div><div class='sr-v' style='color:" + (lowCount ? "var(--neg)" : "var(--pos)") + "'>" + lowCount + "</div></div></div>";

    html += "<div class='toolbar'>" + chips + "<div class='tb-spacer'></div>"
      + "<div class='mini-search'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg><input id='prodSearch' placeholder='Search product…' value='" + prodFilter.q + "'></div></div>";

    html += "<div class='card' style='padding:0'><div class='tbl-wrap'><table><thead><tr>"
      + "<th>Product</th><th>Category</th><th class='t-num'>Price</th><th class='t-num'>Margin</th><th class='t-num'>Sold 30d</th><th class='t-num'>Stock</th><th class='t-num'>3-Pack</th><th class='t-num'>5-Pack</th><th>Status</th><th>Purity</th>"
      + "</tr></thead><tbody id='prodBody'></tbody></table></div></div>";
    html += footNote();
    v.innerHTML = html;
    paintProducts(sold, rev);
  }
  function paintProducts(sold, rev) {
    var list = state.products.slice();
    if (prodFilter.cat !== "all") list = list.filter(function (p) { return p.cat === prodFilter.cat; });
    if (prodFilter.q) { var q = prodFilter.q.toLowerCase(); list = list.filter(function (p) { return p.name.toLowerCase().indexOf(q) >= 0; }); }
    list.sort(function (a, b) { return a.name.localeCompare(b.name); });

    var rows = "";
    list.forEach(function (p) {
      if (p.variants && p.variants.length > 1) {
        // Multi-size product: one row per variant
        p.variants.forEach(function (v, idx) {
          var key = p.id + "|" + v.size;
          var vstock = v.stock != null ? v.stock : 0;
          var low = vstock <= Math.round(p.reorder / p.variants.length);
          var crit = vstock <= Math.round(p.reorder / p.variants.length * 0.5);
          var statusPill = crit ? "<span class='pill hold'>reorder</span>" : low ? "<span class='pill verifying'>low</span>" : "<span class='pill released'>in stock</span>";
          var margin = (v.price - v.cost) / v.price * 100;
          var pk3 = Math.floor(vstock / 3);
          var pk5 = Math.floor(vstock / 5);
          var packCell = "<td class='t-num t-mut' style='font-size:12px'>" + pk3 + "</td><td class='t-num t-mut' style='font-size:12px'>" + pk5 + "</td>";
          if (idx === 0) {
            // First variant row: show product name + chip
            rows += "<tr><td><div class='cell-prod'><span class='prod-chip'>" + p.name.slice(0, 2).toUpperCase() + "</span><div><div class='t-strong'>" + p.name + "</div><div class='t-mut' style='font-size:11px;font-family:IBM Plex Mono,monospace'>" + v.size + "</div></div></div></td>"
              + "<td class='t-mut' style='text-transform:capitalize'>" + p.cat + "</td>"
              + "<td class='t-num'>" + money(v.price, 2) + "</td>"
              + "<td class='t-num'>" + margin.toFixed(0) + "%</td>"
              + "<td class='t-num'>" + (sold[p.id] || 0) + " <span class='t-mut' style='font-size:10px'>total</span></td>"
              + "<td class='t-num'><input type='number' min='0' class='stock-edit' data-pid='" + key + "' value='" + vstock + "' style='width:64px;text-align:right;background:transparent;border:1px solid var(--line);border-radius:6px;color:" + (crit ? "var(--neg)" : low ? "var(--accent)" : "inherit") + ";font:inherit;padding:3px 6px'></td>"
              + packCell
              + "<td>" + statusPill + "</td>"
              + "<td class='t-mut'>" + p.purity + "</td></tr>";
          } else {
            // Sub-variant row: indented size label, no chip/cat/sold
            rows += "<tr style='background:rgba(255,255,255,.02)'><td><div class='cell-prod' style='padding-left:44px'><div class='t-mut' style='font-size:11px;font-family:IBM Plex Mono,monospace'>" + v.size + "</div></div></td>"
              + "<td></td>"
              + "<td class='t-num'>" + money(v.price, 2) + "</td>"
              + "<td class='t-num'>" + margin.toFixed(0) + "%</td>"
              + "<td class='t-num t-mut'>" + (sold[key] || 0) + "</td>"
              + "<td class='t-num'><input type='number' min='0' class='stock-edit' data-pid='" + key + "' value='" + vstock + "' style='width:64px;text-align:right;background:transparent;border:1px solid var(--line);border-radius:6px;color:" + (crit ? "var(--neg)" : low ? "var(--accent)" : "inherit") + ";font:inherit;padding:3px 6px'></td>"
              + packCell
              + "<td>" + statusPill + "</td>"
              + "<td></td></tr>";
          }
        });
      } else {
        // Single-size product: original single row
        var margin = (p.price - p.cost) / p.price * 100;
        var low = p.stock <= p.reorder, crit = p.stock <= p.reorder * 0.5;
        var statusPill = crit ? "<span class='pill hold'>reorder</span>" : low ? "<span class='pill verifying'>low</span>" : "<span class='pill released'>in stock</span>";
        var pk3 = Math.floor(p.stock / 3);
        var pk5 = Math.floor(p.stock / 5);
        rows += "<tr><td><div class='cell-prod'><span class='prod-chip'>" + p.name.slice(0, 2).toUpperCase() + "</span><div><div class='t-strong'>" + p.name + "</div><div class='t-mut' style='font-size:11px;font-family:IBM Plex Mono,monospace'>" + p.size + "</div></div></div></td>"
          + "<td class='t-mut' style='text-transform:capitalize'>" + p.cat + "</td>"
          + "<td class='t-num'>" + money(p.price, 2) + "</td>"
          + "<td class='t-num'>" + margin.toFixed(0) + "%</td>"
          + "<td class='t-num'>" + (sold[p.id] || 0) + "</td>"
          + "<td class='t-num'><input type='number' min='0' class='stock-edit' data-pid='" + p.id + "' value='" + p.stock + "' style='width:64px;text-align:right;background:transparent;border:1px solid var(--line);border-radius:6px;color:" + (crit ? "var(--neg)" : low ? "var(--accent)" : "inherit") + ";font:inherit;padding:3px 6px'></td>"
          + "<td class='t-num t-mut' style='font-size:12px'>" + pk3 + "</td>"
          + "<td class='t-num t-mut' style='font-size:12px'>" + pk5 + "</td>"
          + "<td>" + statusPill + "</td>"
          + "<td class='t-mut'>" + p.purity + "</td></tr>";
      }
    });
    $("#prodBody").innerHTML = rows;

    Array.prototype.slice.call($("#prodBody").querySelectorAll(".stock-edit")).forEach(function(inp){
      inp.addEventListener("change", function(){
        var pid = inp.getAttribute("data-pid");
        D.setStock(state, pid, inp.value);
        if(window.ElyriaAPI && window.ElyriaAPI.configured){ window.ElyriaAPI.setStock(pid, Math.max(0, parseInt(inp.value,10)||0)); }
        renderProducts();
      });
    });
  }


  /* ============================================================
     VIEW: CUSTOMERS
     ============================================================ */
  var custSort = { key: "spent", dir: -1 }, custQ = "";
  function renderCustomers() {
    var v = $("#view-customers");
    var custs = state.customers.filter(function (c) { return c.orders > 0; });
    var repeat = custs.filter(function (c) { return c.orders > 1; }).length;
    var totalLtv = custs.reduce(function (a, c) { return a + c.spent; }, 0);
    var avgLtv = custs.length ? totalLtv / custs.length : 0;
    var inst = custs.filter(function (c) { return c.inst; }).length;

    var html = "<div class='statrow' style='margin-bottom:18px'>"
      + "<div class='sr-cell'><div class='sr-k'>Customers</div><div class='sr-v'>" + custs.length + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Repeat rate</div><div class='sr-v'>" + (custs.length ? Math.round(repeat / custs.length * 100) : 0) + "%</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Avg LTV</div><div class='sr-v'>" + money(avgLtv, 0) + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Institutions</div><div class='sr-v'>" + inst + "</div></div></div>";

    html += "<div class='toolbar'><div class='tb-spacer'></div><div class='mini-search'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg><input id='custSearch' placeholder='Search name or email…' value='" + custQ + "'></div></div>";

    html += "<div class='card' style='padding:0'><div class='tbl-wrap'><table><thead><tr>"
      + "<th>Customer</th><th>Type</th><th>Location</th><th class='sortable t-num' data-csort='orders'>Orders</th><th class='sortable t-num' data-csort='spent'>LTV</th><th>Source</th><th>Last order</th>"
      + "</tr></thead><tbody id='custBody'></tbody></table></div></div>";
    html += footNote();
    v.innerHTML = html;
    paintCustomers();
  }
  function paintCustomers() {
    var list = state.customers.filter(function (c) { return c.orders > 0; });
    if (custQ) { var q = custQ.toLowerCase(); list = list.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0 || c.email.toLowerCase().indexOf(q) >= 0; }); }
    list.sort(function (a, b) { return ((a[custSort.key] || 0) < (b[custSort.key] || 0) ? -1 : 1) * custSort.dir; });
    $("#custBody").innerHTML = list.slice(0, 50).map(function (c) {
      return "<tr><td><div class='cust-cell'><span class='cust-av' style='background:" + avatarColor(c.name) + "'>" + initials(c.name) + "</span><div class='cust-meta'><div class='cm-name'>" + c.name + "</div><div class='cm-email'>" + c.email + "</div></div></div></td>"
        + "<td>" + (c.inst ? "<span class='tag-inst'>" + c.inst + "</span>" : "<span class='t-mut'>Individual</span>") + "</td>"
        + "<td class='t-mut'>" + c.state + ", " + c.country + "</td>"
        + "<td class='t-num'>" + c.orders + "</td>"
        + "<td class='t-num t-strong'>" + money(c.spent, 0) + "</td>"
        + "<td class='t-mut'>" + c.source + "</td>"
        + "<td class='t-mut'>" + (c.last ? fmtDate(c.last) : "—") + "</td></tr>";
    }).join("");
  }

  /* ============================================================
     VIEW: ANALYTICS
     ============================================================ */
  function renderAnalytics() {
    var v = $("#view-analytics");
    var m = metrics(range);
    var html = "<div class='statrow' style='margin-bottom:18px'>"
      + "<div class='sr-cell'><div class='sr-k'>Sessions (est.)</div><div class='sr-v'>" + m.sessions.toLocaleString() + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Conversion</div><div class='sr-v'>" + m.conv.toFixed(1) + "%</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Units sold</div><div class='sr-v'>" + m.cur.units.toLocaleString() + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Refund rate</div><div class='sr-v' style='color:" + (m.cur.refundRate > 4 ? "var(--neg)" : "var(--pos)") + "'>" + m.cur.refundRate.toFixed(1) + "%</div></div></div>";

    html += "<div class='row c2'>"
      + "<div class='card'><div class='panel-head'><div><h3>Revenue trend</h3><div class='ph-sub'>Daily net revenue · last " + range + " days</div></div></div><div class='chart-wrap' id='anRev'></div></div>"
      + "<div class='card'><div class='panel-head'><div><h3>Category mix</h3><div class='ph-sub'>Revenue share</div></div></div><div class='donut-wrap'><div id='anDonut'></div><div class='donut-legend' id='anDonutLeg'></div></div></div>"
      + "</div>";

    html += "<div class='row c2'>"
      + "<div class='card'><div class='panel-head'><div><h3>Conversion funnel</h3><div class='ph-sub'>Estimated · last " + range + " days</div></div></div><div id='anFunnel'></div></div>"
      + "<div class='card'><div class='panel-head'><div><h3>Channel performance</h3><div class='ph-sub'>Orders & revenue by source</div></div></div><div class='barlist' id='anChan'></div></div>"
      + "</div>";

    html += "<div class='row'><div class='card'><div class='panel-head'><div><h3>Orders by hour</h3><div class='ph-sub'>When customers buy (UTC)</div></div></div><div class='heat' id='anHeat'></div></div></div>";
    html += footNote();
    v.innerHTML = html;

    // revenue line
    var revS = dailySeries(range, function (os) { return os.reduce(function (a, o) { return a + revOf(o); }, 0); });
    C.lineChart($("#anRev"), [{ name: "Revenue", color: "#e7c06a", data: revS.data }], revS.labels, { height: 230, yfmt: moneyK, tipfmt: moneyK });

    // category donut
    var catRev = {};
    state.orders.filter(function (o) { return inRange(o, range) && o.status !== "cancelled" && o.status !== "refunded"; }).forEach(function (o) {
      o.items.forEach(function (it) { var p = state.products.filter(function (x) { return x.id === it.id; })[0]; if (p) catRev[p.cat] = (catRev[p.cat] || 0) + it.price * it.qty; });
    });
    var cpal = { metabolic: "#e7c06a", repair: "#79a8d6", growth: "#7fcf8e", longevity: "#d8a6e0" };
    var csegs = Object.keys(catRev).map(function (k) { return { label: k, value: catRev[k], color: cpal[k] }; }).sort(function (a, b) { return b.value - a.value; });
    var ctot = csegs.reduce(function (a, s) { return a + s.value; }, 0);
    C.donut($("#anDonut"), csegs, { size: 158, stroke: 20, center: moneyK(ctot), centerSub: "REVENUE" });
    $("#anDonutLeg").innerHTML = csegs.map(function (s) { return "<div class='dleg'><i style='background:" + s.color + "'></i><span style='text-transform:capitalize'>" + s.label + "</span><span class='dl-v'>" + Math.round(s.value / ctot * 100) + "%</span></div>"; }).join("");

    // funnel
    var orders = m.cur.orders;
    var funnel = [
      { k: "Sessions", v: m.sessions, c: "#e7c06a" },
      { k: "Product views", v: Math.round(m.sessions * 0.52), c: "#cdab5e" },
      { k: "Add to cart", v: Math.round(m.sessions * 0.14), c: "#b9954e" },
      { k: "Checkout", v: Math.round(orders * 1.4), c: "#9c7d3f" },
      { k: "Purchase", v: orders, c: "#7fcf8e" }
    ];
    var fmax = funnel[0].v;
    $("#anFunnel").innerHTML = "<div class='barlist'>" + funnel.map(function (f, i) {
      var rate = i === 0 ? 100 : f.v / funnel[i - 1].v * 100;
      return "<div class='barrow'><span class='bl-name'>" + f.k + "</span><span class='bl-val'>" + f.v.toLocaleString() + (i ? " · " + rate.toFixed(0) + "%" : "") + "</span><div class='bartrack'><div class='barfill' style='width:" + (f.v / fmax * 100) + "%;background:" + f.c + "'></div></div></div>";
    }).join("") + "</div>";

    // channels
    var chan = {};
    state.orders.filter(function (o) { return inRange(o, range) && o.status !== "cancelled" && o.status !== "refunded"; }).forEach(function (o) {
      if (!chan[o.source]) chan[o.source] = { orders: 0, rev: 0 };
      chan[o.source].orders++; chan[o.source].rev += o.total;
    });
    var chList = Object.keys(chan).map(function (k) { return { k: k, orders: chan[k].orders, rev: chan[k].rev }; }).sort(function (a, b) { return b.rev - a.rev; });
    var chMax = chList.length ? chList[0].rev : 1;
    $("#anChan").innerHTML = chList.map(function (c) {
      return "<div class='barrow'><span class='bl-name'>" + c.k + "</span><span class='bl-val'>" + money(c.rev) + " · " + c.orders + " ord</span><div class='bartrack'><div class='barfill' style='width:" + (c.rev / chMax * 100) + "%'></div></div></div>";
    }).join("");

    // hour heat
    var hours = new Array(24).fill(0);
    state.orders.filter(function (o) { return inRange(o, range); }).forEach(function (o) { hours[new Date(o.ts).getHours()]++; });
    var hmax = Math.max.apply(null, hours) || 1;
    $("#anHeat").innerHTML = hours.map(function (h, i) {
      var op = 0.06 + h / hmax * 0.85;
      return "<i title='" + i + ":00 · " + h + " orders' style='background:rgba(231,192,106," + op.toFixed(2) + ")'></i>";
    }).join("");
  }

  /* ============================================================
     VIEW: DISCOUNTS
     ============================================================ */
  function renderDiscounts() {
    var v = $("#view-discounts");
    var totalDiscRev = state.discounts.reduce(function (a, d) { return a + (d.revenue || 0); }, 0);
    var totalUses = state.discounts.reduce(function (a, d) { return a + d.uses; }, 0);
    var active = state.discounts.filter(function (d) { return d.status === "active"; }).length;

    var html = "<div class='statrow' style='margin-bottom:18px'>"
      + "<div class='sr-cell'><div class='sr-k'>Active codes</div><div class='sr-v'>" + active + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Total redemptions</div><div class='sr-v'>" + totalUses.toLocaleString() + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Revenue w/ code</div><div class='sr-v'>" + moneyK(totalDiscRev) + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Avg redemptions</div><div class='sr-v'>" + Math.round(totalUses / state.discounts.length) + "</div></div></div>";

    html += "<div class='toolbar'><div class='tb-spacer'></div><button class='abtn ghost' id='newCode'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.8'><path d='M12 5v14M5 12h14'/></svg>New code</button></div>";

    html += "<div class='card' style='padding:0'><div class='tbl-wrap'><table><thead><tr>"
      + "<th>Code</th><th>Description</th><th>Type</th><th class='t-num'>Redemptions</th><th class='t-num'>Revenue</th><th>Status</th><th></th>"
      + "</tr></thead><tbody id='discBody'></tbody></table></div></div>";
    html += footNote();
    v.innerHTML = html;
    paintDiscounts();
    $("#newCode").addEventListener("click", function () { toast("New code form — stub for handoff"); });
  }
  function paintDiscounts() {
    $("#discBody").innerHTML = state.discounts.map(function (d) {
      var typeLabel = d.type === "pct" ? d.value + "% off" : d.type === "fixed" ? "$" + d.value + " off" : "Free shipping";
      return "<tr><td class='t-id' style='font-size:13px;color:var(--accent)'>" + d.code + "</td>"
        + "<td>" + d.desc + "</td>"
        + "<td class='t-mut'>" + typeLabel + (d.cap ? " · cap " + d.cap : "") + "</td>"
        + "<td class='t-num'>" + d.uses.toLocaleString() + "</td>"
        + "<td class='t-num'>" + money(d.revenue || 0) + "</td>"
        + "<td><span class='pill " + d.status + "'>" + d.status + "</span></td>"
        + "<td class='t-num'><button class='chip' data-toggle='" + d.code + "'>" + (d.status === "active" ? "Pause" : "Activate") + "</button></td></tr>";
    }).join("");
    $$("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var code = b.getAttribute("data-toggle");
        var d = state.discounts.filter(function (x) { return x.code === code; })[0];
        d.status = d.status === "active" ? "paused" : "active";
        D.persist(state); paintDiscounts(); toast(code + " " + (d.status === "active" ? "activated" : "paused"));
      });
    });
  }

  /* ============================================================
     VIEW: AFFILIATES
     ============================================================ */
  var affFilter = { status: "all", q: "", sort: "revenue", dir: -1 };
  function affRevenue(a, days) { // attributed net revenue in window
    return state.orders.filter(function (o) { return o.affiliate === a.id && inRange(o, days) && o.status !== "cancelled" && o.status !== "refunded"; })
      .reduce(function (s, o) { return s + o.total; }, 0);
  }
  function renderAffiliates() {
    var v = $("#view-affiliates");
    var affs = state.affiliates;
    var activeCount = affs.filter(function (a) { return a.status === "active"; }).length;
    var pending = state.applications.length;
    var clicks30 = affs.reduce(function (a, x) { return a + x.clicks30; }, 0);
    var convTot = affs.reduce(function (a, x) { return a + x.conversions; }, 0);
    var clicksLife = affs.reduce(function (a, x) { return a + x.clicksLife; }, 0);
    var cr = clicksLife ? convTot / clicksLife * 100 : 0;
    var revPeriod = affs.reduce(function (a, x) { return a + affRevenue(x, range); }, 0);
    var owed = affs.reduce(function (a, x) { return a + x.owed; }, 0);
    var paidTot = affs.reduce(function (a, x) { return a + x.paid; }, 0);

    var html = "<div class='statrow' style='margin-bottom:18px'>"
      + "<div class='sr-cell'><div class='sr-k'>Active affiliates</div><div class='sr-v'>" + activeCount + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Clicks · " + range + "d</div><div class='sr-v'>" + clicks30.toLocaleString() + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Conversion</div><div class='sr-v'>" + cr.toFixed(1) + "%</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Commission owed</div><div class='sr-v' style='color:" + (owed > 0 ? "var(--accent)" : "var(--pos)") + "'>" + moneyK(owed) + "</div></div></div>";

    // applications banner
    if (pending) {
      html += "<div class='card' style='margin-bottom:16px'><div class='panel-head'><div><h3>Pending applications</h3><div class='ph-sub'>" + pending + " awaiting review</div></div></div><div id='affApps'></div></div>";
    }

    // chart + payout summary
    html += "<div class='row c2'>"
      + "<div class='card'><div class='panel-head'><div><h3>Affiliate-driven revenue</h3><div class='ph-sub'>Net attributed · last " + range + " days</div></div><div class='legend'><span><i style='background:#e7c06a'></i>Revenue</span></div></div><div class='chart-wrap' id='affChart'></div></div>"
      + "<div class='card'><div class='panel-head'><div><h3>Program payouts</h3></div></div>"
      + "<div class='d-line'><span class='dl-k'>Revenue driven · " + range + "d</span><span class='dl-v'>" + money(revPeriod) + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Lifetime commission paid</span><span class='dl-v'>" + money(paidTot) + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Outstanding balance</span><span class='dl-v' style='color:var(--accent)'>" + money(owed) + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Payable now (cleared ≥$50)</span><span class='dl-v'>" + affs.filter(function (a) { return a.owed >= 50 && a.guidelinesAck && !a.frozen; }).length + "</span></div>"
      + "<div class='d-line'><span class='dl-k'>Blocked (guidelines or freeze)</span><span class='dl-v' style='color:" + (affs.filter(function (a) { return a.owed >= 50 && (!a.guidelinesAck || a.frozen); }).length ? "var(--neg)" : "var(--mist)") + "'>" + affs.filter(function (a) { return a.owed >= 50 && (!a.guidelinesAck || a.frozen); }).length + "</span></div>"
      + "<div style='margin-top:16px'><button class='abtn solid' id='payAll' style='width:100%'>Run monthly payout batch</button></div>"
      + "<div class='foot-note' style='margin-top:14px'><span>Payouts gated on accepted compliance guidelines · Tiers: " + state.tiers.map(function (t) { return t.name + " " + t.rate + "%"; }).join(" \u00b7 ") + "</span></div>"
      + "</div></div>";

    // toolbar
    var statuses = ["all", "active", "paused"];
    var chips = statuses.map(function (s) { return "<button class='chip " + (affFilter.status === s ? "active" : "") + "' data-affstatus='" + s + "'>" + (s === "all" ? "All" : s) + "</button>"; }).join("");
    html += "<div class='toolbar' style='margin-top:16px'>" + chips
      + "<div class='tb-spacer'></div>"
      + "<a class='abtn ghost' href='Elyria Bio Affiliate Portal.html' target='_blank'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/></svg>Affiliate portal</a>"
      + "<a class='abtn ghost' href='Elyria Bio Affiliate Program.html' target='_blank'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M15 3h6v6M10 14L21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/></svg>Public page</a>"
      + "<div class='mini-search'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><circle cx='11' cy='11' r='7'/><path d='M21 21l-4.3-4.3'/></svg><input id='affSearch' placeholder='Search affiliate, code\u2026' value='" + affFilter.q + "'></div></div>";

    html += "<div class='card' style='padding:0'><div class='tbl-wrap'><table><thead><tr>"
      + "<th>Affiliate</th><th>Channel</th><th>Tier</th><th>Code</th><th class='sortable t-num' data-asort='clicks30'>Clicks " + range + "d</th><th class='sortable t-num' data-asort='conversions'>Conv.</th><th class='sortable t-num' data-asort='revenue'>Revenue</th><th class='t-num'>Owed</th><th>Status</th>"
      + "</tr></thead><tbody id='affBody'></tbody></table></div></div>";
    html += footNote();
    v.innerHTML = html;

    // chart
    var s = dailySeries(range, function (os) { return os.filter(function (o) { return o.source === "Affiliate" && o.status !== "cancelled" && o.status !== "refunded"; }).reduce(function (a, o) { return a + o.total; }, 0); });
    C.lineChart($("#affChart"), [{ name: "Revenue", color: "#e7c06a", data: s.data }], s.labels, { height: 220, yfmt: moneyK, tipfmt: moneyK });

    if (pending) paintApps();
    paintAffiliates();

    $("#payAll").addEventListener("click", function () {
      var due = state.affiliates.filter(function (a) { return a.owed >= 50 && a.guidelinesAck && !a.frozen; });
      var blocked = state.affiliates.filter(function (a) { return a.owed >= 50 && (!a.guidelinesAck || a.frozen); });
      if (!due.length) { toast(blocked.length ? blocked.length + " due but blocked (guidelines / freeze)" : "No balances over $50 minimum"); return; }
      var sum = 0;
      due.forEach(function (a) { sum += a.owed; a.payouts.unshift({ date: Date.now(), amount: a.owed, method: "Batch (ACH)", status: "paid" }); a.paid += a.owed; a.owed = 0; });
      D.persist(state);
      toast("Paid " + money(sum, 2) + " to " + due.length + " affiliates" + (blocked.length ? " · " + blocked.length + " skipped (no guidelines)" : ""));
      renderAffiliates();
    });
  }
  function paintApps() {
    $("#affApps").innerHTML = state.applications.map(function (ap) {
      return "<div class='alert-item info' style='background:rgba(var(--accent-rgb),.03)'><span class='cust-av' style='background:" + avatarColor(ap.name) + "'>" + initials(ap.name) + "</span>"
        + "<div class='ai-body'><div class='ai-title'>" + ap.name + " <span class='t-mut' style='font-weight:400'>· @" + ap.handle + "</span></div>"
        + "<div class='ai-sub'>" + ap.channel + " · " + ap.audience + " — " + ap.note + "</div></div>"
        + "<div class='btn-row'><button class='abtn solid' data-approve='" + ap.id + "'>Approve</button><button class='abtn ghost' data-decline='" + ap.id + "'>Decline</button></div></div>";
    }).join("");
  }
  function paintAffiliates() {
    var list = state.affiliates.slice();
    if (affFilter.status !== "all") list = list.filter(function (a) { return a.status === affFilter.status; });
    if (affFilter.q) { var q = affFilter.q.toLowerCase(); list = list.filter(function (a) { return a.name.toLowerCase().indexOf(q) >= 0 || a.code.toLowerCase().indexOf(q) >= 0 || a.handle.toLowerCase().indexOf(q) >= 0; }); }
    list.sort(function (a, b) {
      var x = affFilter.sort === "revenue" ? affRevenue(a, range) : a[affFilter.sort];
      var y = affFilter.sort === "revenue" ? affRevenue(b, range) : b[affFilter.sort];
      return (x < y ? -1 : x > y ? 1 : 0) * affFilter.dir;
    });
    var tierCls = { starter: "cancelled", pro: "verifying", elite: "delivered" };
    $("#affBody").innerHTML = list.map(function (a) {
      return "<tr class='clickable' data-aff='" + a.id + "'>"
        + "<td><div class='cust-cell'><span class='cust-av' style='background:" + avatarColor(a.name) + "'>" + initials(a.name) + "</span><div class='cust-meta'><div class='cm-name'>" + a.name + "</div><div class='cm-email'>@" + a.handle + "</div></div></div></td>"
        + "<td class='t-mut'>" + a.channel + "</td>"
        + "<td><span class='pill " + tierCls[a.tier] + "'>" + a.tierName + " " + a.rate + "%</span></td>"
        + "<td class='t-id' style='color:var(--accent)'>" + a.code + "</td>"
        + "<td class='t-num'>" + a.clicks30.toLocaleString() + "</td>"
        + "<td class='t-num'>" + a.conversions + "</td>"
        + "<td class='t-num t-strong'>" + money(affRevenue(a, range)) + "</td>"
        + "<td class='t-num' style='color:" + (a.owed >= 50 ? "var(--accent)" : "var(--mist)") + "'>" + money(a.owed, 0) + "</td>"
        + "<td><span class='pill " + (a.status === "active" ? "active" : a.status === "suspended" ? "refunded" : "paused") + "'>" + a.status + "</span>" + (a.strikes && a.strikes.length ? " <span class='pill hold' title='conduct strikes'>⚑ " + a.strikes.length + "</span>" : "") + "</td></tr>";
    }).join("");
  }
  function openAffiliate(id) {
    var a = state.affiliates.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var link = "elyria.bio/?ref=" + a.code;
    var refs = state.orders.filter(function (o) { return o.affiliate === a.id; }).sort(function (x, y) { return y.ts - x.ts; }).slice(0, 8);
    var tier = state.tiers.filter(function (t) { return t.id === a.tier; })[0];
    var nextTier = state.tiers[state.tiers.indexOf(tier) + 1];
    var tierProg = nextTier ? Math.min(100, a.revenue / nextTier.min * 100) : 100;

    var body = "<div class='d-section'><span class='micro'>Referral code & link</span>"
      + "<div class='coa-mini' style='display:flex;flex-direction:column;gap:10px'>"
      + "<div style='display:flex;align-items:center;justify-content:space-between;gap:10px'><span class='t-id' style='color:var(--accent);font-size:15px'>" + a.code + "</span><button class='chip' data-copy='" + a.code + "'>Copy code</button></div>"
      + "<div style='display:flex;align-items:center;justify-content:space-between;gap:10px'><span class='mono' style='font-size:12px;color:var(--mist)'>" + link + "</span><button class='chip' data-copy='" + link + "'>Copy link</button></div>"
      + "</div></div>";

    body += "<div class='d-section'><span class='micro'>Performance</span>"
      + "<div class='statrow' style='grid-template-columns:1fr 1fr'>"
      + "<div class='sr-cell'><div class='sr-k'>Clicks (life)</div><div class='sr-v' style='font-size:20px'>" + a.clicksLife.toLocaleString() + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Conversions</div><div class='sr-v' style='font-size:20px'>" + a.conversions + "</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Conv. rate</div><div class='sr-v' style='font-size:20px'>" + a.cr.toFixed(1) + "%</div></div>"
      + "<div class='sr-cell'><div class='sr-k'>Revenue driven</div><div class='sr-v' style='font-size:20px'>" + moneyK(a.revenue) + "</div></div>"
      + "</div></div>";

    body += "<div class='d-section'><span class='micro'>Tier · " + a.tierName + " (" + a.rate + "%)</span>"
      + (nextTier ? "<div style='font-size:12px;color:var(--mist);margin-bottom:8px'>" + money(nextTier.min - a.revenue) + " more revenue to " + nextTier.name + " (" + nextTier.rate + "%)</div><div class='bartrack'><div class='barfill' style='width:" + tierProg + "%'></div></div>"
        : "<div style='font-size:12px;color:var(--pos)'>Top tier reached.</div>") + "</div>";

    body += "<div class='d-section'><span class='micro'>Commission</span>"
      + "<div class='d-tot'><span class='dt-k'>Earned (lifetime)</span><span>" + money(a.earned, 2) + "</span></div>"
      + "<div class='d-tot'><span class='dt-k'>Paid out</span><span>" + money(a.paid, 2) + "</span></div>"
      + "<div class='d-tot grand'><span class='dt-k'>Balance owed</span><span class='dt-v'>" + money(a.owed, 2) + "</span></div>"
      + (a.owed < 50
        ? "<div style='font-size:12px;color:var(--mist-2);margin-top:10px'>Below $50 payout minimum.</div>"
        : a.guidelinesAck
          ? "<button class='abtn solid' data-payaff='" + a.id + "' style='width:100%;margin-top:12px'>Pay out " + money(a.owed, 2) + "</button>"
          : "<div class='coa-mini' style='margin-top:12px;border-color:rgba(232,140,106,.3);display:flex;align-items:center;gap:10px'><span class='pill refunded'>Payout blocked</span><span class='t-mut' style='font-size:12px'>Affiliate must accept the guidelines first</span></div>") + "</div>";

    if (refs.length) {
      body += "<div class='d-section'><span class='micro'>Recent referrals</span>" + refs.map(function (o) {
        return "<div class='d-item'><div class='di-meta'><div class='di-name'>" + o.id + " · " + esc(o.custName) + "</div><div class='di-sub'>" + fmtDate(o.ts) + " · " + o.status + "</div></div><span class='di-price'>" + money(o.total, 2) + "</span></div>";
      }).join("") + "</div>";
    }

    body += "<div class='d-section'><span class='micro'>Payout history</span>" + (a.payouts.length ? a.payouts.map(function (p) {
      return "<div class='d-line'><span class='dl-k'>" + fmtDate(p.date) + " · " + p.method + "</span><span class='dl-v'>" + money(p.amount, 2) + "</span></div>";
    }).join("") : "<div style='font-size:12px;color:var(--mist-2)'>No payouts yet.</div>") + "</div>";

    body += "<div class='d-section'><span class='micro'>Compliance &amp; conduct</span>"
      + (a.guidelinesAck
        ? "<div class='coa-mini' style='display:flex;align-items:center;gap:12px;border-color:rgba(127,207,142,.3)'><span class='pill released'>Guidelines accepted</span><span class='t-mut' style='font-size:12px'>v1.0 · " + fmtDate(a.guidelinesAck) + "</span></div>"
        : "<div class='coa-mini' style='display:flex;align-items:center;gap:12px;border-color:rgba(232,140,106,.3)'><span class='pill refunded'>Not accepted</span><span class='t-mut' style='font-size:12px'>Promotion should be paused until accepted</span></div>")
      + (a.suspended
        ? "<div class='alert-item neg' style='margin-top:10px'><span class='ai-ic'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><path d='M18 6L6 18M6 6l12 12'/></svg></span><div class='ai-body'><div class='ai-title'>Suspended for conduct</div><div class='ai-sub'>Account terminated, unpaid balance frozen</div></div></div>"
        : a.frozen
          ? "<div class='alert-item warn' style='margin-top:10px'><span class='ai-ic'><svg viewBox='0 0 24 24' fill='none' stroke-width='1.7'><rect x='5' y='11' width='14' height='9' rx='2'/><path d='M8 11V8a4 4 0 0 1 8 0v3'/></svg></span><div class='ai-body'><div class='ai-title'>Balance frozen, paused</div><div class='ai-sub'>Active violation — resolve to lift the freeze</div></div></div>"
          : "")
      + "<div style='display:flex;align-items:center;justify-content:space-between;margin:14px 0 8px'><span class='micro'>Strike history (" + a.strikes.length + "/3)</span>" + (a.strikes.length ? "<button class='chip' data-resolve='" + a.id + "'>Resolve &amp; reinstate</button>" : "") + "</div>"
      + (a.strikes.length ? a.strikes.map(function (s) {
          var sc = s.severity === "severe" ? "refunded" : s.severity === "major" ? "hold" : "verifying";
          return "<div class='coa-mini' style='margin-bottom:8px'><div style='display:flex;align-items:center;justify-content:space-between;gap:10px'><span class='t-strong'>" + s.reason + "</span><span class='pill " + sc + "'>" + s.severity + "</span></div><div class='t-mut' style='font-size:12px;margin-top:5px'>" + fmtDate(s.date) + (s.note ? " - " + s.note : "") + "</div></div>";
        }).join("") : "<div style='font-size:12px;color:var(--mist-2);margin-bottom:6px'>No violations on record.</div>")
      + "<details style='margin-top:10px'><summary style='cursor:pointer;font-size:13px;color:var(--accent-dim);font-family:IBM Plex Mono,monospace'>+ Log a violation</summary>"
      + "<div style='margin-top:12px;display:flex;flex-direction:column;gap:10px'>"
      + "<select class='sel' id='strikeSev' style='width:100%'><option value='minor'>Minor - warning only</option><option value='major' selected>Major - freeze balance + pause</option><option value='severe'>Severe - suspend + forfeit</option></select>"
      + "<select class='sel' id='strikeReason' style='width:100%'><option>Human-use / consumption claim</option><option>Dosing / administration claim</option><option>Medical or therapeutic claim</option><option>Missing FTC disclosure</option><option>Prohibited targeting</option><option>Fraud / cookie stuffing</option><option>Trademark / brand misuse</option><option>Other</option></select>"
      + "<input id='strikeNote' class='sel' style='width:100%' placeholder='Note (link to content, context)' />"
      + "<button class='abtn danger' data-logstrike='" + a.id + "'>Record strike</button>"
      + "<div style='font-size:11px;color:var(--mist-2)'>3 strikes auto-suspends. Major/severe freeze the balance immediately.</div>"
      + "</div></details>"
      + "<div style='font-size:12px;color:var(--mist-2);margin-top:9px'>Research-use-only · no human-use, dosing, or medical claims. <a href='Elyria Bio Affiliate Guidelines.html' target='_blank' style='color:var(--accent-dim)'>View guidelines \u2197</a></div></div>";

    body += "<div class='d-section'><div class='btn-row'>"
      + "<button class='abtn ghost' data-affstatus-toggle='" + a.id + "'>" + (a.status === "active" ? "Pause affiliate" : "Reactivate") + "</button>"
      + "<button class='abtn ghost' data-copy='" + a.email + "'>Copy email</button>"
      + "</div></div>";

    $("#drawerTitle").textContent = a.name;
    $("#drawerSub").textContent = a.tierName + " · @" + a.handle + " · joined " + fmtDate(a.joined);
    $("#drawerBody").innerHTML = body;
    $("#drawer").classList.add("open");
    $("#drawerBack").classList.add("open");

    $$("[data-copy]", $("#drawerBody")).forEach(function (b) { b.addEventListener("click", function () { copyText(b.getAttribute("data-copy")); }); });
    var pay = $("[data-payaff]", $("#drawerBody"));
    if (pay) pay.addEventListener("click", function () {
      a.payouts.unshift({ date: Date.now(), amount: a.owed, method: "Manual (ACH)", status: "paid" }); a.paid += a.owed;
      toast("Paid " + money(a.owed, 2) + " to " + a.name); a.owed = 0; D.persist(state); closeDrawer(); renderAffiliates();
    });
    var tog = $("[data-affstatus-toggle]", $("#drawerBody"));
    if (tog) tog.addEventListener("click", function () {
      a.status = a.status === "active" ? "paused" : "active"; state.affOverrides[a.id] = a.status; D.persist(state);
      toast(a.name + " " + a.status); closeDrawer(); renderAffiliates();
    });
    var ls = $("[data-logstrike]", $("#drawerBody"));
    if (ls) ls.addEventListener("click", function () {
      var sev = $("#strikeSev").value, reason = $("#strikeReason").value, note = $("#strikeNote").value.trim();
      if (!state.strikes[a.id]) state.strikes[a.id] = [];
      state.strikes[a.id].push({ id: "STR-" + Date.now().toString().slice(-6), date: Date.now(), severity: sev, reason: reason, note: note });
      applyStrikeState(a); D.persist(state);
      toast("Strike recorded — " + (a.suspended ? "affiliate suspended" : a.frozen ? "balance frozen, paused" : "warning logged"));
      renderAffiliates(); refreshBadges(); openAffiliate(a.id);
    });
    var rs = $("[data-resolve]", $("#drawerBody"));
    if (rs) rs.addEventListener("click", function () {
      state.strikes[a.id] = []; applyStrikeState(a); D.persist(state);
      toast(a.name + " reinstated — freeze lifted"); renderAffiliates(); refreshBadges(); openAffiliate(a.id);
    });
  }
  function applyStrikeState(a) {
    a.strikes = state.strikes[a.id] || [];
    a.suspended = a.strikes.some(function (s) { return s.severity === "severe"; }) || a.strikes.length >= 3;
    a.frozen = a.suspended || a.strikes.some(function (s) { return s.severity === "major"; });
    if (a.suspended) a.status = "suspended";
    else if (a.frozen) a.status = "paused";
    else a.status = state.affOverrides[a.id] || "active";
  }
  function copyText(t) {
    try { navigator.clipboard.writeText(t); } catch (e) {}
    toast("Copied: " + (t.length > 30 ? t.slice(0, 30) + "\u2026" : t));
  }
  function approveApp(id) {
    var ap = state.applications.filter(function (x) { return x.id === id; })[0]; if (!ap) return;
    state.approvedApps[id] = true;
    // promote into roster (starter tier, no performance yet)
    state.affiliates.push({ id: "AF-" + (2000 + state.affiliates.length), name: ap.name, handle: ap.handle, email: ap.email,
      code: ap.handle.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) + "10", channel: ap.channel, audience: ap.audience,
      status: "active", joined: Date.now(), clicksLife: 0, clicks30: 0, conversions: 0, revenue: 0, cr: 0,
      tier: "starter", tierName: "Starter", rate: 10, earned: 0, paid: 0, owed: 0, payouts: [] });
    state.applications = state.applications.filter(function (x) { return x.id !== id; });
    D.persist(state); toast(ap.name + " approved — code issued"); renderAffiliates(); refreshBadges();
  }
  function declineApp(id) {
    var ap = state.applications.filter(function (x) { return x.id === id; })[0]; if (!ap) return;
    state.approvedApps[id] = true;
    state.applications = state.applications.filter(function (x) { return x.id !== id; });
    D.persist(state); toast(ap.name + " declined"); renderAffiliates(); refreshBadges();
  }

  /* ============================================================
     ROUTER + CHROME
     ============================================================ */
  function footNote() {
    return "<div class='foot-note'><span class='ruo'>Research Use Only</span><span>· Demo dataset · figures are generated for design review, not live sales.</span></div>";
  }
  var VIEWS = {
    overview: { title: "Overview", crumb: "Dashboard / Overview", fn: renderOverview, range: true },
    orders: { title: "Orders", crumb: "Commerce / Orders", fn: renderOrders, range: false },
    payments: { title: "Payments", crumb: "Commerce / Payments", fn: renderPayments, range: false },
    products: { title: "Products & inventory", crumb: "Catalog / Inventory", fn: renderProducts, range: false },
    customers: { title: "Customers", crumb: "Commerce / Customers", fn: renderCustomers, range: false },
    analytics: { title: "Analytics", crumb: "Insights / Analytics", fn: renderAnalytics, range: true },
    discounts: { title: "Discounts", crumb: "Marketing / Discounts", fn: renderDiscounts, range: false },
    affiliates: { title: "Affiliates", crumb: "Marketing / Affiliate program", fn: renderAffiliates, range: true }
  };
  var current = "overview";
  function go(name) {
    if (!VIEWS[name]) name = "overview";
    current = name;
    $$(".view").forEach(function (v) { v.hidden = true; });
    $("#view-" + name).hidden = false;
    $$(".nav-item").forEach(function (n) { n.classList.toggle("active", n.getAttribute("data-nav") === name); });
    $("#pageTitle").textContent = VIEWS[name].title;
    $("#pageCrumb").textContent = VIEWS[name].crumb;
    $("#rangeTabs").style.display = VIEWS[name].range ? "flex" : "none";
    VIEWS[name].fn();
    history.replaceState(null, "", "#" + name);
    document.querySelector(".main").scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
  function refreshBadges() {
    var pending = liveOrders().filter(function (o) { return o.status === "paid" || o.status === "verifying" || o.status === "packing"; }).length;
    var low = state.products.filter(function (p) { return p.stock <= p.reorder; }).length;
    var ob = $("[data-nav='orders'] .badge"); if (ob) ob.textContent = pending;
    var pb = $("[data-nav='products'] .badge"); if (pb) { pb.textContent = low; pb.classList.toggle("alert", low > 0); }
    var ab = $("[data-nav='affiliates'] .badge"); if (ab) { ab.textContent = state.applications.length; ab.classList.toggle("alert", state.applications.length > 0); }
    var yb = $("[data-nav='payments'] .badge");
    if (yb) { var np = payRowsAll().filter(function (r) { return r.state === "submitted"; }).length; yb.textContent = np; yb.classList.toggle("alert", np > 0); }
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var pst = e.target.closest("[data-paystatus]"); if (pst) { payFilter = pst.getAttribute("data-paystatus"); renderPayments(); return; }
    var pap = e.target.closest("[data-pay-approve]"); if (pap) { payDecide(pap.getAttribute("data-pay-approve"), true); return; }
    var prj = e.target.closest("[data-pay-reject]"); if (prj) { payDecide(prj.getAttribute("data-pay-reject"), false); return; }
    var psh = e.target.closest("[data-payshot]"); if (psh) { openPayShot(psh.getAttribute("data-payshot")); return; }
    var nav = e.target.closest("[data-nav]"); if (nav) { go(nav.getAttribute("data-nav")); return; }
    var goto = e.target.closest("[data-goto]"); if (goto) { go(goto.getAttribute("data-goto")); return; }
    var ord = e.target.closest("[data-order]"); if (ord) { openOrder(ord.getAttribute("data-order")); return; }
    var aff = e.target.closest("[data-aff]"); if (aff) { openAffiliate(aff.getAttribute("data-aff")); return; }
    var afs = e.target.closest("[data-affstatus]"); if (afs) { affFilter.status = afs.getAttribute("data-affstatus"); $$("[data-affstatus]").forEach(function (b) { b.classList.toggle("active", b === afs); }); paintAffiliates(); return; }
    var ast = e.target.closest("[data-asort]"); if (ast) { var ak = ast.getAttribute("data-asort"); if (affFilter.sort === ak) affFilter.dir *= -1; else { affFilter.sort = ak; affFilter.dir = -1; } paintAffiliates(); return; }
    var appA = e.target.closest("[data-approve]"); if (appA) { approveApp(appA.getAttribute("data-approve")); return; }
    var appD = e.target.closest("[data-decline]"); if (appD) { declineApp(appD.getAttribute("data-decline")); return; }
    var os = e.target.closest("[data-ostatus]"); if (os) { ordFilter.status = os.getAttribute("data-ostatus"); $$("[data-ostatus]").forEach(function (b) { b.classList.toggle("active", b === os); }); paintOrders(); return; }
    var pc = e.target.closest("[data-pcat]"); if (pc) { prodFilter.cat = pc.getAttribute("data-pcat"); renderProducts(); return; }
    var sortTh = e.target.closest("[data-sort]"); if (sortTh) { var k = sortTh.getAttribute("data-sort"); if (ordFilter.sort === k) ordFilter.dir *= -1; else { ordFilter.sort = k; ordFilter.dir = -1; } paintOrders(); return; }
    var cs = e.target.closest("[data-csort]"); if (cs) { var ck = cs.getAttribute("data-csort"); if (custSort.key === ck) custSort.dir *= -1; else { custSort.key = ck; custSort.dir = -1; } paintCustomers(); return; }
    if (e.target.closest("#drawerBack") || e.target.closest("#drawerClose")) closeDrawer();
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "ordSearch") { ordFilter.q = e.target.value; paintOrders(); }
    if (e.target.id === "prodSearch") { prodFilter.q = e.target.value; renderProducts(); var i = $("#prodSearch"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    if (e.target.id === "custSearch") { custQ = e.target.value; paintCustomers(); }
    if (e.target.id === "affSearch") { affFilter.q = e.target.value; paintAffiliates(); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });

  $$("#rangeTabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      range = parseInt(b.getAttribute("data-range"), 10);
      $$("#rangeTabs button").forEach(function (x) { x.classList.toggle("active", x === b); });
      if (VIEWS[current].range) VIEWS[current].fn();
    });
  });
  window.addEventListener("resize", function () { if (VIEWS[current].range || current === "analytics" || current === "overview") VIEWS[current].fn(); });

  // boot
  refreshBadges();
  var initial = (location.hash || "").replace("#", "");
  go(VIEWS[initial] ? initial : "overview");
})();
