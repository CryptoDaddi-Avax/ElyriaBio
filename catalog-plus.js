/* ============================================================
   ELYRIA BIO — CATALOG UX LAYER
   Additive to store.js. Uses globals it already exposes
   (cart, computeTotals, openCart, fmt, product, PRODUCTS,
   openQuick, setFilter, searchInput). No core rewrites.
     · sticky mini-cart pill (desktop) with free-ship nudge
     · smart "did you mean" empty-state suggestions
   ============================================================ */
(function(){
  "use strict";

  function S(){ return window.ElyriaStore || {}; }
  function cartObj(){ try{ return (window.cart && typeof window.cart==="object") ? window.cart : JSON.parse(localStorage.getItem("elyria_cart")||"{}"); }catch(e){ return {}; } }
  function money(n){ var f=S().fmt; return (typeof f==="function") ? f(n) : "$"+(Number(n)||0).toFixed(2); }

  /* ---------------- sticky mini-cart pill ---------------- */
  var pill = document.createElement("button");
  pill.className = "mini-cart";
  pill.id = "miniCart";
  pill.hidden = true;
  pill.setAttribute("aria-label", "Open cart");
  pill.innerHTML =
    '<span class="mc-ic"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7" aria-hidden="true"><path d="M3 4h2l2.5 12.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6"/><circle cx="9.5" cy="20" r="1.2"/><circle cx="17.5" cy="20" r="1.2"/></svg><span class="mc-badge" id="mcBadge">0</span></span>'+
    '<span class="mc-body"><span class="mc-line"><span class="mc-count" id="mcCount">0 vials</span><span class="mc-sub" id="mcSub">$0.00</span></span>'+
    '<span class="mc-meter"><span class="mc-fill" id="mcFill"></span></span>'+
    '<span class="mc-nudge" id="mcNudge"></span></span>'+
    '<span class="mc-cta">View cart<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>';
  document.addEventListener("DOMContentLoaded", function(){ if(!document.getElementById("miniCart")) document.body.appendChild(pill); });
  if(document.readyState!=="loading" && !document.getElementById("miniCart")) document.body.appendChild(pill);

  pill.addEventListener("click", function(){ var oc=S().openCart; if(typeof oc==="function") oc(); else { var b=document.getElementById("cartBtn"); if(b) b.click(); } });

  var FREE = (typeof S().FREE_SHIP==="number") ? S().FREE_SHIP : 150;

  function totals(){
    var ct=S().computeTotals;
    if(typeof ct==="function"){ try{ return ct(); }catch(e){} }
    var c=cartObj(), count=0, subtotal=0, prod=S().product;
    for(var k in c){ var id=String(k).split("|")[0]; var p=(typeof prod==="function")?prod(id):null; if(!p) continue; count+=c[k]; subtotal+=p.price*c[k]; }
    return {count:count, subtotal:subtotal, discount:0, total:subtotal, shipping:0};
  }

  function update(){
    var t = totals();
    var locked = document.body.classList.contains("lock");
    var badge=document.getElementById("mcBadge"), cnt=document.getElementById("mcCount"), sub=document.getElementById("mcSub");
    var fill=document.getElementById("mcFill"), nudge=document.getElementById("mcNudge");
    if(!t || t.count===0 || locked){ pill.classList.remove("show"); pill.hidden=true; return; }
    var net = t.subtotal - (t.discount||0);
    if(badge){ badge.textContent = t.count>99?"99+":t.count; }
    if(cnt){ cnt.textContent = t.count + (t.count===1?" vial":" vials"); }
    if(sub){ sub.textContent = money(t.total!=null ? t.total : net); }
    var pct = Math.min(100, (net/FREE)*100);
    if(fill){ fill.style.width = pct+"%"; }
    var remain = Math.max(0, FREE - net);
    if(nudge){
      if(remain<=0){ nudge.innerHTML='<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg>Free shipping unlocked'; nudge.classList.add("done"); }
      else{ nudge.textContent = money(remain)+" to free shipping"; nudge.classList.remove("done"); }
    }
    pill.hidden=false;
    requestAnimationFrame(function(){ pill.classList.add("show"); });
  }

  document.addEventListener("cart:change", update);
  window.addEventListener("storage", function(e){ if(e.key==="elyria_cart") update(); });
  window.addEventListener("load", update);
  document.addEventListener("DOMContentLoaded", update);
  try{ new MutationObserver(update).observe(document.body, {attributes:true, attributeFilter:["class"]}); }catch(e){}
  /* safety catch for any add path that doesn't emit cart:change */
  document.addEventListener("click", function(e){ if(e.target.closest && e.target.closest("[data-add],.add-btn,[data-rvadd],.li-stepper button,[data-dstep],[data-remove]")) setTimeout(update, 120); }, true);

  /* ---------------- smart "did you mean" empty state -------------- */
  var nrSuggest = document.getElementById("nrSuggest");

  function lev(a,b){
    a=a||""; b=b||""; var m=a.length,n=b.length; if(!m) return n; if(!n) return m;
    var prev=[],cur=[],i,j; for(j=0;j<=n;j++) prev[j]=j;
    for(i=1;i<=m;i++){ cur[0]=i; for(j=1;j<=n;j++){ var cost=a.charCodeAt(i-1)===b.charCodeAt(j-1)?0:1; cur[j]=Math.min(prev[j]+1, cur[j-1]+1, prev[j-1]+cost); } for(j=0;j<=n;j++) prev[j]=cur[j]; }
    return prev[n];
  }
  function bestDist(term, p){
    var name=(p.name||"").toLowerCase();
    if(name.indexOf(term)>-1) return 0;
    var best = lev(term, name);
    name.split(/[\s\-\/]+/).forEach(function(tok){ if(tok){ var d=lev(term, tok); if(d<best) best=d; if(tok.indexOf(term)===0) best=Math.min(best,1); } });
    var hay=((p.cas||"")+" "+(p.cat||"")+" "+(p.desc||"")).toLowerCase();
    if(hay.indexOf(term)>-1) best=Math.min(best,1);
    return best;
  }

  function renderEmpty(term){
    if(!nrSuggest) nrSuggest=document.getElementById("nrSuggest");
    if(!nrSuggest) return;
    var LIST = (S().PRODUCTS||window.PRODUCTS||[]);
    var prod = S().product;
    var picks;
    if(term){
      var tol = Math.max(2, Math.floor(term.length/3)+1);
      picks = LIST.map(function(p){ return {p:p, d:bestDist(term, p)}; })
        .filter(function(x){ return x.d<=tol; })
        .sort(function(a,b){ return a.d-b.d || a.p.name.localeCompare(b.p.name); })
        .slice(0,4).map(function(x){ return x.p; });
    }
    var heading, fallback=false;
    if(picks && picks.length){ heading = "Did you mean"; }
    else {
      heading = "Popular right now";
      fallback = true;
      var pop = S().POPULAR || window.POPULAR || ["ghkcu","bpc157","ipa","tirz","nad","tb500"];
      picks = pop.map(function(id){ return (typeof prod==="function")?prod(id):null; }).filter(Boolean).slice(0,4);
    }
    if(!picks.length){ nrSuggest.hidden=true; nrSuggest.innerHTML=""; return; }
    nrSuggest.hidden=false;
    nrSuggest.innerHTML = '<span class="nr-h">'+heading+'</span><div class="nr-chips">'+ picks.map(function(p){
      return '<button class="nr-chip" data-nrpick="'+p.id+'"><span class="nr-nm">'+p.name+'</span><span class="nr-pr">'+money(p.price)+'</span></button>';
    }).join("") + '</div>';
  }

  if(nrSuggest || document.getElementById("noResults")){
    document.addEventListener("catalog:empty", function(e){ renderEmpty(e.detail && e.detail.term); });
    document.addEventListener("catalog:filled", function(){ var el=document.getElementById("nrSuggest"); if(el){ el.hidden=true; el.innerHTML=""; } });
    document.addEventListener("click", function(e){
      var c = e.target.closest && e.target.closest("[data-nrpick]");
      if(!c) return;
      var id = c.getAttribute("data-nrpick");
      var oq=S().openQuick;
      if(typeof oq==="function") oq(id);
    });
  }

  update();
})();
