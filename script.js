// Tạo sản phẩm mới với ID tự tăng (chuỗi)
function createProduct(newProduct) {
  // Nếu không có id, tự động lấy maxId+1 (dạng chuỗi)
  let maxId = 0;
  products.forEach(p => {
    const pid = parseInt(p.id, 10);
    if (!isNaN(pid) && pid > maxId) maxId = pid;
  });
  if (!newProduct.id || newProduct.id === '') {
    newProduct.id = String(maxId + 1);
  }
  products.push(newProduct);
  renderTable();
  // TODO: Lưu lại vào db.json nếu có backend
}
// Sử dụng file db.json trong cùng folder
const DATA_URL = 'db.json';

// products array will hold either products or posts (depending on db.json)
let products = [];
let comments = [];

// CRUD cho comments
function loadComments(data) {
  if (data.comments && Array.isArray(data.comments)) {
    comments = data.comments;
  } else if (Array.isArray(data.comments)) {
    comments = data.comments;
  } else if (Array.isArray(data)) {
    // Nếu db.json là mảng chung
    comments = [];
  } else {
    comments = [];
  }
}

function renderComments(list = comments) {
  const cmtBox = document.getElementById('commentsBox');
  if (!cmtBox) return;
  cmtBox.innerHTML = '';
  if (!list.length) {
    cmtBox.innerHTML = '<div class="text-muted">Chưa có bình luận nào.</div>';
    return;
  }
  list.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment-item' + (c.isDeleted ? ' comment-deleted' : '');
    div.innerHTML = `
      <span class="comment-id">#${escapeHtml(c.id)}</span>
      <span class="comment-content">${escapeHtml(c.content)}</span>
      <button class="btn btn-sm btn-outline-danger ms-2" onclick="deleteComment('${c.id}')">Xoá</button>
      <button class="btn btn-sm btn-outline-primary ms-1" onclick="editComment('${c.id}')">Sửa</button>
    `;
    cmtBox.appendChild(div);
  });
}

function createComment(newComment) {
  // ID tự tăng dạng chuỗi
  let maxId = 0;
  comments.forEach(c => { const cid = parseInt(c.id, 10); if (!isNaN(cid) && cid > maxId) maxId = cid; });
  if (!newComment.id || newComment.id === '') newComment.id = String(maxId + 1);
  comments.push(newComment);
  renderComments();
  // TODO: Lưu lại vào db.json nếu có backend
}

function updateComment(id, newContent) {
  const idx = comments.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) {
    comments[idx].content = newContent;
    renderComments();
    // TODO: Lưu lại vào db.json nếu có backend
  }
}

function deleteComment(id) {
  const idx = comments.findIndex(c => String(c.id) === String(id));
  if (idx !== -1) {
    comments[idx].isDeleted = true;
    renderComments();
    // TODO: Lưu lại vào db.json nếu có backend
  }
}

function editComment(id) {
  const c = comments.find(x => String(x.id) === String(id));
  if (!c) return;
  const newContent = prompt('Nội dung mới:', c.content);
  if (newContent !== null && newContent.trim() !== '') {
    updateComment(id, newContent.trim());
  }
}
let currentSort = { key: null, dir: 1 }; // dir: 1 (tăng), -1 (giảm)
let searchQuery = '';
let currentPage = 1;
let perPage = Number(10);

const tbody = document.getElementById('productsTbody');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearch');
const sortNameBtn = document.getElementById('sortNameBtn');
const sortPriceBtn = document.getElementById('sortPriceBtn');
const totalCount = document.getElementById('totalCount');
const perPageSelect = document.getElementById('perPageSelect');
const paginationEl = document.getElementById('pagination');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Local SVG placeholder (data URI) to avoid extra network requests when images fail
const SVG_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120"><rect rx="8" width="160" height="120" fill="#e9ecef"/><g fill="#adb5bd" font-family="Arial, Helvetica, sans-serif" font-size="14" text-anchor="middle"><text x="80" y="62">Ảnh</text><text x="80" y="82" font-size="12">không khả dụng</text></g></svg>');

// Generate a colored SVG placeholder with initials from title
function createInitialsPlaceholder(title = '', size = 160) {
  const initials = (String(title || '').trim().split(/\s+/).slice(0,2).map(s => s[0]||'').join('') || '?').toUpperCase();
  // color from hash
  let hash = 0; for (let i=0;i<title.length;i++) hash = title.charCodeAt(i) + ((hash<<5)-hash);
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue} 60% 85%)`;
  const fg = `hsl(${hue} 30% 30%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect rx="10" width="${size}" height="${size}" fill="${bg}"/><text x="50%" y="55%" font-family="Inter, Roboto, Arial, sans-serif" font-size="${Math.round(size/2.5)}" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}



