/**
 * Konfigurasi & Logika Interaktif Undangan Ulang Tahun Ikram (12 Oktober)
 * Fokus ujian lisan:
 * 1. Parameter URL (?to=Nama+Tamu) menggunakan URLSearchParams
 * 2. DOM Manipulasi RSVP & Buku Tamu persisten dengan localStorage
 * 3. Kontrol Audio (auto-play saat Buka Undangan + Floating Toggle)
 */

const EVENT_CONFIG = {
  title: 'Ulang Tahun Ikram',
  // Tanggal target dibuat di masa depan agar countdown berjalan real-time
  targetIso: '2027-10-12T19:00:00+07:00',
  endIso: '2027-10-12T22:00:00+07:00',
  location: 'Ruang Tengah Coffee & Vinyl, Jl. Kemang Raya No. 42, Jakarta Selatan',
  description: 'Malam akustik dan makan malam hangat merayakan ulang tahun Ikram.',
  storageKey: 'ikram_birthday_rsvp_v1',
};

/* =========================================================
   1. LOGIKA PARAMETER URL (?to=Nama+Tamu)
   ========================================================= */
function initGuestFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawGuest = params.get('to');
  const guestName = rawGuest && rawGuest.trim() ? rawGuest.trim() : 'Sahabat Terdekat';

  const coverGuestEl = document.getElementById('guest-name');
  if (coverGuestEl) {
    coverGuestEl.textContent = guestName;
  }

  // Prefill nama tamu pada form RSVP jika berasal dari parameter URL
  const rsvpNameInput = document.getElementById('rsvp-name');
  if (rsvpNameInput && rawGuest && rawGuest.trim()) {
    rsvpNameInput.value = guestName;
  }
}

/* =========================================================
   2. SAMPUL UNDANGAN (HERO COVER) & KONTROL AUDIO
   ========================================================= */
