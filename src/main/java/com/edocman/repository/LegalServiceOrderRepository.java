package com.edocman.repository;

import com.edocman.model.LegalServiceOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LegalServiceOrderRepository extends JpaRepository<LegalServiceOrder, Long> {
    List<LegalServiceOrder> findByClerkUserId(String clerkUserId);
}
