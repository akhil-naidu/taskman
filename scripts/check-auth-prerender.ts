import { spawn } from "node:child_process";

const port = Number(process.env.PRERENDER_CHECK_PORT ?? 3456);
const logs: string[] = [];
const server = spawn("node", [".next/standalone/server.js"], {
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});

function record(chunk: Buffer) {
  logs.push(chunk.toString());
}

server.stdout?.on("data", record);
server.stderr?.on("data", record);

async function stop() {
  if (server.killed || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await new Promise((resolve) => server.once("exit", resolve));
}

async function request(pathname: string) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { redirect: "manual" });
  if (response.status >= 500) throw new Error(`${pathname} returned ${response.status}`);
}

async function ready() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      await request("/signin");
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`Standalone server did not answer on port ${port}`);
}

async function main() {
  let failed = false;
  try {
    await ready();
    await request("/");
    await request("/signin");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const output = logs.join("");
    if (output.includes("Date.now()")) {
      console.error(output);
      failed = true;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(logs.join(""));
    failed = true;
  } finally {
    await stop();
  }
  if (failed) process.exit(1);
}

void main();
