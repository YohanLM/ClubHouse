Feature: View Upcoming Events Calendar

  As a ClubHouse user
  I want to see the upcoming events of McGill clubs in one calendar
  So that I can plan which events to attend

  Background:
    Given the current date is "2026-11-15"
    And the following events exist:
      | ClubName      | Title             | Date       | Start | Status    |
      | Robotics Club | Robotics Workshop | 2026-12-03 | 18:00 | Scheduled |
      | Jazz Society  | Jazz Night        | 2026-11-20 | 19:00 | Scheduled |
      | Debate Union  | Debate Finals     | 2026-11-20 | 17:00 | Scheduled |
      | Robotics Club | Demo Night        | 2026-12-10 | 19:00 | Cancelled |
      | Robotics Club | Robotics Kickoff  | 2026-09-10 | 18:00 | Completed |

  Scenario: View the calendar of all upcoming events (Normal Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the events calendar
    Then the following events are listed in chronological order:
      | ClubName      | Title             | Date       | Start |
      | Debate Union  | Debate Finals     | 2026-11-20 | 17:00 |
      | Jazz Society  | Jazz Night        | 2026-11-20 | 19:00 |
      | Robotics Club | Robotics Workshop | 2026-12-03 | 18:00 |

  Scenario Outline: View the calendar for a date range (Alternate Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the events calendar from "<From>" to "<To>"
    Then <Count> events are listed
    And the event "<FirstEvent>" is listed first

    Examples:
      | From       | To         | Count | FirstEvent        |
      | 2026-11-15 | 2026-11-30 | 2     | Debate Finals     |
      | 2026-12-01 | 2026-12-31 | 1     | Robotics Workshop |

  Scenario: Attempt to view the calendar with an invalid date range (Error Flow)
    Given "alice.tremblay@mail.mcgill.ca" is logged in with role "User"
    When the user requests the events calendar from "2026-12-31" to "2026-12-01"
    Then no events are listed
    And the message "End date must be after start date" is issued

  Scenario: Attempt to view the calendar without being logged in (Error Flow)
    Given no user is logged in
    When the user requests the events calendar
    Then no events are listed
    And the message "Login required" is issued
