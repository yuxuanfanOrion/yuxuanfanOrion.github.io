/*
 * Page sky, dark mode only: the stars that are above Singapore right now,
 * looking straight up with north at the top and east on the left. The
 * horizon is a circle around the viewport, so everything on screen is
 * above it. Positions follow the clock (the sky turns 15 degrees an hour).
 *
 * Orion is drawn with its lines whenever it is up. The sky is cleared
 * behind the text blocks so they stay clean, and a meteor crosses
 * now and then in the direction of the ones in the portrait.
 */
(function () {
  var canvas = document.querySelector('.page-sky');
  if (!canvas || !canvas.getContext || !window.fetch) return;

  var ctx = canvas.getContext('2d');
  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* Blocks of text the sky is cleared behind. */
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.content, .sidebar-identity, .nav-row, .sidebar-footer'));

  var RAD = Math.PI / 180;
  var LAT = 1.3483 * RAD;     /* NTU, Singapore */
  var LON = 103.6831;         /* degrees east */
  var SIN_LAT = Math.sin(LAT);
  var COS_LAT = Math.cos(LAT);

  /* Orion's seven main stars (RA, Dec in degrees) and the lines of the figure. */
  var ORION = [
    [88.793, 7.407],   /* Betelgeuse */
    [81.283, 6.350],   /* Bellatrix */
    [85.190, -1.943],  /* Alnitak */
    [84.053, -1.202],  /* Alnilam */
    [83.002, -0.299],  /* Mintaka */
    [86.939, -9.670],  /* Saiph */
    [78.634, -8.202]   /* Rigel */
  ];
  var ORION_LINES = [[0, 1], [0, 2], [2, 3], [3, 4], [1, 4], [2, 5], [4, 6], [5, 6]];

  var stars = null;     /* { ra, sinDec, cosDec, mag, r, a, color, f, ph, halo } */
  var orion = null;     /* same shape, positions only */
  var shown = [];       /* stars above the horizon, with x, y */
  var orionXY = null;
  var loading = false;

  var W = 0;
  var H = 0;
  var dpr = 1;

  /* B-V colour index to a tint: blue-white through white to orange. */
  var TINTS = [[-0.3, 170, 196, 255], [0.0, 205, 220, 255], [0.4, 246, 247, 255], [0.8, 255, 240, 216], [1.2, 255, 218, 176], [2.0, 255, 196, 140]];
  function tint(bv) {
    for (var i = 1; i < TINTS.length; i++) {
      if (bv <= TINTS[i][0] || i === TINTS.length - 1) {
        var a = TINTS[i - 1];
        var b = TINTS[i];
        var k = Math.min(1, Math.max(0, (bv - a[0]) / (b[0] - a[0])));
        return Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ',' + Math.round(a[3] + (b[3] - a[3]) * k);
      }
    }
  }

  function load() {
    if (stars || loading) return;
    loading = true;
    fetch(canvas.dataset.stars).then(function (res) { return res.json(); }).then(function (data) {
      var flat = data.stars;
      var list = [];
      for (var i = 0; i < flat.length; i += 4) {
        var dec = flat[i + 1] / 100 * RAD;
        var mag = flat[i + 2] / 10;
        var depth = 5.3 - mag;
        list.push({
          ra: flat[i] / 100 * RAD,
          sinDec: Math.sin(dec),
          cosDec: Math.cos(dec),
          r: 0.4 + 0.3 * depth,
          a: Math.min(1, 0.22 + 0.16 * depth),
          color: tint(flat[i + 3] / 10),
          halo: mag < 1.6,
          f: 0.6 + Math.random() * 1.6,
          ph: Math.random() * 6.283
        });
      }
      stars = list;
      orion = ORION.map(function (s) {
        return { ra: s[0] * RAD, sinDec: Math.sin(s[1] * RAD), cosDec: Math.cos(s[1] * RAD) };
      });
      place();
      wake();
    }).catch(function () { loading = false; });
  }

  /* Local sidereal time in radians. */
  function sidereal() {
    var days = Date.now() / 86400000 + 2440587.5 - 2451545.0;
    var deg = 280.46061837 + 360.98564736629 * days + LON;
    return ((deg % 360) + 360) % 360 * RAD;
  }

  /* Stereographic projection from the zenith: shapes keep their form. */
  function project(star, lst, R, out) {
    var h = lst - star.ra;
    var cosH = Math.cos(h);
    var sinAlt = star.sinDec * SIN_LAT + star.cosDec * COS_LAT * cosH;
    if (sinAlt < 0) return false;
    var east = -star.cosDec * Math.sin(h);
    var north = star.sinDec * COS_LAT - star.cosDec * SIN_LAT * cosH;
    var k = R / (1 + sinAlt);
    out.x = W / 2 - east * k;
    out.y = H / 2 - north * k;
    return true;
  }

  var placedAt = 0;
  function place() {
    if (!stars) return;
    var lst = sidereal();
    var R = Math.sqrt(W * W + H * H) / 2;
    shown = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (project(s, lst, R, s) && s.x > -4 && s.x < W + 4 && s.y > -4 && s.y < H + 4) shown.push(s);
    }
    orionXY = [];
    for (var j = 0; j < orion.length; j++) {
      if (!project(orion[j], lst, R, orion[j])) { orionXY = null; break; }
      orionXY.push(orion[j]);
    }
    placedAt = performance.now();
    dirty = true;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    place();
    dirty = true;
  }

  /* ── Meteor ── */
  var meteor = null;
  var nextMeteorAt = 0;
  function launch(ms) {
    var angle = (157 + (Math.random() * 14 - 7)) * RAD;
    meteor = {
      x: W * (0.35 + Math.random() * 0.7),
      y: H * (-0.05 + Math.random() * 0.45),
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      travel: Math.max(420, W * 0.4) * (0.8 + Math.random() * 0.5),
      tail: 150 + Math.random() * 90,
      start: ms,
      seconds: 0.75 + Math.random() * 0.35
    };
  }

  function drawMeteor(ms) {
    var p = (ms - meteor.start) / 1000 / meteor.seconds;
    if (p >= 1) {
      meteor = null;
      nextMeteorAt = ms + 20000 + Math.random() * 20000;
      return;
    }
    var hx = meteor.x + meteor.dx * meteor.travel * p;
    var hy = meteor.y + meteor.dy * meteor.travel * p;
    var tail = meteor.tail * Math.min(1, p * 4);
    var tx = hx - meteor.dx * tail;
    var ty = hy - meteor.dy * tail;
    var fade = Math.min(1, p * 6) * Math.min(1, (1 - p) * 2.5);
    var g = ctx.createLinearGradient(hx, hy, tx, ty);
    g.addColorStop(0, 'rgba(255,248,232,' + (0.95 * fade).toFixed(3) + ')');
    g.addColorStop(0.25, 'rgba(255,214,160,' + (0.5 * fade).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  /* ── Render ── */
  var dirty = true;
  var masks = [];
  var maskKey = '';

  function render(ms) {
    var t = ms / 1000;
    var moving = !still.matches;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    if (orionXY) {
      ctx.strokeStyle = 'rgba(176,196,255,0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (var l = 0; l < ORION_LINES.length; l++) {
        var a = orionXY[ORION_LINES[l][0]];
        var b = orionXY[ORION_LINES[l][1]];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 14) continue;
        var gap = 6 / len;
        ctx.moveTo(a.x + dx * gap, a.y + dy * gap);
        ctx.lineTo(b.x - dx * gap, b.y - dy * gap);
      }
      ctx.stroke();
    }

    for (var i = 0; i < shown.length; i++) {
      var s = shown[i];
      var alpha = s.a;
      if (moving) alpha *= 0.8 + 0.2 * Math.sin(t * s.f + s.ph);
      if (s.halo) {
        var halo = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
        halo.addColorStop(0, 'rgba(' + s.color + ',' + (0.22 * alpha).toFixed(3) + ')');
        halo.addColorStop(1, 'rgba(' + s.color + ',0)');
        ctx.fillStyle = halo;
        ctx.fillRect(s.x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10);
      }
      ctx.fillStyle = 'rgba(' + s.color + ',' + alpha.toFixed(3) + ')';
      if (s.r < 0.8) {
        ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
    }

    if (meteor) drawMeteor(ms);

    /* Clear the sky behind text. A blurred shadow gives each block a soft
       edge; the offset keeps the hard-edged rectangle itself off screen. */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.shadowColor = 'rgba(0,0,0,0.94)';
    ctx.shadowBlur = 44 * dpr;
    ctx.shadowOffsetX = W * 3 * dpr;
    for (var m = 0; m < masks.length; m++) {
      var box = masks[m];
      if (box.bottom < -60 || box.top > H + 60 || box.width === 0) continue;
      ctx.fillRect(box.left - 12 - W * 3, box.top - 8, box.width + 24, box.height + 16);
    }
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ── Loop ── */
  var raf = null;
  var lastDraw = 0;

  function frame(ms) {
    raf = null;
    if (!dark.matches || !stars) return;
    raf = requestAnimationFrame(frame);

    var key = '';
    for (var i = 0; i < blocks.length; i++) {
      masks[i] = blocks[i].getBoundingClientRect();
      key += Math.round(masks[i].left) + ',' + Math.round(masks[i].top) + ',' + Math.round(masks[i].width) + ',' + Math.round(masks[i].height) + ';';
    }
    if (key !== maskKey) {
      maskKey = key;
      dirty = true;
    }

    var moving = !still.matches;
    if (ms - placedAt > 15000) place();
    if (moving && !meteor && ms >= nextMeteorAt) launch(ms);
    if (!dirty && !meteor && (!moving || ms - lastDraw < 100)) return;
    lastDraw = ms;
    dirty = false;
    render(ms);
  }

  function wake() {
    if (!dark.matches) return;
    if (!stars) { load(); return; }
    if (!nextMeteorAt) nextMeteorAt = performance.now() + 6000 + Math.random() * 6000;
    dirty = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  dark.addEventListener('change', wake);
  resize();
  wake();
})();
