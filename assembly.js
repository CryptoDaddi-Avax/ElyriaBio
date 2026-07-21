/* ============================================================
   ELYRIA BIO — "ASSEMBLY"
   A real-time RAYMARCHED liquid-gold molecular structure.
   A twisting peptide helix, rendered as polished gold-glass
   (fresnel, specular, environment reflections, ambient
   occlusion + a volumetric bloom halo) that condenses
   atom-by-atom from a scattered cloud on load — and that you
   can grab and orbit with inertia. Hand-written WebGL, no libs,
   graceful fallbacks (no-WebGL → gradient; reduced-motion →
   one static assembled frame).
   ============================================================ */
(function(){
"use strict";

var reduce  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var isSmall = window.matchMedia && window.matchMedia('(max-width:760px)').matches;

var stage  = document.getElementById('hero');
var canvas = document.getElementById('heroGL');
if(!stage || !canvas) return;

function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
function lerp(a,b,t){ return a+(b-a)*t; }
function easeOut(t){ return 1-Math.pow(1-t,3); }
function easeInOut(t){ return t<0.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
function revealCopy(){ stage.classList.add('hero-ready'); }

/* HUD elements (repurposed from the old synthesis readout) */
var seqEl      = document.getElementById('synthSeq');
var barFill    = document.getElementById('synthBar');
var verifyRow  = document.getElementById('synthVerify');
var verifyText = document.getElementById('synthVerifyText');
var hud        = document.getElementById('synthHud');
var hint       = document.getElementById('scrollHint');
/* BPC-157 single-letter sequence — ties the readout to the flagship product */
var SEQ = 'GEPPPGKPADDAGLV'.split('');

/* ---------- WebGL bootstrap ---------- */
var gl = null;
try {
  gl = canvas.getContext('webgl', {alpha:false, antialias:false, depth:false, premultipliedAlpha:false, preserveDrawingBuffer:true, powerPreference:'high-performance'})
    || canvas.getContext('experimental-webgl');
} catch(e){}
if(!gl){ revealCopy(); if(hud) hud.style.display='none'; if(hint) hint.style.display='none'; return; }

/* ============================================================
   THE MOLECULE — an alpha-helix Cα trace
   ============================================================ */
var NA = 24;
var Rh = 1.72, ANG = 0.96, RISE = 0.40;
var atoms = [];
(function build(){
  var cy = (NA-1)/2;
  for(var i=0;i<NA;i++){
    var ang = i*ANG + 0.35;
    var bx = Math.cos(ang)*Rh;
    var bz = Math.sin(ang)*Rh;
    var by = (i-cy)*RISE;
    // scatter origin — a diffuse cloud the atom condenses out of
    var u = Math.random()*Math.PI*2, v = Math.acos(2*Math.random()-1);
    var sp = 9 + Math.random()*8;
    atoms.push({
      bx:bx, by:by, bz:bz,
      sx:Math.sin(v)*Math.cos(u)*sp, sy:Math.cos(v)*sp*1.15, sz:Math.sin(v)*Math.sin(u)*sp,
      r: 0.90 + 0.14*Math.sin(i*1.27),
      delay: (i/NA)*0.55
    });
  }
})();
var atomBuf = new Float32Array(NA*3);
var radBuf  = new Float32Array(NA);

/* ============================================================
   SHADER
   ============================================================ */
var MAXSTEP = isSmall ? 46 : 76;
var VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
var FRAG = [
'precision highp float;',
'const int NA = '+NA+';',
'const int STEPS = '+MAXSTEP+';',
'uniform vec2  u_res;',
'uniform float u_time;',
'uniform vec2  u_cam;',     // yaw, pitch
'uniform float u_dist;',
'uniform float u_bound;',
'uniform float u_energy;',  // 0.5 building -> 1.0 assembled
'uniform vec2  u_ptr;',     // pointer in clip space
'uniform vec2  u_offset;',  // screen-space molecule offset (split layout)
'uniform vec3  u_atoms[NA];',
'uniform float u_rad[NA];',

'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+34.5); return fract(p.x*p.y); }',
'float noise(vec2 p){ vec2 i=floor(p), f=fract(p);',
'  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));',
'  vec2 u=f*f*(3.-2.*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }',
'float fbm(vec2 p){ float v=0.,a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }',

'float smin(float a,float b,float k){ float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0); return mix(b,a,h)-k*h*(1.0-h); }',

'float map(vec3 p){',
'  float d = 1e5;',
'  for(int i=0;i<NA;i++){',
'    float s = length(p - u_atoms[i]) - u_rad[i];',
'    d = smin(d, s, 0.42);',
'  }',
'  return d;',
'}',

'vec3 calcNormal(vec3 p){',
'  vec2 e = vec2(0.0015,0.0);',
'  return normalize(vec3(',
'    map(p+e.xyy)-map(p-e.xyy),',
'    map(p+e.yxy)-map(p-e.yxy),',
'    map(p+e.yyx)-map(p-e.yyx)));',
'}',

'float calcAO(vec3 p, vec3 n){',
'  float occ=0.0, sca=1.0;',
'  for(int i=0;i<4;i++){',
'    float hr = 0.03 + 0.13*float(i);',
'    float dd = map(p + n*hr);',
'    occ += (hr-dd)*sca; sca*=0.82;',
'  }',
'  return clamp(1.0 - 2.3*occ, 0.0, 1.0);',
'}',

// environment: a dark gold studio with a warm horizon band
'vec3 env(vec3 rd){',
'  float h = rd.y*0.5+0.5;',
'  vec3 c = mix(vec3(0.13,0.092,0.044), vec3(0.014,0.011,0.008), h);',
'  c += vec3(0.95,0.72,0.34) * pow(1.0-abs(rd.y),8.0) * 0.40;',   // horizon glow
'  c += vec3(1.0,0.93,0.7) * pow(max(rd.y,0.0),3.0) * 0.05;',     // soft key from above
'  return c;',
'}',

'void main(){',
'  vec2 fc = gl_FragCoord.xy;',
'  vec2 uv = (fc - 0.5*u_res) / u_res.y;',

// camera orbit
'  float yaw = u_cam.x, pit = u_cam.y;',
'  vec3 dir = vec3(cos(pit)*sin(yaw), sin(pit), cos(pit)*cos(yaw));',
'  vec3 ro  = dir * u_dist;',
'  vec3 fwd = normalize(-ro);',
'  vec3 rgt = normalize(cross(vec3(0.0,1.0,0.0), fwd));',
'  vec3 upv = cross(fwd, rgt);',
'  vec2 cuv = uv - u_offset;',
'  vec3 rd  = normalize(cuv.x*rgt + cuv.y*upv + fwd*1.7);',

// background
'  float t0 = u_time*0.05;',
'  vec2 np = uv*1.4;',
'  vec2 q = vec2(fbm(np + vec2(0.0,t0)), fbm(np + vec2(4.0,-t0)));',
'  float neb = fbm(np*1.3 + 1.6*q);',
'  float vig = smoothstep(1.25,0.10,length(uv));',
'  vec3 bg = vec3(0.012,0.009,0.007);',
'  bg += vec3(0.55,0.40,0.18) * pow(neb,2.4) * 0.14 * vig;',
'  vec3 col = bg;',

// ray-sphere bound test
'  float b = dot(ro, rd);',
'  float c = dot(ro,ro) - u_bound*u_bound;',
'  float disc = b*b - c;',
'  float glow = 0.0;',
'  if(disc > 0.0){',
'    float sq = sqrt(disc);',
'    float tIn  = max(-b - sq, 0.0);',
'    float tOut = -b + sq;',
'    float t = tIn;',
'    float gmin = 1e5;',
'    bool hit = false;',
'    for(int i=0;i<STEPS;i++){',
'      vec3 p = ro + rd*t;',
'      float d = map(p);',
'      gmin = min(gmin, d);',
'      if(d < 0.0009){ hit = true; break; }',
'      t += d;',
'      if(t > tOut) break;',
'    }',
'    glow = pow(clamp(1.0 - gmin/0.85, 0.0, 1.0), 2.6);',
'    if(hit){',
'      vec3 p = ro + rd*t;',
'      vec3 n = calcNormal(p);',
'      vec3 vd = -rd;',
'      float ao = calcAO(p,n);',
// key (warm, from upper-right) + cool back fill
'      vec3 L1 = normalize(vec3(0.55,0.78,0.32));',
'      vec3 L2 = normalize(vec3(-0.55,-0.15,-0.6));',
'      float dif = max(dot(n,L1),0.0);',
'      float bak = max(dot(n,L2),0.0);',
'      vec3 hlf = normalize(L1+vd);',
'      float spec = pow(max(dot(n,hlf),0.0), 115.0);',
// pointer-tracked glint
'      vec3 Lp = normalize(vd + vec3(u_ptr*0.9, 0.0));',
'      float gln = pow(max(dot(n, normalize(Lp+vd)),0.0), 60.0);',
'      float fres = pow(1.0 - max(dot(n,vd),0.0), 3.0);',
'      vec3 refl = reflect(rd,n);',
'      vec3 albedo = vec3(0.32,0.195,0.066);',
'      float key = pow(dif, 1.35);',
'      vec3 s = albedo * (0.10 + 1.05*key) * ao;',           // base + key (punchy)
'      s += vec3(0.18,0.235,0.32) * bak * 0.20;',            // cool back rim
'      s += env(refl) * (0.14 + 0.46*fres) * (0.45+0.55*ao);',// reflections
'      s += vec3(1.0,0.9,0.62) * spec * 1.8;',               // hot specular
'      s += vec3(1.0,0.96,0.82) * gln  * 0.8;',              // moving glint
'      s += vec3(0.95,0.74,0.36) * fres * 0.26 * u_energy;', // subtle emissive rim
// signal pulse travelling up the helix
'      float pulse = sin(p.y*2.4 - u_time*2.2)*0.5+0.5;',
'      s += vec3(1.0,0.86,0.5) * pow(pulse,6.0) * 0.22 * u_energy;',
'      col = s;',
'    }',
'    glow = hit ? 0.0 : glow;',  // halo only haloes the background, never the metal
'  }',
// add bloom halo to whatever is behind/around the silhouette
'  col += vec3(0.95,0.72,0.34) * glow * (0.22 + 0.40*u_energy);',

// grade
'  col *= 1.02;',
'  col = col / (col + vec3(1.0));',           // reinhard
'  col = pow(max(col,0.0), vec3(0.4545));',   // gamma
'  col += (hash(fc + u_time) - 0.5) * 0.022;',// grain
'  gl_FragColor = vec4(col, 1.0);',
'}'
].join('\n');

function compile(type,src){
  var sh=gl.createShader(type); gl.shaderSource(sh,src); gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){ console.warn('shader',gl.getShaderInfoLog(sh)); return null; }
  return sh;
}
var vs=compile(gl.VERTEX_SHADER,VERT), fs=compile(gl.FRAGMENT_SHADER,FRAG);
if(!vs||!fs){ revealCopy(); if(hud) hud.style.display='none'; if(hint) hint.style.display='none'; return; }
var prog=gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){ revealCopy(); return; }
gl.useProgram(prog);

var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
var pLoc=gl.getAttribLocation(prog,'p'); gl.enableVertexAttribArray(pLoc);
gl.vertexAttribPointer(pLoc,2,gl.FLOAT,false,0,0);

var U = {};
['u_res','u_time','u_cam','u_dist','u_bound','u_energy','u_ptr','u_offset'].forEach(function(n){ U[n]=gl.getUniformLocation(prog,n); });
U.u_atoms = gl.getUniformLocation(prog,'u_atoms[0]');
U.u_rad   = gl.getUniformLocation(prog,'u_rad[0]');

/* ---------- sizing ---------- */
var W=0,H=0;
function resize(){
  var r = canvas.getBoundingClientRect();
  var maxSide = isSmall ? 760 : 1180;
  var dpr = Math.min(window.devicePixelRatio||1, isSmall?1.0:1.4);
  var cssW = Math.max(1,r.width), cssH = Math.max(1,r.height);
  var scale = Math.min(1, maxSide/Math.max(cssW,cssH));
  W = Math.round(cssW*dpr*scale);
  H = Math.round(cssH*dpr*scale);
  canvas.width=W; canvas.height=H;
  gl.viewport(0,0,W,H);
}
resize();
window.addEventListener('resize', function(){ resize(); if(reduce) draw(); }, {passive:true});

/* ============================================================
   STATE — assembly + camera orbit
   ============================================================ */
var DIST = 36.0;
var splitLayout = !(window.matchMedia && window.matchMedia('(max-width:900px)').matches);
var OFFX = 0;
function computeOffset(){
  splitLayout = !(window.matchMedia && window.matchMedia('(max-width:900px)').matches);
  OFFX = splitLayout ? 0.31 : 0.0;
}
computeOffset();
window.addEventListener('resize', computeOffset, {passive:true});
var yaw = -0.5, pit = 0.18;
var yawVel = 0, pitVel = 0;
var dragging=false, lastX=0, lastY=0, lastT=0;
var idleAuto = 0.0019;          // ambient drift
var ptr = {x:0, y:0};
var startTime = performance.now();
var BUILD_MS = 2700;
var built = false;

function setAtoms(buildP){
  var maxLen = 0;
  for(var i=0;i<NA;i++){
    var a = atoms[i];
    var tp = clamp((buildP - a.delay)/0.42, 0, 1);
    var e = easeInOut(tp);
    var x = lerp(a.sx, a.bx, e);
    var y = lerp(a.sy, a.by, e);
    var z = lerp(a.sz, a.bz, e);
    var rr = a.r * e;
    atomBuf[i*3]=x; atomBuf[i*3+1]=y; atomBuf[i*3+2]=z;
    radBuf[i]=rr;
    var L = Math.sqrt(x*x+y*y+z*z)+rr;
    if(L>maxLen) maxLen=L;
  }
  return maxLen + 0.5;
}

/* HUD readout */
function updateHud(buildP){
  if(barFill) barFill.style.width = (buildP*100).toFixed(1)+'%';
  var shown = Math.round(clamp(buildP/0.82,0,1)*SEQ.length);
  if(seqEl) seqEl.textContent = shown ? SEQ.slice(0,shown).join('\u00b7') : '\u00b7\u00b7\u00b7';
  if(verifyRow){
    if(buildP>=0.985){
      verifyRow.classList.add('ok');
      if(verifyText) verifyText.textContent='Verified \u00b7 \u226599.4% HPLC';
    } else {
      verifyRow.classList.remove('ok');
      if(verifyText) verifyText.textContent = shown<SEQ.length ? ('Assembling '+Math.min(shown+1,SEQ.length)+' / '+SEQ.length) : 'Confirming identity';
    }
  }
}

function draw(){
  var now = performance.now();
  var time = (now-startTime)*0.001;
  var buildP = reduce ? 1 : easeOut(clamp((now-startTime)/BUILD_MS,0,1));
  var bound = setAtoms(buildP);

  gl.uniform2f(U.u_res, W, H);
  gl.uniform1f(U.u_time, time);
  gl.uniform2f(U.u_cam, yaw, pit);
  gl.uniform1f(U.u_dist, DIST);
  gl.uniform1f(U.u_bound, bound);
  gl.uniform1f(U.u_energy, 0.5 + 0.5*buildP);
  gl.uniform2f(U.u_ptr, ptr.x, ptr.y);
  gl.uniform2f(U.u_offset, OFFX, 0.045);
  gl.uniform3fv(U.u_atoms, atomBuf);
  gl.uniform1fv(U.u_rad, radBuf);
  gl.drawArrays(gl.TRIANGLES,0,3);

  updateHud(buildP);

  if(buildP>=1 && !built){
    built=true;
    revealCopy();
    if(hint){ hint.style.transition='opacity .8s'; }
  }
}

/* ---------- reduced motion: one static assembled frame ---------- */
if(reduce){
  draw();
  revealCopy();
  if(hint) hint.style.display='none';
  // allow drag to re-render even without the animation loop
  bindOrbit(true);
  return;
}

/* ---------- animation loop (gated to viewport) ---------- */
var raf=0, running=false;
function frame(){
  // camera integration
  if(!dragging){
    yaw += yawVel + idleAuto;
    pit += pitVel;
    yawVel *= 0.93; pitVel *= 0.90;
    pit += (0.16 - pit) * 0.008;          // ease back toward a flattering tilt
  }
  pit = clamp(pit, -0.95, 1.05);
  draw();
  raf = requestAnimationFrame(frame);
}
function start(){ if(!running){ running=true; startTime += 0; raf=requestAnimationFrame(frame); } }
function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }

