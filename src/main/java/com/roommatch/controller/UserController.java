package com.roommatch.controller;

import com.roommatch.model.User;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    UserRepository userRepository;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");
        
        return ResponseEntity.ok(user);
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestParam("name") String name,
            @RequestParam("age") int age,
            @RequestParam("gender") String gender,
            @RequestParam("city") String city,
            @RequestParam("bio") String bio,
            @RequestParam(value = "budgetMin", required = false) String budgetMinStr,
            @RequestParam(value = "budgetMax", required = false) String budgetMaxStr,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage) {
        
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        Double budgetMin = null;
        if (budgetMinStr != null && !budgetMinStr.trim().isEmpty()) {
            try { budgetMin = Double.parseDouble(budgetMinStr); } catch (NumberFormatException e) {}
        }
        Double budgetMax = null;
        if (budgetMaxStr != null && !budgetMaxStr.trim().isEmpty()) {
            try { budgetMax = Double.parseDouble(budgetMaxStr); } catch (NumberFormatException e) {}
        }

        user.setName(name);
        user.setAge(age);
        user.setGender(gender);
        user.setCity(city);
        user.setBio(bio);
        user.setBudgetMin(budgetMin);
        user.setBudgetMax(budgetMax);

        if (profileImage != null && !profileImage.isEmpty()) {
            try {
                String fileName = StringUtils.cleanPath(profileImage.getOriginalFilename());
                // Create random name to prevent conflicts
                String savedFileName = java.util.UUID.randomUUID().toString() + "_" + fileName;
                
                String uploadDir = "uploads/profile-images/";
                Path uploadPath = Paths.get(uploadDir);
                
                if (!Files.exists(uploadPath)) {
                    Files.createDirectories(uploadPath);
                }
                
                try (InputStream inputStream = profileImage.getInputStream()) {
                    Path filePath = uploadPath.resolve(savedFileName);
                    Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
                    user.setProfileImage("/uploads/profile-images/" + savedFileName);
                }
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body("Failed to upload image: " + e.getMessage());
            }
        }
        
        userRepository.save(user);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        User user = userRepository.findById(id).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");
        return ResponseEntity.ok(user);
    }
}
