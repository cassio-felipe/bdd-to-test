Feature: Google Search

Scenario: Buscar Playwright no Google
  Given I open https://www.google.com
  When I search for "Playwright"
  And I press enter
  Then I should see "Playwright"
