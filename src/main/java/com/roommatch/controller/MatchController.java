package com.roommatch.controller;

import com.roommatch.model.User;
import com.roommatch.repository.UserRepository;
import com.roommatch.service.CompatibilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/matches")
public class MatchController {

    @Autowired
    CompatibilityService compatibilityService;

    @Autowired
    UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getMatches() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = userDetails.getUsername();
        User currentUser = userRepository.findByEmail(email).orElse(null);

        if (currentUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        List<Map<String, Object>> matches = compatibilityService.findMatches(currentUser);
        return ResponseEntity.ok(matches);
    }
}
