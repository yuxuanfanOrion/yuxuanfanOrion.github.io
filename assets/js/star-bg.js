$(document).ready(function() {
  var starImages = [];
  var preloadedImages = [];

  // 生成图片路径并预加载所有图片
  for (var i = 1; i <= 20; i++) {
    var num = i < 10 ? '0' + i : '' + i;
    var path = '/images/stars-bg/star-' + num + '.jpg';
    starImages.push(path);

    var img = new Image();
    img.src = path;
    preloadedImages.push(img);
  }

  var currentIndex = 0;
  var layer = document.getElementById('bg-layer-1');

  if (layer) {
    layer.style.backgroundImage = 'url(' + starImages[0] + ')';

    setInterval(function() {
      currentIndex = (currentIndex + 1) % starImages.length;
      layer.style.backgroundImage = 'url(' + starImages[currentIndex] + ')';
    }, 5000);
  }
});
