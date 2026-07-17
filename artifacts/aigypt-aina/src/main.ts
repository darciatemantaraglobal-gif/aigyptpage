import './style.css';

// ============================================================
// STATE
// ============================================================
let currentSlide = 0;
let fragmentIndex = -1;
let timerStarted = false;
let timerStart: number | null = null;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let timerVisible = false;
let lightboxOpen = false;
let lightboxIndex = 0;
let chatTimeouts: ReturnType<typeof setTimeout>[] = [];
let teamStaggerDone = false;
let touchStartY = 0;
let lbTouchX = 0;

const isMobile = () => window.innerWidth < 768;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================
// CHAPTER CONFIG
// ============================================================
const CHAPTERS = [
  { start: 0, end: 2,  label: 'BAB 1 · CERITA KITA' },
  { start: 3, end: 6,  label: 'BAB 2 · AIGYPT' },
  { start: 7, end: 11, label: 'BAB 3 · AINA' },
  { start: 12, end: 13, label: 'BAB 4 · AJAKAN' },
];

// Slides where pairs should be revealed together (same keypress)
// data-frag-group attribute marks "sibling" fragments
// They'll be handled by checking data-frag-group adjacency

// ============================================================
// DOM REFERENCES
// ============================================================
const slidesContainer = document.getElementById('slides-container')!;
const progressBar = document.getElementById('progress-bar')!;
const chapterLabel = document.getElementById('chapter-label')!;
const timerEl = document.getElementById('timer')!;
const mainNav = document.getElementById('main-nav')!;
const SLIDES = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const TOTAL = SLIDES.length;

// ============================================================
// GALLERY DATA
// ============================================================
const galleryPhotos = [
  { src: 'images/batch-0-kelas.jpg',     caption: 'Batch 0 · Kelas perdana',        batch: '0' },
  { src: 'images/batch-0-ruangan.jpg',   caption: 'Batch 0 · Ruangan penuh',        batch: '0' },
  { src: 'images/batch-1-aula.jpg',      caption: 'Batch 1 · Aula penuh',           batch: '1' },
  { src: 'images/batch-1-komunitas.jpg', caption: 'Batch 1 · Komunitas',            batch: '1' },
  { src: 'images/batch-1-tim.jpg',       caption: 'Batch 1 · Tim inti',             batch: '1' },
  { src: 'images/batch-3-kelas.jpg',     caption: 'Batch 3 · Sesi kelas',           batch: '3' },
  { src: 'images/batch-3-mentoring.jpg', caption: 'Batch 3 · Mentoring',            batch: '3' },
  { src: 'images/batch-3-demoday.jpg',   caption: 'Batch 3 · Platform & Demo Day',  batch: '3' },
];

const CHAT_SCRIPT = [
  { role: 'user', text: 'AINA, cara urus iqomah pertama kali gimana ya?' },
  { role: 'aina', text: 'Santai, aku pandu ya 🙌 Untuk iqomah pertama kamu perlu paspor, foto, dan formulir dari kampus. Mau aku buatin checklist urutan ngurusnya sekalian?' },
  { role: 'user', text: 'Mau banget! Oh iya, kurs EGP ke Rupiah hari ini berapa?' },
  { role: 'aina', text: 'Checklist meluncur 📋 Kurs terbaru aku ambilkan sekalian ya. Kalau ada dokumen yang bikin bingung, foto aja — kita urus bareng-bareng.' },
];

// ============================================================
// HELPERS
// ============================================================
function getChapter(idx: number) {
  return CHAPTERS.find(c => idx >= c.start && idx <= c.end)!;
}

function getFragments(slideEl: HTMLElement): HTMLElement[] {
  return Array.from(slideEl.querySelectorAll<HTMLElement>('.fragment'));
}

// ============================================================
// SLIDE NAVIGATION
// ============================================================
function goToSlide(n: number, instant = false) {
  n = Math.max(0, Math.min(TOTAL - 1, n));
  currentSlide = n;
  fragmentIndex = -1;

  const target = SLIDES[n];

  if (!isMobile()) {
    target.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'start' });
  } else {
    target.scrollIntoView({ behavior: instant ? 'instant' : 'smooth' });
  }

  updateUI();

  // On mobile / reduced-motion: show all fragments immediately
  if (isMobile() || reducedMotion) {
    getFragments(target).forEach(f => f.classList.add('revealed'));
    fragmentIndex = getFragments(target).length - 1;
  }

  // Slide-specific behaviours
  if (n === 8) setTimeout(playChat, 700);
}

