/* ============================================================
   ELYRIA BIO — "THE LIVING ASSAY"  (hero canvas engine)
   A luminous peptide double-helix that condenses out of a
   scattered cloud on load, rotates forever, and is periodically
   swept by a verification scan-plane. Cursor tilts the scene.
   Plus a live micro-chromatogram + purity counter in the chip.
   Hand-written canvas 2D. No libraries. Graceful fallbacks.
   Palette locked to the house gold-on-abyss tokens.
   ============================================================ */
(function(){
"use strict";

var reduce  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isSmall = window.matchMedia && window.matchMedia('(max-width:760px)').matches;

var stage  = document.getElementById('hero');
var canvas = document.getElementById('assayCanvas');
if(!stage || !canvas){ return; }
var ctx = canvas.getContext('2d');
var DPR = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);

/* ---------- palette ---------- */
var GOLD  = [231,192,106];   // --accent
var BRIGHT= [246,225,164];   // pale gold
var WHITE = [255,247,222];   // white-gold highlight
var DEEP  = [150,112,52];    // deep gold shadow
var AMBER = [214,150,74];    // warm accent (few "ion" residues)
function rgba(c,a){ return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; }

/* ---------- math ---------- */
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function easeOut(t){ return 1-Math.pow(1-t,3); }
function easeInOut(t){ return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
var TAU = Math.PI*2;

/* ---------- geometry ---------- */
var W=0,H=0, cx=0, cy=0, unit=0;
function resize(){
  W = stage.clientWidth; H = stage.clientHeight;
  canvas.width = Math.round(W*DPR); canvas.height = Math.round(H*DPR);
  canvas.style.width=W+'px'; canvas.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
  cx = W * (isSmall ? 0.5 : 0.63);
  cy = H * (isSmall ? 0.46 : 0.5);
  unit = Math.max(64, Math.min(H*0.135, W*0.16));
}

/* ---------- the molecule: two intertwined Cα strands ---------- */
var N = 26;                 
var Rh = 1.16;              // helix radius (model units)
var TURNS = 2.55;           // full turns across the strand
var HH = 1.92;              // half-height (model units)
var nodes = [];             // both strands, interleaved
(function buildModel(){
  var seed = 20260426;
  function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  for(var i=0;i<N;i++){
    var f = N===1?0:i/(N-1);
    var a = f*TURNS*TAU;
    var y = (f-0.5)*2*HH;
    for(var s=0;s<2;s++){
      var ang = a + s*Math.PI;
      // a rare warm "ion" node for subtle variety, else gold family
      var warm = (i*2+s) % 11 === 4;
      nodes.push({
        // target position
        tx: Math.cos(ang)*Rh, ty: y, tz: Math.sin(ang)*Rh,
        // scattered origin (condenses in from the void)
        ox:(rnd()*2-1)*3.4, oy:(rnd()*2-1)*3.0, oz:(rnd()*2-1)*3.4,
        strand: s, idx: i,
        base: warm ? AMBER : GOLD,
        rad: 0.086 + (i%5===0?0.03:0) + rnd()*0.012,
        delay: 0.12 + f*0.62 + s*0.02,     // assembly stagger (0..~0.8)
        spin: rnd()*TAU
      });
    }
  }
})();

/* rungs (H-bond base pairs) connecting the two strands at each rung level */
var rungs = [];
for(var i=0;i<N;i++){ if(i%1===0){ rungs.push([i*2, i*2+1]); } }

/* ---------- projection ---------- */
function project(x,y,z, ry, rx){
  var cyr=Math.cos(ry), syr=Math.sin(ry);
  var x1 = x*cyr - z*syr, z1 = x*syr + z*cyr;
  var cxr=Math.cos(rx), sxr=Math.sin(rx);
  var y1 = y*cxr - z1*sxr, z2 = y*sxr + z1*cxr;
  var FOV = 4.6;
  var d = FOV/(FOV + z2);
  return { x: cx + x1*unit*d, y: cy + y1*unit*d, z: z2, d: d };
}

/* ---------- pointer parallax ---------- */
var ptr = { x:0, y:0, tx:0, ty:0 };
var fine = window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches;
if(fine){
  window.addEventListener('mousemove', function(e){
    var r = stage.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left)/r.width - 0.5);
    ptr.ty = ((e.clientY - r.top )/r.height- 0.5);
  }, {passive:true});
  window.addEventListener('mouseleave', function(){ ptr.tx=0; ptr.ty=0; });
}

