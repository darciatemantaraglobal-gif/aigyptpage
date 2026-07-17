// ============================================================
// AIGYPT × AINA — main.ts v7 (Fix Round)
// ============================================================
import './style.css';

// ── CONSTANTS ────────────────────────────────────────────────
const SLIDE_TIMES = [2,1,2,2,1,3,2,2,2,1,4,3,2,1,2,2]; // ±N per slide (index matches data-idx)

const CHAPTERS: { start: number; end: number; label: string }[] = [
  { start: 0,  end: 3,  label: 'BAB 1 · CERITA KITA' },
  { start: 4,  end: 8,  label: 'BAB 2 · AIGYPT' },
  { start: 9,  end: 13, label: 'BAB 3 · AINA' },
  { start: 14, end: 15, label: 'BAB 4 · AJAKAN' },
];

const GALLERY_PHOTOS = [
  { src: 'images/batch-0-kelas.jpg',     caption: 'Batch 0 · Kelas perdana',     batch: 'batch-0' },
  { src: 'images/batch-0-ruangan.jpg',   caption: 'Batch 0 · Ruangan penuh',     batch: 'batch-0' },
  { src: 'images/batch-1-aula.jpg',      caption: 'Batch 1 · Aula penuh',        batch: 'batch-1' },
  { src: 'images/batch-1-komunitas.jpg', caption: 'Batch 1 · Komunitas',         batch: 'batch-1' },
  { src: 'images/batch-1-tim.jpg',       caption: 'Batch 1 · Tim inti',          batch: 'batch-1' },
  { src: 'images/batch-3-kelas.jpg',     caption: 'Batch 3 · Sesi kelas',        batch: 'batch-3' },
  { src: 'images/batch-3-mentoring.jpg', caption: 'Batch 3 · Mentoring',         batch: 'batch-3' },
  { src: 'images/batch-3-demoday.jpg',   caption: 'Batch 3 · Platform & Demo Day', batch: 'batch-3' },
];

// Fix #6: Haikal → rifki.jpg, Atila → naadir.jpg (names unchanged)
const TEAM_GROUPS: { role: string; members: { file: string; name: string }[] }[] = [
  { role: 'Founder',          members: [ {file:'daru.jpg',   name:'Daru'} ] },
  { role: 'Ketua AINA',       members: [ {file:'maliki.jpg', name:'Maliki'}, {file:'fairuz.jpg', name:'Fairuz'} ] },
  { role: 'External Lead',    members: [ {file:'ariqq.jpg',  name:'Ariqq'},  {file:'rifki.jpg',  name:'Haikal'} ] },
  { role: 'Assist Developer', members: [ {file:'ilham.jpg',  name:'Ilham'},  {file:'naadir.jpg', name:'Atila'} ] },
  { role: 'Administrasi',     members: [ {file:'okto.jpg',   name:'Okto'},   {file:'azriel.jpg', name:'Azriel'} ] },
  { role: 'Media',            members: [ {file:'arnaf.png',  name:'Arnaf'},  {file:'navis.jpg',  name:'Navis'} ] },
];

// Fix #4: remove emojis from chat messages; fix em dash
const CHAT_MESSAGES = [
  { role: 'user', text: 'AINA, cara urus iqomah pertama kali gimana ya?' },
  { role: 'aina', text: 'Santai, aku pandu ya. Siapkan paspor, foto, dan formulir dari kampus. Mau aku buatin checklist urutannya?' },
  { role: 'user', text: 'Mau banget! Kurs EGP ke Rupiah hari ini berapa?' },
  { role: 'aina', text: 'Checklist meluncur! Kurs terbaru aku ambilkan sekalian. Bingung soal dokumen? Foto aja, kita urus bareng.' },
];

// ── STATE ─────────────────────────────────────────────────────
const SLIDES = Array.from(document.querySelectorAll<HTMLElement>('.slide'));
const TOTAL  = SLIDES.length;

let currentSlide = 0;
let hudVisible   = false;
let timerRunning = false;
let timerStart   = 0;
let timerInterval: ReturnType<typeof setInterval> | null = null;
let lightboxIdx  = 0;
let lightboxOpen = false;
let activeCascadeTimers: ReturnType<typeof setTimeout>[] = [];
let chatPlaying  = false;
let galleryFilter = 'all';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => window.innerWidth < 768;

