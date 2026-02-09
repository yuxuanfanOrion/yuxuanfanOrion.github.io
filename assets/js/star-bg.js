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
  var layer1 = document.getElementById('bg-layer-1');
  var layer2 = document.getElementById('bg-layer-2');
  var activeLayer = 1; // 当前显示的是哪个层

  if (layer1 && layer2) {
    // 初始化第一张图片
    layer1.style.backgroundImage = 'url(' + starImages[0] + ')';
    layer1.style.opacity = '1';
    layer2.style.opacity = '0';

    setInterval(function() {
      currentIndex = (currentIndex + 1) % starImages.length;
      var nextImage = 'url(' + starImages[currentIndex] + ')';

      if (activeLayer === 1) {
        // 在layer2上设置新图片，然后淡入layer2
        layer2.style.backgroundImage = nextImage;
        layer2.style.opacity = '1';
        layer1.style.opacity = '0';
        activeLayer = 2;
      } else {
        // 在layer1上设置新图片，然后淡入layer1
        layer1.style.backgroundImage = nextImage;
        layer1.style.opacity = '1';
        layer2.style.opacity = '0';
        activeLayer = 1;
      }
    }, 5000);
  }
});
