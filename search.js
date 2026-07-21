/* ============================================================
   ELYRIA BIO — GLOBAL COMMAND-PALETTE SEARCH
   Self-contained: embeds the catalog, injects its own CSS, and
   binds to every [role=search] input plus Cmd/Ctrl-K. Works from
   the homepage and any sub-page (resolves product URLs by depth).
   ============================================================ */
(function(){
  "use strict";
  var CATALOG = [{"id":"tirz","slug":"glp-2","name":"GLP-2","cas":"2023788-19-2","cat":"metabolic","price":179,"purity":"99.3%","size":"10 mg","tag":"incretin and metabolic-receptor signaling","stock":"low"},{"id":"reta","slug":"glp-3","name":"GLP-3","cas":"2381089-83-2","cat":"metabolic","price":55.99,"purity":"99.0%","size":"10 mg","tag":"multi-receptor metabolic signaling","stock":"low"},{"id":"bpc157","slug":"bpc-157","name":"BPC-157","cas":"137525-51-0","cat":"repair","price":39.99,"purity":"99.4%","size":"10 mg","tag":"cell-migration and angiogenesis","stock":"in"},{"id":"tb500","slug":"tb-500","name":"TB-500","cas":"885340-08-9","cat":"repair","price":44.99,"purity":"99.2%","size":"10 mg","tag":"actin-binding and cell-motility","stock":"in"},{"id":"ghkcu","slug":"ghk-cu","name":"GHK-Cu","cas":"89030-95-5","cat":"longevity","price":29.99,"purity":"99.6%","size":"50 mg","tag":"fibroblast and gene-expression","stock":"in"},{"id":"ipa","slug":"ipamorelin","name":"Ipamorelin","cas":"170851-70-4","cat":"growth","price":39.99,"purity":"99.5%","size":"10 mg","tag":"growth-hormone secretagogue signaling","stock":"in"},{"id":"tesa","slug":"tesamorelin","name":"Tesamorelin","cas":"218949-48-5","cat":"growth","price":49.99,"purity":"99.2%","size":"10 mg","tag":"GH-axis and lipid-metabolism","stock":"in"},{"id":"cjcipa","slug":"cjc-1295-ipamorelin","name":"CJC-1295/Ipamorelin","cas":"863288-34-0 / 170851-70-4","cat":"growth","price":47.99,"purity":"99.3%","size":"10 mg","tag":"growth-hormone-axis signaling","stock":"in"},{"id":"epi","slug":"epithalon","name":"Epithalon","cas":"307297-39-8","cat":"longevity","price":23.99,"purity":"99.7%","size":"10 mg","tag":"telomerase-activity and cellular-senescence","stock":"in"},{"id":"semax","slug":"semax","name":"Semax","cas":"80714-61-0","cat":"longevity","price":23.99,"purity":"99.4%","size":"10 mg","tag":"neurotrophic and BDNF-expression","stock":"in"},{"id":"selank","slug":"selank","name":"Selank","cas":"129954-34-3","cat":"longevity","price":23.99,"purity":"99.3%","size":"10 mg","tag":"GABAergic and anxiolytic-pathway","stock":"in"},{"id":"mt2","slug":"melanotan-2","name":"Melanotan II","cas":"121062-08-6","cat":"metabolic","price":23.99,"purity":"99.1%","size":"10 mg","tag":"melanocortin (MC1R/MC4R) signaling","stock":"in"},{"id":"dsip","slug":"dsip","name":"DSIP","cas":"62568-57-4","cat":"longevity","price":23.99,"purity":"99.5%","size":"10 mg","tag":"neuromodulation and recovery-pathway","stock":"in"},{"id":"kiss","slug":"kisspeptin","name":"Kisspeptin","cas":"374675-21-5","cat":"metabolic","price":54,"purity":"99.2%","size":"10 mg","tag":"GPR54/KISS1R reproductive-endocrine signaling","stock":"in"},{"id":"kpv","slug":"kpv","name":"KPV","cas":"67247-12-5","cat":"repair","price":31.99,"purity":"99.4%","size":"10 mg","tag":"anti-inflammatory and epithelial-repair","stock":"in"},{"id":"motsc","slug":"mots-c","name":"MOTS-c","cas":"1627580-64-6","cat":"metabolic","price":59.99,"purity":"99.2%","size":"20 mg","tag":"AMPK-signaling and metabolic-regulation","stock":"in"},{"id":"nad","slug":"nad-plus","name":"NAD+","cas":"53-84-9","cat":"longevity","price":55.99,"purity":"99.5%","size":"500 mg","tag":"cellular-energetics and sirtuin-pathway","stock":"in"},{"id":"gluta","slug":"glutathione","name":"Glutathione","cas":"70-18-8","cat":"longevity","price":47.99,"purity":"99.6%","size":"10 mg","tag":"redox-balance and detoxification","stock":"in"},{"id":"mt1","slug":"melanotan-1","name":"Melanotan I","cas":"75921-69-6","cat":"metabolic","price":23.99,"purity":"99.1%","size":"10 mg","tag":"melanocortin (MC1R) pigmentation-pathway","stock":"in"},{"id":"pt141","slug":"pt-141","name":"PT-141","cas":"189691-06-3","cat":"metabolic","price":23.99,"purity":"99.2%","size":"10 mg","tag":"MC4R signaling","stock":"in"},{"id":"aod","slug":"aod-9604","name":"AOD-9604","cas":"221231-10-3","cat":"metabolic","price":39.99,"purity":"99.3%","size":"10 mg","tag":"lipid-metabolism","stock":"in"},{"id":"cagri","slug":"cagrilintide","name":"Cagrilintide","cas":"1415456-99-3","cat":"metabolic","price":55.99,"purity":"99.2%","size":"10 mg","tag":"amylin/calcitonin-receptor signaling","stock":"in"},{"id":"igf1lr3","slug":"igf-1-lr3","name":"IGF-1 LR3","cas":"946870-92-4","cat":"growth","price":55.99,"purity":"99.0%","size":"1 mg","tag":"growth-factor (IGF-1R) signaling","stock":"in"},{"id":"amino1mq","slug":"5-amino-1mq","name":"5-Amino-1MQ","cas":"42464-96-0","cat":"metabolic","price":39.99,"purity":"99.4%","size":"10 mg","tag":"adipocyte and NNMT metabolic","stock":"in"},{"id":"ta1","slug":"thymosin-alpha-1","name":"Thymosin Alpha-1","cas":"62304-98-7","cat":"longevity","price":31.99,"purity":"99.4%","size":"10 mg","tag":"immune-modulation","stock":"in"},{"id":"snap8","slug":"snap-8","name":"SNAP-8","cas":"868844-74-0","cat":"longevity","price":23.99,"purity":"99.3%","size":"10 mg","tag":"SNARE-complex and dermal cosmetic-science","stock":"in"},{"id":"glow","slug":"glow","name":"GLOW Blend","cas":"Blend · GHK-Cu / BPC-157 / TB-500","cat":"longevity","price":91.99,"purity":"99.3%","size":"10 mg","tag":"dermal and tissue-repair","stock":"in"},{"id":"klow","slug":"klow","name":"KLOW Blend","cas":"Blend · GHK-Cu / TB-500 / BPC-157 / KPV","cat":"repair","price":103.99,"purity":"99.2%","size":"50 mg","tag":"tissue-repair","stock":"in"},{"id":"wolverine","slug":"bpc-157-tb-500","name":"BPC-157 / TB-500 Blend","cas":"Blend · BPC-157 / TB-500","cat":"repair","price":79.99,"purity":"99.3%","size":"20 mg","tag":"cell-migration and tissue-repair","stock":"in"},{"id":"bacwater","slug":"bacteriostatic-water","name":"Bacteriostatic Water","cas":"Sterile water for injection","cat":"supplies","price":13.59,"purity":"USP","size":"30 mL","tag":"peptide reconstitution","stock":"in"}];
  var inSub = /\/(products|collections|company|legal|resources)\//.test(location.pathname);
  /* deterministic lot code — mirrors lotInfo() in store.js so palette lots match the catalog */
  function hashStr(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return Math.abs(h); }
  function lotOf(p){ var h=hashStr(p.id+p.name); return "LMB-26"+String.fromCharCode(65+(h%6))+"-"+(100+(h%900)); }
  CATALOG.forEach(function(p){ p.lot=lotOf(p); });
  var BASE = inSub ? "../" : "";
  var CAT_LABEL = { metabolic:"Metabolic", repair:"Repair", longevity:"Longevity", growth:"Growth", cosmetic:"Cosmetic", cognitive:"Cognitive", other:"Research" };
  var ALIASES = { tirz:["glp-2","mounjaro","dual agonist","gip glp-1"], reta:["glp-3","triple agonist"], bpc157:["body protection compound","pentadecapeptide"], tb500:["thymosin beta 4","thymosin b4","tb4","tb 500"], ghkcu:["copper peptide","copper tripeptide","ghk cu"], ipa:["ipamorelin"], tesa:["tesamorelin","egrifta"], cjcipa:["cjc 1295","cjc1295","cjc"], epi:["epitalon","epithalon","aedg"], semax:["semax"], selank:["selank","tuftsin"], mt2:["melanotan ii","melanotan 2","mt2","mt-ii"], dsip:["delta sleep","dsip"], kiss:["kisspeptin","kisspeptin-10","metastin"], kpv:["kpv","lys-pro-val"], motsc:["mots-c","mots c","mitochondrial"], nad:["nad+","nad plus","nicotinamide adenine dinucleotide"], gluta:["glutathione","gsh"], mt1:["melanotan i","melanotan 1","mt1","afamelanotide"], pt141:["bremelanotide","pt 141"], aod:["aod9604","aod 9604","hgh fragment"], cagri:["cagrilintide","amylin"], igf1lr3:["igf1","igf-1","long r3","igf lr3"], amino1mq:["5 amino 1mq","aminomq","nnmt"], ta1:["thymosin alpha","thymalfasin","ta1"], snap8:["snap 8","acetyl octapeptide"], glow:["glow blend","glow"], klow:["klow blend","klow"], wolverine:["wolverine","bpc tb500","bpc/tb-500"], bacwater:["bac water","bacteriostatic","sterile water","diluent"] };

  /* ---- styles ---- */
  var css = document.createElement("style");
  css.textContent = [
    ".cmdk-backdrop{position:fixed;inset:0;z-index:4000;background:rgba(6,5,4,.72);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .18s ease}",
    ".cmdk-backdrop.open{opacity:1;pointer-events:auto}",
    ".cmdk{position:fixed;z-index:4001;left:50%;top:14vh;transform:translateX(-50%) translateY(-8px);width:min(640px,92vw);background:#0d0b09;border:1px solid rgba(231,192,106,.22);border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px rgba(231,192,106,.06);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.2,1);overflow:hidden;font-family:Inter,system-ui,sans-serif}",
    ".cmdk.open{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}",
    ".cmdk-in{display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.06)}",
    ".cmdk-in svg{width:20px;height:20px;flex:none;stroke:#e7c06a;opacity:.85}",
    ".cmdk-in input{flex:1;background:none;border:none;outline:none;color:#f4efe6;font-size:17px;font-family:inherit}",
    ".cmdk-in input::placeholder{color:#7d766a}",
    ".cmdk-in kbd{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#8a8375;border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:3px 7px}",
    ".cmdk-list{max-height:52vh;overflow-y:auto;padding:8px}",
    ".cmdk-sect{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#7d766a;padding:12px 12px 6px}",
    ".cmdk-item{display:flex;align-items:center;gap:14px;padding:11px 12px;border-radius:10px;cursor:pointer;text-decoration:none}",
    ".cmdk-item.active,.cmdk-item:hover{background:rgba(231,192,106,.09)}",
    ".cmdk-vial{width:30px;height:38px;flex:none;border-radius:4px 4px 6px 6px;background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.12);position:relative}",
    ".cmdk-vial::before{content:'';position:absolute;left:5px;right:5px;top:-4px;height:6px;border-radius:3px;background:#b9b3a6}",
    ".cmdk-vial::after{content:'';position:absolute;left:3px;right:3px;bottom:5px;height:13px;border-radius:2px;background:rgba(231,192,106,.5)}",
    ".cmdk-meta{flex:1;min-width:0}",
    ".cmdk-nm{display:block;color:#f4efe6;font-size:15px;font-weight:500;line-height:1.2}",
    ".cmdk-sub{display:block;color:#8a8375;font-size:12px;font-family:'IBM Plex Mono',monospace;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".cmdk-chip{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#e7c06a;background:rgba(231,192,106,.1);border-radius:20px;padding:3px 9px;flex:none}",
    ".cmdk-price{color:#f4efe6;font-size:14px;font-weight:600;flex:none;font-variant-numeric:tabular-nums}",
    ".cmdk-empty{padding:34px 20px;text-align:center;color:#8a8375;font-size:14px}",
    ".cmdk-empty b{color:#f4efe6;font-weight:500}",
    ".cmdk-foot{display:flex;gap:16px;padding:10px 16px;border-top:1px solid rgba(255,255,255,.06);color:#6f685c;font-size:11.5px}",
    ".cmdk-foot span{display:flex;align-items:center;gap:5px}",
    ".cmdk-foot kbd{font-family:'IBM Plex Mono',monospace;border:1px solid rgba(255,255,255,.12);border-radius:5px;padding:1px 6px;font-size:10.5px}",
    "@media (max-width:560px){.cmdk{top:0;left:0;transform:none;width:100vw;height:100dvh;border-radius:0;border:none}.cmdk.open{transform:none}.cmdk-list{max-height:none;flex:1}.cmdk{display:flex;flex-direction:column}}"
  ].join("");
  document.head.appendChild(css);

  /* ---- overlay markup ---- */
  var bd = document.createElement("div"); bd.className="cmdk-backdrop";
  var box = document.createElement("div"); box.className="cmdk"; box.setAttribute("role","dialog"); box.setAttribute("aria-modal","true"); box.setAttribute("aria-label","Search catalog");
  box.innerHTML =
    '<div class="cmdk-in"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'+
    '<input type="search" id="cmdkInput" placeholder="Search peptides, CAS or lot number…" autocomplete="off" spellcheck="false" aria-label="Search catalog" />'+
    '<kbd>Esc</kbd></div>'+
    '<div class="cmdk-list" id="cmdkList"></div>'+
    '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div>';
  document.body.appendChild(bd); document.body.appendChild(box);
  var input = box.querySelector("#cmdkInput");
  var list = box.querySelector("#cmdkList");

  var open=false, active=0, results=[];
  function score(p, q){
    var n=p.name.toLowerCase(), cas=(p.cas||"").toLowerCase(), c=(CAT_LABEL[p.cat]||"").toLowerCase(), tag=(p.tag||"").toLowerCase();
    if(n===q) return 100;
    if(n.indexOf(q)===0) return 90;
    if(n.indexOf(q)>-1) return 70;
    if(cas.indexOf(q)>-1) return 60;
    var lot=(p.lot||"").toLowerCase(); if(lot.indexOf(q)>-1) return 66;
    var al=(ALIASES[p.id]||[]).join(" "); if(al.indexOf(q)>-1) return 62;
    if(c.indexOf(q)>-1) return 40;
    if(tag.indexOf(q)>-1) return 25;
    // loose: all chars present in order
    var i=0; for(var k=0;k<n.length&&i<q.length;k++){ if(n[k]===q[i]) i++; }
    return i===q.length ? 15 : -1;
  }
  function render(){
    var q = input.value.trim().toLowerCase();
    if(!q){
      results = CATALOG.slice().sort(function(a,b){ return b.price-a.price; }).slice(0,6);
      list.innerHTML = '<div class="cmdk-sect">Popular reference materials</div>' + results.map(row).join("");
    } else {
      results = CATALOG.map(function(p){ return {p:p,s:score(p,q)}; }).filter(function(x){ return x.s>0; })
        .sort(function(a,b){ return b.s-a.s || a.p.name.localeCompare(b.p.name); }).map(function(x){ return x.p; });
      if(results.length===0){
        list.innerHTML = '<div class="cmdk-empty">No materials match <b>“'+esc(input.value.trim())+'”</b>.<br>Try a compound name, CAS number, lot code, or category.</div>';
      } else {
        list.innerHTML = '<div class="cmdk-sect">'+results.length+' result'+(results.length===1?'':'s')+'</div>' + results.map(row).join("");
      }
    }
    active=0; paintActive();
    Array.prototype.forEach.call(list.querySelectorAll(".cmdk-item"), function(el,i){
      el.addEventListener("mouseenter", function(){ active=i; paintActive(); });
      el.addEventListener("click", function(e){ e.preventDefault(); go(results[i]); });
    });
  }
  function row(p){
    var stockDot = p.stock==="low" ? ' · low stock' : '';
    return '<a class="cmdk-item" href="'+BASE+'products/'+p.slug+'.html">'+
      '<span class="cmdk-vial" aria-hidden="true"></span>'+
      '<span class="cmdk-meta"><span class="cmdk-nm">'+esc(p.name)+'</span>'+
      '<span class="cmdk-sub">'+(p.cas?('CAS '+p.cas+' · '):'')+p.purity+' · '+p.size+' · '+p.lot+stockDot+'</span></span>'+
      '<span class="cmdk-chip">'+(CAT_LABEL[p.cat]||'Research')+'</span>'+
      '<span class="cmdk-price">$'+Number(p.price).toFixed(2)+'</span></a>';
  }
  function paintActive(){
    var items = list.querySelectorAll(".cmdk-item");
    Array.prototype.forEach.call(items, function(el,i){ el.classList.toggle("active", i===active); });
    if(items[active] && items[active].scrollIntoView===undefined){}
  }
  function go(p){ if(!p) return; location.href = BASE+"products/"+p.slug+".html"; }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  function openPalette(seed){
    open=true; bd.classList.add("open"); box.classList.add("open");
    document.body.style.overflow="hidden";
    input.value = seed||""; render();
    setTimeout(function(){ input.focus(); },30);
  }
  function closePalette(){
    open=false; bd.classList.remove("open"); box.classList.remove("open");
    document.body.style.overflow="";
  }
  bd.addEventListener("click", closePalette);
  input.addEventListener("input", render);
  box.addEventListener("keydown", function(e){
    var items = list.querySelectorAll(".cmdk-item");
    if(e.key==="ArrowDown"){ e.preventDefault(); if(items.length){ active=(active+1)%items.length; paintActive(); scrollActive(); } }
    else if(e.key==="ArrowUp"){ e.preventDefault(); if(items.length){ active=(active-1+items.length)%items.length; paintActive(); scrollActive(); } }
    else if(e.key==="Enter"){ e.preventDefault(); go(results[active]); }
    else if(e.key==="Escape"){ e.preventDefault(); closePalette(); }
  });
  function scrollActive(){
    var el = list.querySelectorAll(".cmdk-item")[active]; if(!el) return;
    var r=el.getBoundingClientRect(), lr=list.getBoundingClientRect();
    if(r.bottom>lr.bottom) list.scrollTop += r.bottom-lr.bottom;
    else if(r.top<lr.top) list.scrollTop -= lr.top-r.top;
  }

  /* ---- global hotkey ---- */
  document.addEventListener("keydown", function(e){
    if((e.metaKey||e.ctrlKey) && (e.key==="k"||e.key==="K")){ e.preventDefault(); open?closePalette():openPalette(); }
  });

  /* ---- entry points ----
     The homepage has its own live grid filter on #searchInput — leave that
     intact (Cmd/Ctrl-K still opens the palette there). On every other page the
     visible search field routes into the palette, since there's no grid to filter. */
  function bindEntry(){
    var hasGrid = !!document.getElementById("grid");
    var forms = document.querySelectorAll('form[role="search"], #searchForm');
    Array.prototype.forEach.call(forms, function(form){
      var native = form.querySelector('input[type="search"], input#searchInput');
      if(hasGrid) return; // homepage keeps its inline filter
      form.addEventListener("submit", function(e){ e.preventDefault(); openPalette(native?native.value:""); });
      if(native){
        native.setAttribute("readonly","readonly");
        native.style.cursor="pointer";
        function trigger(e){ e.preventDefault(); native.blur(); openPalette(""); }
        native.addEventListener("focus", trigger);
        native.addEventListener("mousedown", trigger);
      }
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", bindEntry); else bindEntry();

  window.ElyriaSearch = { open: openPalette, close: closePalette };
})();
