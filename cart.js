// ==========================================
// JOO STORE - Shopping Cart & Order History Logic (cart.js)
// ==========================================

const ORDERS_KEY = 'joo_order_history';
const APPLIED_COUPON_KEY = 'joo_applied_coupon';
const PHONE_NUMBER = '201093901120'; // رقم الواتساب للطلب

// 1. استرجاع بيانات المستخدم الحالي
function getCurrentUser() {
    try {
        const currentUserData = localStorage.getItem('joo_current_user') || localStorage.getItem('joo_registered_user');
        if (currentUserData) return JSON.parse(currentUserData);
    } catch (e) {
        console.error(e);
    }
    return null;
}

// 2. دوال السلة المعزولة لكل عميل
function getUserCartKey() {
    const user = getCurrentUser();
    return user ? `joo_store_cart_${user.id}` : 'joo_store_cart_guest';
}

function getCart() {
    try {
        const data = localStorage.getItem(getUserCartKey());
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(getUserCartKey(), JSON.stringify(cart));
    updateCartBadge();
}

// 3. استرجاع سجل المشتريات (معزول للعميل، وشامل للأدمن)
function getOrderHistory(allForAdmin = false) {
    try {
        const saved = localStorage.getItem(ORDERS_KEY);
        const allOrders = saved ? JSON.parse(saved) : [];
        if (allForAdmin) return allOrders;

        const currentUser = getCurrentUser();
        if (!currentUser) return [];
        if (currentUser.isAdmin) return allOrders;
        return allOrders.filter(o => o.userId === currentUser.id || o.customerPhone === currentUser.phone);
    } catch (e) {
        return [];
    }
}

// 4. إضافة منتج إلى السلة
function addToCart(id, title, price, img) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.qty += 1;
    } else {
        cart.push({
            id: id,
            title: title,
            price: Number(price),
            img: img,
            qty: 1
        });
    }

    saveCart(cart);
    showToast(`تمت إضافة "${title}" إلى السلة بنجاح! 🛒`);
}

// 5. تعديل الكمية (+ أو -)
function updateQty(id, delta) {
    let cart = getCart();
    const item = cart.find(i => i.id === id);

    if (item) {
        item.qty += delta;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart(cart);
        renderCart();
    }
}

// 6. حذف منتج من السلة
function removeFromCart(id) {
    let cart = getCart();
    cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    renderCart();
    showToast("تم حذف المنتج من السلة");
}

// 7. تفريغ السلة بالكامل
function clearCart() {
    if (confirm("هل أنت متأكد من رغبتك في تفريغ السلة بالكامل؟")) {
        localStorage.removeItem(getUserCartKey());
        updateCartBadge();
        renderCart();
        showToast("تم تفريغ السلة");
    }
}

// 8. تحديث عداد السلة في شريط التنقل
function updateCartBadge() {
    const cart = getCart();
    const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);

    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
        badge.textContent = totalCount;
        badge.style.display = totalCount > 0 ? 'inline-block' : 'none';
    });
}

