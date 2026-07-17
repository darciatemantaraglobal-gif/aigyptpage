/**
 * AIGYPT × AINA — Presentation engine v4
 * Keyboard-driven fragment reveals, chapter system, gallery lightbox, AINA chat.
 */

// ─── Chapter map ──────────────────────────────────────────
const CHAPTER_LABELS: Record<number, string> = {
  0: 'BAB 1 · CERITA KITA', 1: 'BAB 1 · CERITA KITA',
  2: 'BAB 1 · CERITA KITA', 3: 'BAB 1 · CERITA KITA',
  4: 'BAB 2 · AIGYPT',      5: 'BAB 2 · AIGYPT',
  6: 'BAB 2 · AIGYPT',      7: 'BAB 2 · AIGYPT',
  8: 'BAB 2 · AIGYPT',
  9:  'BAB 3 · AINA',       10: 'BAB 3 · AINA',
  11: 'BAB 3 · AINA',       12: 'BAB 3 · AINA',
  13: 'BAB 3 · AINA',
  14: 'BAB 4 · AJAKAN',
};
const AINA_SLIDE = 10;

// ─── State ────────────────────────────────────────────────
let currentSlide = 0;
let timerVisible = false, timerStarted = false, timerStart = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let chatPlayed = false;
let chatTimeouts: ReturnType<typeof setTimeout>[] = [];
let lightboxOpen = false;
let lightboxItems: Element[] = [];
let lightboxIndex = 0;

// ─── DOM ──────────────────────────────────────────────────
const nav          = document.getElementById('main-nav')!;
const progressBar  = document.getElementById('progress-bar')!;
const chapterLabel = document.getElementById('chapter-label')!;
const timerEl      = document.getElementById('timer')!;
const allDots      = Array.from(document.querySelectorAll<HTMLButtonElement>('.dot'));
const slides       = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const TOTAL        = slides.length;

// ─── Fragment tracking ────────────────────────────────────
// Collect .fragment and .fragment-group in DOM order per slide.
const slideFragments: Element[][] = slides.map(s =>
  Array.from(s.querySelectorAll<Element>('.fragment, .fragment-group'))
);
const fragmentState: number[] = slides.map(() => 0);

// ─── Nav scrolled ─────────────────────────────────────────
function handleScroll() { nav.classList.toggle('scrolled', window.scrollY > 20); }
window.addEventListener('scroll', handleScroll, { passive: true });

// ─── UI update ────────────────────────────────────────────
function updateUI() {
  const pct = TOTAL <= 1 ? 100 : (currentSlide / (TOTAL - 1)) * 100;
  progressBar.style.width = `${pct}%`;
  allDots.forEach(d => d.classList.toggle('active', +d.dataset.slide! === currentSlide));
  chapterLabel.textContent = CHAPTER_LABELS[currentSlide] ?? '';
}

