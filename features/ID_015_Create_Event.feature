Feature: Create Event

  As a club owner
  I want to create an event for my club
  So that students can discover the event and RSVP to it

  Background:
    Given the current date is "2026-10-20"
    And the club "Robotics Club" exists
    And "dana.lee@mail.mcgill.ca" is the owner of "Robotics Club"
    And "evan.roy@mail.mcgill.ca" is not the owner of "Robotics Club"

  Scenario Outline: ID_015_Create an event with valid details (Normal Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user creates an event for "Robotics Club" with title "<Title>", category "<Category>", date "<Date>", start time "<Start>", end time "<End>" and location "<Location>"
    Then the event "<Title>" is created for "Robotics Club" with status "Scheduled"
    And the message "Event created" is issued

    Examples:
      | Title             | Category | Date       | Start | End   | Location |
      | Robotics Workshop | Academic | 2026-11-12 | 18:00 | 20:00 | McConnell 103 |
      | Demo Night        | Social   | 2026-11-20 | 19:00 | 21:30 | Trottier 0100 |

  Scenario: ID_015_Create an event with an optional capacity limit (Alternate Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user creates an event for "Robotics Club" with title "Hack Night", category "Academic", date "2026-11-25", start time "18:00", end time "23:00" and location "McConnell 103"
    And the user sets the capacity of the event to 50
    Then the event "Hack Night" is created for "Robotics Club" with status "Scheduled"
    And the event "Hack Night" has a capacity of 50
    And the message "Event created" is issued

  Scenario Outline: ID_015_Attempt to create an event with invalid details (Error Flow)
    Given "dana.lee@mail.mcgill.ca" is logged in with role "Club Owner"
    When the user creates an event for "Robotics Club" with title "<Title>", category "<Category>", date "<Date>", start time "<Start>", end time "<End>" and location "<Location>"
    Then no event is created
    And the message "<Message>" is issued

    Examples:
      | Title             | Category | Date       | Start | End   | Location      | Message |
      |                   | Academic | 2026-11-12 | 18:00 | 20:00 | McConnell 103 | Title is required |
      | Robotics Workshop |          | 2026-11-12 | 18:00 | 20:00 | McConnell 103 | Category is required |
      | Robotics Workshop | Academic | 2026-10-01 | 18:00 | 20:00 | McConnell 103 | Event date cannot be past |
      | Robotics Workshop | Academic | 2026-11-12 | 20:00 | 18:00 | McConnell 103 | End time must be after start|

  Scenario: ID_015_Attempt to create an event as a user who is not the club owner (Error Flow)
    Given "evan.roy@mail.mcgill.ca" is logged in with role "User"
    When the user creates an event for "Robotics Club" with title "Robotics Workshop", category "Academic", date "2026-11-12", start time "18:00", end time "20:00" and location "McConnell 103"
    Then no event is created
    And the message "Unauthorized user" is issued
