const API = 'http://localhost:5000/api';

/* ── Token helpers ── */
const getToken = () => localStorage.getItem('accessToken');
const getUser  = () => JSON.parse(localStorage.getItem('user') || 'null');
const setAuth  = (token, user) => { localStorage.setItem('accessToken', token); localStorage.setItem('user', JSON.stringify(user)); };
const clearAuth = () => { localStorage.removeItem('accessToken'); localStorage.removeItem('user'); };

/* ── Single redirect helper — never loops ── */
function redirectToLogin() {
  if (sessionStorage.getItem('_loggingOut')) return;
  sessionStorage.setItem('_loggingOut', '1');
  clearAuth();
  const path = window.location.pathname;
  const inPages = path.includes('/pages/');
  if (window.location.protocol === 'file:') {
    const parts = path.split('/');
    const pagesIdx = parts.lastIndexOf('pages');
    if (pagesIdx !== -1) parts.splice(pagesIdx, 2, 'index.html');
    else parts[parts.length - 1] = 'index.html';
    window.location.replace(window.location.protocol + '//' + parts.join('/'));
  } else {
    window.location.replace(inPages ? '../index.html' : '/index.html');
  }
}

/* ── Auth guard ── */
function requireAuth(allowedRoles) {
  // Always clear the redirect lock first — we are on a protected page now
  sessionStorage.removeItem('_loggingOut');
  _redirecting = false;
  const token = getToken();
  const user  = getUser();
  if (!token || !user) { redirectToLogin(); return false; }
  // Check token expiry client-side before making any API calls
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      redirectToLogin(); return false;
    }
  } catch { redirectToLogin(); return false; }
  if (allowedRoles && !allowedRoles.includes(user.role)) { redirectToLogin(); return false; }
  return user;
}

/* ── Fetch wrapper ── */
let _redirecting = false;
async function apiFetch(path, opts = {}) {
  if (_redirecting) return null;
  let res;
  try {
    res = await fetch(API + path, {
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...(opts.headers || {}) },
      credentials: 'include',
      ...opts,
    });
  } catch (e) {
    console.error('Network error:', path, e.message);
    return null;
  }
  if (res.status === 401) {
    if (!_redirecting) { _redirecting = true; redirectToLogin(); }
    return null;
  }
  if (res.status === 429) {
    console.warn('Rate limited:', path);
    return null;
  }
  if (!res.ok && res.status >= 500) {
    console.error('Server error:', res.status, path);
    return null;
  }
  return res.json().catch(() => null);
}

/* ── Sidebar active link ── */
function initSidebar() {
  const user = getUser();
  if (!user) return;

  // Set user info in sidebar footer
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  if (nameEl) nameEl.textContent = user.username;
  if (roleEl) roleEl.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  // Active link
  const links = document.querySelectorAll('.nav-item a');
  links.forEach(a => {
    if (a.href === window.location.href) a.classList.add('active');
  });

  // Mobile toggle
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await apiFetch('/auth/logout', { method: 'POST' });
      redirectToLogin();
    });
  }

  // Role-based nav visibility
  const role = user.role;
  document.querySelectorAll('[data-roles]').forEach(el => {
    const allowed = el.dataset.roles.split(',');
    if (!allowed.includes(role)) el.style.display = 'none';
  });
}

/* ── Modal helpers ── */
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function initModals() {
  document.querySelectorAll('.modal-close, [data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal-overlay')?.classList.remove('open');
    });
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
}

/* ── Tabs ── */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('[data-tabs]') || btn.parentElement;
      const target = btn.dataset.tab;
      group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === target);
      });
    });
  });
}

