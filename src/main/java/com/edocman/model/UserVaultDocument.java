package com.edocman.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_vault_documents", indexes = {
    @Index(name = "idx_vault_user_id", columnList = "userClerkId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserVaultDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userClerkId;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String docType; // THAI_ID, HOUSE_REG, VEHICLE_BOOK, COMPANY_AFFIDAVIT, PASSPORT, TAX_CARD, OTHER

    @Column(length = 2048)
    private String fileUrl;

    private String fileName;

    private Long fileSizeBytes;

    private String mimeType;

    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        if (uploadedAt == null) uploadedAt = LocalDateTime.now();
    }
}
