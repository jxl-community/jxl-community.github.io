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

/* Simple slider — replaces Webflow's slider JS for .w-slider components */
(function () {
  document.querySelectorAll('.w-slider').forEach(function (slider) {
    const slides = Array.from(slider.querySelectorAll('.w-slide'));
    const nav = slider.querySelector('.w-slider-nav');
    if (!slides.length || !nav) return;

    let current = 0;

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
