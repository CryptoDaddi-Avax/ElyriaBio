/* ============================================================
   ELYRIA BIO — STOREFRONT LOGIC
   ============================================================ */
(function(){
"use strict";
var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var finePointer = window.matchMedia("(pointer:fine)").matches;
/* cross-document view transitions reject with "Transition was skipped" when
   there is no old page (fresh load, iframe) — benign; keep the console clean */
window.addEventListener('unhandledrejection', function(e){
  var r = e.reason;
  if(r && /transition was skipped/i.test((r.message||r)+'')) e.preventDefault();
});
/* startViewTransition wrapper — swallow "transition skipped" rejections */
function svt(fn){
  if(document.startViewTransition && !reduce){
    var t = document.startViewTransition(fn);
    if(t){ if(t.ready && t.ready.catch) t.ready.catch(function(){}); if(t.finished && t.finished.catch) t.finished.catch(function(){}); }
    return t;
  }
  fn(); return null;
}

/* ===================== STORAGE HELPERS ===================== */
function load(k, fb){ try{ var v = localStorage.getItem(k); return v==null?fb:JSON.parse(v); }catch(e){ return fb; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} if(k==="elyria_cart"){ try{ document.dispatchEvent(new CustomEvent("cart:change")); }catch(e){} } }

/* ===================== PRODUCT DATA =====================
   To use real product photos, set `photo` to an image URL —
   the studio render is the fallback and shows otherwise. */
var PRODUCTS = [
  {id:"tirz", name:"GLP-2", cat:"metabolic", cas:"CAS 2023788-19-2", size:"10 mg", price:179, compareAt:0, purity:"99.3%", rating:4.8, reviews:156, badge:"popular", stock:"low", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/glp-2.jpg",
   desc:"Dual GIP/GLP-1 reference peptide for comparative incretin-receptor research models."},
  {id:"reta", name:"GLP-3", cat:"metabolic", cas:"CAS 2381089-83-2", size:"10 mg", price:55.99, compareAt:0, purity:"99.0%", rating:4.5, reviews:74, badge:"new", stock:"low", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/glp-3.jpg",
   variants:[{mg:10,size:"10 mg",price:55.99},{mg:15,size:"15 mg",price:69.99},{mg:30,size:"30 mg",price:109.99}],
   desc:"Triple-agonist reference peptide characterized for multi-receptor in-vitro binding studies."},
  {id:"bpc157", name:"BPC-157", cat:"repair", cas:"CAS 137525-51-0", size:"10 mg", price:39.99, compareAt:0, purity:"99.4%", rating:4.8, reviews:212, badge:"bestseller", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/bpc-157.jpg",
   variants:[{mg:10,size:"10 mg",price:39.99}],
   desc:"Pentadecapeptide studied in vitro for cell-migration and angiogenesis assays in connective-tissue models."},
  {id:"tb500", name:"TB-500", cat:"repair", cas:"CAS 885340-08-9", size:"10 mg", price:44.99, compareAt:0, purity:"99.2%", rating:4.6, reviews:138, badge:"", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/tb-500.jpg",
   variants:[{mg:10,size:"10 mg",price:44.99}],
   desc:"Thymosin β4 fragment used as a research reference in actin-binding and cell-motility studies."},
  {id:"ghkcu", name:"GHK-Cu", cat:"longevity", cas:"CAS 89030-95-5", size:"50 mg", price:29.99, compareAt:0, purity:"99.6%", rating:4.9, reviews:341, badge:"bestseller", stock:"in", endo:"< 0.3 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/ghk-cu.jpg",
   variants:[{mg:50,size:"50 mg",price:29.99}],
   desc:"Copper-binding tripeptide referenced in fibroblast and gene-expression research preparations."},
  {id:"ipa", name:"Ipamorelin", cat:"growth", cas:"CAS 170851-70-4", size:"10 mg", price:39.99, compareAt:0, purity:"99.5%", rating:4.7, reviews:203, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/ipamorelin.jpg",
   desc:"Selective ghrelin-receptor reference peptide used in secretagogue signaling research."},
  {id:"tesa", name:"Tesamorelin", cat:"growth", cas:"CAS 218949-48-5", size:"10 mg", price:49.99, compareAt:0, purity:"99.2%", rating:4.6, reviews:64, badge:"", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/tesamorelin.jpg",
   variants:[{mg:10,size:"10 mg",price:49.99}],
   desc:"Stabilized GHRH(1–44) analog referenced in vitro for growth-hormone–axis and lipid-metabolism studies."},
  {id:"cjcipa", name:"CJC-1295/Ipamorelin", cat:"growth", cas:"CAS 863288-34-0 / 170851-70-4", size:"10 mg", price:47.99, compareAt:0, purity:"99.3%", rating:4.8, reviews:96, badge:"new", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/cjc-1295-ipamorelin.jpg",
   desc:"Growth-axis blend pairing long-acting GHRH analog CJC-1295 with selective ghrelin-receptor secretagogue Ipamorelin for combined in-vitro signaling research."},
  {id:"epi", name:"Epithalon", cat:"longevity", cas:"CAS 307297-39-8", size:"10 mg", price:23.99, compareAt:0, purity:"99.7%", rating:4.6, reviews:118, badge:"", stock:"in", endo:"< 0.3 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/epithalon.jpg",
   desc:"Tetrapeptide studied in vitro in telomerase-activity and cellular-senescence research models."},
  {id:"semax", name:"Semax", cat:"longevity", cas:"CAS 80714-61-0", size:"10 mg", price:23.99, compareAt:0, purity:"99.4%", rating:4.7, reviews:88, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/semax.jpg",
   desc:"ACTH(4–10) heptapeptide analog used in vitro in neurotrophic and BDNF-expression research."},
  {id:"selank", name:"Selank", cat:"longevity", cas:"CAS 129954-34-3", size:"10 mg", price:23.99, compareAt:0, purity:"99.3%", rating:4.6, reviews:71, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/selank.jpg",
   desc:"Tuftsin-derived heptapeptide referenced in vitro in GABAergic and anxiolytic-pathway research."},
  {id:"mt2", name:"Melanotan II", cat:"metabolic", cas:"CAS 121062-08-6", size:"10 mg", price:23.99, compareAt:0, purity:"99.1%", rating:4.5, reviews:132, badge:"popular", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/melanotan-2.jpg",
   desc:"Cyclic melanocortin-receptor agonist analog used in vitro in MC1R/MC4R signaling research."},
  {id:"dsip", name:"DSIP", cat:"longevity", cas:"CAS 62568-57-4", size:"10 mg", price:23.99, compareAt:0, purity:"99.5%", rating:4.6, reviews:57, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/dsip.jpg",
   desc:"Delta sleep-inducing nonapeptide referenced in vitro in neuromodulation and recovery-pathway research."},
  {id:"kiss", name:"Kisspeptin", cat:"metabolic", cas:"CAS 374675-21-5", size:"10 mg", price:54, compareAt:0, purity:"99.2%", rating:4.5, reviews:49, badge:"new", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/kisspeptin.jpg",
   desc:"Kisspeptin-10 decapeptide referenced in vitro in GPR54/KISS1R reproductive-endocrine signaling research."},
  {id:"kpv", name:"KPV", cat:"repair", cas:"CAS 67247-12-5", size:"10 mg", price:31.99, compareAt:0, purity:"99.4%", rating:4.7, reviews:84, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/kpv.jpg",
   desc:"Tripeptide (Lys-Pro-Val), the C-terminal α-MSH fragment, referenced in vitro in anti-inflammatory and epithelial-repair research."},
  {id:"motsc", name:"MOTS-c", cat:"metabolic", cas:"CAS 1627580-64-6", size:"20 mg", price:59.99, compareAt:0, purity:"99.2%", rating:4.6, reviews:67, badge:"new", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/mots-c.jpg",
   variants:[{mg:20,size:"20 mg",price:59.99},{mg:40,size:"40 mg",price:99.99}],
   desc:"Mitochondrial-derived peptide referenced in vitro in AMPK-signaling and metabolic-regulation research."},
  {id:"nad", name:"NAD+", cat:"longevity", cas:"CAS 53-84-9", size:"500 mg", price:55.99, compareAt:0, purity:"99.5%", rating:4.8, reviews:156, badge:"popular", stock:"in", endo:"< 0.3 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/nad-plus.jpg",
   desc:"Nicotinamide adenine dinucleotide coenzyme used in vitro in cellular-energetics and sirtuin-pathway research."},
  {id:"gluta", name:"Glutathione", cat:"longevity", cas:"CAS 70-18-8", size:"10 mg", price:47.99, compareAt:0, purity:"99.6%", rating:4.7, reviews:98, badge:"", stock:"in", endo:"< 0.3 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/glutathione.jpg",
   desc:"Endogenous tripeptide antioxidant referenced in vitro in redox-balance and detoxification research."},
  {id:"mt1", name:"Melanotan I", cat:"metabolic", cas:"CAS 75921-69-6", size:"10 mg", price:23.99, compareAt:0, purity:"99.1%", rating:4.5, reviews:73, badge:"", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/melanotan-1.jpg",
   desc:"Linear α-MSH analog studied in vitro in melanocortin (MC1R) pigmentation-pathway research."},
  {id:"pt141", name:"PT-141", cat:"metabolic", cas:"CAS 189691-06-3", size:"10 mg", price:23.99, compareAt:0, purity:"99.2%", rating:4.6, reviews:112, badge:"popular", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/pt-141.jpg",
   desc:"Cyclic melanocortin-receptor agonist (bremelanotide) referenced in vitro in MC4R signaling research."},
  {id:"aod", name:"AOD-9604", cat:"metabolic", cas:"CAS 221231-10-3", size:"10 mg", price:39.99, compareAt:0, purity:"99.3%", rating:4.6, reviews:61, badge:"", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/aod-9604.jpg",
   desc:"hGH(177–191) fragment analog used in vitro in lipid-metabolism research."},
  {id:"cagri", name:"Cagrilintide", cat:"metabolic", cas:"CAS 1415456-99-3", size:"10 mg", price:55.99, compareAt:0, purity:"99.2%", rating:4.7, reviews:58, badge:"new", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/cagrilintide.jpg",
   desc:"Long-acting amylin analog referenced in vitro in amylin/calcitonin-receptor research."},
  {id:"igf1lr3", name:"IGF-1 LR3", cat:"growth", cas:"CAS 946870-92-4", size:"1 mg", price:55.99, compareAt:0, purity:"99.0%", rating:4.6, reviews:74, badge:"", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/igf-1-lr3.jpg",
   desc:"Long-Arg3 insulin-like growth factor-1 analog used in vitro in growth-factor signaling research."},
  {id:"amino1mq", name:"5-Amino-1MQ", cat:"metabolic", cas:"CAS 42464-96-0", size:"10 mg", price:39.99, compareAt:0, purity:"99.4%", rating:4.6, reviews:69, badge:"new", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/5-amino-1mq.jpg",
   desc:"Small-molecule NNMT inhibitor referenced in vitro in adipocyte and metabolic research."},
  {id:"ta1", name:"Thymosin Alpha-1", cat:"longevity", cas:"CAS 62304-98-7", size:"10 mg", price:31.99, compareAt:0, purity:"99.4%", rating:4.7, reviews:88, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/thymosin-alpha-1.jpg",
   desc:"Thymic peptide (Tα1) referenced in vitro in immune-modulation research."},
  {id:"snap8", name:"SNAP-8", cat:"longevity", cas:"CAS 868844-74-0", size:"10 mg", price:23.99, compareAt:0, purity:"99.3%", rating:4.5, reviews:54, badge:"", stock:"in", endo:"< 0.4 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/snap-8.jpg",
   desc:"Octapeptide referenced in vitro in SNARE-complex and dermal cosmetic-science research."},
  {id:"glow", name:"GLOW Blend", cat:"longevity", cas:"Blend · GHK-Cu / BPC-157 / TB-500", size:"10 mg", price:91.99, compareAt:0, purity:"99.3%", rating:4.8, reviews:64, badge:"popular", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/glow.jpg",
   desc:"Cellular blend pairing GHK-Cu, BPC-157 and TB-500 for combined in-vitro dermal and repair research."},
  {id:"klow", name:"KLOW Blend", cat:"repair", cas:"Blend · GHK-Cu / TB-500 / BPC-157 / KPV", size:"80 mg", price:99.99, compareAt:0, purity:"99.2%", rating:4.8, reviews:51, badge:"new", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/klow.jpg",
   variants:[{mg:80,size:"80 mg",price:99.99}],
   desc:"Four-peptide cellular blend (GHK-Cu, TB-500, BPC-157, KPV) for combined in-vitro repair research."},
  {id:"wolverine", name:"BPC-157 / TB-500 Blend", cat:"repair", cas:"Blend · BPC-157 / TB-500", size:"20 mg", price:79.99, compareAt:0, purity:"99.3%", rating:4.8, reviews:96, badge:"bestseller", stock:"in", endo:"< 0.5 EU/mg", identity:"Confirmed (MS)", photo:"assets/products/bpc-157-tb-500.jpg",
   desc:"Recovery blend pairing BPC-157 and TB-500 for combined in-vitro cell-migration research."},
  {id:"bacwater", name:"Bacteriostatic Water", cat:"supplies", cas:"Sterile water for injection", size:"30 mL", price:16.99, compareAt:0, purity:"USP", rating:4.9, reviews:418, badge:"bestseller", stock:"in", endo:"< 0.25 EU/mL", identity:"USP grade", supply:true, photo:"assets/products/bacteriostatic-water.jpg",
   desc:"Multi-dose sterile diluent — water for injection with 0.9% benzyl alcohol — for reconstituting lyophilized research peptides."}
];
var LOT_OVERRIDES = {
  bacwater: { lot:"EB61901", assay:"May 14, 2026", exp:"May 14, 2028" }
};
function product(id){ for(var i=0;i<PRODUCTS.length;i++){ if(PRODUCTS[i].id===id) return PRODUCTS[i]; } return null; }
var SLUGS={bpc157:"bpc-157",tb500:"tb-500",ghkcu:"ghk-cu",tirz:"glp-2",reta:"glp-3",ipa:"ipamorelin",cjcipa:"cjc-1295-ipamorelin",epi:"epithalon",tesa:"tesamorelin",semax:"semax",selank:"selank",mt2:"melanotan-2",dsip:"dsip",kiss:"kisspeptin",kpv:"kpv",motsc:"mots-c",nad:"nad-plus",gluta:"glutathione",mt1:"melanotan-1",pt141:"pt-141",aod:"aod-9604",cagri:"cagrilintide",igf1lr3:"igf-1-lr3",amino1mq:"5-amino-1mq",ta1:"thymosin-alpha-1",snap8:"snap-8",glow:"glow",klow:"klow",wolverine:"bpc-157-tb-500",bacwater:"bacteriostatic-water"};
function purl(id){ return "products/"+(SLUGS[id]||id)+".html"; }
function fmt(n){ return "$"+n.toFixed(2); }
function scrollToEl(el){ if(!el) return; var r=el.getBoundingClientRect(); window.scrollTo({top:r.top+window.pageYOffset-90, behavior:"smooth"}); }

/* ===================== VARIANTS, KEYS & CATALOG HELPERS ===================== */
function mgOf(p){ var v=parseFloat(p.size); return (!p.supply && /mg\b/i.test(p.size) && v>0) ? v : 0; }
function fmtMg(n){ return (Number.isInteger(n)?n:n.toFixed(1))+" mg"; }
/* Each mg-based peptide is offered as a half-size vial (modest per-mg premium) plus the native size.
   Products with a custom `variants` array bypass this logic entirely. */
function variantsFor(p){
  if(p.variants) return p.variants;
  var mg=mgOf(p); if(!mg) return null;
  var half=mg/2; if(half<1) return null;
  var halfPrice=Math.round(p.price*0.62*100)/100;
  return [ {mg:half, size:fmtMg(half), price:halfPrice}, {mg:mg, size:p.size, price:p.price} ];
}
/* Cart keys: native size uses the bare id (back-compatible); a chosen non-native size is "id|mg". */
function splitKey(key){ var s=String(key), i=s.indexOf("|"); return i<0?{id:s,mg:null}:{id:s.slice(0,i),mg:parseFloat(s.slice(i+1))}; }
function keyProduct(key){
  var sk=splitKey(key), p=product(sk.id); if(!p) return null;
  var price=p.price, size=p.size;
  if(sk.mg!=null){ var vs=variantsFor(p); if(vs){ for(var i=0;i<vs.length;i++){ if(Math.abs(vs[i].mg-sk.mg)<1e-6){ price=vs[i].price; size=vs[i].size; break; } } } }
  return {id:sk.id, key:String(key), p:p, price:price, size:size};
}
function makeKey(id, mg){ var p=product(id); if(!p) return id; var native=mgOf(p); if(mg==null || Math.abs(mg-native)<1e-6) return id; return id+"|"+mg; }
function permgVal(p){ var mg=parseFloat(p.size); return (!p.supply && /mg\b/i.test(p.size) && mg>0)? p.price/mg : Infinity; }
function cardPriceHTML(p, mg){
  var vs=variantsFor(p), price=p.price, size=p.size;
  if(vs && mg!=null){ for(var i=0;i<vs.length;i++){ if(Math.abs(vs[i].mg-mg)<1e-6){ price=vs[i].price; size=vs[i].size; break; } } }
  var h='<span class="price">'+fmt(price)+'</span>';
  if(p.compareAt && p.compareAt>price) h+='<span class="price-compare">'+fmt(p.compareAt)+'</span>';
  h+='<span class="price-size">/ '+size+'</span>';
  var mgv=parseFloat(size);
  if(!p.supply && /mg\b/i.test(size) && mgv>0) h+='<span class="price-permg">'+fmt(price/mgv)+' / mg</span>';
  return h;
}
function sizeSelHTML(p){
  var vs=variantsFor(p); if(!vs) return "";
  var native=mgOf(p);
  return '<div class="card-size" data-sizesel="'+p.id+'" role="group" aria-label="Vial size for '+p.name+'">'+vs.map(function(v){ return '<button type="button" data-size="'+v.mg+'" data-id="'+p.id+'"'+(v.mg===native?' class="on"':'')+' aria-label="'+v.size+' vial">'+v.size+'</button>'; }).join("")+'</div>';
}
function selectCardSize(id, mg){
  cardSize[id]=mg;
  var card=grid.querySelector('.card[data-id="'+id+'"]'); if(!card) return;
  card.querySelectorAll('[data-sizesel="'+id+'"] [data-size]').forEach(function(b){ b.classList.toggle("on", Math.abs(parseFloat(b.getAttribute("data-size"))-mg)<1e-6); });
  var pr=card.querySelector('[data-price="'+id+'"]'); if(pr) pr.innerHTML=cardPriceHTML(product(id), mg);
  var vs=variantsFor(product(id)), sz=product(id).size;
  if(vs){ for(var i=0;i<vs.length;i++){ if(Math.abs(vs[i].mg-mg)<1e-6) sz=vs[i].size; } }
  var ls=card.querySelector('.vial-real .ls'); if(ls) ls.textContent=sz+" \u00b7 RUO";
}
/* reconstitution calculator + lot history (quick view) */
function reconHTML(p){
  var mg=mgOf(p)||10;
  return '<div class="qv-tool"><div class="qv-tool-head"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M9 3h6M10 3v5.5L5.2 17A2 2 0 0 0 7 20h10a2 2 0 0 0 1.8-3L14 8.5V3"/><path d="M7.5 14h9"/></svg>Reconstitution calculator</div>'+
    '<div class="recon-inputs">'+
      '<div class="recon-f"><label>Peptide in vial</label><div class="recon-field"><input id="reconMass" type="number" min="0" step="0.5" value="'+mg+'" inputmode="decimal"><span class="unit">mg</span></div></div>'+
      '<div class="recon-f"><label>Target concentration</label><div class="recon-field"><input id="reconConc" type="number" min="0" step="0.5" value="5" inputmode="decimal"><span class="unit">mg / mL</span></div></div>'+
    '</div>'+
    '<div class="recon-out"><div class="ro-l">Add this much <b>bacteriostatic water</b> to the vial</div><div class="ro-v" id="reconVol">2.00<small>mL diluent</small></div></div>'+
    '<p class="recon-note">Each 0.1 mL then contains <b id="reconPerUnit">0.50 mg</b>. Figures are for in-vitro measurement only \u2014 not a dosing recommendation.</p>'+
    '<div class="recon-stab" id="reconStab"></div></div>';
}
/* storage & stability guidance (per form) */
function storageFor(p){
  if(p.supply) return {ship:"Sealed multi-dose vial \u2014 24 months at 15\u201325 \u00b0C, protect from light", recon:"Once opened, 28 days at 2\u20138 \u00b0C", weeks:4};
  return {ship:"Lyophilized powder \u2014 24 months at \u221220 \u00b0C, desiccated & dark", recon:"Reconstituted, ~28 days at 2\u20138 \u00b0C", weeks:4};
}
function storageHTML(p){
  var s=storageFor(p);
  return '<div class="qv-storage"><div class="qv-tool-head"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M3 8h18M6 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3M5 8l1 12a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-12"/><path d="M9 12h6"/></svg>Storage &amp; stability</div>'+
    '<div class="stab-grid">'+
      '<div class="stab-c"><span>As shipped</span><b>'+s.ship+'</b></div>'+
      '<div class="stab-c"><span>After opening</span><b>'+s.recon+'</b></div>'+
    '</div>'+
    '<p class="stab-note">Minimize freeze\u2013thaw cycles \u2014 aliquot before freezing. Handling guidance for in-vitro research only.</p></div>';
}
/* ---- downloadable data pack: CoA + SDS + reconstitution sheet ---- */
function dlFile(name, content, type){
  var b=new Blob([content], {type:(type||"text/plain")+";charset=utf-8"});
  var u=URL.createObjectURL(b), a=document.createElement("a");
  a.href=u; a.download=name; document.body.appendChild(a); a.click();
  a.remove(); setTimeout(function(){ URL.revokeObjectURL(u); }, 1500);
}
function packName(p, suffix){ return "Elyria_"+(SLUGS[p.id]||p.id).toUpperCase().replace(/-/g,"")+"_"+suffix; }
function sdsText(p){
  var li=lotInfo(p), s=storageFor(p), today=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  var L=[];
  L.push("ELYRIA BIO \u2014 SAFETY DATA SHEET");
  L.push("Prepared per 29 CFR 1910.1200 (GHS) \u00b7 For research use only");
  L.push("Issued: "+today+"    Revision: 1.0");
  L.push("=".repeat(60));
  L.push("");
  L.push("SECTION 1 \u2014 IDENTIFICATION");
  L.push("  Product name .... "+p.name);
  L.push("  CAS number ...... "+String(p.cas).replace(/^CAS\s*/,""));
  L.push("  Catalog size .... "+p.size);
  L.push("  Lot ............. "+li.lot);
  L.push("  Recommended use . Laboratory research chemical. NOT for human or");
  L.push("                    veterinary use, food, or drug applications.");
  L.push("  Supplier ........ Elyria Bio \u00b7 elyriabio.com");
  L.push("");
  L.push("SECTION 2 \u2014 HAZARD IDENTIFICATION");
  L.push("  GHS classification: Not a hazardous substance or mixture under");
  L.push("  current criteria at intended research quantities. Handle as a");
  L.push("  substance of unknown toxicity.");
  L.push("  Precautionary: P262 Avoid contact with eyes, skin, clothing.");
  L.push("                 P270 Do not eat, drink or smoke when using.");
  L.push("                 P501 Dispose of contents/container per local regs.");
  L.push("");
  L.push("SECTION 3 \u2014 COMPOSITION / INFORMATION ON INGREDIENTS");
  L.push("  "+p.name+" \u2014 "+p.purity+" (RP-HPLC). "+(p.form||"lyophilized powder")+".");
  L.push("");
  L.push("SECTION 4 \u2014 FIRST-AID MEASURES");
  L.push("  Inhalation: Move to fresh air. Eyes/Skin: Rinse with water \u226515 min.");
  L.push("  Ingestion: Rinse mouth, do not induce vomiting, seek medical advice.");
  L.push("");
  L.push("SECTION 5 \u2014 FIRE-FIGHTING MEASURES");
  L.push("  Suitable media: water spray, CO2, dry chemical, alcohol-resistant foam.");
  L.push("");
  L.push("SECTION 6 \u2014 ACCIDENTAL RELEASE MEASURES");
  L.push("  Wear PPE. Sweep/collect without dust generation. Ventilate area.");
  L.push("");
  L.push("SECTION 7 \u2014 HANDLING AND STORAGE");
  L.push("  As shipped: "+s.ship+".");
  L.push("  After opening: "+s.recon+".");
  L.push("  Minimize freeze-thaw cycles; aliquot before freezing.");
  L.push("");
  L.push("SECTION 8 \u2014 EXPOSURE CONTROLS / PERSONAL PROTECTION");
  L.push("  Gloves, safety glasses, lab coat. Use in ventilated area.");
  L.push("");
  L.push("SECTION 9 \u2014 PHYSICAL AND CHEMICAL PROPERTIES");
  L.push("  Appearance: white to off-white "+(p.form||"lyophilized powder")+".");
  L.push("  Solubility: soluble in bacteriostatic/sterile water.");
  L.push("");
  L.push("SECTIONS 10-15 \u2014 STABILITY, TOXICOLOGY, ECOLOGY, DISPOSAL, TRANSPORT,");
  L.push("  REGULATORY: Stable under recommended storage. Toxicological data not");
  L.push("  fully characterized. Dispose per local/state/federal regulations. Not");
  L.push("  classified as dangerous goods for transport at research quantities.");
  L.push("");
  L.push("SECTION 16 \u2014 OTHER INFORMATION");
  L.push("  This SDS is provided for research-use-only material. Information is");
  L.push("  believed accurate but furnished without warranty. The user assumes all");
  L.push("  responsibility for safe handling.");
  L.push("");
  L.push("  \u00a9 "+new Date().getFullYear()+" Elyria Bio \u00b7 Research use only");
  return L.join("\n");
}
function reconSheetText(p){
  var mg=mgOf(p)||10, li=lotInfo(p), rows=[];
  [1,2,2.5,5,10].forEach(function(c){ var v=mg/c; rows.push("  "+String(c).padEnd(6)+" mg/mL   \u2192  add "+v.toFixed(2)+" mL water   (0.1 mL = "+(c*0.1).toFixed(2)+" mg)"); });
  return ["ELYRIA BIO \u2014 RECONSTITUTION SHEET",
    p.name+"  \u00b7  "+p.size+"  \u00b7  Lot "+li.lot,
    "=".repeat(56),"",
    "Vial content: "+mg+" mg lyophilized "+p.name+".",
    "Diluent: bacteriostatic or sterile water for injection.","",
    "TARGET CONCENTRATION      DILUENT TO ADD",
    "-".repeat(56)].concat(rows).concat(["",
    "Storage after reconstitution: ~28 days at 2-8 \u00b0C.",
    "Aliquot before freezing to minimize freeze-thaw cycles.","",
    "For in-vitro measurement only \u2014 not a dosing recommendation."]).join("\n");
}
function dataPackHTML(p){
  var li=lotInfo(p), s=storageFor(p), today=new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
  var cas=String(p.cas).replace(/^CAS\s*/,"");
  var row=function(k,v){ return '<tr><th>'+k+'</th><td>'+v+'</td></tr>'; };
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+p.name+' \u2014 Elyria Bio data pack</title>'+
    '<style>*{box-sizing:border-box}body{font:14px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#141210;background:#f4f1ea;margin:0;padding:40px}'+
    '.doc{max-width:760px;margin:0 auto;background:#fff;border:1px solid #e3ddce;border-radius:12px;padding:44px 48px;box-shadow:0 10px 40px -20px rgba(0,0,0,.3)}'+
    'h1{font-size:26px;margin:0 0 2px;letter-spacing:-.01em}h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#9c7a2b;margin:34px 0 12px;border-bottom:1px solid #e3ddce;padding-bottom:7px}'+
    '.sub{color:#6b6355;font-size:13px;margin:0 0 4px}.brand{display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid #141210;padding-bottom:14px}'+
    '.brand .n{font-weight:700;letter-spacing:.2em;font-size:13px;text-transform:uppercase}table{width:100%;border-collapse:collapse;font-size:13.5px}'+
    'th{text-align:left;color:#6b6355;font-weight:500;padding:7px 14px 7px 0;width:210px;vertical-align:top}td{padding:7px 0;font-weight:600}'+
    '.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.pass{color:#1c7a3f;font-weight:700}pre{background:#f4f1ea;border:1px solid #e3ddce;border-radius:8px;padding:16px 18px;font-size:12.5px;line-height:1.55;white-space:pre-wrap;overflow:auto}'+
    '.foot{margin-top:38px;padding-top:16px;border-top:1px solid #e3ddce;font-size:11.5px;color:#8a8272;line-height:1.6}@media print{body{background:#fff;padding:0}.doc{border:none;box-shadow:none}}</style></head><body><div class="doc">'+
    '<div class="brand"><span class="n">Elyria Bio</span><span class="sub">Research data pack \u00b7 '+today+'</span></div>'+
    '<h1>'+p.name+'</h1><p class="sub">'+p.cas+' \u00b7 '+p.size+' \u00b7 '+(p.form||"lyophilized powder")+'</p>'+
    '<h2>Certificate of analysis</h2><table>'+
      row("Lot number", '<span class="mono">'+li.lot+'</span>')+row("Date of analysis", li.assay)+row("Retest date", li.exp)+
      row("Appearance", "White to off-white powder \u2014 conforms")+
      row("RP-HPLC purity", '<span class="pass">'+p.purity+'</span> (spec \u2265 98.0%)')+
      row("Identity (ESI-MS)", (p.identity||"Confirmed")+' <span class="pass">\u2014 conforms</span>')+
      row("Endotoxin (LAL)", p.endo)+row("Method", "RP-HPLC / ESI-MS \u00b7 third-party verified")+
    '</table>'+
    '<h2>Storage &amp; stability</h2><table>'+row("As shipped", s.ship)+row("After opening", s.recon)+row("Handling", "Minimize freeze\u2013thaw cycles; aliquot before freezing")+'</table>'+
    '<h2>Reconstitution sheet</h2><pre>'+escapeHtml(reconSheetText(p))+'</pre>'+
    '<h2>Safety data sheet</h2><pre>'+escapeHtml(sdsText(p))+'</pre>'+
    '<div class="foot">For research use only \u2014 not for human or veterinary use, food, or drug applications. Data believed accurate and furnished without warranty; the user assumes all responsibility for safe handling. \u00a9 '+new Date().getFullYear()+' Elyria Bio \u00b7 elyriabio.com</div>'+
    '</div></body></html>';
}
function downloadSDS(id){ var p=product(id); if(p) dlFile(packName(p,"SDS.txt"), sdsText(p)); }
function downloadPack(id){ var p=product(id); if(p) dlFile(packName(p,"data_pack.html"), dataPackHTML(p), "text/html"); }
function lotHistHTML(p){
  var base=lotInfo(p), curPur=parseFloat(p.purity)||99.3, h=hashStr(p.id+"hist"), letters="FEDCBA", rows=[];
  for(var i=0;i<3;i++){
    var lot = i===0 ? base.lot : "LMB-26"+letters[(h+i)%6]+"-"+(100+((h*(i+7))%900));
    var pur = i===0 ? p.purity : (Math.max(99.0, curPur-((h>>(i*2))%3)*0.1-i*0.1)).toFixed(1)+"%";
    var dt = new Date(Date.now()-((h%90)+70*i)*864e5);
    var ds = dt.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"2-digit"});
    rows.push({lot:lot,pur:pur,date:ds,cur:i===0});
  }
  var trs=rows.map(function(r){ return '<tr class="'+(r.cur?"cur":"")+'"><td>'+r.lot+(r.cur?' <span class="lh-pill">CURRENT</span>':'')+'</td><td class="lh-pur">'+r.pur+'</td><td>'+r.date+'</td><td class="lh-st">'+(r.cur?"Released":"Archived")+'</td></tr>'; }).join("");
  return '<div class="lot-hist"><div class="lot-hist-head"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/></svg>Lot history \u00b7 RP-HPLC</div>'+
    '<table class="lot-table"><thead><tr><th>Lot</th><th>Purity</th><th>Assayed</th><th>Status</th></tr></thead><tbody>'+trs+'</tbody></table></div>';
}
/* inline COA preview (no modal roundtrip) */
function inlineCOAHTML(p){
  var li=lotInfo(p);
  return hplcSVG(p)+
    '<div class="coa-inline-specs">'+
      '<div class="cis"><span>RP-HPLC</span><b>'+p.purity+'</b></div>'+
      '<div class="cis"><span>Identity</span><b>'+p.identity+'</b></div>'+
      '<div class="cis"><span>Endotoxin</span><b>'+p.endo+'</b></div>'+
      '<div class="cis"><span>Lot</span><b>'+li.lot+'</b></div>'+
    '</div>'+
    '<div class="coa-inline-foot"><span class="mono">Assayed '+li.assay+' \u00b7 third-party</span><span class="cif-links"><button class="coa-inline-sds" data-pack="'+p.id+'">Data pack</button><button class="coa-inline-full" data-coa="'+p.id+'">Full certificate \u2192</button></span></div>';
}
function toggleInlineCOA(id, btn){
  var panel=grid.querySelector('[data-coainline="'+id+'"]'); if(!panel) return;
  if(panel.hidden){
    if(!panel.getAttribute("data-built")){ panel.innerHTML=inlineCOAHTML(product(id)); panel.setAttribute("data-built","1"); }
    panel.hidden=false; btn.setAttribute("aria-expanded","true");
    requestAnimationFrame(function(){ panel.classList.add("open"); });
  } else {
    panel.classList.remove("open"); btn.setAttribute("aria-expanded","false");
    setTimeout(function(){ panel.hidden=true; }, 300);
  }
}
/* FLIP — animate grid reflow on filter/sort changes */
function withFlip(mutate){
  if(reduce || !grid){ mutate(); return; }
  var vis=cards.filter(function(c){ return !c.classList.contains("hidden"); });
  var first={}; vis.forEach(function(c){ first[c.dataset.id]=c.getBoundingClientRect(); });
  mutate();
  cards.forEach(function(c){
    if(c.classList.contains("hidden")) return;
    var f=first[c.dataset.id]; if(!f) return;
    var l=c.getBoundingClientRect(), dx=f.left-l.left, dy=f.top-l.top;
    if(!dx && !dy) return;
    c.style.transition="none"; c.style.transform="translate("+dx+"px,"+dy+"px)";
    requestAnimationFrame(function(){ c.style.transition="transform .44s cubic-bezier(.2,.8,.2,1)"; c.style.transform=""; });
    var clear=function(){ c.style.transition=""; c.style.transform=""; c.removeEventListener("transitionend", clear); };
    c.addEventListener("transitionend", clear);
  });
}

