/**
 * routes.js
 * ---------------------------------------------------------------
 * ตรรกะเฉพาะหน้า Route Comparison (routes.html)
 *  - อ่าน Origin/Destination จาก localStorage (มาจากหน้า Search)
 *  - เรียก dijkstra() จริงตามโหมด Weight ที่เลือก (time / fare / balanced)
 *  - แสดง Route Options ที่คำนวณจริงทั้งหมด (ไม่มีข้อมูลตายตัว)
 *  - วาด Mini Network Visualization ด้วย SVG พื้นฐาน พร้อม Highlight Path
 *  - ให้สำรวจโครงข่ายด้วย BFS / DFS
 *  - เมื่อเลือกเส้นทาง บันทึกลง localStorage แล้วไปหน้า itinerary.html
 * ---------------------------------------------------------------
 */

// ตำแหน่งของสถานีบนผัง SVG (ใช้แสดงผลเท่านั้น ไม่เกี่ยวกับการคำนวณ)
const STATION_POSITIONS = {
  Central: { x: 50, y: 150 },
  "City Center": { x: 160, y: 150 },
  University: { x: 260, y: 80 },
  Airport: { x: 370, y: 80 },
  "Old Town": { x: 160, y: 250 },
  Riverside: { x: 260, y: 250 },
  Stadium: { x: 160, y: 50 },
  Market: { x: 260, y: 150 },
  Park: { x: 210, y: 200 },
  Temple: { x: 215, y: 110 },
};

const WEIGHT_LABELS = {
  time: {
    title: "เร็วที่สุด",
    detail: "ใช้เวลาเดินทาง (time) เป็นเกณฑ์คำนวณ",
    weightName: "Time",
    networkLabel: "เวลาเดินทาง (time)",
  },
  fare: {
    title: "ประหยัดที่สุด",
    detail: "ใช้ค่าโดยสาร (fare) เป็นเกณฑ์คำนวณ",
    weightName: "Fare",
    networkLabel: "ค่าโดยสาร (fare)",
  },
  balanced: {
    title: "แนะนำ",
    // Balanced Weight: Normalize Time และ Fare แล้วนำมารวมกันด้วยน้ำหนัก 50% Time / 50% Fare (ดู getEdgeWeight ใน graph.js)
    detail: "ใช้เวลาและค่าโดยสารรวมกันแบบ Normalize (50% Time / 50% Fare) เป็นเกณฑ์คำนวณ",
    weightName: "Time + Fare",
    networkLabel: "เวลา + ค่าโดยสาร (balanced)",
  },
};

let currentSearch = null;
let currentMode = "time";

document.addEventListener("DOMContentLoaded", () => {
  currentSearch = readStorage(STORAGE_KEYS.SEARCH);

  if (!currentSearch || !currentSearch.origin || !currentSearch.destination) {
    showSearchEmptyState();
    return;
  }

  document.getElementById("routes-page").hidden = false;
  document.getElementById("route-origin-label").textContent = getStationThaiName(currentSearch.origin);
  document.getElementById("route-destination-label").textContent = getStationThaiName(
    currentSearch.destination
  );

  renderGraphSummary();
  bindModeTabs();
  bindExplorer();
  computeAndRender();
});

/** แสดง Empty State เมื่อไม่มีข้อมูลค้นหาจากหน้าก่อนหน้า */
function showSearchEmptyState() {
  const main = document.getElementById("routes-main");
  document.getElementById("routes-page").hidden = true;
  renderEmptyState(document.getElementById("routes-empty-state"), {
    title: "ยังไม่มีข้อมูลการค้นหา",
    description: "กรุณาเลือกสถานีต้นทางและปลายทางในหน้าค้นหาก่อน",
    buttonText: "กลับไปหน้าค้นหาเส้นทาง",
    buttonHref: "index.html",
  });
  document.getElementById("routes-empty-state").hidden = false;
}

/** แสดงสรุปข้อมูลเครือข่าย (Vertex/Edge/Weighted Graph/Algorithm) */
function renderGraphSummary() {
  const { vertexCount, edgeCount } = validateGraph();
  document.getElementById("summary-vertex").textContent = vertexCount;
  document.getElementById("summary-edge").textContent = edgeCount;
}

/** ผูก Event ของแท็บโหมด (เร็วที่สุด/ประหยัดที่สุด/แนะนำ) */
function bindModeTabs() {
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.remove("mode-tab--active"));
      tab.classList.add("mode-tab--active");
      currentMode = tab.dataset.mode;
      computeAndRender();
    });
  });
}

