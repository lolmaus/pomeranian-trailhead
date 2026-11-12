import { mkdir, readdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
await mkdir(path.join(root, "dist"), { recursive: true });
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/typescript/bin/tsc"),
    "-p",
    path.join(root, "tsconfig.build.json"),
  ],
  { stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);
for (const entry of await readdir(path.join(root, "src"))) {
  if (!entry.endsWith(".ts")) continue;
  const name = entry.slice(0, -3);
  const backend = require(path.join(root, "dist", `${name}.js`)) as Record<string, unknown>;
  const names = Object.keys(backend).filter((key) => key !== "__esModule" && key !== "default");
  await writeFile(
    path.join(root, "dist", `${name}.mjs`),
    `import backend from "./${name}.js";\n${names.map((key) => `export const ${key} = backend.${key};`).join("\n")}\n`,
  );
}
