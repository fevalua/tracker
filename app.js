const STORAGE_KEY = "fevalua-work-checklist-v1";
const OLD_STORAGE_KEY = "transition-tracker-v1";

const defaultProjects = [
  { id: "youtour", name: "YouTour", type: "smm", color: "#7367f0" },
  { id: "sekta", name: "Секта", type: "smm", color: "#2f7cf6" },
  { id: "design", name: "Дизайн", type: "design", color: "#2fbf8f" },
  { id: "other", name: "Другое", type: "other", color: "#f0a633" },
];

const defaultState = {
  settings: {
    monthlyGoal: 150000,
    designGoal: 100000,
    savingsGoal: 50000,
  },
  activeDate: todayISO(),
  projects: defaultProjects,
  tasks: [],
  money: [],
  reviews: [],
};

let state = loadState();

const elements = {
  navTabs: document.querySelectorAll("[data-tab]"),
  panels: document.querySelectorAll("[data-panel]"),
  currentMonthLabel: document.getElementById("currentMonthLabel"),
  activeDate: document.getElementById("activeDate"),
  dayTitle: document.getElementById("dayTitle"),
  doneCount: document.getElementById("doneCount"),
  donePercent: document.getElementById("donePercent"),
  todaySmmCount: document.getElementById("todaySmmCount"),
  todayDesignCount: document.getElementById("todayDesignCount"),
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskProject: document.getElementById("taskProject"),
  taskType: document.getElementById("taskType"),
  taskTime: document.getElementById("taskTime"),
  taskGroups: document.getElementById("taskGroups"),
  planList: document.getElementById("planList"),
  monthIncome: document.getElementById("monthIncome"),
  incomeProgress: document.getElementById("incomeProgress"),
  smmIncome: document.getElementById("smmIncome"),
  smmShare: document.getElementById("smmShare"),
  designIncome: document.getElementById("designIncome"),
  designShare: document.getElementById("designShare"),
  monthExpenses: document.getElementById("monthExpenses"),
  expenseShare: document.getElementById("expenseShare"),
  monthSaved: document.getElementById("monthSaved"),
  savingsProgress: document.getElementById("savingsProgress"),
  netBalance: document.getElementById("netBalance"),
  netBalanceNote: document.getElementById("netBalanceNote"),
  moneyForm: document.getElementById("moneyForm"),
  moneyKind: document.getElementById("moneyKind"),
  moneyDate: document.getElementById("moneyDate"),
  moneySource: document.getElementById("moneySource"),
  moneyAmount: document.getElementById("moneyAmount"),
  moneyList: document.getElementById("moneyList"),
  projectForm: document.getElementById("projectForm"),
  projectName: document.getElementById("projectName"),
  projectType: document.getElementById("projectType"),
  projectColor: document.getElementById("projectColor"),
  projectList: document.getElementById("projectList"),
  weekSmmShare: document.getElementById("weekSmmShare"),
  weekDesignShare: document.getElementById("weekDesignShare"),
  weekDoneTasks: document.getElementById("weekDoneTasks"),
  reviewForm: document.getElementById("reviewForm"),
  reviewMonth: document.getElementById("reviewMonth"),
  reviewText: document.getElementById("reviewText"),
  reviewList: document.getElementById("reviewList"),
  exportButton: document.getElementById("exportButton"),
  importInput: document.getElementById("importInput"),
  toast: document.getElementById("toast"),
};

init();

function init() {
  elements.activeDate.value = state.activeDate || todayISO();
  elements.moneyDate.value = todayISO();
  elements.reviewMonth.value = todayISO().slice(0, 7);
  bindEvents();
  render();
}

function bindEvents() {
  elements.navTabs.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  elements.activeDate.addEventListener("change", () => {
    state.activeDate = elements.activeDate.value;
    persist();
  });

  elements.taskProject.addEventListener("change", () => {
    const project = getProject(elements.taskProject.value);
    if (project) elements.taskType.value = project.type;
  });

  elements.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTask();
  });

  elements.moneyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addMoneyEntry();
  });

  elements.projectForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addProject();
  });

  elements.reviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveReview();
  });

  elements.exportButton.addEventListener("click", exportData);
  elements.importInput.addEventListener("change", importData);
}

