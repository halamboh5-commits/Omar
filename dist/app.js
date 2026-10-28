(() => {
  "use strict";

  const STORAGE_KEY = "madar.tasks.v1";
  const THEME_KEY = "madar.theme.v1";
  const PRIORITIES = {
    normal: "عادية",
    important: "مهمة",
    urgent: "عاجلة"
  };
  const RING_LENGTH = 2 * Math.PI * 55;

  const els = {
    form: document.getElementById("addForm"),
    input: document.getElementById("taskInput"),
    priority: document.getElementById("prioritySelect"),
    list: document.getElementById("taskList"),
    empty: document.getElementById("emptyState"),
    filters: Array.from(document.querySelectorAll(".filter")),
    clearDone: document.getElementById("clearDone"),
    ring: document.getElementById("ringValue"),
    percent: document.getElementById("progressPercent"),
    total: document.getElementById("statTotal"),
    done: document.getElementById("statDone"),
    left: document.getElementById("statLeft"),
    hint: document.getElementById("panelHint"),
    greeting: document.getElementById("greeting"),
    today: document.getElementById("todayLabel"),
    theme: document.getElementById("themeToggle")
  };

  const seed = [
    { title: "كتابة خطة الأسبوع", priority: "urgent", done: true },
    { title: "قراءة 20 صفحة من كتابك", priority: "important", done: false },
    { title: "مكالمة قصيرة مع العائلة", priority: "normal", done: false },
    { title: "ترتيب مساحة العمل", priority: "normal", done: true }
  ];

  let tasks = loadTasks();
  let filter = "all";

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage may be unavailable; keep the session usable */
    }
  }

  function loadTasks() {
    const raw = safeGet(STORAGE_KEY);
    if (!raw) return seed.map((task, index) => ({ ...task, id: `seed-${index}` }));
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((task) => task && typeof task.title === "string")
        .map((task, index) => ({
          id: typeof task.id === "string" ? task.id : `restored-${index}`,
          title: task.title.slice(0, 90),
          priority: PRIORITIES[task.priority] ? task.priority : "normal",
          done: Boolean(task.done)
        }));
    } catch {
      return [];
    }
  }

  function saveTasks() {
    safeSet(STORAGE_KEY, JSON.stringify(tasks));
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function visibleTasks() {
    if (filter === "active") return tasks.filter((task) => !task.done);
    if (filter === "done") return tasks.filter((task) => task.done);
    return tasks;
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    const dark = theme === "dark";
    els.theme.setAttribute("aria-pressed", String(dark));
    els.theme.setAttribute("aria-label", dark ? "تبديل الوضع النهاري" : "تبديل الوضع الليلي");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#101715" : "#0f766e");
  }

  function initTheme() {
    const stored = safeGet(THEME_KEY);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light");
  }

  function initDate() {
    const now = new Date();
    try {
      els.today.textContent = new Intl.DateTimeFormat("ar", {
        weekday: "long",
        day: "numeric",
        month: "long"
      }).format(now);
    } catch {
      els.today.textContent = now.toLocaleDateString();
    }
    const hour = now.getHours();
    const name = "عمر";
    if (hour < 5) els.greeting.textContent = `ليلة هادئة، ${name}`;
    else if (hour < 12) els.greeting.textContent = `صباح الخير، ${name}`;
    else if (hour < 17) els.greeting.textContent = `نهارك هادئ، ${name}`;
    else if (hour < 21) els.greeting.textContent = `مساء الخير، ${name}`;
    else els.greeting.textContent = `مساء هادئ، ${name}`;
  }

  function checkIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M20 6 9 17l-5-5");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2.4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
    return svg;
  }

  function trashIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.7");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
    return svg;
  }

  function buildTask(task) {
    const li = document.createElement("li");
    li.className = `task${task.done ? " is-done" : ""}`;
    li.dataset.id = task.id;
    li.dataset.priority = task.priority;

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "check";
    toggle.setAttribute("aria-pressed", String(task.done));
    toggle.setAttribute("aria-label", task.done ? `إعادة فتح: ${task.title}` : `إنجاز: ${task.title}`);
    toggle.append(checkIcon());
    toggle.addEventListener("click", () => toggleTask(task.id));

    const body = document.createElement("div");
    body.className = "task-body";

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = task.title;

    const meta = document.createElement("span");
    meta.className = "task-meta";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const priority = document.createElement("b");
    priority.textContent = PRIORITIES[task.priority];
    const state = document.createElement("span");
    state.textContent = task.done ? "· منجزة" : "· قيد العمل";
    meta.append(dot, priority, state);

    body.append(title, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete";
    remove.setAttribute("aria-label", `حذف: ${task.title}`);
    remove.append(trashIcon());
    remove.addEventListener("click", () => deleteTask(task.id));

    li.append(toggle, body, remove);
    return li;
  }

  function updateStats() {
    const total = tasks.length;
    const done = tasks.filter((task) => task.done).length;
    const left = total - done;
    const ratio = total === 0 ? 0 : done / total;

    els.total.textContent = String(total);
    els.done.textContent = String(done);
    els.left.textContent = String(left);
    els.percent.textContent = `${Math.round(ratio * 100)}%`;
    els.ring.style.strokeDasharray = String(RING_LENGTH);
    els.ring.style.strokeDashoffset = String(RING_LENGTH * (1 - ratio));

    els.hint.textContent =
      total === 0 ? "لا شيء بعد" : left === 0 ? "أنجزت كل شيء" : `${left} متبقية`;

    els.clearDone.disabled = done === 0;
  }

  function render() {
    const items = visibleTasks();
    els.list.replaceChildren(...items.map(buildTask));
    els.empty.hidden = items.length > 0;
    updateStats();
  }

  function toggleTask(id) {
    tasks = tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task));
    saveTasks();
    render();
  }

  function deleteTask(id) {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    render();
  }

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = els.input.value.trim();
    if (!title) {
      els.input.focus();
      return;
    }
    tasks = [
      {
        id: newId(),
        title: title.slice(0, 90),
        priority: PRIORITIES[els.priority.value] ? els.priority.value : "normal",
        done: false
      },
      ...tasks
    ];
    els.input.value = "";
    els.priority.value = "normal";
    saveTasks();
    render();
    els.input.focus();
  });

  els.filters.forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter || "all";
      els.filters.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      render();
    });
  });

  els.clearDone.addEventListener("click", () => {
    tasks = tasks.filter((task) => !task.done);
    saveTasks();
    render();
  });

  els.theme.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
    safeSet(THEME_KEY, next);
  });

  initTheme();
  initDate();
  render();
})();
