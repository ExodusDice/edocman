package com.edocman.service;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class StripePaymentService {

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Value("${stripe.webhook.secret}")
    private String webhookSecret;

    @Autowired
    private SystemConfigService systemConfigService;

    public Map<String, Object> createPaymentIntent(BigDecimal amount, String currency, String orderId) throws Exception {
        Map<String, Object> responseData = new HashMap<>();

        if (systemConfigService.isStripeSimulation()) {
            String mockIntentId = "pi_mock_" + UUID.randomUUID().toString().substring(0, 8);
            String mockClientSecret = "pi_mock_secret_" + orderId + "_" + UUID.randomUUID().toString().substring(0, 8);
            
            System.out.println("====== [STRIPE PAYMENT INTENT SIMULATION] ======");
            System.out.println("Order ID: " + orderId);
            System.out.println("Amount: " + amount + " " + currency);
            System.out.println("Mock PaymentIntent ID: " + mockIntentId);
            System.out.println("Mock Client Secret: " + mockClientSecret);
            System.out.println("================================================");

            responseData.put("clientSecret", mockClientSecret);
            responseData.put("id", mockIntentId);
            responseData.put("amount", amount);
            responseData.put("currency", currency);
            return responseData;
        }

        // Live Stripe Integration
        Stripe.apiKey = stripeApiKey;

        // Multiply by 100 for cents/satang (Stripe requires amount in the smallest currency unit)
        long stripeAmount = amount.multiply(new BigDecimal(100)).longValue();

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(stripeAmount)
                .setCurrency(currency.toLowerCase())
                .addPaymentMethodType("card")
                .addPaymentMethodType("promptpay")
                .addPaymentMethodType("truemoney")
                .putMetadata("orderId", orderId)
                .build();

        PaymentIntent intent = PaymentIntent.create(params);

        responseData.put("clientSecret", intent.getClientSecret());
        responseData.put("id", intent.getId());
        responseData.put("amount", amount);
        responseData.put("currency", currency);

        return responseData;
    }

    public boolean isSimulation() {
        return systemConfigService.isStripeSimulation();
    }
}
