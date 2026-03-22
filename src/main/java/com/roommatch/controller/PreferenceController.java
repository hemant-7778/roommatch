package com.roommatch.controller;

import com.roommatch.model.Preference;
import com.roommatch.model.User;
import com.roommatch.repository.PreferenceRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/preferences")
public class PreferenceController {

    @Autowired
    PreferenceRepository preferenceRepository;

    @Autowired
    UserRepository userRepository;

    @GetMapping
    public ResponseEntity<?> getPreferences() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        return ResponseEntity.ok(preferenceRepository.findByUser(user).orElse(null));
    }

    @PostMapping
    public ResponseEntity<?> savePreferences(@RequestBody Preference preference) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        Preference existing = preferenceRepository.findByUser(user).orElse(null);
        if (existing != null) {
            preference.setId(existing.getId());
        }
        preference.setUser(user);
        
        return ResponseEntity.ok(preferenceRepository.save(preference));
    }
}
