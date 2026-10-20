# Spec Delta

## MODIFIED Requirements

### Requirement: Status columns

The board SHALL show tasks in Backlog, Approved, In progress, Waiting on human, and Done. An empty column SHALL say that it has nothing.

#### Scenario: Tasks of each status

- **WHEN** the snapshot contains tasks in more than one of those statuses
- **THEN** each task appears in the column for its status
- **AND** an empty column says that it has nothing

## ADDED Requirements

### Requirement: Data table view

The board SHALL show the same filtered tasks as a data table beside the column view. The reader SHALL group rows by status, filter them, and sort them. The choice of table or columns SHALL stay in the page URL. Status groups SHALL use Backlog, Approved, In progress, Waiting on human, and Done.

#### Scenario: Group by status

- **WHEN** the reader opens the board as a table
- **THEN** tasks are grouped under those five statuses
- **AND** a task appears in only one group

#### Scenario: Filter and sort

- **WHEN** the reader filters the table by owner and sorts by title
- **THEN** only that owner's tasks remain
- **AND** those titles are in the chosen order

#### Scenario: Choice stays in the URL

- **WHEN** the reader switches from columns to the table
- **THEN** the page URL records the table view
