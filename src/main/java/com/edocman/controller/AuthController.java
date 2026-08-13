package com.edocman.controller;

import com.edocman.model.User;
import com.edocman.repository.UserRepository;
import com.edocman.security.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> registerOrSyncUser(@RequestBody User registrationRequest) {
        if (registrationRequest.getClerkUserId() == null || registrationRequest.getClerkUserId().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Clerk User ID is required\"}");
        }

        Optional<User> existingUser = userRepository.findByClerkUserId(registrationRequest.getClerkUserId());
        User user;

        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setEmail(registrationRequest.getEmail());
            user.setFullName(registrationRequest.getFullName());
            user.setPhone(registrationRequest.getPhone());
            if (registrationRequest.isPdpaConsented()) {
                user.setPdpaConsented(true);
                user.setPdpaConsentDate(LocalDateTime.now());
            }
        } else {
            user = registrationRequest;
            if (user.isPdpaConsented()) {
                user.setPdpaConsentDate(LocalDateTime.now());
            }
        }

        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        String clerkUserId = UserContext.getCurrentUser();
        if (clerkUserId == null) {
            return ResponseEntity.status(401).body("{\"error\": \"Unauthorized: User not found in context\"}");
        }

        Optional<User> user = userRepository.findByClerkUserId(clerkUserId);
        if (user.isEmpty()) {
            return ResponseEntity.status(404).body("{\"error\": \"User profile not registered\"}");
        }

        return ResponseEntity.ok(user.get());
    }
}