/** คำนวณเส้นทางทุกโหมด แล้วเรนเดอร์ทั้งการ์ดตัวเลือกและกราฟ */
function computeAndRender() {
  const { origin, destination } = currentSearch;
  const resultsByMode = {
    time: calculateRoute(origin, destination, "time"),
    fare: calculateRoute(origin, destination, "fare"),
    balanced: calculateRoute(origin, destination, "balanced"),
  };

  const primary = resultsByMode[currentMode];

  document.getElementById("algo-weight-label").textContent = WEIGHT_LABELS[currentMode].detail;

  if (!primary) {
    renderNoRouteFound();
    return;
  }

  renderRouteOptions(resultsByMode);
  renderNetwork(primary.path, currentMode);
  renderPathExample(primary);
}

/** กรณีไม่พบเส้นทางเลย (Origin/Destination ไม่เชื่อมกันในกราฟ) */
function renderNoRouteFound() {
  const list = document.getElementById("route-options-list");
  list.innerHTML = `<p class="route-error">ไม่พบเส้นทางสำหรับข้อมูลที่เลือก</p>`;
  document.getElementById("network-svg").innerHTML = "";
}

/**
 * แสดงการ์ดตัวเลือกเส้นทางทั้งหมดที่คำนวณได้จริงจากทั้ง 3 โหมด
 * (ตัดรายการที่เป็นเส้นทางซ้ำกันออก)
 */
function renderRouteOptions(resultsByMode) {
  const list = document.getElementById("route-options-list");
  list.innerHTML = "";

  const seenPaths = new Set();
  const orderedModes = [currentMode, ...Object.keys(resultsByMode).filter((m) => m !== currentMode)];
  let routeNumber = 0;

  orderedModes.forEach((mode) => {
    const route = resultsByMode[mode];
    if (!route) return;
    const pathKey = route.path.join("-");
    if (seenPaths.has(pathKey)) return;
    seenPaths.add(pathKey);
    routeNumber += 1;

    const isPrimary = mode === currentMode;
    const card = document.createElement("article");
    card.className = `route-card${isPrimary ? " route-card--primary" : ""}`;
    card.innerHTML = `
      <div class="route-card__header">
        <span class="route-card__number">เส้นทางที่ ${routeNumber}</span>
        <span class="route-card__badge${isPrimary ? "" : " route-card__badge--muted"}">${WEIGHT_LABELS[mode].title}</span>
      </div>
      <p class="route-card__path">${route.path.map((s) => getStationThaiName(s)).join(" → ")}</p>
      <div class="route-card__stats">
        <span><strong>${formatMinutes(route.totalTime)}</strong> เวลารวม</span>
        <span><strong>${formatFare(route.totalFare)}</strong> ค่าโดยสารรวม</span>
        <span><strong>${route.stationCount}</strong> สถานี</span>
      </div>
      <p class="route-card__algo">Algorithm: <strong>Dijkstra</strong> · Weight: <strong>${WEIGHT_LABELS[mode].weightName}</strong></p>
      <button type="button" class="btn btn--primary route-card__select">เลือกเส้นทางนี้</button>
    `;
    card.querySelector(".route-card__select").addEventListener("click", () => selectRoute(route, mode));
    list.appendChild(card);
  });
}

/** บันทึกเส้นทางที่ผู้ใช้เลือกลง localStorage แล้วไปหน้ารายละเอียด */
function selectRoute(route, mode) {
  writeStorage(STORAGE_KEYS.SELECTED_ROUTE, {
    origin: currentSearch.origin,
    destination: currentSearch.destination,
    path: route.path,
    edgesUsed: route.edgesUsed,
    totalTime: route.totalTime,
    totalFare: route.totalFare,
    weightType: mode,
    selectedAt: Date.now(),
  });
  showToast("บันทึกเส้นทางที่เลือกแล้ว กำลังไปหน้ารายละเอียด...", "success");
  setTimeout(() => {
    window.location.href = "itinerary.html";
  }, 500);
}

/**
 * วาดโครงข่ายแบบย่อด้วย SVG พื้นฐาน พร้อม Highlight เส้นทางที่กำลังพิจารณา
 * Weight ที่แสดงบนเส้นจะเปลี่ยนตามโหมดที่เลือก (Task 3):
 *  - เร็วที่สุด  -> แสดงเวลา (เช่น 5 min)
 *  - ประหยัดที่สุด -> แสดงค่าโดยสาร (เช่น ฿15)
 *  - แนะนำ      -> แสดงทั้งสองค่า (เช่น 5 min / ฿15)
 * @param {string[]} highlightPath
 * @param {'time'|'fare'|'balanced'} mode
 */
