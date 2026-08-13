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
        
        orderRepository.save(order);
        return ResponseEntity.ok(order);
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
