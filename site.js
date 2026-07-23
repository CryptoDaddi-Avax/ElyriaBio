/* ============================================================
   ELYRIA BIO — SHARED SITE LAYER (sub-pages)
   Lightweight chrome behavior for every page that is NOT the
   storefront homepage. Shares the cart via the same localStorage
   key ("elyria_cart") that store.js uses, so counts stay in sync.
   ============================================================ */
(function(){
"use strict";
window.addEventListener('unhandledrejection', function(e){
  var r = e.reason;
  if(r && /transition was skipped/i.test((r.message||r)+'')) e.preventDefault();
});
var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var finePointer = window.matchMedia("(pointer:fine)").matches;
var HOME = document.body.getAttribute("data-home") || "../index.html";

function load(k, fb){ try{ var v=localStorage.getItem(k); return v==null?fb:JSON.parse(v); }catch(e){ return fb; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function $(id){ return document.getElementById(id); }

/* neutralize any homepage load-gating that hides chrome until .loaded */
document.body.classList.add("loaded");

/* ---- nav solidify on scroll ---- */
var nav = $("nav");
function onScroll(){ if(!nav) return; if(window.pageYOffset>30) nav.classList.add("solid"); else nav.classList.remove("solid"); }
window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

/* ---- promo bar dismiss (shared) ---- */
var promobar = $("promobar");
if(promobar){
  if(load("elyria_promobar_dismissed",0)) promobar.classList.add("hide");
  var pc = $("promoClose");
  if(pc) pc.addEventListener("click", function(){ promobar.classList.add("hide"); save("elyria_promobar_dismissed",1); });
}

/* ---- mobile nav ---- */
var mobileNav = $("mobileNav"), hamburger = $("hamburger");
function openMobile(){ if(!mobileNav) return; mobileNav.classList.add("open"); hamburger.setAttribute("aria-expanded","true"); document.body.classList.add("lock"); }
function closeMobile(){ if(!mobileNav) return; mobileNav.classList.remove("open"); if(hamburger) hamburger.setAttribute("aria-expanded","false"); document.body.classList.remove("lock"); }
if(hamburger) hamburger.addEventListener("click", openMobile);
var mClose = $("mClose"); if(mClose) mClose.addEventListener("click", closeMobile);
document.querySelectorAll("[data-mlink]").forEach(function(a){ a.addEventListener("click", closeMobile); });
document.addEventListener("keydown", function(e){ if(e.key==="Escape") closeMobile(); });

/* ---- search → redirect to homepage catalog ---- */
var searchForm = $("searchForm"), searchInput = $("searchInput");
if(searchForm){
  searchForm.addEventListener("submit", function(e){
    e.preventDefault();
    var q = (searchInput && searchInput.value.trim()) || "";
    window.location.href = HOME + (q ? ("?q=" + encodeURIComponent(q)) : "#catalog");
  });
}

/* ---- cart badge (shared with store.js) ---- */
var cartCount = $("cartCount");
function cartTotal(){ var c=load("elyria_cart",{}), n=0; for(var k in c){ if(c.hasOwnProperty(k)) n+=c[k]; } return n; }
function paintCart(bump){
  if(!cartCount) return;
  cartCount.textContent = cartTotal();
  if(bump){ cartCount.classList.remove("bump"); void cartCount.offsetWidth; cartCount.classList.add("bump"); }
}
paintCart(false);
// cart button → open the homepage drawer
var cartBtn = $("cartBtn");
if(cartBtn) cartBtn.addEventListener("click", function(){ window.location.href = HOME + "?cart=open"; });
// keep in sync if another tab changes the cart
window.addEventListener("storage", function(e){ if(e.key==="elyria_cart") paintCart(true); });

/* ---- toasts ---- */
var toastWrap = $("toasts");
function toast(html, ms){
  if(!toastWrap) return;
  var el=document.createElement("div"); el.className="toast"; el.innerHTML=html;
  toastWrap.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add("in"); });
  var t=setTimeout(close, ms||3600);
  function close(){ clearTimeout(t); el.classList.remove("in"); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 380); }
  el.querySelectorAll("[data-toast-home]").forEach(function(b){ b.addEventListener("click", function(){ window.location.href = HOME + "?cart=open"; }); });
  return el;
}

/* ---- referral capture (any page; supports per-product deep links) ---- */
(function(){
  var ref=null; try{ ref=new URLSearchParams(location.search).get("ref"); }catch(e){}
  if(ref) ref=ref.replace(/[^a-zA-Z0-9_-]/g,"").slice(0,24);
  if(ref){
    save("elyria_ref", {code:ref.toUpperCase(), ts:Date.now()});
    toast('<div class="t-body"><div class="t-title"><svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4 10-10"/></svg>You\u2019ve been referred</div><div class="t-sub">10% off your first order \u2014 applied at checkout.</div></div>', 6000);
  }
})();

/* ---- shared add-to-cart for product pages ---- */
window.elyriaAdd = function(id, qty, name, btn){
  qty = qty||1;
  var cart = load("elyria_cart", {});
  cart[id] = (cart[id]||0) + qty;
  save("elyria_cart", cart);
  paintCart(true);
  if(cartBtn){ cartBtn.classList.remove("pulse"); void cartBtn.offsetWidth; cartBtn.classList.add("pulse"); }
  if(btn){
    var orig = btn.innerHTML;
    btn.classList.add("added");
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg>Added';
    setTimeout(function(){ btn.classList.remove("added"); btn.innerHTML = orig; }, 1100);
  }
  toast(
    '<div class="t-body"><div class="t-title"><svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4 10-10"/></svg>Added to cart</div>'+
    '<div class="t-sub">'+(qty>1?qty+"\u00d7 ":"")+(name||"Item")+'</div></div>'+
    '<div class="t-acts"><button data-toast-home>View cart</button></div>'
  );
};

/* ---- product page quantity stepper + add ---- */
document.querySelectorAll("[data-pdp]").forEach(function(scope){
  var id = scope.getAttribute("data-pdp");
  var name = scope.getAttribute("data-name") || "Item";
  var q = 1;
  var qEl = scope.querySelector("[data-pdp-qty]");
  scope.querySelectorAll("[data-pdp-step]").forEach(function(b){
    b.addEventListener("click", function(){ q = Math.max(1, q + parseInt(b.getAttribute("data-pdp-step"),10)); if(qEl) qEl.textContent = q; });
  });
  var addBtn = scope.querySelector("[data-pdp-add]");
  if(addBtn) addBtn.addEventListener("click", function(){ window.elyriaAdd(id, q, name, addBtn); });
});

/* ---- reveals ---- */
var revealEls = Array.prototype.slice.call(document.querySelectorAll(".rv"));
if("IntersectionObserver" in window && !reduce){
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add("in"); io.unobserve(en.target); } });
  }, {threshold:0.12, rootMargin:"0px 0px -5% 0px"});
  revealEls.forEach(function(el){ io.observe(el); });
} else revealEls.forEach(function(el){ el.classList.add("in"); });