/* ===================== STATE ===================== */
var cart = load("elyria_cart", {});
var favs = load("elyria_favs", {});
var recent = load("elyria_recent", []);
var appliedCode = load("elyria_promo", "");
var compare = load("elyria_compare", []);
if(!Array.isArray(compare)) compare = [];
/* drop any persisted ids no longer in the catalog (e.g. discontinued products) */
Object.keys(cart).forEach(function(id){ if(!keyProduct(id)) delete cart[id]; });
Object.keys(favs).forEach(function(id){ if(!product(id)) delete favs[id]; });
recent = recent.filter(function(id){ return product(id); });
compare = compare.filter(function(id){ return product(id); });
save("elyria_cart", cart); save("elyria_favs", favs); save("elyria_recent", recent); save("elyria_compare", compare);
var cardQty = {}, cardSize = {};
PRODUCTS.forEach(function(p){ cardQty[p.id]=1; cardSize[p.id]=mgOf(p); });

var FREE_SHIP = 150, SHIP_COST = 12;
var CODES = { "ELYRIA10":{type:"pct",val:.10,label:"ELYRIA10 · 10% off"},
              "WELCOME15":{type:"pct",val:.15,label:"WELCOME15 · 15% off"},
              "FREESHIP":{type:"ship",val:0,label:"FREESHIP · free shipping"} };

