Feature: Search Clubs

  As a ClubHouse user
  I want to search the McGill clubs by keyword or by category
  So that I can quickly find the clubs that match my interests

  Background:
    Given the following clubs exist:
      | ClubName      | Category | Status   |
      | Robotics Club | Academic | Active   |
      | Jazz Society  | Arts     | Active   |
      | Ski Club      | Sports   | Inactive |
      | Debate Union  | Academic | Active   |

  Scenario Outline: Search clubs by keyword (Normal Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user searches clubs with the keyword "<Keyword>"
    Then <Count> clubs are listed
    And the club "<FirstClub>" is listed first

    Examples:
      | Keyword  | Count | FirstClub     |
      | robotics | 1     | Robotics Club |
      | Soc      | 1     | Jazz Society  |
      | u        | 2     | Debate Union  |

  Scenario: Search clubs by category (Alternate Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user searches clubs in the category "Academic"
    Then the following clubs are listed in alphabetical order:
      | ClubName      | Category |
      | Debate Union  | Academic |
      | Robotics Club | Academic |

  Scenario: Search clubs with a keyword that matches only an inactive club (Alternate Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user searches clubs with the keyword "Ski"
    Then no clubs are listed
    And the message "No clubs found" is issued

  Scenario: Attempt to search clubs with an empty keyword (Error Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user searches clubs with the keyword ""
    Then no clubs are listed
    And the message "Search keyword is required" is issued

  Scenario: Attempt to search clubs without being logged in (Error Flow)
    Given no user is logged in
    When the user searches clubs with the keyword "robotics"
    Then no clubs are listed
    And the message "Login required" is issued
