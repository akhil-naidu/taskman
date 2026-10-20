import { readdirSync } from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const MODULE_COMPONENT = /^[A-Za-z0-9_.]+$/;

export function bundledModulePath(relativePath: string): string | null {
  const normalized = relativePath.replaceAll("\\", "/");
  if (normalized === "_generated" || normalized.startsWith("_generated/") || normalized.includes("/_generated/")) {
    return null;
  }
  if (normalized.endsWith(".d.ts")) return null;
  const extension = path.posix.extname(normalized);
  if (!SOURCE_EXTENSIONS.has(extension)) return null;
  return `${normalized.slice(0, -extension.length)}.js`;
}

export function invalidModuleComponents(modulePath: string): string[] {
  return modulePath.split("/").filter((component) => !MODULE_COMPONENT.test(component));
}

export function findInvalidConvexModules(files: readonly string[]): string[] {
  const invalid: string[] = [];
  for (const file of files) {
    const modulePath = bundledModulePath(file);
    if (!modulePath) continue;
    if (invalidModuleComponents(modulePath).length > 0) invalid.push(modulePath);
  }
  return invalid;
}

export function listConvexSourceFiles(convexDir: string): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === "_generated") continue;
        walk(path.join(dir, entry.name));
        continue;
      }
      files.push(path.relative(convexDir, path.join(dir, entry.name)));
    }
  };
  walk(convexDir);
  return files;
}