/* ===================== RENDER HELPERS ===================== */
function vialHTML(p, sizeLabel){
  var label = '<div class="vial-real">'+
      '<div class="vr-cap"></div>'+
      '<div class="vr-neck"></div>'+
      '<div class="vr-body">'+
        '<div class="vr-gloss"></div>'+
        '<div class="vr-powder"></div>'+
        '<div class="vr-label"><span class="ln">'+p.name+'</span><span class="ls">'+(sizeLabel||p.size)+' · RUO</span><span class="laccent"></span></div>'+
      '</div>'+
    '</div>';
  var photo = p.photo ? '<img class="photo" src="'+p.photo+'" alt="'+p.name+'" loading="lazy" decoding="async" width="672" height="1008" onerror="this.remove()" />' : '';
  return '<div class="vshot"><div class="vshot-fx" aria-hidden="true"></div>'+label+photo+'</div>';
}
function sparkHTML(p){
  var seed=hashStr(p.id+"spark"); function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  var W=200,H=30,base=H-4,left=2,right=W-2,span=right-left,maxH=base-4;
  var peaks=[{c:0.16,h:0.045+rnd()*0.04,w:5},{c:0.30,h:0.06+rnd()*0.05,w:5},{c:0.58,h:1.0,w:7},{c:0.74,h:0.05+rnd()*0.04,w:6}];
  var d="",x,fx,y,k,pk,dx,py;
  for(x=left;x<=right;x++){ fx=(x-left)/span; y=0; for(k=0;k<peaks.length;k++){ pk=peaks[k]; dx=(fx-pk.c)*span; y+=pk.h*Math.exp(-(dx*dx)/(2*pk.w*pk.w)); } py=base-Math.min(1.02,y)*maxH; d+=(x===left?"M":"L")+x+" "+py.toFixed(1)+" "; }
  return '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" fill="none">'+
    '<line x1="'+left+'" y1="'+base+'" x2="'+right+'" y2="'+base+'" stroke="rgba(231,192,106,.22)" stroke-width="1" vector-effect="non-scaling-stroke"/>'+
    '<path d="'+d+'" stroke="#e7c06a" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
}
var STAR = "M12 2.6l2.6 5.8 6.3.6-4.7 4.2 1.4 6.2L12 16.9 6.4 19.4l1.4-6.2L3 9l6.3-.6z";
function dotsBg(p){
  var seed=hashStr(p.id+"dots"); function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  var e="", cols=11, rows=8, sp=18;
  for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
    var x=10+c*sp, y=10+r*sp, v=rnd();
    if(v>0.955) e+="<circle cx='"+x+"' cy='"+y+"' r='1.6' fill='#e7c06a' fill-opacity='.42'/>";
    else if(v>0.885) e+="<circle cx='"+x+"' cy='"+y+"' r='1.1' fill='#e7c06a' fill-opacity='.2'/>";
    else e+="<circle cx='"+x+"' cy='"+y+"' r='.8' fill='#e7c06a' fill-opacity='.08'/>";
  }
  var svg="<svg xmlns='http://www.w3.org/2000/svg' width='200' height='150' viewBox='0 0 200 150'>"+e+"</svg>";
  return "url('data:image/svg+xml,"+encodeURIComponent(svg).replace(/'/g,"%27")+"')";
}
function starsHTML(rating){
  var s = '<span class="stars" aria-hidden="true">';
  for(var i=1;i<=5;i++){
    var cls = rating>=i ? "sfull" : (rating>=i-0.5 ? "shalf" : "sempty");
    s += '<svg viewBox="0 0 24 24"><path class="'+cls+'" d="'+STAR+'"/></svg>';
  }
  return s+'</span>';
}
function badgeHTML(p){
  var b = "";
  if(p.badge==="new") b += '<span class="badge new">New lot</span>';
  if(p.compareAt && p.compareAt>p.price){
    var off = Math.round((1-p.price/p.compareAt)*100);
    b += '<span class="badge sale">Save '+off+'%</span>';
  }
  return b;
}
function priceHTML(p){
  var h = '<span class="price">'+fmt(p.price)+'</span>';
  if(p.compareAt && p.compareAt>p.price) h += '<span class="price-compare">'+fmt(p.compareAt)+'</span>';
  h += '<span class="price-size">/ '+p.size+'</span>';
  var mgv = parseFloat(p.size);
  if(!p.supply && /mg\b/i.test(p.size) && mgv>0) h += '<span class="price-permg">'+fmt(p.price/mgv)+' / mg</span>';
  return h;
}

/* ===================== RENDER GRID ===================== */
var grid = document.getElementById("grid");
var COMING_SOON = {tirz:1, ipa:1, nad:1, mt1:1, mt2:1, aod:1, pt141:1, amino1mq:1, kiss:1, epi:1, semax:1, selank:1, dsip:1, gluta:1, ta1:1, snap8:1, glow:1, igf1lr3:1, cjcipa:1, kpv:1, wolverine:1, cagri:1};
function buildCard(p){
  var card = document.createElement("article");
  card.className = "card rv";
  card.setAttribute("data-cat", p.cat);
  card.setAttribute("data-id", p.id);
  var stockCls = p.stock==="low" ? "stock low" : "stock";
  var stockTxt = p.stock==="low" ? "Low stock" : "In stock";
  card.innerHTML =
      '<div class="card-vis'+(COMING_SOON[p.id]?' cs-vis':'')+'">'+
        '<div class="card-badges">'+badgeHTML(p)+'</div>'+
        '<button class="card-fav'+(favs[p.id]?" on":"")+'" data-fav="'+p.id+'" aria-label="Save '+p.name+'"><svg viewBox="0 0 24 24" stroke-width="1.7"><path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/></svg></button>'+
        '<button class="card-cmp'+(compare.indexOf(p.id)>-1?" on":"")+'" data-cmp="'+p.id+'" aria-label="Compare '+p.name+'" title="Add to compare"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12"/></svg></button>'+
        (COMING_SOON[p.id] ? '<div class="cs-wrap">'+vialHTML(p)+'<div class="cs-overlay"><strong>Coming Soon</strong></div></div>' : vialHTML(p))+
        '<button class="qv-trigger" data-qv="'+p.id+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>Quick view</button>'+
      (p.supply?'':'<div class="card-analytics" title="Current lot analytics"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/><path d="M9 12l2 2 4-4"/></svg><div class="ca-meta"><span class="ca-pur">'+p.purity+' HPLC</span><span class="ca-lot">Lot '+lotInfo(p).lot+' · verified</span></div></div>')+
    '</div>'+
    '<div class="card-body">'+
      '<div class="card-dots" aria-hidden="true" style="background-image:'+dotsBg(p)+'"></div>'+
      '<div class="card-top"><span class="card-cat">'+p.cat+'</span><span class="card-purity">'+(p.supply?'USP grade':p.purity+' HPLC')+'</span></div>'+
      '<a class="card-name" href="'+purl(p.id)+'">'+p.name+'</a>'+
      '<div class="card-cas">'+p.cas+'</div>'+
      '<div class="card-prov mono"><span>LOT '+lotInfo(p).lot+'</span><span class="cp-dot"></span><span>'+(p.supply?'0.9% benzyl alcohol':p.purity+' RP-HPLC')+'</span></div>'+
      '<p class="card-desc">'+p.desc+'</p>'+
      '<div class="card-foot">'+
        sizeSelHTML(p)+
        '<div class="card-priceline"><div class="card-price'+(COMING_SOON[p.id]?' cs-price':'')+' " data-price="'+p.id+'">'+cardPriceHTML(p, cardSize[p.id])+'</div><span class="'+stockCls+'"><span class="sdot"></span>'+stockTxt+'</span></div>'+
        (p.supply?'':'<button class="card-coa" data-coatoggle="'+p.id+'" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 13l2 2 4-4"/></svg>View certificate of analysis</button><div class="coa-inline" data-coainline="'+p.id+'" hidden></div>')+
      '</div>'+
    '</div>'+
    '<div class="card-actions">'+
      '<p class="card-vol-hint">Click product card to view Volume discounts</p>'+
      '<button class="add-btn" data-add="'+p.id+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 5v14M5 12h14"/></svg>Add to cart</button>'+
    '</div>';
  /* Make entire card clickable — navigate to product page */
  card.style.cursor = "pointer";
  card.addEventListener("click", function(e){
    if(e.target.closest(".card-fav,.card-cmp,.qv-trigger,.card-actions,.card-coa,.card-analytics,.coa-inline,.add-btn")) return;
    location.href = purl(p.id);
  });
  return card;
}
/* Sort: available products first, coming-soon last */
var _sorted = PRODUCTS.slice().sort(function(a,b){ return (COMING_SOON[a.id]?1:0)-(COMING_SOON[b.id]?1:0); });
_sorted.forEach(function(p){ grid.appendChild(buildCard(p)); });
var cards = Array.prototype.slice.call(document.querySelectorAll(".card"));
/* Force .in on all cards immediately so opacity:0 (.rv) doesn't hide them
   before the IntersectionObserver has a chance to fire */
cards.forEach(function(c){ c.classList.add("in"); });
var ORIGINAL_ORDER = cards.slice();

/* ---- vitrine tilt + follow-glow ---- */
(function(){
  var tiltCard=null;
  grid.addEventListener("pointermove", function(e){
    if(!finePointer || reduce) return;
    var card=e.target.closest(".card");
    if(card!==tiltCard){
      if(tiltCard){ tiltCard.style.transform=""; tiltCard.style.transition=""; }
      tiltCard=card;
      if(card) card.style.transition="transform .12s ease-out";
    }
    if(!card) return;
    var r=card.getBoundingClientRect();
    var px=(e.clientX-r.left)/r.width, py=(e.clientY-r.top)/r.height;
    card.style.setProperty("--mx",(px*100).toFixed(1)+"%");
    card.style.setProperty("--my",(py*100).toFixed(1)+"%");
    var ry=(px-0.5)*8, rx=-(py-0.5)*8;
    card.style.transform="translateY(-5px) rotateX("+rx.toFixed(2)+"deg) rotateY("+ry.toFixed(2)+"deg)";
  });
  grid.addEventListener("pointerleave", function(){
    if(tiltCard){ tiltCard.style.transform=""; tiltCard.style.transition=""; tiltCard=null; }
  });
})();

/* ===================== GRID EVENTS (delegated) ===================== */
grid.addEventListener("click", function(e){
  var packBtn = e.target.closest("[data-packqty]");
  if(packBtn){
    var pid = packBtn.getAttribute("data-id");
    var qty = parseInt(packBtn.getAttribute("data-packqty"), 10);
    cardQty[pid] = qty;
    // update active state on buttons
    var sel = grid.querySelector('[data-packsel="'+pid+'"]');
    if(sel) sel.querySelectorAll('.pack-btn').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-packqty')==String(qty)); });
    // update price display to show discounted price
    var pr = grid.querySelector('[data-price="'+pid+'"]');
    if(pr){
      var p2 = product(pid);
      var rate = volumeRate(qty);
      if(rate > 0){
        var discPrice = p2.price * (1 - rate);
        pr.innerHTML = '<span class="price">'+fmt(discPrice)+'</span><span class="price-compare">'+fmt(p2.price)+'</span><span class="price-size">/ '+p2.size+' · '+qty+'×</span>';
      } else {
        pr.innerHTML = cardPriceHTML(p2, cardSize[pid]);
      }
    }
    return;
  }
  var step = e.target.closest("[data-step]");
  if(step){
    var id = step.getAttribute("data-id");
    cardQty[id] = Math.max(1, cardQty[id] + parseInt(step.getAttribute("data-step"),10));
    grid.querySelector('[data-qty="'+id+'"]').textContent = cardQty[id];
    return;
  }
  var sizeBtn = e.target.closest("[data-size]");
  if(sizeBtn){ selectCardSize(sizeBtn.getAttribute("data-id"), parseFloat(sizeBtn.getAttribute("data-size"))); return; }
  var add = e.target.closest("[data-add]");
  if(add){ var aid=add.getAttribute("data-add"); addToCart(makeKey(aid, cardSize[aid]), cardQty[aid], add); return; }
  var fav = e.target.closest("[data-fav]");
  if(fav){ toggleFav(fav.getAttribute("data-fav"), fav); return; }
  var cmpBtn = e.target.closest("[data-cmp]");
  if(cmpBtn){ toggleCompare(cmpBtn.getAttribute("data-cmp")); return; }
  var qv = e.target.closest("[data-qv]");
  if(qv){ openQuick(qv.getAttribute("data-qv")); return; }
  var coaTog = e.target.closest("[data-coatoggle]");
  if(coaTog){ toggleInlineCOA(coaTog.getAttribute("data-coatoggle"), coaTog); return; }
  var packBtn = e.target.closest("[data-pack]");
  if(packBtn){ downloadPack(packBtn.getAttribute("data-pack")); return; }
  var sdsBtn = e.target.closest("[data-sds]");
  if(sdsBtn){ downloadSDS(sdsBtn.getAttribute("data-sds")); return; }
  var coaT = e.target.closest("[data-coa]");
  if(coaT){ openCOA(coaT.getAttribute("data-coa")); return; }
});

function toggleFav(id, btn){
  if(favs[id]) delete favs[id]; else favs[id]=1;
  save("elyria_favs", favs);
  document.querySelectorAll('[data-fav="'+id+'"]').forEach(function(b){ b.classList.toggle("on", !!favs[id]); });
}

/* ===================== CART ===================== */
function addToCart(id, qty, btn){
  qty = qty||1;
  cart[id] = (cart[id]||0) + qty;
  save("elyria_cart", cart);
  renderCart(); pulseCart();
  if(btn){
    var orig = btn.innerHTML;
    btn.classList.add("added");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg>Added';
    setTimeout(function(){ btn.classList.remove("added"); btn.innerHTML = orig; }, 1100);
  }
  if(!load("elyria_seen_cart",0)){ save("elyria_seen_cart",1); setTimeout(openCart, 280); }
  else showAddToast(id, qty);
}
function setQty(id, qty){
  if(qty<=0) delete cart[id]; else cart[id]=qty;
  save("elyria_cart", cart);
  renderCart();
}
function removeItem(id){ delete cart[id]; save("elyria_cart", cart); renderCart(); }

var cartCount = document.getElementById("cartCount");
var drawerItems = document.getElementById("drawerItems");
var drawerFoot = document.getElementById("drawerFoot");
var drawerSub = document.getElementById("drawerSub");
var shipMeter = document.getElementById("shipMeter");
var smFill = document.getElementById("smFill");
var smLabel = document.getElementById("smLabel");
var checkoutBtn = document.getElementById("checkoutBtn");
var ruoAck = document.getElementById("ruoAck");
var sumSubtotal = document.getElementById("sumSubtotal");
var sumDiscountRow = document.getElementById("sumDiscountRow");
var sumDiscount = document.getElementById("sumDiscount");
var sumDiscountLabel = document.getElementById("sumDiscountLabel");
var sumShipping = document.getElementById("sumShipping");
var sumTotal = document.getElementById("sumTotal");

/* Multi-vial volume pricing — applied automatically per line item.
   Buy 3+ of a material → 15% off that line; 5+ → 25% off. Scales site-wide. */
function volumeRate(q){ return q>=5 ? 0.25 : (q>=3 ? 0.15 : 0); }
function computeTotals(){
  var ids = Object.keys(cart), count=0, subtotal=0, volume=0;
  ids.forEach(function(key){ var kp=keyProduct(key); if(!kp)return; var q=cart[key]; count+=q; var line=kp.price*q; subtotal+=line; volume+=line*volumeRate(q); });
  var code = CODES[appliedCode], promoDisc=0, shipFree=false;
  if(code){
    if(code.type==="pct") promoDisc = (subtotal-volume)*code.val;
    if(code.type==="ship") shipFree = true;
  }
  var discount = volume + promoDisc;
  var afterDisc = subtotal - discount;
  var shipping = (subtotal===0) ? 0 : ((afterDisc>=FREE_SHIP || shipFree) ? 0 : SHIP_COST);
  return {ids:ids,count:count,subtotal:subtotal,discount:discount,volume:volume,promoDisc:promoDisc,shipping:shipping,total:afterDisc+shipping};
}

