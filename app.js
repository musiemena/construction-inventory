const floors = Array.from({ length: 14 }, (_, index) => index + 1);
const storageKey = "building-inventory-v1";

const starterItems = [
  {
    id: crypto.randomUUID(),
    name: "Safety guard rails",
    category: "Safety",
    floor: 1,
    status: "Stored",
    quantity: 120,
    unit: "pcs",
    minimum: 40,
    cost: 18,
    supplier: "Site safety supplier",
    location: "Ground floor storage",
    notes: "Useful while envelope and finish work continues."
  },
  {
    id: crypto.randomUUID(),
    name: "Electrical conduit",
    category: "Electrical",
    floor: 4,
    status: "Delivered",
    quantity: 850,
    unit: "m",
    minimum: 200,
    cost: 1.9,
    supplier: "Electrical vendor",
    location: "Floor 4 east",
    notes: "Ready for rough-in work."
  },
  {
    id: crypto.randomUUID(),
    name: "PVC plumbing pipe",
    category: "Plumbing",
    floor: 8,
    status: "In use",
    quantity: 310,
    unit: "m",
    minimum: 100,
    cost: 2.4,
    supplier: "Plumbing vendor",
    location: "Floor 8 core",
    notes: "Track usage by shaft area."
  },
  {
    id: crypto.randomUUID(),
    name: "Cement bags",
    category: "Concrete",
    floor: 0,
    status: "Stored",
    quantity: 95,
    unit: "bags",
    minimum: 120,
    cost: 9.5,
    supplier: "Main materials yard",
    location: "Basement store",
    notes: "Below minimum stock."
  }
];

const state = {
  items: loadItems(),
  activeFloor: "",
  view: "items"
};

const elements = {
  towerVisual: document.querySelector("#towerVisual"),
  activeFloorLabel: document.querySelector("#activeFloorLabel"),
  totalItems: document.querySelector("#totalItems"),
  lowStock: document.querySelector("#lowStock"),
  installedItems: document.querySelector("#installedItems"),
  totalValue: document.querySelector("#totalValue"),
  itemList: document.querySelector("#itemList"),
  emptyState: document.querySelector("#emptyState"),
  searchInput: document.querySelector("#searchInput"),
  categoryFilter: document.querySelector("#categoryFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  form: document.querySelector("#itemForm"),
  itemId: document.querySelector("#itemId"),
  nameInput: document.querySelector("#nameInput"),
  categoryInput: document.querySelector("#categoryInput"),
  floorInput: document.querySelector("#floorInput"),
  statusInput: document.querySelector("#statusInput"),
  quantityInput: document.querySelector("#quantityInput"),
  unitInput: document.querySelector("#unitInput"),
  minimumInput: document.querySelector("#minimumInput"),
  costInput: document.querySelector("#costInput"),
  supplierInput: document.querySelector("#supplierInput"),
  locationInput: document.querySelector("#locationInput"),
  notesInput: document.querySelector("#notesInput"),
  resetFormBtn: document.querySelector("#resetFormBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  backupBtn: document.querySelector("#backupBtn"),
  downloadJsonBtn: document.querySelector("#downloadJsonBtn"),
  restoreInput: document.querySelector("#restoreInput"),
  clearDataBtn: document.querySelector("#clearDataBtn")
};

function loadItems() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    return starterItems;
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : starterItems;
  } catch {
    return starterItems;
  }
}

