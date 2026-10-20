/* =========================================================
   Admin - admin.js
   BAGIAN 1: Pengaturan (sama dengan script.js)
   ========================================================= */
const CONFIG = {
  SUPABASE_URL: "https://yyjwilyatitknvfewduq.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_vnez_Cqg1cJ_i8jm6tWvOg_vOqFGTlj"
};

const $ = (id) => document.getElementById(id);
let session = null;   // { token }
let allMessages = [];

/* =========================================================
   BAGIAN 2: Login (lewat Supabase Auth)
   ========================================================= */
function saveSession() {
  try { sessionStorage.setItem("alif_admin", JSON.stringify(session)); } catch (e) {}
}
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem("alif_admin")); } catch (e) { return null; }
}
function authHeaders(extra) {
  return Object.assign({
    apikey: CONFIG.SUPABASE_ANON_KEY,
    Authorization: "Bearer " + session.token
  }, extra || {});
}

async function login(email, password) {
  const res = await fetch(CONFIG.SUPABASE_URL + "/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error("Email atau password salah.");
  const j = await res.json();
  return { token: j.access_token };
}

function logout() {
  session = null;
  try { sessionStorage.removeItem("alif_admin"); } catch (e) {}
  allMessages = [];
  $("dash").hidden = true;
  $("login-panel").hidden = false;
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = $("login-btn");
  $("login-error").hidden = true;
  btn.disabled = true;
  btn.textContent = "Masuk...";
  try {
    session = await login($("email").value.trim(), $("password").value);
    saveSession();
    $("password").value = "";
    await openDashboard();
  } catch (err) {
    $("login-error").textContent = err.message;
    $("login-error").hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Masuk";
  }
});

$("logout-btn").addEventListener("click", logout);

/* =========================================================
   BAGIAN 3: Ambil & hapus pesan
   (keamanan sebenarnya dijaga oleh RLS di Supabase, bukan oleh halaman ini)
   ========================================================= */
async function fetchMessages() {
  const url = CONFIG.SUPABASE_URL + "/rest/v1/messages" +
    "?select=id,name,gender,content,year,created_at&order=created_at.desc&limit=1000";
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) { logout(); throw new Error("Sesi habis, silakan masuk lagi."); }
  if (!res.ok) throw new Error("Gagal mengambil pesan (" + res.status + ").");
  return res.json();
}

async function deleteMessage(id) {
  const url = CONFIG.SUPABASE_URL + "/rest/v1/messages?id=eq." + encodeURIComponent(id);
  const res = await fetch(url, {
    method: "DELETE",
    headers: authHeaders({ Prefer: "return=representation" })
  });
  if (!res.ok) throw new Error("Gagal menghapus (" + res.status + ").");
  const rows = await res.json();
  if (!rows.length) throw new Error("Tidak ada yang terhapus. Akun ini mungkin bukan admin.");
}

/* =========================================================
   BAGIAN 4: Tampilan dashboard
   ========================================================= */
async function openDashboard() {
  $("login-panel").hidden = true;
  $("dash").hidden = false;
  await refresh();
}

async function refresh() {
  $("dash-error").hidden = true;
  try {
    allMessages = await fetchMessages();
    buildYearOptions();
    render();
  } catch (err) {
    $("dash-error").textContent = err.message;
    $("dash-error").hidden = false;
  }
}

function buildYearOptions() {
  const sel = $("year-select");
  const keep = sel.value;
  const years = [...new Set(allMessages.map((m) => m.year))].sort((a, b) => b - a);
  sel.innerHTML = "";
  const optAll = document.createElement("option");
  optAll.value = "all";
  optAll.textContent = "Semua tahun";
  sel.appendChild(optAll);
  years.forEach((y) => {
    const o = document.createElement("option");
    o.value = String(y);
    o.textContent = String(y);
    sel.appendChild(o);
  });
  if (keep && [...sel.options].some((o) => o.value === keep)) sel.value = keep;
  else sel.value = years.length ? String(years[0]) : "all";
}

// Menentukan warna kartu dari nama pengirim
function cardClass(name, i) {
  const lower = String(name).toLowerCase();
  const compact = lower.replace(/[^a-z0-9]/g, "");          // "Your Name" -> "yourname"
  const words = lower.split(/[^a-z0-9]+/).filter(Boolean);  // kata per kata

  // PALING SPESIAL (pesan Alif sendiri): kata "Alif", atau "NameGw" / "Name Gw"
  if (words.includes("alif") || compact.includes("namegw")) return "alif";
  // Biru + Pink: mengandung "rania", atau kata "Ran" / "Rann" berdiri sendiri
  if (compact.includes("rania") || words.includes("ran") || words.includes("rann")) return "rania";
  // Biru + Cyan: "Azfa", "YourName", "Your Name"
  if (compact.includes("azfa") || compact.includes("yourname")) return "azfa";
  // Nama lain: biru / cyan / ungu / hijau muda (tanpa pink)
  return "c" + (i % 4);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }) + " WIB";
}

function render() {
  const year = $("year-select").value;
  const q = $("search").value.trim().toLowerCase();
  const list = $("list");
  list.innerHTML = "";

  const shown = allMessages.filter((m) => {
    if (year !== "all" && String(m.year) !== year) return false;
    if (q && !(m.name.toLowerCase().includes(q) || m.content.toLowerCase().includes(q))) return false;
    return true;
  });

  $("count").textContent = shown.length + " pesan" + (year !== "all" ? " (arsip " + year + ")" : "");

  shown.forEach((m, i) => {
    const card = document.createElement("article");
    // Rania = biru + pink. Lainnya = biru/cyan/ungu/hijau muda saja.
    card.className = "msg " + cardClass(m.name, i);

    const who = document.createElement("p");
    who.className = "who";
    who.textContent = m.name;                    // textContent = aman dari kode jahat

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = m.gender + " • " + formatDate(m.created_at);

    const body = document.createElement("p");
    body.className = "body";
    body.textContent = m.content;

    const del = document.createElement("button");
    del.type = "button";
    del.className = "del";
    del.textContent = "Hapus";
    del.addEventListener("click", async () => {
      if (!confirm("Hapus pesan dari " + m.name + "? Ini tidak bisa dibatalkan.")) return;
      del.disabled = true;
      try {
        await deleteMessage(m.id);
        await refresh();
      } catch (err) {
        $("dash-error").textContent = err.message;
        $("dash-error").hidden = false;
        del.disabled = false;
      }
    });

    card.append(who, meta, body, del);
    list.appendChild(card);
  });
}

$("year-select").addEventListener("change", render);
$("search").addEventListener("input", render);

/* =========================================================
   BAGIAN 5: Buka otomatis kalau sesi masih ada
   ========================================================= */
session = loadSession();
if (session && session.token) {
  openDashboard().catch(() => logout());
}
