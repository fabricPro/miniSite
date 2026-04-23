(() => {
  const STORAGE_KEY = "miniTodo.v1";

  const listEl = document.getElementById("todoList");
  const emptyEl = document.getElementById("empty");
  const countEl = document.getElementById("countText");
  const formEl = document.getElementById("addForm");
  const inputEl = document.getElementById("newTodo");
  const clearDoneBtn = document.getElementById("clearDone");
  const filterBtns = document.querySelectorAll(".chip[data-filter]");

  let todos = loadTodos();
  let filter = "all";

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {}
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.unshift({ id: uid(), text: trimmed, done: false, createdAt: Date.now() });
    saveTodos();
    render();
  }

  function toggleTodo(id) {
    const t = todos.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    saveTodos();
    render();
  }

  function removeTodo(id) {
    const li = listEl.querySelector(`[data-id="${id}"]`);
    if (li) {
      li.classList.add("removing");
      li.addEventListener("animationend", () => finalizeRemove(id), { once: true });
    } else {
      finalizeRemove(id);
    }
  }

  function finalizeRemove(id) {
    todos = todos.filter((x) => x.id !== id);
    saveTodos();
    render();
  }

  function clearCompleted() {
    const hasDone = todos.some((x) => x.done);
    if (!hasDone) return;
    todos = todos.filter((x) => !x.done);
    saveTodos();
    render();
  }

  function visibleTodos() {
    if (filter === "active") return todos.filter((x) => !x.done);
    if (filter === "done") return todos.filter((x) => x.done);
    return todos;
  }

  function render() {
    const list = visibleTodos();
    listEl.innerHTML = "";

    for (const t of list) {
      const li = document.createElement("li");
      li.className = "todo" + (t.done ? " done" : "");
      li.dataset.id = t.id;

      const check = document.createElement("button");
      check.type = "button";
      check.className = "check";
      check.setAttribute("role", "checkbox");
      check.setAttribute("aria-checked", String(t.done));
      check.setAttribute("aria-label", t.done ? "Tamamlandi olarak isaretli" : "Tamamlanmadi");
      check.addEventListener("click", () => toggleTodo(t.id));

      const text = document.createElement("span");
      text.className = "todo-text";
      text.textContent = t.text;
      text.addEventListener("click", () => toggleTodo(t.id));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-btn";
      del.setAttribute("aria-label", "Gorevi sil");
      del.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
        '<path fill="currentColor" d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        "</svg>";
      del.addEventListener("click", () => removeTodo(t.id));

      li.appendChild(check);
      li.appendChild(text);
      li.appendChild(del);
      listEl.appendChild(li);
    }

    const total = todos.length;
    const remaining = todos.filter((x) => !x.done).length;
    if (total === 0) {
      countEl.textContent = "0 gorev";
    } else {
      countEl.textContent = `${remaining}/${total} kaldi`;
    }

    emptyEl.classList.toggle("show", list.length === 0);
  }

  formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(inputEl.value);
    inputEl.value = "";
    inputEl.focus();
  });

  clearDoneBtn.addEventListener("click", () => {
    if (!todos.some((x) => x.done)) return;
    if (confirm("Tamamlanan gorevleri silmek istiyor musun?")) {
      clearCompleted();
    }
  });

  filterBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      filterBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("active", active);
        b.setAttribute("aria-selected", String(active));
      });
      render();
    });
  });

  render();
})();