function initCoverAndAudio() {
  const coverEl = document.getElementById('cover');
  const openBtn = document.getElementById('open-invitation-btn');
  const mainEl = document.getElementById('main-content');
  const audioEl = document.getElementById('bg-music');
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  const audioLabelEl = document.getElementById('audio-label');

  // Kunci scroll saat sampul masih tertutup
  document.body.classList.add('is-locked');

  function updateAudioUI(isPlaying) {
    if (!audioToggleBtn || !audioLabelEl) return;
    audioToggleBtn.setAttribute('aria-pressed', String(isPlaying));
    audioToggleBtn.setAttribute('aria-label', isPlaying ? 'Jeda musik latar' : 'Putar musik latar');
    audioLabelEl.textContent = isPlaying ? 'High and Dry · Putar' : 'Musik Dijeda';
  }

  async function tryPlayAudio() {
    if (!audioEl) return;
    try {
      await audioEl.play();
      updateAudioUI(true);
    } catch {
      updateAudioUI(false);
    }
  }

  if (openBtn && coverEl) {
    openBtn.addEventListener('click', () => {
      coverEl.classList.add('is-opened');
      coverEl.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('is-locked');

      // Putar musik otomatis saat tombol Buka Undangan diklik
      tryPlayAudio();

      if (mainEl) {
        mainEl.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  if (audioToggleBtn && audioEl) {
    audioToggleBtn.addEventListener('click', async () => {
      if (audioEl.paused) {
        await tryPlayAudio();
      } else {
        audioEl.pause();
        updateAudioUI(false);
      }
    });
  }
}

/* =========================================================
   3. COUNTDOWN TIMER REAL-TIME & KALENDER (.ics + Google)
   ========================================================= */
function initCountdownAndCalendar() {
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  const targetMs = new Date(EVENT_CONFIG.targetIso).getTime();

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function updateCountdown() {
    const diff = Math.max(0, targetMs - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    if (daysEl) daysEl.textContent = pad(days);
    if (hoursEl) hoursEl.textContent = pad(hours);
    if (minutesEl) minutesEl.textContent = pad(minutes);
    if (secondsEl) secondsEl.textContent = pad(seconds);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Format tanggal UTC untuk Google Calendar & ICS (YYYYMMDDTHHMMSSZ)
  function toCalendarUtc(iso) {
    return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  const startUtc = toCalendarUtc(EVENT_CONFIG.targetIso);
  const endUtc = toCalendarUtc(EVENT_CONFIG.endIso);

  const gcalLink = document.getElementById('gcal-link');
  if (gcalLink) {
    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', EVENT_CONFIG.title);
    url.searchParams.set('dates', `${startUtc}/${endUtc}`);
    url.searchParams.set('details', EVENT_CONFIG.description);
    url.searchParams.set('location', EVENT_CONFIG.location);
    gcalLink.href = url.toString();
  }

  const icsBtn = document.getElementById('ics-download-btn');
  if (icsBtn) {
    icsBtn.addEventListener('click', () => {
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Undangan Digital Ikram//ID',
        'BEGIN:VEVENT',
        `UID:ikram-bday-12okt@undangan.local`,
        `DTSTAMP:${toCalendarUtc(new Date().toISOString())}`,
        `DTSTART:${startUtc}`,
        `DTEND:${endUtc}`,
        `SUMMARY:${EVENT_CONFIG.title}`,
        `DESCRIPTION:${EVENT_CONFIG.description}`,
        `LOCATION:${EVENT_CONFIG.location}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'ulang-tahun-ikram-12-oktober.ics';
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      showToast('File kalender (.ics) berhasil diunduh.');
    });
  }
}

/* =========================================================
   4. COPY TO CLIPBOARD (Invoker Commands + Fallback + Toast)
   ========================================================= */
let toastTimer;
function showToast(message) {
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('is-visible');
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 2600);
}

function initCopyButtons() {
  const buttonTimers = new WeakMap();
  let lastAnnouncement = '';

  function legacyCopy(text) {
    const previousFocus = document.activeElement;
    const field = Object.assign(document.createElement('textarea'), { value: text });
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;inset-block-start:0;opacity:0';
    document.body.append(field);
    field.select();
    try {
      return document.execCommand('copy');
    } finally {
      field.remove();
      previousFocus?.focus({ preventScroll: true });
    }
  }

  function reportCopy(button, ok) {
    const tip = button.nextElementSibling;
    clearTimeout(buttonTimers.get(button));
    button.removeAttribute('data-copied');
    button.removeAttribute('data-failed');

    let message = ok ? 'Tersalin' : 'Gagal menyalin';
    if (message === lastAnnouncement) message += '\u00A0';
    lastAnnouncement = message;

    if (tip) tip.textContent = '';
    void button.offsetWidth;
    button.setAttribute(ok ? 'data-copied' : 'data-failed', '');
    if (tip) {
      requestAnimationFrame(() => {
        tip.textContent = message;
      });
    }

    showToast(ok ? 'Berhasil disalin ke clipboard.' : 'Gagal menyalin. Salin manual ya.');

    buttonTimers.set(
      button,
      setTimeout(() => {
        button.removeAttribute('data-copied');
        button.removeAttribute('data-failed');
        if (tip) tip.textContent = '';
      }, 2000),
    );
  }

  async function copyTarget(button, target) {
    const text = target.matches('input, textarea') ? target.value : target.innerText.trim();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      reportCopy(button, true);
    } catch {
      const ok = legacyCopy(text);
      reportCopy(button, ok);
    }
  }

  // Gunakan Invoker Commands jika didukung browser, atau click fallback jika belum
  if ('CommandEvent' in window) {
    document.addEventListener(
      'command',
      (event) => {
        if (event.command === '--copy' && event.source && event.target) {
          copyTarget(event.source, event.target);
        }
      },
      true,
    );
  } else {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      const button = event.target.closest('button[command="--copy"]');
      if (!button) return;
      const target = document.getElementById(button.getAttribute('commandfor'));
      if (target) copyTarget(button, target);
    });
  }
}

/* =========================================================
   5. DOM MANIPULASI RSVP & BUKU TAMU (localStorage)
   ========================================================= */
function initRsvpAndGuestbook() {
  const form = document.getElementById('rsvp-form');
  const nameInput = document.getElementById('rsvp-name');
  const messageInput = document.getElementById('rsvp-message');
  const feedbackEl = document.getElementById('rsvp-feedback');
  const listEl = document.getElementById('guestbook-list');
  const countHadirEl = document.getElementById('count-hadir');
  const countTidakEl = document.getElementById('count-tidak');

  const defaultEntries = [
    {
      name: 'Raka Pratama',
      status: 'Hadir',
      message: 'Selamat ulang tahun Ikram! Semoga panjang umur, sehat selalu, dan makin jago main gitarnya.',
      createdAt: 'Baru saja',
    },
    {
      name: 'Nadia Kusuma',
      status: 'Hadir',
      message: 'Sampai ketemu tanggal 12 Oktober di Kemang ya, Ikram!',
      createdAt: 'Kemarin',
    },
  ];

  function loadEntries() {
    try {
      const raw = localStorage.getItem(EVENT_CONFIG.storageKey);
      if (!raw) return defaultEntries;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultEntries;
    } catch {
      return defaultEntries;
    }
  }

  function saveEntries(entries) {
    try {
      localStorage.setItem(EVENT_CONFIG.storageKey, JSON.stringify(entries));
    } catch {
      // Abaikan jika storage penuh / mode privat membatasi
    }
  }

  function renderGuestbook(entries) {
    if (!listEl) return;

    let hadirCount = 0;
    let tidakCount = 0;

    const items = entries.map((entry) => {
      if (entry.status === 'Hadir') hadirCount += 1;
      else tidakCount += 1;

      const li = document.createElement('li');
      li.className = 'guestbook-item';

      const head = document.createElement('div');
      head.className = 'guestbook-item-head';

      const author = document.createElement('span');
      author.className = 'guestbook-author';
      author.textContent = entry.name;

      const badge = document.createElement('span');
      badge.className = `guestbook-status ${entry.status === 'Hadir' ? 'is-hadir' : 'is-tidak'}`;
      badge.textContent = entry.status;

      head.append(author, badge);

      const msg = document.createElement('p');
      msg.className = 'guestbook-message';
      msg.textContent = entry.message;

      const time = document.createElement('span');
      time.className = 'guestbook-time';
      time.textContent = entry.createdAt;

      li.append(head, msg, time);
      return li;
    });

    // Atomic DOM update dengan replaceChildren()
    listEl.replaceChildren(...items);
    if (countHadirEl) countHadirEl.textContent = String(hadirCount);
    if (countTidakEl) countTidakEl.textContent = String(tidakCount);
  }

  let entries = loadEntries();
  renderGuestbook(entries);

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const name = nameInput?.value.trim() ?? '';
      const statusInput = form.querySelector('input[name="attendance"]:checked');
      const status = statusInput ? statusInput.value : 'Hadir';
      const message = messageInput?.value.trim() ?? '';

      if (!name || !message) {
        if (feedbackEl) {
          feedbackEl.textContent = 'Mohon lengkapi nama tamu dan ucapan terlebih dahulu.';
          feedbackEl.classList.add('is-error');
        }
        return;
      }

      const nowLabel = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date());

      const newEntry = {
        name,
        status,
        message,
        createdAt: nowLabel,
      };

      entries = [newEntry, ...entries];
      saveEntries(entries);
      renderGuestbook(entries);

      if (messageInput) messageInput.value = '';
      if (feedbackEl) {
        feedbackEl.classList.remove('is-error');
        feedbackEl.textContent = 'Terima kasih! Konfirmasi dan ucapanmu sudah tersimpan.';
      }
      showToast('Ucapan berhasil dikirim ke buku tamu.');
    });
  }
}

/* =========================================================
   6. FALLBACK SCROLL ANIMATION (IntersectionObserver)
   ========================================================= */
function initScrollRevealFallback() {
  const supportsViewTimeline = CSS.supports('(animation-timeline: view()) and (animation-range: entry)');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (supportsViewTimeline || prefersReduced) return;

  const targets = document.querySelectorAll('.reveal-on-scroll');
  targets.forEach((el) => el.classList.add('is-pending'));

  const observer = new IntersectionObserver(
    (entries, obs) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('is-pending');
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15 },
  );

  targets.forEach((el) => observer.observe(el));
}

/* =========================================================
   INISIALISASI APLIKASI
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
  initGuestFromUrl();
  initCoverAndAudio();
  initCountdownAndCalendar();
  initCopyButtons();
  initRsvpAndGuestbook();
  initScrollRevealFallback();
});
