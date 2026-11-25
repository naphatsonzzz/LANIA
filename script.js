/* LANIA — shared script for all pages.
   Each init function runs only if its page's elements exist. */

var ORDERS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSn4eD8g0bwSMTYE-h1wQu7K4dHnT3_iFjLewOFdvYWfu-cFA8zKgTU3NOaKyjhmOYxF5E8H8vMOpVQ/pub?gid=0&single=true&output=csv';

var MOODS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'fresh', label: 'Fresh' },
  { key: 'sweet', label: 'Sweet' },
  { key: 'confident', label: 'Confident' },
  { key: 'romance', label: 'Romance' }
];

/* ---------- helpers ---------- */

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatPrice(price) {
  return Number(price).toLocaleString('th-TH') + ' บาท';
}

/* ---------- product.html ---------- */

function initProductPage() {
  var list = document.getElementById('product-list');
  var filterBar = document.getElementById('filter-bar');
  if (!list || !filterBar) return;

  var products = [];
  var currentMood = 'all';

  function itemLabel(product) {
    return [product.name, product.size].filter(Boolean).join(' ');
  }

  function createCard(product) {
    var card = el('article', 'card mood-' + product.mood);

    var img = el('img', 'card__image');
    img.src = product.image;
    img.alt = product.name;
    img.loading = 'lazy';

    var body = el('div', 'card__body');

    var title = el('h3', 'card__title');
    title.appendChild(el('span', 'mood-dot'));
    title.appendChild(document.createTextNode(product.name));

    var meta = el('p', 'card__meta', product.size || 'โรลออน');
    var price = el('p', 'card__price', formatPrice(product.price));

    var buy = el('a', 'btn btn--solid btn--block', 'สั่งซื้อ');
    buy.href =
      'order.html?item=' + encodeURIComponent(itemLabel(product)) +
      '&price=' + encodeURIComponent(product.price);

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(price);
    body.appendChild(buy);
    card.appendChild(img);
    card.appendChild(body);
    return card;
  }

  function render() {
    list.textContent = '';
    var shown = currentMood === 'all'
      ? products
      : products.filter(function (p) { return p.mood === currentMood; });

    if (shown.length === 0) {
      list.appendChild(el('p', '', 'ยังไม่มีสินค้าในหมวดนี้'));
      return;
    }
    shown.forEach(function (p) { list.appendChild(createCard(p)); });
  }

  function updateButtons() {
    filterBar.querySelectorAll('button').forEach(function (btn) {
      var active = btn.dataset.mood === currentMood;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function setMood(mood) {
    currentMood = mood;
    updateButtons();
    render();
  }

  // filter buttons
  MOODS.forEach(function (m) {
    var btn = el('button', '', m.label);
    btn.type = 'button';
    btn.dataset.mood = m.key;
    btn.addEventListener('click', function () { setMood(m.key); });
    filterBar.appendChild(btn);
  });

  // ?mood=xxx from URL
  var param = (new URLSearchParams(window.location.search).get('mood') || '').toLowerCase();
  var valid = MOODS.some(function (m) { return m.key === param; });
  currentMood = valid ? param : 'all';
  updateButtons();

  fetch('products.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      products = data;
      render();
    })
    .catch(function (error) {
      console.error(error);
      list.textContent = '';
      list.appendChild(el('p', '', 'โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง'));
    });
}

/* ---------- order.html ---------- */

function initOrderPage() {
  var form = document.getElementById('orderForm');
  if (!form) return;

  // fill item and price from URL
  var params = new URLSearchParams(window.location.search);
  var item = params.get('item');
  var price = params.get('price');
  if (item !== null) document.getElementById('items').value = item;
  if (price !== null) document.getElementById('total').value = price;

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var payload = {
      customerName: document.getElementById('customerName').value.trim(),
      contact: document.getElementById('contact').value.trim(),
      items: document.getElementById('items').value.trim(),
      total: document.getElementById('total').value.trim(),
      note: document.getElementById('note').value.trim()
    };

    fetch('https://script.google.com/macros/s/AKfycbx2AGdTh4m926sFUW9iMnzaRA3gt0teiDQqsv02NCFJab3mCP0_sJJi_jIrixdJbaC3cg/exec', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
    .then(() => { window.location.href = 'thankyou.html'; })
    .catch(error => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
  });
}

/* ---------- admin.html ---------- */

// Minimal CSV parser: handles quoted fields, "" escapes, commas and line breaks inside quotes.
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  var rows = [];
  var row = [];
  var field = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function initAdminPage() {
  var tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;

  function showMessage(message) {
    tbody.textContent = '';
    var tr = document.createElement('tr');
    var td = el('td', '', message);
    td.colSpan = 6;
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  showMessage('กำลังโหลดข้อมูล...');

  fetch(ORDERS_CSV_URL, { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.text();
    })
    .then(function (text) {
      var rows = parseCSV(text).filter(function (r) {
        return r.some(function (cell) { return cell.trim() !== ''; });
      });

      // skip a header row if the first cell has no digits (a timestamp always does)
      if (rows.length > 0 && !/\d/.test(rows[0][0])) rows.shift();

      // new orders are appended at the bottom of the sheet, so reverse for newest first
      rows.reverse();

      if (rows.length === 0) {
        showMessage('ยังไม่มีรายการสั่งซื้อ');
        return;
      }

      tbody.textContent = '';
      rows.forEach(function (r) {
        var tr = document.createElement('tr');
        for (var i = 0; i < 6; i++) {
          tr.appendChild(el('td', '', r[i] !== undefined ? r[i] : ''));
        }
        tbody.appendChild(tr);
      });
    })
    .catch(function (error) {
      console.error(error);
      showMessage('โหลดข้อมูลไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง');
    });
}

/* ---------- start ---------- */

document.addEventListener('DOMContentLoaded', function () {
  initProductPage();
  initOrderPage();
  initAdminPage();
});
