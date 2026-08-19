// Global App State
let currentUser = null;
let currentToken = null; // Mock token (Clerk User ID in simulation mode)
let activeServiceType = null;
let currentUploadFile = null;
let publicServicesList = [];

// Initial Page Load Hook
window.addEventListener('DOMContentLoaded', () => {
    checkSession();
    initializeDefaultWizards();
    loadPublicServicesCatalog();
    // Default show landing page
    showSection('landing');
});

function loadPublicServicesCatalog() {
    fetch('/api/orders/services')
        .then(res => {
            if (!res.ok) throw new Error("Cannot fetch services");
            return res.json();
        })
        .then(services => {
            publicServicesList = services;
            renderPublicServicesCards(services);
            initializeFilterTags();
        })
        .catch(err => {
            console.warn("Failed to load public services, retrying from admin endpoint:", err);
            fetch('/api/admin/prices')
                .then(res => res.json())
                .then(services => {
                    publicServicesList = services;
                    renderPublicServicesCards(services);
                    initializeFilterTags();
                })
                .catch(e => console.error("Error loading services:", e));
        });
}

function mapServiceCategoryKey(category, serviceType) {
    const cat = (category || '').toLowerCase();
    const type = (serviceType || '').toLowerCase();
    if (cat.includes('ประกันภัย') || type.includes('insurance') || type.includes('prb')) return 'insurance';
    if (cat.includes('ยานพาหนะ') || cat.includes('ขนส่ง') || type.includes('vehicle')) return 'vehicle';
    if (cat.includes('วีซ่า') || cat.includes('คนเข้าเมือง') || type.includes('visa')) return 'immigration';
    if (cat.includes('ประกันสังคม') || cat.includes('แรงงาน') || type.includes('sso')) return 'sso-labor';
    if (cat.includes('ภาษี') || cat.includes('สรรพากร') || type.includes('tax') || type.includes('financial') || type.includes('etax') || type.includes('efiling')) return 'tax-accounting';
    if (cat.includes('ใบอนุญาต') || cat.includes('การค้า') || type.includes('license')) return 'licensing';
    if (cat.includes('จดทะเบียน') || cat.includes('กฎหมาย') || cat.includes('ธุรกิจ') || type.includes('company') || type.includes('legal') || type.includes('dbd') || type.includes('pdpa') || type.includes('house') || type.includes('shareholder') || type.includes('director') || type.includes('memorandum')) return 'legal-dbd';
    return 'all';
}

function getServiceIcon(categoryKey) {
    switch(categoryKey) {
        case 'insurance': return '<i class="fa-solid fa-shield-halved"></i>';
        case 'vehicle': return '<i class="fa-solid fa-car"></i>';
        case 'immigration': return '<i class="fa-solid fa-passport"></i>';
        case 'sso-labor': return '<i class="fa-solid fa-hands-holding-child"></i>';
        case 'tax-accounting': return '<i class="fa-solid fa-file-invoice-dollar"></i>';
        case 'licensing': return '<i class="fa-solid fa-certificate"></i>';
        case 'legal-dbd': return '<i class="fa-solid fa-scale-balanced"></i>';
        default: return '<i class="fa-solid fa-file-shield"></i>';
    }
}

function getWizardIdForService(serviceType) {
    switch (serviceType) {
        case 'COMPANY_NAME_RESERVATION': return 'name-reservation';
        case 'COMPANY_OPENING': return 'company-opening';
        case 'COMPANY_CLOSING': return 'company-closing';
        case 'DBD_E_FILING': return 'efiling';
        case 'CAR_PRB_INSURANCE': return 'car-prb';
        case 'HOUSE_REGISTRATION_UPDATE': return 'house-reg';
        case 'PDPA_BADGE_SETUP': return 'pdpa-badge';
        case 'COMPANY_NAME_CHANGE': return 'company-name-change';
        case 'MEMORANDUM_AMENDMENT': return 'memorandum-amendment';
        case 'FINANCIAL_STATEMENT_PREP': return 'financial-statement-prep';
        case 'COMPANY_DIRECTOR_CHANGE': return 'company-director-change';
        case 'SHAREHOLDER_UPDATE': return 'shareholder-update';
        case 'FINANCIAL_STATEMENT_AUDIT': return 'financial-audit';
        case 'FINANCIAL_STATEMENT_APPROVAL': return 'financial-approval';
        case 'SMART_ETAX': return 'smart-etax';
        case 'INSURANCE_POLICY_ENDORSEMENT': return 'policy-endorsement';
        case 'INSURANCE_VOLUNTARY_MOTOR': return 'voluntary-insurance';
        case 'VEHICLE_TAX_RENEWAL': return 'vehicle-tax-renewal';
        case 'VEHICLE_OVERDUE_TAX_FINES': return 'overdue-tax-fines';
        case 'VEHICLE_POWER_OF_ATTORNEY': return 'vehicle-poa';
        case 'VEHICLE_PLATE_REPLACEMENT': return 'plate-replacement';
        case 'VEHICLE_BOOK_REPLACEMENT': return 'book-replacement';
        case 'VEHICLE_SPEC_ALTERATION': return 'spec-alteration';
        case 'VEHICLE_PROVINCE_TRANSFER': return 'province-transfer';
        case 'VISA_90DAY_REPORTING': return 'visa-90day';
        case 'VISA_TM30_NOTIFICATION': return 'visa-tm30';
        case 'VISA_OUTBOUND_APPLICATION_PACK': return 'outbound-evisa';
        case 'SSO_ARTICLE_39_40_ENROLLMENT': return 'sso-enrollment';
        case 'SSO_HOSPITAL_CHANGE': return 'sso-hospital';
        case 'SSO_COMPENSATION_CLAIMS': return 'sso-claims';
        case 'TAX_PERSONAL_INCOME_EFILING': return 'personal-income-tax';
        case 'TAX_VAT_REGISTRATION_SUBMISSION': return 'vat-registration';
        case 'TAX_WITHHOLDING_CERT_50TAWI': return 'withholding-tax-cert';
        case 'LICENSE_DIRECT_SALES_OCPB': return 'direct-sales-ocpb';
        case 'LICENSE_MUSIC_COPYRIGHT': return 'music-copyright';
        case 'LICENSE_SIGNBOARD_TAX': return 'signboard-tax';
        case 'DBD_NAME_RESERVATION_ECERT': return 'dbd-name-ecert';
        case 'LEGAL_FORM_GENERATION': return 'legal-form-gen';
        case 'LEGAL_POA_DISPATCH': return 'legal-poa-dispatch';
        case 'LEGAL_REMOTE_ESIGN_CONTRACT': return 'remote-esign-contract';
        case 'LEGAL_NOTARY_TRANSLATION_HUB': return 'notary-translation-hub';
        default: return 'name-reservation';
    }
}

