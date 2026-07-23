/* ============================================================
   ELYRIA BIO — "SYNTHESIS"
   Scroll-driven protein FOLDING: a denatured peptide coil folds
   into a native 3D alpha-helix — a twisting ribbon cartoon with
   specular backbone beads, side chains, and hydrogen bonds that
   ignite on verification. Hand-written WebGL gold substrate.
   No libraries. Graceful fallbacks.
   ============================================================ */
(function(){
"use strict";

var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isSmall = window.matchMedia('(max-width: 860px)').matches;
/* on mobile the canvas is hidden and we use the CSS gradient hero — bail out entirely */
if(isSmall){ return; }
var DPR = Math.min(window.devicePixelRatio || 1, 2.25);

/* shared interaction state */
var SYN = { mx: window.innerWidth*0.5, my: window.innerHeight*0.4, progress: 0, time: 0 };
document.addEventListener('mousemove', function(e){ SYN.mx = e.clientX; SYN.my = e.clientY; }, {passive:true});
document.addEventListener('touchmove', function(e){ if(e.touches && e.touches[0]){ SYN.mx = e.touches[0].clientX; SYN.my = e.touches[0].clientY; } }, {passive:true});

/* ---------- math helpers ---------- */
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function rangep(p,a,b){ return clamp((p-a)/(b-a),0,1); }
function easeOut(t){ return 1-Math.pow(1-t,3); }
function easeInOut(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function lerp(a,b,t){ return a+(b-a)*t; }

/* ============================================================
   1) WEBGL GOLD-SHADER SUBSTRATE   (unchanged)
   ============================================================ */
var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
/* ---- background motion graphic: "THE CHROMATOGRAM RANGE" ----
   The brand's own data made cinematic. Twenty-four HPLC purity
   traces recede into the dark like a mountain ridgeline — every
   lot one towering dominant peak, tiny impurity bumps breathing
   at the baseline, detector noise shimmering along each trace.
   Near traces are hot, thick and bright; far ones thin to whispers
   at the horizon. Ridges occlude the ones behind them (true
   depth), the pointer parallaxes the stack, and a slow scan beam
   sweeps the range, igniting each trace as it passes. */
var FRAG = [
'precision highp float;',
'uniform vec2 u_res; uniform float u_time; uniform float u_progress;',
'uniform vec2 u_ptr; uniform float u_variant;',
'float h1(vec2 p){ return fract(sin(dot(p,vec2(41.31,289.17)))*43758.5453); }',
'float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);',
'  float a=h1(i), b=h1(i+vec2(1.,0.)), c=h1(i+vec2(0.,1.)), d=h1(i+vec2(1.,1.));',
'  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }',
/* one lot's chromatogram: dominant purity peak + shoulder + trace impurities + noise */
'float trace(float x, float i, float t){',
'  float cx = 0.60 + 0.045*sin(i*0.31+t*0.055);',
'  float h = 0.95*exp(-pow((x-cx)*26.0,2.0));',
'  h += 0.15*exp(-pow((x-cx+0.155+0.02*sin(i*0.7+t*0.10))*42.0,2.0));',
'  h += 0.075*(0.5+0.5*sin(i*1.7+t*0.21))*exp(-pow((x-0.24-0.03*sin(i*0.5+t*0.07))*46.0,2.0));',
'  h += 0.055*(0.5+0.5*sin(i*2.3-t*0.17))*exp(-pow((x-0.84+0.025*cos(i*0.9+t*0.09))*52.0,2.0));',
'  h += 0.035*(0.5+0.5*sin(i*3.1+t*0.13))*exp(-pow((x-0.42+0.02*sin(i*1.1-t*0.06))*60.0,2.0));',
'  h += 0.013*vnoise(vec2(x*90.0, i*5.0+t*0.55));',
'  return h;',
'}',
'void main(){',
'  vec2 uv = gl_FragCoord.xy/u_res.xy;',
'  vec2 p = (gl_FragCoord.xy - 0.5*u_res.xy)/u_res.y;',
'  float t = u_time;',
'  vec3 deep = vec3(0.015,0.012,0.008);',
'  vec3 gold = vec3(0.87,0.67,0.31);',
'  vec3 hot  = vec3(1.0,0.94,0.75);',
'  vec3 col = deep;',
/* horizon haze where the range vanishes */
'  float horizon = 0.76;',
'  col += gold * exp(-abs(uv.y-horizon)*26.0) * 0.055;',
/* the scan beam: a slow instrument sweep, left to right */
'  float bx = mix(-0.18, 1.18, fract(t*0.045));',
'  col += gold * exp(-pow((uv.x-bx)*9.0,2.0)) * 0.030;',
/* the ridgeline: back to front, each trace occluding the last */
'  for(int i=0;i<24;i++){',
'    float fr = float(i)/23.0;',
'    float yb  = mix(horizon, 0.045, pow(fr,1.35));',
'    float amp = mix(0.05, 0.36, pow(fr,1.6));',
'    float xx  = uv.x + (u_ptr.x-0.5)*0.06*(1.0-fr);',
'    float cY  = yb + trace(xx, float(i), t)*amp;',
'    float fill = smoothstep(cY, cY-0.0035, uv.y);',
'    col = mix(col, deep + gold*0.014*fr, fill);',
'    col += gold * exp(-(cY-uv.y)*44.0) * fill * 0.05 * fr;',
'    float d = abs(uv.y - cY);',
'    float w = mix(0.0011, 0.0026, fr);',
'    float line = smoothstep(w, 0.0, d);',
'    float glow = exp(-(d*d)/(w*w*24.0));',
'    float beam = exp(-pow((xx-bx)*6.5,2.0));',
'    float br = mix(0.10, 0.95, pow(fr,1.7)) * (0.72 + 0.65*beam);',
'    col += (mix(gold,hot,0.35+0.40*fr)*line*1.05 + gold*glow*0.20) * br;',
'  }',
/* energy, pointer light, vignette, grain */
'  float energy = mix(0.80,1.12,u_progress);',
'  col = deep + (col-deep)*energy;',
'  float pd = distance(uv,u_ptr); col += gold*exp(-pd*3.4)*0.14;',
'  float vig = smoothstep(1.30,0.14,length(p)); col *= mix(0.34,1.0,vig);',
'  col *= (u_variant>0.5)?0.80:1.0;',
'  col += (h1(gl_FragCoord.xy+vec2(u_time))-0.5)*0.012;',
'  gl_FragColor = vec4(max(col,0.0),1.0);',
'}'].join('\n');

function compile(gl, type, src){
  var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){ return null; }
  return s;
}
function mountShader(canvas, variant){
  var host = canvas.parentElement; if(!host) return null;
  var gl;
  try { gl = canvas.getContext('webgl', {antialias:false, alpha:false, depth:false}) ||
             canvas.getContext('experimental-webgl', {antialias:false, alpha:false, depth:false}); }
  catch(e){ gl = null; }
  if(!gl){ canvas.style.display='none'; return null; }
  canvas.addEventListener('webglcontextlost', function(e){ e.preventDefault(); }, false);
  var vs = compile(gl, gl.VERTEX_SHADER, VERT);
  var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if(!vs || !fs){ canvas.style.display='none'; return null; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ canvas.style.display='none'; return null; }
  gl.useProgram(prog);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uRes = gl.getUniformLocation(prog,'u_res'), uTime = gl.getUniformLocation(prog,'u_time'),
      uProg = gl.getUniformLocation(prog,'u_progress'), uPtr = gl.getUniformLocation(prog,'u_ptr'),
      uVar = gl.getUniformLocation(prog,'u_variant');
  var W=0,H=0;
  function resize(){
    var r = host.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height);
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    gl.viewport(0,0,canvas.width,canvas.height);
  }
  resize();
  if('ResizeObserver' in window){ new ResizeObserver(resize).observe(host); } else { window.addEventListener('resize', resize); }

  var raf = 0;
  function draw(now){
    var t = now*0.001;
    var rect = canvas.getBoundingClientRect();
    var px = clamp((SYN.mx-rect.left)/Math.max(1,rect.width),0,1);
    var py = clamp(1-(SYN.my-rect.top)/Math.max(1,rect.height),0,1);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, t);
    gl.uniform1f(uProg, variant>0.5 ? 0.55 : SYN.progress);
    gl.uniform2f(uPtr, px, py);
    gl.uniform1f(uVar, variant);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(draw);
  }
  if(reduce){ draw(0); if(raf){ cancelAnimationFrame(raf); raf=0; } return {}; }
  function start(){ if(!raf) raf=requestAnimationFrame(draw); }
  function stop(){ if(raf){ cancelAnimationFrame(raf); raf=0; } }
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ if(es[0].isIntersecting) start(); else stop(); }, {threshold:0}).observe(host);
  }
  start();
  return {};
}

