// Global App State
let currentUser = null;
let currentToken = null; // Mock token (Clerk User ID in simulation mode)
let activeServiceType = null;
let currentUploadFile = null;

// Initial Page Load Hook
window.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initializeDefaultWizards();
    initializeFilterTags();
    // Default show landing page
    showSection('landing');
});

function initializeFilterTags() {
    const tags = document.querySelectorAll('.btn-tag');
    const cards = document.querySelectorAll('.service-card');
    const searchInput = document.getElementById('service-search-input');
    if (!tags.length) return;
    
    function filterServices() {
        const filter = document.querySelector('.btn-tag.active')?.getAttribute('data-filter') || 'all';
        const query = searchInput?.value.toLowerCase().trim() || '';
        
        cards.forEach(card => {
            const category = card.getAttribute('data-category');
            const title = card.querySelector('h3').textContent.toLowerCase();
            const description = card.querySelector('p').textContent.toLowerCase();
            
            const matchesFilter = filter === 'all' || category === filter;
            const matchesSearch = title.includes(query) || description.includes(query);
            
            if (matchesFilter && matchesSearch) {
                card.classList.remove('filtered-out');
            } else {
                card.classList.add('filtered-out');
            }
        });
    }

    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            tags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterServices();
        });
    });

    searchInput?.addEventListener('input', filterServices);
}

// Navigation state controller
function showSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    
    // Reset active states in nav links
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    if (sectionId === 'landing') {
        document.getElementById('landing-section').classList.remove('hidden');
    } else if (sectionId === 'dashboard') {
        if (!currentToken) {
            alert("กรุณาเข้าสู่ระบบก่อนใช้งานแดชบอร์ด");
            showSection('landing');
            return;
        }
        document.getElementById('dashboard-section').classList.remove('hidden');
        document.getElementById('nav-dashboard-link').classList.add('active');
        fetchOrders();
    } else if (sectionId === 'admin') {
        document.getElementById('admin-section').classList.remove('hidden');
        document.getElementById('nav-admin-link').classList.add('active');
        const role = localStorage.getItem('edocman_role');
        if (role === 'ADMIN') {
            document.getElementById('admin-login-panel').classList.add('hidden');
            document.getElementById('admin-dashboard-panel').classList.remove('hidden');
            fetchAdminOrders();
            loadAdminUsers();
            loadAdminConfig();
        } else {
            document.getElementById('admin-login-panel').classList.remove('hidden');
            document.getElementById('admin-dashboard-panel').classList.add('hidden');
        }
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Authenticated session state checking
function checkSession() {
    const savedToken = localStorage.getItem('edocman_token');
    const savedUser = localStorage.getItem('edocman_user');
    const savedRole = localStorage.getItem('edocman_role');
    
    if (savedToken && savedUser) {
        currentToken = savedToken;
        currentUser = JSON.parse(savedUser);
        
        // Show user details in navbar
        document.getElementById('clerk-auth-container').classList.add('hidden');
        document.getElementById('user-profile-container').classList.remove('hidden');
        document.getElementById('user-display-name').innerText = 'คุณ ' + currentUser.fullName;
        
        if (savedRole === 'ADMIN') {
            document.getElementById('nav-dashboard-link').classList.add('hidden');
        } else {
            document.getElementById('nav-dashboard-link').classList.remove('hidden');
        }
    } else {
        currentToken = null;
        currentUser = null;
        document.getElementById('clerk-auth-container').classList.remove('hidden');
        document.getElementById('user-profile-container').classList.add('hidden');
        document.getElementById('nav-dashboard-link').classList.add('hidden');
    }
}

// Auth modal handlers
function openAuthModal(view) {
    document.getElementById('auth-overlay').classList.remove('hidden');
    
    // Hide all panels
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));
    
    if (view === 'signin') {
        document.getElementById('auth-modal-title').innerText = "เข้าสู่ระบบ eDocman";
        document.getElementById('auth-panel-signin').classList.remove('hidden');
    } else if (view === 'signup') {
        document.getElementById('auth-modal-title').innerText = "ลงทะเบียนสมาชิกใหม่";
        document.getElementById('auth-panel-signup').classList.remove('hidden');
    } else if (view === 'forgot') {
        document.getElementById('auth-modal-title').innerText = "กู้คืนรหัสผ่าน";
        document.getElementById('auth-panel-forgot').classList.remove('hidden');
    } else if (view === 'mfa') {
        document.getElementById('auth-modal-title').innerText = "ความปลอดภัยสองชั้น (2FA)";
        document.getElementById('auth-panel-mfa').classList.remove('hidden');
    }
}

function closeAuthModal() {
    document.getElementById('auth-overlay').classList.add('hidden');
}

// Handle login submission
function handleNativeLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }
        return res.json();
    })
    .then(data => {
        if (data.mfaRequired) {
            document.getElementById('mfa-target-email').innerText = data.email;
            openAuthModal('mfa');
            startOtpCooldownTimer(60);
        } else {
            localStorage.setItem('edocman_token', data.token);
            localStorage.setItem('edocman_user', JSON.stringify(data.user));
            localStorage.setItem('edocman_role', data.user.role);
            checkSession();
            closeAuthModal();
            if (data.user.role === 'ADMIN') {
                showSection('admin');
            } else {
                showSection('dashboard');
            }
        }
    })
    .catch(err => {
        alert(err.message);
    });
}

// Handle registration submission
function handleNativeRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    const pdpaConsented = document.getElementById('reg-pdpa').checked;
    
    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, password, pdpaConsented })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("การสมัครสมาชิกล้มเหลว อีเมลนี้อาจถูกใช้งานแล้ว");
        }
        return res.json();
    })
    .then(user => {
        alert("ลงทะเบียนบัญชี eDocman สำเร็จ! กรุณาเข้าสู่ระบบด้วยบัญชีของคุณ");
        openAuthModal('signin');
    })
    .catch(err => {
        alert(err.message);
    });
}

// Handle forgot password recovery email
function handleNativeForgot(e) {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    
    fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
        alert("หากมีบัญชีนี้ในระบบ เราได้จัดส่งรหัสและลิงก์รีเซ็ตไปที่อีเมลของคุณแล้ว");
        openAuthModal('signin');
    })
    .catch(err => {
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง");
    });
}

// Auto focus movement for 2FA OTP codes boxes
function handleOtpFocus(input, index) {
    if (input.value.length === 1 && index < 6) {
        document.getElementById('otp-' + (index + 1)).focus();
    }
}

// Resend OTP
function resendMfaCode() {
    const email = document.getElementById('mfa-target-email').innerText;
    fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
    .then(res => res.json())
    .then(data => {
        alert("ส่งรหัสผ่าน 2FA OTP ใหม่เรียบร้อยแล้ว");
        startOtpCooldownTimer(60);
    })
    .catch(err => alert("ล้มเหลวในการส่งรหัสอีกครั้ง"));
}

// Submit 2FA OTP Code
function submitNativeMfa() {
    const email = document.getElementById('mfa-target-email').innerText;
    const otpCode = [
        document.getElementById('otp-1').value,
        document.getElementById('otp-2').value,
        document.getElementById('otp-3').value,
        document.getElementById('otp-4').value,
        document.getElementById('otp-5').value,
        document.getElementById('otp-6').value
    ].join('');
    
    if (otpCode.length < 6) {
        alert("กรุณากรอกรหัส OTP ให้ครบถ้วน");
        return;
    }
    
    fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("รหัสยืนยันไม่ถูกต้องหรือหมดอายุการใช้งาน");
        }
        return res.json();
    })
    .then(data => {
        localStorage.setItem('edocman_token', data.token);
        localStorage.setItem('edocman_user', JSON.stringify(data.user));
        localStorage.setItem('edocman_role', data.user.role);
        checkSession();
        closeAuthModal();
        showSection('dashboard');
    })
    .catch(err => {
        alert(err.message);
    });
}

// Social Login Simulated triggers
function handleSocialMockLogin(platform) {
    const email = platform.toLowerCase() + "_" + Math.floor(Math.random() * 1000) + "@example.com";
    const name = platform + " User";
    const mockId = "clerk_" + platform.toLowerCase() + "_" + UUID();
    
    const requestBody = {
        clerkUserId: mockId,
        email: email,
        fullName: name,
        phone: "081-111-2222",
        pdpaConsented: true
    };
    
    fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    })
    .then(res => res.json())
    .then(user => {
        localStorage.setItem('edocman_token', user.clerkUserId);
        localStorage.setItem('edocman_user', JSON.stringify(user));
        localStorage.setItem('edocman_role', user.role);
        checkSession();
        closeAuthModal();
        showSection('dashboard');
    })
    .catch(err => alert("Social Login Simulation failed"));
}

