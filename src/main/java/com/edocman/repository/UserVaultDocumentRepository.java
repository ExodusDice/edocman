package com.edocman.repository;

import com.edocman.model.UserVaultDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface UserVaultDocumentRepository extends JpaRepository<UserVaultDocument, Long> {
    List<UserVaultDocument> findByUserClerkIdOrderByUploadedAtDesc(String userClerkId);
    long countByUserClerkId(String userClerkId);
}