/* ============================================================
   2) PROTEIN-FOLDING ALPHA-HELIX
   ============================================================ */
/* gold ramps keyed to depth (d: 0 far → 1 near) */
function goldCore(d){ return Math.round(lerp(150,250,d))+','+Math.round(lerp(110,205,d))+','+Math.round(lerp(45,120,d)); }
function goldEdge(d){ return Math.round(lerp(58,140,d))+','+Math.round(lerp(40,98,d))+','+Math.round(lerp(14,46,d)); }

/* residue side-chain bulk → sphere size class */
var BULK = { GLY:0.0, ALA:0.30, SER:0.42, PRO:0.55, VAL:0.66, LEU:0.84, ILE:0.84,
             LYS:0.96, GLU:0.80, ASP:0.66, ARG:1.0, PHE:0.94, TYR:1.0, GLN:0.82 };

function mountHero(){
  var scrollSec = document.getElementById('heroScroll');
  var stage = document.getElementById('hero');
  var canvas = document.getElementById('heroMolecule');
  if(!scrollSec || !stage || !canvas) return;
  var ctx = canvas.getContext('2d');
  var W=0,H=0;
  function resize(){
    var r = stage.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height);
    canvas.width=Math.round(W*DPR); canvas.height=Math.round(H*DPR);
    canvas.style.width=W+'px'; canvas.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();
  if('ResizeObserver' in window){ new ResizeObserver(resize).observe(stage); } else { window.addEventListener('resize', resize); }

  /* ---- the peptide: ideal alpha-helix geometry + a denatured start state ---- */
  var SEQ = ['GLY','LEU','LYS','VAL','ALA','GLU','ILE','ARG','SER','LEU','ASP','PHE',
             'LYS','ALA','GLN','LEU','GLU','TYR','VAL','ARG','LEU','SER','PRO','GLY'];
  var N = SEQ.length;
  var FOCAL = 920;
  var RISE = 17.4;          // axial rise per residue (model units)
  var RADIUS = 31;          // helix radius
  var TURN = 1.7453;        // ~100° per residue
  var resi = [];
  for(var i=0;i<N;i++){
    var ax = (i-(N-1)/2)*RISE;        // along helix axis (model x)
    var ang = i*TURN;
    var fy = Math.cos(ang)*RADIUS, fz = Math.sin(ang)*RADIUS;   // folded (native) y,z
    // outward radial unit (perp to axis) — drives ribbon twist + side-chain direction
    var rl = Math.hypot(fy,fz)||1;
    // denatured / extended start: a loose, wide, wandering coil
    var sd = (i*12.9898);
    var rnd = function(o){ var v=Math.sin(sd+o)*43758.5453; return v-Math.floor(v); };
    var ux = (i-(N-1)/2)*RISE*2.05;
    var uy = Math.sin(i*0.78)*78 + (rnd(1.3)-0.5)*70;
    var uz = Math.cos(i*0.62)*78 + (rnd(7.1)-0.5)*70;
    resi.push({
      code:SEQ[i],
      fx:ax, fy:fy, fz:fz,           // folded backbone (CA)
      ux:ux, uy:uy, uz:uz,           // unfolded backbone
      ry:fy/rl, rz:fz/rl,            // outward radial (folded)
      bulk: (BULK[SEQ[i]]!=null?BULK[SEQ[i]]:0.7),
      a0: 0.06 + (i/N)*0.50,         // staggered fold-in (N→C zip)
      // transient per-frame
      cx:0, cy:0, cz:0, cs:0, asm:0, vis:false,
      sx:0, sy:0, ss:0
    });
  }

  /* UI refs (unchanged wiring) */
  var sub = document.getElementById('heroSub'),
      cta = document.getElementById('heroCta'),
      trust = document.getElementById('heroTrust'),
      hud = document.getElementById('synthHud'),
      seqEl = document.getElementById('synthSeq'),
      barFill = document.getElementById('synthBar'),
      verifyRow = document.getElementById('synthVerify'),
      verifyText = document.getElementById('synthVerifyText'),
      hint = document.getElementById('scrollHint');

  /* rotation + perspective projection of a model point */
  var _cosY=1,_sinY=0,_cosT=1,_sinT=0,_cx=0,_cy=0,_gs=1;
  function setCam(rotY, tilt, cx, cy, gs){
    _cosY=Math.cos(rotY); _sinY=Math.sin(rotY);
    _cosT=Math.cos(tilt);  _sinT=Math.sin(tilt);
    _cx=cx; _cy=cy; _gs=gs;
  }
  function project(x,y,z){
    var X1 = x*_cosY + z*_sinY;
    var Z1 = -x*_sinY + z*_cosY;
    var Y2 = y*_cosT - Z1*_sinT;
    var Z2 = y*_sinT + Z1*_cosT;
    var s = FOCAL/Math.max(120, FOCAL+Z2);
    return { x:_cx + X1*s*_gs, y:_cy + Y2*s*_gs, z:Z2, s:s };
  }

  /* Catmull–Rom interpolation for the ribbon spline */
  function cr(p0,p1,p2,p3,t){
    var t2=t*t, t3=t2*t;
    return 0.5*((2*p1) + (-p0+p2)*t + (2*p0-5*p1+4*p2-p3)*t2 + (-p0+3*p1-3*p2+p3)*t3);
  }

  function render(progress, time){
    ctx.clearRect(0,0,W,H);
    var gs = Math.min(W,H)/760 * (isSmall?0.86:1.02);
    var cx = W/2, cy = H*0.455;
    // camera: scroll spins + ambient drift + gentle pointer parallax
    var ptrx = (SYN.mx/Math.max(1,window.innerWidth) - 0.5);
    var ptry = (SYN.my/Math.max(1,window.innerHeight) - 0.5);
    var rotY = progress*Math.PI*1.35 + time*0.10 + ptrx*0.5;
    var tilt = 0.30 + ptry*0.26 + Math.sin(time*0.18)*0.05;
    setCam(rotY, tilt, cx, cy, gs);

    var fold = easeInOut(rangep(progress,0.04,0.62));   // global fold completion
    var verified = rangep(progress,0.62,0.80);

    /* 1 ── resolve each residue's current backbone + side-chain position */
    var built = [];
    for(var i=0;i<N;i++){
      var n = resi[i];
      var a = easeOut(rangep(progress, n.a0, n.a0+0.18));
      n.asm = a; n.vis = a>0.02;
      if(!n.vis){ continue; }
      var x = lerp(n.ux, n.fx, a), y = lerp(n.uy, n.fy, a), z = lerp(n.uz, n.fz, a);
      var pj = project(x,y,z);
      n.cx=pj.x; n.cy=pj.y; n.cz=pj.z; n.cs=pj.s; n.mx=x; n.my=y; n.mz=z;
      // side-chain tip: pokes outward along radial, length scales with bulk + fold
      var sl = (10 + n.bulk*22);
      var spx = x + n.ry*sl*a, spy = y + n.rz*sl*a, spz = z;     // ry/rz are y/z radials
      // (radial is in y/z plane; x unaffected) — recompute via folded radial blended toward current
      var sp = project(x, y + n.ry*sl*a, z + n.rz*sl*a);
      n.sx=sp.x; n.sy=sp.y; n.sz=sp.z; n.ss=sp.s;
      built.push(n);
    }

    /* 2 ── RIBBON: a twisting flat band threaded through the assembled backbone.
       Built from a Catmull–Rom spline; rendered as depth-sorted quads with a
       light sweep across the twist for that classic shimmering-cartoon look. */
    var ribAlpha = rangep(progress,0.10,0.42);
    if(built.length>=2 && ribAlpha>0.01){
      var lightAng = -0.9 + Math.sin(time*0.4)*0.25;   // sweeping key light
      var W_HALF = 13;
      var SEG = 8;
      var samples = [];
      for(var k=0;k<built.length-1;k++){
        var p1=built[k], p2=built[k+1];
        var p0=built[k-1]||p1, p3=built[k+2]||p2;
        var aMin = Math.min(p1.asm,p2.asm);
        var segs = (k===built.length-2)?SEG:SEG-1;
        for(var t=0;t<=SEG;t++){
          var u=t/SEG;
          var mx=cr(p0.mx,p1.mx,p2.mx,p3.mx,u);
          var my=cr(p0.my,p1.my,p2.my,p3.my,u);
          var mz=cr(p0.mz,p1.mz,p2.mz,p3.mz,u);
          // outward radial in y/z plane (band faces outward and twists)
          var rl=Math.hypot(my,mz); var ry=rl>2?my/rl:0, rz=rl>2?mz/rl:1;
          var e1=project(mx, my+ry*W_HALF, mz+rz*W_HALF);
          var e2=project(mx, my-ry*W_HALF, mz-rz*W_HALF);
          var twang=Math.atan2(rz,ry);
          var sheen=Math.pow(0.5+0.5*Math.cos(twang-lightAng),1.6);
          samples.push({e1:e1,e2:e2,mz:(e1.z+e2.z)/2,sheen:sheen,
                        a:lerp(aMin, Math.min(p1.asm,p2.asm), u)});
          if(t===SEG && k<built.length-2) samples.pop(); // avoid dup at joins
        }
      }
      var quads=[];
      for(var q=0;q<samples.length-1;q++){
        var s0=samples[q], s1=samples[q+1];
        quads.push({s0:s0,s1:s1,z:(s0.mz+s1.mz)/2,
                    sheen:(s0.sheen+s1.sheen)*0.5, a:(s0.a+s1.a)*0.5});
      }
      quads.sort(function(p,q){return q.z-p.z;});
      for(var qi=0;qi<quads.length;qi++){
        var Q=quads[qi];
        var d = clamp((180-Q.z)/360,0,1);                 // depth fog
        var b = (0.34 + 0.66*Q.sheen) * lerp(0.45,1,d);   // brightness
        var aa = (0.30 + 0.34*ribAlpha) * Q.a * lerp(0.55,1,d);
        var col = 'rgba('+Math.round(lerp(150,255,b))+','+Math.round(lerp(110,224,b))+','+Math.round(lerp(46,150,b))+',';
        ctx.beginPath();
        ctx.moveTo(Q.s0.e1.x,Q.s0.e1.y); ctx.lineTo(Q.s0.e2.x,Q.s0.e2.y);
        ctx.lineTo(Q.s1.e2.x,Q.s1.e2.y); ctx.lineTo(Q.s1.e1.x,Q.s1.e1.y); ctx.closePath();
        ctx.fillStyle=col+aa.toFixed(3)+')'; ctx.fill();
      }
      // bright spine + edge highlights, drawn over the band
      ctx.globalCompositeOperation='lighter';
      ctx.lineWidth=Math.max(1,1.5*gs);
      for(var ei=0;ei<samples.length-1;ei++){
        var a0=samples[ei], a1=samples[ei+1];
        var hl=(0.18+0.5*a0.sheen)*ribAlpha*a0.a;
        ctx.strokeStyle='rgba(255,244,206,'+hl.toFixed(3)+')';
        ctx.beginPath(); ctx.moveTo(a0.e1.x,a0.e1.y); ctx.lineTo(a1.e1.x,a1.e1.y); ctx.stroke();
        ctx.strokeStyle='rgba(214,168,86,'+(hl*0.7).toFixed(3)+')';
        ctx.beginPath(); ctx.moveTo(a0.e2.x,a0.e2.y); ctx.lineTo(a1.e2.x,a1.e2.y); ctx.stroke();
      }
      ctx.globalCompositeOperation='source-over';
    }

    /* 3 ── HYDROGEN BONDS (i → i+4): the helix's defining contacts.
       Dashed gold filaments that ignite as the fold completes / verifies. */
    var hbA = rangep(progress,0.46,0.66) * (0.5 + 0.5*verified);
    if(hbA>0.02){
      ctx.globalCompositeOperation='lighter';
      ctx.setLineDash([2.5*gs, 5*gs]);
      for(var h=0;h+4<N;h++){
        var A=resi[h], B=resi[h+4];
        if(!A.vis||!B.vis) continue;
        var pa=Math.min(A.asm,B.asm,fold);
        if(pa<0.4) continue;
        var aa2=hbA*(pa-0.4)/0.6;
        ctx.strokeStyle='rgba(255,236,180,'+(0.5*aa2).toFixed(3)+')';
        ctx.lineWidth=Math.max(.8,1.3*gs);
        ctx.beginPath(); ctx.moveTo(A.cx,A.cy); ctx.lineTo(B.cx,B.cy); ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalCompositeOperation='source-over';
    }

    /* 4 ── ATOMS: collect backbone (CA) + side-chain tips, depth-sort, light. */
    var atoms=[];
    for(i=0;i<built.length;i++){
      var nn=built[i];
      atoms.push({x:nn.cx,y:nn.cy,z:nn.cz,r:11.5*nn.cs*gs,a:nn.asm,kind:0});
      if(nn.bulk>0.05){
        atoms.push({x:nn.sx,y:nn.sy,z:nn.sz,r:(4.2+nn.bulk*6.2)*nn.ss*gs,a:nn.asm*0.94,kind:1});
      }
    }
    atoms.sort(function(p,q){return q.z-p.z;});

    // additive glow halos
    ctx.globalCompositeOperation='lighter';
    for(var g=0;g<atoms.length;g++){
      var s=atoms[g]; if(s.r<=0.4) continue;
      var ha=(s.kind?0.14:0.22)*s.a*(0.6+0.4*verified);
      var halo=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*3.4);
      halo.addColorStop(0,'rgba(255,224,148,'+ha.toFixed(3)+')');
      halo.addColorStop(1,'rgba(255,224,148,0)');
      ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*3.4,0,6.2832); ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';

    // sphere bodies w/ rim + specular
    for(g=0;g<atoms.length;g++){
      var sp2=atoms[g]; if(sp2.r<=0.4) continue;
      var d=clamp((170-sp2.z)/340,0,1);
      var hx=sp2.x - sp2.r*0.36, hy=sp2.y - sp2.r*0.42;
      var grad=ctx.createRadialGradient(hx,hy,sp2.r*0.08, sp2.x,sp2.y,sp2.r);
      grad.addColorStop(0,'rgba(255,249,228,'+sp2.a.toFixed(3)+')');
      grad.addColorStop(0.34,'rgba('+goldCore(d)+','+sp2.a.toFixed(3)+')');
      grad.addColorStop(1,'rgba('+goldEdge(d)+','+sp2.a.toFixed(3)+')');
      ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(sp2.x,sp2.y,sp2.r,0,6.2832); ctx.fill();
      // rim light
      ctx.strokeStyle='rgba(255,238,196,'+(0.26*sp2.a*d).toFixed(3)+')'; ctx.lineWidth=1; ctx.stroke();
      // specular pip
      if(sp2.r>3){
        ctx.globalCompositeOperation='lighter';
        var spec=ctx.createRadialGradient(hx,hy,0,hx,hy,sp2.r*0.5);
        spec.addColorStop(0,'rgba(255,255,250,'+(0.55*sp2.a).toFixed(3)+')');
        spec.addColorStop(1,'rgba(255,255,250,0)');
        ctx.fillStyle=spec; ctx.beginPath(); ctx.arc(hx,hy,sp2.r*0.5,0,6.2832); ctx.fill();
        ctx.globalCompositeOperation='source-over';
      }
    }

    /* 5 ── VERIFICATION SCAN sweep */
    var scan = rangep(progress,0.62,0.78);
    if(scan>0 && scan<1){
      var sy = cy-180 + scan*360;
      ctx.globalCompositeOperation='lighter';
      var sg=ctx.createLinearGradient(0,sy-30,0,sy+30);
      sg.addColorStop(0,'rgba(255,232,160,0)');
      sg.addColorStop(0.5,'rgba(255,240,190,0.5)');
      sg.addColorStop(1,'rgba(255,232,160,0)');
      ctx.fillStyle=sg; ctx.fillRect(cx-300,sy-30,600,60);
      ctx.globalCompositeOperation='source-over';
    }
  }

  function setOpTr(el, t, ty){ if(!el) return; var e=easeOut(t); el.style.opacity=e; el.style.transform='translateY('+((1-e)*ty).toFixed(1)+'px)'; }

  function updateUI(progress){
    setOpTr(sub, rangep(progress,0.14,0.26), 16);
    setOpTr(cta, rangep(progress,0.24,0.36), 18);
    setOpTr(trust, rangep(progress,0.78,0.92), 16);
    if(hud){ hud.style.opacity = rangep(progress,0.08,0.16) * (1-rangep(progress,0.93,1)); }
    var built = clamp(rangep(progress,0.08,0.60),0,1);
    var shown = Math.round(built*N);
    if(seqEl) seqEl.textContent = shown ? resi.slice(0,shown).map(function(n){return n.code;}).join('–') : '···';
    if(barFill) barFill.style.width = (built*100).toFixed(1)+'%';
    if(verifyRow){
      if(progress>=0.72){ verifyRow.classList.add('ok'); if(verifyText) verifyText.textContent='Folded · verified · ≥99.4% HPLC'; }
      else { verifyRow.classList.remove('ok'); if(verifyText) verifyText.textContent = shown<N ? ('Folding '+Math.min(shown+1,N)+' / '+N+' residues') : 'Awaiting verification'; }
    }
    if(hint) hint.style.opacity = (1-rangep(progress,0.02,0.12)).toFixed(3);
  }

  /* ---- static / reduced-motion fallback ---- */
  if(reduce){
    stage.classList.add('synth-static');
    render(1.0, 0);
    [sub,cta,trust].forEach(function(e){ if(e){ e.style.opacity=1; e.style.transform='none'; } });
    if(hud) hud.style.opacity=1;
    if(verifyRow){ verifyRow.classList.add('ok'); if(verifyText) verifyText.textContent='Folded · verified · ≥99.4% HPLC'; }
    if(seqEl) seqEl.textContent = resi.map(function(n){return n.code;}).join('–');
    if(barFill) barFill.style.width='100%';
    if(hint) hint.style.display='none';
    scrollSec.style.height='auto';
    stage.style.position='relative';
    window.addEventListener('resize', function(){ resize(); render(1.0,0); });
    return;
  }

  stage.classList.add('synth-armed');
  window.__synthRender = function(p){ render(p, performance.now()*0.001); updateUI(p); };
  var progress = 0, raf = 0, running = false;
  function computeTarget(){
    var r = scrollSec.getBoundingClientRect();
    var total = scrollSec.offsetHeight - window.innerHeight;
    return clamp((-r.top)/Math.max(1,total), 0, 1);
  }
  function frame(now){
    var time = now*0.001;
    var target = computeTarget();
    progress += (target-progress)*0.14;
    if(Math.abs(target-progress)<0.0006) progress = target;
    SYN.progress = progress; SYN.time = time;
    render(progress, time);
    updateUI(progress);
    raf = requestAnimationFrame(frame);
  }
  function start(){ if(!running){ running=true; raf=requestAnimationFrame(frame); } }
  function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){ if(es[0].isIntersecting) start(); else stop(); }, {threshold:0}).observe(stage);
  }
  start();
}