bindOrbit(false);

var __io = null;
if('IntersectionObserver' in window){
  __io = new IntersectionObserver(function(es){ if(es[0].isIntersecting) start(); else stop(); }, {threshold:0});
  __io.observe(stage);
} else start();
// the IntersectionObserver can be GC'd before its first delivery in some engines,
// so guarantee the loop starts
setTimeout(start, 60);

/* fade the "drag to orbit" hint once the user actually orbits */
var hinted=false;
function dismissHint(){ if(hinted||!hint) return; hinted=true; hint.style.opacity='0'; }

/* ---------- orbit interaction ---------- */
function bindOrbit(staticMode){
  function down(e){
    dragging=true; stage.classList.add('dragging');
    var pt = e.touches ? e.touches[0] : e;
    lastX=pt.clientX; lastY=pt.clientY; lastT=performance.now();
    yawVel=0; pitVel=0;
    dismissHint();
  }
  function move(e){
    var pt = e.touches ? e.touches[0] : e;
    // pointer parallax glint (always)
    var r=canvas.getBoundingClientRect();
    ptr.x = clamp((pt.clientX-r.left)/r.width*2-1,-1,1);
    ptr.y = clamp(1-(pt.clientY-r.top)/r.height*2,-1,1);
    if(!dragging){ return; }
    if(e.cancelable) e.preventDefault();
    var dx=pt.clientX-lastX, dy=pt.clientY-lastY;
    var dt=Math.max(16, performance.now()-lastT);
    yaw -= dx*0.006; pit += dy*0.006;
    pit = clamp(pit,-0.95,1.05);
    yawVel = -dx*0.006 * (16/dt);
    pitVel =  dy*0.006 * (16/dt);
    lastX=pt.clientX; lastY=pt.clientY; lastT=performance.now();
    if(staticMode) draw();
  }
  function up(){ dragging=false; stage.classList.remove('dragging'); if(staticMode){ pitVel=0; yawVel=0; } }

  stage.addEventListener('mousedown', down);
  window.addEventListener('mousemove', move, {passive:false});
  window.addEventListener('mouseup', up);
  stage.addEventListener('touchstart', down, {passive:true});
  window.addEventListener('touchmove', move, {passive:false});
  window.addEventListener('touchend', up);
}

})();
