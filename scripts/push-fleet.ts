import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseFleetDocuments } from "../convex/model/parser";
import { loadFleetDocuments } from "./load-fleet";

type Io = {
  env: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  stdout?: (chunk: string) => void;
  stderr?: (chunk: string) => void;
};

function readFlag(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  return argv[index + 1];
}

export async function runPush(argv: string[], io: Io): Promise<number> {
  const stdout = io.stdout ?? ((chunk) => process.stdout.write(chunk));
  const stderr = io.stderr ?? ((chunk) => process.stderr.write(chunk));
  if (argv.includes("--help")) {
    stdout(
      "Usage: pnpm push-fleet --root <dir> [--dry-run] [--url <ingest-url>] [--now <iso>]\n",
    );
    return 0;
  }
  const root = readFlag(argv, "--root");
  if (!root) {
    stderr("Missing --root\n");
    return 1;
  }
  const nowFlag = readFlag(argv, "--now");
  const now = nowFlag ? Date.parse(nowFlag) : Date.now();
  if (Number.isNaN(now)) {
    stderr("Invalid --now\n");
    return 1;
  }
  let snapshot;
  try {
    snapshot = parseFleetDocuments(loadFleetDocuments(root), { now });
  } catch (error) {
    stderr(`${error instanceof Error ? error.message : "Could not read the fleet root"}\n`);
    return 1;
  }
  if (argv.includes("--dry-run")) {
    stdout(`${JSON.stringify(snapshot, null, 2)}\n`);
    return 0;
  }
  const url = readFlag(argv, "--url") ?? io.env.TASKMAN_INGEST_URL;
  const token = io.env.TASKMAN_INGEST_TOKEN;
  if (!url || !token) {
    stderr("Set TASKMAN_INGEST_URL and TASKMAN_INGEST_TOKEN, or pass --url\n");
    return 1;
  }
  const endpoint = url.endsWith("/ingest") ? url : `${url.replace(/\/$/, "")}/ingest`;
  const fetchImpl = io.fetchImpl ?? fetch;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-taskman-token": token,
    },
    body: JSON.stringify({ snapshot, replace: true }),
  });
  const text = await response.text();
  if (!response.ok) {
    stderr(`Ingest failed: ${response.status}\n`);
    return 1;
  }
  stdout(`${text}\n`);
  return 0;
}

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === entry) {
  runPush(process.argv.slice(2), { env: process.env }).then((code) => {
    process.exitCode = code;
  });
}
