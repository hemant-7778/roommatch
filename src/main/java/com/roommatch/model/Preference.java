package com.roommatch.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "preferences")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Preference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;

    // Sleep Time: EARLY, LATE
    private String sleepTime;

    // Cleanliness: LOW, MEDIUM, HIGH
    private String cleanliness;

    // Smoking: YES, NO
    private String smoking;

    // Drinking: YES, NO
    private String drinking;

    // Study Style: QUIET, FLEXIBLE
    private String studyStyle;

    // Guests: OFTEN, RARE
    private String guests;

    // Food Type: VEG, NON_VEG
    private String foodType;

    // Noise Tolerance: LOW, MEDIUM, HIGH
    private String noiseTolerance;

    // Work Schedule: DAY, NIGHT
    private String workSchedule;

    // Pet Friendly: YES, NO
    private String petFriendly;
}
