Feature: View Club Page

  As a ClubHouse user
  I want to view the page of a club
  So that I can see what the club does, who runs it and which events it has coming up

  Background:
    Given the current date is "2026-11-15"
    And the following clubs exist:
      | ClubName      | Category | Description                          | Owner                   | Status   |
      | Robotics Club | Academic | Build robots and enter competitions  | dana.lee@mail.mcgill.ca | Active   |
      | Jazz Society  | Arts     | Weekly jam sessions and concerts     | evan.roy@mail.mcgill.ca | Active   |
      | Ski Club      | Sports   | Weekend ski trips                    | evan.roy@mail.mcgill.ca | Inactive |
    And the club "Robotics Club" has the following events:
      | Title             | Date       | Status    |
      | Robotics Workshop | 2026-12-03 | Scheduled |
      | Demo Night        | 2026-12-10 | Cancelled |
      | Robotics Kickoff  | 2026-09-10 | Completed |

  Scenario: View the page of a club with upcoming events (Normal Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the page of the club "Robotics Club"
    Then the club page shows the category "Academic", the description "Build robots and enter competitions" and the owner "dana.lee@mail.mcgill.ca"
    And the club page lists the following upcoming events:
      | Title             | Date       |
      | Robotics Workshop | 2026-12-03 |

  Scenario: View the page of a club with no upcoming events (Alternate Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the page of the club "Jazz Society"
    Then the club page shows the category "Arts", the description "Weekly jam sessions and concerts" and the owner "evan.roy@mail.mcgill.ca"
    And the club page lists no upcoming events
    And the message "No upcoming events" is issued

  Scenario Outline: Attempt to view the page of a club that cannot be shown (Error Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the page of the club "<ClubName>"
    Then no club page is shown
    And the message "<Message>" is issued

    Examples:
      | ClubName   | Message          |
      | Ski Club   | Club is inactive |
      | Chess Club | Club not found   |

  Scenario: Attempt to view the page of a club without being logged in (Error Flow)
    Given no user is logged in
    When the user requests the page of the club "Robotics Club"
    Then no club page is shown
    And the message "Login required" is issued
