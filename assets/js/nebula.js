/*
 * Sidebar nebula strip: scroll descent, exposure sequence, meteors and,
 * when WebGL2 is available, a shader that draws the strip the way JWST's
 * near-infrared camera builds a mosaic.
 *
 * NIRCam exposes two modules side by side, each a 2 x 2 block of square
 * detectors with narrow gaps between them and a wider gap between the
 * modules. The shader lays the strip out as a column of such pointings
 * (four detectors across, two rows each), every pointing slightly shifted
 * and tilted, with a few detectors missing along the outline. Detectors
 * are exposed one after another: a grainy monochrome frame first, then
 * colour as further filters come in. Once all are in, a dither closes the
 * gaps and the pointings merge into one picture with a ragged outline; no
 * seams stay inside it. A second, offset set of pointings lies underneath
 * and shows only where it sticks out past the first: a dimmer, grainier
 * fringe, like the shallow coverage at the border of a real mosaic. The
 * gas drifts slowly while the stars stay put.
 *
 * The inline script in _includes/nebula-strip.html runs first: it picks the
 * nebula (stored on the element as .nebula), builds the twinkle layer and
 * adds .is-armed (motion allowed) and .has-gl (WebGL2 context available).
 * Without .has-gl the eight tile elements fall back to their own <img>
 * copies and CSS animations.
 */
