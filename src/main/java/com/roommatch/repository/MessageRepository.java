package com.roommatch.repository;

import com.roommatch.model.Message;
import com.roommatch.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findBySenderAndReceiverOrSenderAndReceiverOrderByTimestampAsc(
            User sender1, User receiver1, User sender2, User receiver2
    );

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Message m WHERE ((m.sender = :user1 AND m.receiver = :user2) OR (m.sender = :user2 AND m.receiver = :user1)) AND m.timestamp > :after ORDER BY m.timestamp ASC")
    List<Message> findChatMessagesAfter(
            @org.springframework.data.repository.query.Param("user1") User user1,
            @org.springframework.data.repository.query.Param("user2") User user2,
            @org.springframework.data.repository.query.Param("after") java.time.LocalDateTime after
    );

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m.receiver FROM Message m WHERE m.sender = :sender")
    List<User> findDistinctReceiverBySender(@org.springframework.data.repository.query.Param("sender") User sender);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT m.sender FROM Message m WHERE m.receiver = :receiver")
    List<User> findDistinctSenderByReceiver(@org.springframework.data.repository.query.Param("receiver") User receiver);

    long countByReceiverAndIsReadFalse(User receiver);

}