function executeLogout() {
    localStorage.removeItem('edocman_token');
    localStorage.removeItem('edocman_user');
    localStorage.removeItem('edocman_role');
    checkSession();
    showSection('landing');
}

// Helper to make a UUID
function UUID() {
    return 'xxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// 2FA cooldown timer
let otpTimer = null;
function startOtpCooldownTimer(duration) {
    const btn = document.getElementById('otp-resend-btn');
    const display = document.getElementById('otp-cooldown-timer');
    if (otpTimer) clearInterval(otpTimer);
    
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.6';
    display.innerText = duration;
    
    otpTimer = setInterval(() => {
        duration--;
        display.innerText = duration;
        if (duration <= 0) {
            clearInterval(otpTimer);
            btn.style.pointerEvents = 'auto';
            btn.style.opacity = '1';
        }
    }, 1000);
}

// Landing flows triggers
function startServiceRequest() {
    if (!currentToken) {
        openAuthModal('signin');
    } else {
        showSection('dashboard');
    }
}

function selectServiceCatalog(catalogType) {
    if (!currentToken) {
        openAuthModal('signin');
    } else {
        showSection('dashboard');
        if (catalogType === 'DBD') {
            showWizard('name-reservation');
        } else if (catalogType === 'CAR') {
            showWizard('car-prb');
        } else if (catalogType === 'HOUSE') {
            showWizard('house-reg');
        } else if (catalogType === 'PDPA') {
            showWizard('pdpa-badge');
        } else if (catalogType === 'NAME_CHANGE') {
            showWizard('company-name-change');
        } else if (catalogType === 'MEMO') {
            showWizard('memorandum-amendment');
        } else if (catalogType === 'FINANCIAL_PREP') {
            showWizard('financial-statement-prep');
        } else if (catalogType === 'DIRECTOR_CHANGE') {
            showWizard('company-director-change');
        } else if (catalogType === 'SHAREHOLDER_UPDATE') {
            showWizard('shareholder-update');
        } else if (catalogType === 'FINANCIAL_AUDIT') {
            showWizard('financial-audit');
        } else if (catalogType === 'FINANCIAL_APPROVAL') {
            showWizard('financial-approval');
        } else if (catalogType === 'SMART_ETAX') {
            showWizard('smart-etax');
        }
    }
}

// Admin sadminwa login trigger
function handleAdminLogin(e) {
    e.preventDefault();
    const user = document.getElementById('admin-username-input').value;
    const pass = document.getElementById('admin-password-input').value;
    
    fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user, password: pass })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("รหัสแอดมินหรือรหัสผ่านไม่ถูกต้อง");
        }
        return res.json();
    })
    .then(data => {
        localStorage.setItem('edocman_token', data.token);
        localStorage.setItem('edocman_user', JSON.stringify(data.user));
        localStorage.setItem('edocman_role', data.user.role);
        checkSession();
        showSection('admin');
    })
    .catch(err => {
        alert(err.message);
    });
}

