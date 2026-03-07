/* ============================================
   KANNA KAMUY — Main JavaScript
   ============================================ */

'use strict';

// ── DOM helpers ──────────────────────────────
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ────────────────────────────────────────────
// 1. Header — scroll & hamburger
// ────────────────────────────────────────────
(function initHeader() {
  const header = $('#site-header');
  const hamburger = $('#hamburger');
  const nav = $('#main-nav');
  let lastScrollY = 0;

  // Scroll → add .scrolled class
  const onScroll = () => {
    const y = window.scrollY;
    if (y > 40) header.classList.add('scrolled');
    else        header.classList.remove('scrolled');
    lastScrollY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
    nav.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close nav on link click
  $$('.main-nav a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', false);
      nav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Close nav on outside click
  document.addEventListener('click', e => {
    if (!header.contains(e.target)) {
      hamburger.classList.remove('open');
      nav.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
})();

// ────────────────────────────────────────────
// 2. Reveal on scroll (IntersectionObserver)
// ────────────────────────────────────────────
(function initReveal() {
  const targets = $$('.reveal-up, .reveal-right');
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  targets.forEach(el => observer.observe(el));
})();

// ────────────────────────────────────────────
// 3. Back to top button
// ────────────────────────────────────────────
(function initBackToTop() {
  const btn = $('#back-to-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ────────────────────────────────────────────
// 4. Smooth scroll for anchor links
// ────────────────────────────────────────────
(function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const headerH = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h') || '72'
      );
      const top = target.getBoundingClientRect().top + window.scrollY - headerH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();

// ────────────────────────────────────────────
// 5. Contact form — mock submit & validation
// ────────────────────────────────────────────
(function initContactForm() {
  const form = $('#contact-form');
  const successMsg = $('#form-success');
  if (!form || !successMsg) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    // Basic validation
    const requiredFields = $$('[required]', form);
    let valid = true;
    requiredFields.forEach(field => {
      field.classList.remove('error');
      if (!field.value.trim() || (field.type === 'checkbox' && !field.checked)) {
        field.classList.add('error');
        valid = false;
      }
    });
    if (!valid) {
      const firstError = $('[required].error', form);
      if (firstError) firstError.focus();
      return;
    }

    // Disable submit button with loading state
    const submitBtn = $('[type="submit"]', form);
    const btnText = $('.btn-text', submitBtn);
    submitBtn.disabled = true;
    if (btnText) btnText.textContent = '送信中...';

    // Simulate async request
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Show success
    form.style.opacity = '0';
    form.style.transition = 'opacity 0.4s';
    await new Promise(resolve => setTimeout(resolve, 400));
    form.style.display = 'none';
    successMsg.classList.add('visible');

    // Reset button
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = '送信する';
  });

  // Real-time error clearing
  $$('[required]', form).forEach(field => {
    field.addEventListener('input', () => field.classList.remove('error'));
    field.addEventListener('change', () => field.classList.remove('error'));
  });
})();

// ────────────────────────────────────────────
// 6. Hero content entrance animation
// ────────────────────────────────────────────
(function initHeroAnimation() {
  const items = $$('.hero-content .reveal-up');
  items.forEach((el, i) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.classList.add('visible');
      }, 300 + i * 160);
    });
  });
})();

// ────────────────────────────────────────────
// 7. Number counter animation (optional)
// ────────────────────────────────────────────
(function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const duration = 1500;
      const start = performance.now();
      const animate = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(animate);
        else el.textContent = target;
      };
      requestAnimationFrame(animate);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(el => observer.observe(el));
})();

// ────────────────────────────────────────────
// 8. Active nav link on scroll
// ────────────────────────────────────────────
(function initActiveNav() {
  const sections = $$('section[id]');
  const navLinks = $$('.main-nav a[href^="#"]');

  const onScroll = () => {
    const scrollY = window.scrollY + 100;
    let current = '';
    sections.forEach(sec => {
      if (sec.offsetTop <= scrollY) current = sec.id;
    });
    navLinks.forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === `#${current}`);
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
