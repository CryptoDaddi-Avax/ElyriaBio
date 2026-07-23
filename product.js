/* ============================================================
   ELYRIA BIO — PRODUCT DETAIL (PARITY+) BEHAVIOR
   Self-contained. Runs on any page carrying [data-pdp].
     1. Multi-vial bulk-pricing buy box (mirrors store.js volume rule).
     2. Certificate-of-analysis document (print → PDF).
     3. Sub-nav scroll-spy.
   Cart adds go through window.elyriaAdd (site.js). No calculator.
   ============================================================ */
(function(){
  "use strict";
  var STOCK_FALLBACK={
    // single-size products
    tirz:0, ghkcu:0, ipa:0, cjcipa:0, epi:0, semax:0, selank:0, mt2:0,
    dsip:0, kiss:0, kpv:0, nad:0, gluta:0, mt1:0, pt141:0, aod:0,
    cagri:0, igf1lr3:0, amino1mq:0, wolverine:0, snap8:0, ta1:0, glow:0,
    bpc157:27, klow:30, tb500:30, tesa:67,
    // GLP-3 per-size fallbacks
    reta:50, 'reta|10 mg':50, 'reta|15 mg':30, 'reta|20 mg':0, 'reta|30 mg':20,
    // MOTS-c per-size fallbacks
    motsc:6, 'motsc|20 mg':6, 'motsc|40 mg':19
  };
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  /* readStock supports both bare pid and pid|size keys for variants */
  function readStock(pid, sizeKey){
    var varKey = sizeKey ? pid+'|'+sizeKey : null;
    // A product is "multi-size" if its variant key exists in STOCK_FALLBACK
    var isMultiSize = !!(varKey && STOCK_FALLBACK[varKey] != null);
    try{ var saved=JSON.parse(localStorage.getItem('elyria_admin_v1'));
      if(saved && saved.stockOverrides){
        // 1) Exact variant key wins always
        if(varKey && saved.stockOverrides[varKey]!=null) return saved.stockOverrides[varKey];
        // 2) Bare pid in localStorage only for single-size products
        //    (skip for multi-size so a stale bare key can't override per-size values)
        if(!isMultiSize && saved.stockOverrides[pid]!=null) return saved.stockOverrides[pid];
      }
    }catch(e){}
    // 3) STOCK_FALLBACK: variant key first, then bare pid
    if(varKey && STOCK_FALLBACK[varKey]!=null) return STOCK_FALLBACK[varKey];
    return STOCK_FALLBACK[pid] != null ? STOCK_FALLBACK[pid] : 0;
  }
  function saveSignup(pid,name,email){
    try{ var k="elyria_notify_signups"; var list=JSON.parse(localStorage.getItem(k))||[];
      list.push({id:pid,name:name,email:email,date:Date.now()});
      localStorage.setItem(k,JSON.stringify(list));
    }catch(e){}
  }
  var scope = document.querySelector("[data-pdp]");
  if(!scope) return;
  var id = scope.getAttribute("data-pdp");
  var name = scope.getAttribute("data-name") || "Reference material";
  var size = scope.getAttribute("data-size") || "10 mg";
  var unit = parseFloat(scope.getAttribute("data-price")) || 0;
  var pdpSize = scope.getAttribute("data-size") || "10 mg";
  var mgPerVial = parseFloat(pdpSize) || 0;

  function fmt(n){ return "$"+n.toFixed(2); }
  function rate(q){ return q>=5 ? 0.25 : (q>=3 ? 0.15 : 0); }

  /* ---------- bulk-pricing buy box ---------- */
  var tiers = Array.prototype.slice.call(scope.querySelectorAll(".tier"));
  var sel = 1;
  function paintTiers(){
    tiers.forEach(function(t){
      var q = parseInt(t.getAttribute("data-q"),10) || 1;
      var fixedTotal = parseFloat(t.getAttribute("data-total"));
      var line = unit*q, net = isFinite(fixedTotal) ? fixedTotal : line-(line*rate(q)), disc = line-net;
      var per = net/q;
      t.classList.toggle("on", q===sel);
      t.setAttribute("aria-checked", q===sel ? "true" : "false");
      var totEl = t.querySelector(".t-tot");
      if(totEl){
        totEl.innerHTML = fmt(net) + (disc>0.004 ? '<span class="t-was">'+fmt(line)+'</span>' : '');
      }
      var perEl = t.querySelector(".t-per");
      if(perEl) perEl.textContent = fmt(per)+" / vial";
      var mgEl = t.querySelector(".t-mg");
      if(mgEl && mgPerVial>0) mgEl.textContent = fmt(net/(q*mgPerVial))+" / mg";
    });
    var addBtn = scope.querySelector("#pdpAdd");
    if(addBtn){
      var q = sel, selTier = tiers.filter(function(t){ return (parseInt(t.getAttribute("data-q"),10)||1)===q; })[0];
      var selFixed = selTier ? parseFloat(selTier.getAttribute("data-total")) : NaN;
      var net = isFinite(selFixed) ? selFixed : unit*q*(1-rate(q));
      addBtn.setAttribute("data-q", q);
      var lbl = addBtn.querySelector(".add-label");
      if(lbl) lbl.textContent = q>1 ? ("Add "+q+" vials — "+fmt(net)) : ("Add to cart — "+fmt(net));
    }
  }
  tiers.forEach(function(t){
    t.addEventListener("click", function(){ sel = parseInt(t.getAttribute("data-q"),10)||1; paintTiers(); });
    t.addEventListener("keydown", function(e){ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); t.click(); } });
  });
  if(tiers.length) paintTiers();

  /* ---------- size-variant tabs (.stier) ---------- */
  var stiers = Array.prototype.slice.call(scope.querySelectorAll(".stier"));
  if(stiers.length){
    function activateStier(st){
      stiers.forEach(function(s){ s.classList.remove("on"); s.setAttribute("aria-checked","false"); });
      st.classList.add("on"); st.setAttribute("aria-checked","true");
      var newPrice = parseFloat(st.getAttribute("data-price")) || unit;
      var newMg    = parseFloat(st.getAttribute("data-mg"))    || mgPerVial;
      var newSize  = newMg + " mg";
      // update buy-box unit price + mg label
      unit       = newPrice;
      mgPerVial  = newMg;
      size       = newSize;
      // remove fixed data-total on tiers so price recalculates from unit
      tiers.forEach(function(t){ t.removeAttribute("data-total"); });
      paintTiers();
      // update inventory panel for this size — always use the variant key
      var qty = readStock(id, newSize);
      var stockEl = scope.querySelector(".pdp-stock");
      if(stockEl){
        if(qty <= 0){
          stockEl.className = "pdp-stock";
          stockEl.innerHTML = '<span class="sdot" style="background:#8a8a8a;box-shadow:none"></span>Out of stock — '+newSize+' unavailable';
        } else {
          var low = qty <= 5;
          stockEl.className = 'pdp-stock'+(low?' low':'');
          var countTxt = low ? ('Only '+qty+' left') : (qty+' vials available');
          var pk3 = Math.floor(qty/3), pk5 = Math.floor(qty/5);
          stockEl.innerHTML =
            '<span class="sdot"></span>'+countTxt+' \u00b7 ships from the U.S. within 48 hours'+
            '<div class="pdp-inv-row">'+
              '<div class="pdp-inv-cell"><span class="pdp-inv-n">'+qty+'</span><span class="pdp-inv-k">individual vials</span></div>'+
              '<div class="pdp-inv-div"></div>'+
              '<div class="pdp-inv-cell"><span class="pdp-inv-n">'+pk3+'</span><span class="pdp-inv-k">3-vial packs avail.</span></div>'+
              '<div class="pdp-inv-div"></div>'+
              '<div class="pdp-inv-cell"><span class="pdp-inv-n">'+pk5+'</span><span class="pdp-inv-k">5-vial packs avail.</span></div>'+
            '</div>';
        }
      }
    }
    stiers.forEach(function(st){
      st.addEventListener("click", function(){ activateStier(st); });
      st.addEventListener("keydown", function(e){ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); st.click(); } });
    });
  }


  var addBtn = scope.querySelector("#pdpAdd");
  if(addBtn){
    addBtn.addEventListener("click", function(){
      var q = parseInt(addBtn.getAttribute("data-q"),10) || 1;
      if(window.elyriaAdd) window.elyriaAdd(id, q, name+" · "+size, addBtn);
    });
  }

  /* ---------- live inventory count / out-of-stock notify ---------- */
  (function(){
    var stockEl = scope.querySelector(".pdp-stock");
    var buyBox = scope.querySelector(".buy-box");
    if(!stockEl || !buyBox) return;
    // Always read from localStorage → STOCK_FALLBACK (Supabase has stale data for variant products)
    paintStock(readStock(id, size));

    function paintStock(qty){
    if(qty==null) return;
    if(qty<=0){
      Array.prototype.slice.call(buyBox.querySelectorAll(".buy-lead,.buy-tiers,.buy-actions,.buy-savenote")).forEach(function(el){ el.style.display="none"; });
      stockEl.className = "pdp-stock";
      stockEl.innerHTML = '<span class="sdot" style="background:#8a8a8a;box-shadow:none"></span>Out of stock';
      var notify = document.createElement("div");
      notify.className = "restock";
      notify.innerHTML = '<div class="rs-lead">Out of stock — get an email the moment '+esc(name)+' is back</div><form class="rs-form" style="flex-wrap:wrap"><input type="text" class="rs-in" placeholder="Full name" aria-label="Name" required style="flex:1 1 140px"><input type="email" class="rs-in" placeholder="you@lab.edu" aria-label="Email" required style="flex:1 1 180px"><button class="rs-go" type="submit">Notify me when in stock</button></form>';
      buyBox.appendChild(notify);
      var form = notify.querySelector(".rs-form");
      form.addEventListener("submit", function(e){
        e.preventDefault();
        var inputs = form.querySelectorAll(".rs-in");
        var nm = inputs[0].value.trim(), em = inputs[1].value.trim();
        if(!nm || !/.+@.+\..+/.test(em)){ (nm?inputs[1]:inputs[0]).focus(); return; }
        if(api && api.configured){ api.saveNotifySignup(id, nm, em); } else { saveSignup(id, nm, em); }
        notify.innerHTML = '<div class="rs-done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4 10-10"/></svg><span>We\u2019ll email <b>'+esc(em)+'</b> the moment '+esc(name)+' is back in stock.</span></div>';
      });
    } else {
      var low = qty<=5;
      stockEl.className = 'pdp-stock'+(low?' low':'');
      var countTxt = low ? ('Only '+qty+' left') : (qty+' vials available');
      var pk3 = Math.floor(qty/3), pk5 = Math.floor(qty/5);
      stockEl.innerHTML =
        '<span class="sdot"></span>'+countTxt+' · ships from the U.S. within 48 hours'+
        '<div class="pdp-inv-row">'+
          '<div class="pdp-inv-cell"><span class="pdp-inv-n">'+qty+'</span><span class="pdp-inv-k">individual vials</span></div>'+
          '<div class="pdp-inv-div"></div>'+
          '<div class="pdp-inv-cell"><span class="pdp-inv-n">'+pk3+'</span><span class="pdp-inv-k">3-vial packs avail.</span></div>'+
          '<div class="pdp-inv-div"></div>'+
          '<div class="pdp-inv-cell"><span class="pdp-inv-n">'+pk5+'</span><span class="pdp-inv-k">5-vial packs avail.</span></div>'+
        '</div>';
    }
    }
  })();

  /* ---------- COA document (print → PDF) ---------- */
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  var coaBtn = document.getElementById("coaOpen");
  if(coaBtn){
    coaBtn.addEventListener("click", function(){
      var d = coaBtn.dataset;
      var w = window.open("","_blank");
      if(!w){ alert("Please allow pop-ups to view the certificate."); return; }
      var rows = [
        ["Product", name+" reference material"],
        ["CAS number", d.cas||"\u2014"],
        ["Molecular formula", d.formula||"\u2014"],
        ["Molecular weight", d.mw||"\u2014"],
        ["Lot / batch", d.lot||"\u2014"],
        ["Appearance", "White lyophilized powder"],
        ["Reversed-phase HPLC purity", (d.purity||"")+"  (\u2265 99.0% specification)"],
        ["Identity (ESI-MS)", "Confirmed \u2014 consistent with theoretical mass"],
        ["Endotoxin (LAL)", d.endo||"< 0.5 EU/mg"],
        ["Water content (Karl Fischer)", "\u2264 6.0%"],
        ["Counterion", "Acetate"],
        ["Assay date", d.assay||"\u2014"],
        ["Retest by", d.retest||"\u2014"],
        ["Storage", "\u221220\u00b0C, sealed & desiccated, protected from light"]
      ];
      var trs = rows.map(function(r){ var pass=/HPLC|Identity/.test(r[0])?' class="pass"':''; return '<tr><td class="k">'+esc(r[0])+'</td><td class="v"'+pass+'>'+esc(r[1])+'</td></tr>'; }).join("");
      w.document.write(
        '<!doctype html><html><head><meta charset="utf-8"><title>COA '+esc(d.lot||"")+' \u2014 '+esc(name)+'</title>'+
        '<style>'+
        '@page{size:letter;margin:0.8in}'+
        'body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;margin:0;padding:44px;max-width:780px}'+
        '.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #a9792f;padding-bottom:18px}'+
        '.bn{font-family:Georgia,serif;font-size:27px;letter-spacing:.5px}.bn b{color:#a9792f}'+
        '.bn small{display:block;font-size:10.5px;letter-spacing:.26em;text-transform:uppercase;color:#888;margin-top:5px;font-family:sans-serif}'+
        '.doc{text-align:right;font-size:12px;color:#555}.doc h1{font-size:15px;margin:0 0 6px;letter-spacing:.12em;text-transform:uppercase;color:#a9792f}'+
        'table{width:100%;border-collapse:collapse;margin:26px 0}'+
        'td{padding:11px 4px;border-bottom:1px solid #eee;font-size:13.5px;vertical-align:top}'+
        'td.k{color:#666;width:42%}td.v{font-weight:600}'+
        'td.v.pass{color:#1c7a43}'+
        '.sig{display:flex;justify-content:space-between;margin-top:44px;font-size:12px;color:#555}'+
        '.sig .l{border-top:1px solid #999;padding-top:6px;width:44%}'+
        '.ruo{margin-top:32px;padding:14px 16px;background:#faf7f0;border:1px solid #e8dcbf;border-radius:8px;font-size:11.5px;color:#6b5d3a;line-height:1.6}'+
        '.stamp{margin-top:20px;font-size:11px;color:#999}'+
        '.verifybox{margin-top:22px;border:1px solid #d9c48f;background:#fbf8f0;border-radius:8px;padding:14px 16px}'+
        '.verifybox .vb-k{font:600 10px sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a9792f;margin-bottom:5px}'+
        '.verifybox .vb-b{font-size:11.5px;color:#5c5238;line-height:1.55}.verifybox .vb-b b{color:#3a3423}'+
        '@media print{.noprint{display:none}}'+
        '</style></head><body>'+
        '<div class="hd"><div class="bn">Elyria<b> Bio</b><small>Reference Materials</small></div>'+
        '<div class="doc"><h1>Certificate of Analysis</h1>Document '+esc(d.lot||"")+'<br>Issued '+esc(d.assay||"")+'</div></div>'+
        '<table>'+trs+'</table>'+
        '<div class="sig"><div class="l">Analyst \u2014 Quality Control</div><div class="l">Authorized by \u2014 QA Release</div></div>'+
        '<div class="ruo"><b>Research Use Only.</b> This material is supplied as an in-vitro laboratory reference material for qualified research professionals. It is not a drug, supplement, or food, is not for human or veterinary use, and has not been evaluated by the FDA. Analytical values describe the referenced lot as characterized by an independent United States laboratory.</div>'+
        '<div class="verifybox"><div class="vb-k">Verify this certificate</div><div class="vb-b">Confirm lot <b>'+esc(d.lot||"")+'</b> independently at <b>elyriabio.com/resources/batch-lookup.html</b> \u2014 every printed lot number resolves to this document and its assay date.</div></div>'+
        '<div class="noprint" style="margin-top:30px;text-align:center"><button onclick="window.print()" style="font:600 14px sans-serif;background:#a9792f;color:#fff;border:none;border-radius:24px;padding:12px 28px;cursor:pointer">Print / Save as PDF</button></div>'+
        '</body></html>'
      );
      w.document.close();
    });
  }

  /* ---------- reconstitution reference calculator ---------- */
  (function(){
    var mgEl=document.getElementById("reconMg"), mlEl=document.getElementById("reconMl"), ugEl=document.getElementById("reconUg");
    if(!mgEl||!mlEl||!ugEl) return;
    var vialMg = parseFloat((size.match(/([\d.]+)\s*mg/)||[])[1]) || parseFloat(mgEl.value) || 10;
    function num(el,fb){ var v=parseFloat(el.value); return (isFinite(v)&&v>0)?v:fb; }
    function calc(){
      var mg=num(mgEl,vialMg), ml=num(mlEl,2), ug=num(ugEl,250);
      var concMgMl=mg/ml, drawMl=ug/(concMgMl*1000), units=drawMl*100, nAliquots=(mg*1000)/ug;
      document.getElementById("reconConc").innerHTML=concMgMl.toFixed(2)+' <b>mg/mL</b>';
      document.getElementById("reconDraw").innerHTML=units.toFixed(1)+' <b>units</b>';
      document.getElementById("reconN").textContent=Math.floor(nAliquots)+"";
    }
    [mgEl,mlEl,ugEl].forEach(function(el){ el.addEventListener("input", calc); });
    calc();
  })();

  /* ---------- sub-nav scroll-spy ---------- */
  var subnav = document.querySelector(".pdp-subnav");
  if(subnav){
    var links = Array.prototype.slice.call(subnav.querySelectorAll("a"));
    var targets = links.map(function(a){ var el=document.querySelector(a.getAttribute("href")); return {a:a, el:el}; }).filter(function(t){ return t.el; });
    var spy = function(){
      var y = window.pageYOffset + parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) + 90;
      var cur = targets[0];
      targets.forEach(function(t){ if(t.el.offsetTop <= y) cur = t; });
      links.forEach(function(a){ a.classList.remove("on"); });
      if(cur) cur.a.classList.add("on");
    };
    window.addEventListener("scroll", spy, {passive:true});
    links.forEach(function(a){ a.addEventListener("click", function(e){
      var el = document.querySelector(a.getAttribute("href"));
      if(el){ e.preventDefault(); var top = el.offsetTop - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"))||70) - 58; window.scrollTo({top:top, behavior:"smooth"}); }
    }); });
    spy();
  }
})();