// Fetch user orders list from backend
function fetchOrders() {
    fetch('/api/orders', {
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (res.status === 401) {
            simulateLogout();
            return [];
        }
        return res.json();
    })
    .then(orders => {
        const container = document.getElementById('orders-list-container');
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <i class="fa-solid fa-folder-open text-muted" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p class="text-muted">ไม่พบข้อมูลคำร้องธุรกรรมของคุณ เริ่มธุรกรรมไร้กระดาษแรกของคุณโดยคลิกปุ่มด้านล่าง</p>
                    <button class="btn btn-primary btn-sm" onclick="showWizard('name-reservation')">เริ่มจองชื่อบริษัทออนไลน์</button>
                </div>
            `;
            return;
        }

        let html = '<h3 style="margin-bottom: 15px;">คำร้องธุรกรรมทั้งหมด</h3>';
        orders.reverse().forEach(o => {
            let statusBadge = '';
            if (o.status === 'PENDING_PAYMENT') statusBadge = '<span class="badge badge-warning">รอชำระเงิน</span>';
            else if (o.status === 'PAID') statusBadge = '<span class="badge badge-primary">ชำระเงินแล้ว/กำลังส่งเรื่อง</span>';
            else if (o.status === 'PROCESSING') statusBadge = '<span class="badge badge-primary">กำลังตรวจสอบ</span>';
            else if (o.status === 'COMPLETED') statusBadge = '<span class="badge badge-success">เสร็จสมบูรณ์</span>';
            else if (o.status === 'FAILED') statusBadge = '<span class="badge badge-danger">ล้มเหลว</span>';

            let serviceName = translateServiceType(o.serviceType);

            let actionButton = '';
            if (o.status === 'PENDING_PAYMENT') {
                actionButton = `<button class="btn btn-primary btn-sm" onclick="openPaymentOverlay(${o.id}, '${serviceName}', ${o.price})"><i class="fa-solid fa-credit-card"></i> ชำระเงิน</button>`;
            } else if (o.status === 'COMPLETED' && o.officialDocumentUrl) {
                actionButton = `<a href="${o.officialDocumentUrl}" target="_blank" class="btn btn-success btn-sm"><i class="fa-solid fa-download"></i> ดาวน์โหลดผลอนุมัติ</a>`;
            } else if (o.status === 'PAID' || o.status === 'PROCESSING') {
                actionButton = `<a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-print"></i> พิมพ์เอกสารคำร้อง</a>`;
            }

            html += `
                <div class="order-row">
                    <div class="order-id">#${o.id}</div>
                    <div class="order-details">
                        <strong>${serviceName}</strong>
                        <span>สร้างเมื่อ: ${new Date(o.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div class="order-price">
                        <strong>${o.price.toLocaleString('th-TH')} บาท</strong>
                        ${o.flowAccountSyncStatus === 'SYNCED' ? '<span class="text-success" style="font-size:11px; display:block;"><i class="fa-solid fa-check-circle"></i> ออกใบเสร็จภาษีแล้ว</span>' : ''}
                    </div>
                    <div style="display:flex; justify-content:flex-end; gap: 8px;">
                        ${statusBadge}
                        ${actionButton}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    })
    .catch(err => console.error("Error fetching orders:", err));
}

// Wizard Templates Render Configurations
function initializeDefaultWizards() {
    // Watch file uploads
    document.getElementById('wizard-file-upload').addEventListener('change', (e) => {
        currentUploadFile = e.target.files[0];
        if (currentUploadFile) {
            document.getElementById('file-upload-status').innerHTML = `<span class="text-primary"><i class="fa-solid fa-spinner fa-spin"></i> อัปโหลด ${currentUploadFile.name} ไปยัง Supabase...</span>`;
        }
    });
}

function showWizard(serviceType) {
    activeServiceType = serviceType;
    document.getElementById('wizard-service-type').value = serviceType;
    currentUploadFile = null;
    document.getElementById('wizard-file-upload').value = "";
    document.getElementById('file-upload-status').innerHTML = "";

    const titleEl = document.getElementById('wizard-title');
    const fieldsContainer = document.getElementById('wizard-form-fields');
    let fieldsHtml = '';

    if (serviceType === 'name-reservation') {
        titleEl.innerHTML = '<i class="fa-solid fa-signature text-primary"></i> DBD จองชื่อนิติบุคคลออนไลน์';
        fieldsHtml = `
            <div class="form-group">
                <label>เลขบัตรประจำตัวประชาชนผู้ขอจอง / Personal ID Card Number</label>
                <input type="text" class="form-control" name="idCardNumber" required placeholder="1100xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>อีเมลติดต่อ / Email</label>
                    <input type="email" class="form-control" name="email" required placeholder="name@email.com" value="${currentUser ? currentUser.email : ''}">
                </div>
                <div class="form-group">
                    <label>เบอร์โทรศัพท์ติดต่อ / Phone Number</label>
                    <input type="text" class="form-control" name="phoneNumber" required placeholder="08xxxxxxxx">
                </div>
            </div>
            <div class="form-group">
                <label>ชื่อที่ต้องการเสนอจอง ลำดับที่ 1 (ตัวพิมพ์ใหญ่อักษรอังกฤษ หรือ ภาษาไทย)</label>
                <input type="text" class="form-control" name="nameChoice1" required placeholder="บริษัท ตัวอย่าง จำกัด">
            </div>
            <div class="form-group">
                <label>ชื่อที่ต้องการเสนอจอง ลำดับที่ 2</label>
                <input type="text" class="form-control" name="nameChoice2" required placeholder="บริษัท ตัวอย่างกรุ๊ป จำกัด">
            </div>
            <div class="form-group">
                <label>ชื่อที่ต้องการเสนอจอง ลำดับที่ 3</label>
                <input type="text" class="form-control" name="nameChoice3" placeholder="บริษัท สมาร์ทเทคโนโลยี จำกัด">
            </div>
            <div class="form-group">
                <label>ประเภทนิติบุคคล / Entity Type</label>
                <select class="form-control" name="entityType">
                    <option value="บริษัทจำกัด (Co., Ltd.)">บริษัทจำกัด (Co., Ltd.)</option>
                    <option value="ห้างหุ้นส่วนจำกัด (Partnership)">ห้างหุ้นส่วนจำกัด (Partnership)</option>
                </select>
            </div>
            <div class="form-group">
                <label>วัตถุประสงค์สั้นๆ เพื่อจดทะเบียนนิติบุคคล / Objectives</label>
                <textarea class="form-control" name="objective" required rows="3" placeholder="ประกอบธุรกิจให้บริการพัฒนาซอฟต์แวร์และเทคโนโลยีสารสนเทศ"></textarea>
            </div>
        `;
    } else if (serviceType === 'company-opening') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-circle-plus text-primary"></i> DBD คำขอจดทะเบียนจัดตั้งบริษัท (บอจ.1)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทจำกัดภาษาไทย (ที่ผ่านการจองและอนุมัติแล้ว)</label>
                <input type="text" class="form-control" name="companyNameThai" required placeholder="บริษัท อารีย์ซอฟต์ จำกัด">
            </div>
            <div class="form-group">
                <label>ชื่อภาษาอังกฤษ / English Company Name</label>
                <input type="text" class="form-control" name="companyNameEng" required placeholder="Ari Soft Co., Ltd.">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ทุนจดทะเบียน (บาท) / Registered Capital (THB)</label>
                    <input type="number" class="form-control" name="registeredCapital" required placeholder="1000000" min="10000" value="1000000">
                </div>
                <div class="form-group">
                    <label>มูลค่าต่อหุ้น (บาท) / Par Value (THB)</label>
                    <input type="number" class="form-control" name="parValue" required placeholder="100" value="100">
                </div>
            </div>
            <div class="form-group">
                <label>ที่ตั้งสำนักงานใหญ่ (Head Office Address)</label>
                <textarea class="form-control" name="address" required rows="3" placeholder="เลขที่ 123 อาคารพญาไท ถนนราชเทวี เขตราชเทวี กรุงเทพมหานคร 10400"></textarea>
            </div>
            <div class="form-group">
                <label>รายนามกรรมการผู้ถือหุ้นและการลงนาม (Directors and signing terms)</label>
                <textarea class="form-control" name="directorsList" required rows="2" placeholder="นายสมชาย รักชาติ ลงลายมือชื่อกรรมการร่วมกับตรายางบริษัท"></textarea>
            </div>
            <div class="form-group">
                <label>สัดส่วนสัญชาติถือหุ้นไทย (%) / Thai Shareholder Ratio</label>
                <input type="number" class="form-control" name="thaiShareRatio" required placeholder="100" value="100" max="100">
            </div>
        `;
    } else if (serviceType === 'company-closing') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-circle-minus text-primary"></i> DBD จดทะเบียนเลิกนิติบุคคล';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทที่ต้องการเลิกกิจการ / Corporate Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท โซลูชั่นส์ จำกัด">
            </div>
            <div class="form-group">
                <label>เลขจดทะเบียนนิติบุคคล 13 หลัก / Registration Number</label>
                <input type="text" class="form-control" name="registrationNumber" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่ประชุมมีมติพิเศษเลิกบริษัท / Shareholder Meeting Date</label>
                    <input type="date" class="form-control" name="meetingDate" required>
                </div>
                <div class="form-group">
                    <label>สาเหตุการเลิกกิจการ / Reason for Dissolution</label>
                    <input type="text" class="form-control" name="dissolveReason" required placeholder="เพื่อปรับเปลี่ยนโครงสร้างธุรกิจ หรือเลิกดำเนินกิจการ">
                </div>
            </div>
            <div class="form-group">
                <label>ชื่อและที่อยู่ของผู้ชำระบัญชี / Liquidator Details</label>
                <input type="text" class="form-control" name="liquidatorName" required placeholder="ชื่อกรรมการผู้ชำระบัญชี" value="${currentUser ? currentUser.fullName : ''}">
                <textarea class="form-control" name="liquidatorAddress" required rows="2" style="margin-top:10px;" placeholder="ที่อยู่ที่สามารถติดต่อได้ของผู้ชำระบัญชี"></textarea>
            </div>
        `;
    } else if (serviceType === 'efiling') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-invoice-dollar text-primary"></i> DBD นำส่งงบการเงิน e-Filing';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทผู้นำส่งงบการเงิน / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท ฟินเทค ไทย จำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration ID</label>
                <input type="text" class="form-control" name="registrationNumber" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>รอบบัญชีสิ้นสุดวันที่ / Financial Year End Date</label>
                    <input type="text" class="form-control" name="accountingYearEnd" required placeholder="31 ธันวาคม 2568">
                </div>
                <div class="form-group">
                    <label>ผู้ตรวจสอบบัญชีรับอนุญาต (CPA) / Auditor Name</label>
                    <input type="text" class="form-control" name="auditorName" required placeholder="นายวิชัย ตรวจสอบดี (CPA เลขทะเบียน xxxxx)">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>มูลค่าสินทรัพย์รวม (บาท) / Total Assets</label>
                    <input type="text" class="form-control" name="totalAssets" required placeholder="5,500,000.00">
                </div>
                <div class="form-group">
                    <label>รายได้รวมทั้งหมด (บาท) / Total Revenue</label>
                    <input type="text" class="form-control" name="totalRevenue" required placeholder="12,300,000.00">
                </div>
            </div>
        `;
    } else if (serviceType === 'car-prb') {
        titleEl.innerHTML = '<i class="fa-solid fa-shield-halved text-primary"></i> ซื้อประกันภัย พ.ร.บ. รถยนต์ออนไลน์';
        fieldsHtml = `
            <div class="form-group">
                <label>เลขบัตรประชาชนผู้เอาประกันภัย / ID Card Number</label>
                <input type="text" class="form-control" name="idCardNumber" required placeholder="หมายเลข 13 หลัก" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>หมายเลขทะเบียนรถ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="กข 1234">
                </div>
                <div class="form-group">
                    <label>จังหวัดป้ายทะเบียน / Province</label>
                    <input type="text" class="form-control" name="province" required placeholder="กรุงเทพมหานคร">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ยี่ห้อรถยนต์ / Vehicle Brand</label>
                    <input type="text" class="form-control" name="vehicleBrand" required placeholder="Toyota Yaris / Honda Civic">
                </div>
                <div class="form-group">
                    <label>เลขตัวถังรถ (Chassis Number)</label>
                    <input type="text" class="form-control" name="chassisNumber" required placeholder="ตัวย่ออังกฤษผสมตัวเลข 17 หลัก">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่เริ่มต้นความคุ้มครอง / Start Date</label>
                    <input type="date" class="form-control" name="startDate" required>
                </div>
                <div class="form-group">
                    <label>วันที่สิ้นสุดความคุ้มครอง / End Date</label>
                    <input type="date" class="form-control" name="endDate" required>
                </div>
            </div>
        `;
    } else if (serviceType === 'house-reg') {
        titleEl.innerHTML = '<i class="fa-solid fa-id-card-clip text-primary"></i> แก้ไขปรับปรุงข้อมูลทะเบียนบ้านดิจิทัล';
        fieldsHtml = `
            <div class="form-group">
                <label>รหัสประจำบ้าน 11 หลัก / House Code ID</label>
                <input type="text" class="form-control" name="houseCode" required placeholder="xxxx-xxxxxx-x" maxlength="11">
            </div>
            <div class="form-group">
                <label>ที่อยู่บ้านตามระบบทะเบียนบ้าน / Address</label>
                <textarea class="form-control" name="address" required rows="2" placeholder="บ้านเลขที่ 99/9 หมู่บ้านพัฒนา แขวงลาดพร้าว เขตลาดพร้าว กรุงเทพฯ"></textarea>
            </div>
            <div class="form-group">
                <label>ประเภทการขอแก้ไข/ยื่นคำร้อง / Request Type</label>
                <select class="form-control" name="requestType">
                    <option value="แจ้งย้ายเข้าคนอยู่อาศัยใหม่ (Moving In)">แจ้งย้ายเข้าคนอยู่อาศัยใหม่ (Moving In)</option>
                    <option value="แจ้งย้ายออกจากทะเบียนบ้าน (Moving Out)">แจ้งย้ายออกจากทะเบียนบ้าน (Moving Out)</option>
                    <option value="แจ้งทะเบียนเกิดประชากรใหม่ (Register Birth)">แจ้งทะเบียนเกิดประชากรใหม่ (Register Birth)</option>
                    <option value="แก้ไขปรับปรุงรายการตัวสะกด/สถานะ (Amend Details)">แก้ไขปรับปรุงรายการตัวสะกด/สถานะ (Amend Details)</option>
                </select>
            </div>
            <div class="form-group">
                <label>รายชื่อบุคคลที่ขอจัดการข้อมูลสะกด / Resident Information</label>
                <textarea class="form-control" name="residentsList" required rows="2" placeholder="นายประหยัด ชาติดี (ID Card: 310xxxxxxxxxx) ย้ายเข้ามาพักอาศัย"></textarea>
            </div>
        `;
    } else if (serviceType === 'pdpa-badge') {
        titleEl.innerHTML = '<i class="fa-solid fa-cookie-bite text-primary"></i> บริการติดตั้งตราสัญลักษณ์คุ้มครองข้อมูล (PDPA Compliant Badge)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อนิติบุคคล หรือ ชื่อหน่วยงานผู้ยื่นขอ / Business Name</label>
                <input type="text" class="form-control" name="businessName" required placeholder="บริษัท ตัวอย่าง จำกัด" value="${currentUser ? currentUser.fullName : ''}">
            </div>
            <div class="form-group">
                <label>โดเมนเว็บไซต์ที่ต้องการติดตั้งตราสัญลักษณ์ / Website URL</label>
                <input type="url" class="form-control" name="websiteUrl" required placeholder="https://mywebsite.com">
            </div>
            <div class="form-group">
                <label>ลิงก์นโยบายความเป็นส่วนตัวของเว็บไซต์ / Privacy Policy URL</label>
                <input type="url" class="form-control" name="privacyPolicyUrl" required placeholder="https://mywebsite.com/privacy">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ตำแหน่งการแสดงผล / Badge Position</label>
                    <select class="form-control" name="badgePosition">
                        <option value="right">มุมขวาล่าง (Bottom Right)</option>
                        <option value="left">มุมซ้ายล่าง (Bottom Left)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>สีตราสัญลักษณ์ / Badge Theme Color</label>
                    <select class="form-control" name="badgeColor">
                        <option value="#10b981">สีเขียวหยก (Jade Green)</option>
                        <option value="#3b82f6">สีฟ้าโคบอลต์ (Cobalt Blue)</option>
                        <option value="#d97706">สีส้มแอมเบอร์ (Amber Orange)</option>
                        <option value="#0f172a">สีดำสเลท (Slate Black)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>รูปแบบตราสัญลักษณ์ที่เลือก / Badge Style</label>
                <select class="form-control" name="badgeStyle">
                    <option value="Floating Badge (ตราสัญลักษณ์ลอยตัว)">Floating Badge (ตราสัญลักษณ์ลอยตัว)</option>
                    <option value="Footer Banner (แบนเนอร์ท้ายเว็บไซต์)">Footer Banner (แบนเนอร์ท้ายเว็บไซต์)</option>
                </select>
            </div>
            </div>
        `;
    } else if (serviceType === 'company-name-change') {
        titleEl.innerHTML = '<i class="fa-solid fa-signature text-primary"></i> บริการจดทะเบียนเปลี่ยนชื่อบริษัทจำกัด';
        fieldsHtml = `
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-group">
                <label>ชื่อบริษัทเดิม (ภาษาไทย) / Old Company Name (Thai)</label>
                <input type="text" class="form-control" name="oldCompanyNameThai" required placeholder="บริษัท เดิมจำกัด">
            </div>
            <div class="form-group">
                <label>ชื่อบริษัทใหม่ภาษาไทย (ที่ได้รับการอนุมัติจองชื่อแล้ว)</label>
                <input type="text" class="form-control" name="newCompanyNameThai" required placeholder="บริษัท ใหม่จำกัด">
            </div>
            <div class="form-group">
                <label>ชื่อบริษัทใหม่ภาษาอังกฤษ / New Company Name (English)</label>
                <input type="text" class="form-control" name="newCompanyNameEng" required placeholder="New Name Co., Ltd.">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่จัดประชุมผู้ถือหุ้นที่มีมติเปลี่ยนชื่อ / Shareholder Meeting Date</label>
                    <input type="date" class="form-control" name="resolutionDate" required>
                </div>
                <div class="form-group">
                    <label>ชื่อกรรมการผู้มีอำนาจลงนามแทนบริษัท / Director Name</label>
                    <input type="text" class="form-control" name="directorName" required placeholder="นายสมศักดิ์ รักดี">
                </div>
            </div>
        `;
    } else if (serviceType === 'memorandum-amendment') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-signature text-primary"></i> บริการจดทะเบียนแก้ไขหนังสือบริคณห์สนธิ (ม.อ.ส.)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทที่ต้องการแก้ไขข้อมูล / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท พัฒนาจำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-group">
                <label>หัวข้อหนังสือบริคณห์สนธิที่ต้องการแก้ไข / Clause to Amend</label>
                <select class="form-control" name="amendedArticles">
                    <option value="แก้ไขเพิ่มเติมวัตถุประสงค์ของบริษัท (วัตถุที่ประสงค์)">แก้ไขเพิ่มเติมวัตถุประสงค์ของบริษัท (วัตถุที่ประสงค์)</option>
                    <option value="แก้ไขเพิ่มเติมทุนจดทะเบียนและแบ่งแยกหุ้น (ทุนเรือนหุ้น)">แก้ไขเพิ่มเติมทุนจดทะเบียนและแบ่งแยกหุ้น (ทุนเรือนหุ้น)</option>
                    <option value="แก้ไขข้อจำกัดอำนาจกรรมการ (อำนาจกรรมการ)">แก้ไขข้อจำกัดอำนาจกรรมการ (อำนาจกรรมการ)</option>
                </select>
            </div>
            <div class="form-group">
                <label>รายละเอียดข้อความที่ขอแก้ไขเพิ่มเติม / Details of Amendment</label>
                <textarea class="form-control" name="amendmentTextDetails" required rows="4" placeholder="ข้อ 3. เพิ่มเติมวัตถุประสงค์ข้อ (41) ประกอบธุรกิจนำเข้าและส่งออกสินค้าอิเล็กทรอนิกส์..."></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่ประชุมที่มีมติพิเศษเพื่อแก้ไข / Meeting Date</label>
                    <input type="date" class="form-control" name="resolutionDate" required>
                </div>
            </div>
        `;
    } else if (serviceType === 'financial-statement-prep') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-invoice-dollar text-primary"></i> บริการจัดทำงบการเงินและบัญชีครบรอบปี';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทผู้ยื่นคำร้องจัดทำงบ / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท แอดวานซ์ดิจิทัล จำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>รอบระยะเวลาบัญชีปีงบประมาณ (พ.ศ.) / Accounting Period</label>
                    <input type="text" class="form-control" name="accountingPeriod" required placeholder="31 ธันวาคม 2568" value="2568">
                </div>
                <div class="form-group">
                    <label>จำนวนพนักงานเฉลี่ยในงวดปี / Employee Count</label>
                    <input type="number" class="form-control" name="employeeCount" required placeholder="10" min="0">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ประมาณการรายได้รวมปีนี้ (บาท) / Estimate Revenue</label>
                    <input type="text" class="form-control" name="totalRevenue" required placeholder="5,000,000.00">
                </div>
                <div class="form-group">
                    <label>ประมาณการสินทรัพย์รวมปีนี้ (บาท) / Estimate Assets</label>
                    <input type="text" class="form-control" name="totalAssets" required placeholder="2,500,000.00">
                </div>
            </div>
            <div class="form-group">
                <label>แนบรายละเอียดรายได้/รายจ่ายเบื้องต้น (เช่น Excel หรือใบสำคัญ)</label>
                <p style="font-size: 11px; color: #d97706;">* กรุณาแนบไฟล์สลิปหรือหลักฐานบัญชีเบื้องต้นในขั้นตอนอัปโหลดเอกสารด้านล่าง (ถ้ามี)</p>
            </div>
        `;
    } else if (serviceType === 'company-director-change') {
        titleEl.innerHTML = '<i class="fa-solid fa-user-gear text-primary"></i> บริการเปลี่ยนกรรมการบริษัท (เปลี่ยนตัวเจ้าของหลัก)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัท / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท ตัวอย่าง จำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อกรรมการที่ออก / Outgoing Director Name</label>
                    <input type="text" class="form-control" name="outgoingDirector" required placeholder="นายสมชาย เดิมดี">
                </div>
                <div class="form-group">
                    <label>ชื่อกรรมการเข้าใหม่ (เจ้าของใหม่) / New Director Name</label>
                    <input type="text" class="form-control" name="incomingDirector" required placeholder="นายประเสริฐ คนใหม่">
                </div>
            </div>
            <div class="form-group">
                <label>ข้อกำหนดการลงชื่อผูกพันบริษัท (อำนาจกรรมการ) / Authorized Signatory Power</label>
                <textarea class="form-control" name="signatoryPower" required rows="3" placeholder="กรรมการผู้มีอำนาจลงนามประกอบด้วย: กรรมการเข้าใหม่ลงชื่อร่วมกับประทับตราสำคัญบริษัท"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่ประชุมผู้ถือหุ้นที่มีมติแต่งตั้ง / Meeting Date</label>
                    <input type="date" class="form-control" name="resolutionDate" required>
                </div>
            </div>
        `;
    } else if (serviceType === 'shareholder-update') {
        titleEl.innerHTML = '<i class="fa-solid fa-users-viewfinder text-primary"></i> บริการปรับปรุงและเพิ่มรายชื่อผู้ถือหุ้น (แบบ บอจ.5)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัท / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท แฟรงค์สัญชาติ จำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ทุนจดทะเบียนรวม (บาท) / Total Capital</label>
                    <input type="number" class="form-control" name="totalCapital" required placeholder="1000000">
                </div>
                <div class="form-group">
                    <label>จำนวนหุ้นสะสมทั้งหมด (หุ้น) / Total Shares</label>
                    <input type="number" class="form-control" name="totalShares" required placeholder="10000">
                </div>
            </div>
            <div class="form-group" style="background: rgba(16, 185, 129, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 15px;">
                <h4 style="margin-top: 0; color: #047857;"><i class="fa-solid fa-user-plus"></i> รายชื่อผู้ถือหุ้นที่ต้องการเพิ่ม / Shareholder 1</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล / Shareholder Full Name</label>
                        <input type="text" class="form-control" name="shareholderName1" required placeholder="นายกิตติ มั่งมี">
                    </div>
                    <div class="form-group">
                        <label>เลขบัตรประชาชน / Personal ID</label>
                        <input type="text" class="form-control" name="shareholderId1" required placeholder="หมายเลข 13 หลัก" maxlength="13">
                    </div>
                </div>
                <div class="form-group">
                    <label>จำนวนหุ้นที่ต้องการถือครอง (หุ้น)</label>
                    <input type="number" class="form-control" name="shareholderShares1" required placeholder="4000">
                </div>
            </div>
            <div class="form-group" style="background: rgba(59, 130, 246, 0.05); padding: 15px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2); margin-top: 15px;">
                <h4 style="margin-top: 0; color: #1d4ed8;"><i class="fa-solid fa-user-plus"></i> รายชื่อผู้ถือหุ้นที่ต้องการเพิ่ม / Shareholder 2</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>ชื่อ-นามสกุล / Shareholder Full Name</label>
                        <input type="text" class="form-control" name="shareholderName2" placeholder="นางสาว ร่ำรวย สุขใจ">
                    </div>
                    <div class="form-group">
                        <label>เลขบัตรประชาชน / Personal ID</label>
                        <input type="text" class="form-control" name="shareholderId2" placeholder="หมายเลข 13 หลัก" maxlength="13">
                    </div>
                </div>
                <div class="form-group">
                    <label>จำนวนหุ้นที่ต้องการถือครอง (หุ้น)</label>
                    <input type="number" class="form-control" name="shareholderShares2" placeholder="6000">
                </div>
            </div>
        `;
    } else if (serviceType === 'financial-audit') {
        titleEl.innerHTML = '<i class="fa-solid fa-user-check text-primary"></i> บริการตรวจสอบงบการเงินโดยผู้สอบบัญชีรับอนุญาต (CPA)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทผู้ขอการตรวจสอบงบ / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท เทคฟรอนเทียร์ จำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>รอบระยะเวลาบัญชีที่ตรวจสอบ (พ.ศ.) / Accounting Period</label>
                    <input type="text" class="form-control" name="accountingPeriod" required placeholder="31 ธันวาคม 2568" value="2568">
                </div>
                <div class="form-group">
                    <label>ผู้ทำบัญชีผู้รวบรวมตัวเลข / Bookkeeper Name</label>
                    <input type="text" class="form-control" name="bookkeeperName" required placeholder="นางสาว สมใจ รักบัญชี">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>จำนวนสินทรัพย์รวมตามงบการเงิน (บาท) / Total Assets</label>
                    <input type="text" class="form-control" name="totalAssets" required placeholder="10,000,000.00">
                </div>
                <div class="form-group">
                    <label>หนี้สินรวมตามงบการเงิน (บาท) / Total Liabilities</label>
                    <input type="text" class="form-control" name="totalLiabilities" required placeholder="3,000,000.00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>รายได้รวมปีนี้ตามงบ (บาท) / Total Revenue</label>
                    <input type="text" class="form-control" name="totalRevenue" required placeholder="8,000,000.00">
                </div>
                <div class="form-group">
                    <label>กำไร(ขาดทุน)สุทธิปีนี้ (บาท) / Net Profit (Loss)</label>
                    <input type="text" class="form-control" name="netProfit" required placeholder="2,000,000.00">
                </div>
            </div>
            <div class="form-group">
                <label>แนบงบดุล/งบกำไรขาดทุนฉบับร่างที่สมบูรณ์ (PDF)</label>
                <p style="font-size: 11px; color: #d97706;">* กรุณาแนบรายงานสรุปบัญชีในขั้นตอนอัปโหลดเอกสารประกอบคำขอรับบริการด้านล่าง</p>
            </div>
        `;
    } else if (serviceType === 'financial-approval') {
        titleEl.innerHTML = '<i class="fa-solid fa-comments text-primary"></i> บริการจัดทำรายงานประชุมอนุมัติงบการเงินและยื่นส่งมติ';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อบริษัทที่จัดประชุมผู้ถือหุ้น / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท เทคฟรอนเทียร์ จำกัด">
            </div>
            <div class="form-group">
                <label>เลขทะเบียนนิติบุคคล 13 หลัก / Registration Company ID</label>
                <input type="text" class="form-control" name="companyId" required placeholder="01055xxxxxxxx" maxlength="13">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่จัดประชุมสามัญประจำปี (AGM) / Meeting Date</label>
                    <input type="date" class="form-control" name="meetingDate" required>
                </div>
                <div class="form-group">
                    <label>เวลาเริ่มประชุม / Meeting Time</label>
                    <input type="text" class="form-control" name="meetingTime" required placeholder="09:00 น." value="09:00 น.">
                </div>
            </div>
            <div class="form-group">
                <label>สถานที่ประชุมอนุมัติงบ / Meeting Venue</label>
                <input type="text" class="form-control" name="meetingVenue" required placeholder="ห้องประชุมใหญ่ ณ สำนักงานเลขที่ ...">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อผู้เป็นประธานในที่ประชุม / Chairperson Name</label>
                    <input type="text" class="form-control" name="chairpersonName" required placeholder="นายสมศักดิ์ รักดี">
                </div>
                <div class="form-group">
                    <label>จำนวนผู้ถือหุ้น/ผู้รับมอบอำนาจที่มาร่วมประชุม</label>
                    <input type="number" class="form-control" name="shareholderCount" required placeholder="3" min="1">
                </div>
            </div>
        `;
    } else if (serviceType === 'smart-etax') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-invoice text-primary"></i> บริการสมัครและติดตั้งระบบ Smart e-Tax Invoice & e-Receipt';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อนิติบุคคลผู้ขอติดตั้งระบบ / Company Name</label>
                <input type="text" class="form-control" name="companyName" required placeholder="บริษัท เทคฟรอนเทียร์ จำกัด">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขประจำตัวผู้เสียภาษีอากร 13 หลัก / Corporate Tax ID</label>
                    <input type="text" class="form-control" name="taxId" required placeholder="01055xxxxxxxx" maxlength="13">
                </div>
                <div class="form-group">
                    <label>อีเมลสำหรับติดต่อประสานงานระบบ / Contact Email</label>
                    <input type="email" class="form-control" name="contactEmail" required placeholder="accounting@mycompany.com">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ระบบ ERP หรือระบบออกบิลที่ใช้อยู่ปัจจุบัน / Current ERP System</label>
                    <select class="form-control" name="erpSystem">
                        <option value="FlowAccount">FlowAccount</option>
                        <option value="Express">Express</option>
                        <option value="Peak Account">Peak Account</option>
                        <option value="ระบบทำมือ/Excel">ระบบทำมือ / Excel / Word</option>
                        <option value="ระบบ Custom-built/เขียนเอง">ระบบ Custom-built / ERP เขียนเอง</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>จำนวนเอกสารออกบิลประมาณการต่อเดือน / Est. Monthly Invoices</label>
                    <select class="form-control" name="invoiceVolume">
                        <option value="น้อยกว่า 500 ใบ/เดือน">น้อยกว่า 500 ใบ/เดือน</option>
                        <option value="500 - 2,000 ใบ/เดือน">500 - 2,000 ใบ/เดือน</option>
                        <option value="2,000 - 10,000 ใบ/เดือน">2,000 - 10,000 ใบ/เดือน</option>
                        <option value="มากกว่า 10,000 ใบ/เดือน">มากกว่า 10,000 ใบ/เดือน</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>ชื่อ-นามสกุล กรรมการผู้มีอำนาจลงนามสมัคร / Authorized Signatory</label>
                <input type="text" class="form-control" name="authorizedSignatory" required placeholder="นายสมบัติ เจริญทรัพย์">
            </div>
            <div class="form-group" style="background: rgba(14, 165, 233, 0.05); padding: 12px; border-radius: 6px; border: 1px dashed rgba(14, 165, 233, 0.2); font-size: 12px; margin-top: 15px;">
                <span style="color: #0284c7; font-weight: bold;"><i class="fa-solid fa-circle-info"></i> ข้อมูลเพิ่มเติมเกี่ยวกับการขอสิทธิ:</span>
                <p style="margin: 5px 0 0 0; font-size: 11px; line-height: 1.5; color: #475569;">
                    ทีมงาน eDocman จะจัดทำเอกสารคำขอ บ.อ.01 พร้อมพัฒนาระบบเชื่อมโยงข้อมูลและเตรียมใบรับรองอิเล็กทรอนิกส์ (e-Tax Certificate) ร่วมกับสรรพากรให้แล้วเสร็จภายใน 7 วันทำการ
                </p>
            </div>
        `;
    }

    fieldsContainer.innerHTML = fieldsHtml;
    document.getElementById('wizard-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('landing-section').classList.add('hidden');
}

