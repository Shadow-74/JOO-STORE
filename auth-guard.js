// ==========================================
// JOO STORE - Security & Auth Guard (auth-guard.js)
// ==========================================

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 دقيقة بدون نشاط

// 1. دالة تشفير كلمات المرور SHA-256 (لعدم حفظ الباسورد نص صريح)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "_JOO_SALT_2026");
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. تسجيل الأحداث الأمنية في سجل الأدمن (Security Audit Log)
function logSecurityEvent(type, details) {
    try {
        const logs = JSON.parse(localStorage.getItem('joo_security_logs') || '[]');
        logs.unshift({
            id: 'LOG-' + Date.now(),
            type: type, // 'SUCCESS', 'WARNING', 'DANGER', 'ADMIN'
            details: details,
            time: new Date().toLocaleString('ar-EG')
        });
        // الاحتفاظ بآخر 100 حدث فقط
        localStorage.setItem('joo_security_logs', JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
        console.error(e);
    }
}

// 3. التحقق من الجلسة وإجبار تسجيل الدخول
function enforceAuthentication() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const isAccountPage = currentPage.toLowerCase() === 'account.html';
    const isAdminPage = currentPage.toLowerCase() === 'admin.html';

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('joo_current_user'));
    } catch (e) {
        currentUser = null;
    }

    const isAdmin = (currentUser && (currentUser.isAdmin === true || currentUser.email === 'admin@joostore.com')) 
                    || localStorage.getItem('joo_is_admin_logged_in') === 'true';

    // فحص انتهاء مدة الجلسة (لو مكنش مختار "تذكرني")
    if (currentUser && !currentUser.rememberMe) {
        const lastActivity = Number(localStorage.getItem('joo_last_activity') || Date.now());
        if (Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
            logSecurityEvent('WARNING', `انتهت جلسة المستخدم تلقائياً لعدم النشاط: ${currentUser.email}`);
            logoutUser(false);
            alert("⏳ انتهت جلستك تلقائياً لعدم النشاط لمدة 30 دقيقة. يرجى تسجيل الدخول مجدداً.");
            window.location.href = 'Account.html';
            return;
        }
    }
    localStorage.setItem('joo_last_activity', Date.now().toString());

    // فحص وضع الصيانة (Maintenance Mode) - يُستثنى منه الأدمن وصفحة تسجيل الدخول Account.html
    const isMaintenance = localStorage.getItem('joo_maintenance_mode') === 'true';
    if (isMaintenance && !isAdmin && !isAccountPage) {
        const showMaintenanceScreen = () => {
            if (!document.body) return;
            document.body.innerHTML = `
                <div style="min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:20px; color:white; direction:rtl; background:#021024;">
                    <div style="background:rgba(4,43,119,0.75); border:1px solid #48cae4; padding:40px; border-radius:20px; max-width:500px; backdrop-filter:blur(12px); box-shadow:0 15px 40px rgba(0,0,0,0.5);">
                        <div style="font-size:60px; margin-bottom:15px;">🛠️</div>
                        <h1 style="color:#48cae4; margin-bottom:10px;">المتجر تحت الصيانة والتحديث</h1>
                        <p style="color:rgba(255,255,255,0.85); line-height:1.7;">نقوم حالياً بإضافة مستلزمات طبية جديدة وتحسين الخدمة. سنعود للعمل خلال دقائق!</p>
                        <div style="display:flex; gap:10px; justify-content:center; margin-top:25px; flex-wrap:wrap;">
                            <a href="Account.html" style="background:#0288d1; text-decoration:none; color:white; padding:10px 22px; border-radius:10px; font-weight:bold;">👑 دخول الإدارة</a>
                            ${currentUser ? `<button onclick="logoutUser()" style="background:rgba(255,71,87,0.3); border:1px solid #ff4757; color:#ff6b81; padding:10px 20px; border-radius:10px; cursor:pointer; font-weight:bold;">تسجيل خروج</button>` : ''}
                        </div>
                    </div>
                </div>
            `;
        };

        if (document.body) {
            showMaintenanceScreen();
        } else {
            document.addEventListener('DOMContentLoaded', showMaintenanceScreen);
        }
        return;
    }

    // أ) إذا لم يكن مسجلاً للدخول وهو في أي صفحة غير Account.html -> طرد فوري لصفحة التسجيل
    if (!currentUser) {
        if (!isAccountPage) {
            window.location.replace('Account.html');
        }
        return;
    }

    // ب) التحقق من أن حساب العميل ما زال نشطاً ولم يتم إيقافه من الأدمن
    if (!isAdmin) {
        const allUsers = JSON.parse(localStorage.getItem('joo_all_users') || '[]');
        const dbUser = allUsers.find(u => u.id === currentUser.id || u.email === currentUser.email);
        if (!dbUser || dbUser.status !== 'active') {
            alert("⚠️ تم إيقاف حسابك أو إلغاء تفعيله بواسطة الإدارة.");
            logoutUser();
            return;
        }
    }

    // ج) إذا كان مسجلاً للدخول وحاول فتح Account.html -> توجيهه للصفحة الرئيسية أو لوحة الأدمن
    if (isAccountPage) {
        window.location.replace(isAdmin ? 'admin.html' : 'index.html');
        return;
    }

    // د) حماية صفحة admin.html من دخول العملاء العاديين
    if (isAdminPage && !isAdmin) {
        logSecurityEvent('DANGER', `محاولة وصول غير مصرح بها للوحة الأدمن من: ${currentUser.email}`);
        alert("🚫 غير مصرح لك بالدخول إلى لوحة الإدارة!");
        window.location.replace('index.html');
        return;
    }

    // تحديث شريط التنقل وإظهار شريط الإعلانات بعد تحميل الصفحة
    if (document.body) {
        updateNavbarForLoggedInUser(currentUser, isAdmin);
        renderGlobalAnnouncementBanner();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            updateNavbarForLoggedInUser(currentUser, isAdmin);
            renderGlobalAnnouncementBanner();
        });
    }
}

