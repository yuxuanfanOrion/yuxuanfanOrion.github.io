$(document).ready(function() {
  var starImages = [
    '/images/stars-bg/star-01.jpg',
    '/images/stars-bg/star-02.jpg',
    '/images/stars-bg/star-03.jpg',
    '/images/stars-bg/star-04.jpg',
    '/images/stars-bg/star-05.jpg',
    '/images/stars-bg/star-06.jpg',
    '/images/stars-bg/star-07.jpg',
    '/images/stars-bg/star-08.jpg',
    '/images/stars-bg/star-09.jpg',
    '/images/stars-bg/star-10.jpg',
    '/images/stars-bg/star-11.jpg',
    '/images/stars-bg/star-12.jpg',
    '/images/stars-bg/star-13.jpg',
    '/images/stars-bg/star-14.jpg',
    '/images/stars-bg/star-15.jpg',
    '/images/stars-bg/star-16.jpg',
    '/images/stars-bg/star-17.jpg',
    '/images/stars-bg/star-18.jpg',
    '/images/stars-bg/star-19.jpg',
    '/images/stars-bg/star-20.jpg'
  ];

  var currentIndex = 0;
  var layer1 = document.getElementById('bg-layer-1');
  var layer2 = document.getElementById('bg-layer-2');

  if (layer1 && layer2) {
    layer1.style.backgroundImage = 'url(' + starImages[0] + ')';
    layer1.style.opacity = '1';
    layer2.style.backgroundImage = 'url(' + starImages[1] + ')';
    layer2.style.opacity = '0';

    var showingLayer1 = true;

    setInterval(function() {
      currentIndex = (currentIndex + 1) % starImages.length;
      var nextIndex = (currentIndex + 1) % starImages.length;

      if (showingLayer1) {
        layer2.style.backgroundImage = 'url(' + starImages[currentIndex] + ')';
        layer1.style.opacity = '0';
        layer2.style.opacity = '1';
        setTimeout(function() {
          layer1.style.backgroundImage = 'url(' + starImages[nextIndex] + ')';
        }, 1000);
      } else {
        layer1.style.backgroundImage = 'url(' + starImages[currentIndex] + ')';
        layer2.style.opacity = '0';
        layer1.style.opacity = '1';
        setTimeout(function() {
          layer2.style.backgroundImage = 'url(' + starImages[nextIndex] + ')';
        }, 1000);
      }
      showingLayer1 = !showingLayer1;
    }, 5000);
  }
});
