package com.edocman.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "flowaccount_sync_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlowAccountSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long orderId;

    private String serviceType;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String requestPayload;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String responsePayload;

    private Integer httpStatus;

    private boolean success;

    @Lob
    @Column(columnDefinition = "TEXT")
    private String errorMessage;

    private LocalDateTime syncedAt;

    @PrePersist
    protected void onCreate() {
        syncedAt = LocalDateTime.now();
    }
}
