/* ============================================================
   ELYRIA BIO — CINEMATIC LAYER
   Pure visual/UX polish, decoupled from store logic:
   1) Ambient gold-dust atmosphere
   2) Add-to-cart vial flight (FLIP arc to cart)
   3) Catalog card cascade on scroll-in
   4) Scroll-progress beam
   Respects reduced-motion + touch.
   ============================================================ */
(function(){
"use strict";
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
var DPR = Math.min(window.devicePixelRatio||1, 2);

/* ============================================================
   1) AMBIENT GOLD-DUST  (fixed, screen-blended, drifts upward)
   ============================================================ */
(function dust(){
  if(reduce) return;
  var c=document.createElement('canvas'); c.className='dust-canvas'; c.setAttribute('aria-hidden','true');
  document.body.appendChild(c);
  var ctx=c.getContext('2d'); var W=0,H=0,motes=[];
  function size(){ W=window.innerWidth; H=window.innerHeight; c.width=Math.round(W*DPR); c.height=Math.round(H*DPR); c.style.width=W+'px'; c.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  function build(){
    var n = Math.round(Math.min(46, W/34));
    motes=[];
    for(var i=0;i<n;i++) motes.push({
      x:Math.random()*W, y:Math.random()*H,
      r:0.5+Math.random()*1.8, vy:-(0.05+Math.random()*0.22), vx:(Math.random()-0.5)*0.12,
      a:0.06+Math.random()*0.384, tw:Math.random()*6.28, tws:0.6+Math.random()*1.4
    });
  }
  size(); build();
  window.addEventListener('resize', function(){ size(); build(); });
  var raf=0, vis=true;
  function frame(t){
    ctx.clearRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    for(var i=0;i<motes.length;i++){
      var m=motes[i];
      m.y+=m.vy; m.x+=m.vx; m.tw+=0.016*m.tws;
      if(m.y<-6){ m.y=H+6; m.x=Math.random()*W; }
      if(m.x<-6)m.x=W+6; if(m.x>W+6)m.x=-6;
      var a=m.a*(0.55+0.45*Math.sin(m.tw));
      var g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*4);
      g.addColorStop(0,'rgba(247,225,164,'+a.toFixed(3)+')');
      g.addColorStop(1,'rgba(231,192,106,0)');
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(m.x,m.y,m.r*4,0,6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
    raf=requestAnimationFrame(frame);
  }
  function start(){ if(!raf&&vis) raf=requestAnimationFrame(frame); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; } }
  document.addEventListener('visibilitychange', function(){ vis=!document.hidden; if(vis)start(); else stop(); });
  start();
})();

/* ============================================================
   2) ADD-TO-CART VIAL FLIGHT
   ============================================================ */
(function flight(){
  var cartBtn=document.getElementById('cartBtn');
  if(!cartBtn) return;
  document.addEventListener('click', function(e){
    var add=e.target.closest('[data-add]'); if(!add) return;
    if(reduce){ return; }
    // find the most relevant source vial
    var scope = add.closest('.card, #qvBody, #cmpBody, .qv') || document;
    var src = scope.querySelector('.vial-real');
    if(!src){ return; }
    var sr=src.getBoundingClientRect(), tr=cartBtn.getBoundingClientRect();
    if(sr.width<2) return;
    var clone=src.cloneNode(true);
    clone.className='vial-fly';
    clone.style.left=sr.left+'px'; clone.style.top=sr.top+'px';
    clone.style.width=sr.width+'px'; clone.style.height=sr.height+'px';
    document.body.appendChild(clone);
    var dx=(tr.left+tr.width*0.32)-(sr.left+sr.width/2);
    var dy=(tr.top+tr.height/2)-(sr.top+sr.height/2);
    var lift=Math.min(-90, dy*0.5-70);
    var anim=clone.animate([
      {transform:'translate(0,0) scale(1)', opacity:1, offset:0},
      {transform:'translate('+dx*0.5+'px,'+lift+'px) scale(.6) rotate(-8deg)', opacity:1, offset:0.55},
      {transform:'translate('+dx+'px,'+dy+'px) scale(.12) rotate(8deg)', opacity:0.2, offset:1}
    ], {duration:760, easing:'cubic-bezier(.5,.02,.45,1)'});
    anim.onfinish=function(){
      clone.remove();
      cartBtn.classList.remove('pulse'); void cartBtn.offsetWidth; cartBtn.classList.add('pulse');
      cartBtn.classList.remove('cart-catch'); void cartBtn.offsetWidth; cartBtn.classList.add('cart-catch');
    };
  }, false);
})();

/* ============================================================
   3) CATALOG CARD CASCADE ON SCROLL-IN
   ============================================================ */
(function cascade(){
  if(reduce) return;
  var grid=document.getElementById('grid'); if(!grid || !('IntersectionObserver' in window)) return;
  var done=false;
  var io=new IntersectionObserver(function(es){
    if(done || !es[0].isIntersecting) return; done=true; io.disconnect();
    var cards=grid.querySelectorAll('.card:not(.hidden)');
    Array.prototype.forEach.call(cards, function(card,i){
      if(i>11) return;
      card.style.setProperty('--casc', (i*55)+'ms');
      card.classList.add('casc-in');
      card.addEventListener('animationend', function h(){ card.classList.remove('casc-in'); card.style.removeProperty('--casc'); card.removeEventListener('animationend',h); });
    });
  }, {threshold:0.08});
  io.observe(grid);
})();

/* ============================================================
   4) SCROLL-PROGRESS BEAM
   ============================================================ */
(function beam(){
  var b=document.createElement('div'); b.className='scroll-beam'; b.setAttribute('aria-hidden','true');
  document.body.appendChild(b);
  var ticking=false;
  function upd(){
    var h=document.documentElement; var max=h.scrollHeight-h.clientHeight;
    var p=max>0 ? h.scrollTop/max : 0;
    b.style.transform='scaleX('+p.toFixed(4)+')';
    ticking=false;
  }
  window.addEventListener('scroll', function(){ if(!ticking){ ticking=true; requestAnimationFrame(upd); } }, {passive:true});
  upd();
})();

/* ============================================================
   5) CATALOG — LIVE HPLC CHROMATOGRAM TRACE (chart-recorder)
   ============================================================ */
(function catalogTrace(){
  var cat=document.getElementById('catalog'); if(!cat) return;
  var head=cat.querySelector('.cat-head'); if(!head) return;
  var band=document.createElement('div'); band.className='cat-trace-band'; band.setAttribute('aria-hidden','true');
  var canvas=document.createElement('canvas'); band.appendChild(canvas);
  cat.insertBefore(band, cat.firstChild);
  var ctx=canvas.getContext('2d'); var W=0,H=0;
  function size(){ var r=band.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height); canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR); canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0); }
  if('ResizeObserver' in window){ new ResizeObserver(size).observe(band); } else { window.addEventListener('resize', size); }
  size();

  // one periodic run of peaks, tiled seamlessly
  var P=46, peaks=[], r=(function(){var s=20240617>>>0;return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();
  (function(){
    var x=2.5;
    while(x<P-2){
      var big=r()<0.16;
      peaks.push({c:x, h:big?(0.62+r()*0.42):(0.05+r()*0.16), w:big?(0.5+r()*0.4):(0.18+r()*0.16)});
      x += 0.7 + r()*3.4;
    }
  })();
  function trace(u){
    var um=((u%P)+P)%P, y=0;
    for(var k=-1;k<=1;k++){ for(var i=0;i<peaks.length;i++){ var pk=peaks[i]; var dx=um-(pk.c+k*P); y+=pk.h*Math.exp(-(dx*dx)/(2*pk.w*pk.w)); } }
    return Math.min(1.05,y);
  }
  function accent(){ var v=getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim(); return v||'231,192,106'; }

  var scrollT=0, raf=0, vis=true, last=0;
  var UNITS_PER_W=12;
  function render(now){
    var rgb=accent();
    var base=H-14, amp=H-30;
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba('+rgb+',.22)'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,base); ctx.lineTo(W,base); ctx.stroke();
    var scale=W/UNITS_PER_W, px, u, v, yy;
    ctx.beginPath();
    for(px=0; px<=W; px+=2){ u=scrollT + px/scale; v=trace(u); yy=base - v*amp; if(px===0)ctx.moveTo(px,yy); else ctx.lineTo(px,yy); }
    ctx.lineTo(W,base); ctx.lineTo(0,base); ctx.closePath();
    var fg=ctx.createLinearGradient(0,0,0,base); fg.addColorStop(0,'rgba('+rgb+',.16)'); fg.addColorStop(1,'rgba('+rgb+',0)');
    ctx.fillStyle=fg; ctx.fill();
    var lg=ctx.createLinearGradient(0,0,W,0); lg.addColorStop(0,'rgba('+rgb+',0)'); lg.addColorStop(.12,'rgba('+rgb+',.85)'); lg.addColorStop(.9,'rgba('+rgb+',.85)'); lg.addColorStop(1,'rgba('+rgb+',0)');
    ctx.beginPath();
    for(px=0; px<=W; px+=2){ u=scrollT + px/scale; v=trace(u); yy=base - v*amp; if(px===0)ctx.moveTo(px,yy); else ctx.lineTo(px,yy); }
    ctx.strokeStyle=lg; ctx.lineWidth=1.6; ctx.lineJoin='round'; ctx.stroke();
    var penU=scrollT + W/scale, penY=base - trace(penU)*amp;
    ctx.fillStyle='rgba('+rgb+',.9)'; ctx.shadowColor='rgba('+rgb+',.9)'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(W-2,penY,2.4,0,6.2832); ctx.fill(); ctx.shadowBlur=0;
    if(!reduce){ var dt=last?Math.min(64,now-last):16; last=now; scrollT+=dt*0.0016; raf=requestAnimationFrame(render); }
  }
  function start(){ if(reduce){ scrollT=8; last=0; render(0); return; } if(!raf&&vis){ last=0; raf=requestAnimationFrame(render); } }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; } }
  if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ vis=es[0].isIntersecting; if(vis)start(); else stop(); },{threshold:0}).observe(cat); }
  document.addEventListener('visibilitychange', function(){ if(document.hidden) stop(); else if(vis) start(); });
  canvas.__trace=function(){ var k=scrollT; scrollT=8; render(0); scrollT=k; };
  start();
})();

})();
