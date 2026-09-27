/**
 * graph.js
 * ---------------------------------------------------------------
 * แกนหลักของการคำนวณเส้นทางในระบบ TransitFlow
 * สร้าง Adjacency List จาก EDGES (data.js) และให้บริการ:
 *  - dijkstra()   : หาเส้นทางที่ดีที่สุดตาม Weight ที่เลือก (time / fare / balanced)
 *  - bfs() / dfs(): สำรวจโครงข่ายทั้งหมดจากสถานีตั้งต้น
 *  - calculateRouteStats(): สรุปเวลา/ค่าโดยสาร/จำนวนสถานีของ Path
 * ---------------------------------------------------------------
 */

/**
 * สร้าง Adjacency List แบบ Undirected จาก EDGES
 * โครงสร้าง: { StationId: [ { to, time, fare, line }, ... ] }
 * @returns {object}
 */
function buildAdjacencyList() {
  const adjacencyList = {};
  STATIONS.forEach((station) => {
    adjacencyList[station.id] = [];
  });

  EDGES.forEach((edge) => {
    adjacencyList[edge.from].push({
      to: edge.to,
      time: edge.time,
      fare: edge.fare,
      line: edge.line,
    });
    // Graph เป็นแบบสองทิศทาง (เดินทางกลับได้)
    adjacencyList[edge.to].push({
      to: edge.from,
      time: edge.time,
      fare: edge.fare,
      line: edge.line,
    });
  });

  return adjacencyList;
}

// ค่าสูงสุดของ time/fare ในกราฟ ใช้สำหรับ Normalize โหมด "แนะนำ"
function getGraphExtremes() {
  const times = EDGES.map((e) => e.time);
  const fares = EDGES.map((e) => e.fare);
  return {
    maxTime: Math.max(...times),
    maxFare: Math.max(...fares),
  };
}

/**
 * คำนวณ "น้ำหนัก" ของ Edge หนึ่งเส้น ตามโหมดที่เลือก
 * @param {object} edge - { time, fare }
 * @param {'time'|'fare'|'balanced'} weightType
 * @param {object} extremes - { maxTime, maxFare }
 * @returns {number}
 */
function getEdgeWeight(edge, weightType, extremes) {
  if (weightType === "time") return edge.time;
  if (weightType === "fare") return edge.fare;
  // balanced: normalize ทั้งสองค่าให้อยู่ในสเกล 0-1 แล้วรวมกันคนละครึ่ง
  const normTime = edge.time / extremes.maxTime;
  const normFare = edge.fare / extremes.maxFare;
  return normTime * 0.5 + normFare * 0.5;
}

/**
 * Dijkstra's Algorithm — หาเส้นทางที่มีน้ำหนักรวมต่ำสุดระหว่าง 2 สถานี
 * @param {string} start
 * @param {string} end
 * @param {'time'|'fare'|'balanced'} weightType
 * @returns {{path: string[], edgesUsed: object[]} | null}
 */
function dijkstra(start, end, weightType = "time") {
  const adjacencyList = buildAdjacencyList();
  const extremes = getGraphExtremes();

  if (!adjacencyList[start] || !adjacencyList[end]) return null;

  const distances = {};
  const previous = {};
  const previousEdge = {};
  const visited = new Set();

  Object.keys(adjacencyList).forEach((v) => {
    distances[v] = Infinity;
  });
  distances[start] = 0;

  // ใช้ Priority queue อย่างง่ายด้วยการหาโหนดที่ระยะทางน้อยที่สุดในแต่ละรอบ
  while (visited.size < Object.keys(adjacencyList).length) {
    let current = null;
    let currentDist = Infinity;
    for (const v of Object.keys(adjacencyList)) {
      if (!visited.has(v) && distances[v] < currentDist) {
        current = v;
        currentDist = distances[v];
      }
    }

    if (current === null) break; // ส่วนที่เหลือเข้าไม่ถึงกัน
    if (current === end) break; // ถึงปลายทางแล้ว หยุดได้เลย

    visited.add(current);

    for (const neighbor of adjacencyList[current]) {
      if (visited.has(neighbor.to)) continue;
      const weight = getEdgeWeight(neighbor, weightType, extremes);
      const newDist = distances[current] + weight;
      if (newDist < distances[neighbor.to]) {
        distances[neighbor.to] = newDist;
        previous[neighbor.to] = current;
        previousEdge[neighbor.to] = neighbor;
      }
    }
  }

  if (distances[end] === Infinity) return null; // ไม่พบเส้นทาง

  return reconstructPath(previous, previousEdge, start, end);
}

