package com.roommatch.repository;

import com.roommatch.model.Room;
import com.roommatch.model.RoomRequest;
import com.roommatch.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRequestRepository extends JpaRepository<RoomRequest, Long> {
    List<RoomRequest> findByRoom(Room room);
    List<RoomRequest> findByRequester(User requester);
    
    List<RoomRequest> findByRoom_Owner(User owner);
}
