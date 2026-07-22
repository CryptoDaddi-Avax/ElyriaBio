/* ============================================================
   ELYRIA BIO — PAYMENTS MODULE (crypto + Venmo, manual verification)
   Shared by storefront (store.js), account (account.js).
   Orders live in localStorage "elyria_orders".
   Order payment fields:
     pay:      "btc" | "eth" | "usdc" | "venmo"
     payState: "awaiting" | "submitted"        (until admin confirms)
     status:   "pending" -> "confirmed" -> "shipped"/"transit" -> "delivered"
     proof:    { ref, img (dataURL thumb), note, ts }
   Live payment methods are marked live:true. Placeholder methods still
   show a sample disclaimer until a real address is configured.
   ============================================================ */
(function(){
"use strict";

function loadLS(k,d){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } }
function saveLS(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

/* ---------- methods (sample receiving details) ---------- */
var METHODS = {
  btc:   { id:"btc",   name:"Bitcoin",  glyph:"\u20BF", net:"Bitcoin network only",
           addr:"38nWRVEAxvapAjeEK4a6pGKUs7Hby5RUPo", rate:104250,   unit:"BTC",
           sub:"Usually 40\u201360 min to clear", live:true },
  eth:   { id:"eth",   name:"Ethereum", glyph:"\u039E", net:"Ethereum network only",
           addr:"0x510318E6cB52336DfA05b9AfE00875A25E5f67a9", rate:5480,      unit:"ETH",
           sub:"Ethereum network only \u00b7 usually < 5 min", live:true },
  usdc:  { id:"usdc",  name:"USDC",     glyph:"$",      net:"Ethereum or Solana",
           addr:"0x5aMP1e00000000000000000000000000rEp1acE01", rate:1, unit:"USDC",
           sub:"Stablecoin \u00b7 1:1 with USD" },
  venmo: { id:"venmo", name:"Venmo",    glyph:"V",      net:"Venmo",
           addr:"@ElyriaBio", rate:null, unit:null,
           sub:"Friends & family \u00b7 note = order ID" }
};
var ORDER = ["btc","eth","usdc","venmo"];

function enabledIds(){
  var t = loadLS("elyria_pay_enabled", null);
  var ids = ORDER.filter(function(id){ return !t || t[id]!==false; });
  return ids.length ? ids : ORDER.slice();
}
function method(id){ return METHODS[id] || METHODS.btc; }

function cryptoAmt(m, usd){
  if(!m.rate || m.rate===1) return null;
  var amt = usd/m.rate;
  return amt.toFixed(amt<0.01?6:amt<1?5:4)+" "+m.unit;
}
function fmtUSD(n){ return "$"+(n||0).toFixed(2); }

/* ---------- order storage helpers ---------- */
function getOrders(){ return loadLS("elyria_orders", []); }
function updateOrder(id, fn){
  var orders = getOrders();
  for(var i=0;i<orders.length;i++){ if(orders[i].id===id){ fn(orders[i]); break; } }
  saveLS("elyria_orders", orders);
  return orders;
}

/* ---------- status meta ---------- */
function payChipMeta(o){
  if(o.status==="pending"){
    return o.payState==="submitted"
      ? { cls:"submitted", label:"Verifying payment" }
      : { cls:"awaiting",  label:"Awaiting payment" };
  }
  if(o.status==="confirmed") return { cls:"confirmed", label:"Confirmed" };
  if(o.status==="transit"||o.status==="shipped") return { cls:"shipped", label:"Shipped" };
  if(o.status==="delivered") return { cls:"shipped", label:"Delivered" };
  return { cls:"awaiting", label:o.status };
}
function stageOf(o){
  if(o.status==="pending") return 0;
  if(o.status==="confirmed") return 1;
  return 2; /* shipped / transit / delivered */
}

/* ---------- timeline (Pending -> Confirmed -> Shipped) ---------- */
function timelineHTML(o){
  var stage = stageOf(o);
  var subs = [
    o.payState==="submitted" && stage===0 ? "Proof under review" :
      stage===0 ? "Awaiting payment" : "Payment received",
    stage>=1 ? "Payment verified" : "After verification",
    stage>=2 ? (o.status==="delivered"?"Delivered":"On its way") : "Ships once confirmed"
  ];
  var names=["Pending","Confirmed","Shipped"];
  var html='<div class="ep-tl" aria-label="Order progress">';
  for(var i=0;i<3;i++){
    var st = i<stage?"done":(i===stage?"now":"next");
    html+='<div class="ep-tl-step '+st+'">'
      +'<span class="ep-tl-dot">'+(i<stage?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>':'')+'</span>'
      +'<span class="ep-tl-name">'+names[i]+'</span>'
      +'<span class="ep-tl-sub">'+subs[i]+'</span>'
      +(i<2?'<span class="ep-tl-bar'+(i<stage?" fill":"")+'"></span>':'')
      +'</div>';
  }
  return html+"</div>";
}

/* ---------- CSS ---------- */
(function injectCSS(){
  var s=document.createElement("style");
  s.textContent=[
  /* modal */
  ".ep-backdrop{position:fixed;inset:0;z-index:4300;background:rgba(6,5,4,.8);backdrop-filter:blur(7px);opacity:0;pointer-events:none;transition:opacity .2s}",
  ".ep-backdrop.open{opacity:1;pointer-events:auto}",
  ".ep-modal{position:fixed;z-index:4301;left:50%;top:50%;transform:translate(-50%,-50%) scale(.97);width:min(540px,calc(100vw - 32px));max-height:min(760px,calc(100dvh - 40px));background:#0d0b09;border:1px solid rgba(231,192,106,.22);border-radius:18px;box-shadow:0 40px 120px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden;opacity:0;pointer-events:none;transition:opacity .22s,transform .22s cubic-bezier(.2,.8,.2,1)}",
  ".ep-modal.open{opacity:1;pointer-events:auto;transform:translate(-50%,-50%)}",
  ".ep-head{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid rgba(255,255,255,.07);flex:none}",
  ".ep-head h3{margin:0;font-size:18px;color:#f4efe6;font-weight:500}",
  ".ep-oid{font-family:'IBM Plex Mono',monospace;font-size:12px;color:#e7c06a;background:rgba(231,192,106,.08);border:1px solid rgba(231,192,106,.2);border-radius:7px;padding:4px 10px}",
  ".ep-x{background:none;border:none;color:#8a8375;cursor:pointer;width:32px;height:32px;border-radius:8px;display:grid;place-items:center}",
  ".ep-x:hover{background:rgba(255,255,255,.06);color:#f4efe6}",
  ".ep-body{flex:1;overflow-y:auto;padding:22px 24px}",
  ".ep-amt{text-align:center;margin:2px 0 18px}",
  ".ep-amt .usd{font-family:'IBM Plex Mono',monospace;font-size:34px;color:#f4efe6;letter-spacing:-.01em}",
  ".ep-amt .alt{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#e7c06a;margin-top:4px}",
  ".ep-amt .cap{font-size:12px;color:#8a8375;margin-top:4px}",
  ".ep-tabs{display:flex;gap:8px;margin-bottom:16px}",
  ".ep-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;padding:11px 6px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:none;color:#8a8375;cursor:pointer;font-family:inherit;transition:border-color .16s,background .16s,color .16s}",
  ".ep-tab .g{width:26px;height:26px;border-radius:50%;border:1px solid currentColor;display:grid;place-items:center;font-family:'IBM Plex Mono',monospace;font-size:13px}",
  ".ep-tab span:last-child{font-size:12px}",
  ".ep-tab.on{border-color:rgba(231,192,106,.55);background:rgba(231,192,106,.06);color:#e7c06a}",
  ".ep-addr{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px;display:flex;gap:16px;align-items:center;margin-bottom:6px}",
  ".ep-qr{width:88px;height:88px;flex:none;border:1px dashed rgba(231,192,106,.4);border-radius:10px;display:grid;place-items:center;color:#e7c06a;font-family:'IBM Plex Mono',monospace;font-size:11px;text-align:center;line-height:1.5;padding:6px}",
  ".ep-addr-in{flex:1;min-width:0}",
  ".ep-net{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a8375;margin-bottom:6px}",
  ".ep-a{font-family:'IBM Plex Mono',monospace;font-size:13px;color:#f4efe6;word-break:break-all;line-height:1.5}",
  ".ep-copy{margin-top:9px;display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.13);border-radius:8px;color:#f4efe6;font-size:12px;padding:6px 12px;cursor:pointer;font-family:inherit}",
  ".ep-copy:hover{background:rgba(255,255,255,.09)}",
  ".ep-sample{font-size:11px;color:#8a8375;margin:8px 2px 18px;line-height:1.5}",
  ".ep-steps{display:flex;flex-direction:column;gap:8px;margin-bottom:20px}",
  ".ep-step{display:flex;gap:12px;align-items:baseline;font-size:13px;color:#b5ad9d;line-height:1.5}",
  ".ep-step b{color:#e7c06a;font-family:'IBM Plex Mono',monospace;font-weight:500;flex:none}",
  ".ep-sec{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#e7c06a;margin:0 0 12px;font-weight:600}",
  ".ep-f{display:flex;flex-direction:column;gap:7px;margin-bottom:13px}",
  ".ep-f label{font-size:12.5px;color:#8a8375}",
  ".ep-f input,.ep-f textarea{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.13);border-radius:10px;padding:12px 13px;color:#f4efe6;font-size:14px;font-family:'IBM Plex Mono',monospace;outline:none;transition:border-color .16s;resize:none}",
  ".ep-f input:focus,.ep-f textarea:focus{border-color:rgba(231,192,106,.5)}",
  ".ep-drop{border:1px dashed rgba(255,255,255,.2);border-radius:12px;padding:16px;display:flex;align-items:center;gap:13px;cursor:pointer;transition:border-color .16s,background .16s;color:#8a8375}",
  ".ep-drop:hover{border-color:rgba(231,192,106,.45);background:rgba(231,192,106,.03)}",
  ".ep-drop svg{width:22px;height:22px;flex:none;stroke:currentColor}",
  ".ep-drop .t{font-size:13px;line-height:1.45}.ep-drop .t b{color:#f4efe6;font-weight:500;display:block}",
  ".ep-drop.has{border-style:solid;border-color:rgba(143,216,159,.4);color:#a9e2b5}",
  ".ep-thumb{width:52px;height:52px;border-radius:8px;object-fit:cover;flex:none;border:1px solid rgba(255,255,255,.15)}",
  ".ep-foot{flex:none;border-top:1px solid rgba(255,255,255,.07);padding:16px 24px 20px}",
  ".ep-submit{width:100%;height:50px;border:none;border-radius:25px;background:linear-gradient(180deg,#f0d488,#d8a94a);color:#241a06;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit;transition:filter .16s,transform .1s}",
  ".ep-submit:hover{filter:brightness(1.05)}.ep-submit:active{transform:scale(.985)}",
  ".ep-submit:disabled{opacity:.45;cursor:not-allowed}",
  ".ep-later{display:block;width:100%;background:none;border:none;color:#8a8375;font-size:12.5px;margin-top:11px;cursor:pointer;font-family:inherit;text-decoration:underline;text-underline-offset:3px}",
  ".ep-later:hover{color:#f4efe6}",
  /* timeline */
  ".ep-tl{display:flex;margin:2px 0 16px}",
  ".ep-tl-step{flex:1;position:relative;display:flex;flex-direction:column;align-items:flex-start;padding-right:12px}",
  ".ep-tl-dot{width:22px;height:22px;border-radius:50%;border:2px solid rgba(255,255,255,.18);display:grid;place-items:center;background:#12100d;z-index:1}",
  ".ep-tl-dot svg{width:11px;height:11px}",
  ".ep-tl-step.done .ep-tl-dot{border-color:#8fd89f;color:#8fd89f;background:rgba(143,216,159,.08)}",
  ".ep-tl-step.now .ep-tl-dot{border-color:#e7c06a;box-shadow:0 0 0 4px rgba(231,192,106,.12)}",
  ".ep-tl-step.now .ep-tl-dot::after{content:'';width:8px;height:8px;border-radius:50%;background:#e7c06a}",
  ".ep-tl-name{font-size:12.5px;color:#f4efe6;margin-top:8px;font-weight:500}",
  ".ep-tl-step.next .ep-tl-name{color:#8a8375}",
  ".ep-tl-sub{font-size:11px;color:#8a8375;margin-top:2px}",
  ".ep-tl-bar{position:absolute;top:10px;left:26px;right:8px;height:2px;background:rgba(255,255,255,.1)}",
  ".ep-tl-bar.fill{background:rgba(143,216,159,.5)}",
  /* status chips shared */
  ".ostatus.pending,.ostatus.awaiting{color:#e0a17c;background:rgba(224,161,124,.1)} .ostatus.pending .d,.ostatus.awaiting .d{background:#e0a17c;box-shadow:0 0 7px #e0a17c}",
  ".ostatus.submitted{color:#e7c98a;background:rgba(231,184,106,.1)} .ostatus.submitted .d{background:#e7b86a;box-shadow:0 0 7px #e7b86a}",
  ".ostatus.confirmed{color:#9fb6d8;background:rgba(159,182,216,.1)} .ostatus.confirmed .d{background:#8fa8d8;box-shadow:0 0 7px #8fa8d8}",
  ".ostatus.shipped{color:#e7c98a;background:rgba(231,184,106,.1)} .ostatus.shipped .d{background:#e7b86a;box-shadow:0 0 7px #e7b86a}",
  /* network warning */
  ".ep-warn{border:1px solid rgba(231,70,50,.5);background:rgba(200,40,20,.06);border-radius:12px;padding:14px 16px;margin-bottom:18px}",
  ".ep-warn-hd{display:flex;align-items:center;gap:8px;margin-bottom:10px}",
  ".ep-warn-hd svg{width:18px;height:18px;flex:none;color:#f07060}",
  ".ep-warn-hd strong{font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:#f07060;font-weight:700;line-height:1.4}",
  ".ep-warn-body{font-size:12.5px;color:#f4efe6;line-height:1.65;margin:0 0 13px;font-weight:500}",
  ".ep-warn-ck{display:flex;align-items:flex-start;gap:10px;cursor:pointer;user-select:none}",
  ".ep-warn-ck input[type=checkbox]{width:17px;height:17px;margin:1px 0 0;accent-color:#e7c06a;cursor:pointer;flex:none}",
  ".ep-warn-ck span{font-size:12.5px;color:#b5ad9d;line-height:1.5}"
  ].join("");
  document.head.appendChild(s);
})();

/* ---------- proof screenshot -> small dataURL thumb ---------- */
function fileToThumb(file, cb){
  var r = new FileReader();
  r.onload = function(){
    var img = new Image();
    img.onload = function(){
      var max = 560, w = img.width, h = img.height;
      if(w>max){ h = Math.round(h*max/w); w = max; }
      var c = document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      cb(c.toDataURL("image/jpeg",.72));
    };
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

/* ---------- pay modal ---------- */
var bd, md;
function openPayModal(orderOrId, opts){
  opts = opts||{};
  var o = typeof orderOrId==="string"
    ? getOrders().filter(function(x){ return x.id===orderOrId; })[0]
    : orderOrId;
  if(!o) return;
  var cur = o.pay && METHODS[o.pay] ? o.pay : enabledIds()[0];
  var proofImg = null;

  if(!bd){
    bd=document.createElement("div"); bd.className="ep-backdrop";
    md=document.createElement("div"); md.className="ep-modal";
    md.setAttribute("role","dialog"); md.setAttribute("aria-modal","true"); md.setAttribute("aria-label","Complete payment");
    document.body.appendChild(bd); document.body.appendChild(md);
  }
  function close(){ md.classList.remove("open"); bd.classList.remove("open"); document.body.classList.remove("lock"); }
  bd.onclick = function(){ close(); if(opts.onLater) opts.onLater(); };

  function paint(){
    var m = method(cur);
    var alt = cryptoAmt(m, o.total);
    var tabs = enabledIds().map(function(id){
      var mm=METHODS[id];
      return '<button type="button" class="ep-tab'+(id===cur?" on":"")+'" data-eptab="'+id+'"><span class="g">'+mm.glyph+'</span><span>'+mm.name+'</span></button>';
    }).join("");
    md.innerHTML =
      '<div class="ep-head"><h3>Complete payment</h3><span class="ep-oid">'+esc(o.id)+'</span>'
      +'<button class="ep-x" id="epClose" aria-label="Close"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
      +'<div class="ep-body">'
        +'<div class="ep-amt"><div class="usd">'+fmtUSD(o.total)+'</div>'
        +(alt?'<div class="alt">\u2248 '+alt+'</div>':'')
        +'<div class="cap">'+(m.id==="venmo"?"Send via Venmo with the order ID in the note":"Send the exact amount \u2014 we match it to your order")+'</div></div>'
        +'<div class="ep-tabs">'+tabs+'</div>'
        +'<div class="ep-addr">'
          +'<div class="ep-qr">QR<br>placeholder</div>'
          +'<div class="ep-addr-in"><div class="ep-net">'+m.net+'</div><div class="ep-a">'+esc(m.addr)+'</div>'
          +'<button type="button" class="ep-copy" id="epCopy"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>Copy '+(m.id==="venmo"?"handle":"address")+'</button></div>'
        +'</div>'
        +(m.live?'':
          '<p class="ep-sample">Sample '+(m.id==="venmo"?"handle":"address")+' \u2014 replace with your live receiving details before enabling this method.</p>')
        +'<div class="ep-steps">'
          +'<div class="ep-step"><b>1</b><span>Send <b style="color:#f4efe6">'+(alt||fmtUSD(o.total))+'</b>'+(m.id==="venmo"?' to '+esc(m.addr)+' with note <b style="color:#f4efe6">'+esc(o.id)+'</b>':' to the address above')+'</span></div>'
          +'<div class="ep-step"><b>2</b><span>Paste the '+(m.id==="venmo"?"Venmo confirmation / last 4 of transaction":"transaction hash")+' below</span></div>'
          +'<div class="ep-step"><b>3</b><span>Attach a screenshot \u2014 optional, but speeds up verification</span></div>'
        +'</div>'
        +(m.id!=="venmo"?
          '<div class="ep-warn" id="epWarnBox">'
            +'<div class="ep-warn-hd"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
            +'<strong>Please verify your currency and network</strong></div>'
            +'<p class="ep-warn-body">IF FUNDS ARE SENT VIA THE WRONG NETWORK THEY WILL LIKELY BE UNRETRIEVABLE.</p>'
            +'<label class="ep-warn-ck"><input type="checkbox" id="epWarnCk"><span>I have verified the correct currency and network before sending.</span></label>'
          +'</div>'
        :"")
        +'<div class="ep-sec">Proof of payment</div>'

        +'<div class="ep-f"><label>'+(m.id==="venmo"?"Venmo confirmation ID or username you sent from":"Transaction hash")+'</label>'
        +'<input id="epRef" placeholder="'+(m.id==="venmo"?"@your-handle \u00b7 May 30":"0x9f2c\u2026 or txid")+'" autocomplete="off"></div>'
        +'<div class="ep-drop" id="epDrop"><input type="file" id="epFile" accept="image/*" hidden>'
          +'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5-8 8"/></svg>'
          +'<span class="t" id="epDropT"><b>Attach payment screenshot</b>PNG or JPG \u00b7 kept with your order</span>'
        +'</div>'
      +'</div>'
      +'<div class="ep-foot">'
        +'<button class="ep-submit" id="epSubmit" disabled>Submit for verification</button>'
        +'<button class="ep-later" id="epLater">I\u2019ll finish this later from my account</button>'
      +'</div>';

    md.querySelector("#epClose").onclick = function(){ close(); if(opts.onLater) opts.onLater(); };
    md.querySelector("#epLater").onclick = function(){ close(); if(opts.onLater) opts.onLater(); };
    md.querySelectorAll("[data-eptab]").forEach(function(b){
      b.onclick = function(){
        cur = b.getAttribute("data-eptab"); proofImg = null;
        updateOrder(o.id, function(x){ x.pay = cur; }); o.pay = cur;
        paint();
      };
    });
    md.querySelector("#epCopy").onclick = function(){
      try{ navigator.clipboard.writeText(method(cur).addr); }catch(e){}
      this.innerHTML = "Copied";
      var self=this; setTimeout(function(){ if(self.isConnected) paint(); }, 900);
    };
    var refEl = md.querySelector("#epRef"), sub = md.querySelector("#epSubmit");
    var ckEl = m.id !== "venmo" ? md.querySelector("#epWarnCk") : null;
    function gate(){
      var ckOk = !ckEl || ckEl.checked;
      sub.disabled = !((refEl.value.trim().length>=4 || proofImg) && ckOk);
    }
    refEl.addEventListener("input", gate);
    if(ckEl) ckEl.addEventListener("change", gate);
    var drop = md.querySelector("#epDrop"), fileIn = md.querySelector("#epFile");
    drop.onclick = function(){ fileIn.click(); };
    fileIn.onchange = function(){
      var f = fileIn.files && fileIn.files[0]; if(!f) return;
      fileToThumb(f, function(url){
        proofImg = url;
        drop.classList.add("has");
        drop.querySelector("#epDropT").innerHTML = "<b>Screenshot attached</b>Tap to replace";
        var old = drop.querySelector(".ep-thumb"); if(old) old.remove();
        var im = document.createElement("img"); im.className="ep-thumb"; im.src=url; im.alt="Payment screenshot";
        drop.appendChild(im);
        gate();
      });
    };
    sub.onclick = function(){
      if(sub.disabled) return;
      var proof = { ref: refEl.value.trim().slice(0, 140), img: proofImg, ts: Date.now() };
      updateOrder(o.id, function(x){ x.payState="submitted"; x.proof=proof; x.pay=cur; });
      o.payState="submitted"; o.proof=proof;
      close();
      if(opts.onSubmitted) opts.onSubmitted(o);
    };
  }
  paint();
  requestAnimationFrame(function(){ bd.classList.add("open"); md.classList.add("open"); document.body.classList.add("lock"); });
}

window.ElyriaPay = {
  METHODS: METHODS,
  order: ORDER,
  enabledIds: enabledIds,
  method: method,
  cryptoAmt: cryptoAmt,
  payChipMeta: payChipMeta,
  stageOf: stageOf,
  timelineHTML: timelineHTML,
  openPayModal: openPayModal,
  getOrders: getOrders,
  updateOrder: updateOrder
};
})();
