package com.roommatch.controller;

import com.roommatch.model.Room;
import com.roommatch.model.User;
import com.roommatch.repository.RoomRepository;
import com.roommatch.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    RoomRepository roomRepository;

    @Autowired
    UserRepository userRepository;

    @GetMapping
    public List<Room> getAllRooms(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Double minRent,
            @RequestParam(required = false) Double maxRent,
            @RequestParam(required = false) String roomType) {
        return roomRepository.searchRooms(location, minRent, maxRent, roomType);
    }

    @PostMapping(consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createRoom(
            @RequestParam("location") String location,
            @RequestParam("rent") Double rent,
            @RequestParam("roomType") String roomType,
            @RequestParam(value = "amenities", required = false) String amenities,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "photos", required = false) List<org.springframework.web.multipart.MultipartFile> photos,
            @RequestParam(value = "video", required = false) org.springframework.web.multipart.MultipartFile video) {
        
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        Room room = new Room();
        room.setLocation(location);
        room.setRent(rent);
        room.setRoomType(roomType);
        room.setAmenities(amenities);
        room.setDescription(description);
        room.setOwner(user);
        room.setAvailable(true);

        List<String> photoUrls = new java.util.ArrayList<>();
        if (photos != null && !photos.isEmpty()) {
            for (org.springframework.web.multipart.MultipartFile photo : photos) {
                if (!photo.isEmpty()) {
                    try {
                        String pName = org.springframework.util.StringUtils.cleanPath(photo.getOriginalFilename());
                        String savedName = java.util.UUID.randomUUID().toString() + "_" + pName;
                        java.nio.file.Path path = java.nio.file.Paths.get("uploads/room-media/");
                        if (!java.nio.file.Files.exists(path)) java.nio.file.Files.createDirectories(path);
                        java.nio.file.Files.copy(photo.getInputStream(), path.resolve(savedName), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                        photoUrls.add("/uploads/room-media/" + savedName);
                    } catch (java.io.IOException e) {
                        return ResponseEntity.internalServerError().body("Failed to upload photo");
                    }
                }
            }
        }
        if (!photoUrls.isEmpty()) {
            room.setPhotoUrls(photoUrls);
            room.setImageUrl(photoUrls.get(0));
        }

        if (video != null && !video.isEmpty()) {
            try {
                String vName = org.springframework.util.StringUtils.cleanPath(video.getOriginalFilename());
                String savedName = java.util.UUID.randomUUID().toString() + "_" + vName;
                java.nio.file.Path path = java.nio.file.Paths.get("uploads/room-media/");
                if (!java.nio.file.Files.exists(path)) java.nio.file.Files.createDirectories(path);
                java.nio.file.Files.copy(video.getInputStream(), path.resolve(savedName), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                room.setVideoUrl("/uploads/room-media/" + savedName);
            } catch (java.io.IOException e) {
                return ResponseEntity.internalServerError().body("Failed to upload video");
            }
        }

        return ResponseEntity.ok(roomRepository.save(room));
    }

    @GetMapping("/my-rooms")
    public ResponseEntity<?> getMyRooms() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(userDetails.getUsername()).orElse(null);
        if (user == null) return ResponseEntity.badRequest().body("User not found");

        return ResponseEntity.ok(roomRepository.findByOwner(user));
    }
}
