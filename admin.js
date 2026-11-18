// ==========================================
// JOO STORE - Admin & User Management Logic (admin.js)
// ==========================================

const ADMIN_STORAGE_KEY = 'joo_is_admin_logged_in';
const USERS_KEY = 'joo_all_users';
const DISCOUNTS_KEY = 'joo_store_discounts';
const PRODUCTS_KEY = 'joo_store_products';
const ANNOUNCEMENT_KEY = 'joo_store_announcement';

// 1. استرجاع قائمة العملاء
function getAllUsers() {
    try {
        const saved = localStorage.getItem(USERS_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error(e);
    }

    const defaultUsers = [
        {
            id: 'u-1',
            name: 'محمد السيد',
            email: 'mohamed@example.com',
            phone: '01093901120',
            location: 'القاهرة - المعادي',
            password: 'password123',
            status: 'active',
            discount: 0,
            registered: '2026-10-15',
            totalSpent: 4540,
            avatar: 'https://i.ibb.co/bRJNQB5c/final1200.png'
        },
        {
            id: 'u-2',
            name: 'د. أحمد حسام',
            email: 'ahmed.hossam@gmail.com',
            phone: '01012345678',
            location: 'الجيزة - الدقي',
            password: 'pass1234',
            status: 'active',
            discount: 10,
            registered: '2026-10-18',
            totalSpent: 3700,
            avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
        },
        {
            id: 'u-3',
            name: 'د. محمود سمير (مجمع عيادات النور)',
            email: 'dr.mahmoud@gmail.com',
            phone: '01123456789',
            location: 'الإسكندرية - سموحة',
            password: 'pass1234',
            status: 'pending',
            discount: 0,
            registered: 'اليوم',
            totalSpent: 0,
            avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80'
        }
    ];

    saveAllUsers(defaultUsers);
    return defaultUsers;
}

// حفظ العملاء محلياً وعلى سحابة Firebase
function saveAllUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    if (typeof saveUserToCloud === 'function') {
        users.forEach(u => saveUserToCloud(u));
    }
}

// 2. استرجاع قائمة الخصومات
function getAllDiscounts() {
    try {
        const saved = localStorage.getItem(DISCOUNTS_KEY);
        if (saved) return JSON.parse(saved);
    } catch (e) {
        console.error(e);
    }

    const defaultDiscounts = [
        { code: 'JOO10', percent: 10, desc: 'خصم ترحيبي لجميع العملاء', active: true },
        { code: 'DOCTOR20', percent: 20, desc: 'خصم خاص للأطباء والمستشفيات', active: true }
    ];

    localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(defaultDiscounts));
    return defaultDiscounts;
}

function saveAllDiscounts(discounts) {
    localStorage.setItem(DISCOUNTS_KEY, JSON.stringify(discounts));
}

// 3. التحقق من تسجيل دخول الآدمن
function checkAdminAuth() {
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('joo_current_user'));
    } catch (e) {
        currentUser = null;
    }

    if (currentUser && (currentUser.email === 'admin@joostore.com' || currentUser.isAdmin === true)) {
        return true;
    }

    alert("⚠️ غير مسجل كمسؤول نظام! الرجاء تسجيل الدخول بحساب الإدارة.");
    window.location.href = 'Account.html';
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        if (checkAdminAuth()) {
            renderAdminDashboard();
            updateMaintenanceButtonUI();
            if (typeof syncUsersFromCloud === 'function') {
                syncUsersFromCloud(() => renderAdminDashboard());
            }
            if (typeof syncMessagesFromCloud === 'function') {
                syncMessagesFromCloud(() => renderAdminMessages());
            }
        }
    }
});

function adminLogout() {
    if (typeof logoutUser === 'function') {
        logoutUser(true);
    } else {
        localStorage.removeItem(ADMIN_STORAGE_KEY);
        localStorage.removeItem('joo_current_user');
        window.location.href = 'Account.html';
    }
}

// 4. التبديل بين تبويبات لوحة التحكم
function switchAdminTab(tab) {
    const tabsMap = {
        pending: { el: 'admin-tab-pending', btn: 'tab-pending-btn', render: renderPendingUsersTable },
        users: { el: 'admin-tab-users', btn: 'tab-users-btn', render: renderUsersTable },
        orders: { el: 'admin-tab-orders', btn: 'tab-orders-btn', render: renderAdminOrders },
        products: { el: 'admin-tab-products', btn: 'tab-products-btn', render: renderAdminProducts },
        discounts: { el: 'admin-tab-discounts', btn: 'tab-discounts-btn', render: renderDiscountsList },
        announcement: { el: 'admin-tab-announcement', btn: 'tab-announcement-btn', render: loadAnnouncement },
        security: { el: 'admin-tab-security', btn: 'tab-security-btn', render: renderSecurityLogs },
        messages: { el: 'admin-tab-messages', btn: 'tab-messages-btn', render: renderAdminMessages }
    };

    Object.values(tabsMap).forEach(item => {
        const el = document.getElementById(item.el);
        const btn = document.getElementById(item.btn);
        if (el) el.style.display = 'none';
        if (btn) btn.classList.remove('active');
    });

    const target = tabsMap[tab];
    if (target) {
        const el = document.getElementById(target.el);
        const btn = document.getElementById(target.btn);
        if (el) el.style.display = 'block';
        if (btn) btn.classList.add('active');
        if (target.render) target.render();
    }
}

