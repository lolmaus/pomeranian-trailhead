import { spawn, type ChildProcess } from "node:child_process";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { docsRoot, prepare } from "./prepare.mts";
import { checkHtml } from "./html-links.mts";

const children = new Set<ChildProcess>();
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    interrupted = true;
    for (const child of children) child.kill(signal);
  });

async function run(args: string[]) {
  const child = spawn(process.execPath, args, { cwd: docsRoot, stdio: "inherit" });
  children.add(child);
  try {
    const code = await new Promise<number>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (status) => resolve(status ?? 1));
    });
    if (code && !interrupted)
      throw new Error(`Documentation subprocess failed (${code}): ${args[0]}`);
  } finally {
    children.delete(child);
  }
}

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);
  const outputFlag = args.indexOf("--out");
  const output =
    outputFlag < 0 ? path.join(docsRoot, ".generated") : path.resolve(args[outputFlag + 1] ?? "");
  if (outputFlag >= 0) args.splice(outputFlag, 2);
  const site = path.join(output, "site");
  const vitepress = path.join(docsRoot, "node_modules/vitepress/bin/vitepress.js");
  if (command === "generate" || command === "build") {
    if (args.length) throw new Error(`Unexpected arguments: ${args.join(" ")}`);
    await mkdir(output, { recursive: true });
    await rm(path.join(output, "ready.json"), { force: true });
    await prepare(output);
    const digest = createHash("sha256")
      .update(await readFile(path.join(output, "content-model.json")))
      .digest("hex");
    await writeFile(
      path.join(output, "ready.json"),
      JSON.stringify({ schemaVersion: 1, digest }) + "\n",
    );
    if (command === "build") {
      await rm(path.join(output, "build.json"), { force: true });
      await run([vitepress, "build", site]);
      const pages = await checkHtml(path.join(site, ".vitepress/dist"));
      await writeFile(
        path.join(output, "build.json"),
        JSON.stringify({ schemaVersion: 1, digest, pages }) + "\n",
      );
      console.log(`Validated ${pages} built HTML pages.`);
    }
  } else if (command === "preview") {
    await access(path.join(site, ".vitepress/dist/index.html"));
    await run([vitepress, "preview", site, ...args]);
  } else {
    throw new Error(`Unknown documentation command: ${command}`);
  }
}

await main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
