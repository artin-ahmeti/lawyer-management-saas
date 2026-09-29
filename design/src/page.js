(function () {
  var root = document.documentElement;
  var store = {
    get: function (k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set: function (k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {}
    },
  };
  function applyTheme(value) {
    if (value === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', value);
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-set-theme') === value);
    });
    store.set('cl-theme', value);
  }
  document.querySelectorAll('[data-set-theme]').forEach(function (b) {
    b.addEventListener('click', function () {
      applyTheme(b.getAttribute('data-set-theme'));
    });
  });
  applyTheme(store.get('cl-theme') || 'system');

  function scaleFrames() {
    document.querySelectorAll('.rp-browser-scale').forEach(function (el) {
      var w = parseFloat(el.getAttribute('data-scale-width') || '1280');
      var wrap = el.parentElement;
      var avail = wrap.clientWidth || w;
      var s = Math.min(1, avail / w);
      el.style.transform = 'scale(' + s + ')';
      el.style.width = w + 'px';
      wrap.style.height = el.firstElementChild.offsetHeight * s + 'px';
    });
  }
  scaleFrames();
  if (window.ResizeObserver) {
    new ResizeObserver(scaleFrames).observe(document.body);
  } else {
    window.addEventListener('resize', scaleFrames);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scaleFrames);
  }
})();
