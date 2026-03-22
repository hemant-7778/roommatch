package com.roommatch.controller;

import com.roommatch.model.Message;
import com.roommatch.model.User;
import com.roommatch.repository.MessageRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    MessageRepository messageRepository;

    @Autowired
    UserRepository userRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getConversation(@PathVariable Long userId, @RequestParam(required = false) String after) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User currentUser = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        User otherUser = userRepository.findById(userId).orElse(null);

        if (currentUser == null || otherUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        List<Message> messages;
        if (after != null) {
            try {
                LocalDateTime afterTime = LocalDateTime.parse(after);
                messages = messageRepository.findChatMessagesAfter(currentUser, otherUser, afterTime);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body("Invalid date format");
            }
        } else {
            messages = messageRepository.findBySenderAndReceiverOrSenderAndReceiverOrderByTimestampAsc(
                    currentUser, otherUser, otherUser, currentUser
            );
        }



        // Mark incoming messages as read
        if (!messages.isEmpty()) {
            boolean updated = false;
            for (Message m : messages) {
                if (m.getReceiver().getId().equals(currentUser.getId()) && !m.isRead()) {
                    m.setRead(true);
                    updated = true;
                }
            }
            if (updated) {
                messageRepository.saveAll(messages);
            }
        }

        return ResponseEntity.ok(messages);
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User currentUser = userRepository.findByEmail(userDetails.getUsername()).orElse(null);

        if (currentUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        java.util.Set<User> conversationPartners = new java.util.HashSet<>();
        conversationPartners.addAll(messageRepository.findDistinctReceiverBySender(currentUser));
        conversationPartners.addAll(messageRepository.findDistinctSenderByReceiver(currentUser));

        // Remove the user themselves if present (shouldn't be, but good practice)
        conversationPartners.remove(currentUser);

        return ResponseEntity.ok(conversationPartners);
    }

    @PostMapping("/{userId}")
    public ResponseEntity<?> sendMessage(@PathVariable Long userId, @RequestBody java.util.Map<String, String> payload) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User currentUser = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        User otherUser = userRepository.findById(userId).orElse(null);

        if (currentUser == null || otherUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        String content = payload.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Message content cannot be empty");
        }

        Message message = Message.builder()
                .sender(currentUser)
                .receiver(otherUser)
                .content(content)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(messageRepository.save(message));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User currentUser = userRepository.findByEmail(userDetails.getUsername()).orElse(null);

        if (currentUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        long count = messageRepository.countByReceiverAndIsReadFalse(currentUser);
        return ResponseEntity.ok(java.util.Collections.singletonMap("count", count));
    }
}
