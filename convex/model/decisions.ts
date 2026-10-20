import { stableHash } from "./text";
import type { FleetState, InstructionRow, TaskRow } from "./types";

export function approveTask(state: FleetState, key: string, now: number): { state: FleetState; error?: string } {
  const task = state.tasks.find((item) => item.key === key);
  if (!task) return { state, error: "Task was not found" };
  if (task.status !== "backlog" && task.status !== "todo") return { state, error: "Task is not in the backlog" };
  return { state: replaceTask(state, { ...task, status: "approved", updatedAt: now }) };
}

export function answerDecision(state: FleetState, key: string, answer: string, now: number): { state: FleetState; error?: string } {
  const task = state.tasks.find((item) => item.key === key);
  const text = answer.trim();
  if (!task) return { state, error: "Task was not found" };
  if (!task.needsHuman || task.decision) return { state, error: "Task does not need a decision" };
  if (!text) return { state, error: "Answer is required" };
  const nextTask: TaskRow = {
    ...task,
    decision: text,
    needsHuman: false,
    status: task.status === "done" ? "done" : "approved",
    updatedAt: now,
  };
  const instruction: InstructionRow = {
    key: `decision:${task.key}:${stableHash(`${text}|${now}`)}`,
    botKey: task.ownerBotKey,
    taskKey: task.key,
    kind: "decision",
    body: task.question || task.title,
    options: task.options ?? [],
    answer: text,
    status: "pending",
    createdAt: now,
    ackedAt: 0,
  };
  return {
    state: {
      ...replaceTask(state, nextTask),
      instructions: [...state.instructions, instruction],
    },
  };
}

export function queueInstruction(
  state: FleetState,
  input: { body: string; botKey?: string; taskKey?: string },
  now: number,
): { state: FleetState; error?: string } {
  const body = input.body.trim();
  if (!body) return { state, error: "Instruction is required" };
  const instruction: InstructionRow = {
    key: `instruction:${stableHash(`${body}|${now}|${input.botKey ?? ""}`)}`,
    botKey: input.botKey?.trim() ?? "",
    taskKey: input.taskKey?.trim() ?? "",
    kind: "instruction",
    body: body.slice(0, 500),
    options: [],
    answer: "",
    status: "pending",
    createdAt: now,
    ackedAt: 0,
  };
  return { state: { ...state, instructions: [...state.instructions, instruction] } };
}

function replaceTask(state: FleetState, task: TaskRow): FleetState {
  return { ...state, tasks: state.tasks.map((item) => (item.key === task.key ? task : item)) };
}
