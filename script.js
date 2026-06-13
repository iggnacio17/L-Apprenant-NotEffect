/* ══════════════════════════════════════════════════════
   L'Apprenant Français — ÉTUDE JUICE EDITION
   Motor: Audio Juice + Partículas + Navegación + i18n
   Autor: Gabriel Astudillo (Tesis UBO 2026)
══════════════════════════════════════════════════════ */

/* ──────────────── ESTADO GLOBAL ──────────────── */
let lessons = [];
let currentLessonId = null;
let currentView = "explore";
let currentLang = localStorage.getItem("juiceLang") || "es";
let activeFilter = "all";

let studyState = JSON.parse(localStorage.getItem("juiceStudyState")) || {
  lessonsViewed: [],
  studyTime: 0,
  favoriteLessons: [],
  lastOpenedLesson: null,
  notes: [],
  userName: "",
};
// Siempre reiniciar el timer de sesión al cargar la página
studyState.sessionStart = Date.now();

const COLORS = {
  mint: ["#2dd4bf", "#5eead4", "#99f6e4"],
  indigo: ["#6366f1", "#818cf8", "#a5b4fc"],
  gold: ["#fbbf24", "#fcd34d", "#fef3c7"],
  white: ["#f8fafc", "#e2e8f0"],
};

/* ──────────────── TRADUCCIONES (i18n) ──────────────── */
const i18n = {
  es: {
    nav_explore: "Explorar",
    nav_vocab: "Vocabulario",
    nav_daily: "Diario",
    nav_lesson: "Lección",
    profile: "👤 Perfil",
    progression: "📚 Progreso",
    filter: "🔍 Filtrar",
    all: "Todos",
    time: "Tiempo",
    completed: "Vistas",
    btn_save: "Guardar",
    btn_back: "← Volver",
    btn_next: "Siguiente →",
    btn_prev: "← Anterior",
    label_examples: "💬 Ejemplos",
    label_tips: "💡 Consejos",
    daily_title: "Tu estudio de hoy",
    lang_name: "Español",
    p_name: "Nombre",
    no_lessons: "No hay lecciones para este nivel.",
    viewed_badge: "✓ Vista",
  },
  fr: {
    nav_explore: "Explorer",
    nav_vocab: "Vocabulaire",
    nav_daily: "Quotidien",
    nav_lesson: "Leçon",
    profile: "👤 Profil",
    progression: "📚 Progression",
    filter: "🔍 Filtrer",
    all: "Tous",
    time: "Temps",
    completed: "Vues",
    btn_save: "Sauvegarder",
    btn_back: "← Retour",
    btn_next: "Suivant →",
    btn_prev: "← Précédent",
    label_examples: "💬 Exemples",
    label_tips: "💡 Conseils",
    daily_title: "Votre étude du jour",
    lang_name: "Français",
    p_name: "Prénom",
    no_lessons: "Aucune leçon pour ce niveau.",
    viewed_badge: "✓ Vue",
  },
};

/* ──────────────── AUDIO ENGINE ──────────────── */
let audioCtx = null;
function getAudio() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(cfg) {
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;
    const {
      freq = 440,
      type = "sine",
      attack = 0.01,
      decay = 0.1,
      sustain = 0.3,
      release = 0.2,
      gain = 0.3,
      freq2 = null,
    } = cfg;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2)
      osc.frequency.exponentialRampToValueAtTime(freq2, now + attack + decay);
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.linearRampToValueAtTime(gain * sustain, now + attack + decay);
    env.gain.linearRampToValueAtTime(0, now + attack + decay + release);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + attack + decay + release + 0.05);
  } catch (e) {}
}

const SFX = {
  tap: () =>
    tone({ freq: 600, type: "sine", attack: 0.002, decay: 0.05, gain: 0.1 }),
  hover: () =>
    tone({ freq: 400, type: "sine", attack: 0.01, decay: 0.02, gain: 0.05 }),
  open: () => {
    tone({ freq: 440, type: "sine", attack: 0.01, decay: 0.2, gain: 0.15 });
    setTimeout(
      () =>
        tone({ freq: 880, type: "sine", attack: 0.01, decay: 0.1, gain: 0.1 }),
      100,
    );
  },
  tab: () =>
    tone({
      freq: 300,
      freq2: 450,
      type: "triangle",
      attack: 0.01,
      decay: 0.1,
      gain: 0.08,
    }),
  flip: () =>
    tone({ freq: 700, type: "sine", attack: 0.005, decay: 0.08, gain: 0.1 }),
  save: () => {
    tone({ freq: 523, type: "sine", attack: 0.01, decay: 0.1, gain: 0.12 });
    setTimeout(
      () =>
        tone({ freq: 659, type: "sine", attack: 0.01, decay: 0.1, gain: 0.1 }),
      100,
    );
    setTimeout(
      () =>
        tone({ freq: 784, type: "sine", attack: 0.01, decay: 0.15, gain: 0.1 }),
      200,
    );
  },
};

