import { spawnSync } from "node:child_process";
import { missingPublicFunctions, parseFunctionSpec, REQUIRED_PUBLIC_FUNCTIONS } from "../lib/convex-function-spec";

const result = spawnSync("pnpm", ["exec", "convex", "function-spec"], {
  encoding: "utf8",
  env: process.env,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const missing = missingPublicFunctions(parseFunctionSpec(result.stdout), REQUIRED_PUBLIC_FUNCTIONS);
if (missing.length > 0) {
  console.error(`Missing public Convex functions: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`Public Convex functions include ${REQUIRED_PUBLIC_FUNCTIONS.join(", ")}`);
