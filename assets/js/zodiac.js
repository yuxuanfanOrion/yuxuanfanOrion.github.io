/* Zodiac constellations — twelve subtle star-patterns drawn on a canvas
   behind the light-mode page content.  Hidden in dark mode.  Static (no
   animation) to keep CPU cost at zero after the initial paint.  Fades
   vertically so the top is most visible and the bottom is barely there. */
(function () {
  'use strict';

  /* -- constellation data: stars [x,y] normalised to [0,1], lines [i,j],
        bright[] = indices of the brightest star(s) -------------------- */
  var Z = [
    /* Aries       */ { s:[[.80,.30],[.55,.15],[.30,.22],[.12,.48]], b:[0], l:[[0,1],[1,2],[2,3]] },
    /* Taurus      */ { s:[[.10,.18],[.30,.40],[.50,.55],[.70,.40],[.90,.18]], b:[2], l:[[0,1],[1,2],[2,3],[3,4]] },
    /* Gemini      */ { s:[[.25,.08],[.20,.38],[.22,.72],[.72,.12],[.66,.42],[.63,.76]], b:[0,3], l:[[0,1],[1,2],[3,4],[4,5],[1,4]] },
    /* Cancer      */ { s:[[.20,.18],[.45,.45],[.80,.15],[.50,.82]], b:[1], l:[[0,1],[1,2],[1,3]] },
    /* Leo         */ { s:[[.10,.55],[.15,.28],[.30,.14],[.50,.20],[.60,.40],[.85,.35],[.82,.66],[.56,.72]], b:[0,5], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,4]] },
    /* Virgo       */ { s:[[.15,.18],[.35,.38],[.50,.55],[.70,.76],[.85,.20],[.65,.38],[.28,.76]], b:[3], l:[[0,1],[1,2],[2,3],[4,5],[5,1],[2,6]] },
    /* Libra       */ { s:[[.50,.10],[.18,.45],[.82,.45],[.32,.82],[.68,.82]], b:[0], l:[[0,1],[0,2],[1,3],[2,4],[3,4]] },
    /* Scorpius    */ { s:[[.08,.14],[.14,.30],[.20,.46],[.32,.56],[.46,.60],[.60,.66],[.73,.76],[.86,.66],[.80,.50]], b:[0], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8]] },
    /* Sagittarius */ { s:[[.25,.25],[.50,.14],[.75,.25],[.80,.55],[.60,.72],[.35,.72],[.20,.55]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0],[1,5]] },
    /* Capricornus */ { s:[[.20,.25],[.50,.10],[.80,.28],[.72,.60],[.40,.80],[.15,.58]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]] },
    /* Aquarius    */ { s:[[.22,.10],[.50,.22],[.35,.42],[.55,.52],[.40,.72],[.60,.82],[.80,.35]], b:[1], l:[[0,1],[1,2],[2,3],[3,4],[4,5],[1,6]] },
    /* Pisces      */ { s:[[.12,.30],[.22,.14],[.32,.30],[.22,.44],[.45,.52],[.72,.55],[.62,.72],[.82,.72],[.72,.86]], b:[1,7], l:[[0,1],[1,2],[2,3],[3,0],[3,4],[4,5],[5,6],[6,8],[8,7],[7,5]] }
  ];

  var ACCENT = '90,115,200';
  var GOLD   = '184,134,11';
  var GEMINI_IDX = 2;

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  /* deterministic jitter so the layout is stable across redraws */
  var _seed = 137;
  function srand() { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; }

  function draw(canvas, ctx, content) {
    if (isDark()) { canvas.style.display = 'none'; return; }
    canvas.style.display = '';

    var w = content.offsetWidth;
    var h = content.scrollHeight || content.offsetHeight;
    if (!w || !h) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var cols = 4, rows = 3;
    var cellW = w / cols;
    var cellH = Math.max(h / rows, 280);
    var baseSize = Math.max(90, Math.min(cellW, cellH) * 0.55);
    baseSize = Math.min(baseSize, 200);

    _seed = 137;

    for (var i = 0; i < Z.length; i++) {
      var z  = Z[i];
      var isGemini = (i === GEMINI_IDX);
      var col = i % cols, row = Math.floor(i / cols);
      var cx = cellW * (col + 0.5) + (srand() - 0.5) * cellW * 0.32;
      var cy = cellH * (row + 0.5) + (srand() - 0.5) * cellH * 0.22 + 40;
      var rot = (srand() - 0.5) * 0.35;
      var vFade = Math.max(0.30, 1 - (cy / h) * 0.55);
      var size = isGemini ? baseSize * 1.45 : baseSize;
      var rgb = isGemini ? GOLD : ACCENT;
      var boost = isGemini ? 2.5 : 1;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      /* lines */
      ctx.strokeStyle = 'rgba(' + rgb + ',' + (0.25 * boost * vFade).toFixed(4) + ')';
      ctx.lineWidth = isGemini ? 2.0 : 1.3;
      ctx.lineCap = 'round';
      for (var li = 0; li < z.l.length; li++) {
        var a = z.s[z.l[li][0]], b = z.s[z.l[li][1]];
        ctx.beginPath();
        ctx.moveTo((a[0] - 0.5) * size, (a[1] - 0.5) * size);
        ctx.lineTo((b[0] - 0.5) * size, (b[1] - 0.5) * size);
        ctx.stroke();
      }

      /* stars */
      for (var si = 0; si < z.s.length; si++) {
        var st = z.s[si];
        var x = (st[0] - 0.5) * size, y = (st[1] - 0.5) * size;
        var bright = z.b && z.b.indexOf(si) !== -1;
        var r = bright ? (isGemini ? 5.0 : 3.5) : (isGemini ? 2.8 : 2.0);
        var al = (bright ? 0.45 : 0.30) * boost * vFade;

        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + rgb + ',' + al.toFixed(4) + ')';
        ctx.fill();

        if (bright) {
          var glowR = isGemini ? r * 6 : r * 4;
          var g = ctx.createRadialGradient(x, y, 0, x, y, glowR);
          g.addColorStop(0, 'rgba(' + rgb + ',' + (0.20 * boost * vFade).toFixed(4) + ')');
          g.addColorStop(1, 'rgba(' + rgb + ',0)');
          ctx.beginPath();
          ctx.arc(x, y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = g;
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function init() {
    var content = document.querySelector('.page-content');
    if (!content) return;

    var canvas = document.createElement('canvas');
    canvas.className = 'zodiac-bg';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none;';
    content.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var paint = function () { draw(canvas, ctx, content); };

    paint();

    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(paint, 200); });
    new MutationObserver(function () { setTimeout(paint, 60); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () { clearTimeout(rT); rT = setTimeout(paint, 150); }).observe(content);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
