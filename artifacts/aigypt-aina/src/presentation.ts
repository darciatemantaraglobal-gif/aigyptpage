/* ============================================================
   AIGYPT × AINA — Presentation Logic (Vanilla TS)
   ============================================================ */

// ── State ────────────────────────────────────────────────────
let currentSlideIndex = 0;
let isAnimating = false;
const TOTAL_SLIDES = 9;
const ANIMATION_LOCK_MS = 700;

// ── Elements ─────────────────────────────────────────────────
const slidesContainer = document.getElementById('slides-container') as HTMLElement;
const progressFill    = document.getElementById('progress-fill')    as HTMLElement;
const dotsNav         = document.getElementById('dots-nav')         as HTMLElement;
const dots            = Array.from(dotsNav.querySelectorAll('.dot')) as HTMLButtonElement[];
const slides          = Array.from(document.querySelectorAll('.slide')) as HTMLElement[];

// ── Navigate to slide ─────────────────────────────────────────
function navigateToSlide(index: number): void {
  const clamped = Math.max(0, Math.min(TOTAL_SLIDES - 1, index));
  if (clamped === currentSlideIndex && document.readyState === 'complete') return;
  if (isAnimating) return;

  currentSlideIndex = clamped;
  isAnimating = true;
  setTimeout(() => { isAnimating = false; }, ANIMATION_LOCK_MS);

  slides[currentSlideIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateProgress();
  updateDots();
}

// ── Progress bar ──────────────────────────────────────────────
function updateProgress(): void {
  const pct = TOTAL_SLIDES <= 1 ? 100 : (currentSlideIndex / (TOTAL_SLIDES - 1)) * 100;
  progressFill.style.width = `${pct}%`;
}

// ── Dots ──────────────────────────────────────────────────────
function updateDots(): void {
  dots.forEach((dot, i) => {
    const active = i === currentSlideIndex;
    dot.classList.toggle('active', active);
    dot.setAttribute('aria-current', active ? 'true' : 'false');
  });
}

dots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.slide ?? '0', 10);
    navigateToSlide(idx);
  });
});

// ── Keyboard navigation ───────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  // Don't hijack when focus is inside a text input
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case 'ArrowDown':
    case 'ArrowRight':
    case ' ':
    case 'PageDown':
      e.preventDefault();
      navigateToSlide(currentSlideIndex + 1);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault();
      navigateToSlide(currentSlideIndex - 1);
      break;
    case 'Home':
      e.preventDefault();
      navigateToSlide(0);
      break;
    case 'End':
      e.preventDefault();
      navigateToSlide(TOTAL_SLIDES - 1);
      break;
    case 'f':
    case 'F':
      e.preventDefault();
      toggleFullscreen();
      break;
  }
});

// ── Fullscreen ────────────────────────────────────────────────
function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ── Intersection Observer — track current slide ───────────────
const slideObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
      const idx = slides.indexOf(entry.target as HTMLElement);
      if (idx !== -1 && idx !== currentSlideIndex) {
        currentSlideIndex = idx;
        updateProgress();
        updateDots();
      }
    }
  });
}, { threshold: 0.4 });

slides.forEach((slide) => slideObserver.observe(slide));

// ── Intersection Observer — animate items on entry ────────────
const itemObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const slide = entry.target as HTMLElement;
    const items = Array.from(slide.querySelectorAll('.animate-item')) as HTMLElement[];

    if (entry.isIntersecting) {
      // Replay: first reset all items
      items.forEach((item) => {
        item.classList.remove('visible');
      });
      // Then stagger them in
      items.forEach((item) => {
        const delay = parseInt(item.dataset.delay ?? '0', 10);
        setTimeout(() => {
          item.classList.add('visible');
        }, delay);
      });

      // AINA slide: trigger chat animation
      if (slide.id === 'slide-8') {
        triggerAinaChat();
      }
    } else {
      // Reset when slide leaves view so it replays next time
      items.forEach((item) => item.classList.remove('visible'));
      if (slide.id === 'slide-8') {
        resetAinaChat();
      }
    }
  });
}, { threshold: 0.3 });

slides.forEach((slide) => itemObserver.observe(slide));

// ── AINA Chat Animation ───────────────────────────────────────
const ainaMessages   = Array.from(document.querySelectorAll('.msg')) as HTMLElement[];
const typingIndicator = document.getElementById('typing-indicator') as HTMLElement;
let ainaTimers: ReturnType<typeof setTimeout>[] = [];

function resetAinaChat(): void {
  ainaTimers.forEach(clearTimeout);
  ainaTimers = [];
  ainaMessages.forEach((m) => m.classList.remove('revealed'));
  typingIndicator.classList.remove('visible');
}

function triggerAinaChat(): void {
  resetAinaChat();

  // Schedule each message: user messages appear instantly, AINA messages get a typing delay
  const schedule: Array<{ msgIdx: number; showAt: number; typingBefore?: number }> = [
    { msgIdx: 0, showAt: 500 },                        // user msg 1
    { msgIdx: 1, showAt: 900, typingBefore: 800 },     // AINA reply 1 (typing 900-1700)
    { msgIdx: 2, showAt: 2200 },                       // user msg 2
    { msgIdx: 3, showAt: 2600, typingBefore: 2500 },   // AINA reply 2
  ];

  schedule.forEach(({ msgIdx, showAt, typingBefore }) => {
    if (typingBefore !== undefined) {
      const t1 = setTimeout(() => {
        typingIndicator.classList.add('visible');
      }, typingBefore);
      ainaTimers.push(t1);
    }
    const t2 = setTimeout(() => {
      typingIndicator.classList.remove('visible');
      const el = ainaMessages[msgIdx];
      if (el) el.classList.add('revealed');
    }, showAt);
    ainaTimers.push(t2);
  });
}

// ── Scroll listener to sync progress + dots (fallback) ───────
slidesContainer.addEventListener('scroll', () => {}, { passive: true });

// Sync on native scroll (touch / trackpad)
let scrollRAF: number | null = null;
window.addEventListener('scroll', () => {
  if (scrollRAF) cancelAnimationFrame(scrollRAF);
  scrollRAF = requestAnimationFrame(() => {
    const viewH = window.innerHeight;
    let best = 0;
    let bestVisible = -1;

    slides.forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const visible = Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
      if (visible > bestVisible) {
        bestVisible = visible;
        best = i;
      }
    });

    if (best !== currentSlideIndex) {
      currentSlideIndex = best;
      updateProgress();
      updateDots();
    }
  });
}, { passive: true });

// ── Initial state ─────────────────────────────────────────────
updateProgress();
updateDots();

// Trigger visible on first slide immediately
const firstSlideItems = Array.from(slides[0].querySelectorAll('.animate-item')) as HTMLElement[];
firstSlideItems.forEach((item) => {
  const delay = parseInt(item.dataset.delay ?? '0', 10);
  setTimeout(() => item.classList.add('visible'), delay + 100);
});