function renderPublicServicesCards(services) {
    const grid = document.getElementById('services-cards-grid');
    if (!grid) return;
    if (!services || services.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:30px;" class="text-muted">ไม่พบข้อมูลบริการ</div>';
        return;
    }

    let html = '';
    services.forEach(s => {
        const catKey = mapServiceCategoryKey(s.category, s.serviceType);
        const icon = getServiceIcon(catKey);
        const wizardId = getWizardIdForService(s.serviceType);
        const desc = s.contentTh || 'บริการเอกสารราชการและกฎหมายออนไลน์ ครบวงจร รวดเร็ว ถูกต้องตามระเบียบภาครัฐ';
        const priceFmt = Number(s.price).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2});
        const sla = s.slaDays || 2;

        html += `
            <div class="card service-card" data-category="${catKey}">
                <div class="card-header-badge" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div class="service-icon" style="margin-bottom: 0;">${icon}</div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        <span class="badge badge-primary" style="font-size:11px;">${s.category || 'ทั่วไป'}</span>
                        <span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:600; font-size:11px;">
                            <i class="fa-solid fa-clock"></i> SLA: ${sla} วัน
                        </span>
                    </div>
                </div>
                <h3 style="font-size:17px; margin-bottom:8px; line-height:1.4;">${s.nameTh}</h3>
                <p style="font-size:13px; color:var(--text-muted); line-height:1.5; min-height:48px; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${desc}</p>
                <div style="margin-top:auto; padding-top:15px; border-top:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">
                        <span style="font-size:12px; color:var(--text-muted);">อัตราค่าบริการ:</span>
                        <span style="font-size:18px; font-weight:700; color:var(--primary); font-family:var(--font-mono);">${priceFmt} <small style="font-size:12px; font-weight:normal; color:var(--text-muted);">บาท</small></span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary btn-sm" style="flex: 1.3;" onclick="selectServiceCatalog('${wizardId}')">
                            <i class="fa-solid fa-bolt"></i> ทำรายการ
                        </button>
                        <button class="btn btn-outline btn-sm" style="flex: 0.7;" onclick="alert('【${s.nameTh}】\\n\\nหมวดหมู่: ${s.category}\\nระยะเวลา SLA: ${sla} วันทำการ (ช้าคืนเงิน 100%)\\nค่าบริการ: ${priceFmt} บาท\\n\\nรายละเอียด: ${desc}')">
                            ข้อมูล
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function initializeFilterTags() {
    const tags = document.querySelectorAll('.btn-tag');
    const searchInput = document.getElementById('service-search-input');
    if (!tags.length) return;
    
    function filterServices() {
        const cards = document.querySelectorAll('.service-card');
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
        // Remove existing listener clones to avoid duplicates
        const newTag = tag.cloneNode(true);
        tag.parentNode.replaceChild(newTag, tag);
    });

    document.querySelectorAll('.btn-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            document.querySelectorAll('.btn-tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            filterServices();
        });
    });

    if (searchInput) {
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', filterServices);
    }
}

// Navigation state controller
function showSection(sectionId) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.add('hidden'));
    
    // Reset active states in nav links
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    if (sectionId === 'landing') {
        const el = document.getElementById('landing-section');
        if (el) el.classList.remove('hidden');
    } else if (sectionId === 'dashboard') {
        if (!currentToken) {
            alert("กรุณาเข้าสู่ระบบก่อนใช้งานแดชบอร์ด e-Services");
            openAuthModal('signin');
            return;
        }
        const el = document.getElementById('dashboard-section');
        if (el) el.classList.remove('hidden');
        const navLink = document.getElementById('nav-dashboard-link');
        if (navLink) navLink.classList.add('active');
        fetchOrders();
    } else if (sectionId === 'progress') {
        const el = document.getElementById('progress-section');
        if (el) el.classList.remove('hidden');
        const navLink = document.getElementById('nav-progress-link');
        if (navLink) navLink.classList.add('active');
        if (currentToken) {
            loadClientProgressData();
        } else {
            renderGuestProgressPrompt();
        }
    } else if (sectionId === 'profile') {
        if (!currentToken) {
            alert("กรุณาเข้าสู่ระบบก่อนจัดการโปรไฟล์");
            openAuthModal('signin');
            return;
        }
        const el = document.getElementById('profile-section');
        if (el) el.classList.remove('hidden');
        populateProfileFields();
    } else if (sectionId === 'admin') {
        const el = document.getElementById('admin-section');
        if (el) el.classList.remove('hidden');
        const navLink = document.getElementById('nav-admin-link');
        if (navLink) navLink.classList.add('active');
        
        const loginPanel = document.getElementById('admin-login-panel');
        const dashPanel = document.getElementById('admin-dashboard-panel');
        
        const role = localStorage.getItem('edocman_role');
        if (role === 'ADMIN') {
            if (loginPanel) loginPanel.classList.add('hidden');
            if (dashPanel) dashPanel.classList.remove('hidden');
            fetchAdminOrders();
            loadAdminServiceRequests();
            loadAdminUsers();
            loadAdminConfig();
            loadAdminServices();
            loadAdminServiceHistory();
        } else {
            if (loginPanel) loginPanel.classList.remove('hidden');
            if (dashPanel) dashPanel.classList.add('hidden');
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
    
    const clientNavLinks = document.getElementById('client-nav-links');
    const clerkAuth = document.getElementById('clerk-auth-container');
    const userProfile = document.getElementById('user-profile-container');
    const adminHeader = document.getElementById('admin-header-container');
    const navBrandTitle = document.getElementById('nav-brand-title');
    const navDashboard = document.getElementById('nav-dashboard-link');
    const navProgress = document.getElementById('nav-progress-link');
    const userDisplay = document.getElementById('user-display-name');

    if (savedToken && savedUser) {
        currentToken = savedToken;
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            currentUser = { fullName: 'User' };
        }
        
        if (savedRole === 'ADMIN') {
            // Super Admin: Hide all client-side front end nav elements completely
            if (clientNavLinks) clientNavLinks.classList.add('hidden');
            if (clerkAuth) clerkAuth.classList.add('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            if (adminHeader) adminHeader.classList.remove('hidden');
            if (navBrandTitle) navBrandTitle.innerText = 'eDocman Admin Console';
            if (navProgress) navProgress.classList.add('hidden');
            
            const crisp = document.getElementById('crisp-widget');
            const pdpa = document.getElementById('pdpa-floating-badge-btn');
            if (crisp) crisp.classList.add('hidden');
            if (pdpa) pdpa.classList.add('hidden');

            showSection('admin');
        } else {
            // Customer: Normal client view
            if (clientNavLinks) clientNavLinks.classList.remove('hidden');
            if (clerkAuth) clerkAuth.classList.add('hidden');
            if (userProfile) userProfile.classList.remove('hidden');
            if (adminHeader) adminHeader.classList.add('hidden');
            if (navBrandTitle) navBrandTitle.innerText = 'eDocman';
            if (userDisplay && currentUser) {
                userDisplay.innerText = 'คุณ ' + (currentUser.fullName || currentUser.email || 'User');
            }
            if (navDashboard) navDashboard.classList.remove('hidden');
            if (navProgress) navProgress.classList.remove('hidden');
            
            const crisp = document.getElementById('crisp-widget');
            const pdpa = document.getElementById('pdpa-floating-badge-btn');
            if (crisp) crisp.classList.remove('hidden');
            if (pdpa) pdpa.classList.remove('hidden');

            initCart();
        }
    } else {
        currentToken = null;
        currentUser = null;
        if (clientNavLinks) clientNavLinks.classList.remove('hidden');
        if (clerkAuth) clerkAuth.classList.remove('hidden');
        if (userProfile) userProfile.classList.add('hidden');
        if (adminHeader) adminHeader.classList.add('hidden');
        if (navBrandTitle) navBrandTitle.innerText = 'eDocman';

        const crisp = document.getElementById('crisp-widget');
        const pdpa = document.getElementById('pdpa-floating-badge-btn');
        if (crisp) crisp.classList.remove('hidden');
        if (pdpa) pdpa.classList.remove('hidden');
    }
}

function onLogoClick() {
    const role = localStorage.getItem('edocman_role');
    if (role === 'ADMIN') {
        showSection('admin');
    } else {
        showSection('landing');
    }
}

function onNavbarProfileClick() {
    const role = localStorage.getItem('edocman_role');
    if (role === 'ADMIN') {
        showSection('admin');
    } else {
        showSection('profile');
        switchProfileSubTab('settings');
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
        if (data.user.role === 'ADMIN') {
            showSection('admin');
        } else {
            showSection('dashboard');
        }
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
    clearCart();
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
        const wizardMap = {
            'DBD': 'name-reservation',
            'CAR': 'car-prb',
            'HOUSE': 'house-reg',
            'PDPA': 'pdpa-badge',
            'NAME_CHANGE': 'company-name-change',
            'MEMO': 'memorandum-amendment',
            'FINANCIAL_PREP': 'financial-statement-prep',
            'DIRECTOR_CHANGE': 'company-director-change',
            'SHAREHOLDER_UPDATE': 'shareholder-update',
            'FINANCIAL_AUDIT': 'financial-audit',
            'FINANCIAL_APPROVAL': 'financial-approval',
            'SMART_ETAX': 'smart-etax'
        };
        const targetWizard = wizardMap[catalogType] || catalogType;
        showWizard(targetWizard);
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
        window.currentCustomerOrders = orders || [];
        const container = document.getElementById('orders-list-container');
        if (!orders || orders.length === 0) {
            container.innerHTML = `
                <div class="dashboard-empty-state">
                    <i class="fa-regular fa-folder-open"></i>
                    <h4>ยังไม่มีรายการทำธุรกรรม</h4>
                    <p>กรุณาเลือกบริการที่คุณต้องการจากเมนู e-Services ด้านซ้ายเพื่อเริ่มต้นทำธุรกรรมแบบไร้กระดาษ</p>
                </div>
            `;
            return;
        }

        let html = '<h3 style="margin-bottom: 15px;">คำร้องธุรกรรมทั้งหมด</h3>';
        orders.slice().reverse().forEach(o => {
            let statusBadge = '';
            if (o.status === 'PENDING_PAYMENT') statusBadge = '<span class="badge badge-warning">รอชำระเงิน</span>';
            else if (o.status === 'PAID') statusBadge = '<span class="badge badge-primary">ชำระเงินแล้ว/กำลังส่งเรื่อง</span>';
            else if (o.status === 'PROCESSING') statusBadge = '<span class="badge badge-primary">กำลังตรวจสอบ</span>';
            else if (o.status === 'COMPLETED') statusBadge = '<span class="badge badge-success">เสร็จสมบูรณ์</span>';
            else if (o.status === 'FAILED') statusBadge = '<span class="badge badge-danger">ล้มเหลว</span>';

            let serviceName = translateServiceType(o.serviceType);

            let actionButton = '';
            if (o.status === 'PENDING_PAYMENT') {
                actionButton = `<button class="btn btn-primary btn-sm" onclick="addToCartAndOpen(${o.id}, '${serviceName}', ${o.price})"><i class="fa-solid fa-cart-plus"></i> ใส่ตะกร้า & ชำระเงิน</button>`;
            } else if (o.status === 'COMPLETED' && o.officialDocumentUrl) {
                actionButton = `<a href="${o.officialDocumentUrl}" target="_blank" class="btn btn-success btn-sm"><i class="fa-solid fa-download"></i> ผลอนุมัติ</a>`;
            } else if (o.status === 'PAID' || o.status === 'PROCESSING') {
                actionButton = `<a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-print"></i> พิมพ์คำร้อง</a>`;
            }

            let trackButton = `<button type="button" class="btn btn-outline btn-sm" onclick="openTrackingModal(${o.id})"><i class="fa-solid fa-route text-primary"></i> ติดตามสถานะ</button>`;

            html += `
                <div class="order-row">
                    <div class="order-id">#${o.id}</div>
                    <div class="order-details">
                        <strong>${serviceName}</strong>
                        <span>สร้างเมื่อ: ${new Date(o.createdAt).toLocaleDateString('th-TH')}</span>
                    </div>
                    <div class="order-price">
                        <strong>${o.price.toLocaleString('th-TH')} บาท</strong>
                    </div>
                    <div style="display:flex; justify-content:flex-end; align-items:center; gap: 8px; flex-wrap:wrap;">
                        ${statusBadge}
                        ${trackButton}
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

const SERVICE_METADATA = {
    'car-prb': { price: 645, slaDays: 1, name: 'พ.ร.บ. รถยนต์ ออกกรมธรรม์ทันที' },
    'policy-endorsement': { price: 350, slaDays: 1, name: 'แจ้งแก้ไข/สลักหลังกรมธรรม์' },
    'voluntary-insurance': { price: 7500, slaDays: 2, name: 'ประกันภัยรถยนต์ภาคสมัครใจ (ชั้น 1,2+,3)' },
    'vehicle-tax-renewal': { price: 1200, slaDays: 2, name: 'ต่อภาษีประจำปี/ป้ายวงกลม' },
    'overdue-tax-fines': { price: 850, slaDays: 2, name: 'เคลียร์ภาษีย้อนหลัง & ค่าปรับจราจร' },
    'vehicle-poa': { price: 290, slaDays: 1, name: 'หนังสือมอบอำนาจงาน DLT' },
    'plate-replacement': { price: 950, slaDays: 3, name: 'ขอแผ่นป้ายทะเบียนใหม่' },
    'book-replacement': { price: 1100, slaDays: 3, name: 'ขอสมุดคู่มือจดทะเบียนใหม่' },
    'spec-alteration': { price: 1250, slaDays: 3, name: 'แจ้งเปลี่ยนสี/ดัดแปลงสภาพรถ' },
    'province-transfer': { price: 1800, slaDays: 5, name: 'ย้ายทะเบียนรถข้ามจังหวัด' },
    'visa-90day': { price: 950, slaDays: 2, name: 'รายงานตัว 90 วันออนไลน์ (ตม.47)' },
    'visa-tm30': { price: 650, slaDays: 1, name: 'แจ้งที่พักอาศัยคนต่างด้าว (ตม.30)' },
    'outbound-evisa': { price: 1850, slaDays: 3, name: 'ชุดเอกสารขอ eVisa & จองคิวสถานทูต' },
    'sso-enrollment': { price: 490, slaDays: 2, name: 'สมัครประกันสังคม ม.39 / ม.40' },
    'sso-hospital': { price: 350, slaDays: 2, name: 'ยื่นเปลี่ยนโรงพยาบาลประกันสังคม' },
    'sso-claims': { price: 890, slaDays: 3, name: 'เบิกสิทธิคลอดบุตร/สงเคราะห์/ว่างงาน' },
    'personal-income-tax': { price: 1200, slaDays: 3, name: 'ยื่นภาษีเงินได้บุคคล ภ.ง.ด.90/91/94' },
    'vat-registration': { price: 2500, slaDays: 3, name: 'จดทะเบียน ภ.พ.20 & ยื่น ภ.พ.30' },
    'withholding-tax-cert': { price: 390, slaDays: 1, name: 'หนังสือรับรองหัก ณ ที่จ่าย 50 ทวิ' },
    'financial-statement-prep': { price: 4500, slaDays: 10, name: 'จัดทำงบการเงินประจำปี' },
    'financial-audit': { price: 7500, slaDays: 15, name: 'ตรวจสอบงบการเงิน (CPA)' },
    'financial-approval': { price: 1500, slaDays: 5, name: 'อนุมัติงบการเงิน (AGM)' },
    'smart-etax': { price: 2500, slaDays: 7, name: 'ระบบ Smart e-Tax Invoice' },
    'direct-sales-ocpb': { price: 6900, slaDays: 14, name: 'ใบอนุญาตขายตรง/ตลาดแบบตรง สคบ.' },
    'music-copyright': { price: 3500, slaDays: 7, name: 'ใบอนุญาตเผยแพร่ลิขสิทธิ์เพลง' },
    'signboard-tax': { price: 950, slaDays: 3, name: 'คำนวณและยื่นชำระภาษีป้าย' },
    'dbd-name-ecert': { price: 490, slaDays: 2, name: 'จองชื่อ & ขอ e-Certificate (DBD)' },
    'name-reservation': { price: 490, slaDays: 2, name: 'DBD จองชื่อนิติบุคคลออนไลน์' },
    'legal-form-gen': { price: 490, slaDays: 1, name: 'ร่างสัญญาทางกฎหมาย & e-Sign' },
    'legal-poa-dispatch': { price: 390, slaDays: 2, name: 'หนังสือมอบอำนาจเฉพาะทาง & ส่งฉบับจริง' },
    'remote-esign-contract': { price: 590, slaDays: 1, name: 'ร่างสัญญา NDA / จ้างงาน / เช่า' },
    'notary-translation-hub': { price: 1500, slaDays: 3, name: 'โนตารีพับลิค & แปลเอกสารรับรอง' },
    'company-opening': { price: 4900, slaDays: 5, name: 'จัดตั้งบริษัทจำกัด (บอจ.1)' },
    'company-closing': { price: 9900, slaDays: 30, name: 'เลิกและชำระบัญชีบริษัท' },
    'efiling': { price: 1900, slaDays: 3, name: 'นำส่งงบ e-Filing' },
    'house-reg': { price: 990, slaDays: 3, name: 'แก้ไขข้อมูลทะเบียนบ้าน' },
    'pdpa-badge': { price: 890, slaDays: 2, name: 'ตราสัญลักษณ์ PDPA Badge' },
    'company-name-change': { price: 1900, slaDays: 5, name: 'จดทะเบียนเปลี่ยนชื่อบริษัท' },
    'memorandum-amendment': { price: 2900, slaDays: 5, name: 'แก้ไขหนังสือบริคณห์สนธิ' },
    'company-director-change': { price: 1900, slaDays: 3, name: 'เปลี่ยนตัวกรรมการ (เจ้าของ)' },
    'shareholder-update': { price: 1200, slaDays: 2, name: 'แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)' }
};

function showWizard(serviceType) {
    activeServiceType = serviceType;
    activeVaultAttachmentUrl = null;
    document.getElementById('wizard-service-type').value = serviceType;
    currentUploadFile = null;
    document.getElementById('wizard-file-upload').value = "";
    document.getElementById('file-upload-status').innerHTML = "";

    const meta = SERVICE_METADATA[serviceType] || { price: 990, slaDays: 3, name: 'บริการภาครัฐ' };

    // Update Top Guaranteed SLA & Price Tags
    const slaDaysEl = document.getElementById('wizard-sla-days');
    const priceTagEl = document.getElementById('wizard-price-tag');
    if (slaDaysEl) slaDaysEl.innerText = `${meta.slaDays} วันทำการ`;
    if (priceTagEl) priceTagEl.innerText = `฿${meta.price.toLocaleString('en-US')}`;

    const feedbackEl = document.getElementById('vault-autofill-feedback');
    if (feedbackEl) feedbackEl.classList.add('hidden');

    const subtitleEl = document.getElementById('vault-autofill-subtitle');
    if (subtitleEl) {
        subtitleEl.innerText = (currentUser && currentUser.fullName) ? `(${currentUser.fullName})` : '';
    }

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
    } else if (serviceType === 'policy-endorsement') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-pen text-primary"></i> แจ้งแก้ไข / สลักหลังกรมธรรม์ พ.ร.บ. หรือประกันภัย';
        fieldsHtml = `
            <div class="form-group">
                <label>เลขที่กรมธรรม์เดิม / Existing Policy Number</label>
                <input type="text" class="form-control" name="policyNumber" required placeholder="POL-2026-xxxxxxx">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="เช่น 1กข-1234 กทม.">
                </div>
                <div class="form-group">
                    <label>รายการที่ต้องการขอแก้ไข / Endorsement Scope</label>
                    <select class="form-control" name="endorsementType">
                        <option value="แก้ไขชื่อ-นามสกุลผู้เอาประกัน">แก้ไขชื่อ-นามสกุลผู้เอาประกัน</option>
                        <option value="แก้ไขเลขทะเบียนรถ / เลขตัวถัง">แก้ไขเลขทะเบียนรถ / เลขตัวถัง</option>
                        <option value="ขยายระยะเวลาความคุ้มครอง">ขยายระยะเวลาความคุ้มครอง</option>
                        <option value="เปลี่ยนที่อยู่จัดส่งเอกสาร">เปลี่ยนที่อยู่จัดส่งเอกสาร</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>ข้อมูลรายละเอียดใหม่ที่ต้องการแก้ไข / New Correct Information</label>
                <textarea class="form-control" name="correctionDetails" required rows="3" placeholder="ระบุข้อมูลที่ถูกต้อง เช่น ชื่อ-นามสกุลใหม่ หรือ เลขทะเบียนที่ถูกต้อง"></textarea>
            </div>
        `;
    } else if (serviceType === 'voluntary-insurance') {
        titleEl.innerHTML = '<i class="fa-solid fa-shield-virus text-primary"></i> เปรียบเทียบและทำประกันภัยรถยนต์ภาคสมัครใจ (ชั้น 1, 2+, 3+, 3)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ยี่ห้อและรุ่นรถยนต์ / Vehicle Make & Model</label>
                    <input type="text" class="form-control" name="vehicleModel" required placeholder="Toyota Camry 2.5 HEV (2023)">
                </div>
                <div class="form-group">
                    <label>ประเภทชั้นประกันภัยที่ต้องการ / Insurance Plan</label>
                    <select class="form-control" name="insuranceTier">
                        <option value="ชั้น 1 (Type 1 - คุ้มครองครอบคลุมสูงสุด)">ชั้น 1 (Type 1 - คุ้มครองครอบคลุมสูงสุด)</option>
                        <option value="ชั้น 2+ (Type 2+ - รถชนรถ+สูญหาย+ไฟไหม้)">ชั้น 2+ (Type 2+ - รถชนรถ+สูญหาย+ไฟไหม้)</option>
                        <option value="ชั้น 3+ (Type 3+ - ซ่อมเขาซ่อมเรา)">ชั้น 3+ (Type 3+ - ซ่อมเขาซ่อมเรา)</option>
                        <option value="ชั้น 3 (Type 3 - คุ้มครองคู่กรณี)">ชั้น 3 (Type 3 - คุ้มครองคู่กรณี)</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="1กข-9999 กทม.">
                </div>
                <div class="form-group">
                    <label>ระบุชื่อผู้ขับขี่ / Driver Specified</label>
                    <select class="form-control" name="driverSpecified">
                        <option value="ไม่ระบุชื่อผู้ขับขี่ (คุ้มครองทุกคนที่ขับขี่ถูกกฎหมาย)">ไม่ระบุชื่อผู้ขับขี่ (คุ้มครองทุกคน)</option>
                        <option value="ระบุชื่อผู้ขับขี่ 1-2 คน (ได้รับส่วนลดเบี้ย)">ระบุชื่อผู้ขับขี่ 1-2 คน</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>แนบรูปถ่ายเล่มทะเบียน หรือ กรมธรรม์เดิม (สำหรับต่ออายุรับส่วนลดประวัติดี)</label>
                <input type="text" class="form-control" name="previousInsurer" placeholder="บริษัทประกันเดิม เช่น วิริยะ, กรุงเทพประกันภัย (ถ้ามี)">
            </div>
        `;
    } else if (serviceType === 'vehicle-tax-renewal') {
        titleEl.innerHTML = '<i class="fa-solid fa-stamp text-primary"></i> บริการต่อภาษีประจำปี / ป้ายภาษีหน้ารถ (Annual Tax Sticker Renewal)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ประเภทรถยนต์ / Vehicle Category</label>
                    <select class="form-control" name="vehicleType">
                        <option value="รถยนต์นั่งส่วนบุคคลไม่เกิน 7 ที่นั่ง (รย.1)">รถเก๋ง / กระบะ 4 ประตู (อายุไม่เกิน 7 ปี)</option>
                        <option value="รถจักรยานยนต์ส่วนบุคคล (รย.12)">รถจักรยานยนต์ / มอเตอร์ไซค์ (อายุไม่เกิน 5 ปี)</option>
                        <option value="รถยนต์บรรทุกส่วนบุคคล/กระบะตอนเดียว (รย.3)">รถกระบะแค็บ/ตอนเดียว (อายุไม่เกิน 7 ปี)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>เลขทะเบียนและจังหวัด / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="เช่น 2กม-4321 กรุงเทพมหานคร">
                </div>
            </div>
            <div class="form-group">
                <label>เลขตัวถังรถ (17 หลัก) / Chassis Number</label>
                <input type="text" class="form-control" name="chassisNumber" required placeholder="MR0xxxxxxxxxxxxxx" maxlength="17">
            </div>
            <div class="form-group">
                <label>ที่อยู่สำหรับจัดส่งป้ายภาษีตัวจริง (EMS / Courier Delivery Address)</label>
                <textarea class="form-control" name="deliveryAddress" required rows="2" placeholder="ระบุบ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์ และเบอร์โทรศัพท์ผู้รับ"></textarea>
            </div>
        `;
    } else if (serviceType === 'overdue-tax-fines') {
        titleEl.innerHTML = '<i class="fa-solid fa-receipt text-primary"></i> บริการเคลียร์ภาษีค้างชำระ & ชำระค่าปรับจราจร DLT';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="7กศ-8888">
                </div>
                <div class="form-group">
                    <label>เลขบัตรประชาชนเจ้าของรถ / Owner ID Card</label>
                    <input type="text" class="form-control" name="ownerIdCard" required placeholder="13 หลัก" maxlength="13">
                </div>
            </div>
            <div class="form-group">
                <label>จำนวนปีที่ขาดต่อภาษี หรือ เลขที่ใบสั่งจราจร (ถ้าทราบ)</label>
                <input type="text" class="form-control" name="fineRefNumber" placeholder="เช่น ค้างต่อ 1-2 ปี หรือ เลขที่ใบสั่ง 13 หลัก">
            </div>
            <div class="form-group">
                <label>ความประสงค์เพิ่มเติม</label>
                <textarea class="form-control" name="actionNote" rows="2" placeholder="ต้องการตรวจสอบยอดค่าปรับทั้งหมด และเคลียร์ให้สถานะทะเบียนพร้อมต่อภาษีประจำปี"></textarea>
            </div>
        `;
    } else if (serviceType === 'vehicle-poa') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-signature text-primary"></i> ระบบสร้างหนังสือมอบอำนาจงานขนส่ง DLT (Auto POA Generator)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อ-นามสกุล ผู้มอบอำนาจ (เจ้าของรถตามเล่มทะเบียน)</label>
                <input type="text" class="form-control" name="grantorName" required placeholder="นายสมชาย ใจดี" value="${currentUser ? currentUser.fullName : ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขบัตรประชาชนผู้มอบอำนาจ</label>
                    <input type="text" class="form-control" name="grantorId" required placeholder="13 หลัก" maxlength="13">
                </div>
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ที่มอบอำนาจ</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="3ขค-1234 กทม.">
                </div>
            </div>
            <div class="form-group">
                <label>เรื่องที่มอบอำนาจให้ดำเนินการแทน</label>
                <select class="form-control" name="poaPurpose">
                    <option value="ดำเนินการชำระภาษีประจำปีและรับป้ายภาษี">ดำเนินการชำระภาษีประจำปีและรับป้ายภาษี</option>
                    <option value="ดำเนินการขอคัดสมุดคู่มือจดทะเบียนใหม่ / ขอแผ่นป้ายใหม่">ดำเนินการขอคัดสมุดคู่มือจดทะเบียนใหม่ / ขอแผ่นป้ายใหม่</option>
                    <option value="ดำเนินการโอนเปลี่ยนเจ้าของ / แจ้งย้ายปลายทาง">ดำเนินการโอนเปลี่ยนเจ้าของ / แจ้งย้ายปลายทาง</option>
                    <option value="ดำเนินการแจ้งเปลี่ยนสี / ดัดแปลงสภาพเครื่องยนต์">ดำเนินการแจ้งเปลี่ยนสี / ดัดแปลงสภาพเครื่องยนต์</option>
                </select>
            </div>
        `;
    } else if (serviceType === 'plate-replacement') {
        titleEl.innerHTML = '<i class="fa-solid fa-id-card text-primary"></i> บริการขอแผ่นป้ายทะเบียนใหม่ (แทนสูญหาย/ชำรุด)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="เช่น 4กม-5678">
                </div>
                <div class="form-group">
                    <label>จังหวัดของป้ายทะเบียน / Province</label>
                    <input type="text" class="form-control" name="province" required placeholder="กรุงเทพมหานคร">
                </div>
            </div>
            <div class="form-group">
                <label>สาเหตุที่ขอรับแผ่นป้ายใหม่</label>
                <select class="form-control" name="replacementReason">
                    <option value="ป้ายทะเบียนหล่นสูญหาย (มีใบแจ้งความ)">ป้ายทะเบียนหล่นสูญหาย (มีใบแจ้งความ)</option>
                    <option value="ป้ายทะเบียนลบเลือน / แตกลายงา">ป้ายทะเบียนลบเลือน / แตกลายงา</option>
                    <option value="ป้ายทะเบียนชำรุดเสียหายจากอุบัติเหตุ">ป้ายทะเบียนชำรุดเสียหายจากอุบัติเหตุ</option>
                </select>
            </div>
            <div class="form-group">
                <label>ที่อยู่จัดส่งแผ่นป้ายทะเบียนใหม่เมื่อผลิตเสร็จสิ้น</label>
                <textarea class="form-control" name="shippingAddress" required rows="2" placeholder="ที่อยู่จัดส่งพัสดุรับแผ่นป้ายทะเบียนตัวจริง"></textarea>
            </div>
        `;
    } else if (serviceType === 'book-replacement') {
        titleEl.innerHTML = '<i class="fa-solid fa-book text-primary"></i> บริการขอสมุดคู่มือจดทะเบียนใหม่ (เล่มชำรุด / สูญหาย / รายการเต็ม)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="เช่น 1กข-9999">
                </div>
                <div class="form-group">
                    <label>ประเภทสมุด / Logbook Type</label>
                    <select class="form-control" name="bookType">
                        <option value="สมุดคู่มือจดทะเบียนรถยนต์ (เล่มสีฟ้า)">สมุดคู่มือจดทะเบียนรถยนต์ (เล่มสีฟ้า)</option>
                        <option value="สมุดคู่มือจดทะเบียนรถจักรยานยนต์ (เล่มสีเขียว)">สมุดคู่มือจดทะเบียนรถจักรยานยนต์ (เล่มสีเขียว)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>สาเหตุที่ขอออกสมุดเล่มใหม่</label>
                <select class="form-control" name="reason">
                    <option value="สมุดคู่มือสูญหาย (แนบสำเนาใบแจ้งความ)">สมุดคู่มือสูญหาย (แนบสำเนาใบแจ้งความ)</option>
                    <option value="สมุดคู่มือชำรุดเปียกน้ำหรือฉีกขาด">สมุดคู่มือชำรุดเปียกน้ำหรือฉีกขาด</option>
                    <option value="หน้าบันทึกรายการภาษีหรือผู้ถือกรรมสิทธิ์เต็ม">หน้าบันทึกรายการเต็ม</option>
                </select>
            </div>
        `;
    } else if (serviceType === 'spec-alteration') {
        titleEl.innerHTML = '<i class="fa-solid fa-sliders text-primary"></i> แจ้งเปลี่ยนสี / ดัดแปลงสภาพรถยนต์ (Spec Alteration)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนรถยนต์ / License Plate</label>
                    <input type="text" class="form-control" name="licensePlate" required placeholder="5กฮ-7890">
                </div>
                <div class="form-group">
                    <label>ประเภทการดัดแปลงสภาพ / Modification Scope</label>
                    <select class="form-control" name="alterationType">
                        <option value="แจ้งเปลี่ยนสีตัวถังรถยนต์ (ทำสีใหม่/Wrap)">แจ้งเปลี่ยนสีตัวถังรถยนต์ (ทำสีใหม่ / Wrap สี)</option>
                        <option value="แจ้งเปลี่ยนเครื่องยนต์ใหม่">แจ้งเปลี่ยนเครื่องยนต์ใหม่</option>
                        <option value="แจ้งติดตั้งโครงหลังคา/ตู้บรรทุก/โรลบาร์">แจ้งติดตั้งโครงหลังคา / ตู้บรรทุก / เสริมแหนบ</option>
                        <option value="แจ้งติดตั้ง/ยกเลิกระบบก๊าซเชื้อเพลิง (LPG/NGV)">แจ้งติดตั้ง/ยกเลิกระบบก๊าซ (LPG/NGV)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>รายละเอียดการดัดแปลง (เช่น สีเดิม -> สีใหม่, เลขเครื่องยนต์ใหม่)</label>
                <textarea class="form-control" name="specDetails" required rows="2" placeholder="ระบุสีใหม่ เช่น สีขาวมุก หรือระบุสเปกเครื่องยนต์"></textarea>
            </div>
        `;
    } else if (serviceType === 'province-transfer') {
        titleEl.innerHTML = '<i class="fa-solid fa-map-location-dot text-primary"></i> บริการย้ายทะเบียนรถข้ามจังหวัด (Out-of-Province Transfer)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>เลขทะเบียนเดิม / Current Plate</label>
                    <input type="text" class="form-control" name="currentPlate" required placeholder="เช่น 2กม-1234 ชลบุรี">
                </div>
                <div class="form-group">
                    <label>จังหวัดปลายทางที่ต้องการย้ายเข้า / Destination Province</label>
                    <input type="text" class="form-control" name="destinationProvince" required placeholder="เช่น กรุงเทพมหานคร">
                </div>
            </div>
            <div class="form-group">
                <label>ที่อยู่ผู้ครอบครองในจังหวัดปลายทาง</label>
                <textarea class="form-control" name="destinationAddress" required rows="2" placeholder="ที่อยู่ตามทะเบียนบ้านที่จะย้ายรถเข้า"></textarea>
            </div>
        `;
    } else if (serviceType === 'visa-90day') {
        titleEl.innerHTML = '<i class="fa-solid fa-calendar-check text-primary"></i> บริการรายงานตัว 90 วันออนไลน์ (TM.47 90-Day Online Reporting)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อ-นามสกุลตามหนังสือเดินทาง / Full Name (Passport)</label>
                    <input type="text" class="form-control" name="expatFullName" required placeholder="John Doe">
                </div>
                <div class="form-group">
                    <label>สัญชาติ / Nationality</label>
                    <input type="text" class="form-control" name="nationality" required placeholder="American, British, Japanese etc.">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขหนังสือเดินทาง / Passport Number</label>
                    <input type="text" class="form-control" name="passportNumber" required placeholder="A12345678">
                </div>
                <div class="form-group">
                    <label>วันครบกำหนดรายงานตัว 90 วัน / Due Date</label>
                    <input type="date" class="form-control" name="dueDate" required>
                </div>
            </div>
            <div class="form-group">
                <label>ที่อยู่ปัจจุบันในประเทศไทย / Current Address in Thailand</label>
                <textarea class="form-control" name="thailandAddress" required rows="2" placeholder="Condo/House number, Street, Sub-district, District, Province"></textarea>
            </div>
        `;
    } else if (serviceType === 'visa-tm30') {
        titleEl.innerHTML = '<i class="fa-solid fa-hotel text-primary"></i> บริการแจ้งที่พักอาศัยคนต่างด้าว ตม.30 (TM.30 Address Notification)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อเจ้าบ้าน / ผู้จัดการอาคาร / Landlord Name</label>
                    <input type="text" class="form-control" name="landlordName" required placeholder="นายสมศักดิ์ มั่นคง" value="${currentUser ? currentUser.fullName : ''}">
                </div>
                <div class="form-group">
                    <label>ชื่อชาวต่างชาติผู้เข้าพัก / Foreign Tenant Name</label>
                    <input type="text" class="form-control" name="tenantName" required placeholder="Alex Smith">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขพาสปอร์ตผู้เช่า / Tenant Passport No.</label>
                    <input type="text" class="form-control" name="tenantPassport" required placeholder="P98765432">
                </div>
                <div class="form-group">
                    <label>วันที่เริ่มเข้าพัก / Check-in Date</label>
                    <input type="date" class="form-control" name="checkinDate" required>
                </div>
            </div>
            <div class="form-group">
                <label>ที่ตั้งสถานที่พักอาศัย / Accommodation Property Address</label>
                <textarea class="form-control" name="propertyAddress" required rows="2" placeholder="ที่อยู่ห้องพัก คอนโด หรือบ้านเช่า"></textarea>
            </div>
        `;
    } else if (serviceType === 'outbound-evisa') {
        titleEl.innerHTML = '<i class="fa-solid fa-plane-departure text-primary"></i> ชุดเอกสารขอ eVisa และบริการจองคิวสถานทูต';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ประเทศปลายทางที่ต้องการขอวีซ่า / Destination Country</label>
                    <input type="text" class="form-control" name="destinationCountry" required placeholder="เช่น ญี่ปุ่น, สหราชอาณาจักร, เชงเก้น (ฝรั่งเศส/เยอรมนี), ออสเตรเลีย">
                </div>
                <div class="form-group">
                    <label>ประเภทวีซ่า / Visa Category</label>
                    <select class="form-control" name="visaType">
                        <option value="วีซ่าท่องเที่ยว (Tourist Visa)">วีซ่าท่องเที่ยว (Tourist Visa)</option>
                        <option value="วีซ่าธุรกิจ (Business Visa)">วีซ่าธุรกิจ (Business Visa)</option>
                        <option value="วีซ่านักเรียน/ดูงาน (Student/Training Visa)">วีซ่านักเรียน/ดูงาน (Student/Training Visa)</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>วันที่คาดว่าจะเดินทาง / Travel Date</label>
                    <input type="date" class="form-control" name="travelDate" required>
                </div>
                <div class="form-group">
                    <label>จำนวนผู้เดินทาง / Number of Applicants</label>
                    <input type="number" class="form-control" name="applicantCount" min="1" value="1" required>
                </div>
            </div>
        `;
    } else if (serviceType === 'sso-enrollment') {
        titleEl.innerHTML = '<i class="fa-solid fa-user-plus text-primary"></i> สมัครประกันสังคม มาตรา 39 / 40 (Self-Enrollment)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>มาตราที่ต้องการสมัคร / SSO Article</label>
                    <select class="form-control" name="ssoArticle">
                        <option value="มาตรา 40 (สำหรับฟรีแลนซ์/ผู้ประกอบอาชีพอิสระ)">มาตรา 40 (ฟรีแลนซ์/อาชีพอิสระ)</option>
                        <option value="มาตรา 39 (สำหรับผู้เคยเป็นลูกจ้าง ม.33 ลาออกจากงานไม่เกิน 6 เดือน)">มาตรา 39 (เคยเป็นผู้ประกันตน ม.33)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>ทางเลือกความคุ้มครอง (ม.40)</label>
                    <select class="form-control" name="planChoice">
                        <option value="ทางเลือกที่ 1 (จ่าย 70 บ./ด. - คุ้มครองเจ็บป่วย ทุพพลภาพ เสียชีวิต)">ทางเลือกที่ 1 (จ่าย 70 บ./ด.)</option>
                        <option value="ทางเลือกที่ 2 (จ่าย 100 บ./ด. - เพิ่มเงินบำเหน็จชราภาพ)">ทางเลือกที่ 2 (จ่าย 100 บ./ด.)</option>
                        <option value="ทางเลือกที่ 3 (จ่าย 300 บ./ด. - เพิ่มเงินสงเคราะห์บุตร)">ทางเลือกที่ 3 (จ่าย 300 บ./ด.)</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>เลขบัตรประชาชนผู้สมัคร / Personal ID Card</label>
                <input type="text" class="form-control" name="idCardNumber" required placeholder="13 หลัก" maxlength="13">
            </div>
        `;
    } else if (serviceType === 'sso-hospital') {
        titleEl.innerHTML = '<i class="fa-solid fa-hospital-user text-primary"></i> ยื่นคำขอเปลี่ยนสถานพยาบาลประกันสังคม (Hospital Change)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>เลขบัตรประชาชน / ID Card Number</label>
                    <input type="text" class="form-control" name="idCardNumber" required placeholder="13 หลัก" maxlength="13">
                </div>
                <div class="form-group">
                    <label>โรงพยาบาลเดิม / Current Hospital</label>
                    <input type="text" class="form-control" name="currentHospital" placeholder="ระบุชื่อโรงพยาบาลเดิม">
                </div>
            </div>
            <div class="form-group">
                <label>โรงพยาบาลใหม่ที่ต้องการเลือก (ระบุอันดับ 1-3)</label>
                <input type="text" class="form-control" name="desiredHospitals" required placeholder="เช่น 1. รพ.ราชวิถี, 2. รพ.เลิดสิน, 3. รพ.ตากสิน">
            </div>
            <div class="form-group">
                <label>เหตุผลการขอเปลี่ยนสถานพยาบาล</label>
                <select class="form-control" name="reason">
                    <option value="เปลี่ยนประจำปี (ระหว่าง 16 ธ.ค. - 31 มี.ค.)">เปลี่ยนประจำปี (ช่วงเปิดระบบ)</option>
                    <option value="ย้ายที่อยู่หรือย้ายสถานที่ทำงาน">ย้ายที่อยู่หรือย้ายสถานที่ทำงาน</option>
                </select>
            </div>
        `;
    } else if (serviceType === 'sso-claims') {
        titleEl.innerHTML = '<i class="fa-solid fa-hand-holding-dollar text-primary"></i> บริการยื่นเบิกสิทธิประโยชน์ประกันสังคม (Claims Concierge)';
        fieldsHtml = `
            <div class="form-group">
                <label>ประเภทสิทธิประโยชน์ที่ต้องการยื่นเบิก / Claim Type</label>
                <select class="form-control" name="claimType">
                    <option value="เงินชดเชยกรณีว่างงาน / ลาออกจากงาน">เงินชดเชยกรณีว่างงาน / ลาออกจากงาน</option>
                    <option value="เงินสงเคราะห์กรณีคลอดบุตร และค่าตรวจครรภ์">เงินสงเคราะห์กรณีคลอดบุตร</option>
                    <option value="เงินสงเคราะห์บุตร (รายเดือน)">เงินสงเคราะห์บุตร (รายเดือน)</option>
                    <option value="เงินทดแทนกรณีประสบอันตรายหรือเจ็บป่วย">เงินทดแทนกรณีเจ็บป่วย/ทุพพลภาพ</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขบัตรประชาชนผู้ยื่น / Applicant ID</label>
                    <input type="text" class="form-control" name="idCardNumber" required placeholder="13 หลัก" maxlength="13">
                </div>
                <div class="form-group">
                    <label>บัญชีธนาคารรับเงินโอนพร้อมเพย์ (เลขบัตร ปชช.)</label>
                    <input type="text" class="form-control" name="promptPayPhone" required placeholder="เบอร์โทรหรือเลขบัญชี">
                </div>
            </div>
        `;
    } else if (serviceType === 'personal-income-tax') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-lines text-primary"></i> บริการยื่นแบบภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90 / 91 / 94';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ประเภทแบบภาษีที่ยื่น / Tax Form</label>
                    <select class="form-control" name="taxFormType">
                        <option value="ภ.ง.ด.91 (สำหรับผู้มีเงินได้เฉพาะเงินเดือน ม.40(1))">ภ.ง.ด.91 (เงินเดือนอย่างเดียว)</option>
                        <option value="ภ.ง.ด.90 (สำหรับผู้มีเงินได้หลายประเภท/ฟรีแลนซ์/ค้าขาย)">ภ.ง.ด.90 (เงินเดือน+ฟรีแลนซ์/ค้าขาย)</option>
                        <option value="ภ.ง.ด.94 (ภาษีเงินได้ครึ่งปี)">ภ.ง.ด.94 (ภาษีครึ่งปี)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>ปีภาษีที่ยื่น / Tax Year</label>
                    <input type="text" class="form-control" name="taxYear" value="2568" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>รายได้รวมทั้งปีโดยประมาณ (บาท) / Est. Annual Income</label>
                    <input type="number" class="form-control" name="annualIncome" required placeholder="500000">
                </div>
                <div class="form-group">
                    <label>ภาษีหัก ณ ที่จ่าย ที่ถูกหักไว้แล้ว (บาท)</label>
                    <input type="number" class="form-control" name="withholdingTaxPaid" placeholder="15000" value="0">
                </div>
            </div>
            <div class="form-group">
                <label>รายการลดหย่อนภาษีเพิ่มเติม (เช่น ดอกเบี้ยกู้บ้าน, ประกันชีวิต, กองทุน SSF/RMF, บริจาค)</label>
                <textarea class="form-control" name="deductions" rows="2" placeholder="ระบุรายการลดหย่อนเพื่อคำนวณขอคืนภาษีสูงสุด"></textarea>
            </div>
        `;
    } else if (serviceType === 'vat-registration') {
        titleEl.innerHTML = '<i class="fa-solid fa-receipt text-primary"></i> จดทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20) & นำส่ง ภ.พ.30';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อผู้ประกอบการ / บริษัทจำกัด</label>
                <input type="text" class="form-control" name="businessName" required placeholder="บริษัท ฟินเทค โซลูชั่น จำกัด">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>เลขประจำตัวผู้เสียภาษี 13 หลัก</label>
                    <input type="text" class="form-control" name="taxId" required placeholder="01055xxxxxxxx" maxlength="13">
                </div>
                <div class="form-group">
                    <label>บริการที่ต้องการทำรายการ</label>
                    <select class="form-control" name="vatService">
                        <option value="ยื่นขอจดทะเบียนภาษีมูลค่าเพิ่ม (แบบ ภ.พ.01 เพื่อรับ ภ.พ.20)">ยื่นขอจดทะเบียน ภ.พ.20 ครั้งแรก</option>
                        <option value="ยื่นแบบแสดงรายการภาษีมูลค่าเพิ่มรายเดือน (ภ.พ.30)">ยื่นแบบ ภ.พ.30 ประจำเดือน</option>
                        <option value="แจ้งเปลี่ยนแปลงข้อมูลทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.09)">แจ้งเปลี่ยนแปลงข้อมูล ภ.พ.09</option>
                    </select>
                </div>
            </div>
        `;
    } else if (serviceType === 'withholding-tax-cert') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-contract text-primary"></i> ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (ใบ 50 ทวิ) พร้อม e-Signature';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อผู้จ่ายเงิน (ผู้หักภาษี)</label>
                    <input type="text" class="form-control" name="payerName" required placeholder="บริษัท ผู้จ่ายเงิน จำกัด">
                </div>
                <div class="form-group">
                    <label>เลขผู้เสียภาษีของผู้จ่ายเงิน</label>
                    <input type="text" class="form-control" name="payerTaxId" required placeholder="13 หลัก" maxlength="13">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อผู้รับเงิน (ผู้ถูกหักภาษี)</label>
                    <input type="text" class="form-control" name="payeeName" required placeholder="ชื่อฟรีแลนซ์ หรือ บริษัทผู้รับเงิน">
                </div>
                <div class="form-group">
                    <label>เลขประจำตัวผู้รับเงิน</label>
                    <input type="text" class="form-control" name="payeeId" required placeholder="13 หลัก" maxlength="13">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>จำนวนเงินได้ที่จ่าย (บาท)</label>
                    <input type="number" class="form-control" name="grossAmount" required placeholder="10000">
                </div>
                <div class="form-group">
                    <label>อัตราภาษีที่หัก (%)</label>
                    <select class="form-control" name="taxRate">
                        <option value="3% (ค่าจ้างทำของ/ค่าบริการ/วิชาชีพอิสระ)">3% (ค่าจ้างทำของ/บริการ)</option>
                        <option value="1% (ค่าขนส่ง)">1% (ค่าขนส่ง)</option>
                        <option value="5% (ค่าเช่าทรัพย์สิน)">5% (ค่าเช่าทรัพย์สิน)</option>
                    </select>
                </div>
            </div>
        `;
    } else if (serviceType === 'direct-sales-ocpb') {
        titleEl.innerHTML = '<i class="fa-solid fa-cart-shopping text-primary"></i> ยื่นขอใบอนุญาตตลาดแบบตรง / ขายตรง (สคบ. OCPB Direct Marketing)';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อนิติบุคคล / ร้านค้าออนไลน์</label>
                <input type="text" class="form-control" name="shopName" required placeholder="บริษัท อีคอมเมิร์ซ สยาม จำกัด">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ช่องทางการขาย (เว็บไซต์ / App / Social)</label>
                    <input type="text" class="form-control" name="salesChannels" required placeholder="www.myshop.com, Shopee, TikTok Shop">
                </div>
                <div class="form-group">
                    <label>นโยบายการคืนสินค้า (วัน)</label>
                    <input type="number" class="form-control" name="returnWindow" value="7" required>
                </div>
            </div>
            <div class="form-group">
                <label>ประเภทสินค้าที่จัดจำหน่าย</label>
                <textarea class="form-control" name="productDetails" required rows="2" placeholder="ระบุหมวดหมู่สินค้า เช่น เครื่องสำอาง อาหารเสริม อุปกรณ์ไอที"></textarea>
            </div>
        `;
    } else if (serviceType === 'music-copyright') {
        titleEl.innerHTML = '<i class="fa-solid fa-music text-primary"></i> บริการขอใบอนุญาตเผยแพร่ลิขสิทธิ์เพลงสำหรับสถานประกอบการ/คาเฟ่';
        fieldsHtml = `
            <div class="form-group">
                <label>ชื่อร้านค้า / คาเฟ่ / ร้านอาหาร</label>
                <input type="text" class="form-control" name="venueName" required placeholder="The Coffee Club Cafe">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ขนาดพื้นที่ร้าน (ตารางเมตร)</label>
                    <input type="number" class="form-control" name="areaSqMeters" required placeholder="80">
                </div>
                <div class="form-group">
                    <label>ประเภทการเปิดเพลง</label>
                    <select class="form-control" name="playbackType">
                        <option value="เปิดเพลงสร้างบรรยากาศ (Background Music - สตรีมมิ่ง/เปิดแผ่น)">เปิดเพลงสร้างบรรยากาศ (Background Music)</option>
                        <option value="ดนตรีสด / การแสดงสด (Live Music Performance)">ดนตรีสด / Live Performance</option>
                    </select>
                </div>
            </div>
        `;
    } else if (serviceType === 'signboard-tax') {
        titleEl.innerHTML = '<i class="fa-solid fa-store text-primary"></i> บริการคำนวณและยื่นชำระภาษีป้าย (Signboard Tax ภ.ป.1)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ประเภทข้อความบนป้าย / Signboard Category</label>
                    <select class="form-control" name="signType">
                        <option value="ป้ายอักษรไทยล้วน (อัตรา 5 บ./500 ตร.ซม.)">ป้ายอักษรไทยล้วน</option>
                        <option value="ป้ายอักษรไทยปนอักษรต่างประเทศ/ภาพ (อัตรา 26 บ./500 ตร.ซม.)">ป้ายอักษรไทยปนต่างประเทศ / โลโก้</option>
                        <option value="ป้ายอักษรต่างประเทศล้วน หรือไทยอยู่ใต้ต่างประเทศ (อัตรา 50 บ./500 ตร.ซม.)">ป้ายต่างประเทศล้วน</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>สำนักงานเขต / เทศบาล ที่ตั้งป้าย</label>
                    <input type="text" class="form-control" name="municipality" required placeholder="เช่น สำนักงานเขตพญาไท หรือ เทศบาลเมืองหัวหิน">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ความกว้างป้าย (เซนติเมตร)</label>
                    <input type="number" class="form-control" name="widthCm" required placeholder="200">
                </div>
                <div class="form-group">
                    <label>ความยาวป้าย (เซนติเมตร)</label>
                    <input type="number" class="form-control" name="lengthCm" required placeholder="100">
                </div>
            </div>
            <div class="form-group">
                <label>ข้อความทั้งหมดที่ปรากฏบนป้าย</label>
                <input type="text" class="form-control" name="signText" required placeholder="เช่น ร้านอาหาร อารีย์ คาเฟ่ Aree Cafe">
            </div>
        `;
    } else if (serviceType === 'dbd-name-ecert') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-shield text-primary"></i> จองชื่อบริษัท & ขอหนังสือรับรองนิติบุคคล e-Certificate (DBD)';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อนิติบุคคล / Company Name</label>
                    <input type="text" class="form-control" name="companyName" required placeholder="บริษัท เทค แอดวานซ์ จำกัด">
                </div>
                <div class="form-group">
                    <label>เลขทะเบียนนิติบุคคล 13 หลัก (กรณีขอ e-Cert)</label>
                    <input type="text" class="form-control" name="companyId" placeholder="01055xxxxxxxx">
                </div>
            </div>
            <div class="form-group">
                <label>รายการเอกสารที่ต้องการรับรอง</label>
                <select class="form-control" name="certScope">
                    <option value="หนังสือรับรองนิติบุคคล (ฉบับล่าสุด) พร้อมวัตถุประสงค์">หนังสือรับรองนิติบุคคล (e-Certificate) + วัตถุประสงค์</option>
                    <option value="หนังสือรับรอง + บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)">หนังสือรับรอง + รายชื่อผู้ถือหุ้น (บอจ.5)</option>
                    <option value="จองชื่อนิติบุคคลใหม่ 3 อันดับ">จองชื่อนิติบุคคลใหม่ 3 อันดับ</option>
                </select>
            </div>
        `;
    } else if (serviceType === 'legal-form-gen') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-lines text-primary"></i> ระบบสร้างเอกสารสัญญาทางกฎหมายสำเร็จรูป (Legal Form Generator)';
        fieldsHtml = `
            <div class="form-group">
                <label>ประเภทสัญญาที่ต้องการร่าง / Agreement Template</label>
                <select class="form-control" name="contractTemplate">
                    <option value="สัญญาจะซื้อจะขาย / สัญญาซื้อขายสินค้า">สัญญาจะซื้อจะขาย / สัญญาซื้อขายสินค้า</option>
                    <option value="สัญญาเช่าอสังหาริมทรัพย์ / อาคารพาณิชย์">สัญญาเช่าอสังหาริมทรัพย์ / อาคารพาณิชย์</option>
                    <option value="สัญญากู้ยืมเงินและหนังสือรับสภาพหนี้">สัญญากู้ยืมเงินและหนังสือรับสภาพหนี้</option>
                    <option value="สัญญาบริการและรับจ้างทำของ">สัญญาบริการและรับจ้างทำของ</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อคู่สัญญาฝ่ายที่ 1 (ผู้ให้เช่า/ผู้ขาย/ผู้ว่าจ้าง)</label>
                    <input type="text" class="form-control" name="partyAName" required placeholder="คุณกิตติศักดิ์ มั่งมี" value="${currentUser ? currentUser.fullName : ''}">
                </div>
                <div class="form-group">
                    <label>ชื่อคู่สัญญาฝ่ายที่ 2 (ผู้เช่า/ผู้ซื้อ/ผู้รับจ้าง)</label>
                    <input type="text" class="form-control" name="partyBName" required placeholder="คุณวิชัย ชัยชนะ">
                </div>
            </div>
            <div class="form-group">
                <label>มูลค่าสัญญาและข้อตกลงสำคัญ / Key Terms & Amount</label>
                <textarea class="form-control" name="contractTerms" required rows="2" placeholder="เช่น ค่าเช่าเดือนละ 25,000 บาท สัญญามีกำหนด 1 ปี เงินประกัน 2 เดือน"></textarea>
            </div>
        `;
    } else if (serviceType === 'legal-poa-dispatch') {
        titleEl.innerHTML = '<i class="fa-solid fa-signature text-primary"></i> จัดทำหนังสือมอบอำนาจเฉพาะทาง & จัดส่งฉบับจริงพร้อมปิดอากรแสตมป์';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ชื่อผู้มอบอำนาจ / Grantor Name</label>
                    <input type="text" class="form-control" name="grantorName" required placeholder="นายก้องเกียรติ สว่างไสว" value="${currentUser ? currentUser.fullName : ''}">
                </div>
                <div class="form-group">
                    <label>ชื่อผู้รับมอบอำนาจ / Attorney-in-fact</label>
                    <input type="text" class="form-control" name="agentName" required placeholder="นายธนกร ประสิทธิ์ผล">
                </div>
            </div>
            <div class="form-group">
                <label>อำนาจที่มอบให้ดำเนินการ (เช่น โอนกรรมสิทธิ์ที่ดิน, ดำเนินคดี, จัดการธุรกรรมธนาคาร)</label>
                <textarea class="form-control" name="powersGranted" required rows="2" placeholder="ระบุกิจการที่มอบอำนาจโดยละเอียด"></textarea>
            </div>
            <div class="form-group">
                <label>ที่อยู่จัดส่งหนังสือมอบอำนาจฉบับจริง (EMS)</label>
                <textarea class="form-control" name="shippingAddress" required rows="2" placeholder="ที่อยู่จัดส่งเอกสารตัวจริง"></textarea>
            </div>
        `;
    } else if (serviceType === 'remote-esign-contract') {
        titleEl.innerHTML = '<i class="fa-solid fa-handshake text-primary"></i> ร่างสัญญา NDA / สัญญาจ้างงาน / เช่า พร้อมระบบลงนามอิเล็กทรอนิกส์ e-Sign';
        fieldsHtml = `
            <div class="form-group">
                <label>ประเภทสัญญา / Contract Type</label>
                <select class="form-control" name="contractType">
                    <option value="สัญญารักษาความลับทางการค้า (Non-Disclosure Agreement - NDA)">สัญญารักษาความลับทางการค้า (NDA)</option>
                    <option value="สัญญาจ้างแรงงานและจ้างบุคลากร (Employment Agreement)">สัญญาจ้างแรงงาน (Employment Agreement)</option>
                    <option value="สัญญาเช่าเชิงพาณิชย์ (Commercial Lease Agreement)">สัญญาเช่าเชิงพาณิชย์ (Commercial Lease)</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>อีเมลผู้ลงนามฝ่ายที่ 1 (Party 1 Email)</label>
                    <input type="email" class="form-control" name="party1Email" required placeholder="ceo@company.com" value="${currentUser ? currentUser.email : ''}">
                </div>
                <div class="form-group">
                    <label>อีเมลผู้ลงนามฝ่ายที่ 2 (Party 2 Email)</label>
                    <input type="email" class="form-control" name="party2Email" required placeholder="partner@othercompany.com">
                </div>
            </div>
            <div class="form-group">
                <label>รายละเอียดเงื่อนไขพิเศษที่ต้องการใส่ในสัญญา</label>
                <textarea class="form-control" name="customClauses" rows="2" placeholder="เช่น ระยะเวลาคุ้มครองความลับ 2 ปี, ค่าตอบแทนพิเศษ"></textarea>
            </div>
        `;
    } else if (serviceType === 'notary-translation-hub') {
        titleEl.innerHTML = '<i class="fa-solid fa-stamp text-primary"></i> บริการ Notary Public รับรองเอกสาร & แปลเอกสารกฎหมายส่งคืนไปรษณีย์';
        fieldsHtml = `
            <div class="form-row">
                <div class="form-group">
                    <label>ประเภทเอกสารที่ต้องการรับรอง</label>
                    <select class="form-control" name="docType">
                        <option value="หนังสือรับรองบริษัท / บริคณห์สนธิ แปลภาษาอังกฤษพร้อมรับรอง">หนังสือรับรอง DBD / งบการเงิน</option>
                        <option value="สูติบัตร / ทะเบียนบ้าน / บัตรประชาชน / ใบเปลี่ยนชื่อ">เอกสารทะเบียนราษฎร์ (สูติบัตร/ทะเบียนบ้าน)</option>
                        <option value="เอกสารสัญญาทางธุรกิจ / สัญญาซื้อขาย / โนตารีรับรองลายมือชื่อ">เอกสารสัญญา / รับรองลายมือชื่อ Notary</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>ภาษาที่ต้องการแปล</label>
                    <select class="form-control" name="translationLanguage">
                        <option value="ไทย -> อังกฤษ (Thai to English)">ไทย -> อังกฤษ (Thai to English)</option>
                        <option value="อังกฤษ -> ไทย (English to Thai)">อังกฤษ -> ไทย (English to Thai)</option>
                        <option value="ไทย -> จีน / ญี่ปุ่น (Thai to Chinese/Japanese)">ไทย -> จีน / ญี่ปุ่น</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>ที่อยู่จัดส่งเอกสารรับรองฉบับจริงคืนทางไปรษณีย์ด่วน (Courier Return Address)</label>
                <textarea class="form-control" name="returnAddress" required rows="2" placeholder="ระบุที่อยู่และเบอร์โทรศัพท์ผู้รับเอกสารฉบับรับรอง"></textarea>
            </div>
        `;
    }

    fieldsContainer.innerHTML = fieldsHtml;
    document.getElementById('wizard-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('landing-section').classList.add('hidden');
}

let activeVaultAttachmentUrl = null;

async function autoFillServiceFromVault() {
    if (!currentUser) {
        alert("กรุณาเข้าสู่ระบบเพื่อใช้งานการดึงข้อมูลอัตโนมัติจาก Keep Vault");
        return;
    }

    const form = document.getElementById('service-wizard-form');
    if (!form) return;

    // Fetch user's latest vault documents
    let vaultDocs = [];
    try {
        const vRes = await fetch('/api/vault/documents', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        });
        if (vRes.ok) {
            const vData = await vRes.json();
            vaultDocs = vData.documents || [];
        }
    } catch (e) {
        console.warn("Vault fetch error:", e);
    }

    // Clean up previous indicators
    form.querySelectorAll('.autofill-tag, .remaining-tag').forEach(el => el.remove());
    form.querySelectorAll('input, select, textarea').forEach(el => {
        el.classList.remove('input-autofilled', 'input-remaining-required');
    });

    let autoFilledCount = 0;
    let remainingCount = 0;
    let firstRemainingEl = null;

    const allInputs = form.querySelectorAll('input:not([type="hidden"]):not([type="file"]):not([type="submit"]), select, textarea');

    allInputs.forEach(input => {
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        
        // Find associated label text
        const formGroup = input.closest('.form-group') || input.parentElement;
        const labelEl = formGroup ? formGroup.querySelector('label') : null;
        const labelText = labelEl ? labelEl.innerText.toLowerCase() : '';
        const combined = `${name} ${id} ${placeholder} ${labelText}`;

        let filled = false;

        // 1. National ID (13 digits)
        if (currentUser.nationalId && (
            combined.includes('idcard') || combined.includes('nationalid') || combined.includes('citizenid') ||
            combined.includes('thaiid') || combined.includes('เลขบัตร') || combined.includes('บัตรประชาชน') ||
            combined.includes('เลขประจำตัวประชาชน')
        )) {
            input.value = currentUser.nationalId;
            filled = true;
        }
        // 2. Full Name
        else if (currentUser.fullName && (
            combined.includes('fullname') || combined.includes('applicant') || combined.includes('insuredname') ||
            combined.includes('ownername') || combined.includes('liquidatorname') || combined.includes('citizenname') ||
            (combined.includes('name') && !combined.includes('company') && !combined.includes('choice') && !combined.includes('auditor') && !combined.includes('brand')) ||
            combined.includes('ชื่อ-นามสกุล') || combined.includes('ชื่อผู้ขอ') || combined.includes('ชื่อผู้เอาประกัน') ||
            combined.includes('ชื่อเจ้าของ')
        )) {
            input.value = currentUser.fullName;
            filled = true;
        }
        // 3. Phone Number
        else if (currentUser.phone && (
            combined.includes('phone') || combined.includes('tel') || combined.includes('mobile') ||
            combined.includes('เบอร์โทร') || combined.includes('โทรศัพท์')
        )) {
            input.value = currentUser.phone;
            filled = true;
        }
        // 4. Email
        else if (currentUser.email && (
            combined.includes('email') || combined.includes('อีเมล')
        )) {
            input.value = currentUser.email;
            filled = true;
        }
        // 5. Company Name
        else if (currentUser.companyName && (
            combined.includes('companyname') || combined.includes('juristicname') || combined.includes('corpname') ||
            combined.includes('ชื่อบริษัท') || combined.includes('ชื่อนิติบุคคล')
        )) {
            input.value = currentUser.companyName;
            filled = true;
        }
        // 6. Tax ID / Registration Number
        else if (currentUser.taxId && (
            combined.includes('taxid') || combined.includes('registrationnumber') || combined.includes('tin') ||
            combined.includes('เลขทะเบียนนิติบุคคล') || combined.includes('เลขประจำตัวผู้เสียภาษี') ||
            combined.includes('เลขจดทะเบียน')
        )) {
            input.value = currentUser.taxId;
            filled = true;
        }
        // 7. Address
        else if (currentUser.address && (
            combined.includes('address') || combined.includes('location') || combined.includes('headoffice') ||
            combined.includes('ที่อยู่') || combined.includes('ที่ตั้ง')
        )) {
            input.value = currentUser.address;
            filled = true;
        }

        if (filled) {
            autoFilledCount++;
            input.classList.add('input-autofilled');
            if (labelEl) {
                const tag = document.createElement('span');
                tag.className = 'autofill-tag';
                tag.innerHTML = '<i class="fa-solid fa-circle-check"></i> ดึงจาก Vault';
                labelEl.appendChild(tag);
            }
        } else {
            // Check if input is empty and required
            if (!input.value.trim() && input.hasAttribute('required')) {
                remainingCount++;
                input.classList.add('input-remaining-required');
                if (labelEl) {
                    const tag = document.createElement('span');
                    tag.className = 'remaining-tag';
                    tag.innerHTML = '<i class="fa-solid fa-pen"></i> กรุณากรอกช่องนี้';
                    labelEl.appendChild(tag);
                }
                if (!firstRemainingEl) {
                    firstRemainingEl = input;
                }
            }
        }
    });

    // Auto-attach Vault documents if matching
    let attachedDocTitle = null;
    if (vaultDocs.length > 0) {
        let matchingDoc = null;
        if (activeServiceType && (activeServiceType.includes('car') || activeServiceType.includes('tax') || activeServiceType.includes('vehicle') || activeServiceType.includes('plate') || activeServiceType.includes('spec') || activeServiceType.includes('transfer'))) {
            matchingDoc = vaultDocs.find(d => d.docType === 'VEHICLE_BOOK') || vaultDocs.find(d => d.docType === 'THAI_ID');
        } else if (activeServiceType && (activeServiceType.includes('company') || activeServiceType.includes('dbd') || activeServiceType.includes('efiling') || activeServiceType.includes('audit'))) {
            matchingDoc = vaultDocs.find(d => d.docType === 'COMPANY_AFFIDAVIT') || vaultDocs.find(d => d.docType === 'TAX_CARD') || vaultDocs.find(d => d.docType === 'THAI_ID');
        } else if (activeServiceType && (activeServiceType.includes('visa') || activeServiceType.includes('evisa') || activeServiceType.includes('tm30') || activeServiceType.includes('90day'))) {
            matchingDoc = vaultDocs.find(d => d.docType === 'PASSPORT') || vaultDocs.find(d => d.docType === 'THAI_ID');
        } else {
            matchingDoc = vaultDocs.find(d => d.docType === 'THAI_ID') || vaultDocs[0];
        }

        if (matchingDoc) {
            attachedDocTitle = matchingDoc.title;
            activeVaultAttachmentUrl = matchingDoc.fileUrl;
            const statusEl = document.getElementById('file-upload-status');
            if (statusEl) {
                statusEl.innerHTML = `
                    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; padding: 8px 12px; margin-top: 6px; color: #10b981; font-weight: 600; display: inline-flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-file-circle-check"></i> แนบเอกสารจาก Keep Vault: ${matchingDoc.title}
                    </div>
                `;
            }
        }
    }

    // Show feedback notification
    const feedbackEl = document.getElementById('vault-autofill-feedback');
    const feedbackText = document.getElementById('vault-autofill-feedback-text');
    const remainingBadge = document.getElementById('vault-remaining-fields-count');

    if (feedbackEl && feedbackText) {
        let text = `ดึงข้อมูลให้คุณอัตโนมัติ ${autoFilledCount} ช่องเรียบร้อยแล้ว!`;
        if (attachedDocTitle) {
            text += ` พร้อมแนบเอกสาร (${attachedDocTitle})`;
        }
        if (remainingCount > 0) {
            text += ` — กรุณากรอกเฉพาะช่องที่มีกรอบสีส้มด้านล่าง (${remainingCount} ช่อง)`;
        } else {
            text += ` — ข้อมูลครบถ้วนสมบูรณ์ พร้อมส่งคำขอทันที!`;
        }
        feedbackText.innerText = text;
        if (remainingBadge) remainingBadge.innerText = `${remainingCount}`;
        feedbackEl.classList.remove('hidden');
    }

    // Smoothly focus first remaining unfilled field
    if (firstRemainingEl) {
        firstRemainingEl.focus();
        firstRemainingEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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

    if (activeVaultAttachmentUrl && !currentUploadFile) {
        orderPayload.documentUrl = activeVaultAttachmentUrl;
    }

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
        
        // Add to cart instead of immediate payment overlay
        addToCart(order.id, translateServiceType(order.serviceType), order.price);
        
        // Reset the form inputs
        form.reset();
        document.getElementById('wizard-file-upload').value = '';
        currentUploadFile = null;
        document.getElementById('file-upload-status').innerHTML = '';
        
        if (confirm("✓ เพิ่มข้อมูลคำขอลงในตะกร้าสินค้าสำเร็จแล้ว! ต้องการเปิดตะกร้าสินค้าเพื่อชำระเงินเลยหรือไม่?")) {
            openCartModal();
        } else {
            showSection('dashboard');
        }
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
        
        clearCart();
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

            let actions = '';
            if (o.status === 'PAID') {
                actions = `<button class="btn btn-outline btn-sm" onclick="updateAdminOrderStatus(${o.id}, 'PROCESSING')" style="color:#0ea5e9; border-color:#0ea5e9;">ตรวจสอบคำขอ</button>`;
            } else if (o.status === 'PROCESSING') {
                actions = `
                    <button class="btn btn-success btn-sm" onclick="approveAdminOrder(${o.id})"><i class="fa-solid fa-circle-check"></i> อนุมัติคำขอ</button>
                    <button class="btn btn-danger btn-sm" onclick="updateAdminOrderStatus(${o.id}, 'FAILED')">ปฏิเสธ</button>
                `;
            } else if (o.status === 'COMPLETED') {
                actions = `<a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-eye"></i> ดูใบคำขออนุมัติ</a>`;
            }

            html += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding:12px 10px; font-family:monospace; color:#64748b;">#${o.id}</td>
                    <td style="padding:12px 10px; font-weight:600; color:#0f172a;">${o.clerkUserId}</td>
                    <td style="padding:12px 10px;"><strong style="color:#0f172a;">${translateServiceType(o.serviceType)}</strong></td>
                    <td style="padding:12px 10px;">${stripeBadge}</td>
                    <td style="padding:12px 10px;">${statusText}</td>
                    <td style="padding:12px 10px;"><div style="display:flex; gap:5px;">${actions}</div></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
        populatePurchasedServices(orders);
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
        case 'policy-endorsement': return 'INSURANCE_POLICY_ENDORSEMENT';
        case 'voluntary-insurance': return 'INSURANCE_VOLUNTARY_MOTOR';
        case 'vehicle-tax-renewal': return 'VEHICLE_TAX_RENEWAL';
        case 'overdue-tax-fines': return 'VEHICLE_OVERDUE_TAX_FINES';
        case 'vehicle-poa': return 'VEHICLE_POWER_OF_ATTORNEY';
        case 'plate-replacement': return 'VEHICLE_PLATE_REPLACEMENT';
        case 'book-replacement': return 'VEHICLE_BOOK_REPLACEMENT';
        case 'spec-alteration': return 'VEHICLE_SPEC_ALTERATION';
        case 'province-transfer': return 'VEHICLE_PROVINCE_TRANSFER';
        case 'visa-90day': return 'VISA_90DAY_REPORTING';
        case 'visa-tm30': return 'VISA_TM30_NOTIFICATION';
        case 'outbound-evisa': return 'VISA_OUTBOUND_APPLICATION_PACK';
        case 'sso-enrollment': return 'SSO_ARTICLE_39_40_ENROLLMENT';
        case 'sso-hospital': return 'SSO_HOSPITAL_CHANGE';
        case 'sso-claims': return 'SSO_COMPENSATION_CLAIMS';
        case 'personal-income-tax': return 'TAX_PERSONAL_INCOME_EFILING';
        case 'vat-registration': return 'TAX_VAT_REGISTRATION_SUBMISSION';
        case 'withholding-tax-cert': return 'TAX_WITHHOLDING_CERT_50TAWI';
        case 'direct-sales-ocpb': return 'LICENSE_DIRECT_SALES_OCPB';
        case 'music-copyright': return 'LICENSE_MUSIC_COPYRIGHT';
        case 'signboard-tax': return 'LICENSE_SIGNBOARD_TAX';
        case 'dbd-name-ecert': return 'DBD_NAME_RESERVATION_ECERT';
        case 'legal-form-gen': return 'LEGAL_FORM_GENERATION';
        case 'legal-poa-dispatch': return 'LEGAL_POA_DISPATCH';
        case 'remote-esign-contract': return 'LEGAL_REMOTE_ESIGN_CONTRACT';
        case 'notary-translation-hub': return 'LEGAL_NOTARY_TRANSLATION_HUB';
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
        case 'INSURANCE_POLICY_ENDORSEMENT': return 'แจ้งแก้ไข/สลักหลังกรมธรรม์ พ.ร.บ. & ประกันภัย';
        case 'INSURANCE_VOLUNTARY_MOTOR': return 'ประกันภัยรถยนต์ภาคสมัครใจ (ชั้น 1, 2+, 3+, 3)';
        case 'VEHICLE_TAX_RENEWAL': return 'ต่อภาษีรถยนต์ประจำปี & รับป้ายภาษีหน้ารถ (DLT)';
        case 'VEHICLE_OVERDUE_TAX_FINES': return 'ชำระภาษีค้างย้อนหลัง & เคลียร์ค่าปรับจราจร';
        case 'VEHICLE_POWER_OF_ATTORNEY': return 'สร้างหนังสือมอบอำนาจงานขนส่ง DLT (Auto POA)';
        case 'VEHICLE_PLATE_REPLACEMENT': return 'ขอแผ่นป้ายทะเบียนใหม่ (สูญหาย/ชำรุด)';
        case 'VEHICLE_BOOK_REPLACEMENT': return 'ขอสมุดคู่มือจดทะเบียนใหม่ (สูญหาย/ชำรุด/เต็ม)';
        case 'VEHICLE_SPEC_ALTERATION': return 'แจ้งเปลี่ยนสีรถ / ดัดแปลงสภาพรถยนต์';
        case 'VEHICLE_PROVINCE_TRANSFER': return 'ย้ายทะเบียนรถข้ามจังหวัด (ปลายทาง)';
        case 'VISA_90DAY_REPORTING': return 'รายงานตัว 90 วันออนไลน์ (ตม.47 / TM.47)';
        case 'VISA_TM30_NOTIFICATION': return 'แจ้งที่พักอาศัยคนต่างด้าว ตม.30 (TM.30)';
        case 'VISA_OUTBOUND_APPLICATION_PACK': return 'ชุดเตรียมเอกสารขอ eVisa และจองคิวสถานทูต';
        case 'SSO_ARTICLE_39_40_ENROLLMENT': return 'สมัครประกันสังคม มาตรา 39 / มาตรา 40';
        case 'SSO_HOSPITAL_CHANGE': return 'ยื่นคำขอเปลี่ยนโรงพยาบาลประกันสังคม';
        case 'SSO_COMPENSATION_CLAIMS': return 'ยื่นเบิกเงินสงเคราะห์บุตร / คลอดบุตร / ว่างงาน (SSO)';
        case 'TAX_PERSONAL_INCOME_EFILING': return 'ยื่นแบบภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90 / 91 / 94';
        case 'TAX_VAT_REGISTRATION_SUBMISSION': return 'จดทะเบียน ภ.พ.20 & ยื่นแบบ ภ.พ.30 ประจำเดือน';
        case 'TAX_WITHHOLDING_CERT_50TAWI': return 'ออกหนังสือรับรองการหักภาษี ณ ที่จ่าย (50 ทวิ)';
        case 'LICENSE_DIRECT_SALES_OCPB': return 'ขอใบอนุญาตตลาดแบบตรง / ขายตรง (สคบ.)';
        case 'LICENSE_MUSIC_COPYRIGHT': return 'ใบอนุญาตเผยแพร่ลิขสิทธิ์เพลงสำหรับร้านค้า/สถานบริการ';
        case 'LICENSE_SIGNBOARD_TAX': return 'คำนวณและยื่นชำระภาษีป้าย (ภ.ป.1)';
        case 'DBD_NAME_RESERVATION_ECERT': return 'จองชื่อนิติบุคคล & ขอหนังสือรับรอง e-Certificate (DBD)';
        case 'LEGAL_FORM_GENERATION': return 'สร้างเอกสารสัญญาทางกฎหมายสำเร็จรูป (e-Contract)';
        case 'LEGAL_POA_DISPATCH': return 'จัดทำหนังสือมอบอำนาจเฉพาะทาง & ปิดอากรแสตมป์ส่ง EMS';
        case 'LEGAL_REMOTE_ESIGN_CONTRACT': return 'ร่างสัญญา NDA / สัญญาจ้าง / สัญญาเช่า พร้อม e-Sign';
        case 'LEGAL_NOTARY_TRANSLATION_HUB': return 'โนตารีพับลิค (Notary Public) & แปลเอกสารรับรอง';
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
    
    const targetTab = document.getElementById('admin-tab-' + tabName);
    if (targetTab) targetTab.classList.remove('hidden');

    if (window.event && window.event.currentTarget && window.event.currentTarget.classList) {
        window.event.currentTarget.classList.add('active');
    }
    const tabBtn = document.querySelector(`.admin-tab-btn[onclick*="${tabName}"]`);
    if (tabBtn) tabBtn.classList.add('active');
    
    if (tabName === 'sr-management-tab') {
        loadAdminServiceRequests();
    } else if (tabName === 'users-tab') {
        loadAdminUsers();
    } else if (tabName === 'orders-tab') {
        loadAdminOrders();
    } else if (tabName === 'purchased-services-tab') {
        loadAdminPurchasedServices();
    } else if (tabName === 'sla-pricing-tab' || tabName === 'cms-services-tab') {
        loadAdminServices();
        loadAdminServiceHistory();
    } else if (tabName === 'admin-permissions-tab') {
        loadAdminStaffUsers();
    } else if (tabName === 'settings-tab') {
        loadAdminConfig();
    }
}

