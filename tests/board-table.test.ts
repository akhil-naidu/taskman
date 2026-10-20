import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TaskTable } from "../components/task-table";
import type { TaskView } from "../convex/model/types";

function task(partial: Pick<TaskView, "key" | "title" | "status" | "ownerLabel"> & Partial<TaskView>): TaskView {
  return {
    org: "fleet",
    orgColor: "#888888",
    urgency: "normal",
    conflict: false,
    claimants: [],
    sourceKey: "",
    needsHuman: partial.status === "waiting_human",
    question: "",
    options: [],
    progress: [],
    decision: "",
    ...partial,
  };
}

describe("board table", () => {
  it("groups tasks under the five statuses once each", () => {
    const html = renderToStaticMarkup(
      createElement(TaskTable, {
        tasks: [
          task({ key: "b", title: "Beta", status: "approved", ownerLabel: "bot-b" }),
          task({ key: "a", title: "Alpha", status: "backlog", ownerLabel: "bot-a" }),
          task({ key: "c", title: "Gamma", status: "in_progress", ownerLabel: "bot-a" }),
          task({ key: "d", title: "Delta", status: "waiting_human", ownerLabel: "bot-a" }),
          task({ key: "e", title: "Epsilon", status: "done", ownerLabel: "bot-b" }),
        ],
      }),
    );
    const order = ["Backlog", "Approved", "In progress", "Waiting on human", "Done"].map((label) => html.indexOf(label));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(html.match(/Alpha/g)).toHaveLength(1);
    expect(html).toContain("bot-a");
    expect(html).toContain("Filter by status");
    expect(html).toContain("Filter by owner");
  });
});
