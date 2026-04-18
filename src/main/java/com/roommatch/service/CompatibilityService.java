package com.roommatch.service;

import com.roommatch.model.Preference;
import com.roommatch.model.User;
import com.roommatch.repository.PreferenceRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class CompatibilityService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PreferenceRepository preferenceRepository;

    public List<Map<String, Object>> findMatches(User currentUser) {
        // 1. Get current user's preferences
        Optional<Preference> currentUserPrefOpt = preferenceRepository.findByUser(currentUser);
        if (currentUserPrefOpt.isEmpty()) {
            return Collections.emptyList(); // Cannot match without preferences
        }
        Preference userPref = currentUserPrefOpt.get();

        // 2. Get all other users in the same city
        List<User> potentialMatches = userRepository.findAll().stream()
                .filter(u -> !u.getId().equals(currentUser.getId())) // Exclude self
                .filter(u -> u.getStatus() == com.roommatch.model.UserStatus.ACTIVE) // Exclude blocked/banned
                .filter(u -> u.getCity() != null && u.getCity().equalsIgnoreCase(currentUser.getCity())) // Same city
                .collect(Collectors.toList());

        List<Map<String, Object>> matches = new ArrayList<>();

        for (User candidate : potentialMatches) {
            Optional<Preference> candidatePrefOpt = preferenceRepository.findByUser(candidate);
            if (candidatePrefOpt.isPresent()) {
                Preference candidatePref = candidatePrefOpt.get();
                double score = calculateCompatibilityScore(currentUser, userPref, candidate, candidatePref);
                
                if (score > 0) {
                    Map<String, Object> matchData = new HashMap<>();
                    matchData.put("user", candidate);
                    matchData.put("score", Math.round(score)); // Round to nearest integer
                    matchData.put("details", generateScoreDetails(userPref, candidatePref));
                    matches.add(matchData);
                }
            }
        }

        // 3. Sort by score descending
        matches.sort((m1, m2) -> ((Long) m2.get("score")).compareTo((Long) m1.get("score")));

        return matches;
    }

    private double calculateCompatibilityScore(User u1, Preference p1, User u2, Preference p2) {
        double score = 0;

        // Weights
        score += calculateExactMatch(p1.getSleepTime(), p2.getSleepTime(), 15);
        score += calculateCleanlinessMatch(p1.getCleanliness(), p2.getCleanliness(), 15);
        score += calculateExactMatch(p1.getSmoking(), p2.getSmoking(), 10);
        score += calculateExactMatch(p1.getDrinking(), p2.getDrinking(), 10);
        score += calculateExactMatch(p1.getStudyStyle(), p2.getStudyStyle(), 10);
        score += calculateExactMatch(p1.getGuests(), p2.getGuests(), 10);
        score += calculateExactMatch(p1.getFoodType(), p2.getFoodType(), 10);
        score += calculateBudgetMatch(u1, u2, 10);
        score += calculateExactMatch(p1.getNoiseTolerance(), p2.getNoiseTolerance(), 5);
        score += calculateExactMatch(p1.getWorkSchedule(), p2.getWorkSchedule(), 3);
        score += calculateExactMatch(p1.getPetFriendly(), p2.getPetFriendly(), 2);

        return score;
    }
    
    // Helper to generate details for chart
    private Map<String, Integer> generateScoreDetails(Preference p1, Preference p2) {
        Map<String, Integer> details = new LinkedHashMap<>(); // Use LinkedHashMap to keep order
        
        details.put("Sleep", (int) calculateExactMatch(p1.getSleepTime(), p2.getSleepTime(), 15));
        details.put("Cleanliness", (int) calculateCleanlinessMatch(p1.getCleanliness(), p2.getCleanliness(), 15));
        details.put("Habits", (int) (calculateExactMatch(p1.getSmoking(), p2.getSmoking(), 10) + 
                                     calculateExactMatch(p1.getDrinking(), p2.getDrinking(), 10)));
        details.put("Study", (int) calculateExactMatch(p1.getStudyStyle(), p2.getStudyStyle(), 10));
        details.put("Guests", (int) calculateExactMatch(p1.getGuests(), p2.getGuests(), 10));
        details.put("Food", (int) calculateExactMatch(p1.getFoodType(), p2.getFoodType(), 10));
        details.put("Noise", (int) calculateExactMatch(p1.getNoiseTolerance(), p2.getNoiseTolerance(), 5));
        details.put("Work", (int) calculateExactMatch(p1.getWorkSchedule(), p2.getWorkSchedule(), 3));
        details.put("Pet", (int) calculateExactMatch(p1.getPetFriendly(), p2.getPetFriendly(), 2));
        
        return details;
    }

    private double calculateExactMatch(String v1, String v2, int weight) {
        if (v1 == null || v2 == null) return 0;
        return v1.equalsIgnoreCase(v2) ? weight : 0;
    }

    private double calculateCleanlinessMatch(String v1, String v2, int weight) {
        if (v1 == null || v2 == null) return 0;
        if (v1.equalsIgnoreCase(v2)) return weight;
        
        // High & Medium -> 70%
        if ((v1.equalsIgnoreCase("High") && v2.equalsIgnoreCase("Medium")) ||
            (v1.equalsIgnoreCase("Medium") && v2.equalsIgnoreCase("High"))) {
            return weight * 0.7;
        }
        
        // Medium & Low -> 50% (Adding reasonable default)
         if ((v1.equalsIgnoreCase("Low") && v2.equalsIgnoreCase("Medium")) ||
            (v1.equalsIgnoreCase("Medium") && v2.equalsIgnoreCase("Low"))) {
            return weight * 0.5;
        }

        // High & Low -> 0
        return 0;
    }

    private double calculateBudgetMatch(User u1, User u2, int weight) {
        if (u1.getBudgetMin() == null || u1.getBudgetMax() == null || 
            u2.getBudgetMin() == null || u2.getBudgetMax() == null) return 0;

        // Check for overlap
        boolean overlap = Math.max(u1.getBudgetMin(), u2.getBudgetMin()) <= Math.min(u1.getBudgetMax(), u2.getBudgetMax());
        
        if (overlap) return weight;
        
        // Partial overlap logic (User spec said "Partially overlap -> 5 points")
        // "Partial" isn't strictly defined if standard boolean overlap covers it. 
        // Let's assume near-miss or slight range difference.
        // For simplicity based on prompt: "If budget ranges overlap → full 10 points". 
        // "If partially overlap" might mean something else, but mathematically ranges either overlap or they don't.
        // Maybe "Partial" means within a small margin? 
        // Let's stick to Overlap = 10. If not overlap but close (within 10%), give 5.
        
        double gap = Math.max(u1.getBudgetMin(), u2.getBudgetMin()) - Math.min(u1.getBudgetMax(), u2.getBudgetMax());
        if (gap <= 500) return weight * 0.5; // Within 500 units

        return 0;
    }
}