/* ──────────────── PARTICLE SYSTEM ──────────────── */
function spawnParticles(x, y, count, colors) {
  const container = document.getElementById("particleLayer");
  if (!container) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 6 + 4;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const tx = (Math.random() - 0.5) * 150;
    const ty = (Math.random() - 0.5) * 150;
    const dur = 0.5 + Math.random() * 0.5;
    Object.assign(p.style, {
      width: `${size}px`,
      height: `${size}px`,
      background: color,
      left: `${x}px`,
      top: `${y}px`,
      "--tx": `${tx}px`,
      "--ty": `${ty}px`,
      "--dur": `${dur}s`,
    });
    container.appendChild(p);
    setTimeout(() => p.remove(), dur * 1000);
  }
}


function addRipple(el, e) {
  // Sin juice: ripple desactivado
}

/* ──────────────── NAVEGACIÓN Y UI ──────────────── */
function switchView(viewId, triggerEl = null) {
  SFX.tab();
  if (triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    spawnParticles(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      8,
      COLORS.mint,
    );
  }

  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.remove("hidden");

  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const activeTab = document.querySelector(`[data-view="${viewId}"]`);
  if (activeTab) activeTab.classList.add("active");

  // Mostrar/ocultar tab de lección
  const lessonTab = document.getElementById("lessonTab");
  if (viewId === "lesson") {
    lessonTab.style.display = "";
  }

  // Actualizar título del topbar
  const t = i18n[currentLang];
  const titles = {
    explore: t.nav_explore,
    lesson: t.nav_lesson,
    vocab: t.nav_vocab,
    daily: t.nav_daily,
  };
  const moduleTitle = document.getElementById("moduleTitle");
  if (moduleTitle) moduleTitle.textContent = titles[viewId] || "";

  currentView = viewId;
  window.scrollTo(0, 0);
}

function toggleLanguage() {
  currentLang = currentLang === "es" ? "fr" : "es";
  localStorage.setItem("juiceLang", currentLang);
    updateAppUI();
}

function updateAppUI() {
  const texts = i18n[currentLang];

  // Actualizar elementos con data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (texts[key]) el.textContent = texts[key];
  });

  // Actualizar placeholders
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (texts[key]) el.placeholder = texts[key];
  });

  // Actualizar botón de idioma
  const langFlag = document.getElementById("langFlag");
  const langText = document.getElementById("langText");
  if (langFlag) langFlag.textContent = currentLang === "es" ? "🇪🇸" : "🇫🇷";
  if (langText) langText.textContent = texts.lang_name;

  renderLessons();
  renderVocab();
  renderDaily();
  updateStats();
}

/* ──────────────── LÓGICA DE LECCIONES ──────────────── */
async function loadLessons() {
  try {
    const response = await fetch("lessons.json");
    lessons = await response.json();
    renderLessons();
    renderVocab();
    renderDaily();
    updateStats();
  } catch (e) {
    console.error("Error cargando lecciones:", e);
    // Intentar con path relativo alternativo
    try {
      const response = await fetch("./lessons.json");
      lessons = await response.json();
      renderLessons();
      renderVocab();
      renderDaily();
      updateStats();
    } catch (e2) {
      console.error("No se pudo cargar lessons.json:", e2);
    }
  }
}

function getFilteredLessons() {
  if (activeFilter === "all") return lessons;
  return lessons.filter((l) => l.level === activeFilter);
}

function renderLessons() {
  const grid = document.getElementById("lessonGrid");
  if (!grid) return;
  grid.innerHTML = "";

  const filtered = getFilteredLessons();
  const t = i18n[currentLang];

  if (filtered.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-dim);grid-column:1/-1;text-align:center;padding:40px">${t.no_lessons}</p>`;
    return;
  }

  filtered.forEach((lesson) => {
    const viewed = studyState.lessonsViewed.includes(lesson.id);
    const card = document.createElement("div");
    card.className = "lesson-card panel" + (viewed ? " viewed" : "");
    card.innerHTML = `
      <span class="lesson-tag">${lesson.level} • ${lesson.category}</span>
      ${viewed ? `<span class="viewed-badge">${t.viewed_badge}</span>` : ""}
      <h3 class="lesson-card-title">${lesson.title}</h3>
      <p class="lesson-card-desc">${lesson.description}</p>
    `;
    card.addEventListener("click", (e) => openLesson(lesson.id, e));
    grid.appendChild(card);
  });
}