// ── DOM REFS ──────────────────────────────────────────────────
const progressBar   = document.getElementById('progress-bar')!;
const chapterLabel  = document.getElementById('chapter-label')!;
const hud           = document.getElementById('hud')!;
const timerEl       = document.getElementById('timer')!;
const slideTimeEl   = document.getElementById('slide-time')!;
const dotsContainer = document.getElementById('dots')!;
const allDots       = Array.from(dotsContainer.querySelectorAll<HTMLButtonElement>('.dot'));
const galleryGrid   = document.getElementById('gallery-grid')!;
const filterBtns    = Array.from(document.querySelectorAll<HTMLButtonElement>('.filter-chip'));
const lightbox      = document.getElementById('lightbox')!;
const lbImg         = document.getElementById('lb-img') as HTMLImageElement;
const lbCaption     = document.getElementById('lb-caption')!;
const lbClose       = document.getElementById('lb-close')!;
const lbPrev        = document.getElementById('lb-prev')!;
const lbNext        = document.getElementById('lb-next')!;
const chatBody      = document.getElementById('chat-body')!;
const teamGrid      = document.getElementById('team-grid')!;
const slidesContainer = document.getElementById('slides-container')!;
const nav           = document.getElementById('main-nav')!;

// ── UTILITIES ─────────────────────────────────────────────────
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// ── CASCADE SYSTEM ────────────────────────────────────────────
function clearCascadeTimers() {
  activeCascadeTimers.forEach(t => clearTimeout(t));
  activeCascadeTimers = [];
}

function resetCascade(slide: HTMLElement) {
  slide.querySelectorAll<HTMLElement>('.ci').forEach(el => {
    el.classList.remove('on');
  });
}

function playCascade(slide: HTMLElement, instant = false) {
  clearCascadeTimers();
  resetCascade(slide);

  const items = Array.from(slide.querySelectorAll<HTMLElement>('.ci'));
  const baseDelay = +(slide.dataset.delay ?? '400');

  if (instant || reducedMotion || isMobile()) {
    items.forEach(el => {
      el.classList.add('on');
      handleTrigger(el, slide, true);
    });
    return;
  }

  items.forEach((el, i) => {
    const t = setTimeout(() => {
      el.classList.add('on');
      handleTrigger(el, slide, false);
    }, i * baseDelay + 150);
    activeCascadeTimers.push(t);
  });
}

function handleTrigger(el: HTMLElement, slide: HTMLElement, instant: boolean) {
  const trigger = el.dataset.trigger;
  if (!trigger) return;
  if (trigger === 'chat') {
    if (instant) {
      // Show all bubbles instantly
      chatBody.innerHTML = '';
      CHAT_MESSAGES.forEach(m => {
        const b = document.createElement('div');
        b.className = `chat-bubble ${m.role}`;
        b.textContent = m.text;
        chatBody.appendChild(b);
      });
      chatBody.scrollTop = chatBody.scrollHeight;
    } else {
      setTimeout(() => playChat(), 300);
    }
  }
  if (trigger === 'team') {
    if (instant) {
      teamGrid.querySelectorAll<HTMLElement>('.division-box').forEach(box => {
        box.style.transition = 'none';
        box.style.opacity = '1';
        box.style.transform = 'translateY(0)';
      });
    } else {
      staggerTeam();
    }
  }
}

// ── GALLERY ────────────────────────────────────────────────────
// Fix #1: render DOM (no lazy loading), don't re-render on slide entry
function renderGallery(filter: string, animate = true) {
  const photos = filter === 'all' ? GALLERY_PHOTOS : GALLERY_PHOTOS.filter(p => p.batch === filter);
  galleryGrid.innerHTML = '';

  photos.forEach((photo, i) => {
    const figure = document.createElement('figure');
    figure.className = 'gallery-tile';
    figure.setAttribute('role', 'listitem');
    figure.setAttribute('tabindex', '0');
    figure.setAttribute('aria-label', photo.caption);

    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.caption;
    // No loading="lazy" — images are preloaded at init

    const caption = document.createElement('figcaption');
    caption.textContent = photo.caption;

    figure.appendChild(img);
    figure.appendChild(caption);
    galleryGrid.appendChild(figure);

    // Click/Enter opens lightbox
    const openLb = () => openLightbox(GALLERY_PHOTOS.indexOf(photo));
    figure.addEventListener('click', openLb);
    figure.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(); } });

    // Stagger cascade for gallery tiles — first tile at 0ms, stagger 80ms
    if (animate && !reducedMotion && !isMobile()) {
      figure.style.opacity = '0';
      figure.style.transform = 'scale(0.95)';
      const t = setTimeout(() => {
        figure.style.transition = 'opacity 350ms ease, transform 350ms ease';
        figure.style.opacity = '1';
        figure.style.transform = 'scale(1)';
      }, i * 80);
      activeCascadeTimers.push(t);
    }
  });
}

