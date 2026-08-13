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
        return ResponseEntity.ok(savedOrder);
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
            default:
                return new BigDecimal("1000.00");
        }
    }
}
