/*
 * The real sky above Singapore, right now, from a catalogue of stars to
 * magnitude 5.3. Positions follow the clock (the sky turns 15 degrees an
 * hour). It is drawn in one of two places:
 *
 * Dark mode: the whole page is the sky (.page-sky), looking straight up
 * with north at the top and east on the left. The horizon is a circle
 * around the viewport, so everything on screen is above it. The sky is
 * cleared behind the text blocks, Orion is drawn with its lines whenever it
 * is up, and a meteor crosses now and then.
 *
 * Light mode: a tall window in the right margin (.sky-window) looks out
 * from the horizon at the bottom to the zenith at the top. It faces Orion
 * whenever Orion is up, otherwise the best-placed constellation of a short
 * list, and draws the constellation figures.
 */
(function () {
  var pageCanvas = document.querySelector('.page-sky');
  var windowEl = document.querySelector('.sky-window');
  if (!pageCanvas || !pageCanvas.getContext || !window.fetch) return;

  var dark = window.matchMedia('(prefers-color-scheme: dark)');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  var RAD = Math.PI / 180;
  var LAT = 1.3483 * RAD;     /* NTU, Singapore */
  var LON = 103.6831;         /* degrees east */
  var SIN_LAT = Math.sin(LAT);
  var COS_LAT = Math.cos(LAT);

  /* ── Catalogue ── */
  var stars = null;       /* each: ra, sinDec, cosDec, r, a, color, halo, f, ph, then e, n, u */
  var figures = null;     /* IAU abbreviation -> polylines of points (same shape as stars) */
  var loading = false;
  var waiting = [];

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

  function point(raDeg, decDeg) {
    return { ra: raDeg * RAD, sinDec: Math.sin(decDeg * RAD), cosDec: Math.cos(decDeg * RAD), e: 0, n: 0, u: -1 };
  }

  function load(then) {
    if (stars) { then(); return; }
    waiting.push(then);
    if (loading) return;
    loading = true;
    fetch(pageCanvas.dataset.stars).then(function (res) { return res.json(); }).then(function (data) {
      var flat = data.stars;
      var list = [];
      for (var i = 0; i < flat.length; i += 4) {
        var s = point(flat[i] / 100, flat[i + 1] / 100);
        var depth = 5.3 - flat[i + 2] / 10;
        s.r = 0.4 + 0.3 * depth;
        s.a = Math.min(1, 0.22 + 0.16 * depth);
        s.color = tint(flat[i + 3] / 10);
        s.halo = depth > 3.7;
        s.f = 0.6 + Math.random() * 1.6;
        s.ph = Math.random() * 6.283;
        list.push(s);
      }
      figures = {};
      Object.keys(data.lines || {}).forEach(function (id) {
        figures[id] = data.lines[id].map(function (line) {
          var pts = [];
          for (var j = 0; j < line.length; j += 2) pts.push(point(line[j] / 100, line[j + 1] / 100));
          return pts;
        });
      });
      stars = list;
      turn();
      waiting.splice(0).forEach(function (fn) { fn(); });
    }).catch(function () { loading = false; });
  }

  /* Local sidereal time in radians. */
  function sidereal() {
    var days = Date.now() / 86400000 + 2440587.5 - 2451545.0;
    var deg = 280.46061837 + 360.98564736629 * days + LON;
    return ((deg % 360) + 360) % 360 * RAD;
  }

  /* East, north and up components of a direction on the sky. */
  function locate(p, lst) {
    var h = lst - p.ra;
    var cosH = Math.cos(h);
    p.e = -p.cosDec * Math.sin(h);
    p.n = p.sinDec * COS_LAT - p.cosDec * SIN_LAT * cosH;
    p.u = p.sinDec * SIN_LAT + p.cosDec * COS_LAT * cosH;
  }

  var turnedAt = 0;
  function turn() {
    var lst = sidereal();
    var i;
    for (i = 0; i < stars.length; i++) locate(stars[i], lst);
    Object.keys(figures).forEach(function (id) {
      figures[id].forEach(function (line) { line.forEach(function (p) { locate(p, lst); }); });
    });
    for (i = 0; i < SIGHTS.length; i++) locate(SIGHTS[i].at, lst);
    turnedAt = performance.now();
    page.placed = false;
    pane.placed = false;
  }

  /* Constellations worth turning the window towards, best first. */
  var SIGHTS = [
    ['Ori', 'Orion', 83.8, -1.2],
    ['Sco', 'Scorpius', 247.4, -26.4],
    ['Cru', 'Southern Cross', 187.0, -59.7],
    ['CMa', 'Canis Major', 104.0, -22.0],
    ['Sgr', 'Sagittarius', 285.0, -28.0],
    ['Leo', 'Leo', 160.0, 16.0],
    ['Tau', 'Taurus', 68.0, 17.0],
    ['Gem', 'Gemini', 107.0, 24.0],
    ['Cyg', 'Cygnus', 306.0, 41.0],
    ['UMa', 'Big Dipper', 185.0, 55.0],
    ['Cas', 'Cassiopeia', 15.0, 60.0],
    ['Peg', 'Pegasus', 350.0, 20.0],
    ['Aql', 'Aquila', 297.0, 6.0],
    ['Cen', 'Centaurus', 205.0, -48.0]
  ].map(function (s) { return { id: s[0], name: s[1], at: point(s[2], s[3]) }; });

  /* ── Meteors (both views) ── */
  function launch(view, ms) {
    var angle = (157 + (Math.random() * 14 - 7)) * RAD;
    view.meteor = {
      x: view.W * (0.35 + Math.random() * 0.7),
      y: view.H * (-0.05 + Math.random() * 0.45),
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      travel: Math.max(view.small ? 150 : 420, view.W * 0.4) * (0.8 + Math.random() * 0.5),
      tail: (view.small ? 60 : 150) + Math.random() * (view.small ? 40 : 90),
      start: ms,
      seconds: 0.75 + Math.random() * 0.35
    };
  }

  function drawMeteor(view, ms) {
    var ctx = view.ctx;
    var m = view.meteor;
    var p = (ms - m.start) / 1000 / m.seconds;
    if (p >= 1) {
      view.meteor = null;
      view.nextMeteorAt = ms + view.meteorEvery * (1 + Math.random());
      return;
    }
    var hx = m.x + m.dx * m.travel * p;
    var hy = m.y + m.dy * m.travel * p;
    var tail = m.tail * Math.min(1, p * 4);
    var tx = hx - m.dx * tail;
    var ty = hy - m.dy * tail;
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

  /* `boost` brightens and `grow` enlarges every star: the window is small,
     so its stars are drawn bolder than the page's. */
  function drawStars(view, t, moving, boost, grow) {
    var ctx = view.ctx;
    for (var i = 0; i < view.shown.length; i++) {
      var s = view.shown[i];
      var x = view.xs[i];
      var y = view.ys[i];
      var r = s.r * grow;
      var alpha = Math.min(1, s.a * boost);
      if (moving) alpha *= 0.8 + 0.2 * Math.sin(t * s.f + s.ph);
      if (s.halo) {
        var halo = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        halo.addColorStop(0, 'rgba(' + s.color + ',' + (0.22 * alpha).toFixed(3) + ')');
        halo.addColorStop(1, 'rgba(' + s.color + ',0)');
        ctx.fillStyle = halo;
        ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
      }
      ctx.fillStyle = 'rgba(' + s.color + ',' + alpha.toFixed(3) + ')';
      if (r < 0.8) {
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, 6.2832);
        ctx.fill();
      }
    }
  }

  /* ── Dark mode: the page sky ── */
  var page = {
    canvas: pageCanvas,
    ctx: pageCanvas.getContext('2d'),
    W: 0, H: 0, dpr: 1,
    shown: [], xs: [], ys: [],
    orion: null,
    placed: false,
    dirty: true,
    meteor: null,
    nextMeteorAt: 0,
    meteorEvery: 20000,
    small: false,
    lastDraw: 0
  };
  /* Blocks of text the sky is cleared behind. */
  var blocks = Array.prototype.slice.call(document.querySelectorAll('.content, .sidebar-identity, .nav-row, .sidebar-footer'));
  var masks = [];
  var maskKey = '';
  var ORION_STARS = [[88.793, 7.407], [81.283, 6.350], [85.190, -1.943], [84.053, -1.202], [83.002, -0.299], [86.939, -9.670], [78.634, -8.202]]
    .map(function (s) { return point(s[0], s[1]); });
  var ORION_LINES = [[0, 1], [0, 2], [2, 3], [3, 4], [1, 4], [2, 5], [4, 6], [5, 6]];

  /* Stereographic projection from the zenith: shapes keep their form. */
  function placePage() {
    var R = Math.sqrt(page.W * page.W + page.H * page.H) / 2;
    var lst = sidereal();
    page.shown = [];
    page.xs = [];
    page.ys = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      if (s.u < 0) continue;
      var k = R / (1 + s.u);
      var x = page.W / 2 - s.e * k;
      var y = page.H / 2 - s.n * k;
      if (x > -4 && x < page.W + 4 && y > -4 && y < page.H + 4) {
        page.shown.push(s);
        page.xs.push(x);
        page.ys.push(y);
      }
    }
    page.orion = [];
    for (var j = 0; j < ORION_STARS.length; j++) {
      var o = ORION_STARS[j];
      locate(o, lst);
      if (o.u < 0) { page.orion = null; break; }
      var ko = R / (1 + o.u);
      page.orion.push({ x: page.W / 2 - o.e * ko, y: page.H / 2 - o.n * ko });
    }
    page.placed = true;
    page.dirty = true;
  }

  function renderPage(ms) {
    var ctx = page.ctx;
    var W = page.W;
    var H = page.H;
    var moving = !still.matches;
    ctx.setTransform(page.dpr, 0, 0, page.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);

    if (page.orion) {
      ctx.strokeStyle = 'rgba(176,196,255,0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (var l = 0; l < ORION_LINES.length; l++) {
        var a = page.orion[ORION_LINES[l][0]];
        var b = page.orion[ORION_LINES[l][1]];
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

    drawStars(page, ms / 1000, moving, 1, 1);
    if (page.meteor) drawMeteor(page, ms);

    /* Clear the sky behind text. A blurred shadow gives each block a soft
       edge; the offset keeps the hard-edged rectangle itself off screen. */
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.shadowColor = 'rgba(0,0,0,0.94)';
    ctx.shadowBlur = 44 * page.dpr;
    ctx.shadowOffsetX = W * 3 * page.dpr;
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

  function stepPage(ms) {
    var key = '';
    for (var i = 0; i < blocks.length; i++) {
      masks[i] = blocks[i].getBoundingClientRect();
      key += Math.round(masks[i].left) + ',' + Math.round(masks[i].top) + ',' + Math.round(masks[i].width) + ',' + Math.round(masks[i].height) + ';';
    }
    if (key !== maskKey) {
      maskKey = key;
      page.dirty = true;
    }
    if (!page.placed) placePage();
    var moving = !still.matches;
    if (!page.nextMeteorAt) page.nextMeteorAt = ms + 6000 + Math.random() * 6000;
    if (moving && !page.meteor && ms >= page.nextMeteorAt) launch(page, ms);
    if (!page.dirty && !page.meteor && (!moving || ms - page.lastDraw < 100)) return;
    page.lastDraw = ms;
    page.dirty = false;
    renderPage(ms);
  }

  function resizePage() {
    page.dpr = Math.min(window.devicePixelRatio || 1, 2);
    page.W = window.innerWidth;
    page.H = window.innerHeight;
    pageCanvas.width = Math.round(page.W * page.dpr);
    pageCanvas.height = Math.round(page.H * page.dpr);
    page.placed = false;
    page.dirty = true;
  }

  /* ── Light mode: the sky window ── */
  var pane = {
    canvas: windowEl ? windowEl.querySelector('canvas') : null,
    ctx: null,
    W: 0, H: 0, dpr: 1,
    shown: [], xs: [], ys: [],
    lines: [],
    sight: null,
    facing: 180,
    placed: false,
    dirty: true,
    visible: false,
    meteor: null,
    nextMeteorAt: 0,
    meteorEvery: 14000,
    small: true,
    lastDraw: 0
  };
  var paneTitle = windowEl ? windowEl.querySelector('.sky-window-title') : null;
  var paneNote = windowEl ? windowEl.querySelector('.sky-window-note') : null;
  var GROUND = 16;                       /* px of ground under the horizon */
  var HALF_FIELD = 45 * RAD;             /* the window spans 90 degrees top to bottom */
  var COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  function paneOn() {
    return !!pane.canvas && !dark.matches && windowEl.offsetParent !== null;
  }

  /* Looks towards azimuth `azDeg`, `upDeg` above the horizon; stereographic.
     Looking half way up (45 degrees) puts the horizon GROUND px above the
     bottom and the zenith as far from the top; looking higher lifts the
     horizon out of view. look() returns false for points behind the viewer. */
  var cam = { fe: 0, fn: 0, fu: 0, re: 0, rn: 0, ue: 0, un: 0, uu: 0, scale: 1, horizon: 0 };
  function aim(azDeg, upDeg) {
    var az = azDeg * RAD;
    var ca = Math.cos(upDeg * RAD);
    var sa = Math.sin(upDeg * RAD);
    cam.fe = ca * Math.sin(az); cam.fn = ca * Math.cos(az); cam.fu = sa;
    cam.re = Math.cos(az); cam.rn = -Math.sin(az);
    cam.ue = cam.rn * cam.fu;
    cam.un = -cam.re * cam.fu;
    cam.uu = cam.re * cam.fn - cam.rn * cam.fe;
    cam.scale = (pane.H / 2 - GROUND) / (2 * Math.tan(HALF_FIELD / 2));
    cam.horizon = pane.H / 2 + 2 * cam.scale * Math.tan(upDeg * RAD / 2);
  }
  var spot = { x: 0, y: 0 };
  function look(p) {
    var front = p.e * cam.fe + p.n * cam.fn + p.u * cam.fu;
    if (front < 0.15) return false;
    var k = 2 * cam.scale / (1 + front);
    spot.x = pane.W / 2 + k * (p.e * cam.re + p.n * cam.rn);
    spot.y = pane.H / 2 - k * (p.e * cam.ue + p.n * cam.un + p.u * cam.uu);
    return true;
  }

  function placePane() {
    /* Orion whenever it is up; otherwise the first sight that is neither
       on the horizon nor overhead. */
    pane.sight = null;
    var up = 45;
    for (var i = 0; i < SIGHTS.length; i++) {
      var alt = Math.asin(SIGHTS[i].at.u) / RAD;
      if (i === 0 ? alt > 6 : alt > 18 && alt < 72) {
        pane.sight = SIGHTS[i];
        /* A sight high in the sky pulls the view up towards it. */
        up = Math.min(68, Math.max(45, alt));
        break;
      }
    }
    if (pane.sight) pane.facing = (Math.atan2(pane.sight.at.e, pane.sight.at.n) / RAD + 360) % 360;
    aim(pane.facing, up);

    pane.shown = [];
    pane.xs = [];
    pane.ys = [];
    var horizon = Math.min(pane.H, cam.horizon);
    for (var s = 0; s < stars.length; s++) {
      var star = stars[s];
      if (star.u < 0 || !look(star)) continue;
      if (spot.x > -4 && spot.x < pane.W + 4 && spot.y > -4 && spot.y < horizon) {
        pane.shown.push(star);
        pane.xs.push(spot.x);
        pane.ys.push(spot.y);
      }
    }

    pane.lines = [];
    Object.keys(figures).forEach(function (id) {
      var main = pane.sight && pane.sight.id === id;
      figures[id].forEach(function (line) {
        var prev = null;
        line.forEach(function (p) {
          var here = p.u > 0 && look(p) ? { x: spot.x, y: spot.y } : null;
          if (prev && here && (Math.min(prev.x, here.x) < pane.W + 20 && Math.max(prev.x, here.x) > -20) && Math.abs(prev.x - here.x) < pane.W * 3) {
            pane.lines.push({ ax: prev.x, ay: prev.y, bx: here.x, by: here.y, main: main });
          }
          prev = here;
        });
      });
    });

    var facing = COMPASS[Math.round(pane.facing / 45) % 8];
    if (paneTitle) paneTitle.textContent = pane.sight ? pane.sight.name + ', ' + facing : 'Looking ' + facing;
    if (paneNote) paneNote.textContent = 'Live over Singapore';
    pane.placed = true;
    pane.dirty = true;
  }

  function renderPane(ms) {
    var ctx = pane.ctx;
    var W = pane.W;
    var H = pane.H;
    var horizon = Math.min(H, cam.horizon);
    var moving = !still.matches;
    ctx.setTransform(pane.dpr, 0, 0, pane.dpr, 0, 0);

    var sky = ctx.createLinearGradient(0, cam.horizon - (H - GROUND), 0, cam.horizon);
    sky.addColorStop(0, '#050816');
    sky.addColorStop(0.55, '#0a1230');
    sky.addColorStop(0.9, '#13204a');
    sky.addColorStop(1, '#2a2f55');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, horizon);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, horizon);
    ctx.clip();

    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? 'rgba(190,208,255,0.5)' : 'rgba(150,172,235,0.13)';
      ctx.beginPath();
      for (var l = 0; l < pane.lines.length; l++) {
        var seg = pane.lines[l];
        if (seg.main !== !!pass) continue;
        var dx = seg.bx - seg.ax;
        var dy = seg.by - seg.ay;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 13) continue;
        var gap = 5 / len;
        ctx.moveTo(seg.ax + dx * gap, seg.ay + dy * gap);
        ctx.lineTo(seg.bx - dx * gap, seg.by - dy * gap);
      }
      ctx.stroke();
    }

    drawStars(pane, ms / 1000, moving, 2.1, 1.45);
    if (pane.meteor) drawMeteor(pane, ms);
    ctx.restore();

    ctx.fillStyle = '#04060d';
    if (horizon < H) ctx.fillRect(0, horizon, W, H - horizon);
    windowEl.classList.add('is-live');
  }

  function stepPane(ms) {
    if (!pane.visible) return;
    if (!pane.placed) placePane();
    var moving = !still.matches;
    if (!pane.nextMeteorAt) pane.nextMeteorAt = ms + 4000 + Math.random() * 6000;
    if (moving && !pane.meteor && ms >= pane.nextMeteorAt) launch(pane, ms);
    if (!pane.dirty && !pane.meteor && (!moving || ms - pane.lastDraw < 100)) return;
    pane.lastDraw = ms;
    pane.dirty = false;
    renderPane(ms);
  }

  function resizePane() {
    if (!pane.canvas) return;
    pane.dpr = Math.min(window.devicePixelRatio || 1, 2);
    pane.W = pane.canvas.clientWidth;
    pane.H = pane.canvas.clientHeight;
    if (!pane.W || !pane.H) return;
    pane.canvas.width = Math.round(pane.W * pane.dpr);
    pane.canvas.height = Math.round(pane.H * pane.dpr);
    pane.placed = false;
    pane.dirty = true;
    wake();
  }

  /* ── Loop ── */
  var raf = null;

  function frame(ms) {
    raf = null;
    var pageOn = dark.matches;
    var windowOn = paneOn() && pane.W > 0;
    if (!stars || (!pageOn && !windowOn)) return;
    raf = requestAnimationFrame(frame);
    if (ms - turnedAt > 15000) turn();
    if (pageOn) stepPage(ms);
    else stepPane(ms);
  }

  function wake() {
    if (!dark.matches && !(paneOn() && pane.W > 0)) return;
    load(function () {
      page.dirty = true;
      pane.dirty = true;
      if (!raf) raf = requestAnimationFrame(frame);
    });
  }

  if (pane.canvas) {
    pane.ctx = pane.canvas.getContext('2d');
    new ResizeObserver(resizePane).observe(pane.canvas);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        pane.visible = entries[entries.length - 1].isIntersecting;
        pane.dirty = true;
      }).observe(pane.canvas);
    } else {
      pane.visible = true;
    }
  }

  window.addEventListener('resize', resizePage);
  dark.addEventListener('change', function () {
    resizePane();
    wake();
  });
  resizePage();
  resizePane();
  wake();
})();