// ── CHAT ───────────────────────────────────────────────────────
function playChat() {
  if (chatPlaying) return;
  chatPlaying = true;
  chatBody.innerHTML = '';

  const playMessage = (idx: number) => {
    if (idx >= CHAT_MESSAGES.length) { chatPlaying = false; return; }

    // Typing indicator
    const typing = document.createElement('div');
    typing.className = 'chat-typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;

    const t = setTimeout(() => {
      typing.remove();
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${CHAT_MESSAGES[idx].role}`;
      bubble.textContent = CHAT_MESSAGES[idx].text;
      chatBody.appendChild(bubble);
      chatBody.scrollTop = chatBody.scrollHeight;
      activeCascadeTimers.push(setTimeout(() => playMessage(idx + 1), 900));
    }, 900);
    activeCascadeTimers.push(t);
  };

  playMessage(0);
}

function replayChat() {
  chatPlaying = false;
  clearCascadeTimers();
  chatBody.innerHTML = '';
  playCascade(SLIDES[10]);
}

// ── TEAM GRID ──────────────────────────────────────────────────
// Fix #5: all 6 boxes in a 3×2 flat grid; Founder is normal item at position 0
function buildDivisionBox(group: { role: string; members: { file: string; name: string }[] }, isFounder: boolean): HTMLElement {
  const box = document.createElement('div');
  box.className = `division-box${isFounder ? ' founder-box' : ''}`;
  box.style.opacity = '0';
  box.style.transform = 'translateY(16px)';

  const roleEl = document.createElement('p');
  roleEl.className = 'division-role';
  roleEl.textContent = group.role;
  box.appendChild(roleEl);

  const membersEl = document.createElement('div');
  membersEl.className = 'division-members';

  group.members.forEach(member => {
    const memberEl = document.createElement('div');
    memberEl.className = 'division-member';
    // Fix #5: Founder 96px, others 84px
    const avatarSize = isFounder ? 96 : 84;

    const img = document.createElement('img');
    img.src = `images/team/${member.file}`;
    img.alt = member.name;
    img.className = 'division-avatar-img';
    img.style.width = `${avatarSize}px`;
    img.style.height = `${avatarSize}px`;

    const fallback = document.createElement('div');
    fallback.className = 'division-avatar-fallback';
    fallback.style.width = `${avatarSize}px`;
    fallback.style.height = `${avatarSize}px`;
    fallback.style.display = 'none';
    fallback.textContent = member.name.charAt(0).toUpperCase();

    img.onerror = () => {
      img.style.display = 'none';
      fallback.style.display = 'flex';
    };

    const nameEl = document.createElement('p');
    nameEl.className = 'division-member-name';
    nameEl.textContent = member.name;

    memberEl.appendChild(img);
    memberEl.appendChild(fallback);
    memberEl.appendChild(nameEl);
    membersEl.appendChild(memberEl);
  });

  box.appendChild(membersEl);
  return box;
}

function buildTeamGrid() {
  teamGrid.innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'team-box-grid';
  TEAM_GROUPS.forEach((group, i) => {
    grid.appendChild(buildDivisionBox(group, i === 0));
  });
  teamGrid.appendChild(grid);
}

function staggerTeam() {
  const boxes = Array.from(teamGrid.querySelectorAll<HTMLElement>('.division-box'));
  boxes.forEach((box, i) => {
    const t = setTimeout(() => {
      box.style.transition = 'opacity 320ms ease, transform 320ms ease';
      box.style.opacity = '1';
      box.style.transform = 'translateY(0)';
    }, i * 100);
    activeCascadeTimers.push(t);
  });
}

// ── NAVIGATION ────────────────────────────────────────────────
function goToSlide(n: number, replay = false) {
  const target = clamp(n, 0, TOTAL - 1);
  if (target === currentSlide && !replay) return;

  // Reset cascade on leaving slide (unless replaying)
  if (!replay) resetCascade(SLIDES[currentSlide]);
  currentSlide = target;

  // Reset chat state when leaving slide 10
  chatPlaying = false;

  // Scroll slide into view
  SLIDES[currentSlide].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });

  updateUI();

  // Fix #1: gallery DOM rendered on init; no re-render on slide entry.
  // Only re-render when filter changes (handled by filter click listener).

  // Play cascade
  playCascade(SLIDES[currentSlide], reducedMotion || isMobile());

  // Stagger-reveal question cards on slide 11
  if (currentSlide === 11) revealQuestionCards();
  else resetQuestionCards();

  // Start presenter timer on first advance
  if (!timerRunning && !replay) startTimer();
}

function replayCurrentSlide() {
  chatPlaying = false;
  if (currentSlide === 7) {
    renderGallery(galleryFilter, !reducedMotion && !isMobile());
  }
  playCascade(SLIDES[currentSlide]);
  if (currentSlide === 11) revealQuestionCards();
}

// ── QUESTION CARD STAGGER (slide 11) ─────────────────────────
let qCardTimers: ReturnType<typeof setTimeout>[] = [];

function resetQuestionCards() {
  qCardTimers.forEach(clearTimeout);
  qCardTimers = [];
  document.querySelectorAll<HTMLElement>('.question-card').forEach(c => {
    c.classList.remove('card-hidden', 'card-active');
  });
}

function revealQuestionCards() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.question-card'));
  // Instantly arm all cards as hidden
  cards.forEach(c => { c.classList.remove('card-active'); c.classList.add('card-hidden'); });

  qCardTimers.forEach(clearTimeout);
  qCardTimers = [];

  // Stagger reveal: each card slides in 200ms apart, starting after cascade
  cards.forEach((card, i) => {
    const t1 = setTimeout(() => {
      card.classList.remove('card-hidden');
      card.classList.add('card-active');
    }, 500 + i * 200);

    // Remove highlight after a beat, leaving card visible
    const t2 = setTimeout(() => {
      card.classList.remove('card-active');
    }, 500 + i * 200 + 600);

    qCardTimers.push(t1, t2);
  });
}

// ── UI UPDATES ────────────────────────────────────────────────
function updateUI() {
  updateProgress();
  updateDots();
  updateChapterLabel();
  updateSlideTime();
}

function updateProgress() {
  progressBar.style.width = `${((currentSlide) / (TOTAL - 1)) * 100}%`;
}

function updateDots() {
  allDots.forEach(dot => {
    const idx = +(dot.dataset.slide ?? -1);
    dot.classList.toggle('active', idx === currentSlide);
  });
}

function updateChapterLabel() {
  const chapter = CHAPTERS.find(c => currentSlide >= c.start && currentSlide <= c.end);
  if (chapter) chapterLabel.textContent = chapter.label;
  else chapterLabel.textContent = '';
}

function updateSlideTime() {
  const t = SLIDE_TIMES[currentSlide] ?? 1;
  slideTimeEl.textContent = `±${t} MENIT`;
}

// ── TIMER ─────────────────────────────────────────────────────
function startTimer() {
  timerRunning = true;
  timerStart   = Date.now();
  timerInterval = setInterval(tickTimer, 500);
}

function tickTimer() {
  const elapsed = Math.floor((Date.now() - timerStart) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s} / 30:00`;
  timerEl.classList.toggle('amber', elapsed >= 25 * 60 && elapsed < 30 * 60);
  timerEl.classList.toggle('red',   elapsed >= 30 * 60);
}

function toggleHud() {
  hudVisible = !hudVisible;
  hud.classList.toggle('visible', hudVisible);
  if (hudVisible && !timerRunning) startTimer();
}

// ── KEYBOARD ─────────────────────────────────────────────────
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (lightboxOpen) {
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': lbNavigate(1); break;
      case 'ArrowLeft':  case 'ArrowUp':   lbNavigate(-1); break;
      case 'Escape': closeLightbox(); break;
    }
    return;
  }

  switch (e.key) {
    case ' ':
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      goToSlide(currentSlide + 1);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      goToSlide(currentSlide - 1);
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
      toggleHud();
      break;
    case 'r':
    case 'R':
      replayCurrentSlide();
      break;
  }
});

