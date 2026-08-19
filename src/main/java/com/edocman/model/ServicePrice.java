package com.edocman.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "service_prices")
@Data
@NoArgsConstructor
@Builder
public class ServicePrice {
    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "service_type")
    private LegalServiceOrder.ServiceType serviceType;

    @Column(nullable = false, precision = 38, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private String nameTh;

    @Column(nullable = false)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String contentTh;

    @Column(nullable = false)
    private Integer slaDays = 5; // Default SLA days

    // Custom constructor for backward compatibility
    public ServicePrice(LegalServiceOrder.ServiceType serviceType, BigDecimal price, String nameTh) {
        this.serviceType = serviceType;
        this.price = price;
        this.nameTh = nameTh;
        this.category = "ทั่วไป";
        this.contentTh = "รายละเอียดของบริการ " + nameTh;
        this.slaDays = 5;
    }

    public ServicePrice(LegalServiceOrder.ServiceType serviceType, BigDecimal price, String nameTh, String category, String contentTh) {
        this.serviceType = serviceType;
        this.price = price;
        this.nameTh = nameTh;
        this.category = category;
        this.contentTh = contentTh;
        this.slaDays = 5;
    }

    public ServicePrice(LegalServiceOrder.ServiceType serviceType, BigDecimal price, String nameTh, String category, String contentTh, Integer slaDays) {
        this.serviceType = serviceType;
        this.price = price;
        this.nameTh = nameTh;
        this.category = category;
        this.contentTh = contentTh;
        this.slaDays = slaDays != null ? slaDays : 5;
    }
}
