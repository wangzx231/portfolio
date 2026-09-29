/* Original, progressively enhanced motion. Content stays visible without JS. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  let dispose = () => {};

  function setup() {
    dispose();
    if (preference.matches || !Element.prototype.animate) return;
    const controller = new AbortController();
    const signal = controller.signal;
    const animations = new Set();
    const touched = new Set();
    const frames = new Set();
    const ease = 'cubic-bezier(.2,.75,.2,1)';
    const later = callback => {
      const id = requestAnimationFrame(() => { frames.delete(id); callback(); });
      frames.add(id);
      return id;
    };
    const play = (element, keyframes, options = {}) => {
      if (!element) return;
      const animation = element.animate(keyframes, { duration: 850, easing: ease, ...options });
      animations.add(animation);
      const release = () => animations.delete(animation);
      animation.addEventListener('finish', release, { once: true });
      animation.addEventListener('cancel', release, { once: true });
      return animation;
    };
    const set = (element, property, value) => {
      touched.add(element);
      element.style.setProperty(property, value);
    };

    if (scrollY < 100) {
      document.querySelectorAll('.hero-word').forEach((word, index) => {
        play(word, [
          { transform: 'translateY(105%) rotate(3deg)', opacity: 0 },
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 }
        ], { duration: 1100, delay: index * 130, fill: 'backwards' });
      });
      play(document.querySelector('.hero-copy'), [
        { opacity: 0, transform: 'translateY(22px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { delay: 300, fill: 'backwards' });
      play(document.querySelector('.hero-art'), [
        { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, clipPath: 'inset(0 0 0% 0)' }
      ], { duration: 1200, delay: 200, fill: 'backwards' });
    }

    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          const target = entry.target;
          if (target.matches('.project')) {
            play(target.querySelector('.project-image'), [
              { clipPath: 'inset(0 0 20% 0)', opacity: .25, transform: 'translateY(35px)' },
              { clipPath: 'inset(0 0 0% 0)', opacity: 1, transform: 'translateY(0)' }
            ], { duration: 1000 });
            play(target.querySelector('.project-caption'), [
              { opacity: 0, transform: 'translateY(16px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ], { delay: 100, fill: 'backwards' });
          } else {
            play(target, [
              { opacity: .15, transform: 'translateY(26px)' },
              { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 850 });
          }
        });
      }, { threshold: .12 });
      document.querySelectorAll('.project,.section-heading,.process>p,.process-grid>div,.about-title,.about-body,.experience>div,footer h2,.contact-row').forEach(element => observer.observe(element));
    }

    const parallax = [...document.querySelectorAll('.project-image:not(.dark) img')];
    const crosses = [...document.querySelectorAll('.graphic-rule .cross')];
    const badge = document.querySelector('.round-label');
    const hero = document.querySelector('.hero');
    let scrollFrame = false;
    function updateScroll() {
      scrollFrame = false;
      if (document.hidden || document.querySelector('dialog[open]')) return;
      const viewport = innerHeight;
      const desktop = innerWidth > 800;
      const positions = parallax.map(img => ({ img, rect: img.parentElement.getBoundingClientRect() }));
      const heroRect = hero.getBoundingClientRect();
      positions.forEach(({ img, rect }) => {
        if (rect.bottom < 0 || rect.top > viewport) return;
        const progress = Math.max(-1, Math.min(1, (rect.top + rect.height / 2 - viewport / 2) / viewport));
        set(img, '--image-drift', desktop ? `${progress * -22}px` : '0px');
      });
      if (heroRect.bottom > 0) {
        crosses.forEach((cross, index) => set(cross, 'rotate', `${scrollY * (index ? -.09 : .09)}deg`));
        set(badge, 'rotate', `${Math.min(scrollY, 900) * .028}deg`);
      }
    }
    function queueScroll() {
      if (!scrollFrame) { scrollFrame = true; later(updateScroll); }
    }
    addEventListener('scroll', queueScroll, { passive: true, signal });
    addEventListener('resize', queueScroll, { passive: true, signal });
    document.addEventListener('visibilitychange', queueScroll, { signal });
    document.querySelector('dialog').addEventListener('close', queueScroll, { signal });
    queueScroll();

    if (pointer.matches) {
      document.querySelectorAll('.project button,.hero-art,.pill').forEach(element => {
        let pending = false;
        let x = 0, y = 0;
        const label = element.querySelector('.view-label');
        const reset = () => {
          x = 0; y = 0;
          set(element, 'translate', '0px 0px');
          set(element, 'rotate', '0deg');
          if (label) set(label, 'translate', '0px 0px');
        };
        element.addEventListener('pointermove', event => {
          if (event.pointerType !== 'mouse') return;
          const rect = element.getBoundingClientRect();
          x = Math.max(-.5, Math.min(.5, (event.clientX - rect.left) / rect.width - .5));
          y = Math.max(-.5, Math.min(.5, (event.clientY - rect.top) / rect.height - .5));
          if (pending) return;
          pending = true;
          later(() => {
            pending = false;
            if (label) set(label, 'translate', `${x * 26}px ${y * 18}px`);
            else if (element.matches('.pill')) set(element, 'translate', `${x * 12}px ${y * 10}px`);
            else set(element, 'rotate', `${x * 3}deg`);
          });
        }, { passive: true, signal });
        element.addEventListener('pointerleave', reset, { signal });
        element.addEventListener('blur', reset, { signal });
      });
    }

    const modal = document.querySelector('#project-dialog');
    const dialogObserver = new MutationObserver(() => {
      if (!modal.open) return;
      play(modal, [
        { opacity: 0, transform: 'translateY(24px) scale(.98)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 420 });
    });
    dialogObserver.observe(modal, { attributes: true, attributeFilter: ['open'] });

    dispose = () => {
      controller.abort();
      observer?.disconnect();
      dialogObserver.disconnect();
      frames.forEach(cancelAnimationFrame);
      animations.forEach(animation => animation.cancel());
      touched.forEach(element => ['--image-drift', 'rotate', 'translate'].forEach(property => element.style.removeProperty(property)));
    };
  }
  setup();
  preference.addEventListener('change', setup);
  pointer.addEventListener('change', setup);
})();