function nextSlide() {
  goToSlide(currentSlide + 1);
}
function prevSlide() {
  goToSlide(currentSlide - 1);
}

// ============================================================
// FRAGMENT SYSTEM
// ============================================================
function revealNextFragment(): boolean {
  const slide = SLIDES[currentSlide];
  const frags = getFragments(slide);

  // Find first unrevealed fragment
  const nextIdx = frags.findIndex(f => !f.classList.contains('revealed'));
  if (nextIdx === -1) return false;

  const nextFrag = frags[nextIdx];
  const group = nextFrag.dataset.fragGroup;

  if (group !== undefined) {
    // Reveal ALL fragments in this group at once
    frags.forEach((f, i) => {
      if (f.dataset.fragGroup === group) {
        f.classList.add('revealed');
        if (i > fragmentIndex) fragmentIndex = i;
      }
    });
  } else {
    nextFrag.classList.add('revealed');
    fragmentIndex = nextIdx;
  }

  // Slide 12: trigger team stagger when team-grid fragment is revealed
  if (currentSlide === 12 && nextFrag.id === 'team-grid') {
    staggerTeam();
  }

  return true;
}

function hideLastFragment(): boolean {
  if (fragmentIndex < 0) return false;
  const slide = SLIDES[currentSlide];
  const frags = getFragments(slide);

  const curFrag = frags[fragmentIndex];
  const group = curFrag?.dataset.fragGroup;

  if (group !== undefined) {
    // Hide ALL in the same group
    frags.forEach(f => {
      if (f.dataset.fragGroup === group) f.classList.remove('revealed');
    });
    // Set fragmentIndex to just before the first of this group
    const firstInGroup = frags.findIndex(f => f.dataset.fragGroup === group);
    fragmentIndex = firstInGroup - 1;
  } else {
    frags[fragmentIndex].classList.remove('revealed');
    fragmentIndex--;
  }

  return true;
}

// ============================================================
// NEXT / PREV ACTION
// ============================================================
function nextAction() {
  if (!timerStarted) startTimerClock();
  if (lightboxOpen) return;

  const hadFragment = revealNextFragment();
  if (!hadFragment) nextSlide();
}

function prevAction() {
  if (lightboxOpen) return;
  if (!hideLastFragment()) prevSlide();
}

// ============================================================
// UI UPDATES
// ============================================================
function updateUI() {
  updateProgress();
  updateDots();
  updateChapterLabel();
  updateNavScroll();
}

function updateProgress() {
  const pct = TOTAL > 1 ? (currentSlide / (TOTAL - 1)) * 100 : 0;
  progressBar.style.width = pct + '%';
}

function updateDots() {
  document.querySelectorAll<HTMLButtonElement>('[data-slide]').forEach(dot => {
    dot.classList.toggle('active', +dot.dataset.slide! === currentSlide);
  });
}

function updateChapterLabel() {
  const ch = getChapter(currentSlide);
  chapterLabel.textContent = ch.label;
}

function updateNavScroll() {
  const scrollTop = isMobile()
    ? window.scrollY
    : slidesContainer.scrollTop;
  mainNav.classList.toggle('scrolled', scrollTop > 20);
}

