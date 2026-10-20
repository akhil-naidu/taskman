# board

## ADDED Requirements

### Requirement: List view

The board SHALL show the same filtered tasks as a list. The reader SHALL switch between the list and the status columns, and the choice SHALL be kept in the page URL.

#### Scenario: List follows the org filter

- **WHEN** the reader opens the board as a list with an org selected
- **THEN** each visible task appears once, with its status, owner, and org
- **AND** tasks from other orgs are hidden
