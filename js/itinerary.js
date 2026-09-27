/**
 * itinerary.js
 * ---------------------------------------------------------------
 * ตรรกะเฉพาะหน้า Itinerary (itinerary.html)
 *  - อ่านเส้นทางที่เลือกจาก localStorage (มาจากหน้า Route Comparison)
 *  - สร้าง Timeline ตามเวลาออกเดินทางจริง + เวลาแต่ละช่วงจาก Edge Weight
 *  - สรุปเวลารวม/ค่าโดยสารรวม คำนวณจาก Edge จริง (ไม่ Hard-code)
 *  - ปุ่ม "ยืนยันการเดินทาง" นำไปหน้า E-Ticket
 * ---------------------------------------------------------------
 */

document.addEventListener("DOMContentLoaded", () => {
  const selected = readStorage(STORAGE_KEYS.SELECTED_ROUTE);

  if (!selected || !selected.path || selected.path.length < 2) {
    showItineraryEmptyState();
    return;
  }

  document.getElementById("itinerary-page").hidden = false;
  renderSummary(selected);
  renderTimeline(selected);
  bindConfirmButton();
});

/** แสดง Empty State เมื่อยังไม่มีเส้นทางที่เลือก */
function showItineraryEmptyState() {
  document.getElementById("itinerary-page").hidden = true;
  const el = document.getElementById("itinerary-empty-state");
  el.hidden = false;
  renderEmptyState(el, {
    title: "ยังไม่มีเส้นทางที่เลือก",
    description: "กรุณาเลือกเส้นทางจากหน้าเปรียบเทียบเส้นทางก่อน",
    buttonText: "กลับไปเลือกเส้นทาง",
    buttonHref: "index.html",
  });
}

/** แสดงสรุปต้นทาง/ปลายทาง/เวลารวม/ค่าโดยสารรวม */
function renderSummary(selected) {
  document.getElementById("itinerary-origin").textContent = getStationThaiName(selected.origin);
  document.getElementById("itinerary-destination").textContent = getStationThaiName(selected.destination);

  const totalTime = calculateTotalTime(selected.edgesUsed);
  const totalFare = calculateTotalFare(selected.edgesUsed);

  document.getElementById("itinerary-total-time").textContent = formatMinutes(totalTime);
  document.getElementById("itinerary-total-fare").textContent = formatFare(totalFare);
  document.getElementById("itinerary-weight-mode").textContent = WEIGHT_MODE_TH[selected.weightType] || "-";
}

const WEIGHT_MODE_TH = {
  time: "เร็วที่สุด (Weight: time)",
  fare: "ประหยัดที่สุด (Weight: fare)",
  balanced: "แนะนำ (Weight: time + fare)",
};

/** สร้าง Timeline ทีละสถานี พร้อมเวลาออกเดินทางจริงและสายที่ใช้ */
function renderTimeline(selected) {
  const list = document.getElementById("timeline-list");
  list.innerHTML = "";

  // เวลาออกเดินทาง: ใช้เวลาปัจจุบัน ปัดขึ้นเป็นหลัก 5 นาทีที่ใกล้ที่สุด เพื่อความสมจริง
  const now = new Date();
  const roundedMinutes = Math.ceil(now.getMinutes() / 5) * 5;
  now.setMinutes(roundedMinutes, 0, 0);
  let clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes() % 60).padStart(2, "0")}`;

  selected.path.forEach((stationId, index) => {
    const item = document.createElement("li");
    item.className = "timeline-item";

    const isFirst = index === 0;
    const isLast = index === selected.path.length - 1;
    const edge = selected.edgesUsed[index]; // เส้นทางที่ "ออกจาก" สถานีนี้ (ไม่มีถ้าเป็นสถานีสุดท้าย)

    item.innerHTML = `
      <div class="timeline-item__time">${clock}</div>
      <div class="timeline-item__dot ${isFirst || isLast ? "timeline-item__dot--endpoint" : ""}" aria-hidden="true"></div>
      <div class="timeline-item__content">
        <p class="timeline-item__station">${stationId} <span class="timeline-item__station-th">${getStationThaiName(stationId)}</span></p>
        ${
          edge
            ? `<p class="timeline-item__line">ขึ้น <strong>${edge.line}</strong> · ${formatMinutes(edge.time)} · ${formatFare(edge.fare)}</p>`
            : `<p class="timeline-item__line timeline-item__line--end">ถึงจุดหมายปลายทาง</p>`
        }
      </div>
    `;
    list.appendChild(item);

    if (edge) {
      clock = addMinutesToTime(clock, edge.time);
    }
  });
}

/** ผูก Event ปุ่มยืนยันการเดินทาง -> ไปหน้า E-Ticket */
function bindConfirmButton() {
  const btn = document.getElementById("btn-confirm-trip");
  if (!btn) return;
  btn.addEventListener("click", () => {
    showToast("ยืนยันการเดินทางแล้ว กำลังออกตั๋ว...", "success");
    setTimeout(() => {
      window.location.href = "ticket.html";
    }, 500);
  });
}
