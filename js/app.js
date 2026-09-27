/**
 * app.js
 * ---------------------------------------------------------------
 * โค้ดที่ใช้ร่วมกันทุกหน้า: Navigation (รวม Hamburger บนมือถือ),
 * ระบบ Toast Notification, และฟังก์ชัน Format ค่าต่าง ๆ ที่ใช้ซ้ำ
 * ---------------------------------------------------------------
 */

const STORAGE_KEYS = {
  SEARCH: "transitflowSearch",
  SELECTED_ROUTE: "transitflowSelectedRoute",
  TICKET: "transitflowTicket",
};

/** เปิด/ปิดเมนูมือถือ */
function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.querySelector(".nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("nav-menu--open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // ปิดเมนูอัตโนมัติเมื่อคลิกลิงก์ (มือถือ)
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("nav-menu--open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/** ทำให้ลิงก์ Navigation ของหน้าปัจจุบัน active */
function highlightActiveNav() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-menu a").forEach((link) => {
    const linkPage = link.getAttribute("href");
    if (linkPage === currentPage) {
      link.classList.add("nav-link--active");
      link.setAttribute("aria-current", "page");
    }
  });
}

/**
 * แสดง Toast Notification สั้น ๆ มุมล่างของหน้าจอ
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = "info") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  setTimeout(() => {
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

/** จัดรูปแบบเวลาเป็น "N นาที" */
function formatMinutes(minutes) {
  return `${minutes} นาที`;
}

/** จัดรูปแบบค่าโดยสารเป็น "฿N" */
function formatFare(fare) {
  return `฿${fare}`;
}

/** บวกนาทีเข้ากับเวลา HH:MM แล้วคืนค่าเวลาใหม่เป็นสตริง HH:MM */
function addMinutesToTime(timeStr, minutesToAdd) {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/** อ่านค่าจาก localStorage อย่างปลอดภัย (คืนค่า null ถ้าไม่มี/ผิดรูปแบบ) */
function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[TransitFlow] อ่านข้อมูล ${key} ไม่สำเร็จ:`, err);
    return null;
  }
}

/** เขียนค่าลง localStorage อย่างปลอดภัย */
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[TransitFlow] บันทึกข้อมูล ${key} ไม่สำเร็จ:`, err);
    return false;
  }
}

/** สร้าง Empty State element แบบใช้ซ้ำได้ทุกหน้า */
function renderEmptyState(container, { title, description, buttonText, buttonHref }) {
  container.innerHTML = "";
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";
  wrapper.innerHTML = `
    <div class="empty-state__icon" aria-hidden="true">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2"/>
        <path d="M16 24h16M24 16v16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </div>
    <h2 class="empty-state__title">${title}</h2>
    <p class="empty-state__desc">${description}</p>
    <a class="btn btn--primary" href="${buttonHref}">${buttonText}</a>
  `;
  container.appendChild(wrapper);
}

// เริ่มต้นส่วนที่ใช้ร่วมกันทุกหน้าเมื่อ DOM พร้อม
document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  highlightActiveNav();
});
