package com.roommatch.controller;

import com.roommatch.model.Report;
import com.roommatch.model.User;
import com.roommatch.repository.ReportRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/reports")
public class ReportController {

    @Autowired
    ReportRepository reportRepository;

    @Autowired
    UserRepository userRepository;

    @PostMapping("/{userId}")
    public ResponseEntity<?> reportUser(@PathVariable Long userId, @RequestBody Report report) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User reporter = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        User reportedUser = userRepository.findById(userId).orElse(null);

        if (reporter == null || reportedUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        report.setReportedBy(reporter);
        report.setReportedUser(reportedUser);
        report.setStatus(Report.ReportStatus.PENDING);

        return ResponseEntity.ok(reportRepository.save(report));
    }
    @GetMapping
    public java.util.List<Report> getAllReports() {
        return reportRepository.findAll();
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateReportStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        Report report = reportRepository.findById(id).orElse(null);
        if (report == null) return ResponseEntity.badRequest().body("Report not found");
        try {
            report.setStatus(Report.ReportStatus.valueOf(body.get("status")));
            return ResponseEntity.ok(reportRepository.save(report));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid status");
        }
    }

    @PostMapping("/ban/{userId}")
    public ResponseEntity<?> banUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");
        user.setStatus(com.roommatch.model.UserStatus.BLOCKED);
        userRepository.save(user);
        return ResponseEntity.ok("User blocked successfully");
    }

    @PostMapping("/unban/{userId}")
    public ResponseEntity<?> unbanUser(@PathVariable Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");
        user.setStatus(com.roommatch.model.UserStatus.ACTIVE);
        userRepository.save(user);
        return ResponseEntity.ok("User unblocked successfully");
    }
}
