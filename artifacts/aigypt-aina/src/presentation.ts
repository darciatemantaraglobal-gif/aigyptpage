/**
 * AIGYPT × AINA — Presentation engine v3
 * 13 slides · 4 chapters · fragment reveals · gallery + lightbox · AINA chat
 */

// ─── Chapter mapping ──────────────────────────────────────
const SLIDE_CHAPTERS = [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4]; // 13 slides, 0-indexed
const CHAPTER_NAMES  = ['', 'BAB 1 · CERITA KITA', 'BAB 2 · AIGYPT', 'BAB 3 · AINA', 'BAB 4 · AJAKAN'];
const AINA_SLIDE     = 10; // 0-indexed index of "Kenalin AINA" slide

// ─── Gallery data ─────────────────────────────────────────
const GALLERY_PHOTOS = [
  { src: 'images/batch-0-kelas.jpg',    caption: 'Batch 0 · Kelas perdana',     batch: '0' },
  { src: 'images/batch-0-ruangan.jpg',  caption: 'Batch 0 · Ruangan penuh',     batch: '0' },
  { src: 'images/batch-1-aula.jpg',     caption: 'Batch 1 · Aula penuh',        batch: '1' },
  { src: 'images/batch-1-komunitas.jpg',caption: 'Batch 1 · Komunitas',          batch: '1' },
  { src: 'images/batch-1-tim.jpg',      caption: 'Batch 1 · Tim inti',          batch: '1' },
  { src: 'images/batch-3-kelas.jpg',    caption: 'Batch 3 · Sesi kelas',        batch: '3' },
  { src: 'images/batch-3-mentoring.jpg',caption: 'Batch 3 · Mentoring',         batch: '3' },
  { src: 'images/batch-3-demoday.jpg',  caption: 'Batch 3 · Platform & Demo Day', batch: '3' },
];

// ─── State ────────────────────────────────────────────────
let currentSlide   = 0;
let timerVisible   = false;
let timerStarted   = false;
let timerStart     = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let chatPlayed     = false;
let chatTimeouts: ReturnType<typeof setTimeout>[] = [];
let lightboxOpen   = false;
let lightboxIndex  = 0; // index within current filtered array
let galleryFilter  = 'all';
let touchStartX    = 0;

// ─── DOM ──────────────────────────────────────────────────
const nav           = document.getElementById('main-nav')     as HTMLElement;
const progressBar   = document.getElementById('progress-bar') as HTMLElement;
const timerEl       = document.getElementById('timer')        as HTMLElement;
const chapterLabel  = document.getElementById('chapter-label')as HTMLElement;
const dotsNav       = document.getElementById('dots')         as HTMLElement;
const dots          = Array.from(dotsNav.querySelectorAll<HTMLButtonElement>('.dot'));
const slides        = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const lightboxEl    = document.getElementById('lightbox')     as HTMLElement;
const lightboxImg   = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxCaption = document.getElementById('lightbox-caption') as HTMLElement;
const galleryGrid   = document.getElementById('gallery-grid') as HTMLElement;
const TOTAL         = slides.length;

// ─── Fragment tracking ────────────────────────────────────
const slideFragments: HTMLElement[][] = slides.map(s =>
  Array.from(s.querySelectorAll<HTMLElement>('.fragment'))
);
const fragmentState: number[] = slides.map(() => 0);

// ─── Build gallery ────────────────────────────────────────
function buildGallery() {
  GALLERY_PHOTOS.forEach((photo, i) => {
    const tile = document.createElement('div');
    tile.className = 'gallery-tile';
    tile.dataset.batch = photo.batch;
    tile.dataset.index = String(i);
    tile.setAttribute('role', 'listitem');
    tile.innerHTML = `
      <img src="${photo.src}" alt="${photo.caption}" loading="lazy" />
      <div class="gallery-caption">${photo.caption}</div>
    `;
    tile.addEventListener('click', () => openLightbox(i));
    galleryGrid.appendChild(tile);
  });
}

// ─── Gallery filter ───────────────────────────────────────
function filterGallery(batch: string) {
  galleryFilter = batch;
  document.querySelectorAll<HTMLElement>('.filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.batch === batch);
    chip.setAttribute('aria-pressed', String(chip.dataset.batch === batch));
  });
  document.querySelectorAll<HTMLElement>('.gallery-tile').forEach(tile => {
    const matches = batch === 'all' || tile.dataset.batch === batch;
    tile.classList.toggle('hidden', !matches);
  });
}

function getFilteredIndices(): number[] {
  return GALLERY_PHOTOS
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => galleryFilter === 'all' || p.batch === galleryFilter)
    .map(({ i }) => i);
}

// ─── Lightbox ─────────────────────────────────────────────
function openLightbox(photoIndex: number) {
  const filtered = getFilteredIndices();
  const pos = filtered.indexOf(photoIndex);
  lightboxIndex = pos >= 0 ? pos : 0;
  lightboxOpen = true;
  refreshLightboxPhoto();
  lightboxEl.setAttribute('aria-hidden', 'false');
  lightboxEl.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxOpen = false;
  lightboxEl.setAttribute('aria-hidden', 'true');
  lightboxEl.classList.remove('open');
  document.body.style.overflow = '';
}

function refreshLightboxPhoto() {
  const filtered = getFilteredIndices();
  if (!filtered.length) return;
  lightboxIndex = ((lightboxIndex % filtered.length) + filtered.length) % filtered.length;
  const photo = GALLERY_PHOTOS[filtered[lightboxIndex]];
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.caption;
  lightboxCaption.textContent = photo.caption;
}

