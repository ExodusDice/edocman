package com.edocman.service;

import com.edocman.model.FlowAccountSyncLog;
import com.edocman.model.LegalServiceOrder;
import com.edocman.repository.FlowAccountSyncLogRepository;
import com.edocman.repository.LegalServiceOrderRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class FlowAccountSyncService {

    @Value("${flowaccount.client.id}")
    private String clientId;

    @Value("${flowaccount.client.secret}")
    private String clientSecret;

    @Autowired
    private SystemConfigService systemConfigService;

    @Autowired
    private FlowAccountSyncLogRepository logRepository;

    @Autowired
    private LegalServiceOrderRepository orderRepository;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean syncOrderToFlowAccount(LegalServiceOrder order, String customerEmail, String customerName) {
        String requestPayload = "";
        String responsePayload = "";
        int httpStatus = 200;
        boolean success = true;
        String errorMessage = null;
        String documentId = null;

        try {
            // Prepare FlowAccount request data
            Map<String, Object> invoiceData = new HashMap<>();
            invoiceData.put("recordName", customerName);
            invoiceData.put("recordEmail", customerEmail);
            invoiceData.put("documentDate", LocalDateTime.now().toString());
            invoiceData.put("description", "Legal Service: " + order.getServiceType().name());
            invoiceData.put("amount", order.getPrice());
            invoiceData.put("currency", order.getCurrency());
            invoiceData.put("paymentMethod", order.getStripePaymentStatus() != null ? order.getStripePaymentStatus() : "Stripe");

            // Convert map to simple description string for logging
            requestPayload = invoiceData.toString();

            if (systemConfigService.isFlowAccountSimulation()) {
                documentId = "INV-FA-MOCK-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                responsePayload = "{\n" +
                        "  \"status\": \"success\",\n" +
                        "  \"message\": \"FlowAccount Document Created (Simulated)\",\n" +
                        "  \"data\": {\n" +
                        "    \"documentId\": \"" + documentId + "\",\n" +
                        "    \"documentType\": \"Receipt\",\n" +
                        "    \"totalAmount\": " + order.getPrice() + ",\n" +
                        "    \"syncedAt\": \"" + LocalDateTime.now() + "\"\n" +
                        "  }\n" +
                        "}";
                
                System.out.println("====== [FLOWACCOUNT SYNC SIMULATION] ======");
                System.out.println("Request to FlowAccount API: " + requestPayload);
                System.out.println("Response: " + responsePayload);
                System.out.println("===========================================");
            } else {
                // Call FlowAccount OAuth API to obtain access token
                String tokenUrl = "https://sharedapi.flowaccount.com/v3/token";
                HttpHeaders tokenHeaders = new HttpHeaders();
                tokenHeaders.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
                
                String authBody = "grant_type=client_credentials&client_id=" + clientId + "&client_secret=" + clientSecret;
                HttpEntity<String> tokenRequest = new HttpEntity<>(authBody, tokenHeaders);
                
                ResponseEntity<Map> tokenResponse = restTemplate.postForEntity(tokenUrl, tokenRequest, Map.class);
                if (!tokenResponse.getStatusCode().is2xxSuccessful() || tokenResponse.getBody() == null) {
                    throw new Exception("Failed to authenticate with FlowAccount: " + tokenResponse.getStatusCode());
                }
                
                String accessToken = (String) tokenResponse.getBody().get("access_token");

                // Call FlowAccount API to create receipt/invoice
                String documentUrl = "https://sharedapi.flowaccount.com/v3/receipts";
                HttpHeaders headers = new HttpHeaders();
                headers.setBearerAuth(accessToken);
                headers.setContentType(MediaType.APPLICATION_JSON);

                // Construct real FlowAccount payload structure
                Map<String, Object> realPayload = new HashMap<>();
                realPayload.put("contactName", customerName);
                realPayload.put("contactEmail", customerEmail);
                realPayload.put("publishedOn", LocalDateTime.now().toLocalDate().toString());
                
                Map<String, Object> item = new HashMap<>();
                item.put("name", "Legal Service Fee - " + order.getServiceType().name());
                item.put("quantity", 1);
                item.put("price", order.getPrice());
                item.put("excludeVat", order.getPrice());
                
                realPayload.put("items", new Object[]{item});
                realPayload.put("subTotal", order.getPrice());
                realPayload.put("total", order.getPrice());

                HttpEntity<Map<String, Object>> entity = new HttpEntity<>(realPayload, headers);
                ResponseEntity<Map> documentResponse = restTemplate.postForEntity(documentUrl, entity, Map.class);
                
                httpStatus = documentResponse.getStatusCode().value();
                if (documentResponse.getStatusCode().is2xxSuccessful() && documentResponse.getBody() != null) {
                    responsePayload = documentResponse.getBody().toString();
                    Map<String, Object> data = (Map<String, Object>) documentResponse.getBody().get("data");
                    if (data != null) {
                        documentId = (String) data.get("documentId");
                    }
                } else {
                    throw new Exception("FlowAccount document creation failed with status: " + httpStatus);
                }
            }

            // Update order sync status
            order.setFlowAccountSyncStatus(LegalServiceOrder.SyncStatus.SYNCED);
            orderRepository.save(order);

        } catch (Exception e) {
            success = false;
            errorMessage = e.getMessage();
            httpStatus = httpStatus == 200 ? 500 : httpStatus;
            responsePayload = "{\"error\": \"" + e.getMessage() + "\"}";
            
            order.setFlowAccountSyncStatus(LegalServiceOrder.SyncStatus.FAILED);
            orderRepository.save(order);
            
            System.err.println("Error syncing order to FlowAccount: " + e.getMessage());
        }

        // Save sync log
        FlowAccountSyncLog syncLog = FlowAccountSyncLog.builder()
                .orderId(order.getId())
                .serviceType(order.getServiceType().name())
                .requestPayload(requestPayload)
                .responsePayload(responsePayload)
                .httpStatus(httpStatus)
                .success(success)
                .errorMessage(errorMessage)
                .build();
        
        logRepository.save(syncLog);
        
        return success;
    }
}
