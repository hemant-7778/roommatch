package com.roommatch.controller;

import com.roommatch.model.Room;
import com.roommatch.model.RoomRequest;
import com.roommatch.model.User;
import com.roommatch.repository.RoomRepository;
import com.roommatch.repository.RoomRequestRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/requests")
public class RequestController {

    @Autowired
    RoomRequestRepository requestRepository;

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    UserRepository userRepository;

    @PostMapping("/{roomId}")
    public ResponseEntity<?> sendRequest(@PathVariable Long roomId) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        Room room = roomRepository.findById(roomId).orElse(null);

        if (user == null || room == null) {
            return ResponseEntity.badRequest().body("User or Room not found");
        }

        if (room.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body("You cannot request your own room");
        }

        RoomRequest request = RoomRequest.builder()
                .requester(user)
                .room(room)
                .status(RoomRequest.RequestStatus.PENDING)
                .build();
        
        return ResponseEntity.ok(requestRepository.save(request));
    }

    @GetMapping("/my-requests")
    public ResponseEntity<?> getMyRequests() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        return ResponseEntity.ok(requestRepository.findByRequester(user));
    }
    
    @GetMapping("/incoming")
    public ResponseEntity<?> getIncomingRequests() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        return ResponseEntity.ok(requestRepository.findByRoom_Owner(user));
    }

    @PutMapping("/{requestId}/status")
    public ResponseEntity<?> updateRequestStatus(@PathVariable Long requestId, @RequestBody java.util.Map<String, String> statusUpdate) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        RoomRequest request = requestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return ResponseEntity.badRequest().body("Request not found");
        }

        // Verify that the current user is the owner of the room
        if (!request.getRoom().getOwner().equals(user)) {
             return ResponseEntity.status(403).body("You are not authorized to manage this request");
        }

        String newStatus = statusUpdate.get("status");
        if (newStatus != null) {
            try {
                request.setStatus(RoomRequest.RequestStatus.valueOf(newStatus.toUpperCase()));
            } catch (IllegalArgumentException e) {
                 return ResponseEntity.badRequest().body("Invalid status");
            }
        }
        
        return ResponseEntity.ok(requestRepository.save(request));
    }
    
    // Additional endpoints for accepting/rejecting requests (for room owners) can be added here
}
