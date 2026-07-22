/* ===== Elyria Bio — home cinematic engine ===== */
(function(){
  "use strict";
  var body = document.body;
  function fxOn(n){ return body.getAttribute("data-fx-"+n) !== "off"; }
  function docH(){ return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight); }

  /* ---------- boot sequence (once per session) ---------- */
  (function(){
    var KEY = "elyria_boot_v2";
    var seen = false; try{ seen = !!sessionStorage.getItem(KEY); }catch(e){}
    var boot = document.createElement("div");
    boot.className = "bootseq"; boot.setAttribute("aria-hidden","true");
    boot.innerHTML = '<div class="bs-lines"></div>';
    var headline = document.getElementById("heroHeadline");
    function focusTitle(){ if (headline) headline.classList.add("focused"); }
    if (seen || !fxOn("boot")){ focusTitle(); return; }
    document.body.appendChild(boot);
    var lines = boot.querySelector(".bs-lines");
    var SEQ = [
      "ELYRIA BIO — QC TERMINAL",
      "LOT <b>CURRENT</b> · RP-HPLC 214nm ........ <b>99.4%</b>",
      "ESI-MS IDENTITY .................. <b>CONFIRMED</b>",
      "ENDOTOXIN LAL .................... <b>&lt; 0.5 EU/mg</b>",
      "RELEASE ................................ <b>OK</b>"
    ];
    var i = 0, t0 = performance.now();
    function next(){
      if (i < SEQ.length){ lines.innerHTML += SEQ[i++] + "<br>"; setTimeout(next, 140); }
      else setTimeout(finish, 260);
    }
    function finish(){
      boot.classList.add("done");
      try{ sessionStorage.setItem(KEY,"1"); }catch(e){}
      setTimeout(focusTitle, 150);
      setTimeout(function(){ boot.remove(); }, 700);
    }
    boot.addEventListener("click", finish);
    setTimeout(next, 120);
    setTimeout(function(){ if (!boot.classList.contains("done")) finish(); }, 1900);
  })();
  // if boot disabled at runtime, still focus headline
  if (body.getAttribute("data-fx-boot") === "off"){
    var h = document.getElementById("heroHeadline"); if (h) h.classList.add("focused");
  }

  /* ---------- section registry ---------- */
  var SECTIONS = [
    { sel:"#catalog",      label:"CATALOG" },
    { sel:"#verification", label:"VERIFICATION" },
    { sel:"#shipping",     label:"LOGISTICS" },
    { sel:"#account",      label:"ACCOUNT" },
    { sel:"#faq",          label:"FAQ" }
  ].map(function(s,ix){ s.el = document.querySelector(s.sel); s.n = ("0"+(ix+1)).slice(-2); return s; })
   .filter(function(s){ return !!s.el; });

  function layoutThread(){}

  /* ---------- persistent vial ---------- */
  var pvial = document.createElement("div");
  pvial.className = "pvial"; pvial.setAttribute("aria-hidden","true");
  pvial.innerHTML =
    '<div class="pv-scan"></div>'+
    '<div class="vial-real"><div class="vr-cap"></div><div class="vr-neck"></div>'+
    '<div class="vr-body"><div class="vr-gloss"></div><div class="vr-powder"></div>'+
    '<div class="vr-label"><span class="ln">BPC-157</span><span class="ls">CURRENT LOT · RUO</span><span class="laccent"></span></div>'+
    '</div></div>';
  document.body.appendChild(pvial);
  var heroEl = document.getElementById("heroScroll");
  var verifyEl = document.getElementById("verification");
  function lerp(a,b,t){ return a+(b-a)*t; }
  function clamp01(t){ return t<0?0:t>1?1:t; }
  function ease(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }

  /* ---------- page motes ---------- */
  var pm = document.createElement("canvas");
  pm.className = "page-motes"; pm.setAttribute("aria-hidden","true");
  document.body.appendChild(pm);
  var pctx = pm.getContext("2d"), PW=0, PH=0, motes=[];
  function sizePM(){
    var dpr = Math.min(window.devicePixelRatio||1, 2);
    PW = innerWidth; PH = innerHeight;
    pm.width = PW*dpr; pm.height = PH*dpr; pctx.setTransform(dpr,0,0,dpr,0,0);
  }
  sizePM(); window.addEventListener("resize", sizePM);
  for (var i=0;i<54;i++){
    motes.push({ x:Math.random(), y:Math.random(), z:.25+Math.random()*.75,
      vx:(Math.random()-.5)*.00012, vy:-.00003-Math.random()*.0001,
      r:.5+Math.random()*1.6, tw:Math.random()*6.28 });
  }

  /* ---------- scanner sweeps ---------- */
  SECTIONS.forEach(function(s){ s.el.classList.add("sweepable"); });
  var sweepIO = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if (e.isIntersecting && fxOn("sweep")){
        e.target.classList.add("swept");
        setTimeout(function(){ e.target.classList.remove("swept"); }, 1400);
        sweepIO.unobserve(e.target); // once
      }
    });
  }, {threshold:.18});
  SECTIONS.forEach(function(s){ sweepIO.observe(s.el); });

  /* ---------- specimen indexes (typed) ---------- */
  SECTIONS.forEach(function(s){
    var head = s.el.querySelector(".sec-head, .cat-head, .verify-head, .acc-in, .cats-head") || s.el.querySelector("h2");
    if (!head) return;
    var ix = document.createElement("span");
    ix.className = "sec-index"; ix.setAttribute("aria-hidden","true");
    head.insertBefore(ix, head.firstChild);
    var txt = s.n + " / " + s.label;
    var typed = false;
    var io = new IntersectionObserver(function(es){
      if (!es[0].isIntersecting || typed || !fxOn("type")) return;
      typed = true; io.disconnect();
      var k = 0;
      ix.innerHTML = '<span class="cursorb"></span>';
      (function tick(){
        if (k <= txt.length){
          ix.innerHTML = txt.slice(0,k) + '<span class="cursorb"></span>'; k++;
          setTimeout(tick, 34);
        } else setTimeout(function(){ ix.textContent = txt; }, 1200);
      })();
    }, {threshold:.4});
    io.observe(s.el);
  });

  /* ---------- verify velocity scanlines ---------- */
  var velScan = null;
  if (verifyEl){
    velScan = document.createElement("div");
    velScan.className = "vel-scan"; velScan.setAttribute("aria-hidden","true");
    verifyEl.appendChild(velScan);
  }

  /* ---------- catalog focus-pull + rim-hero rotation ---------- */
  var grid = document.getElementById("grid");
  if (grid){
    function stamp(){
      var kids = grid.children;
      for (var i=0;i<kids.length;i++) kids[i].style.setProperty("--stagger", Math.min(i,18));
    }
    stamp();
    new MutationObserver(stamp).observe(grid, {childList:true});
    setInterval(function(){
      if (!fxOn("catalog")) return;
      var kids = grid.children; if (!kids.length) return;
      var prev = grid.querySelector(".rim-hero"); if (prev) prev.classList.remove("rim-hero");
      var pick = kids[Math.floor(Math.random()*kids.length)];
      var r = pick.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) pick.classList.add("rim-hero");
    }, 8000);
  }

  /* ---------- footer glyph finale ---------- */
  var footer = document.querySelector("footer");
  if (footer){
    var fin = document.createElement("section");
    fin.className = "glyph-finale"; fin.setAttribute("aria-hidden","true");
    fin.innerHTML =
      '<svg viewBox="0 0 30 30" fill="none">'+
      '<defs><linearGradient id="gfGrad" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse">'+
      '<stop stop-color="#fdeec0"/><stop offset=".5" stop-color="#e7c06a"/><stop offset="1" stop-color="#a9792f"/></linearGradient></defs>'+
      '<path d="M6 5C16.5 9 13.5 21 24 25"/><path d="M24 5C13.5 9 16.5 21 6 25"/>'+
      '<path d="M15 13.6C13 9 18 8.4 18.6 6.4" opacity=".5"/></svg>'+
      '<div class="gf-glow"></div>';
    footer.parentNode.insertBefore(fin, footer);
    var finIO = new IntersectionObserver(function(es){
      if (es[0].isIntersecting && fxOn("finale")){ fin.classList.add("drawn"); finIO.disconnect(); }
    }, {threshold:.35});
    finIO.observe(fin);
    setTimeout(layoutThread, 100); // finale changed page height
  }

  /* ---------- master scroll/raf loop ---------- */
  var lastY = window.scrollY, vel = 0;
  function frame(){
    requestAnimationFrame(frame);
    var y = window.scrollY;
    vel = vel*.88 + (y-lastY)*.12; lastY = y;


    /* persistent vial choreography */
    if (heroEl && verifyEl && fxOn("vial")){
      var heroEnd = heroEl.offsetTop + heroEl.offsetHeight;
      var verTop = verifyEl.getBoundingClientRect().top + y;
      var verMid = verTop + verifyEl.offsetHeight*.5;
      var appear = clamp01((y - (heroEnd - innerHeight*.9)) / (innerHeight*.4));
      var travel = clamp01((y - (heroEnd - innerHeight*.5)) / Math.max(1,(verMid - innerHeight*.55) - (heroEnd - innerHeight*.5)));
      var leave  = clamp01((y - (verMid - innerHeight*.25)) / (innerHeight*.5));
      var e = ease(travel);
      // waypoints: right dock -> center of viewport (when verify centered)
      var x0 = innerWidth - 130, y0 = innerHeight*.30;
      var x1 = innerWidth*.5 - 37, y1 = innerHeight*.42;
      var vx = lerp(x0, x1, e), vy2 = lerp(y0, y1, e);
      var rot = Math.max(-10, Math.min(10, -vel*.35));
      pvial.style.opacity = String(Math.max(0, appear - leave));
      pvial.style.transform = "translate("+vx+"px,"+vy2+"px) rotate("+rot+"deg) scale("+lerp(.85,1.15,e)+")";
      pvial.classList.toggle("scanning", travel > .92 && leave < .3);
    } else {
      pvial.style.opacity = "0";
    }

    /* velocity scanlines */
    if (velScan && fxOn("velocity")){
      var a = Math.min(.55, Math.abs(vel)*.012);
      velScan.style.opacity = a.toFixed(3);
      velScan.style.backgroundPositionY = (y*.4) + "px";
    }

    /* page motes */
    if (fxOn("motes")){
      pctx.clearRect(0,0,PW,PH);
      for (var i=0;i<motes.length;i++){
        var m = motes[i];
        m.x += m.vx; m.y += m.vy + vel*-.0000012*m.z; m.tw += .015;
        if (m.y < -.02){ m.y = 1.02; m.x = Math.random(); }
        if (m.y > 1.02) m.y = -.02;
        if (m.x < -.02) m.x = 1.02; if (m.x > 1.02) m.x = -.02;
        var a2 = (.05 + .05*Math.sin(m.tw)) * m.z;
        pctx.beginPath();
        pctx.arc(m.x*PW, m.y*PH, m.r*m.z, 0, 6.28);
        pctx.fillStyle = "rgba(253,238,192,"+a2.toFixed(3)+")";
        pctx.fill();
      }
    } else pctx.clearRect(0,0,PW,PH);
  }
  requestAnimationFrame(frame);
  window.addEventListener("load", layoutThread);
})();