function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

let allAdminUsers = [];

function loadAdminUsers() {
    fetch('/api/admin/users', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => res.json())
    .then(users => {
        allAdminUsers = users;
        renderAdminUsers(users);
    })
    .catch(err => console.error("Error loading users list:", err));
}

function filterAdminUsers() {
    const searchVal = document.getElementById('admin-user-search-input').value.toLowerCase().trim();
    if (!searchVal) {
        renderAdminUsers(allAdminUsers);
        return;
    }
    const filtered = allAdminUsers.filter(u => 
        (u.fullName && u.fullName.toLowerCase().includes(searchVal)) ||
        (u.email && u.email.toLowerCase().includes(searchVal)) ||
        (u.phone && u.phone.includes(searchVal)) ||
        (u.nationalId && u.nationalId.includes(searchVal)) ||
        (u.companyName && u.companyName.toLowerCase().includes(searchVal))
    );
    renderAdminUsers(filtered);
}

function renderAdminUsers(users) {
    const tbody = document.getElementById('admin-users-tbody');
    if (!tbody) return;
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;" class="text-muted">ไม่พบข้อมูลลูกค้า</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    users.forEach(u => {
        const isBanned = !!u.banned;
        const statusBadge = isBanned 
            ? '<span class="badge" style="background:#ef4444; color:#fff; font-weight:700; font-size:11px; padding:3px 8px; border-radius:4px;"><i class="fa-solid fa-ban"></i> BANNED (ถูกระงับ)</span>'
            : '<span class="badge" style="background:#10b981; color:#fff; font-weight:700; font-size:11px; padding:3px 8px; border-radius:4px;"><i class="fa-solid fa-circle-check"></i> ACTIVE (ปกติ)</span>';

        const roleBadge = u.role === 'ADMIN'
            ? '<span class="badge" style="background:#8b5cf6; color:#fff; font-size:10px; padding:2px 6px;">ADMIN</span>'
            : '<span class="badge" style="background:#334155; color:#cbd5e1; font-size:10px; padding:2px 6px;">CUSTOMER</span>';

        const pdpaBadge = u.pdpaConsented
            ? '<span class="text-success" style="font-size:11px;" title="ยินยอม PDPA แล้ว"><i class="fa-solid fa-shield-check"></i> PDPA</span>'
            : '<span class="text-muted" style="font-size:11px;"><i class="fa-solid fa-shield-xmark"></i> Non-PDPA</span>';

        const is2fa = (u.twoFactorEnabled !== false);
        const twoFaBadge = is2fa
            ? '<span class="badge badge-success" style="font-size:10px; padding:2px 6px;"><i class="fa-solid fa-lock"></i> 2FA ON</span>'
            : '<span class="badge badge-danger" style="font-size:10px; padding:2px 6px;"><i class="fa-solid fa-lock-open"></i> 2FA OFF</span>';

        const banBtn = isBanned
            ? `<button class="btn btn-sm btn-success" onclick="toggleBanCustomer(${u.id}, true, '${escapeQuotes(u.fullName || u.email)}')" style="padding:4px 8px; font-size:11px; font-weight:600;"><i class="fa-solid fa-unlock"></i> ปลดแบน</button>`
            : `<button class="btn btn-sm btn-danger" onclick="toggleBanCustomer(${u.id}, false, '${escapeQuotes(u.fullName || u.email)}')" style="padding:4px 8px; font-size:11px; font-weight:600;"><i class="fa-solid fa-ban"></i> แบนบัญชี</button>`;

        const actions = `
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-sm btn-primary" onclick="openAdminMessageModal(${u.id}, '${escapeQuotes(u.fullName || u.email)}', '${escapeQuotes(u.email)}')" style="padding:4px 8px; font-size:11px;" title="ส่งข้อความ/อีเมล">
                    <i class="fa-solid fa-paper-plane"></i> ข้อความ
                </button>
                ${banBtn}
                <button class="btn btn-sm btn-outline" onclick="viewCustomerFullDetails(${u.id})" style="padding:4px 8px; font-size:11px;" title="ดูข้อมูลทั้งหมด">
                    <i class="fa-solid fa-eye"></i> รายละเอียด
                </button>
                <button class="btn btn-sm btn-outline" onclick="deleteUserAccount(${u.id})" style="padding:4px 8px; font-size:11px; color:#ef4444; border-color:rgba(239,68,68,0.4);" title="ลบผู้ใช้">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:12px 8px; font-size:12px; font-family:monospace; color:#64748b;">#${u.id}</td>
                <td style="padding:12px 10px;">
                    <strong style="color:#0f172a; font-size:13.5px;">${u.fullName || '-'}</strong> ${roleBadge}
                    <div style="font-size:12px; color:#64748b; margin-top:2px;">${u.email}</div>
                </td>
                <td style="padding:12px 10px;">
                    <div style="font-size:12.5px; color:#334155;"><i class="fa-solid fa-phone" style="font-size:11px; color:#d97706; margin-right:4px;"></i> ${u.phone || '-'}</div>
                    <div style="font-size:11.5px; color:#64748b; font-family:monospace; margin-top:2px;">ปชช: ${u.nationalId || '-'}</div>
                </td>
                <td style="padding:12px 10px;">
                    <div style="font-size:12.5px; color:#2563eb; font-weight:600;">${u.companyName || '-'}</div>
                    <div style="font-size:11.5px; color:#64748b; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${u.address || '-'}">${u.address || '-'}</div>
                </td>
                <td style="padding:12px 10px; text-align:center;">
                    <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
                        ${twoFaBadge}
                        ${pdpaBadge}
                    </div>
                </td>
                <td style="padding:12px 10px; text-align:center;">${statusBadge}</td>
                <td style="padding:12px 10px; text-align:center;">${actions}</td>
            </tr>
        `;
    });
}