// modal references (created in DOM)
const detailModalEl = document.getElementById('detailModal');
const modalTitleEl = document.getElementById('modalTitle');
const modalImageEl = document.getElementById('modalImage');
const modalPriceEl = document.getElementById('modalPrice');
const modalCategoryEl = document.getElementById('modalCategory');
const modalCreatedEl = document.getElementById('modalCreated');
const modalDescriptionEl = document.getElementById('modalDescription');
let bootstrapModal = null; // initialized after loadProducts()


async function loadProducts() {
  try {
    // show skeleton while loading
    showSkeleton(6);

    const res = await fetch(DATA_URL);
    const data = await res.json();

    // Nếu data chứa products hoặc là mảng sản phẩm
    if (data.products && Array.isArray(data.products)) {
      products = data.products;
    } else if (Array.isArray(data)) {
      products = data;
    } else {
      // fallback: tìm mảng sản phẩm đầu tiên
      const firstArray = Object.values(data).find(v => Array.isArray(v));
      products = firstArray || [];
    }

    // reset paging
    currentPage = 1;
    perPage = Number(perPageSelect?.value) || 10;

    renderTable();

    // init bootstrap modal
    if (detailModalEl) bootstrapModal = new bootstrap.Modal(detailModalEl);
  } catch (err) {
    console.error('Lỗi khi load db.json:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Lỗi load data: ${err.message}</td></tr>`;
  }
}

function renderTable() {
  let list = products.slice();

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => p.title.toLowerCase().includes(q));
  }

  if (currentSort.key) {
    list.sort((a, b) => {
      if (currentSort.key === 'views') return (Number(a.views || 0) - Number(b.views || 0)) * currentSort.dir;
      return String(a.title || '').localeCompare(String(b.title || '')) * currentSort.dir;
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Không có sản phẩm phù hợp.</td></tr>`;
    return;
  }

  // paging settings
  perPage = Number(perPageSelect?.value) || perPage;
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * perPage;
  const paged = list.slice(start, start + perPage);

  tbody.innerHTML = '';
  paged.forEach(p => {
    // dynamic initial placeholder per product title
    const placeholder = createInitialsPlaceholder(p.title || '', 64);
    const mainImg = p.images && p.images[0] ? p.images[0] : '';
    const catImg = p.category && p.category.image ? p.category.image : '';
    // prefer main image, or category image, or placeholder
    let imgSrc = placeholder;
    if (mainImg && /^https?:\/\//i.test(mainImg)) {
      imgSrc = mainImg;
    } else if (catImg && /^https?:\/\//i.test(catImg)) {
      imgSrc = catImg;
    } else {
      imgSrc = placeholder;
    }
    const price = Number(p.price || 0);
    const note = p.description && String(p.description).length>80 ? escapeHtml(String(p.description).substring(0,80)) + '...' : escapeHtml(p.description || '');
    const tr = document.createElement('tr');
    tr.classList.add('row-clickable');
    tr.setAttribute('role','button');
    // Nếu là xoá mềm thì thêm class deleted-row
    if (p.isDeleted) tr.classList.add('deleted-row');
    tr.innerHTML = `
      <td>${escapeHtml(p.id)}</td>
      <td><img class="thumb" src="${imgSrc}" title="${escapeHtml(mainImg || catImg || '')}" alt="${escapeHtml(p.title || '')}" loading="lazy" data-src="${escapeHtml(mainImg || '')}" data-cat="${escapeHtml(catImg || '')}" data-retries="0" data-tried-cat="0" data-tried-proxy="0" onerror="imgErrorHandler(this, '${placeholder}')"></td>
      <td>${escapeHtml(p.title || '')}</td>
      <td>${p.category ? escapeHtml(p.category.name) : ''}</td>
      <td>$${price.toLocaleString()}</td>
      <td style="max-width:300px">${note}</td>
    `; 
    tr.addEventListener('click', ()=> showDetail(p.id));
    tbody.appendChild(tr);
  });

  updateSortButtons();
  // cập nhật badge số lượng: hiển thị số lọc / tổng
  if (totalCount) totalCount.textContent = `${totalItems} / ${products.length}`;

  renderPagination(totalPages);
}

// Xoá mềm sản phẩm (thêm isDeleted:true)
function deleteProduct(id) {
  const idx = products.findIndex(p => String(p.id) === String(id));
  if (idx !== -1) {
    products[idx].isDeleted = true;
    renderTable();
    // TODO: Lưu lại vào db.json nếu có backend
  }
}

function escapeHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function onSearchChanged(e) {
  searchQuery = e.target.value;
  currentPage = 1;
  renderTable();
}

function toggleSort(key) {
  if (currentSort.key === key) currentSort.dir *= -1;
  else { currentSort.key = key; currentSort.dir = 1; }
  currentPage = 1;
  renderTable();
}

function updateSortButtons() {
  // reset text and classes
  sortNameBtn.classList.remove('btn-primary');
  sortPriceBtn.classList.remove('btn-primary');

  if (currentSort.key === 'title') {
    sortNameBtn.classList.add('btn-primary');
    sortNameBtn.innerText = `Tên ${currentSort.dir === 1 ? '↑' : '↓'}`;
  } else {
    sortNameBtn.innerText = 'Tên ↕';
  }

  if (currentSort.key === 'price') {
    sortPriceBtn.classList.add('btn-primary');
    sortPriceBtn.innerText = `Giá ${currentSort.dir === 1 ? '↑' : '↓'}`;
  } else {
    sortPriceBtn.innerText = 'Giá ↕';
  }
}

// Pagination helpers
function showSkeleton(rows=6) {
  tbody.innerHTML = '';
  for (let i=0;i<rows;i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5"><div class="skeleton-row"><div class="skeleton" style="width:40%;height:16px;border-radius:4px;margin-bottom:8px"></div><div class="skeleton" style="width:80%;height:12px;border-radius:4px"></div></div></td>`;
    tbody.appendChild(tr);
  }
}

function renderPagination(totalPages) {
  if (!paginationEl) return;
  paginationEl.innerHTML = '';
  const createPageItem = (text, page, disabled=false, active=false) => {
    const li = document.createElement('li');
    li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
    const a = document.createElement('a');
    a.className = 'page-link';
    a.href = '#';
    a.textContent = text;
    a.addEventListener('click', (ev)=>{ ev.preventDefault(); if (!disabled) goToPage(page); });
    li.appendChild(a);
    return li;
  };

  // Prev
  paginationEl.appendChild(createPageItem('«', Math.max(1, currentPage-1), currentPage===1));

  // simple page numbers (show up to 7 pages)
  const start = Math.max(1, currentPage - 3);
  const end = Math.min(totalPages, start + 6);
  for (let p = start; p <= end; p++) {
    paginationEl.appendChild(createPageItem(p, p, false, p===currentPage));
  }

  // Next
  paginationEl.appendChild(createPageItem('»', Math.min(totalPages, currentPage+1), currentPage===totalPages));
}

function goToPage(p) {
  currentPage = p;
  renderTable();
}

function exportCSV() {
  // export filtered & sorted list (all pages)
  let list = products.slice();
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => String(p.title || '').toLowerCase().includes(q));
  }
  if (currentSort.key) {
    list.sort((a, b) => {
      if (currentSort.key === 'views') return (Number(a.views || 0) - Number(b.views || 0)) * currentSort.dir;
      return String(a.title || '').localeCompare(String(b.title || '')) * currentSort.dir;
    });
  }

  const rows = [['id','title','price','category','description']];
  list.forEach(p=>{
    rows.push([p.id, String(p.title||'').replace(/\n/g,' '), Number(p.price||0), p.category ? String(p.category.name||'') : '', String(p.description||'').replace(/\n/g,' ')]);
  });
  const csv = rows.map(r => r.map(cell => '"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function showDetail(id) {
  const p = products.find(x => String(x.id) === String(id));
  if (!p) return;
  modalTitleEl.textContent = p.title || '';
  const mainImg = (p.images && p.images[0]) ? p.images[0] : '';
  const catImg = p.category && p.category.image ? p.category.image : '';
  const modalPlaceholder = createInitialsPlaceholder(p.title || '', 160);

  // set dataset for debugging and use unified error handler (tries category → proxy → placeholder)
  modalImageEl.dataset.src = mainImg;
  modalImageEl.dataset.cat = catImg;
  modalImageEl.dataset.triedCat = '0';
  modalImageEl.dataset.triedProxy = '0';
  modalImageEl.dataset.retries = '0';
  modalImageEl.onerror = function(){ imgErrorHandler(this, modalPlaceholder); };
  // pick modal src; proxy Imgur URLs automatically
  let modalSrc = modalPlaceholder;
  if (mainImg && /^https?:\/\//i.test(mainImg)) modalSrc = mainImg;
  else if (catImg && /^https?:\/\//i.test(catImg)) modalSrc = catImg;
  modalImageEl.src = modalSrc;
  modalImageEl.alt = p.title || ''; 

  modalPriceEl.textContent = `$${Number(p.price||0).toLocaleString()}`;
  modalCategoryEl.textContent = p.category ? (p.category.name || '') : '';
  modalCreatedEl.textContent = p.creationAt ? new Date(p.creationAt).toLocaleString() : '';
  modalDescriptionEl.textContent = p.description || '';
  bootstrapModal?.show();
}

// Events
searchInput.addEventListener('input', onSearchChanged);
perPageSelect?.addEventListener('change', ()=>{ perPage = Number(perPageSelect.value); currentPage = 1; renderTable(); });
clearSearchBtn?.addEventListener('click', ()=>{ searchInput.value = ''; searchQuery = ''; currentPage = 1; renderTable(); searchInput.focus(); });
exportCsvBtn?.addEventListener('click', exportCSV);

// Simple image error handler - use placeholder if image fails
function imgErrorHandler(imgEl, placeholder) {
  imgEl.onerror = null;
  imgEl.src = placeholder;
}

loadProducts();