/* ══════════════════════════════════════════════════════
   L'Apprenant Français — VERSIÓN SIN JUICE
   Navegación + i18n + Persistencia
══════════════════════════════════════════════════════ */

/* ──────────────── ESTADO GLOBAL ──────────────── */
let lessons = [];
let currentLessonId = null;
let currentView = "explore";
let currentLang = localStorage.getItem("lang") || "es";
let activeFilter = "all";

let studyState = JSON.parse(localStorage.getItem("studyState")) || {
  lessonsViewed: [],
  studyTime: 0,
  userName: "",
  sessionStart: Date.now(),
};
studyState.sessionStart = Date.now();

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

/* ──────────────── NAVEGACIÓN Y UI ──────────────── */
function switchView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  const target = document.getElementById(`view-${viewId}`);
  if (target) target.classList.remove("hidden");

  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  const activeTab = document.querySelector(`[data-view="${viewId}"]`);
  if (activeTab) activeTab.classList.add("active");

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
  localStorage.setItem("lang", currentLang);
  updateAppUI();
}

function updateAppUI() {
  const texts = i18n[currentLang];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (texts[key]) el.textContent = texts[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (texts[key]) el.placeholder = texts[key];
  });

  const langFlag = document.getElementById("langFlag");
  const langText = document.getElementById("langText");
  if (langFlag) langFlag.textContent = currentLang === "es" ? "🇪🇸" : "🇫🇷";
  if (langText) langText.textContent = texts.lang_name;

  renderLessons();
  renderVocab();
  renderDaily();
  updateStats();
}

/* ──────────────── LECCIONES ──────────────── */
async function loadLessons() {
  try {
    const response = await fetch("lessons.json");
    lessons = await response.json();
  } catch (e) {
    try {
      const response = await fetch("./lessons.json");
      lessons = await response.json();
    } catch (e2) {
      console.error("No se pudo cargar lessons.json:", e2);
      return;
    }
  }
  renderLessons();
  renderVocab();
  renderDaily();
  updateStats();
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
    card.addEventListener("click", () => openLesson(lesson.id));
    grid.appendChild(card);
  });
}

function openLesson(id) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) return;

  currentLessonId = id;

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
      .map(
        (ex, i) => `
        <div class="example-item" data-num="${i + 1}">
          <p><strong>${ex.french}</strong></p>
          <p>${ex.spanish}</p>
          ${ex.note ? `<span class="example-note">${ex.note}</span>` : ""}
        </div>
      `,
      )
      .join("");
  }

  if (tipsList) {
    tipsList.innerHTML = (lesson.tips || [])
      .map((tip) => `<li>${tip}</li>`)
      .join("");
  }

  // Card de pronunciación
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
    const footer = document.querySelector(".lesson-footer");
    if (footer) footer.parentNode.insertBefore(pronCard, footer);
  }

  document.getElementById("lessonTab").style.display = "";
  switchView("lesson");

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
  openLesson(filtered[newIdx].id);
}

/* ──────────────── VOCABULARIO ──────────────── */
function renderVocab() {
  const grid = document.getElementById("vocabGrid");
  if (!grid) return;
  grid.innerHTML = "";

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
    card.addEventListener("click", () => card.classList.toggle("flipped"));
    grid.appendChild(card);
  });
}

/* ──────────────── ESTUDIO DIARIO ──────────────── */
function renderDaily() {
  const container = document.getElementById("dailySequence");
  if (!container || lessons.length === 0) return;

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
    item.addEventListener("click", () => openLesson(parseInt(item.dataset.id)));
  });
}

/* ──────────────── PERSISTENCIA Y STATS ──────────────── */
function saveState() {
  localStorage.setItem("studyState", JSON.stringify(studyState));
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

  const nameInput = document.getElementById("nameInput");
  if (nameInput && studyState.userName) {
    nameInput.value = studyState.userName;
  }

  // Tabs
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // Volver
  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.addEventListener("click", () => switchView("explore"));

  // Prev / Next
  const prevBtn = document.getElementById("prevLessonBtn");
  const nextBtn = document.getElementById("nextLessonBtn");
  if (prevBtn) prevBtn.addEventListener("click", () => navigateLesson(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => navigateLesson(1));

  // Guardar perfil
  const saveProfile = document.getElementById("saveProfile");
  if (saveProfile) {
    saveProfile.addEventListener("click", () => {
      const name = nameInput ? nameInput.value.trim() : "";
      studyState.userName = name;
      saveState();
    });
  }

  // Toggle idioma
  const langToggle = document.getElementById("langToggle");
  if (langToggle) langToggle.addEventListener("click", toggleLanguage);

  // Filtros
  const filterBtns = document.querySelectorAll("#levelFilter .chip");
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeFilter = btn.dataset.value;
      renderLessons();
    });
  });

  // Sidebar móvil
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () =>
      sidebar.classList.toggle("open"),
    );
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

  // Timer
  setInterval(updateStats, 30000);
});

window.addEventListener("beforeunload", saveState);