/**
 * ย้อนรอยเส้นทางจากผลลัพธ์ของ Dijkstra กลับเป็นลำดับสถานีและ Edge ที่ใช้
 * @param {object} previous - Node ก่อนหน้าของแต่ละสถานี
 * @param {object} previousEdge - Edge ที่ใช้เดินทางมาถึงสถานีนั้น
 * @param {string} start
 * @param {string} end
 * @returns {{path: string[], edgesUsed: object[]}}
 */
function reconstructPath(previous, previousEdge, start, end) {
  const path = [end];
  const edgesUsed = [];
  let current = end;

  while (current !== start) {
    edgesUsed.unshift(previousEdge[current]);
    current = previous[current];
    path.unshift(current);
  }

  return { path, edgesUsed };
}

/**
 * Breadth-First Search — สำรวจสถานีทั้งหมดทีละระดับจากจุดเริ่มต้น
 * @param {string} start
 * @returns {string[]} ลำดับสถานีที่ถูกเยี่ยมชม
 */
function bfs(start) {
  const adjacencyList = buildAdjacencyList();
  if (!adjacencyList[start]) return [];

  const visited = new Set([start]);
  const queue = [start];
  const order = [];

  while (queue.length > 0) {
    const current = queue.shift();
    order.push(current);
    for (const neighbor of adjacencyList[current]) {
      if (!visited.has(neighbor.to)) {
        visited.add(neighbor.to);
        queue.push(neighbor.to);
      }
    }
  }
  return order;
}

/**
 * Depth-First Search — สำรวจสถานีทั้งหมดโดยลงลึกก่อนย้อนกลับ
 * @param {string} start
 * @returns {string[]} ลำดับสถานีที่ถูกเยี่ยมชม
 */
function dfs(start) {
  const adjacencyList = buildAdjacencyList();
  if (!adjacencyList[start]) return [];

  const visited = new Set();
  const order = [];

  function visit(node) {
    visited.add(node);
    order.push(node);
    for (const neighbor of adjacencyList[node]) {
      if (!visited.has(neighbor.to)) {
        visit(neighbor.to);
      }
    }
  }

  visit(start);
  return order;
}

/**
 * สรุปสถิติของเส้นทาง (เวลารวม, ค่าโดยสารรวม, จำนวนสถานี, จำนวนช่วงต่อ)
 * @param {object[]} edgesUsed - Edge ที่ใช้ในเส้นทาง (มาจาก dijkstra())
 * @returns {{totalTime: number, totalFare: number, stationCount: number, hopCount: number}}
 */
function calculateRouteStats(path, edgesUsed) {
  const totalTime = calculateTotalTime(edgesUsed);
  const totalFare = calculateTotalFare(edgesUsed);
  return {
    totalTime,
    totalFare,
    stationCount: path.length,
    hopCount: edgesUsed.length,
  };
}

/** รวมเวลาทั้งหมดของเส้นทางจาก Edge จริง (ห้าม Hard-code) */
function calculateTotalTime(edgesUsed) {
  return edgesUsed.reduce((sum, edge) => sum + edge.time, 0);
}

/** รวมค่าโดยสารทั้งหมดของเส้นทางจาก Edge จริง (ห้าม Hard-code) */
function calculateTotalFare(edgesUsed) {
  return edgesUsed.reduce((sum, edge) => sum + edge.fare, 0);
}

/**
 * หาเส้นทางที่ดีที่สุดตามโหมดที่ผู้ใช้เลือก แล้วคืนค่าพร้อมสถิติครบชุด
 * @param {string} origin
 * @param {string} destination
 * @param {'time'|'fare'|'balanced'} weightType
 * @returns {object|null}
 */
function calculateRoute(origin, destination, weightType) {
  const result = dijkstra(origin, destination, weightType);
  if (!result) return null;
  const stats = calculateRouteStats(result.path, result.edgesUsed);
  return {
    path: result.path,
    edgesUsed: result.edgesUsed,
    weightType,
    ...stats,
  };
}

/**
 * ตรวจสอบความถูกต้องของ Graph ตอนโหลดระบบ
 * (แสดงผลเฉพาะใน Console ไม่ขึ้นบนหน้าเว็บจริง)
 */
function validateGraph() {
  const vertexCount = STATIONS.length;
  const edgeCount = EDGES.length;
  if (vertexCount < 6) {
    console.error(`[TransitFlow] Vertex count ต่ำกว่าที่กำหนด (พบ ${vertexCount} ต้องการอย่างน้อย 6)`);
  }
  if (edgeCount < 7) {
    console.error(`[TransitFlow] Edge count ต่ำกว่าที่กำหนด (พบ ${edgeCount} ต้องการอย่างน้อย 7)`);
  }
  return { vertexCount, edgeCount };
}
