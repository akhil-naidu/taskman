import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runPush } from "../scripts/push-fleet";

const root = fileURLToPath(new URL("../fixtures/fleet", import.meta.url));

describe("push-fleet", () => {
  it("prints the snapshot and does not call the network on dry-run", async () => {
    const stdout: string[] = [];
    const fetchImpl = vi.fn();
    const code = await runPush(["--root", root, "--dry-run", "--now", "2026-10-20T06:30:00.000Z"], {
      env: {},
      fetchImpl,
      stdout: (chunk) => stdout.push(chunk),
    });
    expect(code).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
    const snapshot = JSON.parse(stdout.join("")) as { bots: { key: string }[]; waiting: unknown[] };
    expect(snapshot.bots.map((bot) => bot.key)).toEqual(["bot-a", "bot-b", "bot-c", "bot-d", "bot-e"]);
    expect(snapshot.waiting).toHaveLength(5);
  });

  it("posts the snapshot with the workspace token header", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ bots: 5 }), { status: 200 }));
    const stdout: string[] = [];
    const code = await runPush(["--root", root, "--token", "test-token", "--now", "2026-10-20T06:30:00.000Z"], {
      env: { TASKMAN_INGEST_URL: "https://example.com" },
      fetchImpl,
      stdout: (chunk) => stdout.push(chunk),
    });
    expect(code).toBe(0);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { method: string; headers: Record<string, string>; body: string }];
    expect(url).toBe("https://example.com/ingest");
    expect(init.method).toBe("POST");
    expect(init.headers["x-taskman-token"]).toBe("test-token");
    expect(init.body).toContain("bot-a");
    expect(stdout.join("")).not.toContain("test-token");
  });

  it("fails closed when the ingest response is rejected", async () => {
    const stderr: string[] = [];
    const code = await runPush(["--root", root, "--token", "test-token"], {
      env: { TASKMAN_INGEST_URL: "https://example.com/ingest" },
      fetchImpl: async () => new Response("no", { status: 401 }),
      stderr: (chunk) => stderr.push(chunk),
    });
    expect(code).toBe(1);
    expect(stderr.join("")).toContain("401");
    expect(stderr.join("")).not.toContain("test-token");
  });
});
