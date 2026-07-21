/* ============================================================
   ELYRIA BIO — AFFILIATE PORTAL / app
   Renders ONE affiliate's view (the logged-in partner) from the
   shared dataset. Affiliate is fixed here for the demo.
   ============================================================ */
(function () {
  "use strict";
  var D = window.ElyriaData, C = window.Charts;
  var state = D.load();
  var ME = "AF-1001"; // the "logged-in" affiliate
  var a = state.affiliates.filter(function (x) { return x.id === ME; })[0];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function money(n, dec) { return "$" + (n || 0).toLocaleString("en-US", { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function moneyK(n) { return n >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n); }
  function fmtDate(ts) { return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  function initials(n) { return n.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase(); }
  function avatarColor(seed) { var hues = [42, 38, 30, 46, 34, 50]; return "hsl(" + hues[seed.charCodeAt(0) % hues.length] + " 55% 62%)"; }
  function toast(msg) {
    var wrap = $("#toastWrap");
    var el = document.createElement("div"); el.className = "toast";
    el.innerHTML = "<svg viewBox='0 0 24 24' fill='none' stroke-width='1.8'><path d='M20 6L9 17l-5-5'/></svg>" + msg;
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("in"); });
    setTimeout(function () { el.classList.remove("in"); setTimeout(function () { el.remove(); }, 320); }, 2400);
  }
  function copyText(t) { try { navigator.clipboard.writeText(t); } catch (e) {} toast("Copied to clipboard"); }

  /* ---------- compliance acknowledgment ---------- */
  function renderCompliance() {
    var bar = $("#complianceBar");
    if (a.suspended || a.frozen) {
      bar.innerHTML = "<div class='card' style='display:flex;align-items:center;gap:14px;margin-top:22px;border-color:rgba(232,140,106,.45);background:rgba(232,140,106,.05)'>"
        + "<span style='width:34px;height:34px;border-radius:9px;flex:none;display:grid;place-items:center;background:rgba(232,140,106,.14)'><svg viewBox='0 0 24 24' fill='none' stroke='#e88c6a' stroke-width='1.7' style='width:17px;height:17px'><rect x='5' y='11' width='14' height='9' rx='2'/><path d='M8 11V8a4 4 0 0 1 8 0v3'/></svg></span>"
        + "<div style='flex:1'><div style='font-weight:500'>" + (a.suspended ? "Account suspended" : "Compliance review — payouts frozen") + "</div><div style='font-size:12px;color:var(--mist-2)'>" + (a.suspended ? "Following a guideline violation. Contact your partner manager." : "Flagged content must be corrected to lift the freeze.") + "</div></div>"
        + "<a href='Elyria Bio Affiliate Guidelines.html' class='abtn ghost'>Guidelines</a></div>";
      return;
    }
    var ack = null;
    try { ack = JSON.parse(localStorage.getItem("elyria_aff_guidelines_ack")); } catch (e) {}
    if (ack && ack.v) {
      bar.innerHTML = "<div class='card' style='display:flex;align-items:center;gap:14px;margin-top:22px;border-color:rgba(127,207,142,.3)'>"
        + "<span style='width:34px;height:34px;border-radius:9px;flex:none;display:grid;place-items:center;background:rgba(127,207,142,.12)'><svg viewBox='0 0 24 24' fill='none' stroke='#7fcf8e' stroke-width='2' style='width:17px;height:17px'><path d='M20 6L9 17l-5-5'/></svg></span>"
        + "<div style='flex:1'><div style='font-weight:500'>Compliance guidelines acknowledged</div><div style='font-size:12px;color:var(--mist-2)'>v" + ack.v + " · " + new Date(ack.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " — research-use-only, no human-use or dosing claims.</div></div>"
        + "<a href='Elyria Bio Affiliate Guidelines.html' class='abtn ghost'>Review</a></div>";
    } else {
      bar.innerHTML = "<div class='card' style='display:flex;align-items:center;gap:14px;margin-top:22px;border-color:rgba(231,192,106,.45);background:rgba(231,192,106,.05)'>"
        + "<span style='width:34px;height:34px;border-radius:9px;flex:none;display:grid;place-items:center;background:rgba(231,192,106,.14)'><svg viewBox='0 0 24 24' fill='none' stroke='var(--accent)' stroke-width='1.8' style='width:17px;height:17px'><path d='M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z'/></svg></span>"
        + "<div style='flex:1'><div style='font-weight:500'>Action required — acknowledge the compliance guidelines</div><div style='font-size:12px;color:var(--mist-2)'>Before you promote, confirm you'll keep content research-use-only with no human-use or dosing claims.</div></div>"
        + "<a href='Elyria Bio Affiliate Guidelines.html' class='abtn solid'>Read &amp; acknowledge</a></div>";
    }
  }
  renderCompliance();

  var myOrders = state.orders.filter(function (o) { return o.affiliate === ME; });
  function netInRange(days) {
    var cut = Date.now() - days * 86400000;
    return myOrders.filter(function (o) { return o.ts >= cut && o.status !== "cancelled" && o.status !== "refunded"; });
  }
  // monthly earnings (this calendar month attributed commission)
  var monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  var monthRev = myOrders.filter(function (o) { return o.ts >= monthStart.getTime() && o.status !== "cancelled" && o.status !== "refunded"; }).reduce(function (s, o) { return s + o.total; }, 0);
  var monthEarn = monthRev * a.rate / 100;
  var conv30 = netInRange(30).length;
  var rev30 = netInRange(30).reduce(function (s, o) { return s + o.total; }, 0);

  /* ---------- header ---------- */
  $("#meName").textContent = a.name;
  $("#meTier").textContent = a.tierName + " · " + a.rate + "% commission";
  var av = $("#meAv"); av.textContent = initials(a.name); av.style.background = avatarColor(a.name);

  var link = "https://elyria.bio/?ref=" + a.code;
  $("#refCode").textContent = a.code;
  $("#refLink").textContent = link;
  $("#copyCode").addEventListener("click", function () { copyText(a.code); });
  $("#copyLink").addEventListener("click", function () { copyText(link); });

  /* ---------- stat cards ---------- */
  function stat(label, val, sub) {
    return "<div class='card kpi'><div class='kpi-top'><span class='kpi-label'>" + label + "</span></div><div class='kpi-val'>" + val + "</div><div class='kpi-sub'>" + sub + "</div></div>";
  }
  $("#statGrid").innerHTML =
    stat("Clicks · 30d", a.clicks30.toLocaleString(), "lifetime " + a.clicksLife.toLocaleString())
    + stat("Conversions · 30d", conv30, a.cr.toFixed(1) + "% conv. rate")
    + stat("Earnings this month", money(monthEarn, 2), money(monthRev) + " referred")
    + stat("Pending balance", money(a.owed, 2), a.owed >= 50 ? "ready for payout" : "$50 minimum");

  /* ---------- earnings chart (daily commission, 30d) ---------- */
  var labels = [], data = [], now = new Date(); now.setHours(0, 0, 0, 0);
  var buckets = {};
  myOrders.forEach(function (o) { var d = new Date(o.ts); var k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); if (!buckets[k]) buckets[k] = 0; if (o.status !== "cancelled" && o.status !== "refunded") buckets[k] += o.total * a.rate / 100; });
  for (var i = 29; i >= 0; i--) {
    var d = new Date(now); d.setDate(now.getDate() - i);
    var k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    data.push(buckets[k] || 0); labels.push(fmtDate(d.getTime()));
  }
  C.lineChart($("#earnChart"), [{ name: "Commission", color: "#e7c06a", data: data }], labels, { height: 230, yfmt: moneyK, tipfmt: function (n) { return money(n, 2); } });

  /* ---------- tier progress ---------- */
  var tier = state.tiers.filter(function (t) { return t.id === a.tier; })[0];
  var nextTier = state.tiers[state.tiers.indexOf(tier) + 1];
  var prog = nextTier ? Math.min(100, a.revenue / nextTier.min * 100) : 100;
  $("#tierCard").innerHTML = "<div class='panel-head'><div><h3>Your tier</h3></div><span class='pill delivered'>" + a.tierName + " · " + a.rate + "%</span></div>"
    + "<div class='d-line'><span class='dl-k'>Lifetime revenue driven</span><span class='dl-v'>" + money(a.revenue) + "</span></div>"
    + (nextTier
      ? "<div style='font-size:13px;color:var(--mist);margin:14px 0 8px'>" + money(nextTier.min - a.revenue) + " more to <b style='color:var(--paper)'>" + nextTier.name + "</b> — earn <b style='color:var(--accent)'>" + nextTier.rate + "%</b></div><div class='bartrack'><div class='barfill' style='width:" + prog + "%'></div></div>"
      : "<div style='font-size:13px;color:var(--pos);margin-top:14px'>You're at the top tier — 20% on every referral.</div>")
    + "<div style='display:flex;gap:18px;margin-top:18px'>" + state.tiers.map(function (t) {
      return "<div style='flex:1'><div class='kpi-label' style='font-size:9.5px'>" + t.name + "</div><div class='num' style='font-size:19px;margin-top:4px;color:" + (t.id === a.tier ? "var(--accent)" : "var(--mist)") + "'>" + t.rate + "%</div><div style='font-size:10.5px;color:var(--mist-2);font-family:IBM Plex Mono,monospace'>" + (t.min ? moneyK(t.min) + "+" : "$0+") + "</div></div>";
    }).join("") + "</div>";

  /* ---------- recent referrals ---------- */
  var recent = myOrders.slice().sort(function (x, y) { return y.ts - x.ts; }).slice(0, 10);
  $("#refBody").innerHTML = recent.map(function (o) {
    var earned = (o.status === "cancelled" || o.status === "refunded") ? 0 : o.total * a.rate / 100;
    var stCls = (o.status === "refunded" || o.status === "cancelled") ? "refunded" : (o.status === "delivered" ? "delivered" : "shipped");
    return "<tr><td class='t-id'>" + o.id + "</td><td class='t-mut'>" + fmtDate(o.ts) + "</td>"
      + "<td><span class='pill " + stCls + "'>" + o.status + "</span></td>"
      + "<td class='t-num'>" + money(o.total, 2) + "</td>"
      + "<td class='t-num t-strong' style='color:" + (earned ? "var(--accent)" : "var(--mist-2)") + "'>" + (earned ? "+" + money(earned, 2) : "—") + "</td></tr>";
  }).join("");

  /* ---------- payout panel ---------- */
  function isAck() { try { var x = JSON.parse(localStorage.getItem("elyria_aff_guidelines_ack")); return !!(x && x.v); } catch (e) { return false; } }
  function renderPayouts() {
    var ack = isAck();
    var canPay = a.owed >= 50 && ack && !a.frozen;
    var gate = a.suspended
      ? "<div class='card' style='border-color:rgba(232,140,106,.4);background:rgba(232,140,106,.06);padding:14px 16px;margin:6px 0 14px'><div style='font-weight:500;color:#e88c6a'>Account suspended</div><div style='font-size:12px;color:var(--mist-2);margin-top:3px'>Payouts are disabled following a compliance violation. Contact your partner manager.</div></div>"
      : a.frozen
        ? "<div class='card' style='border-color:rgba(231,192,106,.4);background:rgba(231,192,106,.05);padding:14px 16px;margin:6px 0 14px'><div style='font-weight:500'>Balance frozen</div><div style='font-size:12px;color:var(--mist-2);margin-top:3px'>A compliance review has paused payouts. Resolve the flagged content to lift the freeze.</div></div>"
        : !ack
          ? "<a href='Elyria Bio Affiliate Guidelines.html' class='abtn solid' style='width:100%;margin:6px 0 12px'>Acknowledge guidelines to enable payouts</a><div style='font-size:12px;color:var(--mist-2);margin-bottom:14px'>Payouts are locked until you accept the compliance guidelines.</div>"
          : "<button class='abtn solid' id='reqPayout' style='width:100%;margin:6px 0 18px'" + (canPay ? "" : " disabled style='width:100%;margin:6px 0 18px;opacity:.5;cursor:not-allowed'") + ">Request payout</button>"
            + (a.owed < 50 ? "<div style='font-size:12px;color:var(--mist-2);margin:-8px 0 14px'>$50 minimum to withdraw.</div>" : "");
    $("#payoutPanel").innerHTML = "<div class='panel-head'><div><h3>Payouts</h3></div></div>"
      + "<div class='d-tot grand' style='border:none;padding-top:0'><span class='dt-k'>Available now</span><span class='dt-v'>" + money(a.owed, 2) + "</span></div>"
      + gate
      + "<span class='micro' style='display:block;margin-bottom:10px'>History</span>"
      + (a.payouts.length ? a.payouts.map(function (p) {
        return "<div class='d-line'><span class='dl-k'>" + fmtDate(p.date) + " · " + p.method + "</span><span class='dl-v'>" + money(p.amount, 2) + "</span></div>";
      }).join("") : "<div style='font-size:12px;color:var(--mist-2)'>No payouts yet.</div>");
    var rp = $("#reqPayout");
    if (rp && canPay) rp.addEventListener("click", function () {
      a.payouts.unshift({ date: Date.now(), amount: a.owed, method: "PayPal", status: "paid" }); a.paid += a.owed;
      toast("Payout of " + money(a.owed, 2) + " requested"); a.owed = 0; renderPayouts();
      $("#statGrid").children[3].querySelector(".kpi-val").textContent = money(0, 2);
    });
  }
  renderPayouts();

  /* ---------- marketing assets ---------- */
  var assets = [
    { name: "Hero banner", dim: "1200×628", banner: "≥99% HPLC research peptides" },
    { name: "Square post", dim: "1080×1080", banner: "Third-party COA on every lot" },
    { name: "Email header", dim: "600×200", banner: "Elyria Bio — reference materials" },
    { name: "Story / reel", dim: "1080×1920", banner: "Cold-chain shipped, lot-traceable" },
    { name: "Sidebar ad", dim: "300×600", banner: "Save with code " + a.code },
    { name: "Link card", dim: "800×418", banner: "Research-grade peptides" }
  ];
  $("#assetGrid").innerHTML = assets.map(function (as) {
    return "<div class='asset'><div class='as-prev'><span class='ap-tag'>" + as.dim + "</span><span class='ap-banner'>" + as.banner + "</span></div>"
      + "<div class='as-foot'><div><div class='as-name'>" + as.name + "</div><div class='as-dim'>PNG · " + as.dim + "</div></div>"
      + "<button class='chip' data-asset='" + as.name + "'>Download</button></div></div>";
  }).join("");

  var swipes = [
    { t: "I source my research peptides from Elyria Bio — every lot ships with a third-party certificate of analysis (HPLC purity + mass-spec identity). Use " + a.code + " for a discount.", len: "Tweet / X" },
    { t: "If you run in-vitro work, sourcing matters. Elyria Bio publishes a COA for every lot and cold-chain ships within 48 hours. My code " + a.code + " saves you on your first order.", len: "Caption" },
    { t: "Reference-grade peptides, characterized and documented for laboratory use. ≥99% HPLC purity floor, lot traceability, independent COAs. Code " + a.code + ".", len: "Description" }
  ];
  $("#swipeList").innerHTML = swipes.map(function (s) {
    return "<div class='swipe'><p>" + s.t + "</p><div class='sw-foot'><span class='sw-len'>" + s.len + "</span><button class='chip' data-swipe=\"" + s.t.replace(/"/g, "&quot;") + "\">Copy</button></div></div>";
  }).join("");

  document.addEventListener("click", function (e) {
    var as = e.target.closest("[data-asset]"); if (as) { toast(as.getAttribute("data-asset") + " downloaded"); return; }
    var sw = e.target.closest("[data-swipe]"); if (sw) { copyText(sw.getAttribute("data-swipe")); return; }
  });
  // re-check guideline acceptance when returning from the guidelines page
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { renderCompliance(); renderPayouts(); } });
  window.addEventListener("focus", function () { renderCompliance(); renderPayouts(); });
})();
