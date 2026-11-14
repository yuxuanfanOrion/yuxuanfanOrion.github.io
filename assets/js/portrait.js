/*
 * Sidebar portrait: a night-sky picture (Milky Way, baobab, a figure
 * looking up) that moves a little. The picture is drawn as it is, and three
 * helper textures let the shader take it apart:
 *
 *   smooth   the picture without stars, meteors or the figure
 *   meteors  the light the two meteors add
 *   mask     r: open sky, g: the figure, b: the figure, widened
 *
 * Star light is the picture minus the smooth copy, so stars can twinkle in
 * place without being bent. The glow of the Milky Way drifts by warping
 * only the smooth copy. Now and then a meteor fades and flies back in along
 * its path, and the figure shifts against the sky with the pointer.
 *
 * The static <img> stays underneath: it is what shows without WebGL2, with
 * reduced motion, and until the textures have loaded. Clicking the portrait
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
    'uniform sampler2D uNight;\n' +
    'uniform sampler2D uSmooth;\n' +
    'uniform sampler2D uMeteors;\n' +
    'uniform sampler2D uMask;\n' +
    'uniform vec2 uRes;\n' +           /* canvas size, device px */
    'uniform float uTime;\n' +
    'uniform vec2 uPar;\n' +           /* parallax, -1..1 */
    'uniform vec4 uMeteorSeg[2];\n' +  /* tail xy, head xy, in picture uv */
    'uniform vec3 uMeteorState[2];\n' +/* distance back along the path (in lengths), opacity, extra glow */
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
    '  vec3 night = texture(uNight, suv, -0.5).rgb;\n' +
    '  vec3 smoothed = texture(uSmooth, suv).rgb;\n' +
    '  vec3 painted = texture(uMeteors, suv, -0.5).rgb;\n' +
    '  vec3 mask = texture(uMask, suv).rgb;\n' +
    '  float open = mask.r;\n' +
    /* The picture without its meteors; they are added back below. */
    '  vec3 col = night - painted;\n' +
    /* Glow: warp the smooth copy and add the difference, so stars and
       silhouettes stay exactly where they are. The bright band also
       breathes a little. */
    '  vec2 np = suv * vec2(3.0, 3.0 * ar);\n' +
    '  vec2 flow = vec2(fbm(np + vec2(t * 0.045, -t * 0.025)), fbm(np + vec2(13.1, 7.7) + vec2(-t * 0.03, t * 0.04))) - 0.5;\n' +
    '  vec3 drifted = texture(uSmooth, suv + flow * vec2(0.03, 0.03 / ar) * open).rgb;\n' +
    '  col += (drifted - smoothed) * open;\n' +
    '  col += smoothed * 0.16 * (fbm(np * 0.8 + vec2(t * 0.03, t * 0.022)) - 0.5) * smoothstep(0.12, 0.4, lum(smoothed)) * open;\n' +
    /* Twinkle: star light is what the picture has over its smooth copy.
       Each neighbourhood of a few pixels runs on its own phase; only stars
       that stand out are affected, so the fine grain stays calm. */
    '  vec3 light = max(night - smoothed - painted, 0.0) * open;\n' +
    '  float seed = noise(suv * vec2(150.0, 150.0 * ar));\n' +
    '  float tw = sin(t * (1.1 + 1.7 * noise(suv * vec2(41.0, 41.0 * ar))) + seed * 40.0);\n' +
    '  tw *= 0.6 + 0.4 * sin(t * 0.43 + seed * 17.0);\n' +
    '  col += light * tw * 0.55 * smoothstep(0.05, 0.22, lum(light));\n' +
    /* Meteors, read from the picture. One that is flying in is read from
       further along its own path, so it slides into its place. */
    '  for (int i = 0; i < 2; i++) {\n' +
    '    vec3 state = uMeteorState[i];\n' +
    '    if (state.y <= 0.0) continue;\n' +
    '    vec2 tail = uMeteorSeg[i].xy * asp;\n' +
    '    vec2 head = uMeteorSeg[i].zw * asp;\n' +
    '    float len = length(head - tail);\n' +
    '    vec2 dir = (head - tail) / len;\n' +
    '    vec2 q = suv * asp + dir * state.x * len;\n' +
    '    vec2 rel = q - tail;\n' +
    '    float along = clamp(dot(rel, dir), -0.2 * len, 1.15 * len);\n' +
    '    float near = 1.0 - smoothstep(0.010, 0.016, length(rel - dir * along));\n' +
    '    if (near > 0.0) col += texture(uMeteors, q / asp, -0.5).rgb * near * state.y * (1.0 + state.z);\n' +
    '  }\n' +
    /* The figure stands in front: where it was photographed the smooth copy
       shows through, and it is drawn again slightly shifted. */
    '  col = mix(col, smoothed, mask.b);\n' +
    '  vec2 fuv = uv + uPar * vec2(0.008, 0.003);\n' +
    '  col = mix(col, texture(uNight, fuv, -0.5).rgb, texture(uMask, fuv).g);\n' +
    '  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);\n' +
    '}\n';

  /* Meteors, tail then head, in pixels of the 1122 x 1402 original. */
  var METEORS = [
    [243, 123, 351, 232],
    [1042, 371, 980, 439]
  ];
  var meteorSeg = new Float32Array(METEORS.length * 4);
  METEORS.forEach(function (m, i) {
    meteorSeg.set([m[0] / 1122, m[1] / 1402, m[2] / 1122, m[3] / 1402], i * 4);
  });
  /* Per meteor: distance back along its path, opacity, extra glow. At rest
     both sit where they are in the picture. */
  var meteorState = new Float32Array([0, 1, 0, 0, 1, 0]);

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
  ['uNight', 'uSmooth', 'uMeteors', 'uMask', 'uRes', 'uTime', 'uPar', 'uMeteorSeg', 'uMeteorState'].forEach(function (name) {
    u[name] = gl.getUniformLocation(prog, name);
  });

  /* ── Layers ── */
  var layers = [
    { src: canvas.dataset.night },
    { src: canvas.dataset.smooth },
    { src: canvas.dataset.meteors },
    { src: canvas.dataset.mask }
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
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
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
     One meteor at a time fades out where it is in the picture, the sky
     stays empty for a moment, then it flies back in along its path and
     stops in its place. */
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

    gl.uniform1i(u.uNight, 0);
    gl.uniform1i(u.uSmooth, 1);
    gl.uniform1i(u.uMeteors, 2);
    gl.uniform1i(u.uMask, 3);
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