function renderCart(){
  var t = computeTotals();
  // nav badge
  var prev = cartCount.textContent;
  cartCount.textContent = t.count;
  if(prev !== String(t.count)){ cartCount.classList.remove("bump"); void cartCount.offsetWidth; cartCount.classList.add("bump"); }

  if(t.ids.length===0){
    shipMeter.style.display="none";
    drawerFoot.style.display="none";
    drawerItems.innerHTML =
      '<div class="cart-empty">'+
        '<div class="ec"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M3 4h2l2.5 12.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="17.5" cy="20" r="1.2"/></svg></div>'+
        '<h4>Your cart is empty</h4>'+
        '<p>Add research materials from the catalog to begin an order.</p>'+
        '<button class="btn btn-ghost" data-closecart>Browse the catalog</button>'+
      '</div>';
    drawerSub.textContent = "Empty";
    return;
  }
  shipMeter.style.display="";
  drawerFoot.style.display="";

  // ship meter
  var remain = Math.max(0, FREE_SHIP - (t.subtotal - t.discount));
  var pct = Math.min(100, ((t.subtotal - t.discount)/FREE_SHIP)*100);
  smFill.style.width = pct+"%";
  if(t.shipping===0){ smLabel.classList.add("unlocked"); smLabel.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4 10-10"/></svg>Free shipping unlocked'; }
  else { smLabel.classList.remove("unlocked"); smLabel.innerHTML = 'Add <b>'+fmt(remain)+'</b> for free shipping'; }

  // line items
  var html = "";
  t.ids.forEach(function(key){
    var kp = keyProduct(key), p = kp.p, q = cart[key], price = kp.price;
    var was = (!splitKey(key).mg && p.compareAt && p.compareAt>p.price) ? '<span class="was">'+fmt(p.compareAt*q)+'</span>' : '';
    html +=
      '<div class="line-item">'+
        '<div class="li-thumb">'+vialHTML(p, kp.size)+'</div>'+
        '<div class="li-info">'+
          '<div class="nm">'+p.name+'</div>'+
          '<div class="meta">'+(p.supply?'USP':p.purity)+' · '+kp.size+'</div>'+
          '<div class="li-controls">'+
            '<div class="li-stepper">'+
              '<button type="button" data-dstep="-1" data-id="'+key+'" aria-label="Decrease">−</button>'+
              '<span class="q mono">'+q+'</span>'+
              '<button type="button" data-dstep="1" data-id="'+key+'" aria-label="Increase">+</button>'+
            '</div>'+
            '<button class="li-remove" data-remove="'+key+'">Remove</button>'+
          '</div>'+
        '</div>'+
        '<div class="li-price"><span class="now">'+fmt(price*q)+'</span>'+was+'</div>'+
      '</div>';
  });
  drawerItems.innerHTML = html;
  drawerSub.textContent = t.count + (t.count===1?" item":" items");

  // summary
  sumSubtotal.textContent = fmt(t.subtotal);
  if(t.discount>0){ sumDiscountRow.hidden=false; sumDiscount.textContent = "−"+fmt(t.discount); sumDiscountLabel.textContent = t.volume>0 ? (t.promoDisc>0 ? "Volume + promo savings" : "Volume discount · 3+ vials") : (CODES[appliedCode]?CODES[appliedCode].label:"Discount"); }
  else sumDiscountRow.hidden=true;
  sumShipping.textContent = t.shipping===0 ? "Free" : fmt(t.shipping);
  sumTotal.textContent = fmt(t.total);

  checkoutBtn.disabled = !ruoAck.checked;
}

drawerItems.addEventListener("click", function(e){
  var ds = e.target.closest("[data-dstep]");
  if(ds){ var id=ds.getAttribute("data-id"); setQty(id, cart[id]+parseInt(ds.getAttribute("data-dstep"),10)); return; }
  var rm = e.target.closest("[data-remove]");
  if(rm){ removeItem(rm.getAttribute("data-remove")); return; }
  var cc = e.target.closest("[data-closecart]");
  if(cc){ closeCart(); scrollToEl(document.getElementById("catalog")); }
});
ruoAck.addEventListener("change", function(){ checkoutBtn.disabled = !(Object.keys(cart).length>0 && ruoAck.checked); });
/* ---------- warm, randomized order thank-you ---------- */
var MEMBER_THANKS = [
  "As a small business, we genuinely appreciate you giving us the opportunity to earn your business. We look forward to serving you again in the near future!",
  "Thank you for choosing us \u2014 it truly means a lot. Every order helps our small team keep doing what we love, and we can\u2019t wait to serve you again.",
  "From our bench to yours: thank you. We\u2019re a small operation, and your trust is the whole reason we get to do this. We look forward to serving you again soon.",
  "We don\u2019t take a single order for granted. Thank you for the opportunity to earn your business \u2014 we\u2019ll be right here whenever you need us next.",
  "You just made our day. As a small business, every order matters more than you know, and we\u2019re honored you chose us. See you again soon!",
  "Thank you, truly. Supporting a small team like ours never goes unnoticed \u2014 and we\u2019re committed to earning your business again next time."
];
function showThankYou(t, oid, mode){
  var bd=document.getElementById("thanksBackdrop");
  if(!bd){
    bd=document.createElement("div"); bd.className="thanks-backdrop"; bd.id="thanksBackdrop";
    var md=document.createElement("div"); md.className="thanks-modal"; md.id="thanksModal";
    md.setAttribute("role","dialog"); md.setAttribute("aria-modal","true"); md.setAttribute("aria-label","Order received");
    md.innerHTML='<div class="thanks-card">'+
      '<div class="thanks-spark"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M12 21s-7-4.5-9.5-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg></div>'+
      '<div class="thanks-kicker">Order received</div>'+
      '<h2>Thank you, truly.</h2>'+
      '<p class="thanks-msg" id="thanksMsg"></p>'+
      '<div class="thanks-order" id="thanksOrder"></div>'+
      '<div class="thanks-sum" id="thanksSum"></div>'+
      '<div class="thanks-acts"><button class="btn btn-solid magnetic" id="thanksClose">Continue</button><a class="btn btn-ghost magnetic" href="account.html#orders">View in account</a></div>'+
      '<p class="thanks-foot">A confirmation is on its way to your inbox. All orders are supplied strictly for Research Use Only.</p></div>';
    document.body.appendChild(bd); document.body.appendChild(md);
    function closeThanks(){ md.classList.remove("open"); bd.classList.remove("open"); document.body.classList.remove("lock"); }
    bd.addEventListener("click", closeThanks);
    md.addEventListener("click", function(e){ if(e.target.id==="thanksClose") closeThanks(); });
    document.addEventListener("keydown", function(e){ if(e.key==="Escape" && md.classList.contains("open")) closeThanks(); });
  }
  var tkKick=document.querySelector("#thanksModal .thanks-kicker");
  var tkH2=document.querySelector("#thanksModal h2");
  var tkFoot=document.querySelector("#thanksModal .thanks-foot");
  if(mode==="proof"){
    tkKick.textContent="Payment proof received";
    tkH2.textContent="We\u2019re on it.";
    document.getElementById("thanksMsg").textContent="Your proof is in the verification queue \u2014 most payments confirm within a few hours. The moment it clears, your order moves to Confirmed and we pack it for shipment.";
    tkFoot.textContent="Track verification anytime from your account. All orders are supplied strictly for Research Use Only.";
  } else if(mode==="later"){
    tkKick.textContent="Order saved";
    tkH2.textContent="One step left.";
    document.getElementById("thanksMsg").textContent="Your order is reserved and waiting on payment. Head to your account whenever you\u2019re ready \u2014 we verify proof of payment and ship as soon as it clears.";
    tkFoot.textContent="Complete payment from Account \u2192 Orders. All orders are supplied strictly for Research Use Only.";
  } else {
    tkKick.textContent="Order received";
    tkH2.textContent="Thank you, truly.";
    document.getElementById("thanksMsg").textContent = MEMBER_THANKS[Math.floor(Math.random()*MEMBER_THANKS.length)];
    tkFoot.textContent="A confirmation is on its way to your inbox. All orders are supplied strictly for Research Use Only.";
  }
  var ordEl=document.getElementById("thanksOrder");
  if(ordEl){ ordEl.innerHTML = oid ? 'Order <b>'+oid+'</b>' : ''; ordEl.style.display = oid?'':'none'; }
  document.getElementById("thanksSum").innerHTML = t.count+(t.count===1?" vial":" vials")+' &middot; <b>'+fmt(t.total)+'</b>';
  document.getElementById("thanksBackdrop").classList.add("open");
  document.getElementById("thanksModal").classList.add("open");
  document.body.classList.add("lock");
}
/* ---------- checkout overlay ---------- */
(function injectCheckoutCSS(){
  var s=document.createElement("style");
  s.textContent=[
    ".co-backdrop{position:fixed;inset:0;z-index:4200;background:rgba(6,5,4,.74);backdrop-filter:blur(6px);opacity:0;pointer-events:none;transition:opacity .2s}",
    ".co-backdrop.open{opacity:1;pointer-events:auto}",
    ".co-modal{position:fixed;z-index:4201;right:0;top:0;height:100dvh;width:min(560px,100vw);background:var(--ink,#0d0b09);border-left:1px solid rgba(231,192,106,.18);box-shadow:-30px 0 80px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .32s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;overflow:hidden}",
    ".co-modal.open{transform:none}",
    ".co-head{display:flex;align-items:center;justify-content:space-between;padding:22px 26px;border-bottom:1px solid rgba(255,255,255,.07);flex:none}",
    ".co-head h3{margin:0;font-size:19px;color:var(--paper,#f4efe6);font-weight:500;letter-spacing:.01em}",
    ".co-head .co-step{font-size:12px;color:#8a8375;font-family:'IBM Plex Mono',monospace}",
    ".co-x{background:none;border:none;color:#8a8375;cursor:pointer;width:34px;height:34px;border-radius:8px;display:grid;place-items:center}",
    ".co-x:hover{background:rgba(255,255,255,.06);color:#f4efe6}",
    ".co-body{flex:1;overflow-y:auto;padding:24px 26px}",
    ".co-sec{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#e7c06a;margin:6px 0 14px;font-weight:600}",
    ".co-sec:not(:first-child){margin-top:30px}",
    ".co-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}",
    ".co-f{display:flex;flex-direction:column;gap:7px}.co-f.full{grid-column:1/-1}",
    ".co-f label{font-size:12.5px;color:#8a8375}",
    ".co-f input{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px 13px;color:var(--paper,#f4efe6);font-size:14.5px;font-family:inherit;outline:none;transition:border-color .16s}",
    ".co-f input:focus{border-color:rgba(231,192,106,.5)}",
    ".co-f input:invalid:not(:placeholder-shown){border-color:rgba(220,120,90,.5)}",
    ".co-ship{display:flex;flex-direction:column;gap:10px}",
    ".co-opt{display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:15px 16px;cursor:pointer;transition:border-color .16s,background .16s}",
    ".co-opt.on{border-color:rgba(231,192,106,.5);background:rgba(231,192,106,.05)}",
    ".co-opt .dot{width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,255,255,.25);flex:none;position:relative}",
    ".co-opt.on .dot{border-color:#e7c06a}.co-opt.on .dot::after{content:'';position:absolute;inset:3px;border-radius:50%;background:#e7c06a}",
    ".co-opt .ot{flex:1}.co-opt .ot b{display:block;color:var(--paper,#f4efe6);font-size:14.5px;font-weight:500}.co-opt .ot span{font-size:12.5px;color:#8a8375}",
    ".co-opt .op{font-family:'IBM Plex Mono',monospace;color:#e7c06a;font-size:14px}",
    ".co-items{border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden}",
    ".co-item{display:flex;justify-content:space-between;padding:12px 15px;border-bottom:1px solid rgba(255,255,255,.06);font-size:13.5px;color:var(--paper,#f4efe6)}",
    ".co-item:last-child{border-bottom:none}.co-item .ci-q{color:#8a8375;font-family:'IBM Plex Mono',monospace}",
    ".co-item .ci-p{font-family:'IBM Plex Mono',monospace}",
    ".co-foot{flex:none;border-top:1px solid rgba(255,255,255,.07);padding:18px 26px 22px;background:var(--ink,#0d0b09)}",
    ".co-tot{display:flex;justify-content:space-between;padding:5px 0;font-size:13.5px;color:#8a8375}",
    ".co-tot.grand{color:var(--paper,#f4efe6);font-size:18px;font-weight:600;padding-top:12px;margin-top:6px;border-top:1px solid rgba(255,255,255,.08)}",
    ".co-tot.grand b{font-family:'IBM Plex Mono',monospace}",
    ".co-place{width:100%;margin-top:14px;height:52px;border:none;border-radius:26px;background:linear-gradient(180deg,#f0d488,#d8a94a);color:#241a06;font-size:15.5px;font-weight:600;cursor:pointer;letter-spacing:.01em;transition:filter .16s,transform .1s;font-family:inherit}",
    ".co-place:hover{filter:brightness(1.05)}.co-place:active{transform:scale(.985)}",
    ".co-place:disabled{opacity:.45;cursor:not-allowed}",
    ".co-ruo{font-size:11px;color:#8a8375;text-align:center;margin-top:12px;line-height:1.5}",
    ".co-paynote{font-size:12px;color:#8a8375;margin:10px 2px 0;line-height:1.55}",
    ".co-saved{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border:1px solid rgba(231,192,106,.3);background:rgba(231,192,106,.04);border-radius:12px;padding:15px 16px}",
    ".co-saved .cs-in{display:flex;flex-direction:column;gap:3px;font-size:13.5px;color:#b5ad9d;min-width:0}",
    ".co-saved .cs-in b{color:#f4efe6;font-weight:500;font-size:14.5px}",
    ".co-saved .cs-e{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#8a8375;margin-top:3px}",
    ".cs-edit{flex:none;background:none;border:1px solid rgba(255,255,255,.15);border-radius:8px;color:#e7c06a;font-size:12px;padding:6px 13px;cursor:pointer;font-family:inherit;transition:background .15s}",
    ".cs-edit:hover{background:rgba(231,192,106,.08)}",
    ".co-opt .op.pg{width:26px;height:26px;border-radius:50%;border:1px solid rgba(231,192,106,.45);display:grid;place-items:center;font-size:13px}",
    ".thanks-order{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#e7c06a;background:rgba(231,192,106,.08);border:1px solid rgba(231,192,106,.2);border-radius:8px;padding:8px 14px;margin:2px auto 4px;display:inline-block}"
  ].join("");
  document.head.appendChild(s);
})();

var coBackdrop, coModal, checkoutShip="standard", checkoutPay="btc", coUseSaved=false;
function savedShipTo(){ var s=load("elyria_shipto", null); return (s && s.email && s.name && s.street && s.csz) ? s : null; }
function shipToFormHTML(pre){
  pre = pre||{};
  function v(x){ return x?' value="'+escapeHtml(x)+'"':''; }
  return '<div class="co-grid">'+
    '<div class="co-f full"><label>Email</label><input id="coEmail" type="email" placeholder="you@example.com" required'+v(pre.email)+'></div>'+
    '<div class="co-f full"><label>Ship to</label><input id="coName" placeholder="Full name" required'+v(pre.name)+'></div>'+
    '<div class="co-f full"><label>Street address</label><input id="coStreet" placeholder="2200 Mission Bay Blvd, Apt 4" required'+v(pre.street)+'></div>'+
    '<div class="co-f full"><label>City, State ZIP</label><input id="coCsz" placeholder="San Francisco, CA 94158" required'+v(pre.csz)+'></div>'+
  '</div>';
}
function shipToSavedHTML(s){
  return '<div class="co-saved"><div class="cs-in"><b>'+escapeHtml(s.name)+'</b>'+
    '<span>'+escapeHtml(s.street)+'</span><span>'+escapeHtml(s.csz)+'</span>'+
    '<span class="cs-e">'+escapeHtml(s.email)+'</span></div>'+
    '<button type="button" class="cs-edit" id="coEditShip">Edit</button></div>';
}
function payOptionsHTML(){
  if(!window.ElyriaPay) return "";
  var ids = ElyriaPay.enabledIds();
  if(ids.indexOf(checkoutPay)<0) checkoutPay = ids[0];
  return ids.map(function(id){
    var m = ElyriaPay.method(id);
    return '<div class="co-opt'+(id===checkoutPay?' on':'')+'" data-pay="'+id+'"><span class="dot"></span><span class="ot"><b>'+m.name+'</b><span>'+m.sub+'</span></span><span class="op pg">'+m.glyph+'</span></div>';
  }).join("");
}
function orderSeq(){ var n=load("elyria_order_seq", 1041)+1; save("elyria_order_seq", n); return n; }
function itemLot(id){ var kp=keyProduct(id); return kp?lotInfo(kp.p).lot:"LMB-26B-000"; }
function openCheckout(){
  var t = computeTotals();
  if(t.count===0) return;
  if(!coBackdrop){
    coBackdrop=document.createElement("div"); coBackdrop.className="co-backdrop";
    coModal=document.createElement("div"); coModal.className="co-modal"; coModal.setAttribute("role","dialog"); coModal.setAttribute("aria-modal","true"); coModal.setAttribute("aria-label","Checkout");
    document.body.appendChild(coBackdrop); document.body.appendChild(coModal);
    coBackdrop.addEventListener("click", closeCheckout);
    document.addEventListener("keydown", function(e){ if(e.key==="Escape" && coModal.classList.contains("open")) closeCheckout(); });
  }
  var coldCost = (t.subtotal - t.discount) >= FREE_SHIP ? 0 : 18;
  var stdCost = t.shipping;
  var itemsHTML = t.ids.map(function(key){ var kp=keyProduct(key); return '<div class="co-item"><span>'+kp.p.name+' <span class="ci-q">'+kp.size+' · '+cart[key]+'×</span></span><span class="ci-p">'+fmt(kp.price*cart[key])+'</span></div>'; }).join("");
  var saved = savedShipTo();
  coUseSaved = !!saved;
  coModal.innerHTML =
    '<div class="co-head"><div><h3>Checkout</h3></div><span class="co-step">'+t.count+(t.count===1?' vial':' vials')+'</span><button class="co-x" id="coClose" aria-label="Close"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<div class="co-body">'+
      '<div class="co-sec">Deliver to</div>'+
      '<p class="co-guest"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M5 12l4 4 10-10"/></svg><span><b>No account needed</b> \u2014 check out as a guest.</span></p>'+
      '<p class="co-paynote" style="margin:-4px 2px 12px">U.S. addresses only \u2014 we don\u2019t ship internationally.</p>'+
      '<div id="coShipTo">'+(coUseSaved ? shipToSavedHTML(saved) : shipToFormHTML())+'</div>'+
      '<div class="co-sec">Shipping method</div>'+
      '<div class="co-ship" id="coShip">'+
        '<div class="co-opt on" data-ship="standard"><span class="dot"></span><span class="ot"><b>Standard — ambient</b><span>Insulated mailer · 2–4 business days</span></span><span class="op">'+(stdCost===0?'Free':fmt(stdCost))+'</span></div>'+
        '<div class="co-opt" data-ship="cold"><span class="dot"></span><span class="ot"><b>Cold-chain — gel pack</b><span>Temperature-controlled · 1–2 business days</span></span><span class="op">'+(coldCost===0?'Free':fmt(coldCost))+'</span></div>'+
      '</div>'+
      (window.ElyriaPay?
      '<div class="co-sec">Payment</div>'+
      '<div class="co-ship" id="coPay">'+payOptionsHTML()+'</div>'+
      '<p class="co-paynote">Payment details come right after you place the order — send it, paste your confirmation, done. We verify and ship.</p>':'')+
      '<div class="co-sec">Order</div>'+
      '<div class="co-items">'+itemsHTML+'</div>'+
    '</div>'+
    '<div class="co-foot" id="coFoot"></div>';
  checkoutShip="standard";
  coModal.querySelector("#coClose").addEventListener("click", closeCheckout);
  coModal.querySelector("#coShip").addEventListener("click", function(e){
    var opt=e.target.closest("[data-ship]"); if(!opt) return;
    checkoutShip=opt.getAttribute("data-ship");
    Array.prototype.forEach.call(this.children, function(c){ c.classList.toggle("on", c===opt); });
    paintCheckoutFoot();
  });
  var coPayEl = coModal.querySelector("#coPay");
  if(coPayEl) coPayEl.addEventListener("click", function(e){
    var opt=e.target.closest("[data-pay]"); if(!opt) return;
    checkoutPay=opt.getAttribute("data-pay");
    Array.prototype.forEach.call(this.children, function(c){ c.classList.toggle("on", c===opt); });
  });
  var coShipToEl = coModal.querySelector("#coShipTo");
  function wireShipInputs(){
    coShipToEl.querySelectorAll("input").forEach(function(i){ i.addEventListener("input", paintCheckoutFoot); });
    var ed = coShipToEl.querySelector("#coEditShip");
    if(ed) ed.addEventListener("click", function(){
      coUseSaved = false;
      coShipToEl.innerHTML = shipToFormHTML(savedShipTo()||{});
      wireShipInputs();
      paintCheckoutFoot();
      var f = coShipToEl.querySelector("#coEmail"); if(f) f.focus();
    });
  }
  wireShipInputs();
  coModal.querySelectorAll(".co-body input").forEach(function(i){ i.addEventListener("input", paintCheckoutFoot); });
  paintCheckoutFoot();
  // present
  closeCart();
  requestAnimationFrame(function(){ coBackdrop.classList.add("open"); coModal.classList.add("open"); document.body.classList.add("lock"); });
}
function checkoutShipCost(t){
  if(checkoutShip==="cold") return (t.subtotal - t.discount) >= FREE_SHIP ? 0 : 18;
  return t.shipping;
}
function paintCheckoutFoot(){
  var t=computeTotals(); var ship=checkoutShipCost(t);
  var grand = t.subtotal - t.discount + ship;
  var foot=coModal.querySelector("#coFoot");
  var valid;
  if(coUseSaved){
    valid = true;
  } else {
    var reqs=["coEmail","coName","coStreet","coCsz"];
    valid=reqs.every(function(id){ var el=coModal.querySelector("#"+id); return el && el.value.trim().length>0; });
    var emailEl=coModal.querySelector("#coEmail"); if(emailEl && emailEl.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailEl.value)) valid=false;
  }
  foot.innerHTML =
    '<div class="co-tot"><span>Subtotal</span><span>'+fmt(t.subtotal)+'</span></div>'+
    (t.discount>0?'<div class="co-tot"><span>Discount'+(appliedCode?' · '+escapeHtml(appliedCode):'')+'</span><span>−'+fmt(t.discount)+'</span></div>':'')+
    '<div class="co-tot"><span>Shipping · '+(checkoutShip==="cold"?"cold-chain":"standard")+'</span><span>'+(ship===0?'Free':fmt(ship))+'</span></div>'+
    '<div class="co-tot grand"><span>Total</span><b>'+fmt(grand)+'</b></div>'+
    '<button class="co-place" id="coPlace"'+(valid?'':' disabled')+'>Place order · '+fmt(grand)+'</button>'+
    '<p class="co-ruo">By placing this order you confirm these materials are for in-vitro research use only.</p>';
  foot.querySelector("#coPlace").addEventListener("click", function(){ if(!valid) return; placeOrder(t, ship, grand); });
}
function closeCheckout(){
  if(!coModal) return;
  coModal.classList.remove("open"); coBackdrop.classList.remove("open"); document.body.classList.remove("lock");
}
function placeOrder(t, ship, grand){
  var shipTo = coUseSaved ? savedShipTo() : {
    email: ((coModal.querySelector("#coEmail")||{}).value||"").trim(),
    name:  ((coModal.querySelector("#coName")||{}).value||"").trim(),
    street:((coModal.querySelector("#coStreet")||{}).value||"").trim(),
    csz:   ((coModal.querySelector("#coCsz")||{}).value||"").trim()
  };
  if(shipTo) save("elyria_shipto", shipTo);
  var seq = orderSeq();
  var lotChar = "ABCDEF"[seq%6];
  var oid = "LMB-26"+lotChar+"-"+seq;
  var now = new Date();
  var order = {
    id: oid,
    date: now.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}),
    ts: now.getTime(),
    status: window.ElyriaPay ? "pending" : "processing",
    pay: checkoutPay,
    payState: "awaiting",
    email: shipTo ? shipTo.email : "",
    shipTo: shipTo,
    ship: checkoutShip,
    shipCost: ship,
    discount: t.discount,
    code: appliedCode||"",
    total: grand,
    items: t.ids.map(function(key){ var kp=keyProduct(key); return { id:kp.id, qty:cart[key], lot:itemLot(key), size:kp.size, price:kp.price }; })
  };
  order.guest = true;
  var guestOrders = load("elyria_orders_guest", []);
  guestOrders.unshift(order);
  save("elyria_orders_guest", guestOrders);
  // clear cart + promo
  cart = {}; save("elyria_cart", cart);
  appliedCode = ""; save("elyria_promo", "");
  save("elyria_has_ordered", 1);
  if(ruoAck) ruoAck.checked = false;
  closeCheckout();
  renderCart();
  setTimeout(function(){
    if(window.ElyriaPay){
      ElyriaPay.openPayModal(order, {
        onSubmitted: function(){ showThankYou(t, oid, "proof"); },
        onLater: function(){ showThankYou(t, oid, "later"); }
      });
    } else {
      showThankYou(t, oid);
    }
  }, 300);
}
checkoutBtn.addEventListener("click", function(){
  if(checkoutBtn.disabled) return;
  if(computeTotals().count===0) return;
  openCheckout();
});

