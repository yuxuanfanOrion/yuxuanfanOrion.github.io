/*
 * Sidebar portrait: the Starcos painting drawn from five layers that
 * recompose to the original (gas, stars, meteors, trees and ground,
 * figure). Only the gas is warped, so it drifts while every star keeps its
 * painted shape; stars twinkle by brightness on their own phase; now and
 * then one of the three meteors fades and flies back in along its path;
 * and the layers shift slightly against each other with the pointer.
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
    'uniform sampler2D uSky;\n' +      /* gas only: no stars, no meteors */
    'uniform sampler2D uStars;\n' +    /* r: coverage, g: phase of the nearest star */
    'uniform sampler2D uMeteors;\n' +  /* light the meteors add to the gas */
    'uniform sampler2D uGround;\n' +
    'uniform sampler2D uFigure;\n' +
    'uniform vec2 uRes;\n' +           /* canvas size, device px */
    'uniform float uTime;\n' +
    'uniform vec2 uPar;\n' +           /* parallax, -1..1 */
    'uniform vec4 uMeteorSeg[3];\n' +  /* tail xy, head xy, in picture uv */
    'uniform vec3 uMeteorState[3];\n' +/* distance back along the path (in lengths), opacity, extra glow */
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
    '  vec2 asp = vec2(1.0, ar);\n' +
    '  float t = uTime;\n' +
    '  vec2 suv = uv + uPar * vec2(0.004, 0.002);\n' +
    /* Gas: a slow warp, and the clouds (not the flat blue) breathe a little. */
    '  vec2 np = suv * vec2(3.0, 3.0 * ar);\n' +
    '  vec2 flow = vec2(fbm(np + vec2(t * 0.045, -t * 0.025)), fbm(np + vec2(13.1, 7.7) + vec2(-t * 0.03, t * 0.04))) - 0.5;\n' +
    '  vec2 fuv = suv + flow * vec2(0.018, 0.018 / ar);\n' +
    '  vec3 col = texture(uSky, fuv, -0.6).rgb;\n' +
    '  float cloud = smoothstep(0.02, 0.10, lum(textureLod(uSky, fuv, 2.0).rgb) - 0.125);\n' +
    '  col *= 1.0 + 0.14 * (fbm(np * 0.8 + vec2(t * 0.03, t * 0.022)) - 0.5) * cloud;\n' +
    /* Meteors, read from the painting. One that is flying in is read from
       further along its own path, so it slides into its painted place. */
    '  for (int i = 0; i < 3; i++) {\n' +
    '    vec3 state = uMeteorState[i];\n' +
    '    if (state.y <= 0.0) continue;\n' +
    '    vec2 tail = uMeteorSeg[i].xy * asp;\n' +
    '    vec2 head = uMeteorSeg[i].zw * asp;\n' +
    '    float len = length(head - tail);\n' +
    '    vec2 dir = (head - tail) / len;\n' +
    '    vec2 q = suv * asp + dir * state.x * len;\n' +
    '    vec2 rel = q - tail;\n' +
    '    float along = clamp(dot(rel, dir), -0.15 * len, 1.1 * len);\n' +
    '    float near = 1.0 - smoothstep(0.014, 0.020, length(rel - dir * along));\n' +
    '    if (near > 0.0) col += texture(uMeteors, q / asp, -0.6).rgb * near * state.y * (1.0 + state.z);\n' +
    '  }\n' +
    /* Stars keep their painted discs; only their brightness moves, with a
       faint halo at the bright end. The phase is the same over each star. */
    '  vec4 star = texture(uStars, suv, -0.6);\n' +
    '  float seed = star.g;\n' +
    '  float tw = 0.5 + 0.5 * sin(t * (0.9 + seed * 1.8) + seed * 50.0);\n' +
    '  tw *= 0.65 + 0.35 * sin(t * 0.41 + seed * 91.0);\n' +
    '  col = mix(col, vec3(1.0), star.r * mix(0.80, 1.0, tw));\n' +
    '  col += vec3(0.72, 0.84, 1.0) * textureLod(uStars, suv, 3.5).r * 0.5 * tw;\n' +
    '  vec4 ground = texture(uGround, uv + uPar * vec2(0.010, 0.004), -0.6);\n' +
    '  col = ground.rgb + col * (1.0 - ground.a);\n' +
    '  vec4 figure = texture(uFigure, uv + uPar * vec2(0.019, 0.007), -0.6);\n' +
    '  col = figure.rgb + col * (1.0 - figure.a);\n' +
    '  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n' +
    '}\n';

  /* Painted meteors, tail then head, in pixels of the 1122 x 1402 painting. */
  var METEORS = [
    [544, 94, 222, 228],
    [1066, 284, 898, 357],
    [1028, 533, 925, 579]
  ];
  var meteorSeg = new Float32Array(12);
  METEORS.forEach(function (m, i) {
    meteorSeg.set([m[0] / 1122, m[1] / 1402, m[2] / 1122, m[3] / 1402], i * 4);
  });
  /* Per meteor: distance back along its path, opacity, extra glow. At rest
     all three sit where they were painted. */
  var meteorState = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]);

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
  ['uSky', 'uStars', 'uMeteors', 'uGround', 'uFigure', 'uRes', 'uTime', 'uPar', 'uMeteorSeg', 'uMeteorState'].forEach(function (name) {
    u[name] = gl.getUniformLocation(prog, name);
  });

  /* ── Layers ── */
  var layers = [
    { src: canvas.dataset.sky, alpha: false },
    { src: canvas.dataset.stars, alpha: false },
    { src: canvas.dataset.meteors, alpha: false },
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
        nextReplayAt = now() + 2.5;
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

  /* ── Meteor replay ──
     One meteor at a time fades out where it was painted, the sky stays
     empty for a moment, then it flies back in along its path and stops in
     its painted place. */
  var replay = -1;
  var replayStart = 0;
  var nextReplayAt = Infinity;
  var FADE = 0.6;
  var GAP = 0.7;
  var FLY = 0.9;

  function stepReplay(t) {
    if (replay < 0) {
      if (t < nextReplayAt) return;
      replay = Math.floor(Math.random() * METEORS.length);
      replayStart = t;
    }
    var e = t - replayStart;
    var back = 0;
    var opacity = 1;
    var glow = 0;
    if (e < FADE) {
      opacity = 1 - e / FADE;
    } else if (e < FADE + GAP) {
      opacity = 0;
    } else if (e < FADE + GAP + FLY) {
      var p = (e - FADE - GAP) / FLY;
      back = 1.9 * Math.pow(1 - p, 3);
      opacity = Math.min(1, p / 0.3);
      glow = 0.7 * (1 - p);
    } else {
      meteorState.set([0, 1, 0], replay * 3);
      replay = -1;
      nextReplayAt = t + 4 + Math.random() * 5;
      return;
    }
    meteorState.set([back, opacity, glow], replay * 3);
  }

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

    stepReplay(t);

    gl.uniform1i(u.uSky, 0);
    gl.uniform1i(u.uStars, 1);
    gl.uniform1i(u.uMeteors, 2);
    gl.uniform1i(u.uGround, 3);
    gl.uniform1i(u.uFigure, 4);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, t);
    gl.uniform2f(u.uPar, par[0], par[1]);
    gl.uniform4fv(u.uMeteorSeg, meteorSeg);
    gl.uniform3fv(u.uMeteorState, meteorState);
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
