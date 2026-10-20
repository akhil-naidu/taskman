import { describe, expect, it } from "vitest";
import { tokensMatch } from "../convex/model/auth";
import { deriveStatus } from "../convex/model/view";

describe("ingest auth and status", () => {
  it("compares tokens without accepting an empty secret", () => {
    expect(tokensMatch("secret", "secret")).toBe(true);
    expect(tokensMatch("secret", "secreT")).toBe(false);
    expect(tokensMatch("secret", "secret-extra")).toBe(false);
    expect(tokensMatch("", "")).toBe(false);
    expect(tokensMatch("secret", undefined)).toBe(false);
  });

  it("orders bot status as waiting, active, routine, then on demand", () => {
    expect(deriveStatus({ openCount: 1, activity: ["2026-10-20 note"] }, 2, "2026-10-20")).toBe("waiting");
    expect(deriveStatus({ openCount: 0, activity: ["2026-10-20 note"] }, 2, "2026-10-20")).toBe("active");
    expect(deriveStatus({ openCount: 0, activity: ["2026-10-01 note"] }, 1, "2026-10-20")).toBe("routine");
    expect(deriveStatus({ openCount: 0, activity: [] }, 0, "2026-10-20")).toBe("on-demand");
  });
});
