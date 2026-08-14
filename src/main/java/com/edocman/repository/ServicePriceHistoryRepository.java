package com.edocman.repository;

import com.edocman.model.ServicePriceHistory;
import com.edocman.model.LegalServiceOrder.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ServicePriceHistoryRepository extends JpaRepository<ServicePriceHistory, Long> {
    List<ServicePriceHistory> findByServiceTypeOrderByChangedAtDesc(ServiceType serviceType);
    List<ServicePriceHistory> findByChangedAtAfterOrderByChangedAtDesc(LocalDateTime dateTime);
}