// 9. إظهار إشعار سريع وأنيق (Toast Notification)
function showToast(message) {
    let toast = document.getElementById('cart-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cart-toast';
        toast.className = 'cart-toast';
        document.body.appendChild(toast);
    }

    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
            <a href="Shopping Cart.html" class="toast-btn">عرض السلة</a>
        </div>
    `;

    toast.classList.add('show');
    clearTimeout(toast.hideTimeout);
    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// 10. عرض محتويات السلة في صفحة Shopping Cart.html
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const summaryCard = document.getElementById('cart-summary-section');
    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-card">
                <div class="empty-cart-icon">🛒</div>
                <h2>سلة التسوق فارغة حالياً</h2>
                <p>لم تقم بإضافة أي مستلزمات طبية بعد.</p>
                <a href="Prodacte.html" class="browse-btn">تصفح المنتجات الآن</a>
            </div>
        `;
        if (summaryCard) summaryCard.style.display = 'none';
        return;
    }

    if (summaryCard) summaryCard.style.display = 'block';

    let totalAmount = 0;
    let html = '<div class="cart-items-list">';

    cart.forEach(item => {
        const itemTotal = item.price * item.qty;
        totalAmount += itemTotal;

        html += `
            <div class="cart-item-card">
                <div class="cart-item-img">
                    <img src="${item.img}" alt="${item.title}">
                </div>
                <div class="cart-item-details">
                    <h3 class="cart-item-title">${item.title}</h3>
                    <div class="cart-item-unit-price">${item.price.toLocaleString()} ج.م / للقطعة</div>
                </div>
                <div class="cart-item-qty-control">
                    <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
                    <span class="qty-number">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                </div>
                <div class="cart-item-total">
                    ${itemTotal.toLocaleString()} ج.م
                </div>
                <button class="cart-remove-btn" title="حذف المنتج" onclick="removeFromCart('${item.id}')">
                    &times;
                </button>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;

    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const discountRow = document.getElementById('discount-summary-row');
    const discountTitle = document.getElementById('discount-title');
    const discountAmountEl = document.getElementById('discount-amount');

    if (subtotalEl) subtotalEl.textContent = `${totalAmount.toLocaleString()} ج.م`;

    const appliedCoupon = getAppliedCoupon();
    let discountPercent = appliedCoupon ? (appliedCoupon.percent || 0) : 0;

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.discount && currentUser.discount > discountPercent) {
        discountPercent = currentUser.discount;
    }

    let discountVal = 0;
    if (discountPercent > 0) {
        discountVal = Math.round(totalAmount * (discountPercent / 100));
    }
    const finalTotal = Math.max(0, totalAmount - discountVal);

    if (discountRow) {
        if (discountPercent > 0) {
            discountRow.style.display = 'flex';
            if (discountTitle) {
                discountTitle.textContent = appliedCoupon ? `كوبون (${appliedCoupon.code} - ${discountPercent}%):` : `خصم خاص للعميل (${discountPercent}%):`;
            }
            if (discountAmountEl) {
                discountAmountEl.textContent = `-${discountVal.toLocaleString()} ج.م`;
            }
        } else {
            discountRow.style.display = 'none';
        }
    }

    if (totalEl) totalEl.textContent = `${finalTotal.toLocaleString()} ج.م`;
}

// 11. نظام تطبيق الكوبونات والأكواد الترويجية في السلة
function getAppliedCoupon() {
    try {
        const data = localStorage.getItem(APPLIED_COUPON_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function applyCoupon() {
    const input = document.getElementById('coupon-code-input');
    const msgEl = document.getElementById('coupon-msg');
    if (!input) return;

    const code = input.value.trim().toUpperCase();
    if (!code) {
        if (msgEl) {
            msgEl.textContent = "الرجاء كتابة كود الخصم أولاً!";
            msgEl.style.color = "#ff6b81";
        }
        return;
    }

    let discounts = [];
    try {
        const saved = localStorage.getItem('joo_store_discounts');
        discounts = saved ? JSON.parse(saved) : [
            { code: 'JOO10', percent: 10, desc: 'خصم ترحيبي لجميع العملاء', active: true },
            { code: 'DOCTOR20', percent: 20, desc: 'خصم خاص للأطباء والمستشفيات', active: true }
        ];
    } catch (e) {
        discounts = [];
    }

    const matchedDiscount = discounts.find(d => d.code.toUpperCase() === code && d.active !== false);

    if (matchedDiscount) {
        localStorage.setItem(APPLIED_COUPON_KEY, JSON.stringify(matchedDiscount));
        if (msgEl) {
            msgEl.textContent = `✓ تم تطبيق كود "${matchedDiscount.code}" بنجاح (${matchedDiscount.percent}% خصم)`;
            msgEl.style.color = "#2ed573";
        }
        renderCart();
        showToast(`🎁 مبروك! حصلت على خصم بقيمة ${matchedDiscount.percent}%`);
    } else {
        if (msgEl) {
            msgEl.textContent = "✗ كود الخصم غير صحيح أو غير سارٍ حالياً!";
            msgEl.style.color = "#ff4757";
        }
    }
}

// 12. نافذة مراجعة الفاتورة المصغرة قبل الواتساب
function checkoutViaWhatsApp() {
    const cart = getCart();
    if (cart.length === 0) {
        alert("سلة التسوق فارغة! الرجاء إضافة منتجات أولاً.");
        return;
    }

    const currentUser = getCurrentUser();
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    const appliedCoupon = getAppliedCoupon();
    let discountPercent = appliedCoupon ? (appliedCoupon.percent || 0) : 0;
    if (currentUser && currentUser.discount && currentUser.discount > discountPercent) {
        discountPercent = currentUser.discount;
    }

    let discountVal = discountPercent > 0 ? Math.round(subtotal * (discountPercent / 100)) : 0;
    let finalTotal = Math.max(0, subtotal - discountVal);

    let existingModal = document.getElementById('checkout-preview-modal');
    if (existingModal) existingModal.remove();

    let modalHTML = `
        <div id="checkout-preview-modal" style="position: fixed; inset:0; background: rgba(0,5,20,0.8); backdrop-filter: blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px; direction:rtl;">
            <div style="background: rgba(4,35,95,0.95); border:1px solid rgba(2,155,202,0.5); border-radius:20px; padding:25px; width:100%; max-width:450px; color:white; text-align:right; box-shadow:0 15px 40px rgba(0,0,0,0.6);">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:10px; margin-bottom:15px;">
                    <h3 style="margin:0; font-size:18px;">🧾 مراجعة الفاتورة النهائية</h3>
                    <button onclick="document.getElementById('checkout-preview-modal').remove()" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                <div style="font-size:14px; color:rgba(255,255,255,0.85); margin-bottom:15px; max-height:180px; overflow-y:auto;">
                    <p><strong>العميل:</strong> ${currentUser ? currentUser.name : 'زائر'}</p>
                    <p><strong>العنوان:</strong> ${currentUser ? (currentUser.location || 'غير محدد') : 'غير محدد'}</p>
                    <hr style="border-color:rgba(255,255,255,0.1);">
                    <p><strong>المجموع الفرعي:</strong> ${subtotal.toLocaleString()} ج.م</p>
                    ${discountPercent > 0 ? `<p style="color:#2ed573;"><strong>الخصم (${discountPercent}%):</strong> -${discountVal.toLocaleString()} ج.م</p>` : ''}
                    <p style="font-size:18px; color:#2ed573;"><strong>الإجمالي النهائي:</strong> ${finalTotal.toLocaleString()} ج.م</p>
                </div>
                <div style="display:flex; gap:10px;">
                    <button onclick="executeFinalWhatsAppCheckout()" style="flex:2; background:#25D366; color:white; border:none; padding:12px; border-radius:10px; font-weight:bold; cursor:pointer;">تأكيد وإرسال للواتساب 💬</button>
                    <button onclick="document.getElementById('checkout-preview-modal').remove()" style="flex:1; background:rgba(255,255,255,0.1); color:white; border:none; padding:12px; border-radius:10px; cursor:pointer;">تعديل السلة</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 13. تنفيذ الطلب الفعلي وحفظه وإرساله للواتساب
function executeFinalWhatsAppCheckout() {
    const cart = getCart();
    const currentUser = getCurrentUser();
    let subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    let message = "السلام عليكم ورحمة الله،\nأرغب في تأكيد طلبي من متجر JOO STORE:\n\n";
    if (currentUser) {
        message += `👤 *العميل:* ${currentUser.name}\n`;
        message += `📱 *الهاتف:* ${currentUser.phone || 'غير متوفر'}\n`;
        message += `📍 *عنوان الشحن والموقع:* ${currentUser.location || 'غير محدد'}\n`;
        message += "--------------------------------\n";
    }

    message += "📋 *تفاصيل المنتجات:*\n";
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.title} (الكمية: ${item.qty}) - ${(item.price * item.qty).toLocaleString()} ج.م\n`;
    });

    const appliedCoupon = getAppliedCoupon();
    let discountPercent = appliedCoupon ? (appliedCoupon.percent || 0) : 0;
    if (currentUser && currentUser.discount && currentUser.discount > discountPercent) {
        discountPercent = currentUser.discount;
    }
    let discountVal = discountPercent > 0 ? Math.round(subtotal * (discountPercent / 100)) : 0;
    let finalTotal = Math.max(0, subtotal - discountVal);

    message += `--------------------------------\n`;
    message += `💰 *الإجمالي النهائي للدفع:* ${finalTotal.toLocaleString()} ج.م\n`;

    const newOrder = {
        id: 'JOO-' + Math.floor(1000 + Math.random() * 9000),
        userId: currentUser ? currentUser.id : 'guest',
        date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
        status: 'تم الطلب عبر واتساب ✓',
        customerName: currentUser ? currentUser.name : 'عميل المتجر',
        customerPhone: currentUser ? currentUser.phone : '01093901120',
        customerLocation: currentUser ? (currentUser.location || 'غير محدد') : 'غير محدد',
        total: finalTotal,
        items: JSON.parse(JSON.stringify(cart))
    };

    let history = getOrderHistory(true);
    history.unshift(newOrder);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(history));

    // تحديث إجمالي مشتريات العميل المسجل
    if (currentUser && currentUser.email) {
        try {
            const allUsers = JSON.parse(localStorage.getItem('joo_all_users') || '[]');
            const u = allUsers.find(x => x.email === currentUser.email || x.id === currentUser.id);
            if (u) {
                u.totalSpent = (u.totalSpent || 0) + finalTotal;
                localStorage.setItem('joo_all_users', JSON.stringify(allUsers));
                currentUser.totalSpent = u.totalSpent;
                localStorage.setItem('joo_current_user', JSON.stringify(currentUser));
            }
        } catch (e) {
            console.error(e);
        }
    }

    localStorage.removeItem(getUserCartKey());
    localStorage.removeItem(APPLIED_COUPON_KEY);
    updateCartBadge();
    renderCart();

    const modal = document.getElementById('checkout-preview-modal');
    if (modal) modal.remove();

    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

// 14. عرض صفحة البروفايل وسجل المشتريات
function renderProfilePage() {
    const ordersContainer = document.getElementById('orders-list-container');
    if (!ordersContainer) return;

    const user = getCurrentUser();
    if (!user) return;

    const elName = document.getElementById('profile-name');
    const elEmail = document.getElementById('profile-email');
    const elPhone = document.getElementById('profile-phone');
    const elAvatar = document.getElementById('profile-avatar-img');
    const elStatus = document.getElementById('stats-account-status');
    const elRole = document.getElementById('profile-role-tag');

    if (elName && user.name) elName.textContent = user.name;
    if (elEmail && user.email) elEmail.textContent = user.email;
    if (elPhone && user.phone) elPhone.textContent = `📱 ${user.phone} | 📍 ${user.location || 'غير محدد'}`;
    if (elAvatar && user.avatar) elAvatar.src = user.avatar;

    if (elStatus) {
        if (user.status === 'suspended') {
            elStatus.textContent = 'موقوف مؤقتاً 🚫';
            elStatus.style.color = '#ff4757';
        } else if (user.discount && user.discount > 0) {
            elStatus.textContent = `خصم ${user.discount}% 🎁`;
            elStatus.style.color = '#ffc107';
        } else {
            elStatus.textContent = 'نشط ومميز ⭐';
            elStatus.style.color = '#48cae4';
        }
    }

    if (elRole && user.isAdmin) {
        elRole.textContent = 'مدير النظام (Admin) 👑';
        elRole.style.background = 'rgba(255, 193, 7, 0.25)';
        elRole.style.borderColor = '#ffc107';
        elRole.style.color = '#ffc107';
    }

    const orders = getOrderHistory(false);
    const totalOrdersCount = orders.length;
    const totalSpent = orders.reduce((sum, ord) => sum + (ord.total || 0), 0);

    const statsOrders = document.getElementById('stats-orders-count');
    const statsSpent = document.getElementById('stats-total-spent');
    const badgeCount = document.getElementById('orders-badge-count');

    if (statsOrders) statsOrders.textContent = `${totalOrdersCount} طلبات`;
    if (statsSpent) statsSpent.textContent = `${totalSpent.toLocaleString()} ج.م`;
    if (badgeCount) badgeCount.textContent = `${totalOrdersCount} طلبات`;

    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-orders-card">
                <div class="empty-icon">🛍️</div>
                <h3>لا توجد مشتريات سابقة حتى الآن</h3>
                <p>ابدأ تسوق أحدث وأفضل المستلزمات الطبية الآن وستظهر طلباتك هنا مباشرة.</p>
                <a href="Prodacte.html" class="browse-btn">تصفح المنتجات</a>
            </div>
        `;
        return;
    }

    let html = '';
    orders.forEach(order => {
        html += `
            <div class="order-card">
                <div class="order-card-header">
                    <div class="order-header-info">
                        <span class="order-id">رقم الطلب: ${order.id}</span>
                        <span class="order-date">📅 ${order.date}</span>
                    </div>
                    <span class="order-status-badge">${order.status || 'تم الطلب ✓'}</span>
                </div>
                <div class="order-card-body">
                    <div class="order-items-grid">
        `;

        (order.items || []).forEach(item => {
            const itemTotal = (item.price || 0) * (item.qty || 1);
            html += `
                <div class="order-item-row">
                    <div class="order-item-thumb">
                        <img src="${item.img}" alt="${item.title}">
                    </div>
                    <div class="order-item-details">
                        <h4 class="order-item-title">${item.title}</h4>
                        <div class="order-item-meta">
                            <span>الكمية: <strong>${item.qty}</strong></span>
                            <span>سعر الوحدة: <strong>${(item.price || 0).toLocaleString()} ج.م</strong></span>
                        </div>
                    </div>
                    <div class="order-item-price">
                        ${itemTotal.toLocaleString()} ج.م
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
                <div class="order-card-footer">
                    <div class="order-total-box">
                        <span>إجمالي الطلب:</span>
                        <span class="order-total-amount">${(order.total || 0).toLocaleString()} ج.م</span>
                    </div>
                    <button class="reorder-whatsapp-btn" onclick="reorderWhatsApp('${order.id}')">
                        💬 استفسار عن هذا الطلب
                    </button>
                </div>
            </div>
        `;
    });

    ordersContainer.innerHTML = html;
}

function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) return;

    const user = getCurrentUser();
    if (!user) return;

    const inputName = document.getElementById('edit-name');
    const inputEmail = document.getElementById('edit-email');
    const inputPhone = document.getElementById('edit-phone');
    const previewImg = document.getElementById('edit-avatar-preview');

    if (inputName) inputName.value = user.name || '';
    if (inputEmail) inputEmail.value = user.email || '';
    if (inputPhone) inputPhone.value = user.phone || '';
    if (previewImg) previewImg.src = user.avatar || 'https://i.ibb.co/bRJNQB5c/final1200.png';

    modal.style.display = 'flex';
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.style.display = 'none';
}

