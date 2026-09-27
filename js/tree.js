/**
 * tree.js
 * ---------------------------------------------------------------
 * ฟังก์ชันสำหรับจัดการโครงสร้าง Tree ของระบบขนส่ง (transitTree ใน data.js)
 * ใช้จริงในหน้า Search เพื่อให้ผู้ใช้เลือกสถานีต้นทาง/ปลายทาง
 * ผ่านโครงสร้างหมวดหมู่ -> สาย -> สถานี
 * ---------------------------------------------------------------
 */

/**
 * ค้นหา Node จาก Tree ด้วยชื่อ (Depth-First)
 * @param {object} node - จุดเริ่มค้นหา (ปกติคือ transitTree)
 * @param {string} name - ชื่อ Node ที่ต้องการหา
 * @returns {object|null}
 */
function findNode(node, name) {
  if (!node) return null;
  if (node.name === name) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNode(child, name);
    if (found) return found;
  }
  return null;
}

/**
 * หา Parent ของ Node ที่ระบุด้วยชื่อ
 * @param {object} root - Node บนสุดของ Tree
 * @param {string} name - ชื่อ Node ลูกที่ต้องการหา Parent
 * @returns {object|null}
 */
function getParent(root, name) {
  if (!root || !root.children) return null;
  for (const child of root.children) {
    if (child.name === name) return root;
    const found = getParent(child, name);
    if (found) return found;
  }
  return null;
}

/**
 * คืนค่าลูกทั้งหมดของ Node ที่ระบุ
 * @param {object} node
 * @returns {object[]}
 */
function getChildren(node) {
  if (!node || !node.children) return [];
  return node.children;
}

/**
 * รวบรวม Leaf Node ทั้งหมด (Node ที่ไม่มี children ต่อ = สถานี)
 * @param {object} node
 * @param {object[]} result
 * @returns {object[]}
 */
function getLeafNodes(node, result = []) {
  if (!node) return result;
  if (!node.children || node.children.length === 0) {
    result.push(node);
    return result;
  }
  for (const child of node.children) {
    getLeafNodes(child, result);
  }
  return result;
}

/**
 * หาเส้นทางจาก Root ไปยัง Leaf ที่ระบุชื่อ (คืนค่าเป็น array ของชื่อ Node)
 * @param {object} root
 * @param {string} targetName
 * @returns {string[]|null}
 */
function getRootToLeafPath(root, targetName) {
  if (!root) return null;
  if (root.name === targetName) return [root.name];
  if (!root.children) return null;
  for (const child of root.children) {
    const path = getRootToLeafPath(child, targetName);
    if (path) return [root.name, ...path];
  }
  return null;
}

/**
 * เดิน Tree แบบ Preorder (Root -> ซ้ายไปขวา) คืนค่าเป็นลำดับชื่อ Node
 * @param {object} node
 * @param {string[]} result
 * @returns {string[]}
 */
function preorderTraversal(node, result = []) {
  if (!node) return result;
  result.push(node.name);
  if (node.children) {
    for (const child of node.children) {
      preorderTraversal(child, result);
    }
  }
  return result;
}

/**
 * เดิน Tree แบบ Breadth-First (ทีละระดับ) คืนค่าเป็นลำดับชื่อ Node
 * @param {object} root
 * @returns {string[]}
 */
function treeBFS(root) {
  const result = [];
  if (!root) return result;
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift();
    result.push(current.name);
    if (current.children) {
      for (const child of current.children) {
        queue.push(child);
      }
    }
  }
  return result;
}

/**
 * ตรวจสอบว่า Tree มีความลึกอย่างน้อยตามที่กำหนด (นับ Root = ระดับ 1)
 * @param {object} node
 * @returns {number} ความลึกสูงสุดของ Tree
 */
function getTreeDepth(node) {
  if (!node || !node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(getTreeDepth));
}

/**
 * ตรวจสอบความถูกต้องของ Tree ตอนโหลดระบบ
 * (แสดงผลเฉพาะใน Console ไม่ขึ้นบนหน้าเว็บจริง)
 */
function validateTree() {
  const depth = getTreeDepth(transitTree);
  const leafCount = getLeafNodes(transitTree).length;
  if (depth < 3) {
    console.error(`[TransitFlow] Tree depth ต่ำกว่าที่กำหนด (พบ ${depth} ระดับ ต้องการอย่างน้อย 3)`);
  }
  if (leafCount !== STATIONS.length) {
    console.error(
      `[TransitFlow] จำนวน Leaf Node (${leafCount}) ไม่ตรงกับจำนวนสถานีทั้งหมด (${STATIONS.length})`
    );
  }
  return { depth, leafCount };
}
