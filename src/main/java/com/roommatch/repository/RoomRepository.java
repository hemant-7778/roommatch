package com.roommatch.repository;

import com.roommatch.model.Room;
import com.roommatch.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByOwner(User owner);
    List<Room> findByAvailable(Boolean available);
    @org.springframework.data.jpa.repository.Query("SELECT r FROM Room r WHERE r.available = true AND " +
           "(:location IS NULL OR LOWER(r.location) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
           "(:minRent IS NULL OR r.rent >= :minRent) AND " +
           "(:maxRent IS NULL OR r.rent <= :maxRent) AND " +
           "(:roomType IS NULL OR r.roomType = :roomType)")
    List<Room> searchRooms(@org.springframework.data.repository.query.Param("location") String location,
                           @org.springframework.data.repository.query.Param("minRent") Double minRent,
                           @org.springframework.data.repository.query.Param("maxRent") Double maxRent,
                           @org.springframework.data.repository.query.Param("roomType") String roomType);
}
