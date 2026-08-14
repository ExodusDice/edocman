package com.edocman.controller;

import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.security.UserContext;
import com.edocman.service.DocumentGeneratorService;
import com.edocman.service.SupabaseStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class OrderController {

    @Autowired
    private LegalServiceOrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired
    private DocumentGeneratorService documentGeneratorService;

    @Autowired
    private com.edocman.service.ResendEmailService resendEmailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping
    public ResponseEntity<?> createOrder(@RequestBody LegalServiceOrder orderRequest) {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized\"}");
        }

        BigDecimal servicePrice = getStandardPrice(orderRequest.getServiceType());
        
        LegalServiceOrder order = LegalServiceOrder.builder()
                .clerkUserId(clerkUserId)
                .serviceType(orderRequest.getServiceType())
                .status(LegalServiceOrder.OrderStatus.PENDING_PAYMENT)
                .price(servicePrice)
                .currency("THB")
                .serviceData(orderRequest.getServiceData())
                .build();

        LegalServiceOrder savedOrder = orderRepository.save(order);

        // Send Order Creation confirmation email
        Optional<User> userOpt = userRepository.findByClerkUserId(clerkUserId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String subject = "eDocman: ใบแจ้งงานสำหรับธุรกรรม #" + savedOrder.getId();
            String serviceName = translateServiceType(savedOrder.getServiceType());
            String bodyHtml = "<h3>ใบแจ้งยืนยันธุรกรรมคำขอ eDocman</h3>" +
                    "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                    "<p>ระบบได้รับคำขอทำรายการแบบฟอร์มออนไลน์สำเร็จแล้ว รายละเอียดธุรกรรมมีดังนี้:</p>" +
                    "<ul>" +
                    "<li><strong>เลขที่อ้างอิง:</strong> #" + savedOrder.getId() + "</li>" +
                    "<li><strong>ประเภทบริการ:</strong> " + serviceName + "</li>" +
                    "<li><strong>ยอดชำระ:</strong> " + savedOrder.getPrice() + " บาท</li>" +
                    "<li><strong>สถานะคำขอ:</strong> รอการชำระเงิน (Pending Payment)</li>" +
                    "</ul>" +
                    "<p>คุณสามารถดำเนินการเข้าสู่หน้าแดชบอร์ดเพื่อชำระเงิน หรือจัดการข้อมูลเพิ่มเติมได้ตลอดเวลา</p>" +
                    "<br><p>ขอบคุณที่ใช้บริการ,<br>ทีมงาน eDocman</p>";
            try {
                resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);
            } catch (Exception e) {
                System.err.println("Failed to send order email via Resend: " + e.getMessage());
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

    @GetMapping
    public ResponseEntity<List<LegalServiceOrder>> getMyOrders() {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(orderRepository.findByClerkUserId(clerkUserId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOrderDetails(@PathVariable Long id) {
        String clerkUserId = UserContext.getCurrentUser();
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        // Allow access to own order or if it is admin
        if (!order.getClerkUserId().equals(clerkUserId) && !"mock-admin-id".equals(clerkUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\": \"Access denied\"}");
        }

        return ResponseEntity.ok(order);
    }

    @PostMapping("/{id}/upload")
    public ResponseEntity<?> uploadAttachment(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String clerkUserId = UserContext.getCurrentUser();
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);

        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        if (!order.getClerkUserId().equals(clerkUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\": \"Access denied\"}");
        }

        try {
            // Upload to Supabase bucket folder named after service type
            String folder = order.getServiceType().name().toLowerCase();
            String fileUrl = supabaseStorageService.uploadFile(file, folder);

            // Parse current serviceData JSON, inject file URL, and save back
            Map<String, Object> dataMap = new HashMap<>();
            if (order.getServiceData() != null && !order.getServiceData().isEmpty()) {
                dataMap = objectMapper.readValue(order.getServiceData(), Map.class);
            }
            dataMap.put("attachmentUrl", fileUrl);
            order.setServiceData(objectMapper.writeValueAsString(dataMap));
            
            // Set as documentUrl for easy clicking/viewing
            order.setDocumentUrl(fileUrl);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of("url", fileUrl));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("{\"error\": \"File upload failed: " + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/{id}/document/print")
    public ResponseEntity<String> printDocument(@PathVariable Long id) {
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(id);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        
        // Find user full name
        Optional<User> userOpt = userRepository.findByClerkUserId(order.getClerkUserId());
        String customerName = userOpt.isPresent() ? userOpt.get().getFullName() : "ลูกค้าผู้ใช้บริการ";
        if (customerName == null || customerName.isEmpty()) customerName = "ลูกค้าผู้ใช้บริการ";

        String htmlContent = documentGeneratorService.generateHtmlDocument(order, customerName);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.TEXT_HTML);
        
        return new ResponseEntity<>(htmlContent, headers, HttpStatus.OK);
    }

    private BigDecimal getStandardPrice(LegalServiceOrder.ServiceType type) {
        if (type == null) return BigDecimal.ZERO;
        switch (type) {
            case COMPANY_NAME_RESERVATION:
                return new BigDecimal("490.00");
            case COMPANY_OPENING:
                return new BigDecimal("4900.00");
            case COMPANY_CLOSING:
                return new BigDecimal("9900.00");
            case DBD_E_FILING:
                return new BigDecimal("1900.00");
            case CAR_PRB_INSURANCE:
                return new BigDecimal("645.00");
            case HOUSE_REGISTRATION_UPDATE:
                return new BigDecimal("990.00");
            case PDPA_BADGE_SETUP:
                return new BigDecimal("890.00");
            case COMPANY_NAME_CHANGE:
                return new BigDecimal("1900.00");
            case MEMORANDUM_AMENDMENT:
                return new BigDecimal("2900.00");
            case FINANCIAL_STATEMENT_PREP:
                return new BigDecimal("4500.00");
            case COMPANY_DIRECTOR_CHANGE:
                return new BigDecimal("1900.00");
            case SHAREHOLDER_UPDATE:
                return new BigDecimal("1200.00");
            case FINANCIAL_STATEMENT_AUDIT:
                return new BigDecimal("7500.00");
            case FINANCIAL_STATEMENT_APPROVAL:
                return new BigDecimal("1500.00");
            case SMART_ETAX:
                return new BigDecimal("2500.00");
            default:
                return new BigDecimal("1000.00");
        }
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> createOrdersBulk(@RequestBody List<LegalServiceOrder> orderRequests) {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized\"}");
        }

        List<LegalServiceOrder> savedOrders = new java.util.ArrayList<>();
        Optional<User> userRepositoryOpt = userRepository.findByClerkUserId(clerkUserId);

        for (LegalServiceOrder req : orderRequests) {
            BigDecimal servicePrice = getStandardPrice(req.getServiceType());
            LegalServiceOrder order = LegalServiceOrder.builder()
                    .clerkUserId(clerkUserId)
                    .serviceType(req.getServiceType())
                    .status(LegalServiceOrder.OrderStatus.PENDING_PAYMENT)
                    .price(servicePrice)
                    .currency("THB")
                    .serviceData(req.getServiceData())
                    .build();
            LegalServiceOrder saved = orderRepository.save(order);
            savedOrders.add(saved);

            // Send Order Creation confirmation email for each order
            if (userRepositoryOpt.isPresent()) {
                User user = userRepositoryOpt.get();
                String subject = "eDocman: ใบแจ้งงานสำหรับธุรกรรม #" + saved.getId();
                String serviceName = translateServiceType(saved.getServiceType());
                String bodyHtml = "<h3>ใบแจ้งยืนยันธุรกรรมคำขอ eDocman</h3>" +
                        "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                        "<p>ระบบได้รับคำขอทำรายการแบบฟอร์มออนไลน์สำเร็จแล้ว รายละเอียดธุรกรรมมีดังนี้:</p>" +
                        "<ul>" +
                        "<li><strong>เลขที่อ้างอิง:</strong> #" + saved.getId() + "</li>" +
                        "<li><strong>ประเภทบริการ:</strong> " + serviceName + "</li>" +
                        "<li><strong>ยอดชำระ:</strong> " + saved.getPrice() + " บาท</li>" +
                        "<li><strong>สถานะคำขอ:</strong> รอการชำระเงิน (Pending Payment)</li>" +
                        "</ul>" +
                        "<p>คุณสามารถดำเนินการเข้าสู่หน้าแดชบอร์ดเพื่อชำระเงิน หรือจัดการข้อมูลเพิ่มเติมได้ตลอดเวลา</p>" +
                        "<br><p>ขอบคุณที่ใช้บริการ,<br>ทีมงาน eDocman</p>";
                try {
                    resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);
                } catch (Exception e) {
                    System.err.println("Failed to send order email via Resend: " + e.getMessage());
                }
            }
        }

        return ResponseEntity.ok(savedOrders);
    }
}
