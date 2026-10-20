export const BOARD_COLUMNS = [
  ["backlog", "Backlog"],
  ["approved", "Approved"],
  ["in_progress", "In progress"],
  ["waiting_human", "Waiting on human"],
  ["done", "Done"],
] as const;

export type BoardColumnId = (typeof BOARD_COLUMNS)[number][0];

export function boardColumn(task: { status: string; needsHuman?: boolean }): BoardColumnId {
  if (task.status === "done") return "done";
  if (task.needsHuman || task.status === "waiting" || task.status === "waiting_human") return "waiting_human";
  if (task.status === "approved") return "approved";
  if (task.status === "in_progress") return "in_progress";
  return "backlog";
}
