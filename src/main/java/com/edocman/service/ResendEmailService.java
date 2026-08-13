package com.edocman.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class ResendEmailService {

    @Value("${resend.api.key}")
    private String resendApiKey;

    @Value("${resend.sender}")
    private String resendSender;

    @Autowired
    private SystemConfigService systemConfigService;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean sendEmail(String to, String subject, String htmlContent) {
        if (systemConfigService.isResendSimulation()) {
            System.out.println("====== [RESEND EMAIL SIMULATION] ======");
            System.out.println("From: " + resendSender);
            System.out.println("To: " + to);
            System.out.println("Subject: " + subject);
            System.out.println("Content:\n" + htmlContent);
            System.out.println("=======================================");
            return true;
        }

        try {
            String url = "https://api.resend.com/emails";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + resendApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new HashMap<>();
            body.put("from", resendSender);
            body.put("to", to);
            body.put("subject", subject);
            body.put("html", htmlContent);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("Email sent successfully to " + to + " via Resend.");
                return true;
            } else {
                System.err.println("Failed to send email via Resend: " + response.getBody());
                return false;
            }
        } catch (Exception e) {
            System.err.println("Error sending email via Resend: " + e.getMessage());
            return false;
        }
    }
}
