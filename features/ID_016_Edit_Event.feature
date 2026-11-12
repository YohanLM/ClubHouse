Feature: Edit Event

  As a club owner
  I want to edit the details of an event of my club
  So that students see correct information about the event

  Background:
    Given the current date is "2026-11-15"
    And the club "Robotics Club" exists
    And "dana.lee@mail.mcgill.ca" is the owner of "Robotics Club"
    And "evan.roy@mail.mcgill.ca" is not the owner of "Robotics Club"
    And the club "Robotics Club" has the following events:
      | Title             | Date       | Status    |
      | Robotics Workshop | 2026-12-03 | Scheduled |
      | Demo Night        | 2026-12-10 | Cancelled |

  Scenario Outline: Edit a scheduled event with valid details (Normal Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user changes the "<Field>" of the event "Robotics Workshop" to "<Value>"
    Then the event "Robotics Workshop" has the "<Field>" "<Value>"
    And the message "Event updated" is issued

    Examples:
      | Field    | Value         |
      | location | Trottier 0100 |
      | date     | 2026-12-05    |

  Scenario: Set a capacity limit on a scheduled event (Alternate Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user changes the "capacity" of the event "Robotics Workshop" to "50"
    Then the event "Robotics Workshop" has the "capacity" "50"
    And the message "Event updated" is issued

  Scenario Outline: Attempt to edit an event with invalid details (Error Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user changes the "<Field>" of the event "Robotics Workshop" to "<Value>"
    Then the event "Robotics Workshop" is unchanged
    And the message "<Message>" is issued

    Examples:
      | Field    | Value      | Message                             |
      | title    |            | Title is required                   |
      | date     | 2026-11-01 | Event date cannot be past           |
      | capacity | 0          | Capacity must be a positive integer |

  Scenario: Attempt to edit a cancelled event (Error Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user changes the "location" of the event "Demo Night" to "Trottier 0100"
    Then the event "Demo Night" is unchanged
    And the message "Cancelled events cannot be edited" is issued

  Scenario: Attempt to edit an event as a user who is not the club owner (Error Flow)
    Given "evan.roy@mail.mcgill.ca" is logged in with role "User"
    When the user changes the "location" of the event "Robotics Workshop" to "Trottier 0100"
    Then the event "Robotics Workshop" is unchanged
    And the message "Unauthorized user" is issued
