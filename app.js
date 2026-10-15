/* DXB Ejari — alive: themes, live backgrounds, 3D tilt.  Built by DG Technologies */
(function () {
  "use strict";
  var doc = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = matchMedia("(pointer: fine)").matches;

  function lsGet(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* ---------------- THEME ---------------- */
  function applyTheme(t) {
    doc.dataset.theme = t;
    lsSet("dxb-theme", t);
    var btn = document.querySelector(".theme-btn");
    if (btn) btn.textContent = t === "dark" ? "☀️" : "🌙";
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.toggleAttribute("data-active", b.dataset.themeSet === t);
    });
    BG.recolor();
  }
  window.toggleTheme = function () {
    applyTheme(doc.dataset.theme === "dark" ? "light" : "dark");
  };

  /* ---------------- ACCENT COLOR ---------------- */
  function applyAccent(a) {
    if (a === "emerald") delete doc.dataset.accent; else doc.dataset.accent = a;
    lsSet("dxb-accent", a === "emerald" ? "" : a);
    document.querySelectorAll("[data-accent-set]").forEach(function (b) {
      b.toggleAttribute("data-active", b.dataset.accentSet === a);
    });
    BG.recolor();
  }

  /* ---------------- LIVE BACKGROUND ENGINE ---------------- */
  var BG = (function () {
    var canvas, ctx, W, H, DPR, mode = "off", raf = 0, parts = [], pal;

    function varRGB(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      if (v[0] === "#") {
        if (v.length === 4) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
        return parseInt(v.substr(1, 2), 16) + "," + parseInt(v.substr(3, 2), 16) + "," + parseInt(v.substr(5, 2), 16);
      }
      var m = v.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
      return m ? m[1] + "," + m[2] + "," + m[3] : fallback;
    }
    function buildPalette() {
      var dark = doc.dataset.theme === "dark";
      var leaf = varRGB("--leaf", "34,181,115");
      var deep = varRGB("--emerald", "14,90,60");
      var gold = "201,162,39";
      return dark ? {
        aurora: ["rgba(" + leaf + ",ALPHA)", "rgba(228,197,88,ALPHA)", "rgba(" + deep + ",ALPHA)"],
        dot: leaf, line: leaf, aAlpha: 0.20, dAlpha: 0.6, lineMax: 0.26
      } : {
        /* light mode: much softer — pastel dots, faint lines, gentle aurora */
        aurora: ["rgba(" + leaf + ",ALPHA)", "rgba(" + gold + ",ALPHA)", "rgba(" + deep + ",ALPHA)"],
        dot: leaf, line: deep, aAlpha: 0.10, dAlpha: 0.30, lineMax: 0.10
      };
    }

    function ensure() {
      if (canvas) return;
      canvas = document.createElement("canvas");
      canvas.id = "livebg";
      document.body.prepend(canvas);
      ctx = canvas.getContext("2d");
      addEventListener("resize", resize);
      document.addEventListener("visibilitychange", function () {
        if (document.hidden) stopLoop(); else if (mode !== "off") loop();
      });
      resize();
    }
    function resize() {
      if (!canvas) return;
      DPR = Math.min(devicePixelRatio || 1, 1.5);
      W = canvas.width = innerWidth * DPR;
      H = canvas.height = innerHeight * DPR;
      canvas.style.width = innerWidth + "px";
      canvas.style.height = innerHeight + "px";
      build();
    }
    function rand(a, b) { return a + Math.random() * (b - a); }

    function build() {
      parts = [];
      if (mode === "aurora") {
        for (var i = 0; i < 5; i++) parts.push({
          x: rand(0, W), y: rand(0, H), r: rand(H * 0.35, H * 0.6),
          dx: rand(-0.18, 0.18) * DPR, dy: rand(-0.12, 0.12) * DPR, c: i % 3, ph: rand(0, 6.28)
        });
      } else if (mode === "net") {
        var n = Math.min(90, Math.floor(innerWidth / 16));
        for (var j = 0; j < n; j++) parts.push({
          x: rand(0, W), y: rand(0, H),
          dx: rand(-0.28, 0.28) * DPR, dy: rand(-0.28, 0.28) * DPR
        });
      } else if (mode === "fireflies") {
        var m = Math.min(70, Math.floor(innerWidth / 20));
        for (var k = 0; k < m; k++) parts.push({
          x: rand(0, W), y: rand(0, H), r: rand(1.2, 3.2) * DPR,
          dx: rand(-0.22, 0.22) * DPR, dy: rand(-0.3, -0.06) * DPR, ph: rand(0, 6.28)
        });
      }
    }
    function move(p, wrap) {
      p.x += p.dx; p.y += p.dy;
      if (wrap) {
        if (p.x < -50) p.x = W + 50; if (p.x > W + 50) p.x = -50;
        if (p.y < -50) p.y = H + 50; if (p.y > H + 50) p.y = -50;
      } else {
        if (p.x < 0 || p.x > W) p.dx *= -1;
        if (p.y < 0 || p.y > H) p.dy *= -1;
      }
    }
    var t = 0;
    function frame() {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);
      if (mode === "aurora") {
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i]; move(p, true);
          var a = pal.aAlpha * (0.7 + 0.3 * Math.sin(t * 2 + p.ph));
          var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          g.addColorStop(0, pal.aurora[p.c].replace("ALPHA", a.toFixed(3)));
          g.addColorStop(1, pal.aurora[p.c].replace("ALPHA", "0"));
          ctx.fillStyle = g;
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      } else if (mode === "net") {
        var R = 140 * DPR;
        ctx.lineWidth = 1;
        for (var a1 = 0; a1 < parts.length; a1++) {
          var q = parts[a1]; move(q, false);
          for (var b1 = a1 + 1; b1 < parts.length; b1++) {
            var w = parts[b1], dx = q.x - w.x, dy = q.y - w.y, d = Math.sqrt(dx * dx + dy * dy);
            if (d < R) {
              ctx.strokeStyle = "rgba(" + pal.line + "," + ((1 - d / R) * pal.lineMax).toFixed(3) + ")";
              ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(w.x, w.y); ctx.stroke();
            }
          }
          ctx.fillStyle = "rgba(" + pal.dot + "," + pal.dAlpha + ")";
          ctx.beginPath(); ctx.arc(q.x, q.y, 1.9 * DPR, 0, 6.28); ctx.fill();
        }
      } else if (mode === "fireflies") {
        for (var f = 0; f < parts.length; f++) {
          var s = parts[f]; move(s, true);
          var tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 3 + s.ph));
          ctx.fillStyle = "rgba(" + pal.dot + "," + (tw * pal.dAlpha).toFixed(3) + ")";
          ctx.shadowColor = "rgba(" + pal.dot + ",0.9)";
          ctx.shadowBlur = 12 * tw;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.28); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function loop() { stopLoop(); if (mode !== "off") raf = requestAnimationFrame(frame); }
    function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

    return {
      set: function (m) {
        mode = m; lsSet("dxb-bg", m);
        document.querySelectorAll("[data-bg]").forEach(function (b) {
          b.toggleAttribute("data-active", b.dataset.bg === m);
        });
        if (m === "off") { stopLoop(); if (ctx) ctx.clearRect(0, 0, W, H); return; }
        ensure(); this.recolor(); build(); loop();
      },
      recolor: function () { pal = buildPalette(); }
    };
  })();

  /* ---------------- 3D TILT ---------------- */
  function tilt() {
    if (!finePointer || reduced) return;
    document.querySelectorAll(".cert,.founder-frame").forEach(function (el) {
      var base = el.classList.contains("founder-frame") ? 1.2 : 1.5;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -10;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 12;
        el.classList.add("tilting");
        el.style.transform = "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) rotate(" + base + "deg) scale(1.015)";
      });
      el.addEventListener("mouseleave", function () {
        el.classList.remove("tilting");
        el.style.transform = "";
      });
    });
  }

  /* ---------------- WIRE UP ---------------- */
  function init() {
    applyTheme(doc.dataset.theme || "light");
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      b.addEventListener("click", function () { applyTheme(b.dataset.themeSet); });
    });
    document.querySelectorAll("[data-bg]").forEach(function (b) {
      b.addEventListener("click", function () { BG.set(b.dataset.bg); });
    });
    applyAccent(lsGet("dxb-accent", "") || "emerald");
    document.querySelectorAll("[data-accent-set]").forEach(function (b) {
      b.addEventListener("click", function () { applyAccent(b.dataset.accentSet); });
    });
    var defaultBg = (finePointer && !reduced) ? "aurora" : "off";
    BG.set(lsGet("dxb-bg", defaultBg));
    tilt();
    document.addEventListener("click", function (e) {
      var fx = document.querySelector(".fx");
      if (fx && fx.classList.contains("open") && !fx.contains(e.target)) fx.classList.remove("open");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
