/*
 * Pointer and scroll feedback in the language of the rest of the page.
 *
 * Pointer (mouse or trackpad only): the system cursor stays as it is. A
 * small four-point star follows it with a slight lag and grows over links
 * and buttons, moving the pointer sheds a little stardust, and a click
 * gives a short burst with a ring. All of it is drawn on one canvas above
 * the page that never takes pointer events, and the draw loop stops when
 * nothing is left to draw.
 *
 * Scroll: the first time a section title comes into view, a meteor runs
 * along the rule under it (the CSS does the motion; this adds the class).
 *
 * Nothing here runs with prefers-reduced-motion.
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
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  /* On the white page the dust is ink and accent blue with a little amber;
     at night it is starlight. */
  var INK = ['37,99,235', '37,99,235', '11,27,77', '217,119,6'];
  var LIGHT = ['255,255,255', '190,212,255', '190,212,255', '255,214,160'];
  function tones() { return dark.matches ? LIGHT : INK; }

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
  var mate = { x: 0, y: 0, size: 0, alpha: 0, turn: 0 };
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
    } else {
      mate.x = e.clientX;
      mate.y = e.clientY;
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
    ctx.globalCompositeOperation = dark.matches ? 'lighter' : 'source-over';

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

    /* The companion star: eases after the pointer, fades when it rests. */
    var resting = ms - pointer.movedAt > 2200;
    var want = pointer.seen && !resting ? 1 : 0;
    mate.alpha += (want - mate.alpha) * (want ? 0.2 : 0.06);
    mate.x += (pointer.x + 15 - mate.x) * 0.16;
    mate.y += (pointer.y + 17 - mate.y) * 0.16;
    mate.size += ((pointer.over ? 8.5 : 5) - mate.size) * 0.18;
    mate.turn += dt * (pointer.over ? 2.2 : 0.5);
    if (mate.alpha > 0.01) {
      var pulse = 0.85 + 0.15 * Math.sin(ms / 260);
      var tone = pointer.over ? tones()[0] : (dark.matches ? '255,255,255' : '11,27,77');
      ctx.fillStyle = 'rgba(' + tone + ',' + (0.9 * mate.alpha).toFixed(3) + ')';
      star(mate.x, mate.y, mate.size * pulse, mate.turn);
    }

    if (dust.length || rings.length || mate.alpha > 0.01 || want) raf = requestAnimationFrame(frame);
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