/* promo code */
var promoInput = document.getElementById("promoInput");
var promoApply = document.getElementById("promoApply");
var promoFeedback = document.getElementById("promoFeedback");
function applyCode(raw){
  var code = (raw||"").trim().toUpperCase();
  if(!code) return;
  if(CODES[code]){
    appliedCode = code; save("elyria_promo", appliedCode);
    promoFeedback.hidden=false; promoFeedback.className="promo-feedback ok";
    promoFeedback.textContent = "Applied: "+CODES[code].label;
    promoApply.textContent = "Applied";
  } else {
    promoFeedback.hidden=false; promoFeedback.className="promo-feedback err";
    promoFeedback.textContent = "“"+code+"” isn’t a valid code. Try ELYRIA10.";
  }
  renderCart();
}
promoApply.addEventListener("click", function(){ applyCode(promoInput.value); });
promoInput.addEventListener("keydown", function(e){ if(e.key==="Enter"){ e.preventDefault(); applyCode(promoInput.value); } });
if(appliedCode && CODES[appliedCode]){ promoInput.value=appliedCode; promoApply.textContent="Applied"; promoFeedback.hidden=false; promoFeedback.className="promo-feedback ok"; promoFeedback.textContent="Applied: "+CODES[appliedCode].label; }

/* cart drawer open/close */
var drawer = document.getElementById("drawer");
var cartBackdrop = document.getElementById("cartBackdrop");
var cartBtn = document.getElementById("cartBtn");
function openCart(){ drawer.classList.add("open"); cartBackdrop.classList.add("open"); drawer.setAttribute("aria-hidden","false"); document.body.classList.add("lock"); setTimeout(function(){ document.getElementById("drawerClose").focus(); },80); }
function closeCart(){ drawer.classList.remove("open"); cartBackdrop.classList.remove("open"); drawer.setAttribute("aria-hidden","true"); document.body.classList.remove("lock"); }
cartBtn.addEventListener("click", openCart);
cartBackdrop.addEventListener("click", closeCart);
document.getElementById("drawerClose").addEventListener("click", closeCart);
function pulseCart(){ cartBtn.classList.remove("pulse"); void cartBtn.offsetWidth; cartBtn.classList.add("pulse"); }

/* ===================== QUICK VIEW ===================== */
var qv = document.getElementById("qv");
var qvBackdrop = document.getElementById("qvBackdrop");
var qvBody = document.getElementById("qvBody");
var qvOpen = false;
function openQuick(id){
  var p = product(id); if(!p) return;
  pushRecent(id);
  var stockTxt = p.stock==="low" ? "Low stock — limited lot" : "In stock · ships in 48 hr";
  function build(){
  qvBody.innerHTML =
    '<div class="qv-vis">'+vialHTML(p)+'<div class="card-badges" style="top:18px;left:18px">'+badgeHTML(p)+'</div></div>'+
    '<div class="qv-info">'+
      (p.supply?'<span class="qv-cat">supplies · reconstitution diluent</span>':'<span class="qv-cat">'+p.cat+' · reference material</span>')+
      '<h3>'+p.name+'</h3>'+
      '<div class="qv-cas">'+p.cas+' · '+p.size+'</div>'+
      (p.supply?'':'<div class="qv-assay">'+
        '<div class="qa-num"><span class="qa-big">'+p.purity+'</span><span class="qa-cap">RP-HPLC purity</span></div>'+
        '<div class="qa-meta">'+
          '<div class="qa-line"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M9 12l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/></svg>'+p.identity+' <span>· identity by ESI-MS</span></div>'+
          '<div class="qa-lot">Third-party COA · lot '+lotInfo(p).lot+'</div>'+
          '<button class="qa-view" data-coa="'+p.id+'">View certificate →</button>'+
        '</div>'+
      '</div>')+
      '<div class="qv-price">'+priceHTML(p)+'</div>'+
      '<p class="qv-desc">'+p.desc+'</p>'+
      '<div class="qv-specs">'+
(p.supply?'<div class="sp"><div class="k">Grade</div><div class="v">USP</div></div>'+'<div class="sp"><div class="k">Preservative</div><div class="v">0.9% benzyl alcohol</div></div>'+'<div class="sp"><div class="k">Volume</div><div class="v">'+p.size+'</div></div>':'<div class="sp"><div class="k">HPLC purity</div><div class="v">'+p.purity+'</div></div>'+'<div class="sp"><div class="k">Identity</div><div class="v">'+p.identity+'</div></div>'+'<div class="sp"><div class="k">Endotoxin</div><div class="v">'+p.endo+'</div></div>')+
        '<div class="sp"><div class="k">Availability</div><div class="v">'+stockTxt+'</div></div>'+
      '</div>'+
      (p.supply?'':storageHTML(p)+reconHTML(p)+lotHistHTML(p))+
      '<div class="qv-buy">'+
        '<div class="stepper" aria-label="Quantity">'+
          '<button type="button" data-qvstep="-1" aria-label="Decrease">−</button>'+
          '<span class="qty mono" id="qvQty">1</span>'+
          '<button type="button" data-qvstep="1" aria-label="Increase">+</button>'+
        '</div>'+
        '<button class="add-btn" id="qvAdd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 5v14M5 12h14"/></svg>Add to cart</button>'+
      '</div>'+
      (p.supply?'<div class="qv-coa"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M9 12l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/></svg>USP-grade sterile diluent · sealed multi-dose vial</div>':'<div class="qv-coa"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M9 12l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/></svg>Third-party COA &amp; lot batch trace</div>')+
      '<div class="qv-coa-row">'+(p.supply?'':'<button class="qv-coa-btn" data-coa="'+p.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M9 13l2 2 4-4"/></svg>View sample COA</button><button class="qv-pack-btn" data-pack="'+p.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2"/></svg>Data pack</button><button class="qv-pack-btn" data-sds="'+p.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 13h8M8 17h5"/></svg>SDS</button>')+'<a href="'+purl(id)+'" id="qvCoaLink" class="qv-verif-link">Full details →</a></div>'+
    '</div>';
  var qqty = 1;
  var qtyEl = document.getElementById("qvQty");
  qvBody.querySelectorAll("[data-qvstep]").forEach(function(b){
    b.addEventListener("click", function(){ qqty = Math.max(1, qqty + parseInt(b.getAttribute("data-qvstep"),10)); qtyEl.textContent = qqty; });
  });
  document.getElementById("qvAdd").addEventListener("click", function(){ addToCart(id, qqty, this); });
  document.getElementById("qvCoaLink").addEventListener("click", closeQuick);
  var qvCoaBtn = qvBody.querySelectorAll("[data-coa]");
  qvCoaBtn.forEach(function(b){ b.addEventListener("click", function(){ openCOA(id); }); });
  qvBody.querySelectorAll("[data-pack]").forEach(function(b){ b.addEventListener("click", function(){ downloadPack(id); }); });
  qvBody.querySelectorAll("[data-sds]").forEach(function(b){ b.addEventListener("click", function(){ downloadSDS(id); }); });
  var rMass=document.getElementById("reconMass"), rConc=document.getElementById("reconConc");
  if(rMass && rConc){
    function reCalc(){
      var m=parseFloat(rMass.value)||0, c=parseFloat(rConc.value)||0, vol=c>0?m/c:0;
      var vEl=document.getElementById("reconVol"), uEl=document.getElementById("reconPerUnit"), sEl=document.getElementById("reconStab");
      if(vEl) vEl.innerHTML=(vol>0?vol.toFixed(2):"\u2014")+'<small>mL diluent</small>';
      if(uEl) uEl.textContent=(c*0.1).toFixed(2)+" mg";
      if(sEl){ var n=vol>0?Math.max(1,Math.round(vol/0.5)):0; sEl.innerHTML=vol>0?'Reconstituted at this concentration: stable ~<b>4 weeks</b> at <b>2\u20138 \u00b0C</b> \u00b7 split into ~<b>'+n+' \u00d7 0.5 mL</b> aliquots to limit freeze\u2013thaw.':''; }
    }
    rMass.addEventListener("input", reCalc); rConc.addEventListener("input", reCalc); reCalc();
  }
  qv.classList.add("open"); qvBackdrop.classList.add("open"); qv.setAttribute("aria-hidden","false");
  document.body.classList.add("lock"); qvOpen=true;
  qvBody.setAttribute("data-pid", id);
  if(window.LabHooks && window.LabHooks.quick) window.LabHooks.quick(id);
  }
  if(document.startViewTransition && !reduce){
    if(window.LabHooks && window.LabHooks.beforeQuick) window.LabHooks.beforeQuick();
    var t = svt(build);
    if(t && t.finished) t.finished.catch(function(){}).finally(function(){ if(window.LabHooks && window.LabHooks.afterQuick) window.LabHooks.afterQuick(); });
  } else build();
}
function closeQuick(){
  if(window.LabHooks && window.LabHooks.closeQuick) window.LabHooks.closeQuick();
  function done(){ qv.classList.remove("open"); qvBackdrop.classList.remove("open"); qv.setAttribute("aria-hidden","true"); if(!drawer.classList.contains("open")) document.body.classList.remove("lock"); qvOpen=false; }
  svt(done);
}
document.getElementById("qvClose").addEventListener("click", closeQuick);
qvBackdrop.addEventListener("click", closeQuick);

/* ===================== RECENTLY VIEWED ===================== */
var recentSec = document.getElementById("recent");
var recentRail = document.getElementById("recentRail");
function pushRecent(id){
  recent = recent.filter(function(x){ return x!==id; });
  recent.unshift(id);
  if(recent.length>8) recent = recent.slice(0,8);
  save("elyria_recent", recent);
  renderRecent();
}
function renderRecent(){
  var list = recent.filter(function(id){ return product(id); });
  if(list.length===0){ recentSec.hidden=true; return; }
  recentSec.hidden=false;
  recentRail.innerHTML = list.map(function(id){
    var p = product(id);
    return '<div class="rv-card" data-rv="'+id+'"><div class="rv-vis" data-rvopen="'+id+'">'+vialHTML(p)+'</div><div class="rv-meta"><div class="rv-nm" data-rvopen="'+id+'">'+p.name+'</div><div class="rv-pr">'+fmt(p.price)+'</div><button class="rv-add" data-rvadd="'+id+'" aria-label="Reorder '+p.name+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 5v14M5 12h14"/></svg>Reorder</button></div></div>';
  }).join("");
}
recentRail.addEventListener("click", function(e){
  var add=e.target.closest("[data-rvadd]");
  if(add){ addToCart(add.getAttribute("data-rvadd"), 1, add); return; }
  var op=e.target.closest("[data-rvopen]"); if(op){ openQuick(op.getAttribute("data-rvopen")); return; }
});
document.getElementById("recentClear").addEventListener("click", function(){ recent=[]; save("elyria_recent", recent); renderRecent(); });

/* ===================== FILTER + SEARCH + SORT ===================== */
var pills = Array.prototype.slice.call(document.querySelectorAll(".pill"));
var catTiles = Array.prototype.slice.call(document.querySelectorAll("[data-cattile]"));
var resultCount = document.getElementById("resultCount");
var sortSelect = document.getElementById("sortSelect");
var searchInput = document.getElementById("searchInput");
var searchClear = document.getElementById("searchClear");
var noResults = document.getElementById("noResults");
var nrTerm = document.getElementById("nrTerm");
var currentFilter = "all";
var searchTerm = "";
var fPurity = 0, fSizeSel = [], fStock = false, fPermg = "any", expandFromURL = false;
function advActive(){ return fPurity>0 || fSizeSel.length>0 || fStock || fPermg!=="any"; }
function advCount(){ return (fPurity>0?1:0)+(fSizeSel.length?1:0)+(fStock?1:0)+(fPermg!=="any"?1:0); }
/* home page shows only the 6 most popular until “Shop all peptides” is clicked (or a filter/search is used) */
var POPULAR = ["ghkcu","bpc157","ipa","tirz","nad","tb500"];
var expanded = true;
var shopToolbar = document.querySelector(".shop-toolbar");
var shopAllWrap = document.getElementById("shopAllWrap");
var shopAllBtn = document.getElementById("shopAll");
function setExpanded(v){
  expanded = v;
  if(shopAllWrap) shopAllWrap.hidden = v;
}
if(shopAllWrap) shopAllWrap.hidden = true;

function matches(p){
  /* Always show all products — no POPULAR gate */
  if(currentFilter!=="all" && p.cat!==currentFilter) return false;
  if(searchTerm){
    var hay = (p.name+" "+p.cas+" "+p.cat+" "+p.desc).toLowerCase();
    if(hay.indexOf(searchTerm)===-1) return false;
  }
  if(fPurity>0){ var pv=parseFloat(p.purity); if(!(pv>=fPurity)) return false; }
  if(fSizeSel.length && fSizeSel.indexOf(p.size)===-1) return false;
  if(fStock && p.stock!=="in") return false;
  if(fPermg!=="any"){
    var mg=parseFloat(p.size), v=(!p.supply && /mg\b/i.test(p.size) && mg>0)? p.price/mg : null;
    if(v==null) return false;
    if(fPermg==="lt2" && !(v<2)) return false;
    if(fPermg==="2to5" && !(v>=2 && v<=5)) return false;
    if(fPermg==="gt5" && !(v>5)) return false;
  }
  return true;
}
function applyView(){
  var n = 0;
  withFlip(function(){
    cards.forEach(function(card){
      var p = product(card.getAttribute("data-id"));
      if(matches(p)){
        card.classList.remove("hidden");
        card.classList.add("in");  /* ensure card is visible — .rv starts at opacity:0 */
        n++;
      } else {
        card.classList.add("hidden");
      }
    });
  });
  resultCount.innerHTML = "<b>"+n+"</b> "+(n===1?"product":"products");
  if(n===0){ noResults.hidden=false; nrTerm.textContent = searchTerm ? '“'+searchInput.value+'”' : "those filters"; try{ document.dispatchEvent(new CustomEvent("catalog:empty",{detail:{term:searchTerm}})); }catch(e){} }
  else { noResults.hidden=true; try{ document.dispatchEvent(new CustomEvent("catalog:filled")); }catch(e){} }
  updateScopeUI(n);
  paintAdvControls();
  renderActiveFilters();
}
var activeFilters = document.getElementById("activeFilters");
function renderActiveFilters(){
  if(!activeFilters) return;
  var chips = [];
  if(currentFilter && currentFilter!=="all") chips.push('<button class="af-chip" data-afclear="cat"><span class="af-k">Category</span>'+cap(currentFilter)+'<span class="af-x">\u00d7</span></button>');
  var q = searchInput.value.trim();
  if(q) chips.push('<button class="af-chip" data-afclear="q"><span class="af-k">Search</span>\u201c'+escapeHtml(q)+'\u201d<span class="af-x">\u00d7</span></button>');
  if(!chips.length){ activeFilters.hidden=true; activeFilters.innerHTML=""; return; }
  activeFilters.hidden=false;
  activeFilters.innerHTML = '<span class="af-label">Filtering by</span>'+chips.join("")+(chips.length>1?'<button class="af-clear-all" data-afclear="all">Clear all</button>':"");
}
if(activeFilters){
  activeFilters.addEventListener("click", function(e){
    var b = e.target.closest("[data-afclear]"); if(!b) return;
    var k = b.getAttribute("data-afclear");
    if(k==="cat") setFilter("all");
    else if(k==="q"){ searchInput.value=""; searchTerm=""; searchClear.hidden=true; if(searchSuggest) searchSuggest.hidden=true; applyView(); syncURL(); }
    else { searchInput.value=""; searchTerm=""; searchClear.hidden=true; if(searchSuggest) searchSuggest.hidden=true; fPurity=0; fSizeSel=[]; fStock=false; fPermg="any"; setFilter("all"); }
  });
}
function setFilter(f){
  currentFilter = f;
  pills.forEach(function(pl){ pl.setAttribute("aria-pressed", pl.getAttribute("data-filter")===f ? "true":"false"); });
  catTiles.forEach(function(t){ t.classList.toggle("active", t.getAttribute("data-cattile")===f); });
  applyView(); syncURL();
}
function sortCards(mode){
  var arr = ORIGINAL_ORDER.slice();
  if(mode==="price-asc") arr.sort(function(a,b){ return product(a.dataset.id).price - product(b.dataset.id).price; });
  else if(mode==="price-desc") arr.sort(function(a,b){ return product(b.dataset.id).price - product(a.dataset.id).price; });
  else if(mode==="permg-asc") arr.sort(function(a,b){ return permgVal(product(a.dataset.id)) - permgVal(product(b.dataset.id)); });
  else if(mode==="purity-desc") arr.sort(function(a,b){ return parseFloat(product(b.dataset.id).purity) - parseFloat(product(a.dataset.id).purity); });
  else if(mode==="rating-desc") arr.sort(function(a,b){ return product(b.dataset.id).rating - product(a.dataset.id).rating; });
  else if(mode==="name-asc") arr.sort(function(a,b){ return product(a.dataset.id).name.localeCompare(product(b.dataset.id).name); });
  /* Always push coming-soon products to the bottom regardless of sort mode */
  arr.sort(function(a,b){ return (COMING_SOON[a.dataset.id]?1:0)-(COMING_SOON[b.dataset.id]?1:0); });
  withFlip(function(){ arr.forEach(function(c){ grid.appendChild(c); }); });
}
if(shopAllBtn) shopAllBtn.addEventListener("click", function(e){ e.preventDefault(); setExpanded(true); applyView(); scrollToEl(document.getElementById("catalog")); });
pills.forEach(function(pill){ pill.addEventListener("click", function(){ setFilter(pill.getAttribute("data-filter")); }); });
catTiles.forEach(function(tile){
  tile.addEventListener("click", function(){
    var f = tile.getAttribute("data-cattile");
    setExpanded(true);
    setFilter(currentFilter===f ? "all" : f);
    scrollToEl(document.getElementById("catalog"));
  });
  var c = tile.querySelector("[data-catcount]");
  var cat = tile.getAttribute("data-cattile");
  var num = PRODUCTS.filter(function(p){ return p.cat===cat; }).length;
  c.textContent = num + (num===1?" product":" products");
});
sortSelect.addEventListener("change", function(){ sortCards(sortSelect.value); syncURL(); });
searchInput.addEventListener("input", function(){
  searchTerm = searchInput.value.trim().toLowerCase();
  searchClear.hidden = !searchInput.value;
  if(searchTerm) setExpanded(true);
  applyView(); renderSuggest(); syncURL();
});
searchInput.addEventListener("focus", function(){ renderSuggest(); });
searchClear.addEventListener("click", function(){ searchInput.value=""; searchTerm=""; searchClear.hidden=true; searchSuggest.hidden=true; applyView(); syncURL(); searchInput.focus(); });
document.getElementById("nrClear").addEventListener("click", function(){ searchInput.value=""; searchTerm=""; searchClear.hidden=true; searchSuggest.hidden=true; setFilter("all"); });

/* ===================== ADVANCED FILTERS + SCOPE ===================== */
var scopeToggle=document.getElementById("scopeToggle");
var filtersToggle=document.getElementById("filtersToggle");
var filtersCount=document.getElementById("filtersCount");
var advFilters=document.getElementById("advFilters");
(function buildSizeChips(){
  var host=document.getElementById("advSizes"); if(!host) return;
  var seen={}, order=[];
  PRODUCTS.forEach(function(p){ if(!seen[p.size]){ seen[p.size]=1; order.push(p.size); } });
  order.sort(function(a,b){ return (parseFloat(a)||0)-(parseFloat(b)||0); });
  host.innerHTML=order.map(function(s){ return '<button class="fchip" data-sizeval="'+s+'">'+s+'</button>'; }).join("");
})();
function paintAdvControls(){
  document.querySelectorAll("#advPurity [data-pur]").forEach(function(b){ b.classList.toggle("on", parseFloat(b.getAttribute("data-pur"))===fPurity); });
  document.querySelectorAll("#advPermg [data-permg]").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-permg")===fPermg); });
  document.querySelectorAll("#advStock [data-stock]").forEach(function(b){ b.classList.toggle("on", (b.getAttribute("data-stock")==="in")===fStock); });
  document.querySelectorAll("#advSizes [data-sizeval]").forEach(function(b){ b.classList.toggle("on", fSizeSel.indexOf(b.getAttribute("data-sizeval"))>-1); });
}
function updateScopeUI(n){
  if(scopeToggle){ scopeToggle.textContent = expanded ? "Show popular only" : ("Show all "+PRODUCTS.length); scopeToggle.classList.toggle("on", expanded); }
  if(filtersCount){ var c=advCount(); if(c){ filtersCount.hidden=false; filtersCount.textContent=c; } else filtersCount.hidden=true; }
  var advSummary=document.getElementById("advSummary"); if(advSummary) advSummary.innerHTML="<b>"+n+"</b> material"+(n===1?"":"s")+" match"+(n===1?"es":"");
}
function afterAdvChange(){ if(advActive()) setExpanded(true); applyView(); syncURL(); }
if(scopeToggle) scopeToggle.addEventListener("click", function(){ setExpanded(!expanded); applyView(); syncURL(); });
if(filtersToggle && advFilters){
  filtersToggle.addEventListener("click", function(){
    var open=advFilters.hidden; advFilters.hidden=!open;
    filtersToggle.setAttribute("aria-expanded", open?"true":"false");
    filtersToggle.classList.toggle("on", open);
  });
}
document.querySelectorAll("#advPurity [data-pur]").forEach(function(b){ b.addEventListener("click", function(){ fPurity=parseFloat(b.getAttribute("data-pur")); afterAdvChange(); }); });
document.querySelectorAll("#advPermg [data-permg]").forEach(function(b){ b.addEventListener("click", function(){ fPermg=b.getAttribute("data-permg"); afterAdvChange(); }); });
document.querySelectorAll("#advStock [data-stock]").forEach(function(b){ b.addEventListener("click", function(){ fStock=(b.getAttribute("data-stock")==="in"); afterAdvChange(); }); });
var advSizesEl=document.getElementById("advSizes");
if(advSizesEl) advSizesEl.addEventListener("click", function(e){ var b=e.target.closest("[data-sizeval]"); if(!b) return; var s=b.getAttribute("data-sizeval"), i=fSizeSel.indexOf(s); if(i>-1) fSizeSel.splice(i,1); else fSizeSel.push(s); afterAdvChange(); });
var advResetEl=document.getElementById("advReset");
if(advResetEl) advResetEl.addEventListener("click", function(){ fPurity=0; fSizeSel=[]; fStock=false; fPermg="any"; afterAdvChange(); });

/* ===================== PROMO BAR ===================== */
var promobar = document.getElementById("promobar");
var promoText = document.getElementById("promoText");
document.getElementById("promoClose").addEventListener("click", function(){ promobar.classList.add("hide"); save("elyria_promobar_dismissed", 1); });

/* ===================== MOBILE NAV ===================== */
var mobileNav = document.getElementById("mobileNav");
var hamburger = document.getElementById("hamburger");
function openMobile(){ mobileNav.classList.add("open"); hamburger.setAttribute("aria-expanded","true"); document.body.classList.add("lock"); }
function closeMobile(){ mobileNav.classList.remove("open"); hamburger.setAttribute("aria-expanded","false"); document.body.classList.remove("lock"); }
hamburger.addEventListener("click", openMobile);
document.getElementById("mClose").addEventListener("click", closeMobile);
document.querySelectorAll("[data-mlink]").forEach(function(a){ a.addEventListener("click", closeMobile); });

/* mobile: move the search field into the menu so it stays usable on phones */
(function mobileSearch(){
  var form=document.getElementById("searchForm");
  var navIn=document.querySelector(".nav-in");
  var mnav=document.getElementById("mobileNav");
  if(!form||!navIn||!mnav) return;
  var anchor=document.createComment("search-slot");
  navIn.insertBefore(anchor, form);
  var mc=mnav.querySelector(".mclose");
  var mq=window.matchMedia("(max-width:680px)");
  function place(){
    if(mq.matches){ if(form.parentNode!==mnav) mnav.insertBefore(form, mc?mc.nextSibling:mnav.firstChild); }
    else { if(form.parentNode!==navIn) navIn.insertBefore(form, anchor); }
  }
  place();
  if(mq.addEventListener) mq.addEventListener("change", place); else if(mq.addListener) mq.addListener(place);
})();
document.addEventListener("keydown", function(e){
  if(e.key==="Escape"){
    if(searchSuggest && !searchSuggest.hidden){ searchSuggest.hidden=true; ssIndex=-1; return; }
    if(coaOpen){ closeCOA(); return; }
    if(cmpOpen){ closeCompare(); return; }
    if(qvOpen){ closeQuick(); return; }
    closeCart(); closeMobile(); return;
  }
  if(e.key==="/" && !/^(input|textarea|select)$/i.test(e.target.tagName||"") && !qvOpen && !cmpOpen && !coaOpen){
    var s=document.getElementById("searchInput");
    if(s && getComputedStyle(s).display!=="none"){ e.preventDefault(); s.focus(); s.select(); }
  }
  if(e.key==="Tab"){
    var dlg = coaOpen?coaEl : cmpOpen?cmpEl : qvOpen?qv : (drawer.classList.contains("open")?drawer:null);
    if(dlg) trapTab(e, dlg);
  }
});
function trapTab(e, dlg){
  var f = dlg.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])');
  f = Array.prototype.filter.call(f, function(el){ return el.offsetParent!==null; });
  if(!f.length) return;
  var first=f[0], last=f[f.length-1];
  if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
}

