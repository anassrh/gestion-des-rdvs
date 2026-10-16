import { spawnSync } from "node:child_process";

// npm scripts resolve the pinned project-local Node executable first, including
// on machines whose system Node is too old for optional native package engines.
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("Run this script with npm run setup.");
console.log(`Installing native dependencies with Node ${process.version}`);
const result = spawnSync(process.execPath, [npmCli, "install", "--include=optional"], {
  stdio: "inherit",
});
if (result.status !== 0) process.exit(result.status ?? 1);
await import("rolldown");
console.log(`Native dependencies verified (${process.platform}/${process.arch}). Run npm run dev.`);