// 5. عرض الإحصائيات وجداول لوحة التحكم
function renderAdminDashboard() {
    const users = getAllUsers();
    const discounts = getAllDiscounts();
    const orders = typeof getOrderHistory === 'function' ? getOrderHistory(true) : [];
    const messages = JSON.parse(localStorage.getItem('joo_store_messages') || '[]');

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const pendingUsers = users.filter(u => u.status === 'pending');
    const suspendedUsers = users.filter(u => u.status === 'suspended').length;
    const activeDiscounts = discounts.filter(d => d.active).length;
    const totalSales = orders.reduce((sum, ord) => sum + (ord.total || 0), 0) + users.reduce((sum, u) => sum + (u.totalSpent || 0), 0);

    const elTotal = document.getElementById('adm-total-users');
    const elActive = document.getElementById('adm-active-users');
    const elPending = document.getElementById('adm-pending-users');
    const elSusp = document.getElementById('adm-suspended-users');
    const elSales = document.getElementById('adm-total-sales');
    const elDisc = document.getElementById('adm-active-discounts');
    const elBadgeCounter = document.getElementById('pending-tab-badge');
    const elMsgBadge = document.getElementById('messages-tab-badge');
    const alertBanner = document.getElementById('admin-pending-alert-banner');
    const alertSubtitle = document.getElementById('alert-subtitle');

    if (elTotal) elTotal.textContent = totalUsers;
    if (elActive) elActive.textContent = activeUsers;
    if (elPending) elPending.textContent = pendingUsers.length;
    if (elSusp) elSusp.textContent = suspendedUsers;
    if (elSales) elSales.textContent = `${totalSales.toLocaleString()} ج.م`;
    if (elDisc) elDisc.textContent = activeDiscounts;
    if (elBadgeCounter) elBadgeCounter.textContent = pendingUsers.length;
    if (elMsgBadge) elMsgBadge.textContent = messages.length;

    if (alertBanner) {
        if (pendingUsers.length > 0) {
            alertBanner.style.display = 'flex';
            if (alertSubtitle) {
                alertSubtitle.textContent = `يوجد (${pendingUsers.length}) طلبات حسابات جديدة بانتظار موافقتك واعتمادها لتفعيل الدخول.`;
            }
        } else {
            alertBanner.style.display = 'none';
        }
    }

    renderPendingUsersTable();
    renderUsersTable();
    renderAdminOrders();
    renderAdminProducts();
    renderDiscountsList();
    loadAnnouncement();
    renderSecurityLogs();
    renderAdminMessages();
}