/* ---- magnetic cursor (idle-aware) ---- */
var dot = $("cursorDot"), ringEl = $("cursorRing");
if(finePointer && !reduce && dot && ringEl){
  var mouse={x:innerWidth/2,y:innerHeight/2}, ringp={x:mouse.x,y:mouse.y};
  var rafId = 0;
  function tick(){
    rafId = 0;
    dot.style.transform="translate("+mouse.x+"px,"+mouse.y+"px) translate(-50%,-50%)";
    ringp.x+=(mouse.x-ringp.x)*0.18; ringp.y+=(mouse.y-ringp.y)*0.18;
    ringEl.style.transform="translate("+ringp.x+"px,"+ringp.y+"px) translate(-50%,-50%)";
    var dx=mouse.x-ringp.x, dy=mouse.y-ringp.y;
    if(dx*dx+dy*dy > 0.25) rafId = requestAnimationFrame(tick);
  }
  function kick(){ if(!rafId) rafId = requestAnimationFrame(tick); }
  document.addEventListener("mousemove", function(e){ mouse.x=e.clientX; mouse.y=e.clientY; dot.style.opacity="1"; ringEl.style.opacity="1"; kick(); }, {passive:true});
  document.addEventListener("mouseleave", function(){ dot.style.opacity="0"; ringEl.style.opacity="0"; });
  document.addEventListener("mouseover", function(e){ var hot=e.target.closest("a,button,input,label,.magnetic,.rcard,.specs-row"); dot.classList.toggle("hot",!!hot); ringEl.classList.toggle("hot",!!hot); });
}

/* ---- footer year ---- */
document.querySelectorAll("[data-year]").forEach(function(el){ el.textContent = new Date().getFullYear(); });

/* ---- contact form (stub) ---- */
var cf = $("contactForm");
if(cf){
  cf.addEventListener("submit", function(e){
    e.preventDefault();
    var ok = $("contactOk");
    if(ok){ ok.hidden=false; }
    cf.reset();
  });
}

