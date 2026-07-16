import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(appDir, "dist");
const assetNames = ["robots.txt"];

for (const assetName of assetNames) {
  fs.copyFileSync(path.join(appDir, assetName), path.join(distDir, assetName));
}

console.log(`Wrote docs deployment assets into ${distDir}`);
