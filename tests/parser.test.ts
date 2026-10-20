import { describe, expect, it } from "vitest";
import { FIXTURE_NOW, formatIst, istDateString } from "../convex/model/clock";
import { openItemsFromNotes, parseFleetDocuments, recentActivity, roleFromDescription, wakeFromDescription } from "../convex/model/parser";
import { urgencyFor } from "../convex/model/text";
import type { FleetDocuments } from "../convex/model/types";

const now = FIXTURE_NOW;

function docs(partial: Partial<FleetDocuments>): FleetDocuments {
  return { config: {}, profiles: [], files: {}, pending: "", index: "", ...partial };
}

describe("fleet parser", () => {
  it("derives role, wake, and urgency without copying checked lines", () => {
    expect(roleFromDescription("You are bot-a, a release assistant for the sample fleet.\nWAKE: hi")).toBe(
      "A release assistant for the sample fleet",
    );
    expect(roleFromDescription("You are bot-x, dFlow sample worker.\n")).toBe("dFlow sample worker");
    expect(roleFromDescription("ignored", "Override role")).toBe("Override role");
    expect(wakeFromDescription("WAKE: hi")).toBe("hi");
    expect(wakeFromDescription(`RECURRING: ${"a".repeat(120)}`)).toHaveLength(111);
    expect(wakeFromDescription("no schedule")).toBe("unknown");
    expect(urgencyFor("Rotate the pat before the deadline")).toBe("high");
    expect(urgencyFor("Update the path in the sample")).toBe("normal");
    expect(istDateString(now)).toBe("2026-10-20");
    expect(formatIst(now)).toContain("IST");
  });

  it("keeps the last three dated lines and strips urls", () => {
    const lines = recentActivity([
      ["2026-09-01 old https://example.com/old", "2026-10-18 kept https://example.com/a", "|---|---|", "2026-10-19 queue | lane"].join(
        "\n",
      ),
    ]);
    expect(lines).toEqual(["2026-09-01 old", "2026-10-18 kept", "2026-10-19 queue · lane"]);
  });

  it("reads unchecked todos and waiting sections", () => {
    expect(
      openItemsFromNotes(["## Waiting on owner", "- [ ] First item", "- [x] Done item", "", "Plain outside", "- [ ] Second item"].join("\n")),
    ).toEqual(["First item", "Second item"]);
    expect(openItemsFromNotes("## Waiting on owner\nNeed a decision on the banner\n")).toEqual([
      "Need a decision on the banner",
    ]);
  });

  it("dedupes the same owner and flags a second owner as a conflict", () => {
    const snapshot = parseFleetDocuments(
      docs({
        config: { org_map: { "bot-a": "Talleflow", "bot-b": "dFlow" } },
        profiles: [
          { name: "bot-a", description: "You are bot-a, sample worker.\n" },
          { name: "bot-b", description: "You are bot-b, sample worker.\n" },
        ],
        pending: [
          "- [ ] Rotate the deploy token before Friday | bot-a | 2026-10-20",
          "- [x] Archive the old notes page | bot-a | 2026-10-01",
          "- [ ] Rotate the deploy token soon | bot-a | 2026-10-20",
          "- [ ] Rotate the shared deploy token | bot-b | 2026-10-20",
          "- [ ] Ship the separate draft | bot-b | 2026-10-19",
        ].join("\n"),
      }),
      { now },
    );
    const titles = snapshot.waiting.map((item) => item.title);
    expect(titles.filter((title) => title.startsWith("Rotate the deploy"))).toHaveLength(1);
    expect(titles).not.toContain("Archive the old notes page");
    const rotate = snapshot.waiting.filter((item) => item.conflict);
    expect(rotate).toHaveLength(2);
    expect(rotate.every((item) => item.urgency === "high")).toBe(true);
    expect(rotate[0]?.claimantKeys).toEqual(["bot-a", "bot-b"]);
    expect(snapshot.waiting.some((item) => item.title === "Ship the separate draft" && !item.conflict)).toBe(true);
  });

  it("does not merge items that share only one token", () => {
    const snapshot = parseFleetDocuments(
      docs({
        profiles: [{ name: "bot-a" }, { name: "bot-b" }],
        pending: "- [ ] Rotate the token | bot-a |\n- [ ] Rotate the certificate | bot-b |",
      }),
      { now },
    );
    expect(snapshot.waiting.every((item) => !item.conflict)).toBe(true);
    expect(snapshot.waiting).toHaveLength(2);
  });

  it("links an index note only when the file exists", () => {
    const snapshot = parseFleetDocuments(
      docs({
        profiles: [{ name: "bot-c", description: "Keeps notes." }],
        index: "| notes/missing.md | x | bot-c | 2026-10-01 |\n| notes/bot-c.md | x | bot-c | 2026-10-01 |\n",
        files: { "notes/bot-c.md": "2026-10-20 Sample note https://example.com/x" },
      }),
      { now },
    );
    const bot = snapshot.bots[0];
    expect(bot?.notes).toEqual(["notes/bot-c.md"]);
    expect(bot?.activity[0]).toBe("2026-10-20 Sample note");
  });

  it("marks a bot waiting only when that bot has open items", () => {
    const snapshot = parseFleetDocuments(
      docs({
        config: { known_routines: { "bot-a": ["Morning digest"] } },
        profiles: [{ name: "bot-a", description: "You are bot-a, sample worker.\nWAKE: 09:00" }],
        pending: "- [ ] Review the staging checklist | bot-a | 2026-10-18",
      }),
      { now },
    );
    expect(snapshot.bots[0]?.open).toEqual([]);
    expect(snapshot.waiting).toHaveLength(1);
    expect(snapshot.bots[0]?.routines).toEqual(["Morning digest"]);
  });
});
