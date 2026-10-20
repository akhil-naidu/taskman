import { writeFileSync } from "node:fs";
import path from "node:path";
import { FIXTURE_NOW } from "../convex/model/clock";
import { parseFleetDocuments } from "../convex/model/parser";
import { loadFleetDocuments } from "./load-fleet";

const root = path.join(process.cwd(), "fixtures/fleet");
const snapshot = parseFleetDocuments(loadFleetDocuments(root), { now: FIXTURE_NOW });
writeFileSync(path.join(process.cwd(), "fixtures/demo-snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`);
