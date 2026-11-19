Feature: Follow Club

  As a ClubHouse user
  I want to follow clubs
  So that I can keep track of club updates and upcoming events

  Background:
    Given the club "Robotics Club" has owner "dana.lee@mail.mcgill.ca"

  Scenario: ID_011_Follow a club (Normal Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user follows the club "Robotics Club"
    Then "alice.tremblay@mail.mcgill.ca" is following the club "Robotics Club"
    And the club "Robotics Club" has 1 followers
    And the message "Club followed" is issued

  Scenario: ID_011_Already following a club (Alternate Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    And "alice.tremblay@mail.mcgill.ca" is already following the club "Robotics Club"
    When the user follows the club "Robotics Club"
    Then "alice.tremblay@mail.mcgill.ca" is following the club "Robotics Club"
    And the club "Robotics Club" has 1 followers
    And the message "Club already followed" is issued

  Scenario: ID_011_Attempt to follow a club without being logged in (Error Flow)
    Given no user is logged in
    When the user follows the club "Robotics Club"
    Then no follow exists for "alice.tremblay@mail.mcgill.ca" on the club "Robotics Club"
    And the message "Login required" is issued
