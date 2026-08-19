package com.edocman.controller;

import com.edocman.model.UserVaultDocument;
import com.edocman.repository.UserVaultDocumentRepository;
import com.edocman.security.UserContext;
import com.edocman.service.SupabaseStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@RestController
@RequestMapping("/api/vault")
public class VaultController {

    public static final int MAX_VAULT_DOCUMENTS = 10;

    @Autowired
    private UserVaultDocumentRepository vaultRepository;

    @Autowired
    private SupabaseStorageService storageService;

    @GetMapping("/documents")
    public ResponseEntity<?> getVaultDocuments() {
        String currentUserId = UserContext.getCurrentUser();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<UserVaultDocument> docs = vaultRepository.findByUserClerkIdOrderByUploadedAtDesc(currentUserId);
        Map<String, Object> response = new HashMap<>();
        response.put("documents", docs);
        response.put("totalCount", docs.size());
        response.put("maxLimit", MAX_VAULT_DOCUMENTS);
        response.put("remainingSlots", Math.max(0, MAX_VAULT_DOCUMENTS - docs.size()));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "docType", defaultValue = "OTHER") String docType) {

        String currentUserId = UserContext.getCurrentUser();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        long currentCount = vaultRepository.countByUserClerkId(currentUserId);
        if (currentCount >= MAX_VAULT_DOCUMENTS) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "กล่องเก็บเอกสารเต็มแล้ว (จำกัดสูงสุด 10 เอกสารต่อบัญชี) กรุณาลบเอกสารเก่าก่อนเพิ่มใหม่"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "กรุณาแนบไฟล์เอกสาร"));
        }

        try {
            String uploadedUrl = storageService.uploadFile(file, "vault");
            String docTitle = (title != null && !title.trim().isEmpty()) ? title.trim() : file.getOriginalFilename();

            UserVaultDocument doc = UserVaultDocument.builder()
                    .userClerkId(currentUserId)
                    .title(docTitle)
                    .docType(docType)
                    .fileName(file.getOriginalFilename())
                    .fileUrl(uploadedUrl)
                    .fileSizeBytes(file.getSize())
                    .mimeType(file.getContentType())
                    .build();

            UserVaultDocument saved = vaultRepository.save(doc);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "เกิดข้อผิดพลาดในการบันทึกเอกสาร: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(@PathVariable Long id) {
        String currentUserId = UserContext.getCurrentUser();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        Optional<UserVaultDocument> docOpt = vaultRepository.findById(id);
        if (docOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserVaultDocument doc = docOpt.get();
        if (!doc.getUserClerkId().equals(currentUserId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied"));
        }

        vaultRepository.delete(doc);
        return ResponseEntity.ok(Map.of("message", "ลบเอกสารสำเร็จ", "id", id));
    }
}
