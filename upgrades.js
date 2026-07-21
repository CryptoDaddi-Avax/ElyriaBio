/* ===== Elyria Bio — visual upgrades (vanilla engine) ===== */
(function(){
  "use strict";
  var body = document.body;
  function fxOn(name){ return body.getAttribute("data-fx-"+name) !== "off"; }

  /* ---------- 1. Cursor rim-lighting ---------- */
  var RIM_SEL = ".pdp-stage,.pdp-mini .m,.doc-card,.rcard,.specs,.faq-item,.ruo-strip";
  var rims = [];
  document.querySelectorAll(RIM_SEL).forEach(function(el){
    el.classList.add("rimlit"); rims.push(el);
  });
  var rafPending = false, px = -1e4, py = -1e4;
  function paintRims(){
    rafPending = false;
    for (var i=0;i<rims.length;i++){
      var el = rims[i], r = el.getBoundingClientRect();
      var inside = px > r.left-160 && px < r.right+160 && py > r.top-160 && py < r.bottom+160;
      if (inside){
        el.style.setProperty("--mx", (px - r.left) + "px");
        el.style.setProperty("--my", (py - r.top) + "px");
        el.classList.add("rim-on");
      } else {
        el.classList.remove("rim-on");
      }
    }
  }
  window.addEventListener("pointermove", function(e){
    if (!fxOn("rim")) return;
    px = e.clientX; py = e.clientY;
    if (!rafPending){ rafPending = true; requestAnimationFrame(paintRims); }
  }, {passive:true});

  /* ---------- 2. Self-drawing chromatogram ---------- */
  var stagePane = document.querySelector(".pdp-vis");
  var purityText = (document.querySelector(".pdp-mini .mv") || {}).textContent || "99.4%";
  var purity = parseFloat(purityText) || 99.4;
  if (stagePane){
    var wrap = document.createElement("div");
    wrap.className = "chromo";
    wrap.innerHTML =
      '<div class="chromo-head"><span class="chromo-title">RP-HPLC · UV 214 nm</span>'+
      '<span class="chromo-lot">LOT 26-B · '+purityText+' main peak</span></div>'+
      '<canvas></canvas><div class="chromo-apex">'+purityText+'<small>MAIN PEAK</small></div>';
    stagePane.appendChild(wrap);
    var cv = wrap.querySelector("canvas"), apex = wrap.querySelector(".chromo-apex");
    var drawn = false;

    function buildTrace(W,H){
      // deterministic pseudo-random blips
      var seed = 20260706; function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
      var base = H-18, top = 16, pts = [];
      var peakX = 0.62, peakW = 0.030;
      var blips = [[0.14,0.05],[0.27,0.035],[0.41,0.06],[0.52,0.04],[0.80,0.045],[0.90,0.03]];
      for (var x=0; x<=W; x++){
        var t = x/W, y = 0;
        // main peak — gaussian
        var d = (t-peakX)/peakW; y += Math.exp(-d*d) * 1.0;
        for (var b=0;b<blips.length;b++){
          var db=(t-blips[b][0])/0.012; y += Math.exp(-db*db)*blips[b][1];
        }
        y += (rnd()-0.5)*0.008; // baseline noise
        pts.push(base - y*(base-top));
      }
      return {pts:pts, base:base, peakX:peakX, top:top};
    }

    function draw(progress){
      var dpr = window.devicePixelRatio||1;
      var W = wrap.clientWidth-36, H = 150;
      cv.width = W*dpr; cv.height = H*dpr; cv.style.height = H+"px";
      var ctx = cv.getContext("2d"); ctx.scale(dpr,dpr);
      var tr = buildTrace(W,H);
      // grid
      ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
      for (var g=1; g<5; g++){ ctx.beginPath(); ctx.moveTo(0, H*g/5); ctx.lineTo(W, H*g/5); ctx.stroke(); }
      // baseline
      ctx.strokeStyle = "rgba(253,238,192,.18)";
      ctx.beginPath(); ctx.moveTo(0,tr.base); ctx.lineTo(W,tr.base); ctx.stroke();
      // trace up to progress
      var upto = Math.floor(W*progress);
      var grad = ctx.createLinearGradient(0,0,W,0);
      grad.addColorStop(0,"#a9792f"); grad.addColorStop(.55,"#e7c06a"); grad.addColorStop(1,"#fdeec0");
      ctx.strokeStyle = grad; ctx.lineWidth = 1.6;
      ctx.shadowColor = "rgba(231,192,106,.5)"; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(0, tr.pts[0]);
      for (var x=1; x<=upto; x++) ctx.lineTo(x, tr.pts[x]);
      ctx.stroke();
      // fill under drawn portion
      ctx.shadowBlur = 0;
      ctx.lineTo(upto, tr.base); ctx.lineTo(0, tr.base); ctx.closePath();
      ctx.fillStyle = "rgba(231,192,106,.06)"; ctx.fill();
      // apex marker position
      var axPx = tr.peakX*W;
      if (progress >= tr.peakX + 0.05 && !wrap.classList.contains("drawn")){
        wrap.classList.add("drawn");
        apex.style.left = (axPx+18) + "px";
        apex.style.top = (tr.top+6) + "px";
      }
    }

    function animate(){
      if (drawn) return; drawn = true;
      var t0 = null, DUR = 2200;
      function step(ts){
        if (!t0) t0 = ts;
        var p = Math.min(1, (ts-t0)/DUR);
        // ease
        var e = 1 - Math.pow(1-p, 2.2);
        draw(e);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function(entries){
      if (entries[0].isIntersecting && fxOn("chromo")){ animate(); io.disconnect(); }
    }, {threshold:.35});
    io.observe(wrap);
    window.addEventListener("resize", function(){ if (drawn) draw(1); });
    // if toggled on later
    window.addEventListener("fx-change", function(){ if (fxOn("chromo") && !drawn){
      var r = wrap.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) animate();
    }});
  }

  /* ---------- 3. Add-to-cart arc ---------- */
  function flyToCart(){
    if (!fxOn("arc")) return;
    var cartBtn = document.getElementById("cartBtn");
    var src = document.querySelector(".pdp-stage .photo") || document.querySelector(".pdp-stage .vial-real");
    if (!cartBtn || !src) return;
    var s = src.getBoundingClientRect(), c = cartBtn.getBoundingClientRect();
    var fly = document.createElement("div");
    fly.className = "cart-fly";
    if (src.tagName === "IMG"){ var im = document.createElement("img"); im.src = src.src; fly.appendChild(im); }
    else fly.innerHTML = '<div class="fly-vial"></div>';
    document.body.appendChild(fly);
    var x0 = s.left + s.width/2 - 27, y0 = s.top + s.height/2 - 42;
    var x1 = c.left + c.width/2 - 27, y1 = c.top + c.height/2 - 42;
    var cpx = (x0+x1)/2, cpy = Math.min(y0,y1) - 180; // arc apex above
    var t0 = null, DUR = 700;
    function step(ts){
      if (!t0) t0 = ts;
      var p = Math.min(1,(ts-t0)/DUR);
      var e = p<.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
      var ix = (1-e)*(1-e)*x0 + 2*(1-e)*e*cpx + e*e*x1;
      var iy = (1-e)*(1-e)*y0 + 2*(1-e)*e*cpy + e*e*y1;
      var sc = 1 - .8*e, rot = 30*e;
      fly.style.transform = "translate("+ix+"px,"+iy+"px) scale("+sc+") rotate("+rot+"deg)";
      fly.style.opacity = p > .85 ? String(1-(p-.85)/.15) : "1";
      if (p<1) requestAnimationFrame(step);
      else {
        fly.remove();
        cartBtn.classList.remove("popped"); void cartBtn.offsetWidth;
        cartBtn.classList.add("popped");
      }
    }
    fly.style.transform = "translate("+x0+"px,"+y0+"px)";
    requestAnimationFrame(step);
  }
  document.addEventListener("click", function(e){
    var b = e.target.closest("button, .btn");
    if (!b) return;
    var t = (b.textContent||"").toLowerCase();
    if (t.indexOf("add to") > -1 || b.id === "addToCart" || b.classList.contains("add-cart")) flyToCart();
  }, true);

  /* ---------- 4. Powder motes ---------- */
  var stage = document.querySelector(".pdp-stage");
  if (stage){
    if (getComputedStyle(stage).position === "static") stage.style.position = "relative";
    var mc = document.createElement("canvas");
    mc.className = "motes-canvas";
    stage.insertBefore(mc, stage.firstChild);
    var mctx = mc.getContext("2d"), motes = [], MW=0, MH=0, mx=.5, my=.5;
    function sizeMotes(){
      var dpr = window.devicePixelRatio||1;
      MW = stage.clientWidth; MH = stage.clientHeight;
      mc.width = MW*dpr; mc.height = MH*dpr;
      mctx.setTransform(dpr,0,0,dpr,0,0);
    }
    sizeMotes(); window.addEventListener("resize", sizeMotes);
    for (var i=0;i<38;i++){
      motes.push({ x:Math.random(), y:Math.random(), z:.3+Math.random()*.7,
        vx:(Math.random()-.5)*.00016, vy:-.00004 - Math.random()*.00012,
        r:.6+Math.random()*1.5, tw:Math.random()*6.28 });
    }
    stage.addEventListener("pointermove", function(e){
      var r = stage.getBoundingClientRect();
      mx = (e.clientX-r.left)/r.width; my = (e.clientY-r.top)/r.height;
    }, {passive:true});
    (function loop(ts){
      requestAnimationFrame(loop);
      if (!fxOn("motes")){ mctx.clearRect(0,0,MW,MH); return; }
      mctx.clearRect(0,0,MW,MH);
      for (var i=0;i<motes.length;i++){
        var m = motes[i];
        m.x += m.vx; m.y += m.vy; m.tw += .02;
        if (m.y < -0.02){ m.y = 1.02; m.x = Math.random(); }
        if (m.x < -0.02) m.x = 1.02; if (m.x > 1.02) m.x = -0.02;
        var parX = (mx-.5)*18*m.z, parY = (my-.5)*12*m.z;
        var a = (0.10 + 0.10*Math.sin(m.tw)) * m.z;
        mctx.beginPath();
        mctx.arc(m.x*MW + parX, m.y*MH + parY, m.r*m.z, 0, 6.28);
        mctx.fillStyle = "rgba(253,238,192,"+a.toFixed(3)+")";
        mctx.fill();
      }
    })(0);
  }
})();
