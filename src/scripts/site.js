/* Navbar shrink-on-scroll */
(function () {
  const SCROLL_THRESHOLD = 80;
  let ticking = false;
  const nav = document.querySelector('nav');

  function updateNavbar() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    ticking = false;
  }

  function onScroll() {
    if (!ticking) {
      window.requestAnimationFrame(updateNavbar);
      ticking = true;
    }
  }

  updateNavbar();
  window.addEventListener('scroll', onScroll, { passive: true });
})();

/* Announce comparison presets using the same labels shown beside each range. */
(function () {
  document.querySelectorAll('.jpeg-jxl-tabs .slide-container input, .avif-jxl-tabs .slide-container input').forEach(function (input) {
    const labels = Array.from(input.parentElement.querySelectorAll('.size-label, .quality-label'));
    function updateValueText() {
      const index = Math.round((Number(input.value) - Number(input.min)) / Number(input.step));
      const label = labels[index];
      if (label) input.setAttribute('aria-valuetext', label.textContent.trim());
    }
    updateValueText();
    input.addEventListener('input', updateValueText);
    input.addEventListener('change', updateValueText);
  });
})();

/* Simple slider — replaces Webflow's slider JS for .w-slider components */
(function () {
  document.querySelectorAll('.w-slider').forEach(function (slider) {
    if (slider.dataset.sliderInit) return;
    slider.dataset.sliderInit = 'true';

    const slides = Array.from(slider.querySelectorAll('.w-slide'));
    const nav = slider.querySelector('.w-slider-nav');
    if (!slides.length || !nav) return;

    let current = 0;

    // Preload slide images so the first dot click doesn't flash empty content
    slides.forEach(function (slide) {
      slide.querySelectorAll('img').forEach(function (img) {
        img.loading = 'eager';
        if (img.src) {
          const preload = new Image();
          preload.src = img.src;
        }
      });
    });

    // Activate first slide
    slides[0].classList.add('is-active');

    // Create one dot per slide
    slides.forEach(function (_, i) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'w-slider-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', function () {
        if (i === current) return;
        slides[current].classList.remove('is-active');
        nav.querySelectorAll('.w-slider-dot')[current].classList.remove('is-active');
        current = i;
        slides[current].classList.add('is-active');
        dot.classList.add('is-active');
      });
      nav.appendChild(dot);
    });
  });
})();

/* Comparison info (i) panel.
 * Desktop (> 991px): the panel is anchored beside the icon and shows on hover
 *   (pure CSS) or on click (the .is-open class).
 * Narrow / touch (≤ 991px): the controls drop below the image, so we portal the
 *   panel to <body> and render it as a centered, scrollable overlay. This keeps
 *   it on the top stacking level — never trapped beneath a later section. */
(function () {
  var tooltips = document.querySelectorAll(
    '.section-jpeg-comparison .tooltip, .section-avif-comparison .tooltip'
  );
  if (!tooltips.length) return;

  var portalMQ = window.matchMedia('(max-width: 991px)');

  function panelOf(tooltip) {
    return tooltip._panel || tooltip.querySelector('.tooltip-content');
  }

  function portal(tooltip) {
    if (tooltip._portaled) return;
    var panel = tooltip.querySelector('.tooltip-content');
    if (!panel) return;
    tooltip._panel = panel;
    tooltip._home = panel.parentElement;
    tooltip._next = panel.nextSibling;
    tooltip._portaled = true;
    panel.classList.add('comparison-info-portal');
    document.body.appendChild(panel);
  }

  function unportal(tooltip) {
    if (!tooltip._portaled) return;
    var panel = tooltip._panel;
    panel.classList.remove('comparison-info-portal');
    if (tooltip._next && tooltip._next.parentElement === tooltip._home) {
      tooltip._home.insertBefore(panel, tooltip._next);
    } else if (tooltip._home) {
      tooltip._home.appendChild(panel);
    }
    tooltip._portaled = false;
    tooltip._panel = null;
    tooltip._home = null;
    tooltip._next = null;
  }

  function close(tooltip) {
    tooltip.classList.remove('is-open');
    var trigger = tooltip.querySelector('.comparison-info-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    unportal(tooltip);
  }

  function closeAll(except) {
    tooltips.forEach(function (tooltip) {
      if (tooltip !== except) close(tooltip);
    });
  }

  function open(tooltip) {
    closeAll(tooltip);
    tooltip.classList.add('is-open');
    var trigger = tooltip.querySelector('.comparison-info-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    if (portalMQ.matches) portal(tooltip);
    else unportal(tooltip);
  }

  tooltips.forEach(function (tooltip) {
    var trigger = tooltip.querySelector('.comparison-info-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      if (tooltip.classList.contains('is-open')) close(tooltip);
      else open(tooltip);
    });
  });

  document.addEventListener('click', function (event) {
    tooltips.forEach(function (tooltip) {
      if (!tooltip.classList.contains('is-open')) return;
      var panel = panelOf(tooltip);
      if (tooltip.contains(event.target)) return;
      if (panel && panel.contains(event.target)) return;
      close(tooltip);
    });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeAll(null);
  });

  /* Keep open panels in the right place when crossing the breakpoint. */
  var onChange = function () {
    tooltips.forEach(function (tooltip) {
      if (!tooltip.classList.contains('is-open')) return;
      if (portalMQ.matches) portal(tooltip);
      else unportal(tooltip);
    });
  };
  if (portalMQ.addEventListener) portalMQ.addEventListener('change', onChange);
  else if (portalMQ.addListener) portalMQ.addListener(onChange);
})();

/* Fade the fixed hero backdrop out as the page scrolls toward the
 * "Fast Encoding & Decoding" section, so it's gone by the time we reach it. */
(function () {
  var hero = document.querySelector('.section-jpeg-xl-hero');
  var target = document.querySelector('.section-fast-encoding-decoding');
  if (!hero || !target) return;

  var ticking = false;

  function update() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var top = target.getBoundingClientRect().top;
    /* opacity 1 while the section is a full viewport away, ramping to 0 as its
       top approaches the top of the viewport. */
    var start = vh;
    var end = vh * 0.2;
    var opacity = (top - end) / (start - end);
    if (opacity < 0) opacity = 0;
    else if (opacity > 1) opacity = 1;
    document.body.style.setProperty('--hero-backdrop-opacity', opacity.toFixed(3));
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();
