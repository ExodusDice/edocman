package com.edocman.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_clerk_user_id", columnList = "clerkUserId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = true, unique = true)
    private String clerkUserId;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    private String fullName;

    private String phone;

    private String nationalId;

    private String companyName;

    private String taxId;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(nullable = false)
    private String role = "CUSTOMER"; // CUSTOMER or ADMIN

    @Column(nullable = false)
    @Builder.Default
    private boolean twoFactorEnabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean twoFactorEmail = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean twoFactorSms = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean twoFactorTotp = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean twoFactorPasskey = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean twoFactorLine = false;

    private String totpSecret;

    @Column(nullable = false)
    @Builder.Default
    private boolean banned = false;

    private String banReason;

    // Admin & Permissions Management Fields
    private String adminRoleTitle; // e.g. "Super Administrator", "Operations Officer", "Customer Support", "Finance & SLA Officer"

    @Column(columnDefinition = "TEXT")
    private String permissions; // e.g. "ALL" or "VIEW_SR,VIEW_CUSTOMERS,TASK_SR_ACTION,TASK_SEND_MESSAGE"

    private String department; // e.g. "Executive", "Operations", "Customer Service", "Legal & Compliance", "Finance"

    private String otpCode;

    private LocalDateTime otpExpiry;

    private String resetToken;

    private LocalDateTime resetTokenExpiry;

    @Column(nullable = false)
    private boolean pdpaConsented = false;

    private LocalDateTime pdpaConsentDate;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (role == null) role = "CUSTOMER";
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
