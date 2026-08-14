package com.edocman.controller;

import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.repository.ServicePriceRepository;
import com.edocman.model.ServicePrice;
import com.edocman.security.UserContext;
import com.edocman.service.ResendEmailService;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.net.Webhook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class PaymentController {

    @Autowired
    private LegalServiceOrderRepository orderRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.edocman.service.StripePaymentService stripePaymentService;

    @Autowired
    private ResendEmailService resendEmailService;

    @Autowired
    private ServicePriceRepository servicePriceRepository;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @PostMapping("/create-intent")
    public ResponseEntity<?> createIntent(@RequestBody Map<String, Object> request) {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized\"}");
        }

        if (request.containsKey("orderIds")) {
            java.util.List<?> idsObj = (java.util.List<?>) request.get("orderIds");
            if (idsObj == null || idsObj.isEmpty()) {
                return ResponseEntity.badRequest().body("{\"error\": \"No orderIds provided\"}");
            }
            
            java.math.BigDecimal totalAmount = java.math.BigDecimal.ZERO;
            java.util.List<LegalServiceOrder> orders = new java.util.ArrayList<>();
            StringBuilder sb = new StringBuilder();

            for (Object idObj : idsObj) {
                Long orderId = Long.valueOf(idObj.toString());
                Optional<LegalServiceOrder> orderOpt = orderRepository.findById(orderId);
                if (orderOpt.isEmpty()) {
                    return ResponseEntity.notFound().build();
                }
                LegalServiceOrder order = orderOpt.get();
                if (!order.getClerkUserId().equals(clerkUserId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\": \"Access denied\"}");
                }
                totalAmount = totalAmount.add(order.getPrice());
                orders.add(order);
                if (sb.length() > 0) sb.append(",");
                sb.append(orderId);
            }

            try {
                String commaSeparatedIds = sb.toString();
                Map<String, Object> paymentData = stripePaymentService.createPaymentIntent(
                        totalAmount, "THB", commaSeparatedIds);
                
                String intentId = (String) paymentData.get("id");
                for (LegalServiceOrder order : orders) {
                    order.setStripePaymentIntentId(intentId);
                    order.setStripePaymentStatus("intent_created");
                    order.setStatus(LegalServiceOrder.OrderStatus.PENDING_PAYMENT);
                    orderRepository.save(order);
                }

                return ResponseEntity.ok(paymentData);
            } catch (Exception e) {
                return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
            }
        } else {
            Long orderId = Long.valueOf(request.get("orderId").toString());
            Optional<LegalServiceOrder> orderOpt = orderRepository.findById(orderId);

            if (orderOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            LegalServiceOrder order = orderOpt.get();
            if (!order.getClerkUserId().equals(clerkUserId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("{\"error\": \"Access denied\"}");
            }

            try {
                Map<String, Object> paymentData = stripePaymentService.createPaymentIntent(
                        order.getPrice(), order.getCurrency(), order.getId().toString());
                
                order.setStripePaymentIntentId((String) paymentData.get("id"));
                order.setStripePaymentStatus("intent_created");
                order.setStatus(LegalServiceOrder.OrderStatus.PENDING_PAYMENT);
                orderRepository.save(order);

                return ResponseEntity.ok(paymentData);
            } catch (Exception e) {
                return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
            }
        }
    }

    /**
     * Real Stripe webhook endpoint.
     */
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(@RequestBody String payload, @RequestHeader("Stripe-Signature") String sigHeader) {
        if (stripePaymentService.isSimulation()) {
            return ResponseEntity.ok("Webhook ignored (Simulation Active)");
        }

        try {
            Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);

            if ("payment_intent.succeeded".equals(event.getType())) {
                PaymentIntent paymentIntent = (PaymentIntent) event.getDataObjectDeserializer().getObject().orElse(null);
                if (paymentIntent != null) {
                    String orderIdStr = paymentIntent.getMetadata().get("orderId");
                    if (orderIdStr != null) {
                        if (orderIdStr.contains(",")) {
                            String[] ids = orderIdStr.split(",");
                            for (String id : ids) {
                                processSuccessfulPayment(Long.valueOf(id.trim()), paymentIntent.getId(), paymentIntent.getStatus());
                            }
                        } else {
                            processSuccessfulPayment(Long.valueOf(orderIdStr), paymentIntent.getId(), paymentIntent.getStatus());
                        }
                    }
                }
            }

            return ResponseEntity.ok("Webhook Handled Successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Webhook Error: " + e.getMessage());
        }
    }

    /**
     * Endpoint to manually mock Stripe success for easy local/sandbox testing.
     */
    @PostMapping("/{orderIdStr}/simulate-success")
    public ResponseEntity<?> simulateSuccess(@PathVariable String orderIdStr) {
        String[] idStrings = orderIdStr.split(",");
        boolean anyProcessed = false;
        String mockIntentId = "pi_mock_success";

        for (String idStr : idStrings) {
            Long orderId = Long.valueOf(idStr.trim());
            Optional<LegalServiceOrder> orderOpt = orderRepository.findById(orderId);
            if (orderOpt.isPresent()) {
                LegalServiceOrder order = orderOpt.get();
                if (order.getStripePaymentIntentId() != null) {
                    mockIntentId = order.getStripePaymentIntentId();
                }
                System.out.println("Processing simulated payment success for Order ID: " + orderId);
                boolean processed = processSuccessfulPayment(orderId, mockIntentId, "succeeded");
                if (processed) {
                    anyProcessed = true;
                }
            }
        }

        if (anyProcessed) {
            return ResponseEntity.ok("{\"status\": \"success\", \"message\": \"Simulated payment processed, notification emails sent.\"}");
        } else {
            return ResponseEntity.status(500).body("{\"error\": \"Simulation failed\"}");
        }
    }

    private boolean processSuccessfulPayment(Long orderId, String intentId, String status) {
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return false;
        }

        LegalServiceOrder order = orderOpt.get();
        if (order.getStatus() == LegalServiceOrder.OrderStatus.PAID || order.getStatus() == LegalServiceOrder.OrderStatus.PROCESSING || order.getStatus() == LegalServiceOrder.OrderStatus.COMPLETED) {
            return true; // Already processed
        }

        // Update status to Paid and Processing
        order.setStatus(LegalServiceOrder.OrderStatus.PAID);
        order.setStripePaymentIntentId(intentId);
        order.setStripePaymentStatus(status);
        orderRepository.save(order);

        // Retrieve user details
        Optional<User> userOpt = userRepository.findByClerkUserId(order.getClerkUserId());
        String email = userOpt.isPresent() ? userOpt.get().getEmail() : "customer@example.com";
        String name = userOpt.isPresent() ? userOpt.get().getFullName() : "ลูกค้า eDocman";
        if (name == null || name.isEmpty()) name = "ลูกค้า eDocman";



        // Load the SLA days from the database
        int slaDays = 5;
        Optional<ServicePrice> priceOpt = servicePriceRepository.findById(order.getServiceType());
        if (priceOpt.isPresent()) {
            slaDays = priceOpt.get().getSlaDays();
        }

        // 2. Send transaction confirmation email via Resend
        String emailSubject = "ใบยืนยันการชำระค่าบริการ eDocman - Order #" + order.getId();
        String serviceName = translateServiceType(order.getServiceType());
        String emailHtml = "<h3>ขอบคุณสำหรับความไว้วางใจในการใช้บริการ eDocman</h3>" +
                "<p>เรียนคุณ " + name + ",</p>" +
                "<p>เราได้รับยอดชำระเงินเรียบร้อยแล้ว สำหรับบริการ: <strong>" + serviceName + "</strong></p>" +
                "<p><strong>ยอดชำระ:</strong> " + order.getPrice() + " บาท (THB)</p>" +
                "<p><strong>กำหนดระยะเวลาดำเนินการ (SLA):</strong> " + slaDays + " วันทำการ (Working Days)</p>" +
                "<p style='font-size: 12px; color: #d97706; margin-top: -10px;'><em>*หมายเหตุ: ระยะเวลา SLA นับเฉพาะวันทำการปกติ ไม่นับรวมวันเสาร์ วันอาทิตย์ และวันหยุดราชการ/วันหยุดนักขัตฤกษ์ตามปฏิทินไทย</em></p>" +
                "<br>" +
                "<div style='border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 15px; border-radius: 6px; font-size: 13px; line-height: 1.5; color: #334155;'>" +
                "  <strong style='color:#1e293b;'>ข้อกำหนดการใช้งานและคำเตือน (Terms of Use & Warning):</strong>" +
                "  <ul style='margin-top: 8px; padding-left: 20px;'>" +
                "    <li><strong>การเริ่มนับ SLA:</strong> ระยะเวลา SLA จะเริ่มนับเมื่อทางแอดมินตรวจสอบแล้วพบว่าข้อมูลและเอกสารที่ท่านส่งมาในแบบฟอร์มมีความถูกต้องและครบถ้วนสมบูรณ์แล้ว</li>" +
                "    <li><strong>คำเตือน (Warning):</strong> หากเอกสารที่ท่านอัปโหลดไม่ถูกต้อง ไม่ชัดเจน หรือข้อมูลไม่ครบถ้วน ระยะเวลา SLA จะถูกระงับชั่วคราว (Paused) ทันที และจะเริ่มนับต่อเมื่อได้รับเอกสารที่แก้ไขเสร็จสิ้น</li>" +
                "    <li><strong>การรับประกันการคืนเงิน (Refund Policy):</strong> หาก eDocman ไม่สามารถดำเนินการยื่นคำขอให้กับภาครัฐได้สำเร็จภายในกำหนดเวลา SLA ดังกล่าวอันมีสาเหตุจากความล่าช้าในขั้นตอนของระบบ eDocman เอง (ยกเว้นความล่าช้าอันเนื่องจากระบบรับเรื่องของภาครัฐขัดข้อง หรือเหตุสุดวิสัยอื่นๆ) ท่านมีสิทธิ์ขอรับเงินคืนเต็มจำนวน (100% Full Refund) ของค่าบริการนี้</li>" +
                "  </ul>" +
                "</div>" +
                "<br>" +
                "<p>ขณะนี้คำร้องของคุณถูกส่งเข้าระบบ Paperless เรียบร้อยแล้ว ทีมงาน eDocman กำลังตรวจสอบเอกสารของท่านและจะดำเนินการในขั้นตอนต่อไปอย่างรวดเร็วที่สุด</p>" +
                "<p>คุณสามารถดาวน์โหลดแบบฟอร์มที่กรอกข้อมูลสมบูรณ์ หรือตรวจสอบสถานะได้ตลอดเวลาผ่านทาง แดชบอร์ด eDocman ของคุณ</p>" +
                "<br>" +
                "<p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
        
        try {
            resendEmailService.sendEmail(email, emailSubject, emailHtml);
        } catch (Exception e) {
            System.err.println("Resend email delivery failed: " + e.getMessage());
        }

        return true;
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
}
