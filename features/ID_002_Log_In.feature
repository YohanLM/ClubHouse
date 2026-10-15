Feature: Log In

  As a registered ClubHouse user, club owner or administrator
  I want to log in to ClubHouse with my email and password
  So that I can access the features available to my role

  Background:
    Given the following accounts exist:
      | Email                         | Password     | Role          |
      | alice.tremblay@mail.mcgill.ca | Passw0rd!23  | User          |
      | dana.lee@mail.mcgill.ca       | Owner#Pass45 | Club Owner    |
      | admin.clubhouse@mcgill.ca     | Admin!Pass67 | Administrator |

  Scenario Outline: Log in with valid credentials (Normal Flow)
    When a user logs in with email "<Email>" and password "<Password>"
    Then the user is logged in as "<Email>" with role "<Role>"
    And the message "Login successful" is issued

    Examples:
      | Email                         | Password     | Role          |
      | alice.tremblay@mail.mcgill.ca | Passw0rd!23  | User          |
      | dana.lee@mail.mcgill.ca       | Owner#Pass45 | Club Owner    |
      | admin.clubhouse@mcgill.ca     | Admin!Pass67 | Administrator |

  Scenario: Log in with an email written in a different letter case (Alternate Flow)
    When a user logs in with email "ALICE.Tremblay@mail.mcgill.ca" and password "Passw0rd!23"
    Then the user is logged in as "alice.tremblay@mail.mcgill.ca" with role "User"
    And the message "Login successful" is issued

  Scenario Outline: Attempt to log in with invalid credentials (Error Flow)
    When a user logs in with email "<Email>" and password "<Password>"
    Then no user is logged in
    And the message "<Message>" is issued

    Examples:
      | Email                         | Password    | Message                   |
      | alice.tremblay@mail.mcgill.ca | WrongPass1! | Invalid email or password |
      | unknown.user@mail.mcgill.ca   | Passw0rd!23 | Invalid email or password |
      |                               | Passw0rd!23 | Email is required         |
      | alice.tremblay@mail.mcgill.ca |             | Password is required      |

  Scenario: Attempt to log in after five consecutive failed attempts (Error Flow)
    Given 5 consecutive failed login attempts were made for email "alice.tremblay@mail.mcgill.ca"
    When a user logs in with email "alice.tremblay@mail.mcgill.ca" and password "Passw0rd!23"
    Then no user is logged in
    And the message "Account temporarily locked" is issued