function openLesson(id, e) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) return;

  SFX.open();
  if (e) spawnParticles(e.clientX, e.clientY, 12, COLORS.indigo);

  currentLessonId = id;

  // Rellenar contenido — IDs correctos del HTML
  const titleEl = document.getElementById("lessonTitle");
  const descEl = document.getElementById("lessonDescription");
  const contentEl = document.getElementById("lessonContentMain");
  const exList = document.getElementById("examplesList");
  const tipsList = document.getElementById("tipsList");

  if (titleEl) titleEl.textContent = lesson.title;
  if (descEl) descEl.textContent = lesson.description;
  if (contentEl) contentEl.textContent = lesson.content;

  if (exList) {
    exList.innerHTML = (lesson.examples || [])
      .map((ex, i) => `
        <div class="example-item" data-num="${i + 1}">
          <p><strong>${ex.french}</strong></p>
          <p>${ex.spanish}</p>
          ${ex.note ? `<span class="example-note">${ex.note}</span>` : ""}
        </div>
      `).join("");
  }

  if (tipsList) {
    tipsList.innerHTML = (lesson.tips || [])
      .map((tip) => `<li>${tip}</li>`)
      .join("");
  }

  // Inyectar card de pronunciación si existe
  const existingPron = document.getElementById("pronunciationCard");
  if (existingPron) existingPron.remove();
  if (lesson.pronunciation) {
    const pronCard = document.createElement("div");
    pronCard.id = "pronunciationCard";
    pronCard.className = "pronunciation-card";
    pronCard.innerHTML = `
      <div class="pronunciation-icon">🔊</div>
      <div class="pronunciation-body">
        <div class="pronunciation-label">Pronunciación</div>
        <p class="pronunciation-text">${lesson.pronunciation}</p>
      </div>
    `;
    // Insertar antes del footer
    const footer = document.querySelector(".lesson-footer");
    if (footer) footer.parentNode.insertBefore(pronCard, footer);
  }

  // Mostrar tab de lección y navegar
  document.getElementById("lessonTab").style.display = "";
  switchView("lesson");

  // Marcar como vista
  if (!studyState.lessonsViewed.includes(id)) {
    studyState.lessonsViewed.push(id);
    studyState.lastOpenedLesson = id;
    saveState();
    updateStats();
  }
}

function navigateLesson(direction) {
  const filtered = getFilteredLessons();
  if (filtered.length === 0) return;
  const idx = filtered.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) return;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= filtered.length) return;
  openLesson(filtered[newIdx].id, null);
  }

/* ──────────────── VOCABULARIO ──────────────── */
function renderVocab() {
  const grid = document.getElementById("vocabGrid");
  if (!grid) return;
  grid.innerHTML = "";

  // Extraer pares único de ejemplos de todas las lecciones
  const pairs = [];
  lessons.forEach((lesson) => {
    (lesson.examples || []).slice(0, 2).forEach((ex) => {
      pairs.push({
        french: ex.french,
        spanish: ex.spanish,
        level: lesson.level,
      });
    });
  });

  // Mezclar y limitar
  const shuffled = pairs.sort(() => Math.random() - 0.5).slice(0, 24);

  shuffled.forEach(({ french, spanish, level }) => {
    const card = document.createElement("div");
    card.className = "vocab-card";
    card.innerHTML = `
      <div class="vocab-front">
        <span class="vocab-level">${level}</span>
        <p>${french}</p>
      </div>
      <div class="vocab-back">
        <p>${spanish}</p>
      </div>
    `;
    card.addEventListener("click", (e) => {
            card.classList.toggle("flipped");
      const rect = card.getBoundingClientRect();
      const isFlipping = card.classList.contains("flipped");
      spawnParticles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        isFlipping ? 14 : 6,
        isFlipping ? COLORS.gold : COLORS.mint,
      );
    });
    grid.appendChild(card);
  });
}

