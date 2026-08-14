package com.edocman.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "legal_service_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LegalServiceOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String clerkUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ServiceType serviceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    @Column(nullable = false)
    private BigDecimal price;

    @Column(nullable = false)
    private String currency = "THB";

    @Lob
    @Column(columnDefinition = "TEXT")
    private String serviceData; // JSON representation of form details

    private String stripePaymentIntentId;

    private String stripePaymentStatus;



    private String documentUrl; // Pre-filled government form download

    private String officialDocumentUrl; // Approved official document uploaded by admin/government

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (currency == null) currency = "THB";

    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum ServiceType {
        COMPANY_NAME_RESERVATION,
        COMPANY_OPENING,
        COMPANY_CLOSING,
        DBD_E_FILING,
        CAR_PRB_INSURANCE,
        HOUSE_REGISTRATION_UPDATE,
        PDPA_BADGE_SETUP,
        COMPANY_NAME_CHANGE,
        MEMORANDUM_AMENDMENT,
        FINANCIAL_STATEMENT_PREP,
        COMPANY_DIRECTOR_CHANGE,
        SHAREHOLDER_UPDATE,
        FINANCIAL_STATEMENT_AUDIT,
        FINANCIAL_STATEMENT_APPROVAL,
        SMART_ETAX
    }

    public enum OrderStatus {
        DRAFT,
        PENDING_PAYMENT,
        PAID,
        PROCESSING,
        COMPLETED,
        FAILED
    }


}
