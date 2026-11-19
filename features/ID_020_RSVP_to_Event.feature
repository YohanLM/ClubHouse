Feature: RSVP to Event

  As a ClubHouse user
  I want to RSVP to a club event by indicating whether I am attending
  So that the club knows who is coming and I can keep track of my plans

  Background:
    Given the current date is "2026-11-15"
    And the club "Robotics Club" has the following events:
      | Title             | Date       | Status    |
      | Robotics Workshop | 2026-12-03 | Scheduled |
      | Robotics Kickoff  | 2026-09-10 | Completed |
      | Demo Night        | 2026-12-10 | Cancelled |
    And "alice.tremblay@mail.mcgill.ca" is logged in with role "User"

  Scenario Outline: RSVP to an upcoming event (Normal Flow)
    Given no RSVP exists for "alice.tremblay@mail.mcgill.ca" on the event "Robotics Workshop"
    When the user RSVPs "<Response>" to the event "Robotics Workshop"
    Then the RSVP of "alice.tremblay@mail.mcgill.ca" for the event "Robotics Workshop" is "<Response>"
    And the number of attendees of the event "Robotics Workshop" is <Attendees>
    And the message "RSVP saved" is issued

    Examples:
      | Response      | Attendees |
      | Attending     | 1         |
      | Not Attending | 0         |

  Scenario: Change an existing RSVP (Alternate Flow)
    Given "alice.tremblay@mail.mcgill.ca" has RSVPed "Attending" to the event "Robotics Workshop"
    When the user RSVPs "Not Attending" to the event "Robotics Workshop"
    Then the RSVP of "alice.tremblay@mail.mcgill.ca" for the event "Robotics Workshop" is "Not Attending"
    And the number of attendees of the event "Robotics Workshop" is 0
    And the message "RSVP saved" is issued

  Scenario Outline: Attempt to RSVP to an event that cannot be attended (Error Flow)
    When the user RSVPs "Attending" to the event "<Title>"
    Then no RSVP is saved for "alice.tremblay@mail.mcgill.ca" on the event "<Title>"
    And the message "<Message>" is issued

    Examples:
      | Title            | Message                       |
      | Robotics Kickoff | Event has already taken place |
      | Demo Night       | Event is cancelled            |

  Scenario: Attempt to RSVP to an event that has reached its capacity (Error Flow)
    Given the event "Robotics Workshop" has a capacity of 1
    And "bob.chen@mcgill.ca" has RSVPed "Attending" to the event "Robotics Workshop"
    When the user RSVPs "Attending" to the event "Robotics Workshop"
    Then no RSVP is saved for "alice.tremblay@mail.mcgill.ca" on the event "Robotics Workshop"
    And the message "Event is full" is issued

  Scenario: Attempt to RSVP with an invalid response (Error Flow)
    When the user RSVPs "Maybe" to the event "Robotics Workshop"
    Then no RSVP is saved for "alice.tremblay@mail.mcgill.ca" on the event "Robotics Workshop"
    And the message "Invalid RSVP response" is issued