function previewUploadedAvatar(event) {
    const file = event.target.files && event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('edit-avatar-preview');
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function selectPresetAvatar(imgElement) {
    const preview = document.getElementById('edit-avatar-preview');
    if (preview) preview.src = imgElement.src;
}

function handleSaveProfile(event) {
    event.preventDefault();

    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim().toLowerCase();
    const phone = document.getElementById('edit-phone').value.trim();
    const previewImg = document.getElementById('edit-avatar-preview');
    const avatar = previewImg ? previewImg.src : 'https://i.ibb.co/bRJNQB5c/final1200.png';

    let user = getCurrentUser();
    if (!user) return;

    user.name = name;
    user.email = email;
    user.phone = phone;
    user.avatar = avatar;

    localStorage.setItem('joo_current_user', JSON.stringify(user));

    try {
        let allUsers = JSON.parse(localStorage.getItem('joo_all_users') || '[]');
        let index = allUsers.findIndex(u => u.id === user.id || u.email === email || u.phone === phone);
        if (index !== -1) {
            allUsers[index].name = name;
            allUsers[index].email = email;
            allUsers[index].phone = phone;
            allUsers[index].avatar = avatar;
        }
        localStorage.setItem('joo_all_users', JSON.stringify(allUsers));
    } catch (e) {
        console.error(e);
    }

    closeEditProfileModal();
    renderProfilePage();
    showToast("✓ تم حفظ بياناتك بنجاح!");
}

function reorderWhatsApp(orderId) {
    const orders = getOrderHistory(false);
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    let msg = `السلام عليكم، أستفسر بخصوص طلبي السابق رقم *${order.id}* بمبلغ *${order.total.toLocaleString()} ج.م*.`;
    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// 15. مزامنة المنتجات المضافة من لوحة الأدمن مع صفحة المنتجات تلقائياً
// 15. مزامنة حالة المخزون والأسعار والمنتجات الجديدة من لوحة الأدمن مع المتجر
function syncAdminProductsToStore() {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;

    try {
        const savedProducts = JSON.parse(localStorage.getItem('joo_store_products') || '[]');
        
        savedProducts.forEach(p => {
            // البحث عن زر الطلب الخاص بهذا المنتج في الصفحة
            const existingBtn = document.querySelector(`[onclick*="'${p.id}'"]`);

            if (existingBtn) {
                // المنتج موجود بالفعل في الصفحة: نحدّث سعره وحالة توفره
                const card = existingBtn.closest('.product-card');
                if (card) {
                    const priceValEl = card.querySelector('.price-val');
                    if (priceValEl) priceValEl.textContent = Number(p.price).toLocaleString();

                    if (!p.inStock) {
                        card.style.opacity = '0.55';
                        existingBtn.disabled = true;
                        existingBtn.textContent = 'نفدت الكمية ⚠️';
                        existingBtn.style.background = 'rgba(255, 71, 87, 0.3)';
                        existingBtn.style.borderColor = '#ff4757';
                        existingBtn.style.cursor = 'not-allowed';
                        existingBtn.removeAttribute('onclick');
                    } else {
                        card.style.opacity = '1';
                        existingBtn.disabled = false;
                        existingBtn.textContent = 'طلب المنتج 🛒';
                        existingBtn.setAttribute('onclick', `addToCart('${p.id}', '${p.title.replace(/'/g, "\\'")}', ${p.price}, '${p.img}')`);
                    }
                }
            } else {
                // المنتج جديد أضافه الأدمن: ننشئ له بطاقة في المتجر
                const cardHTML = `
                    <div class="product-card" data-category="${p.category || 'diagnostic'}" style="${!p.inStock ? 'opacity: 0.55;' : ''}">
                        <div class="product-img-box">
                            <img src="${p.img}" alt="${p.title}" loading="lazy">
                        </div>
                        <div class="product-info">
                            <h3 class="product-title">${p.title}</h3>
                            <div class="product-price">
                                <span class="price-val">${Number(p.price).toLocaleString()}</span> <span class="currency">ج.م</span>
                            </div>
                            ${p.inStock 
                                ? `<button type="button" class="order-btn" onclick="addToCart('${p.id}', '${p.title.replace(/'/g, "\\'")}', ${p.price}, '${p.img}')">طلب المنتج 🛒</button>`
                                : `<button type="button" class="order-btn" disabled style="background: rgba(255,71,87,0.3); border-color: #ff4757; cursor: not-allowed;">نفدت الكمية ⚠️</button>`
                            }
                        </div>
                    </div>
                `;
                grid.insertAdjacentHTML('afterbegin', cardHTML);
            }
        });
    } catch (e) {
        console.error(e);
    }
}

// 16. تصفية وبحث المنتجات الطبية في صفحة المنتجات
let currentCategory = 'all';

function setProductCategory(category, btnElement) {
    currentCategory = category;
    document.querySelectorAll('.cat-pill').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');
    filterMedicalProducts();
}

function filterMedicalProducts() {
    const searchInput = document.getElementById('product-search-input');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const cards = document.querySelectorAll('.products-grid .product-card');

    let visibleCount = 0;
    cards.forEach(card => {
        const titleEl = card.querySelector('.product-title');
        const title = titleEl ? titleEl.textContent.toLowerCase() : '';
        const cat = card.getAttribute('data-category') || 'all';

        const matchesQuery = !query || title.includes(query);
        const matchesCategory = currentCategory === 'all' || cat === currentCategory;

        if (matchesQuery && matchesCategory) {
            card.style.display = 'flex';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    let noResultsMsg = document.getElementById('no-products-msg');
    const grid = document.querySelector('.products-grid');
    if (visibleCount === 0) {
        if (!noResultsMsg && grid) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.id = 'no-products-msg';
            noResultsMsg.className = 'empty-orders-card';
            noResultsMsg.style.gridColumn = '1 / -1';
            noResultsMsg.innerHTML = `
                <div class="empty-icon">🔍</div>
                <h3>لا توجد منتجات تطابق بحثك حالياً</h3>
                <p>جرب البحث بكلمات أخرى أو اختر قسماً آخر من الأزرار أعلاه.</p>
            `;
            grid.appendChild(noResultsMsg);
        }
    } else {
        if (noResultsMsg) noResultsMsg.remove();
    }
}

// تشغيل الفحص عند التحميل
document.addEventListener('DOMContentLoaded', () => {
    syncAdminProductsToStore();
    updateCartBadge();
    renderCart();
    renderProfilePage();
});