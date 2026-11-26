// Konfigurasi koneksi database Supabase dan jadwal acara
const SUPABASE_URL = 'https://fzrgmcbcrimahrbiovhj.supabase.co'; // URL proyek Supabase
const SUPABASE_KEY = 'sb_publishable_ZW8qhJjNNx8DST9c_3OJUw_GAr_SVNu'; // Public/anon key Supabase untuk frontend
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY); // Inisialisasi client Supabase
const TARGET_ISO = '2027-10-12T19:00:00+07:00'; // Waktu mulai acara (WIB) untuk hitung mundur & kalender
const END_ISO = '2027-10-12T22:00:00+07:00'; // Waktu selesai acara (WIB) untuk kalender
const STORAGE_KEY = 'ikram_birthday_rsvp_v1'; // Kunci penyimpanan cadangan di localStorage browser

// 1. Baca Parameter URL (?to=Nama+Tamu)
const params = new URLSearchParams(window.location.search); // Ambil query string setelah tanda '?' pada URL
const guestFromUrl = params.get('to')?.trim(); // Ambil nilai parameter 'to' lalu hapus spasi berlebih
if (guestFromUrl) {
  document.getElementById('guest-name').textContent = guestFromUrl; // Tampilkan nama tamu di sampul undangan
  document.getElementById('rsvp-name').value = guestFromUrl; // Isi otomatis kolom nama di form RSVP
}

// 2. Sampul Undangan & Kontrol Audio
const cover = document.getElementById('cover'); // Elemen sampul depan
const openBtn = document.getElementById('open-btn'); // Tombol "Buka Undangan"
const audio = document.getElementById('bg-music'); // Elemen <audio> musik latar
const audioBtn = document.getElementById('audio-btn'); // Tombol melayang Play/Jeda musik

// Kunci scroll halaman selama sampul belum dibuka
document.body.classList.add('is-locked');

// Sinkronkan teks dan atribut aksesibilitas tombol musik
function syncAudioBtn(isPlaying) {
  audioBtn.setAttribute('aria-pressed', String(isPlaying));
  audioBtn.textContent = isPlaying ? 'Jeda Musik' : 'Putar Musik';
}

// Putar musik secara aman (menangani aturan autoplay browser)
async function playMusic() {
  try {
    await audio.play();
    syncAudioBtn(true);
  } catch {
    syncAudioBtn(false);
  }
}

