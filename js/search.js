/**
 * search.js
 * ---------------------------------------------------------------
 * ตรรกะเฉพาะหน้า Search (index.html)
 *  - ใช้ transitTree (tree.js/data.js) สร้างตัวเลือกสถานีต้นทาง/ปลายทาง
 *  - แสดง "โครงสร้างสถานี" (Root/Parent/Child/Leaf) แบบโต้ตอบได้จริง
 *  - แสดงเส้นทางยอดนิยมแบบ Mock และให้คลิกกรอกฟอร์มอัตโนมัติ
 *  - เมื่อกดค้นหา: ตรวจสอบข้อมูล บันทึกลง localStorage แล้วไปหน้า routes.html
 * ---------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  validateGraph();
  validateTree();

  populateStationSelect(document.getElementById("origin-select"));
  populateStationSelect(document.getElementById("destination-select"));

  renderTreeExplorer();
  renderPopularRoutes();
  bindSearchForm();
  bindSwapButton();
  bindTreeSelectionButtons();
  restorePreviousSearch();
});

// สถานีที่ถูกเลือกอยู่ในตัว Tree Explorer ณ ขณะนี้ (ใช้โดยปุ่ม "เลือกเป็นต้นทาง/ปลายทาง")
let selectedTreeStation = null;

/** สลับค่าต้นทาง/ปลายทางในฟอร์ม */
function bindSwapButton() {
  const swapBtn = document.getElementById("swap-stations");
  if (!swapBtn) return;
  swapBtn.addEventListener("click", () => {
    const originSelect = document.getElementById("origin-select");
    const destSelect = document.getElementById("destination-select");
    const temp = originSelect.value;
    originSelect.value = destSelect.value;
    destSelect.value = temp;
  });
}

/**
 * เติมตัวเลือกสถานีลงใน <select> โดยจัดกลุ่มตามสาย (ใช้ Tree จริง ไม่ใช่ List ตายตัว)
 * @param {HTMLSelectElement} selectEl
 */
function populateStationSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = '<option value="" disabled selected>เลือกสถานี/ป้าย</option>';

  // เดินเข้าไปที่ระดับ "หมวดหมู่" ของ Tree (รถไฟฟ้า / รถเมล์)
  transitTree.children.forEach((category) => {
    category.children.forEach((line) => {
      const group = document.createElement("optgroup");
      group.label = `${category.name} · ${line.name}`;
      line.children.forEach((stationNode) => {
        const option = document.createElement("option");
        option.value = stationNode.name;
        option.textContent = getStationThaiName(stationNode.name)
          ? `${stationNode.name} (${getStationThaiName(stationNode.name)})`
          : stationNode.name;
        group.appendChild(option);
      });
      selectEl.appendChild(group);
    });
  });
}

/**
 * แสดงส่วน "โครงสร้างสถานี" แบบ Interactive
 * ใช้ getRootToLeafPath / getParent / getChildren จริงจาก tree.js
 */
function renderTreeExplorer() {
  const listEl = document.getElementById("tree-diagram");
  const cardsEl = document.getElementById("tree-hierarchy-cards");
  const pathEl = document.getElementById("tree-root-leaf-path");
  if (!listEl || !cardsEl || !pathEl) return;

  // วาด Tree ทั้งหมดเป็นรายการที่กดเลือกได้ (preorder ให้ลำดับเป็นธรรมชาติ)
  listEl.innerHTML = "";
  const rootItem = buildTreeNodeElement(transitTree, 0);
  listEl.appendChild(rootItem);

  // ค่าเริ่มต้น: แสดงตัวอย่างตามที่โจทย์กำหนด (City Center)
  showStationHierarchy("City Center");

  listEl.addEventListener("click", (event) => {
    const target = event.target.closest("[data-station]");
    if (!target) return;
    showStationHierarchy(target.dataset.station);
  });
}

/** สร้าง DOM ของ Tree แบบ recursive สำหรับแสดงผล */
function buildTreeNodeElement(node, depth) {
  const li = document.createElement("li");
  li.className = `tree-node tree-node--depth-${depth}`;

  if (node.type === "station") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tree-node__leaf";
    btn.dataset.station = node.name;
    btn.innerHTML = `<span class="tree-node__dot" aria-hidden="true"></span>${node.name}`;
    li.appendChild(btn);
    return li;
  }

  const label = document.createElement("span");
  label.className = "tree-node__label";
  label.textContent = node.name;
  li.appendChild(label);

  if (node.children && node.children.length > 0) {
    const ul = document.createElement("ul");
    ul.className = "tree-node__children";
    node.children.forEach((child) => {
      ul.appendChild(buildTreeNodeElement(child, depth + 1));
    });
    li.appendChild(ul);
  }
  return li;
}

/**
 * แสดงการ์ด Root/Category/Parent/Child/Leaf และเส้นทาง Root → Leaf ของสถานีที่เลือก
 * พร้อมคำอธิบายความสัมพันธ์ในบริบทของระบบขนส่ง (Task 2)
 * @param {string} stationName
 */
