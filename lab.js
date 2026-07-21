/* ============================================================
   ELYRIA BIO — VERIFICATION LAB
   A) Orbitable 3D peptide structure viewer (quick-view)
   B) Interactive instrument-grade COA chromatogram
   D) Shared-element View Transitions (vial morphs into modal)
   Hand-built. No libraries. Progressive + graceful fallbacks.
   ============================================================ */
(function(){
"use strict";

var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isSmall = window.matchMedia('(max-width: 760px)').matches;
var DPR = Math.min(window.devicePixelRatio || 1, isSmall ? 1.4 : 2);
var supportsVT = typeof document.startViewTransition === 'function' && !reduce;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function easeOut(t){ return 1-Math.pow(1-t,3); }
function seedFrom(s){ var h=0,i; for(i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
function rng(seed){ var s=seed>>>0; return function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }

/* ============================================================
   RESIDUE DATA — peptide backbones (schematic, residue-resolution)
   ============================================================ */
var CLASS = {
  hydro:{c:'#e7c06a', label:'Hydrophobic'},
  polar:{c:'#bcccc7', label:'Polar'},
  pos:{c:'#6fa6df', label:'Basic (+)'},
  neg:{c:'#e0818f', label:'Acidic (\u2212)'},
  metal:{c:'#d98a4a', label:'Metal ion'}
};
var RESCLASS = {
  ALA:'hydro',VAL:'hydro',LEU:'hydro',ILE:'hydro',PRO:'hydro',PHE:'hydro',TRP:'hydro',MET:'hydro',AIB:'hydro',NAL:'hydro',
  GLY:'polar',SER:'polar',THR:'polar',ASN:'polar',GLN:'polar',TYR:'polar',CYS:'polar',
  LYS:'pos',ARG:'pos',HIS:'pos',
  ASP:'neg',GLU:'neg',
  CU:'metal'
};
var POOL = ['ALA','VAL','LEU','ILE','PRO','PHE','SER','THR','GLY','TYR','LYS','ARG','HIS','ASP','GLU','GLN','ASN','TRP','MET'];

var SEQ = {
  bpc157:['GLY','GLU','PRO','PRO','PRO','GLY','LYS','PRO','ALA','ASP','ASP','ALA','GLY','LEU','VAL'],
  ghkcu:['GLY','HIS','LYS','CU'],
  epi:['ALA','GLU','ASP','GLY'],
  ipa:['AIB','HIS','NAL','PHE','LYS'],
  tb500:['LEU','LYS','LYS','THR','GLU','THR','GLN'],
  sema:['HIS','ALA','GLU','GLY','THR','PHE','THR','SER','ASP','VAL','SER','SER','TYR','LEU','GLU','GLY','GLN','ALA','ALA','LYS','GLU','PHE','ILE','ALA','TRP','LEU','VAL','ARG','GLY','ARG','GLY']
};
var KNOWN = {bpc157:1,ghkcu:1,epi:1,ipa:1,sema:1};   // real published sequences
var GENLEN = {tirz:39, reta:39, tb500:43};            // schematic length where full seq is long

function sequenceFor(p){
  if(SEQ[p.id] && KNOWN[p.id]) return {codes:SEQ[p.id], known:true};
  var n = GENLEN[p.id] || (SEQ[p.id]?SEQ[p.id].length:12);
  if(SEQ[p.id] && !GENLEN[p.id]) return {codes:SEQ[p.id], known:false};
  var r = rng(seedFrom(p.id+p.name)); var codes=[];
  for(var i=0;i<n;i++) codes.push(POOL[Math.floor(r()*POOL.length)]);
  return {codes:codes, known:false};
}

/* ============================================================
   A) 3D PEPTIDE STRUCTURE VIEWER
   ============================================================ */
function buildGraph(p){
  var sq = sequenceFor(p);
  var codes = sq.codes, N = codes.length;
  var r = rng(seedFrom(p.id+'fold'));
  // smooth folded 3D backbone from summed sinusoids (compact, organic, distinct)
  var A=[18+r()*22,10+r()*16], B=[18+r()*22,10+r()*16], C=[18+r()*22,10+r()*16];
  var fa=[0.7+r()*1.5,1.7+r()*2.2], fb=[0.7+r()*1.5,1.7+r()*2.2], fc=[0.7+r()*1.5,1.7+r()*2.2];
  var pa=[r()*6.28,r()*6.28], pb=[r()*6.28,r()*6.28], pc=[r()*6.28,r()*6.28];
  var span = 5.5 + r()*2.5;
  var pts=[], i;
  for(i=0;i<N;i++){
    var u = N>1 ? (i/(N-1))*span : 0;
    pts.push({
      x: A[0]*Math.sin(fa[0]*u+pa[0]) + A[1]*Math.sin(fa[1]*u+pa[1]),
      y: B[0]*Math.sin(fb[0]*u+pb[0]) + B[1]*Math.cos(fb[1]*u+pb[1]),
      z: C[0]*Math.cos(fc[0]*u+pc[0]) + C[1]*Math.sin(fc[1]*u+pc[1])
    });
  }
  // center + scale to a stable bounding radius
  var cx=0,cy=0,cz=0; pts.forEach(function(q){cx+=q.x;cy+=q.y;cz+=q.z;}); cx/=N;cy/=N;cz/=N;
  var maxr=1; pts.forEach(function(q){ q.x-=cx;q.y-=cy;q.z-=cz; var d=Math.hypot(q.x,q.y,q.z); if(d>maxr)maxr=d; });
  var k=132/maxr;
  var nodes=[];
  for(i=0;i<N;i++){
    var q=pts[i];
    // side-chain offset: along the curve normal (cross of tangent & up)
    var t = pts[Math.min(N-1,i+1)], pv = pts[Math.max(0,i-1)];
    var tx=t.x-pv.x, ty=t.y-pv.y, tz=t.z-pv.z;
    var nx=ty*0-tz*1, ny=tz*0-tx*0, nz=tx*1-ty*0;          // tangent × (0,0,1)/(0,1,0) mix
    var nl=Math.hypot(nx,ny,nz)||1;
    var cls = RESCLASS[codes[i]] || 'polar';
    var isMetal = cls==='metal';
    nodes.push({
      x:q.x*k, y:q.y*k, z:q.z*k,
      sx:q.x*k + (nx/nl)*(isMetal?0:20), sy:q.y*k + (ny/nl)*(isMetal?0:20), sz:q.z*k + (nz/nl)*(isMetal?0:20),
      code:codes[i], cls:cls, metal:isMetal
    });
  }
  return {nodes:nodes, codes:codes, known:sq.known, N:N};
}

function hexToRgb(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]; }

function mountMoleculeViewer(canvas, p){
  var ctx = canvas.getContext('2d');
  var graph = buildGraph(p);
  var host = canvas.parentElement;
  var W=0,H=0;
  function resize(){
    var r = host.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height);
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  var ro; if('ResizeObserver' in window){ ro=new ResizeObserver(resize); ro.observe(host); }

  var yaw=0.5, pitch=-0.35, tYaw=yaw, tPitch=pitch, vy=0, vp=0, dragging=false, lastX=0, lastY=0, idle=0;
  var FOCAL=560;

  function project(x,y,z){
    var cy=Math.cos(yaw), sy=Math.sin(yaw);
    var X=x*cy - z*sy, Z=x*sy + z*cy;
    var cp=Math.cos(pitch), sp=Math.sin(pitch);
    var Y=y*cp - Z*sp, Zt=y*sp + Z*cp;
    var s=FOCAL/Math.max(120,FOCAL+Zt);
    return {x:W/2 + X*s*(Math.min(W,H)/420), y:H/2 + Y*s*(Math.min(W,H)/420), z:Zt, s:s};
  }

  function draw(reveal){
    ctx.clearRect(0,0,W,H);
    var nodes=graph.nodes, N=graph.N;
    var shown = Math.round(N*reveal);
    var items=[];
    for(var i=0;i<shown;i++){
      var n=nodes[i];
      var pc=project(n.x,n.y,n.z);
      items.push({px:pc.x,py:pc.y,z:pc.z,r:(n.metal?13:11)*pc.s,cls:n.cls,kind:'ca',idx:i});
      if(!n.metal){
        var ps=project(n.sx,n.sy,n.sz);
        items.push({px:ps.x,py:ps.y,z:ps.z,r:6.5*ps.s,cls:n.cls,kind:'side',idx:i});
      }
    }
    // backbone bonds (under spheres, additive)
    ctx.globalCompositeOperation='lighter';
    for(i=1;i<shown;i++){
      var a=project(nodes[i-1].x,nodes[i-1].y,nodes[i-1].z), b=project(nodes[i].x,nodes[i].y,nodes[i].z);
      var g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
      g.addColorStop(0,'rgba(247,225,164,.5)'); g.addColorStop(1,'rgba(207,159,74,.5)');
      ctx.strokeStyle=g; ctx.lineWidth=Math.max(1.4,3.0*((a.s+b.s)/2));
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    }
    ctx.globalCompositeOperation='source-over';

    items.sort(function(u,v){ return v.z-u.z; });
    for(i=0;i<items.length;i++){
      var it=items[i]; if(it.r<=0.4) continue;
      var rgb=hexToRgb(CLASS[it.cls].c);
      var d=clamp((it.z+150)/300,0,1);
      var hx=it.px-it.r*0.34, hy=it.py-it.r*0.4;
      var gr=ctx.createRadialGradient(hx,hy,it.r*0.1,it.px,it.py,it.r);
      var lo=it.kind==='side'?0.55:0.85;
      gr.addColorStop(0,'rgba(255,252,244,'+(0.55+0.4*d)+')');
      gr.addColorStop(0.4,'rgba('+Math.round(lerp(rgb[0]*0.7,rgb[0],d))+','+Math.round(lerp(rgb[1]*0.7,rgb[1],d))+','+Math.round(lerp(rgb[2]*0.7,rgb[2],d))+','+lo+')');
      gr.addColorStop(1,'rgba('+Math.round(rgb[0]*0.34)+','+Math.round(rgb[1]*0.34)+','+Math.round(rgb[2]*0.34)+','+lo+')');
      ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(it.px,it.py,it.r,0,6.2832); ctx.fill();
    }
  }

  var revealP=0, raf=0, running=false, visible=true;
  canvas.__draw = function(p){ draw(p==null?1:p); };   // debug/inert hook
  function frame(){
    idle++;
    if(!dragging){
      if(Math.abs(vy)>0.0002||Math.abs(vp)>0.0002){ yaw+=vy; pitch+=vp; vy*=0.94; vp*=0.94; }
      else { yaw += 0.0036; }          // gentle idle auto-spin
    }
    pitch=clamp(pitch,-1.2,1.2);
    revealP += (1-revealP)*0.06; if(revealP>0.999) revealP=1;
    draw(reduce?1:revealP);
    raf=requestAnimationFrame(frame);
  }
  function start(){ if(!running&&visible){ running=true; raf=requestAnimationFrame(frame); } }
  function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }

  function down(e){ dragging=true; idle=0; var t=e.touches?e.touches[0]:e; lastX=t.clientX; lastY=t.clientY; vy=vp=0; }
  function move(e){ if(!dragging) return; var t=e.touches?e.touches[0]:e; var dx=t.clientX-lastX, dy=t.clientY-lastY; lastX=t.clientX; lastY=t.clientY; vy=dx*0.006; vp=dy*0.006; yaw+=vy; pitch+=vp; if(e.cancelable&&e.touches) e.preventDefault(); }
  function up(){ dragging=false; }
  canvas.addEventListener('mousedown',down); window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  canvas.addEventListener('touchstart',down,{passive:true}); canvas.addEventListener('touchmove',move,{passive:false}); canvas.addEventListener('touchend',up);

  if(reduce){ resize(); draw(1); return {destroy:function(){ if(ro)ro.disconnect(); window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); }}; }
  start();
  return {
    pause:stop, resume:start,
    setVisible:function(v){ visible=v; if(v) start(); else stop(); },
    destroy:function(){ stop(); if(ro)ro.disconnect(); window.removeEventListener('mousemove',move); window.removeEventListener('mouseup',up); }
  };
}

/* ============================================================
   B) INTERACTIVE COA CHROMATOGRAM
   ============================================================ */
function buildPeaks(p){
  var r = rng(seedFrom(p.name+'hplc'));
  var purity = parseFloat(p.purity)||99;
  var rem = Math.max(0.15, 100-purity);
  var mainRT = 6.0 + r()*1.8;
  var peaks=[{name:p.name+' (main)', rt:mainRT, area:purity, w:0.17, kind:'main'}];
  var labels=['Des-amido analog','Oxidized form','TFA adduct','Truncated (\u22121)','Acetylated'];
  var nImp = 3 + Math.floor(r()*2);
  var ws=[], sum=0, i;
  for(i=0;i<nImp;i++){ var w=0.3+r(); ws.push(w); sum+=w; }
  var used={};
  for(i=0;i<nImp;i++){
    var rt; do{ rt = 1.4 + r()*12.4; } while(Math.abs(rt-mainRT)<0.9);
    peaks.push({name:labels[i%labels.length], rt:rt, area:rem*ws[i]/sum, w:0.10+r()*0.05, kind:'imp'});
  }
  // height (mAU): gaussian area = h*w*sqrt(2pi) -> h = area/w ; scale so main = 1000 mAU
  peaks.forEach(function(pk){ pk.h = pk.area/pk.w; });
  var mh = peaks[0].h;
  peaks.forEach(function(pk){ pk.mau = pk.h/mh*1000; });
  peaks.sort(function(a,b){ return a.rt-b.rt; });
  return peaks;
}

function mountChromatogram(container, p){
  var peaks = buildPeaks(p);
  var RUN=15;                       // minutes
  var view={t0:0,t1:RUN};
  var showThr=false;
  container.innerHTML =
    '<div class="cg-head"><span>RP-HPLC chromatogram</span><span class="mono">C18 \u00b7 214 nm \u00b7 1.0 mL/min</span></div>'+
    '<div class="cg-plot"><canvas></canvas><div class="cg-tip" hidden></div><div class="cg-brush" hidden></div></div>'+
    '<div class="cg-foot"><div class="cg-controls">'+
      '<button class="cg-btn" data-thr><span class="cg-sw"></span>0.5% impurity threshold</button>'+
      '<button class="cg-btn cg-reset" data-reset hidden>\u21ba Reset zoom</button>'+
      '</div><span class="cg-hint">Drag to zoom \u00b7 hover peaks</span></div>';
  var plot = container.querySelector('.cg-plot');
  var canvas = container.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var tip = container.querySelector('.cg-tip');
  var brush = container.querySelector('.cg-brush');
  var resetBtn = container.querySelector('[data-reset]');
  var thrBtn = container.querySelector('[data-thr]');
  var W=0,H=0,padL=34,padR=14,padT=12,padB=22;

  function resize(){
    var r=plot.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height);
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  function tx(t){ return padL + (t-view.t0)/(view.t1-view.t0)*(W-padL-padR); }
  function tInv(px){ return view.t0 + (px-padL)/(W-padL-padR)*(view.t1-view.t0); }
  function valAt(t){ var y=0; for(var i=0;i<peaks.length;i++){ var dt=t-peaks[i].rt; y+=peaks[i].mau*Math.exp(-(dt*dt)/(2*peaks[i].w*peaks[i].w)); } return y; }
  var MAXY=1080;
  function vy(v){ return (H-padB) - v/MAXY*(H-padB-padT); }

  function render(reveal){
    ctx.clearRect(0,0,W,H);
    // grid
    ctx.strokeStyle='rgba(231,192,106,.12)'; ctx.lineWidth=1; ctx.font='8px "IBM Plex Mono",monospace';
    var step = (view.t1-view.t0)>8?2.5:1;
    ctx.fillStyle='#9b9384'; ctx.textAlign='center';
    for(var t=Math.ceil(view.t0/step)*step; t<=view.t1+0.01; t+=step){
      var x=tx(t); ctx.beginPath(); ctx.moveTo(x,padT); ctx.lineTo(x,H-padB); ctx.stroke();
      ctx.fillText(t.toFixed(step<1?1:0), x, H-padB+12);
    }
    // baseline
    ctx.strokeStyle='rgba(231,192,106,.45)'; ctx.beginPath(); ctx.moveTo(padL,H-padB); ctx.lineTo(W-padR,H-padB); ctx.stroke();
    // threshold line
    if(showThr){
      var thy=vy(MAXY*0.005*1000/1000*5);   // 0.5% of main (1000 mAU) -> 5 mAU, lift visually
      thy=vy(peaks[0].mau*0.005*10);
      ctx.strokeStyle='rgba(224,129,143,.75)'; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(padL,thy); ctx.lineTo(W-padR,thy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='#e0818f'; ctx.textAlign='left'; ctx.fillText('0.5% LOQ', padL+4, thy-3);
    }
    // trace (animated reveal from left)
    var x0=padL, x1=padL+(W-padL-padR)*reveal;
    var grad=ctx.createLinearGradient(padL,0,W-padR,0);
    grad.addColorStop(0,'#cf9f4a'); grad.addColorStop(.55,'#f6e1a4'); grad.addColorStop(1,'#cf9f4a');
    // fill
    ctx.beginPath(); ctx.moveTo(x0,H-padB);
    for(var px=x0;px<=x1;px+=1.5){ var v=valAt(tInv(px)); ctx.lineTo(px,vy(v)); }
    ctx.lineTo(Math.min(x1,W-padR),H-padB); ctx.closePath();
    var fg=ctx.createLinearGradient(0,padT,0,H-padB); fg.addColorStop(0,'rgba(231,192,106,.28)'); fg.addColorStop(1,'rgba(231,192,106,0)');
    ctx.fillStyle=fg; ctx.fill();
    // stroke
    ctx.beginPath();
    for(px=x0;px<=x1;px+=1.5){ var v2=valAt(tInv(px)); if(px===x0)ctx.moveTo(px,vy(v2)); else ctx.lineTo(px,vy(v2)); }
    ctx.strokeStyle=grad; ctx.lineWidth=1.6; ctx.lineJoin='round'; ctx.stroke();
    // peak apex markers + main label
    if(reveal>0.98){
      for(var i=0;i<peaks.length;i++){
        var pk=peaks[i]; if(pk.rt<view.t0||pk.rt>view.t1) continue;
        var ax=tx(pk.rt), ay=vy(pk.mau);
        var hot = (hoverPk===i);
        if(pk.kind==='main'||hot){
          ctx.fillStyle='#fffaef'; ctx.strokeStyle='#cf9f4a'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.arc(ax,ay,hot?3.4:2.6,0,6.2832); ctx.fill(); ctx.stroke();
        }
        if(pk.kind==='main'){
          ctx.fillStyle='#e7c06a'; ctx.font='600 9px "IBM Plex Mono",monospace'; ctx.textAlign='left';
          ctx.fillText(pk.area.toFixed(1)+'%', ax+6, ay+3);
        }
      }
    }
    // axis labels
    ctx.fillStyle='#9b9384'; ctx.font='8px "IBM Plex Mono",monospace';
    ctx.textAlign='left'; ctx.fillText('mAU', padL-30, padT+6);
    ctx.textAlign='right'; ctx.fillText('min', W-padR, H-padB+12);
  }

  var hoverPk=-1, revealP=0, raf=0, running=false, visible=true;
  function tick(){ revealP += (1-revealP)*0.08; if(revealP>0.999)revealP=1; render(reduce?1:revealP); if(revealP<1){ raf=requestAnimationFrame(tick); } else { running=false; render(1); } }
  function kick(){ if(!running&&visible){ running=true; revealP=reduce?1:0; raf=requestAnimationFrame(tick); } }

  // hover tooltip
  function onMove(e){
    if(brushing){ return; }
    var r=plot.getBoundingClientRect(); var mx=e.clientX-r.left;
    var t=tInv(mx); var best=-1,bestd=1e9;
    for(var i=0;i<peaks.length;i++){ var d=Math.abs(peaks[i].rt-t); if(d<bestd){bestd=d;best=i;} }
    if(best>=0 && bestd < (peaks[best].w*1.8) && peaks[best].rt>=view.t0 && peaks[best].rt<=view.t1){
      hoverPk=best; var pk=peaks[best];
      tip.hidden=false;
      tip.innerHTML='<b>'+pk.name+'</b><span>RT '+pk.rt.toFixed(2)+' min</span><span>Area '+pk.area.toFixed(pk.area<1?2:1)+'%</span><span>'+Math.round(pk.mau)+' mAU</span>';
      var txp=clamp(tx(pk.rt)+10, 6, W-tip.offsetWidth-6);
      tip.style.left=txp+'px'; tip.style.top=Math.max(4,vy(pk.mau)-10)+'px';
    } else { hoverPk=-1; tip.hidden=true; }
    if(!running) render(1);
  }
  function onLeave(){ hoverPk=-1; tip.hidden=true; if(!running) render(1); }

  // brush zoom
  var brushing=false, bx0=0;
  function bDown(e){ var t=e.touches?e.touches[0]:e; var r=plot.getBoundingClientRect(); bx0=t.clientX-r.left; brushing=true; brush.hidden=false; brush.style.left=bx0+'px'; brush.style.width='0px'; tip.hidden=true; }
  function bMove(e){ if(!brushing) return; var t=e.touches?e.touches[0]:e; var r=plot.getBoundingClientRect(); var x=clamp(t.clientX-r.left,padL,W-padR); var l=Math.min(bx0,x), w=Math.abs(x-bx0); brush.style.left=l+'px'; brush.style.width=w+'px'; if(e.cancelable&&e.touches)e.preventDefault(); }
  function bUp(e){ if(!brushing) return; brushing=false; brush.hidden=true; var t=e.changedTouches?e.changedTouches[0]:e; var r=plot.getBoundingClientRect(); var x=clamp(t.clientX-r.left,padL,W-padR); var w=Math.abs(x-bx0); if(w>14){ var a=tInv(Math.min(bx0,x)), b=tInv(Math.max(bx0,x)); view.t0=clamp(a,0,RUN); view.t1=clamp(b,0,RUN); resetBtn.hidden=false; render(1); } }

  plot.addEventListener('mousemove',onMove); plot.addEventListener('mouseleave',onLeave);
  plot.addEventListener('mousedown',bDown); window.addEventListener('mousemove',bMove); window.addEventListener('mouseup',bUp);
  plot.addEventListener('touchstart',bDown,{passive:true}); plot.addEventListener('touchmove',bMove,{passive:false}); plot.addEventListener('touchend',bUp);
  plot.addEventListener('dblclick',function(){ view.t0=0; view.t1=RUN; resetBtn.hidden=true; render(1); });
  resetBtn.addEventListener('click',function(){ view.t0=0; view.t1=RUN; resetBtn.hidden=true; render(1); });
  thrBtn.addEventListener('click',function(){ showThr=!showThr; thrBtn.classList.toggle('on',showThr); render(running?revealP:1); });

  var ro2; if('ResizeObserver' in window){ ro2=new ResizeObserver(function(){ resize(); render(running?revealP:1); }); ro2.observe(plot); }
  resize(); render(reduce?1:0); canvas.__cg=function(){ render(1); }; kick();
  return {
    setVisible:function(v){ visible=v; },
    destroy:function(){ if(ro2)ro2.disconnect(); window.removeEventListener('mousemove',bMove); window.removeEventListener('mouseup',bUp); if(raf)cancelAnimationFrame(raf); }
  };
}

/* ============================================================
   QUICK-VIEW + COA INTEGRATION  (via window.LabHooks, called by store.js)
   ============================================================ */
var qvBody = document.getElementById('qvBody');
var coaBody = document.getElementById('coaBody');
var activeMol=null, activeCg=null, vtActive=false;

function enhanceQuick(){
  var vis = qvBody && qvBody.querySelector('.qv-vis'); if(!vis) return;
  if(activeMol){ activeMol.destroy(); activeMol=null; }
  var pid = qvBody.getAttribute('data-pid');
  var p = window.product ? window.product(pid) : null; if(!p) return;
  var sq = sequenceFor(p);

  var canvas=document.createElement('canvas'); canvas.className='mol3d'; canvas.setAttribute('aria-hidden','true'); vis.appendChild(canvas);
  var seg=document.createElement('div'); seg.className='vis-seg';
  seg.innerHTML='<button type="button" data-vis="mol">3D structure</button><button type="button" data-vis="vial" class="active">Vial</button>';
  vis.appendChild(seg);
  var hint=document.createElement('div'); hint.className='mol-hint'; hint.textContent='Drag to rotate'; vis.appendChild(hint);

  var classesUsed={}; sq.codes.forEach(function(c){ classesUsed[RESCLASS[c]||'polar']=1; });
  var legend=document.createElement('div'); legend.className='mol-legend';
  legend.innerHTML = Object.keys(classesUsed).map(function(k){ return '<span><i style="background:'+CLASS[k].c+'"></i>'+CLASS[k].label+'</span>'; }).join('');
  vis.appendChild(legend);

  var cap=document.createElement('div'); cap.className='mol-cap';
  var seqTxt = sq.known ? sq.codes.join('-') : (sq.codes.length+' residues');
  cap.innerHTML='<span class="mc-k">Schematic 3D structure</span><span class="mc-v mono">'+(sq.known?seqTxt:'\u2248'+seqTxt+' \u00b7 schematic')+'</span>';
  vis.appendChild(cap);

  /* default to the real vial so the View-Transition morph lands on a visible target;
     the 3D viewer mounts paused and spins up when the user toggles to it */
  activeMol = mountMoleculeViewer(canvas, p);
  if(activeMol && activeMol.pause) activeMol.pause();

  seg.addEventListener('click', function(e){
    var b=e.target.closest('[data-vis]'); if(!b) return;
    var mode=b.getAttribute('data-vis');
    seg.querySelectorAll('button').forEach(function(x){ x.classList.toggle('active', x===b); });
    if(mode==='mol'){ vis.classList.add('show-mol'); if(activeMol&&activeMol.resume) activeMol.resume(); }
    else { vis.classList.remove('show-mol'); if(activeMol&&activeMol.pause) activeMol.pause(); }
  });
}

function enhanceCOA(){
  var chart = coaBody && coaBody.querySelector('.coa-chart'); if(!chart) return;
  if(activeCg){ activeCg.destroy(); activeCg=null; }
  var pid = coaBody.getAttribute('data-pid');
  var p = window.product ? window.product(pid) : null; if(!p) return;
  chart.classList.add('coa-chart-live'); chart.innerHTML='';
  activeCg = mountChromatogram(chart, p);
}

/* ============================================================
   D) SHARED-ELEMENT VIEW TRANSITIONS (vial morph) + hook wiring
   ============================================================ */
var pendingVial=null;
document.addEventListener('click', function(e){
  var trg=e.target.closest('[data-qv]');
  if(trg){ var card=trg.closest('.card'); pendingVial = card ? card.querySelector('.vial-real') : null; }
}, true);

window.LabHooks = {
  beforeQuick: function(){
    vtActive = supportsVT;
    if(supportsVT && pendingVial) pendingVial.style.viewTransitionName='vialmorph';
  },
  quick: function(){
    enhanceQuick();
    if(vtActive){
      var dst = qvBody && qvBody.querySelector('.vial-real');
      if(dst) dst.style.viewTransitionName='vialmorph';
      if(pendingVial) pendingVial.style.viewTransitionName='';
    }
  },
  afterQuick: function(){
    vtActive=false;
    var d = qvBody && qvBody.querySelector('.vial-real'); if(d) d.style.viewTransitionName='';
    if(pendingVial){ pendingVial.style.viewTransitionName=''; pendingVial=null; }
  },
  closeQuick: function(){ if(activeMol){ activeMol.destroy(); activeMol=null; } },
  coa: function(){ enhanceCOA(); },
  closeCOA: function(){ if(activeCg){ activeCg.destroy(); activeCg=null; } }
};

})();