// Saat tombol "Buka Undangan" diklik: buka sampul, aktifkan scroll, lalu putar musik
openBtn.addEventListener('click', () => {
  cover.classList.add('is-opened');
  document.body.classList.remove('is-locked');
  playMusic();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Kontrol manual Play / Jeda lewat tombol melayang di pojok kanan bawah
audioBtn.addEventListener('click', () => {
  if (audio.paused) {
    playMusic();
  } else {
    audio.pause();
    syncAudioBtn(false);
  }
});

// 3. Countdown Timer & Simpan ke Kalender
const targetMs = new Date(TARGET_ISO).getTime(); // Ubah tanggal target ke milidetik
const pad = (n) => String(n).padStart(2, '0'); // Tambah nol di depan angka 1 digit (misal 5 -> "05")

// Hitung selisih waktu sekarang menuju acara lalu perbarui angka di layar
function updateCountdown() {
  const diff = Math.max(0, targetMs - Date.now());
  document.getElementById('cd-days').textContent = pad(Math.floor(diff / 86400000));
  document.getElementById('cd-hours').textContent = pad(Math.floor((diff / 3600000) % 24));
  document.getElementById('cd-minutes').textContent = pad(Math.floor((diff / 60000) % 60));
  document.getElementById('cd-seconds').textContent = pad(Math.floor((diff / 1000) % 60));
}

// Jalankan langsung saat halaman dimuat, lalu perbarui tiap 1 detik
updateCountdown();
setInterval(updateCountdown, 1000);

// Ubah tanggal ISO ke format UTC standar kalender (YYYYMMDDTHHMMSSZ)
const toUtc = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// Susun tautan otomatis "Simpan ke Kalender" (Google Calendar)
const gcalUrl = new URL('https://calendar.google.com/calendar/render');
gcalUrl.searchParams.set('action', 'TEMPLATE');
gcalUrl.searchParams.set('text', 'Ulang Tahun Ikram');
gcalUrl.searchParams.set('dates', `${toUtc(TARGET_ISO)}/${toUtc(END_ISO)}`);
gcalUrl.searchParams.set('location', 'Ruang Tengah Coffee & Vinyl, Jl. Aria Putra No. 46, Ciputat');
document.getElementById('gcal-link').href = gcalUrl.toString();

// Buat dan unduh file kalender .ics saat tombol "Unduh .ics" diklik
document.getElementById('ics-btn').addEventListener('click', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${toUtc(TARGET_ISO)}`,
    `DTEND:${toUtc(END_ISO)}`,
    'SUMMARY:Ulang Tahun Ikram',
    'LOCATION:Ruang Tengah Coffee & Vinyl, Jl. Aria Putra No. 46, Ciputat',
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

// 4. Salin ke Clipboard + Notifikasi Toast
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2200);
}

// Pasang event klik ke semua tombol "Salin" rekening dan alamat
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const text = document.getElementById(btn.dataset.copy).innerText.trim();
    try {
      // Cara modern menyalin teks ke clipboard
      await navigator.clipboard.writeText(text);
      showToast('Berhasil disalin ke clipboard.');
    } catch {
      // Cadangan jika browser/protokol belum mendukung navigator.clipboard
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      showToast(ok ? 'Berhasil disalin ke clipboard.' : 'Gagal menyalin.');
    }
  });
});

// 5. DOM Manipulasi RSVP & Buku Tamu (Supabase + cadangan localStorage)
const defaultEntries = [
  { name: 'Raka Pratama', status: 'Hadir', message: 'Selamat ulang tahun Ikram! Panjang umur dan sehat selalu.' },
  { name: 'Nadia Kusuma', status: 'Hadir', message: 'Sampai ketemu tanggal 12 Oktober di Kemang!' },
];

// Muat data awal dari localStorage bila ada, atau pakai data bawaan
let entries = defaultEntries;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (Array.isArray(saved) && saved.length) entries = saved;
} catch { /* gunakan defaultEntries */ }

// Render daftar ucapan ke elemen #guestbook-list dan hitung jumlah Hadir / Tidak Hadir
function renderGuestbook() {
  const listEl = document.getElementById('guestbook-list');
  let hadir = 0;
  let tidak = 0;

  const items = entries.map((item) => {
    item.status === 'Hadir' ? hadir++ : tidak++;

    // Bangun elemen DOM secara aman menggunakan textContent (mencegah XSS)
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

  listEl.replaceChildren(...items); // Ganti isi daftar sekaligus secara efisien
  document.getElementById('count-hadir').textContent = String(hadir);
  document.getElementById('count-tidak').textContent = String(tidak);
}

// Ambil data buku tamu terbaru dari tabel 'rsvp' di Supabase
async function loadGuestbook() {
  if (!db) return;
  const { data, error } = await db
    .from('rsvp')
    .select('nama, status, ucapan')
    .order('created_at', { ascending: false });

  if (!error && data && data.length) {
    entries = data.map((row) => ({
      name: row.nama,
      status: row.status,
      message: row.ucapan,
    }));
    renderGuestbook();
  }
}

// Tampilkan daftar awal lalu sinkronkan dengan data terbaru dari Supabase
renderGuestbook();
loadGuestbook();

// Tangani pengiriman formulir RSVP
document.getElementById('rsvp-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // Cegah reload halaman bawaan form HTML
  const name = document.getElementById('rsvp-name').value.trim();
  const status = document.getElementById('rsvp-status').value;
  const message = document.getElementById('rsvp-message').value.trim();
  if (!name || !message) return;

  if (db) {
    // Kirim data ke Supabase lalu muat ulang daftar buku tamu
    const { error } = await db.from('rsvp').insert([{ nama: name, status, ucapan: message }]);
    if (error) {
      showToast('Gagal menyimpan ke Supabase.');
      return;
    }
    await loadGuestbook();
  } else {
    // Fallback ke localStorage jika koneksi Supabase tidak tersedia
    entries = [{ name, status, message }, ...entries];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    renderGuestbook();
  }

  document.getElementById('rsvp-message').value = '';
  document.getElementById('rsvp-feedback').textContent = 'Konfirmasi dan ucapan tersimpan.';
  showToast('Ucapan Telah Terkirim...');
});

// 6. Animasi Scroll (IntersectionObserver)
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const targets = document.querySelectorAll('.reveal');
  targets.forEach((el) => el.classList.add('is-pending')); // Sembunyikan sementara sebelum masuk layar

  const observer = new IntersectionObserver((list, obs) => {
    list.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('is-pending');
        entry.target.classList.add('is-visible'); // Munculkan elemen saat masuk viewport
        obs.unobserve(entry.target); // Hentikan pantauan setelah animasi berjalan sekali
      }
    });
  }, { threshold: 0.15 });

  targets.forEach((el) => observer.observe(el));
}
