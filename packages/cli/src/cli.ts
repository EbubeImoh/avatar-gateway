#!/usr/bin/env node
import { runCli } from "./cli-runner.js";

runCli().then((code) => {
  process.exitCode = code;
}).catch((error: unknown) => {
  process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
