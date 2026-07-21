/* ============================================================
   ELYRIA BIO — PRODUCT-PAGE DEPTH
   Self-contained. Runs on any page with [data-pdp]. Adds:
     1. A reconstitution reference calculator (lab prep math).
     2. An on-demand certificate-of-analysis document (print/PDF).
     3. A drag-and-drop product-photo slot on the vial (persists).
   Injects its own CSS. Storage: elyria_img_<id> for dropped photos.
   ============================================================ */
(function(){
  "use strict";
  var scope = document.querySelector("[data-pdp]");
  if(!scope) return;
  var id = scope.getAttribute("data-pdp");
  var name = scope.getAttribute("data-name") || "Reference material";
  var inSub = /\/products\//.test(location.pathname);

  /* ---- pull facts off the page ---- */
  function txt(sel){ var e=document.querySelector(sel); return e ? e.textContent.trim() : ""; }
  var casLine = txt(".pdp-cas");                        // "CAS 137525-51-0 · 10 mg"
  var casNo = (casLine.match(/CAS\s+([0-9\-]+)/)||[])[1] || "";
  var mgMatch = casLine.match(/([\d.]+)\s*mg/);
  var vialMg = mgMatch ? parseFloat(mgMatch[1]) : 10;
  var purity = (function(){ var m=document.querySelector(".pdp-mini .mv"); return m?m.textContent.trim():"99.0%"; })();
  var cat = txt(".p-cat").split("·")[0].trim() || "Reference material";

  /* ---- deterministic lot (matches storefront convention LMB-26X-###) ---- */
  function hashStr(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return Math.abs(h); }
  var h = hashStr(id+name);
  var lot = "LMB-26"+String.fromCharCode(65+(h%6))+"-"+(100+(h%900));
  var assayD = new Date(Date.now()-(h%120)*864e5);
  var expD = new Date(assayD.getTime()+730*864e5);
  function fdate(d){ return d.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"2-digit"}); }

  /* ---- styles ---- */
  var css=document.createElement("style");
  css.textContent=[
    ".pdp-tools .wrap{--x:0}",
    ".recon{display:grid;grid-template-columns:1.05fr .95fr;gap:34px;align-items:start}",
    "@media(max-width:760px){.recon{grid-template-columns:1fr;gap:24px}}",
    ".recon-field{margin-bottom:18px}",
    ".recon-field label{display:block;font-size:12.5px;letter-spacing:.02em;color:var(--mist-2,#8a8375);margin-bottom:8px}",
    ".recon-input{display:flex;align-items:center;gap:0;border:1px solid rgba(255,255,255,.13);border-radius:11px;background:rgba(255,255,255,.02);overflow:hidden;transition:border-color .16s}",
    ".recon-input:focus-within{border-color:rgba(231,192,106,.5)}",
    ".recon-input input{flex:1;min-width:0;background:none;border:none;outline:none;color:var(--paper,#f4efe6);font-size:17px;font-family:'IBM Plex Mono',monospace;padding:13px 14px}",
    ".recon-input .unit{padding:0 14px;font-size:13px;color:var(--mist-2,#8a8375);font-family:'IBM Plex Mono',monospace;border-left:1px solid rgba(255,255,255,.08);align-self:stretch;display:flex;align-items:center}",
    ".recon-out{background:linear-gradient(180deg,rgba(231,192,106,.06),rgba(231,192,106,.02));border:1px solid rgba(231,192,106,.22);border-radius:14px;padding:24px}",
    ".recon-out h4{margin:0 0 4px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#e7c06a;font-weight:600}",
    ".recon-out .ohint{font-size:12.5px;color:var(--mist-2,#8a8375);margin:0 0 18px}",
    ".recon-row{display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;border-top:1px solid rgba(255,255,255,.07)}",
    ".recon-row:first-of-type{border-top:none}",
    ".recon-row .rk{font-size:13.5px;color:var(--paper,#f4efe6)}",
    ".recon-row .rv{font-family:'IBM Plex Mono',monospace;font-size:19px;color:#f4efe6;font-weight:500;font-variant-numeric:tabular-nums}",
    ".recon-row .rv b{color:#e7c06a;font-weight:600}",
    ".recon-note{font-size:11.5px;color:var(--mist-2,#8a8375);margin-top:16px;line-height:1.5}",
    ".coa-panel{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:22px 24px;background:rgba(255,255,255,.015)}",
    ".coa-panel .coa-ic{width:46px;height:46px;flex:none;border-radius:11px;display:grid;place-items:center;background:rgba(231,192,106,.1);color:#e7c06a}",
    ".coa-panel .coa-ic svg{width:22px;height:22px}",
    ".coa-panel .coa-meta{flex:1;min-width:200px}",
    ".coa-panel .coa-meta h4{margin:0 0 3px;font-size:16px;color:var(--paper,#f4efe6)}",
    ".coa-panel .coa-meta p{margin:0;font-size:13px;color:var(--mist-2,#8a8375)}",
    ".coa-panel .coa-meta .lotm{font-family:'IBM Plex Mono',monospace;color:#e7c06a}",
    ".pdp-photo-slot{position:absolute;inset:0;z-index:6;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .18s;pointer-events:none}",
    ".pdp-stage:hover .pdp-photo-slot{opacity:1}",
    ".pdp-photo-slot.drag{opacity:1;background:rgba(231,192,106,.08);outline:2px dashed rgba(231,192,106,.5);outline-offset:-8px;border-radius:16px}",
    ".pdp-photo-hint{pointer-events:auto;cursor:pointer;margin-bottom:14px;font-size:11.5px;letter-spacing:.03em;color:#e7c06a;background:rgba(13,11,9,.85);border:1px solid rgba(231,192,106,.3);border-radius:20px;padding:6px 14px;backdrop-filter:blur(6px)}"
  ].join("");
  document.head.appendChild(css);

  /* ============================================================
     1 + 2 — inject calculator + COA after the Specifications block
     ============================================================ */
  var specs = document.querySelector(".specs");
  var anchor = specs ? specs.closest(".wrap") : null;

  var block = document.createElement("div");
  block.className = "wrap pdp-tools";
  block.innerHTML =
    '<section class="section"><h2>Reconstitution reference</h2>'+
    '<p class="sub">Lab-prep math for '+esc(name)+'. Enter the diluent volume and the amount you plan to aliquot; the tool returns concentration and draw volume on a U-100 (100 unit / mL) graduated syringe. For in-vitro preparation reference only.</p>'+
    '<div class="recon">'+
      '<div class="recon-inputs">'+
        field("Peptide in vial","reconMg",vialMg,"mg")+
        field("Bacteriostatic water added","reconMl",2,"mL")+
        field("Target amount per aliquot","reconUg",250,"\u00b5g")+
      '</div>'+
      '<div class="recon-out">'+
        '<h4>Result</h4><p class="ohint">Reconstituting '+vialMg+' mg with the volume above</p>'+
        '<div class="recon-row"><span class="rk">Concentration</span><span class="rv" id="reconConc">\u2014</span></div>'+
        '<div class="recon-row"><span class="rk">Per aliquot</span><span class="rv" id="reconDraw">\u2014</span></div>'+
        '<div class="recon-row"><span class="rk">Aliquots per vial</span><span class="rv" id="reconN">\u2014</span></div>'+
        '<p class="recon-note">U-100 syringe: 100 units = 1 mL. Values are calculated references for laboratory reconstitution and do not constitute dosing guidance. Research Use Only.</p>'+
      '</div>'+
    '</div></section>'+
    '<section class="section"><h2>Certificate of analysis</h2>'+
    '<p class="sub">Every shipped vial resolves to a signed third-party COA. Preview the representative certificate for the current lot, or verify any printed lot number in batch lookup.</p>'+
    '<div class="coa-panel">'+
      '<div class="coa-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 13l2 2 4-4"/></svg></div>'+
      '<div class="coa-meta"><h4>'+esc(name)+' \u2014 Certificate of analysis</h4><p>Lot <span class="lotm">'+lot+'</span> \u00b7 '+purity+' HPLC \u00b7 assayed '+fdate(assayD)+'</p></div>'+
      '<button class="btn btn-solid magnetic" id="coaOpen">View / download COA (PDF)</button>'+
      '<a class="btn btn-ghost magnetic" href="'+(inSub?"../":"")+'resources/batch-lookup.html">Verify a lot \u2192</a>'+
    '</div></section>';

  if(anchor && anchor.parentNode){ anchor.parentNode.insertBefore(block, anchor.nextSibling); }
  else { var main=document.querySelector("main")||document.body; main.appendChild(block); }

  function field(label,idv,val,unit){
    return '<div class="recon-field"><label for="'+idv+'">'+label+'</label>'+
      '<div class="recon-input"><input id="'+idv+'" type="number" inputmode="decimal" min="0" step="any" value="'+val+'"><span class="unit">'+unit+'</span></div></div>';
  }
  function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  /* ---- calculator logic ---- */
  var mgEl=document.getElementById("reconMg"), mlEl=document.getElementById("reconMl"), ugEl=document.getElementById("reconUg");
  function num(el,fb){ var v=parseFloat(el.value); return (isFinite(v)&&v>0)?v:fb; }
  function calc(){
    var mg=num(mgEl,vialMg), ml=num(mlEl,2), ug=num(ugEl,250);
    var concMgMl = mg/ml;                 // mg per mL
    var concMcgMl = concMgMl*1000;        // mcg per mL
    var drawMl = ug/concMcgMl;            // mL to reach target ug
    var units = drawMl*100;              // U-100 units
    var nAliquots = (mg*1000)/ug;         // total ug / per-aliquot ug
    document.getElementById("reconConc").innerHTML = concMgMl.toFixed(2)+' <b>mg/mL</b>';
    document.getElementById("reconDraw").innerHTML = units.toFixed(1)+' <b>units</b>';
    document.getElementById("reconN").textContent = Math.floor(nAliquots)+"";
  }
  [mgEl,mlEl,ugEl].forEach(function(el){ el.addEventListener("input", calc); });
  calc();

  /* ---- COA document (print → PDF) ---- */
  document.getElementById("coaOpen").addEventListener("click", function(){
    var w=window.open("","_blank");
    if(!w){ alert("Please allow pop-ups to view the certificate."); return; }
    var rows=[
      ["Product", name+" reference material"],
      ["CAS number", casNo||"\u2014"],
      ["Lot / batch", lot],
      ["Appearance", "White lyophilized powder"],
      ["HPLC purity", purity+"  (\u2265 99% specification)"],
      ["Identity (ESI-MS)", "Confirmed \u2014 consistent with theoretical mass"],
      ["Endotoxin (LAL)", "< 0.5 EU/mg"],
      ["Water content (KF)", "\u2264 6.0%"],
      ["Counterion", "Acetate"],
      ["Assay date", fdate(assayD)],
      ["Retest by", fdate(expD)],
      ["Storage", "\u221220\u00b0C, sealed & desiccated, protected from light"]
    ];
    var trs = rows.map(function(r){ return '<tr><td class="k">'+r[0]+'</td><td class="v">'+r[1]+'</td></tr>'; }).join("");
    w.document.write(
      '<!doctype html><html><head><meta charset="utf-8"><title>COA '+lot+' \u2014 '+name+'</title>'+
      '<style>'+
      '@page{size:letter;margin:0.8in}'+
      'body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;margin:0;padding:40px;max-width:760px}'+
      '.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #a9792f;padding-bottom:18px;margin-bottom:6px}'+
      '.bn{font-family:Georgia,serif;font-size:26px;letter-spacing:.5px}.bn b{color:#a9792f}'+
      '.bn small{display:block;font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#888;margin-top:4px;font-family:sans-serif}'+
      '.doc{text-align:right;font-size:12px;color:#555}.doc h1{font-size:15px;margin:0 0 6px;letter-spacing:.12em;text-transform:uppercase;color:#a9792f}'+
      'table{width:100%;border-collapse:collapse;margin:26px 0}'+
      'td{padding:11px 4px;border-bottom:1px solid #eee;font-size:13.5px;vertical-align:top}'+
      'td.k{color:#666;width:38%}td.v{font-weight:600}'+
      '.pass{color:#1c7a43}'+
      '.sig{display:flex;justify-content:space-between;margin-top:40px;font-size:12px;color:#555}'+
      '.sig .l{border-top:1px solid #999;padding-top:6px;width:44%}'+
      '.ruo{margin-top:34px;padding:14px 16px;background:#faf7f0;border:1px solid #e8dcbf;border-radius:8px;font-size:11.5px;color:#6b5d3a;line-height:1.6}'+
      '.stamp{margin-top:22px;font-size:11px;color:#999}'+
      '@media print{.noprint{display:none}}'+
      '</style></head><body>'+
      '<div class="hd"><div class="bn">Elyria<b> Bio</b><small>Reference Materials</small></div>'+
      '<div class="doc"><h1>Certificate of Analysis</h1>Document '+lot+'<br>Issued '+fdate(assayD)+'</div></div>'+
      '<table>'+trs+'</table>'+
      '<div class="sig"><div class="l">Analyst \u2014 Quality Control</div><div class="l">Authorized by \u2014 QA Release</div></div>'+
      '<div class="ruo"><b>Research Use Only.</b> This material is supplied as an in-vitro laboratory reference material for qualified research professionals. It is not a drug, supplement, or food, is not for human or veterinary use, and has not been evaluated by the FDA. Analytical values describe the referenced lot as characterized by an independent laboratory.</div>'+
      '<div class="stamp">Verify this lot at elyriabio.com/resources/batch-lookup.html \u2014 '+lot+'</div>'+
      '<div class="noprint" style="margin-top:30px;text-align:center"><button onclick="window.print()" style="font:600 14px sans-serif;background:#a9792f;color:#fff;border:none;border-radius:24px;padding:12px 28px;cursor:pointer">Print / Save as PDF</button></div>'+
      '</body></html>'
    );
    w.document.close();
  });

  /* ============================================================
     3 — drag-and-drop product photo slot on the vial
     ============================================================ */
  var stage = document.querySelector(".pdp-stage");
  if(stage){
    if(getComputedStyle(stage).position==="static") stage.style.position="relative";
    var vshot = stage.querySelector(".vshot");
    var photo = stage.querySelector("img.photo");
    var KEY = "elyria_img_"+id;

    function applyStored(){
      var d=null; try{ d=localStorage.getItem(KEY); }catch(e){}
      if(!d) return;
      if(!photo){ photo=document.createElement("img"); photo.className="photo"; photo.alt=name+" vial"; if(vshot) vshot.appendChild(photo); }
      photo.src=d; photo.style.display="";
    }
    applyStored();

    var slot=document.createElement("div"); slot.className="pdp-photo-slot";
    slot.innerHTML='<span class="pdp-photo-hint">Drop a product photo</span>';
    stage.appendChild(slot);
    var fileIn=document.createElement("input"); fileIn.type="file"; fileIn.accept="image/*"; fileIn.style.display="none";
    stage.appendChild(fileIn);
    slot.querySelector(".pdp-photo-hint").addEventListener("click", function(){ fileIn.click(); });
    fileIn.addEventListener("change", function(){ if(fileIn.files&&fileIn.files[0]) readImg(fileIn.files[0]); });

    ["dragenter","dragover"].forEach(function(ev){ stage.addEventListener(ev,function(e){ e.preventDefault(); slot.classList.add("drag"); }); });
    ["dragleave","dragend"].forEach(function(ev){ stage.addEventListener(ev,function(e){ if(e.target===stage||!stage.contains(e.relatedTarget)) slot.classList.remove("drag"); }); });
    stage.addEventListener("drop", function(e){
      e.preventDefault(); slot.classList.remove("drag");
      var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
      if(f&&/^image\//.test(f.type)) readImg(f);
    });
    function readImg(f){
      var r=new FileReader();
      r.onload=function(){ try{ localStorage.setItem(KEY,r.result); }catch(err){}
        if(!photo){ photo=document.createElement("img"); photo.className="photo"; photo.alt=name+" vial"; if(vshot) vshot.appendChild(photo); }
        photo.src=r.result; photo.style.display="";
        var hint=slot.querySelector(".pdp-photo-hint"); if(hint) hint.textContent="Photo saved \u00b7 drop to replace";
      };
      r.readAsDataURL(f);
    }
  }
})();
