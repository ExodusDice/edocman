package com.edocman.controller;

import com.edocman.model.FlowAccountSyncLog;
import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.repository.FlowAccountSyncLogRepository;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.service.SystemConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminController {

    @Autowired
    private LegalServiceOrderRepository orderRepository;

    @Autowired
    private FlowAccountSyncLogRepository logRepository;

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
            case CAR_PRB_INSURANCE: return "ประกันภัย พ.ร.บ. รถยนต์";
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
            default: return type.name();
        }
    }

    @GetMapping("/logs/{orderId}")
    public ResponseEntity<List<FlowAccountSyncLog>> getLogsByOrderId(@PathVariable Long orderId) {
        return ResponseEntity.ok(logRepository.findByOrderId(orderId));
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        // Clear passwords before returning list for security
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(users);
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
            case "flowaccount":
                systemConfigService.setFlowAccountSimulation(value);
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
}