function addTask() {
  const project = getProject(elements.taskProject.value) || state.projects[0];
  state.tasks.push({
    id: uid(),
    title: elements.taskTitle.value.trim(),
    date: state.activeDate,
    projectId: project.id,
    type: elements.taskType.value,
    time: elements.taskTime.value,
    done: false,
    createdAt: new Date().toISOString(),
  });
  elements.taskForm.reset();
  elements.taskProject.value = project.id;
  elements.taskType.value = project.type;
  persist("Задача добавлена");
}

function addMoneyEntry() {
  state.money.push({
    id: uid(),
    kind: elements.moneyKind.value,
    date: elements.moneyDate.value,
    source: elements.moneySource.value.trim(),
    amount: toNumber(elements.moneyAmount.value),
  });
  elements.moneyForm.reset();
  elements.moneyDate.value = todayISO();
  persist("Запись добавлена");
}

function addProject() {
  const type = elements.projectType.value;
  state.projects.push({
    id: uid(),
    name: elements.projectName.value.trim(),
    type,
    color: elements.projectColor.value,
  });
  elements.projectForm.reset();
  elements.projectColor.value = "#2f7cf6";
  persist("Проект добавлен");
}

function saveReview() {
  const month = elements.reviewMonth.value;
  const existing = state.reviews.find((review) => review.month === month);
  if (existing) {
    existing.text = elements.reviewText.value.trim();
    existing.updatedAt = new Date().toISOString();
  } else {
    state.reviews.push({
      id: uid(),
      month,
      text: elements.reviewText.value.trim(),
      createdAt: new Date().toISOString(),
    });
  }
  elements.reviewText.value = "";
  persist("Итог сохранен");
}

function render() {
  renderProjectOptions();
  renderDay();
  renderPlan();
  renderMoney();
  renderProjects();
  renderReviews();
}