/* ============================================================
   ELYRIA BIO — PDP UX ENHANCEMENTS (elite pass)
   Sticky buy-bar · price/mg · inline lot verify · restock
   notify · recently-viewed rail. Progressive & self-contained.
   ============================================================ */
(function(){
  "use strict";
  var scope=document.querySelector("[data-pdp]"); if(!scope) return;
  var name=scope.getAttribute("data-name")||"Reference material";
  var size=scope.getAttribute("data-size")||"10 mg";
  var price=parseFloat(scope.getAttribute("data-price"))||0;
  var slug=(location.pathname.split("/").pop()||"").replace(/\.html$/,"");
  var mg=parseFloat(size), isMg=/mg\b/i.test(size);
  function fmt(n){ return "$"+n.toFixed(2); }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function load(k,fb){ try{ var v=localStorage.getItem(k); return v==null?fb:JSON.parse(v);}catch(e){ return fb; } }
  function save(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
  var purity=(function(){ var m=scope.querySelector('.pdp-mini .mv'); return m?m.textContent.trim():''; })();

  /* sticky buy-bar */
  (function(){
    var box=scope.querySelector('.buy-box'), addBtn=document.getElementById('pdpAdd'); if(!box||!addBtn) return;
    var bar=document.createElement('div'); bar.className='pdp-buybar';
    bar.innerHTML='<div class="wrap pbb-in"><div class="pbb-meta"><span class="pbb-nm"></span><span class="pbb-price"></span></div><button class="pbb-add" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 5v14M5 12h14"/></svg>Add to cart</button></div>';
    bar.querySelector('.pbb-nm').textContent=name;
    document.body.appendChild(bar);
    var priceEl=bar.querySelector('.pbb-price'), lbl=addBtn.querySelector('.add-label');
    function sync(){ var t=lbl?lbl.textContent:''; var m=t.match(/\$[\d.,]+/); priceEl.textContent=m?m[0]:fmt(price); }
    bar.querySelector('.pbb-add').addEventListener('click', function(){ addBtn.click(); });
    if(lbl) new MutationObserver(sync).observe(lbl,{childList:true,characterData:true,subtree:true});
    sync();
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(es){ es.forEach(function(e){ bar.classList.toggle('show', !e.isIntersecting && e.boundingClientRect.top<0); }); },{threshold:0}).observe(box);
    }
  })();

  /* inline lot verify inside COA section */
  (function(){
    var cta=document.querySelector('.coa-side .coa-cta'), btn=document.getElementById('coaOpen'); if(!cta||!btn) return;
    var lot=(btn.dataset.lot||'').toUpperCase();
    var wrap=document.createElement('div'); wrap.className='coa-verify';
    wrap.innerHTML='<form class="cv-form"><input type="text" class="cv-in" placeholder="Enter your vial\u2019s lot code" aria-label="Lot code" autocomplete="off" spellcheck="false"><button type="submit" class="cv-go">Verify</button></form><div class="cv-res" hidden></div>';
    cta.appendChild(wrap);
    var form=wrap.querySelector('.cv-form'), inp=wrap.querySelector('.cv-in'), res=wrap.querySelector('.cv-res');
    form.addEventListener('submit', function(e){ e.preventDefault();
      var v=(inp.value||'').trim().toUpperCase().replace(/\s+/g,''); if(!v) return;
      res.hidden=false;
      if(v===lot){ res.className='cv-res ok'; res.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg><span><b>Lot '+esc(lot)+' verified.</b> '+esc(name)+' \u00b7 '+esc(purity)+' HPLC \u00b7 assayed '+esc(btn.dataset.assay||'')+'.</span>'; }
      else { res.className='cv-res no'; res.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.4"/></svg><span>Not this page\u2019s representative lot. Check any code in <a href="../resources/batch-lookup.html?lot='+encodeURIComponent(v)+'">full batch lookup \u2192</a></span>'; }
    });
  })();

  /* restock notify on low stock */
  (function(){
    var st=scope.querySelector('.pdp-stock'); if(!st || !/low stock/i.test(st.textContent)) return;
    var box=scope.querySelector('.buy-box'); if(!box) return;
    var note=load('elyria_notify',{}), wrap=document.createElement('div'); wrap.className='restock';
    function render(){
      if(note[slug]) wrap.innerHTML='<div class="rs-done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4 10-10"/></svg><span>We\u2019ll email <b>'+esc(note[slug])+'</b> when '+esc(name)+' is restocked.</span><button type="button" class="rs-undo">Undo</button></div>';
      else wrap.innerHTML='<div class="rs-lead">Low stock \u2014 get an alert when this lot is replenished</div><form class="rs-form"><input type="email" class="rs-in" placeholder="you@lab.edu" aria-label="Email for restock alert" required><button class="rs-go" type="submit">Notify me</button></form>';
      var f=wrap.querySelector('.rs-form'); if(f) f.addEventListener('submit', function(e){ e.preventDefault(); var v=(wrap.querySelector('.rs-in').value||'').trim(); if(!/.+@.+\..+/.test(v)){ wrap.querySelector('.rs-in').focus(); return; } note[slug]=v; save('elyria_notify',note); render(); });
      var u=wrap.querySelector('.rs-undo'); if(u) u.addEventListener('click', function(){ delete note[slug]; save('elyria_notify',note); render(); });
    }
    box.appendChild(wrap); render();
  })();

  /* recently viewed rail */
  (function(){
    var rec=load('elyria_recent',[]); if(!Array.isArray(rec)) rec=[];
    rec=rec.filter(function(r){ return r && r.slug && r.slug!==slug; });
    rec.unshift({slug:slug,name:name,price:price,size:size,purity:purity}); rec=rec.slice(0,8);
    save('elyria_recent',rec);
    var others=rec.filter(function(r){ return r.slug!==slug; }).slice(0,5);
    if(others.length<3) return;
    var ruo=document.querySelector('.ruo-strip'); var ruoWrap=ruo?ruo.closest('.wrap'):null;
    if(!ruoWrap||!ruoWrap.parentNode) return;
    var sec=document.createElement('div'); sec.className='wrap';
    sec.innerHTML='<section class="section"><h2>Recently viewed</h2><div class="recent-rail">'+others.map(function(r){
      return '<a class="recent-card" href="'+r.slug+'.html"><span class="rc-vial" aria-hidden="true"><span class="rcv-cap"></span><span class="rcv-fill"></span></span><span class="rc-b"><span class="rc-nm">'+esc(r.name)+'</span><span class="rc-sub">'+esc(r.size)+(r.purity?(' \u00b7 '+esc(r.purity)):'')+'</span><span class="rc-pr">'+fmt(Number(r.price)||0)+'</span></span></a>';
    }).join('')+'</div></section>';
    ruoWrap.parentNode.insertBefore(sec, ruoWrap);
  })();
})();
