/**
 * AIGYPT × AINA — Presentation engine v2 (auto-reveal)
 * Slides animate in automatically on enter. Keyboard navigates slide-to-slide.
 */

// ─── State ────────────────────────────────────────────────
let currentSlide = 0;
let timerVisible = false;
let timerStarted = false;
let timerStart = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let chatPlayed = false;
let chatTimeouts: ReturnType<typeof setTimeout>[] = [];

// ─── DOM refs ─────────────────────────────────────────────
const nav         = document.getElementById('main-nav') as HTMLElement;
const progressBar = document.getElementById('progress-bar') as HTMLElement;
const timerEl     = document.getElementById('timer') as HTMLElement;
const dotsNav     = document.getElementById('dots') as HTMLElement;
const dots        = Array.from(dotsNav.querySelectorAll<HTMLButtonElement>('.dot'));
const slides      = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const TOTAL       = slides.length;
const AINA_SLIDE  = 8; // 0-indexed

// ─── Assign stagger delays to all .fragment inside a slide ─
function assignDelays(slideEl: HTMLElement) {
  const frags = slideEl.querySelectorAll<HTMLElement>('.fragment');
  frags.forEach((f, i) => {
    f.style.setProperty('--frag-delay', `${120 + i * 110}ms`);
  });
}

// ─── Nav scrolled ─────────────────────────────────────────
function handleScroll() {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}
window.addEventListener('scroll', handleScroll, { passive: true });

// ─── Progress + dots ──────────────────────────────────────
function updateUI() {
  const pct = TOTAL <= 1 ? 100 : (currentSlide / (TOTAL - 1)) * 100;
  progressBar.style.width = `${pct}%`;
  dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
}

// ─── Go to slide ──────────────────────────────────────────
function goToSlide(idx: number) {
  if (idx < 0 || idx >= TOTAL) return;
  currentSlide = idx;
  slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateUI();
}

// ─── Advance / Back ───────────────────────────────────────
function advance() {
  ensureTimerStarted();
  if (currentSlide < TOTAL - 1) goToSlide(currentSlide + 1);
}

function goBack() {
  ensureTimerStarted();
  if (currentSlide > 0) goToSlide(currentSlide - 1);
}

// ─── Timer ────────────────────────────────────────────────
function ensureTimerStarted() {
  if (!timerStarted) {
    timerStarted = true;
    timerStart = Date.now();
    timerInterval = setInterval(tickTimer, 1000);
    tickTimer();
  }
}

function tickTimer() {
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${mm}:${ss} / 30:00`;
  timerEl.classList.remove('amber', 'red');
  if (elapsed >= 1800) timerEl.classList.add('red');
  else if (elapsed >= 1500) timerEl.classList.add('amber');
}

function toggleTimer() {
  timerVisible = !timerVisible;
  timerEl.style.display = timerVisible ? 'block' : 'none';
  if (timerVisible) ensureTimerStarted();
}

// ─── AINA chat animation ───────────────────────────────────
const chatBubbles = {
  u1: document.getElementById('bubble-u1'),
  t1: document.getElementById('typing-1'),
  a1: document.getElementById('bubble-a1'),
  u2: document.getElementById('bubble-u2'),
  t2: document.getElementById('typing-2'),
  a2: document.getElementById('bubble-a2'),
};

function resetChat() {
  Object.values(chatBubbles).forEach(el => el?.classList.remove('show'));
}
function clearChatTimeouts() {
  chatTimeouts.forEach(t => clearTimeout(t));
  chatTimeouts = [];
}
function scheduleChat() {
  chatPlayed = true;
  clearChatTimeouts();
  resetChat();
  const seq: Array<() => void> = [
    () => chatBubbles.u1?.classList.add('show'),
    () => chatBubbles.t1?.classList.add('show'),
    () => { chatBubbles.t1?.classList.remove('show'); chatBubbles.a1?.classList.add('show'); },
    () => chatBubbles.u2?.classList.add('show'),
    () => chatBubbles.t2?.classList.add('show'),
    () => { chatBubbles.t2?.classList.remove('show'); chatBubbles.a2?.classList.add('show'); },
  ];
  const delays = [500, 900, 900, 700, 900, 900];
  let elapsed = 0;
  seq.forEach((fn, i) => {
    elapsed += delays[i];
    chatTimeouts.push(setTimeout(fn, elapsed));
  });
}
function replayChat() {
  chatPlayed = false;
  clearChatTimeouts();
  resetChat();
  scheduleChat();
}

// ─── Keyboard handler ─────────────────────────────────────
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
  switch (e.code) {
    case 'Space': case 'ArrowDown': case 'ArrowRight': case 'PageDown':
      e.preventDefault(); advance(); break;
    case 'ArrowUp': case 'ArrowLeft': case 'PageUp':
      e.preventDefault(); goBack(); break;
    case 'Home':
      e.preventDefault(); goToSlide(0); break;
    case 'End':
      e.preventDefault(); goToSlide(TOTAL - 1); break;
    case 'KeyF':
      e.preventDefault();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
      break;
    case 'KeyT':
      e.preventDefault(); toggleTimer(); break;
    case 'KeyR':
      e.preventDefault();
      if (currentSlide === AINA_SLIDE) replayChat();
      break;
  }
});

// ─── Click on slide → advance to next ─────────────────────
slides.forEach((slide, idx) => {
  slide.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    if (idx === currentSlide) advance();
  });
});

// ─── Dot clicks ───────────────────────────────────────────
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => goToSlide(i));
});

// ─── Nav link clicks ──────────────────────────────────────
document.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => {
  el.addEventListener('click', (e) => {
    const idx = parseInt(el.dataset.goto ?? '0', 10);
    if (!isNaN(idx)) { e.preventDefault(); goToSlide(idx); }
  });
});

// ─── IntersectionObserver — auto-reveal on enter ──────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    const slideEl = entry.target as HTMLElement;
    const idx = slides.indexOf(slideEl);
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
      currentSlide = idx;
      updateUI();
      // Assign stagger delays then add in-view (triggers CSS animation)
      assignDelays(slideEl);
      slideEl.classList.add('in-view');
      if (idx === AINA_SLIDE && !chatPlayed) scheduleChat();
    } else {
      // Remove so animations replay on re-entry
      slideEl.classList.remove('in-view');
      if (idx === AINA_SLIDE) {
        clearChatTimeouts();
        resetChat();
        chatPlayed = false;
      }
    }
  });
}, { threshold: 0.5 });

slides.forEach(slide => observer.observe(slide));

// ─── Init ─────────────────────────────────────────────────
updateUI();
handleScroll();
// Fire hero slide immediately (it's already in view on load)
assignDelays(slides[0]);
slides[0].classList.add('in-view');
