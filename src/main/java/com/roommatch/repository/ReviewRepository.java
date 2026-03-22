package com.roommatch.repository;

import com.roommatch.model.Review;
import com.roommatch.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByReviewedUser(User reviewedUser);
}