/* ---------- particle lattice ---------- */
var motes = [];
function buildMotes(){
  var n = isSmall ? 34 : 78;
  motes = [];
  for(var i=0;i<n;i++){
    motes.push({ x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-0.5)*0.16, vy:-(0.04+Math.random()*0.20),
      r:0.5+Math.random()*1.6, a:0.05+Math.random()*0.3, tw:Math.random()*TAU });
  }
}

/* ---------- assembly + scan timeline ---------- */
var t0 = performance.now();
var ASSEMBLE = 2.6;          // seconds to fully condense
var SCAN_PERIOD = 7.4;       // seconds between verification sweeps
var SCAN_DUR = 2.1;          // seconds a sweep takes
var lastScanEnd = -1, pulsed = false;

/* chip DOM */
var chip      = document.getElementById('assayChip');
var purityEl  = document.getElementById('assayPurity');
var traceCv   = document.getElementById('assayTrace');
var tctx = traceCv ? traceCv.getContext('2d') : null;
var TW=0,TH=0;
function sizeTrace(){
  if(!traceCv) return;
  TW = traceCv.clientWidth; TH = traceCv.clientHeight;
  traceCv.width=Math.round(TW*DPR); traceCv.height=Math.round(TH*DPR);
  tctx.setTransform(DPR,0,0,DPR,0,0);
}

/* ---------- the micro chromatogram (HPLC trace) ---------- */
var peaks = [ {c:0.20,w:0.028,h:0.16},{c:0.30,w:0.020,h:0.10},
              {c:0.52,w:0.034,h:0.98},   // main peak (the product)
              {c:0.66,w:0.020,h:0.12},{c:0.80,w:0.026,h:0.20} ];
function traceY(x){
  var y=0.04;
  for(var i=0;i<peaks.length;i++){ var p=peaks[i]; var d=(x-p.c)/p.w; y+=p.h*Math.exp(-d*d); }
  return y;
}
function drawTrace(elapsed){
  if(!tctx) return;
  tctx.clearRect(0,0,TW,TH);
  var pad=2, base=TH-3, top=5;
  // grid baseline
  tctx.strokeStyle=rgba(GOLD,.14); tctx.lineWidth=1;
  tctx.beginPath(); tctx.moveTo(0,base); tctx.lineTo(TW,base); tctx.stroke();
  // reveal sweep across the trace during assembly, then keep full
  var reveal = reduce?1:clamp(elapsed/2.0,0,1);
  var rx = pad + reveal*(TW-pad*2);
  // filled area
  tctx.beginPath(); tctx.moveTo(pad,base);
  var xx,yy;
  for(var px=pad; px<=rx; px+=2){
    var fx=(px-pad)/(TW-pad*2); yy=base-(traceY(fx)/1.02)*(base-top);
    tctx.lineTo(px,yy);
  }
  tctx.lineTo(rx,base); tctx.closePath();
  var g=tctx.createLinearGradient(0,top,0,base);
  g.addColorStop(0,rgba(BRIGHT,.34)); g.addColorStop(1,rgba(GOLD,.02));
  tctx.fillStyle=g; tctx.fill();
  // stroke line
  tctx.beginPath();
  for(var px2=pad; px2<=rx; px2+=1.5){
    var fx2=(px2-pad)/(TW-pad*2); yy=base-(traceY(fx2)/1.02)*(base-top);
    if(px2===pad) tctx.moveTo(px2,yy); else tctx.lineTo(px2,yy);
  }
  tctx.strokeStyle=rgba(BRIGHT,.9); tctx.lineWidth=1.5; tctx.lineJoin='round'; tctx.stroke();
  // moving scan cursor with glow, once revealed
  if(reveal>=1 && !reduce){
    var sc=(elapsed*0.16)%1; var sx=pad+sc*(TW-pad*2);
    tctx.globalCompositeOperation='lighter';
    var sg=tctx.createLinearGradient(sx-10,0,sx+10,0);
    sg.addColorStop(0,rgba(WHITE,0)); sg.addColorStop(.5,rgba(WHITE,.5)); sg.addColorStop(1,rgba(WHITE,0));
    tctx.fillStyle=sg; tctx.fillRect(sx-10,top,20,base-top);
    tctx.globalCompositeOperation='source-over';
  }
  // label the product peak
  var mainX=pad+peaks[2].c*(TW-pad*2), mainY=base-(traceY(peaks[2].c)/1.02)*(base-top);
  if(reveal>0.6){
    tctx.fillStyle=rgba(WHITE,.9); tctx.beginPath(); tctx.arc(mainX,mainY,2,0,TAU); tctx.fill();
  }
}

