package com.edocman.controller;

import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.model.ServicePrice;
import com.edocman.model.ServicePriceHistory;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.repository.ServicePriceRepository;
import com.edocman.repository.ServicePriceHistoryRepository;
import com.edocman.service.SystemConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminController {

    @Autowired
    private ServicePriceRepository servicePriceRepository;

    @Autowired
    private ServicePriceHistoryRepository priceHistoryRepository;

    @Autowired
    private LegalServiceOrderRepository orderRepository;



    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SystemConfigService systemConfigService;

    @Autowired
    private com.edocman.service.ResendEmailService resendEmailService;

    @GetMapping("/orders")
    public ResponseEntity<List<LegalServiceOrder>> getAllOrders() {
        return ResponseEntity.ok(orderRepository.findAll());
    }

    @PostMapping("/orders/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam LegalServiceOrder.OrderStatus status) {
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        order.setStatus(status);
        orderRepository.save(order);
        return ResponseEntity.ok(order);
    }

    @PostMapping("/orders/{id}/approve")
    public ResponseEntity<?> approveOrder(@PathVariable Long id, @RequestParam(required = false) String officialDocUrl) {
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        order.setStatus(LegalServiceOrder.OrderStatus.COMPLETED);
        
        if (officialDocUrl != null && !officialDocUrl.trim().isEmpty()) {
            order.setOfficialDocumentUrl(officialDocUrl);
        } else {
            // Generate a default mock government approved document link
            order.setOfficialDocumentUrl("/api/orders/" + id + "/document/print");
        }
        
        LegalServiceOrder savedOrder = orderRepository.save(order);

        // Send Approval Email via Resend
        Optional<User> userOpt = userRepository.findByClerkUserId(savedOrder.getClerkUserId());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String docUrl = savedOrder.getOfficialDocumentUrl();
            if (docUrl != null && docUrl.startsWith("/")) {
                // Construct absolute URL for links
                docUrl = "http://localhost:8080" + docUrl;
            }
            String subject = "eDocman: เอกสารอนุมัติราชการเสร็จสมบูรณ์แล้ว - คำขอ #" + savedOrder.getId();
            String serviceName = translateServiceType(savedOrder.getServiceType());
            String bodyHtml = "<h3>คำขอทำรายการสำเร็จเรียบร้อยแล้ว</h3>" +
                    "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                    "<p>ทีมงาน eDocman ขอเรียนแจ้งให้ทราบว่า ธุรกรรม <strong>" + serviceName + "</strong> (เลขที่อ้างอิง #" + savedOrder.getId() + ") ของท่านได้รับการอนุมัติและออกเอกสารจากหน่วยงานภาครัฐเรียบร้อยแล้ว</p>" +
                    "<p>ท่านสามารถคลิกดาวน์โหลดเอกสารรับรองที่เป็นทางการได้จากลิงก์ด้านล่างนี้:</p>" +
                    "<p><a href='" + docUrl + "' style='display:inline-block; background-color:#10b981; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px; font-weight:bold;' target='_blank'>ดาวน์โหลดเอกสารผลอนุมัติ</a></p>" +
                    "<p>หรือคัดลอกลิงก์นี้เปิดในเบราว์เซอร์: " + docUrl + "</p>" +
                    "<p>ท่านยังคงสามารถเข้าสู่ระบบ eDocman เพื่อเรียกดูใบรับเงิน พิมพ์เอกสารคำร้อง หรือตรวจสอบประวัติการทำรายการได้ทุกเมื่อ</p>" +
                    "<br><p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
            try {
                resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);
            } catch (Exception e) {
                System.err.println("Failed to send approval email via Resend: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(savedOrder);
    }

    private String translateServiceType(LegalServiceOrder.ServiceType type) {
        if (type == null) return "บริการทั่วไป";
        switch (type) {
            case CAR_PRB_INSURANCE: return "พ.ร.บ. รถยนต์ ออกกรมธรรม์ทันที";
            case COMPANY_CLOSING: return "เลิกและชำระบัญชีบริษัท";
            case COMPANY_DIRECTOR_CHANGE: return "เปลี่ยนตัวกรรมการ (เจ้าของ)";
            case COMPANY_NAME_CHANGE: return "จดทะเบียนเปลี่ยนชื่อบริษัท";
            case COMPANY_NAME_RESERVATION: return "จองชื่อบริษัท (DBD)";
            case COMPANY_OPENING: return "จัดตั้งบริษัทจำกัด (บอจ.1)";
            case DBD_E_FILING: return "นำส่งงบ e-Filing";
            case FINANCIAL_STATEMENT_APPROVAL: return "อนุมัติงบการเงิน (AGM)";
            case FINANCIAL_STATEMENT_AUDIT: return "ตรวจสอบงบการเงิน (CPA)";
            case FINANCIAL_STATEMENT_PREP: return "จัดทำงบการเงินประจำปี";
            case HOUSE_REGISTRATION_UPDATE: return "แก้ไขข้อมูลทะเบียนบ้าน";
            case MEMORANDUM_AMENDMENT: return "แก้ไขหนังสือบริคณห์สนธิ";
            case PDPA_BADGE_SETUP: return "ตราสัญลักษณ์ PDPA Badge";
            case SHAREHOLDER_UPDATE: return "แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)";
            case SMART_ETAX: return "ระบบ Smart e-Tax Invoice";
            case INSURANCE_POLICY_ENDORSEMENT: return "แจ้งแก้ไข/สลักหลังกรมธรรม์";
            case INSURANCE_VOLUNTARY_MOTOR: return "ประกันภัยรถยนต์ภาคสมัครใจ ชั้น 1, 2+, 3, 3+";
            case VEHICLE_TAX_RENEWAL: return "ต่อภาษีประจำปี/ป้ายวงกลม";
            case VEHICLE_OVERDUE_TAX_FINES: return "ชำระภาษีย้อนหลังและค่าปรับจราจร";
            case VEHICLE_POWER_OF_ATTORNEY: return "หนังสือมอบอำนาจงานขนส่ง DLT";
            case VEHICLE_PLATE_REPLACEMENT: return "ขอแผ่นป้ายทะเบียนใหม่";
            case VEHICLE_BOOK_REPLACEMENT: return "ขอสมุดคู่มือจดทะเบียนใหม่";
            case VEHICLE_SPEC_ALTERATION: return "แจ้งเปลี่ยนสี/แก้ไขดัดแปลงสภาพรถ";
            case VEHICLE_PROVINCE_TRANSFER: return "ย้ายทะเบียนรถข้ามจังหวัด";
            case VISA_90DAY_REPORTING: return "รายงานตัว 90 วันออนไลน์ ตม.47";
            case VISA_TM30_NOTIFICATION: return "แจ้งที่พักอาศัยคนต่างด้าว ตม.30";
            case VISA_OUTBOUND_APPLICATION_PACK: return "ชุดเอกสารขอ eVisa และจองคิวสถานทูต";
            case SSO_ARTICLE_39_40_ENROLLMENT: return "สมัครประกันสังคม มาตรา 39 / 40";
            case SSO_HOSPITAL_CHANGE: return "ยื่นเปลี่ยนสถานพยาบาลประกันสังคม";
            case SSO_COMPENSATION_CLAIMS: return "ยื่นเบิกสิทธิประโยชน์ คลอดบุตร/สงเคราะห์บุตร/ว่างงาน";
            case TAX_PERSONAL_INCOME_EFILING: return "ยื่นภาษีเงินได้บุคคลธรรมดา ภ.ง.ด.90/91/94";
            case TAX_VAT_REGISTRATION_SUBMISSION: return "จดทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20) และยื่น ภ.พ.30";
            case TAX_WITHHOLDING_CERT_50TAWI: return "ออกหนังสือรับรองภาษีหัก ณ ที่จ่าย 50 ทวิ";
            case LICENSE_DIRECT_SALES_OCPB: return "ขอใบอนุญาตตลาดแบบตรง/ขายตรง สคบ.";
            case LICENSE_MUSIC_COPYRIGHT: return "ขอใบอนุญาตเผยแพร่ลิขสิทธิ์เพลง";
            case LICENSE_SIGNBOARD_TAX: return "คำนวณและยื่นชำระภาษีป้าย";
            case DBD_NAME_RESERVATION_ECERT: return "จองชื่อบริษัทและขอหนังสือรับรอง e-Certificate";
            case LEGAL_FORM_GENERATION: return "สร้างเอกสารสัญญาทางกฎหมายออนไลน์";
            case LEGAL_POA_DISPATCH: return "หนังสือมอบอำนาจเฉพาะทางและจัดส่งฉบับจริง";
            case LEGAL_REMOTE_ESIGN_CONTRACT: return "ร่างสัญญา NDA / สัญญาจ้างงาน / สัญญาเช่า พร้อม e-Sign";
            case LEGAL_NOTARY_TRANSLATION_HUB: return "โนตารีพับลิค แปลเอกสารรับรองและส่งคืนไปรษณีย์";
            default: return type.name();
        }
    }



    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        // Clear passwords before returning list for security
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(users);
    }

    @PostMapping("/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long userId, @RequestParam String role) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        user.setRole(role);
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/users/{userId}/ban")
    public ResponseEntity<?> toggleBanUser(@PathVariable Long userId, @RequestParam(required = false) String reason) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        user.setBanned(!user.isBanned());
        if (user.isBanned()) {
            user.setBanReason(reason != null && !reason.trim().isEmpty() ? reason.trim() : "ระงับการใช้งานโดยผู้ดูแลระบบ (Admin Suspension)");
        } else {
            user.setBanReason(null);
        }
        userRepository.save(user);
        user.setPassword(null);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/users/{userId}/send-message")
    public ResponseEntity<?> sendMessageToUser(@PathVariable Long userId, @RequestBody Map<String, String> body) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = userOpt.get();
        String subject = body.getOrDefault("subject", "ข้อความแจ้งเตือนจาก eDocman Admin");
        String message = body.getOrDefault("message", "");
        String channel = body.getOrDefault("channel", "EMAIL");

        String formattedHtml = "<h3>ข้อความจากผู้ดูแลระบบ eDocman</h3>" +
                "<p>เรียนคุณ " + (user.getFullName() != null ? user.getFullName() : user.getEmail()) + ",</p>" +
                "<div style='background:#f8fafc; border-left:4px solid #d97706; padding:12px 16px; margin:15px 0; font-size:14px; color:#1e293b;'>" +
                message.replace("\n", "<br>") +
                "</div>" +
                "<p>หากมีข้อสงสัยเพิ่มเติม สามารถตอบกลับอีเมลนี้หรือติดต่อทีมงานผ่านหน้า Support Live Chat ได้ตลอดเวลาทำการ</p>" +
                "<br><p>ขอแสดงความนับถือ,<br>ฝ่ายบริการลูกค้า eDocman</p>";

        try {
            resendEmailService.sendEmail(user.getEmail(), subject, formattedHtml);
        } catch (Exception e) {
            System.err.println("Error sending message to user via Resend: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of(
            "status", "success",
            "recipient", user.getEmail(),
            "subject", subject,
            "channel", channel,
            "message", "ส่งข้อความถึงลูกค้าเรียบร้อยแล้ว"
        ));
    }

    @GetMapping("/service-requests")
    public ResponseEntity<?> getAllServiceRequests() {
        List<LegalServiceOrder> orders = orderRepository.findAll();
        List<ServicePrice> prices = servicePriceRepository.findAll();
        Map<LegalServiceOrder.ServiceType, ServicePrice> priceMap = prices.stream()
                .collect(java.util.stream.Collectors.toMap(ServicePrice::getServiceType, p -> p, (p1, p2) -> p1));

        List<Map<String, Object>> result = orders.stream().map(order -> {
            Map<String, Object> item = new java.util.HashMap<>();
            item.put("id", order.getId());
            item.put("srNumber", "SR-2026-" + String.format("%04d", order.getId()));
            item.put("serviceType", order.getServiceType());
            item.put("serviceTitle", translateServiceType(order.getServiceType()));
            item.put("status", order.getStatus());
            item.put("clerkUserId", order.getClerkUserId());
            item.put("price", order.getPrice());
            item.put("currency", order.getCurrency());
            item.put("documentUrl", order.getDocumentUrl());
            item.put("officialDocumentUrl", order.getOfficialDocumentUrl());
            item.put("serviceData", order.getServiceData());
            item.put("createdAt", order.getCreatedAt());
            item.put("updatedAt", order.getUpdatedAt());

            // SLA calculation
            ServicePrice priceMeta = priceMap.get(order.getServiceType());
            int slaDays = (priceMeta != null && priceMeta.getSlaDays() != null) ? priceMeta.getSlaDays() : 3;
            item.put("slaDays", slaDays);

            if (order.getCreatedAt() != null) {
                java.time.LocalDateTime deadline = order.getCreatedAt().plusDays(slaDays);
                item.put("slaDeadline", deadline);
                boolean isExpired = java.time.LocalDateTime.now().isAfter(deadline);
                item.put("isSlaExpired", isExpired);
                long daysRemaining = java.time.Duration.between(java.time.LocalDateTime.now(), deadline).toDays();
                item.put("daysRemaining", daysRemaining);
            } else {
                item.put("isSlaExpired", false);
                item.put("daysRemaining", slaDays);
            }

            // Customer profile info
            Optional<User> userOpt = userRepository.findByClerkUserId(order.getClerkUserId());
            if (userOpt.isPresent()) {
                User u = userOpt.get();
                item.put("customerId", u.getId());
                item.put("customerName", u.getFullName() != null ? u.getFullName() : "-");
                item.put("customerEmail", u.getEmail());
                item.put("customerPhone", u.getPhone() != null ? u.getPhone() : "-");
                item.put("customerNationalId", u.getNationalId() != null ? u.getNationalId() : "-");
                item.put("customerCompany", u.getCompanyName() != null ? u.getCompanyName() : "-");
                item.put("customerAddress", u.getAddress() != null ? u.getAddress() : "-");
                item.put("customerBanned", u.isBanned());
            } else {
                item.put("customerId", 0);
                item.put("customerName", "Guest User");
                item.put("customerEmail", order.getClerkUserId());
                item.put("customerPhone", "-");
                item.put("customerNationalId", "-");
                item.put("customerCompany", "-");
                item.put("customerAddress", "-");
                item.put("customerBanned", false);
            }

            return item;
        }).sorted((a, b) -> {
            Long idA = (Long) a.get("id");
            Long idB = (Long) b.get("id");
            return idB.compareTo(idA);
        }).toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/service-requests/{id}/update-status")
    public ResponseEntity<?> updateServiceRequest(
            @PathVariable Long id,
            @RequestParam LegalServiceOrder.OrderStatus status,
            @RequestParam(required = false) String officialDocumentUrl,
            @RequestParam(required = false) String adminNote,
            @RequestParam(required = false, defaultValue = "true") boolean notifyCustomer) {

        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        order.setStatus(status);
        if (officialDocumentUrl != null && !officialDocumentUrl.trim().isEmpty()) {
            order.setOfficialDocumentUrl(officialDocumentUrl.trim());
        }

        LegalServiceOrder saved = orderRepository.save(order);

        if (notifyCustomer) {
            Optional<User> userOpt = userRepository.findByClerkUserId(saved.getClerkUserId());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                String serviceName = translateServiceType(saved.getServiceType());
                String subject = "eDocman: อัปเดตสถานะคำขอ " + serviceName + " (SR-2026-" + String.format("%04d", saved.getId()) + ")";
                String bodyHtml = "<h3>อัปเดตสถานะคำขอบริการภาครัฐ (Service Request)</h3>" +
                        "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                        "<p>คำขอ <strong>" + serviceName + "</strong> (รหัสคำขอ SR-2026-" + String.format("%04d", saved.getId()) + ") มีการปรับปรุงสถานะเป็น: <strong>" + status.name() + "</strong></p>" +
                        (adminNote != null && !adminNote.trim().isEmpty() ? "<p><strong>บันทึกจากเจ้าหน้าที่:</strong> " + adminNote + "</p>" : "") +
                        "<br><p>ท่านสามารถเข้าสู่ระบบ eDocman เพื่อติดตามผลงานได้ตลอด 24 ชั่วโมง</p>" +
                        "<br><p>ขอแสดงความนับถือ,<br>ฝ่ายปฏิบัติการ eDocman</p>";
                try {
                    resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);
                } catch (Exception ignored) {}
            }
        }

        return ResponseEntity.ok(saved);
    }

    @PostMapping("/users/create")
    public ResponseEntity<?> createAdminOrUser(@RequestBody User userRequest) {
        if (userRepository.findByEmail(userRequest.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Email already registered\"}");
        }
        
        User newUser = User.builder()
                .email(userRequest.getEmail())
                .fullName(userRequest.getFullName())
                .phone(userRequest.getPhone())
                .password(userRequest.getPassword()) // In a production app, we would hash this password
                .role(userRequest.getRole() != null ? userRequest.getRole() : "CUSTOMER")
                .twoFactorEnabled(false)
                .pdpaConsented(true)
                .build();
        
        User saved = userRepository.save(newUser);
        saved.setPassword(null);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable Long userId) {
        if (!userRepository.existsById(userId)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(userId);
        return ResponseEntity.ok("{\"status\": \"success\"}");
    }

    // ==========================================
    // Admin Users & Permissions Management APIs
    // ==========================================
    @GetMapping("/admins")
    public ResponseEntity<List<User>> getAdminUsers() {
        List<User> admins = userRepository.findAll().stream()
                .filter(u -> "ADMIN".equalsIgnoreCase(u.getRole()))
                .collect(Collectors.toList());
        admins.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(admins);
    }

    @PostMapping("/admins/create")
    public ResponseEntity<?> createAdminUser(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String fullName = request.get("fullName");
        String password = request.get("password");
        String phone = request.get("phone");
        String adminRoleTitle = request.get("adminRoleTitle");
        String department = request.get("department");
        String permissions = request.get("permissions");

        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Email is required\"}");
        }
        if (password == null || password.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Password is required\"}");
        }

        if (userRepository.findByEmail(email.trim().toLowerCase()).isPresent()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Email already in use\"}");
        }

        User newAdmin = User.builder()
                .email(email.trim().toLowerCase())
                .fullName(fullName != null && !fullName.trim().isEmpty() ? fullName.trim() : "Administrator")
                .phone(phone != null ? phone.trim() : "-")
                .password(hashPassword(password.trim()))
                .role("ADMIN")
                .adminRoleTitle(adminRoleTitle != null && !adminRoleTitle.trim().isEmpty() ? adminRoleTitle.trim() : "Custom Admin")
                .department(department != null && !department.trim().isEmpty() ? department.trim() : "Operations")
                .permissions(permissions != null && !permissions.trim().isEmpty() ? permissions.trim() : "VIEW_SR,VIEW_CUSTOMERS")
                .twoFactorEnabled(false)
                .pdpaConsented(true)
                .banned(false)
                .build();

        User saved = userRepository.save(newAdmin);
        saved.setPassword(null);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/admins/{adminId}/permissions")
    public ResponseEntity<?> updateAdminPermissions(@PathVariable Long adminId, @RequestBody Map<String, String> request) {
        Optional<User> adminOpt = userRepository.findById(adminId);
        if (adminOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User admin = adminOpt.get();
        if (request.containsKey("adminRoleTitle") && request.get("adminRoleTitle") != null) {
            admin.setAdminRoleTitle(request.get("adminRoleTitle"));
        }
        if (request.containsKey("department") && request.get("department") != null) {
            admin.setDepartment(request.get("department"));
        }
        if (request.containsKey("permissions") && request.get("permissions") != null) {
            admin.setPermissions(request.get("permissions"));
        }
        if (request.containsKey("fullName") && request.get("fullName") != null) {
            admin.setFullName(request.get("fullName"));
        }
        if (request.containsKey("phone") && request.get("phone") != null) {
            admin.setPhone(request.get("phone"));
        }

        User saved = userRepository.save(admin);
        saved.setPassword(null);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/admins/{adminId}/reset-password")
    public ResponseEntity<?> resetAdminPassword(@PathVariable Long adminId, @RequestBody Map<String, String> request) {
        Optional<User> adminOpt = userRepository.findById(adminId);
        if (adminOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String newPassword = request.get("password");
        if (newPassword == null || newPassword.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"error\": \"New password cannot be empty\"}");
        }

        User admin = adminOpt.get();
        admin.setPassword(hashPassword(newPassword.trim()));
        userRepository.save(admin);

        return ResponseEntity.ok("{\"status\": \"Password reset successfully\"}");
    }

    private String hashPassword(String password) {
        if (password == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Boolean>> getSystemConfig() {
        return ResponseEntity.ok(systemConfigService.getConfigMap());
    }

    @PostMapping("/config/toggle")
    public ResponseEntity<?> toggleConfig(@RequestParam String key, @RequestParam boolean value) {
        switch (key) {
            case "stripe":
                systemConfigService.setStripeSimulation(value);
                break;
            case "supabase":
                systemConfigService.setSupabaseSimulation(value);
                break;
            case "resend":
                systemConfigService.setResendSimulation(value);
                break;

            default:
                return ResponseEntity.badRequest().body("{\"error\": \"Invalid config key\"}");
        }
        return ResponseEntity.ok(systemConfigService.getConfigMap());
    }

    @PostMapping("/test-resend-automations")
    public ResponseEntity<?> testResendAutomations(@RequestParam(defaultValue = "frankminor@gmail.com") String targetEmail) {
        boolean originalSimulation = systemConfigService.isResendSimulation();
        systemConfigService.setResendSimulation(false);
        try {
            // 1. Welcome Email
            String welcomeSubject = "TEST: ยินดีต้อนรับสู่ eDocman - Welcome Email";
            String welcomeHtml = "<h3>ยินดีต้อนรับสู่ครอบครัว eDocman! (Email Automation Test)</h3>" +
                    "<p>เรียนคุณ Frank Minor,</p>" +
                    "<p>นี่คืออีเมลทดสอบระบบลงทะเบียนผู้ใช้ใหม่ของ <strong>eDocman</strong> ระบบจัดการเอกสารราชการไร้กระดาษ 100%</p>" +
                    "<p>บัญชีของท่านได้รับการลงทะเบียนเป็นสมาชิกเรียบร้อยแล้วในระบบคลาวด์</p>" +
                    "<br><p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
            resendEmailService.sendEmail(targetEmail, welcomeSubject, welcomeHtml);

            // 2. Order Confirmation
            String orderSubject = "TEST: eDocman - ใบแจ้งงานสำหรับธุรกรรม #777";
            String orderHtml = "<h3>ใบแจ้งยืนยันธุรกรรมคำขอ eDocman (Email Automation Test)</h3>" +
                    "<p>เรียนคุณ Frank Minor,</p>" +
                    "<p>นี่คืออีเมลทดสอบเมื่อมีการกรอกแบบฟอร์มทำรายการคำขอสำเร็จ รายละเอียดธุรกรรมมีดังนี้:</p>" +
                    "<ul>" +
                    "<li><strong>เลขที่อ้างอิง:</strong> #777</li>" +
                    "<li><strong>ประเภทบริการ:</strong> จัดตั้งบริษัทจำกัด (บอจ.1)</li>" +
                    "<li><strong>ยอดชำระ:</strong> 5,500 บาท</li>" +
                    "<li><strong>สถานะคำขอ:</strong> รอการชำระเงิน (Pending Payment)</li>" +
                    "</ul>" +
                    "<br><p>ขอบคุณที่ใช้บริการ,<br>ทีมงาน eDocman</p>";
            resendEmailService.sendEmail(targetEmail, orderSubject, orderHtml);

            // 3. Payment Confirmation
            String paymentSubject = "TEST: ใบยืนยันการชำระค่าบริการ eDocman - Order #777";
            String paymentHtml = "<h3>ขอบคุณสำหรับความไว้วางใจในการใช้บริการ eDocman (Email Automation Test)</h3>" +
                    "<p>เรียนคุณ Frank Minor,</p>" +
                    "<p>เราได้รับยอดชำระเงินเรียบร้อยแล้ว สำหรับบริการ: <strong>จัดตั้งบริษัทจำกัด (บอจ.1)</strong></p>" +
                    "<p><strong>ยอดชำระ:</strong> 5,500 บาท (THB)</p>" +
                    "<p>ขณะนี้คำร้องของคุณถูกส่งเข้าระบบ Paperless ไปยังหน่วยงานภาครัฐเรียบร้อยแล้ว ทีมงาน eDocman กำลังดำเนินการในขั้นตอนต่อไป</p>" +
                    "<br><p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
            resendEmailService.sendEmail(targetEmail, paymentSubject, paymentHtml);

            // 4. Order Approved
            String approvalSubject = "TEST: eDocman: เอกสารอนุมัติราชการเสร็จสมบูรณ์แล้ว - คำขอ #777";
            String approvalHtml = "<h3>คำขอทำรายการสำเร็จเรียบร้อยแล้ว (Email Automation Test)</h3>" +
                    "<p>เรียนคุณ Frank Minor,</p>" +
                    "<p>ธุรกรรม <strong>จัดตั้งบริษัทจำกัด (บอจ.1)</strong> (เลขที่อ้างอิง #777) ของท่านได้รับการอนุมัติและออกเอกสารจากหน่วยงานภาครัฐเรียบร้อยแล้ว</p>" +
                    "<p>ท่านสามารถคลิกดาวน์โหลดเอกสารรับรองที่เป็นทางการได้จากลิงก์ด้านล่างนี้:</p>" +
                    "<p><a href='http://localhost:8080/api/orders/777/document/print' style='display:inline-block; background-color:#10b981; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px; font-weight:bold;' target='_blank'>ดาวน์โหลดเอกสารผลอนุมัติ</a></p>" +
                    "<br><p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
            resendEmailService.sendEmail(targetEmail, approvalSubject, approvalHtml);

            // 5. 2FA OTP
            String otpSubject = "TEST: รหัสยืนยันความปลอดภัย 2FA สำหรับ eDocman: 123456";
            String otpHtml = "<h3>รหัสผ่านแบบใช้ครั้งเดียว (OTP) ของคุณ (Email Automation Test)</h3>" +
                    "<p>คุณกำลังล็อกอินเข้าสู่ระบบ eDocman กรุณาใช้รหัสยืนยัน 2FA ด้านล่างเพื่อเสร็จสิ้นกระบวนการ:</p>" +
                    "<h2 style='color:#d97706; letter-spacing:4px; font-family:monospace;'>123456</h2>" +
                    "<p>รหัสนี้มีอายุการใช้งาน 5 นาที</p>" +
                    "<br><p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
            resendEmailService.sendEmail(targetEmail, otpSubject, otpHtml);

            return ResponseEntity.ok("{\"status\":\"success\",\"message\":\"ส่งอีเมลทดสอบ Resend ทั้งหมด 5 รูปแบบไปยัง " + targetEmail + " เรียบร้อยแล้ว! กรุณาตรวจสอบในกล่องจดหมายเข้า (หรือสแปม)\"}");
        } finally {
            systemConfigService.setResendSimulation(originalSimulation);
        }
    }

    @GetMapping("/prices")
    public ResponseEntity<List<ServicePrice>> getServicePrices() {
        return ResponseEntity.ok(servicePriceRepository.findAll());
    }

    @PostMapping("/prices/update")
    public ResponseEntity<?> updateServicePrice(
            @RequestParam LegalServiceOrder.ServiceType serviceType,
            @RequestParam java.math.BigDecimal price,
            @RequestParam String nameTh,
            @RequestParam String category,
            @RequestParam(required = false) String contentTh,
            @RequestParam Integer slaDays) {
        
        Optional<ServicePrice> priceOpt = servicePriceRepository.findById(serviceType);
        if (priceOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        ServicePrice servicePrice = priceOpt.get();
        
        // Determine the user making the change
        String clerkUserId = com.edocman.security.UserContext.getCurrentUser();
        String changedBy = "sadminwa";
        if (clerkUserId != null) {
            Optional<User> userOpt = userRepository.findByClerkUserId(clerkUserId);
            if (userOpt.isPresent()) {
                changedBy = userOpt.get().getEmail();
            } else if (clerkUserId.contains("sadminwa")) {
                changedBy = "sadminwa";
            } else {
                changedBy = clerkUserId;
            }
        }
        
        // Log history entry
        ServicePriceHistory history = ServicePriceHistory.builder()
                .serviceType(serviceType)
                .oldPrice(servicePrice.getPrice())
                .newPrice(price)
                .oldNameTh(servicePrice.getNameTh())
                .newNameTh(nameTh)
                .oldCategory(servicePrice.getCategory())
                .newCategory(category)
                .oldContentTh(servicePrice.getContentTh())
                .newContentTh(contentTh)
                .oldSlaDays(servicePrice.getSlaDays())
                .newSlaDays(slaDays)
                .changedBy(changedBy)
                .changedAt(java.time.LocalDateTime.now())
                .build();
        priceHistoryRepository.save(history);
        
        // Update the service
        servicePrice.setPrice(price);
        servicePrice.setNameTh(nameTh);
        servicePrice.setCategory(category);
        servicePrice.setContentTh(contentTh);
        servicePrice.setSlaDays(slaDays);
        servicePriceRepository.save(servicePrice);
        
        return ResponseEntity.ok(servicePrice);
    }

    @GetMapping("/prices/history")
    public ResponseEntity<List<ServicePriceHistory>> getPriceHistory() {
        java.time.LocalDateTime sixMonthsAgo = java.time.LocalDateTime.now().minusMonths(6);
        return ResponseEntity.ok(priceHistoryRepository.findByChangedAtAfterOrderByChangedAtDesc(sixMonthsAgo));
    }
}
