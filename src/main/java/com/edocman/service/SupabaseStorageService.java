package com.edocman.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.anon.key}")
    private String supabaseAnonKey;

    @Value("${supabase.bucket}")
    private String supabaseBucket;

    @Value("${supabase.simulation:true}")
    private boolean simulation;

    private final RestTemplate restTemplate = new RestTemplate();
    private final String localUploadDir = "uploads";

    public String uploadFile(MultipartFile file, String folder) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String fileExtension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String fileName = UUID.randomUUID().toString() + fileExtension;
        String filePath = folder + "/" + fileName;

        if (simulation) {
            // Save locally
            Path uploadPath = Paths.get(localUploadDir, folder);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }
            Path targetLocation = uploadPath.resolve(fileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            return "/" + localUploadDir + "/" + filePath;
        } else {
            // Call Supabase Storage API
            // URL: POST {supabaseUrl}/storage/v1/object/{bucket}/{filePath}
            String url = supabaseUrl + "/storage/v1/object/" + supabaseBucket + "/" + filePath;

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + supabaseAnonKey);
            headers.set("apikey", supabaseAnonKey);
            headers.setContentType(MediaType.parseMediaType(file.getContentType()));

            HttpEntity<byte[]> entity = new HttpEntity<>(file.getBytes(), headers);
            
            try {
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful()) {
                    // Public URL format: {supabaseUrl}/storage/v1/object/public/{bucket}/{filePath}
                    return supabaseUrl + "/storage/v1/object/public/" + supabaseBucket + "/" + filePath;
                } else {
                    throw new IOException("Failed to upload to Supabase: " + response.getBody());
                }
            } catch (Exception e) {
                throw new IOException("Failed to upload to Supabase: " + e.getMessage(), e);
            }
        }
    }
}