function renderNetwork(highlightPath, mode) {
  const svg = document.getElementById("network-svg");
  svg.innerHTML = "";

  const modeLabelEl = document.getElementById("network-weight-mode-label");
  if (modeLabelEl) modeLabelEl.textContent = WEIGHT_LABELS[mode].networkLabel;
  const highlightEdges = new Set();
  for (let i = 0; i < highlightPath.length - 1; i++) {
    highlightEdges.add(`${highlightPath[i]}|${highlightPath[i + 1]}`);
    highlightEdges.add(`${highlightPath[i + 1]}|${highlightPath[i]}`);
  }

  const svgns = "http://www.w3.org/2000/svg";

  // วาด Edge ทั้งหมดก่อน (อยู่ชั้นล่างสุด)
  EDGES.forEach((edge) => {
    const from = STATION_POSITIONS[edge.from];
    const to = STATION_POSITIONS[edge.to];
    const isHighlighted = highlightEdges.has(`${edge.from}|${edge.to}`);

    const line = document.createElementNS(svgns, "line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("class", isHighlighted ? "network-edge network-edge--active" : "network-edge");
    svg.appendChild(line);

    // แสดง Weight กลางเส้น ตามโหมดที่เลือก (time / fare / balanced)
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const weightLabel = document.createElementNS(svgns, "text");
    weightLabel.setAttribute("x", midX);
    weightLabel.setAttribute("y", midY - 4);
    weightLabel.setAttribute("class", "network-weight");
    weightLabel.textContent = getEdgeWeightLabel(edge, mode);
    svg.appendChild(weightLabel);
  });

  // วาด Vertex (สถานี) ทับด้านบน
  STATIONS.forEach((station) => {
    const pos = STATION_POSITIONS[station.id];
    const isOnPath = highlightPath.includes(station.id);

    const circle = document.createElementNS(svgns, "circle");
    circle.setAttribute("cx", pos.x);
    circle.setAttribute("cy", pos.y);
    circle.setAttribute("r", isOnPath ? 8 : 6);
    circle.setAttribute("class", isOnPath ? "network-node network-node--active" : "network-node");
    svg.appendChild(circle);

    const label = document.createElementNS(svgns, "text");
    label.setAttribute("x", pos.x);
    label.setAttribute("y", pos.y - 12);
    label.setAttribute("class", "network-label");
    label.textContent = station.id;
    svg.appendChild(label);
  });
}

/**
 * สร้างข้อความ Weight ที่แสดงบน Edge ในแผนภาพเครือข่าย ตามโหมดที่เลือก (Task 3)
 * @param {object} edge - { time, fare }
 * @param {'time'|'fare'|'balanced'} mode
 * @returns {string}
 */
function getEdgeWeightLabel(edge, mode) {
  if (mode === "time") return `${edge.time} min`;
  if (mode === "fare") return `฿${edge.fare}`;
  return `${edge.time}′/฿${edge.fare}`;
}

/** แสดง Path ตัวอย่างพร้อมคำอธิบายเชิงบริบทระบบขนส่ง (ข้อกำหนดที่ 22) */
function renderPathExample(route) {
  const container = document.getElementById("path-example");
  const middleStations = route.path.slice(1, -1).map(getStationThaiName).join(", ");
  const originTh = getStationThaiName(route.path[0]);
  const destTh = getStationThaiName(route.path[route.path.length - 1]);

  container.innerHTML = `
    <p class="path-example__route">${route.path.join(" → ")}</p>
    <p class="path-example__desc">
      Path นี้หมายถึงเส้นทางการเดินทางจากสถานี${originTh}ไปยัง${destTh}
      ${middleStations ? `โดยผ่าน${middleStations}` : "แบบตรง ไม่ผ่านสถานีอื่น"}
      ใช้เวลารวม ${formatMinutes(route.totalTime)} ค่าโดยสารรวม ${formatFare(route.totalFare)}
      คำนวณจาก ${route.edgesUsed.length} Edge บนกราฟจริง
    </p>
  `;
}

/** ผูก Event ของปุ่มสำรวจโครงข่ายด้วย BFS / DFS */
function bindExplorer() {
  const resultEl = document.getElementById("explorer-result");
  document.getElementById("btn-bfs").addEventListener("click", () => {
    const order = bfs(currentSearch.origin);
    resultEl.textContent = `BFS: ${order.join(" → ")}`;
  });
  document.getElementById("btn-dfs").addEventListener("click", () => {
    const order = dfs(currentSearch.origin);
    resultEl.textContent = `DFS: ${order.join(" → ")}`;
  });
}
