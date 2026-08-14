package com.edocman.controller;

import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.model.ServicePrice;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.repository.ServicePriceRepository;
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
import jakarta.annotation.PostConstruct;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class OrderController {

    @Autowired
    private ServicePriceRepository servicePriceRepository;

    @PostConstruct
    public void initPrices() {
        if (servicePriceRepository.count() == 0) {
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.COMPANY_NAME_RESERVATION, new BigDecimal("490.00"), "จองชื่อบริษัท (DBD)", "จดทะเบียนธุรกิจ", "บริการจองชื่อบริษัทจำกัดผ่านระบบกรมพัฒนาธุรกิจการค้า (DBD) รวดเร็ว ถูกต้องตามหลักเกณฑ์", 2));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.COMPANY_OPENING, new BigDecimal("4900.00"), "จัดตั้งบริษัทจำกัด (บอจ.1)", "จดทะเบียนธุรกิจ", "บริการจดทะเบียนจัดตั้งบริษัทจำกัด (บอจ.1) เตรียมเอกสารจดทะเบียนครบวงจรพร้อมยื่นกรมพัฒนาธุรกิจการค้า", 5));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.COMPANY_CLOSING, new BigDecimal("9900.00"), "เลิกและชำระบัญชีบริษัท", "จดทะเบียนธุรกิจ", "บริการจดทะเบียนเลิกบริษัทและชำระบัญชี จัดการงานเอกสารและผู้สอบบัญชีครบวงจรเพื่อความถูกต้องทางกฎหมาย", 30));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.DBD_E_FILING, new BigDecimal("1900.00"), "นำส่งงบ e-Filing", "ภาษีและบัญชี", "บริการนำส่งงบการเงินผ่านระบบ DBD e-Filing ของกรมพัฒนาธุรกิจการค้า ประจำปีอย่างถูกต้องตามกำหนดเวลา", 3));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.CAR_PRB_INSURANCE, new BigDecimal("645.00"), "ประกันภัย พ.ร.บ. รถยนต์", "ประกันภัย", "บริการต่ออายุประกันภัยภาคบังคับ (พ.ร.บ. รถยนต์) คุ้มครองผู้ประสบภัยจากรถตามกฎหมาย", 1));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.HOUSE_REGISTRATION_UPDATE, new BigDecimal("990.00"), "แก้ไขข้อมูลทะเบียนบ้าน", "ทะเบียนราษฎร์", "บริการยื่นคำร้องขอแก้ไขข้อมูลทะเบียนบ้าน ย้ายเข้า-ย้ายออก หรือขอสมุดทะเบียนบ้านเล่มใหม่", 3));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.PDPA_BADGE_SETUP, new BigDecimal("890.00"), "ตราสัญลักษณ์ PDPA Badge", "ระบบและเทคโนโลยี", "บริการประเมินและตั้งค่าตราสัญลักษณ์ PDPA Consent Badge สำหรับแสดงบนเว็บไซต์ เพื่อความสอดคล้องกับ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล", 2));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.COMPANY_NAME_CHANGE, new BigDecimal("1900.00"), "จดทะเบียนเปลี่ยนชื่อบริษัท", "จดทะเบียนธุรกิจ", "บริการจดทะเบียนเปลี่ยนชื่อบริษัทจำกัด ยื่นขอแก้ไขตราประทับและหนังสือบริคณห์สนธิที่กรมพัฒนาธุรกิจการค้า", 5));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.MEMORANDUM_AMENDMENT, new BigDecimal("2900.00"), "แก้ไขหนังสือบริคณห์สนธิ", "จดทะเบียนธุรกิจ", "บริการยื่นคำขอแก้ไขเพิ่มเติมหนังสือบริคณห์สนธิ (มติพิเศษ) ต่อกรมพัฒนาธุรกิจการค้า", 5));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.FINANCIAL_STATEMENT_PREP, new BigDecimal("4500.00"), "จัดทำงบการเงินประจำปี", "ภาษีและบัญชี", "บริการจัดทำงบแสดงฐานะการเงิน งบกำไรขาดทุน และรายละเอียดประกอบงบการเงินสำหรับนิติบุคคล", 10));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.COMPANY_DIRECTOR_CHANGE, new BigDecimal("1900.00"), "เปลี่ยนตัวกรรมการ (เจ้าของ)", "จดทะเบียนธุรกิจ", "บริการจดทะเบียนเปลี่ยนตัวกรรมการบริษัท เข้าหรือออก ยื่นคำขอพร้อมรายงานผู้ถือหุ้นและกรรมการใหม่", 3));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.SHAREHOLDER_UPDATE, new BigDecimal("1200.00"), "แก้ไขรายชื่อผู้ถือหุ้น (บอจ.5)", "จดทะเบียนธุรกิจ", "บริการยื่นบัญชีรายชื่อผู้ถือหุ้น (บอจ.5) ฉบับล่าสุด หรือกรณีมีการสลับ/โอนหุ้น ระหว่างปี", 2));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.FINANCIAL_STATEMENT_AUDIT, new BigDecimal("7500.00"), "ตรวจสอบงบการเงิน (CPA)", "ภาษีและบัญชี", "บริการตรวจสอบบัญชีโดยผู้สอบบัญชีรับอนุญาต (CPA) แสดงความเห็นต่องบการเงินตามมาตรฐานการรายงานทางการเงิน", 15));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.FINANCIAL_STATEMENT_APPROVAL, new BigDecimal("1500.00"), "อนุมัติงบการเงิน (AGM)", "ภาษีและบัญชี", "บริการจัดการส่งรายงานการประชุมสามัญผู้ถือหุ้นประจำปี (AGM) เพื่ออนุมัติงบการเงิน", 5));
            servicePriceRepository.save(new ServicePrice(LegalServiceOrder.ServiceType.SMART_ETAX, new BigDecimal("2500.00"), "ระบบ Smart e-Tax Invoice", "ภาษีและบัญชี", "ระบบยื่นขอใบกำกับภาษีอิเล็กทรอนิกส์และใบรับอิเล็กทรอนิกส์ (e-Tax Invoice & e-Receipt) กับกรมสรรพากร", 7));
        }
    }

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
        return servicePriceRepository.findById(type)
                .map(ServicePrice::getPrice)
                .orElse(new BigDecimal("1000.00"));
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