/* ---- batch lookup (demo) ---- */
var blForm = $("batchForm");
if(blForm){
  var LOTS = window.__ELYRIA_LOTS || {};
  (function(){ try{ var pl=new URLSearchParams(location.search).get("lot"); if(pl){ var bi=$("batchInput"); if(bi){ bi.value=pl; setTimeout(function(){ if(blForm.requestSubmit) blForm.requestSubmit(); else blForm.dispatchEvent(new Event("submit",{cancelable:true})); }, 260); } } }catch(e){} })();
  blForm.addEventListener("submit", function(e){
    e.preventDefault();
    var raw = ($("batchInput").value||"").trim().toUpperCase();
    var rawSafe = String(raw).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; });
    var res = $("batchResult");
    if(!res) return;
    var hit = LOTS[raw];
    if(hit){
      res.hidden=false;
      res.className="batch-result ok";
      res.innerHTML =
        '<div class="br-head"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12l4 4 10-10"/></svg><span>Lot verified</span></div>'+
        '<div class="br-grid">'+
          '<div><span class="brk">Compound</span>'+hit.name+'</div>'+
          '<div><span class="brk">Lot / Batch</span>'+rawSafe+'</div>'+
          '<div><span class="brk">HPLC purity</span>'+hit.purity+'</div>'+
          '<div><span class="brk">Identity</span>Confirmed (MS)</div>'+
          '<div><span class="brk">Assay date</span>'+hit.assay+'</div>'+
          '<div><span class="brk">Retest by</span>'+hit.exp+'</div>'+
        '</div>'+
        '<a class="br-link" href="'+hit.url+'">View product &amp; documentation \u2192</a>';
    } else {
      res.hidden=false;
      res.className="batch-result err";
      res.innerHTML = '<div class="br-head err"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg><span>No record for \u201c'+rawSafe+'\u201d</span></div><p>Check the lot code on your vial or COA. Example format: <b>On file</b>. For help, contact QC support.</p>';
    }
  });
}
})();

/* ============================================================
   MOBILE BOTTOM TAB BAR (customer sub-pages)
   ============================================================ */
(function(){
  if(document.querySelector(".mtabbar")) return;
  var HOME = document.body.getAttribute("data-home") || "../index.html";
  var base = HOME.replace(/index\.html.*$/, "");
  function cartSum(){ try{ var c=JSON.parse(localStorage.getItem("elyria_cart")||"{}"),n=0; for(var k in c) n+=c[k]; return n; }catch(e){ return 0; } }
  var IC={
    shop:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
    search:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    cart:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L20 8H6"/><circle cx="9.5" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>',
    account:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'
  };
  var onAccount=/account\.html$/i.test(location.pathname);
  var bar=document.createElement("nav");
  bar.className="mtabbar"; bar.setAttribute("aria-label","Primary");
  bar.innerHTML=
    '<a data-tab="shop" class="'+(onAccount?"":"on")+'" href="'+base+'index.html#catalog">'+IC.shop+'Shop</a>'+
    '<button type="button" data-tab="search">'+IC.search+'Search</button>'+
    '<button type="button" data-tab="cart">'+IC.cart+'<span class="mt-badge" id="mtBadge"></span>Cart</button>'+
    '<a data-tab="account" class="'+(onAccount?"on":"")+'" href="'+base+'account.html">'+IC.account+'Account</a>';
  document.body.appendChild(bar);
  bar.querySelector('[data-tab="search"]').addEventListener("click", function(){
    if(window.ElyriaSearch && window.ElyriaSearch.open) window.ElyriaSearch.open();
    else location.href=base+"index.html#catalog";
  });
  bar.querySelector('[data-tab="cart"]').addEventListener("click", function(){
    var cb=document.getElementById("cartBtn"); if(cb){ cb.click(); } else { location.href=base+"index.html?cart=open"; }
  });
  function paintBadge(){ var n=cartSum(), b=document.getElementById("mtBadge"); if(!b) return; if(n>0){ b.textContent=n>99?"99+":n; b.classList.add("show"); } else { b.textContent=""; b.classList.remove("show"); } }
  paintBadge();
  window.addEventListener("storage", function(e){ if(e.key==="elyria_cart") paintBadge(); });
  document.addEventListener("click", function(e){ if(e.target.closest && e.target.closest("[data-add],.add-btn,[data-rv]")) setTimeout(paintBadge,80); }, true);
})();
