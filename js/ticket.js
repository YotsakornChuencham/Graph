/**
 * ticket.js
 * ---------------------------------------------------------------
 * ตรรกะเฉพาะหน้า E-Ticket (ticket.html)
 *  - ดึงเส้นทางที่เลือกจาก localStorage (ไม่ Hard-code ข้อมูลใด ๆ)
 *  - สร้าง/อ่าน Ticket ID ที่ผูกกับเส้นทางนั้น (สร้างครั้งเดียวต่อการเลือก)
 *  - สร้างลาย QR Code แบบจำลอง (Pattern กำหนดจาก Ticket ID ไม่ใช่ภาพจริง)
 *  - รองรับการพิมพ์ตั๋ว
 * ---------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  const selected = readStorage(STORAGE_KEYS.SELECTED_ROUTE);

  if (!selected || !selected.path || selected.path.length < 2) {
    showTicketEmptyState();
    return;
  }

  const ticket = getOrCreateTicket(selected);
  document.getElementById("ticket-page").hidden = false;
  renderTicket(ticket, selected);
  bindPrintButton();
});

/** แสดง Empty State เมื่อไม่มีข้อมูลตั๋ว/เส้นทาง */
function showTicketEmptyState() {
  document.getElementById("ticket-page").hidden = true;
  const el = document.getElementById("ticket-empty-state");
  el.hidden = false;
  renderEmptyState(el, {
    title: "ยังไม่มีข้อมูลตั๋ว",
    description: "กรุณาค้นหาและเลือกเส้นทางก่อนออกตั๋วเดินทาง",
    buttonText: "กลับไปหน้าค้นหาเส้นทาง",
    buttonHref: "index.html",
  });
}

/**
 * สร้าง Ticket ID ใหม่ หรือคืนค่า Ticket เดิมถ้าเป็นการเลือกเส้นทางเดียวกัน
 * (ผูกกับ selectedAt ของ Route เพื่อไม่ให้ Ticket เปลี่ยนทุกครั้งที่ Refresh)
 */
function getOrCreateTicket(selected) {
  const existing = readStorage(STORAGE_KEYS.TICKET);
  if (existing && existing.linkedSelectionAt === selected.selectedAt) {
    return existing;
  }

  const ticket = {
    ticketId: generateTicketId(),
    issuedAt: Date.now(),
    linkedSelectionAt: selected.selectedAt,
  };
  writeStorage(STORAGE_KEYS.TICKET, ticket);
  return ticket;
}

/** สร้างรหัสตั๋วรูปแบบ TF-XXXXXX (ตัวเลข/ตัวอักษรสุ่ม) */
function generateTicketId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `TF-${code}`;
}

/** แสดงข้อมูลตั๋วทั้งหมดบนหน้าจอ */
function renderTicket(ticket, selected) {
  const totalTime = calculateTotalTime(selected.edgesUsed);
  const totalFare = calculateTotalFare(selected.edgesUsed);
  const lines = [...new Set(selected.edgesUsed.map((e) => e.line))];

  document.getElementById("ticket-route").textContent = `${getStationThaiName(
    selected.origin
  )} → ${getStationThaiName(selected.destination)}`;
  document.getElementById("ticket-route-en").textContent = `${selected.origin} → ${selected.destination}`;
  document.getElementById("ticket-lines").textContent = lines.join(" · ");
  document.getElementById("ticket-time").textContent = formatMinutes(totalTime);
  document.getElementById("ticket-fare").textContent = formatFare(totalFare);
  document.getElementById("ticket-id").textContent = ticket.ticketId;

  const issuedDate = new Date(ticket.issuedAt);
  document.getElementById("ticket-issued").textContent = issuedDate.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  renderMockQr(ticket.ticketId);
}

/**
 * สร้างลาย QR Code แบบจำลองด้วยตาราง div ที่สุ่มรูปแบบจาก Ticket ID
 * (เพื่อการสาธิตเท่านั้น ไม่ใช่ QR Code จริงที่สแกนได้)
 */
function renderMockQr(ticketId) {
  const grid = document.getElementById("ticket-qr");
  grid.innerHTML = "";
  const size = 9;
  const seed = hashString(ticketId);

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement("div");
    // ใช้ Bit ของ hash กำหนดว่าช่องนี้ทึบหรือโปร่ง เพื่อให้ลายเดิมทุกครั้งของ Ticket ID เดียวกัน
    const bit = (seed >> (i % 32)) & 1;
    const isCornerMarker =
      (i < size * 3 && i % size < 3) ||
      (i < size * 3 && i % size >= size - 3) ||
      (i >= size * (size - 3) && i % size < 3);
    cell.className = `qr-cell ${bit || isCornerMarker ? "qr-cell--on" : ""}`;
    grid.appendChild(cell);
  }
}

/** Hash string อย่างง่ายเพื่อใช้เป็น seed ของลาย QR จำลอง */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** ผูก Event ปุ่มพิมพ์ตั๋ว */
function bindPrintButton() {
  const btn = document.getElementById("btn-print-ticket");
  if (!btn) return;
  btn.addEventListener("click", () => window.print());
}
