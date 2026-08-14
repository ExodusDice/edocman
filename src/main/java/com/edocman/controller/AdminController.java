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
}
