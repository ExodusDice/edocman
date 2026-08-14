package com.edocman.repository;

import com.edocman.model.ServicePrice;
import com.edocman.model.LegalServiceOrder.ServiceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ServicePriceRepository extends JpaRepository<ServicePrice, ServiceType> {
}
