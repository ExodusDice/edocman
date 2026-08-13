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

    @Column(nullable = false)
    private String role = "CUSTOMER"; // CUSTOMER or ADMIN

    @Column(nullable = false)
    private boolean twoFactorEnabled = true;

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