function renderProjectOptions() {
  elements.taskProject.innerHTML = state.projects
    .map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`)
    .join("");
  if (!elements.taskProject.value && state.projects[0]) {
    elements.taskProject.value = state.projects[0].id;
    elements.taskType.value = state.projects[0].type;
  }
}

function renderDay() {
  const date = state.activeDate || todayISO();
  const dayTasks = tasksByDate(date);
  const done = dayTasks.filter((task) => task.done).length;
  const percent = dayTasks.length ? Math.round((done / dayTasks.length) * 100) : 0;
  const smmCount = dayTasks.filter((task) => task.type === "smm").length;
  const designCount = dayTasks.filter((task) => task.type === "design").length;

  elements.currentMonthLabel.textContent = formatMonth(new Date(`${date}T00:00:00`));
  elements.dayTitle.textContent = formatLongDate(date);
  elements.doneCount.textContent = `${done}/${dayTasks.length}`;
  elements.donePercent.textContent = `${percent}% задач`;
  elements.todaySmmCount.textContent = smmCount;
  elements.todayDesignCount.textContent = designCount;

  const grouped = groupTasks(dayTasks);
  elements.taskGroups.innerHTML = grouped
    .map(([projectId, tasks]) => renderTaskGroup(projectId, tasks))
    .join("") || emptyState("На этот день задач пока нет.");

  bindTaskButtons();
}

function renderTaskGroup(projectId, tasks) {
  const project = getProject(projectId) || { name: "Без проекта", color: "#8c96a8" };
  const done = tasks.filter((task) => task.done).length;
  return `
    <article class="task-group">
      <header>
        <div>
          <span class="project-dot" style="background:${project.color}"></span>
          <h3>${escapeHtml(project.name)}</h3>
        </div>
        <small>${done}/${tasks.length}</small>
      </header>
      <div class="task-list">
        ${tasks.map(renderTask).join("")}
      </div>
    </article>
  `;
}

function renderTask(task) {
  return `
    <div class="task-item ${task.done ? "done" : ""}">
      <button class="check-button" data-toggle-task="${task.id}" type="button" aria-label="Отметить задачу">
        ${task.done ? "✓" : ""}
      </button>
      <div class="task-copy">
        <strong>${escapeHtml(task.title)}</strong>
        <span>${task.time ? `${task.time} · ` : ""}${typeLabel(task.type)}</span>
      </div>
      <button class="tiny-button" data-move-task="${task.id}" type="button">завтра</button>
      <button class="icon-button" data-delete-task="${task.id}" type="button" aria-label="Удалить">×</button>
    </div>
  `;
}

function bindTaskButtons() {
  document.querySelectorAll("[data-toggle-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = getTask(button.dataset.toggleTask);
      if (!task) return;
      task.done = !task.done;
      persist();
    });
  });

  document.querySelectorAll("[data-move-task]").forEach((button) => {
    button.addEventListener("click", () => {
      const task = getTask(button.dataset.moveTask);
      if (!task) return;
      task.date = addDays(task.date, 1);
      task.done = false;
      persist("Перенесено на завтра");
    });
  });

  document.querySelectorAll("[data-delete-task]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tasks = state.tasks.filter((task) => task.id !== button.dataset.deleteTask);
      persist("Задача удалена");
    });
  });
}

function renderPlan() {
  const days = getNextDays(7, state.activeDate || todayISO());
  elements.planList.innerHTML = days
    .map((date) => {
      const tasks = tasksByDate(date);
      return `
        <article class="plan-day">
          <header>
            <strong>${formatLongDate(date)}</strong>
            <span>${tasks.filter((task) => task.done).length}/${tasks.length}</span>
          </header>
          ${tasks.length ? tasks.map(renderPlanTask).join("") : `<p>Пока пусто.</p>`}
        </article>
      `;
    })
    .join("");
}

function renderPlanTask(task) {
  const project = getProject(task.projectId);
  return `
    <div class="plan-task">
      <span class="project-dot" style="background:${project?.color || "#8c96a8"}"></span>
      <span>${task.time ? `${task.time} · ` : ""}${escapeHtml(task.title)}</span>
    </div>
  `;
}

function renderMoney() {
  const monthKey = todayISO().slice(0, 7);
  const monthEntries = state.money.filter((entry) => entry.date?.startsWith(monthKey));
  const income = sumMoney(monthEntries, "income");
  const expenses = sumMoney(monthEntries, "expense");
  const savings = sumMoney(monthEntries, "saving");
  const smmIncome = monthEntries
    .filter((entry) => entry.kind === "income" && /smm|youtour|секта/i.test(entry.source))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const designIncome = monthEntries
    .filter((entry) => entry.kind === "income" && /дизайн|design|сайт|лендинг/i.test(entry.source))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const net = income - expenses;

  elements.monthIncome.textContent = money(income);
  elements.incomeProgress.textContent = `${percent(income, state.settings.monthlyGoal)}% от цели ${money(state.settings.monthlyGoal)}`;
  elements.smmIncome.textContent = money(smmIncome);
  elements.smmShare.textContent = `${percent(smmIncome, income)}% дохода`;
  elements.designIncome.textContent = money(designIncome);
  elements.designShare.textContent = `${percent(designIncome, income)}% дохода`;
  elements.monthExpenses.textContent = money(expenses);
  elements.expenseShare.textContent = `${percent(expenses, income)}% от дохода`;
  elements.monthSaved.textContent = money(savings);
  elements.savingsProgress.textContent = `${percent(savings, state.settings.savingsGoal)}% от цели`;
  elements.netBalance.textContent = money(net);
  elements.netBalanceNote.textContent = net >= 0 ? "после расходов" : "расходы выше дохода";

  elements.moneyList.innerHTML = [...state.money]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map(renderMoneyEntry)
    .join("") || emptyState("Финансовых записей пока нет.");

  document.querySelectorAll("[data-delete-money]").forEach((button) => {
    button.addEventListener("click", () => {
      state.money = state.money.filter((entry) => entry.id !== button.dataset.deleteMoney);
      persist("Запись удалена");
    });
  });
}

function renderMoneyEntry(entry) {
  return `
    <article class="list-row">
      <div>
        <strong>${escapeHtml(entry.source)}</strong>
        <span>${formatDate(entry.date)} · ${moneyKindLabel(entry.kind)}</span>
      </div>
      <b>${money(entry.amount)}</b>
      <button class="icon-button" data-delete-money="${entry.id}" type="button">×</button>
    </article>
  `;
}

function renderProjects() {
  elements.projectList.innerHTML = state.projects
    .map((project) => {
      const tasks = state.tasks.filter((task) => task.projectId === project.id);
      const done = tasks.filter((task) => task.done).length;
      return `
        <article class="project-card">
          <header>
            <span class="project-dot" style="background:${project.color}"></span>
            <strong>${escapeHtml(project.name)}</strong>
          </header>
          <p>${typeLabel(project.type)} · задач: ${done}/${tasks.length}</p>
          <button class="tiny-button" data-delete-project="${project.id}" type="button">удалить</button>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll("[data-delete-project]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.projects.length <= 1) return showToast("Нужен хотя бы один проект");
      state.projects = state.projects.filter((project) => project.id !== button.dataset.deleteProject);
      state.tasks = state.tasks.map((task) =>
        task.projectId === button.dataset.deleteProject ? { ...task, projectId: state.projects[0].id } : task,
      );
      persist("Проект удален");
    });
  });
}

