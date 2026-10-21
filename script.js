/* =========================================================
   Alif's Birthday Archive - script.js
   BAGIAN 1: Pengaturan
   ========================================================= */
const CONFIG = {
  SUPABASE_URL: "https://yyjwilyatitknvfewduq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_vnez_Cqg1cJ_i8jm6tWvOg_vOqFGTlj"
};

const TRACKS = [
  { title: "Shape of My Heart", artist: "Backstreet Boys", src: "shape-of-my-heart.mp3" },
  { title: "We Don't Talk Anymore", artist: "Charlie Puth feat. Selena Gomez", src: "we-dont-talk-anymore.mp3" }
];

// Mode pratinjau: buka index.html?preview=1 untuk melihat animasi
// tanpa mengirim apa pun ke database.
const PREVIEW = new URLSearchParams(location.search).get("preview") === "1";

const $ = (id) => document.getElementById(id);
const state = { name: "", gender: "", trackIndex: 0 };
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   BAGIAN 2: Pindah layar
   ========================================================= */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active", "leaving"));
  $(id).classList.add("active");
  window.scrollTo(0, 0);
}

/* =========================================================
   BAGIAN 3: Efek partikel (bintang, hati, kilau, konfeti) di canvas
   ========================================================= */
const canvas = $("fx");
const ctx = canvas.getContext("2d");
let W = 0, H = 0;
const floaters = [];
const bursts = [];
const confetti = [];
const COLORS = ["#ffffff", "#22d3ee", "#60a5fa", "#a78bfa", "#86efac"];

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function drawStar(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const rad = i % 2 === 0 ? r : r * 0.35;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHeart(x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.35);
  ctx.bezierCurveTo(x - r, y - r * 0.4, x - r * 0.5, y - r, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.5, y - r, x + r, y - r * 0.4, x, y + r * 0.35);
  ctx.fill();
}

function drawShape(type, x, y, r) {
  if (type === 0) drawStar(x, y, r);
  else if (type === 1) drawHeart(x, y, r);
  else { ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, Math.PI * 2); ctx.fill(); }
}

function makeFloater() {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    r: 3 + Math.random() * 6,
    vy: 0.15 + Math.random() * 0.4,
    drift: Math.random() * Math.PI * 2,
    type: Math.floor(Math.random() * 3),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    phase: Math.random() * Math.PI * 2
  };
}

const floaterCount = REDUCED ? 0 : (W < 600 ? 28 : 55);
for (let i = 0; i < floaterCount; i++) floaters.push(makeFloater());

// Ledakan bintang/hati/kilau di titik (x, y)
function burst(x, y, count) {
  if (REDUCED) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 1.5 + Math.random() * 5;
    bursts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 1,
      r: 3 + Math.random() * 6,
      life: 1,
      type: Math.floor(Math.random() * 3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }
}

// Konfeti kotak-kotak yang berputar jatuh
function confettiBurst(x, y, count) {
  if (REDUCED) return;
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const sp = 4 + Math.random() * 7;
    confetti.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      life: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }
}

