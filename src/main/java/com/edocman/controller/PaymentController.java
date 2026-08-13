package com.edocman.controller;

import com.edocman.model.LegalServiceOrder;
import com.edocman.model.User;
import com.edocman.repository.LegalServiceOrderRepository;
import com.edocman.repository.UserRepository;
import com.edocman.security.UserContext;
import com.edocman.service.FlowAccountSyncService;
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
    private FlowAccountSyncService flowAccountSyncService;

    @Autowired
    private ResendEmailService resendEmailService;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @PostMapping("/create-intent")
    public ResponseEntity<?> createIntent(@RequestBody Map<String, Object> request) {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized\"}");
        }

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
                        processSuccessfulPayment(Long.valueOf(orderIdStr), paymentIntent.getId(), paymentIntent.getStatus());
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
    @PostMapping("/{orderId}/simulate-success")
    public ResponseEntity<?> simulateSuccess(@PathVariable Long orderId) {
        Optional<LegalServiceOrder> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        LegalServiceOrder order = orderOpt.get();
        String mockIntentId = order.getStripePaymentIntentId() != null ? order.getStripePaymentIntentId() : "pi_mock_success";
        
        System.out.println("Processing simulated payment success for Order ID: " + orderId);
        boolean processed = processSuccessfulPayment(orderId, mockIntentId, "succeeded");

        if (processed) {
            return ResponseEntity.ok("{\"status\": \"success\", \"message\": \"Simulated payment processed, notification emails sent, FlowAccount synchronization initialized.\"}");
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

        // 1. Sync to FlowAccount
        try {
            flowAccountSyncService.syncOrderToFlowAccount(order, email, name);
        } catch (Exception e) {
            System.err.println("FlowAccount sync failed: " + e.getMessage());
        }

        // 2. Send transaction confirmation email via Resend
        String emailSubject = "ใบยืนยันการชำระค่าบริการ eDocman - Order #" + order.getId();
        String emailHtml = "<h3>ขอบคุณสำหรับความไว้วางใจในการใช้บริการ eDocman</h3>" +
                "<p>เรียนคุณ " + name + ",</p>" +
                "<p>เราได้รับยอดชำระเงินเรียบร้อยแล้ว สำหรับบริการ: <strong>" + order.getServiceType() + "</strong></p>" +
                "<p><strong>ยอดชำระ:</strong> " + order.getPrice() + " บาท (THB)</p>" +
                "<p>ขณะนี้คำร้องของคุณถูกส่งเข้าระบบ Paperless ไปยังหน่วยงานภาครัฐเรียบร้อยแล้ว ทีมงาน eDocman กำลังดำเนินการในขั้นตอนต่อไป</p>" +
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
}
