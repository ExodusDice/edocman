package com.edocman.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "service_price_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServicePriceHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LegalServiceOrder.ServiceType serviceType;

    private BigDecimal oldPrice;
    private BigDecimal newPrice;

    private String oldNameTh;
    private String newNameTh;

    private String oldCategory;
    private String newCategory;

    @Column(columnDefinition = "TEXT")
    private String oldContentTh;
    @Column(columnDefinition = "TEXT")
    private String newContentTh;

    private Integer oldSlaDays;
    private Integer newSlaDays;

    private String changedBy;

    @Column(nullable = false)
    private LocalDateTime changedAt;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }
}
