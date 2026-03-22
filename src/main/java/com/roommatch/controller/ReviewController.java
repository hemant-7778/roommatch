package com.roommatch.controller;

import com.roommatch.model.Review;
import com.roommatch.model.User;
import com.roommatch.repository.ReviewRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    @Autowired
    ReviewRepository reviewRepository;

    @Autowired
    UserRepository userRepository;

    @PostMapping("/{userId}")
    public ResponseEntity<?> addReview(@PathVariable Long userId, @RequestBody Review review) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User reviewer = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        User reviewedUser = userRepository.findById(userId).orElse(null);

        if (reviewer == null || reviewedUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        review.setReviewer(reviewer);
        review.setReviewedUser(reviewedUser);
        
        return ResponseEntity.ok(reviewRepository.save(review));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserReviews(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        return ResponseEntity.ok(reviewRepository.findByReviewedUser(user));
    }
}