/* ---------- render ---------- */
function drawAurora(t){
  // two slow-drifting gold blooms + vignette, additive
  ctx.globalCompositeOperation='lighter';
  var bx=cx+Math.cos(t*0.16)*W*0.05, by=cy+Math.sin(t*0.12)*H*0.06;
  var g1=ctx.createRadialGradient(bx,by,0,bx,by,unit*4.6);
  g1.addColorStop(0,rgba(GOLD,.16)); g1.addColorStop(0.5,rgba(DEEP,.05)); g1.addColorStop(1,rgba(GOLD,0));
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H);
  var lx=W*0.5+Math.sin(t*0.1)*W*0.04, ly=H*1.02;
  var g2=ctx.createRadialGradient(lx,ly,0,lx,ly,H*0.7);
  g2.addColorStop(0,rgba(AMBER,.10)); g2.addColorStop(1,rgba(AMBER,0));
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='source-over';
}

function drawMotes(t){
  ctx.globalCompositeOperation='lighter';
  for(var i=0;i<motes.length;i++){
    var m=motes[i]; m.x+=m.vx; m.y+=m.vy; m.tw+=0.03;
    if(m.y<-6){ m.y=H+6; m.x=Math.random()*W; }
    if(m.x<-6) m.x=W+6; if(m.x>W+6) m.x=-6;
    var a=m.a*(0.6+0.4*Math.sin(m.tw));
    ctx.fillStyle=rgba(BRIGHT,a); ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,TAU); ctx.fill();
  }
  // faint constellation lines between nearby motes
  ctx.lineWidth=1;
  for(var p=0;p<motes.length;p++){
    for(var q=p+1;q<motes.length;q++){
      var dx=motes[p].x-motes[q].x, dy=motes[p].y-motes[q].y; var d2=dx*dx+dy*dy;
      if(d2<9000){ var al=(1-d2/9000)*0.06; ctx.strokeStyle=rgba(GOLD,al);
        ctx.beginPath(); ctx.moveTo(motes[p].x,motes[p].y); ctx.lineTo(motes[q].x,motes[q].y); ctx.stroke(); }
    }
  }
  ctx.globalCompositeOperation='source-over';
}

