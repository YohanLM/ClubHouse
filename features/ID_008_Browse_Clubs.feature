Feature: Browse Clubs

  As a ClubHouse user
  I want to browse the list of McGill student clubs
  So that I can discover clubs that match my interests

  Background:
    Given the following clubs exist:
      | ClubName      | Category | Status   |
      | Robotics Club | Academic | Active   |
      | Jazz Society  | Arts     | Active   |
      | Ski Club      | Sports   | Inactive |
      | Debate Union  | Academic | Active   |

  Scenario: Browse the list of clubs as a logged-in user (Normal Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the list of clubs
    Then the following clubs are listed in alphabetical order:
      | ClubName      | Category |
      | Debate Union  | Academic |
      | Jazz Society  | Arts     |
      | Robotics Club | Academic |

  Scenario Outline: Browse the list of clubs with a different role (Alternate Flow)
    Given "<Email>" is logged in with role "<Role>"
    When the user requests the list of clubs
    Then 3 clubs are listed
    And the club "Ski Club" is not listed

    Examples:
      | Email                     | Role          |
      | dana.lee@mail.mcgill.ca   | Club Owner    |
      | admin.clubhouse@mcgill.ca | Administrator |

  Scenario: Attempt to browse the list of clubs without being logged in (Error Flow)
    Given no user is logged in
    When the user requests the list of clubs
    Then no clubs are listed
    And the message "Login required" is issued
