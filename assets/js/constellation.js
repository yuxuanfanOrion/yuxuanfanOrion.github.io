/* Constellation conference badges.
   Reads paper data injected as JSON in #constellation-data and renders one
   glowing, clickable star per paper along a gentle top arc, connected by a
   faint constellation line. Hover/focus shows a tooltip; click opens the paper.
   No dependencies. */
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var host = document.getElementById('constellation');
    var dataEl = document.getElementById('constellation-data');
    if (!host || !dataEl) return;

    var papers;
    try {
      papers = JSON.parse(dataEl.textContent.trim());
    } catch (e) {
      return;
    }
    papers = (papers || []).filter(function (p) { return p && p.title; });
    if (!papers.length) return;

    var n = papers.length;

    // ---- positions: even x across an arch, higher in the middle ----
    function positionFor(i) {
      var t = n === 1 ? 0.5 : i / (n - 1);      // 0..1
      var x = 10 + t * 80;                       // 10% .. 90%
      var y = 20 - 11 * Math.sin(t * Math.PI);   // arch: 20% ends, ~9% middle
      return { x: x, y: y };
    }

    var pts = papers.map(function (_, i) { return positionFor(i); });

    // ---- connecting line (SVG, non-scaling stroke) ----
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'constellation__svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    if (n > 1) {
      var poly = document.createElementNS(svgNS, 'polyline');
      poly.setAttribute('class', 'constellation__line');
      poly.setAttribute('vector-effect', 'non-scaling-stroke');
      poly.setAttribute('points', pts.map(function (p) { return p.x + ',' + p.y; }).join(' '));
      svg.appendChild(poly);
    }
    host.appendChild(svg);

    // ---- shared tooltip ----
    var tip = document.createElement('div');
    tip.className = 'constellation__tip';
    tip.id = 'constellation-tip';
    tip.setAttribute('role', 'tooltip');
    host.appendChild(tip);

    function showTip(paper, p) {
      var badge = paper.highlight
        ? '<span class="constellation__tip-badge">Highlight</span>'
        : '';
      tip.innerHTML =
        '<span class="constellation__tip-title">' + escapeHtml(paper.title) + '</span>' +
        '<span class="constellation__tip-venue">' + escapeHtml(paper.venue || '') + '</span>' +
        badge;
      // place below the star, clamped horizontally inside the hero
      var w = host.clientWidth;
      var leftPx = (p.x / 100) * w;
      leftPx = Math.max(150, Math.min(w - 150, leftPx));
      tip.style.left = leftPx + 'px';
      tip.style.top = 'calc(' + p.y + '% + 16px)';
      tip.style.transform = 'translate(-50%, 0)';
      tip.classList.add('is-visible');
    }
    function hideTip() {
      tip.classList.remove('is-visible');
    }

    // ---- stars ----
    papers.forEach(function (paper, i) {
      var p = pts[i];
      var star = document.createElement(paper.url ? 'a' : 'button');
      star.className = 'constellation__star' + (paper.highlight ? ' constellation__star--highlight' : '');
      star.style.left = p.x + '%';
      star.style.top = p.y + '%';
      star.style.animationDelay = (0.25 + i * 0.12) + 's';
      var label = paper.title + (paper.venue ? ' — ' + paper.venue : '');
      star.setAttribute('aria-label', label);
      star.setAttribute('aria-describedby', 'constellation-tip');
      star.setAttribute('title', '');             // suppress native tooltip
      if (paper.url) {
        star.setAttribute('href', paper.url);
        star.setAttribute('target', '_blank');
        star.setAttribute('rel', 'noopener noreferrer');
      } else {
        star.setAttribute('type', 'button');
      }
      star.addEventListener('mouseenter', function () { showTip(paper, p); });
      star.addEventListener('mouseleave', hideTip);
      star.addEventListener('focus', function () { showTip(paper, p); });
      star.addEventListener('blur', hideTip);
      host.appendChild(star);
    });

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
  });
})();
