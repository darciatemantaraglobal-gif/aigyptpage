/**
 * AIGYPT × AINA — Presentation engine v2
 * Keyboard-driven slide deck with fragment reveals, presenter timer, AINA chat animation.
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
const nav          = document.getElementById('main-nav') as HTMLElement;
const progressBar  = document.getElementById('progress-bar') as HTMLElement;
const timerEl      = document.getElementById('timer') as HTMLElement;
const dotsNav      = document.getElementById('dots') as HTMLElement;
const dots         = Array.from(dotsNav.querySelectorAll<HTMLButtonElement>('.dot'));
const slides       = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const TOTAL        = slides.length;
const AINA_SLIDE   = 8; // 0-indexed slide index of the AINA slide

// ─── Fragment tracking ────────────────────────────────────
// Each slide has a list of .fragment elements in DOM order.
// fragmentState[i] = number revealed so far.
const slideFragments: HTMLElement[][] = slides.map(s =>
  Array.from(s.querySelectorAll<HTMLElement>('.fragment'))
);
const fragmentState: number[] = slides.map(() => 0);

// Special: program-pair elements use display:contents, so we treat each
// .program-pair div as a logical fragment group that wraps its rows.
// The CSS handles visibility — when a .program-pair gets .revealed,
// its children (rows) revert to visible because only the wrapper transitions.
// (This works because we set opacity/transform on the .fragment itself.)

// ─── Nav scrolled ─────────────────────────────────────────
function handleScroll() {
  if (window.scrollY > 20) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}
window.addEventListener('scroll', handleScroll, { passive: true });

// ─── Progress + dots ──────────────────────────────────────
function updateUI() {
  // Progress bar: 0 → 100% over all slides
  const pct = TOTAL <= 1 ? 100 : (currentSlide / (TOTAL - 1)) * 100;
  progressBar.style.width = `${pct}%`;

  // Dots
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === currentSlide);
  });
}

// ─── Go to slide ──────────────────────────────────────────
function goToSlide(idx: number, revealAllFragments = false) {
  if (idx < 0 || idx >= TOTAL) return;
  currentSlide = idx;

  if (revealAllFragments) {
    showAllFragments(idx);
  }

  slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateUI();

  // AINA auto-play when arriving at AINA slide
  if (idx === AINA_SLIDE && !chatPlayed) {
    scheduleChat();
  }
}

// ─── Fragments ────────────────────────────────────────────
function revealNextFragment(slideIdx: number): boolean {
  const frags = slideFragments[slideIdx];
  const n = fragmentState[slideIdx];
  if (n < frags.length) {
    frags[n].classList.add('revealed');
    fragmentState[slideIdx]++;
    return true;
  }
  return false;
}

function showAllFragments(slideIdx: number) {
  const frags = slideFragments[slideIdx];
  frags.forEach(f => f.classList.add('revealed'));
  fragmentState[slideIdx] = frags.length;
}

function hideAllFragments(slideIdx: number) {
  const frags = slideFragments[slideIdx];
  frags.forEach(f => f.classList.remove('revealed'));
  fragmentState[slideIdx] = 0;
}

// ─── Advance (Space / ArrowDown / ArrowRight / PageDown) ──
function advance() {
  ensureTimerStarted();
  const revealed = revealNextFragment(currentSlide);
  if (!revealed) {
    // All fragments done — go to next slide
    if (currentSlide < TOTAL - 1) {
      goToSlide(currentSlide + 1);
    }
  }
}

// ─── Back (ArrowUp / ArrowLeft / PageUp) ──────────────────
function goBack() {
  ensureTimerStarted();
  if (currentSlide > 0) {
    // Hide fragments on current slide so they re-animate if returning
    hideAllFragments(currentSlide);
    goToSlide(currentSlide - 1, true);
  }
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
  if (elapsed >= 1800) {
    timerEl.classList.add('red');
  } else if (elapsed >= 1500) {
    timerEl.classList.add('amber');
  }
}

function toggleTimer() {
  timerVisible = !timerVisible;
  timerEl.style.display = timerVisible ? 'block' : 'none';
  if (timerVisible) {
    ensureTimerStarted();
  }
}

// ─── AINA chat animation ───────────────────────────────────
const chatBubbles = {
  u1:  document.getElementById('bubble-u1'),
  t1:  document.getElementById('typing-1'),
  a1:  document.getElementById('bubble-a1'),
  u2:  document.getElementById('bubble-u2'),
  t2:  document.getElementById('typing-2'),
  a2:  document.getElementById('bubble-a2'),
};

function resetChat() {
  Object.values(chatBubbles).forEach(el => {
    el?.classList.remove('show');
  });
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
  // Don't capture inside inputs
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

  switch (e.code) {
    case 'Space':
    case 'ArrowDown':
    case 'ArrowRight':
    case 'PageDown':
      e.preventDefault();
      advance();
      break;

    case 'ArrowUp':
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault();
      goBack();
      break;

    case 'Home':
      e.preventDefault();
      // Go to first slide, reset fragments
      slides.forEach((_, i) => hideAllFragments(i));
      currentSlide = 0;
      slides[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateUI();
      break;

    case 'End':
      e.preventDefault();
      // Go to last slide, show all its fragments
      currentSlide = TOTAL - 1;
      showAllFragments(currentSlide);
      slides[currentSlide].scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateUI();
      break;

    case 'KeyF':
      e.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
      break;

    case 'KeyT':
      e.preventDefault();
      toggleTimer();
      break;

    case 'KeyR':
      e.preventDefault();
      if (currentSlide === AINA_SLIDE) {
        replayChat();
      }
      break;
  }
});

// ─── Click on slide → advance ─────────────────────────────
slides.forEach((slide, idx) => {
  slide.addEventListener('click', (e) => {
    // Ignore clicks on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('a, button, .dot')) return;

    // Only advance if this is the currently active slide (desktop)
    if (idx === currentSlide) {
      advance();
    }
  });
});

// ─── Dot clicks ───────────────────────────────────────────
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    // Show all fragments on slides we're skipping past
    if (i > currentSlide) {
      for (let j = currentSlide; j < i; j++) {
        showAllFragments(j);
      }
    }
    goToSlide(i);
  });
});

// ─── Nav link clicks ──────────────────────────────────────
document.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => {
  el.addEventListener('click', (e) => {
    const idx = parseInt(el.dataset.goto ?? '0', 10);
    if (isNaN(idx)) return;
    e.preventDefault();
    if (idx > currentSlide) {
      for (let j = currentSlide; j < idx; j++) showAllFragments(j);
    }
    goToSlide(idx);
  });
});

// ─── IntersectionObserver (track slide on manual scroll) ──
let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
      const idx = slides.indexOf(entry.target as HTMLElement);
      if (idx !== -1 && idx !== currentSlide) {
        currentSlide = idx;
        updateUI();
        // On mobile, all frags already visible via CSS.
        // On desktop, trigger AINA chat when sliding to it manually.
        if (idx === AINA_SLIDE && !chatPlayed) {
          scheduleChat();
        }
      }
    }
  });
}, { threshold: 0.5 });

slides.forEach(slide => observer.observe(slide));

// ─── Init ─────────────────────────────────────────────────
updateUI();
handleScroll();
