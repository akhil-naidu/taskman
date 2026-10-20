import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FIXTURE_NOW } from "../convex/model/clock";
import { parseFleetDocuments } from "../convex/model/parser";
import { emptyState, planRemoteTasks, planSnapshot } from "../convex/model/store";
import { rowsToView } from "../convex/model/view";
import demo from "../fixtures/demo-snapshot.json";
import { loadFleetDocuments } from "../scripts/load-fleet";

const root = fileURLToPath(new URL("../fixtures/fleet", import.meta.url));

describe("example fleet fixture", () => {
  const snapshot = parseFleetDocuments(loadFleetDocuments(root), { now: FIXTURE_NOW });

  it("matches the checked-in example snapshot", () => {
    expect(snapshot).toEqual(demo);
  });

  it("builds the fleet counts from neutral fixtures", () => {
    const state = planSnapshot(emptyState(), snapshot, { now: FIXTURE_NOW, replace: true });
    const again = planSnapshot(state, snapshot, { now: FIXTURE_NOW, replace: true });
    expect(again).toEqual(state);

    const view = rowsToView(state, FIXTURE_NOW);
    expect(view.tiles).toEqual({ bots: 5, orgs: 5, routines: 2, active: 1, waiting: 5, high: 2 });
    expect(view.truncated).toBe(false);
    expect(view.bots.find((bot) => bot.key === "bot-a")).toMatchObject({
      status: "active",
      org: "Talleflow",
      role: "A release assistant for the sample fleet",
      wake: "Weekday 09:00 IST",
      lastRun: "2026-10-20 09:10 IST",
      currentWork: "Prepare the weekly fleet note",
      openCount: 0,
    });
    expect(view.bots.find((bot) => bot.key === "bot-b")?.status).toBe("waiting");
    expect(view.bots.find((bot) => bot.key === "bot-c")).toMatchObject({ status: "on-demand", wake: "unknown" });
    expect(view.bots.find((bot) => bot.key === "bot-d")?.status).toBe("routine");
    expect(view.bots.find((bot) => bot.key === "bot-e")).toMatchObject({
      status: "waiting",
      role: "Example fleet coordinator for sample data",
    });
    expect(view.bots.find((bot) => bot.key === "bot-a")?.activity).toEqual([
      "2026-10-18 Drafted the checklist",
      "2026-10-19 Reviewed the queue · lane notes",
      "2026-10-20 Published the morning note",
    ]);
    expect(view.tasks.filter((task) => task.conflict)).toHaveLength(3);
    expect(view.tasks.find((task) => task.key === "clickup:cu-1001")).toMatchObject({
      sourceKey: "clickup",
      externalUrl: "https://example.com/tasks/cu-1001",
      org: "dFlow",
    });
    expect(JSON.stringify(snapshot)).not.toContain("Archive the old notes page");
    expect(state.runs.some((run) => run.summary.includes("http"))).toBe(false);
    expect(state.syncLinks.map((link) => link.externalId)).toEqual(["cu-1001"]);
    expect(state.sources.every((source) => source.readOnly)).toBe(true);
  });

  it("keeps a previously synced ticket when the fleet snapshot is applied twice", () => {
    const remote = planRemoteTasks(
      emptyState(),
      {
        provider: "clickup",
        tasks: [{ externalId: "cu-1", title: "Imported sample", status: "todo", url: "https://example.com/tasks/cu-1" }],
      },
      { now: 1 },
    );
    const once = planSnapshot(remote, snapshot, { now: FIXTURE_NOW, replace: true });
    const twice = planSnapshot(once, snapshot, { now: FIXTURE_NOW, replace: true });
    expect(twice).toEqual(once);
    expect(twice.tasks.filter((task) => task.key === "clickup:cu-1")).toHaveLength(1);
    expect(twice.syncLinks.filter((link) => link.externalId === "cu-1")).toHaveLength(1);
    expect(twice.bots).toHaveLength(5);
  });
});
