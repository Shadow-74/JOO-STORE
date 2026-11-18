// ==========================================
// JOO STORE - Secure Authentication (pass.js)
// ==========================================

function switchAuthTab(tab) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');

    if (!loginForm || !registerForm) return;

    if (tab === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

function sanitizeInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// إنشاء حساب جديد وإرساله إلى Firebase
async function handleRegister(e) {
    e.preventDefault();

    const name = sanitizeInput(document.getElementById('reg-name').value.trim());
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const phone = document.getElementById('reg-phone').value.trim();
    const location = sanitizeInput(document.getElementById('reg-location') ? document.getElementById('reg-location').value.trim() : 'غير محدد');
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!name || !email || !phone || !password) {
        alert("⚠️ يرجى ملء جميع الحقول المطلوبة!");
        return;
    }

    if (password !== confirmPassword) {
        alert("⚠️ كلمتا المرور غير متطابقتين!");
        return;
    }

    const strongRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (!strongRegex.test(password)) {
        alert("⚠️ لحماية حسابك، يجب أن تحتوي كلمة المرور على 6 أحرف على الأقل وتشمل حروفاً وأرقاماً معاً!");
        return;
    }

    // جلب أحدث البيانات من السحابة قبل التحقق من التكرار
    if (typeof db !== 'undefined') {
        try {
            const snap = await db.collection('users').get();
            const cloudUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            localStorage.setItem('joo_all_users', JSON.stringify(cloudUsers));
        } catch (err) { console.error(err); }
    }

    let allUsers = JSON.parse(localStorage.getItem('joo_all_users') || '[]');

    if (allUsers.some(u => (u.email && u.email.toLowerCase() === email) || (u.phone && u.phone === phone))) {
        alert("⚠️ هذا البريد الإلكتروني أو رقم الهاتف مسجل لدينا بالفعل! يرجى تسجيل الدخول.");
        switchAuthTab('login');
        return;
    }

    const hashedPassword = typeof hashPassword === 'function' ? await hashPassword(password) : password;

    const newUser = {
        id: 'u-' + Date.now(),
        name: name,
        email: email,
        phone: phone,
        location: location,
        password: password,
        passwordHash: hashedPassword,
        status: 'pending',
        discount: 0,
        registered: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
        createdAt: Date.now(),
        totalSpent: 0,
        avatar: 'https://i.ibb.co/bRJNQB5c/final1200.png'
    };

    allUsers.unshift(newUser);
    localStorage.setItem('joo_all_users', JSON.stringify(allUsers));

    // حفظ الحساب في Firebase ليظهر للأدمن فوراً
    if (typeof saveUserToCloud === 'function') {
        await saveUserToCloud(newUser);
    }

    if (typeof logSecurityEvent === 'function') {
        logSecurityEvent('SUCCESS', `طلب تسجيل حساب جديد: ${name} (${email})`);
    }

    alert(
        `🎉 تم استلام طلب إنشاء حسابك بنجاح يا ${name}!\n\n` +
        `🔒 تم إرسال بياناتك وحسابك الآن قيد مراجعة إدارة JOO STORE لتفعيله.`
    );

    switchAuthTab('login');
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) loginEmailInput.value = email;
}