function showStationHierarchy(stationName) {
  const path = getRootToLeafPath(transitTree, stationName);
  if (!path) return;

  // Parent ของสถานี (Leaf) ใน Tree นี้คือ "สาย" ที่สถานีนั้นสังกัดอยู่
  const parentNode = getParent(transitTree, stationName);
  // Category คือ Parent ของสาย (เช่น "รถไฟฟ้า" เป็น Parent ของ "Blue Line")
  const categoryNode = parentNode ? getParent(transitTree, parentNode.name) : null;

  document.getElementById("card-root").textContent = transitTree.name;
  document.getElementById("card-category").textContent = categoryNode ? categoryNode.name : "-";
  document.getElementById("card-parent").textContent = parentNode ? parentNode.name : "-";
  document.getElementById("card-child").textContent = stationName;
  document.getElementById("card-leaf").textContent = stationName;

  document.getElementById("tree-root-leaf-path").textContent = path.join(" → ");

  // คำอธิบาย Relationship แบบเข้าใจง่าย อยู่ในบริบทของระบบขนส่ง (ไม่ใช่บทเรียน Graph Theory)
  const relationshipEl = document.getElementById("tree-relationship-desc");
  if (relationshipEl && parentNode && categoryNode) {
    relationshipEl.textContent =
      `${categoryNode.name} เป็นหมวดหมู่การเดินทางภายใต้ ${transitTree.name} (Root), ` +
      `${parentNode.name} เป็นสายที่อยู่ภายใต้ ${categoryNode.name} และเป็น Parent ของสถานี ${stationName}, ` +
      `ส่วน ${stationName} เป็น Leaf เนื่องจากไม่มี Node ลูกต่อในโครงสร้างนี้`;
  }

  // อัปเดตสถานีที่เลือกอยู่ สำหรับปุ่ม "เลือกเป็นต้นทาง/ปลายทาง"
  selectedTreeStation = stationName;
  const selectedLabelEl = document.getElementById("tree-selected-station");
  if (selectedLabelEl) selectedLabelEl.textContent = stationName;

  // ไฮไลต์ Leaf ที่ถูกเลือกอยู่ในแผนภาพ
  document.querySelectorAll(".tree-node__leaf").forEach((btn) => {
    btn.classList.toggle("tree-node__leaf--active", btn.dataset.station === stationName);
  });
}

/**
 * ผูกปุ่ม "เลือกเป็นต้นทาง / เลือกเป็นปลายทาง" ให้ดึงสถานีที่กำลังเลือกอยู่ใน Tree
 * มาใส่ใน Select ต้นทาง/ปลายทางทันที (Task 1 — Tree ใช้เลือกสถานีได้จริง)
 */
function bindTreeSelectionButtons() {
  const originBtn = document.getElementById("btn-set-origin");
  const destBtn = document.getElementById("btn-set-destination");

  if (originBtn) {
    originBtn.addEventListener("click", () => {
      if (!selectedTreeStation) return;
      document.getElementById("origin-select").value = selectedTreeStation;
      showToast(`ตั้ง ${selectedTreeStation} เป็นต้นทางแล้ว`, "success");
    });
  }

  if (destBtn) {
    destBtn.addEventListener("click", () => {
      if (!selectedTreeStation) return;
      document.getElementById("destination-select").value = selectedTreeStation;
      showToast(`ตั้ง ${selectedTreeStation} เป็นปลายทางแล้ว`, "success");
    });
  }
}

/** แสดงเส้นทางยอดนิยม (Mock Data) เป็นการ์ดที่กดแล้วกรอกฟอร์มให้ทันที */
function renderPopularRoutes() {
  const container = document.getElementById("popular-routes");
  if (!container) return;

  container.innerHTML = "";
  POPULAR_ROUTES.forEach((route) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "route-chip";
    card.innerHTML = `
      <span class="route-chip__from">${getStationThaiName(route.origin)}</span>
      <span class="route-chip__arrow" aria-hidden="true">→</span>
      <span class="route-chip__to">${getStationThaiName(route.destination)}</span>
    `;
    card.addEventListener("click", () => {
      document.getElementById("origin-select").value = route.origin;
      document.getElementById("destination-select").value = route.destination;
      showToast(`เลือกเส้นทาง ${route.origin} → ${route.destination} แล้ว`, "info");
    });
    container.appendChild(card);
  });
}

/** ผูก Event การ Submit ฟอร์มค้นหา */
function bindSearchForm() {
  const form = document.getElementById("search-form");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const origin = document.getElementById("origin-select").value;
    const destination = document.getElementById("destination-select").value;
    const errorEl = document.getElementById("search-error");
    errorEl.textContent = "";

    if (!origin || !destination) {
      errorEl.textContent = "กรุณาเลือกสถานีต้นทางและปลายทาง";
      return;
    }
    if (origin === destination) {
      errorEl.textContent = "กรุณาเลือกสถานีต้นทางและปลายทางให้แตกต่างกัน";
      return;
    }

    writeStorage(STORAGE_KEYS.SEARCH, { origin, destination, searchedAt: Date.now() });
    window.location.href = "routes.html";
  });
}

/** หากเคยค้นหามาก่อน ให้ตั้งค่าฟอร์มไว้ล่วงหน้า */
function restorePreviousSearch() {
  const previous = readStorage(STORAGE_KEYS.SEARCH);
  if (!previous) return;
  const originSelect = document.getElementById("origin-select");
  const destSelect = document.getElementById("destination-select");
  if (originSelect && previous.origin) originSelect.value = previous.origin;
  if (destSelect && previous.destination) destSelect.value = previous.destination;
}
