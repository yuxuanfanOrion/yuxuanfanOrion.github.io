/* Zodiac constellations — animated star-patterns on a canvas behind
   light-mode page content.  Features: gentle twinkling, mouse parallax,
   occasional shooting stars.  Hidden in dark mode.  Pauses when off-screen
   or tab hidden.  Respects prefers-reduced-motion (single static frame). */
(function () {
  'use strict';

  var REDUCE = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var TAU = Math.PI * 2;
  var FRAME_BUDGET = 1000 / 30;

  var Z = [
    /* Aries       */ { s:[[.80,.30],[.55,.15],[.30,.22],[.12,.48]], b:[0], l:[[0,1],[1,2],[2,3]] },
    /* Taurus      */ { s:[[.10,.18],[.30,.40],[.50,.55],[.70,.40],[.90,.18]], b:[2], l:[[0,1],[1,2],[2,3],[3,4]] },
    /* Gemini      */ { s:[[.25,.08],[.20,.38],[.22,.72],[.72,.12],[.66,.42],[.63,.76]], b:[0,3], l:[[0,1],[1,2],[3,4],[4,5],[1,4]] },
    /* Cancer      */ { s:[[.20,.18],[.45,.45],[.80,.15],[.50,.82]], b:[1], l:[[0,1],[1,2],[1,3]] },
    /* Leo         */ { s:[[.10,.55],[.15,.28],[.30,.14],[.50,.20],[.60,.40],[.85,.35],[.82,.66],[.56,.72]], b:[0,5], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,4]] },
    /* Virgo       */ { s:[[.15,.18],[.35,.38],[.50,.55],[.70,.76],[.85,.20],[.65,.38],[.28,.76]], b:[3], l:[[0,1],[1,2],[2,3],[4,5],[5,1],[2,6]] },
    /* Libra       */ { s:[[.50,.10],[.18,.45],[.82,.45],[.32,.82],[.68,.82]], b:[0], l:[[0,1],[0,2],[1,3],[2,4],[3,4]] },
    /* Scorpius    */ { s:[[.08,.14],[.14,.30],[.20,.46],[.32,.56],[.46,.60],[.60,.66],[.73,.76],[.86,.66],[.80,.50]], b:[0], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]] },
    /* Sagittarius */ { s:[[.25,.25],[.50,.14],[.75,.25],[.80,.55],[.60,.72],[.35,.72],[.20,.55]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,5]] },
    /* Capricornus */ { s:[[.20,.25],[.50,.10],[.80,.28],[.72,.60],[.40,.80],[.15,.58]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]] },
    /* Aquarius    */ { s:[[.22,.10],[.50,.22],[.35,.42],[.55,.52],[.40,.72],[.60,.82],[.80,.35]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[1,6]] },
    /* Pisces      */ { s:[[.12,.30],[.22,.14],[.32,.30],[.22,.44],[.45,.52],[.72,.55],[.62,.72],[.82,.72],[.72,.86]], b:[1,7], l:[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6],[6,8],[8,7],[7,5]] }
  ];

  var ACCENT = '90,115,200';
  var GOLD   = '184,134,11';
  var GEMINI_IDX = 2;

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  var _seed = 137;
  function srand() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }

  /* ------------------------------------------------------------------ */
  function ZodiacField(canvas, content) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.content = content;
    this.w = 0; this.h = 0;
    this.visible = true;
    this.lastFrame = 0;
    this.mouseX = 0.5; this.mouseY = 0.5;
    this.curX = 0.5; this.curY = 0.5;
    this.shooting = null;
    this.nextShootAt = 0;
    this.layout = [];

    var self = this;
    this.computeLayout();

    if (!REDUCE) {
      window.addEventListener('mousemove', function (e) {
        self.mouseX = e.clientX / window.innerWidth;
        self.mouseY = e.clientY / window.innerHeight;
      }, { passive: true });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (ents) {
        self.visible = ents[0].isIntersecting;
      }).observe(canvas);
    }

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT); rT = setTimeout(function () { self.computeLayout(); }, 200);
    });
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () {
        clearTimeout(rT); rT = setTimeout(function () { self.computeLayout(); }, 150);
      }).observe(content);
    }
    new MutationObserver(function () {
      setTimeout(function () { self.computeLayout(); }, 60);
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (REDUCE) {
      this.drawFrame(0);
    } else {
      requestAnimationFrame(function tick(ts) {
        requestAnimationFrame(tick);
        if (document.hidden || !self.visible) return;
        if (isDark()) { canvas.style.display = 'none'; return; }
        canvas.style.display = '';
        if (ts - self.lastFrame < FRAME_BUDGET) return;
        self.lastFrame = ts;
        self.drawFrame(ts);
      });
    }
  }

  ZodiacField.prototype.computeLayout = function () {
    if (isDark()) { this.canvas.style.display = 'none'; return; }
    this.canvas.style.display = '';

    var w = this.content.offsetWidth;
    var h = this.content.scrollHeight || this.content.offsetHeight;
    if (!w || !h) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cols = 4, rows = 3;
    var cellW = w / cols;
    var cellH = Math.max(h / rows, 280);
    var baseSize = Math.max(90, Math.min(cellW, cellH) * 0.55);
    baseSize = Math.min(baseSize, 200);

    _seed = 137;
    this.layout = [];

    for (var i = 0; i < Z.length; i++) {
      var isG = (i === GEMINI_IDX);
      var col = i % cols, row = Math.floor(i / cols);
      var cx = cellW * (col + 0.5) + (srand() - 0.5) * cellW * 0.32;
      var cy = cellH * (row + 0.5) + (srand() - 0.5) * cellH * 0.22 + 40;
      var rot = (srand() - 0.5) * 0.35;

      var sd = [];
      for (var si = 0; si < Z[i].s.length; si++) {
        sd.push({ spd: 0.0006 + srand() * 0.0018, ph: srand() * TAU });
      }

      this.layout.push({
        cx: cx, cy: cy, rot: rot,
        size: isG ? baseSize * 1.45 : baseSize,
        isG: isG,
        rgb: isG ? GOLD : ACCENT,
        boost: isG ? 2.5 : 1,
        depth: 0.3 + i * 0.06,
        sd: sd
      });
    }

    if (REDUCE) this.drawFrame(0);
  };

  ZodiacField.prototype.drawFrame = function (ts) {
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);

    this.curX += (this.mouseX - this.curX) * 0.03;
    this.curY += (this.mouseY - this.curY) * 0.03;
    var px = (this.curX - 0.5) * 18;
    var py = (this.curY - 0.5) * 12;

    for (var i = 0; i < Z.length; i++) {
      var z = Z[i], L = this.layout[i];
      if (!L) continue;
      var vFade = Math.max(0.30, 1 - (L.cy / h) * 0.55);

      ctx.save();
      ctx.translate(L.cx - px * L.depth, L.cy - py * L.depth);
      ctx.rotate(L.rot);

      /* connecting lines — pulse gently */
      var linePulse = REDUCE ? 1 : 0.85 + 0.15 * Math.sin(ts * 0.0005 + i);
      ctx.strokeStyle = 'rgba(' + L.rgb + ',' + (0.25 * L.boost * vFade * linePulse).toFixed(4) + ')';
      ctx.lineWidth = L.isG ? 2.0 : 1.3;
      ctx.lineCap = 'round';
      for (var li = 0; li < z.l.length; li++) {
        var a = z.s[z.l[li][0]], b = z.s[z.l[li][1]];
        ctx.beginPath();
        ctx.moveTo((a[0] - 0.5) * L.size, (a[1] - 0.5) * L.size);
        ctx.lineTo((b[0] - 0.5) * L.size, (b[1] - 0.5) * L.size);
        ctx.stroke();
      }

      /* stars */
      for (var si = 0; si < z.s.length; si++) {
        var st = z.s[si], sd = L.sd[si];
        var x = (st[0] - 0.5) * L.size, y = (st[1] - 0.5) * L.size;
        var bright = z.b && z.b.indexOf(si) !== -1;
        var r = bright ? (L.isG ? 5.0 : 3.5) : (L.isG ? 2.8 : 2.0);
        var tw = REDUCE ? 1 : 0.65 + 0.35 * Math.sin(ts * sd.spd + sd.ph);
        var al = (bright ? 0.45 : 0.30) * L.boost * vFade * tw;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fillStyle = 'rgba(' + L.rgb + ',' + al.toFixed(4) + ')';
        ctx.fill();

        if (bright) {
          var glowR = L.isG ? r * 6 : r * 4;
          var twGlow = 0.20 * L.boost * vFade * tw;
          var g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
          g.addColorStop(0, 'rgba(' + L.rgb + ',' + twGlow.toFixed(4) + ')');
          g.addColorStop(1, 'rgba(' + L.rgb + ',0)');
          ctx.beginPath();
          ctx.arc(x, y, glowR, 0, TAU);
          ctx.fillStyle = g;
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (!REDUCE) this.drawShooting(ts);
  };

  ZodiacField.prototype.drawShooting = function (ts) {
    var ctx = this.ctx, w = this.w, h = this.h;
    if (!this.shooting) {
      if (!this.nextShootAt) this.nextShootAt = ts + 3000 + Math.random() * 6000;
      if (ts < this.nextShootAt) return;
      var ang = (12 + Math.random() * 35) * Math.PI / 180;
      this.shooting = {
        x: w * (0.05 + Math.random() * 0.85),
        y: h * (0.02 + Math.random() * 0.55),
        vx: Math.cos(ang) * 0.42,
        vy: Math.sin(ang) * 0.42,
        born: ts, life: 1100
      };
    }
    var m = this.shooting, age = ts - m.born;
    if (age > m.life) {
      this.shooting = null;
      this.nextShootAt = ts + 6000 + Math.random() * 12000;
      return;
    }
    var t = age / m.life;
    var fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
    var hx = m.x + m.vx * age, hy = m.y + m.vy * age;
    var TRAIL = 100;
    var tx = hx - m.vx / 0.42 * TRAIL, ty = hy - m.vy / 0.42 * TRAIL;
    var grad = ctx.createLinearGradient(tx, ty, hx, hy);
    grad.addColorStop(0, 'rgba(' + ACCENT + ',0)');
    grad.addColorStop(1, 'rgba(' + ACCENT + ',' + (0.22 * fade).toFixed(4) + ')');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx, hy, 1.5, 0, TAU);
    ctx.fillStyle = 'rgba(' + ACCENT + ',' + (0.30 * fade).toFixed(4) + ')';
    ctx.fill();
  };

  function init() {
    var content = document.querySelector('.page-content');
    if (!content) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'zodiac-bg';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    content.appendChild(canvas);

    new ZodiacField(canvas, content);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
