import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { FleetConfig, FleetDocuments, FleetProfile, SnapshotTask } from "../convex/model/types";

function safeJoin(root: string, rel: string): string | null {
  const base = path.resolve(root);
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) return null;
  return full;
}

function readIfExists(file: string): string | null {
  try {
    if (!statSync(file).isFile()) return null;
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

export function loadFleetDocuments(root: string): FleetDocuments {
  const base = path.resolve(root);
  const configPath = safeJoin(base, "config.json");
  const configText = configPath ? readIfExists(configPath) : null;
  if (!configText) throw new Error(`Missing config.json in ${base}`);
  const config = JSON.parse(configText) as FleetConfig;

  const profiles: FleetProfile[] = [];
  const agentsDir = safeJoin(base, "agents");
  if (agentsDir) {
    let entries: string[] = [];
    try {
      entries = readdirSync(agentsDir);
    } catch {
      entries = [];
    }
    for (const entry of entries.sort()) {
      const profilePath = safeJoin(agentsDir, path.join(entry, "profile.json"));
      if (!profilePath) continue;
      const text = readIfExists(profilePath);
      if (!text) continue;
      try {
        profiles.push(JSON.parse(text) as FleetProfile);
      } catch {
        continue;
      }
    }
  }

  const files: Record<string, string> = {};
  const wanted = new Set<string>();
  for (const paths of Object.values(config.notes ?? {})) for (const rel of paths) wanted.add(rel);
  const indexText = readIfExists(path.join(base, "INDEX.md")) ?? "";
  for (const line of indexText.split(/\r?\n/)) {
    const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
    if (cells[0]?.endsWith(".md")) wanted.add(cells[0]);
  }
  for (const rel of wanted) {
    const full = safeJoin(base, rel);
    if (!full) continue;
    const text = readIfExists(full);
    if (text !== null) files[rel] = text;
  }

  let tasks: Partial<SnapshotTask>[] | undefined;
  const tasksPath = safeJoin(base, "tasks.json");
  const tasksText = tasksPath ? readIfExists(tasksPath) : null;
  if (tasksText) tasks = JSON.parse(tasksText) as Partial<SnapshotTask>[];

  return {
    config,
    pending: readIfExists(path.join(base, "pending.md")) ?? "",
    index: indexText,
    profiles,
    files,
    tasks,
  };
}
