/* ============================================================
   ELYRIA BIO — ACCOUNT + AFFILIATE APP
   Front-end demo. State persists in localStorage under elyria_*.
   Shares the cart key ("elyria_cart") with store.js / site.js so
   reorders land in the live cart. No backend.
   ============================================================ */
(function(){
"use strict";

/* ---------- storage ---------- */
function load(k, fb){ try{ var v=localStorage.getItem(k); return v==null?fb:JSON.parse(v); }catch(e){ return fb; } }
function save(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function $(id){ return document.getElementById(id); }
function money(n){ return "$"+Number(n).toFixed(2); }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

/* ---------- program config (commission economics) ---------- */
var CONFIG = { firstRate:0.10, recurRate:0.10, refDiscount:0.10, cookieDays:60, minPayout:50 };

/* ---------- warm, randomized member + affiliate messages ---------- */
var AFFILIATE_CHEERS = [
  "Cha-ching! You just earned commission \u2014 beautiful work bringing another lab into the fold.",
  "Look at you go. Another referral came through and there\u2019s commission waiting. Thank you for spreading the word!",
  "Boom \u2014 commission earned. A lab you referred placed an order, and that\u2019s all you. Incredible work.",
  "Someone you sent our way just ordered, and you\u2019ve got fresh commission to show for it. We\u2019re so grateful for you.",
  "Ka-ching! That\u2019s more commission in your pocket. Truly \u2014 thank you for championing us.",
  "Another win. Your link did the work and you\u2019ve earned commission. You\u2019re the kind of partner we dream about."
];
var WARM_LINES = [
  "So glad to have you with us.",
  "We\u2019re really happy you\u2019re here.",
  "Thanks for being part of our little community.",
  "It\u2019s always good to see you.",
  "Grateful you\u2019re here \u2014 make yourself at home."
];
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

/* ---------- demo catalog subset (id must match store.js) ---------- */
var CAT = {
  amino1mq:{name:"5-Amino-1MQ",size:"10 mg",price:39.99,purity:"99.4%"},
  aod:{name:"AOD-9604",size:"10 mg",price:39.99,purity:"99.3%"},
  bacwater:{name:"Bacteriostatic Water",size:"30 mL",price:13.59,purity:"USP"},
  bpc157:{name:"BPC-157",size:"10 mg",price:39.99,purity:"99.4%"},
  wolverine:{name:"BPC-157 / TB-500 Blend",size:"20 mg",price:79.99,purity:"99.3%"},
  cagri:{name:"Cagrilintide",size:"10 mg",price:55.99,purity:"99.2%"},
  cjcipa:{name:"CJC-1295/Ipamorelin",size:"10 mg",price:47.99,purity:"99.3%"},
  dsip:{name:"DSIP",size:"10 mg",price:23.99,purity:"99.5%"},
  epi:{name:"Epithalon",size:"10 mg",price:23.99,purity:"99.7%"},
  ghkcu:{name:"GHK-Cu",size:"50 mg",price:29.99,purity:"99.6%"},
  gluta:{name:"Glutathione",size:"10 mg",price:47.99,purity:"99.6%"},
  glow:{name:"GLOW Blend",size:"10 mg",price:91.99,purity:"99.3%"},
  igf1lr3:{name:"IGF-1 LR3",size:"1 mg",price:55.99,purity:"99.0%"},
  ipa:{name:"Ipamorelin",size:"10 mg",price:39.99,purity:"99.5%"},
  kiss:{name:"Kisspeptin",size:"10 mg",price:54,purity:"99.2%"},
  klow:{name:"KLOW Blend",size:"80 mg",price:99.99,purity:"99.2%"},
  kpv:{name:"KPV",size:"10 mg",price:31.99,purity:"99.4%"},
  mt1:{name:"Melanotan I",size:"10 mg",price:23.99,purity:"99.1%"},
  mt2:{name:"Melanotan II",size:"10 mg",price:23.99,purity:"99.1%"},
  motsc:{name:"MOTS-c",size:"20 mg",price:59.99,purity:"99.2%"},
  nad:{name:"NAD+",size:"500 mg",price:55.99,purity:"99.5%"},
  pt141:{name:"PT-141",size:"10 mg",price:23.99,purity:"99.2%"},
  reta:{name:"GLP-3",size:"10 mg",price:55.99,purity:"99.0%"},
  selank:{name:"Selank",size:"10 mg",price:23.99,purity:"99.3%"},
  semax:{name:"Semax",size:"10 mg",price:23.99,purity:"99.4%"},
  snap8:{name:"SNAP-8",size:"10 mg",price:23.99,purity:"99.3%"},
  tb500:{name:"TB-500",size:"10 mg",price:44.99,purity:"99.2%"},
  tesa:{name:"Tesamorelin",size:"10 mg",price:49.99,purity:"99.2%"},
  ta1:{name:"Thymosin Alpha-1",size:"10 mg",price:31.99,purity:"99.4%"},
  tirz:{name:"GLP-2",size:"10 mg",price:179,purity:"99.3%"}
};

/* ---------- orders: freshly placed (localStorage) + demo history ---------- */
var ORDERS = [
  { id:"LMB-26B-1042", date:"May 28, 2026", status:"transit",
    items:[{id:"tirz",qty:1,lot:"LMB-26B-512"},{id:"bacwater",qty:2,lot:"LMB-26B-118"}] },
  { id:"LMB-26B-0987", date:"May 9, 2026", status:"delivered",
    items:[{id:"bpc157",qty:2,lot:"LMB-26B-425"},{id:"tb500",qty:1,lot:"LMB-26B-551"}] },
  { id:"LMB-26A-0815", date:"Apr 16, 2026", status:"delivered",
    items:[{id:"ghkcu",qty:1,lot:"LMB-26A-309"},{id:"cjcipa",qty:1,lot:"LMB-26A-377"}] },
  { id:"LMB-26A-0623", date:"Mar 23, 2026", status:"delivered",
    items:[{id:"reta",qty:1,lot:"LMB-26A-201"},{id:"ipa",qty:1,lot:"LMB-26A-244"},{id:"epi",qty:1,lot:"LMB-26A-260"}] }
];
/* prepend any orders the visitor placed through checkout (store.js writes elyria_orders) */
(function mergePlacedOrders(){
  var placed = load("elyria_orders", []);
  if(!Array.isArray(placed) || !placed.length) return;
  var clean = placed.map(function(o){
    return { id:o.id, date:o.date, status:o.status||"processing",
      pay:o.pay, payState:o.payState, total:o.total,
      items:(o.items||[]).filter(function(it){ return CAT[it.id]; }) };
  }).filter(function(o){ return o.items.length; });
  ORDERS = clean.concat(ORDERS);
})();
function orderTotal(o){ var t=0; o.items.forEach(function(it){ var p=CAT[it.id]; if(p) t+=p.price*it.qty; }); return t; }
function orderUnits(o){ var n=0; o.items.forEach(function(it){ n+=it.qty; }); return n; }

/* ---------- demo referred orders (affiliate) ---------- */
var REFERRALS = [
  { cust:"r.delgado@****", date:"May 30, 2026", value:179.00, type:"first" },
  { cust:"halpernlab@****", date:"May 24, 2026", value:91.99, type:"first" },
  { cust:"m.okafor@****", date:"May 19, 2026", value:63.98, type:"recurring" },
  { cust:"vector.bio@****", date:"May 11, 2026", value:219.96, type:"first" },
  { cust:"r.delgado@****", date:"May 2, 2026", value:55.99, type:"recurring" },
  { cust:"s.petrova@****", date:"Apr 27, 2026", value:127.98, type:"first" },
  { cust:"halpernlab@****", date:"Apr 14, 2026", value:47.99, type:"recurring" },
  { cust:"j.nakamura@****", date:"Apr 6, 2026", value:103.98, type:"first" }
];
function commissionOf(r){ return r.value * (r.type==="first"?CONFIG.firstRate:CONFIG.recurRate); }
function pendingEarnings(){ var t=0; REFERRALS.forEach(function(r){ t+=commissionOf(r); }); return t; }

var PAYOUT_HISTORY = [
  { date:"May 1, 2026", method:"Store credit", amount:214.40, status:"paid" },
  { date:"Apr 1, 2026", method:"PayPal", amount:188.75, status:"paid" }
];
function lifetimePaid(){ var t=0; PAYOUT_HISTORY.forEach(function(p){ t+=p.amount; }); return t; }

/* ============================================================
   AUTH STATE
   ============================================================ */
function getUser(){ return load("elyria_user", null); }
function setUser(u){ save("elyria_user", u); }
function initials(name){ var p=(name||"R").trim().split(/\s+/); return ((p[0]||"R")[0]+(p[1]?p[1][0]:"")).toUpperCase(); }
function affState(){ return load("elyria_affiliate", null); }
function makeCode(name,email){
  var base=(name||email||"researcher").replace(/[^a-z0-9]/gi,"").toUpperCase().slice(0,7);
  return (base||"RESEARCH")+"-"+String(CONFIG.firstRate*100|0);
}

/* ============================================================
   VIEW SWITCH
   ============================================================ */
function showDash(){
  var u=getUser(); if(!u){ showAuth(); return; }
  $("authView").hidden=true; $("dashView").hidden=false;
  paintHero(u); paintOverview(); paintOrders(); paintDocs(); paintAddresses(); paintProfile(u); paintAffiliate(); paintSubs();
  routeTab();
}
function showAuth(){ $("authView").hidden=false; $("dashView").hidden=true; }

/* ============================================================
   HERO
   ============================================================ */
function paintHero(u){
  $("avatarMount").textContent = initials(u.name);
  var nm=(u.name||"Researcher").trim().split(/\s+/);
  var titles=["dr.","dr","prof.","prof","mr.","mr","ms.","ms","mrs.","mrs"];
  var first=(titles.indexOf((nm[0]||"").toLowerCase())>=0 && nm[1]) ? nm[1] : nm[0];
  $("greetName").textContent = first;
  var hw=$("heroWarm"); if(hw) hw.textContent = pick(WARM_LINES);
  var credit = load("elyria_credit", 124.40);
  var verified = u.verified;
  var chips = '<span class="acct-pill">Member since '+(u.joined||"2025")+'</span>'+
    (verified
      ? '<span class="acct-pill ok"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M5 12l4 4 10-10"/></svg>Lab verified</span>'
      : '<span class="acct-pill warn"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>Verification pending</span>')+
    '<span class="acct-pill"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke="#e7c06a"><path d="M3 7h18v11H3zM3 11h18"/></svg>'+money(credit)+' store credit</span>';
  $("heroMeta").innerHTML = chips;
}

/* ============================================================
   OVERVIEW
   ============================================================ */
function paintOverview(){
  var credit = load("elyria_credit", 124.40);
  var aff = affState();
  var affEarn = aff ? pendingEarnings() : 0;
  var stats = [
    { k:"Store credit", v:money(credit), d:"Auto-applies at checkout", accent:true },
    { k:"Total orders", v:ORDERS.length, d:"<b>"+ORDERS.filter(function(o){return o.status==="delivered";}).length+"</b> delivered" },
    { k:"Affiliate earnings", v:aff?money(affEarn):"—", d:aff?"Pending this cycle":"Not enrolled" },
    { k:"Lab verification", v:getUser().verified?"Active":"Pending", d:getUser().verified?"Full catalog access":"Docs under review" }
  ];
  var ow=$("ovWarm"); if(ow) ow.innerHTML = warmWelcomeHTML();
  $("ovStats").innerHTML = stats.map(function(s){
    return '<div class="stat'+(s.accent?" accent":"")+'"><div class="sk">'+s.k+'</div><div class="sv">'+s.v+'</div><div class="sd">'+s.d+'</div></div>';
  }).join("");
  // recent two orders
  $("ovOrders").innerHTML = ORDERS.slice(0,2).map(orderCard).join("");
}

/* ============================================================
   ORDERS
   ============================================================ */
function statusChip(st){
  var map={delivered:["delivered","Delivered"],transit:["transit","In transit"],processing:["processing","Processing"],pending:["pending","Pending"],confirmed:["confirmed","Confirmed"],shipped:["shipped","Shipped"]};
  var m=map[st]||map.processing;
  return '<span class="ostatus '+m[0]+'"><span class="d"></span>'+m[1]+'</span>';
}
function chipFor(o){
  if(o.pay && window.ElyriaPay){
    var m=ElyriaPay.payChipMeta(o);
    return '<span class="ostatus '+m.cls+'"><span class="d"></span>'+m.label+'</span>';
  }
  return statusChip(o.status);
}
function orderCard(o){
  var items = o.items.map(function(it){
    var p=CAT[it.id];
    return '<div class="oitem"><span class="on">'+esc(p.name)+' <span class="oq">'+p.size+' · '+it.qty+'×</span></span><span class="op">'+money(p.price*it.qty)+'</span></div>';
  }).join("");
  var payTl = (o.pay && window.ElyriaPay) ? ElyriaPay.timelineHTML(o) : "";
  var payAct = (o.pay && o.status==="pending" && o.payState!=="submitted")
    ? '<button class="mbtn gold" data-pay-order="'+o.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>Complete payment</button>'
    : "";
  return '<div class="order">'+
    '<div class="order-top"><div><div class="order-id">'+o.id+'</div><div class="order-date">'+o.date+'</div></div>'+chipFor(o)+'</div>'+
    payTl+
    '<div class="order-items">'+items+'</div>'+
    '<div class="order-foot"><div class="order-total">'+orderUnits(o)+' vials<b>'+money(orderTotal(o))+'</b></div>'+
      '<div class="order-acts">'+
        payAct+
        '<button class="mbtn" data-coa-order="'+o.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M5 3h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/></svg>COAs</button>'+
        '<button class="mbtn" data-sub-from="'+o.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4"/></svg>Subscribe &amp; save</button>'+
        '<button class="mbtn'+(payAct?'':' gold')+'" data-reorder="'+o.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.9"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4"/></svg>Reorder</button>'+
      '</div></div></div>';
}
function paintOrders(){ $("ordersList").innerHTML = ORDERS.map(orderCard).join(""); var tc=$("ordersTabCount"); if(tc) tc.textContent=String(ORDERS.length); }

/* ============================================================
   DOCUMENTS (COA library)
   ============================================================ */
function allDocs(){
  var rows=[];
  ORDERS.forEach(function(o){ o.items.forEach(function(it){
    if(it.id==="bacwater") return;
    var p=CAT[it.id];
    rows.push({ name:p.name, lot:it.lot, purity:p.purity, date:o.date, id:it.id });
  }); });
  return rows;
}
function paintDocs(){
  var rows=allDocs();
  var head='<div class="doc-row head"><div>Compound</div><div class="dc-lot">Lot</div><div class="dc-purity">HPLC purity</div><div class="dc-date">Released</div><div></div></div>';
  $("docsList").innerHTML = head + rows.map(function(d){
    return '<div class="doc-row"><div class="dc-name">'+esc(d.name)+'</div>'+
      '<div class="mono dc-lot">'+d.lot+'</div>'+
      '<div class="mono pass dc-purity">'+d.purity+'</div>'+
      '<div class="mono dc-date">'+d.date+'</div>'+
      '<div style="text-align:right"><button class="mbtn" data-coa-lot="'+d.lot+'" data-coa-name="'+esc(d.name)+'" data-coa-purity="'+d.purity+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3v12M7 11l5 5 5-5M5 21h14"/></svg>PDF</button></div></div>';
  }).join("");
}

/* ============================================================
   ADDRESSES
   ============================================================ */
function getAddresses(){
  return load("elyria_addresses", [
    { id:"a1", label:"Lab — primary", name:"Receiving · Bldg 4", line:"2200 Mission Bay Blvd, Lab 4A\nSan Francisco, CA 94158", def:true },
    { id:"a2", label:"Department office", name:"Attn: Procurement", line:"Dept. of Molecular Biology\n1 Cyclotron Rd, Berkeley, CA 94720", def:false }
  ]);
}
function paintAddresses(){
  var list=getAddresses();
  var html=list.map(function(a){
    return '<div class="addr'+(a.def?" default":"")+'">'+
      (a.def?'<span class="acct-pill ok atag"><svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M5 12l4 4 10-10"/></svg>Default</span>':'<span class="mlabel atag">'+esc(a.label)+'</span>')+
      '<h4>'+esc(a.name)+'</h4><p>'+esc(a.line).replace(/\n/g,"<br>")+'</p>'+
      '<div class="aacts">'+(a.def?'':'<button data-addr-default="'+a.id+'">Make default</button>')+'<button class="del" data-addr-del="'+a.id+'">Remove</button></div></div>';
  }).join("");
  html+='<div class="addr add" id="addrAdd"><div class="plus"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></svg>Add shipping address</div></div>';
  $("addrList").innerHTML=html;
}

/* ============================================================
   PROFILE
   ============================================================ */
function paintProfile(u){
  $("pfName").value=u.name||"";
  $("pfEmail").value=u.email||"";
  $("pfOrg").value=u.org||"";
  $("pfRole").value=u.role||"Principal investigator";
  var v=u.verified;
  $("verifyMount").innerHTML =
    '<div class="verif-card"><div class="vic" style="'+(v?'':'background:rgba(231,184,106,.1);border-color:rgba(231,184,106,.26)')+'">'+
      (v?'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M9 12l2 2 4-4"/><path d="M12 3l7 4v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V7z"/></svg>'
        :'<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke="#e7b86a"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>')+'</div>'+
      '<div class="vt"><h4>'+(v?"Lab account verified":"Verification in review")+'</h4>'+
      '<p>'+(v?"Your institutional documentation is on file. You have full catalog access and net-terms eligibility."
            :"We’re reviewing your institutional documentation. You can still order; restricted items unlock on approval.")+'</p></div>'+
      (v?'':'<button class="mbtn" id="resendVerify">Upload docs</button>')+'</div>';
}

/* ============================================================
   WARM WELCOME + AFFILIATE CHEER
   ============================================================ */
function warmWelcomeHTML(){
  return '<div class="warm-welcome"><div class="wh"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 21s-7-4.5-9.5-9A5.2 5.2 0 0 1 12 6a5.2 5.2 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/></svg></div>'+
    '<div class="wt"><h3>From our bench to yours \u2014 thank you.</h3>'+
    '<p>We\u2019re a small team that cares a great deal about getting this right for you. Anything you need, we\u2019re only a message away \u2014 and we\u2019re truly glad you\u2019re here.</p></div></div>';
}
function cheerBannerHTML(aff){
  var pend=pendingEarnings(); if(pend<=0) return "";
  var latest=REFERRALS[0], lc=commissionOf(latest);
  return '<div class="cheer" id="cheerBanner"><div class="ci"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><path d="M12 2l2.4 6.9H22l-5.8 4.3 2.2 7L12 16.9 5.6 20.2l2.2-7L2 8.9h7.6z"/></svg></div>'+
    '<div class="ct"><div class="ck">Commission earned \u00b7 great job!</div>'+
    '<div class="cm">'+pick(AFFILIATE_CHEERS)+' Your latest: <span class="camt">+'+money(lc)+'</span>.</div></div>'+
    '<button class="cx" data-cheer-dismiss aria-label="Dismiss"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>';
}
var cheered=false;
function maybeCheer(){
  if(cheered) return; var aff=affState(); if(!aff||pendingEarnings()<=0) return;
  cheered=true; setTimeout(function(){ toast(pick(AFFILIATE_CHEERS)); }, 350);
}

/* ============================================================
   AFFILIATE PORTAL
   ============================================================ */
function paintAffiliate(){
  var aff=affState();
  var mount=$("affMount");
  if(!aff){ mount.innerHTML = affActivateHTML(); $("affTabCount").textContent=""; return; }
  mount.innerHTML = affPortalHTML(aff);
  $("affTabCount").textContent="●";
  wireAffPortal(aff);
}
function affActivateHTML(){
  return '<div class="aff-activate">'+
    '<div class="ai"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 2l2.4 6.9H22l-5.8 4.3 2.2 7L12 16.9 5.6 20.2l2.2-7L2 8.9h7.6z"/></svg></div>'+
    '<h2>Turn referrals into recurring income</h2>'+
    '<p>Share Elyria Bio with other labs and researchers. Earn on every order they place — for as long as they keep ordering. No caps, no quotas.</p>'+
    '<div class="aff-split"><div class="as"><div class="asv">'+(CONFIG.firstRate*100|0)+'%</div><div class="ask">First order</div></div>'+
      '<div class="as"><div class="asv">'+(CONFIG.recurRate*100|0)+'%</div><div class="ask">Every reorder</div></div>'+
      '<div class="as"><div class="asv">'+CONFIG.cookieDays+'d</div><div class="ask">Cookie window</div></div></div>'+
    '<button class="copy-btn" id="affActivate" style="height:50px;padding:0 30px">Activate affiliate account</button>'+
    '<p class="aff-note" style="margin-top:18px">Instant activation · Your referred customers also get '+(CONFIG.refDiscount*100|0)+'% off their first order.</p></div>';
}
function affPortalHTML(aff){
  var link="https://elyriabio.com/?ref="+aff.code;
  var pend=pendingEarnings();
  var first=REFERRALS.filter(function(r){return r.type==="first";}).length;
  var recur=REFERRALS.filter(function(r){return r.type==="recurring";}).length;
  var firstComm=REFERRALS.filter(function(r){return r.type==="first";}).reduce(function(a,r){return a+commissionOf(r);},0);
  var recurComm=pend-firstComm;
  var cheer=cheerBannerHTML(aff);
  var method=aff.payoutMethod||"credit";
  var pmRows=[
    ["credit","Store credit","Auto-applies to your next order · no minimum"],
    ["paypal","PayPal","Paid monthly · "+money(CONFIG.minPayout)+" minimum"],
    ["usdc","USDC (crypto)","Paid monthly · "+money(CONFIG.minPayout)+" minimum"]
  ].map(function(m){
    return '<label class="pm'+(method===m[0]?" on":"")+'" data-pm="'+m[0]+'"><span class="pmradio"></span><span class="pmt"><b>'+m[1]+'</b><span>'+m[2]+'</span></span></label>';
  }).join("");

  var refRows=REFERRALS.map(function(r){
    return '<div class="ref-row"><div class="cust">'+esc(r.cust)+'</div>'+
      '<div class="mono rc-date">'+r.date+'</div>'+
      '<div class="rc-type">'+(r.type==="first"?'<span class="tag-first">First · '+(CONFIG.firstRate*100|0)+'%</span>':'<span class="tag-recur">Reorder · '+(CONFIG.recurRate*100|0)+'%</span>')+'</div>'+
      '<div class="mono rc-order">'+money(r.value)+'</div>'+
      '<div class="comm">+'+money(commissionOf(r))+'</div></div>';
  }).join("");

  var payRows=PAYOUT_HISTORY.map(function(p){
    return '<div class="ref-row"><div class="cust">'+p.date+'</div><div class="mono rc-date">'+p.method+'</div>'+
      '<div class="rc-type"><span class="tag-recur" style="background:rgba(143,216,159,.14);color:#8fd89f">Paid</span></div>'+
      '<div class="mono rc-order">—</div><div class="comm">'+money(p.amount)+'</div></div>';
  }).join("");

  return cheer+
  '<div class="card"><div class="card-h"><h3>Your referral link</h3><span class="mlabel">'+CONFIG.cookieDays+'-day attribution</span></div>'+
    '<div class="ref-bar"><span class="rl" id="refLink">'+link+'</span><button class="copy-btn" id="copyLink"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy link</button></div>'+
    '<div class="ref-codes"><span class="ref-code">Code <b>'+aff.code+'</b><button data-copy="'+aff.code+'" title="Copy code"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.9"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button></span>'+
      '<span class="ref-code" style="border-style:dashed">Customers save '+(CONFIG.refDiscount*100|0)+'% on first order</span></div></div>'+

  swipeKitHTML(aff)+

  '<div class="card"><div class="card-h"><h3>Performance</h3><span class="mlabel">Last 30 days</span></div>'+
    '<div class="funnel">'+
      '<div class="fn"><div class="fnv">312</div><div class="fnk">Link clicks</div><div class="fnr">via '+aff.code+'</div></div>'+
      '<div class="fn"><div class="fnv">24</div><div class="fnk">Sign-ups</div><div class="fnr">7.7% of clicks</div></div>'+
      '<div class="fn"><div class="fnv">'+REFERRALS.length+'</div><div class="fnk">Attributed orders</div><div class="fnr">'+first+' first · '+recur+' repeat</div></div>'+
      '<div class="fn"><div class="fnv">'+money(pend/REFERRALS.length)+'</div><div class="fnk">Avg / order</div><div class="fnr">blended rate</div></div>'+
    '</div></div>'+

  '<div class="earn-row">'+
    '<div class="earn-card"><div class="ek mlabel">Available to withdraw</div><div class="earn-big" id="availAmt">'+money(pend)+'</div>'+
      '<div class="earn-breakdown">'+
        '<div class="eb-row"><span>First-order commission ('+(CONFIG.firstRate*100|0)+'%)</span><b>'+money(firstComm)+'</b></div>'+
        '<div class="eb-row"><span>Reorder commission ('+(CONFIG.recurRate*100|0)+'%)</span><b>'+money(recurComm)+'</b></div>'+
        '<div class="eb-row" style="border-top:1px solid var(--line);padding-top:11px"><span>Lifetime paid out</span><b>'+money(lifetimePaid())+'</b></div>'+
      '</div></div>'+
    '<div class="earn-card"><div class="ek mlabel">Payout method</div>'+
      '<div class="payout-methods">'+pmRows+'</div>'+
      '<button class="copy-btn" id="requestPayout" style="width:100%;height:48px">Withdraw '+money(pend)+'</button>'+
      '<p class="aff-note">Withdrawals to store credit are instant. Cash methods process on the 1st of each month.</p>'+
    '</div></div>'+

  '<div class="card"><div class="card-h"><h3>Referred orders</h3><span class="mlabel">'+REFERRALS.length+' orders</span></div>'+
    '<div class="ref-row head"><div>Customer</div><div class="rc-date">Date</div><div class="rc-type">Type</div><div class="rc-order">Order</div><div>Commission</div></div>'+
    refRows+'</div>'+

  '<div class="card"><div class="card-h"><h3>Payout history</h3></div>'+
    '<div class="ref-row head"><div>Date</div><div class="rc-date">Method</div><div class="rc-type">Status</div><div class="rc-order"></div><div>Amount</div></div>'+
    payRows+'</div>';
}
function wireAffPortal(aff){
  var copyL=$("copyLink");
  if(copyL) copyL.addEventListener("click", function(){
    copyText("https://elyriabio.com/?ref="+aff.code);
    copyL.classList.add("done"); copyL.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg>Copied';
    setTimeout(function(){ copyL.classList.remove("done"); copyL.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy link'; },1600);
  });
  document.querySelectorAll("[data-copy]").forEach(function(b){ b.addEventListener("click", function(){ copyText(b.getAttribute("data-copy")); toast("Code copied"); }); });
  document.querySelectorAll("[data-pm]").forEach(function(l){ l.addEventListener("click", function(){
    document.querySelectorAll("[data-pm]").forEach(function(x){ x.classList.remove("on"); });
    l.classList.add("on");
    var a=affState(); a.payoutMethod=l.getAttribute("data-pm"); save("elyria_affiliate",a);
  }); });
  var rp=$("requestPayout");
  if(rp) rp.addEventListener("click", function(){
    var amt=pendingEarnings(), a=affState();
    if(a.payoutMethod==="credit" || !a.payoutMethod){
      var c=load("elyria_credit",124.40)+amt; save("elyria_credit", c);
      toast(money(amt)+" added to store credit");
      paintHero(getUser()); paintOverview();
    } else {
      toast("Payout of "+money(amt)+" queued for the 1st");
    }
    rp.textContent="Requested"; rp.disabled=true; rp.style.opacity=".6";
  });
  wireSwipeKit(aff);
}

/* ============================================================
   SUBSCRIPTIONS (auto-reorder)
   ============================================================ */
var SUB_DISCOUNT=0.05;
var CAD_WEEKS=[2,3,4,6,8,12];
function cadLabel(w){ return "Every "+w+" weeks"; }
function getSubs(){ return load("elyria_subscriptions", [
  { id:"s1", items:[{id:"ghkcu",qty:1}], cad:6, nextTs:Date.now()+12*86400000, status:"active" }
]); }
function saveSubs(s){ save("elyria_subscriptions", s); }
function fmtDate(ts){ return new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function isoDate(ts){ var d=new Date(ts); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function subItemsTotal(s){ return s.items.reduce(function(a,it){ return a+CAT[it.id].price*it.qty; },0); }

/* ---- add-a-peptide picker (clean searchable dropdown) ---- */
var pickerOpen=null, pickerQuery="";
function closePicker(){ pickerOpen=null; var b=document.querySelector(".sub-picker.open"); if(b) b.classList.remove("open"); }
function subPicker(subId){
  return '<div class="sub-add-wrap"><button class="sub-add-btn" data-sub-add="'+subId+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>Add a peptide to this subscription</button><div class="sub-picker" data-picker="'+subId+'"></div></div>';
}
function pickerRowsHTML(subId, q){
  var s=getSubs().filter(function(x){return x.id===subId;})[0]; if(!s) return "";
  var have={}; s.items.forEach(function(it){ have[it.id]=true; });
  q=(q||"").toLowerCase().trim();
  var ids=Object.keys(CAT).filter(function(id){ return !q || CAT[id].name.toLowerCase().indexOf(q)>=0; });
  if(!ids.length) return '<div class="picker-empty">No peptides match \u201c'+esc(q)+'\u201d.</div>';
  return ids.map(function(id){ var p=CAT[id], on=have[id];
    return '<button class="picker-row'+(on?' on':'')+'" data-pick="'+id+'" data-pick-sub="'+subId+'">'+
      '<span class="pr-dot"></span>'+
      '<span class="pr-main"><span class="pr-nm">'+esc(p.name)+'</span><span class="pr-meta">'+p.size+' \u00b7 '+money(p.price)+'</span></span>'+
      '<span class="pr-act">'+(on?'<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg>Added':'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Add')+'</span></button>';
  }).join("");
}
function renderPickerInto(subId){
  document.querySelectorAll(".sub-picker.open").forEach(function(x){ if(x.getAttribute("data-picker")!==subId) x.classList.remove("open"); });
  var box=document.querySelector('[data-picker="'+subId+'"]'); if(!box) return;
  box.innerHTML='<div class="picker-head"><svg class="ps-ic" viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>'+
    '<input type="text" class="picker-search" data-picker-search="'+subId+'" placeholder="Search peptides to add\u2026" value="'+esc(pickerQuery)+'" autocomplete="off" />'+
    '<button class="picker-close" data-picker-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'+
    '<div class="picker-list" data-picker-list="'+subId+'">'+pickerRowsHTML(subId, pickerQuery)+'</div>';
  box.classList.add("open");
  var inp=box.querySelector("[data-picker-search]"); if(inp){ inp.focus(); var v=inp.value; inp.value=""; inp.value=v; }
}
function toggleSubItem(subId, pid){
  var subs=getSubs(), msg=null;
  subs.forEach(function(s){ if(s.id!==subId) return;
    var idx=s.items.map(function(it){return it.id;}).indexOf(pid);
    if(idx>=0){ if(s.items.length>1){ s.items.splice(idx,1); msg=CAT[pid].name+" removed"; } else { msg="Keep at least one peptide in a subscription"; } }
    else { s.items.push({id:pid,qty:1}); msg=CAT[pid].name+" added to your subscription"; }
  });
  saveSubs(subs); paintSubs(); if(msg) toast(esc(msg));
}
function subCard(s){
  var sub=subItemsTotal(s), sv=sub*SUB_DISCOUNT, total=sub-sv, paused=s.status==="paused";
  var days=Math.max(0,Math.ceil((s.nextTs-Date.now())/86400000));
  var items=s.items.map(function(it){ var p=CAT[it.id]; return '<div class="oitem"><span class="on">'+esc(p.name)+' <span class="oq">'+p.size+' \u00b7 '+it.qty+'\u00d7</span></span><span class="op">'+money(p.price*it.qty)+'</span></div>'; }).join("");
  var cadOpts=CAD_WEEKS.map(function(w){ return '<option value="'+w+'"'+(w===s.cad?' selected':'')+'>'+w+' weeks</option>'; }).join("");
  return '<div class="sub'+(paused?" paused":"")+'"><div class="sub-top"><div><div class="sub-ttl">'+cadLabel(s.cad)+'</div>'+
    '<div class="sub-next">'+(paused?'Paused \u2014 resume whenever you like':'Next ships '+fmtDate(s.nextTs)+' \u00b7 in '+days+' day'+(days===1?'':'s'))+'</div></div>'+
    '<span class="ostatus '+(paused?'processing':'delivered')+'"><span class="d"></span>'+(paused?'Paused':'Active')+'</span></div>'+
    '<div class="order-items">'+items+'</div>'+
    '<div class="sub-controls">'+
      '<label class="sub-ctl"><span>You choose the ship date</span><input type="date" data-sub-date="'+s.id+'" value="'+isoDate(s.nextTs)+'" min="'+isoDate(Date.now())+'" /></label>'+
      '<label class="sub-ctl"><span>Then reorder every</span><select data-sub-cad-select="'+s.id+'">'+cadOpts+'</select></label>'+
    '</div>'+
    '<div class="sub-save"><span>Subscriber price</span><b>'+money(total)+'</b><span class="sub-was">'+money(sub)+'</span><span class="sub-badge">Save 5% \u00b7 '+money(sv)+' / shipment</span></div>'+
    '<div class="order-acts">'+
      '<button class="mbtn gold" data-sub-shipnow="'+s.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.9"><path d="M5 12h14M13 6l6 6-6 6"/></svg>Ship now</button>'+
      (paused?'<button class="mbtn" data-sub-toggle="'+s.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M5 3l14 9-14 9z"/></svg>Resume</button>'
             :'<button class="mbtn" data-sub-skip="'+s.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M5 4l10 8-10 8zM19 5v14"/></svg>Skip next</button><button class="mbtn" data-sub-toggle="'+s.id+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M8 5v14M16 5v14"/></svg>Pause</button>')+
      '<button class="mbtn" data-sub-cancel="'+s.id+'">Cancel</button>'+
    '</div>'+subPicker(s.id)+'</div>';
}
function paintSubs(){
  var subs=getSubs(), active=subs.filter(function(s){return s.status==="active";}).length;
  var tc=$("subTabCount"); if(tc) tc.textContent=active?String(active):"";
  if(!subs.length){
    $("subsList").innerHTML='<div class="warm-welcome"><div class="wh"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 4v4h4"/></svg></div><div class="wt"><h3>No subscriptions yet</h3><p>Set up auto-reorder from any past order and save 5% on every shipment \u2014 and you pick the exact ship date. Skip, pause, or cancel anytime.</p><div style="margin-top:14px"><button class="mbtn gold" data-tab="orders">Subscribe from an order</button></div></div></div>';
    return;
  }
  $("subsList").innerHTML='<div class="card" style="margin-bottom:16px;display:flex;align-items:center;gap:14px;flex-wrap:wrap"><div style="width:42px;height:42px;border-radius:11px;display:grid;place-items:center;background:rgba(143,216,159,.1);border:1px solid rgba(143,216,159,.26);flex:none"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#8fd89f" stroke-width="1.7"><path d="M5 12l4 4 10-10"/></svg></div><div><b style="color:var(--paper);font-family:&quot;Fraunces&quot;,serif;font-size:16px">Save 5% on every shipment \u2014 on your schedule</b><div style="color:var(--mist);font-size:13px;margin-top:3px">You choose each ship date and how often it repeats. Ship now, skip, pause, or cancel whenever you like.</div></div></div>'+subs.map(subCard).join("");
  if(pickerOpen) renderPickerInto(pickerOpen);
}
function createSubFromOrder(orderId){
  var o=ORDERS.filter(function(x){return x.id===orderId;})[0]; if(!o) return;
  var subs=getSubs();
  subs.unshift({ id:"s"+Date.now(), items:o.items.map(function(it){return {id:it.id,qty:it.qty};}), cad:6, nextTs:Date.now()+6*7*86400000, status:"active" });
  saveSubs(subs); paintSubs(); activateTab("subscriptions"); toast("Subscription created \u00b7 5% off every shipment");
}
function updateSub(id, fn){ var subs=getSubs().map(function(s){ if(s.id===id) fn(s); return s; }); saveSubs(subs); paintSubs(); }

/* ============================================================
   AFFILIATE SWIPE KIT (per-product links, copy, banners)
   ============================================================ */
var SHARE_PRODUCTS=[
  {name:"BPC-157",slug:"bpc-157"},{name:"GLP-2",slug:"glp-2"},{name:"GLP-3",slug:"glp-3"},
  {name:"TB-500",slug:"tb-500"},{name:"GHK-Cu",slug:"ghk-cu"},{name:"CJC-1295/Ipamorelin",slug:"cjc-1295-ipamorelin"},
  {name:"NAD+",slug:"nad-plus"},{name:"Ipamorelin",slug:"ipamorelin"},{name:"GLOW Blend",slug:"glow"},{name:"Epithalon",slug:"epithalon"}
];
function flashCopy(btn){ var o=btn.innerHTML; btn.classList.add("done"); btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><path d="M5 12l4 4 10-10"/></svg>Copied'; setTimeout(function(){ btn.classList.remove("done"); btn.innerHTML=o; },1500); }
function swipeKitHTML(aff){
  var code=aff.code, home="https://elyriabio.com/?ref="+code;
  var opts='<option value="">Homepage \u2014 all products</option>'+SHARE_PRODUCTS.map(function(p){ return '<option value="'+p.slug+'">'+esc(p.name)+'</option>'; }).join("");
  var swipes=[
    "I get my research peptides from Elyria Bio \u2014 a third-party COA on every lot and a \u226599% HPLC purity floor. New labs save 10% on a first order through my link: "+home,
    "If you run in-vitro work and want material you can actually verify, Elyria Bio publishes a signed certificate of analysis for every lot. Here is 10% off your first order: "+home,
    "Reference peptides with real paperwork \u2014 \u226599% HPLC, mass-spec confirmed, lot-traceable. 10% off your first order: "+home
  ];
  var swipeHTML=swipes.map(function(t){ var a=esc(t); return '<div class="swipe"><p class="swipe-t">'+a+'</p><button class="mbtn" data-copy-text="'+a+'"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.7"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy</button></div>'; }).join("");
  var embed='<a href="'+home+'"><img src="https://elyriabio.com/assets/og-card.jpg" alt="Elyria Bio \u2014 research-grade peptides, 10% off your first order"></a>';
  return ''+
  '<div class="card"><div class="card-h"><h3>Share &amp; earn kit</h3><span class="mlabel">Code: '+code+'</span></div>'+
    '<label class="mlabel" style="display:block;margin-bottom:9px">Link to a specific product</label>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px"><select id="shareProd" class="share-select">'+opts+'</select></div>'+
    '<div class="ref-bar"><span class="rl" id="shareLink">'+home+'</span><button class="copy-btn" id="copyShare"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy</button></div>'+
    '<p class="aff-note">Every link carries your code for '+CONFIG.cookieDays+' days. Product links drop visitors straight on the page they care about \u2014 they convert best.</p></div>'+
  '<div class="card"><div class="card-h"><h3>Ready-to-share copy</h3><span class="mlabel">Tap to copy</span></div>'+swipeHTML+'</div>'+
  '<div class="card"><div class="card-h"><h3>Banners</h3><span class="mlabel">Embed on your site</span></div><div class="banner-set">'+
    '<div class="ad-banner ad-lead"><div class="ab-in"><span class="ab-k">Research Use Only</span><span class="ab-h">Peptides you can verify</span><span class="ab-c">\u226599% HPLC \u00b7 COA on every lot \u00b7 10% off your first order</span></div><span class="ab-cta">Shop \u2192</span></div>'+
    '<div class="ad-banner ad-square"><span class="ab-k">Elyria Bio</span><span class="ab-h">Verify every lot.</span><span class="ab-c">\u226599% HPLC purity floor. Third-party COA. 10% off your first order.</span><span class="ab-cta">Shop the catalog \u2192</span></div>'+
  '</div><div class="ref-bar" style="margin-top:14px"><span class="rl" id="embedCode">'+esc(embed)+'</span><button class="copy-btn" id="copyEmbed"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>Copy embed</button></div></div>';
}
function wireSwipeKit(aff){
  var sp=$("shareProd"), sl=$("shareLink");
  if(sp&&sl) sp.addEventListener("change", function(){ var v=sp.value; sl.textContent = v ? ("https://elyriabio.com/products/"+v+".html?ref="+aff.code) : ("https://elyriabio.com/?ref="+aff.code); });
  var cs=$("copyShare"); if(cs) cs.addEventListener("click", function(){ copyText(sl.textContent); flashCopy(cs); });
  var ce=$("copyEmbed"); if(ce) ce.addEventListener("click", function(){ copyText($("embedCode").textContent); flashCopy(ce); });
}

/* ============================================================
   COA print (compact certificate)
   ============================================================ */
function printCOA(name, lot, purity){
  var w=window.open("","_blank","width=820,height=1040");
  if(!w){ toast("Allow pop-ups to download the COA"); return; }
  var doc='<!doctype html><html><head><meta charset="utf-8"><title>COA '+name+" "+lot+'</title><style>'+
    'body{font-family:Georgia,serif;color:#10201c;max-width:720px;margin:32px auto;padding:0 28px;line-height:1.5}'+
    '.h{border-bottom:2px solid #10201c;padding-bottom:14px}.b{font-size:22px;font-weight:700}'+
    '.k{font-family:monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#5a7a72;margin-top:8px}'+
    '.t{font-size:22px;margin-top:2px}'+
    '.meta{display:flex;gap:26px;flex-wrap:wrap;font-family:monospace;font-size:12px;margin:16px 0}'+
    '.meta div span{display:block;color:#5a7a72;font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:2px}'+
    'table{width:100%;border-collapse:collapse;margin:18px 0;font-family:monospace;font-size:13px}'+
    'th,td{text-align:left;padding:9px 8px;border-bottom:1px solid #cfe0db}'+
    'th{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#5a7a72}.p{color:#b9954e;font-weight:700}'+
    '.sg{margin-top:24px;border-top:1px solid #cfe0db;padding-top:14px;display:flex;justify-content:space-between;align-items:flex-end}'+
    '.si{font-style:italic;font-size:22px}.note{font-size:10px;color:#5a7a72;margin-top:22px}'+
    '</style></head><body><div class="h"><div class="b">Elyria Bio</div><div class="k">Certificate of Analysis &#183; Research Use Only</div>'+
    '<div class="t">'+name+'</div></div>'+
    '<div class="meta"><div><span>Lot / Batch</span>'+lot+'</div><div><span>HPLC purity</span>'+purity+'</div>'+
      '<div><span>Identity</span>Confirmed (ESI-MS)</div><div><span>Storage</span>&#8722;20&#176;C desiccated</div></div>'+
    '<table><thead><tr><th>Test</th><th>Result</th><th>Disposition</th></tr></thead><tbody>'+
      '<tr><td>Appearance</td><td>White lyophilized powder</td><td class="p">Pass</td></tr>'+
      '<tr><td>Identity (ESI-MS)</td><td>Conforms</td><td class="p">Pass</td></tr>'+
      '<tr><td>Purity (RP-HPLC)</td><td>'+purity+'</td><td class="p">Pass</td></tr>'+
      '<tr><td>Endotoxin (LAL)</td><td>&lt; 0.5 EU/mg</td><td class="p">Pass</td></tr></tbody></table>'+
    '<div class="sg"><div><div class="si">A. Veyra</div><div class="k">QC Release &#183; Independent US laboratory</div></div>'+
      '<div class="p" style="font-family:monospace">VERIFIED &#10003;</div></div>'+
    '<div class="note">Representative certificate generated from catalog specifications for demonstration. Each shipped vial includes its own signed third-party COA matching its physical lot. Research Use Only &#8212; not for human or veterinary use.</div>'+
    '</body></html>';
  w.document.write(doc); w.document.close(); w.focus();
  setTimeout(function(){ try{ w.print(); }catch(e){} }, 420);
}

/* ============================================================
   REORDER → live cart
   ============================================================ */
function reorder(o){
  var cart=load("elyria_cart",{});
  o.items.forEach(function(it){ cart[it.id]=(cart[it.id]||0)+it.qty; });
  save("elyria_cart",cart);
  var cc=$("cartCount"); if(cc){ var n=0; for(var k in cart) n+=cart[k]; cc.textContent=n; cc.classList.remove("bump"); void cc.offsetWidth; cc.classList.add("bump"); }
  toast(orderUnits(o)+" vials added to cart", '<button data-toast-home>View cart</button>');
}

/* ============================================================
   TABS + ROUTING
   ============================================================ */
function activateTab(name){
  document.querySelectorAll("[data-tab]").forEach(function(b){ b.classList.toggle("on", b.getAttribute("data-tab")===name); });
  document.querySelectorAll("[data-pane]").forEach(function(p){ p.classList.toggle("on", p.getAttribute("data-pane")===name); });
  if(name==="affiliate") maybeCheer();
  try{ history.replaceState(null,"","#"+name); }catch(e){}
  window.scrollTo({top:0,behavior:"smooth"});
}
function routeTab(){
  var h=(location.hash||"").replace("#","");
  var valid=["overview","orders","subscriptions","documents","addresses","affiliate","profile"];
  activateTab(valid.indexOf(h)>=0?h:"overview");
}

/* ============================================================
   SHARED helpers (copy, toast)
   ============================================================ */
function copyText(t){
  if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(t).catch(function(){}); return; }
  var ta=document.createElement("textarea"); ta.value=t; ta.style.position="fixed"; ta.style.opacity="0"; document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); }catch(e){} document.body.removeChild(ta);
}
function toast(title, actsHTML){
  var wrap=$("toasts"); if(!wrap) return;
  var el=document.createElement("div"); el.className="toast";
  el.innerHTML='<div class="t-body"><div class="t-title"><svg class="t-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l4 4 10-10"/></svg>'+title+'</div></div>'+(actsHTML?'<div class="t-acts">'+actsHTML+'</div>':"");
  wrap.appendChild(el);
  requestAnimationFrame(function(){ el.classList.add("in"); });
  var t=setTimeout(close, 3400);
  function close(){ clearTimeout(t); el.classList.remove("in"); setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); },380); }
  el.querySelectorAll("[data-toast-home]").forEach(function(b){ b.addEventListener("click", function(){ location.href="index.html?cart=open"; }); });
}

/* ============================================================
   EVENT WIRING (delegated)
   ============================================================ */
document.addEventListener("click", function(e){
  if(pickerOpen && !e.target.closest("[data-picker]") && !e.target.closest("[data-sub-add]")){ closePicker(); }
  var t=e.target.closest("[data-tab],[data-reorder],[data-coa-order],[data-coa-lot],[data-addr-del],[data-addr-default],[data-cheer-dismiss],[data-sub-from],[data-sub-skip],[data-sub-toggle],[data-sub-shipnow],[data-sub-cancel],[data-sub-add],[data-pick],[data-picker-close],[data-copy-text],#addrAdd,#affActivate,#signOut,#gotoAffiliate");
  if(!t) return;
  if(t.hasAttribute("data-copy-text")){ copyText(t.getAttribute("data-copy-text")); toast("Copied to clipboard"); return; }
  if(t.hasAttribute("data-pay-order")){
    var pid=t.getAttribute("data-pay-order");
    if(window.ElyriaPay) ElyriaPay.openPayModal(pid, { onSubmitted: function(){
      var oo=ORDERS.filter(function(x){return x.id===pid;})[0];
      if(oo) oo.payState="submitted";
      paintOrders(); paintOverview();
      toast("Proof submitted \u2014 we\u2019ll verify and ship shortly");
    }});
    return;
  }
  if(t.hasAttribute("data-sub-from")){ createSubFromOrder(t.getAttribute("data-sub-from")); return; }
  if(t.hasAttribute("data-sub-shipnow")){ updateSub(t.getAttribute("data-sub-shipnow"), function(s){ s.status="active"; s.nextTs=Date.now()+s.cad*7*86400000; }); toast("Your box is on its way \u2014 thank you! Next ships per your schedule."); return; }
  if(t.hasAttribute("data-sub-skip")){ updateSub(t.getAttribute("data-sub-skip"), function(s){ s.nextTs += s.cad*7*86400000; }); toast("Next shipment skipped"); return; }
  if(t.hasAttribute("data-sub-toggle")){ updateSub(t.getAttribute("data-sub-toggle"), function(s){ s.status = s.status==="paused"?"active":"paused"; if(s.status==="active" && s.nextTs<Date.now()) s.nextTs=Date.now()+s.cad*7*86400000; }); return; }
  if(t.hasAttribute("data-sub-cadence")){ updateSub(t.getAttribute("data-sub-cadence"), function(s){ s.cad = s.cad===4?6:(s.cad===6?8:4); s.nextTs=Date.now()+s.cad*7*86400000; }); toast("Cadence updated"); return; }
  if(t.hasAttribute("data-sub-cancel")){ if(confirm("Cancel this subscription?")){ var sid=t.getAttribute("data-sub-cancel"); saveSubs(getSubs().filter(function(s){return s.id!==sid;})); paintSubs(); toast("Subscription cancelled"); } return; }
  if(t.hasAttribute("data-sub-add")){ var asid=t.getAttribute("data-sub-add"); if(pickerOpen===asid){ closePicker(); } else { pickerOpen=asid; pickerQuery=""; renderPickerInto(asid); } return; }
  if(t.hasAttribute("data-pick")){ toggleSubItem(t.getAttribute("data-pick-sub"), t.getAttribute("data-pick")); return; }
  if(t.hasAttribute("data-picker-close")){ closePicker(); return; }
  if(t.hasAttribute("data-cheer-dismiss")){ var cb=document.getElementById("cheerBanner"); if(cb) cb.remove(); return; }
  if(t.hasAttribute("data-tab")){ activateTab(t.getAttribute("data-tab")); return; }
  if(t.id==="gotoAffiliate"){ activateTab("affiliate"); return; }
  if(t.hasAttribute("data-reorder")){ var o=ORDERS.filter(function(x){return x.id===t.getAttribute("data-reorder");})[0]; if(o) reorder(o); return; }
  if(t.hasAttribute("data-coa-order")){ var oo=ORDERS.filter(function(x){return x.id===t.getAttribute("data-coa-order");})[0]; if(oo){ activateTab("documents"); } return; }
  if(t.hasAttribute("data-coa-lot")){ printCOA(t.getAttribute("data-coa-name"), t.getAttribute("data-coa-lot"), t.getAttribute("data-coa-purity")); return; }
  if(t.hasAttribute("data-addr-del")){ var id=t.getAttribute("data-addr-del"); var list=getAddresses().filter(function(a){return a.id!==id;}); save("elyria_addresses",list); paintAddresses(); toast("Address removed"); return; }
  if(t.hasAttribute("data-addr-default")){ var did=t.getAttribute("data-addr-default"); var l2=getAddresses().map(function(a){ a.def=(a.id===did); return a; }); save("elyria_addresses",l2); paintAddresses(); return; }
  if(t.id==="addrAdd"){ addAddressPrompt(); return; }
  if(t.id==="affActivate"){ var u=getUser(); save("elyria_affiliate",{ active:true, code:makeCode(u.name,u.email), joined:new Date().getFullYear(), payoutMethod:"credit" }); paintAffiliate(); paintOverview(); toast("Affiliate account activated"); return; }
  if(t.id==="signOut"){ setUser(null); location.reload(); return; }
});

/* subscription ship-date + cadence controls (form changes) */
document.addEventListener("change", function(e){
  var d=e.target.closest("[data-sub-date]");
  if(d){ var id=d.getAttribute("data-sub-date"), v=d.value; if(v){ var ts=new Date(v+"T12:00:00").getTime(); updateSub(id, function(s){ s.nextTs=ts; if(s.status==="paused") s.status="active"; }); toast("Ship date updated \u2014 you\u2019re in control"); } return; }
  var c=e.target.closest("[data-sub-cad-select]");
  if(c){ var cid=c.getAttribute("data-sub-cad-select"), cv=parseInt(c.value,10); updateSub(cid, function(s){ s.cad=cv; }); toast("Reorder frequency updated"); return; }
});

/* peptide-picker search + Esc-to-close */
document.addEventListener("input", function(e){
  var s=e.target.closest("[data-picker-search]");
  if(s){ pickerQuery=s.value; var sub=s.getAttribute("data-picker-search"); var list=document.querySelector('[data-picker-list="'+sub+'"]'); if(list) list.innerHTML=pickerRowsHTML(sub, pickerQuery); }
});
document.addEventListener("keydown", function(e){ if(e.key==="Escape" && pickerOpen){ closePicker(); } });

function addAddressPrompt(){
  var name=prompt("Recipient / attention line:"); if(!name) return;
  var line=prompt("Address (street, city, state, zip):"); if(!line) return;
  var list=getAddresses(); list.push({ id:"a"+Date.now(), label:"Saved address", name:name, line:line, def:false });
  save("elyria_addresses",list); paintAddresses(); toast("Address saved");
}

/* ============================================================
   AUTH FORM WIRING
   ============================================================ */
function wireAuth(){
  var mode="signin";
  var tIn=$("toSignin"), tUp=$("toSignup");
  function setMode(m){ mode=m; tIn.classList.toggle("on",m==="signin"); tUp.classList.toggle("on",m==="signup");
    $("nameField").style.display=m==="signup"?"":"none"; $("orgField").style.display=m==="signup"?"":"none";
    $("authTitle").textContent=m==="signup"?"Create your account":"Sign in to Elyria Bio";
    $("authSubmit").textContent=m==="signup"?"Create account":"Sign in";
  }
  if(tIn) tIn.addEventListener("click", function(){ setMode("signin"); });
  if(tUp) tUp.addEventListener("click", function(){ setMode("signup"); });
  setMode("signin");
  var form=$("authForm");
  if(form) form.addEventListener("submit", function(e){
    e.preventDefault();
    var email=($("authEmail").value||"").trim();
    var name=(mode==="signup"?($("authName").value||"").trim():"") || nameFromEmail(email);
    var org=(mode==="signup"?($("authOrg").value||"").trim():"") || "Independent researcher";
    setUser({ email:email||"researcher@lab.org", name:name, org:org, role:"Principal investigator", verified:mode!=="signup", joined:new Date().getFullYear() });
    showDash();
  });
}
function nameFromEmail(e){ var p=(e||"").split("@")[0].replace(/[._]/g," "); return p.replace(/\b\w/g,function(c){return c.toUpperCase();}) || "Researcher"; }

/* profile save */
function wireProfile(){
  var pf=$("profileForm");
  if(pf) pf.addEventListener("submit", function(e){ e.preventDefault();
    var u=getUser(); u.name=$("pfName").value; u.email=$("pfEmail").value; u.org=$("pfOrg").value; u.role=$("pfRole").value; setUser(u);
    paintHero(u); toast("Profile saved");
  });
}

/* ---------- boot ---------- */
window.addEventListener("hashchange", function(){ if(!getUser()) return; routeTab(); });
wireAuth(); wireProfile();
if(getUser()) showDash(); else showAuth();

})();
