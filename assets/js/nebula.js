/*
 * Sidebar nebula strip: scroll descent, exposure sequence, meteors and,
 * when WebGL2 is available, a shader that draws the whole mosaic from one
 * texture and lets the gas drift slowly while the stars stay put.
 *
 * The inline script in _includes/nebula-strip.html runs first: it picks the
 * nebula (stored on the element as .nebula), builds the twinkle layer and
 * adds .is-armed (motion allowed) and .has-gl (WebGL2 context available).
 * Without .has-gl the tiles fall back to their own <img> copies and CSS
 * animations.
 */
(function () {
  var nebula = document.querySelector('.nebula');
  if (!nebula || !nebula.classList.contains('is-armed')) return;

  var rail = nebula.parentElement;
  var frame = nebula.querySelector('.nebula-frame');
  var tiles = Array.prototype.slice.call(nebula.querySelectorAll('.nebula-tile'));
  var glowStage = nebula.querySelector('.nebula-glow .nebula-stage');
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
    var i = Math.floor(Math.random() * tiles.length);
    var tile = tiles[i];
    tile.classList.add('is-reexposing');
    if (gl) gl.reexpose[i] = now();
    setTimeout(function () { tile.classList.remove('is-reexposing'); }, 1900);
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
    'uniform vec4 uTileA[8];\n' +     /* x, y, w, h in CSS px */
    'uniform vec4 uTileB[8];\n' +     /* tilt (rad), tone, delay (s), re-exposure start (s) */
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
    'void main() {\n' +
    '  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;\n' +
    /* Same geometry as .nebula-stage in CSS, so the twinkle layer lines up. */
    '  float sw = max(uRes.x, uRes.y * 1.35 / uAr);\n' +
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
    '  float texPerPx = uTexW / sw;\n' +
    '  float baseLod = log2(max(1.0, texPerPx / uDpr));\n' +
    '  vec4 acc = vec4(0.0);\n' +
    '  for (int i = 0; i < 8; i++) {\n' +
    '    vec4 a = uTileA[i];\n' +
    '    vec4 b = uTileB[i];\n' +
    '    vec2 d = p - (a.xy + a.zw * 0.5);\n' +
    '    float cr = cos(b.x), sr = sin(b.x);\n' +
    '    vec2 lp = vec2(cr * d.x + sr * d.y, -sr * d.x + cr * d.y);\n' +
    '    vec2 e = abs(lp) - a.zw * 0.5;\n' +
    '    float cov = clamp(0.5 - max(e.x, e.y) * uDpr, 0.0, 1.0);\n' +
    '    if (cov <= 0.0) continue;\n' +
    /* Exposure: fill top to bottom, overexposed and soft, then settle. */
    '    float pe = uExposedAt < 0.0 ? 0.0 : clamp((t - uExposedAt - b.z) / 1.6, 0.0, 1.0);\n' +
    '    float k = 1.0 - pow(1.0 - pe, 2.2);\n' +
    '    float reveal = clamp(k / 0.45, 0.0, 1.0) * (1.0 + 6.0 / a.w);\n' +
    '    float shown = clamp((reveal - (lp.y + a.w * 0.5) / a.w) * a.w / 3.0, 0.0, 1.0);\n' +
    '    float br, sat, blur;\n' +
    '    if (k < 0.45) { float u = k / 0.45; br = mix(2.6, 1.7, u); sat = mix(0.3, 0.6, u); blur = mix(4.0, 1.5, u); }\n' +
    '    else { float u = (k - 0.45) / 0.55; br = mix(1.7, 1.0, u); sat = mix(0.6, 1.0, u); blur = mix(1.5, 0.0, u); }\n' +
    '    float rk = (t - b.w) / 1.8;\n' +
    '    if (rk >= 0.0 && rk <= 1.0) {\n' +
    '      float bump = rk < 0.18 ? rk / 0.18 : 1.0 - (rk - 0.18) / 0.82;\n' +
    '      br *= 1.0 + 0.9 * bump; sat = mix(sat, 0.55, bump); blur = max(blur, 1.5 * bump);\n' +
    '    }\n' +
    '    vec3 col = textureLod(uTex, suv, max(baseLod, log2(max(1.0, blur * texPerPx)))).rgb * breathe;\n' +
    '    col = clamp(mix(vec3(lum(col)), col, sat) * br * b.y, 0.0, 1.0);\n' +
    '    col = mix(vec3(0.043, 0.071, 0.149), col, shown);\n' +
    '    acc = acc * (1.0 - cov) + vec4(col, 1.0) * cov;\n' +
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
    ['uTex', 'uRes', 'uDpr', 'uTime', 'uAr', 'uTexW', 'uDescent', 'uDrift', 'uTileA', 'uTileB', 'uExposedAt', 'uFlow'].forEach(function (name) {
      u[name] = ctx.getUniformLocation(prog, name);
    });

    var r = {
      ready: false,
      exposedAt: -1,
      reexpose: tiles.map(function () { return -10; }),
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

    var tileA = new Float32Array(32);
    var tileB = new Float32Array(32);
    var W = 0;
    var H = 0;
    var dpr = 1;

    function layout() {
      W = frame.clientWidth;
      H = frame.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.viewport(0, 0, canvas.width, canvas.height);
      tiles.forEach(function (tile, i) {
        var st = tile.style;
        var num = function (name) { return parseFloat(st.getPropertyValue(name)) || 0; };
        tileA[i * 4] = num('--x') * W / 100;
        tileA[i * 4 + 1] = num('--y') * H / 100;
        tileA[i * 4 + 2] = num('--w') * W / 100;
        tileA[i * 4 + 3] = num('--h') * H / 100;
        tileB[i * 4] = num('--r') * Math.PI / 180;
        tileB[i * 4 + 1] = parseFloat(st.getPropertyValue('--tone')) || 1;
        tileB[i * 4 + 2] = num('--d');
      });
      r.start();
    }

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

      for (var i = 0; i < tiles.length; i++) tileB[i * 4 + 3] = r.reexpose[i];
      ctx.uniform1i(u.uTex, 0);
      ctx.uniform2f(u.uRes, W, H);
      ctx.uniform1f(u.uDpr, dpr);
      ctx.uniform1f(u.uTime, t);
      ctx.uniform1f(u.uAr, variant.ar);
      ctx.uniform1f(u.uTexW, texW);
      ctx.uniform1f(u.uDescent, descent);
      ctx.uniform3f(u.uDrift, d[0], d[1], d[2]);
      ctx.uniform4fv(u.uTileA, tileA);
      ctx.uniform4fv(u.uTileB, tileB);
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
    glowStage.style.transform = '';
    onScroll();
  }

  if (nebula.classList.contains('has-gl')) {
    try {
      gl = createRenderer();
    } catch (err) {
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
