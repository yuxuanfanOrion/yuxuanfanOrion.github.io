/* Starfield — canvas depth starfield shared by the hero and the dark-mode
   full-page sky. Three depth cues layered together:
     1. depth buckets — far stars are small/dim, near stars large/bright
        (depth-of-field approximation with zero blur cost)
     2. slow rotation around an off-center celestial pole, so outer stars
        sweep visible arcs while polar stars barely move (long-exposure feel)
     3. mouse parallax scaled by depth — near stars shift more
   Plus a pre-rendered Milky Way band (hero only) and rare shooting stars.
   Perf/a11y: sprite-based drawing (no per-star shadowBlur), dpr capped at 2,
   ~60fps cap, pauses when hidden/off-screen/inactive, and renders a single
   static frame under prefers-reduced-motion. */
(function () {
  'use strict';

  var REDUCE = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FRAME_BUDGET = 1000 / 62;
  var TAU = Math.PI * 2;

  var PALETTE = [
    { color: '255,255,255', weight: 0.62 },  /* white */
    { color: '207,225,255', weight: 0.24 },  /* blue-white (hot) */
    { color: '255,230,199', weight: 0.14 }   /* warm (cool giant) */
  ];

  function pickColor() {
    var r = Math.random(), acc = 0, i;
    for (i = 0; i < PALETTE.length; i++) {
      acc += PALETTE[i].weight;
      if (r <= acc) return PALETTE[i].color;
    }
    return PALETTE[0].color;
  }

  /* Pre-rendered glow sprite per palette color: bright core, soft halo. */
  function makeSprite(rgb) {
    var c = document.createElement('canvas');
    c.width = c.height = 32;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(' + rgb + ',1)');
    grad.addColorStop(0.25, 'rgba(' + rgb + ',0.85)');
    grad.addColorStop(0.55, 'rgba(' + rgb + ',0.18)');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return c;
  }

  var SPRITES = {};
  PALETTE.forEach(function (p) { SPRITES[p.color] = makeSprite(p.color); });

  function Starfield(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.stars = [];
    this.shooting = null;
    this.nextShootAt = 0;
    this.mouseX = 0.5; this.mouseY = 0.5;       /* parallax target */
    this.curX = 0.5; this.curY = 0.5;           /* smoothed */
    this.lastFrame = 0;
    this.visible = true;
    this.milkyWay = null;
    this.w = 0; this.h = 0;

    var self = this;
    this.resize();

    var rT;
    window.addEventListener('resize', function () {
      clearTimeout(rT);
      rT = setTimeout(function () { self.resize(); }, 180);
    });

    if (opts.parallax && !REDUCE) {
      window.addEventListener('mousemove', function (e) {
        self.mouseX = e.clientX / window.innerWidth;
        self.mouseY = e.clientY / window.innerHeight;
      }, { passive: true });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
      }).observe(canvas);
    }

    if (REDUCE) {
      this.drawFrame(0);                         /* one static frame */
    } else {
      requestAnimationFrame(function tick(ts) {
        requestAnimationFrame(tick);
        if (document.hidden || !self.visible) return;
        if (self.opts.isActive && !self.opts.isActive()) return;
        if (ts - self.lastFrame < FRAME_BUDGET) return;
        self.lastFrame = ts;
        self.drawFrame(ts);
      });
    }
  }

  Starfield.prototype.resize = function () {
    var parent = this.canvas.parentElement;
    var w = parent.offsetWidth || window.innerWidth;
    var h = parent.offsetHeight || window.innerHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* Celestial pole sits off-canvas-center (like Polaris up and right). */
    this.poleX = w * this.opts.pole[0];
    this.poleY = h * this.opts.pole[1];

    /* Stars fill a disk big enough that rotation never exposes a bare
       corner; per-frame bounds check skips the off-canvas ones. */
    var R = 0;
    var corners = [[0, 0], [w, 0], [0, h], [w, h]];
    for (var i = 0; i < 4; i++) {
      var dx = corners[i][0] - this.poleX, dy = corners[i][1] - this.poleY;
      R = Math.max(R, Math.sqrt(dx * dx + dy * dy));
    }
    this.maxR = R;

    var visibleTarget = Math.max(110, Math.min(this.opts.maxStars,
      Math.round(w * h / this.opts.densityArea)));
    var total = Math.min(1600,
      Math.round(visibleTarget * (Math.PI * R * R) / (w * h)));

    this.stars = [];
    for (i = 0; i < total; i++) {
      var depth = Math.random();
      this.stars.push({
        a: Math.random() * TAU,
        r: Math.sqrt(Math.random()) * R,         /* uniform area density */
        depth: depth,
        size: (0.55 + depth * 1.75) * (Math.random() * 0.5 + 0.75),
        alpha: 0.22 + depth * 0.72,
        twSpeed: 0.0004 + Math.random() * 0.0014,
        twPhase: Math.random() * TAU,
        color: pickColor()
      });
    }

    if (this.opts.milkyWay) this.renderMilkyWay();
    if (REDUCE) this.drawFrame(0);
  };

  /* Faint diagonal galaxy band + dense micro-stars, rendered once. */
  Starfield.prototype.renderMilkyWay = function () {
    var w = this.w, h = this.h;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d');
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-Math.PI / 7);
    var band = Math.max(h * 0.42, 180);
    var grad = g.createLinearGradient(0, -band / 2, 0, band / 2);
    grad.addColorStop(0, 'rgba(185,200,255,0)');
    grad.addColorStop(0.35, 'rgba(190,205,255,0.055)');
    grad.addColorStop(0.5, 'rgba(215,222,255,0.085)');
    grad.addColorStop(0.65, 'rgba(190,205,255,0.055)');
    grad.addColorStop(1, 'rgba(185,200,255,0)');
    g.fillStyle = grad;
    var L = Math.sqrt(w * w + h * h);
    g.fillRect(-L, -band / 2, L * 2, band);
    /* micro-stars clustered toward the band's spine */
    for (var i = 0; i < 240; i++) {
      var bx = (Math.random() * 2 - 1) * L;
      var by = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
               * band * 0.5;
      var a = 0.10 + Math.random() * 0.30;
      g.fillStyle = 'rgba(220,228,255,' + a.toFixed(2) + ')';
      g.fillRect(bx, by, Math.random() < 0.2 ? 1.4 : 0.8, 0.8);
    }
    g.restore();
    this.milkyWay = c;
  };

  Starfield.prototype.drawFrame = function (ts) {
    var ctx = this.ctx, w = this.w, h = this.h;
    ctx.clearRect(0, 0, w, h);

    if (this.milkyWay) ctx.drawImage(this.milkyWay, 0, 0, w, h);

    /* smoothed parallax */
    this.curX += (this.mouseX - this.curX) * 0.04;
    this.curY += (this.mouseY - this.curY) * 0.04;
    var px = (this.curX - 0.5) * this.opts.parallax;
    var py = (this.curY - 0.5) * this.opts.parallax * 0.6;

    var rot = REDUCE ? 0 : ts * this.opts.rotSpeed;
    var margin = 6;

    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i];
      var ang = s.a + rot;
      var x = this.poleX + s.r * Math.cos(ang) - px * s.depth;
      var y = this.poleY + s.r * Math.sin(ang) - py * s.depth;
      if (x < -margin || x > w + margin || y < -margin || y > h + margin) {
        continue;
      }
      var tw = REDUCE ? 0.85
        : 0.72 + 0.28 * Math.sin(ts * s.twSpeed + s.twPhase);
      ctx.globalAlpha = s.alpha * tw;
      var d = s.size * 5;                        /* sprite incl. halo */
      ctx.drawImage(SPRITES[s.color], x - d / 2, y - d / 2, d, d);
    }
    ctx.globalAlpha = 1;

    if (this.opts.shootingStars && !REDUCE) this.drawShooting(ts);
  };

  Starfield.prototype.drawShooting = function (ts) {
    var ctx = this.ctx;
    if (!this.shooting) {
      if (!this.nextShootAt) {
        this.nextShootAt = ts + 6000 + Math.random() * 14000;
      }
      if (ts < this.nextShootAt) return;
      var ang = (18 + Math.random() * 26) * Math.PI / 180;
      this.shooting = {
        x: this.w * (0.1 + Math.random() * 0.7),
        y: this.h * (0.05 + Math.random() * 0.25),
        vx: Math.cos(ang) * 0.55,
        vy: Math.sin(ang) * 0.55,
        born: ts, life: 1100
      };
    }
    var m = this.shooting;
    var age = ts - m.born;
    if (age > m.life) {
      this.shooting = null;
      this.nextShootAt = ts + 9000 + Math.random() * 16000;
      return;
    }
    var t = age / m.life;
    var fade = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
    var hx = m.x + m.vx * age, hy = m.y + m.vy * age;
    var TRAIL = 110;
    var grad = ctx.createLinearGradient(
      hx - m.vx / 0.55 * TRAIL, hy - m.vy / 0.55 * TRAIL, hx, hy);
    grad.addColorStop(0, 'rgba(200,220,255,0)');
    grad.addColorStop(1, 'rgba(255,255,255,' + (0.9 * fade).toFixed(3) + ')');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx - m.vx / 0.55 * TRAIL, hy - m.vy / 0.55 * TRAIL);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  };

  function init() {
    var hero = document.getElementById('hero-starfield');
    if (hero) {
      new Starfield(hero, {
        pole: [0.74, 0.12],
        densityArea: 14000,
        maxStars: 160,
        rotSpeed: 0.0000018,
        parallax: 14,
        milkyWay: false,
        shootingStars: false
      });
    }

    var page = document.querySelector('.starry-sky__canvas');
    if (page) {
      var isDark = function () {
        return document.documentElement.getAttribute('data-theme') === 'dark';
      };
      new Starfield(page, {
        pole: [0.78, 0.16],
        densityArea: 12000,
        maxStars: 200,
        rotSpeed: 0.0000012,
        parallax: 8,
        milkyWay: false,
        shootingStars: false,
        isActive: isDark
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