(function () {
  var nebula = document.querySelector('.nebula');
  if (!nebula || !nebula.classList.contains('is-armed')) return;

  var rail = nebula.parentElement;
  var frame = nebula.querySelector('.nebula-frame');
  var tiles = Array.prototype.slice.call(nebula.querySelectorAll('.nebula-tile'));
  var glow = nebula.querySelector('.nebula-glow');
  var glowStage = glow.querySelector('.nebula-stage');
  var meteor = nebula.querySelector('.meteor');
  var variant = nebula.nebula;

  var visible = false;
  var descent = 0;
  var target = 0;
  var reexposeTimer = null;
  var meteorTimer = null;
  var gl = null;
  var t0 = performance.now();

  function now() { return (performance.now() - t0) / 1000; }
  function clamp01(v) { return Math.min(1, Math.max(0, v)); }

  /* ── Scroll descent ── */
  function scrollProgress() {
    var travel = rail.offsetHeight - nebula.offsetHeight;
    if (travel > 1) {
      return clamp01((nebula.getBoundingClientRect().top - rail.getBoundingClientRect().top) / travel);
    }
    var max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? clamp01(window.scrollY / max) : 0;
  }

  var descentFrame = null;
  function stepDescent() {
    descent += (target - descent) * 0.08;
    if (Math.abs(target - descent) < 0.0005) descent = target;
    nebula.style.setProperty('--descent', descent.toFixed(4));
    descentFrame = descent === target || gl ? null : requestAnimationFrame(stepDescent);
  }

  function onScroll() {
    target = scrollProgress();
    if (gl) return;
    if (!descentFrame) descentFrame = requestAnimationFrame(stepDescent);
  }

  /* ── Occasional events ── */
  function reexpose() {
    if (gl) {
      gl.reexposePointing();
    } else {
      var tile = tiles[Math.floor(Math.random() * tiles.length)];
      tile.classList.add('is-reexposing');
      setTimeout(function () { tile.classList.remove('is-reexposing'); }, 1900);
    }
    scheduleReexpose();
  }

  function scheduleReexpose() {
    clearTimeout(reexposeTimer);
    reexposeTimer = setTimeout(reexpose, 6000 + Math.random() * 6000);
  }

  function shootMeteor() {
    meteor.style.setProperty('--mx', (55 + Math.random() * 40).toFixed(1) + '%');
    meteor.style.setProperty('--my', (3 + Math.random() * 32).toFixed(1) + '%');
    meteor.style.setProperty('--ma', (132 + Math.random() * 26).toFixed(1) + 'deg');
    meteor.classList.remove('is-falling');
    void meteor.offsetWidth;
    meteor.classList.add('is-falling');
    scheduleMeteor(30000 + Math.random() * 30000);
  }

  function scheduleMeteor(delay) {
    clearTimeout(meteorTimer);
    meteorTimer = setTimeout(shootMeteor, delay);
  }

  /* ── Exposure and visibility ── */
  function expose() {
    if (nebula.classList.contains('is-exposed')) return;
    if (gl && !gl.ready) return;
    nebula.classList.add('is-exposed');
    if (gl) gl.exposedAt = now();
    scheduleMeteor(8000 + Math.random() * 7000);
  }

  function setVisible(on) {
    visible = on;
    nebula.classList.toggle('is-paused', !on);
    if (on) {
      var wasExposed = nebula.classList.contains('is-exposed');
      expose();
      scheduleReexpose();
      if (wasExposed) scheduleMeteor(15000 + Math.random() * 30000);
      if (gl) gl.start();
    } else {
      clearTimeout(reexposeTimer);
      clearTimeout(meteorTimer);
    }
  }

  /* ── WebGL renderer ── */
  var VERT = '#version 300 es\n' +
    'in vec2 aPos;\n' +
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }\n';

  var MAX_POINTINGS = 16;
  var STEP = 0.055;        /* seconds between one detector and the next */
  var EXPOSURE = 1.5;      /* seconds one detector takes to come in */

  var FRAG = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uTex;\n' +
    'uniform vec2 uRes;\n' +          /* frame size, CSS px */
    'uniform float uDpr;\n' +
    'uniform float uTime;\n' +
    'uniform float uAr;\n' +          /* image height / width */
    'uniform float uTexW;\n' +
    'uniform float uDescent;\n' +
    'uniform vec3 uDrift;\n' +        /* scale, translate x, y (fraction of stage) */
    'uniform int uCount;\n' +         /* pointings in use */
    'uniform vec3 uCell;\n' +         /* detector size, gap between detectors, gap between modules (CSS px) */
    'uniform vec4 uPointA[16];\n' +   /* centre x, top y, tilt (rad), rows (1 or 2) */
    'uniform vec4 uPointB[16];\n' +   /* tone, delay of its first detector (s), re-exposure start (s), missing detectors (bit mask) */
    'uniform vec2 uPointC[16];\n' +   /* seconds after uExposedAt when its gaps start closing, depth (1 deep, 0 shallow) */
    'uniform float uPad;\n' +         /* how far the canvas reaches past the frame on each side, CSS px */
    'uniform float uExposedAt;\n' +
    'uniform float uFlow;\n' +        /* gas displacement, CSS px */
    'out vec4 outColor;\n' +
    'float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
    'float noise(vec2 p) {\n' +
    '  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);\n' +
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);\n' +
    '}\n' +
    'float fbm(vec2 p) {\n' +
    '  float v = 0.0, a = 0.5;\n' +
    '  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }\n' +
    '  return v;\n' +
    '}\n' +
    'float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }\n' +
    'float bump(float x, float at, float width) { float d = (x - at) / width; return exp(-d * d); }\n' +
    'void main() {\n' +
    '  vec2 p = vec2(gl_FragCoord.x / uDpr - uPad, uRes.y - gl_FragCoord.y / uDpr);\n' +
    /* Same geometry as .nebula-stage in CSS, so the twinkle layer lines up. */
    '  float sw = max(uRes.x + 2.0 * uPad, uRes.y * 1.35 / uAr);\n' +
    '  float sh = sw * uAr;\n' +
    '  vec2 s0 = vec2((uRes.x - sw) * 0.5, (uRes.y - sh) * uDescent);\n' +
    '  vec2 o = s0 + vec2(0.5 * sw, 0.42 * sh);\n' +
    '  vec2 q = (p - o) / uDrift.x - vec2(uDrift.y * sw, uDrift.z * sh) + o;\n' +
    '  vec2 uv = (q - s0) / vec2(sw, sh);\n' +
    /* Bright stars are held still. The mask comes from coarse mip levels so
       it fades out over ~16 texels, wider than twice the displacement:
       a steeper edge would fold the warp and draw a star twice. */
    '  float star = smoothstep(0.01, 0.06, lum(textureLod(uTex, uv, 4.0).rgb) - lum(textureLod(uTex, uv, 7.0).rgb));\n' +
    '  float gas = 1.0 - star;\n' +
    '  vec2 np = uv * vec2(2.6, 2.6 * uAr);\n' +
    '  float t = uTime;\n' +
    '  vec2 flow = vec2(fbm(np + vec2(t * 0.035, -t * 0.02)), fbm(np + vec2(13.1, 7.7) + vec2(-t * 0.025, t * 0.03))) - 0.5;\n' +
    '  vec2 suv = uv + flow * 2.0 * uFlow * gas / vec2(sw, sh);\n' +
    '  float breathe = 1.0 + 0.07 * (fbm(np * 0.7 + vec2(t * 0.02, t * 0.015)) - 0.5) * 2.0 * gas;\n' +
    '  float baseLod = log2(max(1.0, uTexW / sw / uDpr));\n' +
    '  vec3 sky = textureLod(uTex, suv, baseLod).rgb * breathe;\n' +
    /* Read noise: one value per device pixel, new every frame. */
    '  float grainAt = hash(floor(p * uDpr) + fract(t * 7.3) * vec2(37.0, 91.0)) - 0.5;\n' +
    /* Grain that stays: the shallow fringe never gets enough exposures to
       lose it. It changes slowly, a few times a second. */
    '  float grainKept = hash(floor(p * uDpr) + floor(t * 3.0) * vec2(17.0, 53.0)) - 0.5;\n' +
    '  float c = uCell.x, g = uCell.y, G = uCell.z;\n' +
    '  float since = uExposedAt < 0.0 ? -1.0 : t - uExposedAt;\n' +
    '  float wp = 4.0 * c + 2.0 * g + G;\n' +
    '  float module = 2.0 * c + g;\n' +
    '  vec4 acc = vec4(0.0);\n' +
    '  for (int i = 0; i < 16; i++) {\n' +
    '    if (i >= uCount) break;\n' +
    '    vec4 a = uPointA[i];\n' +
    '    vec4 b = uPointB[i];\n' +
    '    float depth = uPointC[i].y;\n' +
    '    float hp = a.w * c + (a.w - 1.0) * g;\n' +
    '    vec2 d = p - vec2(a.x, a.y + hp * 0.5);\n' +
    '    float cr = cos(a.z), sr = sin(a.z);\n' +
    '    vec2 l = vec2(cr * d.x + sr * d.y, -sr * d.x + cr * d.y) + vec2(wp, hp) * 0.5;\n' +
    '    if (l.x < -G || l.x > wp + G || l.y < -g || l.y > hp + g) continue;\n' +
    /* The dither: each detector grows into half of every gap around it.
       After that the pointing merges into the mosaic: detectors overlap
       their neighbours by a few pixels, so the small shifts and tilts
       between pointings leave no cracks, and seams and tone differences
       fade out. While a pointing is being taken again it comes apart
       into its detectors for a moment. */
    '    float after = since < 0.0 ? -1.0 : since - uPointC[i].x;\n' +
    '    float grow = 0.5 * smoothstep(0.0, 0.9, after);\n' +
    '    float ra = (t - b.z) / 2.1;\n' +
    '    float apart = (ra >= 0.0 && ra <= 1.0) ? smoothstep(0.0, 0.1, ra) * (1.0 - smoothstep(0.8, 1.0, ra)) : 0.0;\n' +
    '    float merged = smoothstep(0.7, 2.1, after) * (1.0 - apart);\n' +
    '    float over = 4.0 * merged;\n' +
    /* Which detector: module (left or right), column inside it, row. */
    '    float m = step(module + G * 0.5, l.x);\n' +
    '    float lx = l.x - m * (module + G);\n' +
    '    float col = clamp(floor((lx + g * 0.5) / (c + g)), 0.0, 1.0);\n' +
    '    float row = clamp(floor((l.y + g * 0.5) / (c + g)), 0.0, a.w - 1.0);\n' +
    '    float inx = lx - col * (c + g);\n' +
    '    float iny = l.y - row * (c + g);\n' +
    '    float gapLeft = (m > 0.5 && col < 0.5) ? G : g;\n' +
    '    float gapRight = (m < 0.5 && col > 0.5) ? G : g;\n' +
    '    float edge = over + min(min(inx + gapLeft * grow, c + gapRight * grow - inx), min(iny + g * grow, c + g * grow - iny));\n' +
    '    float cov = clamp(edge * uDpr + 0.5, 0.0, 1.0);\n' +
    '    if (cov <= 0.0) continue;\n' +
    '    float det = row * 4.0 + m * 2.0 + col;\n' +
    '    if (mod(floor(b.w / exp2(det)), 2.0) > 0.5) continue;\n' +
    /* Exposure, detector by detector. The first frame is monochrome and
       grainy; two more filters bring the colour in, each with a short
       flash, and the grain settles. */
    '    float pe = since < 0.0 ? 0.0 : clamp((since - b.y - det * ' + STEP.toFixed(3) + ') / ' + EXPOSURE.toFixed(2) + ', 0.0, 1.0);\n' +
    '    float second = smoothstep(0.30, 0.38, pe);\n' +
    '    float third = smoothstep(0.62, 0.70, pe);\n' +
    '    float sat = 0.5 * second + 0.5 * third;\n' +
    '    float grain = 0.30 * (1.0 - 0.45 * second - 0.40 * third) * (1.0 - smoothstep(0.82, 1.0, pe));\n' +
    '    float br = 1.0 + 0.5 * (1.0 - smoothstep(0.0, 0.28, pe)) + 0.3 * bump(pe, 0.34, 0.04) + 0.3 * bump(pe, 0.66, 0.04);\n' +
    '    float marks = pe > 0.0 ? 1.0 - smoothstep(0.84, 1.0, pe) : 0.0;\n' +
    /* A pointing taken again: its detectors flash, lose colour and grain
       up for a moment, one after another. */
    '    float rk = (t - b.z - det * 0.05) / 1.7;\n' +
    '    if (rk >= 0.0 && rk <= 1.0) {\n' +
    '      float again = rk < 0.15 ? rk / 0.15 : 1.0 - (rk - 0.15) / 0.85;\n' +
    '      br *= 1.0 + 0.7 * again;\n' +
    '      sat = mix(sat, 0.3, again);\n' +
    '      grain = max(grain, 0.2 * again);\n' +
    '      marks = max(marks, smoothstep(0.0, 0.1, rk) * (1.0 - smoothstep(0.75, 1.0, rk)));\n' +
    '    }\n' +
    /* Until it merges, each detector has its own response: a few percent
       lighter or darker. */
    '    float tone = mix(b.x * (1.0 + 0.06 * (hash(vec2(float(i) + 3.0, det + 7.0)) - 0.5)), 1.0, merged);\n' +
    /* Shallow pointings end up dimmer, less saturated and still grainy. */
    '    float dim = mix(0.6, 1.0, depth);\n' +
    '    vec3 rgb = mix(vec3(lum(sky)), sky, sat * mix(0.7, 1.0, depth)) * br * tone * dim + grainAt * grain + grainKept * 0.065 * (1.0 - depth);\n' +
    '    rgb = mix(vec3(0.043, 0.071, 0.149), rgb, smoothstep(0.0, 0.03, pe));\n' +
    /* Detector edges are a touch darker until the pointing merges. */
    '    rgb *= 1.0 - 0.2 * (1.0 - merged) * (1.0 - smoothstep(0.0, 1.5, edge));\n' +
    /* Corner brackets while a detector is being read out. */
    '    float mx = min(inx, c - inx), my = min(iny, c - iny);\n' +
    '    float bracket = max(step(mx, 1.0) * step(my, 6.5), step(my, 1.0) * step(mx, 6.5)) * step(0.0, min(mx, my));\n' +
    '    rgb = mix(rgb, vec3(1.0), 0.8 * bracket * marks);\n' +
    '    rgb = clamp(rgb, 0.0, 1.0);\n' +
    '    acc = acc * (1.0 - cov) + vec4(rgb, 1.0) * cov;\n' +
    '  }\n' +
    '  outColor = acc;\n' +
    '}\n';

  function createRenderer() {
    var canvas = nebula.querySelector('.nebula-gl');
    var ctx = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    if (!ctx) return null;

    function compile(type, src) {
      var sh = ctx.createShader(type);
      ctx.shaderSource(sh, src);
      ctx.compileShader(sh);
      if (!ctx.getShaderParameter(sh, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(sh));
      return sh;
    }

    var prog = ctx.createProgram();
    ctx.attachShader(prog, compile(ctx.VERTEX_SHADER, VERT));
    ctx.attachShader(prog, compile(ctx.FRAGMENT_SHADER, FRAG));
    ctx.linkProgram(prog);
    if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) throw new Error(ctx.getProgramInfoLog(prog));
    ctx.useProgram(prog);

    var buf = ctx.createBuffer();
    ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), ctx.STATIC_DRAW);
    var aPos = ctx.getAttribLocation(prog, 'aPos');
    ctx.enableVertexAttribArray(aPos);
    ctx.vertexAttribPointer(aPos, 2, ctx.FLOAT, false, 0, 0);

    var u = {};
    ['uTex', 'uRes', 'uDpr', 'uTime', 'uAr', 'uTexW', 'uDescent', 'uDrift', 'uCount', 'uCell', 'uPointA', 'uPointB', 'uPointC', 'uPad', 'uExposedAt', 'uFlow'].forEach(function (name) {
      u[name] = ctx.getUniformLocation(prog, name);
    });

    var r = {
      ready: false,
      exposedAt: -1,
      reexposePointing: null,
      start: null
    };

    var texW = 600;
    var tex = ctx.createTexture();
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      ctx.bindTexture(ctx.TEXTURE_2D, tex);
      ctx.pixelStorei(ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx.NONE);
      ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, img);
      ctx.generateMipmap(ctx.TEXTURE_2D);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR_MIPMAP_LINEAR);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
      ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
      texW = img.naturalWidth;
      r.ready = true;
      if (visible) expose();
      r.start();
    };
    img.src = variant.src;

    /* ── Mosaic layout ──
       Fixed for the visit: how far each pointing is shifted and tilted, its
       tone, and which detectors are missing. Bit n of the mask is detector
       n, counted left to right, top row first. */
    var CELL_GAP = 3;
    var MODULE_GAP = 7;
    var MARGIN = 9;
    var PAD = 24;            /* the canvas reaches this far past the frame, left and right */
    var DEEP = MAX_POINTINGS / 2;
    var shifts = [];
    var under = [];          /* the shallow pointings underneath, one per deep one */
    for (var k = 0; k < DEEP; k++) {
      shifts.push({
        x: (Math.random() * 2 - 1) * (MARGIN - 2.5),
        y: (Math.random() * 2 - 1) * 1.2,
        tilt: (Math.random() * 2 - 1) * 0.013,
        tone: 0.975 + Math.random() * 0.05
      });
      /* Pushed 10 to 24px to one side and up to 0.45 of a row up or down,
         tilted more, with two or three of its eight detectors missing. */
      var holes = 0;
      for (var bit = 0; bit < 8; bit++) if (Math.random() < 0.3) holes |= 1 << bit;
      under.push({
        x: (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * (PAD - 10)),
        y: (Math.random() * 2 - 1) * 0.45,
        tilt: (Math.random() * 2 - 1) * 0.034,
        tone: 0.95 + Math.random() * 0.1,
        mask: holes
      });
    }
    /* The outline: for every row, whether its outer detector is missing on
       the left, on the right, or on both sides. About a quarter of the rows
       lose one on each side, never more than two rows running, and rarely
       both sides at once. */
    var notches = [];
    var runLeft = 0;
    var runRight = 0;
    for (var n = 0; n < MAX_POINTINGS * 2; n++) {
      var left = Math.random() < 0.27 && runLeft < 2;
      var right = Math.random() < 0.27 && runRight < 2;
      if (left && right && Math.random() < 0.8) {
        if (Math.random() < 0.5) left = false; else right = false;
      }
      runLeft = left ? runLeft + 1 : 0;
      runRight = right ? runRight + 1 : 0;
      notches.push((left ? 1 : 0) | (right ? 2 : 0));
    }
    var leftFirst = Math.random() < 0.5;

    var pointA = new Float32Array(MAX_POINTINGS * 4);
    var pointB = new Float32Array(MAX_POINTINGS * 4);
    var pointC = new Float32Array(MAX_POINTINGS * 2);
    var count = 0;           /* deep pointings; as many shallow ones come before them */
    var cell = 0;
    var fillAt = 0;
    var W = 0;
    var H = 0;
    var dpr = 1;

    function layout() {
      W = frame.clientWidth;
      H = frame.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round((W + 2 * PAD) * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.viewport(0, 0, canvas.width, canvas.height);

      cell = (W - 2 * MARGIN - 2 * CELL_GAP - MODULE_GAP) / 4;
      var pitch = cell + CELL_GAP;
      var rows = Math.max(1, Math.min(DEEP * 2, Math.floor((H - 4 + CELL_GAP) / pitch)));
      count = Math.ceil(rows / 2);
      fillAt = count * 8 * STEP + EXPOSURE + 0.4;
      var top = (H - (rows * pitch - CELL_GAP)) / 2;
      var wide = 4 * cell + 2 * CELL_GAP + MODULE_GAP;
      var quads = '';

      for (var i = 0; i < count; i++) {
        var own = Math.min(2, rows - i * 2);
        /* Missing detectors, row by row. The first and the last row of the
           strip always lose a corner. */
        var mask = 0;
        for (var rr = 0; rr < own; rr++) {
          var absolute = i * 2 + rr;
          var notch = notches[absolute];
          if (absolute === 0 && !notch) notch = leftFirst ? 1 : 2;
          if (absolute === rows - 1 && !notch) notch = leftFirst ? 2 : 1;
          if (notch & 1) mask |= 1 << (rr * 4);
          if (notch & 2) mask |= 1 << (rr * 4 + 3);
        }

        var sh = shifts[i];
        var cx = W / 2 + sh.x;
        var y = top + i * 2 * pitch + sh.y;
        var high = own * cell + (own - 1) * CELL_GAP;
        /* Deep pointings are drawn after the shallow ones, so on top. */
        var at = count + i;
        pointA.set([cx, y, sh.tilt, own], at * 4);
        pointB[at * 4] = sh.tone;
        pointB[at * 4 + 1] = i * 8 * STEP;
        pointB[at * 4 + 2] = pointB[at * 4 + 2] || -10;
        pointB[at * 4 + 3] = mask;
        pointC[at * 2] = fillAt + i * 0.14;
        pointC[at * 2 + 1] = 1;

        /* Its shallow companion: taken during the dither, kept inside the
           strip top and bottom. */
        var un = under[i];
        var uy = Math.min(Math.max(top + i * 2 * pitch + un.y * pitch, 2), H - (2 * cell + CELL_GAP) - 2);
        var first = fillAt + 0.2 + i * 4 * STEP;
        pointA.set([W / 2 + un.x, uy, un.tilt, 2], i * 4);
        pointB[i * 4] = un.tone;
        pointB[i * 4 + 1] = first;
        pointB[i * 4 + 2] = pointB[i * 4 + 2] || -10;
        pointB[i * 4 + 3] = un.mask;
        pointC[i * 2] = first + 8 * STEP + EXPOSURE + 0.2;
        pointC[i * 2 + 1] = 0;

        /* The same footprint as a clip path for the twinkle layer, so no
           star glows over a missing detector. Each detector is one
           quadrilateral, grown to meet its neighbours. */
        var cos = Math.cos(sh.tilt);
        var sin = Math.sin(sh.tilt);
        var cy = y + high / 2;
        for (var det = 0; det < own * 4; det++) {
          if (mask & (1 << det)) continue;
          var col = det % 4;
          var row = (det - col) / 4;
          var x0 = col * pitch + (col > 1 ? MODULE_GAP - CELL_GAP : 0) - (col === 2 ? MODULE_GAP / 2 : CELL_GAP / 2);
          var x1 = col * pitch + (col > 1 ? MODULE_GAP - CELL_GAP : 0) + cell + (col === 1 ? MODULE_GAP / 2 : CELL_GAP / 2);
          var y0 = row * pitch - CELL_GAP / 2;
          var y1 = row * pitch + cell + CELL_GAP / 2;
          [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(function (pt, n) {
            var lx = pt[0] - wide / 2;
            var ly = pt[1] - high / 2;
            quads += (n ? 'L' : 'M') + (cx + cos * lx - sin * ly).toFixed(1) + ' ' + (cy + sin * lx + cos * ly).toFixed(1);
          });
          quads += 'Z';
        }
      }
      glow.style.clipPath = 'path("' + quads + '")';
      r.start();
    }

    r.reexposePointing = function () {
      if (count) pointB[Math.floor(Math.random() * count * 2) * 4 + 2] = now();
    };

    /* Same 48s back-and-forth drift as the CSS nebula-drift keyframes. */
    function drift(t) {
      var phase = (t % 96) / 48;
      var e = 0.5 - 0.5 * Math.cos(Math.PI * (phase <= 1 ? phase : 2 - phase));
      return [1.05 + 0.05 * e, 0.008 - 0.018 * e, 0.006 - 0.02 * e];
    }

    var raf = null;
    var lastDraw = 0;
    function draw(ms) {
      raf = null;
      if (!visible || ctx.isContextLost()) return;
      raf = requestAnimationFrame(draw);
      if (ms - lastDraw < 30) return;
      lastDraw = ms;

      descent += (target - descent) * 0.12;
      if (Math.abs(target - descent) < 0.0005) descent = target;
      nebula.style.setProperty('--descent', descent.toFixed(4));

      var t = now();
      var d = drift(t);
      glowStage.style.transform = 'scale(' + d[0].toFixed(4) + ') translate3d(' + (d[1] * 100).toFixed(3) + '%,' + (d[2] * 100).toFixed(3) + '%,0)';

      ctx.uniform1i(u.uTex, 0);
      ctx.uniform2f(u.uRes, W, H);
      ctx.uniform1f(u.uDpr, dpr);
      ctx.uniform1f(u.uTime, t);
      ctx.uniform1f(u.uAr, variant.ar);
      ctx.uniform1f(u.uTexW, texW);
      ctx.uniform1f(u.uDescent, descent);
      ctx.uniform3f(u.uDrift, d[0], d[1], d[2]);
      ctx.uniform1i(u.uCount, count * 2);
      ctx.uniform3f(u.uCell, cell, CELL_GAP, MODULE_GAP);
      ctx.uniform4fv(u.uPointA, pointA);
      ctx.uniform4fv(u.uPointB, pointB);
      ctx.uniform2fv(u.uPointC, pointC);
      ctx.uniform1f(u.uPad, PAD);
      ctx.uniform1f(u.uExposedAt, r.exposedAt);
      ctx.uniform1f(u.uFlow, 3.0);
      ctx.clearColor(0, 0, 0, 0);
      ctx.clear(ctx.COLOR_BUFFER_BIT);
      if (r.ready) ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    }

    r.start = function () {
      if (!raf && visible) raf = requestAnimationFrame(draw);
    };

    canvas.addEventListener('webglcontextlost', function () { fallBack(); });
    new ResizeObserver(layout).observe(frame);
    layout();
    return r;
  }

  function fallBack() {
    gl = null;
    nebula.classList.remove('has-gl');
    glow.style.clipPath = '';
    glowStage.style.transform = '';
    onScroll();
  }

  if (nebula.classList.contains('has-gl')) {
    try {
      gl = createRenderer();
    } catch (err) {
      /* A shader that fails to compile ends up here; say why, then use the
         tile fallback. */
      if (window.console) console.warn('Nebula strip: WebGL renderer unavailable.', err);
      gl = null;
    }
    if (!gl) fallBack();
  }

  new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { setVisible(entry.isIntersecting); });
  }, { threshold: 0.1 }).observe(nebula);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  descent = target = scrollProgress();
  nebula.style.setProperty('--descent', descent.toFixed(4));
})();