// ─── Slide navigation ─────────────────────────────────────
function goToSlide(idx: number, revealAll = false) {
  if (idx < 0 || idx >= TOTAL) return;
  currentSlide = idx;
  if (revealAll) showAllFragments(idx);
  slides[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  updateUI();
  if (idx === AINA_SLIDE && !chatPlayed) scheduleChat();
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
  slideFragments[slideIdx].forEach(f => f.classList.add('revealed'));
  fragmentState[slideIdx] = slideFragments[slideIdx].length;
}

function hideAllFragments(slideIdx: number) {
  slideFragments[slideIdx].forEach(f => f.classList.remove('revealed'));
  fragmentState[slideIdx] = 0;
}

// ─── Advance / Back ───────────────────────────────────────
function advance() {
  ensureTimerStarted();
  if (!revealNextFragment(currentSlide) && currentSlide < TOTAL - 1) {
    goToSlide(currentSlide + 1);
  }
}

function goBack() {
  ensureTimerStarted();
  if (currentSlide > 0) {
    hideAllFragments(currentSlide);
    goToSlide(currentSlide - 1, true);
  }
}

// ─── Timer ────────────────────────────────────────────────
function ensureTimerStarted() {
  if (!timerStarted) {
    timerStarted = true; timerStart = Date.now();
    timerInterval = setInterval(tickTimer, 1000); tickTimer();
  }
}
function tickTimer() {
  const e = Math.floor((Date.now() - timerStart) / 1000);
  timerEl.textContent = `${String(Math.floor(e/60)).padStart(2,'0')}:${String(e%60).padStart(2,'0')} / 30:00`;
  timerEl.classList.remove('amber','red');
  if (e >= 1800) timerEl.classList.add('red');
  else if (e >= 1500) timerEl.classList.add('amber');
}
function toggleTimer() {
  timerVisible = !timerVisible;
  timerEl.style.display = timerVisible ? 'block' : 'none';
  if (timerVisible) ensureTimerStarted();
}

// ─── AINA chat ────────────────────────────────────────────
const cb = {
  u1: document.getElementById('bubble-u1'),
  t1: document.getElementById('typing-1'),
  a1: document.getElementById('bubble-a1'),
  u2: document.getElementById('bubble-u2'),
  t2: document.getElementById('typing-2'),
  a2: document.getElementById('bubble-a2'),
};
function resetChat() { Object.values(cb).forEach(el => el?.classList.remove('show')); }
function clearChatTimeouts() { chatTimeouts.forEach(clearTimeout); chatTimeouts = []; }
function scheduleChat() {
  chatPlayed = true; clearChatTimeouts(); resetChat();
  const seq = [
    () => cb.u1?.classList.add('show'),
    () => cb.t1?.classList.add('show'),
    () => { cb.t1?.classList.remove('show'); cb.a1?.classList.add('show'); },
    () => cb.u2?.classList.add('show'),
    () => cb.t2?.classList.add('show'),
    () => { cb.t2?.classList.remove('show'); cb.a2?.classList.add('show'); },
  ];
  const delays = [500,900,900,700,900,900];
  let elapsed = 0;
  seq.forEach((fn, i) => { elapsed += delays[i]; chatTimeouts.push(setTimeout(fn, elapsed)); });
}
function replayChat() { chatPlayed = false; clearChatTimeouts(); resetChat(); scheduleChat(); }

// ─── Gallery filter ───────────────────────────────────────
const galleryItems = Array.from(document.querySelectorAll<HTMLElement>('.gallery-item'));
let visibleItems: HTMLElement[] = [...galleryItems];
let filterTimeouts: ReturnType<typeof setTimeout>[] = [];

function applyFilter(filter: string) {
  document.querySelectorAll('.gallery-chip').forEach(c =>
    c.classList.toggle('active', (c as HTMLElement).dataset.filter === filter)
  );
  filterTimeouts.forEach(clearTimeout); filterTimeouts = [];

  galleryItems.forEach(item => {
    const match = filter === 'all' || item.dataset.batch === filter;
    if (!match) {
      item.classList.add('hidden');
      filterTimeouts.push(setTimeout(() => item.classList.add('gone'), 260));
    } else {
      item.classList.remove('gone');
      requestAnimationFrame(() => requestAnimationFrame(() => item.classList.remove('hidden')));
    }
  });

  visibleItems = galleryItems.filter(item => filter === 'all' || item.dataset.batch === filter);
}

document.querySelectorAll<HTMLButtonElement>('.gallery-chip').forEach(chip => {
  chip.addEventListener('click', () => applyFilter(chip.dataset.filter ?? 'all'));
});

// ─── Lightbox ─────────────────────────────────────────────
const lightboxEl   = document.getElementById('lightbox')!;
const lightboxImg  = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxCap  = document.getElementById('lightbox-caption')!;
const lightboxCtr  = document.getElementById('lightbox-counter')!;

function openLightbox(item: HTMLElement) {
  const img = item.querySelector('img') as HTMLImageElement;
  const cap = item.querySelector('.gallery-caption')?.textContent ?? '';
  lightboxIndex = visibleItems.indexOf(item);
  lightboxImg.src = img.src;
  lightboxImg.alt = img.alt;
  lightboxCap.textContent = cap;
  lightboxCtr.textContent = `${lightboxIndex + 1} / ${visibleItems.length}`;
  lightboxEl.classList.add('open');
  lightboxOpen = true;
  document.body.style.overflow = 'hidden';
  document.getElementById('lightbox-close')?.focus();
}

function closeLightbox() {
  lightboxEl.classList.remove('open');
  lightboxOpen = false;
  document.body.style.overflow = '';
}

function lightboxNav(dir: 1 | -1) {
  lightboxIndex = (lightboxIndex + dir + visibleItems.length) % visibleItems.length;
  const item = visibleItems[lightboxIndex] as HTMLElement;
  const img = item.querySelector('img') as HTMLImageElement;
  const cap = item.querySelector('.gallery-caption')?.textContent ?? '';
  lightboxImg.style.opacity = '0';
  setTimeout(() => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxImg.style.opacity = '1';
    lightboxCap.textContent = cap;
    lightboxCtr.textContent = `${lightboxIndex + 1} / ${visibleItems.length}`;
  }, 160);
}