// 5.1 عرض جدول طلبات الحسابات المعلقة
function renderPendingUsersTable() {
    const tbody = document.getElementById('admin-pending-tbody');
    if (!tbody) return;

    const users = getAllUsers();
    const pendingUsers = users.filter(u => u.status === 'pending');

    if (pendingUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 35px 20px; color: #2ed573; font-size: 16px; font-weight: bold;">
                    🎉 لا توجد طلبات حسابات معلقة حالياً - جميع العملاء معتمدون ونشطون!
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    pendingUsers.forEach(u => {
        html += `
            <tr class="pending-row-highlight">
                <td>
                    <div class="user-cell">
                        <img src="${u.avatar || 'https://i.ibb.co/bRJNQB5c/final1200.png'}" class="user-cell-img" alt="${u.name}">
                        <div>
                            <div class="user-cell-name">${u.name}</div>
                            <small style="color: #ffa502;">طلب جديد ⏳</small>
                        </div>
                    </div>
                </td>
                <td>
                    <a href="https://wa.me/2${u.phone}" target="_blank" style="color: #25D366; text-decoration: none; font-weight: bold;">
                        📱 ${u.phone}
                    </a>
                </td>
                <td>${u.email}</td>
                <td>📍 ${u.location || 'غير محدد'}</td>
                <td>${u.registered || 'اليوم'}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn-approve" onclick="approveUser('${u.id}')">✅ قبول وتفعيل</button>
                        <button class="action-btn-reject" onclick="rejectUser('${u.id}')">❌ رفض</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function approveUser(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    user.status = 'active';
    saveAllUsers(users);
    if (typeof logSecurityEvent === 'function') logSecurityEvent('ADMIN', `قبول وتفعيل حساب العميل: ${user.name}`);
    renderAdminDashboard();

    if (typeof showToast === 'function') {
        showToast(`🎉 تم قبول وتفعيل حساب (${user.name}) بنجاح!`);
    } else {
        alert(`🎉 تم قبول وتفعيل حساب (${user.name}) بنجاح!`);
    }
}

function rejectUser(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`هل أنت متأكد من رفض طلب حساب العميل "${user.name}" وحذفه؟`)) {
        const filtered = users.filter(u => u.id !== userId);
        saveAllUsers(filtered);
        if (typeof deleteUserFromCloud === 'function') deleteUserFromCloud(userId);
        if (typeof logSecurityEvent === 'function') logSecurityEvent('WARNING', `رفض وحذف طلب حساب العميل: ${user.name}`);
        renderAdminDashboard();

        if (typeof showToast === 'function') {
            showToast(`تم رفض وحذف طلب العميل (${user.name}).`);
        }
    }
}

// 6. إدارة وتصفية جميع العملاء
let currentUserStatusFilter = 'all';

function filterUsersByStatus(status, btnElement) {
    currentUserStatusFilter = status;
    document.querySelectorAll('.user-status-filters .cat-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderUsersTable();
}

function renderUsersTable(filterText = '') {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;

    let users = getAllUsers();

    if (currentUserStatusFilter !== 'all') {
        users = users.filter(u => u.status === currentUserStatusFilter);
    }

    if (filterText) {
        const query = filterText.toLowerCase();
        users = users.filter(u => 
            u.name.toLowerCase().includes(query) || 
            u.email.toLowerCase().includes(query) || 
            u.phone.includes(query)
        );
    }

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 25px;">لا يوجد عملاء يطابقون الاختيار الحالي</td></tr>`;
        return;
    }

    let html = '';
    users.forEach(u => {
        let statusBadge = '';
        let toggleBtn = '';

        if (u.status === 'pending') {
            statusBadge = `<span style="background: #ffa502; color: white; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">قيد الموافقة ⏳</span>`;
            toggleBtn = `<button onclick="approveUser('${u.id}')" style="background: #2ed573; border:none; color:white; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-weight:bold;">قبول ✓</button>`;
        } else if (u.status === 'suspended') {
            statusBadge = `<span class="user-status-badge badge-suspended">موقوف 🚫</span>`;
            toggleBtn = `<button class="action-btn-status btn-activate" onclick="toggleUserStatus('${u.id}')">▶️ تفعيل</button>`;
        } else {
            statusBadge = `<span class="user-status-badge badge-active">نشط ✅</span>`;
            toggleBtn = `<button class="action-btn-status btn-suspend" onclick="toggleUserStatus('${u.id}')">⏸️ إيقاف</button>`;
        }

        const adminRoleTag = u.isAdmin ? `<span style="background: rgba(255,193,7,0.2); color: #ffc107; border: 1px solid #ffc107; padding: 2px 6px; border-radius: 6px; font-size: 11px; margin-right: 4px;">مشرف 👑</span>` : '';

        const discountBadge = (u.discount && u.discount > 0)
            ? `<span class="user-discount-tag">${u.discount}% خصم</span>`
            : `<span style="color: rgba(255,255,255,0.4);">لا يوجد</span>`;

        const passCell = u.password
            ? `<div style="display:flex; align-items:center; justify-content:center; gap:6px;">
                   <span id="pass-text-${u.id}" data-pass="${u.password}" data-visible="false" style="font-family:monospace; color:#fffa65; font-size:14px;">••••••••</span>
                   <button type="button" onclick="toggleShowUserPass('${u.id}', this)" style="background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.25); color:white; padding:3px 7px; border-radius:6px; cursor:pointer; font-size:12px;" title="إظهار / إخفاء كلمة المرور">👁️</button>
               </div>`
            : `<span style="color:rgba(255,255,255,0.4); font-size:12px;">مشفرة 🔒</span>`;

        html += `
            <tr class="${u.status === 'pending' ? 'pending-row-highlight' : ''}">
                <td>
                    <div class="user-cell">
                        <img src="${u.avatar || 'https://i.ibb.co/bRJNQB5c/final1200.png'}" class="user-cell-img" alt="${u.name}">
                        <div>
                            <div class="user-cell-name">${u.name} ${adminRoleTag}</div>
                            <small style="color: rgba(255,255,255,0.5);">📍 ${u.location || 'غير محدد'}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div>${u.email}</div>
                    <a href="https://wa.me/2${u.phone}" target="_blank" style="color: #25D366; text-decoration: none; font-weight: bold; font-size: 13px;">📱 ${u.phone}</a>
                </td>
                <td>${u.registered || 'حديث'}</td>
                <td style="font-weight: bold; color: #2ed573;">${(u.totalSpent || 0).toLocaleString()} ج.م</td>
                <td>${statusBadge}</td>
                <td>${discountBadge}</td>
                <td>${passCell}</td>
                <td>
                    <div class="table-actions" style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                        <button class="action-btn-view" onclick="viewUserDetails('${u.id}')" style="background: rgba(2,155,202,0.3); border:1px solid rgba(72,202,228,0.5); color:#90e0ef; padding:5px 8px; border-radius:6px; cursor:pointer;" title="عرض ملف العميل كاملاً">👁️ تفاصيل</button>
                        ${toggleBtn}
                        <button class="action-btn-disc" onclick="openUserDiscountModal('${u.id}')" title="تطبيق خصم خاص للعميل">🎁 خصم</button>
                        <button class="action-btn-pass" onclick="openAdminResetPasswordModal('${u.id}')" style="background:#0984e3; border:none; color:white; padding:5px 8px; border-radius:6px; cursor:pointer;" title="تغيير كلمة المرور للعميل">🔑 باسورد</button>
                        <button onclick="toggleUserAdminRole('${u.id}')" style="background: rgba(255,193,7,0.2); border:1px solid #ffc107; color:#ffc107; padding:5px 8px; border-radius:6px; cursor:pointer;" title="ترقية أو إلغاء الإشراف">👑</button>
                        <button class="action-btn-del" onclick="deleteUser('${u.id}')" title="حذف العميل نهائياً">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function toggleShowUserPass(userId, btn) {
    const span = document.getElementById(`pass-text-${userId}`);
    if (!span) return;

    const isVisible = span.getAttribute('data-visible') === 'true';
    if (isVisible) {
        span.textContent = '••••••••';
        span.setAttribute('data-visible', 'false');
        btn.textContent = '👁️';
    } else {
        span.textContent = span.getAttribute('data-pass');
        span.setAttribute('data-visible', 'true');
        btn.textContent = '🙈';
    }
}

function toggleUserStatus(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    user.status = user.status === 'active' ? 'suspended' : 'active';
    saveAllUsers(users);
    if (typeof logSecurityEvent === 'function') logSecurityEvent('ADMIN', `تغيير حالة حساب (${user.name}) إلى: ${user.status}`);
    renderAdminDashboard();
    if (typeof showToast === 'function') {
        showToast(user.status === 'active' ? `✅ تم تفعيل حساب ${user.name}` : `⏸️ تم إيقاف حساب ${user.name}`);
    }
}

function deleteUser(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (confirm(`هل أنت متأكد من حذف حساب "${user.name}" نهائياً؟`)) {
        saveAllUsers(users.filter(u => u.id !== userId));
        if (typeof deleteUserFromCloud === 'function') deleteUserFromCloud(userId);
        if (typeof logSecurityEvent === 'function') logSecurityEvent('DANGER', `حذف حساب العميل نهائياً: ${user.name}`);
        renderAdminDashboard();
        if (typeof showToast === 'function') showToast(`تم حذف العميل ${user.name}`);
    }
}

function viewUserDetails(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('user-details-modal');
    const content = document.getElementById('user-details-content');
    if (!modal || !content) return;

    const currentPass = user.password ? user.password : 'مشفرة 🔒 (قم بتعيين كلمة جديدة لإظهارها)';

    content.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 15px;">
            <img src="${user.avatar || 'https://i.ibb.co/bRJNQB5c/final1200.png'}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; border: 2px solid #48cae4;">
            <div>
                <h3 style="margin: 0 0 5px 0; color: white;">${user.name}</h3>
                <span class="role-badge" style="background: rgba(2,155,202,0.3); color:#48cae4; border: 1px solid #48cae4; padding: 2px 10px; border-radius: 12px; font-size: 12px;">ID: ${user.id}</span>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
            <div><strong>📱 الهاتف:</strong> <a href="https://wa.me/2${user.phone}" target="_blank" style="color: #25D366; text-decoration: none;">${user.phone} 💬</a></div>
            <div><strong>✉️ البريد:</strong> ${user.email}</div>
            <div><strong>📍 العنوان:</strong> ${user.location || 'غير محدد'}</div>
            <div><strong>📅 تاريخ التسجيل:</strong> ${user.registered || 'حديث'}</div>
            <div><strong>💰 إجمالي المشتريات:</strong> ${(user.totalSpent || 0).toLocaleString()} ج.م</div>
            <div><strong>🎁 الخصم المخصص:</strong> ${user.discount || 0}%</div>
            <div><strong>الحالة:</strong> ${user.status === 'active' ? 'نشط ✅' : (user.status === 'pending' ? 'قيد الموافقة ⏳' : 'موقوف 🚫')}</div>
            <div style="grid-column: 1 / -1; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,193,7,0.4);">
                <strong>🔑 كلمة المرور الحالية:</strong> 
                <span style="color: #fffa65; font-family: monospace; font-size: 15px; margin-right: 8px;">${currentPass}</span>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeUserDetailsModal() {
    const modal = document.getElementById('user-details-modal');
    if (modal) modal.style.display = 'none';
}

function openAdminResetPasswordModal(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const modal = document.getElementById('admin-reset-pass-modal');
    const targetId = document.getElementById('reset-target-user-id');
    const targetInfo = document.getElementById('reset-target-user-info');
    const newPassInput = document.getElementById('admin-new-user-pass');

    if (!modal) return;
    targetId.value = user.id;
    targetInfo.textContent = `العميل: ${user.name} (${user.phone})`;
    newPassInput.value = user.password || '';
    modal.style.display = 'flex';
}

function closeAdminResetPassModal() {
    const modal = document.getElementById('admin-reset-pass-modal');
    if (modal) modal.style.display = 'none';
}

async function handleAdminSavePassword(e) {
    if (e) e.preventDefault();
    const userId = document.getElementById('reset-target-user-id').value;
    const newPass = document.getElementById('admin-new-user-pass').value.trim();

    if (newPass.length < 6) {
        alert("⚠️ كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام!");
        return;
    }

    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.password = newPass;
        if (typeof hashPassword === 'function') {
            user.passwordHash = await hashPassword(newPass);
        }
        saveAllUsers(users);
        if (typeof logSecurityEvent === 'function') logSecurityEvent('ADMIN', `تغيير كلمة مرور العميل: ${user.name}`);
        closeAdminResetPassModal();
        renderUsersTable();
        if (typeof showToast === 'function') {
            showToast(`✅ تم تحديث كلمة المرور للعميل ${user.name} بنجاح!`);
        } else {
            alert(`✅ تم تحديث كلمة المرور للعميل ${user.name} بنجاح!`);
        }
    }
}

async function copyAndSendNewPassWhatsApp() {
    const userId = document.getElementById('reset-target-user-id').value;
    const newPass = document.getElementById('admin-new-user-pass').value.trim();

    if (newPass.length < 6) {
        alert("⚠️ أدخل كلمة مرور جديدة أولاً!");
        return;
    }

    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.password = newPass;
        if (typeof hashPassword === 'function') {
            user.passwordHash = await hashPassword(newPass);
        }
        saveAllUsers(users);
        closeAdminResetPassModal();
        renderUsersTable();

        const msg = `مرحباً بك يا دكتور / أستاذ ${user.name} 👋\nنود إبلاغكم بأنه تم تعيين كلمة مرور جديدة لحسابكم في متجر JOO STORE للمستلزمات الطبية:\n🔑 كلمة المرور الجديدة: *${newPass}*\nيمكنكم تسجيل الدخول الآن عبر: Account.html`;
        window.open(`https://wa.me/2${user.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
}

function openUserDiscountModal(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    document.getElementById('discount-target-user-id').value = user.id;
    document.getElementById('discount-user-name').textContent = `العميل: ${user.name}`;
    document.getElementById('user-custom-discount').value = user.discount || 0;
    document.getElementById('user-discount-modal').style.display = 'flex';
}

function closeUserDiscountModal() {
    document.getElementById('user-discount-modal').style.display = 'none';
}

function handleSaveUserDiscount(e) {
    if (e) e.preventDefault();
    const userId = document.getElementById('discount-target-user-id').value;
    const discountVal = Number(document.getElementById('user-custom-discount').value);
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.discount = discountVal;
        saveAllUsers(users);
        closeUserDiscountModal();
        renderAdminDashboard();
        if (typeof showToast === 'function') showToast(`🎁 تم حفظ خصم ${discountVal}% للعميل ${user.name}`);
    }
}

function filterUsersTable() {
    const searchInput = document.getElementById('user-search-input');
    if (searchInput) renderUsersTable(searchInput.value);
}

function openAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'flex';
}

function closeAddUserModal() {
    document.getElementById('add-user-modal').style.display = 'none';
}

async function handleCreateUserFromAdmin(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('new-u-name').value.trim();
    const email = document.getElementById('new-u-email').value.trim().toLowerCase();
    const phone = document.getElementById('new-u-phone').value.trim();
    const pass = document.getElementById('new-u-pass').value;

    const hashedPassword = typeof hashPassword === 'function' ? await hashPassword(pass) : pass;

    const users = getAllUsers();
    users.unshift({
        id: 'u-' + Date.now(),
        name, email, phone,
        password: pass,
        passwordHash: hashedPassword,
        status: 'active',
        discount: 0,
        registered: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
        createdAt: Date.now(),
        totalSpent: 0,
        avatar: 'https://i.ibb.co/bRJNQB5c/final1200.png'
    });

    saveAllUsers(users);
    closeAddUserModal();
    renderAdminDashboard();
    if (typeof showToast === 'function') showToast(`✅ تم إنشاء حساب العميل ${name}`);
}

// 7. مركز إدارة الطلبات الشامل
let currentOrderStatusFilter = 'all';

function filterOrdersByStatus(status, btnElement) {
    currentOrderStatusFilter = status;
    document.querySelectorAll('.orders-status-filters .cat-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    renderAdminOrders();
}

function filterOrdersTable() {
    const input = document.getElementById('order-search-input');
    renderAdminOrders(input ? input.value : '');
}

function renderAdminOrders(searchQuery = '') {
    const container = document.getElementById('admin-orders-container');
    if (!container) return;

    let orders = typeof getOrderHistory === 'function' ? getOrderHistory(true) : [];

    if (currentOrderStatusFilter !== 'all') {
        orders = orders.filter(o => (o.status || '').includes(currentOrderStatusFilter));
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        orders = orders.filter(o => o.id.toLowerCase().includes(q) || (o.customerName && o.customerName.toLowerCase().includes(q)));
    }

    if (orders.length === 0) {
        container.innerHTML = `<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 35px; font-size: 15px;">لا توجد طلبات تطابق الفلترة الحالية.</p>`;
        return;
    }

    let html = '';
    orders.forEach(order => {
        html += `
            <div class="order-card" style="margin-bottom: 20px;">
                <div class="order-card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <strong style="color: #48cae4; font-size: 16px;">طلب رقم: ${order.id}</strong>
                        <span style="color: #fffa65; margin-right: 12px; font-size: 13px;">👤 ${order.customerName || 'عميل'} (${order.customerPhone || ''})</span>
                        <span style="color: rgba(255,255,255,0.7); margin-right: 12px; font-size: 13px;">📅 ${order.date}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 13px; color: rgba(255,255,255,0.8);">حالة الطلب:</span>
                        <select onchange="changeOrderStatus('${order.id}', this.value)" class="status-select-admin">
                            <option value="تم الطلب عبر واتساب ✓" ${order.status === 'تم الطلب عبر واتساب ✓' ? 'selected' : ''}>تم الطلب ✓</option>
                            <option value="قيد التجهيز ⏳" ${order.status === 'قيد التجهيز ⏳' ? 'selected' : ''}>قيد التجهيز ⏳</option>
                            <option value="جاري الشحن والتوصيل 🚚" ${order.status === 'جاري الشحن والتوصيل 🚚' ? 'selected' : ''}>جاري الشحن والتوصيل 🚚</option>
                            <option value="تم التسليم بنجاح ✅" ${order.status === 'تم التسليم بنجاح ✅' ? 'selected' : ''}>تم التسليم بنجاح ✅</option>
                            <option value="ملغي ❌" ${order.status === 'ملغي ❌' ? 'selected' : ''}>ملغي ❌</option>
                        </select>
                    </div>
                </div>

                <div class="order-card-body">
                    <div class="order-items-grid">
        `;

        (order.items || []).forEach(item => {
            html += `
                <div class="order-item-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0,0,0,0.25); border-radius: 8px; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="${item.img}" style="width: 45px; height: 45px; object-fit: contain; border-radius: 6px; background: rgba(255,255,255,0.08);">
                        <div>
                            <div style="font-weight: bold; color: white;">${item.title}</div>
                            <small style="color: rgba(255,255,255,0.6);">الكمية: ${item.qty} × ${(item.price || 0).toLocaleString()} ج.م</small>
                        </div>
                    </div>
                    <div style="font-weight: bold; color: #48cae4;">${((item.price || 0) * item.qty).toLocaleString()} ج.م</div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>

                <div class="order-card-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 16px;">
                        الإجمالي النهائي: <strong style="color: #2ed573; font-size: 18px;">${(order.total || 0).toLocaleString()} ج.م</strong>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="order-wa-notify-btn" onclick="notifyCustomerOrderWhatsApp('${order.id}')">
                            💬 إشعار العميل عبر واتساب
                        </button>
                        <button class="action-btn-del" onclick="deleteAdminOrder('${order.id}')">
                            🗑️ حذف
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function changeOrderStatus(orderId, newStatus) {
    let orders = typeof getOrderHistory === 'function' ? getOrderHistory(true) : [];
    const ord = orders.find(o => o.id === orderId);
    if (ord) {
        ord.status = newStatus;
        localStorage.setItem('joo_order_history', JSON.stringify(orders));
        if (typeof showToast === 'function') showToast(`✅ تم تحديث حالة الطلب (${orderId}) إلى: ${newStatus}`);
    }
}

function notifyCustomerOrderWhatsApp(orderId) {
    const orders = typeof getOrderHistory === 'function' ? getOrderHistory(true) : [];
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const phone = ord.customerPhone || '01093901120';
    const msg = `السلام عليكم ورحمة الله يا فندم 🩺\nنود إبلاغكم من إدارة JOO STORE للمستلزمات الطبية بأن حالة طلبكم رقم *${ord.id}* بمبلغ *${(ord.total || 0).toLocaleString()} ج.م* قد تم تحديثها إلى:\n\n📢 *${ord.status || 'جاري التجهيز'}*\n\nشكراً لثقتكم بنا!`;
    window.open(`https://wa.me/2${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function deleteAdminOrder(orderId) {
    if (confirm(`هل أنت متأكد من حذف الطلب "${orderId}"؟`)) {
        let orders = typeof getOrderHistory === 'function' ? getOrderHistory(true) : [];
        orders = orders.filter(o => o.id !== orderId);
        localStorage.setItem('joo_order_history', JSON.stringify(orders));
        renderAdminOrders();
        if (typeof showToast === 'function') showToast(`تم حذف الطلب ${orderId}`);
    }
}

// 8. إدارة المنتجات والمخزون
function getAllProducts() {
    try {
        const saved = localStorage.getItem(PRODUCTS_KEY);
        if (saved) return JSON.parse(saved);
    } catch(e) {
        console.error(e);
    }

    const defaultStoreProducts = [
        { id: 'p1', title: 'مستلزمات المعامل و التحاليل', price: 1850, category: 'lab', inStock: true, img: 'https://i.ibb.co/7xVQwcvm/medical-supply-1.png' },
        { id: 'p2', title: 'أدوات جراحية متطورة', price: 950, category: 'clinic', inStock: true, img: 'https://i.ibb.co/v6ShZpQh/medical-supply-elements-2.png' },
        { id: 'p3', title: 'أجهزة الفحص والتشخيص', price: 1200, category: 'diagnostic', inStock: true, img: 'https://i.ibb.co/tM9FTCNv/medical-supply-elements-4.png' },
        { id: 'p4', title: 'مستلزمات العيادات الطبية', price: 650, category: 'clinic', inStock: true, img: 'https://i.ibb.co/M52vdRdH/medical-sup1.png' },
        { id: 'p5', title: 'حقائب الإسعافات الأولية', price: 420, category: 'emergency', inStock: true, img: 'https://i.ibb.co/QFNswDQh/medical-supply-elements-5.png' },
        { id: 'p6', title: 'معدات الرعاية الطبية', price: 1500, category: 'emergency', inStock: true, img: 'https://i.ibb.co/CpC9Gz0D/medical-supply-elements-7.png' },
        { id: 'p7', title: 'مستلزمات المعامل والتحاليل', price: 780, category: 'lab', inStock: true, img: 'https://i.ibb.co/SwdBwmvz/medical-sup2.png' },
        { id: 'p8', title: 'طقم فحص طبي شامل', price: 1100, category: 'diagnostic', inStock: true, img: 'https://i.ibb.co/VpBT87y2/4.png' },
        { id: 'p14', title: 'حقنة طبية دقيقة', price: 280, category: 'clinic', inStock: true, img: 'https://i.ibb.co/bRvjFVFY/medical-syringe.png' }
    ];

    saveAllProducts(defaultStoreProducts);
    return defaultStoreProducts;
}

function saveAllProducts(products) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

function renderAdminProducts() {
    const container = document.getElementById('admin-products-container');
    if (!container) return;

    const products = getAllProducts();
    let html = '';

    products.forEach(p => {
        html += `
            <div class="admin-product-card">
                <div class="admin-product-thumb">
                    <img src="${p.img}" alt="${p.title}">
                </div>
                <div>
                    <h4 style="margin: 0 0 5px 0; color: white;">${p.title}</h4>
                    <span style="color: #48cae4; font-weight: bold; font-size: 16px;">${p.price.toLocaleString()} ج.م</span>
                    <span style="display: block; font-size: 12px; margin-top: 4px; color: ${p.inStock ? '#2ed573' : '#ff4757'};">
                        ${p.inStock ? 'متوفر في المخزون ✅' : 'نفدت الكمية ⚠️'}
                    </span>
                </div>
                <div class="admin-product-actions">
                    <button type="button" onclick="editProductPrice('${p.id}')" style="flex:1; background: rgba(2,155,202,0.3); border:1px solid #48cae4; color:#48cae4; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">✏️ السعر</button>
                    <button type="button" onclick="toggleProductStock('${p.id}')" style="flex:1; background: ${p.inStock ? 'rgba(255,165,2,0.2)' : 'rgba(46,213,115,0.2)'}; border:1px solid ${p.inStock ? '#ffa502' : '#2ed573'}; color: ${p.inStock ? '#ffa502' : '#2ed573'}; padding:6px; border-radius:6px; font-size:12px; cursor:pointer;">
                        ${p.inStock ? 'إيقاف ⏸️' : 'تفعيل ▶️'}
                    </button>
                    <button type="button" onclick="deleteProduct('${p.id}')" style="background: rgba(255,71,87,0.2); border:1px solid #ff4757; color:#ff4757; padding:6px 10px; border-radius:6px; font-size:12px; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleProductStock(prodId) {
    const products = getAllProducts();
    const p = products.find(x => x.id === prodId);
    if (p) {
        p.inStock = !p.inStock;
        saveAllProducts(products);
        renderAdminProducts();
        if (typeof showToast === 'function') showToast(p.inStock ? `✅ تم توفير منتج "${p.title}"` : `⚠️ تم تعيين "${p.title}" كغير متوفر`);
    }
}

function editProductPrice(prodId) {
    const products = getAllProducts();
    const p = products.find(x => x.id === prodId);
    if (!p) return;

    const newPrice = prompt(`تعديل سعر: ${p.title}\nالسعر الحالي: ${p.price} ج.م\nأدخل السعر الجديد:`, p.price);
    if (newPrice && Number(newPrice) > 0) {
        p.price = Number(newPrice);
        saveAllProducts(products);
        renderAdminProducts();
        if (typeof showToast === 'function') showToast(`💰 تم تحديث السعر إلى ${p.price} ج.م`);
    }
}

function deleteProduct(prodId) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        const products = getAllProducts().filter(x => x.id !== prodId);
        saveAllProducts(products);
        renderAdminProducts();
        if (typeof showToast === 'function') showToast("تم حذف المنتج");
    }
}

function openAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.style.display = 'flex';
}

function closeAddProductModal() {
    const modal = document.getElementById('add-product-modal');
    if (modal) modal.style.display = 'none';
}

function handleCreateProduct(e) {
    if (e) e.preventDefault();
    const title = document.getElementById('new-prod-title').value.trim();
    const price = Number(document.getElementById('new-prod-price').value);
    const category = document.getElementById('new-prod-cat').value;
    const img = document.getElementById('new-prod-img').value.trim();

    if (!title || price <= 0 || !img) return;

    const products = getAllProducts();
    products.unshift({
        id: 'p-' + Date.now(),
        title,
        price,
        category,
        inStock: true,
        img
    });

    saveAllProducts(products);
    closeAddProductModal();
    renderAdminProducts();
    if (typeof showToast === 'function') showToast(`🎉 تم إضافة المنتج "${title}" بنجاح!`);
}

// 9. إعلانات المتجر والشريط الترويجي
function loadAnnouncement() {
    const textInput = document.getElementById('announcement-text');
    const enableCheckbox = document.getElementById('announcement-enable');
    if (!textInput) return;

    try {
        const saved = JSON.parse(localStorage.getItem(ANNOUNCEMENT_KEY) || '{}');
        textInput.value = saved.text || '';
        if (enableCheckbox) enableCheckbox.checked = saved.enabled === true;
    } catch(e) {
        console.error(e);
    }
}

function handleSaveAnnouncement(e) {
    if (e) e.preventDefault();
    const text = document.getElementById('announcement-text').value.trim();
    const enabled = document.getElementById('announcement-enable').checked;

    localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify({ text, enabled }));
    if (typeof showToast === 'function') {
        showToast(enabled ? "📢 تم نشر وتفعيل إعلان المتجر!" : "تم حفظ الإعلان وإيقاف ظهوره.");
    } else {
        alert("تم حفظ إعدادات إعلان المتجر بنجاح!");
    }
}

// 10. إدارة الخصومات والكوبونات
function renderDiscountsList() {
    const container = document.getElementById('discounts-list-container');
    if (!container) return;
    const discounts = getAllDiscounts();
    if (discounts.length === 0) {
        container.innerHTML = `<p style="color: rgba(255,255,255,0.7);">لا توجد كوبونات خصم حالياً. أضف كوداً جديداً أعلاه.</p>`;
        return;
    }
    let html = '';
    discounts.forEach(d => {
        html += `
            <div style="background: rgba(4,43,119,0.6); padding:15px; border-radius:12px; border:1px solid rgba(2,155,202,0.3); color:white; text-align:center; margin-bottom:10px;">
                <span style="color:#48cae4; font-weight:bold; font-size:18px;">${d.code}</span> - 
                <span style="background:#2ed573; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:bold;">${d.percent}% خصم</span>
                <div style="margin: 8px 0; font-size:13px; color:rgba(255,255,255,0.8);">${d.desc || ''}</div>
                <button onclick="toggleDiscount('${d.code}')" style="background:${d.active ? '#ffa502' : '#2ed573'}; border:none; color:white; padding:5px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">${d.active ? 'إيقاف ⏸️' : 'تفعيل ▶️'}</button>
                <button onclick="deleteDiscount('${d.code}')" style="background:#ff4757; border:none; color:white; padding:5px 12px; border-radius:6px; cursor:pointer; font-weight:bold;">حذف 🗑️</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function handleCreateDiscount(e) {
    if (e) e.preventDefault();
    const code = document.getElementById('disc-code').value.trim().toUpperCase();
    const percent = Number(document.getElementById('disc-percent').value);
    const desc = document.getElementById('disc-desc').value.trim();
    if (!code || percent <= 0) return;

    const discounts = getAllDiscounts();
    if (discounts.some(d => d.code === code)) {
        alert("كود الخصم هذا موجود بالفعل!");
        return;
    }

    discounts.unshift({ code, percent, desc, active: true });
    saveAllDiscounts(discounts);
    document.getElementById('disc-code').value = '';
    document.getElementById('disc-percent').value = '';
    document.getElementById('disc-desc').value = '';
    renderAdminDashboard();
    if (typeof showToast === 'function') showToast(`🎉 تم إنشاء وتفعيل كود الخصم "${code}"`);
}

function toggleDiscount(code) {
    const discounts = getAllDiscounts();
    const item = discounts.find(d => d.code === code);
    if (item) {
        item.active = !item.active;
        saveAllDiscounts(discounts);
        renderAdminDashboard();
        if (typeof showToast === 'function') showToast(item.active ? `✅ تم تفعيل كود ${code}` : `⏸️ تم إيقاف كود ${code}`);
    }
}

function deleteDiscount(code) {
    saveAllDiscounts(getAllDiscounts().filter(d => d.code !== code));
    renderAdminDashboard();
    if (typeof showToast === 'function') showToast(`تم حذف كود ${code}`);
}

// 11. تصدير نسخة احتياطية كاملة للمتجر
function exportStoreBackup() {
    const backupData = {
        exportDate: new Date().toISOString(),
        users: getAllUsers(),
        orders: typeof getOrderHistory === 'function' ? getOrderHistory(true) : [],
        products: getAllProducts(),
        discounts: getAllDiscounts(),
        announcement: JSON.parse(localStorage.getItem(ANNOUNCEMENT_KEY) || '{}'),
        securityLogs: JSON.parse(localStorage.getItem('joo_security_logs') || '[]'),
        messages: JSON.parse(localStorage.getItem('joo_store_messages') || '[]')
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `joo_store_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (typeof showToast === 'function') showToast("📥 تم تحميل النسخة الاحتياطية بنجاح!");
}

// 12. صلاحيات الأدمن الإضافية: وضع الصيانة + سجل الأمان + ترقية عميل لأدمن
function toggleMaintenanceMode() {
    const current = localStorage.getItem('joo_maintenance_mode') === 'true';
    const nextState = !current;
    localStorage.setItem('joo_maintenance_mode', nextState.toString());
    updateMaintenanceButtonUI();
    if (typeof logSecurityEvent === 'function') {
        logSecurityEvent('ADMIN', nextState ? 'تم تفعيل وضع الصيانة للمتجر 🛠️' : 'تم إيقاف وضع الصيانة وعودة المتجر للعمل ✅');
    }
    alert(nextState ? "🛠️ تم تفعيل وضع الصيانة: لن يتمكن العملاء من تصفح المتجر الآن." : "✅ تم فتح المتجر للعملاء بنجاح!");
}

function updateMaintenanceButtonUI() {
    const btn = document.getElementById('maintenance-toggle-btn');
    if (!btn) return;
    const isMaint = localStorage.getItem('joo_maintenance_mode') === 'true';
    btn.textContent = isMaint ? '🟢 إيقاف وضع الصيانة' : '🛠️ وضع الصيانة: مغلق';
    btn.style.background = isMaint ? 'rgba(255, 71, 87, 0.4)' : 'rgba(2, 155, 202, 0.25)';
}

function renderSecurityLogs() {
    const container = document.getElementById('security-logs-container');
    if (!container) return;
    const logs = JSON.parse(localStorage.getItem('joo_security_logs') || '[]');
    if (logs.length === 0) {
        container.innerHTML = `<p style="color:rgba(255,255,255,0.6); text-align:center; padding:20px;">لا توجد سجلات أمنية حتى الآن.</p>`;
        return;
    }

    container.innerHTML = logs.map(log => {
        const color = log.type === 'DANGER' ? '#ff4757' : (log.type === 'WARNING' ? '#ffa502' : (log.type === 'ADMIN' ? '#fffa65' : '#2ed573'));
        return `
            <div style="background:rgba(0,0,0,0.3); border-right:4px solid ${color}; padding:12px 16px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span style="color:white; font-size:14px;">${log.details}</span>
                <span style="color:rgba(255,255,255,0.6); font-size:12px;">🕒 ${log.time}</span>
            </div>
        `;
    }).join('');
}

function clearSecurityLogs() {
    if (confirm("هل تريد مسح سجل المراقبة الأمني؟")) {
        localStorage.removeItem('joo_security_logs');
        renderSecurityLogs();
    }
}

function toggleUserAdminRole(userId) {
    const users = getAllUsers();
    const user = users.find(u => u.id === userId);
    if (!user) return;
    user.isAdmin = !user.isAdmin;
    saveAllUsers(users);
    if (typeof logSecurityEvent === 'function') {
        logSecurityEvent('ADMIN', `تغيير صلاحية (${user.name}) إلى: ${user.isAdmin ? 'مشرف Admin 👑' : 'عميل عادي'}`);
    }
    renderAdminDashboard();
    alert(`تم تحديث صلاحية ${user.name} بنجاح!`);
}

// 13. عرض وإدارة رسائل العملاء الواردة من الصفحة الرئيسية
function renderAdminMessages() {
    const container = document.getElementById('admin-messages-container');
    const badge = document.getElementById('messages-tab-badge');
    const messages = JSON.parse(localStorage.getItem('joo_store_messages') || '[]');

    if (badge) badge.textContent = messages.length;
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `<p style="color:rgba(255,255,255,0.6); text-align:center; padding:25px;">لا توجد رسائل واردة من العملاء حتى الآن.</p>`;
        return;
    }

    container.innerHTML = messages.map(m => `
        <div style="background:rgba(4,43,119,0.65); border:1px solid rgba(72,202,228,0.4); padding:16px; border-radius:12px; color:white;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:10px;">
                <div>
                    <strong style="color:#fffa65; font-size:15px;">👤 ${m.senderName}</strong>
                    <span style="color:#48cae4; font-size:13px; margin-right:10px;">📱 ${m.senderPhone}</span>
                </div>
                <span style="color:rgba(255,255,255,0.6); font-size:12px;">🕒 ${m.date}</span>
            </div>
            <p style="margin:0 0 12px 0; line-height:1.6; font-size:15px; white-space:pre-wrap;">${m.message}</p>
            <div style="display:flex; gap:8px; justify-content:flex-end;">
                ${m.senderPhone && m.senderPhone !== 'غير متوفر' ? `<a href="https://wa.me/2${m.senderPhone}?text=${encodeURIComponent('مرحباً بك يا ' + m.senderName + '، بخصوص رسالتك في متجر JOO STORE:')}" target="_blank" style="background:#25D366; color:white; text-decoration:none; padding:6px 12px; border-radius:6px; font-size:13px; font-weight:bold;">💬 رد عبر واتساب</a>` : ''}
                <button type="button" onclick="deleteAdminMessage('${m.id}')" style="background:#ff4757; border:none; color:white; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:13px;">🗑️ حذف</button>
            </div>
        </div>
    `).join('');
}

function deleteAdminMessage(msgId) {
    if (confirm("هل تريد حذف هذه الرسالة؟")) {
        let messages = JSON.parse(localStorage.getItem('joo_store_messages') || '[]');
        messages = messages.filter(m => m.id !== msgId);
        localStorage.setItem('joo_store_messages', JSON.stringify(messages));
        if (typeof deleteMessageFromCloud === 'function') deleteMessageFromCloud(msgId);
        renderAdminMessages();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        if (checkAdminAuth()) {
            renderAdminDashboard();
            updateMaintenanceButtonUI();
            if (typeof syncUsersFromCloud === 'function') {
                syncUsersFromCloud(() => renderAdminDashboard());
            }
            // تأكد من وجود السطر التالي هنا:
            if (typeof syncMessagesFromCloud === 'function') {
                syncMessagesFromCloud(() => renderAdminMessages());
            }
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        if (checkAdminAuth()) {
            renderAdminDashboard();
            updateMaintenanceButtonUI();
            
            if (typeof syncUsersFromCloud === 'function') {
                syncUsersFromCloud(() => renderAdminDashboard());
            }
            if (typeof syncMessagesFromCloud === 'function') {
                syncMessagesFromCloud(() => renderAdminMessages());
            }
            // أضف هذا السطر هنا لتتم مزامنة الطلبات لحظياً:
            if (typeof syncOrdersFromCloud === 'function') {
                syncOrdersFromCloud(() => renderAdminOrders());
            }
        }
    }
});