/* ===================== NAV SOLIDIFY ===================== */
var nav = document.getElementById("nav");

/* ===================== TITLE WORD-SPLIT (scroll reveal) ===================== */
(function splitTitles(){
  var titles = document.querySelectorAll("h2.display");
  Array.prototype.forEach.call(titles, function(el){
    if(el.querySelector(".rw")) return;
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = "";
    el.classList.add("reveal-title");
    el.classList.remove("rv");
    words.forEach(function(w, i){
      var mask = document.createElement("span"); mask.className = "rw";
      var inner = document.createElement("span"); inner.className = "rw-i";
      inner.style.setProperty("--wi", i);
      inner.textContent = w;
      mask.appendChild(inner);
      el.appendChild(mask);
      if(i < words.length-1) el.appendChild(document.createTextNode(" "));
    });
  });
})();

/* ===================== REVEALS ===================== */
var revealEls = Array.prototype.slice.call(document.querySelectorAll(".rv"));
if("IntersectionObserver" in window){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
  }, {threshold:0.1, rootMargin:"0px 0px -6% 0px"});
  revealEls.forEach(function(el){ io.observe(el); });
} else revealEls.forEach(function(el){ el.classList.add("in"); });

/* ===================== COUNT-UPS ===================== */
var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
var countState = new WeakMap();
if("IntersectionObserver" in window){
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting && !countState.get(en.target)){ countState.set(en.target,true); startCount(en.target); cio.unobserve(en.target); } });
  }, {threshold:0.4});
  counters.forEach(function(el){ cio.observe(el); });
}
function startCount(el){
  var target = parseFloat(el.getAttribute("data-count"));
  var suffix = el.getAttribute("data-suffix")||"";
  var decimals = (String(target).split(".")[1]||"").length;
  if(reduce){ el.textContent = target.toFixed(decimals)+suffix; return; }
  var dur=1300, start=performance.now();
  function tick(now){
    var t = Math.min(1,(now-start)/dur), eased = 1-Math.pow(1-t,3);
    el.textContent = (target*eased).toFixed(decimals)+suffix;
    if(t<1) requestAnimationFrame(tick); else el.textContent = target.toFixed(decimals)+suffix;
  }
  requestAnimationFrame(tick);
}

/* ===================== SEAL RINGS ===================== */
var seal = document.getElementById("seal");
if("IntersectionObserver" in window && seal){
  var sio = new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(en.isIntersecting){
        var r1=document.getElementById("ring1"), r2=document.getElementById("ring2");
        if(reduce){ r1.style.strokeDashoffset="40"; r2.style.strokeDashoffset="60"; }
        else { r1.style.transition="stroke-dashoffset 1.6s var(--ease-out)"; r2.style.transition="stroke-dashoffset 1.6s var(--ease-out) .2s"; requestAnimationFrame(function(){ r1.style.strokeDashoffset="40"; r2.style.strokeDashoffset="60"; }); }
        sio.unobserve(en.target);
      }
    });
  }, {threshold:0.3});
  sio.observe(seal);
}

/* ===================== HERO LOAD ===================== */
window.addEventListener("load", function(){ document.body.classList.add("loaded"); });
setTimeout(function(){ document.body.classList.add("loaded"); }, 1000);

/* ===================== VIDEOS ===================== */
var BG_VIDEOS = ["accountVideo"];
BG_VIDEOS.forEach(function(id){
  var v = document.getElementById(id); if(!v) return;
  if(reduce){ v.removeAttribute("autoplay"); try{v.pause();}catch(e){} v.style.display="none"; return; }
  v.addEventListener("error", function(){ v.style.display="none"; }, true);
  var src = v.querySelector("source"); if(src){ src.addEventListener("error", function(){ v.style.display="none"; }); }
});
if("IntersectionObserver" in window && !reduce){
  var vEls = BG_VIDEOS.map(function(id){ return document.getElementById(id); }).filter(Boolean);
  var vio = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ var v=en.target; if(en.isIntersecting){ var p=v.play(); if(p&&p.catch)p.catch(function(){}); } else { try{v.pause();}catch(e){} } });
  }, {threshold:0.05});
  vEls.forEach(function(v){ vio.observe(v); });
}

