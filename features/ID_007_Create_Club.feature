Feature: Create Club

  As a ClubHouse administrator
  I want to create a club and assign its club owner
  So that students can discover the club and its owner can manage the club's events

  Background:
    Given the following accounts exist:
      | Email                         | Role          |
      | admin.clubhouse@mcgill.ca     | Administrator |
      | dana.lee@mail.mcgill.ca       | Club Owner    |
      | evan.roy@mail.mcgill.ca       | User          |
      | alice.tremblay@mail.mcgill.ca | User          |
    And the club "Robotics Club" exists with owner "dana.lee@mail.mcgill.ca"

  Scenario Outline: Create a club with valid details (Normal Flow)
    Given "admin.clubhouse@mcgill.ca" is logged in with role "Administrator"
    When the user creates a club with name "<Name>", category "<Category>" and owner "<Owner>"
    Then the club "<Name>" is created with status "Active"
    And the owner of the club "<Name>" is "<Owner>"
    And the account "<Owner>" has role "Club Owner"
    And the message "Club created" is issued

    Examples:
      | Name         | Category | Owner                         |
      | Jazz Society | Arts     | evan.roy@mail.mcgill.ca       |
      | Debate Union | Academic | alice.tremblay@mail.mcgill.ca |

  Scenario: Create a club whose owner already owns another club (Alternate Flow)
    Given "admin.clubhouse@mcgill.ca" is logged in with role "Administrator"
    When the user creates a club with name "Jazz Society", category "Arts" and owner "dana.lee@mail.mcgill.ca"
    Then the club "Jazz Society" is created with status "Active"
    And "dana.lee@mail.mcgill.ca" is the owner of the clubs "Robotics Club" and "Jazz Society"
    And the message "Club created" is issued

  Scenario Outline: Attempt to create a club with invalid details (Error Flow)
    Given "admin.clubhouse@mcgill.ca" is logged in with role "Administrator"
    When the user creates a club with name "<Name>", category "<Category>" and owner "<Owner>"
    Then no club is created
    And the message "<Message>" is issued

    Examples:
      | Name          | Category | Owner                       | Message                    |
      |               | Arts     | evan.roy@mail.mcgill.ca     | Club name is required      |
      | Jazz Society  |          | evan.roy@mail.mcgill.ca     | Category is required       |
      | Robotics Club | Academic | evan.roy@mail.mcgill.ca     | Club name already exists   |
      | Jazz Society  | Arts     | unknown.user@mail.mcgill.ca | Owner account not found    |

  Scenario Outline: Attempt to create a club without the administrator role (Error Flow)
    Given "<Email>" is logged in with role "<Role>"
    When the user creates a club with name "Jazz Society", category "Arts" and owner "evan.roy@mail.mcgill.ca"
    Then no club is created
    And the message "Unauthorized user" is issued

    Examples:
      | Email                         | Role       |
      | dana.lee@mail.mcgill.ca       | Club Owner |
      | alice.tremblay@mail.mcgill.ca | User       |
