package com.edocman.controller;

import com.edocman.model.User;
import com.edocman.repository.UserRepository;
import com.edocman.security.UserContext;
import com.edocman.service.ResendEmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ResendEmailService resendEmailService;

    @PostMapping("/register")
    public ResponseEntity<?> registerOrSyncUser(@RequestBody User registrationRequest) {
        if (registrationRequest.getEmail() == null || registrationRequest.getEmail().isEmpty()) {
            return ResponseEntity.badRequest().body("{\"error\": \"Email is required\"}");
        }

        Optional<User> existingUser = userRepository.findByClerkUserId(registrationRequest.getClerkUserId() != null ? registrationRequest.getClerkUserId() : "N/A");
        if (existingUser.isEmpty()) {
            // Also check by email to prevent duplicate local registrations
            existingUser = userRepository.findAll().stream()
                    .filter(u -> u.getEmail().equalsIgnoreCase(registrationRequest.getEmail()))
                    .findFirst();
        }

        User user;

        if (existingUser.isPresent()) {
            user = existingUser.get();
            user.setEmail(registrationRequest.getEmail());
            user.setFullName(registrationRequest.getFullName());
            user.setPhone(registrationRequest.getPhone());
            if (registrationRequest.getPassword() != null && !registrationRequest.getPassword().isEmpty()) {
                user.setPassword(hashPassword(registrationRequest.getPassword()));
            }
            if (registrationRequest.isPdpaConsented()) {
                user.setPdpaConsented(true);
                user.setPdpaConsentDate(LocalDateTime.now());
            }
        } else {
            user = registrationRequest;
            if (user.getPassword() != null && !user.getPassword().isEmpty()) {
                user.setPassword(hashPassword(user.getPassword()));
            }
            if (user.isPdpaConsented()) {
                user.setPdpaConsentDate(LocalDateTime.now());
            }
            // If it's a local registration, assign a mock Clerk ID for frontend uniformity
            if (user.getClerkUserId() == null || user.getClerkUserId().isEmpty()) {
                user.setClerkUserId("local_user_" + UUID.randomUUID().toString().substring(0, 8));
            }
        }

        User savedUser = userRepository.save(user);
        // Clear password in response for security
        savedUser.setPassword(null);
        return ResponseEntity.ok(savedUser);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String rawEmail = credentials.get("email");
        String rawPassword = credentials.get("password");

        if (rawEmail == null || rawPassword == null) {
            return ResponseEntity.badRequest().body("{\"error\": \"Email and password are required\"}");
        }

        String email = rawEmail.trim().toLowerCase();
        String password = rawPassword.trim();

        // 0. Check Beta User Credentials
        if ("beta1".equals(email) && "beta1".equals(password)) {
            Map<String, Object> betaResponse = new HashMap<>();
            betaResponse.put("token", "mock-user-id-beta1");
            
            Optional<User> dbUserOpt = userRepository.findAll().stream()
                    .filter(u -> u.getEmail().equalsIgnoreCase("beta1"))
                    .findFirst();
            User user;
            if (dbUserOpt.isEmpty()) {
                user = new User();
                user.setClerkUserId("mock-user-id-beta1");
                user.setEmail("beta1");
                user.setFullName("Beta User One");
                user.setPhone("0891234567");
                user.setRole("CUSTOMER");
                user.setPdpaConsented(true);
                user.setPdpaConsentDate(LocalDateTime.now());
                user.setPassword(hashPassword("beta1"));
                userRepository.save(user);
            } else {
                user = dbUserOpt.get();
            }
            
            user.setPassword(null);
            betaResponse.put("user", user);
            return ResponseEntity.ok(betaResponse);
        }

        // 1. Check Super Admin wa Credentials
        if ("sadminwa".equals(email) && "sadminwa".equals(password)) {
            Map<String, Object> adminResponse = new HashMap<>();
            adminResponse.put("token", "mock-admin-token-sadminwa");
            
            Map<String, Object> adminUser = new HashMap<>();
            adminUser.put("clerkUserId", "mock-admin-id");
            adminUser.put("email", "admin@edocman.paperless.in.th");
            adminUser.put("fullName", "Super Administrator");
            adminUser.put("role", "ADMIN");
            
            adminResponse.put("user", adminUser);
            return ResponseEntity.ok(adminResponse);
        }

        // 2. Customer Credentials Lookup
        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst();

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\": \"Invalid email or password\"}");
        }

        User user = userOpt.get();
        String hashedInput = hashPassword(password);
        
        if (user.getPassword() == null || !user.getPassword().equals(hashedInput)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\": \"Invalid email or password\"}");
        }

        // 3. 2FA Check
        if (user.isTwoFactorEnabled()) {
            // Generate OTP
            String otp = String.format("%06d", (int) (Math.random() * 1000000));
            user.setOtpCode(otp);
            user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
            userRepository.save(user);

            // Send via Resend Email simulator/service
            String subject = "รหัสยืนยันความปลอดภัย 2FA สำหรับ eDocman: " + otp;
            String bodyHtml = "<h3>รหัสผ่านแบบใช้ครั้งเดียว (OTP) ของคุณ</h3>" +
                    "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                    "<p>คุณกำลังล็อกอินเข้าสู่ระบบ eDocman กรุณาใช้รหัสยืนยัน 2FA ด้านล่างเพื่อเสร็จสิ้นกระบวนการ:</p>" +
                    "<h2 style='color:#d97706; letter-spacing:4px; font-family:monospace;'>" + otp + "</h2>" +
                    "<p>รหัสนี้มีอายุการใช้งาน 5 นาที หากคุณไม่ได้ยื่นคำขอ กรุณาเปลี่ยนรหัสผ่านเพื่อความปลอดภัย</p>" +
                    "<br><p>ขอแสดงความนับถือ,<br>ทีมงาน eDocman</p>";
            
            resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);

            Map<String, Object> mfaRequired = new HashMap<>();
            mfaRequired.put("mfaRequired", true);
            mfaRequired.put("email", user.getEmail());
            return ResponseEntity.ok(mfaRequired);
        }

        // Standard Login without 2FA
        Map<String, Object> loginResponse = new HashMap<>();
        loginResponse.put("token", user.getClerkUserId());
        
        // Remove password hash before sending
        user.setPassword(null);
        loginResponse.put("user", user);
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst();

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        String otp = String.format("%06d", (int) (Math.random() * 1000000));
        user.setOtpCode(otp);
        user.setOtpExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        String subject = "รหัสยืนยันความปลอดภัย 2FA สำหรับ eDocman: " + otp;
        String bodyHtml = "<h3>รหัส OTP ใหม่ของคุณ</h3>" +
                "<h2 style='color:#d97706; letter-spacing:4px; font-family:monospace;'>" + otp + "</h2>" +
                "<p>รหัสนี้มีอายุการใช้งาน 5 นาที</p>";
        resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);

        return ResponseEntity.ok(Map.of("status", "OTP sent successfully", "otp_code", otp));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("otp_code");

        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst();

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\": \"User not found\"}");
        }

        User user = userOpt.get();
        if (user.getOtpCode() == null || !user.getOtpCode().equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\": \"Invalid OTP code\"}");
        }

        if (user.getOtpExpiry() == null || user.getOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("{\"error\": \"OTP has expired\"}");
        }

        // Clear OTP code on successful verification
        user.setOtpCode(null);
        user.setOtpExpiry(null);
        userRepository.save(user);

        Map<String, Object> loginResponse = new HashMap<>();
        loginResponse.put("token", user.getClerkUserId());
        
        user.setPassword(null);
        loginResponse.put("user", user);
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email))
                .findFirst();

        if (userOpt.isEmpty()) {
            // Return 200 even if email is not found to prevent user enumeration attacks
            return ResponseEntity.ok("{\"message\": \"If the email exists, a password reset link has been sent.\"}");
        }

        User user = userOpt.get();
        String token = UUID.randomUUID().toString();
        user.setResetToken(token);
        user.setResetTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        // Send reset password email via Resend
        String resetLink = "http://localhost:8080/#reset-password?token=" + token;
        String subject = "รีเซ็ตรหัสผ่านบัญชี eDocman ของคุณ";
        String bodyHtml = "<h3>คำขอรีเซ็ตรหัสผ่านบัญชี eDocman</h3>" +
                "<p>เรียนคุณ " + user.getFullName() + ",</p>" +
                "<p>ระบบได้รับการร้องขอให้รีเซ็ตรหัสผ่านของคุณ คุณสามารถดำเนินการโดยคลิกปุ่มลิงก์ด้านล่าง:</p>" +
                "<p><a href='" + resetLink + "' style='display:inline-block; background-color:#d97706; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px;'>ตั้งค่ารหัสผ่านใหม่</a></p>" +
                "<p>หรือคัดลอกลิงก์นี้เปิดในเบราว์เซอร์ของคุณ: " + resetLink + "</p>" +
                "<p>ลิงก์นี้มีอายุใช้งาน 1 ชั่วโมง หากคุณไม่ได้ร้องขอ กรุณาละเลยอีเมลฉบับนี้</p>" +
                "<br><p>ทีมงาน eDocman</p>";

        resendEmailService.sendEmail(user.getEmail(), subject, bodyHtml);

        return ResponseEntity.ok("{\"message\": \"If the email exists, a password reset link has been sent.\"}");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        if (token == null || newPassword == null) {
            return ResponseEntity.badRequest().body("{\"error\": \"Token and new password are required\"}");
        }

        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> token.equals(u.getResetToken()))
                .findFirst();

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\": \"Invalid or expired reset token\"}");
        }

        User user = userOpt.get();
        if (user.getResetTokenExpiry() == null || user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{\"error\": \"Reset token has expired\"}");
        }

        user.setPassword(hashPassword(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok("{\"message\": \"Password has been reset successfully.\"}");
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

    @PostMapping("/update-profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> payload) {
        String email = (String) payload.get("email");
        String fullName = (String) payload.get("fullName");
        String phone = (String) payload.get("phone");
        Boolean twoFactorEnabled = (Boolean) payload.get("twoFactorEnabled");
        String oldPassword = (String) payload.get("oldPassword");
        String newPassword = (String) payload.get("newPassword");

        if (email == null) {
            return ResponseEntity.badRequest().body("{\"error\": \"Email is required\"}");
        }

        Optional<User> userOpt = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equalsIgnoreCase(email.trim()))
                .findFirst();

        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User user = userOpt.get();
        if (fullName != null) user.setFullName(fullName);
        if (phone != null) user.setPhone(phone);
        if (twoFactorEnabled != null) user.setTwoFactorEnabled(twoFactorEnabled);

        // Password update check
        if (newPassword != null && !newPassword.trim().isEmpty()) {
            String hashedOld = hashPassword(oldPassword);
            if (user.getPassword() != null && !user.getPassword().equals(hashedOld)) {
                return ResponseEntity.badRequest().body("{\"error\": \"รหัสผ่านเดิมไม่ถูกต้อง / Incorrect old password\"}");
            }
            user.setPassword(hashPassword(newPassword.trim()));
        }

        userRepository.save(user);
        
        // Clear password hash
        User responseUser = user;
        responseUser.setPassword(null);
        return ResponseEntity.ok(responseUser);
    }

    private String hashPassword(String password) {
        if (password == null) return null;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }
}