/* ===================== MAGNETIC CURSOR + rAF ===================== */
var dot = document.getElementById("cursorDot");
var ringEl = document.getElementById("cursorRing");
var aurora = document.getElementById("aurora");
var mouse = {x:innerWidth/2,y:innerHeight/2};
var ringp = {x:mouse.x,y:mouse.y};
var cursorActive = finePointer && !reduce;
if(cursorActive){
  document.addEventListener("mousemove", function(e){ mouse.x=e.clientX; mouse.y=e.clientY; dot.style.opacity="1"; ringEl.style.opacity="1"; });
  document.addEventListener("mouseleave", function(){ dot.style.opacity="0"; ringEl.style.opacity="0"; });
  document.addEventListener("mouseover", function(e){ var hot=e.target.closest(".magnetic,button,a,input,label,.card,.cat-tile,.rv-card"); dot.classList.toggle("hot",!!hot); ringEl.classList.toggle("hot",!!hot); });
}
var scrollY = window.pageYOffset;
var heroVisible = true;
var heroSection = document.getElementById("hero");
if("IntersectionObserver" in window) new IntersectionObserver(function(es){ heroVisible=es[0].isIntersecting; },{threshold:0}).observe(heroSection);
function loop(){
  scrollY = window.pageYOffset;
  if(scrollY>30) nav.classList.add("solid"); else nav.classList.remove("solid");
  if(cursorActive){
    dot.style.transform = "translate("+mouse.x+"px,"+mouse.y+"px) translate(-50%,-50%)";
    ringp.x += (mouse.x-ringp.x)*0.18; ringp.y += (mouse.y-ringp.y)*0.18;
    ringEl.style.transform = "translate("+ringp.x+"px,"+ringp.y+"px) translate(-50%,-50%)";
  }
  if(aurora && heroVisible && !reduce){
    var tt = performance.now()*0.0001, ax=Math.sin(tt)*40, ay=Math.cos(tt*1.3)*30;
    aurora.style.transform = "translate3d("+ax+"px,"+(ay - scrollY*0.12)+"px,0)";
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ===================== TWEAKS ===================== */
var TW_DEFAULTS = { dir:"showcase", accent:"e7c06a", promoOn:true, promoText:"Free shipping over $150 · Free express over $250" };
var tw = Object.assign({}, TW_DEFAULTS, load("elyria_tweaks", {}));
if(tw.accent==="2fe6c4"){ tw.accent="e7c06a"; }
var tweaksEl = document.getElementById("tweaks");
var dirHints = { showcase:"Large imagery, 3 across — premium feel.", compact:"Dense 4-across grid — maximises products in view.", editorial:"Wide 2-across cards with specs — catalog feel." };
function hexToRgb(h){ h=h.replace("#",""); return parseInt(h.substr(0,2),16)+","+parseInt(h.substr(2,2),16)+","+parseInt(h.substr(4,2),16); }
function applyTweaks(){
  document.body.classList.remove("dir-showcase","dir-compact","dir-editorial");
  document.body.classList.add("dir-"+tw.dir);
  document.documentElement.style.setProperty("--accent","#"+tw.accent);
  document.documentElement.style.setProperty("--accent-rgb", hexToRgb(tw.accent));
  // promo
  var dismissed = load("elyria_promobar_dismissed",0);
  if(tw.promoOn && !dismissed) promobar.classList.remove("hide"); else promobar.classList.add("hide");
  promoText.textContent = tw.promoText;
  // reflect controls
  document.querySelectorAll("#twDirection button").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-dir")===tw.dir); });
  document.getElementById("dirHint").textContent = dirHints[tw.dir];
  document.querySelectorAll("#twAccent button").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-accent")===tw.accent); });
  document.getElementById("twPromoOn").checked = tw.promoOn;
  var tt=document.getElementById("twPromoText"); if(tt.value!==tw.promoText) tt.value=tw.promoText;
}
function setTweak(k,v){ tw[k]=v; save("elyria_tweaks", tw); applyTweaks(); try{ window.parent.postMessage({type:"__edit_mode_set_keys", edits:{ ["tweak_"+k]:v }},"*"); }catch(e){} }
document.querySelectorAll("#twDirection button").forEach(function(b){ b.addEventListener("click", function(){ setTweak("dir", b.getAttribute("data-dir")); }); });
document.querySelectorAll("#twAccent button").forEach(function(b){ b.addEventListener("click", function(){ setTweak("accent", b.getAttribute("data-accent")); }); });
document.getElementById("twPromoOn").addEventListener("change", function(){ if(this.checked) save("elyria_promobar_dismissed",0); setTweak("promoOn", this.checked); });
document.getElementById("twPromoText").addEventListener("input", function(){ setTweak("promoText", this.value); });

/* tweaks host protocol */
document.getElementById("tweaksClose").addEventListener("click", function(){ tweaksEl.hidden=true; try{ window.parent.postMessage({type:"__edit_mode_dismissed"},"*"); }catch(e){} });
window.addEventListener("message", function(e){
  var t = e && e.data && e.data.type;
  if(t==="__activate_edit_mode") tweaksEl.hidden=false;
  else if(t==="__deactivate_edit_mode") tweaksEl.hidden=true;
});
try{ window.parent.postMessage({type:"__edit_mode_available"},"*"); }catch(e){}

/* ===================== UX ENHANCEMENTS ===================== */

/* one-time: keep promo copy's "$X" in sync with the real free-ship threshold */
(function fixShipCopy(){
  if(tw && typeof tw.promoText==="string"){
    var fixed = tw.promoText;
    if(/over \$\d/i.test(fixed)) fixed = fixed.replace(/over \$\d[\d,]*/i, "over $"+FREE_SHIP);
    fixed = fixed.replace(/cold[- ]?chain shipping/ig, "shipping").replace(/cold[- ]?chain/ig, "");
    fixed = fixed.replace(/\s{2,}/g, " ");
    if(fixed!==tw.promoText){ tw.promoText=fixed; save("elyria_tweaks", tw); }
  }
})();

/* ---- video reveal ---- */
["accountVideo"].forEach(function(id){
  var v=document.getElementById(id); if(!v) return;
  ["playing","loadeddata","canplay"].forEach(function(ev){ v.addEventListener(ev, function(){ v.classList.add("ready"); }); });
});

/* ---- shared helpers ---- */
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function hashStr(s){ var h=0; for(var i=0;i<s.length;i++){ h=(h<<5)-h+s.charCodeAt(i); h|=0; } return Math.abs(h); }
function lotInfo(p){
  if(LOT_OVERRIDES[p.id]) return LOT_OVERRIDES[p.id];
  var h=hashStr(p.id+p.name);
  var lot="LMB-26"+String.fromCharCode(65+(h%6))+"-"+(100+(h%900));
  var assay=new Date(Date.now()-(h%120)*864e5);
  var exp=new Date(assay.getTime()+730*864e5);
  function f(d){ return d.toLocaleDateString("en-US",{year:"numeric",month:"short",day:"2-digit"}); }
  return { lot:lot, assay:f(assay), exp:f(exp) };
}
function qrSVG(seed){
  var h=hashStr(seed), n=21, cells="", s=h||1;
  function rnd(){ s=(s*1103515245+12345)&0x7fffffff; return s/0x7fffffff; }
  for(var y=0;y<n;y++) for(var x=0;x<n;x++){
    var fnd=(x<7&&y<7)||(x>=n-7&&y<7)||(x<7&&y>=n-7), on;
    if(fnd){ var lx=x>=n-7?x-(n-7):x, ly=y>=n-7?y-(n-7):y; on=(lx===0||lx===6||ly===0||ly===6||(lx>=2&&lx<=4&&ly>=2&&ly<=4)); }
    else on=rnd()>0.55;
    if(on) cells+='<rect x="'+x+'" y="'+y+'" width="1" height="1"/>';
  }
  return '<svg viewBox="0 0 '+n+' '+n+'" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" fill="#0a1518">'+cells+'</svg>';
}

/* ---- toasts ---- */
var toastWrap=document.getElementById("toasts");
function toast(opts){
  if(!toastWrap) return;
  var el=document.createElement("div"); el.className="toast"; el.innerHTML=opts.html;
  toastWrap.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add("in"); });
  var dur=opts.duration||4600, timer=setTimeout(close, dur);
  function close(){ clearTimeout(timer); el.classList.remove("in"); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 380); }
  el.querySelectorAll("[data-toast-act]").forEach(function(b){
    b.addEventListener("click", function(){ var k=b.getAttribute("data-toast-act"); if(opts.on && opts.on[k]) opts.on[k](); close(); });
  });
  return el;
}
function showAddToast(id, qty){
  var kp=keyProduct(id); if(!kp) return; var p=kp.p;
  toast({
    html:'<div class="t-thumb">'+vialHTML(p, kp.size)+'</div>'+
         '<div class="t-body"><div class="t-title"><svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4 10-10"/></svg>Added to cart</div>'+
         '<div class="t-sub">'+(qty>1?qty+"\u00d7 ":"")+p.name+" \u00b7 "+kp.size+'</div></div>'+
         '<div class="t-acts"><button data-toast-act="view">View cart</button><button class="t-undo" data-toast-act="undo">Undo</button></div>',
    on:{ view:function(){ openCart(); }, undo:function(){ setQty(id, (cart[id]||0)-qty); } }
  });
}

/* ---- search suggestions ---- */
var searchSuggest=document.getElementById("searchSuggest");
var ssItems=[], ssIndex=-1;
function renderSuggest(){
  if(!searchSuggest) return;
  var term=searchInput.value.trim().toLowerCase();
  if(!term){ if(document.activeElement===searchInput) renderSuggestEmpty(); else { searchSuggest.hidden=true; ssItems=[]; ssIndex=-1; } return; }
  var list=PRODUCTS.filter(function(p){ return (p.name+" "+p.cas+" "+p.cat+" "+p.desc).toLowerCase().indexOf(term)>-1; }).slice(0,6);
  ssItems=list; ssIndex=-1;
  searchSuggest.hidden=false;
  if(!list.length){ searchSuggest.innerHTML='<div class="ss-empty">No materials match <b>"'+escapeHtml(searchInput.value)+'"</b></div>'; return; }
  searchSuggest.innerHTML='<div class="ss-head">'+list.length+" match"+(list.length>1?"es":"")+'</div>'+list.map(function(p){
    return '<div class="ss-item" data-ss="'+p.id+'" role="option"><div class="ss-thumb">'+vialHTML(p)+'</div>'+
      '<div class="ss-info"><div class="ss-nm">'+p.name+'</div><div class="ss-meta">'+p.cas+" \u00b7 "+p.purity+' HPLC</div></div>'+
      '<div class="ss-pr">'+fmt(p.price)+'</div></div>';
  }).join("");
}
function paintSS(){ var items=searchSuggest.querySelectorAll(".ss-item"); for(var i=0;i<items.length;i++) items[i].classList.toggle("active", i===ssIndex); }
function renderSuggestEmpty(){
  if(!searchSuggest) return;
  var popular=PRODUCTS.filter(function(p){ return p.badge==="bestseller"||p.badge==="popular"; }).slice(0,4);
  if(!popular.length) popular=PRODUCTS.slice(0,4);
  ssItems=popular; ssIndex=-1;
  var cats=[["repair","Repair"],["metabolic","Metabolic"],["longevity","Longevity"],["growth","Growth"]];
  var chips=cats.map(function(c){ return '<button class="ss-cat" data-sscat="'+c[0]+'">'+c[1]+'</button>'; }).join("");
  searchSuggest.hidden=false;
  searchSuggest.innerHTML='<div class="ss-head">Browse by category</div><div class="ss-cats">'+chips+'</div>'+
    '<div class="ss-head">Popular materials</div>'+popular.map(function(p){
      return '<div class="ss-item" data-ss="'+p.id+'" role="option"><div class="ss-thumb">'+vialHTML(p)+'</div>'+
        '<div class="ss-info"><div class="ss-nm">'+p.name+'</div><div class="ss-meta">'+p.cas+" \u00b7 "+p.purity+' HPLC</div></div>'+
        '<div class="ss-pr">'+fmt(p.price)+'</div></div>';
    }).join("");
}
if(searchSuggest){
  searchSuggest.addEventListener("mousedown", function(e){
    var cat=e.target.closest("[data-sscat]");
    if(cat){ e.preventDefault(); searchSuggest.hidden=true; closeMobile(); setFilter(cat.getAttribute("data-sscat")); var cel=document.getElementById("catalog"); if(cel) scrollToEl(cel); return; }
    var it=e.target.closest("[data-ss]"); if(it){ e.preventDefault(); searchSuggest.hidden=true; closeMobile(); openQuick(it.getAttribute("data-ss")); }
  });
  searchInput.addEventListener("keydown", function(e){
    if(searchSuggest.hidden || !ssItems.length){
      if(e.key==="Enter"){ var c=document.getElementById("catalog"); if(c) scrollToEl(c); }
      return;
    }
    if(e.key==="ArrowDown"){ e.preventDefault(); ssIndex=Math.min(ssItems.length-1, ssIndex+1); paintSS(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); ssIndex=Math.max(0, ssIndex-1); paintSS(); }
    else if(e.key==="Enter"){ e.preventDefault(); var pick=ssItems[ssIndex>-1?ssIndex:0]; if(pick){ searchSuggest.hidden=true; closeMobile(); openQuick(pick.id); } }
  });
  document.addEventListener("click", function(e){ if(!e.target.closest("#searchForm")) searchSuggest.hidden=true; });
}

/* ---- shareable URL state ---- */
function syncURL(){
  try{
    var params=new URLSearchParams();
    if(currentFilter && currentFilter!=="all") params.set("cat", currentFilter);
    if(sortSelect.value && sortSelect.value!=="featured") params.set("sort", sortSelect.value);
    var q=searchInput.value.trim(); if(q) params.set("q", q);
    if(fPurity>0) params.set("pur", fPurity);
    if(fSizeSel.length) params.set("size", fSizeSel.join(","));
    if(fPermg!=="any") params.set("permg", fPermg);
    if(fStock) params.set("stock", "in");
    if(expanded && currentFilter==="all" && !q && !advActive()) params.set("all", "1");
    var qs=params.toString();
    history.replaceState(null, "", qs?("?"+qs):location.pathname);
  }catch(e){}
}
function readURL(){
  try{
    var p=new URLSearchParams(location.search);
    var c=p.get("cat"); if(c && ["repair","metabolic","longevity","growth","supplies"].indexOf(c)>-1) currentFilter=c;
    var s=p.get("sort"); if(s && ["featured","price-asc","price-desc","permg-asc","purity-desc","rating-desc","name-asc"].indexOf(s)>-1) sortSelect.value=s;
    var q=p.get("q"); if(q){ searchInput.value=q; searchTerm=q.trim().toLowerCase(); searchClear.hidden=!q; }
    var pur=parseFloat(p.get("pur")); if(pur>0) fPurity=pur;
    var sz=p.get("size"); if(sz) fSizeSel=sz.split(",").filter(Boolean);
    var pm=p.get("permg"); if(pm && ["lt2","2to5","gt5"].indexOf(pm)>-1) fPermg=pm;
    if(p.get("stock")==="in") fStock=true;
    if(p.get("all")==="1") expandFromURL=true;
  }catch(e){}
}

/* ---- compare ---- */
var compareTray=document.getElementById("compareTray");
var ctThumbs=document.getElementById("ctThumbs");
var ctGo=document.getElementById("ctGo");
var ctCount=document.getElementById("ctCount");
var ctHint=document.getElementById("ctHint");
var cmpEl=document.getElementById("cmp");
var cmpBackdrop=document.getElementById("cmpBackdrop");
var cmpBody=document.getElementById("cmpBody");
var cmpOpen=false;
function setCompare(id, on){
  var i=compare.indexOf(id);
  if(on && i<0){ if(compare.length>=4) return false; compare.push(id); }
  else if(!on && i>-1){ compare.splice(i,1); }
  save("elyria_compare", compare);
  document.querySelectorAll('[data-cmp="'+id+'"]').forEach(function(b){ b.classList.toggle("on", compare.indexOf(id)>-1); });
  renderCompareTray();
  return true;
}
function toggleCompare(id){
  var on=compare.indexOf(id)<0;
  if(on && compare.length>=4){
    toast({ html:'<div class="t-body"><div class="t-title">Compare is full</div><div class="t-sub">Remove one to add another (max 4)</div></div>', duration:3200 });
    return;
  }
  setCompare(id, on);
}
function renderCompareTray(){
  var list=compare.map(product).filter(Boolean);
  if(list.length===0){ compareTray.hidden=true; document.body.classList.remove("tray-open"); return; }
  compareTray.hidden=false; document.body.classList.add("tray-open");
  ctThumbs.innerHTML=list.map(function(p){
    return '<div class="ct-chip" title="'+p.name+'"><button class="ct-x" data-ctx="'+p.id+'" aria-label="Remove '+p.name+'">\u00d7</button>'+vialHTML(p)+'</div>';
  }).join("");
  ctCount.textContent=list.length;
  ctGo.disabled=list.length<2;
  ctHint.textContent=list.length<2?"Add one more to compare":(list.length+" selected \u00b7 up to 4");
}
function buildCompareHTML(){
  var prods=compare.map(product).filter(Boolean), n=prods.length;
  var gtc="128px repeat("+n+",minmax(150px,1fr))";
  var maxPur=Math.max.apply(null, prods.map(function(p){ return parseFloat(p.purity); }));
  var minPr=Math.min.apply(null, prods.map(function(p){ return p.price; }));
  var maxRt=Math.max.apply(null, prods.map(function(p){ return p.rating; }));
  function ppm(p){ var mg=parseFloat(p.size); return (!p.supply && /mg\b/i.test(p.size) && mg>0)? p.price/mg : null; }
  var ppmVals=prods.map(ppm).filter(function(v){ return v!=null; });
  var minPpm=ppmVals.length?Math.min.apply(null, ppmVals):null;
  function row(label, fn, bestFn){
    var cells=prods.map(function(p){ var b=bestFn&&bestFn(p)?" best":""; return '<div class="cmp-c'+b+'">'+fn(p)+'</div>'; }).join("");
    return '<div class="cmp-row" style="grid-template-columns:'+gtc+'"><div class="cmp-rl">'+label+'</div>'+cells+'</div>';
  }
  var header='<div class="cmp-head-row" style="grid-template-columns:'+gtc+'"><div class="cmp-hl"></div>'+
    prods.map(function(p){
      return '<div class="cmp-hc"><div class="vshotwrap">'+vialHTML(p)+'</div><div class="cmp-nm">'+p.name+'</div>'+
        '<span class="cmp-price">'+fmt(p.price)+'</span><button class="cmp-add" data-add="'+p.id+'">Add to cart</button>'+
        '<span class="cmp-rm" data-cmpremove="'+p.id+'">Remove</span></div>';
    }).join("")+'</div>';
  var body=
    row("Category", function(p){ return cap(p.cat); })+
    row("Vial size", function(p){ return p.size; })+
    row("Price", function(p){ return fmt(p.price); }, function(p){ return p.price===minPr; })+
    row("Price / mg", function(p){ var v=ppm(p); return v!=null?fmt(v):"\u2014"; }, function(p){ var v=ppm(p); return v!=null && minPpm!=null && Math.abs(v-minPpm)<1e-9; })+
    row("HPLC purity", function(p){ return p.purity; }, function(p){ return parseFloat(p.purity)===maxPur; })+
    row("Identity", function(p){ return p.identity; })+
    row("Endotoxin", function(p){ return p.endo; })+
    row("Rating", function(p){ return p.rating.toFixed(1)+" ("+p.reviews+")"; }, function(p){ return p.rating===maxRt; })+
    row("CAS", function(p){ return p.cas.replace("CAS ",""); })+
    row("Storage", function(p){ return p.supply?"Room temp":"\u221220\u00b0C"; })+
    row("Availability", function(p){ return p.stock==="low"?"Low stock":"In stock"; });
  return '<div class="cmp-grid">'+header+body+'</div>';
}
function openCompareModal(){
  if(compare.length<2) return;
  cmpBody.innerHTML=buildCompareHTML();
  cmpEl.classList.add("open"); cmpBackdrop.classList.add("open"); cmpEl.setAttribute("aria-hidden","false");
  document.body.classList.add("lock"); cmpOpen=true;
}
function closeCompare(){
  cmpEl.classList.remove("open"); cmpBackdrop.classList.remove("open"); cmpEl.setAttribute("aria-hidden","true"); cmpOpen=false;
  if(!drawer.classList.contains("open") && !qvOpen && !coaOpen) document.body.classList.remove("lock");
}
ctThumbs.addEventListener("click", function(e){ var x=e.target.closest("[data-ctx]"); if(x) setCompare(x.getAttribute("data-ctx"), false); });
document.getElementById("ctClear").addEventListener("click", function(){ compare.slice().forEach(function(id){ setCompare(id, false); }); });
ctGo.addEventListener("click", openCompareModal);
document.getElementById("cmpClose").addEventListener("click", closeCompare);
cmpBackdrop.addEventListener("click", closeCompare);
cmpBody.addEventListener("click", function(e){
  var add=e.target.closest("[data-add]"); if(add){ addToCart(add.getAttribute("data-add"), 1, add); return; }
  var rm=e.target.closest("[data-cmpremove]"); if(rm){ setCompare(rm.getAttribute("data-cmpremove"), false); if(compare.length<2) closeCompare(); else cmpBody.innerHTML=buildCompareHTML(); }
});