// 4. إخفاء قائمة Account وإضافة زر تسجيل الخروج (وزر الأدمن إن وجد)
function updateNavbarForLoggedInUser(user, isAdmin) {
    const nav = document.querySelector('.nav-container');
    if (!nav) return;

    // إخفاء أي عنصر يشير إلى Account.html
    const navCards = nav.querySelectorAll('.sd-card');
    navCards.forEach(card => {
        const link = card.querySelector('a');
        if (link && link.getAttribute('href') && link.getAttribute('href').includes('Account.html')) {
            card.style.display = 'none';
        }
    });

    // إضافة زر لوحة الأدمن إذا كان المستخدم أدمن (وليس موجوداً بالفعل)
    if (isAdmin && !nav.querySelector('a[href*="admin.html"]')) {
        const adminCard = document.createElement('div');
        adminCard.className = 'sd-card';
        adminCard.style.borderColor = '#ffa502';
        adminCard.innerHTML = `<a href="./admin.html" style="color: #fffa65;">👑 Admin</a>`;
        nav.appendChild(adminCard);
    }

    // إضافة زر تسجيل الخروج في شريط التنقل
    if (!document.getElementById('nav-logout-btn')) {
        const logoutCard = document.createElement('div');
        logoutCard.id = 'nav-logout-btn';
        logoutCard.className = 'sd-card';
        logoutCard.style.borderColor = 'rgba(255, 71, 87, 0.5)';
        logoutCard.style.background = 'rgba(255, 71, 87, 0.2)';
        logoutCard.innerHTML = `<a href="javascript:void(0)" onclick="logoutUser()" style="color: #ff6b81;">🚪 خروج</a>`;
        nav.appendChild(logoutCard);
    }
}

// 5. عرض شريط الإعلانات الترويجي في أعلى كل الصفحات (إذا فعّله الأدمن)
function renderGlobalAnnouncementBanner() {
    try {
        const saved = JSON.parse(localStorage.getItem('joo_store_announcement') || '{}');
        if (saved.enabled && saved.text && !document.getElementById('global-top-banner') && document.body) {
            const banner = document.createElement('div');
            banner.id = 'global-top-banner';
            banner.className = 'store-announcement-banner';
            banner.innerHTML = `<span>📢</span> <span>${saved.text}</span>`;
            document.body.insertBefore(banner, document.body.firstChild);
        }
    } catch (e) {
        console.error(e);
    }
}

// 6. تسجيل الخروج الآمن
function logoutUser(redirect = true) {
    const user = JSON.parse(localStorage.getItem('joo_current_user') || 'null');
    if (user) {
        logSecurityEvent('SUCCESS', `تسجيل خروج: ${user.email}`);
    }
    localStorage.removeItem('joo_current_user');
    localStorage.removeItem('joo_is_admin_logged_in');
    localStorage.removeItem('joo_last_activity');
    if (redirect) {
        window.location.href = 'Account.html';
    }
}

// تشغيل الحماية
enforceAuthentication();