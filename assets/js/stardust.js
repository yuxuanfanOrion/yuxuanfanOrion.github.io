/*
 * Pointer and scroll feedback in the language of the rest of the page.
 *
 * Pointer (mouse or trackpad only): the cursor itself is a star, set in
 * home.css with two small images (a brighter blue one over links and
 * buttons). This script adds what an image cannot do: a small satellite
 * star circling the cursor, stardust shed while it moves, and a short
 * burst with a ring on a click. These are drawn on one canvas above the
 * page that never takes pointer events; the draw loop stops when nothing is
 * left to draw.
 *
 * Scroll: the first time a section title comes into view, a meteor runs
 * along the rule under it (the CSS does the motion; this adds the class).
 *
 * The moving parts do not run with prefers-reduced-motion; the star cursor
 * itself is a still image and stays.
 */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ── Section titles ── */
  if ('IntersectionObserver' in window) {
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        seen.unobserve(entry.target);
      });
    }, { threshold: 1, rootMargin: '0px 0px -12% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.section-title'), function (title) {
      seen.observe(title);
    });
  }

  /* ── Pointer ── */
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'stardust';
  canvas.setAttribute('aria-hidden', 'true');
  /* Placed here and not in the stylesheet: with a stale stylesheet the
     canvas would otherwise fall to the end of the page as an ordinary block. */
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:10;pointer-events:none;';
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  /* The theme is the data-theme attribute on <html>; the switch in the
     corner announces a change with a themechange event. */
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  /* On the white page the dust is ink and accent blue with a little amber;
     at night it is starlight. */
  var INK = ['37,99,235', '37,99,235', '11,27,77', '217,119,6'];
  var LIGHT = ['255,255,255', '190,212,255', '190,212,255', '255,214,160'];
  function tones() { return isDark() ? LIGHT : INK; }

  var W = 0;
  var H = 0;
  var dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  var dust = [];        /* { x, y, vx, vy, born, life, size, star, tone, spin } */
  var rings = [];       /* { x, y, born } */
  var MAX_DUST = 90;

  var pointer = { x: 0, y: 0, seen: false, movedAt: -1e9, over: false };
  var moon = { alpha: 0, angle: 0, reach: 17 };   /* the satellite circling the cursor */
  var carry = 0;        /* distance moved since the last grain of dust */

  function star(x, y, r, turn) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = turn + i * Math.PI / 4;
      var d = i % 2 ? r * 0.3 : r;
      if (i) ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
      else ctx.moveTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fill();
  }

  function shed(x, y, vx, vy, big) {
    if (dust.length >= MAX_DUST) dust.shift();
    var palette = tones();
    dust.push({
      x: x, y: y, vx: vx, vy: vy,
      born: performance.now(),
      life: 520 + Math.random() * 620,
      size: (big ? 2.4 : 1.4) + Math.random() * (big ? 2.6 : 2.1),
      star: Math.random() < (big ? 0.7 : 0.5),
      tone: palette[Math.floor(Math.random() * palette.length)],
      spin: Math.random() * Math.PI
    });
  }

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var now = performance.now();
    if (pointer.seen) {
      var dx = e.clientX - pointer.x;
      var dy = e.clientY - pointer.y;
      carry += Math.sqrt(dx * dx + dy * dy);
      var grains = 0;
      while (carry > 16 && grains < 3) {
        carry -= 16;
        grains++;
        shed(e.clientX + (Math.random() - 0.5) * 10, e.clientY + (Math.random() - 0.5) * 10,
          -dx * 0.6 + (Math.random() - 0.5) * 26, -dy * 0.6 + (Math.random() - 0.5) * 26 + 14, false);
      }
      if (carry > 48) carry = 0;
    }
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.seen = true;
    pointer.movedAt = now;
    pointer.over = !!(e.target && e.target.closest && e.target.closest('a, button, [role="button"]'));
    wake();
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    for (var i = 0; i < 11; i++) {
      var a = Math.random() * Math.PI * 2;
      var v = 50 + Math.random() * 130;
      shed(e.clientX, e.clientY, Math.cos(a) * v, Math.sin(a) * v, true);
    }
    rings.push({ x: e.clientX, y: e.clientY, born: performance.now() });
    wake();
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', function () {
    pointer.movedAt = -1e9;
  });

  var raf = null;
  var last = 0;

  function frame(ms) {
    raf = null;
    var dt = Math.min(0.05, (ms - last) / 1000) || 0.016;
    last = ms;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = isDark() ? 'lighter' : 'source-over';

    for (var r = rings.length - 1; r >= 0; r--) {
      var ring = rings[r];
      var rp = (ms - ring.born) / 460;
      if (rp >= 1) { rings.splice(r, 1); continue; }
      ctx.strokeStyle = 'rgba(' + tones()[0] + ',' + (0.55 * (1 - rp)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, 4 + 24 * (1 - Math.pow(1 - rp, 3)), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (var i = dust.length - 1; i >= 0; i--) {
      var g = dust[i];
      var p = (ms - g.born) / g.life;
      if (p >= 1) { dust.splice(i, 1); continue; }
      g.vx *= 1 - 2.4 * dt;
      g.vy = g.vy * (1 - 2.4 * dt) + 34 * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      var fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      ctx.fillStyle = 'rgba(' + g.tone + ',' + (0.85 * fade).toFixed(3) + ')';
      if (g.star) {
        star(g.x, g.y, g.size * (0.6 + 0.6 * fade), g.spin + p * 1.6);
      } else {
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /* The satellite: circles the cursor, wider and faster over a link, and
       leaves a short fading arc behind it. It fades out when the pointer
       rests. */
    var resting = ms - pointer.movedAt > 2600;
    var want = pointer.seen && !resting ? 1 : 0;
    moon.alpha += (want - moon.alpha) * (want ? 0.2 : 0.05);
    moon.reach += ((pointer.over ? 21 : 17) - moon.reach) * 0.15;
    moon.angle += dt * (pointer.over ? 5.2 : 2.6);
    if (moon.alpha > 0.01) {
      var tone = pointer.over ? tones()[0] : (isDark() ? '255,255,255' : '11,27,77');
      for (var k = 5; k >= 0; k--) {
        var a = moon.angle - k * 0.2;
        var mx = pointer.x + Math.cos(a) * moon.reach;
        var my = pointer.y + Math.sin(a) * moon.reach * 0.82;
        ctx.fillStyle = 'rgba(' + tone + ',' + (moon.alpha * (k ? 0.34 * (1 - k / 6) : 0.95)).toFixed(3) + ')';
        if (k) {
          ctx.beginPath();
          ctx.arc(mx, my, 1.1 * (1 - k / 7), 0, Math.PI * 2);
          ctx.fill();
        } else {
          star(mx, my, 3.4, moon.angle * 0.7);
        }
      }
    }

    if (dust.length || rings.length || moon.alpha > 0.01 || want) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  }

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
})();