/* ---- sample COA ---- */
var coaEl=document.getElementById("coa");
var coaBackdrop=document.getElementById("coaBackdrop");
var coaBody=document.getElementById("coaBody");
var coaOpen=false;
function hplcSVG(p){
  var seed=0,i; for(i=0;i<p.name.length;i++) seed=(seed*31+p.name.charCodeAt(i))>>>0;
  function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  var W=520,H=130, base=H-20, left=22, right=W-14, span=right-left, maxH=base-16;
  var peaks=[
    {c:0.15,h:0.035+rnd()*0.03,w:7},{c:0.27,h:0.05+rnd()*0.045,w:6},
    {c:0.41,h:0.03+rnd()*0.025,w:6},{c:0.60,h:1.0,w:10},
    {c:0.73,h:0.045+rnd()*0.035,w:7},{c:0.85,h:0.03+rnd()*0.02,w:6}
  ];
  var d='', x, fx, y, k, py, pk, dx;
  for(x=left;x<=right;x++){
    fx=(x-left)/span; y=0;
    for(k=0;k<peaks.length;k++){ pk=peaks[k]; dx=(fx-pk.c)*span; y+=pk.h*Math.exp(-(dx*dx)/(2*pk.w*pk.w)); }
    py=base - Math.min(1.02,y)*maxH;
    d += (x===left?'M':'L')+x+' '+py.toFixed(1)+' ';
  }
  var area=d+'L'+right+' '+base+' L'+left+' '+base+' Z';
  var mainX=left+0.60*span, apexY=base-maxH;
  var ticks='';
  for(i=0;i<=6;i++){ var tx=left+span*i/6;
    ticks+='<line x1="'+tx.toFixed(1)+'" y1="'+base+'" x2="'+tx.toFixed(1)+'" y2="'+(base+4)+'" stroke="rgba(231,192,106,.35)" stroke-width="1"/>'+
      '<text x="'+tx.toFixed(1)+'" y="'+(base+14)+'" font-family="monospace" font-size="8" fill="#9b9384" text-anchor="middle">'+(i*2.5).toFixed(1)+'</text>';
  }
  var svg='<svg viewBox="0 0 '+W+' '+H+'" fill="none">'+
    '<defs><linearGradient id="hpA" x1="0" y1="'+(apexY-6)+'" x2="0" y2="'+base+'" gradientUnits="userSpaceOnUse">'+
      '<stop offset="0" stop-color="rgba(231,192,106,.30)"/><stop offset="1" stop-color="rgba(231,192,106,0)"/></linearGradient>'+
    '<linearGradient id="hpL" x1="'+left+'" y1="0" x2="'+right+'" y2="0" gradientUnits="userSpaceOnUse">'+
      '<stop offset="0" stop-color="#cf9f4a"/><stop offset=".55" stop-color="#f6e1a4"/><stop offset="1" stop-color="#cf9f4a"/></linearGradient></defs>'+
    '<line x1="'+left+'" y1="'+base+'" x2="'+right+'" y2="'+base+'" stroke="rgba(231,192,106,.45)" stroke-width="1"/>'+
    ticks+
    '<path d="'+area+'" fill="url(#hpA)"/>'+
    '<path d="'+d+'" stroke="url(#hpL)" stroke-width="1.6" stroke-linejoin="round"/>'+
    '<line x1="'+mainX.toFixed(1)+'" y1="'+(apexY-2)+'" x2="'+mainX.toFixed(1)+'" y2="'+base+'" stroke="rgba(231,192,106,.5)" stroke-width="1" stroke-dasharray="2 3"/>'+
    '<circle cx="'+mainX.toFixed(1)+'" cy="'+apexY.toFixed(1)+'" r="2.6" fill="#fffaef" stroke="#cf9f4a" stroke-width="1"/>'+
    '<text x="'+(mainX+7).toFixed(1)+'" y="'+(apexY+3).toFixed(1)+'" font-family="monospace" font-size="9" font-weight="600" fill="#e7c06a">'+p.purity+'</text>'+
    '<text x="'+left+'" y="12" font-family="monospace" font-size="8" fill="#9b9384">mAU</text>'+
    '<text x="'+right+'" y="'+(base+14)+'" font-family="monospace" font-size="8" fill="#9b9384" text-anchor="end">min</text>'+
    '</svg>';
  return '<div class="coa-chart"><div class="coa-chart-head"><span>RP-HPLC chromatogram</span>'+
    '<span class="mono">C18 \u00b7 214 nm \u00b7 1.0 mL/min</span></div>'+svg+'</div>';
}
function sealSVG(){
  return '<svg viewBox="0 0 100 100" fill="none">'+
   '<defs>'+
    '<radialGradient id="csDisc" cx="42%" cy="34%" r="72%"><stop offset="0" stop-color="#fdeec0"/><stop offset=".5" stop-color="#e7c06a"/><stop offset="1" stop-color="#a9792f"/></radialGradient>'+
    '<linearGradient id="csRim" x1="0" y1="0" x2="0" y2="100"><stop offset="0" stop-color="#f6e1a4"/><stop offset="1" stop-color="#b9852f"/></linearGradient>'+
    '<path id="csTop" d="M20 50 A30 30 0 0 1 80 50"/>'+
    '<path id="csBot" d="M23 50 A27 27 0 0 0 77 50"/>'+
   '</defs>'+
   '<circle cx="50" cy="50" r="47" stroke="url(#csRim)" stroke-width="1.4"/>'+
   '<circle cx="50" cy="50" r="43.5" stroke="url(#csRim)" stroke-width="2.6" stroke-dasharray="1.3 3" opacity=".9"/>'+
   '<circle cx="50" cy="50" r="34" fill="url(#csDisc)"/>'+
   '<circle cx="50" cy="50" r="34" stroke="#7d5a22" stroke-width=".6" opacity=".45"/>'+
   '<circle cx="50" cy="50" r="29.5" stroke="#fff4d4" stroke-width=".7" opacity=".5"/>'+
   '<text font-family="monospace" font-size="6.6" font-weight="600" letter-spacing="1.1" fill="#3a2a0e"><textPath href="#csTop" startOffset="50%" text-anchor="middle">ELYRIA BIO</textPath></text>'+
   '<text font-family="monospace" font-size="5.4" font-weight="600" letter-spacing="1" fill="#3a2a0e"><textPath href="#csBot" startOffset="50%" text-anchor="middle">CERTIFIED</textPath></text>'+
   '<path d="M41 50.5l5.4 5.6L60 43" stroke="#3a2a0e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
   '</svg>';
}
function coaDocHTML(p){
  var li=lotInfo(p);
  var rows=[["Appearance","White to off-white lyophilized powder"],["Identity (ESI-MS)",p.identity],["Purity (RP-HPLC)",p.purity],["Single impurity (max)","< 0.5%"],["Endotoxin (LAL)",p.endo],["Water content (KF)","< 6.0%"],["Net peptide content","\u2265 80%"],["Acetate counterion","Conforms"]];
  var trs=rows.map(function(r){ return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="coa-pass">Pass</td></tr>'; }).join("");
  return '<div class="coa-doc">'+
    '<div class="coa-top"><div><div class="coa-brand"><span class="glyph"><svg viewBox="0 0 30 30" fill="none"><defs><linearGradient id="elgc" x1="4" y1="4" x2="26" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#fdeec0"/><stop offset=".5" stop-color="#e7c06a"/><stop offset="1" stop-color="#a9792f"/></linearGradient></defs><path d="M6 5C16.5 9 13.5 21 24 25" stroke="url(#elgc)" stroke-width="1.5" stroke-linecap="round"/><path d="M24 5C13.5 9 16.5 21 6 25" stroke="url(#elgc)" stroke-width="1.5" stroke-linecap="round"/></svg></span>Elyria<span class="brand-b">Bio</span></div>'+
      '<div class="coa-kicker">Certificate of Analysis \u00b7 Research Use Only</div>'+
      '<div class="coa-title">'+p.name+'</div><div class="coa-subcas mono">'+p.cas+" \u00b7 "+p.size+'</div></div>'+
      '<div class="coa-stamp"><div class="cs-k">Verified lot</div><div class="cs-v mono">'+li.lot+'</div><div class="cs-tick">✓ QC released</div></div></div>'+
    '<div class="coa-meta">'+
      '<div class="m"><div class="mk">Lot / Batch</div><div class="mv">'+li.lot+'</div></div>'+
      '<div class="m"><div class="mk">Analysis date</div><div class="mv">'+li.assay+'</div></div>'+
      '<div class="m"><div class="mk">Retest / Expiry</div><div class="mv">'+li.exp+'</div></div>'+
      '<div class="m"><div class="mk">Storage</div><div class="mv">\u221220\u00b0C, desiccated</div></div></div>'+
    hplcSVG(p)+
    '<table class="coa-tests"><thead><tr><th>Test</th><th>Result</th><th>Disposition</th></tr></thead><tbody>'+trs+'</tbody></table>'+
    '<div class="coa-foot"><div><div class="coa-sign">A. Veyra</div><div class="coa-sign-l">QC Release \u00b7 Independent US laboratory</div></div>'+
      '<div class="coa-seal">'+sealSVG()+'</div></div></div>'+
    '<div class="coa-actions"><button class="coa-dl" id="coaDl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>Download PDF</button>'+
      '<button class="coa-secondary" id="coaToVerif">How we verify</button></div>'+
    '<p class="coa-note">Representative certificate generated from catalog specifications for demonstration. Each shipped vial includes its own signed third-party COA matching its physical lot number. Research Use Only \u2014 not for human or veterinary use.</p>';
}
function openCOA(id){
  var p=product(id); if(!p || p.supply) return;
  function build(){
  coaBody.innerHTML=coaDocHTML(p);
  coaEl.classList.add("open"); coaBackdrop.classList.add("open"); coaEl.setAttribute("aria-hidden","false");
  document.body.classList.add("lock"); coaOpen=true;
  document.getElementById("coaDl").addEventListener("click", function(){ printCOA(p); });
  document.getElementById("coaToVerif").addEventListener("click", function(){ closeCOA(); closeQuick(); var v=document.getElementById("verification"); if(v) scrollToEl(v); });
  coaBody.setAttribute("data-pid", id);
  if(window.LabHooks && window.LabHooks.coa) window.LabHooks.coa(id);
  }
  svt(build);
}
function closeCOA(){
  if(window.LabHooks && window.LabHooks.closeCOA) window.LabHooks.closeCOA();
  function done(){ coaEl.classList.remove("open"); coaBackdrop.classList.remove("open"); coaEl.setAttribute("aria-hidden","true"); coaOpen=false;
    if(!drawer.classList.contains("open") && !qvOpen && !cmpOpen) document.body.classList.remove("lock"); }
  svt(done);
}
document.getElementById("coaClose").addEventListener("click", closeCOA);
coaBackdrop.addEventListener("click", closeCOA);
function printCOA(p){
  var li=lotInfo(p);
  var rows=[["Appearance","White to off-white lyophilized powder"],["Identity (ESI-MS)",p.identity],["Purity (RP-HPLC)",p.purity],["Single impurity (max)","< 0.5%"],["Endotoxin (LAL)",p.endo],["Water content (KF)","< 6.0%"],["Net peptide content","&#8805; 80%"],["Acetate counterion","Conforms"]];
  var trs=rows.map(function(r){ return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="p">Pass</td></tr>'; }).join("");
  var doc='<!doctype html><html><head><meta charset="utf-8"><title>COA '+p.name+" "+li.lot+'</title><style>'+
    'body{font-family:Georgia,serif;color:#10201c;max-width:720px;margin:32px auto;padding:0 28px;line-height:1.5}'+
    '.h{border-bottom:2px solid #10201c;padding-bottom:14px}.b{font-size:22px;font-weight:600}'+
    '.k{font-family:monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#5a7a72;margin-top:8px}'+
    '.t{font-size:22px;margin-top:2px}.cas{font-family:monospace;font-size:12px;color:#5a7a72}'+
    '.meta{display:flex;gap:26px;flex-wrap:wrap;font-family:monospace;font-size:12px;margin:16px 0}'+
    '.meta div span{display:block;color:#5a7a72;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px}'+
    'table{width:100%;border-collapse:collapse;margin:18px 0;font-family:monospace;font-size:13px}'+
    'th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #cfe0db}'+
    'th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5a7a72}.p{color:#b9954e;font-weight:700}'+
    '.sg{margin-top:24px;border-top:1px solid #cfe0db;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end}'+
    '.si{font-style:italic;font-size:22px}.note{font-size:10px;color:#5a7a72;margin-top:22px;line-height:1.5}'+
    '</style></head><body>'+
    '<div class="h"><div class="b">Elyria Bio</div><div class="k">Certificate of Analysis &#183; Research Use Only</div>'+
      '<div class="t">'+p.name+'</div><div class="cas">'+p.cas+" &#183; "+p.size+'</div></div>'+
    '<div class="meta"><div><span>Lot / Batch</span>'+li.lot+'</div><div><span>Analysis date</span>'+li.assay+'</div>'+
      '<div><span>Retest / Expiry</span>'+li.exp+'</div><div><span>Storage</span>&#8722;20&#176;C desiccated</div></div>'+
    '<table><thead><tr><th>Test</th><th>Result</th><th>Disposition</th></tr></thead><tbody>'+trs+'</tbody></table>'+
    '<div class="sg"><div><div class="si">A. Veyra</div><div class="k">QC Release &#183; Independent US laboratory</div></div>'+
      '<div class="p" style="font-family:monospace">VERIFIED &#10003;</div></div>'+
    '<div class="note">Representative certificate generated from catalog specifications for demonstration. Each shipped vial includes its own signed third-party COA matching its physical lot. Research Use Only &#8212; not for human or veterinary use.</div>'+
    '</body></html>';
  var win=window.open("","_blank","width=820,height=1040");
  if(!win){ alert("Allow pop-ups to download the COA as a PDF."); return; }
  win.document.write(doc); win.document.close(); win.focus();
  setTimeout(function(){ try{ win.print(); }catch(e){} }, 420);
}

/* ===================== INIT ===================== */
if(compare.length>4) compare=compare.slice(0,4);
window.product = product;
readURL();
/* ---- referral capture + first-order 10% discount (affiliate links) ---- */
(function refInit(){
  var REF_DISCOUNT=0.10, fresh=null;
  try{ fresh=new URLSearchParams(location.search).get("ref"); }catch(e){}
  if(fresh) fresh=fresh.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,24);
  if(fresh){ save("elyria_ref", {code:fresh.toUpperCase(), ts:Date.now()}); }
  var stored=load("elyria_ref", null), ordered=load("elyria_has_ordered", 0);
  if(stored && stored.code && !ordered){
    var rc=String(stored.code).replace(/[^a-zA-Z0-9_-]/g,"").slice(0,24).toUpperCase();
    CODES[rc]={type:"pct", val:REF_DISCOUNT, label:"Referral "+rc+" \u00b7 10% off first order", ref:true};
    var cur=CODES[appliedCode];
    if(!cur || cur.ref || (cur.type==="pct" && cur.val<REF_DISCOUNT)){ appliedCode=rc; save("elyria_promo", rc); }
    if(fresh){ setTimeout(function(){ toast({html:'<div class="t-body"><div class="t-title"><svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4 10-10"/></svg>You\u2019ve been referred</div><div class="t-sub">Enjoy 10% off your first order \u2014 applied at checkout.</div></div>', duration:6000}); }, 900); }
  }
})();
try{ if(new URLSearchParams(location.search).get("cart")==="open"){ setTimeout(function(){ openCart(); }, 350); } }catch(e){}
applyTweaks();
renderCart();
renderRecent();
renderCompareTray();
sortCards(sortSelect.value);
setExpanded(true);
if(advActive() && advFilters){ advFilters.hidden=false; if(filtersToggle){ filtersToggle.classList.add("on"); filtersToggle.setAttribute("aria-expanded","true"); } }
setFilter(currentFilter);

/* export a small API for the catalog UX layer (catalog-plus.js) */
try{ window.ElyriaStore = { openQuick:openQuick, openCart:openCart, product:product, PRODUCTS:PRODUCTS, computeTotals:computeTotals, fmt:fmt, POPULAR:POPULAR, FREE_SHIP:FREE_SHIP }; }catch(e){}
})();

/* ============================================================
   MOBILE BOTTOM TAB BAR (storefront homepage)
   ============================================================ */
(function(){
  if(document.querySelector(".mtabbar")) return;
  function cartSum(){ try{ var c=JSON.parse(localStorage.getItem("elyria_cart")||"{}"),n=0; for(var k in c) n+=c[k]; return n; }catch(e){ return 0; } }
  var IC={
    shop:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
    account:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'
  };
  var bar=document.createElement("nav");
  bar.className="mtabbar"; bar.setAttribute("aria-label","Primary");
  bar.innerHTML=
    '<a data-tab="shop" class="on" href="#catalog">'+IC.shop+'Shop</a>'+
    '<button type="button" data-tab="search">'+IC.search+'Search</button>'+
    '<button type="button" data-tab="cart">'+IC.cart+'<span class="mt-badge" id="mtBadge"></span>Cart</button>'+
    '<a data-tab="account" href="account.html">'+IC.account+'Account</a>';
  document.body.appendChild(bar);
  bar.querySelector('[data-tab="search"]').addEventListener("click", function(){
    if(window.ElyriaSearch && window.ElyriaSearch.open) window.ElyriaSearch.open();
    else { var el=document.getElementById("catalog"); if(el){ var r=el.getBoundingClientRect(); window.scrollTo({top:r.top+window.pageYOffset-70,behavior:"smooth"}); } }
  });
  bar.querySelector('[data-tab="cart"]').addEventListener("click", function(){
    var cb=document.getElementById("cartBtn"); if(cb) cb.click();
  });
  function paintBadge(){ var n=cartSum(), b=document.getElementById("mtBadge"); if(!b) return; if(n>0){ b.textContent=n>99?"99+":n; b.classList.add("show"); } else { b.textContent=""; b.classList.remove("show"); } }
  paintBadge();
  window.addEventListener("storage", function(e){ if(e.key==="elyria_cart") paintBadge(); });
  document.addEventListener("click", function(e){ if(e.target.closest && e.target.closest("[data-add],.add-btn,[data-step],[data-rv],.li-stepper button")) setTimeout(paintBadge,90); }, true);
})();

/* footer year */
document.querySelectorAll("[data-year]").forEach(function(el){ el.textContent = new Date().getFullYear(); });
