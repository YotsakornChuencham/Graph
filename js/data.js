/**
 * data.js
 * ---------------------------------------------------------------
 * แหล่งข้อมูลกลางของระบบ TransitFlow
 * เก็บ: รายชื่อสถานี (Vertex), เส้นทางเชื่อมต่อ (Edge/Weighted Graph),
 *       โครงสร้างสายรถ/สถานี (Tree) และข้อมูลสายรถ
 *
 * ไฟล์นี้ไม่มี Logic การคำนวณใด ๆ — มีแต่ข้อมูลดิบเท่านั้น
 * การคำนวณเส้นทางอยู่ใน graph.js และ tree.js
 * ---------------------------------------------------------------
 */

// ===================================================================
// 1) STATION DATA (Vertex) — 8 สถานี/ป้ายในระบบ TransitFlow
// ===================================================================
const STATIONS = [
  { id: "Central", nameTh: "เซ็นทรัล", mode: "rail" },
  { id: "City Center", nameTh: "ซิตี้เซ็นเตอร์", mode: "rail" },
  { id: "University", nameTh: "มหาวิทยาลัย", mode: "rail" },
  { id: "Airport", nameTh: "สนามบิน", mode: "rail" },
  { id: "Old Town", nameTh: "เมืองเก่า", mode: "bus" },
  { id: "Riverside", nameTh: "ริมแม่น้ำ", mode: "bus" },
  { id: "Stadium", nameTh: "สนามกีฬา", mode: "rail" },
  { id: "Market", nameTh: "ตลาด", mode: "bus" },
  { id: "Park", nameTh: "สวนสาธารณะ", mode: "rail" },
  { id: "Temple", nameTh: "วัด", mode: "rail" },
];

// เข้าถึงชื่อไทยของสถานีจาก id ได้อย่างรวดเร็ว
function getStationThaiName(stationId) {
  const station = STATIONS.find((s) => s.id === stationId);
  return station ? station.nameTh : stationId;
}

// ===================================================================
// 2) LINE DATA — ข้อมูลสายรถไฟฟ้า/รถเมล์ (ใช้กับ Tree และป้ายกำกับ Edge)
// ===================================================================
const LINES = {
  "Blue Line": { color: "#1677FF", type: "rail", label: "รถไฟฟ้าสายสีน้ำเงิน" },
  "Green Line": { color: "#19A974", type: "rail", label: "รถไฟฟ้าสายสีเขียว" },
  "Route 1": { color: "#F2994A", type: "bus", label: "รถเมล์สาย 1" },
  "Route 2": { color: "#9B51E0", type: "bus", label: "รถเมล์สาย 2" },
  "Route 3": { color: "#D64545", type: "bus", label: "รถเมล์สาย 3" },
};

// ===================================================================
// 3) GRAPH DATA (Weighted Graph) — 8 Vertex / 9 Edge
//    from, to  = Vertex (สถานี)
//    time      = เวลาเดินทาง (นาที)  -> Weight แบบที่ 1
//    fare      = ค่าโดยสาร (บาท)     -> Weight แบบที่ 2
//    line      = สายที่ให้บริการช่วงนี้ (ใช้แสดงผลบน Itinerary)
// ===================================================================
const EDGES = [
  { from: "Airport", to: "University", time: 10, fare: 25, line: "Blue Line" },
  { from: "University", to: "Temple", time: 3, fare: 12, line: "Blue Line" },
  { from: "Temple", to: "City Center", time: 3, fare: 12, line: "Blue Line" },
  { from: "City Center", to: "Central", time: 5, fare: 15, line: "Blue Line" },

  { from: "Stadium", to: "City Center", time: 8, fare: 25, line: "Green Line" },
  { from: "City Center", to: "Old Town", time: 6, fare: 20, line: "Green Line" },

  { from: "Central", to: "Old Town", time: 7, fare: 20, line: "Route 1" },
  { from: "Temple", to: "Stadium", time: 2, fare: 12, line: "Blue Line" },
  { from: "Temple", to: "Market", time: 2, fare: 12, line: "Route 2" },
  { from: "Park", to: "Market", time: 3, fare: 12, line: "Route 1" },
  { from: "Park", to: "Old Town", time: 2, fare: 12, line: "Route 1" },
  { from: "Market", to: "Riverside", time: 6, fare: 18, line: "Route 2" },
  { from: "Riverside", to: "Old Town", time: 5, fare: 15, line: "Route 3" },
];

// ===================================================================
// 4) TREE DATA — โครงสร้างระบบขนส่งของ TransitFlow
//    Root -> ประเภทการเดินทาง -> สาย -> สถานี (Leaf)
//    ใช้จริงในหน้า Search สำหรับให้ผู้ใช้เลือกต้นทาง/ปลายทาง
// ===================================================================
const transitTree = {
  name: "TransitFlow",
  type: "root",
  children: [
    {
      name: "รถไฟฟ้า",
      type: "category",
      children: [
        {
          name: "Blue Line",
          type: "line",
          children: [
            { name: "Central", type: "station" },
            { name: "University", type: "station" },
            { name: "Temple", type: "station" },
            { name: "Airport", type: "station" },
          ],
        },
        {
          name: "Green Line",
          type: "line",
          children: [
            { name: "Stadium", type: "station" },
            { name: "City Center", type: "station" },
          ],
        },
      ],
    },
    {
      name: "รถเมล์",
      type: "category",
      children: [
        {
          name: "Route 1",
          type: "route",
          children:[
                    { name: "Park", type: "station" },
                    { name: "Market", type: "station" },
                  ],
        },
        {
          name: "Route 2",
          type: "route",
          children: [{ name: "Riverside", type: "station" }],
        },
        {
          name: "Route 3",
          type: "route",
          children: [{ name: "Old Town", type: "station" }],
        },
      ],
    },
  ],
};

// ===================================================================
// 5) POPULAR ROUTES (Mock) — แสดงในหน้า Search เพื่อความสะดวก
// ===================================================================
const POPULAR_ROUTES = [
  { origin: "Central", destination: "Airport" },
  { origin: "University", destination: "Market" },
  { origin: "Old Town", destination: "Stadium" },
  { origin: "Riverside", destination: "City Center" },
];