/* ── Toast ── */
function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:9px;
    font-size:.875rem;font-weight:500;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.18);
    background:${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#0891b2'};
    animation:slideIn .2s ease;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Format helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtLPA  = n => n ? `₹${Number(n).toFixed(1)} LPA` : '—';
const coursePill = c => `<span class="course-pill course-${c}">${c}</span>`;
const statusBadge = (s, map) => {
  const cfg = map[s] || { cls: 'badge-gray', label: s };
  return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
};

const PLACEMENT_STATUS = {
  unplaced:       { cls: 'badge-gray',    label: 'Unplaced' },
  internship_only:{ cls: 'badge-info',    label: 'Internship' },
  fte_only:       { cls: 'badge-success', label: 'FTE' },
  internship_fte: { cls: 'badge-purple',  label: 'I+FTE' },
};
const ELIGIBILITY_STATUS = {
  eligible:   { cls: 'badge-success', label: 'Eligible' },
  ineligible: { cls: 'badge-danger',  label: 'Ineligible' },
  pending:    { cls: 'badge-warning', label: 'Pending' },
};
const CATEGORY_BADGE = {
  'A+': { cls: 'badge-purple',  label: 'A+' },
  'A':  { cls: 'badge-primary', label: 'A' },
  'B':  { cls: 'badge-success', label: 'B' },
  'C':  { cls: 'badge-warning', label: 'C' },
};

/* ── Sidebar HTML builder ── */
function buildSidebar(activePage) {
  const user = getUser();
  const role = user?.role || '';
  const isAdmin = role === 'admin';
  const isCoord = role === 'coordinator';
  const isStudent = role === 'student';
  const isRecruiter = role === 'recruiter';

  const link = (href, icon, label, roles) => {
    if (roles && !roles.includes(role)) return '';
    const active = activePage === label ? 'active' : '';
    return `<li class="nav-item"><a href="${href}" class="${active}"><span class="icon">${icon}</span>${label}</a></li>`;
  };

  return `
  <div class="sidebar-brand">
    <div class="logo">🎓 NFSU Placement</div>
    <div class="sub">Session 2026–27</div>
  </div>
  <nav class="sidebar-nav">
    <div class="nav-section">Main</div>
    <ul>
      ${link('dashboard.html','📊','Dashboard',['admin','coordinator'])}
      ${link('recruiter.html','🏢','My Portal',['recruiter'])}
      ${link('profile.html','👤','My Profile',['student'])}
    </ul>
    <div class="nav-section">Students</div>
    <ul>
      ${link('students.html','🎓','Students',['admin','coordinator'])}
      ${link('import.html','📥','Import',['admin'])}
    </ul>
    <div class="nav-section">Placement</div>
    <ul>
      ${link('offers.html','📋','Offers',['admin','coordinator','recruiter'])}
      ${link('offer-entry.html','➕','New Offer',['admin'])}
      ${link('companies.html','🏢','Companies',['admin','coordinator','recruiter','student'])}
      ${link('recruitment.html','📅','Drive Attendance',['admin'])}
    </ul>
    <div class="nav-section">Reports</div>
    <ul>
      ${link('report-coursewise.html','📈','Coursewise',['admin','coordinator'])}
      ${link('report-packages.html','💰','Packages',['admin'])}
      ${link('audit.html','🔍','Audit Logs',['admin'])}
    </ul>
    <div class="nav-section">Settings</div>
    <ul>
      ${link('policy.html','⚙️','Policy Rules',['admin'])}
    </ul>
  </nav>
  <div class="sidebar-footer">
    <div class="user-name" id="sidebar-user-name">—</div>
    <div class="user-role" id="sidebar-user-role">—</div>
    <button class="btn-logout" id="btn-logout">🚪 Logout</button>
  </div>`;
}

/* ── Inject sidebar + topbar ── */
function initPage(activePage, pageTitle) {
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) sidebarEl.innerHTML = buildSidebar(activePage);
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = pageTitle || activePage;
  initSidebar();
  initModals();
  initTabs();
}

/* ── CSS animation ── */
const style = document.createElement('style');
style.textContent = `@keyframes slideIn{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}`;
document.head.appendChild(style);