// Click on slides-container advances
slidesContainer.addEventListener('click', (e: MouseEvent) => {
  if (lightboxOpen) return;
  const target = e.target as HTMLElement;
  // Don't advance if clicking interactive elements
  if (
    target.closest('button') ||
    target.closest('a') ||
    target.closest('.gallery-tile') ||
    target.closest('.filter-chip') ||
    target.closest('#chat-mockup')
  ) return;
  goToSlide(currentSlide + 1);
});

// ── FULLSCREEN ────────────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// ── NAV LINKS ─────────────────────────────────────────────────
document.querySelectorAll<HTMLElement>('[data-goto]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    const idx = +(el.dataset.goto ?? 0);
    goToSlide(idx);
  });
});

dotsContainer.querySelectorAll<HTMLButtonElement>('.dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const idx = +(dot.dataset.slide ?? 0);
    goToSlide(idx);
  });
});

// Scroll-based nav hairline
slidesContainer.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', slidesContainer.scrollTop > 10);
});

// ── NAV HIDE & SEEK ───────────────────────────────────────────
// Auto-hides after 3s of inactivity; reappears on mouse near top
// or any keyboard interaction, then hides again after 3s.
let navHideTimer: ReturnType<typeof setTimeout>;

function showNav() {
  nav.classList.remove('nav-hidden');
  clearTimeout(navHideTimer);
  navHideTimer = setTimeout(() => nav.classList.add('nav-hidden'), 3000);
}

