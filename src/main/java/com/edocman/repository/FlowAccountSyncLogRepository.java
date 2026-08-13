package com.edocman.repository;

import com.edocman.model.FlowAccountSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FlowAccountSyncLogRepository extends JpaRepository<FlowAccountSyncLog, Long> {
    List<FlowAccountSyncLog> findByOrderId(Long orderId);
}
