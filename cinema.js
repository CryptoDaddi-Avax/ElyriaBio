/* ============================================================
   ELYRIA BIO — HERO CINEMA (auto-looping assembly-line story)
   Plays continuously (no scroll). Four connected scenes:
     1) vial enters the laboratory analyzer
     2) the lab prints the COA · 99.5% stamp
     3) vial packed into the shipping box
     4) box loads into courier truck — drives away
   The big headline gently breathes so the story reads; the
   supporting copy + CTA stay put. Graceful reduced-motion still.
   ============================================================ */
(function(){
"use strict";

var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function rangep(p,a,b){ return clamp((p-a)/(b-a),0,1); }
function easeOut(t){ return 1-Math.pow(1-t,3); }
function easeIn(t){ return t*t*t; }
function easeInOut(t){ return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
function lerp(a,b,t){ return a+(b-a)*t; }

var stage  = document.getElementById('hero');
var cinema = document.getElementById('cinema');
if(!stage || !cinema) return;

/* scene refs */
var lab     = document.getElementById('cinLab'),
    labVial = document.getElementById('labVial'),
    labScan = cinema.querySelector('.lab-scan'),
    labRead = document.getElementById('labReadout'),
    coa     = document.getElementById('cinCoa'),
    coaFeed = cinema.querySelector('.coa-feed'),
    stamp   = document.getElementById('cinStamp'),
    flash   = cinema.querySelector('.cin-stamp-flash'),
    hiRow   = document.getElementById('coaRowPurity'),
    boxScn  = document.getElementById('cinBox'),
    boxVial = document.getElementById('boxVial'),
    box3d   = document.getElementById('box3d'),
    truckScn= document.getElementById('cinTruck'),
    truck   = cinema.querySelector('.truck'),
    speed   = cinema.querySelector('.speed-lines');

/* copy + HUD refs */
var heroTop    = document.querySelector('.hero-top'),
    sub        = document.getElementById('heroSub'),
    cta        = document.getElementById('heroCta'),
    trust      = document.getElementById('heroTrust'),
    hud        = document.getElementById('synthHud'),
    seqEl      = document.getElementById('synthSeq'),
    shk        = cinema.ownerDocument.querySelector('.synth-hud .shk'),
    barFill    = document.getElementById('synthBar'),
    verifyRow  = document.getElementById('synthVerify'),
    verifyText = document.getElementById('synthVerifyText'),
    hint       = document.getElementById('scrollHint'),
    cap        = document.getElementById('cinCap');

function setScene(el, x, y, sc, op){
  if(!el) return;
  el.style.transform = 'translate(-50%,-50%) translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px) scale('+sc.toFixed(3)+')';
  el.style.opacity = op.toFixed(3);
}

var capState='';
function caption(step, title, ok){
  if(!cap) return;
  var key=step+'|'+title;
  if(key!==capState){
    capState=key;
    cap.innerHTML='<span class="cc-step">'+step+'</span><span class="cc-title">'+title+'</span>';
  }
  cap.style.opacity = title?'1':'0';
  cap.classList.toggle('ok', !!ok);
}

/* ------ scene choreography from story progress sp (0 → 1) ------ */
function render(p){
  /* SCENE 1 · LABORATORY */
  var labIn  = easeOut(rangep(p,0.02,0.12));
  var labOut = easeInOut(rangep(p,0.32,0.40));
  setScene(lab, 0, lerp(24,0,labIn)-labOut*42, lerp(0.92,1,labIn)*lerp(1,0.94,labOut), labIn*(1-labOut));
  var vDrop = easeOut(rangep(p,0.05,0.15));
  if(labVial){ labVial.style.opacity=vDrop.toFixed(3); labVial.style.transform='translateY('+lerp(-68,0,vDrop).toFixed(1)+'px)'; }
  if(labScan) labScan.style.opacity = (rangep(p,0.13,0.17)*(1-rangep(p,0.29,0.33))).toFixed(3);

  /* SCENE 2 · PRINTED COA */
  var coaIn  = easeOut(rangep(p,0.36,0.48));
  var coaOut = easeInOut(rangep(p,0.60,0.66));
  setScene(coa, 0, lerp(70,0,coaIn)-coaOut*40, lerp(0.96,1,coaIn)*lerp(1,0.95,coaOut), coaIn*(1-coaOut));
  if(coaFeed) coaFeed.style.opacity = (rangep(p,0.36,0.42)*(1-rangep(p,0.50,0.56))).toFixed(3);
  var sRaw = rangep(p,0.48,0.58);
  if(stamp){
    stamp.style.opacity = (rangep(p,0.48,0.52)*(1-coaOut)).toFixed(3);
    stamp.style.transform = 'scale('+lerp(1.7,1,easeOut(sRaw)).toFixed(3)+') rotate('+lerp(-22,-9,easeOut(sRaw)).toFixed(2)+'deg)';
  }
  if(flash){ var fl=Math.max(0,1-Math.abs(p-0.555)/0.035); flash.style.opacity=(fl*0.85).toFixed(3); }
  if(hiRow){ if(p>=0.55) hiRow.classList.add('hi'); else hiRow.classList.remove('hi'); }

  /* SCENE 3 · PACKED INTO BOX — open the box, drop the vial in, fold shut, tape */
  var boxIn   = easeOut(rangep(p,0.58,0.66));
  var boxLoad = easeInOut(rangep(p,0.87,0.93));
  setScene(boxScn, boxLoad*46, lerp(26,0,boxIn)-boxLoad*26, lerp(0.9,1,boxIn)*lerp(1,0.66,boxLoad), boxIn*(1-boxLoad));
  /* the vial drops into the open box, then settles out of sight inside it */
  var bvDrop = easeOut(rangep(p,0.63,0.72));
  if(boxVial){
    boxVial.style.opacity = (bvDrop*(1-rangep(p,0.72,0.765))).toFixed(3);
    boxVial.style.transform = 'translateX(-50%) translateY('+lerp(-78,30,bvDrop).toFixed(1)+'px) scale('+lerp(1,0.82,bvDrop).toFixed(3)+')';
  }
  /* flaps fold fully open while the vial goes in, then fold shut to meet at centre */
  var flapOpen  = easeOut(rangep(p,0.59,0.66));
  var flapClose = easeInOut(rangep(p,0.75,0.83));
  var openAmt   = flapOpen * (1-flapClose);     /* 1 = open, 0 = shut */
  if(box3d){
    box3d.style.setProperty('--af', lerp(90,-12,openAmt).toFixed(1)+'deg');
    box3d.style.setProperty('--ab', lerp(-90,12,openAmt).toFixed(1)+'deg');
    /* tape wipes across the closed seam */
    box3d.style.setProperty('--tape', easeOut(rangep(p,0.83,0.885)).toFixed(3));
  }

  /* SCENE 4 · COURIER TRUCK */
  var truckIn = easeOut(rangep(p,0.86,0.93));
  var depart  = easeIn(rangep(p,0.93,1.00));
  setScene(truckScn, 0, 0, 1, truckIn);
  if(truck){
    truck.style.transform = 'translate(-50%,-50%) translateX('+(lerp(-90,0,truckIn)+depart*470).toFixed(1)+'px)';
    truck.style.opacity = (1 - easeIn(rangep(p,0.96,1.00))).toFixed(3);
    if(truckIn>0.04) truck.classList.add('truck-rolling'); else truck.classList.remove('truck-rolling');
  }
  if(speed) speed.style.opacity = easeOut(rangep(p,0.93,0.98)).toFixed(3);
}

/* ------ HUD + breathing headline. sp = story progress, u = cycle phase ------ */
function updateUI(sp, u){
  /* the big headline recedes while the story plays, returns at rest */
  var dim = easeInOut(rangep(u,0.05,0.16)) * (1-easeInOut(rangep(u,0.80,0.92)));
  if(heroTop) heroTop.style.opacity = (1 - 0.80*dim).toFixed(3);
  if(hud) hud.style.opacity = (0.18 + 0.82*easeOut(rangep(u,0.02,0.10))*(1-easeInOut(rangep(u,0.93,1)))).toFixed(3);
  if(barFill) barFill.style.width = (sp*100).toFixed(1)+'%';

  var label, seq, vtext, ok=false;
  if(sp < 0.34){
    label='Elyria Bio · Testing'; seq='HPLC · LC-MS identity assay';
    vtext = sp<0.18 ? 'Loading sample · lot 26-B' : (sp<0.27 ? 'Acquiring chromatogram…' : 'Integrating peaks…');
    if(labRead) labRead.textContent = sp<0.18 ? 'Loading sample…' : (sp<0.27 ? 'Acquiring chromatogram…' : 'Integrating peaks · 99.5%');
    if(sp<0.18) caption('Stage 01 · Product testing', 'Step into the Elyria Bio standard', false);
    else if(sp<0.27) caption('Stage 01 · Product testing', 'Every batch tested for purity, potency &amp; consistency', false);
    else caption('Stage 01 · Product testing', 'Precision-formulated under strict lab protocols', false);
  } else if(sp < 0.60){
    label='Elyria Bio · Certified'; seq='Printing certificate of analysis';
    if(sp>=0.55){ ok=true; vtext='Purity 99.5% · third-party verified'; caption('Stage 01 · Certificate of analysis', '99.5% purity — independently verified', true); }
    else { vtext='Drafting COA · awaiting result'; caption('Stage 01 · Certificate of analysis', 'See the data. Trust the results.', false); }
  } else if(sp < 0.82){
    label='Elyria Bio · Packaging'; seq='Vacuum-sealed · light-resistant mailer';
    if(sp<0.72){ vtext='Vacuum-sealing · light-resistant vial'; caption('Stage 02 · Packaging', 'Military-grade protection, premium presentation', false); }
    else { vtext='Tamper-evident seal applied'; caption('Stage 02 · Packaging', 'Vacuum-sealed · light-resistant · tamper-evident', false); }
  } else {
    label='Elyria Bio · Shipping'; seq='Courier · tracked & discreet';
    if(sp>=0.985){ ok=true; vtext='Delivered · lab to your hands'; caption('The complete journey', 'Seamless from lab to your hands', true); }
    else if(sp>=0.96){ ok=true; vtext='On the way · tracking live'; caption('Stage 03 · Shipping', 'Tracked from our door to yours', true); }
    else { vtext='Temperature-controlled · manifest signed'; caption('Stage 03 · Shipping', 'Secure, discreet &amp; reliable', false); }
  }
  if(shk) shk.textContent=label;
  if(seqEl) seqEl.textContent=seq;
  if(verifyText) verifyText.textContent=vtext;
  if(verifyRow){ if(ok) verifyRow.classList.add('ok'); else verifyRow.classList.remove('ok'); }
}

/* supporting copy stays put — only the headline breathes */
function showCopy(){ [sub,cta,trust].forEach(function(e){ if(e){ e.style.opacity=1; e.style.transform='none'; } }); }

/* ------ reduced-motion: a calm verified still ------ */
if(reduce){
  stage.classList.add('synth-static');
  render(0.54); updateUI(0.54, 0.5);
  if(heroTop) heroTop.style.opacity=1;
  if(hud) hud.style.opacity=1;
  showCopy();
  if(verifyRow) verifyRow.classList.add('ok');
  if(verifyText) verifyText.textContent='Purity 99.5% · third-party verified';
  if(hint) hint.style.opacity=1;
  return;
}

/* ------ continuous loop ------ */
showCopy();
if(hint) hint.style.opacity=1;          // static "browse the catalog" cue
var CYCLE = 15000;                       // ms per full cycle
var REST = 0.04, PLAY_END = 0.88;        // phase windows within the cycle
var t0 = performance.now(), raf = 0, running = false;

function storyFromU(u){
  if(u < REST) return 0;
  if(u > PLAY_END) return 1;
  return (u - REST) / (PLAY_END - REST);
}
function frame(now){
  var u = ((now - t0) % CYCLE) / CYCLE;
  var sp = storyFromU(u);
  render(sp);
  updateUI(sp, u);
  raf = requestAnimationFrame(frame);
}
function start(){ if(!running){ running=true; raf=requestAnimationFrame(frame); } }
function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
window.__cine = function(p){ stop(); render(p); updateUI(p, clamp(p*0.84+0.04,0,1)); };  // verification hook

if('IntersectionObserver' in window){
  new IntersectionObserver(function(es){ if(es[0].isIntersecting) start(); else stop(); }, {threshold:0}).observe(stage);
}
start();

})();