function lightboxPrev() { lightboxIndex--; refreshLightboxPhoto(); }
function lightboxNext() { lightboxIndex++; refreshLightboxPhoto(); }

// ─── Nav scroll ───────────────────────────────────────────
function handleBodyScroll() {
  nav.classList.toggle('scrolled', window.scrollY > 10);
}
window.addEventListener('scroll', handleBodyScroll, { passive: true });

// ─── UI update ────────────────────────────────────────────
function updateUI() {
  // Progress bar
  const pct = TOTAL <= 1 ? 100 : (currentSlide / (TOTAL - 1)) * 100;
  progressBar.style.width = `${pct}%`;

  // Dots
  dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));

  // Chapter label
  const chapter = SLIDE_CHAPTERS[currentSlide];
  chapterLabel.textContent = CHAPTER_NAMES[chapter] ?? '';
}

// ─── Go to slide ──────────────────────────────────────────
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
  if (!revealNextFragment(currentSlide)) {
    if (currentSlide < TOTAL - 1) goToSlide(currentSlide + 1);
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
  timerEl.classList.toggle('amber', elapsed >= 1500 && elapsed < 1800);
  timerEl.classList.toggle('red',   elapsed >= 1800);
}

function toggleTimer() {
  timerVisible = !timerVisible;
  timerEl.style.display = timerVisible ? 'block' : 'none';
  if (timerVisible) ensureTimerStarted();
}

// ─── AINA chat ────────────────────────────────────────────
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

  const seq: [number, () => void][] = [
    [500,  () => chatBubbles.u1?.classList.add('show')],
    [1400, () => chatBubbles.t1?.classList.add('show')],
    [2300, () => { chatBubbles.t1?.classList.remove('show'); chatBubbles.a1?.classList.add('show'); }],
    [3000, () => chatBubbles.u2?.classList.add('show')],
    [3900, () => chatBubbles.t2?.classList.add('show')],
    [4800, () => { chatBubbles.t2?.classList.remove('show'); chatBubbles.a2?.classList.add('show'); }],
  ];
  seq.forEach(([delay, fn]) => {
    chatTimeouts.push(setTimeout(fn, delay));
  });
}

function replayChat() {
  chatPlayed = false;
  clearChatTimeouts();
  resetChat();
  scheduleChat();
}

// ─── Keyboard ─────────────────────────────────────────────
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

  // Lightbox mode: suspend slide navigation
  if (lightboxOpen) {
    switch (e.code) {
      case 'Escape':     e.preventDefault(); closeLightbox(); break;
      case 'ArrowLeft':  e.preventDefault(); lightboxPrev();  break;
      case 'ArrowRight': e.preventDefault(); lightboxNext();  break;
    }
    return;
  }

  switch (e.code) {
    case 'Space':
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      advance();
      break;

    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      goBack();
      break;

    case 'PageDown': e.preventDefault(); advance();  break;
    case 'PageUp':   e.preventDefault(); goBack();   break;

    case 'Home':
      e.preventDefault();
      slides.forEach((_, i) => hideAllFragments(i));
      currentSlide = 0;
      slides[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
      updateUI();
      break;

    case 'End':
      e.preventDefault();
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
      if (currentSlide === AINA_SLIDE) replayChat();
      break;
  }
});

// ─── Slide click → advance ────────────────────────────────
slides.forEach((slide, idx) => {
  slide.addEventListener('click', (e) => {
    if (lightboxOpen) return;
    const target = e.target as HTMLElement;
    if (target.closest('a, button, .gallery-tile, .filter-chip, .lightbox')) return;
    if (idx === currentSlide) advance();
  });
});

// ─── Dot clicks ───────────────────────────────────────────
dots.forEach((dot, i) => {
  dot.addEventListener('click', () => {
    if (i > currentSlide) {
      for (let j = currentSlide; j < i; j++) showAllFragments(j);
    }
    goToSlide(i);
  });
});

// ─── Nav & data-goto links ────────────────────────────────
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

// ─── Gallery filter chips ─────────────────────────────────
document.querySelectorAll<HTMLElement>('.filter-chip').forEach(chip => {
  chip.setAttribute('aria-pressed', chip.classList.contains('active') ? 'true' : 'false');
  chip.addEventListener('click', () => filterGallery(chip.dataset.batch ?? 'all'));
});

// ─── Lightbox controls ────────────────────────────────────
document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
document.querySelector('.lightbox-prev')?.addEventListener('click', lightboxPrev);
document.querySelector('.lightbox-next')?.addEventListener('click', lightboxNext);
lightboxEl.addEventListener('click', (e) => {
  if (e.target === lightboxEl) closeLightbox();
});

// Lightbox swipe (mobile)
lightboxEl.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
}, { passive: true });
lightboxEl.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50) { dx > 0 ? lightboxPrev() : lightboxNext(); }
});

// ─── IntersectionObserver (manual scroll tracking) ────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
      const idx = slides.indexOf(entry.target as HTMLElement);
      if (idx !== -1 && idx !== currentSlide) {
        currentSlide = idx;
        updateUI();
        if (idx === AINA_SLIDE && !chatPlayed) scheduleChat();
      }
    }
  });
}, { threshold: 0.5 });

slides.forEach(slide => observer.observe(slide));

// ─── Init ─────────────────────────────────────────────────
buildGallery();
updateUI();
handleBodyScroll();