// Trigger zone: top 80px of screen reveals navbar
document.addEventListener('mousemove', (e: MouseEvent) => {
  if (e.clientY < 80) {
    showNav();
  }
});

// Any key interaction also briefly reveals it
document.addEventListener('keydown', showNav, { capture: true });

// Start the first hide timer after 3s on load
navHideTimer = setTimeout(() => nav.classList.add('nav-hidden'), 3000);

// ── GALLERY FILTERS ───────────────────────────────────────────
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    galleryFilter = btn.dataset.filter ?? 'all';
    renderGallery(galleryFilter, !reducedMotion && !isMobile());
  });
});

// ── LIGHTBOX ──────────────────────────────────────────────────
function openLightbox(idx: number) {
  lightboxIdx = idx;
  lightboxOpen = true;
  lightbox.removeAttribute('hidden');
  showLightboxPhoto(idx);
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxOpen = false;
  lightbox.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

function showLightboxPhoto(idx: number) {
  const p = GALLERY_PHOTOS[idx];
  if (!p) return;
  lbImg.src = p.src;
  lbImg.alt = p.caption;
  lbCaption.textContent = p.caption;
}

function lbNavigate(dir: number) {
  lightboxIdx = (lightboxIdx + dir + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length;
  showLightboxPhoto(lightboxIdx);
}

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => lbNavigate(-1));
lbNext.addEventListener('click', () => lbNavigate(1));

// Swipe support for lightbox
let lbTouchStart = 0;
lightbox.addEventListener('touchstart', e => { lbTouchStart = e.touches[0].clientX; }, { passive: true });
lightbox.addEventListener('touchend', e => {
  const dx = lbTouchStart - e.changedTouches[0].clientX;
  if (Math.abs(dx) > 40) lbNavigate(dx > 0 ? 1 : -1);
});

// ── INTERSECTION OBSERVER (desktop slide tracking + mobile) ──
const slideObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const idx = +(( entry.target as HTMLElement).dataset.idx ?? -1);
    if (idx === -1 || idx === currentSlide) return;
    currentSlide = idx;
    updateUI();
    if (!isMobile()) playCascade(SLIDES[idx]);
    // Fix #1: gallery DOM already rendered at init; no re-render on scroll
  });
}, {
  root: isMobile() ? null : slidesContainer,
  threshold: 0.55,
});

SLIDES.forEach(slide => slideObserver.observe(slide));

// Mobile: show content immediately as slides scroll into view
if (isMobile()) {
  const mobileObs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const slide = entry.target as HTMLElement;
        slide.querySelectorAll<HTMLElement>('.ci').forEach(el => el.classList.add('on'));
        const idx = +(slide.dataset.idx ?? -1);
        // Fix #1: gallery already rendered at init; no re-render needed
        if (idx === 10) {
          chatBody.innerHTML = '';
          CHAT_MESSAGES.forEach(m => {
            const b = document.createElement('div');
            b.className = `chat-bubble ${m.role}`;
            b.textContent = m.text;
            chatBody.appendChild(b);
          });
        }
        if (idx === 14) {
          teamGrid.querySelectorAll<HTMLElement>('.division-box').forEach(box => {
            box.style.transition = 'none';
            box.style.opacity = '1';
            box.style.transform = 'translateY(0)';
          });
        }
      }
    });
  }, { threshold: 0.15 });

  SLIDES.forEach(slide => mobileObs.observe(slide));
}

// ── INIT ──────────────────────────────────────────────────────
buildTeamGrid();

// Fix #1: render gallery DOM on page load (animate=false → tiles immediately visible)
renderGallery('all', false);

// Fix #1: preload all gallery images right after first paint
requestAnimationFrame(() => {
  GALLERY_PHOTOS.forEach(p => { const img = new Image(); img.src = p.src; });
});

// Kick off cascade for slide 0
updateUI();
playCascade(SLIDES[0], reducedMotion || isMobile());
