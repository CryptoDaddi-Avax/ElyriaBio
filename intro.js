/* ============================================================
   ELYRIA BIO — cinematic arrival intro
   Atoms assemble → explode into particles → drift → converge
   into the wordmark → camera pushes into the hero.
   ============================================================ */
(function(){
  var intro = document.getElementById('intro');
  var canvas = document.getElementById('introCanvas');
  if(!intro || !canvas) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var force = /[?&]intro\b/.test(location.search);
  var seen = false;
  try { seen = sessionStorage.getItem('elyria_intro') === '1'; } catch(e){}
  var skipAuto = seen && !force;
  if(skipAuto || reduce){ intro.classList.add('intro-removed'); if(reduce) return; }
  try { sessionStorage.setItem('elyria_intro','1'); } catch(e){}
  if(!skipAuto) document.body.classList.add('intro-open');

  var ctx = canvas.getContext('2d');
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var W = 0, H = 0;
  function resize(){
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W*DPR); canvas.height = Math.round(H*DPR);
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  resize();

  /* ---------- timeline (ms) ---------- */
  var T_EXPLODE = 1050;   // atoms burst
  var T_CONVERGE = 2450;  // particles begin homing to the wordmark
  var T_SETTLE  = 4050;   // wordmark formed
  var T_OUT     = 4750;   // push into hero
  var T_END     = 5750;

  /* ---------- glow sprites ---------- */
  function sprite(r,g,b){
    var s = 48, c = document.createElement('canvas'); c.width = c.height = s;
    var x = c.getContext('2d');
    var grd = x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    grd.addColorStop(0,'rgba(255,252,240,1)');
    grd.addColorStop(0.18,'rgba('+r+','+g+','+b+',0.95)');
    grd.addColorStop(0.45,'rgba('+r+','+g+','+b+',0.35)');
    grd.addColorStop(1,'rgba('+r+','+g+','+b+',0)');
    x.fillStyle = grd; x.fillRect(0,0,s,s);
    return c;
  }
  var sprites = [ sprite(253,238,192), sprite(231,192,106), sprite(231,192,106), sprite(185,149,78), sprite(169,121,47) ];

  /* ---------- sample wordmark into target points ---------- */
  function sampleTargets(){
    var off = document.createElement('canvas'); off.width = W; off.height = H;
    var o = off.getContext('2d');
    o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
    var cx = W/2, cy = H*0.46;
    var fs = Math.min(W*0.15, 148); if(W < 480) fs = W*0.165;
    var ls = fs*0.18;
    try { o.letterSpacing = ls + 'px'; } catch(e){ ls = 0; }
    o.font = '300 ' + fs + 'px "Jost", sans-serif';
    o.fillText('ELYRIA', cx + ls/2, cy);
    var sub = Math.max(30, fs*0.36), sls = sub*1.15, subY = cy + fs*0.55 + sub*0.5;
    try { o.letterSpacing = sls + 'px'; } catch(e){ sls = 0; }
    o.font = '500 ' + sub + 'px "Jost", sans-serif';
    o.fillText('BIO', cx + sls/2, subY);
    var subTop = subY - sub*0.6;
    var img = o.getImageData(0,0,W,H).data;
    var gap = Math.max(2, Math.round(fs/48));
    var pts = [];
    for(var y=0; y<H; y+=gap){
      for(var x=0; x<W; x+=gap){
        if(img[(y*W+x)*4+3] > 130){
          pts.push([x + (Math.random()-0.5)*gap*0.6, y + (Math.random()-0.5)*gap*0.6, y > subTop ? 1 : 0]);
        }
      }
    }
    // shuffle + cap
    for(var i=pts.length-1;i>0;i--){ var j=(Math.random()*(i+1))|0, t=pts[i]; pts[i]=pts[j]; pts[j]=t; }
    return pts.slice(0, 5200);
  }

  /* ---------- atoms & particles ---------- */
  var atoms = [], parts = [], flash = 0, started = 0, raf = 0, dismissed = false, pushed = false;

  function build(){
    var pts = sampleTargets();
    var K = W < 640 ? 3 : 5, mn = Math.min(W,H);
    atoms = [];
    for(var k=0;k<K;k++){
      atoms.push({
        x: W*(0.5 + (k-(K-1)/2)*(W<640?0.22:0.14)) + (Math.random()-0.5)*mn*0.04,
        y: H*0.46 + Math.sin(k*2.1)*mn*0.09,
        r: mn*(0.035+Math.random()*0.02),
        tilt: Math.random()*Math.PI
      });
    }
    parts = pts.map(function(p,i){
      var a = atoms[i%K];
      return {
        hx:p[0], hy:p[1], atom:a,
        oa: Math.random()*Math.PI*2,            // orbit angle
        or: Math.pow(Math.random(),0.6)*a.r,    // orbit radius
        os: (0.9+Math.random()*2.4)*(Math.random()<0.5?-1:1)*0.0022, // orbit speed
        ot: a.tilt,
        x:a.x, y:a.y, vx:0, vy:0,
        sp: sprites[(Math.random()*sprites.length)|0],
        sz: p[2] ? 1.6 + Math.random()*1.4 : 2.2 + Math.random()*3.6,
        tw: Math.random()*Math.PI*2,            // twinkle phase
        exploded:false
      };
    });
  }

  function draw(now){
    var t = now - started;
    // trail fade: comet trails while flying, crisp while forming
    var trail = t < T_CONVERGE ? 0.22 : Math.min(1, 0.22 + (t-T_CONVERGE)/900);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(6,5,9,' + trail.toFixed(3) + ')';
    ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation = 'lighter';

    // atom cores + orbit rings before the burst
    if(t < T_EXPLODE){
      var born = Math.min(1, t/520);
      for(var k=0;k<atoms.length;k++){
        var a = atoms[k];
        var pulse = 1 + Math.sin(t*0.012 + k)*0.08;
        ctx.globalAlpha = 0.75*born;
        ctx.drawImage(sprites[1], a.x-a.r*0.62*pulse, a.y-a.r*0.62*pulse, a.r*1.24*pulse, a.r*1.24*pulse);
        ctx.globalAlpha = 0.16*born;
        ctx.strokeStyle = '#e7c06a'; ctx.lineWidth = 1;
        for(var q=0;q<2;q++){
          ctx.beginPath();
          ctx.ellipse(a.x, a.y, a.r*(1.5+q*0.7), a.r*(0.55+q*0.25), a.tilt + q*1.2 + t*0.0004, 0, Math.PI*2);
          ctx.stroke();
        }
      }
      // pre-burst contraction in the last 140ms
      var squeeze = t > T_EXPLODE-140 ? 1-(t-(T_EXPLODE-140))/140*0.55 : 1;
      for(var i=0;i<parts.length;i++){
        var p = parts[i], A = p.atom;
        p.x = A.x + Math.cos(p.oa + t*p.os*1000)*p.or*squeeze;
        p.y = A.y + Math.sin(p.oa + t*p.os*1000)*p.or*0.62*squeeze;
      }
    } else {
      for(var i=0;i<parts.length;i++){
        var p = parts[i];
        if(!p.exploded){
          p.exploded = true;
          var A = p.atom;
          var ang = Math.atan2(p.y-A.y, p.x-A.x) + (Math.random()-0.5)*0.7;
          if(p.or < 2) ang = Math.random()*Math.PI*2;
          var sp = 5 + Math.random()*11;
          p.vx = Math.cos(ang)*sp + (Math.random()-0.5)*2;
          p.vy = Math.sin(ang)*sp*0.8 + (Math.random()-0.5)*2;
        }
        if(t < T_CONVERGE){
          // free drift with gentle swirl + lift
          p.x += p.vx; p.y += p.vy;
          p.vx = p.vx*0.966 + Math.sin(p.tw + t*0.0016)*0.05;
          p.vy = p.vy*0.966 - 0.028 + Math.cos(p.tw*1.3 + t*0.0013)*0.05;
        } else {
          // ease home
          var k2 = Math.min(1,(t-T_CONVERGE)/1600);
          var pull = 0.015 + k2*k2*0.17;
          p.x += (p.hx-p.x)*pull + p.vx;
          p.y += (p.hy-p.y)*pull + p.vy;
          p.vx *= 0.88; p.vy *= 0.88;
        }
      }
      if(flash === 0 && t >= T_SETTLE) flash = 0.35;
    }

    // particles
    for(var i=0;i<parts.length;i++){
      var p = parts[i];
      var tw = 0.55 + 0.45*Math.sin(p.tw + t*0.006);
      ctx.globalAlpha = Math.min(1, t/400) * (0.5 + tw*0.5);
      var s = p.sz * (t < T_EXPLODE ? 0.85 : (t < T_CONVERGE ? 1.15 : 1));
      ctx.drawImage(p.sp, p.x-s, p.y-s, s*2, s*2);
    }

    // settle flash
    if(flash > 0.004){
      ctx.globalAlpha = flash;
      ctx.fillStyle = 'rgba(231,192,106,0.5)';
      ctx.fillRect(0,0,W,H);
      flash *= 0.86;
    }

    if(t >= T_OUT && !pushed){
      pushed = true;
      intro.classList.add('push');
      intro.classList.add('done');
      var skip = document.getElementById('introSkip'); if(skip) skip.style.opacity = 0;
    }
    if(t >= T_END){ finish(); return; }
    raf = requestAnimationFrame(draw);
  }

  function finish(){
    if(dismissed) return; dismissed = true;
    cancelAnimationFrame(raf);
    intro.classList.add('done');
    document.body.classList.remove('intro-open');
    setTimeout(function(){ intro.classList.add('intro-removed'); }, 900);
  }

  intro.addEventListener('click', function(){
    if(pushed) return;
    pushed = true;
    intro.classList.add('push');
    finish();
  });
  window.addEventListener('resize', resize);

  function start(){
    if(started) return;
    started = performance.now();
    build();
    raf = requestAnimationFrame(draw);
  }
  // debug/replay hooks
  window.__introSeek = function(ms){ if(!dismissed){ started = performance.now()-ms; } };
  window.__introReplay = function(){
    cancelAnimationFrame(raf); dismissed = false; pushed = false; flash = 0; started = 1;
    intro.classList.remove('done','push','intro-removed');
    document.body.classList.add('intro-open');
    resize();
    started = performance.now(); build();
    raf = requestAnimationFrame(draw);
  };
  // wait for Jost so the sampled wordmark uses the brand face
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){ if(!skipAuto) start(); });
    setTimeout(function(){ if(!skipAuto) start(); }, 900); // safety
  } else if(!skipAuto){ start(); }
})();
