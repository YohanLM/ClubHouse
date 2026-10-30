Feature: Create Account

  As a McGill student
  I want to create a ClubHouse account with my McGill email
  So that I can follow clubs, RSVP to events and keep track of campus activities

  Background:
    Given the ClubHouse system has no registered accounts

  Scenario Outline: ID_001_Create an account with valid details (Normal Flow)
    When a student registers with name "<Name>", email "<Email>" and password "<Password>"
    Then an account is created for email "<Email>" with role "User"
    And the message "Account created" is issued

    Examples:
      | Name           | Email                         | Password |
      | Alice Tremblay | alice.tremblay@mail.mcgill.ca | Passw0rd!23 |
      | Bob Chen       | bob.chen@mcgill.ca            | Secur3Pass#1 |

  Scenario: ID_001_Create an account with optional profile information (Alternate Flow)
    When a student registers with name "Carla Gomez", email "carla.gomez@mail.mcgill.ca" and password "Passw0rd!23"
    And the student provides the faculty "Engineering" and the study year "U2"
    Then an account is created for email "carla.gomez@mail.mcgill.ca" with role "User"
    And the profile of "carla.gomez@mail.mcgill.ca" has the faculty "Engineering" and the study year "U2"
    And the message "Account created" is issued

  Scenario: ID_001_Attempt to create an account with an email that is already registered (Error Flow)
    Given an account exists for email "alice.tremblay@mail.mcgill.ca"
    When a student registers with name "Alice Tremblay", email "alice.tremblay@mail.mcgill.ca" and password "Passw0rd!23"
    Then no new account is created
    And the message "Email already registered" is issued

  Scenario Outline: ID_001_Attempt to create an account with invalid details (Error Flow)
    When a student registers with name "<Name>", email "<Email>" and password "<Password>"
    Then no account is created
    And the message "<Message>" is issued

    Examples:
      | Name           | Email                         | Password    | Message |
      | Alice Tremblay | alice.tremblay@gmail.com      | Passw0rd!23 | Invalid McGill email |
      | Alice Tremblay | alice.tremblay@mail.mcgill.ca | abc         | Password too weak |
      |                | alice.tremblay@mail.mcgill.ca | Passw0rd!23 | Name is required |
      | Alice Tremblay |                               | Passw0rd!23 | Email is required |
      | Alice Tremblay | alice.tremblay@mail.mcgill.ca |             | Password is required |