function saveItems() {
  localStorage.setItem(storageKey, JSON.stringify(state.items));
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function floorName(floor) {
  if (Number(floor) === 0) {
    return "Basement";
  }
  return `Floor ${floor}`;
}

function uniqueCategories() {
  return [...new Set(state.items.map((item) => item.category).filter(Boolean))].sort();
}

function filteredItems() {
  const search = elements.searchInput.value.trim().toLowerCase();
  const category = elements.categoryFilter.value;
  const status = elements.statusFilter.value;

  return state.items.filter((item) => {
    const searchable = [
      item.name,
      item.category,
      item.status,
      item.supplier,
      item.location,
      item.notes,
      floorName(item.floor)
    ].join(" ").toLowerCase();

    return (!state.activeFloor || String(item.floor) === String(state.activeFloor))
      && (!search || searchable.includes(search))
      && (!category || item.category === category)
      && (!status || item.status === status);
  });
}

function renderFloorOptions() {
  elements.floorInput.innerHTML = [
    '<option value="0">Basement</option>',
    ...floors.map((floor) => `<option value="${floor}">Floor ${floor}</option>`)
  ].join("");
}

function renderCategoryFilter() {
  const selected = elements.categoryFilter.value;
  elements.categoryFilter.innerHTML = '<option value="">All categories</option>'
    + uniqueCategories().map((category) => `<option value="${category}">${category}</option>`).join("");
  elements.categoryFilter.value = selected;
}

function renderTower() {
  const floorButtons = [
    { value: "", label: "All", count: state.items.length },
    ...floors.slice().reverse().map((floor) => ({
      value: String(floor),
      label: `F${floor}`,
      count: state.items.filter((item) => Number(item.floor) === floor).length
    })),
    {
      value: "0",
      label: "B",
      count: state.items.filter((item) => Number(item.floor) === 0).length
    }
  ];

  elements.towerVisual.innerHTML = "";

  floorButtons.forEach((floor) => {
    const installed = state.items.filter((item) => String(item.floor) === floor.value && item.status === "Installed").length;
    const progress = floor.count ? Math.round((installed / floor.count) * 100) : 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `floor-row${String(state.activeFloor) === floor.value ? " active" : ""}`;
    button.innerHTML = `
      <strong>${floor.label}</strong>
      <span class="progress-track"><span class="progress-fill" style="width:${progress}%"></span></span>
      <span class="count">${floor.count}</span>
    `;
    button.addEventListener("click", () => {
      state.activeFloor = floor.value;
      render();
    });
    elements.towerVisual.appendChild(button);
  });

  elements.activeFloorLabel.textContent = state.activeFloor === ""
    ? "All floors"
    : floorName(state.activeFloor);
}

function renderSummary() {
  const total = state.items.length;
  const low = state.items.filter((item) => Number(item.quantity) <= Number(item.minimum) && Number(item.minimum) > 0).length;
  const installed = state.items.filter((item) => item.status === "Installed").length;
  const value = state.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.cost) || 0), 0);

  elements.totalItems.textContent = total;
  elements.lowStock.textContent = low;
  elements.installedItems.textContent = installed;
  elements.totalValue.textContent = formatMoney(value);
}

function renderItems() {
  const template = document.querySelector("#itemTemplate");
  const list = filteredItems().sort((a, b) => Number(a.floor) - Number(b.floor) || a.name.localeCompare(b.name));

  elements.itemList.innerHTML = "";
  elements.emptyState.style.display = list.length ? "none" : "block";

  list.forEach((item) => {
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".item-card");
    const details = clone.querySelector(".item-details");
    const statusClass = item.status.replace(/\s+/g, "-");

    clone.querySelector(".category").textContent = item.category;
    clone.querySelector("h3").textContent = item.name;
    clone.querySelector(".status").textContent = item.status;
    clone.querySelector(".status").classList.add(statusClass);
    details.innerHTML = `
      <span>${floorName(item.floor)}</span>
      <span>${item.quantity} ${item.unit}</span>
      <span>Min ${item.minimum || 0}</span>
      <span>${formatMoney((Number(item.quantity) || 0) * (Number(item.cost) || 0))}</span>
      <span>${item.supplier || "No supplier"}</span>
      <span>${item.location || "No location"}</span>
    `;
    clone.querySelector(".item-notes").textContent = item.notes || "";
    clone.querySelector(".edit-btn").addEventListener("click", () => editItem(item.id));
    clone.querySelector(".delete-btn").addEventListener("click", () => deleteItem(item.id));

    if (Number(item.quantity) <= Number(item.minimum) && Number(item.minimum) > 0) {
      card.style.borderColor = "#c88433";
    }

    elements.itemList.appendChild(clone);
  });
}