function toggleBanCustomer(userId, currentBanned, userName) {
    let reason = '';
    if (!currentBanned) {
        reason = prompt(`ระบุเหตุผลในการระงับการใช้งาน (Ban) บัญชีคุณ ${userName}:`, "ละเมิดเงื่อนไขการใช้บริการ หรือข้อมูลเอกสารไม่ถูกต้อง");
        if (reason === null) return; // User cancelled
    } else {
        if (!confirm(`คุณต้องการปลดแบน (Unban) บัญชีคุณ ${userName} ให้กลับมาใช้งานได้ตามปกติหรือไม่?`)) return;
    }

    const params = new URLSearchParams();
    if (reason) params.append('reason', reason);

    fetch(`/api/admin/users/${userId}/ban?${params.toString()}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถเปลี่ยนสถานะบัญชีได้");
        return res.json();
    })
    .then(updated => {
        alert(`${updated.banned ? '🚫 ระงับการใช้งาน (Banned)' : '✓ ปลดแบน (Unbanned)'} บัญชีเรียบร้อยแล้ว!`);
        loadAdminUsers();
    })
    .catch(err => alert(err.message));
}

function openAdminMessageModal(userId, name, email) {
    document.getElementById('msg-target-user-id').value = userId;
    document.getElementById('msg-target-user-display').value = `${name} (${email})`;
    document.getElementById('msg-subject-input').value = '';
    document.getElementById('msg-content-input').value = '';
    document.getElementById('admin-message-customer-modal').classList.remove('hidden');
}

function closeAdminMessageModal() {
    document.getElementById('admin-message-customer-modal').classList.add('hidden');
}

function submitAdminMessageToUser(e) {
    e.preventDefault();
    const userId = document.getElementById('msg-target-user-id').value;
    const channel = document.getElementById('msg-channel-select').value;
    const subject = document.getElementById('msg-subject-input').value.trim();
    const message = document.getElementById('msg-content-input').value.trim();

    if (!subject || !message) {
        alert("กรุณากรอกหัวข้อเรื่องและข้อความ");
        return;
    }

    fetch(`/api/admin/users/${userId}/send-message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({ channel, subject, message })
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถส่งข้อความได้");
        return res.json();
    })
    .then(data => {
        alert(`✓ ส่งข้อความแจ้งเตือนถึง ${data.recipient} สำเร็จ!`);
        closeAdminMessageModal();
    })
    .catch(err => alert(err.message));
}

function viewCustomerFullDetails(userId) {
    const u = allAdminUsers.find(item => item.id === userId);
    if (!u) return;

    const modalBody = document.getElementById('customer-details-modal-body');
    const registeredDate = u.createdAt ? new Date(u.createdAt).toLocaleString('th-TH') : '-';

    modalBody.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; border-bottom:1px solid #e2e8f0; padding-bottom:15px;">
            <div style="display:flex; align-items:center; gap:14px;">
                <div style="width:48px; height:48px; border-radius:50%; background:#d97706; color:#fff; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold;">
                    ${(u.fullName || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="margin:0; font-size:18px; color:#0f172a; font-weight:800;">${u.fullName || '-'}</h3>
                    <span style="font-size:12.5px; color:#64748b;">${u.email}</span>
                </div>
            </div>
            <div>
                ${u.banned 
                    ? '<span class="badge badge-danger" style="padding:6px 12px; font-size:12px;"><i class="fa-solid fa-ban"></i> BANNED (ถูกระงับ)</span>' 
                    : '<span class="badge badge-success" style="padding:6px 12px; font-size:12px;"><i class="fa-solid fa-circle-check"></i> ACTIVE</span>'}
            </div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
                <span style="font-size:11.5px; color:#64748b; display:block;">เบอร์โทรศัพท์:</span>
                <strong style="color:#0f172a; font-size:13.5px;">${u.phone || '-'}</strong>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
                <span style="font-size:11.5px; color:#64748b; display:block;">เลขประจำตัวประชาชน (13 หลัก):</span>
                <strong style="color:#0f172a; font-size:13.5px; font-family:monospace;">${u.nationalId || '-'}</strong>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
                <span style="font-size:11.5px; color:#64748b; display:block;">ชื่อนิติบุคคล / บริษัท:</span>
                <strong style="color:#2563eb; font-size:13.5px;">${u.companyName || '-'}</strong>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
                <span style="font-size:11.5px; color:#64748b; display:block;">เลขผู้เสียภาษี (Tax ID):</span>
                <strong style="color:#0f172a; font-size:13.5px; font-family:monospace;">${u.taxId || '-'}</strong>
            </div>
        </div>

        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px; margin-bottom:20px;">
            <span style="font-size:11.5px; color:#64748b; display:block; margin-bottom:4px;">ที่อยู่ตามทะเบียนบ้าน / จัดส่งเอกสาร:</span>
            <p style="margin:0; font-size:13px; color:#334155; line-height:1.5;">${u.address || 'ยังไม่มีการระบุที่อยู่'}</p>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px; color:#64748b; border-top:1px solid #e2e8f0; padding-top:15px;">
            <span>วันที่ลงทะเบียน: <strong style="color:#0f172a;">${registeredDate}</strong></span>
            <div style="display:flex; gap:10px;">
                <button class="btn btn-primary btn-sm" onclick="closeCustomerDetailsModal(); openAdminMessageModal(${u.id}, '${escapeQuotes(u.fullName || u.email)}', '${escapeQuotes(u.email)}')">
                    <i class="fa-solid fa-paper-plane"></i> ส่งข้อความ
                </button>
                <button class="btn btn-outline btn-sm" onclick="closeCustomerDetailsModal()" style="border-color:#cbd5e1; color:#334155;">ปิด</button>
            </div>
        </div>
    `;

    document.getElementById('admin-customer-details-modal').classList.remove('hidden');
}

function closeCustomerDetailsModal() {
    document.getElementById('admin-customer-details-modal').classList.add('hidden');
}

// ==========================================
// Service Request (SR) Management Suite
// ==========================================
let allAdminServiceRequests = [];

function loadAdminServiceRequests() {
    const tbody = document.getElementById('admin-sr-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;" class="text-muted">กำลังโหลดรายการคำขอ SR...</td></tr>';

    fetch('/api/admin/service-requests', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => res.json())
    .then(srList => {
        allAdminServiceRequests = srList;
        
        // Update metric counters
        const totalEl = document.getElementById('metric-sr-total');
        const processingEl = document.getElementById('metric-sr-processing');
        const completedEl = document.getElementById('metric-sr-completed');
        const slaExpiredEl = document.getElementById('metric-sr-sla-expired');

        const processingCount = srList.filter(s => s.status === 'PROCESSING' || s.status === 'PAID').length;
        const completedCount = srList.filter(s => s.status === 'COMPLETED').length;
        const slaExpiredCount = srList.filter(s => s.isSlaExpired && s.status !== 'COMPLETED').length;

        if (totalEl) totalEl.innerText = `${srList.length} รายการ`;
        if (processingEl) processingEl.innerText = `${processingCount} รายการ`;
        if (completedEl) completedEl.innerText = `${completedCount} รายการ`;
        if (slaExpiredEl) slaExpiredEl.innerText = `${slaExpiredCount} รายการ`;

        renderAdminServiceRequests(srList);
    })
    .catch(err => console.error("Error loading service requests:", err));
}

function filterServiceRequests() {
    const statusVal = document.getElementById('sr-status-filter').value;
    const searchVal = document.getElementById('sr-search-input').value.toLowerCase().trim();

    let filtered = allAdminServiceRequests;
    if (statusVal) {
        filtered = filtered.filter(s => s.status === statusVal);
    }
    if (searchVal) {
        filtered = filtered.filter(s => 
            s.srNumber.toLowerCase().includes(searchVal) ||
            s.serviceTitle.toLowerCase().includes(searchVal) ||
            (s.customerName && s.customerName.toLowerCase().includes(searchVal)) ||
            (s.customerEmail && s.customerEmail.toLowerCase().includes(searchVal)) ||
            (s.customerPhone && s.customerPhone.includes(searchVal))
        );
    }
    renderAdminServiceRequests(filtered);
}

function renderAdminServiceRequests(srList) {
    const tbody = document.getElementById('admin-sr-tbody');
    if (!tbody) return;

    if (!srList || srList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;" class="text-muted">ไม่พบคำขอบริการ SR ที่ตรงกับเงื่อนไข</td></tr>';
        return;
    }

    let html = '';
    srList.forEach(s => {
        let statusBadge = '';
        if (s.status === 'COMPLETED') statusBadge = '<span class="badge badge-success"><i class="fa-solid fa-circle-check"></i> อนุมัติแล้ว</span>';
        else if (s.status === 'PROCESSING') statusBadge = '<span class="badge badge-primary"><i class="fa-solid fa-spinner fa-spin"></i> ยื่นภาครัฐแล้ว</span>';
        else if (s.status === 'PAID') statusBadge = '<span class="badge badge-warning" style="background:#d97706; color:#fff;"><i class="fa-solid fa-money-bill-check"></i> ชำระแล้ว</span>';
        else if (s.status === 'CANCELLED_REFUNDED') statusBadge = '<span class="badge badge-danger"><i class="fa-solid fa-rotate-left"></i> ยกเลิก/คืนเงิน</span>';
        else statusBadge = '<span class="badge" style="background:#64748b; color:#fff;">รอชำระ</span>';

        // SLA tag
        let slaTag = '';
        if (s.status === 'COMPLETED') {
            slaTag = `<span style="font-size:11px; color:#10b981;"><i class="fa-solid fa-check"></i> เสร็จสิ้นตามกำหนด</span>`;
        } else if (s.isSlaExpired) {
            slaTag = `<span class="badge" style="background:#ef4444; color:#fff; font-size:10px; padding:3px 6px;"><i class="fa-solid fa-triangle-exclamation"></i> พ้นกำหนด SLA (${s.slaDays} วัน)</span><div style="font-size:10px; color:#f87171; margin-top:2px;">เข้าเกณฑ์คืนเงิน 100%</div>`;
        } else {
            slaTag = `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:10.5px; padding:2px 6px;">⏱️ เหลือ ${s.daysRemaining} วัน (SLA ${s.slaDays} วัน)</span>`;
        }

        // Attachment
        const docBadge = s.documentUrl 
            ? `<a href="${s.documentUrl}" target="_blank" class="btn btn-outline btn-xs" style="font-size:10.5px; padding:3px 6px; color:#38bdf8; border-color:rgba(56,189,248,0.4);"><i class="fa-solid fa-paperclip"></i> เอกสารแนบ</a>`
            : `<span class="text-muted" style="font-size:11px;">-</span>`;

        const sJson = encodeURIComponent(JSON.stringify(s));

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:12px 10px;">
                    <strong style="color:#d97706; font-size:12.5px; font-family:monospace;">${s.srNumber}</strong>
                    <div style="font-size:11px; color:#64748b;">#ID: ${s.id}</div>
                </td>
                <td style="padding:12px 10px;">
                    <strong style="color:#0f172a; font-size:13.5px;">${s.customerName}</strong>
                    <div style="font-size:11.5px; color:#64748b;">${s.customerPhone}</div>
                </td>
                <td style="padding:12px 10px;">
                    <div style="font-weight:600; color:#2563eb; font-size:13px;">${s.serviceTitle}</div>
                    <div style="font-size:11.5px; color:#d97706; font-weight:700;">฿${Number(s.price).toLocaleString('th-TH', {minimumFractionDigits:2})}</div>
                </td>
                <td style="padding:12px 10px; text-align:center;">
                    ${slaTag}
                </td>
                <td style="padding:12px 10px;">
                    ${docBadge}
                </td>
                <td style="padding:12px 10px; text-align:center;">
                    ${statusBadge}
                </td>
                <td style="padding:12px 10px; text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                        <button class="btn btn-sm btn-primary" onclick="openSrActionModalByData('${sJson}')" style="padding:4px 10px; font-size:11.5px; font-weight:600;">
                            <i class="fa-solid fa-gavel"></i> จัดการ SR
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="openAdminMessageModal(${s.customerId || 0}, '${escapeQuotes(s.customerName)}', '${escapeQuotes(s.customerEmail)}')" style="padding:4px 8px; font-size:11px; border-color:#cbd5e1; color:#334155;" title="ส่งข้อความแจ้งลูกค้า">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function openSrActionModalByData(encodedData) {
    const s = JSON.parse(decodeURIComponent(encodedData));
    document.getElementById('sr-modal-order-id').value = s.id;
    document.getElementById('sr-modal-ticket-id').innerText = s.srNumber;
    document.getElementById('sr-modal-customer-name').innerText = `${s.customerName} (${s.customerEmail})`;
    document.getElementById('sr-modal-service-name').innerText = s.serviceTitle;
    document.getElementById('sr-modal-status-select').value = s.status;
    document.getElementById('sr-modal-doc-url').value = s.officialDocumentUrl || '';
    document.getElementById('sr-modal-note').value = '';
    document.getElementById('admin-sr-action-modal').classList.remove('hidden');
}

function closeSrActionModal() {
    document.getElementById('admin-sr-action-modal').classList.add('hidden');
}

function submitSrAction(e) {
    e.preventDefault();
    const orderId = document.getElementById('sr-modal-order-id').value;
    const status = document.getElementById('sr-modal-status-select').value;
    const officialDocumentUrl = document.getElementById('sr-modal-doc-url').value.trim();
    const adminNote = document.getElementById('sr-modal-note').value.trim();
    const notifyCustomer = document.getElementById('sr-modal-notify-customer').checked;

    const params = new URLSearchParams({
        status,
        officialDocumentUrl,
        adminNote,
        notifyCustomer: notifyCustomer.toString()
    });

    fetch(`/api/admin/service-requests/${orderId}/update-status?${params.toString()}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถอัปเดตสถานะคำขอได้");
        return res.json();
    })
    .then(updated => {
        alert("✓ อัปเดตสถานะคำขอ SR และส่งการแจ้งเตือนเรียบร้อยแล้ว!");
        closeSrActionModal();
        loadAdminServiceRequests();
        loadAdminOrders();
    })
    .catch(err => alert(err.message));
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

function populateProfileFields() {
    if (!currentUser) return;

    // Avatar & Header Info
    const avatarEl = document.getElementById('profile-avatar-initials');
    const headerName = document.getElementById('profile-header-name');
    const headerEmail = document.getElementById('profile-header-email');
    
    const nameStr = currentUser.fullName || 'ผู้ใช้งาน';
    if (headerName) headerName.innerText = 'คุณ ' + nameStr;
    if (headerEmail) headerEmail.innerText = currentUser.email || '';
    if (avatarEl) {
        const initials = nameStr.trim().split(' ').map(w => w.charAt(0)).join('').substring(0, 2).toUpperCase() || 'U';
        avatarEl.innerText = initials;
    }

    // Form inputs
    document.getElementById('profile-fullname').value = currentUser.fullName || '';
    document.getElementById('profile-email').value = currentUser.email || '';
    document.getElementById('profile-phone').value = currentUser.phone || '';
    if (document.getElementById('profile-national-id')) {
        document.getElementById('profile-national-id').value = currentUser.nationalId || '';
    }
    if (document.getElementById('profile-company-name')) {
        document.getElementById('profile-company-name').value = currentUser.companyName || '';
    }
    if (document.getElementById('profile-tax-id')) {
        document.getElementById('profile-tax-id').value = currentUser.taxId || '';
    }
    if (document.getElementById('profile-address')) {
        document.getElementById('profile-address').value = currentUser.address || '';
    }
    document.getElementById('profile-role').value = currentUser.role === 'ADMIN' ? 'ผู้ดูแลระบบ (Admin)' : 'บุคคลธรรมดา / นิติบุคคล (Verified Customer)';
    
    const is2fa = (currentUser.twoFactorEnabled !== false);
    const toggleMaster = document.getElementById('profile-2fa-toggle');
    if (toggleMaster) toggleMaster.checked = is2fa;
    
    const isEmail = (currentUser.twoFactorEmail !== false);
    const isSms = !!currentUser.twoFactorSms;
    const isTotp = !!currentUser.twoFactorTotp;
    const isPasskey = !!currentUser.twoFactorPasskey;
    const isLine = !!currentUser.twoFactorLine;

    if (document.getElementById('fa-toggle-email')) document.getElementById('fa-toggle-email').checked = isEmail;
    if (document.getElementById('fa-toggle-sms')) document.getElementById('fa-toggle-sms').checked = isSms;
    if (document.getElementById('fa-toggle-totp')) document.getElementById('fa-toggle-totp').checked = isTotp;
    if (document.getElementById('fa-toggle-passkey')) document.getElementById('fa-toggle-passkey').checked = isPasskey;
    if (document.getElementById('fa-toggle-line')) document.getElementById('fa-toggle-line').checked = isLine;

    update2faMasterUI(is2fa);

    const activeMethods = [];
    if (isEmail) activeMethods.push('Email OTP');
    if (isSms) activeMethods.push('SMS');
    if (isTotp) activeMethods.push('App');
    if (isPasskey) activeMethods.push('Passkey');
    if (isLine) activeMethods.push('LINE');

    const metric2fa = document.getElementById('metric-2fa-status');
    if (metric2fa) {
        if (!is2fa || activeMethods.length === 0) {
            metric2fa.innerText = 'ปิดใช้งาน';
            metric2fa.style.color = '#ef4444';
        } else {
            metric2fa.innerText = 'เปิดใช้งาน (' + activeMethods.join(', ') + ')';
            metric2fa.style.color = '#10b981';
        }
    }
    
    const pdpaDateSpan = document.getElementById('profile-pdpa-date');
    if (currentUser.pdpaConsentDate) {
        const date = new Date(currentUser.pdpaConsentDate);
        pdpaDateSpan.innerText = date.toLocaleString('th-TH');
    } else {
        pdpaDateSpan.innerText = 'ยินยอมตามมาตรฐาน PDPA';
    }
    
    document.getElementById('profile-old-password').value = '';
    document.getElementById('profile-new-password').value = '';
    document.getElementById('profile-confirm-password').value = '';

    // Load Vault count
    loadVaultDocuments();

    // Load Purchased Orders list & metric
    const tbody = document.getElementById('profile-orders-tbody');
    const metricOrders = document.getElementById('metric-orders-count');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">กำลังโหลดประวัติ...</td></tr>';
        
        fetch('/api/orders', {
            headers: { 'Authorization': 'Bearer ' + currentToken }
        })
        .then(res => res.json())
        .then(orders => {
            const purchasedOrders = orders.filter(o => o.status === 'PAID' || o.status === 'PROCESSING' || o.status === 'COMPLETED');
            if (metricOrders) metricOrders.innerText = `${purchasedOrders.length} รายการ`;

            if (purchasedOrders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">ไม่พบประวัติรายการสั่งซื้อที่ชำระเงินแล้ว</td></tr>';
                return;
            }
            
            tbody.innerHTML = '';
            purchasedOrders.reverse().forEach(o => {
                let statusBadge = '';
                if (o.status === 'PAID') statusBadge = '<span class="badge badge-primary">ชำระเงินแล้ว</span>';
                else if (o.status === 'PROCESSING') statusBadge = '<span class="badge badge-primary">กำลังตรวจสอบ</span>';
                else if (o.status === 'COMPLETED') statusBadge = '<span class="badge badge-success">เสร็จสมบูรณ์</span>';
                
                let serviceName = translateServiceType(o.serviceType);
                let actionLink = '';
                if (o.status === 'COMPLETED' && o.officialDocumentUrl) {
                    actionLink = `<a href="${o.officialDocumentUrl}" target="_blank" style="color: var(--success); text-decoration: none; font-weight: 500;"><i class="fa-solid fa-download"></i> ผลอนุมัติ</a>`;
                } else {
                    actionLink = `<a href="/api/orders/${o.id}/document/print" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;"><i class="fa-solid fa-print"></i> เอกสารคำร้อง</a>`;
                }
                
                tbody.innerHTML += `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 12px 8px; font-weight: 600;">#${o.id}</td>
                        <td style="padding: 12px 8px;">${new Date(o.createdAt).toLocaleDateString('th-TH')}</td>
                        <td style="padding: 12px 8px; font-weight: 500;">${serviceName}</td>
                        <td style="padding: 12px 8px; font-weight: 600; color: var(--primary);">${o.price.toLocaleString('th-TH')} ฿</td>
                        <td style="padding: 12px 8px;">${statusBadge}</td>
                        <td style="padding: 12px 8px;">${actionLink}</td>
                    </tr>
                `;
            });
        })
        .catch(err => {
            console.error("Error fetching profile order history:", err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--danger);">ล้มเหลวในการเชื่อมต่อระบบดึงประวัติ</td></tr>';
        });
    }
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    const fullName = document.getElementById('profile-fullname').value;
    const phone = document.getElementById('profile-phone').value;
    const nationalId = document.getElementById('profile-national-id') ? document.getElementById('profile-national-id').value : null;
    const companyName = document.getElementById('profile-company-name') ? document.getElementById('profile-company-name').value : null;
    const taxId = document.getElementById('profile-tax-id') ? document.getElementById('profile-tax-id').value : null;
    const address = document.getElementById('profile-address') ? document.getElementById('profile-address').value : null;
    
    const twoFactorEnabled = document.getElementById('profile-2fa-toggle') ? document.getElementById('profile-2fa-toggle').checked : true;
    const twoFactorEmail = document.getElementById('fa-toggle-email') ? document.getElementById('fa-toggle-email').checked : true;
    const twoFactorSms = document.getElementById('fa-toggle-sms') ? document.getElementById('fa-toggle-sms').checked : false;
    const twoFactorTotp = document.getElementById('fa-toggle-totp') ? document.getElementById('fa-toggle-totp').checked : false;
    const twoFactorPasskey = document.getElementById('fa-toggle-passkey') ? document.getElementById('fa-toggle-passkey').checked : false;
    const twoFactorLine = document.getElementById('fa-toggle-line') ? document.getElementById('fa-toggle-line').checked : false;
    
    const oldPassword = document.getElementById('profile-old-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    if (newPassword || oldPassword || confirmPassword) {
        if (!oldPassword) {
            alert("กรุณากรอกรหัสผ่านปัจจุบันเพื่อยืนยันการเปลี่ยนรหัสผ่าน");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("รหัสผ่านใหม่และรหัสผ่านยืนยันไม่ตรงกัน");
            return;
        }
        if (newPassword.length < 4) {
            alert("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร");
            return;
        }
    }
    
    const payload = {
        email: currentUser.email,
        fullName: fullName,
        phone: phone,
        nationalId: nationalId,
        companyName: companyName,
        taxId: taxId,
        address: address,
        twoFactorEnabled: twoFactorEnabled,
        twoFactorEmail: twoFactorEmail,
        twoFactorSms: twoFactorSms,
        twoFactorTotp: twoFactorTotp,
        twoFactorPasskey: twoFactorPasskey,
        twoFactorLine: twoFactorLine
    };
    
    if (newPassword) {
        payload.oldPassword = oldPassword;
        payload.newPassword = newPassword;
    }
    
    fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || "เกิดข้อผิดพลาดในการอัปเดตข้อมูล"); });
        }
        return res.json();
    })
    .then(updatedUser => {
        alert("อัปเดตข้อมูลโปรไฟล์และการตั้งค่าความปลอดภัย 2FA เรียบร้อยแล้ว!");
        currentUser = updatedUser;
        localStorage.setItem('edocman_user', JSON.stringify(updatedUser));
        checkSession();
        populateProfileFields();
    })
    .catch(err => {
        alert(err.message);
    });
}