// ============================================================
// TIMER
// ============================================================
function startTimerClock() {
  if (timerStarted) return;
  timerStarted = true;
  timerStart = Date.now();
  timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
  if (!timerStart) return;
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${mm}:${ss} / 30:00`;
  timerEl.classList.toggle('amber', elapsed >= 25 * 60 && elapsed < 30 * 60);
  timerEl.classList.toggle('red', elapsed >= 30 * 60);
}

function toggleTimer() {
  if (!timerStarted) {
    startTimerClock();
    timerVisible = true;
    timerEl.classList.add('visible');
  } else {
    timerVisible = !timerVisible;
    timerEl.classList.toggle('visible', timerVisible);
  }
}

// ============================================================
// FULLSCREEN
// ============================================================
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (lightboxOpen) {
    handleLightboxKey(e);
    return;
  }

  // Don't intercept when user is typing in an input
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  switch (e.key) {
    case ' ':
    case 'ArrowDown':
    case 'ArrowRight':
    case 'PageDown':
      e.preventDefault();
      nextAction();
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
    case 'PageUp':
      e.preventDefault();
      prevAction();
      break;
    case 'Home':
      e.preventDefault();
      goToSlide(0);
      break;
    case 'End':
      e.preventDefault();
      goToSlide(TOTAL - 1);
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 't':
    case 'T':
      toggleTimer();
      break;
    case 'r':
    case 'R':
      if (currentSlide === 8) replayChat();
      break;
  }
});

// ============================================================
// TOUCH (swipe up/down for slide navigation on desktop)
// ============================================================
slidesContainer.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

slidesContainer.addEventListener('touchend', (e) => {
  if (isMobile()) return; // mobile uses native scroll
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dy) > 50) {
    if (dy < 0) nextAction();
    else prevAction();
  }
}, { passive: true });

// ============================================================
// CLICK TO ADVANCE
// ============================================================
SLIDES.forEach((slide, idx) => {
  slide.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // Don't advance when clicking interactive elements
    if (
      target.closest('.gallery-item') ||
      target.closest('.filter-chip') ||
      target.closest('a') ||
      target.closest('button') ||
      target.closest('.lightbox-btn')
    ) return;
    if (currentSlide === idx) nextAction();
  });
});

// ============================================================
// DOT CLICKS
// ============================================================
document.querySelectorAll<HTMLButtonElement>('[data-slide]').forEach(dot => {
  dot.addEventListener('click', () => goToSlide(+dot.dataset.slide!));
});

// ============================================================
// NAV LINK CLICKS
// ============================================================
document.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    goToSlide(+el.dataset.goto!);
  });
});

// ============================================================
// NAV SCROLL EFFECT
// ============================================================
slidesContainer.addEventListener('scroll', updateNavScroll, { passive: true });
window.addEventListener('scroll', updateNavScroll, { passive: true });

// ============================================================
// INTERSECTION OBSERVER (track active slide on desktop scroll)
// ============================================================
const slideObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
      const idx = +((entry.target as HTMLElement).dataset.idx ?? -1);
      if (idx === -1 || idx === currentSlide) return;
      currentSlide = idx;
      fragmentIndex = isMobile() ? getFragments(SLIDES[idx]).length - 1 : -1;
      updateUI();
      if (idx === 8) setTimeout(playChat, 600);
    }
  });
}, {
  root: isMobile() ? null : slidesContainer,
  threshold: 0.5,
});

SLIDES.forEach(slide => slideObserver.observe(slide));

// ============================================================
// MOBILE: IntersectionObserver for auto-revealing fragments
// ============================================================
if (isMobile() || reducedMotion) {
  const fragObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slide = entry.target as HTMLElement;
        getFragments(slide).forEach(f => f.classList.add('revealed'));
        const idx = +(slide.dataset.idx ?? -1);
        if (idx === 8) setTimeout(playChat, 600);
        if (idx === 12) staggerTeam();
      }
    });
  }, { threshold: 0.2 });

  SLIDES.forEach(slide => fragObserver.observe(slide));
}

// ============================================================
// GALLERY
// ============================================================
let currentFilter = 'all';
const galleryGrid = document.getElementById('gallery-grid')!;

function renderGallery() {
  const filtered = currentFilter === 'all'
    ? galleryPhotos
    : galleryPhotos.filter(p => p.batch === currentFilter);

  galleryGrid.innerHTML = '';
  filtered.forEach(photo => {
    const globalIdx = galleryPhotos.indexOf(photo);
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', photo.caption);
    item.innerHTML = `
      <img src="${photo.src}" alt="${photo.caption}" loading="lazy" />
      <div class="gallery-caption">${photo.caption}</div>
    `;
    item.addEventListener('click', () => openLightbox(globalIdx));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(globalIdx); }
    });
    galleryGrid.appendChild(item);
  });
}

document.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.dataset.filter!;
    renderGallery();
  });
});

// ============================================================
// LIGHTBOX
// ============================================================
const lightbox = document.getElementById('lightbox')!;
const lightboxImg = document.getElementById('lightbox-img') as HTMLImageElement;
const lightboxCaption = document.getElementById('lightbox-caption')!;

function openLightbox(idx: number) {
  lightboxIndex = idx;
  lightboxOpen = true;
  document.body.style.overflow = 'hidden';
  updateLightboxContent();
  lightbox.classList.add('open');
  lightbox.focus();
}

function closeLightbox() {
  lightboxOpen = false;
  document.body.style.overflow = '';
  lightbox.classList.remove('open');
}

function updateLightboxContent() {
  const photo = galleryPhotos[lightboxIndex];
  lightboxImg.src = photo.src;
  lightboxImg.alt = photo.caption;
  lightboxCaption.textContent = photo.caption;
}

function lightboxNext() {
  lightboxIndex = (lightboxIndex + 1) % galleryPhotos.length;
  updateLightboxContent();
}
function lightboxPrev() {
  lightboxIndex = (lightboxIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  updateLightboxContent();
}

function handleLightboxKey(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowRight': e.preventDefault(); lightboxNext(); break;
    case 'ArrowLeft':  e.preventDefault(); lightboxPrev(); break;
    case 'Escape':     closeLightbox(); break;
  }
}

document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
document.getElementById('lightbox-next')?.addEventListener('click', lightboxNext);
document.getElementById('lightbox-prev')?.addEventListener('click', lightboxPrev);

lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Swipe in lightbox
lightbox.addEventListener('touchstart', (e) => { lbTouchX = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
  const dx = e.changedTouches[0].clientX - lbTouchX;
  if (Math.abs(dx) > 50) dx > 0 ? lightboxPrev() : lightboxNext();
}, { passive: true });

// ============================================================
// CHAT ANIMATION
// ============================================================
const chatMessages = document.getElementById('chat-messages');
let chatPlaying = false;

function clearChatTimeouts() {
  chatTimeouts.forEach(t => clearTimeout(t));
  chatTimeouts = [];
}

function playChat() {
  if (!chatMessages) return;
  clearChatTimeouts();
  chatMessages.innerHTML = '';
  chatPlaying = true;

  let delay = 500;
  CHAT_SCRIPT.forEach(msg => {
    // Show typing indicator
    const t1 = setTimeout(() => {
      if (!chatMessages) return;
      const typing = document.createElement('div');
      typing.className = `chat-bubble ${msg.role} typing-indicator`;
      typing.id = 'typing-temp';
      typing.innerHTML = '<span></span><span></span><span></span>';
      chatMessages.appendChild(typing);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, delay);
    chatTimeouts.push(t1);
    delay += 900;

    // Replace with actual bubble
    const t2 = setTimeout(() => {
      if (!chatMessages) return;
      document.getElementById('typing-temp')?.remove();
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${msg.role}`;
      bubble.textContent = msg.text;
      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, delay);
    chatTimeouts.push(t2);
    delay += 500;
  });
}

function replayChat() {
  playChat();
}

// ============================================================
// TEAM STAGGER
// ============================================================
function staggerTeam() {
  if (teamStaggerDone && !reducedMotion) return;
  teamStaggerDone = true;
  const avatars = document.querySelectorAll<HTMLElement>('.team-avatar');
  if (reducedMotion) {
    avatars.forEach(a => a.classList.add('visible'));
    return;
  }
  avatars.forEach((avatar, i) => {
    setTimeout(() => avatar.classList.add('visible'), i * 60);
  });
}

// ============================================================
// FRAGMENT PAIRING (curriculum & feature slides)
// Slides 8 (curriculum) and 11 (features) use data-frag-group
// to pair consecutive fragments. The reveal logic already
// handles this via the data-frag-group attribute.
// ============================================================

// ============================================================
// INIT
// ============================================================
renderGallery();

// Set initial slide without animation
goToSlide(0, true);

// Make slide 10 chat start automatically when visible via observer
// (handled by the IntersectionObserver above)