function renderTabs() {
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.view);
  });

  elements.views.forEach((view) => {
    view.classList.toggle("active", view.id === `${state.view}View`);
  });
}

function render() {
  renderCategoryFilter();
  renderTower();
  renderSummary();
  renderItems();
  renderTabs();
}

function setView(view) {
  state.view = view;
  renderTabs();
}

function resetForm() {
  elements.form.reset();
  elements.itemId.value = "";
  elements.quantityInput.value = 1;
  elements.minimumInput.value = 0;
  elements.costInput.value = 0;
}

function readForm() {
  return {
    id: elements.itemId.value || crypto.randomUUID(),
    name: elements.nameInput.value.trim(),
    category: elements.categoryInput.value,
    floor: Number(elements.floorInput.value),
    status: elements.statusInput.value,
    quantity: Number(elements.quantityInput.value),
    unit: elements.unitInput.value.trim(),
    minimum: Number(elements.minimumInput.value) || 0,
    cost: Number(elements.costInput.value) || 0,
    supplier: elements.supplierInput.value.trim(),
    location: elements.locationInput.value.trim(),
    notes: elements.notesInput.value.trim()
  };
}

function editItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  elements.itemId.value = item.id;
  elements.nameInput.value = item.name;
  elements.categoryInput.value = item.category;
  elements.floorInput.value = item.floor;
  elements.statusInput.value = item.status;
  elements.quantityInput.value = item.quantity;
  elements.unitInput.value = item.unit;
  elements.minimumInput.value = item.minimum;
  elements.costInput.value = item.cost;
  elements.supplierInput.value = item.supplier;
  elements.locationInput.value = item.location;
  elements.notesInput.value = item.notes;
  setView("add");
  elements.nameInput.focus();
}

function deleteItem(id) {
  const item = state.items.find((entry) => entry.id === id);
  if (!item) {
    return;
  }

  const confirmed = window.confirm(`Delete ${item.name}?`);
  if (!confirmed) {
    return;
  }

  state.items = state.items.filter((entry) => entry.id !== id);
  saveItems();
  render();
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const headers = ["name", "category", "floor", "status", "quantity", "unit", "minimum", "cost", "supplier", "location", "notes"];
  const rows = state.items.map((item) => headers.map((header) => {
    const value = item[header] ?? "";
    return `"${String(value).replaceAll('"', '""')}"`;
  }).join(","));

  download("building-inventory.csv", [headers.join(","), ...rows].join("\n"), "text/csv");
}

function exportJson() {
  download("building-inventory-backup.json", JSON.stringify(state.items, null, 2), "application/json");
}

function restoreJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) {
        throw new Error("Backup must be a list.");
      }
      state.items = parsed.map((item) => ({ ...item, id: item.id || crypto.randomUUID() }));
      saveItems();
      render();
      setView("items");
    } catch (error) {
      window.alert(`Could not restore backup: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

elements.tabs.forEach((tab) => {
  tab.addEventListener("click", () => setView(tab.dataset.view));
});

[elements.searchInput, elements.categoryFilter, elements.statusFilter].forEach((input) => {
  input.addEventListener("input", renderItems);
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const item = readForm();
  const existingIndex = state.items.findIndex((entry) => entry.id === item.id);

  if (existingIndex >= 0) {
    state.items[existingIndex] = item;
  } else {
    state.items.push(item);
  }

  saveItems();
  resetForm();
  setView("items");
  render();
});

elements.resetFormBtn.addEventListener("click", resetForm);
elements.exportCsvBtn.addEventListener("click", exportCsv);
elements.backupBtn.addEventListener("click", exportJson);
elements.downloadJsonBtn.addEventListener("click", exportJson);
elements.restoreInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) {
    restoreJson(file);
  }
});

elements.clearDataBtn.addEventListener("click", () => {
  const confirmed = window.confirm("Clear all inventory data from this browser?");
  if (!confirmed) {
    return;
  }

  state.items = [];
  saveItems();
  render();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

renderFloorOptions();
render();
