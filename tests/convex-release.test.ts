import path from "node:path";
import { describe, expect, it } from "vitest";
import { missingPublicFunctions, parseFunctionSpec } from "../lib/convex-function-spec";
import { bundledModulePath, findInvalidConvexModules, invalidModuleComponents, listConvexSourceFiles } from "../lib/convex-module-paths";

describe("convex module paths", () => {
  it("rejects the hyphenated path that blocked deploy", () => {
    expect(bundledModulePath("model/setup-prompt.ts")).toBe("model/setup-prompt.js");
    expect(invalidModuleComponents("model/setup-prompt.js")).toEqual(["setup-prompt.js"]);
  });

  it("accepts underscore and camelCase module names", () => {
    expect(invalidModuleComponents("model/setup_prompt.js")).toEqual([]);
    expect(invalidModuleComponents("model/setupPrompt.js")).toEqual([]);
    expect(invalidModuleComponents("auth.config.js")).toEqual([]);
  });

  it("finds no invalid modules under convex/", () => {
    const files = listConvexSourceFiles(path.join(process.cwd(), "convex"));
    expect(findInvalidConvexModules(files)).toEqual([]);
  });
});

describe("deployed function spec", () => {
  const spec = {
    functions: [
      { identifier: "workspaces.js:list", visibility: { kind: "public" } },
      { identifier: "workspaces.js:reset", visibility: { kind: "public" } },
      { identifier: "mcp.js:load", visibility: { kind: "internal" } },
    ],
  };

  it("accepts a public reset function", () => {
    expect(missingPublicFunctions(parseFunctionSpec(spec), ["workspaces:reset"])).toEqual([]);
  });

  it("fails when reset was not published", () => {
    const withoutReset = { functions: spec.functions.filter((entry) => entry.identifier !== "workspaces.js:reset") };
    expect(missingPublicFunctions(parseFunctionSpec(withoutReset), ["workspaces:reset"])).toEqual(["workspaces:reset"]);
  });

  it("ignores an internal function with the same name", () => {
    const internalOnly = { functions: [{ identifier: "workspaces.js:reset", visibility: { kind: "internal" } }] };
    expect(missingPublicFunctions(parseFunctionSpec(JSON.stringify(internalOnly)), ["workspaces:reset"])).toEqual(["workspaces:reset"]);
  });
});