function update2faMaster(isEnabled) {
    if (!currentUser) return;
    update2faMasterUI(isEnabled);

    fetch('/api/auth/toggle-2fa-method', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({ method: 'master', enabled: isEnabled })
    })
    .then(res => res.json())
    .then(updatedUser => {
        currentUser = updatedUser;
        localStorage.setItem('edocman_user', JSON.stringify(updatedUser));
        populateProfileFields();
    })
    .catch(err => console.error("Error updating 2fa master:", err));
}

function update2faMasterUI(isEnabled) {
    const label = document.getElementById('profile-2fa-status-label');
    if (label) {
        label.textContent = isEnabled ? "ระบบ 2FA หลัก: เปิดใช้งาน (ON)" : "ระบบ 2FA หลัก: ปิดใช้งาน (OFF)";
        label.style.color = isEnabled ? "#10b981" : "#94a3b8";
    }
    const methodsList = document.getElementById('fa-methods-list');
    if (methodsList) {
        methodsList.style.opacity = isEnabled ? "1" : "0.5";
        methodsList.style.pointerEvents = isEnabled ? "auto" : "none";
    }
}

function toggleSpecific2fa(method, isEnabled) {
    if (!currentUser) return;

    fetch('/api/auth/toggle-2fa-method', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({ method: method, enabled: isEnabled })
    })
    .then(res => res.json())
    .then(updatedUser => {
        currentUser = updatedUser;
        localStorage.setItem('edocman_user', JSON.stringify(updatedUser));
        populateProfileFields();

        const methodNames = {
            'email': 'Email OTP (อีเมล)',
            'sms': 'SMS OTP (เบอร์มือถือ)',
            'totp': 'Authenticator App (TOTP)',
            'passkey': 'Passkey / Biometric (ลายนิ้วมือ & ใบหน้า)',
            'line': 'LINE Push Alert (ไลน์)'
        };
        const mName = methodNames[method] || method;
        alert(`${isEnabled ? '✓ เปิดใช้งาน' : '✕ ปิดใช้งาน'} 2FA ผ่าน ${mName} เรียบร้อยแล้ว!`);
    })
    .catch(err => alert("ล้มเหลวในการบันทึกค่า 2FA"));
}

function testSend2fa(method) {
    if (!currentUser) return;
    if (method === 'email') {
        alert(`📧 ส่งรหัส OTP จำลอง 6 หลักไปยังอีเมล ${currentUser.email} เรียบร้อยแล้ว! รหัสของคุณคือ [ 839201 ]`);
    } else if (method === 'sms') {
        const phone = currentUser.phone || '089-xxx-xxxx';
        alert(`📱 ส่งรหัส SMS OTP จำลอง 6 หลักไปยังเบอร์ ${phone} เรียบร้อยแล้ว! รหัสของคุณคือ [ 471920 ]`);
    }
}

function openTotpSetupModal() {
    const modal = document.getElementById('totp-setup-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeTotpSetupModal() {
    const modal = document.getElementById('totp-setup-modal');
    if (modal) modal.classList.add('hidden');
}

function copyTotpKey() {
    const keyInput = document.getElementById('totp-secret-key');
    if (keyInput) {
        navigator.clipboard.writeText(keyInput.value).then(() => {
            alert("คัดลอก Secret Key ไปยังคลิปบอร์ดแล้ว: " + keyInput.value);
        });
    }
}

function verifyTestTotp() {
    const code = document.getElementById('totp-test-code').value.trim();
    if (!code || code.length !== 6) {
        alert("กรุณากรอกรหัส 6 หลักจากแอป Authenticator");
        return;
    }
    toggleSpecific2fa('totp', true);
    closeTotpSetupModal();
    alert("✓ ยืนยันการผูก Authenticator App สำเร็จ! ระบบเปิดใช้งาน 2FA หมวดนี้แล้ว");
}

function registerPasskeyPrompt() {
    if (confirm("คุณต้องการลงทะเบียน Passkey (Touch ID / Face ID / Windows Hello) สำหรับอุปกรณ์เครื่องนี้หรือไม่?")) {
        toggleSpecific2fa('passkey', true);
        alert("✓ ผูกอุปกรณ์ Biometric Passkey เรียบร้อยแล้ว! คุณสามารถใช้สแกนนิ้ว/ใบหน้าเพื่อยืนยันตัวตนได้ทันที");
    }
}

function connectLinePrompt() {
    if (confirm("เชื่อมต่อบัญชี eDocman กับ LINE Official Account (@edocman_th) เพื่อรับรหัส OTP ทาง LINE?")) {
        toggleSpecific2fa('line', true);
        alert("✓ เชื่อมต่อ LINE Official สำเร็จ! ระบบจะส่งแจ้งเตือนและรหัสเข้าสู่ระบบผ่าน LINE");
    }
}

function sendTestEmails() {
    const email = document.getElementById('test-email-target').value;
    if (!email) {
        alert("กรุณากรอกอีเมลปลายทาง");
        return;
    }
    
    fetch(`/api/admin/test-resend-automations?targetEmail=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => {
        if (!res.ok) {
            throw new Error("ล้มเหลวในการส่งอีเมลทดสอบ");
        }
        return res.json();
    })
    .then(data => {
        alert(data.message);
    })
    .catch(err => {
        alert(err.message);
    });
}

let allPurchasedServices = [];

function populatePurchasedServices(orders) {
    allPurchasedServices = orders.filter(o => o.status === 'PAID' || o.status === 'PROCESSING' || o.status === 'COMPLETED');
    renderPurchasedServices(allPurchasedServices);
}

function renderPurchasedServices(filteredOrders) {
    const tbody = document.getElementById('admin-purchased-services-tbody');
    if (!tbody) return;
    
    if (!filteredOrders || filteredOrders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;" class="text-muted">ไม่มีรายการบริการที่ชำระเงินแล้วในขณะนี้</td></tr>`;
        return;
    }
    
    let html = '';
    filteredOrders.forEach(o => {
        let statusText = '';
        if (o.status === 'PAID') statusText = '<span class="badge badge-primary">ชำระเงินแล้ว (เตรียมส่งเรื่อง)</span>';
        else if (o.status === 'PROCESSING') statusText = '<span class="badge badge-warning">กำลังดำเนินการยื่นแบบ</span>';
        else if (o.status === 'COMPLETED') statusText = '<span class="badge badge-success">อนุมัติเรียบร้อย</span>';
        
        let docText = '';
        if (o.officialDocumentUrl) {
            docText = `<a href="${o.officialDocumentUrl}" target="_blank" class="btn btn-outline btn-sm" style="color:var(--success); border-color:var(--success); padding:2px 6px; font-size:11px;"><i class="fa-solid fa-download"></i> ดาวน์โหลดเอกสาร</a>`;
        } else {
            docText = `<span class="text-muted" style="font-size:11px;"><i class="fa-solid fa-hourglass-half"></i> รอการอัปโหลด</span>`;
        }
        
        let actions = '';
        if (o.status === 'PAID') {
            actions = `
                <button class="btn btn-outline btn-sm" onclick="updateAdminOrderStatus(${o.id}, 'PROCESSING')" style="color:#0ea5e9; border-color:#0ea5e9; padding:2px 6px; font-size:11px;">เริ่มยื่นแบบ</button>
            `;
        } else if (o.status === 'PROCESSING') {
            actions = `
                <button class="btn btn-success btn-sm" onclick="promptUploadOfficialDoc(${o.id})" style="padding:2px 6px; font-size:11px;"><i class="fa-solid fa-upload"></i> อัปโหลด & อนุมัติ</button>
            `;
        } else if (o.status === 'COMPLETED') {
            actions = `<span class="text-success" style="font-size:12px; font-weight:600;"><i class="fa-solid fa-check-double"></i> เสร็จสิ้นแล้ว</span>`;
        }
        
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:12px 10px; font-family:monospace; color:#64748b;">#${o.id}</td>
                <td style="padding:12px 10px;">
                    <div style="font-weight:700; color:#0f172a;">${o.clerkUserId}</div>
                    <div style="font-size:11.5px; color:#64748b;">Customer Account</div>
                </td>
                <td style="padding:12px 10px;"><strong style="color:#0f172a;">${translateServiceType(o.serviceType)}</strong></td>
                <td style="padding:12px 10px; font-weight:700; color:#d97706;">${o.price.toLocaleString()} THB</td>
                <td style="padding:12px 10px;">${statusText}</td>
                <td style="padding:12px 10px;">${docText}</td>
                <td style="padding:12px 10px;"><div style="display:flex; gap:5px;">${actions}</div></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function filterPurchasedServices() {
    const searchVal = document.getElementById('purchased-search-input').value.toLowerCase();
    const filtered = allPurchasedServices.filter(o => {
        const orderIdMatch = o.id.toString().includes(searchVal);
        const customerMatch = o.clerkUserId.toLowerCase().includes(searchVal);
        const serviceMatch = translateServiceType(o.serviceType).toLowerCase().includes(searchVal);
        return orderIdMatch || customerMatch || serviceMatch;
    });
    renderPurchasedServices(filtered);
}

function promptUploadOfficialDoc(orderId) {
    const docUrl = prompt("กรุณาระบุ URL ลิงก์เอกสารอนุมัติราชการที่เป็นทางการ (หรือปล่อยว่างไว้เพื่อระบบจะเจนเนอเรตแบบฟอร์มจำลองให้อัตโนมัติ):");
    if (docUrl === null) return;
    
    let url = `/api/admin/orders/${orderId}/approve`;
    if (docUrl.trim()) {
        url += `?officialDocUrl=${encodeURIComponent(docUrl.trim())}`;
    }
    
    fetch(url, {
        method: 'POST'
    })
    .then(res => res.json())
    .then(() => {
        fetchAdminOrders();
    })
    .catch(err => console.error(err));
}

let cart = [];

function initCart() {
    try {
        const stored = localStorage.getItem('edocman_cart');
        if (stored) {
            cart = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to load cart", e);
    }
    updateCartBadge();
}

function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    if (cart.length > 0) {
        badge.innerText = cart.length;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

function addToCart(id, serviceName, price) {
    if (!cart.some(item => item.id === id)) {
        cart.push({ id, serviceName, price });
        localStorage.setItem('edocman_cart', JSON.stringify(cart));
        updateCartBadge();
    }
}

function openCartModal() {
    const overlay = document.getElementById('cart-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    renderCartItems();
}

// Global scope bindings for inline calls
window.openCartModal = openCartModal;
window.closeCartModal = closeCartModal;
window.removeCartItem = removeCartItem;
window.checkoutCart = checkoutCart;
window.addToCartAndOpen = addToCartAndOpen;
window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;
window.toggleUserRole = toggleUserRole;
window.deleteUserAccount = deleteUserAccount;

function closeCartModal() {
    const overlay = document.getElementById('cart-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function removeCartItem(index) {
    cart.splice(index, 1);
    localStorage.setItem('edocman_cart', JSON.stringify(cart));
    updateCartBadge();
    renderCartItems();
}

function clearCart() {
    cart = [];
    localStorage.removeItem('edocman_cart');
    updateCartBadge();
}

function renderCartItems() {
    const container = document.getElementById('cart-items-container');
    const subtotalText = document.getElementById('cart-total-price');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 30px; color:var(--text-muted);">
                <i class="fa-solid fa-cart-shopping" style="font-size:36px; margin-bottom:10px; display:block;"></i>
                ไม่มีรายการใดๆ ในตะกร้าสินค้าในขณะนี้
            </div>
        `;
        subtotalText.innerText = "0.00";
        document.getElementById('cart-checkout-btn').disabled = true;
        return;
    }
    
    document.getElementById('cart-checkout-btn').disabled = false;
    let html = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        total += item.price;
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); padding:12px 15px; border-radius:8px;">
                <div>
                    <strong style="color:var(--text-light); font-size:14px; display:block;">${item.serviceName}</strong>
                    <span class="text-muted" style="font-size:11px;">Ref Order ID: #${item.id}</span>
                </div>
                <div style="display:flex; align-items:center; gap:15px;">
                    <span style="font-weight:600; color:var(--primary); font-size:14px;">${item.price.toLocaleString()} THB</span>
                    <button class="btn btn-sm btn-danger" onclick="removeCartItem(${index})" style="padding: 2px 8px; font-size: 11px;"><i class="fa-solid fa-trash"></i> ลบ</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    subtotalText.innerText = total.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function checkoutCart() {
    if (cart.length === 0) return;
    
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    const originalText = checkoutBtn.innerHTML;
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> กำลังดำเนินการ...`;
    
    const orderIds = cart.map(item => item.id);
    
    fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({ orderIds: orderIds })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to create unified checkout session");
        return res.json();
    })
    .then(paymentData => {
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = originalText;
        
        closeCartModal();
        
        const orderIdsCsv = orderIds.join(',');
        document.getElementById('payment-target-order-id').value = orderIdsCsv;
        document.getElementById('pay-service-name').innerText = `ตะกร้าบริการ (${cart.length} รายการ)`;
        
        let total = cart.reduce((sum, item) => sum + item.price, 0);
        document.getElementById('pay-service-price').innerText = total.toLocaleString('th-TH');
        
        renderPromptPayQr(total);
        
        document.getElementById('payment-overlay').classList.remove('hidden');
    })
    .catch(err => {
        alert(err.message);
        checkoutBtn.disabled = false;
        checkoutBtn.innerHTML = originalText;
    });
}

function addToCartAndOpen(id, serviceName, price) {
    addToCart(id, serviceName, price);
    openCartModal();
}

function openCreateUserModal() {
    const modal = document.getElementById('create-user-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeCreateUserModal() {
    const modal = document.getElementById('create-user-modal');
    if (modal) modal.classList.add('hidden');
    document.getElementById('create-user-form').reset();
}

function handleCreateUserSubmit(event) {
    event.preventDefault();
    const fullName = document.getElementById('cu-fullname').value;
    const email = document.getElementById('cu-email').value;
    const phone = document.getElementById('cu-phone').value;
    const password = document.getElementById('cu-password').value;
    const role = document.getElementById('cu-role').value;

    fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({ fullName, email, phone, password, role })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error || "สร้างผู้ใช้ไม่สำเร็จ"); });
        }
        return res.json();
    })
    .then(data => {
        alert("✓ สร้างบัญชีผู้ใช้งานสำเร็จเสร็จสิ้น!");
        closeCreateUserModal();
        loadAdminUsers();
    })
    .catch(err => {
        alert("เกิดข้อผิดพลาด: " + err.message);
    });
}

function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'ADMIN' ? 'CUSTOMER' : 'ADMIN';
    if (!confirm(`ยืนยันที่จะสลับสิทธิ์ของผู้ใช้นี้เป็น ${newRole} หรือไม่?`)) return;

    fetch(`/api/admin/users/${userId}/role?role=${newRole}`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถเปลี่ยนสิทธิ์ผู้ใช้ได้");
        return res.json();
    })
    .then(() => {
        loadAdminUsers();
    })
    .catch(err => alert(err.message));
}

function deleteUserAccount(userId) {
    if (!confirm("คุณต้องการลบบัญชีผู้ใช้งานนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) return;

    fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถลบบัญชีผู้ใช้ได้");
        return res.json();
    })
    .then(() => {
        loadAdminUsers();
    })
    .catch(err => alert(err.message));
}

// ==========================================
// Service Prices CMS & History Tracking
// ==========================================
let cmsServices = [];

function loadAdminServices() {
    fetch('/api/admin/prices', {
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลราคาค่าบริการได้");
        return res.json();
    })
    .then(services => {
        cmsServices = services;
        
        // Populate category filter and datalist options
        const categories = [...new Set(services.map(s => s.category).filter(Boolean))];
        
        const filterSelect = document.getElementById('cms-category-filter');
        const currentFilterVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">ทั้งหมด (All Categories)</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            filterSelect.appendChild(opt);
        });
        filterSelect.value = currentFilterVal;

        const datalist = document.getElementById('category-datalist');
        datalist.innerHTML = '';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            datalist.appendChild(opt);
        });

        renderCmsServices();
    })
    .catch(err => {
        console.error("Error loading CMS services:", err);
    });
}

function renderCmsServices() {
    const tbody = document.getElementById('cms-services-tbody');
    const totalCountEl = document.getElementById('admin-sla-total-count');
    if (totalCountEl && cmsServices) {
        totalCountEl.innerText = `${cmsServices.length} รายการ`;
    }

    if (!cmsServices || cmsServices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">กำลังโหลดข้อมูลราคาและ SLA...</td></tr>';
        return;
    }

    const filterVal = document.getElementById('cms-category-filter').value;
    const searchVal = document.getElementById('cms-search-input').value.toLowerCase().trim();

    let filtered = cmsServices;
    if (filterVal) {
        filtered = filtered.filter(s => s.category === filterVal);
    }
    if (searchVal) {
        filtered = filtered.filter(s => 
            s.nameTh.toLowerCase().includes(searchVal) || 
            s.serviceType.toLowerCase().includes(searchVal) || 
            (s.contentTh && s.contentTh.toLowerCase().includes(searchVal))
        );
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;" class="text-muted">ไม่พบข้อมูลบริการที่ตรงกับเงื่อนไขการค้นหา</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(s => {
        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 12px 10px;">
                    <strong style="color: #0f172a; font-size: 13.5px;">${s.nameTh}</strong>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${s.contentTh || '-'}</div>
                </td>
                <td style="padding: 12px 10px;">
                    <span class="badge" style="font-size:11px; background:#e2e8f0; color:#334155; padding: 4px 8px; border-radius: 4px; font-weight:600;">${s.category || 'ทั่วไป'}</span>
                </td>
                <td style="padding: 12px 10px; font-family:monospace; color:#64748b;">
                    <small style="font-size:11.5px;">${s.serviceType}</small>
                </td>
                <td style="padding: 12px 10px; text-align: center;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
                        <input type="number" id="sla-input-${s.serviceType}" value="${s.slaDays || 3}" min="1" max="90" style="width: 55px; text-align: center; background: #ffffff; border: 1.5px solid #cbd5e1; color: #15803d; font-weight: 700; border-radius: 6px; padding: 5px 6px;">
                        <span style="font-size: 12px; color: #64748b; font-weight:500;">วัน</span>
                    </div>
                </td>
                <td style="padding: 12px 10px; text-align: right;">
                    <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px;">
                        <input type="number" id="price-input-${s.serviceType}" value="${s.price}" min="0" step="10" style="width: 90px; text-align: right; background: #ffffff; border: 1.5px solid #cbd5e1; color: #b45309; font-weight: 700; border-radius: 6px; padding: 5px 8px;">
                        <span style="font-size: 12px; color: #64748b; font-weight:500;">฿</span>
                    </div>
                </td>
                <td style="padding: 12px 10px; text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center;">
                        <button type="button" class="btn btn-sm btn-primary" onclick="quickSaveSlaPrice('${s.serviceType}')" style="padding: 5px 10px; font-size: 11.5px; font-weight: 600;" title="บันทึกราคาและ SLA ด่วน">
                            <i class="fa-solid fa-floppy-disk"></i> บันทึก
                        </button>
                        <button type="button" class="btn btn-sm btn-outline" onclick="openEditServiceModal('${s.serviceType}')" style="padding: 5px 8px; font-size: 11.5px; border-color:#cbd5e1; color:#334155;" title="แก้ไขชื่อ หมวดหมู่ และรายละเอียด">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

function quickSaveSlaPrice(serviceType) {
    const s = cmsServices.find(item => item.serviceType === serviceType);
    if (!s) return;

    const slaInput = document.getElementById(`sla-input-${serviceType}`);
    const priceInput = document.getElementById(`price-input-${serviceType}`);
    if (!slaInput || !priceInput) return;

    const newSla = parseInt(slaInput.value, 10);
    const newPrice = parseFloat(priceInput.value);

    if (isNaN(newSla) || newSla < 1) {
        alert("กรุณาระบุจำนวนวัน SLA ให้ถูกต้อง (ตั้งแต่ 1 วันขึ้นไป)");
        return;
    }
    if (isNaN(newPrice) || newPrice < 0) {
        alert("กรุณาระบุอัตราค่าบริการให้ถูกต้อง");
        return;
    }

    const params = new URLSearchParams({
        serviceType: s.serviceType,
        price: newPrice,
        nameTh: s.nameTh,
        category: s.category || 'ทั่วไป',
        contentTh: s.contentTh || '',
        slaDays: newSla
    });

    fetch(`/api/admin/prices/update?${params.toString()}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถบันทึกการแก้ไขได้");
        return res.json();
    })
    .then(updated => {
        s.price = newPrice;
        s.slaDays = newSla;

        slaInput.style.borderColor = '#10b981';
        priceInput.style.borderColor = '#10b981';
        setTimeout(() => {
            slaInput.style.borderColor = '';
            priceInput.style.borderColor = '';
        }, 1500);

        loadAdminServiceHistory();
        loadPublicServicesCatalog();
        alert(`บันทึกราคา (฿${newPrice.toLocaleString('en-US')}) และ SLA (${newSla} วัน) ของ "${s.nameTh}" เรียบร้อยแล้ว!`);
    })
    .catch(err => alert(err.message));
}

function filterCmsServices() {
    renderCmsServices();
}

function loadAdminServiceHistory() {
    fetch('/api/admin/prices/history', {
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลประวัติการแก้ไขราคาได้");
        return res.json();
    })
    .then(historyList => {
        const tbody = document.getElementById('cms-history-tbody');
        if (!historyList || historyList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;" class="text-muted">ไม่มีประวัติการแก้ไขข้อมูลล่าสุด (ย้อนหลัง 6 เดือน)</td></tr>';
            return;
        }

        let html = '';
        historyList.forEach(h => {
            const date = new Date(h.changedAt);
            const dateStr = date.toLocaleString('th-TH', { 
                year: 'numeric', month: 'short', day: 'numeric', 
                hour: '2-digit', minute: '2-digit' 
            });

            // Compile the list of changes
            let changes = [];
            if (h.oldNameTh !== h.newNameTh) {
                changes.push(`ชื่อ: "${h.oldNameTh}" &rarr; "${h.newNameTh}"`);
            }
            if (Number(h.oldPrice) !== Number(h.newPrice)) {
                changes.push(`ราคา: ${Number(h.oldPrice).toLocaleString('th-TH', {minimumFractionDigits:2})} &rarr; ${Number(h.newPrice).toLocaleString('th-TH', {minimumFractionDigits:2})} THB`);
            }
            if (h.oldCategory !== h.newCategory) {
                changes.push(`หมวดหมู่: "${h.oldCategory || 'ทั่วไป'}" &rarr; "${h.newCategory || 'ทั่วไป'}"`);
            }
            if (h.oldContentTh !== h.newContentTh) {
                changes.push(`รายละเอียด: มีการปรับปรุงเนื้อหาคำอธิบาย`);
            }
            if (h.oldSlaDays !== h.newSlaDays) {
                changes.push(`SLA: ${h.oldSlaDays || 5} วัน &rarr; ${h.newSlaDays || 5} วัน`);
            }

            const changesHtml = changes.length > 0 ? changes.join('<br>') : 'ไม่มีการเปลี่ยนแปลงฟิลด์หลัก';

            // Find Th service name by type or use code
            const svc = cmsServices.find(s => s.serviceType === h.serviceType);
            const serviceName = svc ? svc.nameTh : h.serviceType;

            html += `
                <tr>
                    <td style="font-size:12px; white-space:nowrap; vertical-align: top;">${dateStr}</td>
                    <td style="vertical-align: top;"><strong>${serviceName}</strong><br><small class="text-muted">${h.serviceType}</small></td>
                    <td style="font-size:13px; line-height:1.4; vertical-align: top;">${changesHtml}</td>
                    <td style="vertical-align: top;"><span class="badge" style="background:rgba(255,255,255,0.08); color:var(--text-light); font-family:monospace; font-size:11px; padding: 4px 8px; border-radius: 4px;">${h.changedBy}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    })
    .catch(err => {
        console.error("Error loading price history:", err);
    });
}

function openEditServiceModal(serviceType) {
    const s = cmsServices.find(item => item.serviceType === serviceType);
    if (!s) return;

    document.getElementById('edit-service-type').value = s.serviceType;
    document.getElementById('edit-service-name').value = s.nameTh;
    document.getElementById('edit-service-category').value = s.category || 'ทั่วไป';
    document.getElementById('edit-service-price').value = s.price;
    document.getElementById('edit-service-sla').value = s.slaDays || 5;
    document.getElementById('edit-service-content').value = s.contentTh || '';

    document.getElementById('edit-service-modal').classList.remove('hidden');
}

function closeEditServiceModal() {
    document.getElementById('edit-service-modal').classList.add('hidden');
}

function handleEditServiceSubmit(event) {
    event.preventDefault();

    const serviceType = document.getElementById('edit-service-type').value;
    const nameTh = document.getElementById('edit-service-name').value.trim();
    const category = document.getElementById('edit-service-category').value.trim();
    const price = document.getElementById('edit-service-price').value.trim();
    const slaDays = document.getElementById('edit-service-sla').value.trim();
    const contentTh = document.getElementById('edit-service-content').value.trim();

    const params = new URLSearchParams({
        serviceType,
        price,
        nameTh,
        category,
        contentTh,
        slaDays
    });

    fetch(`/api/admin/prices/update?${params.toString()}`, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถบันทึกการแก้ไขบริการได้");
        return res.json();
    })
    .then(() => {
        alert("บันทึกการแก้ไขข้อมูลบริการเรียบร้อยแล้ว");
        closeEditServiceModal();
        loadAdminServices();
        loadAdminServiceHistory();
        loadPublicServicesCatalog();
    })
    .catch(err => {
        alert(err.message);
    });
}

