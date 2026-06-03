/* Scroll reveal — progressive enhancement.
   Adds a `.reveal` class to content blocks, then toggles `.is-revealed`
   when each enters the viewport (with a gentle stagger). If JS is disabled
   or IntersectionObserver is missing, content stays fully visible because
   the `.reveal` class is only ever applied here. Honors reduced motion. */
(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var selectors = [
      '#bio .bio-body',
      '#education .timeline-entry',
      '#news .news-list__item',
      '#services .info-card',
      '#hobbies .hobbies-content'
    ];

    var targets = [];
    selectors.forEach(function (sel) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) targets.push(nodes[i]);
    });
    if (!targets.length) return;

    // No observer support → leave everything visible.
    if (reduce || !('IntersectionObserver' in window)) return;

    targets.forEach(function (el) { el.classList.add('reveal'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Stagger siblings that appear together for a smoother cascade.
        var delay = (parseInt(el.getAttribute('data-reveal-i'), 10) || 0) * 80;
        setTimeout(function () { el.classList.add('is-revealed'); }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    // Index siblings within each group so the stagger reads top-to-bottom.
    selectors.forEach(function (sel) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute('data-reveal-i', i);
        io.observe(nodes[i]);
      }
    });
  });
})();
