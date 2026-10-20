# workspace-shell

## ADDED Requirements

### Requirement: Sidebar navigation

The app SHALL show a sidebar that links to Fleet, Board, Connections, and Settings. The sidebar SHALL stay available while the reader moves between those pages.

#### Scenario: Reader opens the board

- **WHEN** the reader chooses Board in the sidebar
- **THEN** the board page is shown
- **AND** the sidebar still offers Fleet, Connections, and Settings

### Requirement: Command palette

The app SHALL open a command palette when the reader presses Cmd-K or Ctrl-K. The reader SHALL move the highlighted command with the keyboard and run it without a pointer.

#### Scenario: Keyboard opens the board

- **WHEN** the reader opens the palette, highlights the board command, and confirms
- **THEN** the board page is shown
- **AND** the palette closes

### Requirement: Dark dense surfaces

The workspace SHALL render dark surfaces by default, with subtle borders. An org color SHALL be used only as a small mark on a row or card, not as the fill of a panel.

#### Scenario: First visit

- **WHEN** a reader opens the app with no saved theme
- **THEN** the page surfaces are dark
- **AND** an org is distinguished by a small color mark
