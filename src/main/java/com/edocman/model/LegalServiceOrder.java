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
        SMART_ETAX,
        
        // 1. Motor Insurance
        INSURANCE_POLICY_ENDORSEMENT,
        INSURANCE_VOLUNTARY_MOTOR,
        
        // 2. DLT & Vehicle Paperwork
        VEHICLE_TAX_RENEWAL,
        VEHICLE_OVERDUE_TAX_FINES,
        VEHICLE_POWER_OF_ATTORNEY,
        VEHICLE_PLATE_REPLACEMENT,
        VEHICLE_BOOK_REPLACEMENT,
        VEHICLE_SPEC_ALTERATION,
        VEHICLE_PROVINCE_TRANSFER,
        
        // 3. Visas & Immigration
        VISA_90DAY_REPORTING,
        VISA_TM30_NOTIFICATION,
        VISA_OUTBOUND_APPLICATION_PACK,
        
        // 4. Social Security & Labor
        SSO_ARTICLE_39_40_ENROLLMENT,
        SSO_HOSPITAL_CHANGE,
        SSO_COMPENSATION_CLAIMS,
        
        // 5. Revenue Department & Tax Filings
        TAX_PERSONAL_INCOME_EFILING,
        TAX_VAT_REGISTRATION_SUBMISSION,
        TAX_WITHHOLDING_CERT_50TAWI,
        
        // 6. Commercial & Municipal Licensing
        LICENSE_DIRECT_SALES_OCPB,
        LICENSE_MUSIC_COPYRIGHT,
        LICENSE_SIGNBOARD_TAX,
        
        // 7. Legal Agreements, DBD & Notarization
        DBD_NAME_RESERVATION_ECERT,
        LEGAL_FORM_GENERATION,
        LEGAL_POA_DISPATCH,
        LEGAL_REMOTE_ESIGN_CONTRACT,
        LEGAL_NOTARY_TRANSLATION_HUB
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