// Hujan konfeti dari atas layar
function confettiRain(count) {
  if (REDUCED) return;
  for (let i = 0; i < count; i++) {
    confetti.push({
      x: Math.random() * W,
      y: -10 - Math.random() * 120,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1 + Math.random() * 3,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 5,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }
}

// Kembang api kecil
function fireworks(x, y) {
  burst(x, y, 45);
  setTimeout(() => burst(x, y, 30), 180);
}

// Cincin cahaya yang membesar
function ring(x, y) {
  if (REDUCED) return;
  const el = document.createElement("div");
  el.className = "ring";
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// Kilatan putih singkat
function flash() {
  if (REDUCED) return;
  const el = document.createElement("div");
  el.className = "flash";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

// Sinar cahaya berputar di belakang kotak hadiah
function rays(x, y) {
  if (REDUCED) return;
  const el = document.createElement("div");
  el.className = "rays";
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function loop(t) {
  ctx.clearRect(0, 0, W, H);
  ctx.shadowBlur = 8;

  for (const f of floaters) {
    f.y -= f.vy;
    f.x += Math.sin(t / 1500 + f.drift) * 0.3;
    if (f.y < -10) { f.y = H + 10; f.x = Math.random() * W; }
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t / 700 + f.phase);
    ctx.fillStyle = f.color;
    ctx.shadowColor = f.color;
    drawShape(f.type, f.x, f.y, f.r);
  }

  for (let i = bursts.length - 1; i >= 0; i--) {
    const p = bursts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.life -= 0.014;
    if (p.life <= 0) { bursts.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    drawShape(p.type, p.x, p.y, p.r);
  }

  for (let i = confetti.length - 1; i >= 0; i--) {
    const c = confetti[i];
    c.x += c.vx; c.y += c.vy; c.vy += 0.1; c.vx *= 0.99; c.rot += c.vr; c.life -= 0.006;
    if (c.life <= 0 || c.y > H + 20) { confetti.splice(i, 1); continue; }
    ctx.save();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = Math.min(1, c.life * 2);
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  }

  ctx.globalAlpha = 1;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* =========================================================
   BAGIAN 4: Layar 1 - nama & jenis kelamin
   ========================================================= */
// Tombol "Mulai" di layar pembukaan
$("btn-start").addEventListener("click", (e) => {
  const r = e.currentTarget.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 45);
  setTimeout(() => showScreen("screen-welcome"), 350);
});

$("welcome-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("input-name").value.trim().replace(/\s+/g, " ");
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const err = $("welcome-error");

  if (name.length < 2) { err.textContent = "Nama minimal 2 huruf ya."; err.hidden = false; return; }
  if (!genderEl) { err.textContent = "Pilih jenis kelamin dulu ya."; err.hidden = false; return; }

  err.hidden = true;
  state.name = name;
  state.gender = genderEl.value;
  $("hello-title").textContent = "Halo, " + name + "!"; // textContent = aman dari kode jahat
  showScreen("screen-gift");
});

/* =========================================================
   BAGIAN 5: Layar 2-3 - buka hadiah & tulisan pembuka
   ========================================================= */
let giftOpened = false;
$("gift").addEventListener("click", () => {
  if (giftOpened) return;
  giftOpened = true;
  const g = $("gift");

  // Klik ini adalah gestur pengguna, jadi autoplay biasanya diizinkan
  loadTrack(0);
  tryAutoplay();

  // 1) Kotak bergoyang dulu (bikin penasaran)
  g.classList.add("shake");

  // 2) Lalu meledak terbuka
  setTimeout(() => {
    g.classList.remove("shake");
    g.classList.add("open");
    const r = g.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + 60;

    flash();
    ring(cx, cy);
    setTimeout(() => ring(cx, cy), 220);
    rays(cx, cy);
    burst(cx, cy, 80);
    confettiBurst(cx, cy, 90);

    setTimeout(() => fireworks(W * 0.2, H * 0.3), 400);
    setTimeout(() => fireworks(W * 0.8, H * 0.25), 700);
    setTimeout(() => { fireworks(W * 0.5, H * 0.18); confettiRain(70); }, 1000);
  }, 650);

  setTimeout(() => showScreen("screen-text"), 3300);
  setTimeout(() => $("screen-text").classList.add("leaving"), 5900);
  setTimeout(() => showScreen("screen-main"), 6800);
  setTimeout(loadStatus, 6800);
});

/* =========================================================
   BAGIAN 6: Musik
   ========================================================= */
const audio = $("audio");

function loadTrack(i) {
  state.trackIndex = i;
  const t = TRACKS[i];
  audio.src = t.src;
  $("track-title").textContent = t.title;
  $("track-artist").textContent = t.artist;
  $("audio-note").hidden = true;
}

function setPlayingUI(playing) {
  const iconPlay = $("icon-play");
  const iconPause = $("icon-pause");
  iconPlay.removeAttribute("hidden");
  iconPause.removeAttribute("hidden");
  iconPlay.style.display = playing ? "none" : "block";
  iconPause.style.display = playing ? "block" : "none";
  $("btn-play").setAttribute("aria-label", playing ? "Jeda" : "Putar");
}

function tryAutoplay() {
  const p = audio.play();
  if (p && p.catch) {
    p.catch(() => {
      // Diblokir browser: tombol putar manual sudah tersedia
      setPlayingUI(false);
    });
  }
}

$("btn-play").addEventListener("click", () => {
  if (audio.paused) {
    audio.play().catch(() => showAudioNote("Lagu belum bisa diputar."));
  } else {
    audio.pause();
  }
});

$("btn-next").addEventListener("click", () => {
  const next = (state.trackIndex + 1) % TRACKS.length;
  loadTrack(next);
  audio.play().catch(() => showAudioNote("Lagu belum bisa diputar."));
});

audio.addEventListener("play", () => setPlayingUI(true));
audio.addEventListener("pause", () => setPlayingUI(false));
audio.addEventListener("ended", () => $("btn-next").click());
audio.addEventListener("error", () => showAudioNote("File lagu belum dipasang di folder audio/."));

function showAudioNote(text) {
  $("audio-note").textContent = text;
  $("audio-note").hidden = false;
  setPlayingUI(false);
}

/* =========================================================
   BAGIAN 7: Gambar utama (kalau file belum ada)
   ========================================================= */
$("portrait-img").addEventListener("error", () => {
  $("portrait-img").hidden = true;
  $("portrait-fallback").hidden = false;
});

/* =========================================================
   BAGIAN 8: Komunikasi dengan Supabase (tanpa library, pakai fetch)
   Fungsi database yang dipanggil:
     get_message_count()                      -> angka
     is_form_open()                           -> true / false
     submit_message(p_name, p_gender, p_content)
   ========================================================= */
function isConfigured() {
  return CONFIG.SUPABASE_URL !== "" && CONFIG.SUPABASE_ANON_KEY !== "";
}

async function rpc(fn, args) {
  if (!isConfigured()) throw new Error("NOT_CONFIGURED");
  const res = await fetch(CONFIG.SUPABASE_URL + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + CONFIG.SUPABASE_ANON_KEY
    },
    body: JSON.stringify(args || {})
  });
  if (!res.ok) {
    let msg = "";
    try { msg = (await res.json()).message || ""; } catch (e) {}
    const err = new Error(msg || "HTTP " + res.status);
    err.status = res.status;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* =========================================================
   BAGIAN 9: Status formulir & jumlah pesan
   ========================================================= */
function setFormEnabled(on) {
  $("msg-text").disabled = !on;
  $("btn-send").disabled = !on || $("msg-text").value.trim() === "";
}

async function loadStatus() {
  if (PREVIEW) {
    $("msg-count").textContent = "0";
    $("form-status").textContent = "Mode pratinjau: pesan tidak akan dikirim ke database.";
    setFormEnabled(true);
    return;
  }
  if (!isConfigured()) {
    $("msg-count").textContent = "-";
    $("form-status").textContent = "Website belum terhubung ke database.";
    setFormEnabled(false);
    return;
  }
  try {
    const [count, open] = await Promise.all([rpc("get_message_count"), rpc("is_form_open")]);
    $("msg-count").textContent = String(count);
    if (open === true) {
      $("form-section").hidden = false;
      $("form-status").textContent = "Formulir sedang dibuka. Boleh kirim lebih dari satu pesan.";
      setFormEnabled(true);
    } else {
      // Di luar tanggal 25 Oktober: kotak formulir disembunyikan
      $("form-section").hidden = true;
    }
  } catch (e) {
    $("form-status").textContent = "Gagal memeriksa status (" + (e.status || "jaringan") + "): " + e.message;
    setFormEnabled(false);
  }
}

/* =========================================================
   BAGIAN 10: Formulir pesan
   ========================================================= */
$("msg-text").addEventListener("input", () => {
  const len = $("msg-text").value.length;
  $("char-now").textContent = String(len);
  $("char-now").parentElement.classList.toggle("near", len >= 900);
  $("btn-send").disabled = $("msg-text").disabled || $("msg-text").value.trim() === "";
});

function showMsgError(text) {
  $("msg-error").textContent = text;
  $("msg-error").hidden = false;
}

$("msg-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = $("msg-text").value.trim();
  $("msg-error").hidden = true;

  if (content === "") { showMsgError("Pesannya masih kosong."); return; }
  if (content.length > 1000) { showMsgError("Pesan maksimal 1.000 karakter."); return; }

  const btn = $("btn-send");
  btn.disabled = true;
  btn.textContent = "Mengirim...";

  try {
    if (PREVIEW) {
      await new Promise((r) => setTimeout(r, 700)); // pura-pura menunggu, KHUSUS pratinjau
      playSendAnimation(true);
    } else {
      await rpc("submit_message", {
        p_name: state.name,
        p_gender: state.gender,
        p_content: content
      });
      playSendAnimation(false);
      loadStatus();
    }
    $("msg-text").value = "";
    $("char-now").textContent = "0";
  } catch (err) {
    // Gagal: JANGAN tampilkan animasi sukses
    if (err.message === "NOT_CONFIGURED") showMsgError("Website belum terhubung ke database.");
    else if (err.status === 400 || err.status === 403) showMsgError("Pesan ditolak. Formulir mungkin sedang ditutup.");
    else showMsgError("Pesan gagal dikirim. Cek koneksi lalu coba lagi.");
  } finally {
    btn.textContent = "Kirim pesan";
    btn.disabled = $("msg-text").value.trim() === "" || $("msg-text").disabled;
  }
});

/* =========================================================
   BAGIAN 11: Animasi amplop menuju arsip
   ========================================================= */
function playSendAnimation(isPreview) {
  const fx = $("send-fx");
  const env = fx.querySelector(".envelope");
  const target = fx.querySelector(".archive-target");
  $("send-result").hidden = true;
  $("send-sub").hidden = !isPreview;
  if (isPreview) $("send-sub").textContent = "(Pratinjau: ini hanya contoh animasi, tidak ada pesan yang terkirim.)";

  // Ulang animasi CSS dari awal
  target.classList.remove("arrive");
  [env, target].forEach((el) => { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; });
  fx.hidden = false;

  // Jejak kilau mengikuti amplop yang terbang
  const trail = setInterval(() => {
    const r = env.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 3);
  }, 70);

  const waitMs = REDUCED ? 300 : 2300;
  setTimeout(() => {
    clearInterval(trail);
    const tr = target.getBoundingClientRect();
    const cx = tr.left + tr.width / 2;
    const cy = tr.top + tr.height / 2;

    target.classList.add("arrive");
    ring(cx, cy);
    setTimeout(() => ring(cx, cy), 200);
    fireworks(cx, cy);
    confettiBurst(cx, cy, 80);
    setTimeout(() => fireworks(W * 0.25, H * 0.35), 300);
    setTimeout(() => fireworks(W * 0.75, H * 0.35), 500);
    setTimeout(() => confettiRain(50), 700);

    $("send-result").hidden = false;
  }, waitMs);
}

$("btn-fx-close").addEventListener("click", () => { $("send-fx").hidden = true; });