// تسجيل الدخول مع التحقق من Firebase
async function handleLogin(event) {
    if (event) event.preventDefault();

    const lockUntil = Number(localStorage.getItem('joo_login_lock_until') || 0);
    if (Date.now() < lockUntil) {
        const remainingSec = Math.ceil((lockUntil - Date.now()) / 1000);
        alert(`🛡️ تم قفل تسجيل الدخول مؤقتاً بسبب تكرار المحاولات الخاطئة. حاول بعد ${remainingSec} ثانية.`);
        return;
    }

    const emailInput = document.getElementById('login-email').value.trim();
    const passInput = document.getElementById('login-password').value;
    const rememberCheckbox = document.querySelector('.remember-me input[type="checkbox"]');
    const rememberMe = rememberCheckbox ? rememberCheckbox.checked : false;

    const isAdminUser = emailInput.toUpperCase() === 'JOO' || emailInput.toLowerCase() === 'admin@joostore.com';

    // 1. فحص دخول مدير النظام (Admin)
    if (isAdminUser && passInput === 'Joo_0100') {
        localStorage.removeItem('joo_failed_attempts');
        const adminUser = {
            id: 'admin-master',
            name: 'إدارة JOO STORE 👑',
            email: 'admin@joostore.com',
            isAdmin: true,
            status: 'active',
            rememberMe: rememberMe
        };
        localStorage.setItem('joo_is_admin_logged_in', 'true');
        localStorage.setItem('joo_current_user', JSON.stringify(adminUser));
        localStorage.setItem('joo_last_activity', Date.now().toString());
        if (typeof logSecurityEvent === 'function') {
            logSecurityEvent('ADMIN', 'تسجيل دخول ناجح لمدير النظام (JOO)');
        }
        window.location.href = 'admin.html';
        return;
    }

    // 2. جلب أحدث حالة للعملاء من Firebase قبل فحص الدخول
    if (typeof db !== 'undefined') {
        try {
            const snap = await db.collection('users').get();
            const cloudUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (cloudUsers.length > 0) {
                localStorage.setItem('joo_all_users', JSON.stringify(cloudUsers));
            }
        } catch (err) { console.error(err); }
    }

    const inputHash = typeof hashPassword === 'function' ? await hashPassword(passInput) : passInput;
    let allUsers = JSON.parse(localStorage.getItem('joo_all_users') || '[]');
    const user = allUsers.find(u =>
        (u.email && u.email.toLowerCase() === emailInput.toLowerCase()) ||
        (u.phone && u.phone === emailInput)
    );

    const isPasswordValid = user && (user.passwordHash === inputHash || user.password === passInput);

    if (!isPasswordValid) {
        let attempts = Number(localStorage.getItem('joo_failed_attempts') || 0) + 1;
        localStorage.setItem('joo_failed_attempts', attempts.toString());
        if (typeof logSecurityEvent === 'function') {
            logSecurityEvent('WARNING', `محاولة دخول فاشلة (${attempts}/3) للحساب: ${emailInput}`);
        }

        if (attempts >= 3) {
            localStorage.setItem('joo_login_lock_until', (Date.now() + 60000).toString());
            localStorage.removeItem('joo_failed_attempts');
            alert("🚨 تم إدخال كلمة المرور خطأ 3 مرات! تم قفل الدخول لمدة 60 ثانية لحماية الحساب.");
        } else {
            alert(`⚠️ بيانات الدخول غير صحيحة! (المحاولة ${attempts} من 3)`);
        }
        return;
    }

    localStorage.removeItem('joo_failed_attempts');

    if (user.status === 'pending') {
        alert(`⏳ مرحباً بك يا ${user.name}!\nحسابك ما زال بانتظار موافقة وتفعيل إدارة JOO STORE.`);
        return;
    }

    if (user.status === 'suspended') {
        alert("🚫 تم إيقاف هذا الحساب من قِبل إدارة المتجر. تواصل معنا عبر واتساب: 01093901120");
        return;
    }

    const sessionUser = { ...user, rememberMe: rememberMe };
    delete sessionUser.password;
    delete sessionUser.passwordHash;

    localStorage.setItem('joo_current_user', JSON.stringify(sessionUser));
    localStorage.setItem('joo_last_activity', Date.now().toString());
    if (typeof logSecurityEvent === 'function') {
        logSecurityEvent('SUCCESS', `تسجيل دخول ناجح للعميل: ${user.name} (${user.email})`);
    }

    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput && loginEmailInput.type === 'email') {
        loginEmailInput.type = 'text';
    }

    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm-password');
    const matchMsg = document.getElementById('match-msg');

    if (password && confirmPassword) {
        const validate = () => {
            if (!confirmPassword.value) { if (matchMsg) matchMsg.textContent = ""; return; }
            if (password.value === confirmPassword.value) {
                matchMsg.textContent = "✓ متطابقتان"; matchMsg.style.color = "#2ed573";
            } else {
                matchMsg.textContent = "✗ غير متطابقتان"; matchMsg.style.color = "#ff4757";
            }
        };
        password.addEventListener('input', validate);
        confirmPassword.addEventListener('input', validate);
    }
});