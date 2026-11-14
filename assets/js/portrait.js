/*
 * Sidebar portrait: the Starcos painting drawn from three layers (sky,
 * trees and ground, figure) so that the Milky Way gas drifts, the painted
 * stars twinkle, the three meteors streak along their painted paths and
 * the layers shift slightly against each other with the pointer.
 *
 * The static <img> stays underneath: it is what shows without WebGL2, with
 * reduced motion, and until the layers have loaded. Clicking the portrait
 * (or hovering, on devices that hover) shows the photograph.
 */
(function () {
  var root = document.querySelector('[data-portrait]');
  if (!root) return;

  var frame = root.querySelector('.portrait-frame');
  var canvas = root.querySelector('.portrait-gl');

  /* ── Photograph toggle ── */
  frame.addEventListener('click', function () {
    var on = !root.classList.contains('is-flipped');
    root.classList.toggle('is-flipped', on);
    frame.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  if (!canvas || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  if (!gl) return;

  var VERT = '#version 300 es\n' +
    'in vec2 aPos;\n' +
    'void main() { gl_Position = vec4(aPos, 0.0, 1.0); }\n';

  var FRAG = '#version 300 es\n' +
    'precision highp float;\n' +
    'uniform sampler2D uSky;\n' +
    'uniform sampler2D uGround;\n' +
    'uniform sampler2D uFigure;\n' +
    'uniform vec2 uRes;\n' +          /* canvas size, device px */
    'uniform float uTime;\n' +
    'uniform vec2 uPar;\n' +          /* parallax, -1..1 */
    'uniform vec4 uMeteor;\n' +       /* tail xy, head xy, in picture uv */
    'uniform float uMeteorT;\n' +     /* 0..1 along the pass, negative when idle */
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
    '  vec2 uv = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes;\n' +
    '  float ar = uRes.y / uRes.x;\n' +
    '  float t = uTime;\n' +
    '  vec2 suv = uv + uPar * vec2(0.004, 0.002);\n' +
    /* Painted stars are held still while the gas around them drifts. The
       mask comes from coarse mip levels so it fades out wider than twice
       the displacement and never folds the warp. */
    '  float held = smoothstep(0.05, 0.14, lum(textureLod(uSky, suv, 3.0).rgb) - lum(textureLod(uSky, suv, 6.0).rgb));\n' +
    '  float gas = 1.0 - held;\n' +
    '  vec2 np = suv * vec2(3.0, 3.0 * ar);\n' +
    '  vec2 flow = vec2(fbm(np + vec2(t * 0.045, -t * 0.025)), fbm(np + vec2(13.1, 7.7) + vec2(-t * 0.03, t * 0.04))) - 0.5;\n' +
    '  vec2 fuv = suv + flow * vec2(0.024, 0.024 / ar) * gas;\n' +
    '  vec3 col = texture(uSky, fuv).rgb;\n' +
    /* Only the nebula breathes; the flat night blue stays flat. */
    '  float cloud = smoothstep(0.02, 0.10, lum(textureLod(uSky, fuv, 2.0).rgb) - 0.125);\n' +
    '  col *= 1.0 + 0.22 * (fbm(np * 0.8 + vec2(t * 0.03, t * 0.022)) - 0.5) * cloud * gas;\n' +
    /* Twinkle: white pixels fade towards the sky behind them, each star on
       its own phase. */
    '  float white = smoothstep(0.30, 0.55, min(col.r, min(col.g, col.b)));\n' +
    '  float ph = 16.0 * noise(suv * vec2(6.0, 6.0 * ar));\n' +
    '  float tw = 0.70 + 0.30 * sin(t * 2.1 + ph) * (0.55 + 0.45 * sin(t * 0.67 + ph * 1.7));\n' +
    '  vec3 behind = textureLod(uSky, fuv, 5.0).rgb;\n' +
    '  col = mix(col, mix(behind, col, tw), white);\n' +
    /* Meteor: a tapering streak that runs from beyond the painted tail to
       beyond the painted head. Distances are in units of picture width. */
    '  if (uMeteorT >= 0.0) {\n' +
    '    vec2 tail = uMeteor.xy * vec2(1.0, ar);\n' +
    '    vec2 head = uMeteor.zw * vec2(1.0, ar);\n' +
    '    vec2 dir = normalize(head - tail);\n' +
    '    float len = length(head - tail);\n' +
    '    vec2 from = tail - dir * len * 0.2;\n' +
    '    vec2 to = head + dir * len * 0.9;\n' +
    '    vec2 at = mix(from, to, uMeteorT);\n' +
    '    vec2 d = suv * vec2(1.0, ar) - at;\n' +
    '    float along = dot(d, -dir);\n' +
    '    float side = abs(d.x * dir.y - d.y * dir.x);\n' +
    '    float k = clamp(along / len, 0.0, 1.0);\n' +
    '    float width = mix(0.0042, 0.0010, k);\n' +
    '    float streak = step(0.0, along) * step(along, len) * (1.0 - smoothstep(width * 0.35, width, side)) * pow(1.0 - k, 1.5);\n' +
    '    float glow = exp(-dot(d, d) / (2.0 * 0.0055 * 0.0055));\n' +
    '    float fade = smoothstep(0.0, 0.12, uMeteorT) * (1.0 - smoothstep(0.62, 1.0, uMeteorT));\n' +
    '    vec3 tint = mix(vec3(1.0, 0.70, 0.36), vec3(1.0, 0.97, 0.90), pow(1.0 - k, 2.0));\n' +
    '    col += (streak * tint + glow * vec3(1.0, 0.95, 0.85) * 0.9) * fade;\n' +
    '  }\n' +
    '  vec4 ground = texture(uGround, uv + uPar * vec2(0.010, 0.004));\n' +
    '  col = ground.rgb + col * (1.0 - ground.a);\n' +
    '  vec4 figure = texture(uFigure, uv + uPar * vec2(0.019, 0.007));\n' +
    '  col = figure.rgb + col * (1.0 - figure.a);\n' +
    '  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n' +
    '}\n';

  /* Painted meteors, tail then head, in pixels of the 1122 x 1402 painting. */
  var METEORS = [
    [544, 94, 222, 228],
    [1066, 284, 898, 357],
    [1028, 533, 925, 579]
  ].map(function (m) { return [m[0] / 1122, m[1] / 1402, m[2] / 1122, m[3] / 1402]; });

  function compile(type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }

  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  var u = {};
  ['uSky', 'uGround', 'uFigure', 'uRes', 'uTime', 'uPar', 'uMeteor', 'uMeteorT'].forEach(function (name) {
    u[name] = gl.getUniformLocation(prog, name);
  });

  /* ── Layers ── */
  var layers = [
    { src: canvas.dataset.sky, alpha: false },
    { src: canvas.dataset.ground, alpha: true },
    { src: canvas.dataset.figure, alpha: true }
  ];
  var pending = layers.length;
  var ready = false;
  var lost = false;

  layers.forEach(function (layer, unit) {
    var img = new Image();
    img.decoding = 'async';
    img.onload = function () {
      if (lost) return;
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, layer.alpha);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      if (--pending === 0) {
        ready = true;
        nextMeteorAt = now() + 1.4;
        start();
      }
    };
    img.src = layer.src;
  });

  /* ── Size ── */
  function layout() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    start();
  }

  /* ── Parallax ── */
  var t0 = performance.now();
  function now() { return (performance.now() - t0) / 1000; }

  var pointer = [0, 0];
  var pointerAt = -100;
  var par = [0, 0];
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    pointer[0] = (e.clientX / window.innerWidth) * 2 - 1;
    pointer[1] = (e.clientY / window.innerHeight) * 2 - 1;
    pointerAt = now();
  }, { passive: true });

  /* ── Meteors ── */
  var meteor = -1;
  var meteorStart = 0;
  var nextMeteorAt = Infinity;
  var METEOR_SECONDS = 1.15;

  /* ── Draw loop ── */
  var visible = false;
  var raf = null;
  var lastDraw = 0;

  function draw(ms) {
    raf = null;
    if (!visible || !ready || lost) return;
    raf = requestAnimationFrame(draw);
    if (ms - lastDraw < 30) return;
    lastDraw = ms;

    var t = now();

    /* Follow the pointer; with no pointer around, sway slowly instead. */
    var tx = pointer[0];
    var ty = pointer[1];
    if (t - pointerAt > 4) {
      tx = Math.sin(t * 0.23) * 0.4;
      ty = Math.cos(t * 0.17) * 0.25;
    }
    par[0] += (tx - par[0]) * 0.06;
    par[1] += (ty - par[1]) * 0.06;

    if (meteor < 0 && t >= nextMeteorAt) {
      meteor = Math.floor(Math.random() * METEORS.length);
      meteorStart = t;
    }
    var mt = -1;
    if (meteor >= 0) {
      mt = (t - meteorStart) / (METEOR_SECONDS * (0.8 + 0.5 * (METEORS[meteor][0] - METEORS[meteor][2]) / 0.29));
      if (mt >= 1) {
        mt = -1;
        meteor = -1;
        nextMeteorAt = t + 3.5 + Math.random() * 5.5;
      }
    }

    gl.uniform1i(u.uSky, 0);
    gl.uniform1i(u.uGround, 1);
    gl.uniform1i(u.uFigure, 2);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, t);
    gl.uniform2f(u.uPar, par[0], par[1]);
    var m = METEORS[meteor >= 0 ? meteor : 0];
    gl.uniform4f(u.uMeteor, m[0], m[1], m[2], m[3]);
    gl.uniform1f(u.uMeteorT, mt);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    root.classList.add('has-gl');
  }

  function start() {
    if (!raf && visible && ready && !lost) raf = requestAnimationFrame(draw);
  }

  canvas.addEventListener('webglcontextlost', function () {
    lost = true;
    root.classList.remove('has-gl');
  });

  new ResizeObserver(layout).observe(canvas);
  new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      visible = entry.isIntersecting;
      start();
    });
  }).observe(canvas);
  layout();
})();
