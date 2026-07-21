/* ============================================================
   ELYRIA BIO — COMPLIANCE / ENTRY GATE
   Self-injecting age (21+) + Research-Use-Only acknowledgment
   gate. Loads on every page. Records consent in localStorage
   ("elyria_gate_ack") with a version + timestamp and re-prompts
   after the consent window lapses. Mandatory: the page cannot
   be used until the visitor confirms or leaves.

   NOTE FOR LEGAL REVIEW: copy below is a defensible US-focused
   draft and is NOT a substitute for review by counsel.
   ============================================================ */
(function () {
  "use strict";

  var KEY = "elyria_gate_ack";
  var VERSION = 2;                       // bump to force re-acknowledgment
  var MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // re-prompt after 30 days
  var EXIT_URL = "https://www.google.com/"; // where "I don't qualify" sends

  // Honor an already-recorded, current acknowledgment.
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var rec = JSON.parse(raw);
      if (rec && rec.v === VERSION && (Date.now() - rec.ts) < MAX_AGE_MS) return;
    }
  } catch (e) { /* storage blocked → show the gate */ }

  var reduce = false;
  try { reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  // Resolve the relative path to site root so legal links work at any depth.
  var home = document.body.getAttribute("data-home"); // "../index.html" on sub-pages
  var base = home ? home.replace(/index\.html$/, "") : "";

  /* ---------- styles ---------- */
  var css = '\
#elyriaGate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;\
background:rgba(8,6,5,.93);-webkit-backdrop-filter:blur(10px) saturate(.9);backdrop-filter:blur(10px) saturate(.9);\
font-family:"Inter",system-ui,sans-serif}\
#elyriaGate *{box-sizing:border-box}\
#elyriaGate .eg-card{position:relative;width:100%;max-width:540px;max-height:calc(100vh - 48px);overflow-y:auto;\
background:linear-gradient(180deg,#13100c,#0d0b08);border:1px solid rgba(231,192,106,.22);border-radius:20px;\
padding:40px 40px 32px;box-shadow:0 40px 120px -30px rgba(0,0,0,.8),0 0 0 1px rgba(231,192,106,.04)}\
#elyriaGate.in .eg-card{animation:egPop .42s cubic-bezier(.16,1,.3,1)}\
@keyframes egPop{from{transform:translateY(10px) scale(.99)}to{transform:none}}\
#elyriaGate .eg-glyph{width:46px;height:46px;display:block;margin-bottom:20px}\
#elyriaGate .eg-eyebrow{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:#b9954e;display:flex;align-items:center;gap:9px;margin-bottom:14px}\
#elyriaGate .eg-eyebrow::before{content:"";width:6px;height:6px;border-radius:50%;background:#e7c06a;box-shadow:0 0 9px #e7c06a}\
#elyriaGate h2{font-family:"Fraunces",serif;font-weight:500;font-size:27px;line-height:1.12;color:#f4eee0;margin:0 0 12px}\
#elyriaGate .eg-lede{font-size:14.5px;line-height:1.62;color:#9b9384;margin:0 0 22px;text-wrap:pretty}\
#elyriaGate .eg-checks{display:flex;flex-direction:column;gap:12px;margin-bottom:14px}\
#elyriaGate .eg-check{display:flex;gap:13px;align-items:flex-start;cursor:pointer;padding:15px 16px;border:1px solid rgba(231,192,106,.14);border-radius:13px;background:rgba(231,192,106,.025);transition:border-color .2s,background .2s}\
#elyriaGate .eg-check:hover{border-color:rgba(231,192,106,.32);background:rgba(231,192,106,.05)}\
#elyriaGate .eg-check.ok{border-color:rgba(231,192,106,.5);background:rgba(231,192,106,.07)}\
#elyriaGate .eg-check input{position:absolute;opacity:0;width:1px;height:1px}\
#elyriaGate .eg-box{flex:none;width:22px;height:22px;margin-top:1px;border:1.6px solid rgba(231,192,106,.45);border-radius:6px;display:grid;place-items:center;transition:background .18s,border-color .18s}\
#elyriaGate .eg-box svg{width:13px;height:13px;stroke:#1a1305;stroke-width:3;opacity:0;transform:scale(.5);transition:opacity .18s,transform .18s}\
#elyriaGate .eg-check.ok .eg-box{background:#e7c06a;border-color:#e7c06a}\
#elyriaGate .eg-check.ok .eg-box svg{opacity:1;transform:none}\
#elyriaGate .eg-check span{font-size:13.5px;line-height:1.5;color:#cfc6b4}\
#elyriaGate .eg-check b{color:#f4eee0;font-weight:600}\
#elyriaGate .eg-check:focus-within{outline:2px solid rgba(231,192,106,.5);outline-offset:2px}\
#elyriaGate .eg-actions{display:flex;flex-direction:column;gap:10px;margin-top:20px}\
#elyriaGate .eg-enter{height:52px;border-radius:100px;border:none;font-size:15px;font-weight:600;color:#1a1305;\
background:linear-gradient(180deg,#f4dc98,#e9c878 54%,#d4a64e);cursor:pointer;transition:filter .2s,transform .12s,opacity .2s;font-family:inherit}\
#elyriaGate .eg-enter:hover{filter:brightness(1.05)}\
#elyriaGate .eg-enter:active{transform:scale(.985)}\
#elyriaGate .eg-enter:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(.4)}\
#elyriaGate .eg-leave{height:46px;border-radius:100px;border:1px solid rgba(231,192,106,.16);background:transparent;color:#9b9384;font-size:13.5px;font-weight:500;cursor:pointer;transition:color .2s,border-color .2s;font-family:inherit}\
#elyriaGate .eg-leave:hover{color:#f4eee0;border-color:rgba(231,192,106,.36)}\
#elyriaGate .eg-foot{margin-top:18px;padding-top:16px;border-top:1px solid rgba(231,192,106,.1);font-size:11.5px;line-height:1.6;color:#7d766a;text-wrap:pretty}\
#elyriaGate .eg-foot a{color:#b9954e;text-decoration:underline;text-underline-offset:2px}\
#elyriaGate .eg-foot a:hover{color:#e7c06a}\
#elyriaGate .eg-warn{display:none;margin-top:10px;font-family:"IBM Plex Mono",monospace;font-size:11px;letter-spacing:.04em;color:#e0a05a}\
#elyriaGate.shake .eg-card{animation:egShake .4s}\
@keyframes egShake{0%,100%{transform:none}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}\
@media (max-width:520px){#elyriaGate .eg-card{padding:30px 24px 26px}#elyriaGate h2{font-size:23px}}\
@media (prefers-reduced-motion: reduce){#elyriaGate.in .eg-card,#elyriaGate.shake .eg-card{animation:none}}\
@media print{#elyriaGate{display:none!important}}\
';
  var style = document.createElement("style");
  style.id = "elyria-gate-css";
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- markup ---------- */
  var glyph = '<svg class="eg-glyph" viewBox="0 0 30 30" fill="none" aria-hidden="true">\
<defs><linearGradient id="egGrad" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">\
<stop stop-color="#fdeec0"/><stop offset=".5" stop-color="#e7c06a"/><stop offset="1" stop-color="#a9792f"/></linearGradient></defs>\
<path d="M6 5C16.5 9 13.5 21 24 25" stroke="url(#egGrad)" stroke-width="1.5" stroke-linecap="round"/>\
<path d="M24 5C13.5 9 16.5 21 6 25" stroke="url(#egGrad)" stroke-width="1.5" stroke-linecap="round"/>\
<path d="M15 13.6C13 9 18 8.4 18.6 6.4" stroke="url(#egGrad)" stroke-width="1" stroke-linecap="round" opacity=".5"/></svg>';

  var tick = '<span class="eg-box"><svg viewBox="0 0 24 24" fill="none"><path d="M5 12l4 4 10-10"/></svg></span>';

  var gate = document.createElement("div");
  gate.id = "elyriaGate";
  gate.setAttribute("role", "dialog");
  gate.setAttribute("aria-modal", "true");
  gate.setAttribute("aria-labelledby", "egTitle");
  gate.innerHTML =
    '<div class="eg-card" role="document">' +
      glyph +
      '<div class="eg-eyebrow">Verification required</div>' +
      '<h2 id="egTitle">Confirm before you enter</h2>' +
      '<p class="eg-lede">Elyria Bio supplies research-grade reference materials for laboratory use only. Please confirm the following before continuing.</p>' +
      '<div class="eg-checks">' +
        '<label class="eg-check" data-check>' +
          '<input type="checkbox" data-gate-cb />' + tick +
          '<span>I am <b>at least 21 years of age</b> and legally able to enter into this acknowledgment.</span>' +
        '</label>' +
        '<label class="eg-check" data-check>' +
          '<input type="checkbox" data-gate-cb />' + tick +
          '<span>I am a <b>qualified researcher</b> or authorized institutional buyer acquiring these materials strictly for <b>in-vitro laboratory research</b>. I understand all products are <b>Research Use Only</b> — not for human or veterinary consumption, and not drugs, foods, cosmetics, or dietary supplements — and I will comply with all applicable laws.</span>' +
        '</label>' +
      '</div>' +
      '<p class="eg-warn" id="egWarn">Please confirm both statements to continue.</p>' +
      '<div class="eg-actions">' +
        '<button type="button" class="eg-enter" id="egEnter" disabled>Enter site</button>' +
        '<button type="button" class="eg-leave" id="egLeave">I do not qualify — leave</button>' +
      '</div>' +
      '<p class="eg-foot">By entering you agree to our ' +
        '<a href="' + base + 'legal/terms.html">Terms of Sale</a>, ' +
        '<a href="' + base + 'legal/compliance.html">Compliance Policy</a>, and ' +
        '<a href="' + base + 'legal/privacy.html">Privacy Policy</a>. ' +
        'We\u2019ll remember this confirmation on this device for 30 days.</p>' +
    '</div>';

  function mount() {
    document.body.appendChild(gate);
    var prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    // Reveal on next tick. setTimeout (not rAF) so it still fires in
    // background/throttled tabs — otherwise the card stays invisible.
    var revealed = false;
    function reveal(){ if(!revealed){ revealed = true; gate.classList.add("in"); } }
    setTimeout(reveal, 20);
    requestAnimationFrame(reveal);

    var boxes = Array.prototype.slice.call(gate.querySelectorAll("[data-gate-cb]"));
    var enter = gate.querySelector("#egEnter");
    var leave = gate.querySelector("#egLeave");
    var warn = gate.querySelector("#egWarn");

    function refresh() {
      boxes.forEach(function (b) { b.closest("[data-check]").classList.toggle("ok", b.checked); });
      var all = boxes.every(function (b) { return b.checked; });
      enter.disabled = !all;
      if (all) warn.style.display = "none";
    }
    boxes.forEach(function (b) { b.addEventListener("change", refresh); });

    enter.addEventListener("click", function () {
      if (boxes.every(function (b) { return b.checked; })) {
        try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, ts: Date.now() })); } catch (e) {}
        // If they were gated on the compliance page itself, send them
        // straight to the shop rather than leaving them on a legal page.
        if (/legal\/compliance\.html$/i.test(location.pathname)) {
          window.location.href = base + "index.html#catalog";
          return;
        }
        gate.classList.remove("in");
        document.documentElement.style.overflow = prevOverflow;
        document.body.style.overflow = "";
        setTimeout(function () { if (gate.parentNode) gate.parentNode.removeChild(gate); }, reduce ? 0 : 360);
      } else {
        warn.style.display = "block";
        gate.classList.remove("shake"); void gate.offsetWidth; gate.classList.add("shake");
      }
    });

    leave.addEventListener("click", function () {
      try { window.location.replace(EXIT_URL); }
      catch (e) { window.location.href = EXIT_URL; }
    });

    // Focus trap — the gate is mandatory; keep focus inside it.
    var focusables = gate.querySelectorAll('button, input, a[href]');
    var first = focusables[0], last = focusables[focusables.length - 1];
    gate.addEventListener("keydown", function (e) {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      } else if (e.key === "Escape") {
        e.preventDefault(); // cannot dismiss without choosing
      }
    });
    setTimeout(function () { boxes[0].focus(); }, reduce ? 0 : 360);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
