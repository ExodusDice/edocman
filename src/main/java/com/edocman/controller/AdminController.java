package com.edocman.controller;

import com.edocman.model.FlowAccountSyncLog;
import com.edocman.model.LegalServiceOrder;
import com.edocman.repository.FlowAccountSyncLogRepository;
import com.edocman.repository.LegalServiceOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AdminController {

    @Autowired
    private LegalServiceOrderRepository orderRepository;

    @Autowired
    private FlowAccountSyncLogRepository logRepository;

    @GetMapping("/orders")
    public ResponseEntity<List<LegalServiceOrder>> getAllOrders() {
        // In a production app, we would verify the user has the ADMIN role.
        // For our demo/SAAS mockup, we allow this endpoint so the user can easily interact with the Mock Government Portal.
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
}