// Attach functions to window scope for HTML click handlers
window.loadAdminServices = loadAdminServices;
window.loadAdminServiceHistory = loadAdminServiceHistory;
window.filterCmsServices = filterCmsServices;
window.openEditServiceModal = openEditServiceModal;
window.closeEditServiceModal = closeEditServiceModal;
window.handleEditServiceSubmit = handleEditServiceSubmit;

// ==========================================
// 3. Sidebar Search & 4. Category Accordions
// ==========================================
function filterDashboardSidebarServices(query) {
    const q = (query || '').toLowerCase().trim();
    const accordions = document.querySelectorAll('.sidebar-category-accordion');
    
    accordions.forEach(acc => {
        const items = acc.querySelectorAll('.sidebar-menu li');
        let matchedCount = 0;
        
        items.forEach(li => {
            const text = li.innerText.toLowerCase();
            if (!q || text.includes(q)) {
                li.style.display = '';
                matchedCount++;
            } else {
                li.style.display = 'none';
            }
        });

        const btn = acc.querySelector('.sidebar-accordion-btn');
        const itemsContainer = acc.querySelector('.sidebar-category-items');

        if (!q) {
            const selectedCat = document.getElementById('sidebar-category-select') ? document.getElementById('sidebar-category-select').value : 'all';
            if (selectedCat === 'all' || acc.dataset.categoryKey === selectedCat) {
                acc.style.display = '';
            } else {
                acc.style.display = 'none';
            }
        } else {
            if (matchedCount > 0) {
                acc.style.display = '';
                if (btn) btn.classList.remove('collapsed');
                if (itemsContainer) itemsContainer.classList.remove('collapsed');
            } else {
                acc.style.display = 'none';
            }
        }
    });
}

function selectSidebarCategoryFilter(catKey) {
    const accordions = document.querySelectorAll('.sidebar-category-accordion');
    accordions.forEach(acc => {
        if (catKey === 'all' || acc.dataset.categoryKey === catKey) {
            acc.style.display = '';
            if (catKey !== 'all') {
                const btn = acc.querySelector('.sidebar-accordion-btn');
                const itemsContainer = acc.querySelector('.sidebar-category-items');
                if (btn) btn.classList.remove('collapsed');
                if (itemsContainer) itemsContainer.classList.remove('collapsed');
            }
        } else {
            acc.style.display = 'none';
        }
    });
}

function toggleSidebarCategory(btn) {
    btn.classList.toggle('collapsed');
    const items = btn.nextElementSibling;
    if (items) {
        items.classList.toggle('collapsed');
    }
}

// ==========================================
// 6. Profile Tabs & Keep Page (Vault)
// ==========================================
function switchProfileSubTab(subTab) {
    const tabs = ['settings', 'vault', 'orders'];
    tabs.forEach(t => {
        const btn = document.getElementById(`ptab-btn-${t}`);
        const content = document.getElementById(`profile-subtab-${t}`);
        if (btn) btn.classList.toggle('active', t === subTab);
        if (content) content.classList.toggle('hidden', t !== subTab);
    });

    if (subTab === 'vault') {
        loadVaultDocuments();
    } else if (subTab === 'orders') {
        loadProfileOrderHistory();
    }
}

let selectedVaultFile = null;

function handleVaultFileSelected(input) {
    if (input.files && input.files[0]) {
        selectedVaultFile = input.files[0];
        const titleInput = document.getElementById('vault-doc-title-input');
        if (titleInput && !titleInput.value) {
            const cleanName = selectedVaultFile.name.replace(/\.[^/.]+$/, "");
            titleInput.value = cleanName;
        }

        // Live Thumbnail preview
        const previewBox = document.getElementById('vault-file-preview-container');
        const previewImg = document.getElementById('vault-file-preview-img');
        const previewName = document.getElementById('vault-file-preview-name');
        const previewSize = document.getElementById('vault-file-preview-size');

        if (previewBox && previewName && previewSize) {
            previewName.innerText = selectedVaultFile.name;
            const sizeMb = (selectedVaultFile.size / (1024 * 1024)).toFixed(2);
            previewSize.innerText = `${sizeMb} MB • พร้อมสำหรับอัปโหลด`;

            if (selectedVaultFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (previewImg) {
                        previewImg.src = e.target.result;
                        previewImg.style.display = 'block';
                    }
                };
                reader.readAsDataURL(selectedVaultFile);
            } else {
                if (previewImg) {
                    previewImg.src = "https://cdn-icons-png.flaticon.com/512/337/337946.png";
                    previewImg.style.display = 'block';
                }
            }
            previewBox.classList.remove('hidden');
        }

        document.getElementById('vault-upload-status').innerHTML = `<span class="text-success"><i class="fa-solid fa-check"></i> พร้อมอัปโหลด: ${selectedVaultFile.name} (${(selectedVaultFile.size/1024/1024).toFixed(2)} MB)</span>`;
    }
}

function clearVaultPreview() {
    selectedVaultFile = null;
    const fileInput = document.getElementById('vault-file-input');
    if (fileInput) fileInput.value = '';
    const previewBox = document.getElementById('vault-file-preview-container');
    if (previewBox) previewBox.classList.add('hidden');
    const statusEl = document.getElementById('vault-upload-status');
    if (statusEl) statusEl.innerHTML = '';
}

function submitVaultUpload() {
    if (!selectedVaultFile) {
        alert("กรุณาเลือกไฟล์เอกสารหรือรูปภาพก่อนกดอัปโหลด");
        return;
    }

    const title = document.getElementById('vault-doc-title-input').value.trim();
    const docType = document.getElementById('vault-doc-type-input').value;
    const statusEl = document.getElementById('vault-upload-status');
    const uploadBtn = document.getElementById('btn-vault-upload');

    const formData = new FormData();
    formData.append('file', selectedVaultFile);
    formData.append('title', title || selectedVaultFile.name);
    formData.append('docType', docType);

    uploadBtn.disabled = true;
    statusEl.innerHTML = `<span class="text-primary"><i class="fa-solid fa-spinner fa-spin"></i> กำลังอัปโหลดและบันทึกลง Keep Vault...</span>`;

    fetch('/api/vault/upload', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + currentToken
        },
        body: formData
    })
    .then(async res => {
        uploadBtn.disabled = false;
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "เกิดข้อผิดพลาดในการอัปโหลด");
        }
        return res.json();
    })
    .then(savedDoc => {
        statusEl.innerHTML = `<span class="text-success"><i class="fa-solid fa-circle-check"></i> บันทึกเอกสารลง Keep Vault สำเร็จ!</span>`;
        clearVaultPreview();
        document.getElementById('vault-doc-title-input').value = "";
        loadVaultDocuments();
    })
    .catch(err => {
        uploadBtn.disabled = false;
        statusEl.innerHTML = `<span class="text-danger"><i class="fa-solid fa-circle-exclamation"></i> ${err.message}</span>`;
    });
}

