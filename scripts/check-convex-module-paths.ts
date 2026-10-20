import path from "node:path";
import { findInvalidConvexModules, listConvexSourceFiles } from "../lib/convex-module-paths";

const invalid = findInvalidConvexModules(listConvexSourceFiles(path.join(process.cwd(), "convex")));
if (invalid.length === 0) {
  console.log("Convex module paths are valid");
} else {
  console.error("Invalid Convex module paths. Each path component may contain only letters, numbers, underscores, and periods.");
  for (const modulePath of invalid) console.error(modulePath);
  process.exit(1);
}
