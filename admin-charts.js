/* ============================================================
   ELYRIA BIO — CONSOLE / CHART PRIMITIVES (dependency-free SVG)
   ============================================================ */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function smoothPath(pts) {
    if (pts.length < 2) return "";
    var d = "M" + pts[0][0] + "," + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i], p1 = pts[i + 1];
      var cx = (p0[0] + p1[0]) / 2;
      d += " C" + cx + "," + p0[1] + " " + cx + "," + p1[1] + " " + p1[0] + "," + p1[1];
    }
    return d;
  }

  /* ---------- area / line chart with hover ---------- */
  // series: [{name,color,data:[n...]}], labels:[..], opts:{height, yfmt, areaFill}
  function lineChart(container, series, labels, opts) {
    opts = opts || {};
    container.innerHTML = "";
    var W = container.clientWidth || 700, H = opts.height || 240;
    var padL = 46, padR = 14, padT = 14, padB = 26;
    var iw = W - padL - padR, ih = H - padT - padB;
    var all = [].concat.apply([], series.map(function (s) { return s.data; }));
    var max = Math.max.apply(null, all) * 1.12 || 1, min = 0;
    var n = labels.length;
    var X = function (i) { return padL + (n <= 1 ? 0 : iw * i / (n - 1)); };
    var Y = function (v) { return padT + ih - ih * (v - min) / (max - min); };

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", height: H });

    // gridlines + y labels
    var ticks = 4;
    for (var t = 0; t <= ticks; t++) {
      var val = max * t / ticks, y = Y(val);
      svg.appendChild(el("line", { x1: padL, y1: y, x2: W - padR, y2: y, stroke: "rgba(255,255,255,.05)", "stroke-width": 1 }));
      var lab = el("text", { x: padL - 9, y: y + 3.5, fill: "#6f685c", "font-size": 10, "text-anchor": "end", "font-family": "IBM Plex Mono, monospace" });
      lab.textContent = opts.yfmt ? opts.yfmt(val) : Math.round(val);
      svg.appendChild(lab);
    }
    // x labels (sparse)
    var step = Math.ceil(n / 7);
    for (var i = 0; i < n; i += step) {
      var tx = el("text", { x: X(i), y: H - 7, fill: "#6f685c", "font-size": 10, "text-anchor": "middle", "font-family": "IBM Plex Mono, monospace" });
      tx.textContent = labels[i];
      svg.appendChild(tx);
    }

    series.forEach(function (s, si) {
      var pts = s.data.map(function (v, i) { return [X(i), Y(v)]; });
      var path = smoothPath(pts);
      if (opts.areaFill !== false && si === 0) {
        var gid = "grad" + Math.random().toString(36).slice(2, 7);
        var defs = el("defs", {});
        var lg = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
        lg.appendChild(el("stop", { offset: "0%", "stop-color": s.color, "stop-opacity": .26 }));
        lg.appendChild(el("stop", { offset: "100%", "stop-color": s.color, "stop-opacity": 0 }));
        defs.appendChild(lg); svg.appendChild(defs);
        var area = el("path", { d: path + " L" + X(n - 1) + "," + Y(0) + " L" + X(0) + "," + Y(0) + " Z", fill: "url(#" + gid + ")" });
        svg.appendChild(area);
      }
      svg.appendChild(el("path", { d: path, fill: "none", stroke: s.color, "stroke-width": si === 0 ? 2.4 : 1.8, "stroke-linecap": "round", "stroke-dasharray": s.dashed ? "5 5" : "", opacity: s.dashed ? .55 : 1 }));
    });

    // hover layer
    var focus = el("line", { x1: 0, y1: padT, x2: 0, y2: padT + ih, stroke: "rgba(231,192,106,.4)", "stroke-width": 1, opacity: 0 });
    svg.appendChild(focus);
    var dots = series.map(function (s) { var c = el("circle", { r: 4, fill: s.color, stroke: "#080706", "stroke-width": 2, opacity: 0 }); svg.appendChild(c); return c; });
    container.appendChild(svg);

    var tip = container.querySelector(".chart-tip") || (function () { var d = document.createElement("div"); d.className = "chart-tip"; container.appendChild(d); return d; })();

    var hit = el("rect", { x: padL, y: padT, width: iw, height: ih, fill: "transparent" });
    svg.appendChild(hit);
    function move(ev) {
      var rect = svg.getBoundingClientRect();
      var px = (ev.clientX - rect.left) / rect.width * W;
      var idx = Math.round((px - padL) / iw * (n - 1));
      idx = Math.max(0, Math.min(n - 1, idx));
      var x = X(idx);
      focus.setAttribute("x1", x); focus.setAttribute("x2", x); focus.setAttribute("opacity", 1);
      dots.forEach(function (c, si) { c.setAttribute("cx", x); c.setAttribute("cy", Y(series[si].data[idx])); c.setAttribute("opacity", 1); });
      var html = "<div class='micro' style='margin-bottom:5px;color:#9b9384'>" + labels[idx] + "</div>";
      series.forEach(function (s) {
        html += "<div style='display:flex;gap:9px;align-items:center;justify-content:space-between'><span style='display:inline-flex;align-items:center;gap:6px'><i style='width:8px;height:8px;border-radius:2px;background:" + s.color + ";display:inline-block'></i>" + s.name + "</span><b>" + (opts.tipfmt ? opts.tipfmt(s.data[idx]) : s.data[idx]) + "</b></div>";
      });
      tip.innerHTML = html;
      tip.style.left = (x / W * 100) + "%";
      tip.style.top = (Y(Math.max.apply(null, series.map(function (s) { return s.data[idx]; }))) / H * 100) + "%";
      tip.style.opacity = 1;
    }
    hit.addEventListener("mousemove", move);
    hit.addEventListener("mouseleave", function () { focus.setAttribute("opacity", 0); dots.forEach(function (c) { c.setAttribute("opacity", 0); }); tip.style.opacity = 0; });
  }

  /* ---------- sparkline ---------- */
  function spark(container, data, color, up) {
    container.innerHTML = "";
    var W = container.clientWidth || 160, H = 34;
    var max = Math.max.apply(null, data), min = Math.min.apply(null, data);
    var rng = (max - min) || 1;
    var pts = data.map(function (v, i) { return [W * i / (data.length - 1), H - 3 - (H - 6) * (v - min) / rng]; });
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "none", height: H });
    var c = color || (up ? "#7fcf8e" : "#e88c6a");
    var gid = "sg" + Math.random().toString(36).slice(2, 7);
    var defs = el("defs", {}); var lg = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    lg.appendChild(el("stop", { offset: "0%", "stop-color": c, "stop-opacity": .3 }));
    lg.appendChild(el("stop", { offset: "100%", "stop-color": c, "stop-opacity": 0 }));
    defs.appendChild(lg); svg.appendChild(defs);
    var path = smoothPath(pts);
    svg.appendChild(el("path", { d: path + " L" + W + "," + H + " L0," + H + " Z", fill: "url(#" + gid + ")" }));
    svg.appendChild(el("path", { d: path, fill: "none", stroke: c, "stroke-width": 1.8, "stroke-linecap": "round" }));
    container.appendChild(svg);
  }

  /* ---------- donut ---------- */
  // segs: [{label,value,color}]
  function donut(container, segs, opts) {
    opts = opts || {};
    var size = opts.size || 150, sw = opts.stroke || 18, r = (size - sw) / 2, cx = size / 2, cy = size / 2;
    var circ = 2 * Math.PI * r;
    var total = segs.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var svg = el("svg", { viewBox: "0 0 " + size + " " + size, width: size, height: size });
    svg.appendChild(el("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: "rgba(255,255,255,.05)", "stroke-width": sw }));
    var off = 0;
    segs.forEach(function (s) {
      var len = circ * s.value / total;
      var c = el("circle", { cx: cx, cy: cy, r: r, fill: "none", stroke: s.color, "stroke-width": sw, "stroke-dasharray": len + " " + (circ - len), "stroke-dashoffset": -off, transform: "rotate(-90 " + cx + " " + cy + ")", "stroke-linecap": "butt" });
      svg.appendChild(c); off += len;
    });
    if (opts.center) {
      var t1 = el("text", { x: cx, y: cy - 2, "text-anchor": "middle", fill: "#f4eee0", "font-size": 22, "font-family": "Fraunces, serif", "font-weight": 500 });
      t1.textContent = opts.center;
      svg.appendChild(t1);
      if (opts.centerSub) {
        var t2 = el("text", { x: cx, y: cy + 15, "text-anchor": "middle", fill: "#6f685c", "font-size": 9, "font-family": "IBM Plex Mono, monospace", "letter-spacing": 1.5 });
        t2.textContent = opts.centerSub; svg.appendChild(t2);
      }
    }
    container.innerHTML = ""; container.appendChild(svg);
  }

  window.Charts = { lineChart: lineChart, spark: spark, donut: donut };
})();
