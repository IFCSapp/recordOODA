import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const sourceDir =
  process.argv[2] ??
  "C:/Users/0131/.codex/generated_images/019e3de9-71ce-72e3-94a9-4e6a4a0145ec";
const outputDir = "public/illustrations";
const names = [
  "home",
  "cases",
  "observe",
  "orient",
  "decide",
  "act",
  "search",
  "team-review",
  "export"
];

const { readdir, stat } = await import("node:fs/promises");
const files = await Promise.all(
  (await readdir(sourceDir))
    .filter((name) => name.toLowerCase().endsWith(".png"))
    .map(async (name) => {
      const fullPath = join(sourceDir, name);
      return { name, fullPath, mtimeMs: (await stat(fullPath)).mtimeMs };
    })
);

files.sort((a, b) => a.mtimeMs - b.mtimeMs);

if (files.length < names.length) {
  throw new Error(`Expected at least ${names.length} generated PNG files, found ${files.length}.`);
}

await mkdir(outputDir, { recursive: true });

for (const [index, name] of names.entries()) {
  const source = files[index].fullPath;
  const target = join(outputDir, `${name}.png`);
  await sharp(source).resize(720, 480, { fit: "cover", position: "centre" }).png({ quality: 90 }).toFile(target);
  console.log(`${files[index].name} -> ${target}`);
}