function loadVaultDocuments() {
    const grid = document.getElementById('vault-documents-grid');
    const counterText = document.getElementById('vault-count-text');
    const navCounter = document.getElementById('nav-vault-count');
    const metricCounter = document.getElementById('metric-vault-count');
    const progressBar = document.getElementById('vault-storage-progress-bar');
    if (!grid) return;

    fetch('/api/vault/documents', {
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถโหลดเอกสารในกล่องเก็บได้");
        return res.json();
    })
    .then(data => {
        const docs = data.documents || [];
        const count = docs.length;
        const max = data.maxLimit || 10;
        const pct = Math.min(100, Math.round((count / max) * 100));

        if (counterText) counterText.innerText = `${count} / ${max} เอกสาร`;
        if (navCounter) navCounter.innerText = `${count}`;
        if (metricCounter) metricCounter.innerText = `${count} / ${max} ไฟล์`;
        if (progressBar) progressBar.style.width = `${pct}%`;

        if (count === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: rgba(15,23,42,0.3); border-radius: 10px; border: 1px dashed var(--border-color);">
                    <i class="fa-solid fa-folder-open text-muted" style="font-size: 42px; margin-bottom: 12px;"></i>
                    <h5 style="color: var(--text-light); margin-bottom: 4px;">กล่องเก็บเอกสารว่างเปล่า</h5>
                    <p style="color: var(--text-muted); font-size: 13px; margin: 0;">คุณสามารถอัปโหลดบัตรประชาชน ทะเบียนบ้าน เล่มทะเบียนรถยนต์ หรือหนังสือรับรองบริษัทไว้ที่นี่ (สูงสุด 10 รูป) เพื่อความสะดวกในการทำธุรกรรม</p>
                </div>
            `;
            return;
        }

        let html = '';
        docs.forEach(doc => {
            const isImg = doc.mimeType && doc.mimeType.startsWith('image/');
            const typeLabel = translateVaultDocType(doc.docType);
            const dateStr = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('th-TH') : '-';

            const thumbContent = isImg && doc.fileUrl
                ? `<img src="${doc.fileUrl}" alt="${doc.title}" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid fa-file-image\\'></i>';">`
                : `<i class="fa-solid fa-file-pdf"></i>`;

            html += `
                <div class="vault-card">
                    <div class="vault-thumb" onclick="openVaultPreview('${doc.title}', '${doc.fileUrl}', '${doc.mimeType}', '${dateStr}')" style="cursor: pointer;">
                        ${thumbContent}
                    </div>
                    <div class="vault-card-body">
                        <span class="vault-card-title" title="${doc.title}">${doc.title}</span>
                        <div class="vault-card-meta">
                            <span class="badge badge-primary" style="font-size: 10px; padding: 2px 6px;">${typeLabel}</span>
                            <span style="display: block; margin-top: 4px;">บันทึกเมื่อ: ${dateStr}</span>
                        </div>
                        <div class="vault-card-actions">
                            <button type="button" class="btn btn-outline btn-sm" style="flex:1; padding: 4px 8px; font-size: 11px;" onclick="openVaultPreview('${doc.title}', '${doc.fileUrl}', '${doc.mimeType}', '${dateStr}')">
                                <i class="fa-solid fa-eye"></i> ดู
                            </button>
                            <a href="${doc.fileUrl}" target="_blank" class="btn btn-outline btn-sm" style="flex:1; padding: 4px 8px; font-size: 11px; text-decoration: none;">
                                <i class="fa-solid fa-download"></i> โหลด
                            </a>
                            <button type="button" class="btn btn-danger btn-sm" style="padding: 4px 8px; font-size: 11px;" onclick="deleteVaultDoc(${doc.id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    })
    .catch(err => {
        grid.innerHTML = `<div style="grid-column:1/-1; color: var(--danger); text-align:center; padding:20px;">${err.message}</div>`;
    });
}

function translateVaultDocType(type) {
    switch (type) {
        case 'THAI_ID': return '🆔 บัตรประชาชน';
        case 'HOUSE_REG': return '🏠 ทะเบียนบ้าน';
        case 'VEHICLE_BOOK': return '🚗 เล่มคู่มือรถ';
        case 'COMPANY_AFFIDAVIT': return '📜 หนังสือรับรอง DBD';
        case 'PASSPORT': return '🛂 หนังสือเดินทาง';
        case 'TAX_CARD': return '🧾 ภ.พ.20 / ภาษี';
        case 'DRIVING_LICENSE': return '🪪 ใบขับขี่';
        default: return '📁 เอกสารทั่วไป';
    }
}

function deleteVaultDoc(id) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเอกสารนี้ออกจากกล่องเก็บ Keep Vault?")) {
        return;
    }

    fetch(`/api/vault/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("ไม่สามารถลบเอกสารได้");
        return res.json();
    })
    .then(() => {
        loadVaultDocuments();
    })
    .catch(err => {
        alert(err.message);
    });
}

function openVaultPreview(title, url, mimeType, uploadDate) {
    const modal = document.getElementById('vault-preview-modal');
    document.getElementById('vault-preview-title').innerHTML = `<i class="fa-solid fa-file-shield text-primary"></i> ${title}`;
    document.getElementById('vault-preview-meta').innerText = `อัปโหลดเมื่อ: ${uploadDate || '-'}`;
    document.getElementById('vault-preview-download-btn').href = url;

    const contentEl = document.getElementById('vault-preview-content');
    const isImg = !mimeType || mimeType.startsWith('image/');
    if (isImg) {
        contentEl.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 6px;" alt="${title}">`;
    } else {
        contentEl.innerHTML = `
            <div style="padding: 40px 20px;">
                <i class="fa-solid fa-file-pdf text-danger" style="font-size: 54px; margin-bottom: 12px;"></i>
                <p style="color: var(--text-light); margin-bottom: 10px;">ไฟล์เอกสาร PDF / เอกสารแนบ</p>
                <a href="${url}" target="_blank" class="btn btn-primary btn-sm"><i class="fa-solid fa-external-link"></i> เปิดดูไฟล์ในแท็บใหม่</a>
            </div>
        `;
    }

    modal.classList.remove('hidden');
}

function closeVaultPreviewModal() {
    const modal = document.getElementById('vault-preview-modal');
    if (modal) modal.classList.add('hidden');
}

// ==========================================
// 7. Service Tracking Drawer & Modal
// ==========================================
function openTrackingModal(orderId) {
    const orders = window.currentCustomerOrders || [];
    const order = orders.find(o => o.id === orderId);
    const modal = document.getElementById('tracking-modal');
    if (!modal) return;

    const refCode = `EDOC-2026-${String(orderId).padStart(4, '0')}`;
    document.getElementById('track-order-ref').innerText = refCode;

    if (order) {
        document.getElementById('track-service-name').innerText = translateServiceType(order.serviceType);
        document.getElementById('track-created-at').innerText = new Date(order.createdAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('track-price').innerText = order.price ? order.price.toLocaleString('th-TH') : '0';
        document.getElementById('track-sla-days').innerText = order.slaDays || '2';

        const badgeEl = document.getElementById('track-status-badge');
        const s1 = document.getElementById('track-step-1');
        const s2 = document.getElementById('track-step-2');
        const s3 = document.getElementById('track-step-3');
        const s4 = document.getElementById('track-step-4');
        const downloadBtn = document.getElementById('track-download-doc-btn');

        [s1, s2, s3, s4].forEach(s => {
            if (s) {
                s.className = 'tracking-step';
            }
        });

        if (order.status === 'PENDING_PAYMENT') {
            badgeEl.className = 'badge badge-warning';
            badgeEl.innerText = 'รอชำระเงิน';
            if (s1) s1.className = 'tracking-step active';
            if (downloadBtn) downloadBtn.style.display = 'none';
        } else if (order.status === 'PAID') {
            badgeEl.className = 'badge badge-primary';
            badgeEl.innerText = 'ชำระเงินแล้ว / ส่งเรื่อง';
            if (s1) s1.className = 'tracking-step completed';
            if (s2) s2.className = 'tracking-step active';
            if (downloadBtn) downloadBtn.style.display = 'none';
        } else if (order.status === 'PROCESSING') {
            badgeEl.className = 'badge badge-primary';
            badgeEl.innerText = 'กำลังดำเนินการยื่นเรื่อง';
            if (s1) s1.className = 'tracking-step completed';
            if (s2) s2.className = 'tracking-step completed';
            if (s3) s3.className = 'tracking-step active';
            if (downloadBtn) downloadBtn.style.display = 'none';
        } else if (order.status === 'COMPLETED') {
            badgeEl.className = 'badge badge-success';
            badgeEl.innerText = 'เสร็จสมบูรณ์ 100%';
            if (s1) s1.className = 'tracking-step completed';
            if (s2) s2.className = 'tracking-step completed';
            if (s3) s3.className = 'tracking-step completed';
            if (s4) s4.className = 'tracking-step completed';
            if (downloadBtn && order.officialDocumentUrl) {
                downloadBtn.href = order.officialDocumentUrl;
                downloadBtn.style.display = 'inline-flex';
            }
        }
    }

    modal.classList.remove('hidden');
}

function closeTrackingModal() {
    const modal = document.getElementById('tracking-modal');
    if (modal) modal.classList.add('hidden');
}

// ==========================================
// Dashboard Global Top Query Bar & Smart Search Engine
// ==========================================
const MASTER_SERVICES_CATALOG = [
    { serviceType: 'car-prb', nameTh: 'พ.ร.บ. รถยนต์ ออกกรมธรรม์ทันที', category: '1. พ.ร.บ. & ประกันภัย', price: 645.21, slaDays: 0, keywords: 'พรบ พ.ร.บ. ประกันภัยรถยนต์ บังคับ รถยนต์ ป้ายทะเบียน กรมธรรม์ ทันที' },
    { serviceType: 'policy-endorsement', nameTh: 'แจ้งแก้ไข/สลักหลังกรมธรรม์', category: '1. พ.ร.บ. & ประกันภัย', price: 150.00, slaDays: 1, keywords: 'สลักหลัง แก้ไขชื่อ แก้ไขป้าย แก้ไขวันคุ้มครอง ประกันภัย กรมธรรม์' },
    { serviceType: 'voluntary-insurance', nameTh: 'ประกันภัยรถยนต์ภาคสมัครใจ (ชั้น 1, 2+, 3)', category: '1. พ.ร.บ. & ประกันภัย', price: 4900.00, slaDays: 1, keywords: 'ประกันภัย ชั้น1 ชั้น2+ ชั้น3 สมัครใจ เบี้ยประกัน รถยนต์ เคลม' },
    { serviceType: 'vehicle-tax-renewal', nameTh: 'ต่อภาษีประจำปี/ป้ายวงกลม', category: '2. ยานพาหนะ & DLT', price: 300.00, slaDays: 2, keywords: 'ต่อภาษี ภาษีรถยนต์ ป้ายวงกลม ขนส่ง dlt ตรวจสภาพ พรบ' },
    { serviceType: 'overdue-tax-fines', nameTh: 'เคลียร์ภาษีย้อนหลัง & ค่าปรับจราจร', category: '2. ยานพาหนะ & DLT', price: 450.00, slaDays: 2, keywords: 'เคลียร์ บริการเคลียร์ เคลียร์ภาษี ภาษีย้อนหลัง ค่าปรับ จราจร ค้างจ่าย ใบสั่ง' },
    { serviceType: 'vehicle-poa', nameTh: 'หนังสือมอบอำนาจงาน DLT', category: '2. ยานพาหนะ & DLT', price: 200.00, slaDays: 1, keywords: 'มอบอำนาจ หนังสือมอบอำนาจ ขนส่ง dlt ทำแทน ป้ายทะเบียน' },
    { serviceType: 'plate-replacement', nameTh: 'ขอแผ่นป้ายทะเบียนใหม่ (ชำรุด/สูญหาย)', category: '2. ยานพาหนะ & DLT', price: 500.00, slaDays: 5, keywords: 'ป้ายทะเบียน แผ่นป้าย ป้ายหาย ป้ายชำรุด ป้ายแตกลายงา ขอป้ายใหม่' },
    { serviceType: 'book-replacement', nameTh: 'ขอสมุดคู่มือจดทะเบียนใหม่ (เล่มหาย/เต็ม)', category: '2. ยานพาหนะ & DLT', price: 600.00, slaDays: 5, keywords: 'สมุดคู่มือ เล่มเขียว เล่มฟ้า เล่มหาย เล่มเต็ม เล่มทะเบียน สมุดทะเบียน' },
    { serviceType: 'spec-alteration', nameTh: 'แจ้งเปลี่ยนสี/ดัดแปลงสภาพรถ', category: '2. ยานพาหนะ & DLT', price: 550.00, slaDays: 3, keywords: 'เปลี่ยนสี ดัดแปลง โครงสร้าง ติดแก๊ส ใส่หลังคา คอก แปลงสภาพ' },
    { serviceType: 'province-transfer', nameTh: 'ย้ายทะเบียนรถข้ามจังหวัด', category: '2. ยานพาหนะ & DLT', price: 800.00, slaDays: 5, keywords: 'ย้ายทะเบียน ข้ามจังหวัด ย้ายเข้า ย้ายออก โอนย้าย ขนส่ง' },
    { serviceType: 'visa-90day', nameTh: 'รายงานตัว 90 วันออนไลน์ (ตม.47)', category: '3. วีซ่า & คนเข้าเมือง', price: 500.00, slaDays: 1, keywords: 'รายงานตัว 90วัน 90 days tm47 ตม47 คนต่างด้าว visa วีซ่า' },
    { serviceType: 'visa-tm30', nameTh: 'แจ้งที่พักอาศัยคนต่างด้าว (ตม.30)', category: '3. วีซ่า & คนเข้าเมือง', price: 300.00, slaDays: 1, keywords: 'tm30 ตม30 ที่พักอาศัย เจ้าบ้าน แจ้งต่างชาติ ต่างด้าว โรงแรม คอนโด' },
    { serviceType: 'outbound-evisa', nameTh: 'ชุดเอกสารขอ eVisa & จองคิวสถานทูต', category: '3. วีซ่า & คนเข้าเมือง', price: 1500.00, slaDays: 3, keywords: 'evisa ขอวีซ่า จองคิว สถานทูต เดินทางต่างประเทศ schengen us uk japan' },
    { serviceType: 'sso-enrollment', nameTh: 'สมัครประกันสังคม ม.39 / ม.40', category: '4. ประกันสังคม & แรงงาน', price: 250.00, slaDays: 1, keywords: 'ประกันสังคม ม39 ม40 ม.39 ม.40 ฟรีแลนซ์ อาชีพอิสระ สมัคร sso' },
    { serviceType: 'sso-hospital', nameTh: 'ยื่นเปลี่ยนโรงพยาบาลประกันสังคม', category: '4. ประกันสังคม & แรงงาน', price: 150.00, slaDays: 2, keywords: 'เปลี่ยนโรงพยาบาล รพ. ประกันสังคม สิทธิรักษา พยาบาล sso' },
    { serviceType: 'sso-claims', nameTh: 'เบิกสิทธิคลอดบุตร/สงเคราะห์/ว่างงาน', category: '4. ประกันสังคม & แรงงาน', price: 350.00, slaDays: 3, keywords: 'เบิกเงิน ประกันสังคม คลอดบุตร สงเคราะห์บุตร ว่างงาน ชดเชย เจ็บป่วย' },
    { serviceType: 'personal-income-tax', nameTh: 'ยื่นภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90/91/94', category: '5. ภาษี & กรมสรรพากร', price: 800.00, slaDays: 3, keywords: 'ยื่นภาษี ภงด ภ.ง.ด. 90 91 94 สรรพากร ภาษีบุคคล คืนภาษี ลดหย่อน' },
    { serviceType: 'vat-registration', nameTh: 'จดทะเบียน ภ.พ.20 & ยื่นแบบ ภ.พ.30', category: '5. ภาษี & กรมสรรพากร', price: 1200.00, slaDays: 3, keywords: 'ภพ20 ภ.พ.20 ภพ30 ภ.พ.30 vat ภาษีมูลค่าเพิ่ม จดvat สรรพากร' },
    { serviceType: 'withholding-tax-cert', nameTh: 'หนังสือรับรองหัก ณ ที่จ่าย 50 ทวิ', category: '5. ภาษี & กรมสรรพากร', price: 200.00, slaDays: 1, keywords: '50ทวิ หัก ณ ที่จ่าย หนังสือรับรอง ภาษีหัก บริษัท จ่ายเงิน' },
    { serviceType: 'financial-statement-prep', nameTh: 'จัดทำงบการเงินประจำปี', category: '5. ภาษี & กรมสรรพากร', price: 6000.00, slaDays: 7, keywords: 'งบการเงิน ทำบัญชี ปิดงบ งบดุล กำไรขาดทุน สมุดบัญชี' },
    { serviceType: 'financial-audit', nameTh: 'ตรวจสอบงบการเงินโดยผู้สอบบัญชี (CPA)', category: '5. ภาษี & กรมสรรพากร', price: 10000.00, slaDays: 10, keywords: 'ผู้สอบบัญชี cpa ตรวจสอบงบ สอบบัญชี รายงานผู้สอบ' },
    { serviceType: 'financial-approval', nameTh: 'ประชุมอนุมัติงบการเงิน (AGM)', category: '5. ภาษี & กรมสรรพากร', price: 2500.00, slaDays: 3, keywords: 'agm ประชุมผู้ถือหุ้น อนุมัติงบ หนังสือนัดประชุม รายงานการประชุม' },
    { serviceType: 'smart-etax', nameTh: 'ระบบ Smart e-Tax Invoice & e-Receipt', category: '5. ภาษี & กรมสรรพากร', price: 3500.00, slaDays: 3, keywords: 'etax e-tax e-receipt ใบกำกับภาษีอิเล็กทรอนิกส์ สรรพากร' },
    { serviceType: 'direct-sales-ocpb', nameTh: 'ใบอนุญาตขายตรง/ตลาดแบบตรง สคบ.', category: '6. ใบอนุญาตการค้า', price: 8500.00, slaDays: 15, keywords: 'สคบ ขายตรง ตลาดแบบตรง e-commerce ขายของออนไลน์ ใบอนุญาต' },
    { serviceType: 'music-copyright', nameTh: 'ใบอนุญาตเผยแพร่ลิขสิทธิ์เพลง', category: '6. ใบอนุญาตการค้า', price: 2000.00, slaDays: 3, keywords: 'ลิขสิทธิ์เพลง เปิดเพลง ร้านอาหาร คาเฟ่ ผับ บาร์ ดนตรี' },
    { serviceType: 'signboard-tax', nameTh: 'คำนวณและยื่นชำระภาษีป้าย', category: '6. ใบอนุญาตการค้า', price: 500.00, slaDays: 3, keywords: 'ภาษีป้าย ป้ายร้าน ป้ายโฆษณา เทศบาล อบต คำนวณภาษีป้าย' },
    { serviceType: 'dbd-name-ecert', nameTh: 'จองชื่อนิติบุคคล & ขอ e-Certificate DBD', category: '7. DBD & สัญญากฎหมาย', price: 500.00, slaDays: 1, keywords: 'จองชื่อบริษัท ecert e-certificate หนังสือรับรอง dbd พัฒนาธุรกิจการค้า' },
    { serviceType: 'company-opening', nameTh: 'จัดตั้งบริษัทจำกัด (บอจ.1)', category: '7. DBD & สัญญากฎหมาย', price: 5000.00, slaDays: 3, keywords: 'ตั้งบริษัท จดบริษัท เปิดบริษัท บอจ1 บอจ.1 จดทะเบียนบริษัท dbd' },
    { serviceType: 'company-closing', nameTh: 'เลิกและชำระบัญชีบริษัท', category: '7. DBD & สัญญากฎหมาย', price: 8000.00, slaDays: 14, keywords: 'ปิดบริษัท เลิกบริษัท ชำระบัญชี สิ้นสุดกิจการ คืนภาษี dbd' },
    { serviceType: 'efiling', nameTh: 'นำส่งงบ e-Filing กรมพัฒนาธุรกิจการค้า', category: '7. DBD & สัญญากฎหมาย', price: 1500.00, slaDays: 2, keywords: 'efiling e-filing ส่งงบ ส่งงบdbd งบการเงิน บอจ5' },
    { serviceType: 'company-name-change', nameTh: 'จดทะเบียนเปลี่ยนชื่อบริษัท', category: '7. DBD & สัญญากฎหมาย', price: 2500.00, slaDays: 3, keywords: 'เปลี่ยนชื่อบริษัท แก้ไขชื่อ นิติบุคคล dbd ตาประทับ' },
    { serviceType: 'memorandum-amendment', nameTh: 'แก้ไขหนังสือบริคณห์สนธิ', category: '7. DBD & สัญญากฎหมาย', price: 3000.00, slaDays: 3, keywords: 'บริคณห์สนธิ วัตถุประสงค์ แก้ไขทุน เพิ่มทุน ลดทุน dbd' },
    { serviceType: 'company-director-change', nameTh: 'เปลี่ยนตัวกรรมการและอำนาจกรรมการ', category: '7. DBD & สัญญากฎหมาย', price: 2000.00, slaDays: 3, keywords: 'เปลี่ยนกรรมการ เพิ่มกรรมการ ถอดถอนกรรมการ อำนาจกรรมการ dbd' },
    { serviceType: 'shareholder-update', nameTh: 'แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)', category: '7. DBD & สัญญากฎหมาย', price: 1200.00, slaDays: 2, keywords: 'บอจ5 บอจ.5 ผู้ถือหุ้น โอนหุ้น เพิ่มหุ้น สมุดทะเบียนผู้ถือหุ้น' },
    { serviceType: 'legal-form-gen', nameTh: 'ร่างสัญญาทางกฎหมาย & e-Sign', category: '7. DBD & สัญญากฎหมาย', price: 300.00, slaDays: 0, keywords: 'ร่างสัญญา สัญญา esign e-sign กฎหมาย ทนาย สัญญาจ้าง สัญญาเช่า' },
    { serviceType: 'remote-esign-contract', nameTh: 'ร่างสัญญา NDA / จ้างงาน / สัญญาเช่า', category: '7. DBD & สัญญากฎหมาย', price: 600.00, slaDays: 1, keywords: 'nda สัญญาจ้างงาน สัญญาเช่า สัญญาบริการ ข้อตกลงลับ' },
    { serviceType: 'legal-poa-dispatch', nameTh: 'หนังสือมอบอำนาจเฉพาะทาง & ส่งฉบับจริง', category: '7. DBD & สัญญากฎหมาย', price: 400.00, slaDays: 2, keywords: 'มอบอำนาจ ฉบับจริง ทนายความ เซ็นมอบอำนาจ ปิดอากรแสตมป์' },
    { serviceType: 'notary-translation-hub', nameTh: 'โนตารีพับลิค & แปลเอกสารรับรอง', category: '7. DBD & สัญญากฎหมาย', price: 1800.00, slaDays: 3, keywords: 'notary โนตารีพับลิค แปลเอกสาร รับรองกงสุล สถานทูต แปลอังกฤษ' },
    { serviceType: 'house-reg', nameTh: 'แก้ไขข้อมูลทะเบียนบ้าน (ท.ร.14)', category: '7. DBD & สัญญากฎหมาย', price: 200.00, slaDays: 1, keywords: 'ทะเบียนบ้าน ทร14 ท.ร.14 ย้ายเข้า ย้ายออก เจ้าบ้าน คัดสำเนา' },
    { serviceType: 'pdpa-badge', nameTh: 'ตราสัญลักษณ์ PDPA Badge', category: '7. DBD & สัญญากฎหมาย', price: 1000.00, slaDays: 1, keywords: 'pdpa consent คุ้มครองข้อมูลส่วนบุคคล นโยบายความเป็นส่วนตัว' }
];

let activePillCategory = 'all';

function onDashboardGlobalSearch(query) {
    const rawQ = (query || '').toLowerCase().trim();
    const clearBtn = document.getElementById('clear-search-btn');
    const dropdown = document.getElementById('search-results-dropdown');
    const list = document.getElementById('search-results-list');
    
    if (clearBtn) {
        if (rawQ) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (!rawQ) {
        if (dropdown) dropdown.classList.add('hidden');
        return;
    }

    // Clean stop-words and extract search tokens
    const cleanQ = rawQ.replace(/^(บริการ|การ|ระบบ|ยื่น|ขอ|ทำ|เรื่อง)\s*/g, '').trim();
    const tokens = rawQ.split(/[\s,+/&]+/).filter(t => t.length > 0);
    if (cleanQ && !tokens.includes(cleanQ)) {
        tokens.push(cleanQ);
    }

    // Source services (prefer server list merged with master catalog)
    const allServices = (publicServicesList && publicServicesList.length > 0) ? publicServicesList : MASTER_SERVICES_CATALOG;

    // Smart matching across Thai name, service type, category, description, and keywords
    const matches = allServices.filter(s => {
        const name = (s.nameTh || '').toLowerCase();
        const type = (s.serviceType || '').toLowerCase();
        const cat = (s.category || '').toLowerCase();
        const desc = (s.contentTh || '').toLowerCase();
        const kw = (s.keywords || '').toLowerCase();
        const combined = `${name} ${type} ${cat} ${desc} ${kw}`;

        // Direct full phrase match
        if (combined.includes(rawQ) || (cleanQ && combined.includes(cleanQ))) return true;

        // Any token match
        for (const token of tokens) {
            if (token.length >= 2 && combined.includes(token)) return true;
        }
        return false;
    });

    if (!list || !dropdown) return;
    dropdown.classList.remove('hidden');

    if (matches.length === 0) {
        list.innerHTML = `
            <div style="padding: 24px; text-align: center; color: #94a3b8;">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 28px; margin-bottom: 10px; color: var(--primary); opacity: 0.8;"></i>
                <div style="font-size: 15px; font-weight: 600; color: #f8fafc;">ไม่พบบริการที่ตรงกับ "${rawQ}"</div>
                <div style="font-size: 12.5px; margin-top: 6px; color: #cbd5e1;">ลองค้นหาด้วยคำสั้นๆ เช่น: 
                    <span style="color: var(--primary); cursor:pointer; text-decoration:underline;" onclick="setSearchQuery('เคลียร์')">เคลียร์</span>, 
                    <span style="color: var(--primary); cursor:pointer; text-decoration:underline;" onclick="setSearchQuery('พ.ร.บ.')">พ.ร.บ.</span>, 
                    <span style="color: var(--primary); cursor:pointer; text-decoration:underline;" onclick="setSearchQuery('ภาษี')">ภาษี</span>, 
                    <span style="color: var(--primary); cursor:pointer; text-decoration:underline;" onclick="setSearchQuery('วีซ่า')">วีซ่า</span>, 
                    <span style="color: var(--primary); cursor:pointer; text-decoration:underline;" onclick="setSearchQuery('ประกันสังคม')">ประกันสังคม</span>, 
                    <span style="color: var(--primary); cursor:pointer; text-decoration:underline;" onclick="setSearchQuery('จดบริษัท')">จดบริษัท</span>
                </div>
            </div>
        `;
        return;
    }

    let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; padding: 6px 10px 12px 10px; border-bottom: 1px solid #334155; margin-bottom: 10px;">
            <span style="font-size: 13px; color: #f8fafc; font-weight: 600;"><i class="fa-solid fa-circle-check text-success"></i> พบทั้งหมด ${matches.length} บริการที่ตรงกับคำค้นหา</span>
            <span style="font-size: 12px; color: var(--primary); font-weight: 500;"><i class="fa-solid fa-bolt"></i> คลิกเพื่อเริ่มทำรายการทันที</span>
        </div>
    `;

    matches.slice(0, 10).forEach(s => {
        const catKey = mapServiceCategoryKey(s.category, s.serviceType);
        const icon = getServiceIcon(catKey);
        const price = (s.price != null && s.price > 0) ? `฿${parseFloat(s.price).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'ฟรี/ตามระบบ';
        const sla = s.slaDays === 0 ? '⚡ ออกเอกสารทันที (Instant)' : `⏱️ ${s.slaDays || 1-2} วันทำการ`;
        
        html += `
            <div class="search-result-item" onclick="selectSearchService('${s.serviceType}')" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer; transition: all 0.2s ease;">
                <div style="display:flex; align-items:center; gap: 14px;">
                    <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(217, 119, 6, 0.18); display: flex; align-items: center; justify-content: center; color: var(--primary); font-size: 18px; flex-shrink: 0;">
                        ${icon}
                    </div>
                    <div>
                        <div style="font-size: 14.5px; font-weight: 600; color: #ffffff;">${s.nameTh || s.serviceType}</div>
                        <div style="font-size: 12px; color: #94a3b8; display:flex; gap: 10px; margin-top: 3px; align-items: center;">
                            <span class="badge" style="background: rgba(255,255,255,0.1); color: #e2e8f0; font-size: 11px; padding: 2px 8px; border-radius: 4px;">${s.category || 'ทั่วไป'}</span>
                            <span style="color: #10b981; font-weight: 600;"><i class="fa-solid fa-clock"></i> ${sla}</span>
                        </div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 14px; flex-shrink: 0;">
                    <span style="font-size: 16px; font-weight: 700; color: var(--primary); letter-spacing: 0.3px;">${price}</span>
                    <button class="btn btn-primary btn-sm" style="padding: 6px 14px; font-size: 13px; font-weight: 600; border-radius: 6px; white-space: nowrap; box-shadow: 0 2px 6px rgba(217, 119, 6, 0.3);">
                        เริ่มทำรายการ <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `;
    });

    list.innerHTML = html;
}

function setSearchQuery(text) {
    const input = document.getElementById('dashboard-global-search');
    if (input) {
        input.value = text;
        onDashboardGlobalSearch(text);
        input.focus();
    }
}


function selectSearchService(serviceKey) {
    const dropdown = document.getElementById('search-results-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    showWizard(serviceKey);
}

function openSearchDropdown() {
    const input = document.getElementById('dashboard-global-search');
    if (input && input.value.trim().length > 0) {
        onDashboardGlobalSearch(input.value);
    }
}

function clearGlobalSearch() {
    const input = document.getElementById('dashboard-global-search');
    if (input) {
        input.value = '';
        onDashboardGlobalSearch('');
        input.focus();
    }
}

function filterByPill(catKey, btn) {
    activePillCategory = catKey;
    document.querySelectorAll('.search-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    const sidebarHeadings = document.querySelectorAll('.dashboard-sidebar h4');
    const sidebarLists = document.querySelectorAll('.dashboard-sidebar ul.sidebar-menu');

    if (catKey === 'all') {
        sidebarHeadings.forEach(h => h.style.display = '');
        sidebarLists.forEach(ul => ul.style.display = '');
    } else {
        sidebarHeadings.forEach((h, idx) => {
            const headingText = h.innerText.toLowerCase();
            let match = false;
            if (catKey === 'insurance' && headingText.includes('ประกันภัย')) match = true;
            else if (catKey === 'vehicle' && (headingText.includes('ยานพาหนะ') || headingText.includes('dlt'))) match = true;
            else if (catKey === 'immigration' && (headingText.includes('วีซ่า') || headingText.includes('ตม.'))) match = true;
            else if (catKey === 'sso-labor' && (headingText.includes('ประกันสังคม') || headingText.includes('แรงงาน'))) match = true;
            else if (catKey === 'tax-accounting' && (headingText.includes('ภาษี') || headingText.includes('สรรพากร'))) match = true;
            else if (catKey === 'licensing' && (headingText.includes('ใบอนุญาต'))) match = true;
            else if (catKey === 'legal-dbd' && (headingText.includes('dbd') || headingText.includes('สัญญา'))) match = true;

            h.style.display = match ? '' : 'none';
            if (sidebarLists[idx]) {
                sidebarLists[idx].style.display = match ? '' : 'none';
            }
        });
    }
}

// Close search dropdown on click outside
document.addEventListener('click', (e) => {
    const searchWrapper = document.querySelector('.dashboard-search-wrapper');
    const dropdown = document.getElementById('search-results-dropdown');
    if (dropdown && searchWrapper && !searchWrapper.contains(e.target)) {
        dropdown.classList.add('hidden');
    }
});

// Window scope exports
window.filterDashboardSidebarServices = filterDashboardSidebarServices;
window.selectSidebarCategoryFilter = selectSidebarCategoryFilter;
window.toggleSidebarCategory = toggleSidebarCategory;
window.switchProfileSubTab = switchProfileSubTab;
window.handleVaultFileSelected = handleVaultFileSelected;
window.submitVaultUpload = submitVaultUpload;
window.loadVaultDocuments = loadVaultDocuments;
window.deleteVaultDoc = deleteVaultDoc;
window.openVaultPreview = openVaultPreview;
window.closeVaultPreviewModal = closeVaultPreviewModal;
window.openTrackingModal = openTrackingModal;
window.closeTrackingModal = closeTrackingModal;
window.onDashboardGlobalSearch = onDashboardGlobalSearch;
window.selectSearchService = selectSearchService;
window.openSearchDropdown = openSearchDropdown;
window.clearGlobalSearch = clearGlobalSearch;
window.filterByPill = filterByPill;
window.setSearchQuery = setSearchQuery;
window.autoFillServiceFromVault = autoFillServiceFromVault;
window.quickSaveSlaPrice = quickSaveSlaPrice;
window.update2faMaster = update2faMaster;
window.toggleSpecific2fa = toggleSpecific2fa;
window.testSend2fa = testSend2fa;
window.openTotpSetupModal = openTotpSetupModal;
window.closeTotpSetupModal = closeTotpSetupModal;
window.copyTotpKey = copyTotpKey;
window.verifyTestTotp = verifyTestTotp;
window.registerPasskeyPrompt = registerPasskeyPrompt;
window.connectLinePrompt = connectLinePrompt;
window.loadAdminUsers = loadAdminUsers;
window.filterAdminUsers = filterAdminUsers;
window.toggleBanCustomer = toggleBanCustomer;
window.openAdminMessageModal = openAdminMessageModal;
window.closeAdminMessageModal = closeAdminMessageModal;
window.submitAdminMessageToUser = submitAdminMessageToUser;
window.viewCustomerFullDetails = viewCustomerFullDetails;
window.closeCustomerDetailsModal = closeCustomerDetailsModal;
window.loadAdminServiceRequests = loadAdminServiceRequests;
window.filterServiceRequests = filterServiceRequests;
window.openSrActionModalByData = openSrActionModalByData;
window.closeSrActionModal = closeSrActionModal;
window.submitSrAction = submitSrAction;
window.onNavbarProfileClick = onNavbarProfileClick;
window.onLogoClick = onLogoClick;

// =========================================================
// Admin Roles & Permissions Management Controller
// =========================================================
let allAdminStaffUsers = [];

function loadAdminStaffUsers() {
    fetch('/api/admin/admins', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to load admin users");
        return res.json();
    })
    .then(admins => {
        allAdminStaffUsers = admins || [];
        renderAdminStaffTable(allAdminStaffUsers);
        updateAdminStaffMetrics(allAdminStaffUsers);
    })
    .catch(err => {
        console.error("Error loading admin staff:", err);
        const tbody = document.getElementById('admin-staff-tbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color:#ef4444;">ไม่สามารถโหลดรายชื่อแอดมินได้: ' + err.message + '</td></tr>';
    });
}

function updateAdminStaffMetrics(admins) {
    const totalEl = document.getElementById('metric-admins-total');
    const superEl = document.getElementById('metric-admins-super');
    const staffEl = document.getElementById('metric-admins-staff');
    const activeEl = document.getElementById('metric-admins-active');

    if (!admins) return;
    const total = admins.length;
    const superCount = admins.filter(a => (a.adminRoleTitle || '').toLowerCase().includes('super') || (a.permissions || '') === 'ALL' || a.email.includes('admin')).length;
    const staffCount = total - superCount;
    const activeCount = admins.filter(a => !a.banned).length;

    if (totalEl) totalEl.innerText = total + ' ท่าน';
    if (superEl) superEl.innerText = superCount + ' ท่าน';
    if (staffEl) staffEl.innerText = staffCount + ' ท่าน';
    if (activeEl) activeEl.innerText = activeCount + ' ท่าน';
}

function filterAdminStaffTable() {
    const query = (document.getElementById('admin-staff-search-input')?.value || '').toLowerCase().trim();
    const deptFilter = document.getElementById('admin-staff-dept-filter')?.value || '';

    let filtered = allAdminStaffUsers;
    if (deptFilter) {
        filtered = filtered.filter(a => (a.department || '').toLowerCase().includes(deptFilter.toLowerCase()) || (a.adminRoleTitle || '').toLowerCase().includes(deptFilter.toLowerCase()));
    }
    if (query) {
        filtered = filtered.filter(a => 
            (a.fullName || '').toLowerCase().includes(query) ||
            (a.email || '').toLowerCase().includes(query) ||
            (a.department || '').toLowerCase().includes(query) ||
            (a.adminRoleTitle || '').toLowerCase().includes(query) ||
            (a.phone || '').toLowerCase().includes(query)
        );
    }
    renderAdminStaffTable(filtered);
}

function renderAdminStaffTable(admins) {
    const tbody = document.getElementById('admin-staff-tbody');
    if (!tbody) return;

    if (!admins || admins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color:#94a3b8;">ไม่พบรายชื่อผู้ดูแลระบบที่ตรงกับเงื่อนไข</td></tr>';
        return;
    }

    let html = '';
    admins.forEach(a => {
        const isBanned = !!a.banned;
        const statusBadge = isBanned 
            ? '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;"><i class="fa-solid fa-ban"></i> SUSPENDED</span>'
            : '<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;"><i class="fa-solid fa-circle-check"></i> ACTIVE</span>';

        const roleTitle = a.adminRoleTitle || 'Admin Officer';
        const department = a.department || 'Operations';
        const isSuper = (a.permissions === 'ALL' || roleTitle.toLowerCase().includes('super') || a.email.includes('admin@') || a.email === 'sadmin' || a.email === 'sadminwa');

        // Parse View Permissions
        let viewTags = '';
        let taskTags = '';

        if (isSuper) {
            viewTags = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-weight:600; font-size:11px; padding:3px 8px; border:1px solid #bfdbfe;"><i class="fa-solid fa-crown" style="color:#d97706;"></i> ดูได้ทุกส่วน (Full Views Access)</span>';
            taskTags = '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:600; font-size:11px; padding:3px 8px; border:1px solid #fde68a;"><i class="fa-solid fa-bolt"></i> ปฏิบัติงานได้ทุกฟังก์ชัน (Full Control)</span>';
        } else {
            const perms = (a.permissions || '').split(',');
            
            // Views
            const viewItems = [];
            if (perms.includes('VIEW_SR')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">SR Tickets</span>');
            if (perms.includes('VIEW_CUSTOMERS')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">ลูกค้า</span>');
            if (perms.includes('VIEW_ORDERS')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">คำสั่งซื้อ</span>');
            if (perms.includes('VIEW_PURCHASED')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">บริการที่ซื้อ</span>');
            if (perms.includes('VIEW_SLA_PRICING')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">ราคา/SLA</span>');
            if (perms.includes('VIEW_ADMINS')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">รายชื่อแอดมิน</span>');
            if (perms.includes('VIEW_SETTINGS')) viewItems.push('<span class="badge" style="background:#f1f5f9; color:#334155; font-size:10.5px; padding:2px 6px;">ตั้งค่า SaaS</span>');
            
            viewTags = viewItems.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap:4px;">${viewItems.join('')}</div>` : '<span class="text-muted" style="font-size:11px;">ไม่มีสิทธิ์การดู</span>';

            // Tasks
            const taskItems = [];
            if (perms.includes('TASK_SR_ACTION')) taskItems.push('<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:10.5px; padding:2px 6px;"><i class="fa-solid fa-gavel"></i> ยื่น/อนุมัติ SR</span>');
            if (perms.includes('TASK_UPLOAD_DOC')) taskItems.push('<span class="badge" style="background:#f0fdf4; color:#15803d; font-size:10.5px; padding:2px 6px;"><i class="fa-solid fa-upload"></i> อัปโหลดผล</span>');
            if (perms.includes('TASK_CUSTOMER_BAN')) taskItems.push('<span class="badge" style="background:#fef2f2; color:#b91c1c; font-size:10.5px; padding:2px 6px;"><i class="fa-solid fa-ban"></i> แบนลูกค้า</span>');
            if (perms.includes('TASK_SEND_MESSAGE')) taskItems.push('<span class="badge" style="background:#fefce8; color:#a16207; font-size:10.5px; padding:2px 6px;"><i class="fa-solid fa-paper-plane"></i> ส่งข้อความ/SMS</span>');
            if (perms.includes('TASK_EDIT_SLA_PRICE')) taskItems.push('<span class="badge" style="background:#faf5ff; color:#7e22ce; font-size:10.5px; padding:2px 6px;"><i class="fa-solid fa-coins"></i> แก้ราคา/SLA</span>');
            if (perms.includes('TASK_MANAGE_ADMINS')) taskItems.push('<span class="badge" style="background:#fff1f2; color:#be123c; font-size:10.5px; padding:2px 6px;"><i class="fa-solid fa-user-gear"></i> จัดการแอดมิน</span>');

            taskTags = taskItems.length > 0 ? `<div style="display:flex; flex-wrap:wrap; gap:4px;">${taskItems.join('')}</div>` : '<span class="text-muted" style="font-size:11px;">ไม่มีสิทธิ์การปฏิบัติงาน</span>';
        }

        const actions = `
            <div style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                <button class="btn btn-sm btn-primary" onclick="openEditAdminPermissionsModal(${a.id})" style="padding:4px 8px; font-size:11px; font-weight:600;" title="แก้ไขข้อมูลและสิทธิ์">
                    <i class="fa-solid fa-user-pen"></i> สิทธิ์
                </button>
                <button class="btn btn-sm btn-outline" onclick="openAdminResetPwdModal(${a.id}, '${escapeQuotes(a.fullName || a.email)}')" style="padding:4px 8px; font-size:11px; border-color:#cbd5e1; color:#334155;" title="รีเซ็ตรหัสผ่าน">
                    <i class="fa-solid fa-key"></i> รหัส
                </button>
                ${!isSuper ? `
                    <button class="btn btn-sm btn-outline" onclick="toggleAdminAccountStatus(${a.id}, ${isBanned}, '${escapeQuotes(a.fullName || a.email)}')" style="padding:4px 8px; font-size:11px; border-color:#cbd5e1; color:#334155;" title="${isBanned ? 'ปลดระงับ' : 'ระงับบัญชี'}">
                        <i class="fa-solid ${isBanned ? 'fa-unlock text-success' : 'fa-ban text-warning'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="deleteAdminUserAccount(${a.id}, '${escapeQuotes(a.fullName || a.email)}')" style="padding:4px 8px; font-size:11px; color:#ef4444; border-color:rgba(239,68,68,0.4);" title="ลบผู้ใช้แอดมิน">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                ` : ''}
            </div>
        `;

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:12px 10px; font-size:12px; font-family:monospace; color:#64748b;">#${a.id}</td>
                <td style="padding:12px 10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; border-radius:50%; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0;">
                            ${(a.fullName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <strong style="color:#0f172a; font-size:13.5px;">${a.fullName || '-'}</strong>
                            <div style="font-size:11.5px; color:#64748b;">${a.email}</div>
                            <div style="font-size:11px; color:#64748b;"><i class="fa-solid fa-phone" style="font-size:10px;"></i> ${a.phone || '-'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px 10px;">
                    <strong style="color:#2563eb; font-size:12.5px; display:block;">${roleTitle}</strong>
                    <span class="badge" style="background:#e2e8f0; color:#334155; font-size:10.5px; padding:2px 6px; border-radius:4px; margin-top:2px;">${department}</span>
                </td>
                <td style="padding:12px 10px;">
                    ${viewTags}
                </td>
                <td style="padding:12px 10px;">
                    ${taskTags}
                </td>
                <td style="padding:12px 10px; text-align:center;">
                    ${statusBadge}
                </td>
                <td style="padding:12px 10px; text-align:center;">
                    ${actions}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function openCreateAdminModal() {
    document.getElementById('admin-modal-title').innerHTML = '<i class="fa-solid fa-user-plus text-primary"></i> สร้างบัญชีผู้ดูแลระบบ & กำหนดสิทธิ์การทำงาน';
    document.getElementById('admin-form-id').value = '';
    document.getElementById('admin-form-fullname').value = '';
    document.getElementById('admin-form-email').value = '';
    document.getElementById('admin-form-password').value = '';
    document.getElementById('admin-form-phone').value = '';
    document.getElementById('admin-form-department').value = 'Operations';
    document.getElementById('admin-form-role-title').value = 'เจ้าหน้าที่ฝ่ายปฏิบัติการ (Operations Officer)';
    
    // Password required when creating
    document.getElementById('admin-form-password').required = true;
    document.getElementById('admin-pwd-required-star').style.display = 'inline';
    
    applyRolePreset('OPERATIONS');
    document.getElementById('admin-create-edit-modal').classList.remove('hidden');
}

function openEditAdminPermissionsModal(adminId) {
    const admin = allAdminStaffUsers.find(a => a.id === adminId);
    if (!admin) return;

    document.getElementById('admin-modal-title').innerHTML = '<i class="fa-solid fa-user-pen text-primary"></i> แก้ไขสิทธิ์ผู้ดูแลระบบ: ' + (admin.fullName || admin.email);
    document.getElementById('admin-form-id').value = admin.id;
    document.getElementById('admin-form-fullname').value = admin.fullName || '';
    document.getElementById('admin-form-email').value = admin.email || '';
    document.getElementById('admin-form-password').value = '';
    document.getElementById('admin-form-phone').value = admin.phone || '';
    document.getElementById('admin-form-department').value = admin.department || 'Operations';
    document.getElementById('admin-form-role-title').value = admin.adminRoleTitle || 'Admin Officer';

    // Password optional when editing
    document.getElementById('admin-form-password').required = false;
    document.getElementById('admin-pwd-required-star').style.display = 'none';

    // Check permissions
    const perms = (admin.permissions || '').split(',');
    const isSuper = (admin.permissions === 'ALL' || (admin.adminRoleTitle || '').toLowerCase().includes('super'));

    document.querySelectorAll('.admin-perm-checkbox').forEach(cb => {
        if (isSuper) {
            cb.checked = true;
        } else {
            cb.checked = perms.includes(cb.value);
        }
    });

    document.getElementById('admin-create-edit-modal').classList.remove('hidden');
}

function closeAdminCreateEditModal() {
    document.getElementById('admin-create-edit-modal').classList.add('hidden');
}

function applyRolePreset(preset) {
    const checkMap = {
        'SUPER_ADMIN': ['VIEW_SR', 'VIEW_CUSTOMERS', 'VIEW_ORDERS', 'VIEW_PURCHASED', 'VIEW_SLA_PRICING', 'VIEW_ADMINS', 'VIEW_SETTINGS', 'TASK_SR_ACTION', 'TASK_UPLOAD_DOC', 'TASK_CUSTOMER_BAN', 'TASK_SEND_MESSAGE', 'TASK_EDIT_SLA_PRICE', 'TASK_MANAGE_ADMINS'],
        'OPERATIONS': ['VIEW_SR', 'VIEW_CUSTOMERS', 'VIEW_ORDERS', 'VIEW_PURCHASED', 'TASK_SR_ACTION', 'TASK_UPLOAD_DOC', 'TASK_SEND_MESSAGE'],
        'SUPPORT': ['VIEW_SR', 'VIEW_CUSTOMERS', 'VIEW_PURCHASED', 'TASK_SEND_MESSAGE'],
        'FINANCE': ['VIEW_ORDERS', 'VIEW_PURCHASED', 'VIEW_SLA_PRICING', 'TASK_EDIT_SLA_PRICE'],
        'CLEAR': []
    };

    const targetList = checkMap[preset] || [];
    document.querySelectorAll('.admin-perm-checkbox').forEach(cb => {
        cb.checked = targetList.includes(cb.value);
    });

    if (preset === 'SUPER_ADMIN') {
        document.getElementById('admin-form-role-title').value = 'Super Administrator (ผู้ดูแลระบบสูงสุด)';
        document.getElementById('admin-form-department').value = 'Executive & Security';
    } else if (preset === 'OPERATIONS') {
        document.getElementById('admin-form-role-title').value = 'เจ้าหน้าที่ยื่นเอกสารราชการ (Operations Officer)';
        document.getElementById('admin-form-department').value = 'Operations';
    } else if (preset === 'SUPPORT') {
        document.getElementById('admin-form-role-title').value = 'เจ้าหน้าที่บริการลูกค้า (Customer Support Specialist)';
        document.getElementById('admin-form-department').value = 'Customer Support';
    } else if (preset === 'FINANCE') {
        document.getElementById('admin-form-role-title').value = 'เจ้าหน้าที่การเงินและราคา (Finance & Pricing Officer)';
        document.getElementById('admin-form-department').value = 'Finance & Pricing';
    }
}

function submitAdminUserForm(event) {
    event.preventDefault();
    const adminId = document.getElementById('admin-form-id').value;
    const fullName = document.getElementById('admin-form-fullname').value.trim();
    const email = document.getElementById('admin-form-email').value.trim();
    const password = document.getElementById('admin-form-password').value.trim();
    const phone = document.getElementById('admin-form-phone').value.trim();
    const department = document.getElementById('admin-form-department').value;
    const adminRoleTitle = document.getElementById('admin-form-role-title').value.trim() || 'Admin Officer';

    // Collect permissions
    const selectedPerms = [];
    document.querySelectorAll('.admin-perm-checkbox:checked').forEach(cb => {
        selectedPerms.push(cb.value);
    });

    let permissionsStr = selectedPerms.join(',');
    if (selectedPerms.length === 13) {
        permissionsStr = 'ALL';
    }

    if (!adminId) {
        // Create new admin
        if (!password) {
            alert("กรุณากรอกรหัสผ่านสำหรับเจ้าหน้าที่ใหม่");
            return;
        }

        const payload = {
            email: email,
            fullName: fullName,
            password: password,
            phone: phone,
            department: department,
            adminRoleTitle: adminRoleTitle,
            permissions: permissionsStr
        };

        fetch('/api/admin/admins/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) return res.json().then(e => { throw new Error(e.error || 'Failed to create admin'); });
            return res.json();
        })
        .then(newAdmin => {
            alert(`สร้างบัญชีแอดมิน [${newAdmin.fullName}] สำเร็จแล้ว! สิทธิ์การเข้าถึงได้รับการบันทึกเรียบร้อย`);
            closeAdminCreateEditModal();
            loadAdminStaffUsers();
        })
        .catch(err => {
            alert("เกิดข้อผิดพลาดในการสร้างแอดมิน: " + err.message);
        });

    } else {
        // Update existing admin permissions
        const payload = {
            fullName: fullName,
            phone: phone,
            department: department,
            adminRoleTitle: adminRoleTitle,
            permissions: permissionsStr
        };

        fetch(`/api/admin/admins/${adminId}/permissions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify(payload)
        })
        .then(res => {
            if (!res.ok) return res.json().then(e => { throw new Error(e.error || 'Failed to update permissions'); });
            return res.json();
        })
        .then(updated => {
            alert(`อัปเดตสิทธิ์ของ [${updated.fullName}] เรียบร้อยแล้ว`);
            closeAdminCreateEditModal();
            loadAdminStaffUsers();
        })
        .catch(err => {
            alert("เกิดข้อผิดพลาดในการอัปเดตสิทธิ์: " + err.message);
        });
    }
}

function openAdminResetPwdModal(adminId, name) {
    document.getElementById('reset-pwd-target-admin-id').value = adminId;
    document.getElementById('reset-pwd-target-name').innerText = name;
    document.getElementById('reset-pwd-input').value = '';
    document.getElementById('admin-reset-pwd-modal').classList.remove('hidden');
}

function closeAdminResetPwdModal() {
    document.getElementById('admin-reset-pwd-modal').classList.add('hidden');
}

function submitAdminResetPassword(event) {
    event.preventDefault();
    const adminId = document.getElementById('reset-pwd-target-admin-id').value;
    const newPwd = document.getElementById('reset-pwd-input').value.trim();

    if (newPwd.length < 6) {
        alert("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
    }

    fetch(`/api/admin/admins/${adminId}/reset-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({ password: newPwd })
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to reset password");
        return res.json();
    })
    .then(() => {
        alert("เปลี่ยนรหัสผ่านใหม่เรียบร้อยแล้ว เจ้าหน้าที่สามารถใช้รหัสผ่านใหม่ในการเข้าสู่ระบบได้ทันที");
        closeAdminResetPwdModal();
    })
    .catch(err => {
        alert("เกิดข้อผิดพลาด: " + err.message);
    });
}

function toggleAdminAccountStatus(adminId, isBanned, name) {
    const action = isBanned ? "ปลดระงับการใช้งาน" : "ระงับการใช้งาน (Suspend)";
    if (!confirm(`คุณต้องการ ${action} บัญชีแอดมิน [${name}] ใช่หรือไม่?`)) return;

    fetch(`/api/admin/users/${adminId}/ban`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + currentToken
        },
        body: JSON.stringify({
            banned: !isBanned,
            banReason: !isBanned ? "ระงับสิทธิ์โดย Super Administrator" : null
        })
    })
    .then(res => res.json())
    .then(() => {
        alert(`ดำเนินการ ${action} สำหรับ [${name}] สำเร็จแล้ว`);
        loadAdminStaffUsers();
    })
    .catch(err => alert("เกิดข้อผิดพลาด: " + err.message));
}

function deleteAdminUserAccount(adminId, name) {
    if (!confirm(`⚠️ ยืนยันการลบบัญชีผู้ดูแลระบบ [${name}] ออกจากระบบถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;

    fetch(`/api/admin/users/${adminId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + currentToken
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to delete admin user");
        return res.json();
    })
    .then(() => {
        alert(`ลบบัญชีแอดมิน [${name}] สำเร็จแล้ว`);
        loadAdminStaffUsers();
    })
    .catch(err => alert("เกิดข้อผิดพลาด: " + err.message));
}

// Window Exports for Admin Roles & Permissions
window.loadAdminStaffUsers = loadAdminStaffUsers;
window.filterAdminStaffTable = filterAdminStaffTable;
window.openCreateAdminModal = openCreateAdminModal;
window.openEditAdminPermissionsModal = openEditAdminPermissionsModal;
window.closeAdminCreateEditModal = closeAdminCreateEditModal;
window.applyRolePreset = applyRolePreset;
window.submitAdminUserForm = submitAdminUserForm;
window.openAdminResetPwdModal = openAdminResetPwdModal;
window.closeAdminResetPwdModal = closeAdminResetPwdModal;
window.submitAdminResetPassword = submitAdminResetPassword;
window.toggleAdminAccountStatus = toggleAdminAccountStatus;
window.deleteAdminUserAccount = deleteAdminUserAccount;

// =========================================================
// Client Side: Live Progress & History Records Controller
// =========================================================
let customerAllOrdersList = [];
let currentCustomerHistoryFilter = 'ALL';

function loadClientProgressData() {
    fetch('/api/orders', {
        headers: { 'Authorization': 'Bearer ' + currentToken }
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to fetch customer orders");
        return res.json();
    })
    .then(orders => {
        customerAllOrdersList = orders || [];
        renderClientActiveProgressCards(customerAllOrdersList);
        renderCustomerHistoryRecords(customerAllOrdersList, currentCustomerHistoryFilter);
        updateClientProgressMetrics(customerAllOrdersList);
    })
    .catch(err => {
        console.error("Error loading progress data:", err);
        const container = document.getElementById('active-progress-cards-container');
        if (container) {
            container.innerHTML = '<div style="text-align:center; padding:30px; color:#ef4444;">ไม่สามารถโหลดข้อมูลความคืบหน้าได้: ' + err.message + '</div>';
        }
    });
}

function updateClientProgressMetrics(orders) {
    if (!orders) return;
    const activeOrders = orders.filter(o => o.status === 'PAID' || o.status === 'PROCESSING' || o.status === 'PENDING_PAYMENT');
    const processingOrders = orders.filter(o => o.status === 'PROCESSING');
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const refundedOrders = orders.filter(o => o.status === 'CANCELLED_REFUNDED' || o.status === 'FAILED');

    let totalSpent = 0;
    orders.forEach(o => {
        if (o.status === 'COMPLETED' || o.status === 'PAID' || o.status === 'PROCESSING') {
            totalSpent += (o.price || 0);
        }
    });

    const activeEl = document.getElementById('client-metric-active-count');
    const procEl = document.getElementById('client-metric-processing-count');
    const spentEl = document.getElementById('history-metric-total-spent');
    const compEl = document.getElementById('history-metric-completed-count');
    const refEl = document.getElementById('history-metric-refunded-count');

    if (activeEl) activeEl.innerText = activeOrders.length + ' รายการ';
    if (procEl) procEl.innerText = processingOrders.length + ' รายการ';
    if (spentEl) spentEl.innerText = '฿' + totalSpent.toLocaleString('th-TH');
    if (compEl) compEl.innerText = completedOrders.length + ' รายการ';
    if (refEl) refEl.innerText = refundedOrders.length + ' รายการ';
}

function switchClientProgressSubView(viewName) {
    const activeView = document.getElementById('client-progress-active-view');
    const historyView = document.getElementById('client-progress-history-view');

    if (viewName === 'history') {
        if (activeView) activeView.classList.add('hidden');
        if (historyView) historyView.classList.remove('hidden');
        renderCustomerHistoryRecords(customerAllOrdersList, currentCustomerHistoryFilter);
    } else {
        if (historyView) historyView.classList.add('hidden');
        if (activeView) activeView.classList.remove('hidden');
        renderClientActiveProgressCards(customerAllOrdersList);
    }
}

function filterCustomerHistoryRecords(filterType, btnEl) {
    currentCustomerHistoryFilter = filterType;
    if (btnEl) {
        document.querySelectorAll('#client-progress-history-view .btn-tag').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
    renderCustomerHistoryRecords(customerAllOrdersList, filterType);
}

function renderClientActiveProgressCards(orders) {
    const container = document.getElementById('active-progress-cards-container');
    if (!container) return;

    const activeOrders = orders.filter(o => o.status === 'PAID' || o.status === 'PROCESSING' || o.status === 'PENDING_PAYMENT');

    if (activeOrders.length === 0) {
        container.innerHTML = `
            <div style="background: #ffffff; border: 1.5px dashed #cbd5e1; border-radius: 14px; padding: 48px 24px; text-align: center;">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: #fffbeb; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px auto;">
                    <i class="fa-solid fa-clipboard-check"></i>
                </div>
                <h3 style="color: #0f172a; font-size: 18px; font-weight: 700; margin: 0 0 6px 0;">ไม่มีรายการที่อยู่ระหว่างดำเนินการในขณะนี้</h3>
                <p style="color: #64748b; font-size: 13.5px; max-width: 480px; margin: 0 auto 20px auto; line-height: 1.5;">
                    คุณสามารถเลือกทำธุรกรรมภาครัฐแบบไร้กระดาษ หรือตรวจสอบประวัติการทำรายการและเอกสารที่อนุมัติแล้วได้ที่ปุ่มด้านล่าง
                </p>
                <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="showSection('dashboard')" style="font-weight: 600; padding: 8px 18px;">
                        <i class="fa-solid fa-plus"></i> เลือกบริการใหม่ (e-Services)
                    </button>
                    <button class="btn btn-outline" onclick="switchClientProgressSubView('history')" style="font-weight: 600; padding: 8px 18px; border-color: #cbd5e1; color: #334155;">
                        <i class="fa-solid fa-clock-rotate-left text-warning"></i> ดูประวัติรายการทั้งหมด
                    </button>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    activeOrders.slice().reverse().forEach(o => {
        const serviceName = translateServiceType(o.serviceType);
        const ticketId = 'SR-2026-' + String(o.id).padStart(4, '0');
        const createdDate = new Date(o.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        let statusPill = '';
        let step1Class = 'step-done';
        let step2Class = 'step-pending';
        let step3Class = 'step-pending';
        let step4Class = 'step-pending';
        let liveNote = 'ระบบได้รับคำร้องของคุณเรียบร้อยแล้ว เจ้าหน้าที่ฝ่ายปฏิบัติการกำลังดำเนินการตรวจสอบเอกสารเบื้องต้น';

        if (o.status === 'PENDING_PAYMENT') {
            statusPill = '<span class="badge" style="background:#fef3c7; color:#92400e; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-wallet"></i> รอชำระเงิน</span>';
            step1Class = 'step-active';
            liveNote = 'กรุณาชำระเงินเพื่อเริ่มดำเนินการยื่นเรื่องต่อหน่วยงานราชการ';
        } else if (o.status === 'PAID') {
            statusPill = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-check-circle"></i> ชำระเงินแล้ว / เตรียมเอกสาร</span>';
            step1Class = 'step-done';
            step2Class = 'step-active';
            liveNote = 'ชำระเงินสำเร็จ เจ้าหน้าที่กำลังตรวจสอบเอกสารและจัดเตรียมชุดคำร้องภาครัฐ';
        } else if (o.status === 'PROCESSING') {
            statusPill = '<span class="badge" style="background:#f0fdf4; color:#15803d; font-weight:700; padding:4px 10px; border-radius:6px;"><i class="fa-solid fa-landmark"></i> กำลังยื่นเรื่องต่อหน่วยงานราชการ</span>';
            step1Class = 'step-done';
            step2Class = 'step-done';
            step3Class = 'step-active';
            liveNote = o.staffNote || 'เจ้าหน้าที่ได้เข้ายื่นเอกสารต่อหน่วยงานภาครัฐเรียบร้อยแล้ว อยู่ระหว่างการพิจารณาอนุมัติและออกเลขทะเบียน';
        }

        html += `
            <div class="card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; margin-bottom: 20px; box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.05);">
                <!-- Card Header -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <span class="badge" style="background: #0f172a; color: #fbbf24; font-family: monospace; font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: 700;">#${ticketId}</span>
                            ${statusPill}
                            <span class="badge" style="background: #ecfdf5; color: #059669; font-weight: 600; font-size: 11.5px; padding: 3px 8px; border: 1px solid #a7f3d0;"><i class="fa-solid fa-shield-halved"></i> การันตี SLA ช้าคืนเงิน 100%</span>
                        </div>
                        <h3 style="margin: 10px 0 2px 0; font-size: 17px; font-weight: 800; color: #0f172a;">${serviceName}</h3>
                        <span style="font-size: 12px; color: #64748b;"><i class="fa-regular fa-clock"></i> ส่งคำร้องเมื่อ: ${createdDate} | ค่าบริการ: <strong style="color: #0f172a;">฿${(o.price || 0).toLocaleString('th-TH')}</strong></span>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${o.status === 'PENDING_PAYMENT' ? `
                            <button class="btn btn-primary btn-sm" onclick="addToCartAndOpen(${o.id}, '${escapeQuotes(serviceName)}', ${o.price})" style="font-weight: 600;">
                                <i class="fa-solid fa-cart-shopping"></i> ชำระเงินทันที
                            </button>
                        ` : ''}
                        <a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm" style="border-color: #cbd5e1; color: #334155; font-weight: 600;">
                            <i class="fa-solid fa-file-pdf text-danger"></i> ดูใบคำขอ
                        </a>
                        <button class="btn btn-outline btn-sm" onclick="switchClientProgressSubView('history')" style="border-color: #cbd5e1; color: #334155;">
                            <i class="fa-solid fa-clock-rotate-left text-warning"></i> ดูประวัติ
                        </button>
                    </div>
                </div>

                <!-- 4-Step Visual Stepper -->
                <div style="margin: 20px 0 24px 0;">
                    <div class="progress-stepper-track" style="display: flex; justify-content: space-between; position: relative; gap: 8px; flex-wrap: wrap;">
                        
                        <!-- Step 1 -->
                        <div class="stepper-item ${step1Class}" style="flex: 1; min-width: 140px; text-align: center;">
                            <div class="step-icon-bubble" style="width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; ${step1Class === 'step-done' ? 'background:#16a34a; color:#fff;' : step1Class === 'step-active' ? 'background:#d97706; color:#fff; box-shadow:0 0 0 4px rgba(217,119,6,0.2);' : 'background:#e2e8f0; color:#64748b;'}">
                                ${step1Class === 'step-done' ? '<i class="fa-solid fa-check"></i>' : '1'}
                            </div>
                            <strong style="font-size: 12.5px; color: #0f172a; display: block;">1. ยื่นคำขอ & ชำระเงิน</strong>
                            <span style="font-size: 11px; color: #64748b;">ระบบบันทึกคำสั่งซื้อ</span>
                        </div>

                        <!-- Step 2 -->
                        <div class="stepper-item ${step2Class}" style="flex: 1; min-width: 140px; text-align: center;">
                            <div class="step-icon-bubble" style="width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; ${step2Class === 'step-done' ? 'background:#16a34a; color:#fff;' : step2Class === 'step-active' ? 'background:#2563eb; color:#fff; box-shadow:0 0 0 4px rgba(37,99,235,0.2);' : 'background:#e2e8f0; color:#64748b;'}">
                                ${step2Class === 'step-done' ? '<i class="fa-solid fa-check"></i>' : '2'}
                            </div>
                            <strong style="font-size: 12.5px; color: #0f172a; display: block;">2. ตรวจสอบเอกสาร</strong>
                            <span style="font-size: 11px; color: #64748b;">เจ้าหน้าที่ตรวจความถูกต้อง</span>
                        </div>

                        <!-- Step 3 -->
                        <div class="stepper-item ${step3Class}" style="flex: 1; min-width: 140px; text-align: center;">
                            <div class="step-icon-bubble" style="width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; ${step3Class === 'step-done' ? 'background:#16a34a; color:#fff;' : step3Class === 'step-active' ? 'background:#d97706; color:#fff; box-shadow:0 0 0 4px rgba(217,119,6,0.2);' : 'background:#e2e8f0; color:#64748b;'}">
                                ${step3Class === 'step-done' ? '<i class="fa-solid fa-check"></i>' : step3Class === 'step-active' ? '<i class="fa-solid fa-spinner fa-spin"></i>' : '3'}
                            </div>
                            <strong style="font-size: 12.5px; color: #0f172a; display: block;">3. ยื่นเรื่องภาครัฐ</strong>
                            <span style="font-size: 11px; color: #64748b;">DBD / กรมขนส่ง / สรรพากร</span>
                        </div>

                        <!-- Step 4 -->
                        <div class="stepper-item ${step4Class}" style="flex: 1; min-width: 140px; text-align: center;">
                            <div class="step-icon-bubble" style="width: 36px; height: 36px; border-radius: 50%; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; ${step4Class === 'step-done' ? 'background:#16a34a; color:#fff;' : 'background:#e2e8f0; color:#64748b;'}">
                                ${step4Class === 'step-done' ? '<i class="fa-solid fa-check"></i>' : '4'}
                            </div>
                            <strong style="font-size: 12.5px; color: #0f172a; display: block;">4. อนุมัติ & ผลลัพธ์</strong>
                            <span style="font-size: 11px; color: #64748b;">ดาวน์โหลดเอกสารจริง</span>
                        </div>

                    </div>
                </div>

                <!-- Live Update / Staff Note Banner -->
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-bullhorn text-primary" style="font-size: 16px;"></i>
                        <div>
                            <strong style="font-size: 12.5px; color: #0f172a; display: block;">อัปเดตล่าสุดจากฝ่ายปฏิบัติการ (Live Note):</strong>
                            <span style="font-size: 12.5px; color: #475569;">${liveNote}</span>
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline" onclick="openCrispChatBox()" style="font-size: 11.5px; padding: 4px 10px; border-color: #cbd5e1; color: #334155;">
                            <i class="fa-solid fa-comment-dots text-primary"></i> สอบถามเจ้าหน้าที่
                        </button>
                    </div>
                </div>

            </div>
        `;
    });

    container.innerHTML = html;
}

function renderCustomerHistoryRecords(orders, filterType) {
    const tbody = document.getElementById('customer-history-tbody');
    if (!tbody) return;

    let filtered = orders || [];
    if (filterType === 'COMPLETED') {
        filtered = filtered.filter(o => o.status === 'COMPLETED');
    } else if (filterType === 'PAID') {
        filtered = filtered.filter(o => o.status === 'PAID' || o.status === 'PROCESSING');
    } else if (filterType === 'CANCELLED') {
        filtered = filtered.filter(o => o.status === 'CANCELLED_REFUNDED' || o.status === 'FAILED');
    }

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 36px; color:#94a3b8;">ไม่พบประวัติรายการตามเงื่อนไขที่เลือก</td></tr>';
        return;
    }

    let html = '';
    filtered.slice().reverse().forEach(o => {
        const serviceName = translateServiceType(o.serviceType);
        const ticketId = 'SR-2026-' + String(o.id).padStart(4, '0');
        const dateStr = new Date(o.createdAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        let statusBadge = '';
        if (o.status === 'COMPLETED') {
            statusBadge = '<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;"><i class="fa-solid fa-circle-check"></i> สำเร็จสมบูรณ์ (COMPLETED)</span>';
        } else if (o.status === 'PAID') {
            statusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;"><i class="fa-solid fa-circle-check"></i> ชำระเงินแล้ว (PAID)</span>';
        } else if (o.status === 'PROCESSING') {
            statusBadge = '<span class="badge" style="background:#fffbeb; color:#92400e; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;"><i class="fa-solid fa-spinner fa-spin"></i> กำลังยื่นภาครัฐ (PROCESSING)</span>';
        } else if (o.status === 'CANCELLED_REFUNDED') {
            statusBadge = '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;"><i class="fa-solid fa-rotate-left"></i> ยกเลิก & คืนเงิน 100%</span>';
        } else {
            statusBadge = '<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:700; font-size:11px; padding:4px 8px; border-radius:4px;">' + (o.status || 'PENDING') + '</span>';
        }

        let docAction = '';
        if (o.officialDocumentUrl) {
            docAction = `<a href="${o.officialDocumentUrl}" target="_blank" class="btn btn-success btn-sm" style="padding:4px 10px; font-size:11.5px; font-weight:600;"><i class="fa-solid fa-file-arrow-down"></i> ดาวน์โหลดผลอนุมัติ</a>`;
        } else if (o.status === 'COMPLETED') {
            docAction = `<a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm" style="padding:4px 10px; font-size:11.5px;"><i class="fa-solid fa-download"></i> เอกสารรับรอง</a>`;
        } else {
            docAction = `<a href="/api/orders/${o.id}/document/print" target="_blank" class="btn btn-outline btn-sm" style="padding:4px 10px; font-size:11.5px;"><i class="fa-solid fa-file-lines"></i> ใบคำขอ</a>`;
        }

        const noteText = o.staffNote || (o.status === 'CANCELLED_REFUNDED' ? 'ดำเนินการคืนเงิน 100% เข้าบัญชีเรียบร้อยตามเงื่อนไข SLA Guarantee' : '-');

        html += `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:13px; font-family:monospace;">#${ticketId}</strong>
                    <div style="font-size:11.5px; color:#64748b;">${dateStr}</div>
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:13.5px; display:block;">${serviceName}</strong>
                    <span style="font-size:11px; color:#64748b;">ประเภท: ${o.serviceType || 'General'}</span>
                </td>
                <td style="padding:14px 16px;">
                    <strong style="color:#0f172a; font-size:13.5px;">฿${(o.price || 0).toLocaleString('th-TH')}</strong>
                    <div style="font-size:11px; color:#16a34a;"><i class="fa-solid fa-check"></i> Stripe / PromptPay</div>
                </td>
                <td style="padding:14px 16px;">
                    ${statusBadge}
                </td>
                <td style="padding:14px 16px;">
                    ${docAction}
                </td>
                <td style="padding:14px 16px; font-size:12px; color:#475569; max-width:220px;">
                    ${noteText}
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function openCrispChatBox() {
    const crisp = document.getElementById('crisp-body');
    const widget = document.getElementById('crisp-widget');
    if (widget) widget.classList.remove('hidden');
    if (crisp) crisp.classList.remove('hidden');
}

// Window Exports for Client Progress & History
window.loadClientProgressData = loadClientProgressData;
window.switchClientProgressSubView = switchClientProgressSubView;
window.filterCustomerHistoryRecords = filterCustomerHistoryRecords;
window.openCrispChatBox = openCrispChatBox;
window.renderGuestProgressPrompt = renderGuestProgressPrompt;