function render(now){
  var t = (now - t0)/1000;
  var asm = reduce ? 1 : easeOut(clamp(t/ASSEMBLE,0,1));

  // rotation: continuous spin + gentle wobble + pointer parallax
  ptr.x += (ptr.tx-ptr.x)*0.06; ptr.y += (ptr.ty-ptr.y)*0.06;
  var ry = (reduce? -0.5 : (t*0.24)) + ptr.x*0.9;
  var rx = -0.42 + (reduce?0:Math.sin(t*0.5)*0.05) + ptr.y*0.5;

  // scan plane position (screen Y), active in a window of each period
  var scanActive=false, scanY=0, scanProg=0;
  if(!reduce && t>ASSEMBLE){
    var ph = (t-ASSEMBLE) % SCAN_PERIOD;
    if(ph < SCAN_DUR){ scanActive=true; scanProg=ph/SCAN_DUR;
      scanY = (cy-unit*HH*1.15) + easeInOut(scanProg)*(unit*HH*2.3); }
    // verified pulse right after a sweep completes
    var cyc = Math.floor((t-ASSEMBLE)/SCAN_PERIOD);
    if(ph>=SCAN_DUR && cyc!==lastScanEnd){ lastScanEnd=cyc; firePulse(); }
  }

  ctx.clearRect(0,0,W,H);
  drawAurora(t);
  drawMotes(t);

  // project nodes
  var proj=[], i, n, px,py,pz;
  for(i=0;i<nodes.length;i++){
    n=nodes[i];
    var na = reduce?1:easeOut(clamp((t - n.delay*ASSEMBLE)/ (ASSEMBLE*0.5),0,1));
    px=lerp(n.ox,n.tx,na); py=lerp(n.oy,n.ty,na); pz=lerp(n.oz,n.tz,na);
    var pr=project(px,py,pz, ry,rx);
    var flare=0;
    if(scanActive){ var dd=Math.abs(pr.y-scanY); if(dd<46) flare=(1-dd/46); }
    proj.push({ n:n, x:pr.x, y:pr.y, z:pr.z, d:pr.d, a:na*asm, flare:flare });
  }

  // depth sort far→near
  proj.sort(function(a,b){ return b.z-a.z; });

  // draw backbone within each strand + rungs (behind nodes)
  ctx.globalCompositeOperation='lighter';
  drawBonds(proj, ry, rx, t);

  // scan plane visual
  if(scanActive) drawScanPlane(scanY, scanProg);

  // draw nodes near→far? we sorted far→near so painters works with additive
  for(i=0;i<proj.length;i++) drawNode(proj[i]);
  ctx.globalCompositeOperation='source-over';

  // verified pulse ring
  drawPulses(now);

  // chip trace + purity
  drawTrace(t);
  if(purityEl){
    var pv = reduce?99.5:(clamp(t/2.2,0,1)*99.5);
    purityEl.textContent = pv.toFixed(1);
  }

  if(!reduce) raf = requestAnimationFrame(render);
}

/* bonds: consecutive same-strand nodes + rungs. Uses model->proj lookup */
function drawBonds(proj, ry, rx, t){
  // build index: node ref → projected
  var map = new Map();
  for(var i=0;i<proj.length;i++) map.set(proj[i].n, proj[i]);
  // backbone
  for(var s=0;s<2;s++){
    for(var k=0;k<N-1;k++){
      var A=map.get(nodes[k*2+s]), B=map.get(nodes[(k+1)*2+s]);
      if(!A||!B) continue;
      var a=Math.min(A.a,B.a); if(a<=0.02) continue;
      var dep=(A.d+B.d)/2;
      ctx.strokeStyle=rgba(GOLD, 0.34*a*clamp(dep-0.3,0,1));
      ctx.lineWidth=1.5*dep;
      ctx.beginPath(); ctx.moveTo(A.x,A.y); ctx.lineTo(B.x,B.y); ctx.stroke();
    }
  }
  // rungs
  for(var r=0;r<rungs.length;r++){
    var P=map.get(nodes[rungs[r][0]]), Q=map.get(nodes[rungs[r][1]]);
    if(!P||!Q) continue;
    var aa=Math.min(P.a,Q.a); if(aa<=0.02) continue;
    var dp=(P.d+Q.d)/2;
    var fl=Math.max(P.flare,Q.flare);
    ctx.strokeStyle=rgba(fl>0?WHITE:BRIGHT, (0.10+0.4*fl)*aa*clamp(dp-0.2,0,1));
    ctx.lineWidth=(1+fl*1.4)*dp;
    ctx.beginPath(); ctx.moveTo(P.x,P.y); ctx.lineTo(Q.x,Q.y); ctx.stroke();
  }
}