galleryItems.forEach(item => {
  const open = () => { if (!item.classList.contains('hidden') && !item.classList.contains('gone')) openLightbox(item); };
  item.addEventListener('click', open);
  item.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
});

document.getElementById('lightbox-close')!.addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev')!.addEventListener('click', () => lightboxNav(-1));
document.getElementById('lightbox-next')!.addEventListener('click', () => lightboxNav(1));
lightboxEl.addEventListener('click', (e) => { if (e.target === lightboxEl) closeLightbox(); });

// Swipe
let touchStartX = 0;
lightboxEl.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
lightboxEl.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) lightboxNav(dx < 0 ? 1 : -1);
});

// ─── Keyboard ─────────────────────────────────────────────
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName)) return;

  if (lightboxOpen) {
    switch (e.code) {
      case 'Escape': e.preventDefault(); closeLightbox(); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); lightboxNav(-1); break;
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); lightboxNav(1); break;
    }
    return;
  }

  switch (e.code) {
    case 'Space': case 'ArrowDown': case 'ArrowRight': case 'PageDown':
      e.preventDefault(); advance(); break;
    case 'ArrowUp': case 'ArrowLeft': case 'PageUp':
      e.preventDefault(); goBack(); break;
    case 'Home':
      e.preventDefault();
      slides.forEach((_, i) => hideAllFragments(i));
      currentSlide = 0;
      slides[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateUI(); break;
    case 'End':
      e.preventDefault();
      currentSlide = TOTAL - 1;
      showAllFragments(currentSlide);
      slides[currentSlide].scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateUI(); break;
    case 'KeyF':
      e.preventDefault();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
      break;
    case 'KeyT': e.preventDefault(); toggleTimer(); break;
    case 'KeyR': e.preventDefault(); if (currentSlide === AINA_SLIDE) replayChat(); break;
  }
});

// ─── Click on slide to advance ────────────────────────────
slides.forEach((slide, idx) => {
  slide.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a, button, .gallery-item, [role="button"]')) return;
    if (idx === currentSlide && !lightboxOpen) advance();
  });
});

// ─── Dot clicks ───────────────────────────────────────────
allDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = +dot.dataset.slide!;
    if (idx > currentSlide) for (let j = currentSlide; j < idx; j++) showAllFragments(j);
    goToSlide(idx);
  });
});

// ─── Nav link clicks ──────────────────────────────────────
document.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => {
  el.addEventListener('click', e => {
    const idx = parseInt(el.dataset.goto!, 10);
    if (!isNaN(idx)) {
      e.preventDefault();
      if (idx > currentSlide) for (let j = currentSlide; j < idx; j++) showAllFragments(j);
      goToSlide(idx);
    }
  });
});

// ─── IntersectionObserver ─────────────────────────────────
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
      const idx = slides.indexOf(entry.target as HTMLElement);
      if (idx !== -1 && idx !== currentSlide) {
        currentSlide = idx; updateUI();
        if (idx === AINA_SLIDE && !chatPlayed) scheduleChat();
      }
    }
  });
}, { threshold: 0.5 });

slides.forEach(s => observer.observe(s));

// ─── Init ─────────────────────────────────────────────────
applyFilter('all');
updateUI();
handleScroll();
