const TARGET_ISO = '2027-10-12T19:00:00+07:00';
const END_ISO = '2027-10-12T22:00:00+07:00';
const STORAGE_KEY = 'ikram_birthday_rsvp_v1';

// 1. Baca Parameter URL (?to=Nama+Tamu)
const params = new URLSearchParams(window.location.search);
const guestFromUrl = params.get('to')?.trim();
if (guestFromUrl) {
  document.getElementById('guest-name').textContent = guestFromUrl;
  document.getElementById('rsvp-name').value = guestFromUrl;
}

// 2. Sampul Undangan & Kontrol Audio
const cover = document.getElementById('cover');
const openBtn = document.getElementById('open-btn');
const audio = document.getElementById('bg-music');
const audioBtn = document.getElementById('audio-btn');

document.body.classList.add('is-locked');

function syncAudioBtn(isPlaying) {
  audioBtn.setAttribute('aria-pressed', String(isPlaying));
  audioBtn.textContent = isPlaying ? 'Jeda Musik' : 'Putar Musik';
}

async function playMusic() {
  try {
    await audio.play();
    syncAudioBtn(true);
  } catch {
    syncAudioBtn(false);
  }
}

openBtn.addEventListener('click', () => {
  cover.classList.add('is-opened');
  document.body.classList.remove('is-locked');
  playMusic();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

audioBtn.addEventListener('click', () => {
  if (audio.paused) {
    playMusic();
  } else {
    audio.pause();
    syncAudioBtn(false);
  }
});

// 3. Countdown Timer & Simpan ke Kalender
const targetMs = new Date(TARGET_ISO).getTime();
const pad = (n) => String(n).padStart(2, '0');

function updateCountdown() {
  const diff = Math.max(0, targetMs - Date.now());
  document.getElementById('cd-days').textContent = pad(Math.floor(diff / 86400000));
  document.getElementById('cd-hours').textContent = pad(Math.floor((diff / 3600000) % 24));
  document.getElementById('cd-minutes').textContent = pad(Math.floor((diff / 60000) % 60));
  document.getElementById('cd-seconds').textContent = pad(Math.floor((diff / 1000) % 60));
}

updateCountdown();
setInterval(updateCountdown, 1000);

const toUtc = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const gcalUrl = new URL('https://calendar.google.com/calendar/render');
gcalUrl.searchParams.set('action', 'TEMPLATE');
gcalUrl.searchParams.set('text', 'Ulang Tahun Ikram');
gcalUrl.searchParams.set('dates', `${toUtc(TARGET_ISO)}/${toUtc(END_ISO)}`);
gcalUrl.searchParams.set('location', 'Ruang Tengah Coffee & Vinyl, Jl. Kemang Raya No. 42, Jakarta Selatan');
document.getElementById('gcal-link').href = gcalUrl.toString();

document.getElementById('ics-btn').addEventListener('click', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${toUtc(TARGET_ISO)}`,
    `DTEND:${toUtc(END_ISO)}`,
    'SUMMARY:Ulang Tahun Ikram',
    'LOCATION:Ruang Tengah Coffee & Vinyl, Jakarta Selatan',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blobUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = 'ulang-tahun-ikram.ics';
  a.click();
  URL.revokeObjectURL(blobUrl);
  showToast('File kalender (.ics) diunduh.');
});

// 4. Salin ke Clipboard + Toast
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = document.getElementById(btn.dataset.copy).innerText.trim();
    try {
      await navigator.clipboard.writeText(text);
      showToast('Berhasil disalin ke clipboard.');
    } catch {
      showToast('Gagal menyalin.');
    }
  });
});

// 5. DOM Manipulasi RSVP & Buku Tamu (localStorage)
const defaultEntries = [
  { name: 'Raka Pratama', status: 'Hadir', message: 'Selamat ulang tahun Ikram! Panjang umur dan sehat selalu.' },
  { name: 'Nadia Kusuma', status: 'Hadir', message: 'Sampai ketemu tanggal 12 Oktober di Kemang!' },
];

let entries = defaultEntries;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (Array.isArray(saved) && saved.length) entries = saved;
} catch { /* gunakan defaultEntries */ }

function renderGuestbook() {
  const listEl = document.getElementById('guestbook-list');
  let hadir = 0;
  let tidak = 0;

  const items = entries.map((item) => {
    item.status === 'Hadir' ? hadir++ : tidak++;

    const li = document.createElement('li');
    li.className = 'guestbook-item';

    const top = document.createElement('div');
    top.className = 'guestbook-top';

    const author = document.createElement('strong');
    author.textContent = item.name;

    const status = document.createElement('span');
    status.className = 'muted';
    status.textContent = item.status;

    const msg = document.createElement('p');
    msg.className = 'muted';
    msg.textContent = item.message;

    top.append(author, status);
    li.append(top, msg);
    return li;
  });

  listEl.replaceChildren(...items);
  document.getElementById('count-hadir').textContent = String(hadir);
  document.getElementById('count-tidak').textContent = String(tidak);
}

renderGuestbook();

document.getElementById('rsvp-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('rsvp-name').value.trim();
  const status = document.getElementById('rsvp-status').value;
  const message = document.getElementById('rsvp-message').value.trim();
  if (!name || !message) return;

  entries = [{ name, status, message }, ...entries];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch { /* abaikan jika storage penuh */ }

  renderGuestbook();
  document.getElementById('rsvp-message').value = '';
  document.getElementById('rsvp-feedback').textContent = 'Konfirmasi dan ucapan tersimpan.';
  showToast('Ucapan dikirim ke buku tamu.');
});

// 6. Animasi Scroll (IntersectionObserver)
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const targets = document.querySelectorAll('.reveal');
  targets.forEach((el) => el.classList.add('is-pending'));
  const observer = new IntersectionObserver((list, obs) => {
    list.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-pending');
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  targets.forEach((el) => observer.observe(el));
}
