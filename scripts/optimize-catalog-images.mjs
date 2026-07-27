/**
 * One-time optimizer: convert public/products/catalog/*.png → display-sized WebP
 * and rewrite data/db.json image paths.
 *
 * Usage: node scripts/optimize-catalog-images.mjs
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const catalogDir = path.join(root, "public", "products", "catalog");
const dbPath = path.join(root, "data", "db.json");
const catalogJsonPath = path.join(root, "data", "catalog.json");

async function optimizeFile(filePath) {
  const parsed = path.parse(filePath);
  if (parsed.ext.toLowerCase() !== ".png") return null;

  const outName = `${parsed.name}.webp`;
  const outPath = path.join(parsed.dir, outName);
  await sharp(filePath)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(outPath);

  const stat = await fs.stat(outPath);
  console.log(
    `✓ ${parsed.base} → ${outName} (${Math.round(stat.size / 1024)} KB)`
  );
  return { from: `/products/catalog/${parsed.base}`, to: `/products/catalog/${outName}` };
}

async function rewriteJson(filePath, replacements) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
  let next = raw;
  for (const { from, to } of replacements) {
    // Exact path replacement only — never strip basenames.
    next = next.split(`"${from}"`).join(`"${to}"`);
  }
  if (next.includes("/products/catalog/.webp")) {
    throw new Error(`Refusing to write broken catalog paths in ${filePath}`);
  }
  if (next !== raw) {
    await fs.writeFile(filePath, next, "utf8");
    console.log(`updated ${path.relative(root, filePath)}`);
  }
}

async function main() {
  const entries = await fs.readdir(catalogDir);
  const replacements = [];
  for (const name of entries) {
    if (!name.toLowerCase().endsWith(".png")) continue;
    const result = await optimizeFile(path.join(catalogDir, name));
    if (result) replacements.push(result);
  }

  if (!replacements.length) {
    console.log("No PNG files to optimize.");
    return;
  }

  await rewriteJson(dbPath, replacements);
  await rewriteJson(catalogJsonPath, replacements);
  console.log(`Done. ${replacements.length} images optimized.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