function renderReviews() {
  const weekTasks = getNextDays(7, addDays(todayISO(), -6)).flatMap(tasksByDate);
  const smm = weekTasks.filter((task) => task.type === "smm").length;
  const design = weekTasks.filter((task) => task.type === "design").length;
  const total = weekTasks.length;
  elements.weekSmmShare.textContent = `${percent(smm, total)}%`;
  elements.weekDesignShare.textContent = `${percent(design, total)}%`;
  elements.weekDoneTasks.textContent = weekTasks.filter((task) => task.done).length;

  elements.reviewList.innerHTML = [...state.reviews]
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((review) => `
      <article class="review-card">
        <strong>${formatReviewMonth(review.month)}</strong>
        <p>${escapeHtml(review.text)}</p>
      </article>
    `)
    .join("") || emptyState("Итогов пока нет.");
}

function setActiveTab(tab) {
  elements.navTabs.forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  elements.panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === tab));
}

function persist(message) {
  saveState();
  render();
  if (message) showToast(message);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return normalizeState(JSON.parse(raw));
    } catch {
      return structuredClone(defaultState);
    }
  }

  const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
  if (oldRaw) {
    try {
      return migrateOldState(JSON.parse(oldRaw));
    } catch {
      return structuredClone(defaultState);
    }
  }

  return structuredClone(defaultState);
}

function normalizeState(parsed) {
  return {
    ...structuredClone(defaultState),
    ...parsed,
    settings: { ...defaultState.settings, ...parsed.settings },
    projects: parsed.projects?.length ? parsed.projects : defaultProjects,
    tasks: parsed.tasks || [],
    money: parsed.money || [],
    reviews: parsed.reviews || [],
  };
}

function migrateOldState(oldState) {
  const next = structuredClone(defaultState);
  next.settings = { ...next.settings, ...oldState.settings };
  next.money = [
    ...(oldState.income || []).map((entry) => ({
      id: entry.id || uid(),
      kind: "income",
      date: entry.date || todayISO(),
      source: entry.source || "Доход",
      amount: toNumber(entry.amount),
    })),
    ...(oldState.expenses || []).map((entry) => ({
      id: entry.id || uid(),
      kind: "expense",
      date: entry.date || todayISO(),
      source: entry.category || "Расход",
      amount: toNumber(entry.amount),
    })),
    ...(oldState.savings || []).map((entry) => ({
      id: entry.id || uid(),
      kind: "saving",
      date: entry.date || todayISO(),
      source: entry.goal || "Накопления",
      amount: toNumber(entry.amount),
    })),
  ];
  return next;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `fevalua-checklist-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(reader.result));
      persist("Данные импортированы");
    } catch {
      showToast("Не получилось импортировать файл");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function groupTasks(tasks) {
  const order = state.projects.map((project) => project.id);
  const grouped = new Map();
  tasks
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"))
    .forEach((task) => {
      const key = task.projectId || "other";
      grouped.set(key, [...(grouped.get(key) || []), task]);
    });
  return [...grouped.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
}

function tasksByDate(date) {
  return state.tasks.filter((task) => task.date === date);
}

function getTask(id) {
  return state.tasks.find((task) => task.id === id);
}

function getProject(id) {
  return state.projects.find((project) => project.id === id);
}

function sumMoney(entries, kind) {
  return entries.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.amount, 0);
}

function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function typeLabel(type) {
  return {
    smm: "SMM",
    design: "Дизайн",
    money: "Деньги",
    personal: "Личное",
    other: "Другое",
  }[type] || "Другое";
}

function moneyKindLabel(kind) {
  return {
    income: "доход",
    expense: "расход",
    saving: "накопление",
  }[kind] || kind;
}

function emptyState(text) {
  return `<article class="empty-state">${text}</article>`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 2200);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateValue, amount) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function getNextDays(count, startDate) {
  return Array.from({ length: count }, (_, index) => addDays(startDate, index));
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function formatLongDate(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMonth(date) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatReviewMonth(value) {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