/* ──────────────── ESTUDIO DIARIO ──────────────── */
function renderDaily() {
  const container = document.getElementById("dailySequence");
  if (!container || lessons.length === 0) return;

  // Seleccionar 3 lecciones: 1 no vista, 1 aleatoria de cada nivel disponible
  const notViewed = lessons.filter(
    (l) => !studyState.lessonsViewed.includes(l.id),
  );
  const daily = [];

  if (notViewed.length > 0)
    daily.push(notViewed[Math.floor(Math.random() * notViewed.length)]);

  const allLevels = [...new Set(lessons.map((l) => l.level))];
  allLevels.forEach((lvl) => {
    const lvlLessons = lessons.filter((l) => l.level === lvl);
    const pick = lvlLessons[Math.floor(Math.random() * lvlLessons.length)];
    if (pick && !daily.find((d) => d.id === pick.id)) daily.push(pick);
  });

  const todayList = daily.slice(0, 5);

  container.innerHTML = todayList
    .map(
      (lesson) => `
    <div class="daily-item panel" data-id="${lesson.id}">
      <span class="lesson-tag">${lesson.level} • ${lesson.category}</span>
      <h4>${lesson.title}</h4>
      <p class="text-dim">${lesson.description}</p>
    </div>
  `,
    )
    .join("");

  container.querySelectorAll(".daily-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      const id = parseInt(item.dataset.id);
      openLesson(id, e);
    });
  });
}

/* ──────────────── PERSISTENCIA Y STATS ──────────────── */
function saveState() {
  localStorage.setItem("juiceStudyState", JSON.stringify(studyState));
}

function updateStats() {
  const viewedEl = document.getElementById("viewedCount");
  const timeEl = document.getElementById("studyTimeDisplay");
  if (viewedEl) viewedEl.textContent = studyState.lessonsViewed.length;
  const mins = Math.floor((Date.now() - studyState.sessionStart) / 60000);
  if (timeEl) timeEl.textContent = mins;
}

/* ──────────────── INICIALIZACIÓN ──────────────── */
document.addEventListener("DOMContentLoaded", () => {
  loadLessons();
  updateAppUI();

  // Restaurar nombre guardado
  const nameInput = document.getElementById("nameInput");
  if (nameInput && studyState.userName) {
    nameInput.value = studyState.userName;
  }

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view, btn));
  });

  // Botón volver desde lección
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
            switchView("explore");
    });
  }

  // Botones prev/next lección
  const prevBtn = document.getElementById("prevLessonBtn");
  const nextBtn = document.getElementById("nextLessonBtn");
  if (prevBtn) prevBtn.addEventListener("click", (e) => {
    navigateLesson(-1);
    const rect = prevBtn.getBoundingClientRect();
    spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, 8, COLORS.indigo);
  });
  if (nextBtn) nextBtn.addEventListener("click", (e) => {
    navigateLesson(1);
    const rect = nextBtn.getBoundingClientRect();
    spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, 10, COLORS.mint);
  });

  // Guardar perfil
  const saveProfile = document.getElementById("saveProfile");
  if (saveProfile) {
    saveProfile.addEventListener("click", (e) => {
      SFX.save();
      const name = nameInput ? nameInput.value.trim() : "";
      studyState.userName = name;
      saveState();
      const rect = saveProfile.getBoundingClientRect();
      spawnParticles(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
        10,
        COLORS.gold,
      );
    });
  }

  // Toggle idioma
  const langToggle = document.getElementById("langToggle");
  if (langToggle) langToggle.addEventListener("click", toggleLanguage);

  // Filtros de nivel
  const filterBtns = document.querySelectorAll("#levelFilter .chip");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.value;
            const rect = btn.getBoundingClientRect();
      spawnParticles(rect.left + rect.width/2, rect.top + rect.height/2, 8, COLORS.mint);
      renderLessons();
    });
  });

  // Toggle sidebar (móvil)
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
          });
    // Cerrar sidebar al hacer click fuera
    document.addEventListener("click", (e) => {
      if (
        sidebar.classList.contains("open") &&
        !sidebar.contains(e.target) &&
        e.target !== sidebarToggle
      ) {
        sidebar.classList.remove("open");
      }
    });
  }

  // Ripple en botones
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', (e) => addRipple(btn, e));
  });

  // Hover SFX para tarjetas y tabs
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest(".lesson-card") || e.target.closest(".tab-btn")) {
      SFX.hover();
    }
  });

  // Timer de sesión
  setInterval(updateStats, 30000);
});

window.addEventListener("beforeunload", saveState);