/* ============================================================
   3) ARRIVAL INTRO  (preserved)
   ============================================================ */
(function intro(){
  var intro = document.getElementById('intro');
  if(!intro) return;
  if(intro.dataset.cinematic) return; /* handled by intro.js */
  var seen = false;
  try { seen = sessionStorage.getItem('elyria_intro') === '1'; } catch(e){}
  if(seen || reduce){ intro.classList.add('intro-removed'); return; }
  try { sessionStorage.setItem('elyria_intro', '1'); } catch(e){}
  var dismissed = false;
  function finish(){
    if(dismissed) return; dismissed = true;
    intro.classList.add('done');
    setTimeout(function(){ intro.classList.add('intro-removed'); }, 820);
  }
  var t = setTimeout(finish, 2200);
  intro.addEventListener('click', function(){ clearTimeout(t); finish(); });
})();

/* ---------- mount ---------- */
var shaderNodes = document.querySelectorAll('canvas.shaderbg');
for(var s=0;s<shaderNodes.length;s++){
  var variant = shaderNodes[s].getAttribute('data-variant')==='verify' ? 1 : 0;
  if(isSmall && variant===1){ shaderNodes[s].style.display='none'; continue; }  /* one GL context on phones */
  mountShader(shaderNodes[s], variant);
}
mountHero();

})();
