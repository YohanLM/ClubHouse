Feature: Cancel Event

  As a club owner
  I want to cancel an event of my club
  So that students know the event will not take place

  Background:
    Given the current date is "2026-11-15"
    And the club "Robotics Club" exists
    And "dana.lee@mail.mcgill.ca" is the owner of "Robotics Club"
    And "evan.roy@mail.mcgill.ca" is not the owner of "Robotics Club"
    And the club "Robotics Club" has the following events:
      | Title             | Date       | Status    |
      | Robotics Workshop | 2026-12-03 | Scheduled |
      | Robotics Kickoff  | 2026-09-10 | Completed |
      | Demo Night        | 2026-12-10 | Cancelled |

  Scenario: Cancel a scheduled event (Normal Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user cancels the event "Robotics Workshop"
    Then the event "Robotics Workshop" has status "Cancelled"
    And the message "Event cancelled" is issued

  Scenario: Cancel a scheduled event with a reason (Alternate Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user cancels the event "Robotics Workshop" with the reason "Room unavailable"
    Then the event "Robotics Workshop" has status "Cancelled"
    And the event "Robotics Workshop" has the cancellation reason "Room unavailable"
    And the message "Event cancelled" is issued

  Scenario Outline: Attempt to cancel an event that is not scheduled (Error Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user cancels the event "<Title>"
    Then the event "<Title>" has status "<Status>"
    And the message "<Message>" is issued

    Examples:
      | Title            | Status    | Message                       |
      | Demo Night       | Cancelled | Event is already cancelled    |
      | Robotics Kickoff | Completed | Event has already taken place |

  Scenario: Attempt to cancel an event as a user who is not the club owner (Error Flow)
    Given "evan.roy@mail.mcgill.ca" is logged in with role "User"
    When the user cancels the event "Robotics Workshop"
    Then the event "Robotics Workshop" has status "Scheduled"
    And the message "Unauthorized user" is issued
