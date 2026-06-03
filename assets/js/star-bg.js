/* Hero background rotation — progressive + motion-safe.
   Previously this eagerly preloaded all 20 JPGs (~15 MB) on load and rotated
   every 2.5s. Now it loads only the first image up front, lazily fetches each
   next image just before it is shown, rotates at a calmer 7s, and stays fully
   static when the visitor prefers reduced motion. */
$(document).ready(function () {
  var TOTAL = 20;
  var INTERVAL = 7000;

  function pathFor(i) {
    var num = i < 10 ? '0' + i : '' + i;
    return '/images/stars-bg/star-' + num + '.jpg';
  }
  function nextIndex(i) { return (i % TOTAL) + 1; } // 1..20, wrapping

  var layer1 = document.getElementById('bg-layer-1');
  var layer2 = document.getElementById('bg-layer-2');
  if (!layer1 || !layer2) return;

  // First frame (CSS already sets star-01 on #bg-layer-1; keep in sync).
  var currentIndex = 1;
  layer1.style.backgroundImage = 'url(' + pathFor(currentIndex) + ')';
  layer1.style.opacity = '1';
  layer2.style.opacity = '0';
  var activeLayer = 1;

  // Honor reduced-motion: show a single static image, never rotate.
  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  function preload(i, cb) {
    var img = new Image();
    if (cb) img.onload = cb;
    img.src = pathFor(i);
  }

  // Warm the next frame ahead of the first transition.
  preload(nextIndex(currentIndex));

  setInterval(function () {
    var ni = nextIndex(currentIndex);
    preload(ni, function () {
      var url = 'url(' + pathFor(ni) + ')';
      if (activeLayer === 1) {
        layer2.style.backgroundImage = url;
        layer2.style.opacity = '1';
        layer1.style.opacity = '0';
        activeLayer = 2;
      } else {
        layer1.style.backgroundImage = url;
        layer1.style.opacity = '1';
        layer2.style.opacity = '0';
        activeLayer = 1;
      }
      currentIndex = ni;
      preload(nextIndex(currentIndex)); // warm the following frame
    });
  }, INTERVAL);
});