// Wizard Submit flow: Upload to Supabase -> Create Order in Java DB -> Open Payment Intent
function handleWizardSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('service-wizard-form');
    const formData = new FormData(form);
    const formFields = {};
    
    formData.forEach((value, key) => {
        if (key !== 'file' && key !== 'wizard-service-type') {
            formFields[key] = value;
        }
    });

    const serviceTypeMapped = mapWizardToServiceEnum(activeServiceType);
    
    const orderPayload = {
        serviceType: serviceTypeMapped,
        serviceData: JSON.stringify(formFields)
    };

    // Show spinner on submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังประมวลผลคำขอไร้กระดาษ...`;

    // Step 1: Create the Legal Order in Draft Mode
    fetch('/api/orders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify(orderPayload)
    })
    .then(res => res.json())
    .then(order => {
        // Step 2: Upload attachment to Supabase if exists
        if (currentUploadFile) {
            const uploadData = new FormData();
            uploadData.append("file", currentUploadFile);

            return fetch(`/api/orders/${order.id}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + currentToken
                },
                body: uploadData
            })
            .then(res => res.json())
            .then(uploadResult => {
                order.documentUrl = uploadResult.url;
                return order;
            });
        }
        return order;
    })
    .then(order => {
        // Reset submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        
        // Show success notification & Open payment intent overlay
        let serviceName = translateServiceType(order.serviceType);
        openPaymentOverlay(order.id, serviceName, order.price);
    })
    .catch(err => {
        console.error("Order creation failed:", err);
        alert("การบันทึกคำร้องเอกสารล้มเหลว: " + err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
}

// Stripe Payment Gateway Controls
function openPaymentOverlay(orderId, serviceName, price) {
    document.getElementById('payment-target-order-id').value = orderId;
    document.getElementById('pay-service-name').innerText = serviceName;
    document.getElementById('pay-service-price').innerText = price.toLocaleString('th-TH');
    
    // Switch to Credit Card default payment tab
    switchPayMethod('card');

    document.getElementById('payment-overlay').classList.remove('hidden');
}

function closePaymentOverlay() {
    document.getElementById('payment-overlay').classList.add('hidden');
    // Redirect back to dashboard to see order in status "Pending Payment"
    showSection('dashboard');
}

function switchPayMethod(method) {
    // Reset tabs
    document.querySelectorAll('.pay-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.pay-method-container').forEach(c => c.classList.add('hidden'));

    if (method === 'card') {
        document.querySelector('[onclick="switchPayMethod(\'card\')"]').classList.add('active');
        document.getElementById('pay-method-card').classList.remove('hidden');
    } else if (method === 'promptpay') {
        document.querySelector('[onclick="switchPayMethod(\'promptpay\')"]').classList.add('active');
        document.getElementById('pay-method-promptpay').classList.remove('hidden');
        renderMockPromptPayQr();
    } else if (method === 'truemoney') {
        document.querySelector('[onclick="switchPayMethod(\'truemoney\')"]').classList.add('active');
        document.getElementById('pay-method-truemoney').classList.remove('hidden');
    }
}

function renderMockPromptPayQr() {
    const qrContainer = document.getElementById('promptpay-qr-placeholder');
    const priceStr = document.getElementById('pay-service-price').innerText;
    
    // Simple inline SVG representing a QR Code layout for PromptPay
    qrContainer.innerHTML = `
        <svg width="180" height="180" viewBox="0 0 100 100" style="background:#fff; padding:5px;">
            <!-- Outer boundaries -->
            <rect x="0" y="0" width="100" height="100" fill="none" stroke="#000" stroke-width="0.5"/>
            <!-- Qr Anchors -->
            <rect x="5" y="5" width="25" height="25" fill="none" stroke="#004d80" stroke-width="4"/>
            <rect x="10" y="10" width="15" height="15" fill="#000"/>
            
            <rect x="70" y="5" width="25" height="25" fill="none" stroke="#004d80" stroke-width="4"/>
            <rect x="75" y="10" width="15" height="15" fill="#000"/>
            
            <rect x="5" y="70" width="25" height="25" fill="none" stroke="#004d80" stroke-width="4"/>
            <rect x="10" y="75" width="15" height="15" fill="#000"/>
            
            <!-- Mock QR dots -->
            <rect x="40" y="10" width="5" height="10" fill="#004d80"/>
            <rect x="50" y="5" width="10" height="5" fill="#000"/>
            <rect x="40" y="25" width="15" height="5" fill="#000"/>
            
            <rect x="75" y="40" width="10" height="10" fill="#004d80"/>
            <rect x="70" y="55" width="5" height="10" fill="#000"/>
            <rect x="85" y="60" width="10" height="5" fill="#000"/>
            
            <rect x="40" y="40" width="20" height="20" fill="#004d80"/>
            <rect x="45" y="45" width="10" height="10" fill="#fff"/>
            <rect x="48" y="48" width="4" height="4" fill="#d97706"/> <!-- golden center indicator -->
            
            <rect x="10" y="40" width="10" height="5" fill="#000"/>
            <rect x="25" y="45" width="5" height="15" fill="#000"/>
            
            <rect x="40" y="75" width="5" height="20" fill="#000"/>
            <rect x="55" y="70" width="15" height="5" fill="#004d80"/>
            <rect x="50" y="85" width="10" height="10" fill="#000"/>
            <rect x="75" y="75" width="20" height="20" fill="#004d80"/>
            <rect x="80" y="80" width="10" height="10" fill="#fff"/>
        </svg>
        <div style="font-weight: bold; margin-top:10px; font-size:16px; color:#004d80;">THB ${priceStr}</div>
    `;
}

function executePayment() {
    const orderId = document.getElementById('payment-target-order-id').value;
    const btn = document.querySelector('[onclick="executePayment()"]');
    const originalText = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> กำลังชำระค่าบริการอย่างปลอดภัย...`;

    // Create Stripe PaymentIntent and immediately simulate payment success
    // In live mode, Stripe would confirm clientSecret, then webhooks trigger it.
    // For this full SAAS demo, we call the backend direct simulation API:
    fetch(`/api/payments/${orderId}/simulate-success`, {
        method: 'POST'
    })
    .then(res => {
        if (!res.ok) throw new Error("Payment processing failed");
        return res.text();
    })
    .then(result => {
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        // Hide payment overlay
        document.getElementById('payment-overlay').classList.add('hidden');
        alert("ขอบคุณ! ชำระค่าบริการผ่าน Stripe สำเร็จ ระบบได้ส่งคำร้องเข้ารัฐ ส่งใบเสร็จหาคุณผ่าน Resend Email และเชื่อมข้อมูลระบบบัญชีเรียบร้อยแล้ว");
        
        showSection('dashboard');
    })
    .catch(err => {
        alert("เกิดข้อผิดพลาดในการรับชำระเงิน: " + err.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    });
}

// Mock Government / Admin Portal Panel controller
function fetchAdminOrders() {
    fetch('/api/admin/orders')
    .then(res => res.json())
    .then(orders => {
        const tbody = document.getElementById('admin-orders-tbody');
        if (!orders || orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">ไม่มีประวัติคำขอทำธุรกรรมในระบบ</td></tr>`;
            return;
        }

        let html = '';
        orders.forEach(o => {
            let statusText = '';
            if (o.status === 'PENDING_PAYMENT') statusText = '<span class="badge badge-warning">รอจ่ายเงิน</span>';
            else if (o.status === 'PAID') statusText = '<span class="badge badge-primary">จ่ายแล้ว/รอส่งเรื่อง</span>';
            else if (o.status === 'PROCESSING') statusText = '<span class="badge badge-primary">กำลังตรวจสอบ</span>';
            else if (o.status === 'COMPLETED') statusText = '<span class="badge badge-success">ส่งผลอนุมัติสำเร็จ</span>';
            else if (o.status === 'FAILED') statusText = '<span class="badge badge-danger">ล้มเหลว</span>';

            let stripeBadge = o.stripePaymentStatus === 'succeeded' ? 
                '<span class="text-success"><i class="fa-solid fa-credit-card"></i> ได้รับเงิน (Stripe)</span>' : 
                '<span class="text-muted"><i class="fa-solid fa-clock"></i> ค้างจ่าย</span>';

            let syncBadge = '';
            if (o.flowAccountSyncStatus === 'SYNCED') {
                syncBadge = `<button class="btn btn-outline btn-sm" onclick="viewFlowAccountLogs(${o.id})" style="padding: 2px 6px; font-size:11px; color:#10b981; border-color:#10b981;"><i class="fa-solid fa-file-invoice-dollar"></i> Synced (Audit)</button>`;
            } else if (o.flowAccountSyncStatus === 'FAILED') {
                syncBadge = `<button class="btn btn-outline btn-sm" onclick="viewFlowAccountLogs(${o.id})" style="padding: 2px 6px; font-size:11px; color:#ef4444; border-color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Failed (Audit)</button>`;
            } else {
                syncBadge = '<span class="text-muted" style="font-size:11px;"><i class="fa-solid fa-minus"></i> ยังไม่ได้เชื่อม</span>';
            }

            let actions = '';
            if (o.status === 'PAID') {
                actions = `
                    <button class="btn btn-outline btn-sm" onclick="updateAdminOrderStatus(${o.id}, 'PROCESSING')" style="color:#0ea5e9; border-color:#0ea5e9;">ตรวจสอบคำขอ</button>
                `;
            } else if (o.status === 'PROCESSING') {
                actions = `
                    <button class="btn btn-success btn-sm" onclick="approveAdminOrder(${o.id})"><i class="fa-solid fa-circle-check"></i> อนุมัติคำขอ</button>
                    <button class="btn btn-danger btn-sm" onclick="updateAdminOrderStatus(${o.id}, 'FAILED')">ปฏิเสธ</button>
                `;
            } else if (o.status === 'COMPLETED') {
                actions = `<a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-eye"></i> ดูใบคำขออนุมัติ</a>`;
            }

            html += `
                <tr>
                    <td class="font-mono">#${o.id}</td>
                    <td>${o.clerkUserId}</td>
                    <td><strong>${translateServiceType(o.serviceType)}</strong></td>
                    <td>${stripeBadge}</td>
                    <td>${syncBadge}</td>
                    <td>${statusText}</td>
                    <td><div style="display:flex; gap:5px;">${actions}</div></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    })
    .catch(err => console.error("Error fetching admin orders:", err));
}

function updateAdminOrderStatus(orderId, status) {
    fetch(`/api/admin/orders/${orderId}/status?status=${status}`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(() => {
        fetchAdminOrders();
    })
    .catch(err => console.error(err));
}

function approveAdminOrder(orderId) {
    // Approve order will change status to COMPLETED and generate the government approval cert PDF mock
    fetch(`/api/admin/orders/${orderId}/approve`, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(() => {
        fetchAdminOrders();
    })
    .catch(err => console.error(err));
}

function viewFlowAccountLogs(orderId) {
    fetch(`/api/admin/logs/${orderId}`)
    .then(res => res.json())
    .then(logs => {
        const logsPanel = document.getElementById('flowaccount-log-details');
        const reqPre = document.getElementById('fa-log-request');
        const resPre = document.getElementById('fa-log-response');

        if (!logs || logs.length === 0) {
            alert("ไม่พบบันทึกการเชื่อมโยง API ของออเดอร์นี้");
            logsPanel.classList.add('hidden');
            return;
        }

        const log = logs[logs.length - 1]; // get latest log
        
        reqPre.innerText = formatJsonString(log.requestPayload);
        resPre.innerText = formatJsonString(log.responsePayload);
        
        logsPanel.classList.remove('hidden');
        
        // Scroll to audit card
        document.getElementById('flowaccount-audit-card').scrollIntoView({ behavior: 'smooth' });
    })
    .catch(err => console.error("Failed to load logs:", err));
}

// PDPA Compliance Badge Controller
function togglePdpaModal() {
    document.getElementById('pdpa-modal').classList.toggle('hidden');
}

function acceptPdpa() {
    if (currentUser) {
        currentUser.pdpaConsented = true;
        // Call backend update registration
        fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentUser)
        })
        .then(res => res.json())
        .then(user => {
            currentUser = user;
            localStorage.setItem('edocman_user', JSON.stringify(user));
            alert("ระบบได้บันทึกการยอมรับข้อตกลงคุ้มครองข้อมูลส่วนบุคคล (PDPA) สำเร็จแล้ว");
            togglePdpaModal();
        });
    } else {
        alert("คุณได้ยอมรับข้อตกลงการใช้งานข้อมูลส่วนบุคคล (PDPA) เรียบร้อยแล้ว");
        togglePdpaModal();
    }
}

// Termly Policy Simulation trigger
function showTermlyPolicy(policyType) {
    let title = "";
    let content = "";
    if (policyType === 'privacy') {
        title = "Privacy Policy (นโยบายความเป็นส่วนบุคคล)";
        content = "ระบบ eDocman ได้รับการประมวลผลข้อมูลส่วนตัวเพื่อให้เป็นไปตามกฎหมาย PDPA ของประเทศไทย สัญญานี้มีจุดประสงค์เพื่อคุ้มครองข้อมูลส่วนบุคคลของลูกค้าทั้งหมดที่ยื่นจดทะเบียนกับ DBD และกรมการขนส่งทางบก";
    } else if (policyType === 'terms') {
        title = "Terms of Service (ข้อตกลงและเงื่อนไขการใช้บริการ)";
        content = "การชำระเงินในฐานระบบ eDocman เป็นแบบจ่ายตามการยื่นธุรกรรมจริง (Pay-per-Service) โดยมีเกณฑ์การชำระผ่าน Stripe การยื่นเอกสารใดๆ ผู้ใช้งานเป็นผู้รับผิดชอบต่อความถูกต้องของข้อมูลทั้งหมด";
    } else if (policyType === 'cookie') {
        title = "Cookie Policy (นโยบายคุกกี้)";
        content = "เราใช้คุกกี้เพื่อจัดระเบียบเซสชั่นผู้ใช้ และเก็บค่าการเข้าระบบ Clerk ชั่วคราวเพื่อให้ประสบการณ์ในการยื่นเอกสารราชการสะดวกยิ่งขึ้น";
    }
    
    alert(`[Termly Legal Widget Mockup]\n\n${title}\n\n${content}`);
}

// Crisp Chat Simulation Controller
function toggleCrispChat() {
    const body = document.getElementById('crisp-body');
    const chevron = document.getElementById('crisp-chevron');
    body.classList.toggle('hidden');
    if (body.classList.contains('hidden')) {
        chevron.className = "fa-solid fa-chevron-up toggle-crisp-icon";
    } else {
        chevron.className = "fa-solid fa-chevron-down toggle-crisp-icon";
    }
}

function sendCrispMessage(event) {
    if (event.key === 'Enter') {
        sendCrispMessageBtn();
    }
}

function sendCrispMessageBtn() {
    const input = document.querySelector('.crisp-input-area input');
    const message = input.value.trim();
    if (!message) return;

    appendCrispMessage(message, 'user');
    input.value = '';

    // Simulated auto chatbot response
    setTimeout(() => {
        let reply = "ขณะนี้ผู้ดูแลระบบ eDocman ได้รับข้อความของคุณแล้ว เราจะเร่งประสานงานเรื่องเอกสาร DBD/พ.ร.บ. ของคุณอย่างด่วนที่สุด ขอบคุณครับ";
        if (message.includes('พ.ร.บ') || message.includes('รถ')) {
            reply = "กรมธรรม์ พ.ร.บ. จะได้รับการอนุมัติทันทีหลังชำระเงินเสร็จสิ้น คุณสามารถพิมพ์ออกมาเก็บไว้ในรถยนต์เพื่อนำไปยื่นต่อภาษีได้ทันทีครับ";
        } else if (message.includes('จดทะเบียน') || message.includes('เปิดบริษัท')) {
            reply = "สำหรับการจดตั้งบริษัทจำกัด ใช้เวลาตรวจสอบใบจองชื่อ 1 วันทำการ และยื่นจดจัดตั้ง บอจ.1 อีกประมาณ 2-3 วันทำการครับ";
        }
        appendCrispMessage(reply, 'agent');
    }, 1000);
}

function appendCrispMessage(text, sender) {
    const container = document.querySelector('.crisp-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `crisp-msg ${sender}`;
    msgDiv.innerText = text;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

// Helper Translation Functions
function mapWizardToServiceEnum(wizardId) {
    switch (wizardId) {
        case 'name-reservation': return 'COMPANY_NAME_RESERVATION';
        case 'company-opening': return 'COMPANY_OPENING';
        case 'company-closing': return 'COMPANY_CLOSING';
        case 'efiling': return 'DBD_E_FILING';
        case 'car-prb': return 'CAR_PRB_INSURANCE';
        case 'house-reg': return 'HOUSE_REGISTRATION_UPDATE';
        case 'pdpa-badge': return 'PDPA_BADGE_SETUP';
        case 'company-name-change': return 'COMPANY_NAME_CHANGE';
        case 'memorandum-amendment': return 'MEMORANDUM_AMENDMENT';
        case 'financial-statement-prep': return 'FINANCIAL_STATEMENT_PREP';
        case 'company-director-change': return 'COMPANY_DIRECTOR_CHANGE';
        case 'shareholder-update': return 'SHAREHOLDER_UPDATE';
        case 'financial-audit': return 'FINANCIAL_STATEMENT_AUDIT';
        case 'financial-approval': return 'FINANCIAL_STATEMENT_APPROVAL';
        case 'smart-etax': return 'SMART_ETAX';
        default: return 'COMPANY_NAME_RESERVATION';
    }
}

function translateServiceType(enumVal) {
    switch (enumVal) {
        case 'COMPANY_NAME_RESERVATION': return 'จองชื่อบริษัทออนไลน์ (DBD)';
        case 'COMPANY_OPENING': return 'จดทะเบียนจัดตั้งบริษัทจำกัด (บอจ.1)';
        case 'COMPANY_CLOSING': return 'จดทะเบียนเลิกบริษัทและชำระบัญชี';
        case 'DBD_E_FILING': return 'นำส่งงบการเงินออนไลน์ (e-Filing)';
        case 'CAR_PRB_INSURANCE': return 'ประกันภัยรถยนต์ พ.ร.บ. ภาคบังคับ';
        case 'HOUSE_REGISTRATION_UPDATE': return 'แก้ไขปรับปรุงข้อมูลทะเบียนบ้าน';
        case 'PDPA_BADGE_SETUP': return 'จัดทำตราสัญลักษณ์ PDPA Compliant';
        case 'COMPANY_NAME_CHANGE': return 'จดทะเบียนเปลี่ยนชื่อบริษัท';
        case 'MEMORANDUM_AMENDMENT': return 'แก้ไขหนังสือบริคณห์สนธิ (ม.อ.ส.)';
        case 'FINANCIAL_STATEMENT_PREP': return 'จัดทำงบการเงินและตรวจสอบบัญชี';
        case 'COMPANY_DIRECTOR_CHANGE': return 'เปลี่ยนกรรมการผู้มีอำนาจ (เปลี่ยนเจ้าของ)';
        case 'SHAREHOLDER_UPDATE': return 'แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)';
        case 'FINANCIAL_STATEMENT_AUDIT': return 'บริการตรวจสอบงบการเงินโดยผู้สอบบัญชี (CPA)';
        case 'FINANCIAL_STATEMENT_APPROVAL': return 'บริการจัดประชุมผู้ถือหุ้นอนุมัติงบการเงิน';
        case 'SMART_ETAX': return 'บริการติดตั้งระบบ Smart e-Tax Invoice & e-Receipt';
        default: return enumVal;
    }
}

function formatJsonString(val) {
    if (!val) return '{}';
    try {
        // If it is a string representation of map, convert or clean up
        let cleaned = val.trim();
        if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
            // Check if it's already JSON
            try {
                const parsed = JSON.parse(cleaned);
                return JSON.stringify(parsed, null, 2);
            } catch(e) {
                // If it is a Java Map.toString() output, do a simple prettify
                return cleaned
                    .replace(/=/g, ': ')
                    .replace(/, /g, ',\n  ')
                    .replace('{', '{\n  ')
                    .replace('}', '\n}');
            }
        }
        return val;
    } catch (e) {
        return val;
    }
}

// Admin panel view handlers
function switchAdminTab(tabName) {
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById('admin-tab-' + tabName).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

function loadAdminUsers() {
    fetch('/api/admin/users', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => res.json())
    .then(users => {
        const tbody = document.getElementById('admin-users-tbody');
        tbody.innerHTML = '';
        users.forEach(u => {
            const consentDate = u.pdpaConsentDate ? new Date(u.pdpaConsentDate).toLocaleString('th-TH') : '-';
            tbody.innerHTML += `
                <tr>
                    <td>${u.id}</td>
                    <td><span class="badge badge-warning">${u.clerkUserId}</span></td>
                    <td>${u.fullName || '-'}</td>
                    <td>${u.email}</td>
                    <td>${u.phone || '-'}</td>
                    <td>${u.pdpaConsented ? '<span class="text-success"><i class="fa-solid fa-circle-check"></i> ยินยอมแล้ว</span>' : '<span class="text-danger"><i class="fa-solid fa-circle-xmark"></i> ยังไม่เซ็น</span>'}</td>
                    <td>${consentDate}</td>
                </tr>
            `;
        });
    })
    .catch(err => console.error("Error loading users list:", err));
}

function loadAdminConfig() {
    fetch('/api/admin/config', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => res.json())
    .then(configs => {
        document.getElementById('sim-toggle-stripe').checked = configs.stripeSimulation;
        document.getElementById('sim-toggle-supabase').checked = configs.supabaseSimulation;
        document.getElementById('sim-toggle-resend').checked = configs.resendSimulation;
        document.getElementById('sim-toggle-flowaccount').checked = configs.flowAccountSimulation;
    })
    .catch(err => console.error("Error loading settings configurations:", err));
}

function toggleSimSetting(key, enabled) {
    fetch(`/api/admin/config/toggle?key=${key}&value=${enabled}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => res.json())
    .then(configs => {
        console.log("Config updated:", configs);
    })
    .catch(err => alert("ล้มเหลวในการบันทึกค่าการจำลองการทำงาน"));
}