function drawNode(o){
  if(o.a<=0.02) return;
  var n=o.n;
  var r = Math.max(1.2, n.rad*unit*o.d);
  var depthN = clamp((o.d-0.55)/0.6,0,1);          // near = brighter
  var col = o.flare>0.02 ? WHITE : n.base;
  var glowA = (0.34 + 0.5*depthN + 0.5*o.flare) * o.a;
  var rr = r*(3.6 + o.flare*1.6);
  // glow
  var g=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,rr);
  g.addColorStop(0, rgba(col, glowA));
  g.addColorStop(0.35, rgba(o.flare>0?BRIGHT:GOLD, glowA*0.4));
  g.addColorStop(1, rgba(GOLD,0));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,o.y,rr,0,TAU); ctx.fill();
  // core (source-over pip for crispness)
  ctx.globalCompositeOperation='source-over';
  var hx=o.x-r*0.32, hy=o.y-r*0.32;
  var c=ctx.createRadialGradient(hx,hy,0,o.x,o.y,r);
  c.addColorStop(0, rgba(WHITE, 0.96*o.a));
  c.addColorStop(0.5, rgba(o.flare>0?WHITE:BRIGHT, 0.92*o.a));
  c.addColorStop(1, rgba(o.flare>0?GOLD:DEEP, o.a));
  ctx.fillStyle=c; ctx.beginPath(); ctx.arc(o.x,o.y,r,0,TAU); ctx.fill();
  ctx.strokeStyle=rgba(WHITE, (0.22+0.4*o.flare)*o.a*depthN); ctx.lineWidth=1;
  ctx.stroke();
  ctx.globalCompositeOperation='lighter';
}

function drawScanPlane(y, prog){
  var w=unit*4.2, x=cx;
  var grad=ctx.createLinearGradient(0,y-26,0,y+26);
  grad.addColorStop(0,rgba(WHITE,0)); grad.addColorStop(0.5,rgba(WHITE,0.32*(1-Math.abs(prog-0.5)*0.7)));
  grad.addColorStop(1,rgba(WHITE,0));
  ctx.fillStyle=grad; ctx.fillRect(x-w/2, y-26, w, 52);
  // crisp center line
  ctx.strokeStyle=rgba(WHITE,0.5); ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x-w/2,y); ctx.lineTo(x+w/2,y); ctx.stroke();
  // edge ticks
  ctx.fillStyle=rgba(GOLD,0.7);
  ctx.fillRect(x-w/2-3,y-4,3,8); ctx.fillRect(x+w/2,y-4,3,8);
}

/* verified pulses */
var pulses=[];
function firePulse(){
  pulses.push({ t:performance.now(), max:unit*3.4 });
  if(chip){ chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse'); }
}
function drawPulses(now){
  ctx.globalCompositeOperation='lighter';
  for(var i=pulses.length-1;i>=0;i--){
    var p=pulses[i]; var e=(now-p.t)/1100; if(e>=1){ pulses.splice(i,1); continue; }
    var r=easeOut(e)*p.max; var a=(1-e)*0.5;
    ctx.strokeStyle=rgba(BRIGHT,a); ctx.lineWidth=1.6*(1-e);
    ctx.beginPath(); ctx.arc(cx,cy,r,0,TAU); ctx.stroke();
  }
  ctx.globalCompositeOperation='source-over';
}

/* ---------- boot ---------- */
var raf=0;
function boot(){ resize(); sizeTrace(); buildMotes(); if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(render); }
var rz; window.addEventListener('resize', function(){ clearTimeout(rz); rz=setTimeout(function(){ resize(); sizeTrace(); buildMotes(); if(reduce) render(performance.now()+999999); }, 160); });

if(reduce){
  resize(); sizeTrace(); buildMotes();
  render(performance.now()+ 999999); // one static assembled frame
} else {
  boot();
  // pause when off-screen
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){
      if(es[0].isIntersecting){ if(!raf) raf=requestAnimationFrame(render); }
      else { if(raf){ cancelAnimationFrame(raf); raf=0; } }
    },{threshold:0}).observe(stage);
  }
}
})();
