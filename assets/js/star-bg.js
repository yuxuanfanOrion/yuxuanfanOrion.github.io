$(document).ready(function() {
  var starImages = [];
  var preloadedImages = [];

  // 生成图片路径并预加载所有图片
  for (var i = 1; i <= 20; i++) {
    var num = i < 10 ? '0' + i : '' + i;
    var path = '/images/stars-bg/star-' + num + '.jpg';
    starImages.push(path);

    // 预加载图片
    var img = new Image();
    img.src = path;
    preloadedImages.push(img);
  }

  var currentIndex = 0;
  var layer1 = document.getElementById('bg-layer-1');
  var layer2 = document.getElementById('bg-layer-2');

  if (layer1 && layer2) {
    // 初始化：layer1 显示第一张
    layer1.style.backgroundImage = 'url(' + starImages[0] + ')';
    layer1.style.opacity = '1';
    layer2.style.opacity = '0';

    var activeLayer = 1;

    setInterval(function() {
      // 切换到下一张图片
      currentIndex = (currentIndex + 1) % starImages.length;

      if (activeLayer === 1) {
        layer2.style.backgroundImage = 'url(' + starImages[currentIndex] + ')';
        layer2.style.opacity = '1';
        layer1.style.opacity = '0';
        activeLayer = 2;
      } else {
        layer1.style.backgroundImage = 'url(' + starImages[currentIndex] + ')';
        layer1.style.opacity = '1';
        layer2.style.opacity = '0';
        activeLayer = 1;
      }
    }, 5000);
  }
});
